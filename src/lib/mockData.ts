export interface DashboardStats {
  activeUsers: number
  bookingsToday: number
  revenue: number
  errors: number
}

export interface AnalyticsData {
  date: string
  users: number
  bookings: number
  revenue: number
}

export interface Vendor {
  id: string
  name: string
  category: string
  status: 'active' | 'pending' | 'suspended'
  email: string
  location: string
  joinDate: string
}

export interface Booking {
  id: string
  customer: string
  vendor: string
  service: string
  date: string
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed'
  amount: number
}

export interface Broadcast {
  id: string
  service: string
  customerLocation: string
  vendorsCount: number
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
  timestamp: string
  vendorResponses: VendorResponse[]
}

export interface VendorResponse {
  vendorId: string
  vendorName: string
  response: 'accepted' | 'declined' | 'pending'
  responseTime: string
  message?: string
}

export const dashboardStats: DashboardStats = {
  activeUsers: 1247,
  bookingsToday: 89,
  revenue: 12450,
  errors: 3
}

export const analyticsData: AnalyticsData[] = [
  { date: '2024-01-01', users: 120, bookings: 45, revenue: 2300 },
  { date: '2024-01-02', users: 135, bookings: 52, revenue: 2800 },
  { date: '2024-01-03', users: 142, bookings: 48, revenue: 2500 },
  { date: '2024-01-04', users: 128, bookings: 55, revenue: 2900 },
  { date: '2024-01-05', users: 156, bookings: 62, revenue: 3200 },
  { date: '2024-01-06', users: 168, bookings: 71, revenue: 3800 },
  { date: '2024-01-07', users: 145, bookings: 58, revenue: 3000 }
]

export const vendors: Vendor[] = [
  { id: '1', name: 'TechFix Pro', category: 'Technology', status: 'active', email: 'tech@techfix.com', location: 'New York', joinDate: '2024-01-15' },
  { id: '2', name: 'CleanHome Services', category: 'Cleaning', status: 'active', email: 'clean@home.com', location: 'Los Angeles', joinDate: '2024-01-10' },
  { id: '3', name: 'Garden Masters', category: 'Landscaping', status: 'pending', email: 'garden@masters.com', location: 'Chicago', joinDate: '2024-01-20' },
  { id: '4', name: 'Pet Care Plus', category: 'Pet Services', status: 'active', email: 'pet@care.com', location: 'Miami', joinDate: '2024-01-05' },
  { id: '5', name: 'Auto Repair Express', category: 'Automotive', status: 'suspended', email: 'auto@repair.com', location: 'Houston', joinDate: '2024-01-12' }
]

export const bookings: Booking[] = [
  { id: 'BK001', customer: 'John Smith', vendor: 'TechFix Pro', service: 'Computer Repair', date: '2024-01-25', status: 'confirmed', amount: 150 },
  { id: 'BK002', customer: 'Sarah Johnson', vendor: 'CleanHome Services', service: 'House Cleaning', date: '2024-01-26', status: 'pending', amount: 120 },
  { id: 'BK003', customer: 'Mike Davis', vendor: 'Garden Masters', service: 'Lawn Maintenance', date: '2024-01-27', status: 'completed', amount: 200 },
  { id: 'BK004', customer: 'Lisa Wilson', vendor: 'Pet Care Plus', service: 'Dog Walking', date: '2024-01-28', status: 'cancelled', amount: 80 },
  { id: 'BK005', customer: 'Tom Brown', vendor: 'Auto Repair Express', service: 'Oil Change', date: '2024-01-29', status: 'confirmed', amount: 95 }
]

export const broadcasts: Broadcast[] = [
  {
    id: 'BR001',
    service: 'Computer Repair',
    customerLocation: 'New York, NY',
    vendorsCount: 5,
    status: 'completed',
    timestamp: '2024-01-25T10:30:00Z',
    vendorResponses: [
      { vendorId: '1', vendorName: 'TechFix Pro', response: 'accepted', responseTime: '2024-01-25T10:35:00Z', message: 'Available today at 2 PM' },
      { vendorId: '2', vendorName: 'CleanHome Services', response: 'declined', responseTime: '2024-01-25T10:40:00Z', message: 'Not available today' }
    ]
  },
  {
    id: 'BR002',
    service: 'House Cleaning',
    customerLocation: 'Los Angeles, CA',
    vendorsCount: 3,
    status: 'in_progress',
    timestamp: '2024-01-26T09:00:00Z',
    vendorResponses: [
      { vendorId: '2', vendorName: 'CleanHome Services', response: 'accepted', responseTime: '2024-01-26T09:15:00Z', message: 'Can do tomorrow morning' },
      { vendorId: '3', vendorName: 'Garden Masters', response: 'pending', responseTime: '', message: '' }
    ]
  },
  {
    id: 'BR003',
    service: 'Lawn Maintenance',
    customerLocation: 'Chicago, IL',
    vendorsCount: 4,
    status: 'open',
    timestamp: '2024-01-27T08:00:00Z',
    vendorResponses: []
  }
]







