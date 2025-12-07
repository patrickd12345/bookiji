'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Activity,
  Clock,
  DollarSign,
  Play,
  RotateCcw,
  Settings,
  Square,
  TrendingUp,
  Users,
} from 'lucide-react';
import { SimEventPayload, SimPolicies, SimRunInfo, SimState } from '@/lib/simcity/types';

const STATUS_POLL_INTERVAL_MS = 3000;

export default function SimCityDashboard() {
  const [state, setState] = useState<SimState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [events, setEvents] = useState<SimEventPayload[]>([]);
  const [uptime, setUptime] = useState(0);
  const [runInfo, setRunInfo] = useState<SimRunInfo | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const activeRunInfo = runInfo ?? state?.runInfo ?? null;

  useEffect(() => {
    fetchStatus();
    setupEventSource();
    
    const interval = setInterval(() => {
      if (isRunning) {
        fetchStatus();
      }
    }, STATUS_POLL_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [isRunning]);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/simcity/status');
      if (!response.ok) {
        throw new Error(`Status request failed with ${response.status}`);
      }
      const data = await response.json();
      
      if (data.success) {
        const nextState = data.data.state as SimState;
        setState(nextState);
        setIsRunning(Boolean(data.data.isRunning ?? nextState?.running));
        setUptime(data.data.uptime ?? 0);
        setRunInfo(data.data.runInfo ?? nextState?.runInfo ?? null);
        setFetchError(null);
      } else {
        setFetchError(data.error || 'Failed to fetch status');
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
      setFetchError('SimCity backend unreachable — check server logs.');
    }
  };

  const setupEventSource = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    eventSourceRef.current = new EventSource('/api/simcity/events');
    
    eventSourceRef.current.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as SimEventPayload;
        if (payload.type !== 'keepalive') {
          setEvents(prev => [...prev.slice(-99), payload]); // Keep last 100 events
        }
      } catch (error) {
        console.error('Failed to parse event:', error);
      }
    };

    eventSourceRef.current.onerror = (error) => {
      console.error('EventSource error:', error);
      setFetchError('Live events connection lost — attempting to reconnect.');
    };
  };

  const handleStart = async () => {
    try {
      const response = await fetch('/api/simcity/start', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setIsRunning(true);
        setRunInfo({
          runId: data.data.runId ?? null,
          seed: data.data.seed ?? null,
          scenario: data.data.scenario ?? null,
          startedAt: data.data.startTime,
        });
        setFetchError(null);
        fetchStatus();
      }
    } catch (error) {
      console.error('Failed to start simulation:', error);
      setFetchError('SimCity backend unreachable — check server logs.');
    }
  };

  const handleStop = async () => {
    try {
      const response = await fetch('/api/simcity/stop', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setIsRunning(false);
        setRunInfo(prev => ({
          runId: prev?.runId ?? null,
          seed: prev?.seed ?? null,
          scenario: prev?.scenario ?? null,
          startedAt: prev?.startedAt,
          finishedAt: data.data.stopTime,
        }));
        setFetchError(null);
        fetchStatus();
      }
    } catch (error) {
      console.error('Failed to stop simulation:', error);
      setFetchError('SimCity backend unreachable — check server logs.');
    }
  };

  const handlePolicyChange = async (newPolicies: Partial<SimPolicies>) => {
    try {
      const response = await fetch('/api/simcity/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policies: newPolicies }),
      });
      
      if (response.ok) {
        fetchStatus();
        setFetchError(null);
      } else {
        setFetchError('Failed to update policies');
      }
    } catch (error) {
      console.error('Failed to update policies:', error);
      setFetchError('SimCity backend unreachable — check server logs.');
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  };

  const formatTime = (isoString: string) => {
    return isoString ? new Date(isoString).toLocaleTimeString() : '—';
  };

  if (!state) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        {fetchError && (
          <Alert variant="destructive">
            <AlertTitle>Connection issue</AlertTitle>
            <AlertDescription>{fetchError}</AlertDescription>
          </Alert>
        )}
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            SimCity Testing Engine
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Persistent simulation sandbox for stress-testing Bookiji
          </p>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Scenario: {activeRunInfo?.scenario ?? '—'} • Run: {activeRunInfo?.runId ?? '—'} • Seed: {activeRunInfo?.seed ?? '—'}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Badge variant={isRunning ? "default" : "secondary"}>
            {isRunning ? (
              <>
                <Activity className="w-4 h-4 mr-2 animate-pulse" />
                RUNNING
              </>
            ) : (
              <>
                <Square className="w-4 h-4 mr-2" />
                STOPPED
              </>
            )}
          </Badge>
          
          <div className="text-right">
            <div className="text-sm text-gray-500">Uptime</div>
            <div className="font-mono">{formatUptime(uptime)}</div>
          </div>
        </div>
      </div>

      {fetchError && (
        <Alert variant="destructive">
          <AlertTitle>SimCity backend unreachable</AlertTitle>
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      )}

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Simulation Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Button 
              onClick={handleStart} 
              disabled={isRunning}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Simulation
            </Button>
            
            <Button 
              onClick={handleStop} 
              disabled={!isRunning}
              variant="destructive"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop Simulation
            </Button>
            
            <Button variant="outline" onClick={fetchStatus}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Current Tick:</span> {state.tick}
            </div>
            <div>
              <span className="font-medium">Simulated Time:</span> {formatTime(state.nowISO)}
            </div>
            <div>
              <span className="font-medium">Live Agents:</span> {state.liveAgents}
            </div>
            <div>
              <span className="font-medium">Tick Speed:</span> {state.policies.tickSpeedMs}ms
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bookings Created</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{state.metrics.bookingsCreated}</div>
            <p className="text-xs text-muted-foreground">
              +{state.metrics.throughput?.toFixed(1) ?? '0.0'} per minute
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{state.metrics.activeAgents}</div>
            <p className="text-xs text-muted-foreground">
              {state.metrics.totalAgentsSpawned} total spawned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(state.metrics.completionRate * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {state.metrics.cancels} cancellations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${state.metrics.skinFeesCollected.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              ${state.policies.skinFee} per booking
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Policy Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Simulation Policies</CardTitle>
          <CardDescription>
            Adjust simulation parameters in real-time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Reschedule Chance: {state.policies.rescheduleChance * 100}%</Label>
                <Slider
                  value={[state.policies.rescheduleChance]}
                  onValueChange={(value: number[]) => handlePolicyChange({ rescheduleChance: value[0] })}
                  max={1}
                  step={0.05}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium">Cancel Chance: {state.policies.cancelChance * 100}%</Label>
                <Slider
                  value={[state.policies.cancelChance]}
                  onValueChange={(value: number[]) => handlePolicyChange({ cancelChance: value[0] })}
                  max={1}
                  step={0.05}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium">Customer Spawn Rate: {state.policies.customerSpawnRate * 100}%</Label>
                <Slider
                  value={[state.policies.customerSpawnRate]}
                  onValueChange={(value: number[]) => handlePolicyChange({ customerSpawnRate: value[0] })}
                  max={1}
                  step={0.05}
                  className="mt-2"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Max Concurrent Agents: {state.policies.maxConcurrentAgents}</Label>
                <Slider
                  value={[state.policies.maxConcurrentAgents]}
                  onValueChange={(value: number[]) => handlePolicyChange({ maxConcurrentAgents: value[0] })}
                  max={100}
                  min={10}
                  step={5}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium">Tick Speed: {state.policies.tickSpeedMs}ms</Label>
                <Slider
                  value={[state.policies.tickSpeedMs]}
                  onValueChange={(value: number[]) => handlePolicyChange({ tickSpeedMs: value[0] })}
                  max={10000}
                  min={1000}
                  step={500}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium">Minutes per Tick: {state.policies.minutesPerTick}</Label>
                <Slider
                  value={[state.policies.minutesPerTick]}
                  onValueChange={(value: number[]) => handlePolicyChange({ minutesPerTick: value[0] })}
                  max={60}
                  min={1}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="refunds"
              checked={state.policies.refundsEnabled}
              onCheckedChange={(checked) => handlePolicyChange({ refundsEnabled: checked })}
            />
            <Label htmlFor="refunds">Enable Refunds</Label>
          </div>
        </CardContent>
      </Card>

      {/* Live Events */}
      <Card>
        <CardHeader>
          <CardTitle>Live Events</CardTitle>
          <CardDescription>
            Real-time simulation events and agent activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 overflow-y-auto space-y-2 font-mono text-sm">
            {events.map((event, index) => (
              <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <Badge variant="outline" className="text-xs">
                  {event.type}
                </Badge>
                <span className="text-gray-600 dark:text-gray-400">
                  {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : '—'}
                </span>
                <span className="text-gray-800 dark:text-gray-200 break-all">
                  {event.data ? JSON.stringify(event.data) : '—'}
                </span>
              </div>
            ))}
            {events.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No events yet. Start the simulation to see live activity.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
