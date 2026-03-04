const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// POST /create - Create new order
router.post('/create', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { vendorId, items, totalAmount, deliveryAddress, orderType, customerNotes } = req.body;
        const customerId = req.user.id;

        // Validate required fields
        if (!vendorId || !items || !items.length || !totalAmount || !orderType) {
            return res.status(400).json({
                error: 'Missing required fields: vendorId, items, totalAmount, orderType'
            });
        }

        await connection.beginTransaction();

        // Insert order
        const [orderResult] = await connection.execute(
            `INSERT INTO orders (customer_id, vendor_id, total_amount, status, delivery_address, customer_notes, order_type, created_at)
             VALUES (?, ?, ?, 'pending', ?, ?, ?, NOW())`,
            [customerId, vendorId, totalAmount, deliveryAddress || null, customerNotes || null, orderType]
        );

        const orderId = orderResult.insertId;

        // Insert order items
        for (const item of items) {
            await connection.execute(
                `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal)
                 VALUES (?, ?, ?, ?, ?)`,
                [orderId, item.menuItemId, item.quantity, item.price, item.price * item.quantity]
            );
        }

        await connection.commit();

        res.status(201).json({
            message: 'Order created successfully',
            orderId
        });

    } catch (error) {
        await connection.rollback();
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    } finally {
        connection.release();
    }
});

// GET /customer - Get orders for authenticated customer (uses JWT token)
router.get('/customer', authenticateToken, async (req, res) => {
    try {
        const customerId = req.user.id;

        // Get orders with vendor name, phone, and review status
        const [orders] = await pool.execute(
            `SELECT o.*,
                    v.id as vendor_table_id,
                    u.name as vendor_name,
                    u.phone as vendor_phone,
                    r.id as reviewId,
                    (r.id IS NOT NULL) as hasReview
             FROM orders o
             JOIN vendors v ON o.vendor_id = v.id
             JOIN users u ON v.user_id = u.id
             LEFT JOIN reviews r ON o.id = r.order_id
             WHERE o.customer_id = ?
             ORDER BY o.created_at DESC`,
            [customerId]
        );

        // Get items for each order
        for (const order of orders) {
            const [items] = await pool.execute(
                `SELECT oi.*, mi.name as item_name
                 FROM order_items oi
                 LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
                 WHERE oi.order_id = ?`,
                [order.id]
            );
            order.items = items;
            order.hasReview = !!order.hasReview;
        }

        res.json({ success: true, orders });

    } catch (error) {
        console.error('Get customer orders error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch orders' });
    }
});

