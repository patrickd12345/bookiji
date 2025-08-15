'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// Badge component for status indicators
import { Badge } from '@/components/ui/badge'

interface MigrationStatus {
  profiles_table: {
    exists: boolean
    has_beta_status: boolean
    status: string
  }
  user_role_summary_view: {
    exists: boolean
    status: string
  }
  overall_status: string
  recommendations: string[]
}

export default function SimpleTestPage() {
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkMigrationStatus = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/check-migration')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      if (data.success) {
        setMigrationStatus(data.migration_status)
      } else {
        throw new Error(data.error || 'Failed to check migration status')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkMigrationStatus()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-100 text-green-800'
      case 'missing_beta_status':
        return 'bg-yellow-100 text-yellow-800'
      case 'missing':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getOverallStatusColor = (status: string) => {
    return status === 'complete' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Database Diagnostics</h1>
          <p className="text-lg text-gray-600">
            Check the health of your Bookiji database and get migration guidance
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Migration Status</span>
              <Button 
                onClick={checkMigrationStatus} 
                disabled={loading}
                variant="outline"
                size="sm"
              >
                {loading ? 'Checking...' : 'Refresh Status'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800 font-medium">Error checking migration status:</p>
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {migrationStatus && (
              <div className="space-y-6">
                {/* Overall Status */}
                <div className="text-center">
                  <Badge className={`text-lg px-4 py-2 ${getOverallStatusColor(migrationStatus.overall_status)}`}>
                    {migrationStatus.overall_status === 'complete' ? '✅ Database Healthy' : '❌ Database Issues Detected'}
                  </Badge>
                </div>

                {/* Profiles Table Status */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-3">Profiles Table</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Exists</p>
                      <Badge className={getStatusColor(migrationStatus.profiles_table.status)}>
                        {migrationStatus.profiles_table.exists ? '✅ Yes' : '❌ No'}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Beta Status Column</p>
                      <Badge className={getStatusColor(migrationStatus.profiles_table.status)}>
                        {migrationStatus.profiles_table.has_beta_status ? '✅ Yes' : '❌ No'}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Status</p>
                      <Badge className={getStatusColor(migrationStatus.profiles_table.status)}>
                        {migrationStatus.profiles_table.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* User Role Summary View Status */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-3">User Role Summary View</h3>
                  <div className="text-center">
                    <Badge className={getStatusColor(migrationStatus.user_role_summary_view.status)}>
                      {migrationStatus.user_role_summary_view.exists ? '✅ Accessible' : '❌ Not Accessible'}
                    </Badge>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h3 className="font-semibold text-lg mb-3 text-blue-900">Recommendations</h3>
                  <ul className="space-y-2">
                    {migrationStatus.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        <span className="text-blue-800">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Items */}
                {migrationStatus.overall_status !== 'complete' && (
                  <div className="border rounded-lg p-4 bg-amber-50">
                    <h3 className="font-semibold text-lg mb-3 text-amber-900">Action Required</h3>
                    <p className="text-amber-800 mb-4">
                      Your database has schema issues that need to be resolved. The app will continue to work with limited functionality, but some features may not be available.
                    </p>
                    <div className="space-y-2">
                      <p className="text-amber-700 text-sm">
                        <strong>Immediate:</strong> The app will use fallback profiles to prevent crashes
                      </p>
                      <p className="text-amber-700 text-sm">
                        <strong>Short-term:</strong> Run the missing database migrations
                      </p>
                      <p className="text-amber-700 text-sm">
                        <strong>Long-term:</strong> Consider database maintenance and optimization
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!migrationStatus && !loading && !error && (
              <div className="text-center text-gray-500">
                Click "Refresh Status" to check your database health
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>What This Means</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">500 Server Errors</h4>
              <p className="text-gray-600 text-sm">
                If you're seeing 500 errors, it indicates server-side database issues like corrupted tables, 
                broken RLS policies, or missing foreign key constraints. The app will handle these gracefully 
                and provide fallback functionality.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Missing Columns</h4>
              <p className="text-gray-600 text-sm">
                Missing columns like <code>beta_status</code> prevent certain features from working, 
                but the core app functionality remains intact. These can be added by running the 
                appropriate database migrations.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Fallback Behavior</h4>
              <p className="text-gray-600 text-sm">
                When database issues are detected, the app automatically creates minimal user profiles 
                and disables problematic features. This ensures the app remains functional while 
                issues are being resolved.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 