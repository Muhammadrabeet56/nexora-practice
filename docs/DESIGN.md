# DESIGN.md — NexoraPOS (POS Sales ERP)

Author: Muhammad Rabeet (CEO) · Built by: Hermes · Status: Approved · v1

## Objective
A POS sales system where staff manage products, ring up sales, and the system
maintains full accountability: who sold what, what stock moved, and what the
business is worth — without spreadsheets.

## Users
- Cashier: rings sales, checks stock        (create sale, read products)
- Manager: products, stock, reports          (+ write products, read reports)
- Admin: everything incl. users/roles       (+ write users)

## Goals (MVP)
1. Products CRUD with SKU, price, cost, quantity, reorder level
2. POS sale flow: cart -> checkout -> stock decrement -> receipt
3. Audit trail: every sale + stock change attributed to a user, timestamped
4. Returns: reverse a sale, restock, keep ledger consistent
5. Dashboard: today's revenue, sales count, low-stock alerts, top products
6. Role-based access (JWT, middleware-enforced)

## Non-goals (v1)
Payments hardware, barcode scanners, multi-branch, offline sync, accounting
exports, customer loyalty. Parked in docs/ROADMAP.md.

## Architecture
Client (React/Vite) -> REST/JSON -> Express API -> Mongoose -> MongoDB

- Single source of truth: the Sale + StockMovement ledgers. Inventory
  quantities are derived-but-cached; the ledger is authoritative.
- Auth: JWT access token, roles in token payload, middleware per route.

## Data model
Product{sku,name,category,price,cost,qty,reorderLevel,supplier?}
Sale{number,lineItems[{product,sku,name,qty,unitPrice,unitCost}],subtotal,
     discount,total,paymentMethod,cashier,status,createdAt}
StockMovement{product,delta,kind:SALE|RETURN|ADJUST|RECEIVE,ref,by,at,note}
ReturnSale{sale,lines[{product,qty,restocked}],by,reason}
User{name,email,passwordHash,role}
Counter{key:"saleNumber",seq}  — atomic sale numbering

## Key design decisions
1. **Ledger over mutable qty**: qty is fast-cache; StockMovement ledger is
   truth. Rebuildable quantities = real accountability.
2. **Denormalized sale lines**: snapshot sku/name/price INTO the sale —
   historical sales never rot when products change (audit-grade).
3. **Atomic sale numbering** via findOneAndUpdate on a Counter — no race
   conditions, no duplicate sale numbers.
4. **Transactional checkout** (Mongo session): sale + movements + qty
   decrement commit together or not at all.

## Testing strategy
- Unit: pure logic (totals, discount math) — jest
- Integration: API routes against real Mongo — jest/supertest
CI runs server tests on every push; no red build lands.

## Risks
- Stock drift if writes bypass service layer -> all writes go through
  services that ALWAYS emit movements.
- JWT theft -> short expiry + server-side role checks (defense in depth).
