'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { 
  Activity, 
  Play, 
  Square, 
  Clock, 
  ShieldAlert, 
  History, 
  ChevronRight, 
  Search,
  Filter,
  BarChart3,
  List,
  AlertCircle,
  Zap,
  RefreshCcw,
  Copy,
  Terminal,
  Database,
  ArrowRight,
  Globe,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';

// --- Types ---

interface OpsEvent {
  id: string;
  ts: string;
  source: 'prod' | 'simcity';
  run_id: string | null;
  provider_id: string | null;
  type: string;
  payload: any;
}

interface OpsMetrics {
  bookings_created_count: number;
  cancellations_count: number;
  reschedules_count: number;
  active_bookings_count: number;
  slots_available_count: number;
  slots_unavailable_count: number;
  invariant_failures_count: number;
}

interface FusedMetrics {
  prod: OpsMetrics;
  simcity: OpsMetrics;
  fused: OpsMetrics;
}

interface SimCityRunRequest {
  id: string;
  status: string;
  tier: string;
  seed: number;
  created_at: string;
  run_id: string | null;
}

// --- Components ---

const EventDetailModal = ({ event, onClose }: { event: OpsEvent | null, onClose: () => void }) => {
  if (!event) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-cyan-400 font-mono font-bold">Event Details</h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-white">
            <Square className="w-4 h-4" />
          </Button>
        </div>
        <div className="p-6 overflow-auto font-mono text-xs bg-slate-950 m-4 rounded-lg border border-slate-800">
          <div className="mb-4">
            <span className="text-slate-500">Source:</span> <Badge className={event.source === 'prod' ? 'bg-blue-500/20 text-blue-400' : 'bg-cyan-500/20 text-cyan-400'}>{event.source}</Badge>
          </div>
          <div className="mb-4">
            <span className="text-slate-500">Type:</span> <span className="text-slate-200">{event.type}</span>
          </div>
          <div className="mb-4">
            <span className="text-slate-500">Timestamp:</span> <span className="text-slate-200">{new Date(event.ts).toLocaleString()}</span>
          </div>
          {event.run_id && (
            <div className="mb-4">
              <span className="text-slate-500">Run ID:</span> <span className="text-slate-200">{event.run_id}</span>
            </div>
          )}
          <pre className="text-cyan-200/80">{JSON.stringify(event.payload, null, 2)}</pre>
        </div>
        <div className="p-4 border-t border-slate-800 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, splitValue, colorClass, icon: Icon }: any) => (
  <Card className="bg-slate-900/40 border-slate-800 shadow-none overflow-hidden group">
    <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
      <CardTitle className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">{title}</CardTitle>
      <Icon className={`w-3 h-3 ${colorClass} opacity-50 group-hover:opacity-100 transition-opacity`} />
    </CardHeader>
    <CardContent className="p-4">
      <div className={`text-3xl font-mono font-bold ${colorClass}`}>
        {value}
      </div>
      {splitValue && (
        <div className="flex items-center mt-2 space-x-3 text-[10px] font-mono text-slate-500">
          <span className="flex items-center"><Globe className="w-2.5 h-2.5 mr-1 text-blue-500/70" /> {splitValue.prod}</span>
          <span className="flex items-center"><Cpu className="w-2.5 h-2.5 mr-1 text-cyan-500/70" /> {splitValue.simcity}</span>
        </div>
      )}
    </CardContent>
  </Card>
);

