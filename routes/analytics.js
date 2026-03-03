const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Helper to get vendor's table ID from user ID
async function getVendorTableId(userId, connection = pool) {
    const [rows] = await connection.execute(
        'SELECT id FROM vendors WHERE user_id = ?',
        [userId]
    );
    return rows.length > 0 ? rows[0].id : null;
}

// Helper to generate date range array
function getDateRange(days) {
    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
}

// GET /overview - Key metrics for vendor
router.get('/overview', authenticateToken, requireRole('vendor'), async (req, res) => {
    try {
        const vendorTableId = await getVendorTableId(req.user.id);
        if (!vendorTableId) {
            return res.json({
                totalRevenue: 0,
                todayRevenue: 0,
                totalOrders: 0,
                pendingOrders: 0,
                averageOrderValue: 0,
                topSellingItem: null
            });
        }

        // Total revenue (completed orders)
        const [revenueRows] = await pool.execute(
            `SELECT COALESCE(SUM(vendor_amount), 0) as totalRevenue
             FROM orders
             WHERE vendor_id = ? AND status IN ('completed', 'ready')`,
            [vendorTableId]
        );

        // Today's revenue
        const [todayRows] = await pool.execute(
            `SELECT COALESCE(SUM(vendor_amount), 0) as todayRevenue
             FROM orders
             WHERE vendor_id = ? AND status IN ('completed', 'ready')
             AND DATE(created_at) = CURDATE()`,
            [vendorTableId]
        );

        // Total orders
        const [orderCountRows] = await pool.execute(
            `SELECT COUNT(*) as totalOrders FROM orders WHERE vendor_id = ?`,
            [vendorTableId]
        );

        // Pending orders
        const [pendingRows] = await pool.execute(
            `SELECT COUNT(*) as pendingOrders FROM orders WHERE vendor_id = ? AND status = 'pending'`,
            [vendorTableId]
        );

        // Average order value
        const [avgRows] = await pool.execute(
            `SELECT COALESCE(AVG(total_amount), 0) as averageOrderValue
             FROM orders
             WHERE vendor_id = ? AND status IN ('completed', 'ready')`,
            [vendorTableId]
        );

        // Top selling item
        const [topItemRows] = await pool.execute(
            `SELECT mi.name, SUM(oi.quantity) as totalQuantity
             FROM order_items oi
             JOIN orders o ON oi.order_id = o.id
             JOIN menu_items mi ON oi.menu_item_id = mi.id
             WHERE o.vendor_id = ?
             GROUP BY mi.id, mi.name
             ORDER BY totalQuantity DESC
             LIMIT 1`,
            [vendorTableId]
        );

        res.json({
            totalRevenue: parseFloat(revenueRows[0].totalRevenue) || 0,
            todayRevenue: parseFloat(todayRows[0].todayRevenue) || 0,
            totalOrders: parseInt(orderCountRows[0].totalOrders) || 0,
            pendingOrders: parseInt(pendingRows[0].pendingOrders) || 0,
            averageOrderValue: parseFloat(avgRows[0].averageOrderValue) || 0,
            topSellingItem: topItemRows.length > 0 ? {
                name: topItemRows[0].name,
                quantity: parseInt(topItemRows[0].totalQuantity)
            } : null
        });

    } catch (error) {
        console.error('Analytics overview error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics overview' });
    }
});

// GET /revenue-trend - Daily revenue for last N days
router.get('/revenue-trend', authenticateToken, requireRole('vendor'), async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const vendorTableId = await getVendorTableId(req.user.id);

        if (!vendorTableId) {
            return res.json({ data: getDateRange(days).map(date => ({ date, revenue: 0 })) });
        }

        const [rows] = await pool.execute(
            `SELECT DATE(created_at) as date, COALESCE(SUM(vendor_amount), 0) as revenue
             FROM orders
             WHERE vendor_id = ? AND status IN ('completed', 'ready')
             AND created_at >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)
             GROUP BY DATE(created_at)
             ORDER BY date ASC`,
            [vendorTableId]
        );

        // Fill in missing dates
        const dateRange = getDateRange(days);
        const revenueMap = new Map(rows.map(r => [r.date.toISOString().split('T')[0], parseFloat(r.revenue)]));

        const data = dateRange.map(date => ({
            date,
            revenue: revenueMap.get(date) || 0
        }));

        res.json({ data });

    } catch (error) {
        console.error('Revenue trend error:', error);
        res.status(500).json({ error: 'Failed to fetch revenue trend' });
    }
});

