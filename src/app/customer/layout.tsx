'use client'

import { CustomerNavigation } from '@/components/customer/CustomerNavigation'

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNavigation />
      <div className="container mx-auto px-4 py-6">
        {children}
      </div>
    </div>
  )
}

