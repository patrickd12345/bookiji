'use client';

import { useState, useEffect } from 'react';
import { MapPin, Clock, Star, Shield, Zap, Filter, Search, Calendar, User, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Provider {
  id: string;
  name: string;
  service: string;
  category: string;
  rating: number;
  price: string;
  distance: number;
  availability: string;
  location: {
    lat: number;
    lng: number;
  };
  guarantee: boolean;
  lastMinute: boolean;
  image: string;
}

interface BookingSlot {
  id: string;
  time: string;
  duration: number;
  price: number;
  available: boolean;
}

export default function Home() {
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [userLocation, setUserLocation] = useState({ lat: 40.7128, lng: -74.0060 });

  // Mock data - in real app this would come from API
  const providers: Provider[] = [
    {
      id: '1',
      name: 'Elite Hair Studio',
      service: 'Haircut & Styling',
      category: 'hair',
      rating: 4.9,
      price: '$$',
      distance: 0.8,
      availability: 'Available now',
      location: { lat: 40.7128, lng: -74.0060 },
      guarantee: true,
      lastMinute: true,
      image: '/api/placeholder/60/60'
    },
    {
      id: '2',
      name: 'Zen Massage Therapy',
      service: 'Deep Tissue Massage',
      category: 'wellness',
      rating: 4.8,
      price: '$$$',
      distance: 1.2,
      availability: 'Next slot: 2:30 PM',
      location: { lat: 40.7150, lng: -74.0080 },
      guarantee: true,
      lastMinute: false,
      image: '/api/placeholder/60/60'
    },
    {
      id: '3',
      name: 'Downtown Dental',
      service: 'Teeth Cleaning',
      category: 'health',
      rating: 4.7,
      price: '$$',
      distance: 1.5,
      availability: 'Available now',
      location: { lat: 40.7100, lng: -74.0040 },
      guarantee: false,
      lastMinute: true,
      image: '/api/placeholder/60/60'
    }
  ];

  const bookingSlots: BookingSlot[] = [
    { id: '1', time: '1:30 PM', duration: 30, price: 45, available: true },
    { id: '2', time: '2:00 PM', duration: 45, price: 65, available: true },
    { id: '3', time: '2:30 PM', duration: 60, price: 85, available: false },
    { id: '4', time: '3:00 PM', duration: 30, price: 45, available: true },
  ];

  const categories = [
    { id: 'all', name: 'All Services', icon: '🎯' },
    { id: 'hair', name: 'Hair & Beauty', icon: '💇' },
    { id: 'wellness', name: 'Wellness', icon: '💆' },
    { id: 'health', name: 'Health', icon: '🦷' },
    { id: 'fitness', name: 'Fitness', icon: '💪' },
  ];

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Default to NYC if location access denied
          console.log('Location access denied, using default');
        }
      );
    }
  }, []);

  const filteredProviders = providers.filter(provider => {
    const matchesSearch = provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         provider.service.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || provider.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleProviderSelect = (provider: Provider) => {
    setSelectedProvider(provider);
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot: BookingSlot) => {
    setSelectedSlot(slot);
  };

  const handleBooking = () => {
    if (selectedProvider && selectedSlot) {
      // In real app, this would trigger booking flow
      alert(`Booking confirmed! ${selectedProvider.name} at ${selectedSlot.time}`);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel - Map */}
      <div className="w-1/2 bg-white border-r border-gray-200">
        <div className="h-full flex flex-col">
          {/* Map Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">B</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Bookiji</h1>
                  <p className="text-sm text-gray-500">Real-time availability</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                  <Filter size={20} />
                </button>
                <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                  <Zap size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Map Container */}
          <div className="flex-1 p-4">
            <div className="bg-gray-200 rounded-lg h-full flex items-center justify-center">
              <div className="text-center">
                <MapPin size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Live Availability Map</h3>
                <p className="text-gray-500 mb-4">Mapbox integration coming soon</p>
                <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                  {providers.map(provider => (
                    <div
                      key={provider.id}
                      onClick={() => handleProviderSelect(provider)}
                      className={`p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedProvider?.id === provider.id
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-2xl mb-1">{provider.category === 'hair' ? '💇' : provider.category === 'wellness' ? '💆' : '🦷'}</div>
                      <div className="text-xs font-medium">{provider.name}</div>
                      <div className="text-xs text-gray-500">{provider.distance}km</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Center Panel - Availability List */}
      <div className="w-1/3 bg-white border-r border-gray-200">
        <div className="h-full flex flex-col">
          {/* Search Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search services or providers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Category Filters */}
            <div className="flex space-x-2 mt-3 overflow-x-auto">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Providers List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-3">
              {filteredProviders.map(provider => (
                <motion.div
                  key={provider.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  onClick={() => handleProviderSelect(provider)}
                  className={`p-4 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                    selectedProvider?.id === provider.id
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'bg-white border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-2xl">
                      {provider.category === 'hair' ? '💇' : provider.category === 'wellness' ? '💆' : '🦷'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 truncate">{provider.name}</h3>
                        <div className="flex items-center space-x-1">
                          <Star size={16} className="text-yellow-400 fill-current" />
                          <span className="text-sm font-medium">{provider.rating}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{provider.service}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{provider.price}</span>
                          <span>{provider.distance}km away</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {provider.guarantee && (
                            <Shield size={16} className="text-green-500" />
                          )}
                          {provider.lastMinute && (
                            <Zap size={16} className="text-orange-500" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 mt-2 text-sm text-green-600">
                        <Clock size={14} />
                        <span>{provider.availability}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Booking */}
      <div className="w-1/6 bg-white">
        <div className="h-full flex flex-col">
          {/* Booking Header */}
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Book Now</h2>
            <p className="text-sm text-gray-500">Select your preferred time</p>
          </div>

          {/* Booking Content */}
          <div className="flex-1 p-4">
            {selectedProvider ? (
              <div className="space-y-4">
                {/* Provider Info */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center text-lg">
                      {selectedProvider.category === 'hair' ? '💇' : selectedProvider.category === 'wellness' ? '💆' : '🦷'}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{selectedProvider.name}</h3>
                      <p className="text-sm text-gray-500">{selectedProvider.service}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{selectedProvider.price}</span>
                    <div className="flex items-center space-x-1">
                      <Star size={14} className="text-yellow-400 fill-current" />
                      <span>{selectedProvider.rating}</span>
                    </div>
                  </div>
                </div>

                {/* Time Slots */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Available Times</h4>
                  <div className="space-y-2">
                    {bookingSlots.map(slot => (
                      <button
                        key={slot.id}
                        onClick={() => handleSlotSelect(slot)}
                        disabled={!slot.available}
                        className={`w-full p-3 rounded-lg text-left transition-colors ${
                          selectedSlot?.id === slot.id
                            ? 'bg-blue-500 text-white'
                            : slot.available
                            ? 'bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{slot.time}</div>
                            <div className="text-sm opacity-75">{slot.duration} min</div>
                          </div>
                          <div className="font-semibold">${slot.price}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Booking Button */}
                <button
                  onClick={handleBooking}
                  disabled={!selectedSlot}
                  className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {selectedSlot ? `Book for $${selectedSlot.price}` : 'Select a time'}
                </button>

                {/* Guarantee Badge */}
                {selectedProvider.guarantee && (
                  <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 p-2 rounded-lg">
                    <Shield size={16} />
                    <span>Booking Guaranteed</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 mt-8">
                <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                <p>Select a provider to see available times</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 