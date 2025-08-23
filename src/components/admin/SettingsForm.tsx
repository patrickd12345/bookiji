'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Save, CheckCircle, AlertCircle } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { AnimatePresence } from 'framer-motion'

interface SettingsFormProps {
  initialSettings?: {
    darkMode: boolean
    email: string
    notifications: boolean
    language: string
  }
}

export default function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [settings, setSettings] = useState({
    darkMode: initialSettings?.darkMode ?? false,
    email: initialSettings?.email ?? 'admin@bookiji.com',
    notifications: initialSettings?.notifications ?? true,
    language: initialSettings?.language ?? 'en'
  })

  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus('idle')
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Simulate success
      setSaveStatus('success')
      
      // Reset status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut"
      }
    })
  }

  return (
    <motion.div
      variants={formVariants}
      initial="hidden"
      animate="visible"
      className="max-w-2xl mx-auto"
    >
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Admin Settings</h3>
          <p className="text-sm text-gray-600">Configure your admin panel preferences and notifications</p>
        </div>

        <div className="space-y-6">
          {/* Dark Mode Toggle */}
          <motion.div
            custom={0}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl"
          >
            <div>
              <Label htmlFor="darkMode" className="text-sm font-medium text-gray-900">
                Dark Mode
              </Label>
              <p className="text-xs text-gray-600 mt-1">Switch between light and dark themes</p>
            </div>
            <Switch
              id="darkMode"
              checked={settings.darkMode}
              onCheckedChange={(checked) => handleSettingChange('darkMode', checked)}
            />
          </motion.div>

          {/* Email Settings */}
          <motion.div
            custom={1}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            <Label htmlFor="email" className="text-sm font-medium text-gray-900">
              Admin Email
            </Label>
            <Input
              id="email"
              type="email"
              value={settings.email}
              onChange={(e) => handleSettingChange('email', e.target.value)}
              placeholder="admin@bookiji.com"
              className="rounded-2xl"
            />
            <p className="text-xs text-gray-600">This email will receive all admin notifications</p>
          </motion.div>

          {/* Notifications Toggle */}
          <motion.div
            custom={2}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl"
          >
            <div>
              <Label htmlFor="notifications" className="text-sm font-medium text-gray-900">
                Email Notifications
              </Label>
              <p className="text-xs text-gray-600 mt-1">Receive email alerts for important events</p>
            </div>
            <Switch
              id="notifications"
              checked={settings.notifications}
              onCheckedChange={(checked) => handleSettingChange('notifications', checked)}
            />
          </motion.div>

          {/* Language Selection */}
          <motion.div
            custom={3}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            <Label htmlFor="language" className="text-sm font-medium text-gray-900">
              Language
            </Label>
            <select
              id="language"
              value={settings.language}
              onChange={(e) => handleSettingChange('language', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
            </select>
            <p className="text-xs text-gray-600">Select your preferred language for the admin interface</p>
          </motion.div>

          {/* Save Button */}
          <motion.div
            custom={4}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="pt-4 border-t border-gray-200"
          >
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-2xl py-3 font-medium transition-all duration-200 disabled:opacity-50"
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save size={18} />
                  Save Settings
                </div>
              )}
            </Button>

            {/* Status Messages */}
            <AnimatePresence>
              {saveStatus === 'success' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-3 flex items-center gap-2 text-green-600 text-sm"
                >
                  <CheckCircle size={16} />
                  Settings saved successfully!
                </motion.div>
              )}
              
              {saveStatus === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-3 flex items-center gap-2 text-red-600 text-sm"
                >
                  <AlertCircle size={16} />
                  Failed to save settings. Please try again.
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}







