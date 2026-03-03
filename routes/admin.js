const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Middleware to require admin role for all admin routes
router.use(authenticateToken);
router.use(requireRole('admin'));

// GET /stats - Platform statistics
router.get('/stats', async (req, res) => {
    try {
        // Get total users count
        const [usersResult] = await pool.execute(
            'SELECT COUNT(*) as count FROM users'
        );

        // Get total orders count
        const [ordersResult] = await pool.execute(
            'SELECT COUNT(*) as count FROM orders'
        );

        // Get total revenue (sum of all completed/ready orders)
        const [revenueResult] = await pool.execute(
            `SELECT COALESCE(SUM(total_amount), 0) as total FROM orders
             WHERE status IN ('completed', 'ready')`
        );

        // Get platform commission (total_amount - vendor_amount for completed orders)
        const [commissionResult] = await pool.execute(
            `SELECT COALESCE(SUM(total_amount - COALESCE(vendor_amount, 0)), 0) as total
             FROM orders
             WHERE status IN ('completed', 'ready')`
        );

        // Get counts by user role
        const [roleCountsResult] = await pool.execute(
            `SELECT role, COUNT(*) as count FROM users GROUP BY role`
        );

        // Get counts by order status
        const [statusCountsResult] = await pool.execute(
            `SELECT status, COUNT(*) as count FROM orders GROUP BY status`
        );

        res.json({
            success: true,
            stats: {
                totalUsers: usersResult[0].count,
                totalOrders: ordersResult[0].count,
                totalRevenue: parseFloat(revenueResult[0].total) || 0,
                platformCommission: parseFloat(commissionResult[0].total) || 0,
                usersByRole: roleCountsResult.reduce((acc, row) => {
                    acc[row.role] = row.count;
                    return acc;
                }, {}),
                ordersByStatus: statusCountsResult.reduce((acc, row) => {
                    acc[row.status] = row.count;
                    return acc;
                }, {})
            }
        });

    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
});

// GET /users - All users with pagination and search
router.get('/users', async (req, res) => {
    try {
        const { search = '' } = req.query;
        const limitNum = 200; // Hardcoded safe limit for admin panel

        let query = `
            SELECT id, name, email, phone, role, created_at
            FROM users
        `;
        const params = [];

        if (search) {
            query += ' WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        query += ` ORDER BY created_at DESC LIMIT ${limitNum}`;

        const [users] = await pool.execute(query, params);

        res.json({
            success: true,
            users
        });

    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
});

// GET /orders - All orders with pagination and search
router.get('/orders', async (req, res) => {
    try {
        const { search = '', status = '' } = req.query;
        const limitNum = 200; // Hardcoded safe limit for admin panel

        let query = `
            SELECT o.id, o.customer_id, o.vendor_id, o.total_amount, o.status,
                   o.order_type, o.created_at, o.vendor_amount,
                   c.name as customer_name, c.email as customer_email,
                   v.name as vendor_name
            FROM orders o
            LEFT JOIN users c ON o.customer_id = c.id
            LEFT JOIN vendors vd ON o.vendor_id = vd.id
            LEFT JOIN users v ON vd.user_id = v.id
        `;

        const conditions = [];
        const params = [];

        if (search) {
            conditions.push('(c.name LIKE ? OR c.email LIKE ? OR v.name LIKE ? OR o.id = ?)');
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern, parseInt(search) || 0);
        }

        if (status) {
            conditions.push('o.status = ?');
            params.push(status);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ` ORDER BY o.created_at DESC LIMIT ${limitNum}`;

        const [orders] = await pool.execute(query, params);

        res.json({
            success: true,
            orders
        });

    } catch (error) {
        console.error('Admin orders error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch orders' });
    }
});

// GET /analytics - Analytics data for charts
router.get('/analytics', async (req, res) => {
    try {
        const { period = '7' } = req.query; // days
        const days = parseInt(period);

        // Daily orders for the period
        const [dailyOrders] = await pool.execute(
            `SELECT DATE(created_at) as date, COUNT(*) as orders,
                    COALESCE(SUM(total_amount), 0) as revenue
             FROM orders
             WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
             GROUP BY DATE(created_at)
             ORDER BY date ASC`,
            [days]
        );

        // Daily new users for the period
        const [dailyUsers] = await pool.execute(
            `SELECT DATE(created_at) as date, COUNT(*) as users
             FROM users
             WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
             GROUP BY DATE(created_at)
             ORDER BY date ASC`,
            [days]
        );

        // Order status distribution
        const [statusDistribution] = await pool.execute(
            `SELECT status, COUNT(*) as count
             FROM orders
             GROUP BY status`
        );

        // Top vendors by order count
        const [topVendors] = await pool.execute(
            `SELECT v.id, u.name, COUNT(o.id) as order_count,
                    COALESCE(SUM(o.total_amount), 0) as total_revenue
             FROM vendors v
             JOIN users u ON v.user_id = u.id
             LEFT JOIN orders o ON v.id = o.vendor_id AND o.status IN ('completed', 'ready')
             GROUP BY v.id, u.name
             ORDER BY order_count DESC
             LIMIT 10`
        );

        // Revenue by order type
        const [revenueByType] = await pool.execute(
            `SELECT order_type, COUNT(*) as count,
                    COALESCE(SUM(total_amount), 0) as revenue
             FROM orders
             WHERE status IN ('completed', 'ready')
             GROUP BY order_type`
        );

        res.json({
            success: true,
            analytics: {
                dailyOrders,
                dailyUsers,
                statusDistribution: statusDistribution.reduce((acc, row) => {
                    acc[row.status] = row.count;
                    return acc;
                }, {}),
                topVendors,
                revenueByType
            }
        });

    } catch (error) {
        console.error('Admin analytics error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
    }
});

// PUT /users/:userId/role - Update user role
router.put('/users/:userId/role', async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        const validRoles = ['customer', 'vendor', 'admin'];
        if (!role || !validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
            });
        }

        // Prevent admin from demoting themselves
        if (parseInt(userId) === req.user.id && role !== 'admin') {
            return res.status(400).json({
                success: false,
                error: 'Cannot change your own admin role'
            });
        }

        await pool.execute(
            'UPDATE users SET role = ? WHERE id = ?',
            [role, userId]
        );

        res.json({
            success: true,
            message: 'User role updated successfully'
        });

    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({ success: false, error: 'Failed to update user role' });
    }
});

