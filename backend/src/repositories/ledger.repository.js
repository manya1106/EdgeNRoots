const defaultPool = require('../db/connection');

class LedgerRepository {
  static async createPolicyTransaction(
    { policy_id, type, amount, description = null },
    conn = defaultPool
  ) {
    const [result] = await conn.query(
      `INSERT INTO policy_transactions (policy_id, type, amount, description)
       VALUES (?, ?, ?, ?)`,
      [policy_id, type, amount, description]
    );
    return {
      id: result.insertId,
      policy_id,
      type,
      amount,
      description
    };
  }

  static async createLedgerEntries(entries, conn = defaultPool) {
    if (!entries || entries.length === 0) return [];

    const values = entries.map((e) => [
      e.transaction_id,
      e.policy_id,
      e.account_id,
      e.debit || 0.0,
      e.credit || 0.0
    ]);

    const [result] = await conn.query(
      `INSERT INTO ledger_entries (transaction_id, policy_id, account_id, debit, credit)
       VALUES ?`,
      [values]
    );

    return result;
  }

  static async getTransactionDebitCredit(transaction_id, conn = defaultPool) {
    const [rows] = await conn.query(
      `SELECT 
        COALESCE(SUM(debit), 0) AS total_debit, 
        COALESCE(SUM(credit), 0) AS total_credit 
       FROM ledger_entries 
       WHERE transaction_id = ?`,
      [transaction_id]
    );
    return {
      total_debit: Number(rows[0]?.total_debit || 0),
      total_credit: Number(rows[0]?.total_credit || 0)
    };
  }

  static async getLedgerEntriesByPolicyId(policy_id, conn = defaultPool) {
    const [rows] = await conn.query(
      `SELECT 
        le.id,
        le.transaction_id,
        pt.type AS transaction_type,
        a.account_code,
        a.account_name,
        a.account_type,
        le.debit,
        le.credit,
        le.created_at
       FROM ledger_entries le
       JOIN accounts a ON le.account_id = a.id
       JOIN policy_transactions pt ON le.transaction_id = pt.id
       WHERE le.policy_id = ?
       ORDER BY le.created_at ASC, le.id ASC`,
      [policy_id]
    );
    return rows;
  }

  static async getPolicyLedgerSummary(policy_id, conn = defaultPool) {
    const [rows] = await conn.query(
      `SELECT
        p.id AS policy_id,
        p.policy_number,
        p.total_premium,
        COALESCE(SUM(CASE WHEN a.account_code = 'CASH' THEN le.debit - le.credit ELSE 0 END), 0) AS total_paid,
        p.total_premium - COALESCE(SUM(CASE WHEN a.account_code = 'CASH' THEN le.debit - le.credit ELSE 0 END), 0) AS outstanding
       FROM policies p
       LEFT JOIN ledger_entries le ON le.policy_id = p.id
       LEFT JOIN accounts a ON le.account_id = a.id
       WHERE p.id = ?
       GROUP BY p.id, p.policy_number, p.total_premium`,
      [policy_id]
    );
    return rows[0] || null;
  }

  /**
   * Validation Query 1: Every transaction must balance
   */
  static async getUnbalancedTransactions(conn = defaultPool) {
    const [rows] = await conn.query(
      `SELECT transaction_id, SUM(debit) AS d, SUM(credit) AS c
       FROM ledger_entries
       GROUP BY transaction_id
       HAVING SUM(debit) <> SUM(credit)`
    );
    return rows;
  }

  /**
   * Validation Query 2: No orphaned ledger entries
   */
  static async getOrphanedLedgerEntries(conn = defaultPool) {
    const [rows] = await conn.query(
      `SELECT le.* FROM ledger_entries le
       LEFT JOIN policy_transactions pt ON le.transaction_id = pt.id
       WHERE pt.id IS NULL`
    );
    return rows;
  }

  /**
   * Validation Query 3: Outstanding never goes negative
   */
  static async getNegativeOutstandingPolicies(conn = defaultPool) {
    const [rows] = await conn.query(
      `SELECT p.id, p.total_premium,
        SUM(CASE WHEN a.account_code = 'CASH' THEN le.debit - le.credit ELSE 0 END) AS paid
       FROM policies p
       JOIN ledger_entries le ON le.policy_id = p.id
       JOIN accounts a ON le.account_id = a.id
       GROUP BY p.id
       HAVING paid > p.total_premium`
    );
    return rows;
  }

  /**
   * Validation Query 4: Trial balance across the entire ledger
   */
  static async getTrialBalance(conn = defaultPool) {
    const [rows] = await conn.query(
      `SELECT 
        COALESCE(SUM(debit), 0) AS total_debit, 
        COALESCE(SUM(credit), 0) AS total_credit 
       FROM ledger_entries`
    );
    return {
      total_debit: Number(rows[0]?.total_debit || 0),
      total_credit: Number(rows[0]?.total_credit || 0)
    };
  }
}

module.exports = LedgerRepository;
