-- Schema for Insurance Policy & Accounting Module
-- Enforces double-entry bookkeeping, relational integrity, and insert-only financial ledgers.

CREATE TABLE IF NOT EXISTS accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_code VARCHAR(50) NOT NULL UNIQUE,
  account_name VARCHAR(100) NOT NULL,
  account_type ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS policies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  policy_number VARCHAR(100) NOT NULL UNIQUE,
  customer_id INT NOT NULL,
  premium_amount DECIMAL(12, 2) NOT NULL,
  gst_rate DECIMAL(5, 2) NOT NULL DEFAULT 18.00,
  gst_amount DECIMAL(12, 2) NOT NULL,
  total_premium DECIMAL(12, 2) NOT NULL,
  status ENUM('ACTIVE', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_policies_customer_id (customer_id),
  CONSTRAINT fk_policies_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  CONSTRAINT chk_premium_positive CHECK (premium_amount > 0),
  CONSTRAINT chk_total_premium_positive CHECK (total_premium > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS policy_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  policy_id INT NOT NULL,
  type ENUM('POLICY_CREATED', 'PAYMENT_RECEIVED', 'PAYMENT_REVERSED') NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_policy_transactions_policy_id (policy_id),
  CONSTRAINT fk_transactions_policy FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  policy_id INT NOT NULL,
  transaction_id INT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_type ENUM('PAYMENT', 'REVERSAL') NOT NULL DEFAULT 'PAYMENT',
  reversal_of_payment_id INT NULL,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payments_policy_id (policy_id),
  INDEX idx_payments_reversal (reversal_of_payment_id),
  CONSTRAINT fk_payments_policy FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payments_transaction FOREIGN KEY (transaction_id) REFERENCES policy_transactions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payments_reversal FOREIGN KEY (reversal_of_payment_id) REFERENCES payments(id) ON DELETE RESTRICT,
  CONSTRAINT chk_payment_amount_positive CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ledger_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT NOT NULL,
  policy_id INT NOT NULL,
  account_id INT NOT NULL,
  debit DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  credit DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ledger_entries_policy_id (policy_id),
  INDEX idx_ledger_entries_transaction_id (transaction_id),
  INDEX idx_ledger_entries_account_id (account_id),
  CONSTRAINT fk_ledger_transaction FOREIGN KEY (transaction_id) REFERENCES policy_transactions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ledger_policy FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ledger_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
  CONSTRAINT chk_debit_credit_non_negative CHECK (debit >= 0.00 AND credit >= 0.00),
  CONSTRAINT chk_debit_or_credit_positive CHECK (debit > 0.00 OR credit > 0.00),
  CONSTRAINT chk_not_both_debit_and_credit CHECK (NOT (debit > 0.00 AND credit > 0.00))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
