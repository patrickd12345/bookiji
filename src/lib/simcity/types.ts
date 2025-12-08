// SimCity Types
export interface SimRunInfo {
  runId: string | null;
  seed: number | null;
  scenario: string | null;
  startedAt?: string;
  finishedAt?: string;
}

export interface SimMetrics {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  revenue: number;
  activeCustomers: number;
  activeVendors: number;
  errors: number;
  chats: number;
  bookingsCreated: number;
  reschedules: number;
  cancels: number;
  rescheduleRate: number;
  cancelRate: number;
  completionRate: number;
  vendorAcceptRate: number;
  vendorDeclineRate: number;
  avgVendorResponseTime: number;
  patienceBreaches: number;
  chatVolume: number;
  activeAgents: number;
  throughput: number;
  avgBookingLatency: number;
  errorCount: number;
  skinFeesCollected: number;
  totalAgentsSpawned: number;
  bookingsConfirmed?: number;
  vendorRequests?: number;
  vendorResponsesWithin2h?: number;
  cacheHitRate?: number;
  cacheInvalidationSpike?: number;
  doubleBookings?: number;
  orphanedReferences?: number;
  tickDriftMs?: number;
  memoryUsagePercent?: number;
  p95ResponseTime?: number;
  p99ResponseTime?: number;
  errorRate?: number;
  duplicateCharges?: number;
  strandedInvoices?: number;
  orphanInvoices?: number;
  jwtRefreshLoops?: number;
  clockSkewFailures?: number;
  unauthorizedAdminAccess?: number;
  crossTenantReads?: number;
  cacheIsolationScore?: number;
  dstBookingErrors?: number;
  tzDisplayErrors?: number;
  dstDoubleBookings?: number;
  adminApiOverwhelm?: number;
  inputSanitizationFailures?: number;
  duplicateWebhookTransitions?: number;
  orphanBlobs?: number;
  expiredUrlAccess?: number;
  rolloutP99?: number;
  rollbackRecoveryTime?: number;
  reindexP95?: number;
  staleVisibilityDelay?: number;
}

export interface SimPolicies {
  skinFee: number;
  refundsEnabled: boolean;
  vendorOpenHours: { start: number; end: number };
  customerPatienceThreshold: number;
  rescheduleChance: number;
  cancelChance: number;
  maxConcurrentAgents: number;
  tickSpeedMs: number;
  minutesPerTick: number;
  customerSpawnRate: number;
  vendorSpawnRate: number;
  tenants?: string[];
  [key: string]: unknown;
}

export interface SimState {
  running: boolean;
  tick: number;
  nowISO: string;
  liveAgents: number;
  metrics: SimMetrics;
  policies: SimPolicies;
  startTime?: string;
  lastTickTime?: string;
  scenario?: string | null;
  runInfo?: SimRunInfo | null;
}

export type SimEventType =
  | 'connected'
  | 'keepalive'
  | 'start'
  | 'stop'
  | 'tick'
  | 'agent_spawn'
  | 'agent_spawned'
  | 'agent_done'
  | 'policy_change'
  | 'policy_changed'
  | 'reset'
  | 'scenario_event'
  | 'scenario_started'
  | 'scenario_completed'
  | 'cache_invalidation_storm'
  | 'mv_refresh_paused'
  | 'rls_misconfig'
  | 'rate_limit_burst'
  | 'invariant_violation'
  | 'metric_spike'
  | 'manual_event'
  | 'chaos_event'
  | 'chaos_event_ended'
  | 'error'
  | 'PAYMENT_GATEWAY_OUTAGE'
  | 'PAYMENT_TIMEOUTS'
  | 'WEBHOOK_DELAY_JITTER'
  | 'FORCE_JWT_EXPIRY'
  | 'CLOCK_SKEW'
  | 'RLS_POLICY_TOGGLE'
  | 'TENANT_MIXER'
  | 'SIMULATE_DST_TRANSITION'
  | 'USER_TZ_FLAP'
  | 'PATHOLOGICAL_INPUTS'
  | 'IP_BURST'
  | 'WEBHOOK_STORM'
  | 'SMTP_BACKPRESSURE'
  | 'BLUE_GREEN_SWITCH'
  | 'SCHEMA_MIGRATION_IN_FLIGHT'
  | 'FTS_REINDEX'
  | 'MATVIEW_REFRESH_THROTTLE'
  | 'S3_LATENCY_SPIKES'
  | 'SIGNED_URL_EARLY_EXPIRY';

export interface SimEventPayload {
  type: SimEventType;
  timestamp: string;
  runId?: string | null;
  scenario?: string | null;
  data?: any;
}

export type InvariantSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface InvariantViolation {
  code: string;
  message: string;
  severity: InvariantSeverity;
  timestamp: string;
  details?: Record<string, any>;
}

export interface AgentResult {
  kind: 'customer' | 'vendor';
  accepted?: boolean;
  declined?: boolean;
  latencyTicks: number;
  success: boolean;
  error?: string;
  actions: AgentAction[];
  rescheduled?: boolean;
  cancelled?: boolean;
  chatMessages?: number;
  responseTime?: number;
}

