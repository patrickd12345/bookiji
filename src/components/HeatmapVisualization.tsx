'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Badge } from '@/components/ui/badge';
// import { Slider } from '@/components/ui/slider';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { MapPin, TrendingUp, Users, DollarSign, Calendar, RefreshCw } from 'lucide-react';

interface HeatmapDataPoint {
  postal_code: string;
  latitude: number;
  longitude: number;
  booking_count: number;
  revenue: number;
  avg_rating: number;
  unique_providers: number;
  last_booking: string;
}

interface HeatmapProps {
  userId?: string;
  className?: string;
  height?: number;
  showControls?: boolean;
  defaultTimeRange?: '7d' | '30d' | '90d' | '1y';
}

export default function HeatmapVisualization({ 
   
  userId: _userId, 
  className = '', 
  height = 400,
  showControls = true,
  defaultTimeRange = '30d'
}: HeatmapProps) {
  const [data, setData] = useState<HeatmapDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(defaultTimeRange);
  const [serviceType, setServiceType] = useState<string>('');
  const [minBookings, setMinBookings] = useState([1]);
  const [selectedPoint, setSelectedPoint] = useState<HeatmapDataPoint | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const fetchHeatmapData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        timeRange,
        minBookings: minBookings[0].toString(),
        ...(serviceType && { serviceType })
      });

      const response = await fetch(`/api/analytics/heatmap?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch heatmap data');
      }
    } catch (err) {
      console.error('Heatmap fetch error:', err);
      setError('Error loading heatmap data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatmapData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, serviceType, minBookings]);

  // Calculate color intensity based on booking count
  const getHeatColor = (bookingCount: number, maxBookings: number): string => {
    const intensity = bookingCount / maxBookings;
    const red = Math.min(255, Math.floor(255 * intensity));
    const blue = Math.max(0, Math.floor(255 * (1 - intensity)));
    return `rgb(${red}, 100, ${blue})`;
  };

  // Get statistics
  const stats = data.length > 0 ? {
    totalBookings: data.reduce((sum, point) => sum + point.booking_count, 0),
    totalRevenue: data.reduce((sum, point) => sum + point.revenue, 0),
    avgRating: data.reduce((sum, point) => sum + point.avg_rating, 0) / data.length,
    uniqueAreas: data.length,
    maxBookings: Math.max(...data.map(point => point.booking_count))
  } : {
    totalBookings: 0,
    totalRevenue: 0,
    avgRating: 0,
    uniqueAreas: 0,
    maxBookings: 0
  };

  const serviceTypes = [
    { value: '', label: 'All Services' },
    { value: 'haircut', label: 'Haircut' },
    { value: 'massage', label: 'Massage' },
    { value: 'cleaning', label: 'Cleaning' },
    { value: 'tutoring', label: 'Tutoring' },
    { value: 'photography', label: 'Photography' },
    { value: 'fitness', label: 'Fitness Training' },
    { value: 'beauty', label: 'Beauty Services' },
    { value: 'handyman', label: 'Handyman' },
    { value: 'catering', label: 'Catering' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      {showControls && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Booking Heatmap Controls</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Time Range</label>
                <Select value={timeRange} onValueChange={(value: string) => setTimeRange(value as typeof timeRange)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                    <SelectItem value="1y">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Service Type</label>
                <Select value={serviceType} onValueChange={setServiceType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Min Bookings: {minBookings[0]}
                </label>
                <input
                  type="range"
                  value={minBookings[0]}
                  onChange={(e) => setMinBookings([parseInt(e.target.value)])}
                  max={20}
                  min={1}
                  step={1}
                  className="w-full mt-2"
                />
              </div>

              <div className="flex items-end">
                <Button onClick={fetchHeatmapData} disabled={loading} className="w-full">
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Total Bookings</p>
                <p className="text-xl font-bold">{stats.totalBookings.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Avg Rating</p>
                <p className="text-xl font-bold">{stats.avgRating.toFixed(1)}⭐</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">Areas Covered</p>
                <p className="text-xl font-bold">{stats.uniqueAreas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Heatmap Display */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Density Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p>Loading heatmap data...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center text-red-500">
                <p>{error}</p>
                <Button onClick={fetchHeatmapData} className="mt-2">
                  Try Again
                </Button>
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center text-gray-500">
                <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No booking data available for the selected criteria</p>
                <p className="text-sm">Try adjusting the filters above</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Simple heatmap representation using a grid */}
              <div 
                ref={mapRef}
                className="border rounded-lg p-4 bg-gray-50"
                style={{ height: `${height}px` }}
              >
                <div className="h-full overflow-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                    {data.map((point, _index) => (
                      <div
                        key={point.postal_code}
                        className="border rounded p-3 cursor-pointer transition-all hover:shadow-lg"
                        style={{
                          backgroundColor: getHeatColor(point.booking_count, stats.maxBookings),
                          color: point.booking_count > stats.maxBookings * 0.5 ? 'white' : 'black'
                        }}
                        onClick={() => setSelectedPoint(point)}
                      >
                        <div className="text-sm font-bold">{point.postal_code}</div>
                        <div className="text-xs">
                          <div>{point.booking_count} bookings</div>
                          <div>${point.revenue.toFixed(0)}</div>
                          <div>{point.avg_rating.toFixed(1)}⭐</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center space-x-4 text-sm">
                <span>Heat Intensity:</span>
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-4 bg-blue-500" title="Low activity"></div>
                  <span>Low</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-4 bg-purple-500" title="Medium activity"></div>
                  <span>Medium</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-4 bg-red-500" title="High activity"></div>
                  <span>High</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Point Details */}
      {selectedPoint && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Area Details: {selectedPoint.postal_code}</span>
              <Button variant="outline" size="sm" onClick={() => setSelectedPoint(null)}>
                Close
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Bookings</p>
                <p className="text-xl font-bold">{selectedPoint.booking_count}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Revenue</p>
                <p className="text-xl font-bold">${selectedPoint.revenue.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Rating</p>
                <p className="text-xl font-bold">{selectedPoint.avg_rating.toFixed(1)}⭐</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Providers</p>
                <p className="text-xl font-bold">{selectedPoint.unique_providers}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600">Location</p>
              <p className="font-medium">
                {selectedPoint.latitude.toFixed(6)}, {selectedPoint.longitude.toFixed(6)}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Last booking: {new Date(selectedPoint.last_booking).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
