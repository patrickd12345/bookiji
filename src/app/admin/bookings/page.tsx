'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import DataTable from '@/components/admin/DataTable'
import { exportToCSV, exportToJSON } from '@/lib/admin/exportUtils'
import { X } from 'lucide-react'
import { logger } from '@/lib/logger'

export default function BookingsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv')
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await fetch('/api/admin/bookings', { credentials: 'include' })
        const json = await res.json()
        if (!mounted) return
        if (!res.ok) {
          setLoadError(json?.error || 'Failed to load bookings')
          setLoading(false)
          return
        }
        setRows(json.data || [])
      } catch (err: any) {
        if (!mounted) return
        setLoadError(err?.message || 'Network error')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const handleExport = () => {
    if (exportFormat === 'csv') {
      exportToCSV(rows, 'bookings')
    } else {
      exportToJSON(rows, 'bookings')
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCreateBooking = async (data: any) => {
    try {
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      const result = await response.json()
      if (result.success) {
        alert('Booking created successfully')
        setShowCreateModal(false)
        window.location.reload()
      } else {
        alert(result.error || 'Failed to create booking')
      }
    } catch (error) {
      logger.error('Create booking error:', { error })
      alert('Error creating booking')
    }
  }

  const handleSendReminders = async () => {
    try {
      const response = await fetch('/api/admin/bookings/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const result = await response.json()
      if (result.success) {
        alert(`Reminders sent to ${result.recipientCount} customers`)
        setShowReminderModal(false)
      } else {
        alert(result.error || 'Failed to send reminders')
      }
    } catch (error) {
      logger.error('Reminder error:', { error })
      alert('Error sending reminders')
    }
  }

  const columns = [
    { key: 'id', label: 'Booking ID', sortable: true },
    { key: 'customer', label: 'Customer', sortable: true },
    { key: 'vendor', label: 'Vendor', sortable: true },
    { key: 'service', label: 'Service', sortable: true },
    { key: 'date', label: 'Date', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'amount', label: 'Amount', sortable: true }
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Bookings</h1>
        <p className="text-gray-600">Monitor and manage all customer bookings across your platform.</p>
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
              <p className="text-sm font-medium text-gray-600 mb-1">Total Bookings</p>
              <p className="text-2xl font-bold text-blue-600">{rows.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <span className="text-blue-600 font-semibold">📅</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Confirmed</p>
              <p className="text-2xl font-bold text-green-600">
                {rows.filter(b => b.status === 'confirmed').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
              <span className="text-green-600 font-semibold">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {rows.filter(b => b.status === 'pending').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center">
              <span className="text-yellow-600 font-semibold">⏳</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-purple-600">
                ${rows.reduce((sum: number, b: any) => sum + ((b.total_amount_cents || 0) / 100), 0).toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
              <span className="text-purple-600 font-semibold">💰</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bookings Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        {loading ? (
          <div className="p-6">Loading bookings...</div>
        ) : loadError ? (
          <div className="p-6 text-red-600">Error: {loadError}</div>
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            title="Booking Management"
          />
        )}
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
            Create Booking
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
            onClick={() => setShowReminderModal(true)}
            className="px-6 py-3 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition-colors duration-200 font-medium"
          >
            Send Reminders
          </button>
          <Link 
            href="/vendor/calendar"
            className="px-6 py-3 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 transition-colors duration-200 font-medium inline-block"
          >
            View Calendar
          </Link>
        </div>
      </motion.div>

      {/* Create Booking Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateBookingModal
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateBooking}
          />
        )}
      </AnimatePresence>

      {/* Reminder Modal */}
      <AnimatePresence>
        {showReminderModal && (
          <ReminderModal
            onClose={() => setShowReminderModal(false)}
            onSend={handleSendReminders}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CreateBookingModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    customer: '',
    vendor: '',
    service: '',
    date: '',
    time: '',
    amount: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.customer || !formData.vendor || !formData.service || !formData.date) {
      alert('Please fill in all required fields')
      return
    }
    setSubmitting(true)
    await onSubmit({
      ...formData,
      amount: parseFloat(formData.amount) || 0,
      datetime: `${formData.date}T${formData.time}`
    })
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
          <h3 className="text-xl font-bold">Create Booking</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Customer Email *</label>
            <input
              type="email"
              value={formData.customer}
              onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Vendor Email *</label>
            <input
              type="email"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Service *</label>
            <input
              type="text"
              value={formData.service}
              onChange={(e) => setFormData({ ...formData, service: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Time *</label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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
              {submitting ? 'Creating...' : 'Create Booking'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

function ReminderModal({ onClose, onSend }: { onClose: () => void; onSend: () => void }) {
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    setSending(true)
    await onSend()
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
        className="bg-white rounded-2xl p-6 max-w-md w-full"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Send Booking Reminders</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Send reminders to customers with upcoming bookings in the next 24 hours.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send Reminders'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

