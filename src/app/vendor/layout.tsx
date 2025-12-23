'use client'

import { VendorNavigation } from '@/components/vendor/VendorNavigation'

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <VendorNavigation />
      <div className="container mx-auto px-4 py-6">
        {children}
      </div>
    </div>
  )
}

