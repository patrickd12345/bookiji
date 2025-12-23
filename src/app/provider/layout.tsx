'use client'

import { ProviderNavigation } from '@/components/provider/ProviderNavigation'

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <ProviderNavigation />
      <div className="container mx-auto px-4 py-6">
        {children}
      </div>
    </div>
  )
}

