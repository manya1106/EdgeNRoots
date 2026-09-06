const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDatabase() {
  const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  };

  const dbName = process.env.DB_NAME || 'insurance_accounting';
  console.log(`Connecting to MySQL host: ${dbConfig.host}:${dbConfig.port} as ${dbConfig.user}...`);

  const connection = await mysql.createConnection(dbConfig);

  try {
    console.log(`Ensuring database '${dbName}' exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.query(`USE \`${dbName}\`;`);

    console.log('Applying schema.sql...');
    const schemaSql = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf-8');
    await connection.query(schemaSql);

    console.log('Applying seed.sql...');
    const seedSql = fs.readFileSync(path.join(__dirname, '../seed.sql'), 'utf-8');
    await connection.query(seedSql);

    console.log('Verifying accounts in database:');
    const [rows] = await connection.query('SELECT * FROM accounts;');
    console.table(rows);

    console.log(`Database '${dbName}' initialized and seeded successfully.`);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;
