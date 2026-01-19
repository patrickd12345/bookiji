## 2024-05-22 - VendorCalendar Redundant Fetching
**Learning:** `VendorCalendar` was configured to fetch all bookings from `/api/bookings/vendor` but re-fetched them on every date navigation, causing massive redundant network traffic. Also fetched unused `/api/vendor/schedule`.
**Action:** When working on calendar components, verify if the API returns a window or the full dataset. If full dataset, fetch once on mount. Verify all API responses are actually used.
