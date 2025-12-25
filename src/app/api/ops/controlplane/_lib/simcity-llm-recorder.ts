/**
 * LLM Event Recorder
 *
 * Records proposed events and their execution outcomes to simcity_run_events.
 * This preserves the complete truth: what was proposed vs what actually happened.
 */

import type {
  LLMProposedEvent,
  EventFeasibility,
  EventExecutionResult,
  RecordedLLMEvent,
} from './simcity-llm-events'
import type { InvariantCheckResult } from './simcity-llm-invariants'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

/**
 * Record an LLM-proposed event and its outcome
 *
 * Stores both the proposed event and execution result in simcity_run_events.
 */
export async function recordLLMEvent(
  runId: string,
  eventIndex: number,
  proposedEvent: LLMProposedEvent,
  classification: EventFeasibility,
  executionResult: EventExecutionResult,
  invariantCheck: InvariantCheckResult,
  tick: number
): Promise<void> {
  const config = getSupabaseConfig()
  const supabase = createClient(config.url, config.secretKey || config.publishableKey)

  const recordedEvent: RecordedLLMEvent = {
    proposed_event: proposedEvent,
    classification,
    execution_result: {
      ...executionResult,
      invariant_status: invariantCheck.status,
    },
    tick,
    recorded_at: new Date().toISOString(),
  }

  // Store in simcity_run_events
  const { error } = await supabase.from('simcity_run_events').insert({
    run_id: runId,
    event_index: eventIndex,
    event_type: `llm.${proposedEvent.event_type}`,
    event_payload: {
      proposed_event: recordedEvent.proposed_event,
      classification: recordedEvent.classification,
      execution_result: recordedEvent.execution_result,
      invariant_check: {
        status: invariantCheck.status,
        violations: invariantCheck.violations,
        forensic_data: invariantCheck.forensic_data,
      },
      tick: recordedEvent.tick,
    },
    invariant_context: {
      status: invariantCheck.status,
      violations: invariantCheck.violations,
      forensic_data: invariantCheck.forensic_data,
    },
  })

  if (error) {
    console.error('Failed to record LLM event:', error)
    // Don't throw - recording failure shouldn't stop the run
    // but we log it for observability
  }
}

/**
 * Get recorded LLM events for a run
 */
export async function getRecordedLLMEvents(
  runId: string,
  fromIndex?: number,
  limit?: number
): Promise<RecordedLLMEvent[]> {
  const config = getSupabaseConfig()
  const supabase = createClient(config.url, config.publishableKey)

  let query = supabase
    .from('simcity_run_events')
    .select('*')
    .eq('run_id', runId)
    .like('event_type', 'llm.%')
    .order('event_index', { ascending: true })

  if (fromIndex !== undefined) {
    query = query.gte('event_index', fromIndex)
  }

  if (limit !== undefined) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch recorded LLM events:', error)
    return []
  }

  if (!data) {
    return []
  }

  // Transform database records to RecordedLLMEvent format
  return data.map((record) => {
    const payload = record.event_payload as {
      proposed_event: LLMProposedEvent
      classification: EventFeasibility
      execution_result: EventExecutionResult
      invariant_check: InvariantCheckResult
      tick: number
    }

    return {
      proposed_event: payload.proposed_event,
      classification: payload.classification,
      execution_result: payload.execution_result,
      tick: payload.tick,
      recorded_at: record.observed_at,
    }
  })
}
