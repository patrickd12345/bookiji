'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { registerTour } from '@/lib/guidedTourRegistry'
import { useAutoTour } from '@/lib/useAutoTour'

interface FunnelRow { step_name: string; count: number }
interface ApiMetric { label: string; value: number }

export default function AnalyticsDashboard() {
  const [funnel, setFunnel] = useState<FunnelRow[]>([])
  const [apiMetrics, setApiMetrics] = useState<ApiMetric[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/analytics/funnel?funnel=booking')
        const data = await res.json()
        if (data.ok) setFunnel(data.data)

        const sys = await fetch('/api/analytics/system')
        if (sys.ok) {
          const d = await sys.json()
          setApiMetrics(d.data)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    registerTour({
      id: 'admin-analytics',
      route: '/admin/analytics',
      title: 'Analytics Dashboard',
      steps: [
        { target: '[data-tour="funnel-chart"]', content: 'This bar chart shows your booking conversion funnel.' },
        { target: '[data-tour="kpi-tiles"]', content: 'Key performance indicators update in real time.' }
      ]
    })
  }, [])

  useAutoTour()

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-6">📊 Analytics Dashboard</h1>
      {loading && <p>Loading…</p>}
      {!loading && (
        <>
          <section className="mb-10 bg-white p-6 rounded shadow">
            <h2 className="text-lg font-semibold mb-4">Booking Funnel</h2>
            <ResponsiveContainer width="100%" height={300} data-tour="funnel-chart">
              <BarChart data={funnel}>
                <XAxis dataKey="step_name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </section>

          <section className="bg-white p-6 rounded shadow">
            <h2 className="text-lg font-semibold mb-4">API Metrics (last hour)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-tour="kpi-tiles">
              {apiMetrics.map((m) => (
                <div key={m.label} className="bg-gray-100 p-4 rounded text-center">
                  <p className="text-sm text-gray-500">{m.label}</p>
                  <p className="text-xl font-bold text-gray-900">{m.value}</p>
                </div>
              ))}
              {apiMetrics.length === 0 && <p className="text-gray-500">No metrics available</p>}
            </div>
          </section>
        </>
      )}
    </div>
  )
} 
