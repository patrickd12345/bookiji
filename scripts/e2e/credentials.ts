export type E2ERole = 'admin' | 'vendor' | 'customer'

export interface E2EUserDefinition {
  email: string
  password: string
  role: E2ERole
  fullName: string
}

export const E2E_VENDOR_USER: E2EUserDefinition = {
  email: 'e2e-vendor@bookiji.test',
  password: 'TestPassword123!',
  role: 'vendor',
  fullName: 'E2E Test Vendor'
}

export const E2E_CUSTOMER_USER: E2EUserDefinition = {
  email: 'e2e-customer@bookiji.test',
  password: 'password123',
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
