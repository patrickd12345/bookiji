

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."calendar_provider" AS ENUM (
    'google',
    'microsoft',
    'apple',
    'custom'
);


ALTER TYPE "public"."calendar_provider" OWNER TO "postgres";


CREATE TYPE "public"."calendar_system_type" AS ENUM (
    'google',
    'outlook',
    'ical',
    'exchange',
    'custom'
);


ALTER TYPE "public"."calendar_system_type" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'BOOKING_CONFIRMED',
    'BOOKING_CANCELLED',
    'PAYMENT_RECEIVED',
    'REVIEW_RECEIVED',
    'SYSTEM_MESSAGE'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_default_user_role"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Add customer role by default for new users
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."add_default_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_user_role"("target_user_id" "uuid", "new_role" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO user_roles (user_id, role)
  VALUES (target_user_id, new_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."add_user_role"("target_user_id" "uuid", "new_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_conversion_rate"("start_date" "date" DEFAULT (CURRENT_DATE - '7 days'::interval), "end_date" "date" DEFAULT CURRENT_DATE, "vendor_id_param" "text" DEFAULT NULL::"text") RETURNS TABLE("funnel_step" "text", "step_count" bigint, "conversion_rate" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cf.step_name::TEXT,
    COUNT(*)::BIGINT as step_count,
    ROUND(
      (COUNT(*) * 100.0 / 
       (SELECT COUNT(*) FROM conversion_funnels 
        WHERE step_name = 'started' 
        AND created_at >= start_date 
        AND created_at <= end_date)), 2
    ) as conversion_rate
  FROM conversion_funnels cf
  WHERE cf.created_at >= start_date 
    AND cf.created_at <= end_date
    AND (vendor_id_param IS NULL OR cf.properties->>'vendor_id' = vendor_id_param)
  GROUP BY cf.step_name
  ORDER BY step_count DESC;
END;
$$;


ALTER FUNCTION "public"."calculate_conversion_rate"("start_date" "date", "end_date" "date", "vendor_id_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_rate_limit"("p_identifier" character varying, "p_action_type" character varying, "p_max_attempts" integer DEFAULT 5, "p_window_minutes" integer DEFAULT 15) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  current_attempts INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Get current attempts in window
  SELECT COALESCE(attempts, 0) INTO current_attempts
  FROM rate_limits
  WHERE identifier = p_identifier 
    AND action_type = p_action_type
    AND last_attempt > window_start;
  
  -- Check if blocked
  IF current_attempts >= p_max_attempts THEN
    RETURN FALSE;
  END IF;
  
  -- Update or insert rate limit record
  INSERT INTO rate_limits (identifier, action_type, attempts, last_attempt)
  VALUES (p_identifier, p_action_type, 1, NOW())
  ON CONFLICT (identifier, action_type)
  DO UPDATE SET 
    attempts = CASE 
      WHEN rate_limits.last_attempt > window_start THEN rate_limits.attempts + 1
      ELSE 1
    END,
    last_attempt = NOW();
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."check_rate_limit"("p_identifier" character varying, "p_action_type" character varying, "p_max_attempts" integer, "p_window_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_sessions"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_sessions 
  WHERE expires_at < NOW() OR is_active = false;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_security_logs"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM security_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_security_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."escalate_ai_chat_to_human"("p_conversation_id" "uuid", "p_reason" "text" DEFAULT 'Customer requested human agent'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  ticket_id UUID;
  conversation_record RECORD;
  chat_history TEXT;
BEGIN
  -- Get conversation details
  SELECT * INTO conversation_record
  FROM ai_chat_conversations
  WHERE id = p_conversation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;
  
  -- Build chat history
  SELECT string_agg(
    sender_type || ': ' || message, 
    E'\n' ORDER BY message_order
  ) INTO chat_history
  FROM ai_chat_messages
  WHERE conversation_id = p_conversation_id;
  
  -- Create support ticket
  INSERT INTO support_tickets (
    user_id,
    category_id,
    subject,
    description,
    priority,
    status,
    metadata
  ) VALUES (
    conversation_record.user_id,
    (SELECT id FROM support_categories WHERE name = 'General Inquiry' LIMIT 1),
    'Escalated from AI Chat - ' || COALESCE(conversation_record.intent, 'General Inquiry'),
    'Customer requested human support after AI chat.' || E'\n\n' ||
    'Escalation Reason: ' || p_reason || E'\n\n' ||
    'Chat History:' || E'\n' || COALESCE(chat_history, 'No chat history available'),
    'medium',
    'open',
    jsonb_build_object(
      'escalated_from_ai', true,
      'original_conversation_id', p_conversation_id,
      'ai_confidence_avg', conversation_record.ai_confidence_avg
    )
  ) RETURNING id INTO ticket_id;
  
  -- Update conversation as escalated
  UPDATE ai_chat_conversations
  SET escalated_to_human = true,
      escalated_at = NOW(),
      updated_at = NOW()
  WHERE id = p_conversation_id;
  
  RETURN ticket_id;
END;
$$;


ALTER FUNCTION "public"."escalate_ai_chat_to_human"("p_conversation_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_ticket_number"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
  ticket_num TEXT;
BEGIN
  year_part := EXTRACT(YEAR FROM NOW())::TEXT;
  
  -- Get next sequence number for this year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(ticket_number FROM 'SUP-' || year_part || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM support_tickets
  WHERE ticket_number LIKE 'SUP-' || year_part || '-%';
  
  ticket_num := 'SUP-' || year_part || '-' || LPAD(sequence_num::TEXT, 3, '0');
  
  RETURN ticket_num;
END;
$$;


ALTER FUNCTION "public"."generate_ticket_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_beta_feature"("user_id" "uuid", "feature_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id 
    AND (
      beta_status->>'type' = 'early_access'
      OR feature_name = ANY(ARRAY(SELECT jsonb_array_elements_text(beta_status->'features')))
    )
  );
END;
$$;


ALTER FUNCTION "public"."has_beta_feature"("user_id" "uuid", "feature_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_geographic_stats"("p_country" "text", "p_date" "date", "p_event_name" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO geographic_analytics (country, date, event_name, event_count)
  VALUES (p_country, p_date, p_event_name, 1)
  ON CONFLICT (country, date, event_name)
  DO UPDATE SET event_count = geographic_analytics.event_count + 1;
END;
$$;


ALTER FUNCTION "public"."increment_geographic_stats"("p_country" "text", "p_date" "date", "p_event_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_beta_user"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id 
    AND beta_status IS NOT NULL
  );
END;
$$;


ALTER FUNCTION "public"."is_beta_user"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_user_blocked"("user_a" "uuid", "user_b" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_blocks
        WHERE (blocker_id = user_a AND blocked_id = user_b)
           OR (blocker_id = user_b AND blocked_id = user_a)
    );
END;
$$;


ALTER FUNCTION "public"."is_user_blocked"("user_a" "uuid", "user_b" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_security_event"("p_event_type" character varying, "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_ip_address" "text" DEFAULT NULL::"text", "p_user_agent" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO security_logs (event_type, user_id, ip_address, user_agent, metadata)
  VALUES (p_event_type, p_user_id, p_ip_address::INET, p_user_agent, p_metadata)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;


ALTER FUNCTION "public"."log_security_event"("p_event_type" character varying, "p_user_id" "uuid", "p_ip_address" "text", "p_user_agent" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_kb"("query_embedding" "extensions"."vector", "match_count" integer DEFAULT 6, "min_sim" double precision DEFAULT 0.60) RETURNS TABLE("article_id" "uuid", "chunk_id" "uuid", "chunk_index" integer, "content" "text", "similarity" double precision)
    LANGUAGE "sql" STABLE
    AS $$
  select c.article_id,
         c.id as chunk_id,
         c.chunk_index,
         c.content,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.kb_chunks c
  where 1 - (c.embedding <=> query_embedding) >= min_sim
  order by c.embedding <=> query_embedding asc
  limit match_count;
$$;


ALTER FUNCTION "public"."match_kb"("query_embedding" "extensions"."vector", "match_count" integer, "min_sim" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_user_role"("target_user_id" "uuid", "old_role" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM user_roles 
  WHERE user_id = target_user_id 
  AND role = old_role;
  
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."remove_user_role"("target_user_id" "uuid", "old_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_knowledge_base"("p_query" "text", "p_limit" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "title" character varying, "content" "text", "slug" character varying, "rank" real)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kb.id,
    kb.title,
    kb.content,
    kb.slug,
    ts_rank(kb.search_vector, plainto_tsquery('english', p_query)) as rank
  FROM knowledge_base kb
  WHERE kb.is_published = true
    AND kb.search_vector @@ plainto_tsquery('english', p_query)
  ORDER BY rank DESC, kb.view_count DESC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."search_knowledge_base"("p_query" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_feature_usage"("feature_name_param" "text", "time_spent_param" numeric DEFAULT 0) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO feature_usage (feature_name, total_views, unique_users, avg_time_spent)
  VALUES (feature_name_param, 1, 1, time_spent_param)
  ON CONFLICT (feature_name) DO UPDATE SET
    total_views = feature_usage.total_views + 1,
    avg_time_spent = (feature_usage.avg_time_spent + time_spent_param) / 2,
    last_updated = NOW();
END;
$$;


ALTER FUNCTION "public"."track_feature_usage"("feature_name_param" "text", "time_spent_param" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_generate_ticket_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_generate_ticket_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_log_profile_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Log security-sensitive profile changes
  IF OLD.role != NEW.role OR OLD.is_suspended != NEW.is_suspended THEN
    PERFORM log_security_event(
      'profile_security_change',
      NEW.id,
      NULL,
      NULL,
      jsonb_build_object(
        'old_role', OLD.role,
        'new_role', NEW.role,
        'old_suspended', OLD.is_suspended,
        'new_suspended', NEW.is_suspended
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_log_profile_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_knowledge_base_search_vector"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', 
    COALESCE(NEW.title, '') || ' ' || 
    COALESCE(NEW.content, '') || ' ' ||
    COALESCE(array_to_string(NEW.keywords, ' '), '')
  );
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_knowledge_base_search_vector"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_analytics"("user_id_param" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO user_analytics (user_id, session_count, last_activity)
  VALUES (user_id_param, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    session_count = user_analytics.session_count + 1,
    last_activity = NOW();
END;
$$;


ALTER FUNCTION "public"."update_user_analytics"("user_id_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_role"("check_user_id" "uuid", "check_role" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = check_user_id 
    AND role = check_role
  );
END;
$$;


ALTER FUNCTION "public"."user_has_role"("check_user_id" "uuid", "check_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_admin_user"("p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id 
      AND role = 'admin'
      AND is_suspended = false
  );
END;
$$;


ALTER FUNCTION "public"."verify_admin_user"("p_user_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_permissions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "permission" character varying(100) NOT NULL,
    "granted_by" "uuid",
    "granted_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."admin_permissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_permissions" IS 'Granular admin permission management';



CREATE TABLE IF NOT EXISTS "public"."ai_chat_conversations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "session_id" character varying(255) NOT NULL,
    "intent" character varying(100),
    "resolved" boolean DEFAULT false,
    "escalated_to_human" boolean DEFAULT false,
    "escalated_at" timestamp with time zone,
    "ai_confidence_avg" numeric(3,2),
    "message_count" integer DEFAULT 0,
    "user_satisfaction" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "tags" character varying(50)[] DEFAULT '{}'::character varying[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_chat_conversations" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_chat_conversations" IS '3-tier support system: AI-powered chat conversations';



CREATE TABLE IF NOT EXISTS "public"."ai_chat_messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_type" character varying(10) NOT NULL,
    "message" "text" NOT NULL,
    "message_order" integer NOT NULL,
    "ai_model" character varying(50),
    "ai_confidence" numeric(3,2),
    "processing_time_ms" integer,
    "detected_intent" character varying(100),
    "confidence_score" numeric(3,2),
    "context_used" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics_alerts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "alert_type" character varying(255) NOT NULL,
    "event_name" character varying(255) NOT NULL,
    "properties" "jsonb" DEFAULT '{}'::"jsonb",
    "alert_sent" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."analytics_alerts" OWNER TO "postgres";


COMMENT ON TABLE "public"."analytics_alerts" IS 'Real-time alerts for critical events';



CREATE TABLE IF NOT EXISTS "public"."analytics_events" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "event_name" character varying(255) NOT NULL,
    "properties" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."analytics_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."analytics_events" IS 'Raw analytics events for all user interactions';



CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "description" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."availability_slots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vendor_id" "uuid",
    "service_id" "uuid",
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "is_booked" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."availability_slots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."booking_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid",
    "sender_id" "uuid" NOT NULL,
    "sender_type" "text" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "booking_messages_sender_type_check" CHECK (("sender_type" = ANY (ARRAY['customer'::"text", 'provider'::"text"])))
);


ALTER TABLE "public"."booking_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid",
    "vendor_id" "uuid",
    "service_id" "uuid",
    "slot_id" "uuid",
    "slot_start" timestamp with time zone NOT NULL,
    "slot_end" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "commitment_fee_paid" boolean DEFAULT false,
    "vendor_fee_paid" boolean DEFAULT false,
    "total_amount_cents" integer NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "bookings_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'completed'::"text", 'cancelled'::"text", 'no_show'::"text"])))
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversion_funnels" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "funnel_name" character varying(255) NOT NULL,
    "step_name" character varying(255) NOT NULL,
    "user_id" character varying(255),
    "session_id" character varying(255) NOT NULL,
    "properties" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."conversion_funnels" OWNER TO "postgres";


COMMENT ON TABLE "public"."conversion_funnels" IS 'Conversion funnel tracking for optimization';



CREATE TABLE IF NOT EXISTS "public"."external_calendar_connections" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "provider" "public"."calendar_provider" NOT NULL,
    "provider_user_id" "text",
    "provider_calendar_id" "text" NOT NULL,
    "provider_email" "text",
    "access_token" "text" NOT NULL,
    "refresh_token" "text" NOT NULL,
    "token_expiry" timestamp with time zone NOT NULL,
    "sync_enabled" boolean DEFAULT true,
    "last_synced" timestamp with time zone,
    "sync_from_date" timestamp with time zone,
    "sync_frequency_minutes" integer DEFAULT 30,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."external_calendar_connections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."external_calendar_systems" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."calendar_system_type" NOT NULL,
    "api_endpoint" "text",
    "api_version" "text",
    "auth_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."external_calendar_systems" OWNER TO "postgres";


COMMENT ON TABLE "public"."external_calendar_systems" IS 'Defines different external calendar systems that can be integrated';



COMMENT ON COLUMN "public"."external_calendar_systems"."type" IS 'The type of calendar system (google, outlook, etc.)';



COMMENT ON COLUMN "public"."external_calendar_systems"."api_endpoint" IS 'Base API endpoint for the calendar system';



COMMENT ON COLUMN "public"."external_calendar_systems"."api_version" IS 'API version being used';



COMMENT ON COLUMN "public"."external_calendar_systems"."auth_type" IS 'Authentication type (oauth2, api_key, etc.)';



CREATE TABLE IF NOT EXISTS "public"."external_events" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "external_id" "text" NOT NULL,
    "connection_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "attendees" "text"[],
    "location" "text",
    "status" "text" NOT NULL,
    "last_modified" timestamp with time zone NOT NULL,
    "raw_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."external_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_usage" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "feature_name" character varying(255) NOT NULL,
    "total_views" integer DEFAULT 0,
    "unique_users" integer DEFAULT 0,
    "avg_time_spent" numeric DEFAULT 0,
    "abandonment_rate" numeric DEFAULT 0,
    "last_updated" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."feature_usage" OWNER TO "postgres";


COMMENT ON TABLE "public"."feature_usage" IS 'Feature adoption and usage tracking';



CREATE TABLE IF NOT EXISTS "public"."geographic_analytics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "country" character varying(10) NOT NULL,
    "date" "date" NOT NULL,
    "event_name" character varying(255) NOT NULL,
    "event_count" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."geographic_analytics" OWNER TO "postgres";


COMMENT ON TABLE "public"."geographic_analytics" IS 'Geographic performance and expansion analytics';



CREATE TABLE IF NOT EXISTS "public"."kb_articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL
);


ALTER TABLE "public"."kb_articles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kb_chunks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "article_id" "uuid" NOT NULL,
    "chunk_index" integer NOT NULL,
    "content" "text" NOT NULL,
    "embedding" "extensions"."vector"(1536) NOT NULL
);


ALTER TABLE "public"."kb_chunks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kb_suggestions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "question" "text" NOT NULL,
    "answer" "text" NOT NULL,
    "intent" "text",
    "similarity_to_best" double precision DEFAULT 0 NOT NULL,
    "target_article_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "q_embedding" "extensions"."vector"(1536),
    "a_embedding" "extensions"."vector"(1536),
    CONSTRAINT "kb_suggestions_similarity_to_best_check" CHECK ((("similarity_to_best" >= (0)::double precision) AND ("similarity_to_best" <= (1)::double precision))),
    CONSTRAINT "kb_suggestions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'reviewed'::"text", 'accepted'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."kb_suggestions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."knowledge_base" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" character varying(255) NOT NULL,
    "content" "text" NOT NULL,
    "category_id" "uuid",
    "slug" character varying(255),
    "meta_description" "text",
    "keywords" character varying(255)[] DEFAULT '{}'::character varying[],
    "search_vector" "tsvector",
    "view_count" integer DEFAULT 0,
    "helpful_votes" integer DEFAULT 0,
    "unhelpful_votes" integer DEFAULT 0,
    "author_id" "uuid",
    "is_published" boolean DEFAULT false,
    "is_featured" boolean DEFAULT false,
    "display_order" integer DEFAULT 0,
    "ai_generated" boolean DEFAULT false,
    "ai_last_updated" timestamp with time zone,
    "related_tickets_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."knowledge_base" OWNER TO "postgres";


COMMENT ON TABLE "public"."knowledge_base" IS '3-tier support system: self-service knowledge base';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."page_analytics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "page_path" character varying(500) NOT NULL,
    "avg_session_duration" numeric DEFAULT 0,
    "bounce_rate" numeric DEFAULT 0,
    "exit_rate" numeric DEFAULT 0,
    "conversion_rate" numeric DEFAULT 0,
    "traffic_volume" integer DEFAULT 0,
    "last_updated" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."page_analytics" OWNER TO "postgres";


COMMENT ON TABLE "public"."page_analytics" IS 'Page performance and navigation analytics';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "email" "text",
    "phone" "text",
    "role" "text" DEFAULT 'customer'::"text",
    "avatar_url" "text",
    "preferences" "jsonb",
    "marketing_consent" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "availability_mode" "text" DEFAULT 'subtractive'::"text",
    "calendar_source" "text" DEFAULT 'google'::"text",
    "last_login" timestamp with time zone,
    "login_count" integer DEFAULT 0,
    "is_verified" boolean DEFAULT false,
    "is_suspended" boolean DEFAULT false,
    "suspension_reason" "text",
    "privacy_consent" boolean DEFAULT true,
    "terms_accepted_at" timestamp with time zone,
    "data_retention_days" integer DEFAULT 2555,
    "beta_status" "jsonb",
    CONSTRAINT "check_availability_mode" CHECK (("availability_mode" = ANY (ARRAY['subtractive'::"text", 'additive'::"text"]))),
    CONSTRAINT "check_calendar_source" CHECK (("calendar_source" = ANY (ARRAY['google'::"text", 'outlook'::"text", 'bookiji_native'::"text"]))),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['customer'::"text", 'vendor'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_calendars" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "google_email" "text" NOT NULL,
    "access_token" "text" NOT NULL,
    "refresh_token" "text",
    "expiry_date" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "system_type" "public"."calendar_system_type" DEFAULT 'google'::"public"."calendar_system_type" NOT NULL,
    "system_id" "uuid",
    "system_specific_data" "jsonb"
);


ALTER TABLE "public"."provider_calendars" OWNER TO "postgres";


COMMENT ON TABLE "public"."provider_calendars" IS 'Stores calendar integration details for providers across different systems';



COMMENT ON COLUMN "public"."provider_calendars"."profile_id" IS 'Links to the provider''s profile.';



COMMENT ON COLUMN "public"."provider_calendars"."google_email" IS 'The email address of the connected Google Calendar account.';



COMMENT ON COLUMN "public"."provider_calendars"."access_token" IS 'Encrypted Google API access token.';



COMMENT ON COLUMN "public"."provider_calendars"."refresh_token" IS 'Encrypted Google API refresh token, used to get new access tokens.';



COMMENT ON COLUMN "public"."provider_calendars"."expiry_date" IS 'The exact date and time when the access token expires.';



COMMENT ON COLUMN "public"."provider_calendars"."system_type" IS 'The type of calendar system being used';



COMMENT ON COLUMN "public"."provider_calendars"."system_id" IS 'Reference to the external calendar system configuration';



COMMENT ON COLUMN "public"."provider_calendars"."system_specific_data" IS 'Additional data specific to the calendar system type';



CREATE TABLE IF NOT EXISTS "public"."provider_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vendor_id" "uuid",
    "latitude" numeric(10,8) NOT NULL,
    "longitude" numeric(11,8) NOT NULL,
    "service_radius_km" integer DEFAULT 5,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."provider_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "day_of_week" integer NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "provider_schedules_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6)))
);


ALTER TABLE "public"."provider_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rate_limits" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "identifier" character varying(255) NOT NULL,
    "action_type" character varying(50) NOT NULL,
    "attempts" integer DEFAULT 0,
    "last_attempt" timestamp with time zone DEFAULT "now"(),
    "blocked_until" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rate_limits" OWNER TO "postgres";


COMMENT ON TABLE "public"."rate_limits" IS 'Rate limiting to prevent abuse and attacks';



CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid",
    "customer_id" "uuid",
    "vendor_id" "uuid",
    "rating" integer,
    "review_text" "text",
    "no_show_reported" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."security_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "event_type" character varying(50) NOT NULL,
    "user_id" "uuid",
    "ip_address" "inet",
    "user_agent" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."security_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."security_logs" IS 'Comprehensive security event logging for audit trails';



CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vendor_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "price" numeric(10,2) NOT NULL,
    "duration" integer NOT NULL,
    "category" "text" DEFAULT 'general'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_automation_rules" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "trigger_conditions" "jsonb" NOT NULL,
    "actions" "jsonb" NOT NULL,
    "priority" integer DEFAULT 5,
    "is_active" boolean DEFAULT true,
    "times_triggered" integer DEFAULT 0,
    "success_rate" numeric(3,2) DEFAULT 0.00,
    "last_triggered" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."support_automation_rules" OWNER TO "postgres";


COMMENT ON TABLE "public"."support_automation_rules" IS '3-tier support system: rule-based automation';



CREATE TABLE IF NOT EXISTS "public"."support_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "icon" character varying(50),
    "priority" integer DEFAULT 5,
    "is_active" boolean DEFAULT true,
    "auto_resolve_rules" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."support_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "origin" "text" NOT NULL,
    "resolved_at" timestamp with time zone,
    "outcome" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "support_conversations_origin_check" CHECK (("origin" = ANY (ARRAY['web'::"text", 'email'::"text", 'chat'::"text", 'phone'::"text"])))
);


ALTER TABLE "public"."support_conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "sender_id" "uuid",
    "sender_type" character varying(20) NOT NULL,
    "message" "text" NOT NULL,
    "message_type" character varying(20) DEFAULT 'text'::character varying,
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "is_ai_generated" boolean DEFAULT false,
    "ai_model" character varying(50),
    "ai_confidence" numeric(3,2),
    "is_internal" boolean DEFAULT false,
    "is_read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."support_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_tickets" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "ticket_number" character varying(20) NOT NULL,
    "user_id" "uuid" NOT NULL,
    "category_id" "uuid",
    "subject" character varying(255) NOT NULL,
    "description" "text" NOT NULL,
    "priority" character varying(20) DEFAULT 'medium'::character varying,
    "status" character varying(20) DEFAULT 'open'::character varying,
    "assigned_to" "uuid",
    "assigned_at" timestamp with time zone,
    "ai_confidence_score" numeric(3,2),
    "ai_suggested_resolution" "text",
    "ai_processed_at" timestamp with time zone,
    "resolution" "text",
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    "customer_satisfaction" integer,
    "customer_feedback" "text",
    "tags" character varying(50)[] DEFAULT '{}'::character varying[],
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."support_tickets" OWNER TO "postgres";


COMMENT ON TABLE "public"."support_tickets" IS '3-tier support system: tickets for human agents';



CREATE TABLE IF NOT EXISTS "public"."support_unanswered_questions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "session_id" character varying(255),
    "source" character varying(20) DEFAULT 'faq'::character varying NOT NULL,
    "query_text" "text" NOT NULL,
    "query_context" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "processed" boolean DEFAULT false,
    "processed_at" timestamp with time zone,
    "article_id" "uuid"
);


ALTER TABLE "public"."support_unanswered_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_analytics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" character varying(255) NOT NULL,
    "completed_bookings" integer DEFAULT 0,
    "session_duration" integer DEFAULT 0,
    "session_count" integer DEFAULT 0,
    "help_clicks" integer DEFAULT 0,
    "signup_abandoned" boolean DEFAULT false,
    "payment_abandoned" boolean DEFAULT false,
    "pricing_page_visits" integer DEFAULT 0,
    "last_activity" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_analytics" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_analytics" IS 'Aggregated user behavior metrics';



CREATE TABLE IF NOT EXISTS "public"."user_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "blocker_id" "uuid",
    "blocked_id" "uuid",
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_roles_role_check" CHECK (("role" = ANY (ARRAY['customer'::"text", 'vendor'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_role_summary" AS
 SELECT "p"."id" AS "user_id",
    "p"."email",
    "p"."full_name",
    "array_agg"("ur"."role" ORDER BY "ur"."role") AS "roles",
        CASE
            WHEN ('customer'::"text" = ANY ("array_agg"("ur"."role"))) THEN true
            ELSE false
        END AS "can_book_services",
        CASE
            WHEN ('vendor'::"text" = ANY ("array_agg"("ur"."role"))) THEN true
            ELSE false
        END AS "can_offer_services",
        CASE
            WHEN ('admin'::"text" = ANY ("array_agg"("ur"."role"))) THEN true
            ELSE false
        END AS "is_admin",
    "p"."created_at",
    "p"."updated_at"
   FROM ("public"."profiles" "p"
     LEFT JOIN "public"."user_roles" "ur" ON (("p"."id" = "ur"."user_id")))
  GROUP BY "p"."id", "p"."email", "p"."full_name", "p"."created_at", "p"."updated_at";


ALTER VIEW "public"."user_role_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_segments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" character varying(255) NOT NULL,
    "segments" "text"[] DEFAULT '{}'::"text"[],
    "last_updated" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_segments" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_segments" IS 'User behavioral segmentation for personalization';



CREATE TABLE IF NOT EXISTS "public"."user_sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_id" character varying(255) NOT NULL,
    "ip_address" "inet",
    "user_agent" "text",
    "expires_at" timestamp with time zone NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_sessions" IS 'Enhanced session management and tracking';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'customer'::"text",
    "full_name" "text",
    "phone" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['customer'::"text", 'vendor'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_provider_calendar_connections" AS
 SELECT "pc"."id",
    "pc"."profile_id",
    "pc"."google_email",
    "pc"."access_token",
    "pc"."refresh_token",
    "pc"."expiry_date",
    "pc"."created_at",
    "pc"."updated_at",
    "pc"."system_type",
    "pc"."system_id",
    "pc"."system_specific_data",
    "ecs"."name" AS "system_name",
    "ecs"."api_endpoint",
    "ecs"."api_version",
    "ecs"."auth_type"
   FROM ("public"."provider_calendars" "pc"
     LEFT JOIN "public"."external_calendar_systems" "ecs" ON (("pc"."system_id" = "ecs"."id")));


ALTER VIEW "public"."v_provider_calendar_connections" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_permissions"
    ADD CONSTRAINT "admin_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_chat_conversations"
    ADD CONSTRAINT "ai_chat_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_chat_messages"
    ADD CONSTRAINT "ai_chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_alerts"
    ADD CONSTRAINT "analytics_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."availability_slots"
    ADD CONSTRAINT "availability_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."booking_messages"
    ADD CONSTRAINT "booking_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversion_funnels"
    ADD CONSTRAINT "conversion_funnels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."external_calendar_connections"
    ADD CONSTRAINT "external_calendar_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."external_calendar_connections"
    ADD CONSTRAINT "external_calendar_connections_user_id_provider_provider_cal_key" UNIQUE ("user_id", "provider", "provider_calendar_id");



ALTER TABLE ONLY "public"."external_calendar_systems"
    ADD CONSTRAINT "external_calendar_systems_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."external_events"
    ADD CONSTRAINT "external_events_connection_id_external_id_key" UNIQUE ("connection_id", "external_id");



ALTER TABLE ONLY "public"."external_events"
    ADD CONSTRAINT "external_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_usage"
    ADD CONSTRAINT "feature_usage_feature_name_key" UNIQUE ("feature_name");



ALTER TABLE ONLY "public"."feature_usage"
    ADD CONSTRAINT "feature_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."geographic_analytics"
    ADD CONSTRAINT "geographic_analytics_country_date_event_name_key" UNIQUE ("country", "date", "event_name");



ALTER TABLE ONLY "public"."geographic_analytics"
    ADD CONSTRAINT "geographic_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kb_articles"
    ADD CONSTRAINT "kb_articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kb_articles"
    ADD CONSTRAINT "kb_articles_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."kb_chunks"
    ADD CONSTRAINT "kb_chunks_article_id_chunk_index_key" UNIQUE ("article_id", "chunk_index");



ALTER TABLE ONLY "public"."kb_chunks"
    ADD CONSTRAINT "kb_chunks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kb_suggestions"
    ADD CONSTRAINT "kb_suggestions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."knowledge_base"
    ADD CONSTRAINT "knowledge_base_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."knowledge_base"
    ADD CONSTRAINT "knowledge_base_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."page_analytics"
    ADD CONSTRAINT "page_analytics_page_path_key" UNIQUE ("page_path");



ALTER TABLE ONLY "public"."page_analytics"
    ADD CONSTRAINT "page_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_calendars"
    ADD CONSTRAINT "provider_google_calendar_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_locations"
    ADD CONSTRAINT "provider_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_schedules"
    ADD CONSTRAINT "provider_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."security_logs"
    ADD CONSTRAINT "security_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_automation_rules"
    ADD CONSTRAINT "support_automation_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_categories"
    ADD CONSTRAINT "support_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_conversations"
    ADD CONSTRAINT "support_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_messages"
    ADD CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_ticket_number_key" UNIQUE ("ticket_number");



ALTER TABLE ONLY "public"."support_unanswered_questions"
    ADD CONSTRAINT "support_unanswered_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."external_calendar_systems"
    ADD CONSTRAINT "uq_name_type" UNIQUE ("name", "type");



ALTER TABLE ONLY "public"."provider_schedules"
    ADD CONSTRAINT "uq_profile_day_time" UNIQUE ("profile_id", "day_of_week", "start_time", "end_time");



ALTER TABLE ONLY "public"."provider_calendars"
    ADD CONSTRAINT "uq_profile_id" UNIQUE ("profile_id");



COMMENT ON CONSTRAINT "uq_profile_id" ON "public"."provider_calendars" IS 'Ensures that each provider can only have one Google Calendar integration.';



ALTER TABLE ONLY "public"."user_analytics"
    ADD CONSTRAINT "user_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_analytics"
    ADD CONSTRAINT "user_analytics_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocker_id_blocked_id_key" UNIQUE ("blocker_id", "blocked_id");



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."user_segments"
    ADD CONSTRAINT "user_segments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_segments"
    ADD CONSTRAINT "user_segments_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "idx_admin_permissions_user_permission" ON "public"."admin_permissions" USING "btree" ("user_id", "permission") WHERE ("is_active" = true);



CREATE INDEX "idx_ai_chat_conversations_session" ON "public"."ai_chat_conversations" USING "btree" ("session_id");



CREATE INDEX "idx_ai_chat_conversations_user_id" ON "public"."ai_chat_conversations" USING "btree" ("user_id");



CREATE INDEX "idx_ai_chat_messages_conversation" ON "public"."ai_chat_messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_ai_chat_messages_order" ON "public"."ai_chat_messages" USING "btree" ("conversation_id", "message_order");



CREATE INDEX "idx_analytics_alerts_created_at" ON "public"."analytics_alerts" USING "btree" ("created_at");



CREATE INDEX "idx_analytics_alerts_event" ON "public"."analytics_alerts" USING "btree" ("event_name");



CREATE INDEX "idx_analytics_alerts_sent" ON "public"."analytics_alerts" USING "btree" ("alert_sent");



CREATE INDEX "idx_analytics_alerts_type" ON "public"."analytics_alerts" USING "btree" ("alert_type");



CREATE INDEX "idx_analytics_events_created_at" ON "public"."analytics_events" USING "btree" ("created_at");



CREATE INDEX "idx_analytics_events_name" ON "public"."analytics_events" USING "btree" ("event_name");



CREATE INDEX "idx_analytics_events_properties" ON "public"."analytics_events" USING "gin" ("properties");



CREATE INDEX "idx_availability_slots_start_time" ON "public"."availability_slots" USING "btree" ("start_time");



CREATE INDEX "idx_availability_slots_vendor_id" ON "public"."availability_slots" USING "btree" ("vendor_id");



CREATE INDEX "idx_bookings_customer_id" ON "public"."bookings" USING "btree" ("customer_id");



CREATE INDEX "idx_bookings_status" ON "public"."bookings" USING "btree" ("status");



CREATE INDEX "idx_bookings_vendor_id" ON "public"."bookings" USING "btree" ("vendor_id");



CREATE INDEX "idx_conversion_funnels_created_at" ON "public"."conversion_funnels" USING "btree" ("created_at");



CREATE INDEX "idx_conversion_funnels_name" ON "public"."conversion_funnels" USING "btree" ("funnel_name");



CREATE INDEX "idx_conversion_funnels_session" ON "public"."conversion_funnels" USING "btree" ("session_id");



CREATE INDEX "idx_conversion_funnels_step" ON "public"."conversion_funnels" USING "btree" ("step_name");



CREATE INDEX "idx_conversion_funnels_user_id" ON "public"."conversion_funnels" USING "btree" ("user_id");



CREATE INDEX "idx_external_calendar_connections_user_id" ON "public"."external_calendar_connections" USING "btree" ("user_id");



CREATE INDEX "idx_external_events_connection_id" ON "public"."external_events" USING "btree" ("connection_id");



CREATE INDEX "idx_external_events_external_id" ON "public"."external_events" USING "btree" ("external_id");



CREATE INDEX "idx_external_events_start_time" ON "public"."external_events" USING "btree" ("start_time");



CREATE INDEX "idx_feature_usage_abandonment" ON "public"."feature_usage" USING "btree" ("abandonment_rate");



CREATE INDEX "idx_feature_usage_name" ON "public"."feature_usage" USING "btree" ("feature_name");



CREATE INDEX "idx_feature_usage_views" ON "public"."feature_usage" USING "btree" ("total_views");



CREATE INDEX "idx_geographic_analytics_country" ON "public"."geographic_analytics" USING "btree" ("country");



CREATE INDEX "idx_geographic_analytics_date" ON "public"."geographic_analytics" USING "btree" ("date");



CREATE INDEX "idx_geographic_analytics_event" ON "public"."geographic_analytics" USING "btree" ("event_name");



CREATE INDEX "idx_knowledge_base_category" ON "public"."knowledge_base" USING "btree" ("category_id");



CREATE INDEX "idx_knowledge_base_published" ON "public"."knowledge_base" USING "btree" ("is_published");



CREATE INDEX "idx_knowledge_base_search" ON "public"."knowledge_base" USING "gin" ("search_vector");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("read") WHERE (NOT "read");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_page_analytics_bounce_rate" ON "public"."page_analytics" USING "btree" ("bounce_rate");



CREATE INDEX "idx_page_analytics_conversion_rate" ON "public"."page_analytics" USING "btree" ("conversion_rate");



CREATE INDEX "idx_page_analytics_path" ON "public"."page_analytics" USING "btree" ("page_path");



CREATE INDEX "idx_page_analytics_traffic" ON "public"."page_analytics" USING "btree" ("traffic_volume");



CREATE INDEX "idx_profiles_beta_status" ON "public"."profiles" USING "gin" ("beta_status");



CREATE INDEX "idx_provider_calendars_system_id" ON "public"."provider_calendars" USING "btree" ("system_id");



CREATE INDEX "idx_provider_calendars_system_type" ON "public"."provider_calendars" USING "btree" ("system_type");



CREATE INDEX "idx_provider_locations_vendor_id" ON "public"."provider_locations" USING "btree" ("vendor_id");



CREATE UNIQUE INDEX "idx_rate_limits_identifier_action" ON "public"."rate_limits" USING "btree" ("identifier", "action_type");



CREATE INDEX "idx_reviews_booking_id" ON "public"."reviews" USING "btree" ("booking_id");



CREATE INDEX "idx_security_logs_created_at" ON "public"."security_logs" USING "btree" ("created_at");



CREATE INDEX "idx_security_logs_event_type" ON "public"."security_logs" USING "btree" ("event_type");



CREATE INDEX "idx_security_logs_user_id" ON "public"."security_logs" USING "btree" ("user_id");



CREATE INDEX "idx_services_category" ON "public"."services" USING "btree" ("category");



CREATE INDEX "idx_services_vendor_id" ON "public"."services" USING "btree" ("vendor_id");



CREATE INDEX "idx_support_messages_created_at" ON "public"."support_messages" USING "btree" ("created_at");



CREATE INDEX "idx_support_messages_sender" ON "public"."support_messages" USING "btree" ("sender_id");



CREATE INDEX "idx_support_messages_ticket_id" ON "public"."support_messages" USING "btree" ("ticket_id");



CREATE INDEX "idx_support_tickets_assigned_to" ON "public"."support_tickets" USING "btree" ("assigned_to");



CREATE INDEX "idx_support_tickets_category" ON "public"."support_tickets" USING "btree" ("category_id");



CREATE INDEX "idx_support_tickets_created_at" ON "public"."support_tickets" USING "btree" ("created_at");



CREATE INDEX "idx_support_tickets_priority" ON "public"."support_tickets" USING "btree" ("priority");



CREATE INDEX "idx_support_tickets_status" ON "public"."support_tickets" USING "btree" ("status");



CREATE INDEX "idx_support_tickets_user_id" ON "public"."support_tickets" USING "btree" ("user_id");



CREATE INDEX "idx_user_analytics_bookings" ON "public"."user_analytics" USING "btree" ("completed_bookings");



CREATE INDEX "idx_user_analytics_duration" ON "public"."user_analytics" USING "btree" ("session_duration");



CREATE INDEX "idx_user_analytics_last_activity" ON "public"."user_analytics" USING "btree" ("last_activity");



CREATE INDEX "idx_user_analytics_user_id" ON "public"."user_analytics" USING "btree" ("user_id");



CREATE INDEX "idx_user_blocks_blocked" ON "public"."user_blocks" USING "btree" ("blocked_id");



CREATE INDEX "idx_user_blocks_blocker" ON "public"."user_blocks" USING "btree" ("blocker_id");



CREATE INDEX "idx_user_roles_role" ON "public"."user_roles" USING "btree" ("role");



CREATE INDEX "idx_user_roles_user_id" ON "public"."user_roles" USING "btree" ("user_id");



CREATE INDEX "idx_user_segments_segments" ON "public"."user_segments" USING "gin" ("segments");



CREATE INDEX "idx_user_segments_updated" ON "public"."user_segments" USING "btree" ("last_updated");



CREATE INDEX "idx_user_segments_user_id" ON "public"."user_segments" USING "btree" ("user_id");



CREATE INDEX "idx_user_sessions_expires_at" ON "public"."user_sessions" USING "btree" ("expires_at");



CREATE INDEX "idx_user_sessions_session_id" ON "public"."user_sessions" USING "btree" ("session_id");



CREATE INDEX "idx_user_sessions_user_id" ON "public"."user_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE INDEX "kb_chunks_article_idx" ON "public"."kb_chunks" USING "btree" ("article_id");



CREATE INDEX "kb_chunks_vector_idx" ON "public"."kb_chunks" USING "ivfflat" ("embedding" "extensions"."vector_cosine_ops") WITH ("lists"='250');



CREATE INDEX "kb_suggestions_status_ticket_idx" ON "public"."kb_suggestions" USING "btree" ("status", "ticket_id");



CREATE OR REPLACE TRIGGER "add_default_role_trigger" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."add_default_user_role"();



CREATE OR REPLACE TRIGGER "set_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_timestamp" BEFORE UPDATE ON "public"."provider_calendars" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_timestamp_external_calendar_connections" BEFORE UPDATE ON "public"."external_calendar_connections" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_timestamp_external_events" BEFORE UPDATE ON "public"."external_events" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_timestamp_provider_schedules" BEFORE UPDATE ON "public"."provider_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "trigger_auto_ticket_number" BEFORE INSERT OR UPDATE ON "public"."support_tickets" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_generate_ticket_number"();



CREATE OR REPLACE TRIGGER "trigger_log_profile_security_changes" AFTER UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_log_profile_update"();



CREATE OR REPLACE TRIGGER "trigger_update_kb_search" BEFORE INSERT OR UPDATE ON "public"."knowledge_base" FOR EACH ROW EXECUTE FUNCTION "public"."update_knowledge_base_search_vector"();



CREATE OR REPLACE TRIGGER "update_bookings_updated_at" BEFORE UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_notifications_updated_at" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_provider_locations_updated_at" BEFORE UPDATE ON "public"."provider_locations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_services_updated_at" BEFORE UPDATE ON "public"."services" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."admin_permissions"
    ADD CONSTRAINT "admin_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."admin_permissions"
    ADD CONSTRAINT "admin_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_chat_conversations"
    ADD CONSTRAINT "ai_chat_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ai_chat_messages"
    ADD CONSTRAINT "ai_chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_chat_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."availability_slots"
    ADD CONSTRAINT "availability_slots_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."availability_slots"
    ADD CONSTRAINT "availability_slots_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."booking_messages"
    ADD CONSTRAINT "booking_messages_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "public"."availability_slots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."external_calendar_connections"
    ADD CONSTRAINT "external_calendar_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."external_events"
    ADD CONSTRAINT "external_events_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "public"."external_calendar_connections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kb_chunks"
    ADD CONSTRAINT "kb_chunks_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."kb_articles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kb_suggestions"
    ADD CONSTRAINT "kb_suggestions_target_article_id_fkey" FOREIGN KEY ("target_article_id") REFERENCES "public"."kb_articles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."kb_suggestions"
    ADD CONSTRAINT "kb_suggestions_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."knowledge_base"
    ADD CONSTRAINT "knowledge_base_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."knowledge_base"
    ADD CONSTRAINT "knowledge_base_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."support_categories"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_calendars"
    ADD CONSTRAINT "provider_calendars_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."external_calendar_systems"("id");



ALTER TABLE ONLY "public"."provider_calendars"
    ADD CONSTRAINT "provider_google_calendar_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_locations"
    ADD CONSTRAINT "provider_locations_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_schedules"
    ADD CONSTRAINT "provider_schedules_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."security_logs"
    ADD CONSTRAINT "security_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_automation_rules"
    ADD CONSTRAINT "support_automation_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."support_conversations"
    ADD CONSTRAINT "support_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."support_messages"
    ADD CONSTRAINT "support_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."support_messages"
    ADD CONSTRAINT "support_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."support_categories"("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."support_unanswered_questions"
    ADD CONSTRAINT "support_unanswered_questions_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."knowledge_base"("id");



ALTER TABLE ONLY "public"."support_unanswered_questions"
    ADD CONSTRAINT "support_unanswered_questions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage all roles" ON "public"."user_roles" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "Authenticated users can create conversations" ON "public"."support_conversations" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Customers can create bookings" ON "public"."bookings" FOR INSERT WITH CHECK ((("auth"."uid"() = "customer_id") AND (NOT "public"."is_user_blocked"("customer_id", "vendor_id"))));



CREATE POLICY "Customers can create reviews" ON "public"."reviews" FOR INSERT WITH CHECK (("auth"."uid"() = "customer_id"));



CREATE POLICY "Customers can view active locations" ON "public"."provider_locations" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Customers can view active services" ON "public"."services" FOR SELECT USING ((("is_active" = true) AND (NOT "public"."is_user_blocked"("auth"."uid"(), "vendor_id"))));



CREATE POLICY "Customers can view available slots" ON "public"."availability_slots" FOR SELECT USING (("is_booked" = false));



CREATE POLICY "Public profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Service role can access all alerts" ON "public"."analytics_alerts" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can access all analytics" ON "public"."analytics_events" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can access all feature usage" ON "public"."feature_usage" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can access all funnels" ON "public"."conversion_funnels" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can access all geographic" ON "public"."geographic_analytics" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can access all page analytics" ON "public"."page_analytics" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can access all segments" ON "public"."user_segments" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can access all user analytics" ON "public"."user_analytics" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can create blocks" ON "public"."user_blocks" FOR INSERT WITH CHECK (("auth"."uid"() = "blocker_id"));



CREATE POLICY "Users can delete own conversations" ON "public"."support_conversations" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own calendar connections" ON "public"."external_calendar_connections" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own notifications" ON "public"."notifications" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own roles" ON "public"."user_roles" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own calendar connections" ON "public"."external_calendar_connections" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own roles" ON "public"."user_roles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read all profiles" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Users can read analytics summaries" ON "public"."analytics_events" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can read geographic summaries" ON "public"."geographic_analytics" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can read page summaries" ON "public"."page_analytics" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can remove their own blocks" ON "public"."user_blocks" FOR DELETE USING (("auth"."uid"() = "blocker_id"));



CREATE POLICY "Users can update own bookings" ON "public"."bookings" FOR UPDATE USING ((("auth"."uid"() = "customer_id") OR ("auth"."uid"() = "vendor_id")));



CREATE POLICY "Users can update own conversations" ON "public"."support_conversations" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own calendar connections" ON "public"."external_calendar_connections" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own roles" ON "public"."user_roles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own bookings" ON "public"."bookings" FOR SELECT USING ((("auth"."uid"() = "customer_id") OR ("auth"."uid"() = "vendor_id")));



CREATE POLICY "Users can view own conversations" ON "public"."support_conversations" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view relevant reviews" ON "public"."reviews" FOR SELECT USING ((("auth"."uid"() = "customer_id") OR ("auth"."uid"() = "vendor_id")));



CREATE POLICY "Users can view their own blocks" ON "public"."user_blocks" FOR SELECT USING ((("auth"."uid"() = "blocker_id") OR ("auth"."uid"() = "blocked_id")));



CREATE POLICY "Users can view their own calendar connections" ON "public"."external_calendar_connections" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own external events" ON "public"."external_events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."external_calendar_connections"
  WHERE (("external_calendar_connections"."id" = "external_events"."connection_id") AND ("external_calendar_connections"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own roles" ON "public"."user_roles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Vendors can manage own availability" ON "public"."availability_slots" USING (("auth"."uid"() = "vendor_id"));



CREATE POLICY "Vendors can manage own locations" ON "public"."provider_locations" USING (("auth"."uid"() = "vendor_id"));



CREATE POLICY "Vendors can manage own services" ON "public"."services" USING (("auth"."uid"() = "vendor_id"));



ALTER TABLE "public"."admin_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_permissions_read" ON "public"."admin_permissions" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



ALTER TABLE "public"."ai_chat_conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ai_chat_conversations_user_access" ON "public"."ai_chat_conversations" USING ((("user_id" = "auth"."uid"()) OR (("user_id" IS NULL) AND ("session_id" IS NOT NULL)) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'agent'::"text"])))))));



ALTER TABLE "public"."ai_chat_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ai_chat_messages_conversation_access" ON "public"."ai_chat_messages" USING ((EXISTS ( SELECT 1
   FROM "public"."ai_chat_conversations" "ac"
  WHERE (("ac"."id" = "ai_chat_messages"."conversation_id") AND (("ac"."user_id" = "auth"."uid"()) OR (("ac"."user_id" IS NULL) AND ("ac"."session_id" IS NOT NULL)) OR (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'agent'::"text"]))))))))));



ALTER TABLE "public"."analytics_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."availability_slots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."booking_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "booking_messages_access" ON "public"."booking_messages" USING (((EXISTS ( SELECT 1
   FROM "public"."bookings" "b"
  WHERE (("b"."id" = "booking_messages"."booking_id") AND (("b"."customer_id" = "auth"."uid"()) OR ("b"."vendor_id" = "auth"."uid"()))))) OR ("auth"."role"() = 'service_role'::"text"))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."bookings" "b"
  WHERE (("b"."id" = "booking_messages"."booking_id") AND (("b"."customer_id" = "auth"."uid"()) OR ("b"."vendor_id" = "auth"."uid"()))))) OR ("auth"."role"() = 'service_role'::"text")));



ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversion_funnels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."external_calendar_connections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."external_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."geographic_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kb_articles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kb_chunks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kb_suggestions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."knowledge_base" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "knowledge_base_public_read" ON "public"."knowledge_base" FOR SELECT USING (("is_published" = true));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."page_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_own_update" ON "public"."profiles" FOR UPDATE USING ((("id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "admin_profile"
  WHERE (("admin_profile"."id" = "auth"."uid"()) AND ("admin_profile"."role" = 'admin'::"text"))))));



