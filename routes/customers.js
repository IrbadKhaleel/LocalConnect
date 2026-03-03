const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Note: All customer routes are PUBLIC (no authentication required)
// Customers can browse vendors and menus without logging in

// GET /api/customers/vendors - Get all vendors with ratings
router.get('/vendors', async (req, res) => {
    try {
        const [vendors] = await pool.query(
            `SELECT v.id, v.business_name, v.business_address, v.category, v.description,
                    v.logo_url, v.operating_hours, v.created_at,
                    COUNT(DISTINCT r.id) as total_reviews,
                    COALESCE(AVG(r.rating), 0) as average_rating
             FROM vendors v
             LEFT JOIN reviews r ON v.id = r.vendor_id
             GROUP BY v.id
             ORDER BY v.created_at DESC`
        );

        // Format the ratings
        const formattedVendors = vendors.map(v => ({
            ...v,
            totalReviews: parseInt(v.total_reviews) || 0,
            averageRating: parseFloat(v.average_rating) || 0
        }));

        res.status(200).json({
            message: 'Vendors retrieved successfully',
            data: formattedVendors
        });

    } catch (error) {
        console.error('Get vendors error:', error);
        res.status(500).json({
            error: 'Server error while retrieving vendors'
        });
    }
});

// GET /api/customers/vendors/:id - Get specific vendor with menu items and ratings
router.get('/vendors/:id', async (req, res) => {
    try {
        const vendorId = req.params.id;

        // Get vendor details with ratings
        const [vendors] = await pool.query(
            `SELECT v.id, v.business_name, v.business_address, v.category, v.description,
                    v.logo_url, v.operating_hours,
                    COUNT(DISTINCT r.id) as total_reviews,
                    COALESCE(AVG(r.rating), 0) as average_rating
             FROM vendors v
             LEFT JOIN reviews r ON v.id = r.vendor_id
             WHERE v.id = ?
             GROUP BY v.id`,
            [vendorId]
        );

        if (vendors.length === 0) {
            return res.status(404).json({
                error: 'Vendor not found'
            });
        }

        // Get vendor's menu items (only available ones)
        const [menuItems] = await pool.query(
            `SELECT id, name, description, price, image_url, available
             FROM menu_items
             WHERE vendor_id = ? AND available = true
             ORDER BY created_at DESC`,
            [vendorId]
        );

        const vendor = {
            ...vendors[0],
            totalReviews: parseInt(vendors[0].total_reviews) || 0,
            averageRating: parseFloat(vendors[0].average_rating) || 0
        };

        res.status(200).json({
            message: 'Vendor details retrieved successfully',
            data: {
                vendor: vendor,
                menuItems: menuItems
            }
        });

    } catch (error) {
        console.error('Get vendor details error:', error);
        res.status(500).json({
            error: 'Server error while retrieving vendor details'
        });
    }
});

// GET /api/customers/categories - Get all categories
router.get('/categories', async (req, res) => {
    try {
        const [categories] = await pool.query(
            `SELECT id, category_name, description
             FROM categories
             ORDER BY category_name`
        );

        res.status(200).json({
            message: 'Categories retrieved successfully',
            data: categories
        });

    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            error: 'Server error while retrieving categories'
        });
    }
});

// GET /api/customers/vendors/category/:category - Get vendors by category
router.get('/vendors/category/:category', async (req, res) => {
    try {
        const category = decodeURIComponent(req.params.category);

        const [vendors] = await pool.query(
            `SELECT id, business_name, business_address, category, description, logo_url, operating_hours
             FROM vendors
             WHERE category = ?
             ORDER BY created_at DESC`,
            [category]
        );

        res.status(200).json({
            message: `Vendors in category '${category}' retrieved successfully`,
            data: vendors
        });

    } catch (error) {
        console.error('Get vendors by category error:', error);
        res.status(500).json({
            error: 'Server error while retrieving vendors by category'
        });
    }
});

// GET /api/customers/search?q=term - Search vendors and menu items
router.get('/search', async (req, res) => {
    try {
        const searchTerm = req.query.q;

        // Validate search term
        if (!searchTerm || searchTerm.trim().length < 2) {
            return res.status(400).json({
                error: 'Search term must be at least 2 characters long'
            });
        }

        const searchPattern = `%${searchTerm.trim()}%`;

        // Search vendors by business name, description, or their menu items with ratings
        const [vendors] = await pool.query(
            `SELECT v.id, v.business_name, v.business_address, v.category,
                    v.description, v.logo_url, v.operating_hours, v.created_at,
                    COUNT(DISTINCT r.id) as total_reviews,
                    COALESCE(AVG(r.rating), 0) as average_rating
             FROM vendors v
             LEFT JOIN menu_items m ON v.id = m.vendor_id
             LEFT JOIN reviews r ON v.id = r.vendor_id
             WHERE v.business_name LIKE ?
                OR v.description LIKE ?
                OR v.category LIKE ?
                OR m.name LIKE ?
                OR m.description LIKE ?
             GROUP BY v.id
             ORDER BY v.created_at DESC`,
            [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern]
        );

        // Format the ratings
        const formattedVendors = vendors.map(v => ({
            ...v,
            totalReviews: parseInt(v.total_reviews) || 0,
            averageRating: parseFloat(v.average_rating) || 0
        }));

        res.status(200).json({
            message: `Search results for '${searchTerm}'`,
            data: formattedVendors
        });

    } catch (error) {
        console.error('Search vendors error:', error);
        res.status(500).json({
            error: 'Server error while searching vendors'
        });
    }
});

module.exports = router;
