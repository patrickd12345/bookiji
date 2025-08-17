'use client'

import Script from 'next/script'
import { buildVendorJsonLd } from '@/lib/seo/vendorJsonLd'

interface VendorSchemaProps {
  vendor: {
    id: string
    business_name: string
    full_name: string
    email: string
    phone?: string
    business_description?: string
    location?: string
    services?: Array<{
      id: string
      name: string
      description?: string
      price_cents?: number
    }>
    rating?: number
    review_count?: number
  }
}

export default function VendorSchema({ vendor }: VendorSchemaProps) {
  const schema = buildVendorJsonLd(vendor)

  return (
    <Script
      id="vendor-schema"
      type="application/ld+json"
      data-testid="vendor-jsonld"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