CREATE POLICY "profiles_public_read" ON "public"."profiles" FOR SELECT USING ((("id" = "auth"."uid"()) OR (("role" = 'vendor'::"text") AND ("auth"."uid"() IS NOT NULL)) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "admin_profile"
  WHERE (("admin_profile"."id" = "auth"."uid"()) AND ("admin_profile"."role" = 'admin'::"text"))))));



ALTER TABLE "public"."provider_locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rate_limits" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rate_limits_user_read" ON "public"."rate_limits" FOR SELECT USING (((("identifier")::"text" = ("auth"."uid"())::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."security_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "security_logs_admin_read" ON "public"."security_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "security_logs_system_insert" ON "public"."security_logs" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_automation_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "support_categories_public_read" ON "public"."support_categories" FOR SELECT USING (("is_active" = true));



ALTER TABLE "public"."support_conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "support_messages_ticket_access" ON "public"."support_messages" USING ((EXISTS ( SELECT 1
   FROM "public"."support_tickets" "st"
  WHERE (("st"."id" = "support_messages"."ticket_id") AND (("st"."user_id" = "auth"."uid"()) OR ("st"."assigned_to" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'agent'::"text"]))))))))));



ALTER TABLE "public"."support_tickets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "support_tickets_user_access" ON "public"."support_tickets" USING ((("user_id" = "auth"."uid"()) OR ("assigned_to" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'agent'::"text"])))))));



