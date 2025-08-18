'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Vendor {
  id: string
  email: string
  full_name: string
  business_name?: string
  is_active: boolean
  created_at: string
  last_login?: string
  total_bookings: number
  active_services: number
}

export default function VendorsAdmin() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    loadVendors()
  }, [filter])

  const loadVendors = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/vendors?filter=${filter}`)
      if (response.ok) {
        const data = await response.json()
        setVendors(data.vendors || [])
      }
    } catch (error) {
      console.error('Error loading vendors:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleVendorStatus = async (vendorId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'deactivate' : 'activate'
    const reason = prompt(`Why are you ${action}ing this vendor?`)
    
    if (!reason?.trim()) {
      alert('Reason is required for this action')
      return
    }

    setActionLoading(vendorId)
    try {
      const response = await fetch(`/api/admin/vendors/${vendorId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: currentStatus ? 'deactivate' : 'activate',
          reason 
        })
      })

      if (response.ok) {
        await loadVendors() // Refresh the list
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'Action failed'}`)
      }
    } catch (error) {
      console.error(`Error ${action}ing vendor:`, error)
      alert(`Error ${action}ing vendor`)
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-600">Loading vendors...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
        <div className="flex items-center space-x-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All Vendors</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="new">New (Last 7 Days)</option>
          </select>
          <button
            onClick={loadVendors}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vendor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Business
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Services
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bookings
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {vendors.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No vendors found for the selected filter.
                </td>
              </tr>
            ) : (
              vendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {vendor.full_name || 'Unnamed'}
                      </div>
                      <div className="text-sm text-gray-500">{vendor.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {vendor.business_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      vendor.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {vendor.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {vendor.active_services}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {vendor.total_bookings}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(vendor.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Link
                      href={`/admin/vendors/${vendor.id}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => toggleVendorStatus(vendor.id, vendor.is_active)}
                      disabled={actionLoading === vendor.id}
                      className={`${
                        vendor.is_active 
                          ? 'text-red-600 hover:text-red-800' 
                          : 'text-green-600 hover:text-green-800'
                      } disabled:opacity-50`}
                    >
                      {actionLoading === vendor.id ? 'Loading...' : (vendor.is_active ? 'Deactivate' : 'Activate')}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
