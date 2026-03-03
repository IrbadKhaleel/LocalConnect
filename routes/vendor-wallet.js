const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /balance - Get vendor's wallet info
router.get('/balance', authenticateToken, requireRole('vendor'), async (req, res) => {
    try {
        // First, get the vendor's table ID from users.id
        const [vendorRows] = await pool.execute(
            'SELECT id FROM vendors WHERE user_id = ?',
            [req.user.id]
        );

        if (vendorRows.length === 0) {
            return res.json({
                available_balance: 0.00,
                pending_balance: 0.00,
                total_earned: 0.00,
                last_payout_date: null
            });
        }

        const vendorId = vendorRows[0].id;

        // Check if wallet exists, create if not
        const [walletRows] = await pool.execute(
            'SELECT * FROM vendor_wallets WHERE vendor_id = ?',
            [vendorId]
        );

        if (walletRows.length === 0) {
            // Create wallet for vendor
            await pool.execute(
                'INSERT INTO vendor_wallets (vendor_id, available_balance, pending_balance, total_earned) VALUES (?, 0.00, 0.00, 0.00)',
                [vendorId]
            );

            return res.json({
                available_balance: 0.00,
                pending_balance: 0.00,
                total_earned: 0.00,
                last_payout_date: null
            });
        }

        const wallet = walletRows[0];
        res.json({
            available_balance: parseFloat(wallet.available_balance),
            pending_balance: parseFloat(wallet.pending_balance),
            total_earned: parseFloat(wallet.total_earned),
            last_payout_date: wallet.last_payout_date
        });

    } catch (error) {
        console.error('Get wallet balance error:', error);
        res.status(500).json({ error: 'Failed to fetch wallet balance' });
    }
});

// GET /payouts - Get vendor's payout history
router.get('/payouts', authenticateToken, requireRole('vendor'), async (req, res) => {
    try {
        // First, get the vendor's table ID from users.id
        const [vendorRows] = await pool.execute(
            'SELECT id FROM vendors WHERE user_id = ?',
            [req.user.id]
        );

        if (vendorRows.length === 0) {
            return res.json({ payouts: [] });
        }

        const vendorId = vendorRows[0].id;

        const [payouts] = await pool.execute(
            `SELECT id, amount, commission_amount, status, bank_name, account_number, account_name, reference, requested_at, completed_at
             FROM payouts
             WHERE vendor_id = ?
             ORDER BY requested_at DESC`,
            [vendorId]
        );

        res.json({ payouts });

    } catch (error) {
        console.error('Get payouts error:', error);
        res.status(500).json({ error: 'Failed to fetch payouts' });
    }
});

// POST /request-payout - Manually request payout
router.post('/request-payout', authenticateToken, requireRole('vendor'), async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { bankName, accountNumber, accountName } = req.body;

        // Validate bank details
        if (!bankName || !accountNumber || !accountName) {
            return res.status(400).json({ error: 'Bank name, account number, and account name are required' });
        }

        // First, get the vendor's table ID from users.id
        const [vendorRows] = await connection.execute(
            'SELECT id FROM vendors WHERE user_id = ?',
            [req.user.id]
        );

        if (vendorRows.length === 0) {
            return res.status(404).json({ error: 'Vendor profile not found' });
        }

        const vendorId = vendorRows[0].id;

        await connection.beginTransaction();

        // Get wallet balance
        const [walletRows] = await connection.execute(
            'SELECT available_balance FROM vendor_wallets WHERE vendor_id = ? FOR UPDATE',
            [vendorId]
        );

        if (walletRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Wallet not found' });
        }

        const availableBalance = parseFloat(walletRows[0].available_balance);

        if (availableBalance <= 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'No available balance for payout' });
        }

        const reference = 'payout_' + vendorId + '_' + Date.now();

        // Create payout record
        await connection.execute(
            `INSERT INTO payouts (vendor_id, amount, commission_amount, status, bank_name, account_number, account_name, reference, requested_at)
             VALUES (?, ?, 0.00, 'pending', ?, ?, ?, ?, NOW())`,
            [vendorId, availableBalance, bankName, accountNumber, accountName, reference]
        );

        // Update wallet - set available_balance to 0
        await connection.execute(
            'UPDATE vendor_wallets SET available_balance = 0.00, last_payout_date = NOW(), updated_at = NOW() WHERE vendor_id = ?',
            [vendorId]
        );

        await connection.commit();

        // Mock: Auto-complete payout after 3 seconds
        setTimeout(async () => {
            try {
                await pool.execute(
                    "UPDATE payouts SET status = 'completed', completed_at = NOW() WHERE reference = ?",
                    [reference]
                );
                console.log(`Payout ${reference} completed`);
            } catch (err) {
                console.error('Auto-complete payout error:', err);
            }
        }, 3000);

        res.json({
            success: true,
            message: 'Payout requested successfully',
            payout: {
                reference,
                amount: availableBalance,
                status: 'pending'
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Request payout error:', error);
        res.status(500).json({ error: 'Failed to request payout' });
    } finally {
        connection.release();
    }
});

