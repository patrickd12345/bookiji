export interface Provider {
  id: string;
  name: string;
  service: string;
  category: 'hair' | 'wellness' | 'health' | 'fitness';
  rating: number;
  price: string;
  location: { lat: number; lng: number };
  available: boolean;
}

export interface BookingSlot {
  id: string;
  time: string;
  available: boolean;
  providerId: string;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  icon: string;
  tone: string;
  preferences: string[];
}

export interface AIResponse {
  id: string;
  message: string;
  timestamp: Date;
  type: 'user' | 'ai';
}

export interface Appointment {
  id: string;
  providerId: string;
  customerId: string;
  time: string;
  status: 'scheduled' | 'completed' | 'no-show';
  rating?: number;
  feedback?: string;
}

export interface RadiusZone {
  radius: number;
  density: 'dense' | 'medium' | 'sparse';
  description: string;
  tone: string;
}

export interface AvailabilityZone {
  id: string;
  type: 'service' | 'time' | 'area';
  description: string;
  count: number;
  distance: number;
  abstracted: boolean;
}

export interface BookingGuarantee {
  customerCommitted: boolean;
  vendorPaid: boolean;
  slotLocked: boolean;
  providerDetailsRevealed: boolean;
}

// User Management Types
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'customer' | 'vendor' | 'admin';
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  privacy: {
    shareLocation: boolean;
    shareProfile: boolean;
  };
  persona?: string;
}

export interface Customer extends User {
  role: 'customer';
  persona?: Persona;
  bookingHistory: string[];
  savedProviders: string[];
  paymentMethods: PaymentMethod[];
}

export interface Vendor extends User {
  role: 'vendor';
  businessName: string;
  businessType: 'individual' | 'company';
  services: VendorService[];
  location: {
    address: string;
    lat: number;
    lng: number;
    city: string;
    state: string;
    zipCode: string;
  };
  businessHours: BusinessHours;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  documents: VendorDocument[];
  earnings: VendorEarnings;
  calendarIntegration?: CalendarIntegration;
}

export interface VendorService {
  id: string;
  name: string;
  category: 'hair' | 'wellness' | 'health' | 'fitness';
  price: number;
  duration: number; // in minutes
  description: string;
  isActive: boolean;
}

export interface BusinessHours {
  monday: { open: string; close: string; isOpen: boolean };
  tuesday: { open: string; close: string; isOpen: boolean };
  wednesday: { open: string; close: string; isOpen: boolean };
  thursday: { open: string; close: string; isOpen: boolean };
  friday: { open: string; close: string; isOpen: boolean };
  saturday: { open: string; close: string; isOpen: boolean };
  sunday: { open: string; close: string; isOpen: boolean };
}

export interface VendorDocument {
  id: string;
  type: 'license' | 'insurance' | 'certification' | 'business_license';
  name: string;
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: Date;
  expiresAt?: Date;
}

export interface VendorEarnings {
  totalEarnings: number;
  thisMonth: number;
  lastMonth: number;
  pendingPayouts: number;
  completedBookings: number;
  cancelledBookings: number;
}

export interface CalendarIntegration {
  type: 'google' | 'outlook' | 'ical';
  isConnected: boolean;
  lastSync?: Date;
  autoSync: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'paypal';
  last4?: string;
  brand?: string;
  isDefault: boolean;
  expiresAt?: Date;
}

export interface Admin extends User {
  role: 'admin';
  permissions: AdminPermission[];
  assignedRegions?: string[];
}

export interface AdminPermission {
  users: boolean;
  vendors: boolean;
  bookings: boolean;
  payments: boolean;
  analytics: boolean;
  settings: boolean;
}

// Registration Types
export interface RegistrationForm {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  phone?: string;
  role: 'customer' | 'vendor';
  agreeToTerms: boolean;
  marketingConsent: boolean;
  preferences?: { persona?: string };
}

export interface VendorRegistrationForm extends RegistrationForm {
  role: 'vendor';
  businessName: string;
  businessType: 'individual' | 'company';
  address: string;
  city: string;
  state: string;
  zipCode: string;
  services: VendorService[];
  businessHours: BusinessHours;
}

// Admin Dashboard Types
export interface AdminStats {
  totalUsers: number;
  totalVendors: number;
  totalBookings: number;
  totalRevenue: number;
  activeBookings: number;
  pendingVerifications: number;
  thisMonth: {
    newUsers: number;
    newVendors: number;
    bookings: number;
    revenue: number;
  };
}

export interface AdminAction {
  id: string;
  type: 'verify_vendor' | 'suspend_user' | 'approve_document' | 'process_payout';
  targetId: string;
  targetType: 'user' | 'vendor' | 'document';
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  adminId: string;
  notes?: string;
}

export interface AdminNotification {
  id: string;
  type: 'verification_request' | 'payment_issue' | 'user_complaint' | 'system_alert';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  createdAt: Date;
  actionRequired: boolean;
} 