export default function MissionControlPage() {
  const [mode, setMode] = useState<'FUSED' | 'LIVE' | 'SIMCITY'>('FUSED');
  const [events, setEvents] = useState<OpsEvent[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [requests, setRequests] = useState<SimCityRunRequest[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<OpsEvent | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  // Mode effects
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [mode, selectedRunId, refreshInterval]);

  useEffect(() => {
    if (mode === 'SIMCITY') {
      fetchRequests();
    }
  }, [mode]);

  const fetchData = async () => {
    try {
      const sourceMap = { 'FUSED': 'fused', 'LIVE': 'prod', 'SIMCITY': 'simcity' };
      const source = sourceMap[mode];
      
      let eventsUrl = `/api/ops/events?source=${source}&limit=50`;
      if (mode === 'SIMCITY' && selectedRunId) {
        eventsUrl += `&run_id=${selectedRunId}`;
      }
      
      const metricsUrl = `/api/ops/metrics?source=${source}&window_seconds=3600`;
      
      const [eventsRes, metricsRes] = await Promise.all([
        fetch(eventsUrl),
        fetch(metricsUrl)
      ]);
      
      const eventsData = await eventsRes.json();
      const metricsData = await metricsRes.json();
      
      setEvents(eventsData.data || []);
      setMetrics(metricsData.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/ops/simcity/run-requests');
      if (!res.ok) {
        console.error('Failed to fetch requests:', res.statusText);
        setRequests([]);
        return;
      }
      const data = await res.json();
      // Ensure data is an array
      const requestsArray = Array.isArray(data) ? data : [];
      setRequests(requestsArray);
      if (requestsArray.length > 0 && !selectedRunId) {
        setSelectedRunId(requestsArray[0].run_id);
      }
    } catch (err) {
      console.error('Failed to fetch requests', err);
      setRequests([]); // Set to empty array on error
    }
  };

  const handleStartRun = async () => {
    try {
      await fetch('/api/ops/simcity/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: 'A',
          seed: Math.floor(Math.random() * 1000000),
          concurrency: 5,
          max_events: 100,
          duration_seconds: 60
        })
      });
      fetchRequests();
    } catch (err) {
      console.error('Failed to start run', err);
    }
  };

  const displayMetrics = useMemo(() => {
    if (!metrics) return null;
    if (mode === 'FUSED') return metrics.fused;
    return metrics;
  }, [metrics, mode]);

  const splitMetrics = useMemo(() => {
    if (mode !== 'FUSED' || !metrics) return null;
    return {
      active: { prod: metrics.prod.active_bookings_count, simcity: metrics.simcity.active_bookings_count },
      created: { prod: metrics.prod.bookings_created_count, simcity: metrics.simcity.bookings_created_count },
      cancelled: { prod: metrics.prod.cancellations_count, simcity: metrics.simcity.cancellations_count },
      failures: { prod: metrics.prod.invariant_failures_count, simcity: metrics.simcity.invariant_failures_count }
    };
  }, [metrics, mode]);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans selection:bg-cyan-500/30">
      {/* Sidebar for SimCity runs */}
      {mode === 'SIMCITY' && (
        <div className="w-80 border-r border-slate-800 flex flex-col bg-slate-900/50 backdrop-blur-xl shrink-0">
          <div className="p-4 border-b border-slate-800 space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">SimCity Runs</h2>
            <Button className="w-full bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg" onClick={handleStartRun}>
              <Zap className="w-4 h-4 mr-2" /> New Run
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {Array.isArray(requests) && requests.length > 0 ? (
              requests.map((req) => (
                <button
                  key={req.id}
                  onClick={() => setSelectedRunId(req.run_id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedRunId === req.run_id ? 'bg-cyan-500/10 border-cyan-500/50' : 'hover:bg-slate-800/50 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-[10px] text-slate-500">#{req.run_id?.slice(0, 8) || 'PENDING'}</span>
                    <Badge variant="outline" className="text-[8px] uppercase">{req.status}</Badge>
                  </div>
                  <div className="text-sm font-medium">Tier {req.tier} • Seed {req.seed}</div>
                  <div className="text-[10px] text-slate-600 mt-1">{new Date(req.created_at).toLocaleString()}</div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-slate-500 text-sm">
                No SimCity runs found
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header with Mode Selector */}
        <header className="h-20 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/30">
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-black tracking-tighter bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">MISSION CONTROL</h1>
            <div className="flex bg-slate-950 border border-slate-800 rounded-full p-1 p-x-2">
              {(['FUSED', 'LIVE', 'SIMCITY'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-6 py-1.5 rounded-full text-[10px] font-bold tracking-widest transition-all ${
                    mode === m 
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-cyan-900/40' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-slate-900/50 border border-slate-800 px-3 py-1.5 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{isLoading ? 'Syncing...' : 'Connected'}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={fetchData} className="hover:bg-slate-800">
              <RefreshCcw className="w-4 h-4 text-slate-500" />
            </Button>
          </div>
        </header>

        {/* Dash Content */}
        <div className="flex-1 overflow-hidden flex flex-col p-8 space-y-8">
          {/* KPI Grid */}
          <div className="grid grid-cols-4 gap-6">
            <KPICard 
              title="Active Bookings" 
              value={displayMetrics?.active_bookings_count || 0} 
              splitValue={splitMetrics?.active}
              colorClass="text-emerald-400" 
              icon={Activity}
            />
            <KPICard 
              title="Bookings Created" 
              value={displayMetrics?.bookings_created_count || 0} 
              splitValue={splitMetrics?.created}
              colorClass="text-blue-400" 
              icon={Zap}
            />
            <KPICard 
              title="Cancellations" 
              value={displayMetrics?.cancellations_count || 0} 
              splitValue={splitMetrics?.cancelled}
              colorClass="text-rose-400" 
              icon={AlertCircle}
            />
            <KPICard 
              title="Invariant Failures" 
              value={displayMetrics?.invariant_failures_count || 0} 
              splitValue={splitMetrics?.failures}
              colorClass="text-amber-400" 
              icon={ShieldAlert}
            />
          </div>

          {/* Timeline Lanes */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6 flex items-center">
              <Clock className="w-4 h-4 mr-2 text-blue-500" />
              Fusion Ops Stream (Last 50 Events)
            </h3>
            
            <div className="space-y-6">
              {/* Prod Lane */}
              {(mode === 'FUSED' || mode === 'LIVE') && (
                <div className="relative group">
                  <div className="absolute -left-12 top-1/2 -translate-y-1/2 -rotate-90 text-[8px] font-black tracking-tighter text-blue-500/40 uppercase group-hover:text-blue-400 transition-colors">PROD</div>
                  <div className="h-16 bg-slate-950/50 rounded-xl border border-slate-800/50 flex items-center px-4 space-x-1 overflow-hidden">
                    {events.filter(e => e.source === 'prod').map(e => (
                      <motion.div
                        key={e.id}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`w-3 h-8 rounded-sm cursor-pointer hover:w-6 hover:brightness-125 transition-all ${
                          e.type.includes('fail') ? 'bg-red-500' :
                          e.type.includes('cancel') ? 'bg-rose-500' :
                          e.type.includes('reschedule') ? 'bg-amber-500' :
                          'bg-blue-500'
                        }`}
                        onClick={() => setSelectedEvent(e)}
                      />
                    ))}
                    {events.filter(e => e.source === 'prod').length === 0 && (
                      <div className="text-[10px] text-slate-700 uppercase tracking-widest font-bold">No production traffic detected</div>
                    )}
                  </div>
                </div>
              )}

              {/* SimCity Lane */}
              {(mode === 'FUSED' || mode === 'SIMCITY') && (
                <div className="relative group">
                  <div className="absolute -left-12 top-1/2 -translate-y-1/2 -rotate-90 text-[8px] font-black tracking-tighter text-cyan-500/40 uppercase group-hover:text-cyan-400 transition-colors">SIMCITY</div>
                  <div className="h-16 bg-slate-950/50 rounded-xl border border-slate-800/50 flex items-center px-4 space-x-1 overflow-hidden">
                    {events.filter(e => e.source === 'simcity').map(e => (
                      <motion.div
                        key={e.id}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`w-3 h-8 rounded-sm cursor-pointer hover:w-6 hover:brightness-125 transition-all ${
                          e.type.includes('fail') ? 'bg-red-500' :
                          e.type.includes('cancel') ? 'bg-rose-500' :
                          e.type.includes('reschedule') ? 'bg-amber-500' :
                          'bg-cyan-500'
                        }`}
                        onClick={() => setSelectedEvent(e)}
                      />
                    ))}
                    {events.filter(e => e.source === 'simcity').length === 0 && (
                      <div className="text-[10px] text-slate-700 uppercase tracking-widest font-bold">No SimCity traffic detected</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Event Feed */}
          <div className="flex-1 min-h-0 bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-800/20 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center">
                <List className="w-4 h-4 mr-2 text-blue-500" />
                Raw Event sequence
              </h3>
              <Badge variant="outline" className="font-mono text-[9px]">{events.length} EVENTS</Badge>
            </div>
            <div className="flex-1 overflow-y-auto font-mono text-[10px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-950/50 sticky top-0 text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="p-3 pl-6">TIME</th>
                    <th className="p-3">SOURCE</th>
                    <th className="p-3">TYPE</th>
                    <th className="p-3">PAYLOAD</th>
                    <th className="p-3 pr-6 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-slate-800/30 group transition-colors">
                      <td className="p-3 pl-6 text-slate-500">{new Date(event.ts).toLocaleTimeString()}</td>
                      <td className="p-3">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          event.source === 'prod' ? 'bg-blue-500/10 text-blue-400' : 'bg-cyan-500/10 text-cyan-400'
                        }`}>
                          {event.source}
                        </span>
                      </td>
                      <td className="p-3 font-bold">
                        <span className={
                          event.type.includes('fail') ? 'text-red-400' :
                          event.type.includes('cancel') ? 'text-rose-400' :
                          'text-slate-300'
                        }>
                          {event.type}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 max-w-md truncate group-hover:whitespace-normal group-hover:text-slate-400 transition-all">
                        {JSON.stringify(event.payload)}
                      </td>
                      <td className="p-3 pr-6 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={() => setSelectedEvent(event)}
                        >
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
}
