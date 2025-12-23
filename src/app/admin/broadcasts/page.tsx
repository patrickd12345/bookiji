'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import DataTable from '@/components/admin/DataTable'
import { broadcasts } from '@/lib/mockData'
import { exportToCSV, exportToJSON } from '@/lib/admin/exportUtils'
import { X } from 'lucide-react'

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
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv')

  const handleExport = () => {
    if (exportFormat === 'csv') {
      exportToCSV(broadcasts, 'broadcasts')
    } else {
      exportToJSON(broadcasts, 'broadcasts')
    }
  }

  const handleCreateBroadcast = async (data: any) => {
    try {
      const response = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      const result = await response.json()
      if (result.success) {
        alert('Broadcast created successfully')
        setShowCreateModal(false)
        window.location.reload()
      } else {
        alert(result.error || 'Failed to create broadcast')
      }
    } catch (error) {
      console.error('Create broadcast error:', error)
      alert('Error creating broadcast')
    }
  }

  const handleSendNotifications = async (message: string) => {
    try {
      const response = await fetch('/api/admin/broadcasts/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, broadcastIds: broadcasts.map(b => b.id) })
      })
      
      const result = await response.json()
      if (result.success) {
        alert(`Notifications sent to ${result.recipientCount} vendors`)
        setShowNotificationModal(false)
      } else {
        alert(result.error || 'Failed to send notifications')
      }
    } catch (error) {
      console.error('Notification error:', error)
      alert('Error sending notifications')
    }
  }

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
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors duration-200 font-medium"
          >
            Create Broadcast
          </button>
          <div className="flex gap-2">
            <select 
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json')}
              className="px-3 py-3 bg-gray-100 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
            <button 
              onClick={handleExport}
              className="px-6 py-3 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-colors duration-200 font-medium"
            >
              Export Data
            </button>
          </div>
          <button 
            onClick={() => setShowNotificationModal(true)}
            className="px-6 py-3 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition-colors duration-200 font-medium"
          >
            Send Notifications
          </button>
          <Link 
            href="/admin/analytics"
            className="px-6 py-3 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 transition-colors duration-200 font-medium inline-block"
          >
            View Analytics
          </Link>
        </div>
      </motion.div>

      {/* Create Broadcast Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateBroadcastModal
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateBroadcast}
          />
        )}
      </AnimatePresence>

      {/* Notification Modal */}
      <AnimatePresence>
        {showNotificationModal && (
          <NotificationModal
            onClose={() => setShowNotificationModal(false)}
            onSend={handleSendNotifications}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function CreateBroadcastModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    service: '',
    customerLocation: '',
    description: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.service || !formData.customerLocation) {
      alert('Please fill in all required fields')
      return
    }
    setSubmitting(true)
    await onSubmit(formData)
    setSubmitting(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
        className="bg-white rounded-2xl p-6 max-w-lg w-full"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Create Broadcast</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Service Type *</label>
            <input
              type="text"
              value={formData.service}
              onChange={(e) => setFormData({ ...formData, service: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Customer Location *</label>
            <input
              type="text"
              value={formData.customerLocation}
              onChange={(e) => setFormData({ ...formData, customerLocation: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Broadcast'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

function NotificationModal({ onClose, onSend }: { onClose: () => void; onSend: (message: string) => void }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) {
      alert('Please enter a message')
      return
    }
    setSending(true)
    await onSend(message)
    setSending(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
        className="bg-white rounded-2xl p-6 max-w-lg w-full"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Send Notifications</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter notification message for vendors..."
              required
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send Notifications'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

