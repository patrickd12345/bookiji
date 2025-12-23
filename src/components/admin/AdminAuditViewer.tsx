'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Eye, AlertTriangle, Calendar, User, Shield } from 'lucide-react'

interface AuditLog {
  id: number
  admin_user_id: string
  action: string
  resource_type: string
  resource_id: string
  old_values: any
  new_values: any
  ip_address: string
  user_agent: string
  request_id: string
  created_at: string
  profiles: {
    full_name: string
    email: string
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface ApiResponse {
  data: AuditLog[]
  pagination: Pagination
  error?: string
  hint?: string
}

function AdminAuditViewerContent() {
  const searchParams = useSearchParams()
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorHint, setErrorHint] = useState<string | null>(null)
  
  // Filters
  const [filters, setFilters] = useState({
    action: '',
    adminUserId: '',
    startDate: '',
    endDate: '',
    endpoint: ''
  })

  // Handle URL parameters for drill-through from performance dashboard
  useEffect(() => {
    const endpoint = searchParams.get('endpoint')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    
    if (endpoint || from || to) {
      setFilters(prev => ({
        ...prev,
        endpoint: endpoint || '',
        startDate: from || '',
        endDate: to || ''
      }))
    }
  }, [searchParams])

  const fetchAuditLogs = async (page = 1) => {
    setLoading(true)
    setError(null)
    setErrorHint(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.action && { action: filters.action }),
        ...(filters.adminUserId && { admin_user_id: filters.adminUserId }),
        ...(filters.startDate && { start_date: filters.startDate }),
        ...(filters.endDate && { end_date: filters.endDate }),
        ...(filters.endpoint && { endpoint: filters.endpoint })
      })

      const response = await fetch(`/api/admin/audit-log?${params}`)
      const data: ApiResponse = await response.json()

      if (!response.ok) {
        if (response.status === 403) {
          setError('Permission denied')
          setErrorHint(data.hint || 'Check admin role and RLS policies')
        } else {
          setError(data.error || 'Failed to fetch audit logs')
          setErrorHint(data.hint || null)
        }
        return
      }

      setAuditLogs(data.data)
      setPagination(data.pagination)
    } catch (err) {
      setError('Network error occurred')
      setErrorHint('Check network connection and try again')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditLogs()
  }, [])

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchAuditLogs(1)
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
    fetchAuditLogs(newPage)
  }

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create': return 'bg-green-100 text-green-800'
      case 'update': return 'bg-blue-100 text-blue-800'
      case 'delete': return 'bg-red-100 text-red-800'
      case 'approve': return 'bg-emerald-100 text-emerald-800'
      case 'reject': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="font-semibold">{error}</div>
          {errorHint && (
            <div className="mt-2 text-sm opacity-90">
              <Shield className="inline h-3 w-3 mr-1" />
              <strong>Hint:</strong> {errorHint}
            </div>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Admin Audit Log</h2>
          <p className="text-muted-foreground">
            Monitor admin actions and troubleshoot RLS issues
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          RLS Protected
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="action">Action</Label>
              <Select value={filters.action} onValueChange={(value) => handleFilterChange('action', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="approve">Approve</SelectItem>
                  <SelectItem value="reject">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="adminUserId">Admin User ID</Label>
              <Input
                id="adminUserId"
                placeholder="Filter by admin user"
                value={filters.adminUserId}
                onChange={(e) => handleFilterChange('adminUserId', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="endpoint">Endpoint</Label>
              <Input
                id="endpoint"
                placeholder="Filter by API endpoint"
                value={filters.endpoint}
                onChange={(e) => handleFilterChange('endpoint', e.target.value)}
              />
            </div>

            <div className="md:col-span-4">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Apply Filters
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Audit Logs</span>
            <Badge variant="secondary">
              {pagination.total} total entries
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading audit logs...</span>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit logs found
            </div>
          ) : (
            <div className="space-y-4">
              {auditLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={getActionColor(log.action)}>
                        {log.action.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {log.resource_type}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        ID: {log.resource_id}
                      </span>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(log.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Admin User</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {log.profiles?.full_name || 'Unknown'}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ({log.profiles?.email || log.admin_user_id})
                        </span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Request ID</Label>
                      <div className="mt-1 font-mono text-sm bg-muted p-2 rounded">
                        {log.request_id || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {(log.old_values || log.new_values) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {log.old_values && (
                        <div>
                          <Label className="text-sm font-medium">Previous Values</Label>
                          <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                            {JSON.stringify(log.old_values, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.new_values && (
                        <div>
                          <Label className="text-sm font-medium">New Values</Label>
                          <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                            {JSON.stringify(log.new_values, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-sm font-medium">IP Address</Label>
                      <div className="mt-1 font-mono">{log.ip_address || 'N/A'}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">User Agent</Label>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {truncateText(log.user_agent || 'N/A', 80)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Enhanced Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
                <div className="text-sm text-muted-foreground">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={pagination.page <= 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <span className="px-3 py-2 text-sm">
                  {pagination.page}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.totalPages)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminAuditViewer() {
  return (
    <Suspense fallback={
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading audit logs...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <AdminAuditViewerContent />
    </Suspense>
  )
}
