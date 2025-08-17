import type {
  WithContext,
  ProfessionalService,
  Offer,
  OfferCatalog,
  PostalAddress,
  ReserveAction,
  EntryPoint,
  Reservation,
  Service,
  AggregateRating,
  OpeningHoursSpecification,
  AdministrativeArea,
  GeoCoordinates,
} from 'schema-dts'

export interface VendorService {
  id: string
  name: string
  description?: string
  price_cents?: number
}

export interface VendorForJsonLd {
  id: string
  slug?: string
  business_name: string
  full_name: string
  email: string
  phone?: string
  phoneE164?: string
  business_description?: string
  location?: string
  services?: VendorService[]
  rating?: number
  review_count?: number
  addr?: {
    street?: string
    city?: string
    region?: string
    postal?: string
    country?: string
  }
  geo?: { lat: number; lng: number }
  imageUrl?: string
  priceRange?: string
  socialLinks?: string[]
  areas?: string[]
  hours?: Array<{ days: string[]; opens: string; closes: string }>
}

/**
 * Builds a JSON-LD object for a LocalBusiness that conforms to schema.org types.
 * The return type is strongly typed with schema-dts to provide compile-time validation
 * against the official schema vocabulary.
 */
export function buildVendorJsonLd(vendor: VendorForJsonLd): WithContext<ProfessionalService> {
  const address: PostalAddress = {
    '@type': 'PostalAddress',
    addressLocality: vendor.location || 'Contact for location',
    addressCountry: 'US',
  }

  const serviceItems: Service[] = (vendor.services || []).map((svc) => ({
    '@type': 'Service',
    name: svc.name,
    description: svc.description,
    ...(svc.price_cents
      ? {
          // Price is not part of Service spec directly; we expose it via Offer.
        }
      : {}),
  }))

  const offerCatalog: OfferCatalog = {
    '@type': 'OfferCatalog',
    name: 'Services Offered',
    itemListElement: (vendor.services || []).map((svc) => ({
      '@type': 'Offer',
      '@id': `https://bookiji.com/services/${svc.id}`,
      itemOffered: {
        '@type': 'Service',
        name: svc.name,
        description: svc.description,
      } as Service,
      ...(svc.price_cents
        ? {
            price: (svc.price_cents / 100).toFixed(2),
            priceCurrency: 'USD',
          } satisfies Partial<Offer>
        : {}),
    })),
  }

  const entryPoint: EntryPoint = {
    '@type': 'EntryPoint',
    urlTemplate: `https://bookiji.com/book/${vendor.id}`,
    actionPlatform: [
      'http://schema.org/DesktopWebPlatform',
      'http://schema.org/MobileWebPlatform',
    ],
  }

  const reservation: Reservation = {
    '@type': 'Reservation',
    reservationStatus: 'https://schema.org/ReservationConfirmed',
  }

  const reserveAction: ReserveAction = {
    '@type': 'ReserveAction',
    target: entryPoint,
    result: reservation,
  }

  const aggregateRating: AggregateRating | undefined =
    vendor.rating && vendor.review_count
      ? {
          '@type': 'AggregateRating',
          ratingValue: vendor.rating,
          reviewCount: vendor.review_count,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined

  const openingHours: OpeningHoursSpecification[] | undefined = vendor.hours
    ?.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.days as any,
      opens: h.opens,
      closes: h.closes,
    }))

  const areaServed: AdministrativeArea[] | undefined = vendor.areas?.map((a) => ({
    '@type': 'AdministrativeArea',
    name: a,
  }))

  const geo: GeoCoordinates | undefined = vendor.geo
    ? { '@type': 'GeoCoordinates', latitude: vendor.geo.lat, longitude: vendor.geo.lng }
    : undefined

  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `https://bookiji.com/vendor/${vendor.slug || vendor.id}#identity`,
    name: vendor.business_name || vendor.full_name,
    description:
      vendor.business_description || `Professional services by ${vendor.full_name}`,
    url: `https://bookiji.com/vendor/${vendor.slug || vendor.id}`,
    image: vendor.imageUrl,
    telephone: vendor.phoneE164 || vendor.phone || 'Contact for phone number',
    priceRange: vendor.priceRange || '$',
    email: vendor.email,
    address: {
      ...address,
      streetAddress: vendor.addr?.street,
      addressLocality: vendor.addr?.city || address.addressLocality,
      addressRegion: vendor.addr?.region,
      postalCode: vendor.addr?.postal,
      addressCountry: vendor.addr?.country || address.addressCountry,
    },
    geo,
    sameAs: vendor.socialLinks,
    areaServed,
    openingHoursSpecification: openingHours,
    hasOfferCatalog: offerCatalog,
    ...(aggregateRating ? { aggregateRating } : {}),
    makesOffer: serviceItems.map((svc) => ({
      '@type': 'Offer',
      itemOffered: svc,
    })),
    potentialAction: reserveAction,
  }
}

export type { WithContext, ProfessionalService }



