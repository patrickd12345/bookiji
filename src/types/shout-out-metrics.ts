// Shout-Out v1.5: Metrics Types
// Types for the enhanced metrics and configuration system

export interface ShoutOutMetrics {
  conversion_rate: number // Percentage (0-1) of shout-outs that result in accepted offers
  avg_response_time_minutes: number // Average time for first vendor response
  resolution_pct: number // Percentage (0-1) of shout-outs that get at least one offer
  total_created: number // Total shout-outs created
  total_accepted: number // Total offers accepted
  total_with_offers: number // Total shout-outs that received offers
  total_responses: number // Total vendor responses
}

export interface ShoutOutConfig {
  enabled: boolean // Whether shout-outs are globally enabled
  default_radius_km: number // Default search radius
  expiry_minutes: number // How long shout-outs stay active
  max_radius_km: number // Maximum allowed radius
  min_radius_km: number // Minimum allowed radius
}

export interface ShoutOutNotification {
  id: string
  vendor_id: string
  shout_out_id: string
  channel: 'in_app' | 'email' | 'sms'
  status: 'pending' | 'sent' | 'failed' | 'cancelled'
  metadata: Record<string, unknown>
  sent_at?: string
  created_at: string
  updated_at: string
}

export interface VendorNotificationPreferences {
  notification_email: boolean
  notification_sms: boolean
  notification_in_app: boolean
}

// Metrics API responses
export interface GetMetricsResponse {
  success: boolean
  metrics: ShoutOutMetrics
  error?: string
}

export interface GetConfigResponse {
  success: boolean
  config: ShoutOutConfig
  error?: string
}

export interface UpdateConfigRequest {
  enabled: boolean
  default_radius_km: number
  expiry_minutes: number
  max_radius_km: number
  min_radius_km: number
}

export interface UpdateConfigResponse {
  success: boolean
  config: ShoutOutConfig
  error?: string
}

// Notification processing types
export interface PendingNotification {
  id: string
  vendor_id: string
  shout_out_id: string
  channel: string
  metadata: Record<string, unknown>
  vendor_email?: string
  vendor_phone?: string
  vendor_name: string
  shout_out_service_type: string
  shout_out_description?: string
}

export interface NotificationProcessResult {
  success: boolean
  processed: number
  failed: number
  errors: string[]
}

// Event tracking types
export type ShoutOutMetricEvent = 'created' | 'offer_sent' | 'offer_accepted' | 'expired'

export interface MetricEventData {
  shout_out_id: string
  vendor_id?: string
  event: ShoutOutMetricEvent
  metadata?: Record<string, unknown>
}

// Hook return types
export interface UseShoutOutMetricsReturn {
  metrics: ShoutOutMetrics | undefined
  isLoading: boolean
  isError: boolean
  error: Error | undefined
  mutate: () => Promise<ShoutOutMetrics | undefined>
}

export interface UseShoutOutConfigReturn {
  config: ShoutOutConfig | undefined
  isLoading: boolean
  isError: boolean
  error: Error | undefined
  updateConfig: (config: UpdateConfigRequest) => Promise<ShoutOutConfig | undefined>
  mutate: () => Promise<ShoutOutConfig | undefined>
}
