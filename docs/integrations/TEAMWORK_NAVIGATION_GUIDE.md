# Teamwork.com Navigation Guide for ChatGPT Integration

## Where to Look in Teamwork.com

Based on your Teamwork.com settings page, here are the key places to check:

### 1. **AI Tab** (Marked "NEW") ⭐ **START HERE**

**Path:** Settings → AI

**What to look for:**
- ChatGPT connector option
- AI integrations section
- "Connect ChatGPT" or similar button
- Any mention of OpenAI or ChatGPT integration

**If found:**
- Follow the setup instructions
- You may need to authorize with your ChatGPT account
- May require ChatGPT Pro/Business plan

### 2. **Integrations Tab** ⭐ **ALSO CHECK**

**Path:** Settings → Integrations

**What to look for:**
- List of available integrations
- ChatGPT or OpenAI in the list
- "Add Integration" or "Connect" buttons
- API settings section

**If found:**
- Click on ChatGPT/OpenAI integration
- Follow the connection flow
- May need to enter your ChatGPT credentials

### 3. **API Settings** (For Custom Integration)

**Path:** Settings → Apps & Integrations → API  
**OR:** Settings → More... → (look for API or Developer options)

**What you need:**
- **API Key**: Generate or copy existing key (format: `xxxxx:xxxxx`)
- **Subdomain**: From your URL (`bookiji.teamwork.com` → subdomain is `bookiji`)

**Steps:**
1. Click "Generate API Key" or copy existing
2. Copy the key (you'll need both parts if it's in `xxxxx:xxxxx` format)
3. Note your subdomain from the URL

### 4. **Webhooks** (For Real-time Updates)

**Path:** Settings → More... → Webhooks

**What to do:**
- Add webhook URL: `https://your-domain.com/api/integrations/teamwork/webhook`
- Select events you want (task.created, task.updated, etc.)
- Copy webhook secret if provided

## Quick Decision Tree

```
┌─────────────────────────────────────┐
│  Check AI Tab → Found ChatGPT?     │
│         ↓ YES                       │
│  Use Native Connector              │
│  (Requires ChatGPT Pro/Business)   │
└─────────────────────────────────────┘
         ↓ NO
┌─────────────────────────────────────┐
│  Check Integrations Tab → Found?   │
│         ↓ YES                       │
│  Use Native Integration            │
└─────────────────────────────────────┘
         ↓ NO
┌─────────────────────────────────────┐
│  Get API Key from API Settings     │
│  Use Custom Integration            │
│  (Works with any ChatGPT plan)      │
└─────────────────────────────────────┘
```

## What to Do Based on What You Find

### ✅ **If Native Connector Found:**

1. Click on it
2. Follow the setup wizard
3. Authorize with ChatGPT
4. May need to enter your Teamwork subdomain
5. Wait for sync to complete

**Note:** If it says you need ChatGPT Pro/Business and you don't have it, use the custom integration instead.

### ❌ **If No Native Connector:**

Use the custom integration I created:

1. **Get API Key:**
   - Go to Settings → Apps & Integrations → API
   - Generate or copy API key
   - Note subdomain: `bookiji`

2. **Add to `.env`:**
   ```bash
   TEAMWORK_API_KEY=your_api_key_here
   TEAMWORK_SUBDOMAIN=bookiji
   ```

3. **Test it:**
   ```bash
   node scripts/test-teamwork-integration.mjs
   ```

## Common Issues

### "ChatGPT connector not showing"
- **Cause:** May require ChatGPT Pro/Business plan
- **Solution:** Use custom integration (works with any plan)

### "Can't find API settings"
- **Cause:** May need admin permissions
- **Solution:** Ask your Teamwork admin to generate API key

### "API key format error"
- **Cause:** Key should be in format `xxxxx:xxxxx`
- **Solution:** Copy the full key including both parts

## Next Steps

1. **Check AI tab first** - Most likely location for native connector
2. **Check Integrations tab** - Second most likely location
3. **Get API key** - If no native connector found
4. **Set up custom integration** - Using the code I created
5. **Test it** - Use the test script

## Need Help?

- See `TEAMWORK_CHATGPT_SETUP.md` for full setup guide
- See `TEAMWORK_QUICK_START.md` for quick reference
- Check Teamwork API docs: https://developer.teamwork.com/