// DELETE /users/:userId - Delete user with proper cascade
router.delete('/users/:userId', async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const userId = parseInt(req.params.userId);

        // Prevent admin from deleting themselves
        if (userId === req.user.id) {
            return res.status(400).json({
                success: false,
                error: 'You cannot delete your own account'
            });
        }

        await connection.beginTransaction();

        // Check if user exists
        const [users] = await connection.execute(
            'SELECT id, role, email FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const userToDelete = users[0];

        // If vendor, get vendor.id and delete vendor-related data
        if (userToDelete.role === 'vendor') {
            const [vendor] = await connection.execute(
                'SELECT id FROM vendors WHERE user_id = ?',
                [userId]
            );

            if (vendor.length) {
                const vendorId = vendor[0].id;

                // Delete in correct order (respecting foreign keys)
                await connection.execute('DELETE FROM reviews WHERE vendor_id = ?', [vendorId]);
                await connection.execute('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE vendor_id = ?)', [vendorId]);
                await connection.execute('DELETE FROM orders WHERE vendor_id = ?', [vendorId]);
                await connection.execute('DELETE FROM payouts WHERE vendor_id = ?', [vendorId]);
                await connection.execute('DELETE FROM menu_items WHERE vendor_id = ?', [vendorId]);
                await connection.execute('DELETE FROM vendor_wallets WHERE vendor_id = ?', [vendorId]);
                await connection.execute('DELETE FROM vendors WHERE id = ?', [vendorId]);
            }
        }

        // If customer, delete customer-related data
        if (userToDelete.role === 'customer') {
            await connection.execute('DELETE FROM reviews WHERE customer_id = ?', [userId]);
            await connection.execute('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_id = ?)', [userId]);
            await connection.execute('DELETE FROM orders WHERE customer_id = ?', [userId]);
        }

        // Finally, delete the user
        await connection.execute('DELETE FROM users WHERE id = ?', [userId]);

        await connection.commit();

        res.json({
            success: true,
            message: `User ${userToDelete.email} deleted successfully`
        });

    } catch (error) {
        await connection.rollback();
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to delete user' });
    } finally {
        connection.release();
    }
});

module.exports = router;
