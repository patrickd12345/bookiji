import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// Use local Supabase for development
const supabaseUrl = process.env.NODE_ENV === 'production' 
  ? process.env.NEXT_PUBLIC_SUPABASE_URL!
  : 'http://localhost:54321';

const supabaseKey = process.env.NODE_ENV === 'production'
  ? process.env.SUPABASE_SERVICE_ROLE_KEY!
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

export interface ProviderCandidate {
  provider_id: string;
  name: string;
  specialty: string;
  price_cents: number;
  rating: number;
  distance_km: number;
  eta_minutes: number;
  location: {
    lat: number;
    lon: number;
  };
}

export interface ProviderSearchCriteria {
  intent: string;
  location: {
    lat: number;
    lon: number;
  };
  when_iso?: string;
  max_distance_km?: number;
  max_price_cents?: number;
  min_rating?: number;
  limit?: number;
}

interface ProviderProfile {
  id: string;
  display_name: string | null;
  role: string;
  provider_locations: Array<{
    lat: number;
    lon: number;
  }>;
}

interface ServiceData {
  id: string;
  provider_id: string;
  title: string;
  price_cents: number;
  is_active: boolean;
}

interface ReviewData {
  provider_id: string;
  overall_quality: number | null;
}

export class ProviderMatchingService {
  /**
   * Find provider candidates based on search criteria
   */
  static async findCandidates(criteria: ProviderSearchCriteria): Promise<ProviderCandidate[]> {
    try {
      // First, find specialties that match the intent
      const { data: specialties, error: specialtyError } = await supabase
        .from('specialties')
        .select('id, name, slug')
        .or(`name.ilike.%${criteria.intent}%,slug.ilike.%${criteria.intent}%`)
        .limit(5);

      if (specialtyError) {
        logger.error('Error finding specialties', new Error(specialtyError.message), { intent: criteria.intent });
        return [];
      }

      if (!specialties || specialties.length === 0) {
        // Fallback: search in services table
        return await this.searchInServices(criteria);
      }

      // Find providers with matching specialties
      const specialtyIds = specialties.map(s => s.id);
      
      const { data: vendorSpecialties, error: vsError } = await supabase
        .from('vendor_specialties')
        .select('app_user_id, specialty_id')
        .in('specialty_id', specialtyIds);

      if (vsError) {
        logger.error('Error finding vendor specialties', new Error(vsError.message), { specialty_ids: specialtyIds });
        return [];
      }

      if (!vendorSpecialties || vendorSpecialties.length === 0) {
        return await this.searchInServices(criteria);
      }

      const providerIds = vendorSpecialties.map(vs => vs.app_user_id);

      // Get provider profiles and locations
      const { data: providers, error: providerError } = await supabase
        .from('profiles')
        .select(`
          id,
          display_name,
          role,
          provider_locations (
            lat,
            lon
          )
        `)
        .in('id', providerIds)
        .eq('role', 'provider')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .eq('is_active', true) as { data: ProviderProfile[] | null; error: any };

      if (providerError) {
        logger.error('Error finding providers', new Error(providerError.message), { provider_ids: providerIds });
        return [];
      }

      // Get services and pricing
      const { data: services, error: serviceError } = await supabase
        .from('services')
        .select(`
          id,
          provider_id,
          title,
          price_cents,
          is_active
        `)
        .in('provider_id', providerIds)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .eq('is_active', true) as { data: ServiceData[] | null; error: any };

      if (serviceError) {
        logger.error('Error finding services', new Error(serviceError.message), { provider_ids: providerIds });
        return [];
      }

      // Get provider ratings
      const { data: ratings, error: ratingError } = await supabase
        .from('reviews')
        .select(`
          provider_id,
          overall_quality
        `)
        .in('provider_id', providerIds)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .eq('status', 'published') as { data: ReviewData[] | null; error: any };

      if (ratingError) {
        logger.error('Error finding ratings', new Error(ratingError.message), { provider_ids: providerIds });
      }

      // Build candidate list
      const candidates: ProviderCandidate[] = [];
      
      for (const provider of providers || []) {
        const providerServices = services?.filter(s => s.provider_id === provider.id) || [];
        const providerRatings = ratings?.filter(r => r.provider_id === provider.id) || [];
        
        if (providerServices.length === 0) continue;
        
        const location = provider.provider_locations?.[0];
        if (!location) continue;

        // Calculate distance
        const distance = this.calculateDistance(
          criteria.location.lat,
          criteria.location.lon,
          location.lat,
          location.lon
        );

        if (criteria.max_distance_km && distance > criteria.max_distance_km) {
          continue;
        }

        // Calculate average rating
        const avgRating = providerRatings.length > 0
          ? providerRatings.reduce((sum, r) => sum + (r.overall_quality || 0), 0) / providerRatings.length
          : 4.0; // Default rating

        if (criteria.min_rating && avgRating < criteria.min_rating) {
          continue;
        }

        // Use the first service for pricing (could be enhanced to find best match)
        const service = providerServices[0];
        
        if (criteria.max_price_cents && service.price_cents > criteria.max_price_cents) {
          continue;
        }

        // Estimate ETA based on distance
        const etaMinutes = Math.max(15, Math.round(distance * 2)); // 2 min per km, minimum 15 min

        candidates.push({
          provider_id: provider.id,
          name: provider.display_name || 'Provider',
          specialty: specialties.find(s => 
            vendorSpecialties.some(vs => 
              vs.app_user_id === provider.id && vs.specialty_id === s.id
            )
          )?.name || criteria.intent,
          price_cents: service.price_cents,
          rating: avgRating,
          distance_km: distance,
          eta_minutes: etaMinutes,
          location: {
            lat: location.lat,
            lon: location.lon
          }
        });
      }

      // Sort by relevance (rating, distance, price)
      candidates.sort((a, b) => {
        const scoreA = (a.rating * 0.4) + (1 / (a.distance_km + 1) * 0.4) + (1 / (a.price_cents / 100) * 0.2);
        const scoreB = (b.rating * 0.4) + (1 / (b.distance_km + 1) * 0.4) + (1 / (b.price_cents / 100) * 0.2);
        return scoreB - scoreA;
      });

      return candidates.slice(0, criteria.limit || 10);

    } catch (error) {
      logger.error('Error in provider matching', error instanceof Error ? error : new Error(String(error)), { intent: criteria.intent });
      return [];
    }
  }

