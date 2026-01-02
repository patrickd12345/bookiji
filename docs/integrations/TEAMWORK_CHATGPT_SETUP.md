# Teamwork.com ↔ ChatGPT Integration Setup

This guide explains how to set up the custom Teamwork.com integration with ChatGPT, which provides the same functionality as the native ChatGPT connector when it's not available.

## Overview

This integration bridges Teamwork.com data to ChatGPT/OpenAI, allowing you to:
- Query your Teamwork projects, tasks, and milestones using natural language
- Generate AI-powered summaries of project status
- Search and get intelligent answers about your work
- Receive webhook-triggered summaries when events occur

## Prerequisites

1. **Teamwork.com Account** with API access
2. **Teamwork API Key** (see setup below)
3. **OpenAI API Key** or another LLM provider (Gemini, Groq, etc.)
4. **Bookiji Environment** with the integration code deployed

## Step 1: Get Your Teamwork API Key

1. Log in to your Teamwork.com account
2. Go to **Settings** → **Apps & Integrations** → **API**
3. Click **Generate API Key** or use an existing key
4. Copy the API key (format: `xxxxx:xxxxx`)
5. Note your Teamwork subdomain (e.g., if your URL is `https://mycompany.teamwork.com`, your subdomain is `mycompany`)

## Step 2: Configure Environment Variables

Add these to your `.env` file:

```bash
# Teamwork.com Configuration
TEAMWORK_API_KEY=your_api_key_here
TEAMWORK_SUBDOMAIN=your_subdomain_here

# Optional: Webhook secret for webhook verification
TEAMWORK_WEBHOOK_SECRET=your_webhook_secret_here

# LLM Provider (uses existing SUPPORT_LLM_PROVIDER from Bookiji)
# Options: openai, gemini, groq, deepseek
SUPPORT_LLM_PROVIDER=gemini  # or openai for ChatGPT
OPENAI_API_KEY=sk-...  # If using OpenAI
GEMINI_API_KEY=...     # If using Gemini
```

## Step 3: Test the Integration

### Test Query Endpoint

```bash
curl -X POST http://localhost:3000/api/integrations/teamwork/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What tasks are due this week?",
    "context": {
      "includeCompleted": false
    }
  }'
```

### Test Summary Endpoint

```bash
curl -X POST http://localhost:3000/api/integrations/teamwork/summary \
  -H "Content-Type: application/json" \
  -d '{
    "includeCompleted": false
  }'
```

### Test Search Endpoint

```bash
curl -X POST http://localhost:3000/api/integrations/teamwork/search \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Show me all tasks related to authentication"
  }'
```

## Step 4: Set Up Webhooks (Optional)

To receive real-time updates from Teamwork:

1. Go to Teamwork.com → **Settings** → **Apps & Integrations** → **Webhooks**
2. Add a new webhook with URL: `https://your-domain.com/api/integrations/teamwork/webhook`
3. Select events you want to receive (task.created, task.updated, milestone.completed, etc.)
4. Set the webhook secret in your environment variables

## Usage Examples

### Example 1: Query Tasks

```typescript
const response = await fetch('/api/integrations/teamwork/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: 'What tasks are overdue?',
    context: {
      includeCompleted: false,
    },
  }),
});

const { answer } = await response.json();
console.log(answer);
```

### Example 2: Generate Project Summary

```typescript
const response = await fetch('/api/integrations/teamwork/summary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectIds: ['123456'],
    includeCompleted: false,
    dateRange: {
      start: '2026-01-01',
      end: '2026-01-31',
    },
  }),
});

const { summary } = await response.json();
console.log(summary);
```

### Example 3: Search and Answer

```typescript
const response = await fetch('/api/integrations/teamwork/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: 'What is the status of the authentication project?',
  }),
});

const { answer } = await response.json();
console.log(answer);
```

## API Endpoints

### `POST /api/integrations/teamwork/query`

Query Teamwork data using natural language.

**Request:**
```json
{
  "question": "What tasks are due this week?",
  "context": {
    "projectIds": ["123456"],
    "includeCompleted": false,
    "dateRange": {
      "start": "2026-01-01",
      "end": "2026-01-31"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "question": "What tasks are due this week?",
  "answer": "Based on your Teamwork data..."
}
```

### `POST /api/integrations/teamwork/summary`

Generate AI-powered summary of Teamwork data.

**Request:**
```json
{
  "projectIds": ["123456"],
  "includeCompleted": false,
  "dateRange": {
    "start": "2026-01-01",
    "end": "2026-01-31"
  }
}
```

**Response:**
```json
{
  "success": true,
  "summary": "Project Status Summary:\n\n..."
}
```

### `POST /api/integrations/teamwork/search`

Search Teamwork data and get AI-powered answers.

**Request:**
```json
{
  "question": "Show me all tasks related to authentication"
}
```

**Response:**
```json
{
  "success": true,
  "question": "Show me all tasks related to authentication",
  "answer": "I found the following tasks..."
}
```

### `POST /api/integrations/teamwork/webhook`

Receive webhooks from Teamwork.com (configured in Teamwork settings).

## Troubleshooting

### Error: "Teamwork.com is not configured"

- Ensure `TEAMWORK_API_KEY` and `TEAMWORK_SUBDOMAIN` are set in your environment variables
- Restart your development server after adding environment variables

### Error: "Teamwork API error (401)"

- Check that your API key is correct
- Ensure the API key format is correct (should be `xxxxx:xxxxx`)
- Verify your subdomain is correct

### Error: "LLM provider not configured"

- Ensure you have set up at least one LLM provider (OpenAI, Gemini, Groq, or DeepSeek)
- Check that the corresponding API key is set (e.g., `OPENAI_API_KEY` or `GEMINI_API_KEY`)

### No results returned

- Check that you have projects and tasks in Teamwork
- Verify your API key has access to the projects you're querying
- Try querying without project filters first

## Comparison with Native ChatGPT Connector

| Feature | Native Connector | This Integration |
|---------|------------------|-------------------|
| Setup | ChatGPT Settings → Apps | Environment variables |
| Availability | Requires Pro/Business plan | Works with any plan |
| Customization | Limited | Fully customizable |
| Webhooks | Not available | Supported |
| Cost | Included in ChatGPT plan | Uses your LLM provider |
| API Access | Via ChatGPT UI | Direct API endpoints |

## Next Steps

1. **Create a UI component** to interact with the integration
2. **Set up scheduled summaries** using cron jobs
3. **Add notifications** when webhooks are received
4. **Integrate with Bookiji's admin dashboard** for easy access

## Support

For issues or questions:
- Check the [Teamwork API Documentation](https://developer.teamwork.com/)
- Review Bookiji's LLM provider configuration in `docs/support-module/LLM_PROVIDER_CONFIG.md`
- Check server logs for detailed error messages
