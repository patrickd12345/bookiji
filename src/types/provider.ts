// Rich Provider Profile Types

export interface ProviderCertification {
  id: string;
  provider_id: string;
  certification_name: string;
  issuing_organization: string;
  issue_date?: string;
  expiry_date?: string;
  certificate_number?: string;
  verification_status: 'pending' | 'verified' | 'rejected' | 'expired';
  certificate_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ProviderEducation {
  id: string;
  provider_id: string;
  institution_name: string;
  degree_type?: 'bachelor' | 'master' | 'phd' | 'diploma' | 'certificate' | 'other';
  field_of_study?: string;
  start_year?: number;
  end_year?: number;
  is_current: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ProviderPortfolio {
  id: string;
  provider_id: string;
  title: string;
  description?: string;
  service_type?: string;
  images: string[];
  project_date?: string;
  client_name?: string;
  project_duration?: string;
  technologies_used: string[];
  is_featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProviderLanguage {
  id: string;
  provider_id: string;
  language_code: string;
  language_name: string;
  proficiency_level: 'basic' | 'conversational' | 'fluent' | 'native';
  is_primary: boolean;
  created_at: string;
}

export interface AvailabilitySchedule {
  [day: string]: {
    isAvailable: boolean;
    timeSlots: Array<{
      start: string; // HH:MM format
      end: string;   // HH:MM format
    }>;
  };
}

export interface SocialLinks {
  website?: string;
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  youtube?: string;
  portfolio?: string;
}

export interface RichProviderProfile {
  id: string;
  full_name: string;
  email: string;
  bio?: string;
  portfolio_images: string[];
  certifications: ProviderCertification[];
  languages: string[]; // Legacy field, use provider_languages table instead
  specializations: string[];
  experience_years: number;
  hourly_rate?: number;
  availability_schedule: AvailabilitySchedule;
  education: ProviderEducation[];
  professional_summary?: string;
  service_area_radius: number;
  verified_at?: string;
  verification_documents: string[];
  social_links: SocialLinks;
  response_time_avg: number; // in minutes
  completion_rate: number;   // percentage
  profile_completion_score: number; // 0-100
  rating: number;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  
  // Aggregated data from view
  total_bookings?: number;
  completed_bookings?: number;
  total_reviews?: number;
  avg_review_rating?: number;
  certification_count?: number;
  education_count?: number;
  portfolio_count?: number;
  language_count?: number;
  last_booking_date?: string;
  last_review_date?: string;
  service_types?: string[];
  avg_service_price?: number;
  active_services?: number;
}

export interface ProviderProfileUpdate {
  bio?: string;
  portfolio_images?: string[];
  specializations?: string[];
  experience_years?: number;
  hourly_rate?: number;
  availability_schedule?: AvailabilitySchedule;
  professional_summary?: string;
  service_area_radius?: number;
  social_links?: SocialLinks;
}

export interface CertificationRequest {
  certification_name: string;
  issuing_organization: string;
  issue_date?: string;
  expiry_date?: string;
  certificate_number?: string;
  certificate_url?: string;
}

export interface EducationRequest {
  institution_name: string;
  degree_type?: ProviderEducation['degree_type'];
  field_of_study?: string;
  start_year?: number;
  end_year?: number;
  is_current?: boolean;
  description?: string;
}

export interface PortfolioRequest {
  title: string;
  description?: string;
  service_type?: string;
  images?: string[];
  project_date?: string;
  client_name?: string;
  project_duration?: string;
  technologies_used?: string[];
  is_featured?: boolean;
  display_order?: number;
}

export interface LanguageRequest {
  language_code: string;
  language_name: string;
  proficiency_level: ProviderLanguage['proficiency_level'];
  is_primary?: boolean;
}

export interface ProviderSearchFilters {
  service_type?: string;
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in km
  };
  min_rating?: number;
  max_hourly_rate?: number;
  languages?: string[];
  certifications?: string[];
  experience_min?: number;
  availability?: {
    date: string;
    time_start?: string;
    time_end?: string;
  };
  verified_only?: boolean;
  profile_completion_min?: number;
}

export interface ProviderCard {
  id: string;
  full_name: string;
  bio?: string;
  avatar_url?: string;
  rating: number;
  total_reviews: number;
  hourly_rate?: number;
  specializations: string[];
  service_area_radius: number;
  response_time_avg: number;
  completion_rate: number;
  profile_completion_score: number;
  verified_at?: string;
  last_active?: string;
  is_online?: boolean;
  service_types: string[];
  languages: string[];
  certification_count: number;
  portfolio_images: string[];
}

// Utility types for forms and API responses
export interface ProfileFormData extends ProviderProfileUpdate {
  certifications?: CertificationRequest[];
  education?: EducationRequest[];
  portfolio?: PortfolioRequest[];
  languages?: LanguageRequest[];
}

export interface ProviderProfileResponse {
  success: boolean;
  data?: RichProviderProfile;
  error?: string;
}

export interface ProviderListResponse {
  success: boolean;
  data?: ProviderCard[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

// Constants
export const PROFILE_COMPLETION_WEIGHTS = {
  BASIC_INFO: 40,      // name, bio, summary, experience, rate, radius
  PROFILE_IMAGE: 10,   // avatar
  SPECIALIZATIONS: 10, // specializations
  LANGUAGES: 10,       // languages
  PORTFOLIO_IMAGES: 10, // portfolio images
  CERTIFICATIONS: 10,   // verified certifications
  EDUCATION: 5,        // education entries
  PORTFOLIO_PROJECTS: 5 // portfolio projects
} as const;

export const LANGUAGE_PROFICIENCY_LEVELS = [
  { value: 'basic', label: 'Basic' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'fluent', label: 'Fluent' },
  { value: 'native', label: 'Native' }
] as const;

export const DEGREE_TYPES = [
  { value: 'certificate', label: 'Certificate' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'bachelor', label: 'Bachelor\'s Degree' },
  { value: 'master', label: 'Master\'s Degree' },
  { value: 'phd', label: 'PhD' },
  { value: 'other', label: 'Other' }
] as const;

export const VERIFICATION_STATUS = [
  { value: 'pending', label: 'Pending Verification', color: 'yellow' },
  { value: 'verified', label: 'Verified', color: 'green' },
  { value: 'rejected', label: 'Rejected', color: 'red' },
  { value: 'expired', label: 'Expired', color: 'gray' }
] as const;

