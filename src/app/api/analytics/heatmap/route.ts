import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';
import { withQueryLogging } from '@/lib/performance/queryLogger';
import { logger } from '@/lib/logger';

interface HeatmapData {
  postal_code: string;
  latitude: number;
  longitude: number;
  booking_count: number;
  revenue: number;
  avg_rating: number;
  unique_providers: number;
  last_booking: string;
}

interface HeatmapParams {
  timeRange: '7d' | '30d' | '90d' | '1y';
  serviceType?: string;
  minBookings?: number;
  radius?: number; // in km
  centerLat?: number;
  centerLng?: number;
}

export async function GET(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>;
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const params: HeatmapParams = {
      timeRange: (searchParams.get('timeRange') as HeatmapParams['timeRange']) || '30d',
      serviceType: searchParams.get('serviceType') || undefined,
      minBookings: searchParams.get('minBookings') ? parseInt(searchParams.get('minBookings')!) : 1,
      radius: searchParams.get('radius') ? parseFloat(searchParams.get('radius')!) : undefined,
      centerLat: searchParams.get('centerLat') ? parseFloat(searchParams.get('centerLat')!) : undefined,
      centerLng: searchParams.get('centerLng') ? parseFloat(searchParams.get('centerLng')!) : undefined
    };

    // Calculate date range
    const timeRangeMap = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };
    const daysBack = timeRangeMap[params.timeRange];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Build heatmap query using a stored procedure for better performance
    const heatmapData = await withQueryLogging(
      async () => {
        const { data, error } = await supabase.rpc('get_booking_heatmap_data', {
          p_start_date: startDate.toISOString(),
          p_end_date: new Date().toISOString(),
          p_service_type: params.serviceType,
          p_min_bookings: params.minBookings,
          p_radius_km: params.radius,
          p_center_lat: params.centerLat,
          p_center_lng: params.centerLng
        });

        if (error) {
          console.error('Heatmap query error:', error);
          throw error;
        }

        return data as HeatmapData[];
      },
      {
        query: 'get_booking_heatmap_data',
        table: 'bookings',
        operation: 'RPC',
        userId: user.id,
        endpoint: '/api/analytics/heatmap'
      }
    );

    // If the RPC doesn't exist, fall back to a regular query
    if (!heatmapData || heatmapData.length === 0) {
      logger.debug('Falling back to direct query for heatmap data');
      
      const fallbackData = await withQueryLogging(
        async () => {
          let query = supabase
            .from('bookings')
            .select(`
              postal_code,
              latitude,
              longitude,
              status,
              total_amount,
              service_type,
              created_at,
              provider:provider_id(rating)
            `)
            .gte('created_at', startDate.toISOString())
            .not('postal_code', 'is', null)
            .not('latitude', 'is', null)
            .not('longitude', 'is', null);

          if (params.serviceType) {
            query = query.eq('service_type', params.serviceType);
          }

          const { data, error } = await query;

          if (error) throw error;

          // Group by postal code and aggregate
          interface Booking {
            postal_code?: string
            latitude?: number
            longitude?: number
            total_amount?: number
            created_at: string
            provider_id?: string
            provider?: {
              rating?: number
            } | Array<{
              rating?: number
            }>
            [key: string]: unknown
          }
          interface GroupedBooking {
            postal_code?: string
            latitude?: number
            longitude?: number
            booking_count: number
            revenue: number
            ratings: number[]
            provider_ids: Set<string>
            last_booking: string
          }
          const bookings = (data || []) as Booking[];
          const grouped = bookings.reduce((acc: Record<string, GroupedBooking>, booking: Booking) => {
            const key = booking.postal_code;
            if (!key) return acc; // Skip if postal_code is undefined
            
            if (!acc[key]) {
              acc[key] = {
                postal_code: booking.postal_code,
                latitude: booking.latitude,
                longitude: booking.longitude,
                booking_count: 0,
                revenue: 0,
                ratings: [],
                provider_ids: new Set(),
                last_booking: booking.created_at
              };
            }

            acc[key].booking_count++;
            acc[key].revenue += booking.total_amount || 0;
            const providerRating = Array.isArray(booking.provider) 
              ? booking.provider[0]?.rating 
              : (booking.provider as { rating?: number } | undefined)?.rating;
            if (providerRating) {
              acc[key].ratings.push(providerRating);
            }
            if (booking.provider_id) {
              acc[key].provider_ids.add(booking.provider_id);
            }
            
            if (booking.created_at > acc[key].last_booking) {
              acc[key].last_booking = booking.created_at;
            }

            return acc;
          }, {});

          // Convert to array and calculate averages
          return Object.values(grouped)
            .filter((item: GroupedBooking) => item.booking_count >= (params.minBookings || 1))
            .map((item: GroupedBooking) => ({
              postal_code: item.postal_code,
              latitude: item.latitude,
              longitude: item.longitude,
              booking_count: item.booking_count,
              revenue: item.revenue,
              avg_rating: item.ratings.length > 0 
                ? item.ratings.reduce((sum: number, rating: number) => sum + rating, 0) / item.ratings.length 
                : 0,
              unique_providers: item.provider_ids.size,
              last_booking: item.last_booking
            }));
        },
        {
          query: 'SELECT bookings with aggregation',
          table: 'bookings',
          operation: 'SELECT',
          userId: user.id,
          endpoint: '/api/analytics/heatmap'
        }
      );

      return NextResponse.json({
        success: true,
        data: fallbackData,
        params,
        source: 'fallback_query',
        count: fallbackData?.length || 0
      });
    }

    return NextResponse.json({
      success: true,
      data: heatmapData,
      params,
      source: 'rpc',
      count: heatmapData.length
    });

  } catch (error) {
    console.error('Heatmap API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch heatmap data' },
      { status: 500 }
    );
  }
}
