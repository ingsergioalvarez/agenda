const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function updateDatabase() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'agenda_db',
        multipleStatements: true
    };

    let connection;

    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(config);

        console.log('Creating external_guests table...');
        await connection.query(`
      CREATE TABLE IF NOT EXISTS external_guests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200),
        email VARCHAR(200) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        console.log('Creating event_guests table...');
        await connection.query(`
      CREATE TABLE IF NOT EXISTS event_guests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT NOT NULL,
        guest_id INT NOT NULL,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY (guest_id) REFERENCES external_guests(id) ON DELETE CASCADE
      )
    `);

        console.log('Checking for is_active column in users...');
        const [columns] = await connection.query(`SHOW COLUMNS FROM users LIKE 'is_active'`);
        if (columns.length === 0) {
            console.log('Adding is_active column to users...');
            await connection.query(`ALTER TABLE users ADD COLUMN is_active TINYINT(1) DEFAULT 1`);
        } else {
            console.log('is_active column already exists.');
        }

        console.log('Database update completed successfully!');
    } catch (error) {
        console.error('Error updating database:', error);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

updateDatabase();
