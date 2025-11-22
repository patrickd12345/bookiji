import { Metadata } from 'next'
import { NotificationSettings } from '@/components/settings/NotificationSettings'

export const metadata: Metadata = {
  title: 'Notification Settings | Bookiji',
  description: 'Manage your notification preferences',
}

export default function NotificationsPage() {
  return (
    <div className="container mx-auto py-10 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Notifications</h1>
        <p className="text-muted-foreground mt-2">
          Manage how you receive updates and alerts.
        </p>
      </div>
      <NotificationSettings />
    </div>
  )
}


