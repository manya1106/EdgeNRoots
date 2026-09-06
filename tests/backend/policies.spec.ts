import { test, expect } from '@playwright/test';
import { getDbConnection } from './helpers/db';
import { createCustomerFixture } from './helpers/api';
import mysql from 'mysql2/promise';

test.describe('Backend API - Policy Creation & Double-Entry Bookkeeping', () => {
  let dbPool: mysql.Pool;
  let customerId: number;

  test.beforeAll(async () => {
    dbPool = getDbConnection();
  });

  test.beforeEach(async ({ request }) => {
    const cust = await createCustomerFixture(request);
    customerId = cust.data.id;
  });

  test.afterAll(async () => {
    await dbPool.end();
  });

  test('Create valid policy -> 201 Created and verifies double-entry ledger in DB', async ({ request }) => {
    const polNum = `POL-TEST-${Date.now()}`;
    const res = await request.post('/api/v1/policies', {
      data: {
        customer_id: customerId,
        policy_number: polNum,
        premium_amount: 10000,
        gst_rate: 18.0
      }
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.data.total_premium).toBe(11800);
    expect(body.data.gst_amount).toBe(1800);

    const policyId = body.data.id;

    // Database verification:
    // Exactly 1 policy_transactions row and 3 ledger_entries rows
    const [txRows] = await dbPool.query('SELECT * FROM policy_transactions WHERE policy_id = ?', [policyId]);
    expect((txRows as any[]).length).toBe(1);

    const [ledgerRows] = await dbPool.query('SELECT * FROM ledger_entries WHERE policy_id = ?', [policyId]);
    expect((ledgerRows as any[]).length).toBe(3);

    // Sum of Debit === Sum of Credit
    const totalDebit = (ledgerRows as any[]).reduce((s, r) => s + Number(r.debit), 0);
    const totalCredit = (ledgerRows as any[]).reduce((s, r) => s + Number(r.credit), 0);
    expect(totalDebit).toBe(totalCredit);
    expect(totalDebit).toBe(11800);
  });

  test('Non-existent customer_id -> 404 Not Found and 0 policies inserted', async ({ request }) => {
    const polNum = `POL-404-${Date.now()}`;
    const res = await request.post('/api/v1/policies', {
      data: {
        customer_id: 999999,
        policy_number: polNum,
        premium_amount: 5000
      }
    });

    expect(res.status()).toBe(404);

    const [rows] = await dbPool.query('SELECT * FROM policies WHERE policy_number = ?', [polNum]);
    expect((rows as any[]).length).toBe(0);
  });

  test('Duplicate policy_number -> 409 Conflict', async ({ request }) => {
    const polNum = `POL-DUP-${Date.now()}`;
    await request.post('/api/v1/policies', {
      data: { customer_id: customerId, policy_number: polNum, premium_amount: 5000 }
    });

    const res = await request.post('/api/v1/policies', {
      data: { customer_id: customerId, policy_number: polNum, premium_amount: 5000 }
    });

    expect(res.status()).toBe(409);
  });

  test('premium_amount = 0 -> 400 Bad Request', async ({ request }) => {
    const res = await request.post('/api/v1/policies', {
      data: { customer_id: customerId, policy_number: `POL-ZERO-${Date.now()}`, premium_amount: 0 }
    });
    expect(res.status()).toBe(400);
  });

  test('premium_amount negative -> 400 Bad Request', async ({ request }) => {
    const res = await request.post('/api/v1/policies', {
      data: { customer_id: customerId, policy_number: `POL-NEG-${Date.now()}`, premium_amount: -500 }
    });
    expect(res.status()).toBe(400);
  });
});