export interface AgentAction {
  type: 'CLICK' | 'TYPE' | 'WAIT' | 'NAVIGATE' | 'DONE';
  target?: string;
  value?: string;
  timestamp: string;
  success: boolean;
}

export interface AgentPersona {
  chatty: boolean;
  patient: boolean;
  strict: boolean;
  email: string;
}

export interface CustomerFlow {
  search: boolean;
  selectVendor: boolean;
  book: boolean;
  reschedule: boolean;
  cancel: boolean;
  chat: boolean;
}

export interface VendorFlow {
  openInbox: boolean;
  accept: boolean;
  decline: boolean;
  proposeNewTime: boolean;
  chat: boolean;
}

export const DEFAULT_POLICIES: SimPolicies = {
  skinFee: 1.0,
  refundsEnabled: true,
  vendorOpenHours: { start: 8, end: 18 },
  customerPatienceThreshold: 10,
  rescheduleChance: 0.35,
  cancelChance: 0.15,
  maxConcurrentAgents: 50,
  tickSpeedMs: 3000,
  minutesPerTick: 10,
  customerSpawnRate: 0.3,
  vendorSpawnRate: 0.1,
};

export const DEFAULT_METRICS: SimMetrics = {
  totalBookings: 0,
  completedBookings: 0,
  cancelledBookings: 0,
  revenue: 0,
  activeCustomers: 0,
  activeVendors: 0,
  errors: 0,
  chats: 0,
  bookingsCreated: 0,
  reschedules: 0,
  cancels: 0,
  rescheduleRate: 0,
  cancelRate: 0,
  completionRate: 0,
  vendorAcceptRate: 0,
  vendorDeclineRate: 0,
  avgVendorResponseTime: 0,
  patienceBreaches: 0,
  chatVolume: 0,
  activeAgents: 0,
  throughput: 0,
  avgBookingLatency: 0,
  errorCount: 0,
  skinFeesCollected: 0,
  totalAgentsSpawned: 0,
  bookingsConfirmed: 0,
  vendorRequests: 0,
  vendorResponsesWithin2h: 0,
  cacheHitRate: 0,
  cacheInvalidationSpike: 0,
  doubleBookings: 0,
  orphanedReferences: 0,
  tickDriftMs: 0,
  memoryUsagePercent: 0,
  p95ResponseTime: 0,
  p99ResponseTime: 0,
  errorRate: 0,
  duplicateCharges: 0,
  strandedInvoices: 0,
  orphanInvoices: 0,
  jwtRefreshLoops: 0,
  clockSkewFailures: 0,
  unauthorizedAdminAccess: 0,
  crossTenantReads: 0,
  cacheIsolationScore: 0,
  dstBookingErrors: 0,
  tzDisplayErrors: 0,
  dstDoubleBookings: 0,
  adminApiOverwhelm: 0,
  inputSanitizationFailures: 0,
  duplicateWebhookTransitions: 0,
  orphanBlobs: 0,
  expiredUrlAccess: 0,
  rolloutP99: 0,
  rollbackRecoveryTime: 0,
  reindexP95: 0,
  staleVisibilityDelay: 0,
};

// Live simulation engine (SimCity Live) types
export type SimulationStatus = 'idle' | 'running' | 'paused';

export interface SimulationClock {
  status: SimulationStatus;
  speed: number;
  time: number;
  tick: number;
  timezone: string;
  startedAt?: string;
  lastTickAt?: string;
  scenario?: string | null;
  baseTickMs: number;
  minutesPerTick: number;
}

export interface SyntheticBooking {
  id: string;
  customerId: string;
  vendorId: string;
  createdAt: number;
  startsAt: number;
  durationMinutes: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  price: number;
  rescheduled?: boolean;
  tags?: string[];
}

export interface EngineMetrics {
  ticks: number;
  appointmentsGenerated: number;
  appointmentsConfirmed: number;
  appointmentsCancelled: number;
  revenue: number;
  syntheticClockDriftMs: number;
  lastTickDurationMs: number;
  opsSummaryPushes: number;
  metricsAiPushes: number;
  dashboardHookInvocations: number;
  scenario?: string | null;
}

export interface SimulationState extends SimulationClock {
  bookings: SyntheticBooking[];
  metrics: EngineMetrics;
  hooks: string[];
}

export interface SimulationStartOptions {
  speed?: number;
  scenario?: string | null;
  timezone?: string;
  startTime?: number;
  minutesPerTick?: number;
  baseTickMs?: number;
}

export interface ScenarioOverride {
  id: string;
  label: string;
  description?: string;
  spawnRate?: number;
  cancelRate?: number;
  confirmRate?: number;
  priceMultiplier?: number;
  tags?: string[];
  clockMultiplier?: number;
  metricsBoost?: Partial<EngineMetrics>;
}

export interface SimCityEvent<T = any> {
  type:
    | 'connected'
    | 'start'
    | 'pause'
    | 'reset'
    | 'tick'
    | 'keepalive'
    | 'booking'
    | 'metrics'
    | 'scenario'
    | 'speed'
    | 'ops_summary'
    | 'error';
  timestamp: string;
  data?: T;
}

export interface DashboardHook {
  id: string;
  description?: string;
  onTick?: (state: SimulationState) => void;
  onMetrics?: (metrics: EngineMetrics) => void;
}
