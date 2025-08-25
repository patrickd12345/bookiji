# Error Envelope

All non-2xx responses follow this envelope:

```json
{
  "ok": false,
  "code": "VALIDATION_ERROR",
  "message": "Latitude must be between -90 and 90",
  "details": { "field": "location.lat" },
  "correlation_id": "req_01JABCDEFG"
}
```

Success responses **should** follow:

```json
{ "ok": true, "data": { /* domain payload */ } }
```

- `code` is a stable machine string.
- `correlation_id` should be echoed from request context for log correlation.
