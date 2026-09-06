import { test, expect } from '@playwright/test';
import { getDbConnection } from './helpers/db';
import { createCustomerFixture, createPolicyFixture } from './helpers/api';
import mysql from 'mysql2/promise';

test.describe('Backend API - Payments & Overpayment Control', () => {
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

  test('Valid partial payment -> 201 Created and verifies 2 balanced ledger rows', async ({ request }) => {
    const res = await request.post('/api/v1/payments', {
      data: { policy_id: policyId, amount: 5000 }
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.data.remaining_outstanding).toBe(6800);

    // Verify DB ledger entries
    const [payments] = await dbPool.query('SELECT * FROM payments WHERE policy_id = ?', [policyId]);
    expect((payments as any[]).length).toBe(1);

    const [ledgerRows] = await dbPool.query(
      "SELECT le.* FROM ledger_entries le JOIN policy_transactions pt ON le.transaction_id = pt.id WHERE le.policy_id = ? AND pt.type = 'PAYMENT_RECEIVED'",
      [policyId]
    );
    expect((ledgerRows as any[]).length).toBe(2);

    const totalDebit = (ledgerRows as any[]).reduce((s, r) => s + Number(r.debit), 0);
    const totalCredit = (ledgerRows as any[]).reduce((s, r) => s + Number(r.credit), 0);
    expect(totalDebit).toBe(totalCredit);
    expect(totalDebit).toBe(5000);
  });

  test('Overpayment rejection -> 400 Bad Request and 0 payment rows created', async ({ request }) => {
    const res = await request.post('/api/v1/payments', {
      data: { policy_id: policyId, amount: 12000 }
    });

    expect(res.status()).toBe(400);

    const [payments] = await dbPool.query('SELECT * FROM payments WHERE policy_id = ?', [policyId]);
    expect((payments as any[]).length).toBe(0);
  });

  test('Payment on non-existent policy_id -> 404 Not Found', async ({ request }) => {
    const res = await request.post('/api/v1/payments', {
      data: { policy_id: 999999, amount: 1000 }
    });
    expect(res.status()).toBe(404);
  });
});
