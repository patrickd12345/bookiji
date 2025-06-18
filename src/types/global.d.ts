import React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export interface AIResponse {
  id: string;
  message: string;
  timestamp: Date;
  type: 'user' | 'ai';
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  icon: string;
  tone: string;
  preferences: string[];
}

export interface Zone {
  id: string;
  name: string;
  type: 'service' | 'time' | 'area';
  description: string;
  count: number;
  distance: number;
  abstracted: boolean;
  radius: number;
  center: {
    lat: number;
    lng: number;
  };
  providers: Provider[];
  availableSlots: number;
}

export interface Provider {
  id: string;
  name: string;
  services: VendorService[];
  category: 'hair' | 'wellness' | 'health' | 'fitness';
  rating: number;
  price: string;
  location: {
    lat: number;
    lng: number;
  };
  availability: {
    date: string;
    slots: string[];
  }[];
  isActive: boolean;
}

export interface Appointment {
  id: string;
  providerId: string;
  customerId: string;
  service: string;
  date: string;
  slot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  rating?: number;
  feedback?: string;
}

export interface RadiusZone {
  radius: number;
  density: 'dense' | 'medium' | 'sparse';
  description: string;
  tone: 'specific' | 'balanced' | 'vague';
}

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

export interface AdminAction {
  id: string;
  type: 'approve_vendor' | 'review_complaint' | 'verify_identity' | 'process_refund';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed';
  assignedTo?: string;
  dueDate?: Date;
}

export type AdminPermission = 
  | 'manage_users'
  | 'manage_vendors'
  | 'manage_bookings'
  | 'manage_payments'
  | 'manage_content'
  | 'view_analytics'
  | 'system_settings'; 