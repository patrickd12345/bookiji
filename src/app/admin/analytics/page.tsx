'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { registerTour } from '@/lib/guidedTourRegistry'
import { useAutoTour } from '@/lib/useAutoTour'

interface FunnelRow { step_name: string; count: number }
interface SystemMetrics {
  requestsPerMinute: number
  p95SessionDuration: number
  errorRate: number
  activeUsers: number
}

export default function AnalyticsDashboard() {
  const [funnel, setFunnel] = useState<FunnelRow[]>([])
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null)
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
          setSystemMetrics(d.data)
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
              {systemMetrics && (
                <>
                  <div className="bg-gray-100 p-4 rounded text-center">
                    <p className="text-sm text-gray-500">Requests/min</p>
                    <p className="text-xl font-bold text-gray-900">{systemMetrics.requestsPerMinute}</p>
                  </div>
                  <div className="bg-gray-100 p-4 rounded text-center">
                    <p className="text-sm text-gray-500">p95 Session Duration (s)</p>
                    <p className="text-xl font-bold text-gray-900">{systemMetrics.p95SessionDuration}</p>
                  </div>
                  <div className="bg-gray-100 p-4 rounded text-center">
                    <p className="text-sm text-gray-500">Error Rate (%)</p>
                    <p className="text-xl font-bold text-gray-900">{systemMetrics.errorRate}</p>
                  </div>
                  <div className="bg-gray-100 p-4 rounded text-center">
                    <p className="text-sm text-gray-500">Active Users</p>
                    <p className="text-xl font-bold text-gray-900">{systemMetrics.activeUsers}</p>
                  </div>
                </>
              )}
              {!systemMetrics && <p className="text-gray-500">No metrics available</p>}
            </div>
          </section>
        </>
      )}
    </div>
  )
} 
