import { test, expect } from '@playwright/test';
import { getDbConnection } from './helpers/db';
import { createCustomerFixture, createPolicyFixture } from './helpers/api';
import mysql from 'mysql2/promise';

test.describe('Backend API - Ledger Audit & Summary Endpoints', () => {
  let dbPool: mysql.Pool;
  let policyId: number;

  test.beforeAll(async () => {
    dbPool = getDbConnection();
  });

  test.beforeEach(async ({ request }) => {
    const cust = await createCustomerFixture(request);
    const pol = await createPolicyFixture(request, cust.data.id, undefined, 20000, 18.0); // Total = 23,600
    policyId = pol.data.id;
  });

  test.afterAll(async () => {
    await dbPool.end();
  });

  test('GET /policies/:id/ledger returns chronological entries', async ({ request }) => {
    await request.post('/api/v1/payments', { data: { policy_id: policyId, amount: 5000 } });

    const res = await request.get(`/api/v1/policies/${policyId}/ledger`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data.length).toBe(5); // 3 for policy creation + 2 for payment
    expect(body.data[0].account_code).toBeDefined();
  });

  test('GET /policies/:id/summary dynamically matches ledger calculations', async ({ request }) => {
    await request.post('/api/v1/payments', { data: { policy_id: policyId, amount: 10000 } });

    const res = await request.get(`/api/v1/policies/${policyId}/summary`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data.total_premium).toBe(23600);
    expect(body.data.total_paid).toBe(10000);
    expect(body.data.outstanding).toBe(13600);
  });
});
