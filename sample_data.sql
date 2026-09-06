-- Sample Data for Insurance Policy & Accounting Module
-- Demonstrates Customers, Policies, Payments, Insert-Only Reversals, and Double-Entry Ledger Entries.

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE ledger_entries;
TRUNCATE TABLE payments;
TRUNCATE TABLE policy_transactions;
TRUNCATE TABLE policies;
TRUNCATE TABLE customers;
TRUNCATE TABLE accounts;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Chart of Accounts
INSERT INTO accounts (id, account_code, account_name, account_type) VALUES
(1, 'AR', 'Accounts Receivable', 'ASSET'),
(2, 'INCOME_PREMIUM', 'Premium Income', 'REVENUE'),
(3, 'LIAB_GST', 'GST Payable', 'LIABILITY'),
(4, 'CASH', 'Cash and Bank', 'ASSET');

-- 2. Sample Customers
INSERT INTO customers (id, name, email) VALUES
(1, 'Alice Smith', 'alice.smith@example.com'),
(2, 'Bob Jones', 'bob.jones@example.com'),
(3, 'Charlie Brown', 'charlie.brown@example.com');

-- 3. Sample Policies
INSERT INTO policies (id, policy_number, customer_id, premium_amount, gst_rate, gst_amount, total_premium, status) VALUES
(1, 'POL-2026-001', 1, 10000.00, 18.00, 1800.00, 11800.00, 'ACTIVE'),
(2, 'POL-2026-002', 2, 25000.00, 18.00, 4500.00, 29500.00, 'ACTIVE'),
(3, 'POL-2026-003', 3, 50000.00, 18.00, 9000.00, 59000.00, 'ACTIVE');

-- 4. Transactions
INSERT INTO policy_transactions (id, policy_id, type, amount, description) VALUES
-- Policy 1 transactions
(1, 1, 'POLICY_CREATED', 11800.00, 'Policy POL-2026-001 created'),
(2, 1, 'PAYMENT_RECEIVED', 5000.00, 'Partial payment received'),
(3, 1, 'PAYMENT_RECEIVED', 6800.00, 'Final balance payment received'),
-- Policy 2 transactions
(4, 2, 'POLICY_CREATED', 29500.00, 'Policy POL-2026-002 created'),
(5, 2, 'PAYMENT_RECEIVED', 10000.00, 'Initial payment received'),
(6, 2, 'PAYMENT_REVERSED', 10000.00, 'Reversal of Payment #3'),
-- Policy 3 transactions
(7, 3, 'POLICY_CREATED', 59000.00, 'Policy POL-2026-003 created');

-- 5. Payments
INSERT INTO payments (id, policy_id, transaction_id, amount, payment_type, reversal_of_payment_id) VALUES
(1, 1, 2, 5000.00, 'PAYMENT', NULL),
(2, 1, 3, 6800.00, 'PAYMENT', NULL),
(3, 2, 5, 10000.00, 'PAYMENT', NULL),
(4, 2, 6, 10000.00, 'REVERSAL', 3);

-- 6. Double-Entry Ledger Entries (Debit == Credit for every transaction)
INSERT INTO ledger_entries (transaction_id, policy_id, account_id, debit, credit) VALUES
-- Transaction 1: Policy 1 Created (₹11,800 total)
(1, 1, 1, 11800.00, 0.00),    -- Debit AR
(1, 1, 2, 0.00, 10000.00),    -- Credit Premium Income
(1, 1, 3, 0.00, 1800.00),     -- Credit GST Payable

-- Transaction 2: Payment 1 Received (₹5,000)
(2, 1, 4, 5000.00, 0.00),     -- Debit Cash
(2, 1, 1, 0.00, 5000.00),     -- Credit AR

-- Transaction 3: Payment 2 Received (₹6,800)
(3, 1, 4, 6800.00, 0.00),     -- Debit Cash
(3, 1, 1, 0.00, 6800.00),     -- Credit AR

-- Transaction 4: Policy 2 Created (₹29,500 total)
(4, 2, 1, 29500.00, 0.00),    -- Debit AR
(4, 2, 2, 0.00, 25000.00),    -- Credit Premium Income
(4, 2, 3, 0.00, 4500.00),     -- Credit GST Payable

-- Transaction 5: Payment 3 Received (₹10,000)
(5, 2, 4, 10000.00, 0.00),    -- Debit Cash
(5, 2, 1, 0.00, 10000.00),    -- Credit AR

-- Transaction 6: Payment Reversal of Payment 3 (₹10,000 - Inverse Double Entry)
(6, 2, 1, 10000.00, 0.00),    -- Debit AR (restore receivable)
(6, 2, 4, 0.00, 10000.00),    -- Credit Cash (reduce cash)

-- Transaction 7: Policy 3 Created (₹59,000 total)
(7, 3, 1, 59000.00, 0.00),    -- Debit AR
(7, 3, 2, 0.00, 50000.00),    -- Credit Premium Income
(7, 3, 3, 0.00, 9000.00);     -- Credit GST Payable
