import { CockpitNavigation } from '@/components/simcity-cockpit/CockpitNavigation'

export default function CockpitLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">SimCity Cockpit</h1>
          <p className="text-sm text-gray-600 mt-1">
            Interface de visualisation des décisions de promotion (Phase 8)
          </p>
        </div>
      </div>
      <CockpitNavigation />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}

