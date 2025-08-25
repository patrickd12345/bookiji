-- KB Article Change Trigger
-- This automatically fires the indexing worker when articles are inserted/updated

-- Function to notify the indexing worker
create or replace function kb_article_changed()
returns trigger
language plpgsql
as $$
begin
  -- Notify the indexing worker via HTTP
  perform
    net.http_post(
      url := 'https://' || current_setting('app.settings.supabase_url') || '.functions.supabase.co/kb-index',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'article_id', new.id,
        'action', case 
          when tg_op = 'INSERT' then 'create'
          when tg_op = 'UPDATE' then 'update'
          else 'delete'
        end,
        'timestamp', now()
      )
    );
  
  return new;
end;
$$;

-- Drop existing trigger if it exists
drop trigger if exists kb_article_changed_trigger on kb_articles;

-- Create the trigger
create trigger kb_article_changed_trigger
after insert or update on kb_articles
for each row execute function kb_article_changed();

-- Note: You'll need to enable the 'net' extension and set the app.settings
-- Run these commands in your Supabase dashboard:
-- 
-- 1. Enable the net extension:
--    create extension if not exists "net";
--
-- 2. Set the app settings (replace with your actual values):
--    alter database postgres set "app.settings.supabase_url" = 'your-project-ref';
--    alter database postgres set "app.settings.supabase_service_role_key" = 'your-service-role-key';
--
-- 3. Deploy the kb-index Edge Function:
--    supabase functions deploy kb-index
