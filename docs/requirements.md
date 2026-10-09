# Requirements

## Purpose

TicketRush is intended to provide a ticket-booking backend that remains correct under concurrent demand, avoids double booking, and handles payment failures, retries, and asynchronous events reliably.

This document separates the product requirements from the current implementation. The current application is an Express 5 skeleton with JSON request parsing and a health endpoint; booking, payment, persistence, and event processing are not implemented yet.

## Scope

### In scope for the target system

- Expose an HTTP API for browsing events and ticket inventory, creating and inspecting reservations, and confirming or cancelling bookings.
- Prevent more than one active reservation or completed booking from consuming the same ticket inventory.
- Hold inventory for a bounded period while a customer completes payment.
- Integrate with a payment provider without treating a client response as proof of payment.
- Process payment outcomes and other asynchronous events idempotently, including duplicate and out-of-order delivery.
- Make reservation and payment state observable to clients and operators.
- Provide health checks and automated tests for concurrency and failure cases.

### Out of scope for the initial backend

- Event creation and organizer administration, unless added as a separate requirement.
- Seat-map design, venue management, and ticket transfer/resale.
- A customer-facing web or mobile application.
- Selecting or implementing a specific payment provider.

## Functional requirements

1. The service must report liveness through `GET /health`.
2. Clients must be able to retrieve events and available ticket inventory.
3. A client must be able to request a reservation with a quantity and an idempotency key.
4. A reservation must have an expiration time and an explicit lifecycle state.
5. Inventory allocation must be atomic: concurrent requests must never cause inventory to become negative or oversell the event.
6. A reservation must be confirmed only after a trusted payment success result is recorded.
7. Failed, expired, or cancelled reservations must release their inventory exactly once.
8. Repeating a request with the same idempotency key must not create duplicate reservations or payment attempts.
9. Payment callbacks and asynchronous events must be authenticated or otherwise verified, deduplicated, and safe to retry.
10. Clients must be able to retrieve reservation status without relying on callback delivery.
11. Invalid input, unavailable inventory, missing resources, and conflicting state transitions must return stable error responses.

## Non-functional requirements

- **Consistency:** inventory and reservation state changes must be committed atomically in the primary database.
- **Concurrency:** correctness must not depend on application-process memory or a single server instance.
- **Durability:** committed bookings and payment-event records must survive service restarts, subject to database durability guarantees.
- **Idempotency:** retryable client operations and provider callbacks must have durable deduplication.
- **Security:** validate input, avoid logging payment secrets or sensitive customer data, and verify provider callbacks.
- **Operability:** expose health status and structured logs sufficient to diagnose reservation and payment transitions.
- **Performance:** establish measurable latency and throughput targets before production launch; no numeric service-level objective is set yet.

## Acceptance criteria for booking correctness

- With inventory of one and many simultaneous reservation attempts, no more than one active reservation or confirmed booking can own the unit.
- A reservation can transition to confirmed only once, even when payment success is delivered repeatedly.
- A failed or expired reservation returns inventory at most once.
- Retrying an idempotent request returns its original result and does not decrement inventory again.
- Database or payment-provider failure leaves a recoverable, unambiguous reservation state.

## Current implementation

`src/app.js` configures Express JSON parsing and `GET /health`. `src/server.js` starts the HTTP listener on `PORT` or port `5000`. There are no booking routes, persistence layer, migrations, payment integration, or automated tests in the repository yet.
