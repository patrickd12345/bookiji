'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Award, 
  GraduationCap, 
  Briefcase, 
  Globe, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { 
  RichProviderProfile, 
  ProviderProfileUpdate,
  CertificationRequest,
  EducationRequest,
  PortfolioRequest,
  LanguageRequest,
  LANGUAGE_PROFICIENCY_LEVELS,
  DEGREE_TYPES
} from '@/types/provider';

interface ProfileEditorProps {
  profile?: RichProviderProfile;
  onSave?: (profile: ProviderProfileUpdate) => void;
  className?: string;
}

export default function ProfileEditor({ profile, onSave, className = '' }: ProfileEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ProviderProfileUpdate>({
    bio: '',
    portfolio_images: [],
    specializations: [],
    experience_years: 0,
    hourly_rate: 0,
    professional_summary: '',
    service_area_radius: 10,
    social_links: {}
  });

  const [certifications, setCertifications] = useState<CertificationRequest[]>([]);
  const [education, setEducation] = useState<EducationRequest[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioRequest[]>([]);
  const [languages, setLanguages] = useState<LanguageRequest[]>([]);

  const [newCertification, setNewCertification] = useState<CertificationRequest>({
    certification_name: '',
    issuing_organization: '',
    issue_date: '',
    expiry_date: '',
    certificate_number: '',
    certificate_url: ''
  });

  const [newEducation, setNewEducation] = useState<EducationRequest>({
    institution_name: '',
    degree_type: 'bachelor',
    field_of_study: '',
    start_year: new Date().getFullYear(),
    end_year: new Date().getFullYear(),
    is_current: false,
    description: ''
  });

  const [newPortfolio, setNewPortfolio] = useState<PortfolioRequest>({
    title: '',
    description: '',
    service_type: '',
    images: [],
    project_date: '',
    client_name: '',
    project_duration: '',
    technologies_used: [],
    is_featured: false,
    display_order: 0
  });

  const [newLanguage, setNewLanguage] = useState<LanguageRequest>({
    language_code: '',
    language_name: '',
    proficiency_level: 'fluent',
    is_primary: false
  });

  const [newSpecialization, setNewSpecialization] = useState('');
  const [newTechnology, setNewTechnology] = useState('');

  useEffect(() => {
    if (profile) {
      setFormData({
        bio: profile.bio || '',
        portfolio_images: profile.portfolio_images || [],
        specializations: profile.specializations || [],
        experience_years: profile.experience_years || 0,
        hourly_rate: profile.hourly_rate || 0,
        professional_summary: profile.professional_summary || '',
        service_area_radius: profile.service_area_radius || 10,
        social_links: profile.social_links || {}
      });

      // Initialize related data from profile
      if (profile.certifications) {
        setCertifications(profile.certifications.map(c => ({
          certification_name: c.certification_name,
          issuing_organization: c.issuing_organization,
          issue_date: c.issue_date || '',
          expiry_date: c.expiry_date || '',
          certificate_number: c.certificate_number || '',
          certificate_url: c.certificate_url || ''
        })));
      }

      if (profile.education) {
        setEducation(profile.education.map(e => ({
          institution_name: e.institution_name,
          degree_type: e.degree_type || 'bachelor',
          field_of_study: e.field_of_study || '',
          start_year: e.start_year || new Date().getFullYear(),
          end_year: e.end_year || new Date().getFullYear(),
          is_current: e.is_current || false,
          description: e.description || ''
        })));
      }

      // Note: Portfolio data would come from a separate portfolio table
      // For now, we'll initialize with empty array
      setPortfolio([]);

      if (profile.languages) {
        setLanguages(profile.languages.map(l => ({
          language_code: l,
          language_name: l,
          proficiency_level: 'fluent',
          is_primary: false
        })));
      }
    }
  }, [profile]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (onSave) {
        await onSave(formData);
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addSpecialization = () => {
    if (newSpecialization.trim() && !formData.specializations?.includes(newSpecialization.trim())) {
      setFormData(prev => ({
        ...prev,
        specializations: [...(prev.specializations || []), newSpecialization.trim()]
      }));
      setNewSpecialization('');
    }
  };

  const removeSpecialization = (spec: string) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations?.filter(s => s !== spec) || []
    }));
  };

  const addCertification = () => {
    if (newCertification.certification_name && newCertification.issuing_organization) {
      setCertifications(prev => [...prev, { ...newCertification }]);
      setNewCertification({
        certification_name: '',
        issuing_organization: '',
        issue_date: '',
        expiry_date: '',
        certificate_number: '',
        certificate_url: ''
      });
    }
  };

  const removeCertification = (index: number) => {
    setCertifications(prev => prev.filter((_, i) => i !== index));
  };

  const addEducation = () => {
    if (newEducation.institution_name) {
      setEducation(prev => [...prev, { ...newEducation }]);
      setNewEducation({
        institution_name: '',
        degree_type: 'bachelor',
        field_of_study: '',
        start_year: new Date().getFullYear(),
        end_year: new Date().getFullYear(),
        is_current: false,
        description: ''
      });
    }
  };

  const removeEducation = (index: number) => {
    setEducation(prev => prev.filter((_, i) => i !== index));
  };

  const addPortfolio = () => {
    if (newPortfolio.title) {
      setPortfolio(prev => [...prev, { ...newPortfolio, display_order: prev.length }]);
      setNewPortfolio({
        title: '',
        description: '',
        service_type: '',
        images: [],
        project_date: '',
        client_name: '',
        project_duration: '',
        technologies_used: [],
        is_featured: false,
        display_order: 0
      });
    }
  };

  const removePortfolio = (index: number) => {
    setPortfolio(prev => prev.filter((_, i) => i !== index));
  };

  const addTechnology = (portfolioIndex: number) => {
    if (newTechnology.trim()) {
      setPortfolio(prev => prev.map((p, i) => 
        i === portfolioIndex 
          ? { ...p, technologies_used: [...(p.technologies_used || []), newTechnology.trim()] }
          : p
      ));
      setNewTechnology('');
    }
  };

  const _removeTechnology = (portfolioIndex: number, techIndex: number) => {
    setPortfolio(prev => prev.map((p, i) => 
      i === portfolioIndex 
        ? { ...p, technologies_used: (p.technologies_used || []).filter((_, ti) => ti !== techIndex) }
        : p
    ));
  };

  const addLanguage = () => {
    if (newLanguage.language_name) {
      setLanguages(prev => [...prev, { ...newLanguage }]);
      setNewLanguage({
        language_code: '',
        language_name: '',
        proficiency_level: 'fluent',
        is_primary: false
      });
    }
  };

  const removeLanguage = (index: number) => {
    setLanguages(prev => prev.filter((_, i) => i !== index));
  };

  const calculateProfileScore = (): number => {
    let score = 0;
    
    // Basic info (40 points)
    if (formData.bio) score += 10;
    if (formData.professional_summary) score += 10;
    if ((formData.experience_years || 0) > 0) score += 5;
    if ((formData.hourly_rate || 0) > 0) score += 5;
    if ((formData.service_area_radius || 0) > 0) score += 5;
    if (profile?.avatar_url) score += 5;
    
    // Specializations and languages (20 points)
    if (formData.specializations && formData.specializations.length > 0) score += 10;
    if (languages.length > 0) score += 10;
    
    // Portfolio images (10 points)
    if (formData.portfolio_images && formData.portfolio_images.length > 0) score += 10;
    
    // Certifications (10 points)
    if (certifications.length > 0) score += 10;
    
    // Education (5 points)
    if (education.length > 0) score += 5;
    
    // Portfolio projects (5 points)
    if (portfolio.length > 0) score += 5;
    
    return Math.min(score, 100);
  };

  const profileScore = calculateProfileScore();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Profile Completion Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <span>Profile Completion</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${profileScore}%` }}
                ></div>
              </div>
            </div>
            <span className="text-lg font-bold text-blue-600">{profileScore}%</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Complete your profile to increase visibility and trust with potential clients
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="certifications">Certifications</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="languages">Languages</TabsTrigger>
        </TabsList>

        {/* Basic Information Tab */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Basic Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Professional Summary</label>
                <Textarea
                  value={formData.professional_summary || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, professional_summary: e.target.value }))}
                  placeholder="Tell potential clients about your expertise and what makes you unique..."
                  rows={4}
                  disabled={!isEditing}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Bio</label>
                <Textarea
                  value={formData.bio || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Share your story, passion, and approach to your work..."
                  rows={3}
                  disabled={!isEditing}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Years of Experience</label>
                  <Input
                    type="number"
                    value={formData.experience_years || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, experience_years: parseInt(e.target.value) || 0 }))}
                    min="0"
                    max="50"
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Hourly Rate ($)</label>
                  <Input
                    type="number"
                    value={formData.hourly_rate || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    step="0.01"
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Service Area Radius (km)</label>
                <Input
                  type="number"
                  value={formData.service_area_radius || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, service_area_radius: parseInt(e.target.value) || 10 }))}
                  min="1"
                  max="100"
                  disabled={!isEditing}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Specializations</label>
                <div className="flex space-x-2 mb-2">
                  <Input
                    value={newSpecialization}
                    onChange={(e) => setNewSpecialization(e.target.value)}
                    placeholder="Add a specialization..."
                    disabled={!isEditing}
                  />
                  <Button 
                    onClick={addSpecialization} 
                    disabled={!isEditing || !newSpecialization.trim()}
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.specializations?.map((spec, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                      <span>{spec}</span>
                      {isEditing && (
                        <button
                          onClick={() => removeSpecialization(spec)}
                          className="ml-1 hover:text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
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
            <CardContent className="space-y-4">
              {/* Add New Certification */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium mb-3">Add New Certification</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Certification Name"
                    value={newCertification.certification_name}
                    onChange={(e) => setNewCertification(prev => ({ ...prev, certification_name: e.target.value }))}
                  />
                  <Input
                    placeholder="Issuing Organization"
                    value={newCertification.issuing_organization}
                    onChange={(e) => setNewCertification(prev => ({ ...prev, issuing_organization: e.target.value }))}
                  />
                  <Input
                    type="date"
                    placeholder="Issue Date"
                    value={newCertification.issue_date}
                    onChange={(e) => setNewCertification(prev => ({ ...prev, issue_date: e.target.value }))}
                  />
                  <Input
                    type="date"
                    placeholder="Expiry Date"
                    value={newCertification.expiry_date}
                    onChange={(e) => setNewCertification(prev => ({ ...prev, expiry_date: e.target.value }))}
                  />
                  <Input
                    placeholder="Certificate Number"
                    value={newCertification.certificate_number}
                    onChange={(e) => setNewCertification(prev => ({ ...prev, certificate_number: e.target.value }))}
                  />
                  <Input
                    placeholder="Certificate URL"
                    value={newCertification.certificate_url}
                    onChange={(e) => setNewCertification(prev => ({ ...prev, certificate_url: e.target.value }))}
                  />
                </div>
                <Button onClick={addCertification} className="mt-3" disabled={!newCertification.certification_name || !newCertification.issuing_organization}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Certification
                </Button>
              </div>

              {/* Existing Certifications */}
              <div className="space-y-3">
                {certifications.map((cert, index) => (
                  <div key={index} className="border rounded-lg p-3 flex justify-between items-start">
                    <div>
                      <h5 className="font-medium">{cert.certification_name}</h5>
                      <p className="text-sm text-gray-600">{cert.issuing_organization}</p>
                      <p className="text-xs text-gray-500">
                        {cert.issue_date && `Issued: ${cert.issue_date}`}
                        {cert.expiry_date && ` • Expires: ${cert.expiry_date}`}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeCertification(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
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
            <CardContent className="space-y-4">
              {/* Add New Education */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium mb-3">Add New Education</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Institution Name"
                    value={newEducation.institution_name}
                    onChange={(e) => setNewEducation(prev => ({ ...prev, institution_name: e.target.value }))}
                  />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Select value={newEducation.degree_type} onValueChange={(value) => setNewEducation(prev => ({ ...prev, degree_type: value as any }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Degree Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEGREE_TYPES.map(degree => (
                        <SelectItem key={degree.value} value={degree.value}>
                          {degree.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Field of Study"
                    value={newEducation.field_of_study}
                    onChange={(e) => setNewEducation(prev => ({ ...prev, field_of_study: e.target.value }))}
                  />
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      placeholder="Start Year"
                      value={newEducation.start_year || ''}
                      onChange={(e) => setNewEducation(prev => ({ ...prev, start_year: parseInt(e.target.value) || new Date().getFullYear() }))}
                    />
                    <Input
                      type="number"
                      placeholder="End Year"
                      value={newEducation.end_year || ''}
                      onChange={(e) => setNewEducation(prev => ({ ...prev, end_year: parseInt(e.target.value) || new Date().getFullYear() }))}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isCurrent"
                      checked={newEducation.is_current}
                      onChange={(e) => setNewEducation(prev => ({ ...prev, is_current: e.target.checked }))}
                    />
                    <label htmlFor="isCurrent" className="text-sm">Currently studying</label>
                  </div>
                </div>
                <Textarea
                  placeholder="Description (optional)"
                  value={newEducation.description || ''}
                  onChange={(e) => setNewEducation(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-3"
                  rows={2}
                />
                <Button onClick={addEducation} className="mt-3" disabled={!newEducation.institution_name}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Education
                </Button>
              </div>

              {/* Existing Education */}
              <div className="space-y-3">
                {education.map((edu, index) => (
                  <div key={index} className="border rounded-lg p-3 flex justify-between items-start">
                    <div>
                      <h5 className="font-medium">{edu.institution_name}</h5>
                      <p className="text-sm text-gray-600">
                        {edu.degree_type && DEGREE_TYPES.find(d => d.value === edu.degree_type)?.label}
                        {edu.field_of_study && ` in ${edu.field_of_study}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {edu.start_year} - {edu.is_current ? 'Present' : edu.end_year}
                      </p>
                      {edu.description && <p className="text-sm mt-1">{edu.description}</p>}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeEducation(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Briefcase className="h-5 w-5" />
                <span>Portfolio</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Portfolio Item */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium mb-3">Add New Portfolio Item</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Project Title"
                    value={newPortfolio.title}
                    onChange={(e) => setNewPortfolio(prev => ({ ...prev, title: e.target.value }))}
                  />
                  <Input
                    placeholder="Service Type"
                    value={newPortfolio.service_type}
                    onChange={(e) => setNewPortfolio(prev => ({ ...prev, service_type: e.target.value }))}
                  />
                  <Input
                    type="date"
                    placeholder="Project Date"
                    value={newPortfolio.project_date}
                    onChange={(e) => setNewPortfolio(prev => ({ ...prev, project_date: e.target.value }))}
                  />
                  <Input
                    placeholder="Project Duration"
                    value={newPortfolio.project_duration}
                    onChange={(e) => setNewPortfolio(prev => ({ ...prev, project_duration: e.target.value }))}
                  />
                  <Input
                    placeholder="Client Name (optional)"
                    value={newPortfolio.client_name}
                    onChange={(e) => setNewPortfolio(prev => ({ ...prev, client_name: e.target.value }))}
                  />
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isFeatured"
                      checked={newPortfolio.is_featured}
                      onChange={(e) => setNewPortfolio(prev => ({ ...prev, is_featured: e.target.checked }))}
                    />
                    <label htmlFor="isFeatured" className="text-sm">Featured project</label>
                  </div>
                </div>
                <Textarea
                  placeholder="Project Description"
                  value={newPortfolio.description || ''}
                  onChange={(e) => setNewPortfolio(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-3"
                  rows={2}
                />
                <div className="mt-3">
                  <label className="block text-sm font-medium mb-2">Technologies Used</label>
                  <div className="flex space-x-2 mb-2">
                    <Input
                      value={newTechnology}
                      onChange={(e) => setNewTechnology(e.target.value)}
                      placeholder="Add technology..."
                    />
                    <Button 
                      onClick={() => addTechnology(-1)} 
                      disabled={!newTechnology.trim()}
                      size="sm"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(newPortfolio.technologies_used || []).map((tech, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                        <span>{tech}</span>
                        <button
                          onClick={() => setNewPortfolio(prev => ({ 
                            ...prev, 
                            technologies_used: (prev.technologies_used || []).filter((_, i) => i !== index) 
                          }))}
                          className="ml-1 hover:text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button onClick={addPortfolio} className="mt-3" disabled={!newPortfolio.title}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Portfolio Item
                </Button>
              </div>

              {/* Existing Portfolio */}
              <div className="space-y-3">
                {portfolio.map((item, index) => (
                  <div key={index} className="border rounded-lg p-3 flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h5 className="font-medium">{item.title}</h5>
                        {item.is_featured && (
                          <Badge variant="default" className="text-xs">Featured</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{item.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {item.service_type && `${item.service_type} • `}
                        {item.project_date && `${item.project_date} • `}
                        {item.project_duration && `${item.project_duration}`}
                      </p>
                      {(item.technologies_used || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(item.technologies_used || []).map((tech, techIndex) => (
                            <Badge key={techIndex} variant="outline" className="text-xs">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removePortfolio(index)}
                      className="text-red-500 hover:text-red-700 ml-3"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Languages Tab */}
        <TabsContent value="languages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Languages</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Language */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium mb-3">Add New Language</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    placeholder="Language Name"
                    value={newLanguage.language_name}
                    onChange={(e) => setNewLanguage(prev => ({ 
                      ...prev, 
                      language_name: e.target.value,
                      language_code: e.target.value.toLowerCase().substring(0, 2)
                    }))}
                  />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Select value={newLanguage.proficiency_level} onValueChange={(value) => setNewLanguage(prev => ({ ...prev, proficiency_level: value as any }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Proficiency Level" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_PROFICIENCY_LEVELS.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isPrimary"
                      checked={newLanguage.is_primary}
                      onChange={(e) => setNewLanguage(prev => ({ ...prev, is_primary: e.target.checked }))}
                    />
                    <label htmlFor="isPrimary" className="text-sm">Primary language</label>
                  </div>
                </div>
                <Button onClick={addLanguage} className="mt-3" disabled={!newLanguage.language_name}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Language
                </Button>
              </div>

              {/* Existing Languages */}
              <div className="space-y-3">
                {languages.map((lang, index) => (
                  <div key={index} className="border rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <h5 className="font-medium">{lang.language_name}</h5>
                      <p className="text-sm text-gray-600">
                        {LANGUAGE_PROFICIENCY_LEVELS.find(l => l.value === lang.proficiency_level)?.label}
                        {lang.is_primary && ' • Primary'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeLanguage(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? (
                <>
                  <AlertCircle className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Profile
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
