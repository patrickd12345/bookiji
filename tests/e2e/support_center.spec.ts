import { test, expect } from '@playwright/test';

test.describe('Support Center E2E', () => {
  test('Help center and support access works', async ({ page, request }) => {
    // Seed KB for testing
    await request.post('/api/test/support/seed_kb');
    await page.goto('/');
    
    // Look for the help center tour button (bottom right floating button)
    const tourButton = page.locator('button[title="Open Help Center"]');
    await expect(tourButton).toBeVisible();
    
    // Click the tour button to open tour modal
    await tourButton.click();
    
    // Should show tour modal or start tour functionality
    // Since this is a tour button, we'll verify it's working by checking for tour-related elements
    const tourElements = page.locator('text=/tour|guided|help/i');
    await expect(tourElements.first()).toBeVisible({ timeout: 10000 });
  });

  test('Complete support ticket lifecycle with KB suggestions', async ({ page, request }) => {
    // Create a ticket first
    const chatResponse = await request.post('/api/support/chat', {
      data: {
        message: 'Test message for ticket creation',
        email: 'test@example.com'
      }
    });
    
    expect(chatResponse.ok()).toBeTruthy();
    const chatData = await chatResponse.json();
    expect(chatData.escalated).toBeTruthy();
    expect(chatData.ticketId).toBeDefined();
    
    const ticketId = chatData.ticketId;
    console.log('Created ticket:', ticketId);
    
    // Step 2: Resolve the ticket (simulate agent action)
    // Add a small delay to ensure ticket is fully created
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const resolveResponse = await request.patch(`/api/v1/support/tickets/${ticketId}`, {
      data: { status: 'resolved' },
      headers: { 'x-dev-agent': 'allow' }
    });
    
    console.log('Resolve response status:', resolveResponse.status());
    console.log('Resolve response body:', await resolveResponse.text());
    
    expect(resolveResponse.ok()).toBeTruthy();
    
    // Step 3: Check that KB suggestion was created
    const suggestionsResponse = await request.get('/api/v1/support/kb/suggestions?status=pending', {
      headers: { 'x-dev-agent': 'allow' }
    });
    
    expect(suggestionsResponse.ok()).toBeTruthy();
    const suggestionsData = await suggestionsResponse.json();
    expect(suggestionsData.suggestions).toBeDefined();
    expect(suggestionsData.suggestions.length).toBeGreaterThan(0);
    
    // Find our suggestion
    const ourSuggestion = suggestionsData.suggestions.find((s: any) => s.ticket_id === ticketId);
    expect(ourSuggestion).toBeDefined();
    
    // Step 4: Approve the suggestion to create a new KB article
    const approveResponse = await request.patch(`/api/v1/support/kb/suggestions/${ourSuggestion.id}`, {
      data: { action: 'approve' },
      headers: { 'x-dev-agent': 'allow' }
    });
    
    expect(approveResponse.ok()).toBeTruthy();
    
    // Step 5: Verify the suggestion is now approved
    const updatedSuggestionsResponse = await request.get('/api/v1/support/kb/suggestions?status=approved', {
      headers: { 'x-dev-agent': 'allow' }
    });
    
    expect(updatedSuggestionsResponse.ok()).toBeTruthy();
    const updatedData = await updatedSuggestionsResponse.json();
    const approvedSuggestion = updatedData.suggestions.find((s: any) => s.id === ourSuggestion.id);
    expect(approvedSuggestion.status).toBe('approved');
    expect(approvedSuggestion.target_article_id).toBeDefined();
  });

  test('Support ticket messages flow', async ({ page, request }) => {
    // Create a ticket first
    const chatResponse = await request.post('/api/support/chat', {
      data: {
        message: 'Test message for ticket creation',
        email: 'test@example.com'
      }
    });
    
    expect(chatResponse.ok()).toBeTruthy();
    const ticketId = (await chatResponse.json()).ticketId;
    console.log('Created ticket for messages test:', ticketId);
    
    // Add a small delay to ensure ticket is fully created
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Add a message to the ticket
    const messageResponse = await request.post(`/api/v1/support/tickets/${ticketId}/messages`, {
      data: { text: 'Agent response message' },
      headers: { 'x-dev-agent': 'allow' }
    });
    
    console.log('Message response status:', messageResponse.status());
    console.log('Message response body:', await messageResponse.text());
    
    expect(messageResponse.ok()).toBeTruthy();
    
    // Retrieve messages
    const messagesResponse = await request.get(`/api/v1/support/tickets/${ticketId}/messages`, {
      headers: { 'x-dev-agent': 'allow' }
    });
    
    expect(messagesResponse.ok()).toBeTruthy();
    const messagesData = await messagesResponse.json();
    expect(messagesData.messages).toBeDefined();
    expect(messagesData.messages.length).toBeGreaterThan(0);
  });

  test('Support search functionality', async ({ page, request }) => {
    // Test KB search
    const searchResponse = await request.get('/api/v1/support/search?q=reschedule', {
      headers: { 'x-dev-agent': 'allow' }
    });
    
    expect(searchResponse.ok()).toBeTruthy();
    const searchData = await searchResponse.json();
    expect(searchData.results).toBeDefined();
  });

  test('Support digest endpoint', async ({ page, request }) => {
    const digestResponse = await request.get('/api/v1/support/digest?window=24h', {
      headers: { 'x-dev-agent': 'allow' }
    });
    
    expect(digestResponse.ok()).toBeTruthy();
    const digestData = await digestResponse.json();
    expect(digestData.summary).toBeDefined();
    expect(digestData.counts).toBeDefined();
  });
});
