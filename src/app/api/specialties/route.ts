import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const parent = req.nextUrl.searchParams.get("parent");
  
  try {
    let query = supabase
      .from("specialties")
      .select("id,name,slug,parent_id,path,is_active")
      .eq("is_active", true)
      .order("name");
      
    if (parent === "root") {
      query = query.is("parent_id", null);
    } else if (parent && parent !== "root") {
      query = query.eq("parent_id", parent);
    }
    
    if (q) {
      // Search across names and aliases
      const { data: aliasResults } = await supabase
        .from("specialty_aliases")
        .select("specialty_id")
        .ilike("alias", `%${q}%`);
      
      const aliasIds = aliasResults?.map(r => r.specialty_id) || [];
      
      query = query.or(`name.ilike.%${q}%,id.in.(${aliasIds.join(",")})`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error("Specialties query error:", error);
      return NextResponse.json({ error: "Failed to fetch specialties" }, { status: 500 });
    }
    
    return NextResponse.json({ items: data || [] });
  } catch (error) {
    console.error("Specialties API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, parent_id } = await req.json();
    
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    
    const { data, error } = await supabase
      .from("specialties")
      .insert({ name, parent_id: parent_id || null })
      .select()
      .single();
      
    if (error) {
      console.error("Specialty creation error:", error);
      return NextResponse.json({ error: "Failed to create specialty" }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Specialty creation API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
