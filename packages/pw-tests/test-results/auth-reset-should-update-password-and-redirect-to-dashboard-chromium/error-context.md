# Page snapshot

```yaml
- link "Skip to main":
  - /url: "#main"
- navigation:
  - link "Bookiji":
    - /url: /
  - link "Start Booking":
    - /url: /get-started
  - button "Book an appointment as a customer": Book an Appointment (Customer)
  - button "Offer your services as a provider": Offer Your Services (Provider)
  - link "Help":
    - /url: /help
  - link "Log In":
    - /url: /login
  - button "Theme selector loading" [disabled]:
    - img
    - text: Loading theme selector
- main:
  - text: ⚠️
  - heading "Invalid Reset Link" [level=2]
  - paragraph: This password reset link is invalid or has expired. Please request a new one.
  - link "Request New Reset":
    - /url: /forgot-password
```