'use client'

import { useState, useEffect, useMemo } from 'react'
import { Clock, PlusCircle, Trash2, CheckCircle, XCircle, AlertTriangle, Download, Play } from 'lucide-react'
import { SubscriptionManager } from '@/components/SubscriptionManager'
import { supabaseBrowserClient } from '@/lib/supabaseClient'
import { GoogleCalendarConnection } from '@/components'
import { generateICS, downloadICS, type CalendarEvent } from '@/lib/utils/icsExport'
import { useTour } from '@/tours/TourProvider'
import { vendorScheduleTour } from '@/tours/vendorScheduleTour'

//
// Component to manage a single day's schedule
//
interface DayScheduleProps {
  day: string
  isEnabled: boolean
  timeRanges: { start: string; end: string }[]
  onToggle: () => void
  onTimeChange: (index: number, field: 'start' | 'end', value: string) => void
  onAddTimeRange: () => void
  onRemoveTimeRange: (index: number) => void
  errorMessage?: string | null
}

const DaySchedule = ({ 
  day, isEnabled, timeRanges, onToggle, onTimeChange, onAddTimeRange, onRemoveTimeRange, errorMessage
}: DayScheduleProps) => {
  return (
    <div className={`p-4 rounded-lg transition-colors ${isEnabled ? 'bg-white' : 'bg-gray-50'}`}>
      <div className="flex items-center justify-between">
        <label htmlFor={`toggle-${day}`} className="flex items-center cursor-pointer">
          <input
            id={`toggle-${day}`}
            type="checkbox"
            checked={isEnabled}
            onChange={onToggle}
            className="form-checkbox h-5 w-5 text-purple-600 rounded"
          />
          <span className={`ml-3 text-lg font-medium ${isEnabled ? 'text-gray-800' : 'text-gray-500'}`}>{day}</span>
        </label>
        {isEnabled && (
          <button onClick={onAddTimeRange} className="text-purple-500 hover:text-purple-700">
            <PlusCircle size={20} />
          </button>
        )}
      </div>
      {isEnabled && (
        <div className="mt-4 space-y-2 pl-8">
          {timeRanges.map((range, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="time"
                value={range.start}
                onChange={(e) => onTimeChange(index, 'start', e.target.value)}
                className="form-input w-full p-2 border rounded-md"
              />
              <span>-</span>
              <input
                type="time"
                value={range.end}
                onChange={(e) => onTimeChange(index, 'end', e.target.value)}
                className="form-input w-full p-2 border rounded-md"
              />
              <button onClick={() => onRemoveTimeRange(index)} className="text-red-500 hover:text-red-700">
                <Trash2 size={20} />
              </button>
            </div>
          ))}
          {errorMessage && (
            <div className="flex items-center text-sm text-red-600 mt-2">
              <AlertTriangle size={16} className="mr-2" />
              {errorMessage}
            </div>
          )}
        </div>
      )}
    </div>
  )
}


//
// Main Page Component
//
type Schedule = {
  [key: string]: {
    isEnabled: boolean
    timeRanges: { start: string; end: string }[]
  }
}

const initialSchedule: Schedule = {
  Sunday: { isEnabled: false, timeRanges: [] },
  Monday: { isEnabled: true, timeRanges: [{ start: '09:00', end: '17:00' }] },
  Tuesday: { isEnabled: true, timeRanges: [{ start: '09:00', end: '17:00' }] },
  Wednesday: { isEnabled: true, timeRanges: [{ start: '09:00', end: '17:00' }] },
  Thursday: { isEnabled: true, timeRanges: [{ start: '09:00', end: '17:00' }] },
  Friday: { isEnabled: true, timeRanges: [{ start: '09:00', end: '17:00' }] },
  Saturday: { isEnabled: false, timeRanges: [] },
}

const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

