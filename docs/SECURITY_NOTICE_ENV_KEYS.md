# Security Notice – Environment Keys
- Do not commit real keys in any example files.
- `.env.example` contains placeholders only.
- Use `env.template` for structure. Real values belong in an uncommitted `.env.local`.
- If any secrets were ever committed, rotate them immediately and purge history.