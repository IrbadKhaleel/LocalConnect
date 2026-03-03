// setup-aiven-db.js - Database setup script for Aiven MySQL
const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function setupDatabase() {
    console.log('🚀 Setting up Aiven database...');
    console.log('');
    console.log('Connection details:');
    console.log(`   Host: ${process.env.DB_HOST}`);
    console.log(`   Port: ${process.env.DB_PORT}`);
    console.log(`   User: ${process.env.DB_USER}`);
    console.log(`   Database: ${process.env.DB_NAME}`);
    console.log('');

    let connection;

    try {
        // Connect to Aiven
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: {
                rejectUnauthorized: false
            },
            multipleStatements: true
        });

        console.log('✅ Connected to Aiven MySQL');

        // Read and execute schema
        console.log('📋 Loading database schema...');
        const schema = fs.readFileSync('./database/schema.sql', 'utf8');

        // Split schema into individual statements and execute
        const statements = schema.split(';').filter(stmt => stmt.trim());

        let successCount = 0;
        let skipCount = 0;

        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await connection.query(statement);
                    successCount++;
                } catch (err) {
                    // Ignore "table already exists" or "duplicate column" errors
                    if (err.message.includes('already exists') ||
                        err.message.includes('Duplicate column') ||
                        err.message.includes('Duplicate entry')) {
                        skipCount++;
                    } else {
                        console.error('⚠️  Warning:', err.message.substring(0, 100));
                    }
                }
            }
        }

        console.log(`✅ Schema loaded (${successCount} executed, ${skipCount} skipped)`);

        // Check if data already exists
        const [users] = await connection.query('SELECT COUNT(*) as count FROM users');

        if (users[0].count > 0) {
            console.log('');
            console.log('⚠️  Database already has data. Skipping seed data.');
            console.log(`   Found ${users[0].count} users`);
        } else {
            // Load seed data (use Aiven-compatible version if available)
            console.log('🌱 Loading seed data...');

            try {
                // Use simple seed.sql (no subqueries, Aiven compatible)
                const seedFile = './database/seed.sql';
                console.log(`   Using: ${seedFile}`);
                const seedData = fs.readFileSync(seedFile, 'utf8');
                const seedStatements = seedData.split(';').filter(stmt => stmt.trim());

                let seedSuccess = 0;
                for (const statement of seedStatements) {
                    if (statement.trim() && !statement.trim().startsWith('--')) {
                        try {
                            await connection.query(statement);
                            seedSuccess++;
                        } catch (err) {
                            if (!err.message.includes('Duplicate entry')) {
                                console.error('⚠️  Seed error:', err.message.substring(0, 80));
                            }
                        }
                    }
                }

                console.log(`✅ Seed data loaded (${seedSuccess} statements)`);
            } catch (err) {
                console.log('⚠️  No seed_data.sql found, skipping...');
            }
        }

        // Update images
        console.log('🖼️  Updating image URLs...');
        try {
            const updateImages = fs.readFileSync('./database/update_images.sql', 'utf8');
            const imageStatements = updateImages.split(';').filter(stmt => stmt.trim());

            let imageSuccess = 0;
            for (const statement of imageStatements) {
                if (statement.trim() && !statement.trim().startsWith('--')) {
                    try {
                        await connection.query(statement);
                        imageSuccess++;
                    } catch (err) {
                        // Ignore errors
                    }
                }
            }

            console.log(`✅ Images updated (${imageSuccess} statements)`);
        } catch (err) {
            console.log('⚠️  No update_images.sql found, skipping...');
        }

        // Verify data
        console.log('');
        console.log('📊 Database Summary:');
        console.log('─'.repeat(30));

        const tables = [
            { name: 'users', query: 'SELECT COUNT(*) as count FROM users' },
            { name: 'vendors', query: 'SELECT COUNT(*) as count FROM vendors' },
            { name: 'menu_items', query: 'SELECT COUNT(*) as count FROM menu_items' },
            { name: 'orders', query: 'SELECT COUNT(*) as count FROM orders' },
            { name: 'categories', query: 'SELECT COUNT(*) as count FROM categories' },
            { name: 'reviews', query: 'SELECT COUNT(*) as count FROM reviews' },
            { name: 'vendor_wallets', query: 'SELECT COUNT(*) as count FROM vendor_wallets' }
        ];

        for (const table of tables) {
            try {
                const [result] = await connection.query(table.query);
                console.log(`   ${table.name.padEnd(15)} ${result[0].count}`);
            } catch (err) {
                console.log(`   ${table.name.padEnd(15)} (table not found)`);
            }
        }

        console.log('─'.repeat(30));
        console.log('');
        console.log('✅ Database setup complete!');
        console.log('🎉 Aiven database is ready for production!');

    } catch (error) {
        console.error('');
        console.error('❌ Database setup failed:', error.message);
        console.error('');
        console.error('Check your .env file has correct values:');
        console.error('  DB_HOST=your-host.aivencloud.com');
        console.error('  DB_PORT=19338');
        console.error('  DB_USER=avnadmin');
        console.error('  DB_PASSWORD=your-password');
        console.error('  DB_NAME=defaultdb');
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

setupDatabase();
