import { describe, it, expect, vi, beforeEach } from 'vitest';
import { qaFromTranscript } from '@/lib/support/summarize';

// Mock fetch for testing
vi.mock('global.fetch', () => ({
  default: vi.fn()
}));

describe('QA from Transcript', () => {
  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();
    
    // Mock environment variables
    process.env.OPENAI_API_KEY = 'test-key';
    
    // Mock fetch response for test environment
    global.fetch = vi.fn().mockImplementation(() => 
      Promise.resolve({
        json: () => Promise.resolve({
          choices: [
            {
              message: {
                content: 'Q: How do I reschedule a booking?\nA: You can reschedule a booking through your account dashboard. Navigate to "My Bookings", find the appointment you want to change, and click "Reschedule". You can select a new date and time from the available slots. Changes must be made at least 24 hours before your appointment.'
              }
            }
          ]
        })
      })
    );
  });
  
  it('extracts Q&A from transcript', async () => {
    const transcript = [
      { role: 'user' as const, text: 'I need to change my appointment time. How do I do that?' },
      { role: 'assistant' as const, text: 'You can reschedule through your dashboard. When do you want to move it to?' },
      { role: 'user' as const, text: 'Next Tuesday at 2pm' },
      { role: 'agent' as const, text: 'I can help you reschedule. You need to go to My Bookings and click Reschedule. Please note changes must be made 24h in advance.' }
    ];
    
    const result = await qaFromTranscript(transcript);
    
    expect(result.question).toBe('How do I reschedule a booking?');
    expect(result.answer).toContain('You can reschedule a booking through your account dashboard');
    expect(result.answer).toContain('at least 24 hours before your appointment');
  });
  
  it('handles empty transcript', async () => {
    const result = await qaFromTranscript([]);
    expect(result.question).toBeTruthy();
    expect(result.answer).toBeTruthy();
  });
  
  it('properly formats API request', async () => {
    const transcript = [
      { role: 'user' as const, text: 'How do I cancel?' },
      { role: 'agent' as const, text: 'Go to dashboard and click Cancel' }
    ];
    
    await qaFromTranscript(transcript);
    
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'content-type': 'application/json',
          authorization: 'Bearer test-key'
        }),
        body: expect.stringContaining('USER: How do I cancel?')
      })
    );
  });
});