ALTER TABLE "public"."support_unanswered_questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "unanswered_insert" ON "public"."support_unanswered_questions" FOR INSERT WITH CHECK (true);



CREATE POLICY "unanswered_read_update" ON "public"."support_unanswered_questions" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'agent'::"text"]))))));



ALTER TABLE "public"."user_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_blocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_segments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_sessions_own" ON "public"."user_sessions" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."add_default_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_default_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_default_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."add_user_role"("target_user_id" "uuid", "new_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_user_role"("target_user_id" "uuid", "new_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_user_role"("target_user_id" "uuid", "new_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_conversion_rate"("start_date" "date", "end_date" "date", "vendor_id_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_conversion_rate"("start_date" "date", "end_date" "date", "vendor_id_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_conversion_rate"("start_date" "date", "end_date" "date", "vendor_id_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_identifier" character varying, "p_action_type" character varying, "p_max_attempts" integer, "p_window_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_identifier" character varying, "p_action_type" character varying, "p_max_attempts" integer, "p_window_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_identifier" character varying, "p_action_type" character varying, "p_max_attempts" integer, "p_window_minutes" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_security_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_security_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_security_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."escalate_ai_chat_to_human"("p_conversation_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."escalate_ai_chat_to_human"("p_conversation_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."escalate_ai_chat_to_human"("p_conversation_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_ticket_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_ticket_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_ticket_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_beta_feature"("user_id" "uuid", "feature_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_beta_feature"("user_id" "uuid", "feature_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_beta_feature"("user_id" "uuid", "feature_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_geographic_stats"("p_country" "text", "p_date" "date", "p_event_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_geographic_stats"("p_country" "text", "p_date" "date", "p_event_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_geographic_stats"("p_country" "text", "p_date" "date", "p_event_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_beta_user"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_beta_user"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_beta_user"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_blocked"("user_a" "uuid", "user_b" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_blocked"("user_a" "uuid", "user_b" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_blocked"("user_a" "uuid", "user_b" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_security_event"("p_event_type" character varying, "p_user_id" "uuid", "p_ip_address" "text", "p_user_agent" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_security_event"("p_event_type" character varying, "p_user_id" "uuid", "p_ip_address" "text", "p_user_agent" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_security_event"("p_event_type" character varying, "p_user_id" "uuid", "p_ip_address" "text", "p_user_agent" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_kb"("query_embedding" "extensions"."vector", "match_count" integer, "min_sim" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."match_kb"("query_embedding" "extensions"."vector", "match_count" integer, "min_sim" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_kb"("query_embedding" "extensions"."vector", "match_count" integer, "min_sim" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_user_role"("target_user_id" "uuid", "old_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_user_role"("target_user_id" "uuid", "old_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_user_role"("target_user_id" "uuid", "old_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_knowledge_base"("p_query" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_knowledge_base"("p_query" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_knowledge_base"("p_query" "text", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."track_feature_usage"("feature_name_param" "text", "time_spent_param" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."track_feature_usage"("feature_name_param" "text", "time_spent_param" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_feature_usage"("feature_name_param" "text", "time_spent_param" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_generate_ticket_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_generate_ticket_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_generate_ticket_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_log_profile_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_log_profile_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_log_profile_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_knowledge_base_search_vector"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_knowledge_base_search_vector"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_knowledge_base_search_vector"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_analytics"("user_id_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_analytics"("user_id_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_analytics"("user_id_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_role"("check_user_id" "uuid", "check_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_role"("check_user_id" "uuid", "check_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_role"("check_user_id" "uuid", "check_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_admin_user"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_admin_user"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_admin_user"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."admin_permissions" TO "anon";
GRANT ALL ON TABLE "public"."admin_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."ai_chat_conversations" TO "anon";
GRANT ALL ON TABLE "public"."ai_chat_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_chat_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."ai_chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."ai_chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_alerts" TO "anon";
GRANT ALL ON TABLE "public"."analytics_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_events" TO "anon";
GRANT ALL ON TABLE "public"."analytics_events" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_events" TO "service_role";



GRANT ALL ON TABLE "public"."app_settings" TO "anon";
GRANT ALL ON TABLE "public"."app_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."app_settings" TO "service_role";



GRANT ALL ON TABLE "public"."availability_slots" TO "anon";
GRANT ALL ON TABLE "public"."availability_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."availability_slots" TO "service_role";



GRANT ALL ON TABLE "public"."booking_messages" TO "anon";
GRANT ALL ON TABLE "public"."booking_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."booking_messages" TO "service_role";



GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."conversion_funnels" TO "anon";
GRANT ALL ON TABLE "public"."conversion_funnels" TO "authenticated";
GRANT ALL ON TABLE "public"."conversion_funnels" TO "service_role";



GRANT ALL ON TABLE "public"."external_calendar_connections" TO "anon";
GRANT ALL ON TABLE "public"."external_calendar_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."external_calendar_connections" TO "service_role";



GRANT ALL ON TABLE "public"."external_calendar_systems" TO "anon";
GRANT ALL ON TABLE "public"."external_calendar_systems" TO "authenticated";
GRANT ALL ON TABLE "public"."external_calendar_systems" TO "service_role";



GRANT ALL ON TABLE "public"."external_events" TO "anon";
GRANT ALL ON TABLE "public"."external_events" TO "authenticated";
GRANT ALL ON TABLE "public"."external_events" TO "service_role";



GRANT ALL ON TABLE "public"."feature_usage" TO "anon";
GRANT ALL ON TABLE "public"."feature_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_usage" TO "service_role";



GRANT ALL ON TABLE "public"."geographic_analytics" TO "anon";
GRANT ALL ON TABLE "public"."geographic_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."geographic_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."kb_articles" TO "anon";
GRANT ALL ON TABLE "public"."kb_articles" TO "authenticated";
GRANT ALL ON TABLE "public"."kb_articles" TO "service_role";



GRANT ALL ON TABLE "public"."kb_chunks" TO "anon";
GRANT ALL ON TABLE "public"."kb_chunks" TO "authenticated";
GRANT ALL ON TABLE "public"."kb_chunks" TO "service_role";



GRANT ALL ON TABLE "public"."kb_suggestions" TO "anon";
GRANT ALL ON TABLE "public"."kb_suggestions" TO "authenticated";
GRANT ALL ON TABLE "public"."kb_suggestions" TO "service_role";



GRANT ALL ON TABLE "public"."knowledge_base" TO "anon";
GRANT ALL ON TABLE "public"."knowledge_base" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge_base" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."page_analytics" TO "anon";
GRANT ALL ON TABLE "public"."page_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."page_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."provider_calendars" TO "anon";
GRANT ALL ON TABLE "public"."provider_calendars" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_calendars" TO "service_role";



GRANT ALL ON TABLE "public"."provider_locations" TO "anon";
GRANT ALL ON TABLE "public"."provider_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_locations" TO "service_role";



GRANT ALL ON TABLE "public"."provider_schedules" TO "anon";
GRANT ALL ON TABLE "public"."provider_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limits" TO "anon";
GRANT ALL ON TABLE "public"."rate_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."security_logs" TO "anon";
GRANT ALL ON TABLE "public"."security_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."security_logs" TO "service_role";



GRANT ALL ON TABLE "public"."services" TO "anon";
GRANT ALL ON TABLE "public"."services" TO "authenticated";
GRANT ALL ON TABLE "public"."services" TO "service_role";



GRANT ALL ON TABLE "public"."support_automation_rules" TO "anon";
GRANT ALL ON TABLE "public"."support_automation_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."support_automation_rules" TO "service_role";



GRANT ALL ON TABLE "public"."support_categories" TO "anon";
GRANT ALL ON TABLE "public"."support_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."support_categories" TO "service_role";



GRANT ALL ON TABLE "public"."support_conversations" TO "anon";
GRANT ALL ON TABLE "public"."support_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."support_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."support_messages" TO "anon";
GRANT ALL ON TABLE "public"."support_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."support_messages" TO "service_role";



GRANT ALL ON TABLE "public"."support_tickets" TO "anon";
GRANT ALL ON TABLE "public"."support_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."support_tickets" TO "service_role";



GRANT ALL ON TABLE "public"."support_unanswered_questions" TO "anon";
GRANT ALL ON TABLE "public"."support_unanswered_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."support_unanswered_questions" TO "service_role";



GRANT ALL ON TABLE "public"."user_analytics" TO "anon";
GRANT ALL ON TABLE "public"."user_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."user_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."user_blocks" TO "anon";
GRANT ALL ON TABLE "public"."user_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."user_role_summary" TO "anon";
GRANT ALL ON TABLE "public"."user_role_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."user_role_summary" TO "service_role";



GRANT ALL ON TABLE "public"."user_segments" TO "anon";
GRANT ALL ON TABLE "public"."user_segments" TO "authenticated";
GRANT ALL ON TABLE "public"."user_segments" TO "service_role";



GRANT ALL ON TABLE "public"."user_sessions" TO "anon";
GRANT ALL ON TABLE "public"."user_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."v_provider_calendar_connections" TO "anon";
GRANT ALL ON TABLE "public"."v_provider_calendar_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."v_provider_calendar_connections" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






RESET ALL;
