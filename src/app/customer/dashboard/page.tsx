import dynamic from 'next/dynamic'
import { SimpleThemeToggle } from '@/components/SimpleThemeToggle'
import Link from 'next/link'

// GuidedTourManager is a client component; dynamic import keeps the server bundle lean
const GuidedTourManager = dynamic(() => import('../../../components/GuidedTourManager'))

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div data-tour="welcome-section">
              <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
              <p className="text-gray-600">Manage your bookings and account</p>
            </div>
            <div className="flex items-center space-x-4">
              <SimpleThemeToggle />
              <GuidedTourManager type="customer" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming Bookings */}
            <div className="bg-white rounded-lg shadow-sm p-6" data-tour="upcoming-bookings">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Bookings</h2>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">Haircut & Styling</h3>
                      <p className="text-sm text-gray-600">Tomorrow at 2:00 PM</p>
                      <p className="text-sm text-gray-600">Sarah&apos;s Salon</p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Confirmed</span>
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">Massage Therapy</h3>
                      <p className="text-sm text-gray-600">Friday at 10:00 AM</p>
                      <p className="text-sm text-gray-600">Wellness Center</p>
                    </div>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Pending</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Past Bookings */}
            <div className="bg-white rounded-lg shadow-sm p-6" data-tour="past-bookings">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Bookings</h2>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">Dental Cleaning</h3>
                      <p className="text-sm text-gray-600">Last week</p>
                      <p className="text-sm text-gray-600">Dr. Smith Dental</p>
                    </div>
                    <div className="text-right">
                      <div className="flex text-yellow-400 text-sm">
                        ★★★★★
                      </div>
                      <button className="text-blue-600 text-sm hover:underline">Leave Review</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Settings */}
            <div className="bg-white rounded-lg shadow-sm p-6" data-tour="profile-settings">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Settings</h2>
              <div className="space-y-3">
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded">
                  Edit Profile
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded">
                  Notification Preferences
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded">
                  Privacy Settings
                </button>
              </div>
            </div>

            {/* Credits Section */}
            <div className="bg-white rounded-lg shadow-sm p-6" data-tour="credits-section">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Credits</h2>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-2">$25.00</div>
                <p className="text-sm text-gray-600 mb-4">Available Balance</p>
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                  Purchase Credits
                </button>
              </div>
            </div>

            {/* Support Access */}
            <div className="bg-white rounded-lg shadow-sm p-6" data-tour="support-access">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Support</h2>
              <div className="space-y-3">
                <Link href="/help/tickets" className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded">
                  Contact Support
                </Link>
                <Link href="/faq" className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded">
                  FAQ
                </Link>
                <Link href="/help" className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded">
                  Help Center
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Customer Dashboard - Bookiji',
  description: 'Manage your bookings, credits, and profile on Bookiji',
} 