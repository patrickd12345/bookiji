import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const { status, admin_notes, parent_id } = await req.json();

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Get the suggestion details
    const { data: suggestion, error: fetchError } = await supabase
      .from("specialty_suggestions")
      .select("*")
      .eq("id", resolvedParams.id)
      .single();

    if (fetchError || !suggestion) {
      console.error("Suggestion fetch error:", fetchError);
      return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
    }

    // Update the suggestion status
    const updateData: any = {
      status,
      reviewed_at: new Date().toISOString(),
      reviewer_id: 'admin', // TODO: Get actual admin user ID
    };

    if (admin_notes) {
      updateData.admin_notes = admin_notes;
    }

    const { error: updateError } = await supabase
      .from("specialty_suggestions")
      .update(updateData)
      .eq("id", resolvedParams.id);

    if (updateError) {
      console.error("Suggestion update error:", updateError);
      return NextResponse.json({ error: "Failed to update suggestion" }, { status: 500 });
    }

    // If approved, create the new specialty
    if (status === 'approved') {
      const { data: newSpecialty, error: createError } = await supabase
        .from("specialties")
        .insert({
          name: suggestion.proposed_name,
          parent_id: parent_id || suggestion.parent_id,
          is_active: true
        })
        .select()
        .single();

      if (createError) {
        console.error("Specialty creation error:", createError);
        return NextResponse.json({ 
          error: "Suggestion approved but failed to create specialty" 
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: "Suggestion approved and specialty created",
        specialty: newSpecialty
      });
    }

    return NextResponse.json({
      success: true,
      message: "Suggestion rejected"
    });

  } catch (error) {
    console.error("Suggestion review API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const { data, error } = await supabase
      .from("specialty_suggestions")
      .select(`
        *,
        specialties!specialty_suggestions_parent_id_fkey(name),
        app_users!specialty_suggestions_app_user_id_fkey(display_name)
      `)
      .eq("id", resolvedParams.id)
      .single();

    if (error) {
      console.error("Suggestion fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch suggestion" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Suggestion API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
