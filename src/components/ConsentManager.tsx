import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Add type declarations for window properties
declare global {
  interface Window {
    'ga-disable-UA-XXXXX-Y': boolean
  }
}

interface ConsentSettings {
  essential: boolean // Always true, can't be disabled
  analytics: boolean
  advertising: boolean
  preferences: boolean
  location: boolean
}

export function ConsentManager() {
  const router = useRouter()
  const [showBanner, setShowBanner] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [settings, setSettings] = useState<ConsentSettings>({
    essential: true,
    analytics: false,
    advertising: false,
    preferences: false,
    location: false
  })

  useEffect(() => {
    // Check if we have stored consent
    const storedConsent = localStorage.getItem('cookieConsent')
    if (!storedConsent) {
      setShowBanner(true)
    } else {
      setSettings(JSON.parse(storedConsent))
    }
  }, [])

  const saveConsent = (settings: ConsentSettings) => {
    localStorage.setItem('cookieConsent', JSON.stringify(settings))
    setShowBanner(false)
    setShowPreferences(false)
    
    // Apply settings
    if (!settings.advertising) {
      // Set cookie for non-personalized ads
      document.cookie = 'personalized_ads=0; path=/; max-age=31536000'
    } else {
      document.cookie = 'personalized_ads=1; path=/; max-age=31536000'
    }
    
    if (!settings.analytics) {
      // Disable analytics tracking
      window['ga-disable-UA-XXXXX-Y'] = true
    }
  }

  const acceptAll = () => {
    const allEnabled = {
      ...settings,
      analytics: true,
      advertising: true,
      preferences: true
    }
    saveConsent(allEnabled)
  }

  const acceptEssential = () => {
    saveConsent(settings)
  }

  if (!showBanner && !showPreferences) return null

  if (showPreferences) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg max-w-lg w-full">
          <h2 className="text-xl font-bold mb-4">Cookie Preferences</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Essential Cookies</h3>
                <p className="text-sm text-gray-600">Required for basic functionality</p>
              </div>
              <input type="checkbox" checked disabled />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Analytics Cookies</h3>
                <p className="text-sm text-gray-600">Help us improve our service</p>
              </div>
              <input
                type="checkbox"
                checked={settings.analytics}
                onChange={(e) => setSettings({ ...settings, analytics: e.target.checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Advertising Cookies</h3>
                <p className="text-sm text-gray-600">Personalized ads by Google AdSense</p>
              </div>
              <input
                type="checkbox"
                checked={settings.advertising}
                onChange={(e) => setSettings({ ...settings, advertising: e.target.checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Preference Cookies</h3>
                <p className="text-sm text-gray-600">Remember your settings</p>
              </div>
              <input
                type="checkbox"
                checked={settings.preferences}
                onChange={(e) => setSettings({ ...settings, preferences: e.target.checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Location Access</h3>
                <p className="text-sm text-gray-600">For booking suggestions</p>
              </div>
              <input
                type="checkbox"
                checked={settings.location}
                onChange={(e) => setSettings({ ...settings, location: e.target.checked })}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-4">
            <button
              onClick={() => setShowPreferences(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={() => saveConsent(settings)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg z-50">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between">
        <div className="mb-4 md:mb-0">
          <p className="text-sm">
            We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.
            <button
              onClick={() => router.push('/privacy')}
              className="text-blue-600 hover:underline ml-1"
            >
              Learn more
            </button>
          </p>
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={() => setShowPreferences(true)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Preferences
          </button>
          <button
            onClick={acceptEssential}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Essential Only
          </button>
          <button
            onClick={acceptAll}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  )
} 