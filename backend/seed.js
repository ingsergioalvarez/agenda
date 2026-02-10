const bcrypt = require('bcrypt');
const db = require('./db');
require('dotenv').config();

async function seed() {
  // Create schema (run SQL file if desired). Here we insert an admin user.
  const password = await bcrypt.hash('admin123', 10);
  const existing = await db.query('SELECT id FROM users WHERE email = ?', ['admin@example.com']);
  if (existing.length) {
    console.log('Admin already exists');
    process.exit(0);
  }
  const res = await db.query('INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)', ['Admin', 'admin@example.com', password, 'admin']);
  console.log('Inserted admin id', res.insertId);
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
