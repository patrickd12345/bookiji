'use client'

import React, { useState, useEffect } from 'react'
import { useShoutOutMetrics } from '@/hooks/useShoutOutMetrics'
import { useShoutOutConfig } from '@/hooks/useShoutOutConfig'
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Settings, 
  Save, 
  RefreshCw,
  AlertCircle,
  BarChart3,
  Users,
  MessageSquare
} from 'lucide-react'

export default function ShoutOutAdminPage() {
  const { metrics, isLoading: metricsLoading, error: metricsError, mutate: refreshMetrics } = useShoutOutMetrics()
  const { config, isLoading: configLoading, error: configError, updateConfig } = useShoutOutConfig()
  
  // Local state for form
  const [formConfig, setFormConfig] = useState({
    enabled: true,
    default_radius_km: 10,
    expiry_minutes: 30,
    max_radius_km: 100,
    min_radius_km: 1
  })
  
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Update form when config loads
  useEffect(() => {
    if (config) {
      setFormConfig({
        enabled: config.enabled,
        default_radius_km: config.default_radius_km,
        expiry_minutes: config.expiry_minutes,
        max_radius_km: config.max_radius_km,
        min_radius_km: config.min_radius_km
      })
    }
  }, [config])

  const handleSaveConfig = async () => {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      await updateConfig(formConfig)
      setSaveSuccess(true)
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false)
      }, 3000)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes.toFixed(1)}m`
    }
    return `${(minutes / 60).toFixed(1)}h`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <MessageSquare className="h-8 w-8 text-blue-600" />
                Shout-Out System Admin
              </h1>
              <p className="text-gray-600 mt-1">
                Monitor performance and configure system settings
              </p>
            </div>
            <button
              onClick={refreshMetrics}
              disabled={metricsLoading}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${metricsLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Conversion Rate */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {metricsLoading ? '...' : formatPercentage(metrics?.conversion_rate || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {metrics?.total_accepted || 0} / {metrics?.total_created || 0} accepted
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>

          {/* Response Time */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-blue-600">
                  {metricsLoading ? '...' : formatDuration(metrics?.avg_response_time_minutes || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {metrics?.total_responses || 0} responses
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          {/* Resolution Rate */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resolution Rate</p>
                <p className="text-2xl font-bold text-purple-600">
                  {metricsLoading ? '...' : formatPercentage(metrics?.resolution_pct || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {metrics?.total_with_offers || 0} with offers
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          {/* Total Shout-Outs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Created</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metricsLoading ? '...' : (metrics?.total_created || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  All time
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-gray-600" />
            </div>
          </div>
        </div>

        {/* Error States */}
        {metricsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Metrics Error</span>
            </div>
            <p className="text-red-700 text-sm mt-1">
              Failed to load metrics data. Please refresh to try again.
            </p>
          </div>
        )}

        {/* Configuration Panel */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="h-6 w-6 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">System Configuration</h2>
          </div>

          {configError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Configuration Error</span>
              </div>
              <p className="text-red-700 text-sm mt-1">
                Failed to load configuration. Using default values.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* System Enable/Disable */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">System Status</h3>
              
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formConfig.enabled}
                  onChange={(e) => setFormConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                  disabled={configLoading || saving}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm text-gray-700">
                  Enable Shout-Out System
                </span>
              </label>
              
              <p className="text-xs text-gray-500">
                When disabled, customers will not see the shout-out option when searches return no results.
              </p>
            </div>

            {/* Radius Settings */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Search Radius</h3>
              
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Default Radius (km)
                </label>
                <input
                  type="number"
                  value={formConfig.default_radius_km}
                  onChange={(e) => setFormConfig(prev => ({ ...prev, default_radius_km: Number(e.target.value) }))}
                  min={formConfig.min_radius_km}
                  max={formConfig.max_radius_km}
                  step="0.5"
                  disabled={configLoading || saving}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Min Radius (km)
                  </label>
                  <input
                    type="number"
                    value={formConfig.min_radius_km}
                    onChange={(e) => setFormConfig(prev => ({ ...prev, min_radius_km: Number(e.target.value) }))}
                    min="0.1"
                    max={formConfig.max_radius_km - 1}
                    step="0.1"
                    disabled={configLoading || saving}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Max Radius (km)
                  </label>
                  <input
                    type="number"
                    value={formConfig.max_radius_km}
                    onChange={(e) => setFormConfig(prev => ({ ...prev, max_radius_km: Number(e.target.value) }))}
                    min={formConfig.min_radius_km + 1}
                    max="1000"
                    step="1"
                    disabled={configLoading || saving}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Timing Settings */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Timing</h3>
              
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Expiry Time (minutes)
                </label>
                <input
                  type="number"
                  value={formConfig.expiry_minutes}
                  onChange={(e) => setFormConfig(prev => ({ ...prev, expiry_minutes: Number(e.target.value) }))}
                  min="5"
                  max="1440"
                  step="5"
                  disabled={configLoading || saving}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  How long shout-outs remain active for vendor responses
                </p>
              </div>
            </div>
          </div>

          {/* Save Button and Status */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                {saveError && (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{saveError}</span>
                  </div>
                )}
                {saveSuccess && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Configuration saved successfully!</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleSaveConfig}
                disabled={configLoading || saving}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Configuration
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