// GET /orders-by-status - Order count grouped by status
router.get('/orders-by-status', authenticateToken, requireRole('vendor'), async (req, res) => {
    try {
        const vendorTableId = await getVendorTableId(req.user.id);

        const statuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];

        if (!vendorTableId) {
            return res.json({ data: statuses.map(status => ({ status, count: 0 })) });
        }

        const [rows] = await pool.execute(
            `SELECT status, COUNT(*) as count
             FROM orders
             WHERE vendor_id = ?
             GROUP BY status`,
            [vendorTableId]
        );

        const statusMap = new Map(rows.map(r => [r.status, parseInt(r.count)]));

        const data = statuses.map(status => ({
            status,
            count: statusMap.get(status) || 0
        }));

        res.json({ data });

    } catch (error) {
        console.error('Orders by status error:', error);
        res.status(500).json({ error: 'Failed to fetch orders by status' });
    }
});

// GET /top-items - Top selling menu items
router.get('/top-items', authenticateToken, requireRole('vendor'), async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const vendorTableId = await getVendorTableId(req.user.id);

        if (!vendorTableId) {
            return res.json({ data: [] });
        }

        const [rows] = await pool.execute(
            `SELECT mi.name, SUM(oi.quantity) as quantity, SUM(oi.subtotal) as revenue
             FROM order_items oi
             JOIN orders o ON oi.order_id = o.id
             JOIN menu_items mi ON oi.menu_item_id = mi.id
             WHERE o.vendor_id = ?
             GROUP BY mi.id, mi.name
             ORDER BY quantity DESC
             LIMIT ${limit}`,
            [vendorTableId]
        );

        const data = rows.map(r => ({
            name: r.name,
            quantity: parseInt(r.quantity),
            revenue: parseFloat(r.revenue)
        }));

        res.json({ data });

    } catch (error) {
        console.error('Top items error:', error);
        res.status(500).json({ error: 'Failed to fetch top items' });
    }
});

// GET /daily-orders - Order count per day
router.get('/daily-orders', authenticateToken, requireRole('vendor'), async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const vendorTableId = await getVendorTableId(req.user.id);

        if (!vendorTableId) {
            return res.json({ data: getDateRange(days).map(date => ({ date, count: 0 })) });
        }

        const [rows] = await pool.execute(
            `SELECT DATE(created_at) as date, COUNT(*) as count
             FROM orders
             WHERE vendor_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)
             GROUP BY DATE(created_at)
             ORDER BY date ASC`,
            [vendorTableId]
        );

        // Fill in missing dates
        const dateRange = getDateRange(days);
        const countMap = new Map(rows.map(r => [r.date.toISOString().split('T')[0], parseInt(r.count)]));

        const data = dateRange.map(date => ({
            date,
            count: countMap.get(date) || 0
        }));

        res.json({ data });

    } catch (error) {
        console.error('Daily orders error:', error);
        res.status(500).json({ error: 'Failed to fetch daily orders' });
    }
});

// GET /recent-orders - Recent orders with details
router.get('/recent-orders', authenticateToken, requireRole('vendor'), async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const vendorTableId = await getVendorTableId(req.user.id);

        if (!vendorTableId) {
            return res.json({ data: [] });
        }

        const [rows] = await pool.execute(
            `SELECT o.id, u.name as customerName, o.total_amount as totalAmount,
                    o.vendor_amount as vendorAmount, o.status, o.created_at as createdAt
             FROM orders o
             JOIN users u ON o.customer_id = u.id
             WHERE o.vendor_id = ?
             ORDER BY o.created_at DESC
             LIMIT ${limit}`,
            [vendorTableId]
        );

        const data = rows.map(r => ({
            id: r.id,
            customerName: r.customerName,
            totalAmount: parseFloat(r.totalAmount) || 0,
            vendorAmount: parseFloat(r.vendorAmount) || 0,
            status: r.status,
            createdAt: r.createdAt
        }));

        res.json({ data });

    } catch (error) {
        console.error('Recent orders error:', error);
        res.status(500).json({ error: 'Failed to fetch recent orders' });
    }
});

// GET /top-customers - Customers who order most frequently
router.get('/top-customers', authenticateToken, requireRole('vendor'), async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const vendorTableId = await getVendorTableId(req.user.id);

        if (!vendorTableId) {
            return res.json({ data: [] });
        }

        const [rows] = await pool.execute(
            `SELECT u.name as customerName, COUNT(o.id) as orderCount, SUM(o.total_amount) as totalSpent
             FROM orders o
             JOIN users u ON o.customer_id = u.id
             WHERE o.vendor_id = ?
             GROUP BY o.customer_id, u.name
             ORDER BY orderCount DESC
             LIMIT ${limit}`,
            [vendorTableId]
        );

        const data = rows.map(r => ({
            customerName: r.customerName,
            orderCount: parseInt(r.orderCount),
            totalSpent: parseFloat(r.totalSpent) || 0
        }));

        res.json({ data });

    } catch (error) {
        console.error('Top customers error:', error);
        res.status(500).json({ error: 'Failed to fetch top customers' });
    }
});

module.exports = router;
