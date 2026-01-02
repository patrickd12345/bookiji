'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import DataTable from '@/components/admin/DataTable'
import { exportToCSV, exportToJSON } from '@/lib/admin/exportUtils'
import { X } from 'lucide-react'

export default function VendorsPage() {
  const router = useRouter()
  const [_showAddModal, _setShowAddModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [showNewsletterModal, setShowNewsletterModal] = useState(false)
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set())
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv')
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await fetch('/api/admin/providers', { credentials: 'include' })
        const json = await res.json()
        if (!mounted) return
        if (!res.ok) {
          setLoadError(json?.error || 'Failed to load providers')
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
  
  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'location', label: 'Location', sortable: true },
    { key: 'joinDate', label: 'Join Date', sortable: true }
  ]

  const handleExport = () => {
    if (exportFormat === 'csv') {
      exportToCSV(rows, 'vendors')
    } else {
      exportToJSON(rows, 'vendors')
    }
  }

  const handleBulkAction = async (action: 'approve' | 'reject' | 'suspend') => {
    if (selectedVendors.size === 0) {
      alert('Please select vendors first')
      return
    }
    
    try {
      const response = await fetch('/api/admin/vendors/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action, 
          vendorIds: Array.from(selectedVendors) 
        })
      })
      
      const data = await response.json()
      if (data.success) {
        alert(`Successfully ${action}d ${selectedVendors.size} vendor(s)`)
        setSelectedVendors(new Set())
        setShowBulkModal(false)
        router.refresh()
      } else {
        alert(data.error || 'Action failed')
      }
    } catch (_error) {
      alert('Error performing bulk action')
    }
  }

  const handleSendNewsletter = async (subject: string, message: string) => {
    try {
      const response = await fetch('/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subject, 
          message,
          recipientType: 'vendors'
        })
      })
      
      const data = await response.json()
      if (data.success) {
        alert(`Newsletter sent to ${data.recipientCount} vendors`)
        setShowNewsletterModal(false)
      } else {
        alert(data.error || 'Failed to send newsletter')
      }
    } catch (_error) {
      alert('Error sending newsletter')
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Vendors</h1>
        <p className="text-gray-600">Manage and monitor all service providers on your platform.</p>
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
              <p className="text-sm font-medium text-gray-600 mb-1">Total Vendors</p>
              <p className="text-2xl font-bold text-blue-600">{rows.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <span className="text-blue-600 font-semibold">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Active</p>
              <p className="text-2xl font-bold text-green-600">
                {rows.filter((v:any) => v.vendor_status === 'approved' || v.vendor_status === 'active').length}
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
                {rows.filter((v:any) => v.vendor_status === 'pending' || v.vendor_status === 'pending_approval').length}
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
              <p className="text-sm font-medium text-gray-600 mb-1">Suspended</p>
              <p className="text-2xl font-bold text-red-600">
                {rows.filter((v:any) => v.vendor_status === 'suspended').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
              <span className="text-red-600 font-semibold">🚫</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Vendors Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        {loading ? (
          <div className="p-6">Loading vendors...</div>
        ) : loadError ? (
          <div className="p-6 text-red-600">Error: {loadError}</div>
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            title="Vendor Management"
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
            onClick={() => router.push('/vendor/onboarding')}
            className="px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors duration-200 font-medium"
          >
            + Add New Vendor
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
            onClick={() => setShowBulkModal(true)}
            className="px-6 py-3 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition-colors duration-200 font-medium"
          >
            Bulk Actions
          </button>
          <button 
            onClick={() => setShowNewsletterModal(true)}
            className="px-6 py-3 bg-gray-600 text-white rounded-2xl hover:bg-gray-700 transition-colors duration-200 font-medium"
          >
            Send Newsletter
          </button>
        </div>
      </motion.div>

      {/* Bulk Actions Modal */}
      <AnimatePresence>
        {showBulkModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowBulkModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Bulk Actions</h3>
                <button onClick={() => setShowBulkModal(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Select vendors from the table, then choose an action below.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => handleBulkAction('approve')}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
                >
                  Approve Selected ({selectedVendors.size})
                </button>
                <button
                  onClick={() => handleBulkAction('reject')}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700"
                >
                  Reject Selected ({selectedVendors.size})
                </button>
                <button
                  onClick={() => handleBulkAction('suspend')}
                  className="w-full px-4 py-2 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700"
                >
                  Suspend Selected ({selectedVendors.size})
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Newsletter Modal */}
      <AnimatePresence>
        {showNewsletterModal && (
          <NewsletterModal
            onClose={() => setShowNewsletterModal(false)}
            onSend={handleSendNewsletter}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function NewsletterModal({ onClose, onSend }: { onClose: () => void; onSend: (subject: string, message: string) => void }) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject || !message) {
      alert('Please fill in all fields')
      return
    }
    setSending(true)
    await onSend(subject, message)
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
          <h3 className="text-xl font-bold">Send Newsletter</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500"
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
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send Newsletter'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

