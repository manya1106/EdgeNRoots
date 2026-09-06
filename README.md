# Insurance Policy & Double-Entry Accounting Module

A production-ready insurance backend module built with **Node.js, Express.js, and MySQL**, enforcing double-entry bookkeeping, ACID transactional safety, insert-only financial ledgers, and pessimistic row locking for concurrency control.

---

## 📁 Repository Structure

```
EdgeNRoots/
├── backend/                        # Backend Application & Database Files
│   ├── src/
│   │   ├── routes/                 # Endpoint definitions only (no business logic)
│   │   ├── controllers/            # Request/Response parsing (no business logic)
│   │   ├── services/               # Double-entry & accounting business logic
│   │   ├── repositories/           # Parameterized raw SQL queries only
│   │   ├── db/                     # mysql2 connection pool & transaction wrapper
│   │   ├── validators/             # Joi input validation schemas
│   │   ├── middlewares/            # Centralized error & JSON parse safety
│   │   ├── utils/                  # GST calculator & error classes
│   │   ├── app.js                  # Express app setup with security headers
│   │   └── server.js               # Server entry point & graceful shutdown
│   ├── scripts/
│   │   ├── initDb.js               # Automated schema & seed runner
│   │   └── runValidationQueries.js # 4 SQL accounting integrity audit checks
│   ├── schema.sql                  # MySQL table definitions with constraints & indexes
│   ├── seed.sql                    # Initial Chart of Accounts seed
│   ├── package.json                # Backend dependencies
│   ├── .env                        # Backend environment configuration
│   └── .env.example                # Template for environment variables
├── frontend/                       # React + Vite Companion Client App
│   ├── src/                        # UI components & pages with data-testid attributes
│   ├── vite.config.js              # Vite server & backend proxy
│   └── package.json                # Frontend dependencies
├── tests/
│   ├── accounting.test.js          # Jest integration test suite (18 tests)
│   ├── backend/                    # Playwright backend API & security test suite (23 tests)
│   └── frontend/                   # Playwright frontend UI & safety test suite (21 tests)
├── Insurance_Policy_Accounting.postman_collection.json # Postman / Thunder Client API Collection
├── playwright.config.ts            # E2E test runner configuration
└── README.md                       # Comprehensive setup & architecture documentation
```

---

## 🛠️ Tech Stack & Requirements

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MySQL Server (v8+) with `mysql2/promise` connection pool
- **Validation**: Joi
- **Testing**: Jest, Supertest, Playwright

---

## 🗄️ 1. Database Schema & Design

The database model enforces strict relational constraints and indexing across 6 core tables:

1. **`accounts`**: Master Chart of Accounts (`AR`, `INCOME_PREMIUM`, `LIAB_GST`, `CASH`) with `account_type` (`ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`).
2. **`customers`**: Policyholders with unique email constraints.
3. **`policies`**: Insurance contracts tracking `premium_amount`, `gst_rate` (18%), `gst_amount`, and `total_premium`.
4. **`policy_transactions`**: Financial journal header tracking event types (`POLICY_CREATED`, `PAYMENT_RECEIVED`, `PAYMENT_REVERSED`).
5. **`payments`**: Records cash collection and references reversal audit records (`reversal_of_payment_id`).
6. **`ledger_entries`**: Immutable line items recording `debit`, `credit`, `account_id`, `policy_id`, and `transaction_id`.

### Constraints & Integrity Rules
- `ON DELETE RESTRICT` on all foreign keys (financial entries can never be deleted or orphaned).
- Check constraint `chk_not_both_debit_and_credit`: A single ledger line must be either debit or credit, never both.

---

## 📊 2. Accounting Ledger & Double-Entry Logic

Every financial operation creates balanced double-entry ledger records where:
$$\sum \text{Debits} = \sum \text{Credits}$$

### Worked Accounting Example

#### Policy Creation (Base Premium: ₹10,000, GST 18%: ₹1,800, Total: ₹11,800)

| Account Name | Account Code | Account Type | Debit (₹) | Credit (₹) | Explanation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Customer Receivable** | `AR` | ASSET | 11,800.00 | 0.00 | Receivable asset increases |
| **Premium Income** | `INCOME_PREMIUM` | REVENUE | 0.00 | 10,000.00 | Revenue recognized |
| **GST Payable** | `LIAB_GST` | LIABILITY | 0.00 | 1,800.00 | Tax liability owed |
| **Total** | | | **11,800.00** | **11,800.00** | **Balanced** |

#### Payment Received (₹5,000 Payment)

| Account Name | Account Code | Account Type | Debit (₹) | Credit (₹) | Explanation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cash and Bank** | `CASH` | ASSET | 5,000.00 | 0.00 | Cash asset increases |
| **Customer Receivable** | `AR` | ASSET | 0.00 | 5,000.00 | Receivable decreases |
| **Total** | | | **5,000.00** | **5,000.00** | **Balanced** |

