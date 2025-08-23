import { describe, it, expect, vi } from 'vitest';
import { generateBookingConfirmationEmail, generateSimpleEmailTemplate } from '@/lib/emailTemplates';

describe('Email System', () => {
  describe('Email Templates', () => {
    it('should generate booking confirmation email with all data', () => {
      const bookingData = {
        customerName: 'John Doe',
        vendorName: 'Acme Services',
        serviceName: 'Haircut',
        slotStart: '2024-01-15T10:00:00Z',
        slotEnd: '2024-01-15T11:00:00Z',
        totalAmount: '$50.00',
        bookingId: 'booking_123',
        vendorAddress: '123 Main St, City',
        notes: 'Please arrive 10 minutes early'
      };

      const emailHtml = generateBookingConfirmationEmail(bookingData);

      expect(emailHtml).toContain('John Doe');
      expect(emailHtml).toContain('Acme Services');
      expect(emailHtml).toContain('Haircut');
      expect(emailHtml).toContain('$50.00');
      expect(emailHtml).toContain('booking_123');
      expect(emailHtml).toContain('123 Main St, City');
      expect(emailHtml).toContain('Please arrive 10 minutes early');
      expect(emailHtml).toContain('🎉 Booking Confirmed!');
    });

    it('should generate booking confirmation email without optional fields', () => {
      const bookingData = {
        customerName: 'Jane Smith',
        vendorName: 'Quick Fix',
        serviceName: 'Massage',
        slotStart: '2024-01-16T14:00:00Z',
        slotEnd: '2024-01-16T15:00:00Z',
        totalAmount: '$75.00',
        bookingId: 'booking_456'
      };

      const emailHtml = generateBookingConfirmationEmail(bookingData);

      expect(emailHtml).toContain('Jane Smith');
      expect(emailHtml).toContain('Quick Fix');
      expect(emailHtml).toContain('Massage');
      expect(emailHtml).toContain('$75.00');
      expect(emailHtml).toContain('booking_456');
      expect(emailHtml).not.toContain('Location:');
      expect(emailHtml).not.toContain('Notes:');
    });

    it('should generate simple email template', () => {
      const subject = 'Welcome to Bookiji';
      const content = '<p>Thank you for joining our platform!</p>';

      const emailHtml = generateSimpleEmailTemplate(subject, content);

      expect(emailHtml).toContain('Welcome to Bookiji');
      expect(emailHtml).toContain('<p>Thank you for joining our platform!</p>');
      expect(emailHtml).toContain('Bookiji');
    });
  });

  describe('Email Template Styling', () => {
    it('should include responsive design elements', () => {
      const bookingData = {
        customerName: 'Test User',
        vendorName: 'Test Vendor',
        serviceName: 'Test Service',
        slotStart: '2024-01-15T10:00:00Z',
        slotEnd: '2024-01-15T11:00:00Z',
        totalAmount: '$100.00',
        bookingId: 'test_booking'
      };

      const emailHtml = generateBookingConfirmationEmail(bookingData);

      // Check for responsive design
      expect(emailHtml).toContain('viewport');
      expect(emailHtml).toContain('max-width: 600px');
      expect(emailHtml).toContain('border-radius');
      expect(emailHtml).toContain('linear-gradient');
    });

    it('should include proper HTML structure', () => {
      const emailHtml = generateSimpleEmailTemplate('Test', '<p>Content</p>');

      expect(emailHtml).toContain('<!DOCTYPE html>');
      expect(emailHtml).toContain('<html>');
      expect(emailHtml).toContain('<head>');
      expect(emailHtml).toContain('<body>');
      expect(emailHtml).toContain('</html>');
    });
  });

});

