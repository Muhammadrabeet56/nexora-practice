# NexoraPOS — Point of Sale / ERP

A full-stack MERN POS + ERP built by Nexora AI Solutions — part of the
Google-standard engineering practice program. Every stock change is
accounted for, attributed, and auditable.

## Stack

- **Server** — Node.js + Express (ESM), Mongoose, MongoDB 8
  - JWT auth + role-based access (admin / manager / cashier)
  - Multi-document transactions (single-node replica set) with a
    capability-detected fallback for plain standalones
  - Full audit ledger: every stock movement (SALE / RETURN / ADJUST /
    RECEIVE) recorded with who, what, when, why
  - Jest + supertest — **28 tests**, green locally and on GitHub CI
- **Web** — React 19 + Vite, dark enterprise theme
  - Login, Dashboard, Products, POS terminal (cart → checkout →
    receipt), Sales history + returns, Stock Ledger, Users admin
- **CI** — GitHub Actions: boot MongoDB, run all tests on every push

## Run it

```bash
# 1. MongoDB (must be a single-node replica set for transactions)
mongod --replSet rs0 --dbpath ./mongodb-data --port 27017 --bind_ip 127.0.0.1

# 2. Server (port 4000)
cd server && npm install
MONGO_URL='mongodb://127.0.0.1:27017/nexora-pos?replicaSet=rs0&directConnection=true' \
JWT_SECRET='change-me' npm run seed   # seed users + demo products
MONGO_URL='mongodb://127.0.0.1:27017/nexora-pos?replicaSet=rs0&directConnection=true' \
JWT_SECRET='change-me' npm start

# 3. Web (port 5173)
cd web && npm install && npm run dev
```

Login: `admin@nexora.com` / `admin123` (admin), `manager@nexora.com` /
`manager123` (manager), `cashier@nexora.com` / `cashier123` (cashier).

## Accountability model

- **Sale** — validates stock, decrements atomically, records a
  `SALE` movement with the sale number and the cashier
- **Return** — restocks, records a `RETURN` movement, marks the sale
  returned (no double-returns)
- **Adjust / Receive** — manual stock changes always hit the ledger
- **Ledger view (manager+)** — filterable, attributed, immutable history

## Google-standard practice

- DESIGN.md first, tests alongside code, CI green before push
- Small, reviewable commits; clean ESM; centralized error handling;
  no secrets in the repo