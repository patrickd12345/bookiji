import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { VendorFormData } from '../types'

type Props = {
  data: VendorFormData
  onChange: (updates: Partial<VendorFormData>) => void
}

export function BusinessInfoStep({ data, onChange }: Props) {
  function set<K extends keyof VendorFormData>(k: K, v: VendorFormData[K]) {
    onChange({ [k]: v })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="business_name" className="block text-sm font-medium mb-2">Business Name *</label>
            <input
              id="business_name"
              name="business_name"
              className="border p-3 w-full rounded-lg"
              placeholder="Your business name"
              value={data.business_name}
              onChange={e=>set('business_name', e.target.value)}
              required
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="contact_name" className="block text-sm font-medium mb-2">Contact Name *</label>
            <input
              id="contact_name"
              name="contact_name"
              className="border p-3 w-full rounded-lg"
              placeholder="Your full name"
              value={data.contact_name}
              onChange={e=>set('contact_name', e.target.value)}
              required
              aria-required="true"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-2">Phone</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              className="border p-3 w-full rounded-lg"
              placeholder="Phone number"
              value={data.phone}
              onChange={e=>set('phone', e.target.value)}
              aria-label="Phone number"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">Email *</label>
            <input
              id="email"
              name="email"
              className="border p-3 w-full rounded-lg"
              type="email"
              placeholder="Email address"
              value={data.email}
              onChange={e=>set('email', e.target.value)}
              required
              aria-required="true"
            />
          </div>
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium mb-2">Business Address</label>
          <input
            id="address"
            name="address"
            className="border p-3 w-full rounded-lg"
            placeholder="Business address"
            value={data.address}
            onChange={e=>set('address', e.target.value)}
            aria-label="Business address"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-2">Business Description</label>
          <textarea
            id="description"
            name="description"
            className="border p-3 w-full rounded-lg"
            placeholder="Describe your business and services..."
            rows={3}
            value={data.description}
            onChange={e=>set('description', e.target.value)}
            aria-label="Business description"
          />
        </div>
      </CardContent>
    </Card>
  )
}
