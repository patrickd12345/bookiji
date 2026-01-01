'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check, X, Eye, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface SpecialtySuggestion {
  id: string
  app_user_id: string
  proposed_name: string
  parent_id: string | null
  details: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reviewed_at: string | null
  reviewer_id: string | null
  user_display_name?: string
  parent_name?: string
}

interface SuggestionForm {
  status: 'approved' | 'rejected'
  admin_notes: string
  parent_id?: string | null
}

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<SpecialtySuggestion[]>([])
  const [filteredSuggestions, setFilteredSuggestions] = useState<SpecialtySuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [selectedSuggestion, setSelectedSuggestion] = useState<SpecialtySuggestion | null>(null)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [formData, setFormData] = useState<SuggestionForm>({
    status: 'approved',
    admin_notes: ''
  })
  const [specialties, setSpecialties] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    loadSuggestions()
    loadSpecialties()
  }, [])

  useEffect(() => {
    let filtered = suggestions

    if (statusFilter !== 'all') {
      filtered = suggestions.filter(suggestion => suggestion.status === statusFilter)
    }

    setFilteredSuggestions(filtered)
  }, [suggestions, statusFilter])

  const loadSuggestions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/specialties/suggest')
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.items || [])
      } else {
        alert('Failed to load suggestions')
      }
    } catch (_error) {
      alert('Failed to load suggestions')
    } finally {
      setLoading(false)
    }
  }

  const loadSpecialties = async () => {
    try {
      const response = await fetch('/api/specialties')
      if (response.ok) {
        const data = await response.json()
        setSpecialties(data.items || [])
      }
    } catch (_error) {
      // Error loading specialties
    }
  }

  const handleReview = (suggestion: SpecialtySuggestion) => {
    setSelectedSuggestion(suggestion)
    setFormData({
      status: 'approved',
      admin_notes: '',
      parent_id: suggestion.parent_id
    })
    setShowReviewDialog(true)
  }

  const submitReview = async () => {
    if (!selectedSuggestion) return

    try {
      const response = await fetch(`/api/specialties/suggest/${selectedSuggestion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        alert(`Suggestion ${formData.status} successfully`)
        setShowReviewDialog(false)
        setSelectedSuggestion(null)
        loadSuggestions()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to review suggestion')
      }
    } catch (_error) {
      alert('Failed to review suggestion')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending Review</Badge>
      case 'approved':
        return <Badge variant="default">Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading suggestions...</div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Specialty Suggestions</h1>
        <p className="text-gray-600">Review and manage vendor specialty suggestions</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <Select 
            value={statusFilter} 
            onValueChange={(value: string) => {
              if (value === 'all' || value === 'pending' || value === 'approved' || value === 'rejected') {
                setStatusFilter(value)
              }
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Suggestions List */}
      <Card>
        <CardHeader>
          <CardTitle>Suggestions ({filteredSuggestions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map(suggestion => (
                <div
                  key={suggestion.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(suggestion.status)}
                        <span className="font-semibold text-lg">{suggestion.proposed_name}</span>
                        {getStatusBadge(suggestion.status)}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>Submitted by:</strong> {suggestion.user_display_name || 'Unknown User'}</p>
                        <p><strong>Submitted:</strong> {formatDate(suggestion.created_at)}</p>
                        {suggestion.parent_name && (
                          <p><strong>Parent Category:</strong> {suggestion.parent_name}</p>
                        )}
                        {suggestion.details && (
                          <p><strong>Details:</strong> {suggestion.details}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {suggestion.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReview(suggestion)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No suggestions found matching your criteria
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Suggestion: {selectedSuggestion?.proposed_name}</DialogTitle>
          </DialogHeader>
          
          {selectedSuggestion && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Suggestion Details</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Proposed Name:</strong> {selectedSuggestion.proposed_name}</p>
                  <p><strong>Submitted by:</strong> {selectedSuggestion.user_display_name || 'Unknown User'}</p>
                  <p><strong>Submitted:</strong> {formatDate(selectedSuggestion.created_at)}</p>
                  {selectedSuggestion.details && (
                    <p><strong>Details:</strong> {selectedSuggestion.details}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Decision</label>
                <Select
                  value={formData.status}
                  onValueChange={(value: string) => 
                    setFormData(prev => ({ ...prev, status: value as 'approved' | 'rejected' }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approve</SelectItem>
                    <SelectItem value="rejected">Reject</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.status === 'approved' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Parent Category (Optional)</label>
                  <Select
                    value={formData.parent_id || ''}
                    onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, parent_id: value || null }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Parent (Root Category)</SelectItem>
                      {specialties.map(specialty => (
                        <SelectItem key={specialty.id} value={specialty.id}>
                          {specialty.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Admin Notes</label>
                <Textarea
                  value={formData.admin_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, admin_notes: e.target.value }))}
                  placeholder="Add notes about your decision..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={submitReview}
                  variant={formData.status === 'approved' ? 'default' : 'destructive'}
                >
                  {formData.status === 'approved' ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Approve
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}


