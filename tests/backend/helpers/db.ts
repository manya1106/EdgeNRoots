import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../backend/.env') });

export function getDbConnection() {
  return mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'insurance_accounting',
    waitForConnections: true,
    connectionLimit: 5,
    decimalNumbers: true
  });
}

export async function clearTestData(pool: mysql.Pool) {
  await pool.query('SET FOREIGN_KEY_CHECKS = 0;');
  await pool.query('TRUNCATE TABLE ledger_entries;');
  await pool.query('TRUNCATE TABLE payments;');
  await pool.query('TRUNCATE TABLE policy_transactions;');
  await pool.query('TRUNCATE TABLE policies;');
  await pool.query('TRUNCATE TABLE customers;');
  await pool.query('SET FOREIGN_KEY_CHECKS = 1;');

  await pool.query(`
    INSERT INTO accounts (account_code, account_name, account_type) VALUES
    ('AR', 'Accounts Receivable', 'ASSET'),
    ('INCOME_PREMIUM', 'Premium Income', 'REVENUE'),
    ('LIAB_GST', 'GST Payable', 'LIABILITY'),
    ('CASH', 'Cash and Bank', 'ASSET')
    ON DUPLICATE KEY UPDATE account_name = VALUES(account_name);
  `);
}
