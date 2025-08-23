import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import StarRating from '@/components/ui/StarRating'

describe('StarRating Component', () => {
  it('renders with correct number of stars', () => {
    render(<StarRating value={3.5} />)
    // With half-stars enabled, we get 6 SVG elements (5 base + 1 overlay for half-star)
    const stars = screen.getAllByText('', { selector: 'svg' })
    expect(stars).toHaveLength(6)
  })

  it('displays correct rating value', () => {
    render(<StarRating value={4.5} showValue={true} />)
    expect(screen.getByText('4.5/5')).toBeInTheDocument()
  })

  it('handles half-star ratings correctly', () => {
    render(<StarRating value={3.5} allowHalfStars={true} />)
    // Should show 3 full stars, 1 half star, and 1 empty star
    const stars = screen.getAllByText('', { selector: 'svg' })
    expect(stars[0]).toHaveClass('text-yellow-400') // Full star
    expect(stars[1]).toHaveClass('text-yellow-400') // Full star
    expect(stars[2]).toHaveClass('text-yellow-400') // Full star
    // The 4th star has both the base (yellow) and overlay (yellow with clip-path)
    expect(stars[3]).toHaveClass('text-yellow-400') // Half star base
    expect(stars[4]).toHaveClass('text-yellow-400') // Half star overlay
    expect(stars[5]).toHaveClass('text-gray-300') // Empty star
  })

  it('handles full-star ratings correctly', () => {
    render(<StarRating value={4} allowHalfStars={false} />)
    const stars = screen.getAllByText('', { selector: 'svg' })
    expect(stars[0]).toHaveClass('text-yellow-400') // Full star
    expect(stars[1]).toHaveClass('text-yellow-400') // Full star
    expect(stars[2]).toHaveClass('text-yellow-400') // Full star
    expect(stars[3]).toHaveClass('text-yellow-400') // Full star
    expect(stars[4]).toHaveClass('text-gray-300') // Empty star
  })

  it('calls onChange when star is clicked', () => {
    const mockOnChange = vi.fn()
    render(<StarRating value={3} onChange={mockOnChange} />)
    
    const firstStar = screen.getAllByText('', { selector: 'svg' })[0]
    fireEvent.click(firstStar)
    
    expect(mockOnChange).toHaveBeenCalledWith(1)
  })

  it('handles hover states correctly', () => {
    render(<StarRating value={3} />)
    const thirdStar = screen.getAllByText('', { selector: 'svg' })[2]
    
    fireEvent.mouseEnter(thirdStar)
    // Should show hover state for 3 stars
    expect(thirdStar).toHaveClass('hover:scale-110')
  })

  it('applies correct size classes', () => {
    const { rerender } = render(<StarRating value={3} size="small" />)
    let stars = screen.getAllByText('', { selector: 'svg' })
    expect(stars[0]).toHaveClass('w-4 h-4')

    rerender(<StarRating value={3} size="large" />)
    stars = screen.getAllByText('', { selector: 'svg' })
    expect(stars[0]).toHaveClass('w-6 h-6')
  })

  it('handles readonly mode correctly', () => {
    render(<StarRating value={3} readonly={true} />)
    const stars = screen.getAllByText('', { selector: 'svg' })
    
    // Should not have hover effects in readonly mode
    expect(stars[0]).toHaveClass('cursor-default')
    expect(stars[0]).not.toHaveClass('hover:scale-110')
  })

  it('formats decimal values correctly', () => {
    render(<StarRating value={4.7} allowHalfStars={true} showValue={true} />)
    expect(screen.getByText('4.7/5')).toBeInTheDocument()
  })

  it('formats whole number values correctly', () => {
    render(<StarRating value={5} allowHalfStars={true} showValue={true} />)
    expect(screen.getByText('5/5')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<StarRating value={3} className="custom-class" />)
    // Find the main container div that has the custom class
    const container = screen.getByText('3/5').closest('div')
    expect(container).toHaveClass('custom-class')
  })

  it('handles zero rating gracefully', () => {
    render(<StarRating value={0} showValue={true} />)
    // Should not show value when rating is 0
    expect(screen.queryByText('0/5')).not.toBeInTheDocument()
  })

  it('handles negative rating gracefully', () => {
    render(<StarRating value={-1} showValue={true} />)
    // Should not show value when rating is negative
    expect(screen.queryByText('-1/5')).not.toBeInTheDocument()
  })
})
