export class OpsAIStream {
    listeners = [];
    eventSource = null;
    mockTimer;
    subscribe(cb) {
        this.listeners.push(cb);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== cb);
        };
    }
    start(endpoint = '/api/ops/events/stream') {
        if (typeof EventSource === 'undefined') {
            this.startMock();
            return;
        }
        try {
            this.eventSource = new EventSource(endpoint);
            this.eventSource.onmessage = (message) => {
                try {
                    const parsed = JSON.parse(message.data);
                    this.emit({
                        type: parsed.type || 'anomaly',
                        data: parsed.data,
                        ts: parsed.ts || new Date().toISOString()
                    });
                }
                catch {
                    // ignore malformed payloads
                }
            };
            this.eventSource.onerror = () => {
                this.startMock();
            };
        }
        catch {
            this.startMock();
        }
    }
    stop() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        if (this.mockTimer) {
            clearInterval(this.mockTimer);
            this.mockTimer = undefined;
        }
    }
    emit(event) {
        this.listeners.forEach((listener) => listener(event));
    }
    startMock() {
        if (this.mockTimer)
            return;
        this.mockTimer = window.setInterval(() => {
            const sample = mockSignal();
            this.emit(sample);
        }, 4500);
    }
}
function mockSignal() {
    const rand = Math.random();
    if (rand < 0.33) {
        return {
            type: 'health',
            ts: new Date().toISOString(),
            data: { status: 'amber', impacted: ['api', 'scheduler'] }
        };
    }
    if (rand < 0.66) {
        return {
            type: 'deployment',
            ts: new Date().toISOString(),
            data: { service: 'web', version: '2025.12.07.1', status: 'completed' }
        };
    }
    return {
        type: 'anomaly',
        ts: new Date().toISOString(),
        data: { description: 'Booking throughput dipped 28% vs baseline.' }
    };
}
