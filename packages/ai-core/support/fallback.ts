import { SupportAnswer } from './types'

// Simple interface for a document in your index
export interface DocIndex {
  title: string
  url: string
  content: string
  keywords: string[]
}

export function keywordFallback(
  query: string, 
  docs: DocIndex[], 
  traceId: string
): SupportAnswer {
  const lowerQuery = query.toLowerCase()
  const terms = lowerQuery.split(/\s+/).filter(t => t.length > 3)
  
  // Simple scoring: matches in title * 3 + matches in keywords * 2 + matches in content
  const hits = docs
    .map(doc => {
      let score = 0
      if (doc.title.toLowerCase().includes(lowerQuery)) score += 10
      terms.forEach(term => {
        if (doc.title.toLowerCase().includes(term)) score += 3
        if (doc.keywords.some(k => k.includes(term))) score += 2
        if (doc.content.toLowerCase().includes(term)) score += 1
      })
      return { doc, score }
    })
    .filter(hit => hit.score > 0)
    .sort((a, b) => b.score - a.score)

  return {
    answerText: hits.length
      ? "I couldn't generate a specific answer right now, but here are the most relevant topics from our help center:"
      : "I couldn't find a direct answer in our documentation. Please contact support if you need immediate assistance.",
    citations: hits.slice(0, 3).map(h => ({
      source: h.doc.title,
      url: h.doc.url,
      snippet: h.doc.content.substring(0, 150) + '...',
      score: h.score
    })),
    confidence: hits.length ? 0.3 : 0.0,
    fallbackUsed: true,
    traceId
  }
}

// In a real app, this would load from a JSON file generated at build time
export function loadStaticDocs(): DocIndex[] {
  return [
    { title: "Registration", url: "/register", content: "How to create an account for customers and providers. Visit /register to sign up.", keywords: ["signup", "account", "join", "register"] },
    { title: "Booking Process", url: "/help/booking", content: "Steps to book a service: search for a provider, select a time slot, and pay the $1 commitment fee to secure the booking.", keywords: ["book", "appointment", "fee", "commitment"] },
    { title: "Provider Onboarding", url: "/provider/onboarding", content: "How to set up your provider profile, services, and availability.", keywords: ["provider", "profile", "services", "availability"] },
    { title: "Payments", url: "/help/payments", content: "Understanding payments, commitment fees, and refunds.", keywords: ["payment", "refund", "money", "cost"] },
    { title: "Cancellations", url: "/help/cancellations", content: "Policy on cancellations and rescheduling appointments.", keywords: ["cancel", "reschedule", "change"] },
  ]
}



