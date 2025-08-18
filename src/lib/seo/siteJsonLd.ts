import type { WithContext, Organization, WebSite } from 'schema-dts'

export function buildOrganizationJsonLd(host: string): WithContext<Organization> {
  const url = `https://${host}`
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${url}#org`,
    name: 'Bookiji',
    url,
    logo: `${url}/favicon-512.png`,
    sameAs: [],
  }
}

export function buildWebSiteJsonLd(host: string): WithContext<WebSite> {
  const url = `https://${host}`
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${url}#website`,
    url,
    name: 'Bookiji',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${url}/search?q={query}`,
      'query-input': 'required name=query',
    } as any,
  }
}


