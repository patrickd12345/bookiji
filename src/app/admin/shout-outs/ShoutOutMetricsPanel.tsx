'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ShoutOutMetrics {
  totalRequests: number
  pendingRequests: number
  acceptedRequests: number
  declinedRequests: number
  averageResponseTime: number
  topCategories: Array<{ category: string; count: number }>
}

export default function ShoutOutMetricsPanel() {
  const [metrics, setMetrics] = useState<ShoutOutMetrics>({
    totalRequests: 0,
    pendingRequests: 0,
    acceptedRequests: 0,
    declinedRequests: 0,
    averageResponseTime: 0,
    topCategories: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data for now - replace with actual API call
    const mockMetrics: ShoutOutMetrics = {
      totalRequests: 156,
      pendingRequests: 23,
      acceptedRequests: 98,
      declinedRequests: 35,
      averageResponseTime: 2.4,
      topCategories: [
        { category: 'Hair & Beauty', count: 45 },
        { category: 'Wellness', count: 32 },
        { category: 'Fitness', count: 28 },
        { category: 'Health', count: 21 }
      ]
    }
    
    setMetrics(mockMetrics)
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalRequests}</div>
            <p className="text-xs text-muted-foreground">
              All time shout-out requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Badge variant="secondary">{metrics.pendingRequests}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {metrics.pendingRequests}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting vendor response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <Badge variant="default">{metrics.acceptedRequests}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics.acceptedRequests}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully matched
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageResponseTime}h</div>
            <p className="text-xs text-muted-foreground">
              Average vendor response time
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Service Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.topCategories.map((category, index) => (
              <div key={category.category} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{index + 1}</Badge>
                  <span className="font-medium">{category.category}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {category.count} requests
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

