import { test, expect } from '@playwright/test';
import { getDbConnection } from './helpers/db';
import { createCustomerFixture, createPolicyFixture } from './helpers/api';
import mysql from 'mysql2/promise';

test.describe('Backend API - High Concurrency & Row Locking (FOR UPDATE)', () => {
  let dbPool: mysql.Pool;
  let policyId: number;

  test.beforeAll(async () => {
    dbPool = getDbConnection();
  });

  test.beforeEach(async ({ request }) => {
    const cust = await createCustomerFixture(request);
    const pol = await createPolicyFixture(request, cust.data.id, undefined, 10000, 18.0); // Total = 11,800
    policyId = pol.data.id;
  });

  test.afterAll(async () => {
    await dbPool.end();
  });

  test('Simultaneous payment requests exceeding outstanding -> exactly one succeeds, outstanding never negative', async ({ request }) => {
    // Outstanding = 11,800. Fire two simultaneous requests for 7,000 each (Total attempted = 14,000 > 11,800).
    const [res1, res2] = await Promise.all([
      request.post('/api/v1/payments', { data: { policy_id: policyId, amount: 7000 } }),
      request.post('/api/v1/payments', { data: { policy_id: policyId, amount: 7000 } })
    ]);

    const statuses = [res1.status(), res2.status()].sort();
    expect(statuses).toEqual([201, 400]);

    // SQL verification that total paid is 7000 and remaining outstanding is 4800
    const [summaryRows] = await dbPool.query(
      `SELECT
        p.total_premium,
        COALESCE(SUM(CASE WHEN a.account_code = 'CASH' THEN le.debit - le.credit ELSE 0 END), 0) AS total_paid
       FROM policies p
       LEFT JOIN ledger_entries le ON le.policy_id = p.id
       LEFT JOIN accounts a ON le.account_id = a.id
       WHERE p.id = ?
       GROUP BY p.id, p.total_premium`,
      [policyId]
    );

    const totalPaid = Number((summaryRows as any[])[0].total_paid);
    const totalPremium = Number((summaryRows as any[])[0].total_premium);
    expect(totalPaid).toBe(7000);
    expect(totalPremium - totalPaid).toBe(4800);
    expect(totalPremium - totalPaid).toBeGreaterThanOrEqual(0);
  });
});
