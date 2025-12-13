'use client'

import { motion } from 'framer-motion'
import DataTable from '@/components/admin/DataTable'
import { broadcasts } from '@/lib/mockData'

interface VendorResponse {
  vendorName: string
  response: 'accepted' | 'declined' | 'pending'
  responseTime?: string
  message?: string
}

interface BroadcastRow {
  id: string
  service: string
  customerLocation: string
  vendorsCount: number
  status: string
  timestamp: string
  vendorResponses?: VendorResponse[]
}

export default function BroadcastsPage() {
  const columns = [
    { key: 'id', label: 'Request ID', sortable: true },
    { key: 'service', label: 'Service', sortable: true },
    { key: 'customerLocation', label: 'Customer Location', sortable: true },
    { key: 'vendorsCount', label: 'Vendors Count', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'timestamp', label: 'Timestamp', sortable: true }
  ]

  const expandedContent = (row: BroadcastRow) => (
    <div className="p-4 bg-gray-50 rounded-xl">
      <h4 className="font-medium text-gray-900 mb-3">Vendor Responses</h4>
      {row.vendorResponses && row.vendorResponses.length > 0 ? (
        <div className="space-y-3">
          {row.vendorResponses.map((response: VendorResponse, index: number) => (
            <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  response.response === 'accepted' ? 'bg-green-500' :
                  response.response === 'declined' ? 'bg-red-500' : 'bg-yellow-500'
                }`}></div>
                <div>
                  <p className="font-medium text-gray-900">{response.vendorName}</p>
                  <p className="text-sm text-gray-600">
                    {response.response === 'accepted' ? 'Accepted' :
                     response.response === 'declined' ? 'Declined' : 'Pending'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">
                  {response.responseTime ? new Date(response.responseTime).toLocaleString() : 'No response yet'}
                </p>
                {response.message && (
                  <p className="text-sm text-gray-700 mt-1">{response.message}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          <p>No vendor responses yet</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Broadcasts</h1>
        <p className="text-gray-600">Monitor service requests and vendor responses across your platform.</p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
      >
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Requests</p>
              <p className="text-2xl font-bold text-blue-600">{broadcasts.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <span className="text-blue-600 font-semibold">📡</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Open</p>
              <p className="text-2xl font-bold text-green-600">
                {broadcasts.filter(b => b.status === 'open').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
              <span className="text-green-600 font-semibold">🟢</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">In Progress</p>
              <p className="text-2xl font-bold text-yellow-600">
                {broadcasts.filter(b => b.status === 'in_progress').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center">
              <span className="text-yellow-600 font-semibold">🟡</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Completed</p>
              <p className="text-2xl font-bold text-purple-600">
                {broadcasts.filter(b => b.status === 'completed').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
              <span className="text-purple-600 font-semibold">✅</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Broadcasts Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <DataTable
          columns={columns}
          data={broadcasts}
          title="Broadcast Management"
          expandable={true}
          expandedContent={expandedContent}
        />
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          <button className="px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors duration-200 font-medium">
            Create Broadcast
          </button>
          <button className="px-6 py-3 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-colors duration-200 font-medium">
            Export Data
          </button>
          <button className="px-6 py-3 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition-colors duration-200 font-medium">
            Send Notifications
          </button>
          <button className="px-6 py-3 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 transition-colors duration-200 font-medium">
            View Analytics
          </button>
        </div>
      </motion.div>
    </div>
  )
}

