const pool = require('./connection');

/**
 * Executes a callback within a managed MySQL transaction.
 * Automatically commits on success and rolls back on failure.
 * Ensures the connection is always released back to the pool.
 *
 * @param {Function} callback - Function receiving the active transaction connection: (conn) => Promise<any>
 * @param {object} [existingConn] - Optional existing transaction connection for nesting
 * @returns {Promise<any>} - Result returned by callback
 */
async function runInTransaction(callback, existingConn = null) {
  if (existingConn) {
    // If already in a transaction connection, execute directly within that context
    return await callback(existingConn);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  runInTransaction
};
