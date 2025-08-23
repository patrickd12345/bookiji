import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get("timeRange") || "30d";
    const specialtyId = searchParams.get("specialtyId");
    
    // Calculate date range
    const now = new Date();
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365;
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

    let analytics: any = {};

    if (specialtyId) {
      // Single specialty analytics
      analytics = await getSpecialtyAnalytics(specialtyId, startDate);
    } else {
      // Overall specialty analytics
      analytics = await getAllSpecialtiesAnalytics(startDate);
    }

    return NextResponse.json({
      success: true,
      analytics,
      timeRange,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("Specialty analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function getSpecialtyAnalytics(specialtyId: string, startDate: Date) {
  // Get specialty details
  const { data: specialty } = await supabase
    .from("specialties")
    .select("id, name, parent_id, path")
    .eq("id", specialtyId)
    .single();

  if (!specialty) {
    throw new Error("Specialty not found");
  }

  // Get vendor count for this specialty
  const { count: vendorCount } = await supabase
    .from("vendor_specialties")
    .select("*", { count: "exact", head: true })
    .eq("specialty_id", specialtyId);

  // Get booking analytics for this specialty
  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      *,
      services!inner(*),
      profiles!inner(
        vendor_specialties!inner(
          specialty_id
        )
      )
    `)
    .eq("profiles.vendor_specialties.specialty_id", specialtyId)
    .gte("created_at", startDate.toISOString());

  // Get revenue analytics
  const totalRevenue = bookings?.reduce((sum, booking) => 
    sum + (booking.total_amount_cents || 0), 0) || 0;

  // Get booking trends over time
  const bookingTrends = getBookingTrends(bookings || [], startDate);

  // Get top performing vendors in this specialty
  const { data: topVendors } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      business_name,
      average_rating,
      total_bookings,
      vendor_specialties!inner(
        specialty_id,
        is_primary
      )
    `)
    .eq("vendor_specialties.specialty_id", specialtyId)
    .eq("role", "vendor")
    .order("total_bookings", { ascending: false })
    .limit(10);

  // Get geographic distribution
  const { data: locations } = await supabase
    .from("provider_locations")
    .select(`
      latitude,
      longitude,
      profiles!inner(
        vendor_specialties!inner(
          specialty_id
        )
      )
    `)
    .eq("profiles.vendor_specialties.specialty_id", specialtyId);

  const geographicDistribution = getGeographicDistribution(locations || []);

  return {
    specialty,
    metrics: {
      vendorCount: vendorCount || 0,
      totalBookings: bookings?.length || 0,
      totalRevenue: Math.round(totalRevenue / 100), // Convert to dollars
      averageRating: calculateAverageRating(bookings || []),
      bookingTrends,
      topVendors: topVendors || [],
      geographicDistribution
    }
  };
}

async function getAllSpecialtiesAnalytics(startDate: Date) {
  // Get all specialties with their metrics
  const { data: specialties } = await supabase
    .from("specialties")
    .select("id, name, parent_id, path")
    .eq("is_active", true)
    .order("name");

  const specialtyMetrics = await Promise.all(
    (specialties || []).map(async (specialty) => {
      const { count: vendorCount } = await supabase
        .from("vendor_specialties")
        .select("*", { count: "exact", head: true })
        .eq("specialty_id", specialty.id);

      const { count: bookingCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startDate.toISOString());

      return {
        ...specialty,
        vendorCount: vendorCount || 0,
        bookingCount: bookingCount || 0
      };
    })
  );

  // Get overall trends
  const { data: allBookings } = await supabase
    .from("bookings")
    .select("created_at, total_amount_cents")
    .gte("created_at", startDate.toISOString());

  const overallTrends = getBookingTrends(allBookings || [], startDate);

  // Get specialty popularity ranking
  const popularityRanking = specialtyMetrics
    .sort((a, b) => b.bookingCount - a.bookingCount)
    .slice(0, 10);

  return {
    overview: {
      totalSpecialties: specialties?.length || 0,
      totalVendors: specialtyMetrics.reduce((sum, s) => sum + s.vendorCount, 0),
      totalBookings: allBookings?.length || 0,
      overallTrends
    },
    specialtyMetrics,
    popularityRanking
  };
}

function getBookingTrends(bookings: any[], startDate: Date) {
  const trends: Record<string, { count: number; revenue: number }> = {};
  
  // Group by day
  bookings.forEach(booking => {
    const date = new Date(booking.created_at).toISOString().split('T')[0];
    if (!trends[date]) {
      trends[date] = { count: 0, revenue: 0 };
    }
    trends[date].count++;
    trends[date].revenue += booking.total_amount_cents || 0;
  });

  // Fill in missing dates
  const dates = [];
  const current = new Date(startDate);
  const end = new Date();
  
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    if (!trends[dateStr]) {
      trends[dateStr] = { count: 0, revenue: 0 };
    }
    dates.push(dateStr);
    current.setDate(current.getDate() + 1);
  }

  // Convert to sorted array
  return dates.map(date => ({
    date,
    ...trends[date]
  }));
}

function calculateAverageRating(bookings: any[]) {
  const ratings = bookings
    .map(b => b.rating)
    .filter(r => r && r > 0);
  
  if (ratings.length === 0) return 0;
  
  const sum = ratings.reduce((acc, r) => acc + r, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

function getGeographicDistribution(locations: any[]) {
  const countries: Record<string, number> = {};
  const cities: Record<string, number> = {};
  
  locations.forEach(location => {
    if (location.latitude && location.longitude) {
      // This is a simplified approach - in production you'd use a geocoding service
      // to get actual country/city from coordinates
      const country = "Unknown"; // Placeholder
      const city = "Unknown"; // Placeholder
      
      countries[country] = (countries[country] || 0) + 1;
      cities[city] = (cities[city] || 0) + 1;
    }
  });

  return {
    countries: Object.entries(countries).map(([name, count]) => ({ name, count })),
    cities: Object.entries(cities).map(([name, count]) => ({ name, count }))
  };
}
