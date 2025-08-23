export interface SimState {
  running: boolean;
  tick: number;
  nowISO: string;
  liveAgents: number;
  metrics: SimMetrics;
  policies: SimPolicies;
  startTime?: Date;
  lastTickTime?: Date;
}

export interface SimMetrics {
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
}

export interface SimEvent {
  type: 'start' | 'stop' | 'tick' | 'agent_spawn' | 'agent_done' | 'policy_change' | 'reset';
  timestamp: string;
  data: any;
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
  skinFee: 1.00,
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
};
