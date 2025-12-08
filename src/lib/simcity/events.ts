import { EventEmitter } from 'events';
import { SimCityEvent } from './types';

const bus = new EventEmitter();
const recentEvents: SimCityEvent[] = [];
const MAX_RECENT = 200;

export const publishEvent = (event: SimCityEvent) => {
  recentEvents.push(event);
  while (recentEvents.length > MAX_RECENT) {
    recentEvents.shift();
  }
  bus.emit('event', event);
};

export const subscribeToEvents = (handler: (event: SimCityEvent) => void) => {
  bus.on('event', handler);
  return () => bus.off('event', handler);
};

export const getRecentEvents = () => [...recentEvents];

export const createEventStream = (signal?: AbortSignal): ReadableStream => {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      const initial: SimCityEvent = {
        type: 'connected',
        timestamp: new Date().toISOString(),
        data: { message: 'OpsAI control plane link established' },
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(initial)}\n\n`));

      const handler = (event: SimCityEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      bus.on('event', handler);

      const keepAlive = setInterval(() => {
        const keepAliveEvent: SimCityEvent = {
          type: 'keepalive',
          timestamp: new Date().toISOString(),
          data: { message: 'simcity-heartbeat' },
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(keepAliveEvent)}\n\n`));
      }, 30000);

      signal?.addEventListener('abort', () => {
        clearInterval(keepAlive);
        bus.off('event', handler);
        controller.close();
      });
    },
    cancel() {},
  });
};
