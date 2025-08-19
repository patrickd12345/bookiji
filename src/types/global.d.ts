import React from 'react';
import { HTMLMotionProps } from 'framer-motion'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: unknown;
    }
  }
  var __DEV__: boolean;
}

/// <reference types="vitest" />
/// <reference types="vitest/globals" />
/// <reference types="@testing-library/jest-dom" />

declare module 'framer-motion' {
  export interface MotionProps extends HTMLMotionProps<"div"> {
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
    disabled?: boolean;
    'data-tour'?: string;
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
  credits?: UserCredits;
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
  type: 'card' | 'bank' | 'digital_wallet';
  last4?: string;
  brand?: string;
  isDefault: boolean;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount_cents: number;
  transaction_type: 'purchase' | 'usage' | 'refund' | 'bonus';
  description: string;
  booking_id?: string;
  payment_intent_id?: string;
  created_at: string;
}

export interface UserCredits {
  user_id: string;
  balance_cents: number;
  total_purchased_cents: number;
  total_used_cents: number;
  /** Lifetime earnings tracked for loyalty progression */
  lifetime_earned_cents?: number;
  /** Current loyalty tier */
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  /** Points accumulated through credit transactions */
  points?: number;
  created_at: string;
  updated_at: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits_cents: number;
  price_cents: number;
  bonus_credits_cents?: number;
  description: string;
  is_active: boolean;
  created_at: string;
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

export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  reason?: string;
  created_at: string;
}

export interface BlockUserRequest {
  blocked_id: string;
  reason?: string;
}

export interface BlockListResponse {
  blocks: UserBlock[];
  blocked_by: UserBlock[];
}

export {}; 