'use client';

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface QuoteRequest {
  service: string
  description: string
  location: string
  date: string
  time: string
  budget?: string
}

interface QuoteResponse {
  estimatedPrice: string
  breakdown: string[]
  recommendations: string[]
  providerSuggestions: string[]
}

export default function LLMQuoteGenerator() {
  const [request, setRequest] = useState<QuoteRequest>({
    service: '',
    description: '',
    location: '',
    date: '',
    time: ''
  })
  const [quote, setQuote] = useState<QuoteResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/ai-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (response.ok) {
        const data = await response.json()
        setQuote(data.quote)
      } else {
        console.error('Failed to generate quote')
      }
    } catch (error) {
      console.error('Error generating quote:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">
            Get an AI-Powered Quote for "{request.service}"
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="service">Service Type</Label>
              <Input
                id="service"
                value={request.service}
                onChange={(e) => setRequest({ ...request, service: e.target.value })}
                placeholder="e.g., House cleaning, Haircut, Massage"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Service Description</Label>
              <textarea
                id="description"
                value={request.description}
                onChange={(e) => setRequest({ ...request, description: e.target.value })}
                placeholder="Describe what you need in detail..."
                required
                className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={request.location}
                  onChange={(e) => setRequest({ ...request, location: e.target.value })}
                  placeholder="City or area"
                  required
                />
              </div>
              <div>
                <Label htmlFor="budget">Budget (optional)</Label>
                <Input
                  id="budget"
                  value={request.budget || ''}
                  onChange={(e) => setRequest({ ...request, budget: e.target.value })}
                  placeholder="$50-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Preferred Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={request.date}
                  onChange={(e) => setRequest({ ...request, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="time">Preferred Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={request.time}
                  onChange={(e) => setRequest({ ...request, time: e.target.value })}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Generating Quote...' : 'Get AI Quote'}
            </Button>
          </form>

          {quote && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Estimated Price: {quote.estimatedPrice}</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1">Price Breakdown:</h4>
                  <ul className="text-sm space-y-1">
                    {quote.breakdown.map((item, index) => (
                      <li key={index}>• {item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-1">Recommendations:</h4>
                  <ul className="text-sm space-y-1">
                    {quote.recommendations.map((rec, index) => (
                      <li key={index}>• {rec}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-1">Provider Suggestions:</h4>
                  <ul className="text-sm space-y-1">
                    {quote.providerSuggestions.map((provider, index) => (
                      <li key={index}>• {provider}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 