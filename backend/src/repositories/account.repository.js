const defaultPool = require('../db/connection');

class AccountRepository {
  static async findByCode(accountCode, conn = defaultPool) {
    const [rows] = await conn.query(
      'SELECT id, account_code, account_name, account_type, created_at FROM accounts WHERE account_code = ?',
      [accountCode]
    );
    return rows[0] || null;
  }

  static async findById(id, conn = defaultPool) {
    const [rows] = await conn.query(
      'SELECT id, account_code, account_name, account_type, created_at FROM accounts WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  static async findAll(conn = defaultPool) {
    const [rows] = await conn.query(
      'SELECT id, account_code, account_name, account_type, created_at FROM accounts ORDER BY id ASC'
    );
    return rows;
  }
}

module.exports = AccountRepository;
