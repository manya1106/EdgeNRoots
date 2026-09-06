import { test, expect } from '@playwright/test';
import { getDbConnection, clearTestData } from './helpers/db';
import mysql from 'mysql2/promise';

test.describe('Backend API - Customer Management', () => {
  let dbPool: mysql.Pool;

  test.beforeAll(async () => {
    dbPool = getDbConnection();
    await clearTestData(dbPool);
  });

  test.afterAll(async () => {
    await dbPool.end();
  });

  test('Create customer with valid data -> 201 Created and ID returned', async ({ request }) => {
    const email = `valid_${Date.now()}@example.com`;
    const res = await request.post('/api/v1/customers', {
      data: { name: 'Alice Smith', email }
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeGreaterThan(0);
    expect(body.data.name).toBe('Alice Smith');
    expect(body.data.email).toBe(email);

    // SQL verification
    const [rows] = await dbPool.query('SELECT * FROM customers WHERE email = ?', [email]);
    expect((rows as any[]).length).toBe(1);
  });

  test('Missing name -> 400 Bad Request', async ({ request }) => {
    const res = await request.post('/api/v1/customers', {
      data: { email: `noname_${Date.now()}@example.com` }
    });
    expect(res.status()).toBe(400);
  });

  test('Missing email -> 400 Bad Request', async ({ request }) => {
    const res = await request.post('/api/v1/customers', {
      data: { name: 'No Email User' }
    });
    expect(res.status()).toBe(400);
  });

  test('Malformed email format -> 400 Bad Request', async ({ request }) => {
    const res = await request.post('/api/v1/customers', {
      data: { name: 'Bad Email', email: 'not-an-email' }
    });
    expect(res.status()).toBe(400);
  });

  test('Duplicate email -> 409 Conflict', async ({ request }) => {
    const email = `dup_${Date.now()}@example.com`;
    // First creation
    await request.post('/api/v1/customers', { data: { name: 'Original', email } });
    
    // Duplicate creation
    const res = await request.post('/api/v1/customers', { data: { name: 'Duplicate', email } });
    expect(res.status()).toBe(409);

    // Verify DB contains only 1 row
    const [rows] = await dbPool.query('SELECT * FROM customers WHERE email = ?', [email]);
    expect((rows as any[]).length).toBe(1);
  });

  test('SQL-injection-shaped input in name is safely stored as literal text', async ({ request }) => {
    const sqlInjectionName = "Robert'); DROP TABLE customers;--";
    const email = `sql_inj_${Date.now()}@example.com`;

    const res = await request.post('/api/v1/customers', {
      data: { name: sqlInjectionName, email }
    });

    expect(res.status()).toBe(201);

    // Verify customers table still exists and data was literal-escaped
    const [rows] = await dbPool.query('SELECT * FROM customers WHERE email = ?', [email]);
    expect((rows as any[]).length).toBe(1);
    expect((rows as any[])[0].name).toBe(sqlInjectionName);
  });
});
