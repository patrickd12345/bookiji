import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import BookingForm from "@/components/BookingForm";

// Mock all the complex dependencies to avoid memory issues
vi.mock('@/hooks/useAsyncState', () => ({
  useAsyncOperation: () => ({
    run: vi.fn(),
    isLoading: false,
    error: null,
    data: null
  })
}));

vi.mock('@/components/guided-tours/GuidedTourProvider', () => ({
  useGuidedTour: () => ({
    startTour: vi.fn(),
    hasCompletedTour: () => true
  })
}));

vi.mock('@/tours/customerBooking', () => ({
  customerBookingSteps: [],
  customerBookingTourId: 'test-tour'
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock("@/components/ui/form", () => ({
  Form: ({ children }: any) => <form>{children}</form>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: any) => <select>{children}</select>,
  SelectItem: ({ children }: any) => <option>{children}</option>,
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock scrollIntoView to prevent test errors
Object.defineProperty(window, 'scrollIntoView', {
  writable: true,
  value: vi.fn(),
});

// Mock scrollIntoView on HTMLElement prototype to prevent test errors
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  writable: true,
  value: vi.fn(),
});

describe("BookingForm", () => {
  const defaultProps = {
    vendorId: "vendor-123",
    vendorName: "Test Vendor",
    serviceName: "Test Service",
    serviceDuration: 60,
    servicePriceCents: 5000,
    onBookingComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful credits fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        credits: { balance_cents: 10000, balance_dollars: 100 }
      })
    });
  });

  it("renders form fields correctly", () => {
    render(<BookingForm {...defaultProps} />);
    
    // Check for the heading text (split across elements)
    expect(screen.getByText(/test service/i)).toBeInTheDocument();
    
    // Check for provider info
    expect(screen.getByText(/provider:/i)).toBeInTheDocument();
    expect(screen.getByText(/test vendor/i)).toBeInTheDocument();
    
    // Check for form labels
    expect(screen.getByText("Full Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Date")).toBeInTheDocument();
  });

  it("displays service information correctly", () => {
    render(<BookingForm {...defaultProps} />);
    
    // Check for the heading text (split across elements)
    expect(screen.getByText(/test service/i)).toBeInTheDocument();
    
    // Check for provider info
    expect(screen.getByText(/provider:/i)).toBeInTheDocument();
    expect(screen.getByText(/test vendor/i)).toBeInTheDocument();
    
    // Check for total price
    expect(screen.getByText("Total Price:")).toBeInTheDocument();
    expect(screen.getByText("$50.00")).toBeInTheDocument();
  });

  it("renders all required form inputs", () => {
    render(<BookingForm {...defaultProps} />);
    
    // Check that the inputs exist by looking for their labels
    expect(screen.getByText("Full Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Phone (Optional)")).toBeInTheDocument();
    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Notes (Optional)")).toBeInTheDocument();
  });

  it("renders payment method options", () => {
    render(<BookingForm {...defaultProps} />);
    
    expect(screen.getByText("Credit/Debit Card")).toBeInTheDocument();
    expect(screen.getByText("Credits ($0.00)")).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<BookingForm {...defaultProps} />);
    
    expect(screen.getByRole("button", { name: /book appointment/i })).toBeInTheDocument();
  });
});
