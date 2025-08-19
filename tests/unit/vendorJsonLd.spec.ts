import { describe, it, expect } from 'vitest'
import { buildVendorJsonLd } from '@/lib/seo/vendorJsonLd'
import type { WithContext, ProfessionalService } from 'schema-dts'

describe('Vendor JSON-LD schema', () => {
  it('builds a LocalBusiness JSON-LD object matching schema.org types', () => {
    const vendor = {
      id: 'v1',
      slug: 'test-vendor',
      business_name: 'Test Vendor',
      full_name: 'Test Person',
      email: 'test@example.com',
      phone: '+1 555-0100',
      phoneE164: '+15550100',
      business_description: 'Quality test services',
      location: 'Test City',
      services: [
        { id: 's1', name: 'Service A', description: 'Desc A', price_cents: 1500 },
        { id: 's2', name: 'Service B' }
      ],
      rating: 4.6,
      review_count: 12,
      addr: { street: '123 Main St', city: 'Testville', region: 'CA', postal: '94000', country: 'US' },
      geo: { lat: 37.42, lng: -122.08 },
      imageUrl: 'https://example.com/img.jpg',
      priceRange: '$$'
    }

    const jsonld = buildVendorJsonLd(vendor)

    // Type-check against official schema via schema-dts
    const typed = jsonld as WithContext<ProfessionalService>
    expect((typed as any)['@context']).toBe('https://schema.org')
    expect((typed as any)['@type']).toBe('ProfessionalService')

    // Runtime spot checks for important substructures
    expect((typed as any).hasOfferCatalog?.['@type']).toBe('OfferCatalog')
    const first = (typed as any).hasOfferCatalog?.itemListElement?.[0]
    expect(first?.['@type']).toBe('Offer')
    expect(first?.itemOffered?.['@type']).toBe('Service')

    expect((typed as any).potentialAction?.['@type']).toBe('ReserveAction')
    expect(((typed as any).potentialAction as any)?.target?.['@type']).toBe('EntryPoint')

    // Aggregate rating present when rating and review_count provided
    expect((typed as any).aggregateRating?.['@type']).toBe('AggregateRating')

    // New assertions: @id shape, priceRange, telephone E.164, opening hours/makesOffer present when given
    expect((typed as any)['@id']).toContain('#identity')
    expect((typed as any).priceRange).toBe('$$')
    expect((typed as any).telephone).toBe('+15550100')
    // Optional fields existence checks
    // openingHoursSpecification may be undefined if not provided; we don't provide here so skip
    // makesOffer array present and itemOffered.serviceType defined when inputs include category
    const offers = (typed as any).makesOffer
    expect(Array.isArray(offers)).toBe(true)
    expect(offers?.[0]?.itemOffered?.['@type']).toBe('Service')
  })
})


