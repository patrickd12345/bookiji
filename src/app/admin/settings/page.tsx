'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import SettingsForm from '@/components/admin/SettingsForm'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    twoFactorAuth: false,
    loginNotifications: true,
    maintenanceMode: false,
    autoBackup: true,
    errorLogging: true,
    sessionTimeout: '1 hour'
  })
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  useEffect(() => {
    // Load settings from API
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.settings) {
          setSettings(data.settings)
        }
      })
      .catch(err => console.error('Failed to load settings:', err))
  }, [])

  const updateSetting = async (key: string, value: any) => {
    setLoading({ ...loading, [key]: true })
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value })
      })
      
      const data = await response.json()
      if (data.success) {
        setSettings({ ...settings, [key]: value })
        alert('Setting updated successfully')
      } else {
        alert(data.error || 'Failed to update setting')
      }
    } catch (error) {
      console.error('Update setting error:', error)
      alert('Error updating setting')
    } finally {
      setLoading({ ...loading, [key]: false })
    }
  }

  const handleDangerousAction = async (action: 'deleteAll' | 'reset') => {
    const confirmMessage = action === 'deleteAll' 
      ? 'Are you sure you want to delete ALL data? This action CANNOT be undone!'
      : 'Are you sure you want to reset the platform? This will restore factory defaults!'
    
    if (!confirm(confirmMessage)) return
    
    const secondConfirm = prompt(`Type "${action.toUpperCase()}" to confirm:`)
    if (secondConfirm !== action.toUpperCase()) {
      alert('Action cancelled')
      return
    }

    try {
      const response = await fetch(`/api/admin/settings/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()
      if (data.success) {
        alert(`Platform ${action === 'deleteAll' ? 'data deleted' : 'reset'} successfully`)
        if (action === 'reset') {
          window.location.reload()
        }
      } else {
        alert(data.error || `Failed to ${action}`)
      }
    } catch (error) {
      console.error(`${action} error:`, error)
      alert(`Error performing ${action}`)
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Configure your admin panel preferences and system settings.</p>
      </motion.div>

      {/* Settings Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <SettingsForm />
      </motion.div>

      {/* Additional Settings Sections */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Security Settings */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                <p className="text-sm text-gray-600">Add an extra layer of security</p>
              </div>
              <button 
                onClick={() => updateSetting('twoFactorAuth', !settings.twoFactorAuth)}
                disabled={loading.twoFactorAuth}
                className={`px-4 py-2 rounded-xl transition-colors duration-200 text-sm ${
                  settings.twoFactorAuth 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } disabled:opacity-50`}
              >
                {loading.twoFactorAuth ? '...' : settings.twoFactorAuth ? 'Disable' : 'Enable'}
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Session Timeout</p>
                <p className="text-sm text-gray-600">Auto-logout after inactivity</p>
              </div>
              <select 
                value={settings.sessionTimeout}
                onChange={(e) => updateSetting('sessionTimeout', e.target.value)}
                disabled={loading.sessionTimeout}
                className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option>30 minutes</option>
                <option>1 hour</option>
                <option>4 hours</option>
                <option>8 hours</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Login Notifications</p>
                <p className="text-sm text-gray-600">Get notified of new logins</p>
              </div>
              <button 
                onClick={() => updateSetting('loginNotifications', !settings.loginNotifications)}
                disabled={loading.loginNotifications}
                className={`px-4 py-2 rounded-xl transition-colors duration-200 text-sm ${
                  settings.loginNotifications 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                } disabled:opacity-50`}
              >
                {loading.loginNotifications ? '...' : settings.loginNotifications ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Maintenance Mode</p>
                <p className="text-sm text-gray-600">Temporarily disable the platform</p>
              </div>
              <button 
                onClick={() => updateSetting('maintenanceMode', !settings.maintenanceMode)}
                disabled={loading.maintenanceMode}
                className={`px-4 py-2 rounded-xl transition-colors duration-200 text-sm ${
                  settings.maintenanceMode 
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                } disabled:opacity-50`}
              >
                {loading.maintenanceMode ? '...' : settings.maintenanceMode ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Auto-Backup</p>
                <p className="text-sm text-gray-600">Daily database backups</p>
              </div>
              <button 
                onClick={() => updateSetting('loginNotifications', !settings.loginNotifications)}
                disabled={loading.loginNotifications}
                className={`px-4 py-2 rounded-xl transition-colors duration-200 text-sm ${
                  settings.loginNotifications 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                } disabled:opacity-50`}
              >
                {loading.loginNotifications ? '...' : settings.loginNotifications ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Error Logging</p>
                <p className="text-sm text-gray-600">Detailed error tracking</p>
              </div>
              <button 
                onClick={() => updateSetting('loginNotifications', !settings.loginNotifications)}
                disabled={loading.loginNotifications}
                className={`px-4 py-2 rounded-xl transition-colors duration-200 text-sm ${
                  settings.loginNotifications 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                } disabled:opacity-50`}
              >
                {loading.loginNotifications ? '...' : settings.loginNotifications ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="bg-red-50 border border-red-200 rounded-2xl p-6"
      >
        <h3 className="text-lg font-semibold text-red-900 mb-4">Danger Zone</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-red-900">Delete All Data</p>
              <p className="text-sm text-red-700">Permanently remove all platform data</p>
            </div>
            <button 
              onClick={() => handleDangerousAction('deleteAll')}
              className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors duration-200 font-medium"
            >
              Delete All Data
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-red-900">Reset Platform</p>
              <p className="text-sm text-red-700">Reset to factory defaults</p>
            </div>
            <button 
              onClick={() => handleDangerousAction('reset')}
              className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors duration-200 font-medium"
            >
              Reset Platform
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

