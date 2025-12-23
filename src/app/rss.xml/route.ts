import { NextResponse } from 'next/server'

export async function GET() {
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://bookiji.com').replace(/\/$/, '')
  const now = new Date().toISOString()

  // Blog posts (you can fetch from database or CMS)
  const blogPosts = [
    {
      title: 'The Future of Service Booking: Why $1 Commitment Fees Are Game-Changing',
      description: 'Discover how our innovative $1 commitment fee system is revolutionizing the service booking industry.',
      date: '2024-01-15',
      slug: 'future-of-service-booking-commitment-fees',
    },
    {
      title: '5 Ways AI is Transforming How We Book Services',
      description: 'Explore how artificial intelligence is making service booking smarter, faster, and more personalized.',
      date: '2024-01-12',
      slug: 'ai-transforming-service-booking',
    },
    {
      title: 'Privacy-First Booking: How Map Abstraction Protects Your Location',
      description: 'Learn about our innovative map abstraction technology that lets you find nearby services without compromising your privacy.',
      date: '2024-01-10',
      slug: 'privacy-first-booking-map-abstraction',
    },
  ]

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Bookiji Blog</title>
    <description>Latest articles about service booking, platform features, and industry insights</description>
    <link>${base}</link>
    <atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml"/>
    <language>en-US</language>
    <lastBuildDate>${now}</lastBuildDate>
    <pubDate>${now}</pubDate>
    <ttl>60</ttl>
    ${blogPosts
      .map(
        (post) => `    <item>
      <title><![CDATA[${post.title}]]></title>
      <description><![CDATA[${post.description}]]></description>
      <link>${base}/blog/${post.slug}</link>
      <guid isPermaLink="true">${base}/blog/${post.slug}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    </item>`
      )
      .join('\n')}
  </channel>
</rss>`

  return new NextResponse(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}

