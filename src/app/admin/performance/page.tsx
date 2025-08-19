'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Database, Clock, DollarSign, Activity, Download, Trash2, Settings } from 'lucide-react';

interface PerformanceAlert {
  alert_type: string;
  table_name: string;
  operation: string;
  query_count: number;
  avg_execution_time: number;
  total_cost: number;
  alert_message: string;
}

interface PerformanceSummary {
  hour_bucket: string;
  operation: string;
  table_name: string;
  query_count: number;
  avg_execution_time: number;
  max_execution_time: number;
  total_cost: number;
  slow_queries: number;
  expensive_queries: number;
}

interface InMemorySummary {
  totalQueries: number;
  slowQueries: number;
  expensiveQueries: number;
  averageExecutionTime: number;
  totalCost: number;
}

export default function PerformanceDashboard() {
  const [summary, setSummary] = useState<PerformanceSummary[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [inMemorySummary, setInMemorySummary] = useState<InMemorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [selectedOperation, setSelectedOperation] = useState<string>('');

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        hours: timeRange,
        ...(selectedTable && { table: selectedTable }),
        ...(selectedOperation && { operation: selectedOperation })
      });

      const response = await fetch(`/api/admin/performance?${params}`);
      const data = await response.json();

      if (data.success) {
        setSummary(data.data.summary || []);
        setAlerts(data.data.alerts || []);
        setInMemorySummary(data.data.inMemorySummary || null);
      } else {
        console.error('Failed to fetch performance data:', data.error);
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (action: string, params: any = {}) => {
    try {
      const response = await fetch('/api/admin/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params })
      });

      const data = await response.json();
      
      if (data.success) {
        if (action === 'export_metrics' && data.data) {
          // Download metrics as JSON file
          const blob = new Blob([data.data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = data.filename || 'performance-metrics.json';
          a.click();
          URL.revokeObjectURL(url);
        }
        
        // Refresh data after actions
        await fetchPerformanceData();
        alert(data.message || 'Action completed successfully');
      } else {
        alert(data.error || 'Action failed');
      }
    } catch (error) {
      console.error('Error performing action:', error);
      alert('Error performing action');
    }
  };

  useEffect(() => {
    fetchPerformanceData();
  }, [timeRange, selectedTable, selectedOperation]);

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'SLOW_QUERIES':
        return <Clock className="h-4 w-4" />;
      case 'EXPENSIVE_QUERIES':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getAlertColor = (alertType: string) => {
    switch (alertType) {
      case 'SLOW_QUERIES':
        return 'destructive';
      case 'EXPENSIVE_QUERIES':
        return 'destructive';
      default:
        return 'default';
    }
  };

  // Get unique tables and operations for filters
  const uniqueTables = [...new Set(summary.map(s => s.table_name))];
  const uniqueOperations = [...new Set(summary.map(s => s.operation))];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Performance Dashboard</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => performAction('export_metrics')}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => performAction('clear_metrics')}
            className="flex items-center space-x-2"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear</span>
          </Button>
          <Button onClick={fetchPerformanceData}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Filters & Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Time Range</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last Hour</SelectItem>
                  <SelectItem value="6">Last 6 Hours</SelectItem>
                  <SelectItem value="24">Last 24 Hours</SelectItem>
                  <SelectItem value="168">Last Week</SelectItem>
                  <SelectItem value="720">Last Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Table</label>
              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger>
                  <SelectValue placeholder="All tables" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All tables</SelectItem>
                  {uniqueTables.map(table => (
                    <SelectItem key={table} value={table}>{table}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Operation</label>
              <Select value={selectedOperation} onValueChange={setSelectedOperation}>
                <SelectTrigger>
                  <SelectValue placeholder="All operations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All operations</SelectItem>
                  {uniqueOperations.map(op => (
                    <SelectItem key={op} value={op}>{op}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Performance Alerts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <Alert key={index}>
                  <div className="flex items-center space-x-2">
                    {getAlertIcon(alert.alert_type)}
                    <AlertTitle>
                      {alert.table_name} - {alert.operation}
                      <Badge variant={getAlertColor(alert.alert_type)} className="ml-2">
                        {alert.alert_type.replace('_', ' ')}
                      </Badge>
                    </AlertTitle>
                  </div>
                  <AlertDescription>
                    {alert.alert_message}
                    <br />
                    <span className="text-sm text-gray-500">
                      {alert.query_count} queries • Avg: {alert.avg_execution_time.toFixed(2)}ms • Cost: ${alert.total_cost.toFixed(6)}
                    </span>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Metrics</TabsTrigger>
          <TabsTrigger value="memory">In-Memory Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary.reduce((sum, s) => sum + s.query_count, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last {timeRange} hours
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Slow Queries</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {summary.reduce((sum, s) => sum + s.slow_queries, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  &gt; 500ms execution time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expensive Queries</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {summary.reduce((sum, s) => sum + s.expensive_queries, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  &gt; $0.01 estimated cost
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${summary.reduce((sum, s) => sum + s.total_cost, 0).toFixed(6)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Estimated database cost
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center">Loading...</div>
              ) : summary.length === 0 ? (
                <div className="text-center text-gray-500">No performance data available</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Time</th>
                        <th className="text-left p-2">Table</th>
                        <th className="text-left p-2">Operation</th>
                        <th className="text-right p-2">Queries</th>
                        <th className="text-right p-2">Avg Time (ms)</th>
                        <th className="text-right p-2">Max Time (ms)</th>
                        <th className="text-right p-2">Cost ($)</th>
                        <th className="text-right p-2">Slow</th>
                        <th className="text-right p-2">Expensive</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.map((row, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-2">{new Date(row.hour_bucket).toLocaleString()}</td>
                          <td className="p-2">{row.table_name}</td>
                          <td className="p-2">
                            <Badge variant="outline">{row.operation}</Badge>
                          </td>
                          <td className="text-right p-2">{row.query_count}</td>
                          <td className="text-right p-2">
                            <span className={row.avg_execution_time > 500 ? 'text-red-600' : ''}>
                              {row.avg_execution_time.toFixed(2)}
                            </span>
                          </td>
                          <td className="text-right p-2">{row.max_execution_time.toFixed(2)}</td>
                          <td className="text-right p-2">
                            <span className={row.total_cost > 0.01 ? 'text-red-600' : ''}>
                              {row.total_cost.toFixed(6)}
                            </span>
                          </td>
                          <td className="text-right p-2">
                            {row.slow_queries > 0 && (
                              <Badge variant="destructive">{row.slow_queries}</Badge>
                            )}
                          </td>
                          <td className="text-right p-2">
                            {row.expensive_queries > 0 && (
                              <Badge variant="destructive">{row.expensive_queries}</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="memory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>In-Memory Performance Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              {inMemorySummary ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{inMemorySummary.totalQueries}</div>
                    <div className="text-sm text-gray-500">Total Queries</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{inMemorySummary.slowQueries}</div>
                    <div className="text-sm text-gray-500">Slow Queries</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{inMemorySummary.expensiveQueries}</div>
                    <div className="text-sm text-gray-500">Expensive Queries</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{inMemorySummary.averageExecutionTime.toFixed(2)}ms</div>
                    <div className="text-sm text-gray-500">Avg Execution Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">${inMemorySummary.totalCost.toFixed(6)}</div>
                    <div className="text-sm text-gray-500">Total Cost</div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500">No in-memory statistics available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}