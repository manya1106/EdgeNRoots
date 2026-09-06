const defaultPool = require('../db/connection');

class CustomerRepository {
  static async create({ name, email }, conn = defaultPool) {
    const [result] = await conn.query(
      'INSERT INTO customers (name, email) VALUES (?, ?)',
      [name, email]
    );
    return {
      id: result.insertId,
      name,
      email
    };
  }

  static async findById(id, conn = defaultPool) {
    const [rows] = await conn.query(
      'SELECT id, name, email, created_at FROM customers WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  static async findByEmail(email, conn = defaultPool) {
    const [rows] = await conn.query(
      'SELECT id, name, email, created_at FROM customers WHERE email = ?',
      [email]
    );
    return rows[0] || null;
  }

  static async findAll(conn = defaultPool) {
    const [rows] = await conn.query(
      'SELECT id, name, email, created_at FROM customers ORDER BY id DESC'
    );
    return rows;
  }
}

module.exports = CustomerRepository;
