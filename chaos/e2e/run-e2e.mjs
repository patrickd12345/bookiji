import { certBrowserObedience } from './scenarios/cert_browser_obedience.mjs'
import { certAuthSession } from './scenarios/cert_auth_session.mjs'

const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3000'
const seed = 42

// Ensure test user exists
async function ensureTestUser(baseUrl) {
  const testUser = {
    email: 'e2e-vendor@bookiji.test',
    password: 'password123'
  }

  try {
    // Try to create/ensure user via seed API if available
    const response = await fetch(`${baseUrl}/api/dev/test/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vendorEmail: testUser.email,
        customerEmail: 'e2e-customer@bookiji.test'
      })
    })
    
    if (!response.ok) {
      console.warn(`Seed API returned ${response.status}, test user may not exist`)
    }
  } catch (error) {
    console.warn('Could not ensure test user via API:', error.message)
    console.warn('Test user must exist: email=' + testUser.email + ', password=' + testUser.password)
  }
}

try {
  await ensureTestUser(baseUrl)
  await certBrowserObedience({ baseUrl, seed })
  await certAuthSession({
    baseUrl,
    seed,
    user: {
      email: 'e2e-vendor@bookiji.test',
      password: 'password123'
    }
  })

  console.log('SimCity E2E certification PASSED')
  process.exit(0)
} catch (error) {
  console.error('SimCity E2E certification FAILED:', error)
  console.error(error.stack)
  process.exit(1)
}