  /**
   * Fallback search in services table
   */
  private static async searchInServices(criteria: ProviderSearchCriteria): Promise<ProviderCandidate[]> {
    try {
      interface ServiceWithProfile {
        id: string;
        provider_id: string;
        title: string;
        price_cents: number;
        profiles: {
          id: string;
          display_name: string | null;
          role: string;
          provider_locations: Array<{
            lat: number;
            lon: number;
          }>;
        };
      }

      const { data: services, error } = await supabase
        .from('services')
        .select(`
          id,
          provider_id,
          title,
          price_cents,
          profiles!inner (
            id,
            display_name,
            role,
            provider_locations (
              lat,
              lon
            )
          )
        `)
        .or(`title.ilike.%${criteria.intent}%,description.ilike.%${criteria.intent}%`)
        .eq('is_active', true)
        .eq('profiles.role', 'provider')
        .eq('profiles.is_active', true)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .limit(10) as { data: ServiceWithProfile[] | null; error: any };

      if (error || !services) {
        logger.error('Error in fallback service search', error instanceof Error ? error : new Error(String(error)), { intent: criteria.intent });
        return [];
      }

      return services.map(service => {
        const location = service.profiles.provider_locations?.[0];
        const distance = location ? this.calculateDistance(
          criteria.location.lat,
          criteria.location.lon,
          location.lat,
          location.lon
        ) : 0;

        return {
          provider_id: service.provider_id,
          name: service.profiles.display_name || 'Provider',
          specialty: service.title,
          price_cents: service.price_cents,
          rating: 4.0, // Default rating
          distance_km: distance,
          eta_minutes: Math.max(15, Math.round(distance * 2)),
          location: location ? { lat: location.lat, lon: location.lon } : criteria.location
        };
      }).filter(c => !criteria.max_distance_km || c.distance_km <= criteria.max_distance_km)
        .filter(c => !criteria.max_price_cents || c.price_cents <= criteria.max_price_cents)
        .sort((a, b) => a.distance_km - b.distance_km)
        .slice(0, criteria.limit || 10);

    } catch (error) {
      logger.error('Error in fallback search', error instanceof Error ? error : new Error(String(error)), { intent: criteria.intent });
      return [];
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
