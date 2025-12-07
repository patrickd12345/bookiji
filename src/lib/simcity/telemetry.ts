import { DEFAULT_METRICS, SimEventPayload, SimMetrics } from './types';

export class SimTelemetry {
  private metrics: SimMetrics;
  private events: SimEventPayload[] = [];
  private startTime: Date | null = null;

  constructor() {
    this.metrics = { ...DEFAULT_METRICS };
  }

  start(): void {
    this.startTime = new Date();
    this.events = [];
    this.resetMetrics();
  }

  private resetMetrics(): void {
    this.metrics = { ...DEFAULT_METRICS };
  }

  log(event: SimEventPayload): void {
    this.events.push(event);
    this.updateMetrics(event);
  }

  private updateMetrics(event: SimEventPayload): void {
    switch (event.type) {
    case 'agent_spawn':
    case 'agent_spawned':
      this.metrics.totalAgentsSpawned++;
      this.metrics.activeAgents++;
      if (event.data?.kind === 'customer') {
        this.metrics.activeCustomers = Math.max(0, (this.metrics.activeCustomers || 0) + 1);
      }
      if (event.data?.kind === 'vendor') {
        this.metrics.activeVendors = Math.max(0, (this.metrics.activeVendors || 0) + 1);
      }
      break;
    case 'agent_done':
      this.metrics.activeAgents = Math.max(0, this.metrics.activeAgents - 1);
      if (event.data?.kind === 'customer') {
        this.metrics.activeCustomers = Math.max(0, (this.metrics.activeCustomers || 0) - 1);
      }
      if (event.data?.kind === 'vendor') {
        this.metrics.activeVendors = Math.max(0, (this.metrics.activeVendors || 0) - 1);
      }
      if (event.data?.result) {
        this.processAgentResult(event.data.result);
      }
      break;
    }
    this.calculateDerivedMetrics();
  }

  private processAgentResult(result: any): void {
    if (!result.success) {
      this.metrics.errorCount++;
      this.metrics.errors = this.metrics.errorCount;
    }

    if (result.kind === 'customer') {
      if (result.success) {
        this.metrics.bookingsCreated++;
        this.metrics.totalBookings = this.metrics.bookingsCreated;
        this.metrics.completedBookings += result.cancelled ? 0 : 1;
        if (result.rescheduled) this.metrics.reschedules++;
        if (result.cancelled) this.metrics.cancels++;
        if (result.chatMessages > 0) this.metrics.chatVolume += result.chatMessages;
        this.metrics.chats = this.metrics.chatVolume;
        this.metrics.cancelledBookings = this.metrics.cancels;
      }
    } else if (result.kind === 'vendor') {
      if (result.accepted) {
        this.metrics.vendorAcceptRate++;
      } else if (result.declined) {
        this.metrics.vendorDeclineRate++;
      }
      if (result.responseTime) {
        this.updateAverageResponseTime(result.responseTime);
      }
    }
  }

  private updateAverageResponseTime(newTime: number): void {
    const total = this.metrics.vendorAcceptRate + this.metrics.vendorDeclineRate;
    if (total > 0) {
      this.metrics.avgVendorResponseTime = 
        (this.metrics.avgVendorResponseTime * (total - 1) + newTime) / total;
    }
  }

  private calculateDerivedMetrics(): void {
    const total = this.metrics.totalAgentsSpawned;
    if (total > 0) {
      this.metrics.rescheduleRate = this.metrics.reschedules / total;
      this.metrics.cancelRate = this.metrics.cancels / total;
      this.metrics.completionRate = (this.metrics.bookingsCreated - this.metrics.cancels) / total;
      this.metrics.throughput = total / (this.getElapsedMinutes() || 1);
      this.metrics.totalBookings = this.metrics.bookingsCreated;
      this.metrics.cancelledBookings = this.metrics.cancels;
      this.metrics.errors = this.metrics.errorCount;
      this.metrics.revenue = this.metrics.skinFeesCollected;
      this.metrics.chats = this.metrics.chatVolume;
      this.metrics.completedBookings = Math.max(
        0,
        this.metrics.bookingsCreated - this.metrics.cancels
      );
    }

    const totalVendorActions = this.metrics.vendorAcceptRate + this.metrics.vendorDeclineRate;
    if (totalVendorActions > 0) {
      this.metrics.vendorAcceptRate = this.metrics.vendorAcceptRate / totalVendorActions;
      this.metrics.vendorDeclineRate = this.metrics.vendorDeclineRate / totalVendorActions;
    }
  }

  private getElapsedMinutes(): number {
    if (!this.startTime) return 0;
    return (Date.now() - this.startTime.getTime()) / (1000 * 60);
  }

  snapshot(): SimMetrics {
    return { ...this.metrics };
  }

  getEvents(): SimEventPayload[] {
    return [...this.events];
  }

  getRecentEvents(limit: number = 100): SimEventPayload[] {
    return this.events.slice(-limit);
  }

  reset(): void {
    this.metrics = { ...DEFAULT_METRICS };
    this.events = [];
    this.startTime = null;
  }

  getUptime(): number {
    if (!this.startTime) return 0;
    return Date.now() - this.startTime.getTime();
  }
}
