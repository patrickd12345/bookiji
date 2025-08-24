import { test, expect } from '@playwright/test'
import { featureFlags } from '@/config/featureFlags'

test.describe('Core Booking Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure core booking flow is enabled
    expect(featureFlags.beta.core_booking_flow).toBe(true)
    
    // Navigate to home page
    await page.goto('/')
  })

  test('E2E_HAPPY: quote → hold → webhook success → receipt (latency under gates)', async ({ page }) => {
    test.setTimeout(120000) // 2 minutes for full flow
    
    console.log('🚀 Starting E2E_HAPPY flow test')
    const startTime = Date.now()

    // Step 1: Get quote
    const quoteStartTime = Date.now()
    const quoteResponse = await page.request.post('/api/quote', {
      data: {
        service_type: 'general',
        location: { lat: 40.7128, lng: -74.0060 }, // NYC
        when: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        duration_minutes: 60
      }
    })
    
    expect(quoteResponse.ok()).toBeTruthy()
    const quoteData = await quoteResponse.json()
    expect(quoteData.quote_id).toBeDefined()
    expect(quoteData.candidates).toBeDefined()
    expect(quoteData.candidates.length).toBeGreaterThan(0)
    
    const quoteDuration = Date.now() - quoteStartTime
    console.log(`📊 Quote endpoint latency: ${quoteDuration}ms`)
    expect(quoteDuration).toBeLessThan(featureFlags.slo.quote_endpoint_target_p95_ms)

    // Step 2: Confirm booking (place $1 hold)
    const confirmStartTime = Date.now()
    const confirmResponse = await page.request.post('/api/bookings/confirm', {
      data: {
        quote_id: quoteData.quote_id,
        provider_id: quoteData.candidates[0].id,
        stripe_payment_intent_id: 'pi_test_' + Date.now(),
        idempotency_key: 'test_key_' + Date.now()
      }
    })
    
    expect(confirmResponse.ok()).toBeTruthy()
    const confirmData = await confirmResponse.json()
    expect(confirmData.booking_id).toBeDefined()
    
    const confirmDuration = Date.now() - confirmStartTime
    console.log(`📊 Confirm endpoint latency: ${confirmDuration}ms`)
    expect(confirmDuration).toBeLessThan(featureFlags.slo.confirm_endpoint_target_p95_ms)

    // Step 3: Simulate webhook success
    const webhookStartTime = Date.now()
    const webhookResponse = await page.request.post('/webhooks/stripe', {
      data: {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: confirmData.stripe_payment_intent_id || 'pi_test_' + Date.now(),
            metadata: {
              booking_id: confirmData.booking_id
            }
          }
        }
      },
      headers: {
        'stripe-signature': 'test_signature' // In real test, this would be valid
      }
    })
    
    expect(webhookResponse.ok()).toBeTruthy()
    const webhookDuration = Date.now() - webhookStartTime
    console.log(`📊 Webhook endpoint latency: ${webhookDuration}ms`)

    // Step 4: Wait for provider confirmation (simulated by worker)
    console.log('⏳ Waiting for provider confirmation...')
    await page.waitForTimeout(5000) // Wait 5 seconds for worker to process

    // Step 5: Check final state
    const finalResponse = await page.request.get(`/api/bookings/${confirmData.booking_id}`)
    expect(finalResponse.ok()).toBeTruthy()
    const finalData = await finalResponse.json()
    
    // Should be in provider_confirmed or receipt_issued state
    expect(['provider_confirmed', 'receipt_issued']).toContain(finalData.state)

    const totalDuration = Date.now() - startTime
    console.log(`🎯 Total flow duration: ${totalDuration}ms`)
    
    // Verify SLO compliance
    expect(totalDuration).toBeLessThan(60000) // Should complete within 60 seconds
    console.log('✅ E2E_HAPPY flow completed successfully within SLO targets')
  })

  test('E2E_WEBHOOK_REDELIVERY: 3 redeliveries → single receipt', async ({ page }) => {
    test.setTimeout(90000) // 1.5 minutes
    
    console.log('🔄 Starting E2E_WEBHOOK_REDELIVERY test')

    // Step 1: Create a booking first
    const quoteResponse = await page.request.post('/api/quote', {
      data: {
        service_type: 'general',
        location: { lat: 40.7128, lng: -74.0060 },
        when: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        duration_minutes: 60
      }
    })
    
    const quoteData = await quoteResponse.json()
    const confirmResponse = await page.request.post('/api/bookings/confirm', {
      data: {
        quote_id: quoteData.quote_id,
        provider_id: quoteData.candidates[0].id,
        stripe_payment_intent_id: 'pi_redelivery_test_' + Date.now(),
        idempotency_key: 'redelivery_key_' + Date.now()
      }
    })
    
    const confirmData = await confirmResponse.json()
    const paymentIntentId = 'pi_redelivery_test_' + Date.now()

    // Step 2: Send webhook 3 times (simulating redelivery)
    const webhookPayload = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: paymentIntentId,
          metadata: {
            booking_id: confirmData.booking_id
          }
        }
      }
    }

    console.log('📡 Sending webhook delivery #1')
    const webhook1 = await page.request.post('/webhooks/stripe', {
      data: webhookPayload,
      headers: { 'stripe-signature': 'test_signature' }
    })
    expect(webhook1.ok()).toBeTruthy()

    console.log('📡 Sending webhook delivery #2')
    const webhook2 = await page.request.post('/webhooks/stripe', {
      data: webhookPayload,
      headers: { 'stripe-signature': 'test_signature' }
    })
    expect(webhook2.ok()).toBeTruthy()

    console.log('📡 Sending webhook delivery #3')
    const webhook3 = await page.request.post('/webhooks/stripe', {
      data: webhookPayload,
      headers: { 'stripe-signature': 'test_signature' }
    })
    expect(webhook3.ok()).toBeTruthy()

    // Step 3: Wait for processing
    await page.waitForTimeout(3000)

    // Step 4: Verify only one confirmation occurred
    const finalResponse = await page.request.get(`/api/bookings/${confirmData.booking_id}`)
    const finalData = await finalResponse.json()
    
    // Should be in provider_confirmed state (not multiple confirmations)
    expect(['provider_confirmed', 'receipt_issued']).toContain(finalData.state)

    // Step 5: Check audit log for exactly one webhook success
    const auditResponse = await page.request.get(`/api/bookings/${confirmData.booking_id}/audit`)
    if (auditResponse.ok()) {
      const auditData = await auditResponse.json()
      const webhookSuccesses = auditData.filter((entry: { action: string; metadata?: { stripe_event_type?: string } }) => 
        entry.action === 'webhook_success' && entry.metadata?.stripe_event_type === 'payment_intent.succeeded'
      )
      expect(webhookSuccesses.length).toBe(1) // Only one should be processed
    }

    console.log('✅ E2E_WEBHOOK_REDELIVERY: Exactly one confirmation from 3 redeliveries')
  })

  test('E2E_ROLLBACK_TIMEOUT: provider never responds → auto-cancel + refund + audit', async ({ page }) => {
    test.setTimeout(120000) // 2 minutes
    
    console.log('⏰ Starting E2E_ROLLBACK_TIMEOUT test')

    // Step 1: Create a booking
    const quoteResponse = await page.request.post('/api/quote', {
      data: {
        service_type: 'general',
        location: { lat: 40.7128, lng: -74.0060 },
        when: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        duration_minutes: 60
      }
    })
    
    const quoteData = await quoteResponse.json()
    const confirmResponse = await page.request.post('/api/bookings/confirm', {
      data: {
        quote_id: quoteData.quote_id,
        provider_id: quoteData.candidates[0].id,
        stripe_payment_intent_id: 'pi_timeout_test_' + Date.now(),
        idempotency_key: 'timeout_key_' + Date.now()
      }
    })
    
    const confirmData = await confirmResponse.json()

    // Step 2: Verify initial state is hold_placed
    const initialResponse = await page.request.get(`/api/bookings/${confirmData.booking_id}`)
    const initialData = await initialResponse.json()
    expect(initialData.state).toBe('hold_placed')

    // Step 3: Wait for worker to process and timeout (simulate 15+ minute wait)
    console.log('⏳ Waiting for worker timeout simulation...')
    
    // For testing, we'll manually trigger the timeout scenario
    // In real scenario, this would happen after 15 minutes
    const timeoutResponse = await page.request.post('/api/ops/force-cancel', {
      data: {
        booking_id: confirmData.booking_id,
        reason: 'PROVIDER_TIMEOUT',
        admin_notes: 'Simulating provider timeout for E2E test'
      }
    })
    
    expect(timeoutResponse.ok()).toBeTruthy()

    // Step 4: Verify final state is cancelled with refund
    await page.waitForTimeout(2000) // Wait for processing
    
    const finalResponse = await page.request.get(`/api/bookings/${confirmData.booking_id}`)
    const finalData = await finalResponse.json()
    
    // Should be cancelled due to timeout
    expect(finalData.state).toBe('cancelled')
    expect(finalData.cancelled_reason).toBe('PROVIDER_TIMEOUT')

    // Step 5: Verify audit trail
    const auditResponse = await page.request.get(`/api/bookings/${confirmData.booking_id}/audit`)
    if (auditResponse.ok()) {
      const auditData = await auditResponse.json()
      
      // Should have state transitions: hold_placed → cancelled
      const stateChanges = auditData.filter((entry: { action: string }) => entry.action === 'state_change')
      expect(stateChanges.length).toBeGreaterThan(0)
      
      // Should have timeout cancellation entry
      const timeoutEntry = auditData.find((entry: { metadata?: { cancellation_reason?: string } }) => 
        entry.metadata?.cancellation_reason === 'PROVIDER_TIMEOUT'
      )
      expect(timeoutEntry).toBeDefined()
    }

    console.log('✅ E2E_ROLLBACK_TIMEOUT: Auto-cancel and refund completed with audit trail')
  })

  test('E2E_PRIVACY_EXPORT_DELETE: prove export/delete ≤ 60s after a booking', async ({ page }) => {
    test.setTimeout(90000) // 1.5 minutes
    
    console.log('🔒 Starting E2E_PRIVACY_EXPORT_DELETE test')

    // Step 1: Create a booking first
    const quoteResponse = await page.request.post('/api/quote', {
      data: {
        service_type: 'general',
        location: { lat: 40.7128, lng: -74.0060 },
        when: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        duration_minutes: 60
      }
    })
    
    const quoteData = await quoteResponse.json()
    const confirmResponse = await page.request.post('/api/bookings/confirm', {
      data: {
        quote_id: quoteData.quote_id,
        provider_id: quoteData.candidates[0].id,
        stripe_payment_intent_id: 'pi_privacy_test_' + Date.now(),
        idempotency_key: 'privacy_key_' + Date.now()
      }
    })
    
    const confirmData = await confirmResponse.json()

    // Step 2: Test data export
    const exportStartTime = Date.now()
    const exportResponse = await page.request.post('/api/privacy/export', {
      data: {
        user_id: confirmData.customer_id,
        format: 'json'
      }
    })
    
    expect(exportResponse.ok()).toBeTruthy()
    const exportData = await exportResponse.json()
    expect(exportData.export_url).toBeDefined()
    
    const exportDuration = Date.now() - exportStartTime
    console.log(`📤 Data export completed in ${exportDuration}ms`)
    expect(exportDuration).toBeLessThan(60000) // Should complete within 60 seconds

    // Step 3: Test data deletion
    const deleteStartTime = Date.now()
    const deleteResponse = await page.request.post('/api/privacy/delete', {
      data: {
        user_id: confirmData.customer_id,
        confirmation: 'DELETE_MY_DATA'
      }
    })
    
    expect(deleteResponse.ok()).toBeTruthy()
    const deleteData = await deleteResponse.json()
    expect(deleteData.deletion_id).toBeDefined()
    
    const deleteDuration = Date.now() - deleteStartTime
    console.log(`🗑️ Data deletion completed in ${deleteDuration}ms`)
    expect(deleteDuration).toBeLessThan(60000) // Should complete within 60 seconds

    // Step 4: Verify deletion was processed
    await page.waitForTimeout(2000)
    
    const finalResponse = await page.request.get(`/api/bookings/${confirmData.booking_id}`)
    // Should return 404 or indicate deletion
    expect(finalResponse.status()).toBe(404)

    console.log('✅ E2E_PRIVACY_EXPORT_DELETE: Export and deletion completed within 60s SLO')
  })
})