const checkForOverlaps = (timeRanges: { start: string; end: string }[]): boolean => {
    if (timeRanges.length <= 1) return false;

    const rangesInMinutes = timeRanges.map(r => ({
        start: timeToMinutes(r.start),
        end: timeToMinutes(r.end)
    }));
    
    // Also check for invalid ranges where start >= end
    for (const range of rangesInMinutes) {
        if (range.start >= range.end) return true;
    }

    // Sort by start time
    rangesInMinutes.sort((a, b) => a.start - b.start);

    for (let i = 0; i < rangesInMinutes.length - 1; i++) {
        // If the end time of the current range is after the start time of the next one, they overlap
        if (rangesInMinutes[i].end > rangesInMinutes[i + 1].start) {
            return true;
        }
    }

    return false;
};

export default function SchedulePage() {
  const { startTour } = useTour()
  const [schedule, setSchedule] = useState<Schedule>(initialSchedule)
  const [providerId, setProviderId] = useState<string | null>(null)
  const [availabilityMode, setAvailabilityMode] = useState<'subtractive' | 'additive'>('subtractive');
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [isSavingMode, setIsSavingMode] = useState<boolean>(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [modeStatus, setModeStatus] = useState<'success' | 'error' | null>(null)
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string | null }>({});
  const [urlMessage, setUrlMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState<boolean>(true);

  const hasErrors = useMemo(() => Object.values(errors).some(e => e !== null), [errors]);

  // Validate schedule whenever it changes
  useEffect(() => {
    const newErrors: { [key:string]: string | null } = {};
    for (const [day, daySchedule] of Object.entries(schedule)) {
      if (daySchedule.isEnabled && checkForOverlaps(daySchedule.timeRanges)) {
        newErrors[day] = 'Overlapping or invalid time slots.';
      } else {
        newErrors[day] = null;
      }
    }
    setErrors(newErrors);
  }, [schedule]);

  // Handle URL parameters for success/error messages
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const error = urlParams.get('error')
    
    if (success === 'calendar_connected') {
      setUrlMessage({ type: 'success', message: 'Google Calendar connected successfully!' })
    } else if (error) {
      const errorMessages = {
        'oauth_error': 'OAuth authorization failed',
        'no_code': 'No authorization code received',
        'profile_not_found': 'Provider profile not found',
        'storage_error': 'Failed to store calendar connection',
        'callback_error': 'Calendar connection failed'
      }
      setUrlMessage({ 
        type: 'error', 
        message: errorMessages[error as keyof typeof errorMessages] || 'An error occurred' 
      })
    }
    
    // Clear URL parameters
    if (success || error) {
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
      
      // Clear message after 5 seconds
      setTimeout(() => setUrlMessage(null), 5000)
    }
  }, [])

  // Fetch the provider's profile to get their ID and availability mode
  useEffect(() => {
    const fetchProviderProfile = async () => {
      setIsLoading(true);
      const supabase = supabaseBrowserClient()
      if (!supabase) {
        setSaveStatus('error');
        setIsLoading(false);
        return;
      }
      
      // Get the current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user?.email) {
        console.error('Error getting user session:', sessionError);
        setSaveStatus('error');
        setIsLoading(false);
        return;
      }

      // Get the provider profile using the session email
      const { data, error } = await supabase
        .from('profiles')
        .select('id, availability_mode')
        .eq('email', session.user.email)
        .single();

      if (error || !data) {
        console.error('Error fetching provider profile:', error);
        setSaveStatus('error');
        setIsLoading(false);
        return;
      }
      
      setProviderId(data.id);
      setAvailabilityMode(data.availability_mode || 'subtractive');
      
      // Check subscription status
      const { data: subscription, error: subError } = await supabase
        .from('vendor_subscriptions')
        .select('subscription_status')
        .eq('provider_id', data.id)
        .single();
      
      if (!subError && subscription) {
        const isActive = subscription.subscription_status === 'active' || subscription.subscription_status === 'trialing';
        setHasActiveSubscription(isActive);
      } else {
        setHasActiveSubscription(false);
      }
      
      setCheckingSubscription(false);
      setIsLoading(false);
    };

    fetchProviderProfile();
  }, []);

  const handleToggle = (day: string) => {
    setSchedule(prev => {
      const newDayState = { ...prev[day], isEnabled: !prev[day].isEnabled }
      // If we're enabling a day that has no time ranges, add a default one
      if (newDayState.isEnabled && newDayState.timeRanges.length === 0) {
        newDayState.timeRanges = [{ start: '09:00', end: '17:00' }]
      }
      return { ...prev, [day]: newDayState }
    })
  }

  const handleTimeChange = (day: string, index: number, field: 'start' | 'end', value: string) => {
    setSchedule(prev => {
      const newTimeRanges = [...prev[day].timeRanges]
      newTimeRanges[index] = { ...newTimeRanges[index], [field]: value }
      return { ...prev, [day]: { ...prev[day], timeRanges: newTimeRanges } }
    })
  }
  
  const handleAddTimeRange = (day: string) => {
    setSchedule(prev => {
      const newTimeRanges = [...prev[day].timeRanges, { start: '18:00', end: '21:00' }]
      return { ...prev, [day]: { ...prev[day], timeRanges: newTimeRanges } }
    })
  }

  const handleRemoveTimeRange = (day: string, index: number) => {
    setSchedule(prev => {
      const newTimeRanges = prev[day].timeRanges.filter((_, i) => i !== index)
      return { ...prev, [day]: { ...prev[day], timeRanges: newTimeRanges } }
    })
  }

  const handleAvailabilityModeChange = async (newMode: 'subtractive' | 'additive') => {
    if (!providerId) {
      alert('Could not determine the provider. Please refresh and try again.');
      return;
    }

    setIsSavingMode(true);
    setModeStatus(null);
    
    try {
      const response = await fetch('/api/vendor/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, availabilityMode: newMode }),
      });
      
      if (!response.ok) throw new Error('Failed to save availability mode');
      
      setAvailabilityMode(newMode);
      setModeStatus('success');
    } catch (error) {
      console.error('Error saving availability mode:', error);
      setModeStatus('error');
    } finally {
      setIsSavingMode(false);
      setTimeout(() => setModeStatus(null), 3000);
    }
  }

  const handleSaveAndGenerate = async () => {
    if (!providerId) {
        alert('Could not determine the provider. Please refresh and try again.');
        return;
    }
    if (hasErrors) {
        alert('Please fix the errors in your schedule before saving.');
        return;
    }

    // Step 1: Save the schedule
    setIsSaving(true);
    setSaveStatus('saving');
    let saveSuccess = false;
    try {
        const response = await fetch('/api/vendor/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ providerId, schedule }),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            if (errorData.requiresSubscription) {
                // Subscription required - update state and show message
                setHasActiveSubscription(false);
                alert(errorData.message || 'Active subscription required to manage your schedule.');
                setSaveStatus('error');
                return;
            }
            throw new Error(errorData.error || 'Failed to save schedule');
        }
        
        setSaveStatus('success');
        saveSuccess = true;
    } catch (error: unknown) {
        console.error('Error saving schedule:', error);
        setSaveStatus('error');
    } finally {
        setIsSaving(false);
        setTimeout(() => setSaveStatus('idle'), 3000);
    }

    if (!saveSuccess) return;

    // Step 2: Generate availability
    setIsGenerating(true);
    setGenerationStatus('Generating slots...');
    try {
        const response = await fetch('/api/availability/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ providerId }),
        });
        const result = await response.json();
        if (!response.ok) {
            if (result.requiresSubscription) {
                setHasActiveSubscription(false);
                throw new Error(result.message || 'Active subscription required to generate availability.');
            }
            throw new Error(result.error || 'Failed to generate availability');
        }
        setGenerationStatus(result.message);

    } catch (error: unknown) {
        console.error('Error generating availability:', error);
        setGenerationStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        setIsGenerating(false);
        setTimeout(() => setGenerationStatus(null), 5000);
    }
  }

  const handleExportICS = async () => {
    if (!providerId) {
      alert('Could not determine the provider. Please refresh and try again.')
      return
    }

    try {
      // Fetch availability slots from the database
      const supabase = supabaseBrowserClient()
      if (!supabase) {
        alert('Unable to connect to database')
        return
      }

      const { data: slots, error } = await supabase
        .from('availability_slots')
        .select('start_time, end_time, is_booked')
        .eq('provider_id', providerId)
        .gte('start_time', new Date().toISOString())
        .order('start_time')

      if (error) {
        console.error('Error fetching slots:', error)
        alert('Failed to fetch schedule data')
        return
      }

      if (!slots || slots.length === 0) {
        alert('No availability slots found to export')
        return
      }

      // Convert schedule to calendar events
      const events: CalendarEvent[] = slots
        .filter(slot => !slot.is_booked)
        .map((slot, index) => ({
          uid: `bookiji-slot-${providerId}-${index}-${Date.now()}`,
          summary: 'Available for Booking',
          description: 'Available time slot for service booking',
          start: new Date(slot.start_time),
          end: new Date(slot.end_time),
          allDay: false,
        }))

      // Generate ICS content
      const icsContent = generateICS(events, 'Bookiji Schedule')

      // Download the file
      const filename = `bookiji-schedule-${new Date().toISOString().split('T')[0]}.ics`
      downloadICS(icsContent, filename)
    } catch (error) {
      console.error('Error exporting ICS:', error)
      alert('Failed to export schedule')
    }
  }

  // Show subscription gate if no active subscription
  if (checkingSubscription || isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (hasActiveSubscription === false) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 shadow-md">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-yellow-900 mb-4">Subscription Required</h1>
              <p className="text-lg text-yellow-700 mb-6">
                You need an active subscription to manage your schedule and generate availability slots.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={async () => {
                    try {
                      const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
                      if (!priceId) {
                        alert('Configuration error: Missing Price ID');
                        return;
                      }
                      const res = await fetch('/api/billing/create-checkout-session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          priceId,
                          successUrl: window.location.href,
                          cancelUrl: window.location.href,
                        }),
                      });
                      if (!res.ok) throw new Error('Failed to create session');
                      const { url } = await res.json();
                      if (url) window.location.href = url;
                    } catch (err) {
                      console.error(err);
                      alert('Failed to start subscription process');
                    }
                  }}
                  className="bg-purple-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Subscribe Now
                </button>
                <button
                  onClick={() => window.location.href = '/vendor/dashboard'}
                  className="bg-gray-200 text-gray-700 font-bold py-3 px-8 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-8 rounded-xl shadow-md">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-purple-600 mr-3" />
              <h1 className="text-3xl font-bold text-gray-800">Set Your Weekly Hours</h1>
            </div>
            <button
              onClick={() => startTour(vendorScheduleTour)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              title="Start guided tour"
            >
              <Play size={16} />
              Take Tour
            </button>
          </div>

          {/* Subscription Status Banner */}
          <div className="mb-6">
            <SubscriptionManager />
          </div>

          {/* URL Message Display */}
          {urlMessage && (
            <div className={`mb-6 p-4 rounded-lg border ${
              urlMessage.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-700' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="flex items-center">
                {urlMessage.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 mr-2" />
                ) : (
                  <XCircle className="w-5 h-5 mr-2" />
                )}
                <span>{urlMessage.message}</span>
              </div>
            </div>
          )}

          {/* --- Availability Mode Toggle --- */}
          <div className="mb-8 p-4 border rounded-lg bg-gray-50" data-schedule-editor>
            <h2 className="font-bold text-lg mb-2">Availability Mode</h2>
            <div className="flex items-center space-x-4">
                <label className="flex items-center cursor-pointer">
                    <input 
                      type="radio" 
                      name="availabilityMode" 
                      value="subtractive" 
                      checked={availabilityMode === 'subtractive'} 
                      onChange={() => handleAvailabilityModeChange('subtractive')} 
                      disabled={isSavingMode}
                      className="form-radio h-5 w-5 text-purple-600"
                    />
                    <span className="ml-2 text-gray-700">Subtractive</span>
                </label>
                 <label className="flex items-center cursor-pointer">
                    <input 
                      type="radio" 
                      name="availabilityMode" 
                      value="additive" 
                      checked={availabilityMode === 'additive'} 
                      onChange={() => handleAvailabilityModeChange('additive')} 
                      disabled={isSavingMode}
                      className="form-radio h-5 w-5 text-purple-600"
                    />
                    <span className="ml-2 text-gray-700">Additive</span>
                </label>
                {isSavingMode && (
                  <span className="text-sm text-gray-500">Saving...</span>
                )}
                {modeStatus === 'success' && (
                  <div className="flex items-center text-green-600 text-sm">
                    <CheckCircle size={16} className="mr-1" />
                    <span>Saved!</span>
                  </div>
                )}
                {modeStatus === 'error' && (
                  <div className="flex items-center text-red-600 text-sm">
                    <XCircle size={16} className="mr-1" />
                    <span>Failed to save</span>
                  </div>
                )}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {availabilityMode === 'subtractive' 
                ? "Define your general working hours below. We'll subtract any busy events from your synced calendar." 
                : "Your calendar is blocked by default. Add specific 'available' time slots in your synced calendar to be bookable."}
            </p>
          </div>

          {/* Google Calendar Integration */}
          {providerId && (
            <div className="mb-8" data-google-calendar-connection>
              <GoogleCalendarConnection 
                profileId={providerId}
                onConnectionChange={(isConnected) => {
                  // Optionally handle connection state changes
                  console.log('Google Calendar connection status:', isConnected)
                }}
              />
            </div>
          )}

          {availabilityMode === 'subtractive' && (
            <>
              <p className="text-gray-600 mb-6">
                Define your standard weekly availability here. We will automatically sync with your connected Google Calendar to block out any existing events.
              </p>

              <div className="space-y-4">
                {Object.entries(schedule).map(([day, daySchedule]) => (
                  <DaySchedule
                    key={day}
                    day={day}
                    isEnabled={daySchedule.isEnabled}
                    timeRanges={daySchedule.timeRanges}
                    onToggle={() => handleToggle(day)}
                    onTimeChange={(index, field, value) => handleTimeChange(day, index, field, value)}
                    onAddTimeRange={() => handleAddTimeRange(day)}
                    onRemoveTimeRange={(index) => handleRemoveTimeRange(day, index)}
                    errorMessage={errors[day]}
                  />
                ))}
              </div>
            </>
          )}

          <div className="mt-8 flex flex-col items-end gap-4">
             <div className="h-6">
                {generationStatus && (
                    <p className="text-sm text-gray-600">{generationStatus}</p>
                )}
             </div>
            <div className="flex items-center gap-4">
                {saveStatus === 'success' && (
                    <div className="flex items-center text-green-600">
                        <CheckCircle size={20} className="mr-2" />
                        <span>Schedule saved!</span>
                    </div>
                )}
                 {saveStatus === 'error' && (
                    <div className="flex items-center text-red-600">
                        <XCircle size={20} className="mr-2" />
                        <span>Failed to save.</span>
                    </div>
                )}
                <button
                  onClick={handleExportICS}
                  disabled={isLoading || !providerId}
                  className="bg-gray-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  title="Export schedule as ICS calendar file"
                >
                  <Download size={18} />
                  Export ICS
                </button>
                <button
                  onClick={handleSaveAndGenerate}
                  disabled={isSaving || isLoading || !providerId || hasErrors || isGenerating}
                  className="bg-purple-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : (isGenerating ? 'Generating...' : 'Save & Regenerate Availability')}
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 