# NexoraPOS — Point of Sale & ERP System (MERN)

A production-grade POS sales ERP built the Google way: design docs first,
tests with code, small reviewable commits, CI on every push.

## Stack
MongoDB 8 · Express 5 · React 19 · Node 22

## Modules
- **Products & Inventory** — catalog, stock levels, low-stock alerts
- **Sales / POS terminal** — fast cart, checkout, receipts
- **Accounts & Accountability** — every stock movement and sale is audited,
  attributed to a user, and reversible via returns
- **Dashboard & Reports** — revenue, top products, stock valuation
- **Users & Roles** — admin / manager / cashier with least-privilege access

## Repo layout
```
server/          Express API + Mongo models + tests
web/             React frontend (Vite)
docs/            DESIGN.md, API.md, data model, day-by-day log
.github/         CI: server tests on every push
```

## Development
```bash
# server
cd server && npm i && npm run dev     # :4000
# web
cd web && npm i && npm run dev        # :5173
```

## Build log
See docs/LOG.md — every day documented: what, why, decisions, review notes.