// GET /transactions - Get vendor's order earnings breakdown
router.get('/transactions', authenticateToken, requireRole('vendor'), async (req, res) => {
    try {
        const vendorId = req.user.id;

        // Get vendor's table ID first
        const [vendorRows] = await pool.execute(
            'SELECT id FROM vendors WHERE user_id = ?',
            [vendorId]
        );

        if (vendorRows.length === 0) {
            return res.json({ transactions: [] });
        }

        const vendorTableId = vendorRows[0].id;

        // Get all completed/paid orders with commission breakdown
        const [transactions] = await pool.execute(
            `SELECT o.id as order_id, o.total_amount, o.commission_amount, o.vendor_amount, o.created_at, o.status
             FROM orders o
             JOIN payments p ON o.id = p.order_id
             WHERE o.vendor_id = ? AND p.status = 'successful'
             ORDER BY o.created_at DESC`,
            [vendorTableId]
        );

        res.json({ transactions });

    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// POST /trigger-daily-payout - Admin-only endpoint for batch payouts
// This should only be called by admin or automated systems, not by vendors
router.post('/trigger-daily-payout', authenticateToken, requireRole('admin'), async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Find all vendors with available_balance > 0
        const [vendors] = await connection.execute(
            'SELECT vw.vendor_id, vw.available_balance, v.business_name as name FROM vendor_wallets vw JOIN vendors v ON vw.vendor_id = v.id WHERE vw.available_balance > 0 FOR UPDATE'
        );

        if (vendors.length === 0) {
            await connection.commit();
            return res.json({
                success: true,
                message: 'No vendors with available balance for payout',
                summary: { vendorsPaid: 0, totalAmount: 0 }
            });
        }

        let totalAmount = 0;
        const payoutDetails = [];

        for (const vendor of vendors) {
            const reference = 'daily_payout_' + vendor.vendor_id + '_' + Date.now();
            const amount = parseFloat(vendor.available_balance);

            // Create payout record with status 'completed'
            await connection.execute(
                `INSERT INTO payouts (vendor_id, amount, commission_amount, status, bank_name, account_number, account_name, reference, requested_at, completed_at)
                 VALUES (?, ?, 0.00, 'completed', 'Auto Payout Bank', '0000000000', ?, ?, NOW(), NOW())`,
                [vendor.vendor_id, amount, vendor.name, reference]
            );

            // Set available_balance to 0
            await connection.execute(
                'UPDATE vendor_wallets SET available_balance = 0.00, last_payout_date = NOW(), updated_at = NOW() WHERE vendor_id = ?',
                [vendor.vendor_id]
            );

            totalAmount += amount;
            payoutDetails.push({
                vendorId: vendor.vendor_id,
                vendorName: vendor.name,
                amount: amount,
                reference: reference
            });
        }

        await connection.commit();

        res.json({
            success: true,
            message: 'Daily payout completed',
            summary: {
                vendorsPaid: vendors.length,
                totalAmount: Math.round(totalAmount * 100) / 100
            },
            payouts: payoutDetails
        });

    } catch (error) {
        await connection.rollback();
        console.error('Trigger daily payout error:', error);
        res.status(500).json({ error: 'Failed to process daily payouts' });
    } finally {
        connection.release();
    }
});

module.exports = router;
