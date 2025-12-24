import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createClient } from "@supabase/supabase-js";

import { supabaseAdmin as supabase } from '@/lib/supabaseProxies';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { app_user_id, proposed_name, parent_id, details } = body;
    
    if (!proposed_name) {
      return NextResponse.json({ error: "proposed_name required" }, { status: 400 });
    }
    
    const { data, error } = await supabase
      .from("specialty_suggestions")
      .insert({ 
        app_user_id: app_user_id || null, 
        proposed_name, 
        parent_id: parent_id || null, 
        details: details || null 
      })
      .select()
      .single();
      
    if (error) {
      console.error("Suggestion creation error:", error);
      return NextResponse.json({ error: "Failed to create suggestion" }, { status: 500 });
    }
    
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Suggestion API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status");
    const app_user_id = req.nextUrl.searchParams.get("user_id");
    
    let query = supabase
      .from("specialty_suggestions")
      .select(`
        *,
        specialties!specialty_suggestions_parent_id_fkey(name),
        app_users!specialty_suggestions_app_user_id_fkey(display_name)
      `)
      .order("created_at", { ascending: false });
      
    if (status) {
      query = query.eq("status", status);
    }
    
    if (app_user_id) {
      query = query.eq("app_user_id", app_user_id);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error("Suggestions query error:", error);
      return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
    }
    
    return NextResponse.json({ items: data || [] });
  } catch (error) {
    console.error("Suggestions API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


