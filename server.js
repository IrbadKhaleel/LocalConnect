// server.js - Main application entry point
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/db');

// Initialize Express app
const app = express();

// CORS Configuration for Production
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? ['https://localconnect.onrender.com', /\.onrender\.com$/]
        : '*',
    credentials: true,
    optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/auth');
const vendorRoutes = require('./routes/vendors');
const customerRoutes = require('./routes/customers');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const vendorWalletRoutes = require('./routes/vendor-wallet');
const analyticsRoutes = require('./routes/analytics');
const reviewRoutes = require('./routes/reviews');
const adminRoutes = require('./routes/admin');

// API Routes - MUST come BEFORE static files
app.use('/api/auth', authRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/vendor-wallet', vendorWalletRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);

// Test routes
app.get('/api/test', (req, res) => {
    res.json({ message: 'LocalConnect API is running!' });
});

app.get('/api/test2', (req, res) => {
    res.json({ message: 'Test2 works!' });
});

// Static files - MUST come AFTER all API routes
app.use(express.static('public'));

// 404 Error Handler - catch-all for undefined routes
app.use((req, res, next) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// 500 Error Handler - catch server errors
app.use((err, req, res, next) => {
    console.error('Server error:', err);

    // In production, don't expose error details
    if (process.env.NODE_ENV === 'production') {
        // Check if it's an API request
        if (req.path.startsWith('/api/')) {
            return res.status(500).json({
                success: false,
                error: 'An unexpected error occurred'
            });
        }
    }

    res.status(500).sendFile(path.join(__dirname, 'public', '500.html'));
});

// Start server
const PORT = process.env.PORT || 3000;

// Initialize wallets for existing vendors
async function initializeVendorWallets() {
    const { pool } = require('./config/db');

    try {
        // Find all vendors without wallets
        const [vendors] = await pool.execute(
            `SELECT u.id FROM users u
             LEFT JOIN vendor_wallets vw ON u.id = vw.vendor_id
             WHERE u.role = 'vendor' AND vw.vendor_id IS NULL`
        );

        if (vendors.length > 0) {
            for (const vendor of vendors) {
                await pool.execute(
                    'INSERT INTO vendor_wallets (vendor_id, available_balance, pending_balance, total_earned) VALUES (?, 0.00, 0.00, 0.00)',
                    [vendor.id]
                );
            }
            console.log(`💰 Initialized wallets for ${vendors.length} vendors`);
        }
    } catch (error) {
        // Table might not exist yet, that's okay
        if (!error.message.includes("doesn't exist")) {
            console.error('Wallet initialization error:', error.message);
        }
    }
}

async function startServer() {
    // Test database connection first
    await testConnection();

    // Initialize wallets for existing vendors
    await initializeVendorWallets();

    // Start Express server
    app.listen(PORT, () => {
        console.log(`🚀 LocalConnect server running on port ${PORT}`);
        console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`   URL: http://localhost:${PORT}`);
    });
}

startServer();