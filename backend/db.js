const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'agenda_user',
  password: process.env.DB_PASSWORD || 'agenda_pass',
  database: process.env.DB_NAME || 'agenda_db',
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = {
  query: async (sql, params) => {
    const [rows] = await pool.execute(sql, params);
    return rows;
  },
  pool,
};
