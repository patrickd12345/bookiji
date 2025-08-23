import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ProfileEditor from '@/components/provider/ProfileEditor';
import { RichProviderProfile } from '@/types/provider';

// Mock the UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`card ${className || ''}`}>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div className="card-content">{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div className="card-header">{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3 className="card-title">{children}</h3>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={`button ${variant || ''} ${size || ''} ${className || ''}`}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, type, min, max, step, disabled }: any) => (
    <input
      type={type || 'text'}
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className="input"
    />
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder, rows, disabled }: any) => (
    <textarea
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className="textarea"
    />
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select value={value} onChange={(e) => onValueChange?.(e.target.value)} className="select">
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div className="select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value} className="select-item">{children}</option>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div className="select-trigger">{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <div className="select-value">{placeholder}</div>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant || ''} ${className || ''}`}>
      {children}
    </span>
  ),
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue }: any) => (
    <div className="tabs" data-default-value={defaultValue}>{children}</div>
  ),
  TabsContent: ({ children, value }: any) => (
    <div className="tabs-content" data-value={value}>{children}</div>
  ),
  TabsList: ({ children, className }: any) => (
    <div className={`tabs-list ${className || ''}`}>{children}</div>
  ),
  TabsTrigger: ({ children, value }: any) => (
    <button className="tabs-trigger" data-value={value}>{children}</button>
  ),
}));

const mockProfile: RichProviderProfile = {
  id: '1',
  full_name: 'John Doe',
  email: 'john@example.com',
  bio: 'Experienced developer',
  portfolio_images: [],
  certifications: [],
  languages: ['English'],
  specializations: ['React', 'Node.js'],
  experience_years: 5,
  hourly_rate: 75,
  availability_schedule: {},
  education: [],
  professional_summary: 'Full-stack developer',
  service_area_radius: 25,
  verification_documents: [],
  social_links: {},
  response_time_avg: 15,
  completion_rate: 95,
  profile_completion_score: 80,
  rating: 4.8,
  created_at: '2020-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  total_bookings: 100,
  completed_bookings: 98,
  total_reviews: 50,
  avg_review_rating: 4.8,
  certification_count: 0,
  education_count: 0,
  portfolio_count: 0,
  language_count: 1,
  last_booking_date: '2024-01-15T00:00:00Z',
  last_review_date: '2024-01-10T00:00:00Z',
  service_types: ['Web Development'],
  avg_service_price: 150,
  active_services: 2
};

describe('ProfileEditor', () => {
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ProfileEditor profile={mockProfile} onSave={mockOnSave} />);
    expect(screen.getByText('Profile Completion')).toBeInTheDocument();
  });

  it('displays profile completion score', () => {
    render(<ProfileEditor profile={mockProfile} onSave={mockOnSave} />);
    // The score is calculated dynamically, so we just check that a percentage is displayed
    expect(screen.getByText(/\d+%/)).toBeInTheDocument();
  });

  it('shows edit button when not editing', () => {
    render(<ProfileEditor profile={mockProfile} onSave={mockOnSave} />);
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
  });

  it('switches to edit mode when edit button is clicked', async () => {
    render(<ProfileEditor profile={mockProfile} onSave={mockOnSave} />);
    
    const editButton = screen.getByText('Edit Profile');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('Save Profile')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  it('displays basic information tab content', () => {
    render(<ProfileEditor profile={mockProfile} onSave={mockOnSave} />);
    
    expect(screen.getByText('Basic Info')).toBeInTheDocument();
    expect(screen.getByText('Professional Summary')).toBeInTheDocument();
    expect(screen.getByText('Bio')).toBeInTheDocument();
  });

  it('displays certifications tab content', () => {
    render(<ProfileEditor profile={mockProfile} onSave={mockOnSave} />);
    
    // Check for the tab trigger
    expect(screen.getByText('Certifications', { selector: 'button' })).toBeInTheDocument();
    // Check for the content (this will be in the tab content area)
    expect(screen.getByText('Add New Certification')).toBeInTheDocument();
  });

  it('displays education tab content', () => {
    render(<ProfileEditor profile={mockProfile} onSave={mockOnSave} />);
    
    // Check for the tab trigger
    expect(screen.getByText('Education', { selector: 'button' })).toBeInTheDocument();
    // Check for the content (this will be in the tab content area)
    expect(screen.getByText('Add New Education')).toBeInTheDocument();
  });

  it('displays portfolio tab content', () => {
    render(<ProfileEditor profile={mockProfile} onSave={mockOnSave} />);
    
    // Check for the tab trigger
    expect(screen.getByText('Portfolio', { selector: 'button' })).toBeInTheDocument();
    // Check for the content (this will be in the tab content area)
    expect(screen.getByText('Add New Portfolio Item')).toBeInTheDocument();
  });

  it('displays languages tab content', () => {
    render(<ProfileEditor profile={mockProfile} onSave={mockOnSave} />);
    
    // Check for the tab trigger
    expect(screen.getByText('Languages', { selector: 'button' })).toBeInTheDocument();
    // Check for the content (this will be in the tab content area)
    expect(screen.getByText('Add New Language')).toBeInTheDocument();
  });

  it('allows adding specializations in edit mode', async () => {
    render(<ProfileEditor profile={mockProfile} onSave={mockOnSave} />);
    
    // Enter edit mode
    const editButton = screen.getByText('Edit Profile');
    fireEvent.click(editButton);

    await waitFor(() => {
      const specializationInput = screen.getByPlaceholderText('Add a specialization...');
      expect(specializationInput).toBeInTheDocument();
    });
  });

  it('calls onSave when save button is clicked', async () => {
    render(<ProfileEditor profile={mockProfile} onSave={mockOnSave} />);
    
    // Enter edit mode
    const editButton = screen.getByText('Edit Profile');
    fireEvent.click(editButton);

    await waitFor(() => {
      const saveButton = screen.getByText('Save Profile');
      fireEvent.click(saveButton);
    });

    expect(mockOnSave).toHaveBeenCalled();
  });

  it('renders without profile prop', () => {
    render(<ProfileEditor onSave={mockOnSave} />);
    expect(screen.getByText('Profile Completion')).toBeInTheDocument();
  });

  it('renders without onSave prop', () => {
    render(<ProfileEditor profile={mockProfile} />);
    expect(screen.getByText('Profile Completion')).toBeInTheDocument();
  });
});
