import { test, expect } from '@playwright/test';

test.describe('Backend API - Security, Input Sanitization, and Error Masking', () => {
  test('Malformed JSON body returns 400 without 500 server crash', async ({ request }) => {
    const res = await request.post('/api/v1/customers', {
      headers: { 'Content-Type': 'application/json' },
      data: '{ malformed_json: }'
    });

    expect(res.status()).toBe(400);
  });

  test('Error responses never leak stack traces or raw SQL details', async ({ request }) => {
    const res = await request.post('/api/v1/policies', {
      data: { customer_id: 999999, policy_number: 'INVALID', premium_amount: 100 }
    });

    expect(res.status()).toBe(404);
    const text = await res.text();
    expect(text).not.toContain('at Object.');
    expect(text).not.toContain('mysql2');
    expect(text).not.toContain('SELECT');
  });

  test('Unimplemented HTTP methods return 404/405 without 500 crash', async ({ request }) => {
    const res = await request.delete('/api/v1/policies/1');
    expect([404, 405]).toContain(res.status());
  });
});
