import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from("specialties")
      .select("id,name,slug,parent_id,path,is_active,created_at,updated_at")
      .eq("id", params.id)
      .single();

    if (error) {
      console.error("Specialty fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch specialty" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Specialty not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Specialty API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { name, parent_id, is_active } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("specialties")
      .update({ 
        name, 
        parent_id: parent_id || null, 
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString()
      })
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      console.error("Specialty update error:", error);
      return NextResponse.json({ error: "Failed to update specialty" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Specialty update API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if specialty has children
    const { data: children, error: childrenError } = await supabase
      .from("specialties")
      .select("id")
      .eq("parent_id", params.id);

    if (childrenError) {
      console.error("Children check error:", childrenError);
      return NextResponse.json({ error: "Failed to check specialty dependencies" }, { status: 500 });
    }

    if (children && children.length > 0) {
      return NextResponse.json({ 
        error: "Cannot delete specialty with child categories. Please delete or move child categories first." 
      }, { status: 400 });
    }

    // Check if specialty is used by vendors
    const { data: vendorUsage, error: vendorError } = await supabase
      .from("vendor_specialties")
      .select("id")
      .eq("specialty_id", params.id)
      .limit(1);

    if (vendorError) {
      console.error("Vendor usage check error:", vendorError);
      return NextResponse.json({ error: "Failed to check specialty usage" }, { status: 500 });
    }

    if (vendorUsage && vendorUsage.length > 0) {
      return NextResponse.json({ 
        error: "Cannot delete specialty that is currently used by vendors. Please reassign vendors first." 
      }, { status: 400 });
    }

    // Delete the specialty
    const { error } = await supabase
      .from("specialties")
      .delete()
      .eq("id", params.id);

    if (error) {
      console.error("Specialty deletion error:", error);
      return NextResponse.json({ error: "Failed to delete specialty" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Specialty deleted successfully" });
  } catch (error) {
    console.error("Specialty deletion API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