// GET /customer/:customerId - Get customer's orders (legacy route)
router.get('/customer/:customerId', authenticateToken, async (req, res) => {
    try {
        const { customerId } = req.params;

        // Get orders with vendor name, phone, and review status
        const [orders] = await pool.execute(
    `SELECT o.*, 
            u.name as vendorName, 
            u.phone as vendorPhone,
            r.id as reviewId,
            (r.id IS NOT NULL) as hasReview
     FROM orders o
     JOIN users u ON o.vendor_id = u.id
     LEFT JOIN reviews r ON o.id = r.order_id
     WHERE o.customer_id = ?
     ORDER BY o.created_at DESC`,
    [customerId]
);

        // Get items for each order
        for (const order of orders) {
            const [items] = await pool.execute(
                `SELECT oi.*, mi.name as item_name
                 FROM order_items oi
                 LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
                 WHERE oi.order_id = ?`,
                [order.id]
            );
            order.items = items;
            order.hasReview = !!order.has_review;
        }

        res.json({ orders });

    } catch (error) {
        console.error('Get customer orders error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// GET /vendor - Get orders for the authenticated vendor (looks up vendor by user_id)
router.get('/vendor', authenticateToken, requireRole('vendor'), async (req, res) => {
    try {
        // Get vendor ID by looking up the vendor record for this user
        const [vendors] = await pool.execute(
            'SELECT id FROM vendors WHERE user_id = ?',
            [req.user.id]
        );

        if (vendors.length === 0) {
            return res.status(404).json({
                error: 'Vendor profile not found. Please complete your vendor profile first.',
                orders: []
            });
        }

        const vendorId = vendors[0].id;

        // Get orders with customer name
        const [orders] = await pool.execute(
            `SELECT o.*, u.name as customer_name, u.phone as customer_phone
             FROM orders o
             JOIN users u ON o.customer_id = u.id
             WHERE o.vendor_id = ?
             ORDER BY o.created_at DESC`,
            [vendorId]
        );

        // Get items for each order
        for (const order of orders) {
            const [items] = await pool.execute(
                `SELECT oi.*, mi.name as item_name
                 FROM order_items oi
                 LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
                 WHERE oi.order_id = ?`,
                [order.id]
            );
            order.items = items;
        }

        res.json({ orders });

    } catch (error) {
        console.error('Get vendor orders error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// GET /vendor/:vendorId - Get vendor's orders (legacy route for backwards compatibility)
router.get('/vendor/:vendorId', authenticateToken, async (req, res) => {
    try {
        const { vendorId } = req.params;

        // Get orders with customer name
        const [orders] = await pool.execute(
            `SELECT o.*, u.name as customer_name, u.phone as customer_phone
             FROM orders o
             JOIN users u ON o.customer_id = u.id
             WHERE o.vendor_id = ?
             ORDER BY o.created_at DESC`,
            [vendorId]
        );

        // Get items for each order
        for (const order of orders) {
            const [items] = await pool.execute(
                `SELECT oi.*, mi.name as item_name
                 FROM order_items oi
                 LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
                 WHERE oi.order_id = ?`,
                [order.id]
            );
            order.items = items;
        }

        res.json({ orders });

    } catch (error) {
        console.error('Get vendor orders error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// PUT /:orderId/cancel - Cancel order (customer only, pending orders)
router.put('/:orderId/cancel', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const orderId = req.params.orderId;
        const customerId = req.user.id;

        await connection.beginTransaction();

        // Verify order belongs to customer and is pending
        const [orders] = await connection.execute(
            'SELECT * FROM orders WHERE id = ? AND customer_id = ?',
            [orderId, customerId]
        );

        if (orders.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        const order = orders[0];

        if (order.status !== 'pending') {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'Only pending orders can be cancelled'
            });
        }

        // Update order status to cancelled
        await connection.execute(
            'UPDATE orders SET status = ? WHERE id = ?',
            ['cancelled', orderId]
        );

        // If there's a vendor_amount, deduct from vendor pending balance
        if (order.vendor_amount && parseFloat(order.vendor_amount) > 0) {
            const vendorAmount = parseFloat(order.vendor_amount);

            // vendor_wallets.vendor_id references vendors.id, not users.id
            // order.vendor_id is already vendors.id, so use it directly
            await connection.execute(
                `UPDATE vendor_wallets
                 SET pending_balance = GREATEST(pending_balance - ?, 0),
                     updated_at = NOW()
                 WHERE vendor_id = ?`,
                [vendorAmount, order.vendor_id]
            );
        }

        await connection.commit();

        res.json({
            success: true,
            message: 'Order cancelled successfully'
        });

    } catch (error) {
        await connection.rollback();
        console.error('Cancel order error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cancel order'
        });
    } finally {
        connection.release();
    }
});

// PUT /:orderId/status - Update order status (vendor only)
router.put('/:orderId/status', authenticateToken, requireRole('vendor'), async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { orderId } = req.params;
        const { status } = req.body;

        // Validate status
        const validStatuses = ['preparing', 'ready', 'completed', 'cancelled'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        await connection.beginTransaction();

        // Verify order belongs to this vendor and get order details
        const [orders] = await connection.execute(
            `SELECT o.id, o.vendor_amount, o.status as current_status FROM orders o
             JOIN vendors v ON o.vendor_id = v.id
             WHERE o.id = ? AND v.user_id = ?`,
            [orderId, req.user.id]
        );

        if (orders.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                error: 'Order not found or access denied'
            });
        }

        const order = orders[0];
        const previousStatus = order.current_status;

        // Update status
        await connection.execute(
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, orderId]
        );

        // If status is changing to 'completed' and vendor_amount exists,
        // move money from pending_balance to available_balance
        if ((status === 'completed' || status === 'ready') && order.vendor_amount && previousStatus !== 'completed' && previousStatus !== 'ready') {
            const vendorAmount = parseFloat(order.vendor_amount);

            // Get vendor.id from vendors table (vendor_wallets uses vendors.id, not users.id)
            const [vendorRows] = await connection.execute(
                'SELECT id FROM vendors WHERE user_id = ?',
                [req.user.id]
            );

            if (vendorRows.length > 0) {
                const vendorId = vendorRows[0].id;

                // Check if wallet exists
                const [walletRows] = await connection.execute(
                    'SELECT vendor_id FROM vendor_wallets WHERE vendor_id = ?',
                    [vendorId]
                );

                if (walletRows.length > 0) {
                    // Move from pending to available
                    await connection.execute(
                        `UPDATE vendor_wallets
                         SET available_balance = available_balance + ?,
                             pending_balance = GREATEST(pending_balance - ?, 0),
                             updated_at = NOW()
                         WHERE vendor_id = ?`,
                        [vendorAmount, vendorAmount, vendorId]
                    );
                }
            }
        }

        await connection.commit();

        res.json({
            message: 'Order status updated successfully',
            orderId,
            status
        });

    } catch (error) {
        await connection.rollback();
        console.error('Update order status error:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    } finally {
        connection.release();
    }
});

module.exports = router;
