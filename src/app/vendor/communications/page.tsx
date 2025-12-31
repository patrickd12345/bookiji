'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MessageSquare, Send, Mail } from 'lucide-react'

interface CommunicationTemplate {
  id: string
  name: string
  subject: string
  body: string
  type: 'booking_confirmation' | 'booking_reminder' | 'booking_cancellation' | 'custom'
}

const defaultTemplates: CommunicationTemplate[] = [
  {
    id: 'booking_confirmation',
    name: 'Booking Confirmation',
    subject: 'Your booking is confirmed',
    body: 'Hi {{customer_name}},\n\nYour booking for {{service_name}} on {{booking_date}} at {{booking_time}} is confirmed.\n\nWe look forward to seeing you!\n\nBest regards,\n{{business_name}}',
    type: 'booking_confirmation'
  },
  {
    id: 'booking_reminder',
    name: 'Booking Reminder',
    subject: 'Reminder: Your booking tomorrow',
    body: 'Hi {{customer_name}},\n\nThis is a reminder that you have a booking for {{service_name}} tomorrow at {{booking_time}}.\n\nSee you soon!\n\n{{business_name}}',
    type: 'booking_reminder'
  },
  {
    id: 'booking_cancellation',
    name: 'Booking Cancellation',
    subject: 'Booking cancelled',
    body: 'Hi {{customer_name}},\n\nYour booking for {{service_name}} on {{booking_date}} has been cancelled.\n\nIf you have any questions, please contact us.\n\n{{business_name}}',
    type: 'booking_cancellation'
  }
]

export default function VendorCommunicationsPage() {
  const [templates, setTemplates] = useState<CommunicationTemplate[]>(defaultTemplates)
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(null)
  const [customMessage, setCustomMessage] = useState('')

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Communications</h1>
        <p className="text-gray-600 mt-1">Manage customer communications and message templates</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Message Templates
            </CardTitle>
            <CardDescription>
              Pre-built templates for common communications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedTemplate?.id === template.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedTemplate(template)}
              >
                <h3 className="font-semibold text-gray-900">{template.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{template.subject}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Template Editor */}
        <Card>
          <CardHeader>
            <CardTitle>Template Preview</CardTitle>
            <CardDescription>
              {selectedTemplate ? 'Edit and customize the template' : 'Select a template to edit'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTemplate ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={selectedTemplate.subject}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, subject: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body">Message Body</Label>
                  <textarea
                    id="body"
                    className="w-full min-h-[200px] px-3 py-2 border rounded-md"
                    value={selectedTemplate.body}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, body: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">
                    Available variables: {`{{customer_name}}, {{service_name}}, {{booking_date}}, {{booking_time}}, {{business_name}}`}
                  </p>
                </div>
                <Button className="w-full">
                  <Send className="mr-2 h-4 w-4" />
                  Save Template
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Mail className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Select a template to edit</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Custom Message */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Send Custom Message</CardTitle>
          <CardDescription>
            Send a one-time message to a customer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer">Customer</Label>
            <Input id="customer" placeholder="Select customer..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom_message">Message</Label>
            <textarea
              id="custom_message"
              className="w-full min-h-[150px] px-3 py-2 border rounded-md"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Type your message..."
            />
          </div>
          <Button className="w-full" disabled={!customMessage}>
            <Send className="mr-2 h-4 w-4" />
            Send Message
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
