export type E2ERole = 'admin' | 'vendor' | 'customer'

export interface E2EUserDefinition {
  email: string
  password: string
  role: E2ERole
  fullName: string
}

const E2E_VENDOR_EMAIL = process.env.E2E_VENDOR_EMAIL || 'e2e-vendor@bookiji.test'
const E2E_VENDOR_PASSWORD = process.env.E2E_VENDOR_PASSWORD || 'password123'

export const E2E_VENDOR_USER: E2EUserDefinition = {
  email: E2E_VENDOR_EMAIL,
  password: E2E_VENDOR_PASSWORD,
  role: 'vendor',
  fullName: 'E2E Test Vendor'
}

const E2E_CUSTOMER_EMAIL = process.env.E2E_CUSTOMER_EMAIL || 'e2e-customer@bookiji.test'
const E2E_CUSTOMER_PASSWORD = process.env.E2E_CUSTOMER_PASSWORD || 'password123'

export const E2E_CUSTOMER_USER: E2EUserDefinition = {
  email: E2E_CUSTOMER_EMAIL,
  password: E2E_CUSTOMER_PASSWORD,
  role: 'customer',
  fullName: 'E2E Test Customer'
}

export interface CredentialLabel {
  label: string
  email: string
  password: string
}

export function ensureCredentialsPresent(credential: CredentialLabel): void {
  if (!credential.email || !credential.password) {
    throw new Error(`Missing credentials for ${credential.label}`)
  }
}
