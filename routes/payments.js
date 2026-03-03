const express = require('express');
const router = express.Router();
const https = require('https');
const { pool } = require('../config/db');
require('dotenv').config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Helper: makes HTTPS requests to Paystack directly (bypasses Cloudflare blocking axios)
function paystackRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.paystack.com',
            path: path,
            method: method,
            headers: {
                'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error('Paystack returned non-JSON: ' + body.substring(0, 300)));
                }
            });
        });

        req.on('error', (err) => { reject(err); });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

// POST /initialize - Initialize Paystack payment
router.post('/initialize', async (req, res) => {
    try {
        const { email, amount, orderId } = req.body;

        if (!email || !amount || !orderId) {
            return res.status(400).json({ error: 'Email, amount, and orderId are required' });
        }

        const amountInKobo = Math.round(parseFloat(amount) * 100);

        const paystackData = {
            email,
            amount: amountInKobo,
            callback_url: 'http://localhost:3000/payment-callback.html',
            metadata: { orderId }
        };

        const response = await paystackRequest('POST', '/transaction/initialize', paystackData);

        if (response.status) {
            const { authorization_url, reference } = response.data;

            await pool.execute(
                `INSERT INTO payments (order_id, reference, amount, payment_method, status, transaction_date)
                 VALUES (?, ?, ?, 'paystack', 'pending', NOW())`,
                [orderId, reference, amount]
            );

            res.status(200).json({
                authorizationUrl: authorization_url,
                reference
            });
        } else {
            res.status(400).json({
                error: 'Failed to initialize payment',
                message: response.message
            });
        }
    } catch (error) {
        console.error('Paystack initialize error:', error.message);
        res.status(500).json({ error: 'Payment initialization failed', details: error.message });
    }
});

// POST /verify/:reference - Verify payment after redirect
router.post('/verify/:reference', async (req, res) => {
    try {
        const { reference } = req.params;

        const response = await paystackRequest('GET', `/transaction/verify/${reference}`);

        const paymentData = response.data;
        const isSuccessful = response.status && paymentData.status === 'success';

        if (isSuccessful) {
            const orderId = paymentData.metadata.orderId;

            await pool.execute(
                `UPDATE payments SET status = 'successful', transaction_date = NOW() WHERE reference = ?`,
                [reference]
            );

            await pool.execute(
                `UPDATE orders SET status = 'pending', payment_status = 'paid' WHERE id = ?`,
                [orderId]
            );

            res.status(200).json({
                status: 'success',
                message: 'Payment verified successfully',
                data: {
                    reference,
                    amount: paymentData.amount / 100,
                    orderId,
                    paidAt: paymentData.paid_at
                }
            });
        } else {
            await pool.execute(
                `UPDATE payments SET status = 'failed' WHERE reference = ?`,
                [reference]
            );

            res.status(400).json({
                status: 'failed',
                message: paymentData.gateway_response || 'Payment verification failed'
            });
        }
    } catch (error) {
        console.error('Paystack verify error:', error.message);
        res.status(500).json({ error: 'Payment verification failed', details: error.message });
    }
});

router.post('/confirm', async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { orderId, reference, amount } = req.body;
        const orderAmount = parseFloat(amount);

        // Calculate commission (10%) and vendor amount (90%)
        const commissionRate = 10.00;
        const commissionAmount = Math.round(orderAmount * (commissionRate / 100) * 100) / 100;
        const vendorAmount = Math.round((orderAmount - commissionAmount) * 100) / 100;

        await connection.beginTransaction();

        // Insert payment record
        await connection.execute(
            'INSERT INTO payments (order_id, reference, amount, payment_method, status, transaction_date) VALUES (?, ?, ?, ?, ?, NOW())',
            [orderId, reference, amount, 'paystack', 'successful']
        );

        // Update order with commission info and payment status
        await connection.execute(
            'UPDATE orders SET status = ?, payment_status = ?, commission_rate = ?, commission_amount = ?, vendor_amount = ? WHERE id = ?',
            ['pending', 'paid', commissionRate, commissionAmount, vendorAmount, orderId]
        );

        // Get the vendor_id from the order (vendor_id in orders table references vendors.id)
        const [orderRows] = await connection.execute(
            'SELECT vendor_id FROM orders WHERE id = ?',
            [orderId]
        );

        if (orderRows.length === 0) {
            throw new Error('Order not found');
        }

        const vendorTableId = orderRows[0].vendor_id;

        // Get the user_id from vendors table (this is the vendor's user id for wallet)
        const [vendorRows] = await connection.execute(
            'SELECT user_id FROM vendors WHERE id = ?',
            [vendorTableId]
        );

        if (vendorRows.length === 0) {
            throw new Error('Vendor not found');
        }

        const vendorUserId = vendorRows[0].user_id;

        // Check if vendor has a wallet, create if not exists
        const [walletRows] = await connection.execute(
            'SELECT vendor_id FROM vendor_wallets WHERE vendor_id = ?',
            [vendorUserId]
        );

        if (walletRows.length === 0) {
            // Create wallet for vendor
            await connection.execute(
                'INSERT INTO vendor_wallets (vendor_id, available_balance, pending_balance, total_earned) VALUES (?, 0.00, ?, ?)',
                [vendorUserId, vendorAmount, vendorAmount]
            );
        } else {
            // Update vendor's pending_balance and total_earned
            await connection.execute(
                'UPDATE vendor_wallets SET pending_balance = pending_balance + ?, total_earned = total_earned + ?, updated_at = NOW() WHERE vendor_id = ?',
                [vendorAmount, vendorAmount, vendorUserId]
            );
        }

        await connection.commit();
        res.json({ success: true, message: 'Payment confirmed' });

    } catch (error) {
        await connection.rollback();
        console.error('Confirm error:', error);
        res.status(500).json({ error: 'Failed to confirm payment' });
    } finally {
        connection.release();
    }
});

module.exports = router;