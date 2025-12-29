/**
 * Tests for layer awareness classification
 */

import { classifyLayerRelevance } from './layerAwareness'
import type { LayerContext } from './layerAwareness'
import type { DecisionTrace } from '../escalation/decideNextAction'
import type { IncidentSnapshot } from '../types'

describe('classifyLayerRelevance', () => {
  describe('Layer 1 (always relevant)', () => {
    it('should always include Layer 1 for incident_created events', () => {
      const context: LayerContext = {
        event_type: 'incident_created'
      }

      const layers = classifyLayerRelevance(context)
      expect(layers.length).toBe(0) // No snapshot or trace, so empty
    })

    it('should always include Layer 1 when snapshot or trace provided', () => {
      const context: LayerContext = {
        snapshot: {
          env: 'prod',
          timestamp: new Date().toISOString(),
          severity_guess: 'SEV-2',
          confidence: 0.8,
          signals: {
            error_rate_spike: false,
            invariant_violations: [],
            stripe_webhook_backlog: false,
            booking_failures: false,
            deploy_recent: false
          },
          system_state: {
            scheduling_enabled: true,
            kill_switch_active: false,
            degraded_mode: false
          },
          blast_radius: [],
          safe_components: [],
          unsafe_components: [],
          auto_actions_taken: []
        },
        event_type: 'incident_created'
      }

      const layers = classifyLayerRelevance(context)
      expect(layers.length).toBeGreaterThan(0)
      expect(layers.some(l => l.layer === 'LAYER_1')).toBe(true)
    })
  })

  describe('Layer 0 (Execution Safety)', () => {
    it('should classify kill switch active as Layer 0', () => {
      const context: LayerContext = {
        snapshot: {
          env: 'prod',
          timestamp: new Date().toISOString(),
          severity_guess: 'SEV-1',
          confidence: 0.9,
          signals: {
            error_rate_spike: true,
            invariant_violations: [],
            stripe_webhook_backlog: false,
            booking_failures: true,
            deploy_recent: false
          },
          system_state: {
            scheduling_enabled: false,
            kill_switch_active: true,
            degraded_mode: true
          },
          blast_radius: ['bookings'],
          safe_components: [],
          unsafe_components: ['bookings'],
          auto_actions_taken: ['scheduling_kill_switch_enabled']
        },
        event_type: 'incident_created'
      }

      const layers = classifyLayerRelevance(context)
      const layer0 = layers.find(l => l.layer === 'LAYER_0')
      expect(layer0).toBeDefined()
      expect(layer0?.confidence).toBe('high')
      expect(layer0?.reason).toContain('Kill switch active')
    })

    it('should classify invariant violations as Layer 0', () => {
      const context: LayerContext = {
        snapshot: {
          env: 'prod',
          timestamp: new Date().toISOString(),
          severity_guess: 'SEV-1',
          confidence: 0.9,
          signals: {
            error_rate_spike: false,
            invariant_violations: ['booking_state_invalid', 'payment_amount_mismatch'],
            stripe_webhook_backlog: false,
            booking_failures: false,
            deploy_recent: false
          },
          system_state: {
            scheduling_enabled: true,
            kill_switch_active: false,
            degraded_mode: false
          },
          blast_radius: ['data_integrity'],
          safe_components: [],
          unsafe_components: ['data_integrity'],
          auto_actions_taken: []
        },
        event_type: 'incident_created'
      }

      const layers = classifyLayerRelevance(context)
      const layer0 = layers.find(l => l.layer === 'LAYER_0')
      expect(layer0).toBeDefined()
      expect(layer0?.confidence).toBe('high')
      expect(layer0?.reason).toContain('Invariant violations')
    })
  })

  describe('Layer 2 (Change Management)', () => {
    it('should classify recent deployment as Layer 2', () => {
      const context: LayerContext = {
        snapshot: {
          env: 'prod',
          timestamp: new Date().toISOString(),
          severity_guess: 'SEV-2',
          confidence: 0.7,
          signals: {
            error_rate_spike: true,
            invariant_violations: [],
            stripe_webhook_backlog: false,
            booking_failures: false,
            deploy_recent: true
          },
          system_state: {
            scheduling_enabled: true,
            kill_switch_active: false,
            degraded_mode: true
          },
          blast_radius: ['api'],
          safe_components: [],
          unsafe_components: ['api'],
          auto_actions_taken: []
        },
        event_type: 'incident_created',
        recent_deploy: true
      }

      const layers = classifyLayerRelevance(context)
      const layer2 = layers.find(l => l.layer === 'LAYER_2')
      expect(layer2).toBeDefined()
      expect(layer2?.confidence).toBe('high')
      expect(layer2?.reason).toContain('recent deployment')
    })

    it('should classify recent migration as Layer 2', () => {
      const context: LayerContext = {
        snapshot: {
          env: 'prod',
          timestamp: new Date().toISOString(),
          severity_guess: 'SEV-2',
          confidence: 0.7,
          signals: {
            error_rate_spike: false,
            invariant_violations: [],
            stripe_webhook_backlog: false,
            booking_failures: false,
            deploy_recent: false
          },
          system_state: {
            scheduling_enabled: true,
            kill_switch_active: false,
            degraded_mode: false
          },
          blast_radius: [],
          safe_components: [],
          unsafe_components: [],
          auto_actions_taken: []
        },
        event_type: 'incident_created',
        recent_migration: true
      }

      const layers = classifyLayerRelevance(context)
      const layer2 = layers.find(l => l.layer === 'LAYER_2')
      expect(layer2).toBeDefined()
      expect(layer2?.confidence).toBe('high')
      expect(layer2?.reason).toContain('recent migration')
    })

    it('should classify config change as Layer 2', () => {
      const context: LayerContext = {
        snapshot: {
          env: 'prod',
          timestamp: new Date().toISOString(),
          severity_guess: 'SEV-2',
          confidence: 0.7,
          signals: {
            error_rate_spike: false,
            invariant_violations: [],
            stripe_webhook_backlog: false,
            booking_failures: false,
            deploy_recent: false
          },
          system_state: {
            scheduling_enabled: true,
            kill_switch_active: false,
            degraded_mode: false
          },
          blast_radius: [],
          safe_components: [],
          unsafe_components: [],
          auto_actions_taken: []
        },
        event_type: 'incident_created',
        config_changed: true
      }

      const layers = classifyLayerRelevance(context)
      const layer2 = layers.find(l => l.layer === 'LAYER_2')
      expect(layer2).toBeDefined()
      expect(layer2?.confidence).toBe('medium')
      expect(layer2?.reason).toContain('config change')
    })
  })

  describe('Layer 3 (Release Confidence)', () => {
    it('should classify recent change with SEV-1 incident as Layer 3', () => {
      const context: LayerContext = {
        snapshot: {
          env: 'prod',
          timestamp: new Date().toISOString(),
          severity_guess: 'SEV-1',
          confidence: 0.9,
          signals: {
            error_rate_spike: true,
            invariant_violations: [],
            stripe_webhook_backlog: false,
            booking_failures: true,
            deploy_recent: true
          },
          system_state: {
            scheduling_enabled: true,
            kill_switch_active: false,
            degraded_mode: true
          },
          blast_radius: ['bookings'],
          safe_components: [],
          unsafe_components: ['bookings'],
          auto_actions_taken: []
        },
        event_type: 'incident_created',
        recent_deploy: true
      }

      const layers = classifyLayerRelevance(context)
      const layer3 = layers.find(l => l.layer === 'LAYER_3')
      expect(layer3).toBeDefined()
      expect(layer3?.confidence).toBe('medium')
      expect(layer3?.reason).toContain('Release confidence')
    })

    it('should classify recent change with SEV-2 incident as Layer 3 with low confidence', () => {
      const context: LayerContext = {
        snapshot: {
          env: 'prod',
          timestamp: new Date().toISOString(),
          severity_guess: 'SEV-2',
          confidence: 0.7,
          signals: {
            error_rate_spike: true,
            invariant_violations: [],
            stripe_webhook_backlog: false,
            booking_failures: false,
            deploy_recent: true
          },
          system_state: {
            scheduling_enabled: true,
            kill_switch_active: false,
            degraded_mode: true
          },
          blast_radius: ['api'],
          safe_components: [],
          unsafe_components: ['api'],
          auto_actions_taken: []
        },
        event_type: 'incident_created',
        recent_deploy: true
      }

      const layers = classifyLayerRelevance(context)
      const layer3 = layers.find(l => l.layer === 'LAYER_3')
      expect(layer3).toBeDefined()
      expect(layer3?.confidence).toBe('low')
    })

    it('should not classify Layer 3 without recent change', () => {
      const context: LayerContext = {
        snapshot: {
          env: 'prod',
          timestamp: new Date().toISOString(),
          severity_guess: 'SEV-1',
          confidence: 0.9,
          signals: {
            error_rate_spike: true,
            invariant_violations: [],
            stripe_webhook_backlog: false,
            booking_failures: true,
            deploy_recent: false
          },
          system_state: {
            scheduling_enabled: true,
            kill_switch_active: false,
            degraded_mode: true
          },
          blast_radius: ['bookings'],
          safe_components: [],
          unsafe_components: ['bookings'],
          auto_actions_taken: []
        },
        event_type: 'incident_created'
      }

      const layers = classifyLayerRelevance(context)
      const layer3 = layers.find(l => l.layer === 'LAYER_3')
      expect(layer3).toBeUndefined()
    })
  })

  describe('Edge cases', () => {
    it('should return empty array for non-relevant event types', () => {
      const context: LayerContext = {
        event_type: 'notification_sent' as any
      }

      const layers = classifyLayerRelevance(context)
      expect(layers).toEqual([])
    })

    it('should return empty array when no snapshot or trace provided', () => {
      const context: LayerContext = {
        event_type: 'incident_created'
      }

      const layers = classifyLayerRelevance(context)
      expect(layers).toEqual([])
    })

    it('should be deterministic (same input produces same output)', () => {
      const context: LayerContext = {
        snapshot: {
          env: 'prod',
          timestamp: new Date().toISOString(),
          severity_guess: 'SEV-2',
          confidence: 0.8,
          signals: {
            error_rate_spike: false,
            invariant_violations: [],
            stripe_webhook_backlog: true,
            booking_failures: false,
            deploy_recent: false
          },
          system_state: {
            scheduling_enabled: true,
            kill_switch_active: false,
            degraded_mode: false
          },
          blast_radius: ['payments'],
          safe_components: [],
          unsafe_components: ['payments'],
          auto_actions_taken: []
        },
        event_type: 'incident_created'
      }

      const layers1 = classifyLayerRelevance(context)
      const layers2 = classifyLayerRelevance(context)
      const layers3 = classifyLayerRelevance(context)

      expect(layers1).toEqual(layers2)
      expect(layers2).toEqual(layers3)
    })
  })
})










