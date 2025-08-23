import { SimMetrics, SimEvent } from './types';

export class SimTelemetry {
  private metrics: SimMetrics;
  private events: SimEvent[] = [];
  private startTime: Date | null = null;

  constructor() {
    this.metrics = {
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
  }

  start(): void {
    this.startTime = new Date();
    this.events = [];
    this.resetMetrics();
  }

  private resetMetrics(): void {
    this.metrics = {
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
  }

  log(event: SimEvent): void {
    this.events.push(event);
    this.updateMetrics(event);
  }

  private updateMetrics(event: SimEvent): void {
    switch (event.type) {
      case 'agent_spawn':
        this.metrics.totalAgentsSpawned++;
        this.metrics.activeAgents++;
        break;
      case 'agent_done':
        this.metrics.activeAgents = Math.max(0, this.metrics.activeAgents - 1);
        if (event.data?.result) {
          this.processAgentResult(event.data.result);
        }
        break;
    }
    this.calculateDerivedMetrics();
  }

  private processAgentResult(result: any): void {
    if (result.kind === 'customer') {
      if (result.success) {
        this.metrics.bookingsCreated++;
        if (result.rescheduled) this.metrics.reschedules++;
        if (result.cancelled) this.metrics.cancels++;
        if (result.chatMessages > 0) this.metrics.chatVolume += result.chatMessages;
      } else {
        this.metrics.errorCount++;
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

  getEvents(): SimEvent[] {
    return [...this.events];
  }

  getRecentEvents(limit: number = 100): SimEvent[] {
    return this.events.slice(-limit);
  }

  reset(): void {
    this.metrics = {
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
    this.events = [];
    this.startTime = null;
  }

  getUptime(): number {
    if (!this.startTime) return 0;
    return Date.now() - this.startTime.getTime();
  }
}
