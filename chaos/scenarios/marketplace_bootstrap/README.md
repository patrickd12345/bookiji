# Marketplace Bootstrap Scenario

## Intent
This scenario simulates the core marketplace growth loop by generating new vendors and customers, and optionally connecting them with bookings. It serves as a heartbeat for the business metrics in Mission Control.

## Behavior
For each iteration (controlled by `duration` and `concurrency`):
1. **Create Vendor**: Calls the real vendor registration API (`/api/vendor/register`).
2. **Create Customer**: Calls the real customer registration API (`/api/auth/register`).
3. **Emit Ops Events**: Emits `vendor.created` and `customer.created` events to the ops bus.
4. **(Optional) Create Booking**: If enabled, creates a booking between the new vendor and customer.

## Parameters
- `--seed <string>`: Random seed for deterministic generation.
- `--duration <seconds>`: Duration to run the scenario.
- `--concurrency <number>`: Number of concurrent loops.
- `--target-url <url>`: Base URL of the application (e.g., `http://localhost:3000`).
- `--max-events <number>`: (Optional) Max number of events to process.

## Metrics
- `vendors_created/sec`
- `customers_created/sec`
- `bookings_created/sec`

## Hard Constraints
- Must use real business APIs.
- Must emit `ops_events`.
- Must be deterministic based on seed.
