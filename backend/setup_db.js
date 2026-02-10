const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true // Allow multiple statements for schema.sql
  };

  let connection;

  try {
    // 1. Connect without database to create it if needed
    console.log('Connecting to MySQL server...');
    connection = await mysql.createConnection(config);

    const dbName = process.env.DB_NAME || 'agenda_db';
    console.log(`Checking if database '${dbName}' exists...`);
    
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    console.log(`Database '${dbName}' created or already exists.`);

    await connection.changeUser({ database: dbName });

    // 2. Read schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    console.log(`Reading schema from ${schemaPath}...`);
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // 3. Execute schema
    console.log('Executing schema...');
    // Split by semicolon usually works for simple schemas, but mysql2 supports multipleStatements
    // However, allowing multipleStatements in the initial connection is cleaner if supported.
    // Let's rely on multipleStatements: true in config.
    
    // Note: createConnection with multipleStatements might need to be set on the specific connection
    // Re-establishing connection with database selected might be safer for some envs
    await connection.end();
    
    config.database = dbName;
    connection = await mysql.createConnection(config);

    await connection.query(schema);
    
    console.log('Database tables setup completed successfully!');
    
  } catch (error) {
    console.error('Error setting up database:', error);
    if (error.code === 'ECONNREFUSED') {
      console.error('\nPlease ensure MySQL is running and the credentials in .env are correct.');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
    process.exit();
  }
}

setupDatabase();
