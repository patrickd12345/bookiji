import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ShoutOutMetricsPanel from '@/app/admin/shout-outs/ShoutOutMetricsPanel'

// No mocking needed - component uses internal state

describe('ShoutOutMetricsPanel', () => {
  it('renders four metric cards with correct titles', () => {
    render(<ShoutOutMetricsPanel />)
    
    expect(screen.getByText('Total Requests')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Accepted')).toBeInTheDocument()
    expect(screen.getByText('Response Time')).toBeInTheDocument()
  })

  it('renders metrics data when loaded', () => {
    render(<ShoutOutMetricsPanel />)
    
    // Check that the mock data is displayed - use more specific selectors
    expect(screen.getByText('Total Requests')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Accepted')).toBeInTheDocument()
    expect(screen.getByText('Response Time')).toBeInTheDocument()
    
    // Check for service categories
    expect(screen.getByText('Hair & Beauty')).toBeInTheDocument()
    expect(screen.getByText('Wellness')).toBeInTheDocument()
    
    // Check for specific text that appears only once
    expect(screen.getByText('All time shout-out requests')).toBeInTheDocument()
    expect(screen.getByText('Average vendor response time')).toBeInTheDocument()
  })
})

