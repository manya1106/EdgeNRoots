const app = require('./app');
const pool = require('./db/connection');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Verify database connectivity
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    console.log(`[Database] Connection pool connected successfully (test result: ${rows[0].result})`);

    const server = app.listen(PORT, () => {
      console.log(`=================================================`);
      console.log(` Insurance Policy & Accounting Module Running`);
      console.log(` Server listening on port: ${PORT}`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`=================================================`);
    });

    const shutdown = async (signal) => {
      console.log(`Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        console.log('HTTP server closed.');
        try {
          await pool.end();
          console.log('Database pool connections closed.');
          process.exit(0);
        } catch (err) {
          console.error('Error closing database pool:', err);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = startServer;
