const defaultPool = require('../db/connection');

class PolicyRepository {
  static async create(
    { customer_id, policy_number, premium_amount, gst_rate, gst_amount, total_premium, status = 'ACTIVE' },
    conn = defaultPool
  ) {
    const [result] = await conn.query(
      `INSERT INTO policies 
        (customer_id, policy_number, premium_amount, gst_rate, gst_amount, total_premium, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [customer_id, policy_number, premium_amount, gst_rate, gst_amount, total_premium, status]
    );
    return {
      id: result.insertId,
      customer_id,
      policy_number,
      premium_amount,
      gst_rate,
      gst_amount,
      total_premium,
      status
    };
  }

  static async findById(id, conn = defaultPool) {
    const [rows] = await conn.query(
      'SELECT id, policy_number, customer_id, premium_amount, gst_rate, gst_amount, total_premium, status, created_at FROM policies WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Acquire an exclusive row lock on the policy for payment processing
   */
  static async findByIdForUpdate(id, conn = defaultPool) {
    const [rows] = await conn.query(
      'SELECT id, policy_number, customer_id, premium_amount, gst_rate, gst_amount, total_premium, status, created_at FROM policies WHERE id = ? FOR UPDATE',
      [id]
    );
    return rows[0] || null;
  }

  static async findByPolicyNumber(policy_number, conn = defaultPool) {
    const [rows] = await conn.query(
      'SELECT id, policy_number, customer_id, premium_amount, gst_rate, gst_amount, total_premium, status, created_at FROM policies WHERE policy_number = ?',
      [policy_number]
    );
    return rows[0] || null;
  }

  static async getPolicyWithCustomer(id, conn = defaultPool) {
    const [rows] = await conn.query(
      `SELECT 
        p.id,
        p.policy_number,
        p.customer_id,
        c.name AS customer_name,
        c.email AS customer_email,
        p.premium_amount,
        p.gst_rate,
        p.gst_amount,
        p.total_premium,
        p.status,
        p.created_at
       FROM policies p
       JOIN customers c ON p.customer_id = c.id
       WHERE p.id = ?`,
      [id]
    );
    return rows[0] || null;
  }
}

module.exports = PolicyRepository;
