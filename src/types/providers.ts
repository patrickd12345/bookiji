export interface ProviderService {
  id: string
  name: string
  category: string
  price: number
  duration: number
  description?: string
  available?: boolean
}

export interface ProviderLocation {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  is_primary: boolean
}

export interface Provider {
  id: string
  name: string
  business_name?: string
  bio?: string
  average_rating: number
  total_reviews: number
  distance?: number
  services: ProviderService[]
  provider_locations: ProviderLocation[]
}

export interface SearchFilters {
  query: string
  location: string
  latitude?: number
  longitude?: number
  radius: number
  service_category: string
  min_rating: number
  max_price: number
  availability_date: string
  availability_time: string
  sort_by: 'distance' | 'rating' | 'price' | 'availability' | 'popularity'
}

export interface SearchResults {
  providers: Provider[]
  total: number
  pagination?: {
    limit: number
    offset: number
    has_more: boolean
  }
} 