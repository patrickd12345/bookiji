# Transport Adapters

Transport adapters provide different ways to execute `sendRequest` operations in the SimCity chaos testing system.

## Transport Interface

All transports must implement:

```javascript
async function execute({ intentId, endpoint, payload, context }) => Promise<void>
```

- **Fire-and-forget**: No return values
- **Idempotency**: Handled via `intentId`
- **No assertions**: Transports don't validate results
- **No DB reads**: Transports only execute actions

## Available Transports

### HTTP Transport (Default)

**File**: `http.mjs`

Executes requests via HTTP/REST API or Supabase RPC calls.

- Supports `/rpc/*` endpoints (Supabase RPC)
- Supports `/api/*` endpoints (Next.js API routes)
- Supports full URLs (`http://...`)
- Default transport - used when no transport is specified

### Playwright Transport (Optional)

**File**: `playwright.mjs`

Executes requests via browser automation.

**Requirements**:
- `SIMCITY_E2E_BASE_URL` environment variable must be set
- Playwright must be installed (`@playwright/test`)

**Supported Endpoints**:
- `ui/login` - Login via UI
- `ui/book_slot` - Book a slot via UI
- `ui/click` - Generic click action
- `ui/fill` - Generic fill action
- `ui/navigate` - Navigate to URL

**Usage**:
```json
{
  "intentSpecs": {
    "login": {
      "endpoint": "ui/login",
      "payloadTemplate": {
        "email": "{{customer.email}}",
        "password": "password123"
      },
      "transport": "playwright"
    }
  }
}
```

**Browser Restart Integration**:
When `restartProcess` is called and Playwright transport is active:
- **70% chance**: Page reload (simulates browser refresh)
- **30% chance**: Context restart (simulates full browser restart)

This simulates real-world scenarios where browser sessions can be interrupted during backend restarts.

**Disabled by Default**:
- Do not set `SIMCITY_E2E_BASE_URL` to keep it disabled
- Do not reference `ui/*` endpoints in normal capabilities
- CI/soak runs remain API-only by default

## Adding a New Transport

1. Create a new file in `chaos/kernel/transports/`
2. Export an `execute` function matching the interface
3. Update `chaos/kernel/index.mjs` to route to your transport
4. Document the transport in this README

