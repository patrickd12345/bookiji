'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Users, DollarSign, MapPin, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface SpecialtyMetrics {
  id: string
  name: string
  vendorCount: number
  bookingCount: number
}

interface TopVendor {
  id: string
  full_name: string
  business_name: string
  average_rating: number
  total_bookings: number
}

interface BookingTrend {
  date: string
  count: number
  revenue: number
}

interface SpecialtyAnalytics {
  specialty?: {
    id: string
    name: string
    parent_id: string | null
    path: string
  }
  metrics: {
    vendorCount: number
    totalBookings: number
    totalRevenue: number
    averageRating: number
    bookingTrends: BookingTrend[]
    topVendors: TopVendor[]
    geographicDistribution: {
      countries: Array<{ name: string; count: number }>
      cities: Array<{ name: string; count: number }>
    }
  }
}

interface AllSpecialtiesAnalytics {
  overview: {
    totalSpecialties: number
    totalVendors: number
    totalBookings: number
    overallTrends: BookingTrend[]
  }
  specialtyMetrics: SpecialtyMetrics[]
  popularityRanking: SpecialtyMetrics[]
}

// Helper functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US').format(num)
}

export default function SpecialtyAnalytics() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('')
  const [analytics, setAnalytics] = useState<SpecialtyAnalytics | AllSpecialtiesAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [specialties, setSpecialties] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    loadSpecialties()
  }, [])

  useEffect(() => {
    if (selectedSpecialty) {
      loadSpecialtyAnalytics(selectedSpecialty)
    } else {
      loadAllSpecialtiesAnalytics()
    }
  }, [selectedSpecialty, timeRange])

  const loadSpecialties = async () => {
    try {
      const response = await fetch('/api/specialties')
      if (response.ok) {
        const data = await response.json()
        setSpecialties(data.items || [])
      }
    } catch (error) {
      console.error('Error loading specialties:', error)
    }
  }

  const loadSpecialtyAnalytics = async (specialtyId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics/specialties?specialtyId=${specialtyId}&timeRange=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error('Error loading specialty analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAllSpecialtiesAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics/specialties?timeRange=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error('Error loading all specialties analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-8 text-gray-500">
        No analytics data available
      </div>
    )
  }

  const isSingleSpecialty = 'specialty' in analytics

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isSingleSpecialty ? `${analytics.specialty?.name} Analytics` : 'Specialty Analytics'}
          </h2>
          <p className="text-gray-600">
            {isSingleSpecialty ? 'Performance metrics for this specialty' : 'Overview of all specialties'}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select specialty for detailed view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Specialties Overview</SelectItem>
              {specialties.map(specialty => (
                <SelectItem key={specialty.id} value={specialty.id}>
                  {specialty.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isSingleSpecialty ? (
        <SingleSpecialtyView analytics={analytics as SpecialtyAnalytics} />
      ) : (
        <AllSpecialtiesView analytics={analytics as AllSpecialtiesAnalytics} />
      )}
    </div>
  )
}

function SingleSpecialtyView({ analytics }: { analytics: SpecialtyAnalytics }) {
  const { specialty, metrics } = analytics

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.vendorCount)}</div>
            <p className="text-xs text-muted-foreground">
              Active providers in this specialty
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.totalBookings)}</div>
            <p className="text-xs text-muted-foreground">
              Bookings in selected period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Revenue generated in period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Customer satisfaction score
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Vendors */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Vendors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.topVendors.map((vendor, index) => (
              <div key={vendor.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline">#{index + 1}</Badge>
                  <div>
                    <p className="font-medium">{vendor.business_name || vendor.full_name}</p>
                    <p className="text-sm text-gray-500">
                      {formatNumber(vendor.total_bookings)} bookings
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{vendor.average_rating.toFixed(1)} ⭐</p>
                  <p className="text-sm text-gray-500">Rating</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Geographic Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Geographic Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.geographicDistribution.countries.slice(0, 5).map((country, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{country.name}</span>
                  </div>
                  <Badge variant="secondary">{country.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booking Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.bookingTrends.slice(-7).map((trend, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm">{trend.count} bookings</span>
                    <span className="text-sm font-medium">{formatCurrency(trend.revenue / 100)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AllSpecialtiesView({ analytics }: { analytics: AllSpecialtiesAnalytics }) {
  const { overview, specialtyMetrics, popularityRanking } = analytics

  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Specialties</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(overview.totalSpecialties)}</div>
            <p className="text-xs text-muted-foreground">
              Active service categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(overview.totalVendors)}</div>
            <p className="text-xs text-muted-foreground">
              Active service providers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(overview.totalBookings)}</div>
            <p className="text-xs text-muted-foreground">
              Total bookings in period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Trend</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+12.5%</div>
            <p className="text-xs text-muted-foreground">
              vs previous period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Popularity Ranking */}
      <Card>
        <CardHeader>
          <CardTitle>Most Popular Specialties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {popularityRanking.map((specialty, index) => (
              <div key={specialty.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Badge variant={index < 3 ? "default" : "outline"}>#{index + 1}</Badge>
                  <div>
                    <p className="font-medium">{specialty.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatNumber(specialty.vendorCount)} vendors
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatNumber(specialty.bookingCount)}</p>
                  <p className="text-sm text-gray-500">Bookings</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* All Specialties Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Specialties Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Specialty</th>
                  <th className="text-left p-2">Vendors</th>
                  <th className="text-left p-2">Bookings</th>
                  <th className="text-left p-2">Performance</th>
                </tr>
              </thead>
              <tbody>
                {specialtyMetrics.map(specialty => (
                  <tr key={specialty.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{specialty.name}</td>
                    <td className="p-2">{formatNumber(specialty.vendorCount)}</td>
                    <td className="p-2">{formatNumber(specialty.bookingCount)}</td>
                    <td className="p-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ 
                            width: `${Math.min((specialty.bookingCount / Math.max(...specialtyMetrics.map(s => s.bookingCount))) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