---

## 🔒 3. Concurrency Control & MySQL Transactions

- **ACID Transactions**: Every multi-table write uses `runInTransaction()` which wraps queries in `START TRANSACTION`, `COMMIT`, and automatic `ROLLBACK` on error.
- **Pessimistic Row Locking (`FOR UPDATE`)**: During payment processing (`POST /payments`), the policy row is locked exclusively:
  ```sql
  SELECT total_premium, status FROM policies WHERE id = ? FOR UPDATE;
  ```
  This prevents race conditions when simultaneous payment requests are submitted, guaranteeing that combined payments can never exceed the outstanding balance.

---

## 🔄 4. Mandatory Insert-Only Architecture & Reversals

- **No `UPDATE` or `DELETE`** queries are ever executed on business or financial ledger tables.
- **Reversals**: When a payment correction or refund is needed, `POST /payments/:id/reversal` inserts a new `PAYMENT_REVERSED` transaction with exact inverse ledger entries (**Credit Cash, Debit AR**), restoring the outstanding balance while preserving full transaction history.

---

## 📮 5. Postman / Thunder Client API Collection

The repository includes a ready-to-import API collection file: **`Insurance_Policy_Accounting.postman_collection.json`**.

### What the API Collection Covers:
This collection is organized into 5 folders containing pre-configured requests with example payloads and environment variables (`baseUrl` = `http://localhost:5008`):

1. **`1. Customers`**:
   - `POST /customers` — Create a new customer (with email uniqueness handling)
   - `GET /customers` — List all registered customers
   - `GET /customers/:id` — Fetch customer by ID
2. **`2. Policies`**:
   - `POST /policies` — Book policy with automatic GST calculation and double-entry ledger posting
   - `GET /policies/:id` — Retrieve policy joined with customer details
3. **`3. Payments & Reversals`**:
   - `POST /payments` — Record partial/full payment with pessimistic row locking
   - `POST /payments/:id/reversal` — Execute an insert-only payment reversal
4. **`4. Ledger & Summaries`**:
   - `GET /policies/:id/ledger` — Chronological double-entry audit trail
   - `GET /policies/:id/summary` — Dynamically computed summary (`total_premium`, `total_paid`, `outstanding`)
   - `GET /accounting/validate` — Run the 4 automated SQL accounting audit checks
5. **`5. Negative Tests (Failure Scenarios)`**:
   - Invalid customer ID (`404`)
   - Duplicate policy number (`409`)
   - Overpayment exceeding outstanding balance (`400`)
   - Duplicate payment reversal attempt (`409`)

### How to Import & Use:
1. Open Postman or Thunder Client in VS Code.
2. Click **Import** and select `Insurance_Policy_Accounting.postman_collection.json`.
3. Ensure the environment variable `baseUrl` is set to `http://localhost:5008` (or your active server port).

---

## 🚀 6. Setup & Execution Instructions

### Prerequisites
- Node.js (v18+)
- MySQL Server (v8+)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` in `backend/` to `.env`:
```bash
cp backend/.env.example backend/.env
```
Ensure `backend/.env` has your MySQL credentials:
```env
PORT=5008
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=insurance_accounting
```

### 3. Initialize & Seed Database
Run the initialization script:
```bash
npm run db:init
```
This creates the database, applies [`backend/schema.sql`](file:///Users/manyakaushik1106/Desktop/GITHUB/EdgeNRoots/backend/schema.sql), and seeds [`backend/seed.sql`](file:///Users/manyakaushik1106/Desktop/GITHUB/EdgeNRoots/backend/seed.sql).

### 4. Start the Application
```bash
# Start backend server
npm start

# Development mode with hot reload
npm run dev

# Optional: Start companion frontend UI
npm run dev:frontend
```

---

## 🧪 7. Testing & SQL Integrity Audits

### Run Jest Integration Tests
```bash
npm test
```
*Executes 18 integration tests covering double-entry balance, transactional rollback, overpayment rejection, and reversals.*

### Run Automated SQL Integrity Queries
```bash
npm run db:validate
```
*Executes 4 SQL audit queries:*
1. **Balanced Transactions**: `HAVING SUM(debit) <> SUM(credit)` (Expected: 0 rows)
2. **No Orphaned Entries**: `LEFT JOIN policy_transactions WHERE pt.id IS NULL` (Expected: 0 rows)
3. **Non-Negative Outstanding**: `HAVING paid > total_premium` (Expected: 0 rows)
4. **Trial Balance**: `SUM(debit) == SUM(credit)` (Expected: Balanced)

### Run Full Playwright End-to-End Test Suite (44 Tests)
```bash
npm run test:e2e
```
*Executes 23 backend API tests and 21 frontend UI tests.*
