import type { WithContext, ProfessionalService } from 'schema-dts'

export interface VendorData {
  id: string
  slug: string
  business_name: string
  full_name: string
  email: string
  phone: string
  phoneE164: string
  business_description: string
  location: string
  services: Array<{
    id: string
    name: string
    description?: string
    price_cents?: number
  }>
  rating?: number
  review_count?: number
  addr: {
    street: string
    city: string
    region: string
    postal: string
    country: string
  }
  geo?: {
    lat: number
    lng: number
  }
  imageUrl?: string
  priceRange?: string
}

export function buildVendorJsonLd(vendor: VendorData): WithContext<ProfessionalService> {
  const jsonLd: WithContext<ProfessionalService> = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `#identity`,
    name: vendor.business_name,
    description: vendor.business_description,
    url: `https://example.com/vendor/${vendor.slug}`,
    ...(vendor.phoneE164 && { telephone: vendor.phoneE164 }),
    ...(vendor.email && { email: vendor.email }),
    address: {
      '@type': 'PostalAddress',
      streetAddress: vendor.addr.street,
      addressLocality: vendor.addr.city,
      addressRegion: vendor.addr.region,
      postalCode: vendor.addr.postal,
      addressCountry: vendor.addr.country,
    },
    ...(vendor.geo && {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: vendor.geo.lat,
        longitude: vendor.geo.lng,
      },
    }),
    ...(vendor.imageUrl && { image: vendor.imageUrl }),
    ...(vendor.rating && vendor.review_count && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: vendor.rating,
        reviewCount: vendor.review_count,
      },
    }),
    ...(vendor.priceRange && { priceRange: vendor.priceRange }),
    makesOffer: vendor.services.map((service) => ({
      '@type': 'Offer',
      '@id': `#service-${service.id}`,
      itemOffered: {
        '@type': 'Service',
        name: service.name,
        ...(service.description && { description: service.description }),
        ...(service.price_cents && { price: service.price_cents / 100 }),
      },
    })),
    potentialAction: {
      '@type': 'ReserveAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `https://example.com/book/${vendor.slug}`,
        actionPlatform: 'https://schema.org/DesktopWebPlatform',
      },
    },
  }

  return jsonLd
}

export function buildVendorListJsonLd(vendors: VendorData[]): WithContext<ProfessionalService>[] {
  return vendors.map(vendor => buildVendorJsonLd(vendor))
}
