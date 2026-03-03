// config/db.js - MySQL connection with Aiven SSL support
const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool with SSL for Aiven
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    // SSL is required for Aiven MySQL
    ssl: {
        rejectUnauthorized: false
    }
});

// Test connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        console.log(`   Host: ${process.env.DB_HOST}`);
        console.log(`   Port: ${process.env.DB_PORT}`);
        console.log(`   Database: ${process.env.DB_NAME}`);
        console.log(`   SSL: Enabled`);
        connection.release();
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('Using credentials:');
        console.error('  Host:', process.env.DB_HOST);
        console.error('  Port:', process.env.DB_PORT);
        console.error('  User:', process.env.DB_USER);
        console.error('  Database:', process.env.DB_NAME);
        process.exit(1);
    }
}

module.exports = { pool, testConnection };
