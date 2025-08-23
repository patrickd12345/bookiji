import { AgentPersona, AgentResult, AgentAction } from './types';

export interface SimAgent {
  kind: 'customer' | 'vendor';
  persona: AgentPersona;
  run(baseURL: string): Promise<AgentResult>;
}

export class CustomerAgent implements SimAgent {
  kind = 'customer' as const;
  
  constructor(public persona: AgentPersona) {}

  async run(baseURL: string): Promise<AgentResult> {
    const actions: AgentAction[] = [];
    const startTime = Date.now();
    
    try {
      // Simulate customer behavior
      actions.push({
        type: 'NAVIGATE',
        target: `${baseURL}/search`,
        timestamp: new Date().toISOString(),
        success: true
      });

      // Simulate search and booking flow
      if (Math.random() < 0.8) {
        actions.push({
          type: 'CLICK',
          target: 'vendor-card',
          timestamp: new Date().toISOString(),
          success: true
        });

        actions.push({
          type: 'TYPE',
          target: 'booking-form',
          value: 'appointment request',
          timestamp: new Date().toISOString(),
          success: true
        });

        // Simulate potential reschedule or cancel
        if (Math.random() < 0.35) {
          actions.push({
            type: 'CLICK',
            target: 'reschedule-button',
            timestamp: new Date().toISOString(),
            success: true
          });
        }

        if (Math.random() < 0.15) {
          actions.push({
            type: 'CLICK',
            target: 'cancel-button',
            timestamp: new Date().toISOString(),
            success: true
          });
        }
      }

      actions.push({
        type: 'DONE',
        timestamp: new Date().toISOString(),
        success: true
      });

      const latencyTicks = Math.floor((Date.now() - startTime) / 1000);
      
      return {
        kind: 'customer',
        success: true,
        latencyTicks,
        actions,
        chatMessages: this.persona.chatty ? Math.floor(Math.random() * 5) + 1 : 0,
        rescheduled: actions.some(a => a.target === 'reschedule-button'),
        cancelled: actions.some(a => a.target === 'cancel-button')
      };

    } catch (error) {
      return {
        kind: 'customer',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latencyTicks: Math.floor((Date.now() - startTime) / 1000),
        actions
      };
    }
  }
}

export class VendorAgent implements SimAgent {
  kind = 'vendor' as const;
  
  constructor(public persona: AgentPersona) {}

  async run(baseURL: string): Promise<AgentResult> {
    const actions: AgentAction[] = [];
    const startTime = Date.now();
    
    try {
      // Simulate vendor behavior
      actions.push({
        type: 'NAVIGATE',
        target: `${baseURL}/provider/inbox`,
        timestamp: new Date().toISOString(),
        success: true
      });

      // Simulate vendor response
      if (Math.random() < 0.7) {
        actions.push({
          type: 'CLICK',
          target: 'accept-booking',
          timestamp: new Date().toISOString(),
          success: true
        });
      } else {
        actions.push({
          type: 'CLICK',
          target: 'decline-booking',
          timestamp: new Date().toISOString(),
          success: true
        });
      }

      // Simulate chat if chatty
      if (this.persona.chatty) {
        actions.push({
          type: 'TYPE',
          target: 'chat-input',
          value: 'Thank you for your booking!',
          timestamp: new Date().toISOString(),
          success: true
        });
      }

      actions.push({
        type: 'DONE',
        timestamp: new Date().toISOString(),
        success: true
      });

      const latencyTicks = Math.floor((Date.now() - startTime) / 1000);
      const responseTime = Date.now() - startTime;
      
      return {
        kind: 'vendor',
        success: true,
        latencyTicks,
        actions,
        accepted: actions.some(a => a.target === 'accept-booking'),
        declined: actions.some(a => a.target === 'decline-booking'),
        chatMessages: this.persona.chatty ? Math.floor(Math.random() * 3) + 1 : 0,
        responseTime
      };

    } catch (error) {
      return {
        kind: 'vendor',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latencyTicks: Math.floor((Date.now() - startTime) / 1000),
        actions
      };
    }
  }
}

export function createAgent(kind: 'customer' | 'vendor', persona: AgentPersona): SimAgent {
  switch (kind) {
    case 'customer':
      return new CustomerAgent(persona);
    case 'vendor':
      return new VendorAgent(persona);
    default:
      throw new Error(`Unknown agent kind: ${kind}`);
  }
}

export function generatePersona(kind: 'customer' | 'vendor', id: number): AgentPersona {
  const baseEmail = kind === 'customer' ? 'customer' : 'vendor';
  
  return {
    chatty: Math.random() < 0.3,
    patient: Math.random() < 0.7,
    strict: Math.random() < 0.4,
    email: `${baseEmail}${id}@simcity.test`
  };
}
