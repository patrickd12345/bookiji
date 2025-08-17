import { describe, it, expect } from 'vitest'
import { buildVendorJsonLd } from '@/lib/seo/vendorJsonLd'
import type { WithContext, ProfessionalService } from 'schema-dts'

describe('Vendor JSON-LD schema', () => {
	it('builds a ProfessionalService JSON-LD object matching schema.org types', () => {
		const vendor = {
			id: 'v1',
			slug: 'test-vendor',
			business_name: 'Test Vendor',
			full_name: 'Test Person',
			email: 'test@example.com',
			phoneE164: '+15550100',
			business_description: 'Quality test services',
			location: 'Test City',
			services: [
				{ id: 's1', name: 'Service A', description: 'Desc A', price_cents: 1500 },
				{ id: 's2', name: 'Service B' }
			],
			rating: 4.6,
			review_count: 12,
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

		// New high-impact fields
		expect((typed as any)['@id']).toContain('#identity')
		expect((typed as any).telephone).toBe('+15550100')
		expect((typed as any).priceRange).toBe('$$')
	})
})


