const defaultPool = require('../db/connection');

class PaymentRepository {
  static async create(
    { policy_id, transaction_id, amount, payment_type = 'PAYMENT', reversal_of_payment_id = null },
    conn = defaultPool
  ) {
    const [result] = await conn.query(
      `INSERT INTO payments 
        (policy_id, transaction_id, amount, payment_type, reversal_of_payment_id)
       VALUES (?, ?, ?, ?, ?)`,
      [policy_id, transaction_id, amount, payment_type, reversal_of_payment_id]
    );
    return {
      id: result.insertId,
      policy_id,
      transaction_id,
      amount,
      payment_type,
      reversal_of_payment_id
    };
  }

  static async findById(id, conn = defaultPool) {
    const [rows] = await conn.query(
      'SELECT id, policy_id, transaction_id, amount, payment_type, reversal_of_payment_id, payment_date, created_at FROM payments WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  static async findReversalForPayment(paymentId, conn = defaultPool) {
    const [rows] = await conn.query(
      "SELECT id, policy_id, transaction_id, amount, payment_type, reversal_of_payment_id, payment_date, created_at FROM payments WHERE reversal_of_payment_id = ? AND payment_type = 'REVERSAL'",
      [paymentId]
    );
    return rows[0] || null;
  }

  static async findByPolicyId(policy_id, conn = defaultPool) {
    const [rows] = await conn.query(
      'SELECT id, policy_id, transaction_id, amount, payment_type, reversal_of_payment_id, payment_date, created_at FROM payments WHERE policy_id = ? ORDER BY created_at ASC',
      [policy_id]
    );
    return rows;
  }
}

module.exports = PaymentRepository;
