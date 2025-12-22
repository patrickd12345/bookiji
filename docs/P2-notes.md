# P2 Notes

- Ratings use the new `ratings` table keyed to `profiles.id` for rater and ratee, with a unique `(booking_id, rater_role)` constraint and 1.0-5.0 half-star checks.
- Rating eligibility is enforced in the API for bookings in `confirmed` or `completed` status only; the UI defers to API responses.
- Notification intents/deliveries use deterministic idempotency keys (SHA-256 over normalized payload) and link to batch queue entries for push.
- New push endpoints `POST /api/push/subscribe` and `POST /api/push/unsubscribe` wrap the existing subscription logic.
- i18n coverage is enforced at 100% with locale formatting tests for plural rules, date/time, and currency.
