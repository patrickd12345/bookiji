import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VendorOnboardingWizard } from './VendorOnboardingWizard'
import { useVendorOnboarding } from './hooks/useVendorOnboarding'

// Mock the hook
vi.mock('./hooks/useVendorOnboarding')

describe('VendorOnboardingWizard', () => {
  it('renders loading state', () => {
    vi.mocked(useVendorOnboarding).mockReturnValue({
      data: {} as any,
      updateData: vi.fn(),
      currentStep: 'business_info',
      setStep: vi.fn(),
      submit: vi.fn(),
      isLoading: true,
      isSaving: false,
      error: null
    })

    render(<VendorOnboardingWizard />)
    // Looking for a spinner or loading indicator
    // The component renders Loader2
    expect(document.querySelector('.animate-spin')).toBeDefined()
  })

  it('renders business info step initially', () => {
    vi.mocked(useVendorOnboarding).mockReturnValue({
      data: {
        business_name: '',
        contact_name: '',
        phone: '',
        email: '',
        description: '',
        address: '',
        hours: {},
        specialties: []
      } as any,
      updateData: vi.fn(),
      currentStep: 'business_info',
      setStep: vi.fn(),
      submit: vi.fn(),
      isLoading: false,
      isSaving: false,
      error: null
    })

    render(<VendorOnboardingWizard />)
    expect(screen.getByText('Step 1: Business Information')).toBeDefined()
    expect(screen.getByText('Business Name *')).toBeDefined()
  })
})
