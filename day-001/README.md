# Day 001 — Appointment Scheduler Core
Date: 2026-09-11 | Curriculum: google/eng-practices (code review standards) + repo structure

## Exercise goal
Build the smallest honest core of the product Nexora actually sells: an appointment
slot manager. Apply Google's code review checklist to every function:
- Design: simple, appropriate
- Complexity: no more than needed
- Tests: correct, well-designed
- Naming: clear
- Comments: explain WHY not WHAT

## What's here
- src/scheduler.py — Slot + Scheduler with conflict detection
- tests/test_scheduler.py — pytest tests written with the code (not after)
- Every function docstring states its contract

## What I learned (applied today)
1. Google: "favor approving CL once code overall improves" — ship small increments
2. Tests are part of design, not an afterthought
3. Names should say what the thing DOES, not what it IS
