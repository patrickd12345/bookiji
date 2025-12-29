# COMPREHENSIVE TEST ERROR REPORT

Generated: 12/29/2025 10:06:05

Total Errors Found: 506


## ERROR SUMMARY BY CATEGORY


### Connection Errors - 305 errors


- **61x**: Error: page.goto: NS_ERROR_CONNECTION_REFUSED Call log: [2m - navigating to "http://localhost:3000/", waiting until "load"[22m 

  - Affected tests: production-smoke-Stripe-In-53bc8-load-without-CSP-violations-, production-smoke-Stripe-In-f7a53--calls-to-Stripe-in-console-, support-chat-llm-Support-C-a4eab-ld-open-support-chat-widget, support-chat-llm-Support-C-1766a-eive-LLM-generated-response, usability-Site-Usability-T-2489d-s-clear-navigation-and-CTAs



- **50x**: Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/ Call log: [2m - navigating to "http://localhost:3000/", waiting until "load"[22m 

  - Affected tests: visual-regression-Visual-R-dcbee-s-Booking-Flow-payment-page-, visual-regression-Visual-R-32062-Flow-booking-selection-page-, visual-regression-Visual-R-dcbee-s-Booking-Flow-payment-page, visual-regression-Visual-R-dd06d-mepage-homepage-mobile-view-, visual-regression-Visual-R-9ee6c-ge-homepage-visual-snapshot-



- **21x**: Error: page.goto: NS_ERROR_CONNECTION_REFUSED Call log: [2m - navigating to "http://localhost:3000/login", waiting until "load"[22m 

  - Affected tests: site-crawler-Site-Crawler-crawl-admin-pages-requires-login-, site-crawler-Site-Crawler-crawl-admin-pages-requires-login--, visual-regression-Visual-R-4f7e6-n-dashboard-visual-snapshot, visual-regression-Visual-R-3ab0f-hboard-admin-analytics-page, visual-regression-Visual-R-4f7e6-n-dashboard-visual-snapshot-



- **16x**: Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login Call log: [2m - navigating to "http://localhost:3000/login", waiting until "load"[22m 

  - Affected tests: visual-regression-Visual-R-90429-r-dashboard-visual-snapshot-, visual-regression-Visual-R-5b184-ockpit-vendor-calendar-page-, visual-regression-Visual-R-8a9c5-r-dashboard-visual-snapshot-, visual-regression-Visual-R-90429-r-dashboard-visual-snapshot, visual-regression-Visual-R-5b184-ockpit-vendor-calendar-page



- **12x**: Error: page.goto: NS_ERROR_CONNECTION_REFUSED Call log: [2m - navigating to "http://localhost:3000/register", waiting until "load"[22m 

  - Affected tests: usability-Site-Usability-T-24f42-orm-provides-clear-feedback, usability-Site-Usability-T-57137-page-is-clear-and-intuitive, usability-Site-Usability-T-dbd83-sages-are-clear-and-helpful, usability-Site-Usability-T-ef3e3--forms-are-usable-on-mobile, usability-Site-Usability-T-57137-page-is-clear-and-intuitive-



### Timeout Errors - 76 errors


- **20x**: Error: browserContext.newPage: Test timeout of 45000ms exceeded.

  - Affected tests: visual-regression-Visual-R-5b184-ockpit-vendor-calendar-page-, admin-access-Admin-Access--2f2a2-in-check-API-endpoint-works, booking-reschedule-custome-95cb6-hedule-and-cancel-a-booking, booking-flow-full-booking--3e769-e-?-pay-?-webhook-?-confirm-, admin-access-Admin-Access--2f2a2-in-check-API-endpoint-works-



- **14x**: [31mTest timeout of 45000ms exceeded.[39m

  - Affected tests: comprehensive-site-verific-32160-tion-3-Search-functionality, comprehensive-site-verific-de031-oads-and-displays-correctly, booking-reschedule-custome-95cb6-hedule-and-cancel-a-booking, booking-flow-full-booking--3e769-e-?-pay-?-webhook-?-confirm, admin-access-Admin-Access--9f4b2--and-access-mission-control-



- **13x**: [31mTest timeout of 45000ms exceeded while setting up "page".[39m

  - Affected tests: admin-access-Admin-Access--2f2a2-in-check-API-endpoint-works, booking-reschedule-custome-95cb6-hedule-and-cancel-a-booking, booking-flow-full-booking--3e769-e-?-pay-?-webhook-?-confirm-, admin-access-Admin-Access--2f2a2-in-check-API-endpoint-works-, booking-reschedule-custome-95cb6-hedule-and-cancel-a-booking-



- **8x**: [31m"beforeAll" hook timeout of 45000ms exceeded.[39m

  - Affected tests: comprehensive-site-verific-32160-tion-3-Search-functionality, comprehensive-site-verific-203ce-on-5-Help-and-support-pages, comprehensive-site-verific-0bedb--Form-inputs-and-validation-, comprehensive-site-verific-de031-oads-and-displays-correctly-, comprehensive-site-verific-febdd-on-9-Test-responsive-design-



- **7x**: [31mTest timeout of 45000ms exceeded while running "beforeEach" hook.[39m

  - Affected tests: visual-regression-Visual-R-5b184-ockpit-vendor-calendar-page-, customer-dashboard-Custome-85d9d-oad-customer-dashboard-page, customer-dashboard-Custome-e187f-ld-show-customer-navigation, customer-dashboard-Custome-56815-n-redirect-if-not-logged-in, customer-dashboard-Custome-85d9d-oad-customer-dashboard-page-



### Other Errors - 45 errors


- **8x**: Error: browser.newPage: Test ended.

  - Affected tests: comprehensive-site-verific-32160-tion-3-Search-functionality, comprehensive-site-verific-203ce-on-5-Help-and-support-pages, comprehensive-site-verific-0bedb--Form-inputs-and-validation-, comprehensive-site-verific-de031-oads-and-displays-correctly-, comprehensive-site-verific-febdd-on-9-Test-responsive-design-



- **5x**: Error: browserContext.newPage: Protocol error (Screencast.startVideo): Failed to initialize encoder: Memory allocation error

  - Affected tests: admin-access-Admin-Access--9f4b2--and-access-mission-control, production-smoke-Production-Smoke-Tests-login-page-loads, scheduling-boundaries-book-4fe1c-uling-only-and-vendor-first, support-chat-llm-Support-C-d7fdf-show-sources-when-available, support-chat-llm-Support-C-18f1b-ation-for-complex-questions



- **3x**: Error: page.goto: Test ended. Call log: [2m - navigating to "http://localhost:3000/", waiting until "load"[22m 

  - Affected tests: comprehensive-site-verific-32160-tion-3-Search-functionality, booking-reschedule-custome-95cb6-hedule-and-cancel-a-booking, booking-flow-full-booking--3e769-e-?-pay-?-webhook-?-confirm



- **2x**: Error: page.goto: Target page, context or browser has been closed Call log: [2m - navigating to "http://localhost:3000/", waiting until "load"[22m 

  - Affected tests: booking-flow-full-booking--3e769-e-?-pay-?-webhook-?-confirm, support-chat-llm-Support-C-a4eab-ld-open-support-chat-widget



- **1x**: Error: browserType.launch: Target page, context or browser has been closed Browser logs: <launching> C:\Users\patri\AppData\Local\ms-playwright\webkit-2191\Playwright.exe --inspector-pipe --disable-accelerated-compositing --headless --no-startup-window <launched> pid=37140 Call log: [2m - <launching> C:\Users\patri\AppData\Local\ms-playwright\webkit-2191\Playwright.exe --inspector-pipe --disable-accelerated-compositing --headless --no-startup-window[22m [2m - <launched> pid=37140[22m 

  - Affected tests: navigation-help-page-loads



### Seed Data Errors - 41 errors


- **24x**: Error: Vendor user not found: e2e-vendor@bookiji.test. Run pnpm e2e:seed first.

  - Affected tests: bookiji-full-proof-Bookiji-c4002-ate-and-manage-availability, bookiji-full-proof-Bookiji-837ba-search-select-slot-and-book, bookiji-full-proof-Bookiji-c4002-ate-and-manage-availability-, bookiji-full-proof-Bookiji-c9a62-mpty-states-shown-correctly-, bookiji-full-proof-Bookiji-837ba-search-select-slot-and-book-



- **11x**: Error: Vendor profile not found for e2e-vendor@bookiji.test

  - Affected tests: bookiji-full-proof-Bookiji-7a08b-from-search-to-confirmation-, bookiji-full-proof-Bookiji-4008f-nt-returns-coherent-payload-, bookiji-full-proof-Bookiji-1b3a7-ds-and-content-is-sanitized-, bookiji-full-proof-Bookiji-4008f-nt-returns-coherent-payload, bookiji-full-proof-Bookiji-7a08b-from-search-to-confirmation



- **6x**: Error: Vendor profile not found for e2e-vendor@bookiji.test. Run pnpm e2e:seed first.

  - Affected tests: scheduling-proof-Schedulin-400dc-cceeds-second-booking-fails, scheduling-proof-Schedulin-400dc-cceeds-second-booking-fails-



### Type Errors - 39 errors


- **30x**: TypeError: fetch failed [cause]: AggregateError: 

  - Affected tests: stripe-replay-Stripe-Webho-ba285-icate-webhooks-idempotency--, stripe-replay-Stripe-Webho-dcf92-ndles-out-of-order-webhooks, stripe-replay-Stripe-Webho-dcf92-ndles-out-of-order-webhooks-, stripe-replay-Stripe-Webho-25e95-dles-delayed-webhook-replay, stripe-replay-Stripe-Webho-25e95-dles-delayed-webhook-replay-



- **9x**: TypeError: Cannot read properties of undefined (reading 'close')

  - Affected tests: comprehensive-site-verific-febdd-on-9-Test-responsive-design, comprehensive-site-verific-32160-tion-3-Search-functionality, comprehensive-site-verific-203ce-on-5-Help-and-support-pages, comprehensive-site-verific-0bedb--Form-inputs-and-validation-, comprehensive-site-verific-de031-oads-and-displays-correctly-



