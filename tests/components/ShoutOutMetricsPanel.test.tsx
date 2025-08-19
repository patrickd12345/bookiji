import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ShoutOutMetricsPanel from '@/app/admin/shout-outs/ShoutOutMetricsPanel'

// Mock the hook
vi.mock('@/hooks/useShoutOutTimeseries', () => ({
  useShoutOutTimeseries: () => ({
    data: [
      {
        date: '2025-08-05',
        conversion_rate: 0.42,
        avg_response_ms: 284000,
        resolution_pct: 0.55
      },
      {
        date: '2025-08-06',
        conversion_rate: 0.38,
        avg_response_ms: 312000,
        resolution_pct: 0.48
      }
    ],
    isLoading: false,
    isError: false
  })
}))

describe('ShoutOutMetricsPanel', () => {
  it('renders three chart cards with correct titles', () => {
    render(<ShoutOutMetricsPanel />)
    
    expect(screen.getByText('Conversion %')).toBeInTheDocument()
    expect(screen.getByText('Avg Response Time (min)')).toBeInTheDocument()
    expect(screen.getByText('Resolution %')).toBeInTheDocument()
  })

  it('renders loading state when data is loading', () => {
    vi.mocked(require('@/hooks/useShoutOutTimeseries').useShoutOutTimeseries).mockReturnValue({
      data: [],
      isLoading: true,
      isError: false
    })

    render(<ShoutOutMetricsPanel />)
    expect(screen.getByText('Loading shout‑out metrics…')).toBeInTheDocument()
  })

  it('renders error state when there is an error', () => {
    vi.mocked(require('@/hooks/useShoutOutTimeseries').useShoutOutTimeseries).mockReturnValue({
      data: [],
      isLoading: false,
      isError: true
    })

    render(<ShoutOutMetricsPanel />)
    expect(screen.getByText('Failed to load metrics.')).toBeInTheDocument()
  })

  it('renders no data state when data is empty', () => {
    vi.mocked(require('@/hooks/useShoutOutTimeseries').useShoutOutTimeseries).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false
    })

    render(<ShoutOutMetricsPanel />)
    expect(screen.getByText('No data yet.')).toBeInTheDocument()
  })
})

