'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { registerTour, useAutoTour } from '@/components/guided-tours/useGuidedTour'
import { 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  MessageSquare,
  RefreshCw,
  User,
  Calendar
} from 'lucide-react'

interface Dispute {
  id: string
  booking_id: string
  user_id: string
  dispute_type: string
  status: 'pending' | 'under_review' | 'resolved' | 'closed'
  description: string
  evidence?: string[]
  requested_resolution: string
  amount_requested?: number
  admin_notes?: string
  resolution?: string
  resolution_amount?: number
  created_at: string
  updated_at: string
  resolved_at?: string
  admin_id?: string
  booking?: {
    service_name: string
    total_amount: number
    status: string
    customer_id: string
    provider_id: string
  }
  user?: {
    email: string
    full_name: string
  }
}

interface DisputeStats {
  total: number
  pending: number
  under_review: number
  resolved: number
  closed: number
  avg_resolution_time: number
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [stats, setStats] = useState<DisputeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
  const [resolutionDialog, setResolutionDialog] = useState(false)
  const [resolutionData, setResolutionData] = useState({
    status: '',
    resolution: '',
    resolution_amount: 0,
    admin_notes: ''
  })

  useEffect(() => {
    loadDisputes()
    loadStats()
  }, [])

  useEffect(() => {
    registerTour({
      id: 'admin-disputes',
      route: '/admin/disputes',
      title: 'Dispute Management',
      steps: [
        { target: '[data-tour="dispute-stats"]', content: 'Overview of all dispute statistics and metrics.' },
        { target: '[data-tour="dispute-list"]', content: 'List of all disputes with filtering and sorting options.' },
        { target: '[data-tour="dispute-actions"]', content: 'Actions to resolve disputes and manage cases.' }
      ]
    })
  }, [])

  useAutoTour('admin-disputes')

  const loadDisputes = async () => {
    try {
      const response = await fetch('/api/admin/disputes')
      if (response.ok) {
        const data = await response.json()
        setDisputes(data.disputes || [])
      }
    } catch (error) {
      console.error('Failed to load disputes:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/disputes/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleResolveDispute = async () => {
    if (!selectedDispute || !resolutionData.status) return

    try {
      const response = await fetch(`/api/admin/disputes/${selectedDispute.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resolutionData)
      })

      if (response.ok) {
        setResolutionDialog(false)
        setSelectedDispute(null)
        setResolutionData({
          status: '',
          resolution: '',
          resolution_amount: 0,
          admin_notes: ''
        })
        loadDisputes()
        loadStats()
      }
    } catch (error) {
      console.error('Failed to resolve dispute:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'under_review': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200'
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getDisputeTypeIcon = (type: string) => {
    switch (type) {
      case 'no_show': return <User className="h-4 w-4" />
      case 'service_quality': return <CheckCircle className="h-4 w-4" />
      case 'payment_issue': return <DollarSign className="h-4 w-4" />
      case 'scheduling_conflict': return <Calendar className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dispute Management</h1>
        <Button onClick={loadDisputes} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6" data-tour="dispute-stats">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Disputes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.under_review || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avg_resolution_time || 0}h</div>
          </CardContent>
        </Card>
      </div>

      {/* Disputes List */}
      <Card data-tour="dispute-list">
        <CardHeader>
          <CardTitle>Active Disputes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {disputes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>No active disputes</p>
                <p className="text-sm">All cases have been resolved</p>
              </div>
            ) : (
              disputes.map((dispute) => (
                <div key={dispute.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {getDisputeTypeIcon(dispute.dispute_type)}
                      <div>
                        <h3 className="font-medium">
                          {dispute.dispute_type.replace('_', ' ').toUpperCase()} - {dispute.booking?.service_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Filed by {dispute.user?.full_name || dispute.user?.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(dispute.status)}>
                        {dispute.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedDispute(dispute)
                          setResolutionDialog(true)
                        }}
                        data-tour="dispute-actions"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Resolve
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Amount:</span> {formatCurrency(dispute.amount_requested || 0)}
                    </div>
                    <div>
                      <span className="font-medium">Requested:</span> {dispute.requested_resolution.replace('_', ' ')}
                    </div>
                    <div>
                      <span className="font-medium">Filed:</span> {new Date(dispute.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div>
                    <span className="font-medium">Description:</span>
                    <p className="text-sm text-muted-foreground mt-1">{dispute.description}</p>
                  </div>

                  {dispute.evidence && dispute.evidence.length > 0 && (
                    <div>
                      <span className="font-medium">Evidence:</span>
                      <div className="flex gap-2 mt-1">
                        {dispute.evidence.map((item, index) => (
                          <Badge key={index} variant="outline">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resolution Dialog */}
      <Dialog open={resolutionDialog} onOpenChange={setResolutionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="status">Resolution Status</Label>
              <Select
                value={resolutionData.status}
                onValueChange={(value) => setResolutionData({ ...resolutionData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="resolution">Resolution Details</Label>
              <Textarea
                id="resolution"
                placeholder="Describe how this dispute was resolved..."
                value={resolutionData.resolution}
                onChange={(e) => setResolutionData({ ...resolutionData, resolution: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="amount">Resolution Amount (if applicable)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={resolutionData.resolution_amount}
                onChange={(e) => setResolutionData({ ...resolutionData, resolution_amount: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label htmlFor="notes">Admin Notes</Label>
              <Textarea
                id="notes"
                placeholder="Internal notes about this case..."
                value={resolutionData.admin_notes}
                onChange={(e) => setResolutionData({ ...resolutionData, admin_notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResolutionDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleResolveDispute}>
                Resolve Dispute
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

