import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BookingForm from "@/components/BookingForm";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

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
  });

  it("renders form fields correctly", () => {
    // Mock credits fetch
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            credits: {
              balance_cents: 10000,
              balance_dollars: 100,
            },
          }),
      })
    );

    render(<BookingForm {...defaultProps} />);

    expect(screen.getByText(/test service/i)).toBeInTheDocument();
    expect(screen.getByText(/test vendor/i)).toBeInTheDocument();
    expect(screen.getByText(/60 minutes/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/select date/i)).toBeInTheDocument();
  });

  it("loads and displays available time slots when date is selected", async () => {
    const user = userEvent.setup();
    
    // Mock credits fetch
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            credits: {
              balance_cents: 10000,
              balance_dollars: 100,
            },
          }),
      })
    );

    // Mock slots fetch
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            slots: [
              { id: "1", start: "09:00", end: "10:00", available: true, vendor_id: "vendor-123" },
              { id: "2", start: "10:30", end: "11:30", available: true, vendor_id: "vendor-123" },
            ],
          }),
      })
    );

    render(<BookingForm {...defaultProps} />);

    const dateInput = screen.getByLabelText(/select date/i);
    await user.type(dateInput, "2024-05-01");

    await waitFor(() => {
      expect(screen.getByText("09:00")).toBeInTheDocument();
      expect(screen.getByText("10:30")).toBeInTheDocument();
    });
  });

  it("displays credit balance correctly", async () => {
    // Mock credits fetch with sufficient balance
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            credits: {
              balance_cents: 10000,
              balance_dollars: 100,
            },
          }),
      })
    );

    render(<BookingForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Balance: $100")).toBeInTheDocument();
    });
  });

  it("displays insufficient credit balance correctly", async () => {
    // Mock credits fetch with insufficient balance
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            credits: {
              balance_cents: 1000,
              balance_dollars: 10,
            },
          }),
      })
    );

    render(<BookingForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Balance: $10")).toBeInTheDocument();
    });
    
    // Verify that credits button is present but balance is insufficient
    const creditsButton = screen.getByText(/pay with credits/i);
    expect(creditsButton).toBeInTheDocument();
  });

  it("validates required fields", async () => {
    const user = userEvent.setup();
    
    // Mock credits fetch
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            credits: {
              balance_cents: 10000,
              balance_dollars: 100,
            },
          }),
      })
    );

    // Mock slots fetch for when date is selected
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            slots: [
              { id: "1", start: "09:00", end: "10:00", available: true, vendor_id: "vendor-123" },
              { id: "2", start: "10:30", end: "11:30", available: true, vendor_id: "vendor-123" },
            ],
          }),
      })
    );
    
    render(<BookingForm {...defaultProps} />);

    // Submit empty form
    const submitButton = screen.getByRole("button", { name: /confirm booking/i });
    await user.click(submitButton);

    // Should show error for all required fields
    await waitFor(() => {
      const errorMessage = screen.getByRole("alert");
      expect(errorMessage).toHaveTextContent("Please fill in all required fields");
      expect(errorMessage).toHaveTextContent("date, time slot, full name, email");
    });

    // Fill only name and email
    await user.type(screen.getByLabelText(/full name/i), "Test Customer");
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    
    await user.click(submitButton);

    // Should show error for missing date and time
    await waitFor(() => {
      const errorMessage = screen.getByRole("alert");
      expect(errorMessage).toHaveTextContent("Please fill in all required fields");
      expect(errorMessage).toHaveTextContent("date, time slot");
    });

    // Fill date but no time slot
    const dateInput = screen.getByLabelText(/select date/i);
    await user.type(dateInput, "2024-05-01");

    await user.click(submitButton);

    // Should show error for missing time slot
    await waitFor(() => {
      const errorMessage = screen.getByRole("alert");
      expect(errorMessage).toHaveTextContent("Please fill in all required fields");
      expect(errorMessage).toHaveTextContent("time slot");
    });

    // Verify that time slots are loaded
    await waitFor(() => {
      expect(screen.getByText("09:00")).toBeInTheDocument();
    });
  });
});
