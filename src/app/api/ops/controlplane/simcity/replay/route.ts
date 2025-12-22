import { NextRequest, NextResponse } from 'next/server'
import { ensureSimCityAllowed, simCityStatus, simCityCursor } from '../../_lib/simcity'
import type { SimCityConfig } from '../../_lib/simcity'
import { runReplayVariant } from '../../_lib/simcity-replay'
import { generateReplayReport } from '../../_lib/simcity-replay-reports'
import { storeReplay, updateReplay, generateRunId } from '../../_lib/simcity-replay-store'
import type {
  SimCityReplayRequest,
  SimCityReplayResponse,
  SimCityReplayVariant,
} from '../../_lib/simcity-types'

/**
 * POST /api/ops/controlplane/simcity/replay
 *
 * Start a counterfactual replay from a base tick to a target tick with optional interventions.
 * Returns runId immediately and runs replay asynchronously.
 */
export async function POST(request: NextRequest) {
  try {
    ensureSimCityAllowed()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SimCity is not allowed'
    return NextResponse.json({ error: message }, { status: 403 })
  }

  let body: SimCityReplayRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  // Validate request
  if (typeof body.fromTick !== 'number' || !Number.isFinite(body.fromTick) || body.fromTick < 0) {
    return NextResponse.json({ error: 'Invalid fromTick' }, { status: 400 })
  }

  if (typeof body.toTick !== 'number' || !Number.isFinite(body.toTick) || body.toTick < body.fromTick) {
    return NextResponse.json({ error: 'Invalid toTick' }, { status: 400 })
  }

  // Get current engine state
  const status = simCityStatus()
  const cursor = simCityCursor()

  if (!status.config) {
    return NextResponse.json({ error: 'SimCity is not running' }, { status: 400 })
  }
  const config = status.config

  if (body.fromTick > status.tick) {
    return NextResponse.json(
      { error: `fromTick (${body.fromTick}) exceeds current tick (${status.tick})` },
      { status: 400 }
    )
  }

  // Generate run ID (add timestamp for uniqueness in same process)
  const variantCount = body.variants?.length ?? 0
  const variantNames = body.variants?.map((v) => v.name)
  const runId = `${generateRunId(cursor.seed ?? 0, body.fromTick, body.toTick, variantCount, variantNames)}_${Date.now()}`

  // Get base events up to fromTick
  const baseEvents = status.events.filter((e) => e.generatedAtTick < body.fromTick)

  // Capture config in a const to ensure it's not undefined in async context
  const capturedConfig: SimCityConfig = config

  // Run replay asynchronously (don't await)
  void (async () => {
    try {
      // Run baseline if requested
      let baseline: SimCityReplayVariant | undefined
      if (body.baseline !== false) {
        baseline = runReplayVariant(
          cursor.seed ?? 0,
          capturedConfig,
          baseEvents,
          body.fromTick,
          body.toTick,
          []
        )
      }

      // Run variants
      const variants: SimCityReplayVariant[] = []
      for (const variant of body.variants ?? []) {
        const interventions = variant.interventions || []
        const variantResult = runReplayVariant(
          cursor.seed ?? 0,
          capturedConfig,
          baseEvents,
          body.fromTick,
          body.toTick,
          interventions
        )
        variantResult.name = variant.name
        variants.push(variantResult)
      }

      // Generate report
      if (baseline) {
        const report = generateReplayReport(
          runId,
          cursor.seed ?? 0,
          body.fromTick,
          body.toTick,
          baseline,
          variants
        )

        // Build response
        const response: SimCityReplayResponse = {
          runId,
          seed: cursor.seed ?? 0,
          fromTick: body.fromTick,
          toTick: body.toTick,
          baseline,
          variants,
          generatedAt: new Date().toISOString(),
        }

        storeReplay(runId, response)
        updateReplay(runId, 'completed', report)
      } else {
        // No baseline, just store variants
        const response: SimCityReplayResponse = {
          runId,
          seed: cursor.seed ?? 0,
          fromTick: body.fromTick,
          toTick: body.toTick,
          variants,
          generatedAt: new Date().toISOString(),
        }

        storeReplay(runId, response)
        updateReplay(runId, 'completed')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      updateReplay(runId, 'failed', undefined, errorMessage)
    }
  })()

  // Return immediately with runId
  return NextResponse.json({
    success: true,
    runId,
    message: 'Replay started',
  })
}
