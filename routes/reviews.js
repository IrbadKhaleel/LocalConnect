const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// POST /create - Create a new review
router.post('/create', authenticateToken, async (req, res) => {
    try {
        const { orderId, vendorId, rating, reviewText } = req.body;
        const customerId = req.user.id;

        // Validate rating
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                error: 'Rating must be between 1 and 5'
            });
        }

        // Verify order belongs to customer and is completed/ready
        const [orders] = await pool.execute(
            `SELECT * FROM orders WHERE id = ? AND customer_id = ? AND status IN ('completed', 'ready')`,
            [orderId, customerId]
        );

        if (orders.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Order not found or not eligible for review'
            });
        }

        // Check if already reviewed
        const [existingReview] = await pool.execute(
            'SELECT id FROM reviews WHERE order_id = ?',
            [orderId]
        );

        if (existingReview.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'You have already reviewed this order'
            });
        }

        // Insert review
        await pool.execute(
            `INSERT INTO reviews (order_id, customer_id, vendor_id, rating, comment)
             VALUES (?, ?, ?, ?, ?)`,
            [orderId, customerId, vendorId, rating, reviewText || null]
        );

        res.json({
            success: true,
            message: 'Review submitted successfully'
        });

    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit review'
        });
    }
});

// GET /vendor/:vendorId - Get vendor reviews
router.get('/vendor/:vendorId', async (req, res) => {
    try {
        const vendorId = req.params.vendorId;

        // Get all reviews for this vendor
        const [reviews] = await pool.execute(
            `SELECT r.*, u.name as customer_name
             FROM reviews r
             JOIN users u ON r.customer_id = u.id
             WHERE r.vendor_id = ?
             ORDER BY r.created_at DESC`,
            [vendorId]
        );

        // Calculate rating statistics
        const [stats] = await pool.execute(
            `SELECT
                COUNT(*) as total_reviews,
                AVG(rating) as average_rating,
                SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_stars,
                SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_stars,
                SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_stars,
                SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_stars,
                SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
             FROM reviews
             WHERE vendor_id = ?`,
            [vendorId]
        );

        res.json({
            success: true,
            reviews: reviews,
            stats: {
                totalReviews: parseInt(stats[0].total_reviews) || 0,
                averageRating: parseFloat(stats[0].average_rating) || 0,
                fiveStars: parseInt(stats[0].five_stars) || 0,
                fourStars: parseInt(stats[0].four_stars) || 0,
                threeStars: parseInt(stats[0].three_stars) || 0,
                twoStars: parseInt(stats[0].two_stars) || 0,
                oneStar: parseInt(stats[0].one_star) || 0
            }
        });

    } catch (error) {
        console.error('Get vendor reviews error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch reviews'
        });
    }
});

module.exports = router;
