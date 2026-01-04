import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { VendorFormData } from '../types'

type Props = {
  data: VendorFormData
  onChange: (updates: Partial<VendorFormData>) => void
}

export function HoursStep({ data, onChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Hours</CardTitle>
        <p className="text-sm text-gray-600">Set your operating hours for each day</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(data.hours).map(([day, hours]) => (
            <div key={day} className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`open-${day}`}
                  checked={hours.open}
                  onChange={(e) => onChange({
                    hours: {
                      ...data.hours,
                      [day]: { ...hours, open: e.target.checked }
                    }
                  })}
                  className="rounded"
                />
                <label htmlFor={`open-${day}`} className="text-sm font-medium capitalize">
                  {day === 'mon' ? 'Monday' :
                   day === 'tue' ? 'Tuesday' :
                   day === 'wed' ? 'Wednesday' :
                   day === 'thu' ? 'Thursday' :
                   day === 'fri' ? 'Friday' :
                   day === 'sat' ? 'Saturday' : 'Sunday'}
                </label>
              </div>

              {hours.open && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor={`start-${day}`} className="sr-only">Start time for {day}</label>
                    <input
                      id={`start-${day}`}
                      type="time"
                      value={hours.start_time}
                      onChange={(e) => onChange({
                        hours: {
                          ...data.hours,
                          [day]: { ...hours, start_time: e.target.value }
                        }
                      })}
                      className="border p-2 rounded text-sm w-full"
                      aria-label={`Start time for ${day}`}
                    />
                  </div>
                  <div>
                    <label htmlFor={`end-${day}`} className="sr-only">End time for {day}</label>
                    <input
                      id={`end-${day}`}
                      type="time"
                      value={hours.end_time}
                      onChange={(e) => onChange({
                        hours: {
                          ...data.hours,
                          [day]: { ...hours, end_time: e.target.value }
                        }
                      })}
                      className="border p-2 rounded text-sm w-full"
                      aria-label={`End time for ${day}`}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
