import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { canonicalUrl } from '@/lib/seo'

type BlogPost = {
  slug: string
  title: string
  date: string
  category: string
  content: string
}

const posts: BlogPost[] = [
  {
    slug: 'future-of-service-booking-commitment-fees',
    title: 'The Future of Service Booking: Why $1 Commitment Fees Are Game-Changing',
    date: '2024-01-15',
    category: 'Industry Insights',
    content:
      'The $1 commitment fee is designed to reduce no-shows while keeping booking friction low for customers. It creates a clear signal of intent, improves reliability for providers, and makes scheduling more predictable for everyone.',
  },
  {
    slug: 'ai-transforming-service-booking',
    title: '5 Ways AI is Transforming How We Book Services',
    date: '2024-01-12',
    category: 'Technology',
    content:
      'AI can help match customers to the right provider, clarify service requirements, reduce back-and-forth messaging, and improve availability discovery. The result is faster, more accurate bookings.',
  },
  {
    slug: 'privacy-first-booking-map-abstraction',
    title: 'Privacy-First Booking: How Map Abstraction Protects Your Location',
    date: '2024-01-10',
    category: 'Privacy & Security',
    content:
      'Map abstraction means customers can find nearby providers without exposing exact locations. Details are revealed only when appropriate, reducing risk while preserving a good booking experience.',
  },
  {
    slug: 'universal-booking-revolution',
    title: 'From Plumbers to Personal Trainers: The Universal Booking Revolution',
    date: '2024-01-08',
    category: 'Platform Features',
    content:
      'A single booking flow across service categories reduces complexity for customers and helps providers adopt modern scheduling without custom software. Universal primitives (services, slots, confirmations) scale across industries.',
  },
  {
    slug: 'building-trust-gig-economy-guaranteed-bookings',
    title: 'Building Trust in the Gig Economy: Commitment + Handoff Explained',
    date: '2024-01-05',
    category: 'Industry Insights',
    content:
      'Commitment-backed booking mechanics help providers plan their day and reduce casual holds. Customers benefit from clearer expectations and a fast contact handoff without post-service judgment.',
  },
  {
    slug: 'real-time-availability-end-phone-tag',
    title: 'Real-Time Availability: The End of Phone Tag for Service Bookings',
    date: '2024-01-03',
    category: 'Technology',
    content:
      'Real-time availability eliminates the loop of messages and missed calls. Customers can choose a time immediately, while providers maintain control over their schedule.',
  },
]

function getPost(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug)
}

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return {}

  return {
    title: `${post.title} | Bookiji`,
    description: post.content.slice(0, 140),
    alternates: { canonical: canonicalUrl(`/blog/${post.slug}`) },
    openGraph: {
      title: post.title,
      description: post.content.slice(0, 140),
      url: `/blog/${post.slug}`,
      type: 'article',
    },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <Link href="/blog" className="text-blue-600 hover:text-blue-800">
          ← Back to Blog
        </Link>
      </div>

      <header className="mb-6">
        <div className="text-sm text-gray-500 mb-2">
          <span className="font-medium text-blue-700">{post.category}</span> ·{' '}
          {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <h1 className="text-4xl font-bold">{post.title}</h1>
      </header>

      <article className="prose prose-lg max-w-none">
        <p>{post.content}</p>
      </article>
    </div>
  )
}

