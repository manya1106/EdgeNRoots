const request = require('supertest');
const app = require('../backend/src/app');
const pool = require('../backend/src/db/connection');
const LedgerRepository = require('../backend/src/repositories/ledger.repository');
const { runInTransaction } = require('../backend/src/db/transaction');

describe('Insurance Policy & Accounting Backend Module - Integration Test Suite', () => {
  beforeAll(async () => {
    // Ensure clean state and seeded accounts
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
  });

  afterAll(async () => {
    await pool.end();
  });

  // ==========================================
  // STEP 5: Customer Management & Validation
  // ==========================================
  describe('Step 5: POST /customers', () => {
    it('should successfully create a new customer (201)', async () => {
      const res = await request(app)
        .post('/customers')
        .send({
          name: 'Jane Doe',
          email: 'jane.doe@example.com'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe('Jane Doe');
      expect(res.body.data.email).toBe('jane.doe@example.com');
    });

    it('should reject missing name (400)', async () => {
      const res = await request(app)
        .post('/customers')
        .send({
          email: 'noname@example.com'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject malformed email (400)', async () => {
      const res = await request(app)
        .post('/customers')
        .send({
          name: 'Bad Email User',
          email: 'not-an-email'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject duplicate customer email with 409 Conflict', async () => {
      const res = await request(app)
        .post('/customers')
        .send({
          name: 'Duplicate Jane',
          email: 'jane.doe@example.com'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================
  // STEP 6: Policy Creation & Double-Entry Booking
  // ==========================================
  describe('Step 6: POST /policies (Double-Entry Booking)', () => {
    let customerId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/customers')
        .send({
          name: 'Policy Holder One',
          email: 'holder1@example.com'
        });
      customerId = res.body.data.id;
    });

    it('should create policy and book double-entry ledger entries (Debit AR = Credit Income + Credit GST)', async () => {
      const res = await request(app)
        .post('/policies')
        .send({
          customer_id: customerId,
          policy_number: 'POL-AUTO-1001',
          premium_amount: 10000,
          gst_rate: 18.0
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total_premium).toBe(11800);
      expect(res.body.data.gst_amount).toBe(1800);
      const policyId = res.body.data.id;

      // Verify ledger entries
      const ledgerRes = await request(app).get(`/policies/${policyId}/ledger`);
      expect(ledgerRes.status).toBe(200);
      const entries = ledgerRes.body.data;
      expect(entries.length).toBe(3);

      // Debit AR: 11800
      const arEntry = entries.find((e) => e.account_code === 'AR');
      expect(arEntry).toBeDefined();
      expect(Number(arEntry.debit)).toBe(11800);
      expect(Number(arEntry.credit)).toBe(0);

      // Credit INCOME_PREMIUM: 10000
      const incomeEntry = entries.find((e) => e.account_code === 'INCOME_PREMIUM');
      expect(incomeEntry).toBeDefined();
      expect(Number(incomeEntry.debit)).toBe(0);
      expect(Number(incomeEntry.credit)).toBe(10000);

      // Credit LIAB_GST: 1800
      const gstEntry = entries.find((e) => e.account_code === 'LIAB_GST');
      expect(gstEntry).toBeDefined();
      expect(Number(gstEntry.debit)).toBe(0);
      expect(Number(gstEntry.credit)).toBe(1800);

      // Mathematical balance verification
      const totalDebit = entries.reduce((s, e) => s + Number(e.debit), 0);
      const totalCredit = entries.reduce((s, e) => s + Number(e.credit), 0);
      expect(totalDebit).toBe(totalCredit);
      expect(totalDebit).toBe(11800);
    });

    it('should reject policy creation with non-existent customer_id (404)', async () => {
      const res = await request(app)
        .post('/policies')
        .send({
          customer_id: 999999,
          policy_number: 'POL-INVALID-CUST',
          premium_amount: 5000
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);

      // Verify no policy was inserted
      const [rows] = await pool.query("SELECT * FROM policies WHERE policy_number = 'POL-INVALID-CUST'");
      expect(rows.length).toBe(0);
    });

    it('should reject duplicate policy_number with 409 Conflict', async () => {
      const res = await request(app)
        .post('/policies')
        .send({
          customer_id: customerId,
          policy_number: 'POL-AUTO-1001', // Already created
          premium_amount: 5000
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject premium_amount <= 0 or non-numeric (400)', async () => {
      const res1 = await request(app)
        .post('/policies')
        .send({
          customer_id: customerId,
          policy_number: 'POL-ZERO',
          premium_amount: 0
        });
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post('/policies')
        .send({
          customer_id: customerId,
          policy_number: 'POL-NEG',
          premium_amount: -500
        });
      expect(res2.status).toBe(400);
    });

    it('Step 13: Mid-transaction failure must cleanly rollback entire transaction without partial rows', async () => {
      const testPolicyNumber = 'POL-ROLLBACK-TEST';

      await expect(
        runInTransaction(async (conn) => {
          // 1. Insert policy
          const [pResult] = await conn.query(
            `INSERT INTO policies (customer_id, policy_number, premium_amount, gst_rate, gst_amount, total_premium, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [customerId, testPolicyNumber, 1000, 18, 180, 1180, 'ACTIVE']
          );

          // 2. Insert transaction
          const [tResult] = await conn.query(
            `INSERT INTO policy_transactions (policy_id, type, amount, description)
             VALUES (?, ?, ?, ?)`,
            [pResult.insertId, 'POLICY_CREATED', 1180, 'Test rollback']
          );

          // 3. Intentionally insert invalid account_id 999999
          await conn.query(
            `INSERT INTO ledger_entries (transaction_id, policy_id, account_id, debit, credit)
             VALUES (?, ?, ?, ?, ?)`,
            [tResult.insertId, pResult.insertId, 999999, 1180, 0]
          );
        })
      ).rejects.toThrow();

      // Verify that the policy table has NO record of POL-ROLLBACK-TEST
      const [policies] = await pool.query('SELECT * FROM policies WHERE policy_number = ?', [testPolicyNumber]);
      expect(policies.length).toBe(0);

      // Verify no orphaned transactions or ledger rows
      const [transactions] = await pool.query(
        "SELECT * FROM policy_transactions WHERE description = 'Test rollback'"
      );
      expect(transactions.length).toBe(0);
    });
  });

  // ==========================================
  // STEP 7: Payments & Concurrency Control
  // ==========================================
  describe('Step 7: POST /payments (Row Locking & Overpayment)', () => {
    let policyId;
    let customerId;

    beforeEach(async () => {
      const custRes = await request(app)
        .post('/customers')
        .send({
          name: 'Payment Tester',
          email: `paytest_${Date.now()}_${Math.random()}@example.com`
        });
      customerId = custRes.body.data.id;

      const polRes = await request(app)
        .post('/policies')
        .send({
          customer_id: customerId,
          policy_number: `POL-PAY-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          premium_amount: 10000,
          gst_rate: 18.0 // Total = 11,800
        });
      policyId = polRes.body.data.id;
    });

    it('should successfully record partial payment with double-entry (Debit Cash, Credit AR)', async () => {
      const res = await request(app)
        .post('/payments')
        .send({
          policy_id: policyId,
          amount: 5000
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(5000);
      expect(res.body.data.remaining_outstanding).toBe(6800);

      // Check summary
      const summaryRes = await request(app).get(`/policies/${policyId}/summary`);
      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.data.total_paid).toBe(5000);
      expect(summaryRes.body.data.outstanding).toBe(6800);

      // Check ledger entries for payment
      const ledgerRes = await request(app).get(`/policies/${policyId}/ledger`);
      const paymentEntries = ledgerRes.body.data.filter((e) => e.transaction_type === 'PAYMENT_RECEIVED');
      expect(paymentEntries.length).toBe(2);

      const cashEntry = paymentEntries.find((e) => e.account_code === 'CASH');
      expect(cashEntry).toBeDefined();
      expect(Number(cashEntry.debit)).toBe(5000);
      expect(Number(cashEntry.credit)).toBe(0);

      const arEntry = paymentEntries.find((e) => e.account_code === 'AR');
      expect(arEntry).toBeDefined();
      expect(Number(arEntry.debit)).toBe(0);
      expect(Number(arEntry.credit)).toBe(5000);
    });

    it('should reject overpayment with 400 Bad Request and leave ledger untouched', async () => {
      // Total premium is 11,800. Attempt payment of 12,000
      const res = await request(app)
        .post('/payments')
        .send({
          policy_id: policyId,
          amount: 12000
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/exceeds outstanding balance/i);

      // Verify no payments or new ledger rows created
      const [payments] = await pool.query('SELECT * FROM payments WHERE policy_id = ?', [policyId]);
      expect(payments.length).toBe(0);

      const summaryRes = await request(app).get(`/policies/${policyId}/summary`);
      expect(summaryRes.body.data.total_paid).toBe(0);
      expect(summaryRes.body.data.outstanding).toBe(11800);
    });

    it('Step 13: Concurrency Test — two simultaneous payments must not allow overpayment', async () => {
      const [res1, res2] = await Promise.all([
        request(app).post('/payments').send({ policy_id: policyId, amount: 7000 }),
        request(app).post('/payments').send({ policy_id: policyId, amount: 7000 })
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([201, 400]);

      // Verify final outstanding balance is strictly non-negative
      const summaryRes = await request(app).get(`/policies/${policyId}/summary`);
      expect(summaryRes.body.data.total_paid).toBe(7000);
      expect(summaryRes.body.data.outstanding).toBe(4800);
      expect(summaryRes.body.data.outstanding).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================
  // STEP 8: Reversal Logic (Insert-Only)
  // ==========================================
  describe('Step 8: Payment Reversals (Insert-Only Correction)', () => {
    let policyId;
    let paymentId;

    beforeEach(async () => {
      const custRes = await request(app)
        .post('/customers')
        .send({
          name: 'Reversal Tester',
          email: `reversal_${Date.now()}_${Math.random()}@example.com`
        });

      const polRes = await request(app)
        .post('/policies')
        .send({
          customer_id: custRes.body.data.id,
          policy_number: `POL-REV-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          premium_amount: 10000,
          gst_rate: 18.0
        });
      policyId = polRes.body.data.id;

      const payRes = await request(app)
        .post('/payments')
        .send({
          policy_id: policyId,
          amount: 4000
        });
      paymentId = payRes.body.data.payment_id;
    });

    it('should reverse payment using insert-only inverse entries without mutating original payment', async () => {
      const res = await request(app)
        .post(`/payments/${paymentId}/reversal`)
        .send({
          reason: 'Customer requested refund'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount_reversed).toBe(4000);
      expect(res.body.data.current_outstanding).toBe(11800);
      expect(res.body.data.total_paid_after_reversal).toBe(0);

      // Verify original payment record is untouched (insert-only principle)
      const [origPayments] = await pool.query('SELECT * FROM payments WHERE id = ?', [paymentId]);
      expect(origPayments.length).toBe(1);
      expect(origPayments[0].payment_type).toBe('PAYMENT');

      // Verify reversal payment record exists
      const [reversalPayments] = await pool.query(
        "SELECT * FROM payments WHERE reversal_of_payment_id = ? AND payment_type = 'REVERSAL'",
        [paymentId]
      );
      expect(reversalPayments.length).toBe(1);

      // Verify ledger entries for reversal
      const ledgerRes = await request(app).get(`/policies/${policyId}/ledger`);
      const revEntries = ledgerRes.body.data.filter((e) => e.transaction_type === 'PAYMENT_REVERSED');
      expect(revEntries.length).toBe(2);

      const arEntry = revEntries.find((e) => e.account_code === 'AR');
      expect(arEntry).toBeDefined();
      expect(Number(arEntry.debit)).toBe(4000);
      expect(Number(arEntry.credit)).toBe(0);

      const cashEntry = revEntries.find((e) => e.account_code === 'CASH');
      expect(cashEntry).toBeDefined();
      expect(Number(cashEntry.debit)).toBe(0);
      expect(Number(cashEntry.credit)).toBe(4000);
    });

    it('should reject reversing an already-reversed payment (409 Conflict)', async () => {
      await request(app).post(`/payments/${paymentId}/reversal`).send();
      const res = await request(app).post(`/payments/${paymentId}/reversal`).send();
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================
  // STEPS 9-11: Read APIs
  // ==========================================
  describe('Steps 9-11: Read APIs', () => {
    let policyId;
    let customerId;

    beforeAll(async () => {
      const cust = await request(app)
        .post('/customers')
        .send({
          name: 'Read API Tester',
          email: 'readapi@example.com'
        });
      customerId = cust.body.data.id;

      const pol = await request(app)
        .post('/policies')
        .send({
          customer_id: customerId,
          policy_number: 'POL-READ-001',
          premium_amount: 20000,
          gst_rate: 18.0
        });
      policyId = pol.body.data.id;

      await request(app).post('/payments').send({ policy_id: policyId, amount: 10000 });
    });

    it('Step 9: GET /policies/:id should return policy joined with customer', async () => {
      const res = await request(app).get(`/policies/${policyId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(policyId);
      expect(res.body.data.policy_number).toBe('POL-READ-001');
      expect(res.body.data.customer_name).toBe('Read API Tester');
      expect(res.body.data.customer_email).toBe('readapi@example.com');
    });

    it('Step 10: GET /policies/:id/ledger should return full chronological audit trail', async () => {
      const res = await request(app).get(`/policies/${policyId}/ledger`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(5);
    });

    it('Step 11: GET /policies/:id/summary should be dynamically computed from ledger', async () => {
      const res = await request(app).get(`/policies/${policyId}/summary`);
      expect(res.status).toBe(200);
      expect(res.body.data.total_premium).toBe(23600);
      expect(res.body.data.total_paid).toBe(10000);
      expect(res.body.data.outstanding).toBe(13600);
    });
  });

  // ==========================================
  // STEP 12: Accounting Integrity Validation Queries
  // ==========================================
  describe('Step 12: Accounting Validation Queries', () => {
    it('should verify that all 4 validation checks pass on the active database', async () => {
      const unbalanced = await LedgerRepository.getUnbalancedTransactions();
      expect(unbalanced.length).toBe(0);

      const orphaned = await LedgerRepository.getOrphanedLedgerEntries();
      expect(orphaned.length).toBe(0);

      const negative = await LedgerRepository.getNegativeOutstandingPolicies();
      expect(negative.length).toBe(0);

      const trialBalance = await LedgerRepository.getTrialBalance();
      expect(trialBalance.total_debit).toBeGreaterThan(0);
      expect(trialBalance.total_credit).toBeGreaterThan(0);
      expect(Math.abs(trialBalance.total_debit - trialBalance.total_credit)).toBeLessThan(0.001);

      const res = await request(app).get('/accounting/validate');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('HEALTHY');
    });
  });
});
