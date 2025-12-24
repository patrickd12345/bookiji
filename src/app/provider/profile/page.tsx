'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Award, 
  GraduationCap, 
  Globe, 
  Star,
  MapPin,
  Clock,
  DollarSign,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import ProfileEditor from '@/components/provider/ProfileEditor';
import { RichProviderProfile, ProviderProfileUpdate } from '@/types/provider';

export default function ProviderProfilePage() {
  const [profile, setProfile] = useState<RichProviderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [_isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock profile data for development
  const mockProfile: RichProviderProfile = {
    id: '1',
    full_name: 'John Doe',
    email: 'john.doe@example.com',
    bio: 'Experienced web developer with 5+ years building modern applications.',
    portfolio_images: ['/api/placeholder/400/300'],
    certifications: [
      {
        id: '1',
        provider_id: '1',
        certification_name: 'AWS Certified Developer',
        issuing_organization: 'Amazon Web Services',
        issue_date: '2023-01-15',
        expiry_date: '2026-01-15',
        certificate_number: 'AWS-123456',
        verification_status: 'verified',
        certificate_url: 'https://aws.amazon.com/certification',
        created_at: '2023-01-15T00:00:00Z',
        updated_at: '2023-01-15T00:00:00Z'
      }
    ],
    languages: ['English', 'Spanish'],
    specializations: ['React', 'Node.js', 'TypeScript', 'AWS'],
    experience_years: 5,
    hourly_rate: 75,
    availability_schedule: {
      monday: { isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
      tuesday: { isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
      wednesday: { isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
      thursday: { isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
      friday: { isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] }
    },
    education: [
      {
        id: '1',
        provider_id: '1',
        institution_name: 'University of Technology',
        degree_type: 'bachelor',
        field_of_study: 'Computer Science',
        start_year: 2015,
        end_year: 2019,
        is_current: false,
        description: 'Focused on software engineering and web development',
        created_at: '2015-09-01T00:00:00Z',
        updated_at: '2019-06-01T00:00:00Z'
      }
    ],
    professional_summary: 'Full-stack developer specializing in modern web technologies with a passion for clean, maintainable code.',
    service_area_radius: 25,
    verified_at: '2023-06-01T00:00:00Z',
    verification_documents: ['/api/placeholder/400/300'],
    social_links: {
      website: 'https://johndoe.dev',
      linkedin: 'https://linkedin.com/in/johndoe'
    },
    response_time_avg: 15,
    completion_rate: 98,
    profile_completion_score: 85,
    rating: 4.8,
    avatar_url: '/api/placeholder/150/150',
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    total_bookings: 127,
    completed_bookings: 125,
    total_reviews: 89,
    avg_review_rating: 4.8,
    certification_count: 1,
    education_count: 1,
    portfolio_count: 0,
    language_count: 2,
    last_booking_date: '2024-01-15T00:00:00Z',
    last_review_date: '2024-01-10T00:00:00Z',
    service_types: ['Web Development', 'API Development', 'Database Design'],
    avg_service_price: 150,
    active_services: 3
  };

  useEffect(() => {
    // Simulate API call
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        // In real app, this would be an API call
        // const response = await fetch('/api/provider/profile');
        // const data = await response.json();
        // setProfile(data.data);
        
        // For now, use mock data
        setTimeout(() => {
          setProfile(mockProfile);
          setIsLoading(false);
        }, 1000);
      } catch (_err) {
        setError('Failed to load profile');
        setIsLoading(false);
      }
    };

    loadProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveProfile = async (profileData: ProviderProfileUpdate) => {
    try {
      setIsSaving(true);
      // In real app, this would be an API call
      // const response = await fetch('/api/provider/profile', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(profileData)
      // });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update local state
      if (profile) {
        setProfile({
          ...profile,
          ...profileData
        });
      }
      
      // Show success message
      console.log('Profile saved successfully');
    } catch (err) {
      setError('Failed to save profile');
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Profile</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
              <p className="text-gray-600">Unable to load your profile information.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Overview Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader className="text-center">
              <div className="relative mx-auto mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.avatar_url || '/api/placeholder/150/150'}
                  alt={profile.full_name}
                  className="w-32 h-32 rounded-full object-cover mx-auto"
                />
                {profile.verified_at && (
                  <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white rounded-full p-1">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                )}
              </div>
              <CardTitle className="text-xl">{profile.full_name}</CardTitle>
              <p className="text-gray-600">{profile.email}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Rating */}
              <div className="flex items-center justify-center space-x-2">
                <div className="flex items-center space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(profile.rating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  {profile.rating} ({profile.total_reviews} reviews)
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {profile.completed_bookings}
                  </div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {profile.completion_rate}%
                  </div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
              </div>

              {/* Quick Info */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>Service Area: {profile.service_area_radius}km</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>Response: {profile.response_time_avg}min avg</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span>${profile.hourly_rate}/hr</span>
                </div>
              </div>

              {/* Profile Completion */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Profile Completion</span>
                  <span className="text-sm text-blue-600 font-bold">
                    {profile.profile_completion_score}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${profile.profile_completion_score}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Specializations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Specializations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.specializations.map((spec, index) => (
                  <Badge key={index} variant="secondary">
                    {spec}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Languages */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Languages</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {profile.languages.map((lang, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">{lang}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="certifications">Certifications</TabsTrigger>
              <TabsTrigger value="education">Education</TabsTrigger>
              <TabsTrigger value="edit">Edit Profile</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Professional Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Professional Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">
                    {profile.professional_summary || 'No professional summary available.'}
                  </p>
                </CardContent>
              </Card>

              {/* Bio */}
              <Card>
                <CardHeader>
                  <CardTitle>About Me</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">
                    {profile.bio || 'No bio available.'}
                  </p>
                </CardContent>
              </Card>

              {/* Experience & Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Experience & Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {profile.experience_years}+
                      </div>
                      <div className="text-sm text-gray-600">Years Experience</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {profile.total_bookings}
                      </div>
                      <div className="text-sm text-gray-600">Total Bookings</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">
                        {profile.avg_service_price}
                      </div>
                      <div className="text-sm text-gray-600">Avg Service Price</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Certifications Tab */}
            <TabsContent value="certifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Award className="h-5 w-5" />
                    <span>Certifications</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {profile.certifications.length > 0 ? (
                    <div className="space-y-4">
                      {profile.certifications.map((cert) => (
                        <div key={cert.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-lg">{cert.certification_name}</h4>
                              <p className="text-gray-600">{cert.issuing_organization}</p>
                              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                                {cert.issue_date && (
                                  <span>Issued: {new Date(cert.issue_date).toLocaleDateString()}</span>
                                )}
                                {cert.expiry_date && (
                                  <span>Expires: {new Date(cert.expiry_date).toLocaleDateString()}</span>
                                )}
                              </div>
                            </div>
                            <Badge
                              variant={cert.verification_status === 'verified' ? 'default' : 'secondary'}
                              className="capitalize"
                            >
                              {cert.verification_status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">
                      No certifications added yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Education Tab */}
            <TabsContent value="education" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <GraduationCap className="h-5 w-5" />
                    <span>Education</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {profile.education.length > 0 ? (
                    <div className="space-y-4">
                      {profile.education.map((edu) => (
                        <div key={edu.id} className="border rounded-lg p-4">
                          <h4 className="font-semibold text-lg">{edu.institution_name}</h4>
                          <p className="text-gray-600">
                            {edu.degree_type && (
                              <span className="capitalize">{edu.degree_type}</span>
                            )}
                            {edu.field_of_study && ` in ${edu.field_of_study}`}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {edu.start_year} - {edu.is_current ? 'Present' : edu.end_year}
                          </p>
                          {edu.description && (
                            <p className="text-gray-700 mt-2">{edu.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">
                      No education information added yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Edit Profile Tab */}
            <TabsContent value="edit" className="space-y-6">
              <ProfileEditor
                profile={profile}
                onSave={handleSaveProfile}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
