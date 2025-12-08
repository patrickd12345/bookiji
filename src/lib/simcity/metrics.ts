import { EngineMetrics, SimulationState } from './types';
import { publishEvent } from './events';

export const createEmptyEngineMetrics = (): EngineMetrics => ({
  ticks: 0,
  appointmentsGenerated: 0,
  appointmentsConfirmed: 0,
  appointmentsCancelled: 0,
  revenue: 0,
  syntheticClockDriftMs: 0,
  lastTickDurationMs: 0,
  opsSummaryPushes: 0,
  metricsAiPushes: 0,
  dashboardHookInvocations: 0,
  scenario: null,
});

export const updateMetricsWithBookings = (
  metrics: EngineMetrics,
  state: SimulationState,
  newBookings: SimulationState['bookings'],
): EngineMetrics => {
  let confirmed = 0;
  let cancelled = 0;
  let revenue = 0;

  newBookings.forEach(booking => {
    if (booking.status === 'confirmed' || booking.status === 'completed') {
      confirmed += 1;
      revenue += booking.price;
    }
    if (booking.status === 'cancelled') {
      cancelled += 1;
    }
  });

  return {
    ...metrics,
    ticks: metrics.ticks + 1,
    appointmentsConfirmed: metrics.appointmentsConfirmed + confirmed,
    appointmentsCancelled: metrics.appointmentsCancelled + cancelled,
    revenue: metrics.revenue + revenue,
    syntheticClockDriftMs: Math.max(0, metrics.syntheticClockDriftMs - state.baseTickMs),
    lastTickDurationMs: state.baseTickMs / Math.max(1, state.speed),
    scenario: state.scenario,
  };
};

export const pushMetricsUpdate = (metrics: EngineMetrics) => {
  publishEvent({
    type: 'metrics',
    timestamp: new Date().toISOString(),
    data: metrics,
  });
};

export const pushOpsSummary = (state: SimulationState) => {
  const payload = {
    tick: state.tick,
    scenario: state.scenario,
    syntheticTime: new Date(state.time).toISOString(),
    bookings: state.bookings.length,
    revenue: state.metrics.revenue,
  };

  publishEvent({
    type: 'ops_summary',
    timestamp: new Date().toISOString(),
    data: payload,
  });
};
