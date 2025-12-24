'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAnalytics } from '@/hooks/useAnalytics'

interface FunnelData {
  timeRange: string
  totalSessions: number
  conversionRates: {
    searchToVisit: number
    bookingToSearch: number
    confirmationToBooking: number
    overallConversion: number
  }
  funnelSteps: {
    visits: number
    searches: number
    bookings: number
    confirmations: number
  }
  dailyStats: Array<{
    day: string
    visits: number
    searches: number
    bookings: number
    confirmations: number
  }>
}

export function AnalyticsDashboard() {
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d')
  const { trackPageView } = useAnalytics()

  useEffect(() => {
    trackPageView('analytics-dashboard')
    fetchFunnelData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, trackPageView])

  const fetchFunnelData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/analytics/funnel?range=${timeRange}`)
      if (!response.ok) {
        throw new Error('Failed to fetch funnel data')
      }
      
      const result = await response.json()
      if (result.success) {
        setFunnelData(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <div className="space-x-2">
            {(['24h', '7d', '30d'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                disabled
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p className="text-lg font-semibold">Error loading analytics</p>
              <p className="text-sm mt-2">{error}</p>
              <Button onClick={fetchFunnelData} className="mt-4">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!funnelData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p>No analytics data available</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <div className="space-x-2">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {/* Funnel Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Visits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{funnelData.funnelSteps.visits.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Searches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{funnelData.funnelSteps.searches.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {funnelData.conversionRates.searchToVisit.toFixed(1)}% of visits
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bookings Started
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{funnelData.funnelSteps.bookings.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {funnelData.conversionRates.bookingToSearch.toFixed(1)}% of searches
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Confirmations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{funnelData.funnelSteps.confirmations.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {funnelData.conversionRates.confirmationToBooking.toFixed(1)}% of bookings
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Conversion */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Conversion Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">
              {funnelData.conversionRates.overallConversion.toFixed(1)}%
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {funnelData.funnelSteps.confirmations.toLocaleString()} out of{' '}
              {funnelData.totalSessions.toLocaleString()} sessions converted
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Daily Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {funnelData.dailyStats.slice(-7).map((day) => (
              <div key={day.day} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="font-medium">{new Date(day.day).toLocaleDateString()}</div>
                <div className="flex space-x-6 text-sm">
                  <span>👁️ {day.visits}</span>
                  <span>🔍 {day.searches}</span>
                  <span>📅 {day.bookings}</span>
                  <span>✅ {day.confirmations}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
