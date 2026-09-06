-- Seed standard Chart of Accounts
INSERT INTO accounts (account_code, account_name, account_type) VALUES
('AR', 'Accounts Receivable', 'ASSET'),
('INCOME_PREMIUM', 'Premium Income', 'REVENUE'),
('LIAB_GST', 'GST Payable', 'LIABILITY'),
('CASH', 'Cash and Bank', 'ASSET')
ON DUPLICATE KEY UPDATE account_name = VALUES(account_name), account_type = VALUES(account_type);
