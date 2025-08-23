import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AdminAuditViewer from '@/components/admin/AdminAuditViewer'
import PerformanceDashboard from '@/components/admin/PerformanceDashboard'

export default function OperationalInsightsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Operational Insights</h1>
        <p className="text-muted-foreground">
          Monitor system performance and audit admin actions in real-time
        </p>
      </div>

      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="performance">Performance Dashboard</TabsTrigger>
          <TabsTrigger value="audit">Admin Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <PerformanceDashboard />
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <AdminAuditViewer />
        </TabsContent>
      </Tabs>
    </div>
  )
}
