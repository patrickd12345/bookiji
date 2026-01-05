import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { VendorFormData } from '../types'
import GoogleCalendarConnection from '@/components/GoogleCalendarConnection'
import { CheckCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  data: VendorFormData
  onChange: (updates: Partial<VendorFormData>) => void
  profileId: string | null
}

export function AvailabilityMethodStep({ data, onChange, profileId }: Props) {
  const isCalendar = data.availability_method === 'calendar'
  const isBasic = data.availability_method === 'basic'

  const handleCalendarConnection = (isConnected: boolean) => {
    if (isConnected) {
      onChange({ availability_method: 'calendar' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Set Up Your Availability</h2>
        <p className="text-gray-600">Bookiji works best when it reflects your real calendar.</p>
      </div>

      {/* Primary Option: Calendar Integration */}
      <Card className={cn(
        "border-2 transition-all duration-200",
        isCalendar ? "border-blue-500 shadow-md ring-1 ring-blue-500" : "border-gray-200"
      )}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-blue-700">Connect your calendar (recommended)</CardTitle>
              <CardDescription>
                Sync with Google Calendar or Outlook for automatic availability, conflict detection, and real-time updates.
              </CardDescription>
            </div>
            {isCalendar && <CheckCircle className="h-6 w-6 text-blue-500" />}
          </div>
        </CardHeader>
        <CardContent>
          {profileId ? (
            <GoogleCalendarConnection
              profileId={profileId}
              onConnectionChange={handleCalendarConnection}
            />
          ) : (
            <div className="p-4 bg-gray-50 text-gray-500 text-center rounded">
              Loading calendar configuration...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Secondary Option: Basic Availability */}
      <Card
        className={cn(
          "border-2 cursor-pointer hover:border-gray-300 transition-all duration-200",
          isBasic ? "border-gray-500 shadow-md ring-1 ring-gray-500" : "border-gray-200"
        )}
        onClick={() => onChange({ availability_method: 'basic' })}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-gray-700">Start with basic availability (temporary, limited)</CardTitle>
              <CardDescription className="text-amber-700 font-medium">
                Expires after first successful booking. Graduation to calendar integration is required to continue.
              </CardDescription>
            </div>
            {isBasic && <CheckCircle className="h-6 w-6 text-gray-500" />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Basic availability is disposable, expires after your first booking, has no editing loop, and requires graduation to calendar integration to continue.
            </p>

            {/*
              Basic availability (subtractive mode) is intentionally positioned as a second-class fallback.
              It exists only to prevent bounce and enable a first try. The fallback is temporary, limited,
              and expires after the first booking. Bookiji exits after booking handoff; no disputes, no
              post-booking involvement. Calendar integration (additive mode) is the primary, preferred path
              because Bookiji works best when it reflects the provider's real calendar.
            */}

            <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-md text-xs text-gray-500">
               <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
               <p>
                 This option does not support editing loops or disputes.
                 Bookiji exits after booking handoff.
               </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
