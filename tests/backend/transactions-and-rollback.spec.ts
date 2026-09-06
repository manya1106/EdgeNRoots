import { test, expect } from '@playwright/test';
import { getDbConnection } from './helpers/db';
import mysql from 'mysql2/promise';

test.describe('Backend API - Transactions, Rollbacks, and Database Integrity', () => {
  let dbPool: mysql.Pool;

  test.beforeAll(async () => {
    dbPool = getDbConnection();
  });

  test.afterAll(async () => {
    await dbPool.end();
  });

  test('Verify zero orphaned ledger entries in entire database', async () => {
    const [rows] = await dbPool.query(
      `SELECT le.* FROM ledger_entries le
       LEFT JOIN policy_transactions pt ON le.transaction_id = pt.id
       WHERE pt.id IS NULL`
    );
    expect((rows as any[]).length).toBe(0);
  });

  test('Verify all transactions in database are strictly balanced (SUM(debit) == SUM(credit))', async () => {
    const [rows] = await dbPool.query(
      `SELECT transaction_id, SUM(debit) AS d, SUM(credit) AS c
       FROM ledger_entries
       GROUP BY transaction_id
       HAVING SUM(debit) <> SUM(credit)`
    );
    expect((rows as any[]).length).toBe(0);
  });

  test('Verify GET /accounting/validate API endpoint reports HEALTHY status', async ({ request }) => {
    const res = await request.get('/api/v1/accounting/validate');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data.status).toBe('HEALTHY');
    expect(body.data.checks.unbalanced_transactions.passed).toBe(true);
    expect(body.data.checks.orphaned_ledger_entries.passed).toBe(true);
    expect(body.data.checks.negative_outstanding_policies.passed).toBe(true);
    expect(body.data.checks.trial_balance.passed).toBe(true);
  });
});
