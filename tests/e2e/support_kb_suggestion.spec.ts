import { test, expect } from '@playwright/test';

test('Resolving a ticket produces a KB suggestion', async ({ request }) => {
  // First seed the KB with test content
  const seedRes = await request.post('/api/test/support/seed_kb');
  expect(seedRes.ok()).toBeTruthy();
  
  // Create a test ticket
  const ticketRes = await request.post('/api/support/chat', {
    data: {
      message: 'I need help with a refund for my booking that was cancelled last minute',
      email: 'test@example.com'
    }
  });
  expect(ticketRes.ok()).toBeTruthy();
  const ticketData = await ticketRes.json();
  const ticketId = ticketData.ticketId;
  expect(ticketId).toBeTruthy();
  
  // Add some conversation messages
  await request.post(`/api/v1/support/tickets/${ticketId}/messages`, {
    headers: { 'x-dev-agent': 'allow' },
    data: { 
      text: 'You can reschedule a booking from your dashboard under "My Bookings" > "Reschedule". Changes allowed up to 24h before start time.',
      public: true
    }
  });
  
  // Resolve the ticket
  const resolveRes = await request.patch(`/api/v1/support/tickets/${ticketId}`, {
    headers: { 'x-dev-agent': 'allow' },
    data: { status: 'resolved' }
  });
  expect(resolveRes.ok()).toBeTruthy();

  // Check for KB suggestion
  const suggestionsRes = await request.get('/api/v1/support/kb/suggestions?status=pending', {
    headers: { 'x-dev-agent': 'allow' }
  });
  expect(suggestionsRes.ok()).toBeTruthy();
  
  const suggestionsData = await suggestionsRes.json();
  expect(suggestionsData.suggestions.length).toBeGreaterThan(0);
  
  // Verify the suggestion has the correct ticket ID and embeddings
  const suggestion = suggestionsData.suggestions.find((s: any) => s.ticket_id === ticketId);
  expect(suggestion).toBeTruthy();
  expect(suggestion.question).toBeTruthy();
  expect(suggestion.answer).toBeTruthy();
  expect(suggestion.q_embedding).toBeTruthy();
  expect(suggestion.a_embedding).toBeTruthy();
});
