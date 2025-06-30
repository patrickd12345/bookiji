import UserDashboard from '../../components/UserDashboard'
import { GuidedTourManager } from '../../components'

export default function CustomerDashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <UserDashboard />
      <GuidedTourManager type="customer" />
    </div>
  )
}

export const metadata = {
  title: 'Customer Dashboard - Bookiji',
  description: 'Manage your bookings, credits, and profile on Bookiji',
} 