const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'agenda_db'
};

async function addColumns() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // Check if columns exist
        const [rows] = await connection.execute(`SHOW COLUMNS FROM events LIKE 'location'`);
        if (rows.length === 0) {
            await connection.execute(`ALTER TABLE events ADD COLUMN location VARCHAR(255)`);
            console.log('Added column: location');
        } else {
            console.log('Column location already exists.');
        }

        const [rows2] = await connection.execute(`SHOW COLUMNS FROM events LIKE 'meeting_link'`);
        if (rows2.length === 0) {
            await connection.execute(`ALTER TABLE events ADD COLUMN meeting_link TEXT`);
            console.log('Added column: meeting_link');
        } else {
            console.log('Column meeting_link already exists.');
        }

    } catch (err) {
        console.error('Error updating database:', err);
    } finally {
        if (connection) await connection.end();
    }
}

addColumns();
