'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabaseBrowserClient } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Calendar, Clock, User, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface Booking {
  id: string
  customer_id: string
  service_id: string
  start_time: string
  end_time: string
  status: string
  vendor_created: boolean
  total_amount: number
  customer_name?: string
  service_name?: string
}

export default function VendorBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [vendorId, setVendorId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchVendorId()
  }, [])

  useEffect(() => {
    if (vendorId) {
      fetchBookings()
    }
  }, [vendorId, statusFilter])

  const fetchVendorId = async () => {
    const supabase = supabaseBrowserClient()
    if (!supabase) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('role', 'vendor')
      .single()

    if (profile) {
      setVendorId(profile.id)
    }
  }

  const fetchBookings = async () => {
    const supabase = supabaseBrowserClient()
    if (!supabase || !vendorId) return

    setLoading(true)
    try {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          customers:profiles!bookings_customer_id_fkey(full_name),
          services:services!bookings_service_id_fkey(name)
        `)
        .eq('provider_id', vendorId)
        .order('start_time', { ascending: false })
        .limit(50)

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching bookings:', error)
      } else {
        const formattedBookings = (data || []).map((booking: any) => ({
          ...booking,
          customer_name: booking.customers?.full_name || 'Unknown',
          service_name: booking.services?.name || 'Unknown'
        }))
        setBookings(formattedBookings)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredBookings = bookings.filter(booking => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      booking.customer_name?.toLowerCase().includes(search) ||
      booking.service_name?.toLowerCase().includes(search) ||
      booking.id.toLowerCase().includes(search)
    )
  })

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      confirmed: 'default',
      pending: 'secondary',
      cancelled: 'destructive',
      completed: 'outline'
    }
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status}
      </Badge>
    )
  }

  if (loading) {
    return <div className="container mx-auto py-8">Loading bookings...</div>
  }

  return (
    <div className="container mx-auto py-4 sm:py-8 max-w-6xl px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-600 mt-1">Manage all your bookings</p>
        </div>
        <Link href="/vendor/bookings/create">
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
            <Plus className="mr-2 h-4 w-4" />
            Create Booking
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by customer, service, or booking ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-md"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Create your first booking to get started'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Link href="/vendor/bookings/create">
                  <Button>Create First Booking</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredBookings.map((booking) => (
            <Card key={booking.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {booking.service_name}
                      </h3>
                      {getStatusBadge(booking.status)}
                      {booking.vendor_created && (
                        <Badge variant="outline" className="text-xs">
                          Vendor Created
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{booking.customer_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(booking.start_time).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          {new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                          {new Date(booking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    {booking.total_amount > 0 && (
                      <p className="text-sm text-gray-600 mt-2">
                        Amount: ${booking.total_amount.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/vendor/bookings/${booking.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
