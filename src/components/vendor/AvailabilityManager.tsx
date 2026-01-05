'use client'

import { useState } from 'react'
import { Plus, Trash2, Calendar, AlertTriangle, X } from 'lucide-react'

interface AvailabilityManagerProps {
  providerId: string
  availabilityMode: 'subtractive' | 'additive'
  onUpdate: () => void
}

export default function AvailabilityManager({ providerId, availabilityMode, onUpdate }: AvailabilityManagerProps) {
  const [activeTab, setActiveTab] = useState<'block' | 'exceptions'>('block')
  const [isAdding, setIsAdding] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [date, setDate] = useState('')
  const [recurrence, setRecurrence] = useState<'none' | 'weekly'>('none')
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<any[]>([])

  const resetForm = () => {
    setStartTime('')
    setEndTime('')
    setDate('')
    setRecurrence('none')
    setSelectedDays([])
    setError(null)
    setConflicts([])
    setIsAdding(false)
  }

  const handleAdd = async () => {
    setError(null)
    setConflicts([])

    if (!startTime || !endTime || (recurrence === 'none' && !date)) {
        setError('Please fill in all required fields.')
        return
    }

    const startDateTime = recurrence === 'none' ? `${date}T${startTime}:00Z` : `1970-01-01T${startTime}:00Z` // Mock date for recurring
    const endDateTime = recurrence === 'none' ? `${date}T${endTime}:00Z` : `1970-01-01T${endTime}:00Z`

    // Determine slot type based on mode and tab
    // If Subtractive: "Block Time" -> slot_type: 'blocked'
    // If Additive: "Add Availability" -> slot_type: 'available'
    // But user might want to block specific times in Additive too?
    // Simplify: Tab 'block' -> 'blocked', Tab 'exceptions' -> 'available' (if override)

    // For this specific task (Block Time API F-012), we focus on blocking
    const slotType = activeTab === 'block' ? 'blocked' : 'available'

    // 1. Check Conflicts (if singular)
    if (recurrence === 'none') {
        const checkRes = await fetch(`/api/vendor/availability/conflicts?providerId=${providerId}&startTime=${startDateTime}&endTime=${endDateTime}`)
        const checkData = await checkRes.json()
        if (checkData.hasConflicts) {
            setConflicts(checkData.conflicts)
            setError('This slot conflicts with existing slots.')
            return
        }
    }

    // 2. Create
    let endpoint = '/api/vendor/availability/slots'
    let payload: any = {
        providerId,
        startTime: startDateTime,
        endTime: endDateTime,
        slotType
    }

    if (recurrence === 'weekly') {
        endpoint = '/api/vendor/availability/rules'
        payload = {
            providerId,
            startTime: `2024-01-01T${startTime}:00Z`, // Arbitrary date, time matters
            endTime: `2024-01-01T${endTime}:00Z`,
            recurrenceRule: { freq: 'WEEKLY', days: selectedDays },
            slotType
        }
    }

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        const data = await res.json()

        if (!res.ok) {
            throw new Error(data.error || 'Failed to save')
        }

        setSuccess('Saved successfully!')
        setTimeout(() => setSuccess(null), 3000)
        resetForm()
        onUpdate()

    } catch (e: any) {
        setError(e.message)
    }
  }

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
        setSelectedDays(selectedDays.filter(d => d !== day))
    } else {
        setSelectedDays([...selectedDays, day])
    }
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mt-8">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Availability Management</h2>

      <div className="flex space-x-4 border-b mb-6">
        <button
            className={`pb-2 px-4 ${activeTab === 'block' ? 'border-b-2 border-purple-600 font-medium text-purple-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('block')}
        >
            Block Time
        </button>
        {/* Future: Exceptions tab */}
      </div>

      {!isAdding ? (
        <button
            onClick={() => setIsAdding(true)}
            className="flex items-center text-purple-600 hover:text-purple-700 font-medium"
        >
            <Plus size={20} className="mr-2" />
            Add Blocked Time
        </button>
      ) : (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-gray-700">Add New Block</h3>
                <button onClick={resetForm}><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recurrence</label>
                    <select
                        value={recurrence}
                        onChange={(e) => setRecurrence(e.target.value as any)}
                        className="w-full p-2 border rounded-md"
                    >
                        <option value="none">One-time</option>
                        <option value="weekly">Weekly</option>
                    </select>
                </div>

                {recurrence === 'none' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full p-2 border rounded-md"
                        />
                    </div>
                )}
            </div>

            {recurrence === 'weekly' && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Days</label>
                    <div className="flex gap-2">
                        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                            <button
                                key={day}
                                onClick={() => toggleDay(day)}
                                className={`px-3 py-1 rounded-full text-sm ${selectedDays.includes(day) ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full p-2 border rounded-md"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full p-2 border rounded-md"
                    />
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-md flex items-start text-sm">
                    <AlertTriangle size={16} className="mr-2 mt-0.5" />
                    <div>
                        <p className="font-medium">{error}</p>
                        {conflicts.length > 0 && (
                            <ul className="mt-1 list-disc list-inside">
                                {conflicts.map((c: any) => (
                                    <li key={c.id}>Conflict: {new Date(c.start_time).toLocaleTimeString()} - {new Date(c.end_time).toLocaleTimeString()}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {success && (
                <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm">
                    {success}
                </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
                <button
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                    Cancel
                </button>
                <button
                    onClick={handleAdd}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                    Save Block
                </button>
            </div>
        </div>
      )}
    </div>
  )
}
