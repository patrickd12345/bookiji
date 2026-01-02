# Teamwork.com ↔ ChatGPT Integration - Quick Start

## 🚀 Quick Setup (5 minutes)

### 1. Get Your Teamwork API Key

1. Go to https://your-subdomain.teamwork.com
2. Click your profile → **Settings** → **Apps & Integrations** → **API**
3. Click **Generate API Key** (or copy existing)
4. Copy the key (format: `xxxxx:xxxxx`)
5. Note your subdomain (from your URL)

### 2. Add to `.env`

```bash
TEAMWORK_API_KEY=your_api_key_here
TEAMWORK_SUBDOMAIN=your_subdomain_here
```

### 3. Test It

```bash
# Start your dev server
pnpm dev

# In another terminal, test the integration
node scripts/test-teamwork-integration.mjs
```

Or test manually with curl:

```bash
curl -X POST http://localhost:3000/api/integrations/teamwork/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What tasks are due this week?"}'
```

## ✅ What You Get

- **Query your Teamwork data** using natural language
- **AI-powered summaries** of projects and tasks
- **Search and answer** questions about your work
- **Webhook support** for real-time updates

## 📚 Full Documentation

See [TEAMWORK_CHATGPT_SETUP.md](./TEAMWORK_CHATGPT_SETUP.md) for complete documentation.

## 🆚 vs Native ChatGPT Connector

| Feature | Native | This Integration |
|---------|--------|------------------|
| Setup | ChatGPT Settings | Environment variables |
| Plan Required | Pro/Business | Any plan |
| Customization | Limited | Full control |
| Webhooks | ❌ | ✅ |
| Direct API | ❌ | ✅ |

## 🐛 Troubleshooting

**"Teamwork.com is not configured"**
→ Add `TEAMWORK_API_KEY` and `TEAMWORK_SUBDOMAIN` to `.env` and restart server

**"Teamwork API error (401)"**
→ Check your API key is correct and format is `xxxxx:xxxxx`

**"LLM provider not configured"**
→ Set up at least one LLM provider (see `docs/support-module/LLM_PROVIDER_CONFIG.md`)
