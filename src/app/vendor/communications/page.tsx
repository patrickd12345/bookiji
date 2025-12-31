'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MessageSquare, Send, FileText } from 'lucide-react'

interface CommunicationTemplate {
  id: string
  name: string
  type: 'booking_confirmation' | 'booking_reminder' | 'booking_cancellation' | 'follow_up'
  subject: string
  body: string
}

const defaultTemplates: CommunicationTemplate[] = [
  {
    id: 'booking_confirmation',
    name: 'Booking Confirmation',
    type: 'booking_confirmation',
    subject: 'Your booking is confirmed',
    body: 'Hi {{customer_name}},\n\nYour booking for {{service_name}} on {{booking_date}} at {{booking_time}} is confirmed.\n\nWe look forward to seeing you!\n\nBest regards,\n{{business_name}}'
  },
  {
    id: 'booking_reminder',
    name: 'Booking Reminder',
    type: 'booking_reminder',
    subject: 'Reminder: Your appointment tomorrow',
    body: 'Hi {{customer_name}},\n\nThis is a reminder that you have an appointment for {{service_name}} tomorrow at {{booking_time}}.\n\nSee you soon!\n\n{{business_name}}'
  },
  {
    id: 'booking_cancellation',
    name: 'Booking Cancellation',
    type: 'booking_cancellation',
    subject: 'Your booking has been cancelled',
    body: 'Hi {{customer_name}},\n\nUnfortunately, your booking for {{service_name}} on {{booking_date}} has been cancelled.\n\n{{cancellation_reason}}\n\nPlease contact us if you have any questions.\n\n{{business_name}}'
  },
  {
    id: 'follow_up',
    name: 'Follow Up',
    type: 'follow_up',
    subject: 'How was your experience?',
    body: 'Hi {{customer_name}},\n\nThank you for choosing {{business_name}}!\n\nWe hope you had a great experience. We would love to hear your feedback.\n\n{{business_name}}'
  }
]

export default function VendorCommunicationsPage() {
  const [templates, setTemplates] = useState<CommunicationTemplate[]>(defaultTemplates)
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(null)
  const [saving, setSaving] = useState(false)

  const handleTemplateSelect = (template: CommunicationTemplate) => {
    setSelectedTemplate(template)
  }

  const handleTemplateUpdate = (field: 'subject' | 'body', value: string) => {
    if (!selectedTemplate) return
    setSelectedTemplate({ ...selectedTemplate, [field]: value })
    setTemplates(templates.map(t => 
      t.id === selectedTemplate.id ? { ...t, [field]: value } : t
    ))
  }

  const handleSave = async () => {
    setSaving(true)
    // TODO: Save templates to database
    setTimeout(() => {
      setSaving(false)
      alert('Templates saved successfully!')
    }, 500)
  }

  return (
    <div className="container mx-auto py-4 sm:py-8 max-w-6xl px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Communications</h1>
        <p className="text-gray-600 mt-1">Manage your customer communication templates</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <Card>
          <CardHeader>
            <CardTitle>Message Templates</CardTitle>
            <CardDescription>Select a template to edit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedTemplate?.id === template.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">{template.name}</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Template Editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedTemplate ? `Edit: ${selectedTemplate.name}` : 'Select a template to edit'}
            </CardTitle>
            <CardDescription>
              Use variables like {'{{customer_name}}'}, {'{{service_name}}'}, {'{{booking_date}}'}, etc.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedTemplate ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={selectedTemplate.subject}
                    onChange={(e) => handleTemplateUpdate('subject', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="body">Message Body</Label>
                  <textarea
                    id="body"
                    className="w-full min-h-[300px] px-3 py-2 border rounded-md font-mono text-sm"
                    value={selectedTemplate.body}
                    onChange={(e) => handleTemplateUpdate('body', e.target.value)}
                  />
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-semibold mb-2">Available Variables:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li><code>{'{{customer_name}}'}</code> - Customer&apos;s full name</li>
                    <li><code>{'{{service_name}}'}</code> - Service name</li>
                    <li><code>{'{{booking_date}}'}</code> - Booking date</li>
                    <li><code>{'{{booking_time}}'}</code> - Booking time</li>
                    <li><code>{'{{business_name}}'}</code> - Your business name</li>
                    <li><code>{'{{cancellation_reason}}'}</code> - Cancellation reason (if applicable)</li>
                  </ul>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? 'Saving...' : 'Save Template'}
                </Button>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Select a template from the list to start editing</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Automated Communications Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Automated Communications</CardTitle>
          <CardDescription>These messages are sent automatically based on booking events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Send className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium">Booking Confirmations</p>
                <p className="text-sm text-gray-600">
                  Sent automatically when a booking is confirmed. Uses the &quot;Booking Confirmation&quot; template.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Send className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium">Booking Reminders</p>
                <p className="text-sm text-gray-600">
                  Sent 24 hours before the appointment. Uses the &quot;Booking Reminder&quot; template.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Send className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium">Follow-up Messages</p>
                <p className="text-sm text-gray-600">
                  Sent 24 hours after completed bookings. Uses the &quot;Follow Up&quot; template.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
