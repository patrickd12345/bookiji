# Test Selector Map

This document provides a comprehensive map of `data-test` attributes used throughout the application for reliable E2E testing.

## Navigation (`MainNavigation.tsx`)

| Element | Selector | Description |
|---------|----------|-------------|
| Logo | `data-test="nav-logo"` | Bookiji logo link to homepage |
| Dashboard Link | `data-test="nav-dashboard"` | Customer dashboard link |
| Vendor Portal Link | `data-test="nav-vendor-portal"` | Vendor calendar/dashboard link |
| Replay Tour Button | `data-test="nav-replay-tour"` | Button to replay guided tour |
| Start Booking Link | `data-test="nav-start-booking"` | Link to get started page |
| Book Appointment Button | `data-test="nav-book-appointment"` | Customer booking button |
| Offer Services Button | `data-test="nav-offer-services"` | Vendor registration button |
| Login Link | `data-test="nav-login"` | Login page link |
| Role Switcher | `data-testid="role-switcher"` | Dropdown to switch between roles |

## Homepage (`HomePageClient.tsx`)

| Element | Selector | Description |
|---------|----------|-------------|
| Search Input | `data-test="home-search-input"` | Main search input field |
| Search Button | `data-test="home-search-button"` | Search submit button |
| Start Chat Button | `data-test="home-start-chat"` | AI chat interface trigger |
| Get Started Link | `data-test="home-get-started"` | Primary CTA to booking flow |
| Watch Demo Button | `data-test="home-watch-demo"` | Demo video/modal trigger |
| Book Now Button | `data-testid="book-now-btn"` | Alternative booking CTA |

## Booking Flow

| Element | Selector | Description |
|---------|----------|-------------|
| Provider Selection | `data-test="booking-provider"` | Provider card/selection |
| Time Slot Selection | `data-test="booking-time-slot"` | Available time slot button |
| Payment Form | `data-test="payment-form"` | Stripe payment form container |
| Submit Booking | `data-test="booking-submit"` | Final booking confirmation button |

## Admin Dashboard

| Element | Selector | Description |
|---------|----------|-------------|
| Admin Sidebar | `data-test="admin-sidebar"` | Main navigation sidebar |
| Analytics Link | `data-test="admin-analytics"` | Analytics page link |
| Vendors Link | `data-test="admin-vendors"` | Vendors management link |
| Bookings Link | `data-test="admin-bookings"` | Bookings management link |

## Vendor Dashboard

| Element | Selector | Description |
|---------|----------|-------------|
| Calendar View | `data-test="vendor-calendar"` | Calendar component |
| New Service Button | `data-test="vendor-new-service"` | Add service button |
| Availability Toggle | `data-test="vendor-availability"` | Availability status toggle |

## Customer Dashboard

| Element | Selector | Description |
|---------|----------|-------------|
| Upcoming Bookings | `data-test="customer-upcoming"` | Upcoming appointments list |
| Past Bookings | `data-test="customer-past"` | Past appointments list |
| Reschedule Button | `data-test="booking-reschedule"` | Reschedule appointment button |
| Cancel Button | `data-test="booking-cancel"` | Cancel appointment button |

## Forms

| Element | Selector | Description |
|---------|----------|-------------|
| Login Form | `data-test="login-form"` | Authentication form |
| Registration Form | `data-test="register-form"` | User registration form |
| Booking Form | `data-test="booking-form"` | Service booking form |
| Payment Form | `data-test="payment-form"` | Payment processing form |

## Usage in Tests

```typescript
// Example Playwright test
test('user can navigate to booking', async ({ page }) => {
  await page.goto('/')
  await page.click('[data-test="home-get-started"]')
  await expect(page).toHaveURL('/get-started')
})

// Example with role-based navigation
test('vendor can access dashboard', async ({ page, auth }) => {
  await auth.loginAsVendor()
  await page.click('[data-test="nav-vendor-portal"]')
  await expect(page).toHaveURL(/\/vendor/)
})
```

## Best Practices

1. **Use data-test over text selectors**: Text can change, data-test attributes are stable
2. **Be specific**: Use descriptive names like `home-get-started` not just `button`
3. **Consistent naming**: Follow pattern `{page/component}-{element}` (e.g., `nav-login`, `home-search`)
4. **Avoid overuse**: Only add to interactive elements that tests need to target
5. **Document additions**: Update this file when adding new data-test attributes

## Adding New Selectors

When adding a new `data-test` attribute:

1. Add it to the component with a descriptive name
2. Update this selector map
3. Use it in relevant E2E tests
4. Consider if it should be in visual regression tests
