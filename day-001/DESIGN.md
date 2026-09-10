# DESIGN.md — Day 001: Appointment Scheduler Core

Author: Muhammad Rabeet | Status: Approved | Last updated: 2026-09-10

## Objective and background
Nexora's core product is an AI appointment booking system. Before automating
bookings, we need a correct, minimal scheduling core. This exercise builds it
following Google's engineering practices: design before code, tests with code,
small focused commits.

## Goals
- Book/cancel/query 30-minute slots without double-booking
- Deterministic behavior (same inputs -> same results)
- Zero external dependencies beyond stdlib + pytest

## Non-goals
- Persistence (databases, files) — day 003+
- Timezones — the Slot model is deliberately date+hour+minute
- Human UI — this is a library core

## Design decision: why immutable `Slot` + a `set` of keys?
Alternatives considered:
1. Store booked slots as list of Slot objects — O(n) lookup, dedup by equality
   fragile with dataclass defaults.
2. Store datetime objects — heavy, timezone temptation, harder keys.
3. Chosen: frozen dataclass Slot -> stable `key()` string -> `set` membership.
   O(1) booking, atomic check-and-add on one set, trivially testable.

## API surface (contract)
- Slot(date, hour, minute) -> immutable value object
- Scheduler.book(slot) -> bool (False = taken, state unchanged)
- Scheduler.cancel(slot) -> bool (False = wasn't booked)
- Scheduler.is_free(slot) -> bool
- Scheduler.free_slots(date) -> list[Slot] chronological, 9:00-16:30 business day

## Testing strategy
Unit tests per method + invariants: no double-booking (idempotence of failure),
chronological ordering, boundary values (9:00 first slot, 16:30 last).
Tests written with the code, per Google review standards.

## Future work (explicitly deferred)
Waitlists, recurring slots, overbooking policies, persistence, timezones.
