// Shout-Out System Types
// Comprehensive TypeScript definitions for the shout-out feature

export interface ShoutOut {
  id: string
  user_id: string
  service_type: string
  description?: string
  location: string // PostGIS POINT format
  radius_km: number
  status: 'active' | 'expired' | 'closed'
  expires_at: string // ISO timestamp
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
}

export interface ShoutOutRecipient {
  id: string
  shout_out_id: string
  vendor_id: string
  notified_at: string // ISO timestamp
  response_status: 'pending' | 'viewed' | 'offered' | 'declined'
  created_at: string // ISO timestamp
}

export interface ShoutOutOffer {
  id: string
  shout_out_id: string
  vendor_id: string
  service_id: string
  slot_start: string // ISO timestamp
  slot_end: string // ISO timestamp
  price_cents: number
  message?: string
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'withdrawn'
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
}

// API Request/Response Types

export interface CreateShoutOutRequest {
  service_type: string
  description?: string
  latitude: number
  longitude: number
  radius_km?: number
}

export interface CreateShoutOutResponse {
  success: boolean
  shout_out: ShoutOut
  eligible_vendors_count: number
  error?: string
}

export interface GetShoutOutOffersResponse {
  success: boolean
  offers: RankedOffer[]
  has_expired: boolean
  expires_at: string
  error?: string
}

export interface RankedOffer {
  id: string
  shout_out_id: string
  vendor_id: string
  vendor_name: string
  vendor_rating: number
  vendor_total_reviews: number
  service_id: string
  service_name: string
  slot_start: string // ISO timestamp
  slot_end: string // ISO timestamp
  price_cents: number
  message?: string
  status: string
  distance_km: number
  score: number
  created_at: string // ISO timestamp
}

export interface AcceptOfferRequest {
  // No body parameters - shout-out ID and offer ID come from URL
}

export interface AcceptOfferResponse {
  success: boolean
  booking_id: string
  message: string
  error?: string
}

export interface CreateOfferRequest {
  service_id: string
  slot_start: string // ISO timestamp
  slot_end: string // ISO timestamp
  price_cents: number
  message?: string
}

export interface CreateOfferResponse {
  success: boolean
  offer_id: string
  message: string
  error?: string
}

export interface VendorShoutOut {
  id: string
  service_type: string
  description?: string
  radius_km: number
  status: string
  expires_at: string // ISO timestamp
  created_at: string // ISO timestamp
  response_status: 'pending' | 'viewed' | 'offered' | 'declined'
  notified_at: string // ISO timestamp
  distance_km: number
  existing_offer?: {
    id: string
    price_cents: number
    status: string
    created_at: string // ISO timestamp
  }
}

export interface GetVendorShoutOutsResponse {
  success: boolean
  shout_outs: VendorShoutOut[]
  total: number
  offset: number
  limit: number
  vendor_location?: {
    latitude: number
    longitude: number
  }
  message?: string
  error?: string
}

export interface GetShoutOutDetailsResponse {
  success: boolean
  shout_out: {
    id: string
    service_type: string
    description?: string
    radius_km: number
    status: string
    expires_at: string // ISO timestamp
    created_at: string // ISO timestamp
  }
  existing_offer?: ShoutOutOffer
  can_respond: boolean
  error?: string
}

// Component Props Types

export interface ShoutOutConsentModalProps {
  isOpen: boolean
  onClose: () => void
  onConsent: () => void
  searchQuery: string
  location: string
  serviceCategory: string
  isLoading?: boolean
}

export interface ShoutOutOffersProps {
  shoutOutId: string
  expiresAt: string
  onOfferAccept: (offerId: string) => Promise<void>
  onExpandRadius: () => void
  refreshInterval?: number
}

export interface ShoutOutFlowProps {
  searchQuery: string
  location: string
  latitude: number
  longitude: number
  serviceCategory: string
  radius?: number
}

export interface ShoutOutResponseModalProps {
  isOpen: boolean
  shoutOutId: string
  onClose: () => void
  onSuccess: () => void
}

// Hook Types

export interface UseShoutOutState {
  shoutOut: ShoutOut | null
  loading: boolean
  error: string | null
}

export interface UseShoutOutReturn extends UseShoutOutState {
  createShoutOut: (request: CreateShoutOutRequest) => Promise<ShoutOut | null>
  acceptOffer: (shoutOutId: string, offerId: string) => Promise<{ booking_id: string } | null>
  clearShoutOut: () => void
  reset: () => void
}

// Utility Types

export interface ShoutOutFilters {
  status?: 'active' | 'expired' | 'closed'
  service_type?: string
  limit?: number
  offset?: number
}

export interface ShoutOutMetrics {
  total_created: number
  total_with_offers: number
  average_response_time: number // in minutes
  conversion_rate: number // percentage
  average_offers_per_shout_out: number
}

export interface VendorShoutOutStats {
  total_received: number
  total_responded: number
  total_accepted: number
  response_rate: number // percentage
  acceptance_rate: number // percentage
  average_response_time: number // in minutes
}

// Error Types

export interface ShoutOutError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export class ShoutOutExpiredError extends Error {
  constructor(shoutOutId: string) {
    super(`Shout-out ${shoutOutId} has expired`)
    this.name = 'ShoutOutExpiredError'
  }
}

export class OfferNotAvailableError extends Error {
  constructor(offerId: string) {
    super(`Offer ${offerId} is no longer available`)
    this.name = 'OfferNotAvailableError'
  }
}

export class VendorNotEligibleError extends Error {
  constructor(vendorId: string, shoutOutId: string) {
    super(`Vendor ${vendorId} is not eligible to respond to shout-out ${shoutOutId}`)
    this.name = 'VendorNotEligibleError'
  }
}

// Database Schema Types (for reference)

export interface ShoutOutTable {
  id: string
  user_id: string
  service_type: string
  description?: string
  location: unknown // PostGIS GEOGRAPHY type
  radius_km: number
  status: 'active' | 'expired' | 'closed'
  expires_at: Date
  created_at: Date
  updated_at: Date
}

export interface ShoutOutRecipientTable {
  id: string
  shout_out_id: string
  vendor_id: string
  notified_at: Date
  response_status: 'pending' | 'viewed' | 'offered' | 'declined'
  created_at: Date
}

export interface ShoutOutOfferTable {
  id: string
  shout_out_id: string
  vendor_id: string
  service_id: string
  slot_start: Date
  slot_end: Date
  price_cents: number
  message?: string
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'withdrawn'
  created_at: Date
  updated_at: Date
}

// Event Types (for real-time updates, if implemented)

export interface ShoutOutCreatedEvent {
  type: 'shout_out_created'
  shout_out: ShoutOut
  eligible_vendor_ids: string[]
}

export interface OfferCreatedEvent {
  type: 'offer_created'
  offer: ShoutOutOffer
  shout_out_id: string
  customer_id: string
}

export interface OfferAcceptedEvent {
  type: 'offer_accepted'
  offer: ShoutOutOffer
  booking_id: string
  vendor_id: string
}

export interface ShoutOutExpiredEvent {
  type: 'shout_out_expired'
  shout_out_id: string
  customer_id: string
  offer_count: number
}

export type ShoutOutEvent = 
  | ShoutOutCreatedEvent 
  | OfferCreatedEvent 
  | OfferAcceptedEvent 
  | ShoutOutExpiredEvent
