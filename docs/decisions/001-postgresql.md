# ADR 001: Use PostgreSQL for Transactional Booking Data

- **Status:** Accepted as the proposed primary database; not yet implemented
- **Date:** 2026-10-09

## Context

TicketRush needs to allocate limited ticket inventory under concurrent requests. Reservation creation, inventory decrement, idempotency recording, and state transitions must behave atomically. Payment callbacks and client retries may be duplicated, so the system also needs durable uniqueness constraints and transactionally guarded updates.

The current repository has no database dependency or persistence layer. This decision guides future implementation; it does not indicate that PostgreSQL is currently configured.

## Decision

Use PostgreSQL as the primary durable store for events, ticket types, reservations, reservation items, payment records, idempotency keys, and processed provider events. Use database transactions, constraints, and conditional updates or row locks to protect inventory and state transitions.

## Rationale

- Transactions and row-level locking support atomic inventory allocation across independent application instances.
- Unique constraints provide a durable foundation for idempotency and webhook deduplication.
- Foreign keys and check constraints help protect core booking invariants from application defects.
- PostgreSQL supports structured relational data and JSONB for limited provider-event payloads when needed.
- It is a widely supported operational choice with mature backup, migration, and monitoring tooling.

## Consequences

- The service must provision and operate PostgreSQL and manage credentials, backups, migrations, and connection limits.
- Booking correctness depends on transaction design and lock ordering; merely selecting PostgreSQL does not prevent overselling.
- Integration and concurrency tests require a PostgreSQL instance.
- A connection pool and migration tool must be selected when persistence is implemented.
- Payment-provider calls remain outside database transactions and require idempotency and reconciliation workflows.

## Alternatives considered

- **In-memory storage:** unsuitable for durable bookings or multiple server processes and cannot enforce cross-instance inventory correctness.
- **Document database:** can be made correct, but relational constraints and transactional inventory allocation are a more direct fit for the initial model.
- **Other relational databases:** viable, but PostgreSQL is selected as the conventional transactional choice; no repository-specific database constraints currently require another engine.

## Revisit when

Reconsider if deployment constraints, existing organizational platform standards, expected scale, or operational capabilities materially favor another database. Revisit the schema separately if assigned seating or inventory-ledger requirements become confirmed.
