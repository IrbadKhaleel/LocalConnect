const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Apply authentication and role check to all vendor routes
router.use(authenticateToken);
router.use(requireRole('vendor'));

// Allowed categories
const ALLOWED_CATEGORIES = [
    'Fast Food',
    'Traditional Cuisine',
    'Bakery',
    'Beverages',
    'Street Food',
    'Catering'
];

// ============= PROFILE MANAGEMENT =============

// GET /api/vendors/profile - Get current vendor's profile
router.get('/profile', async (req, res) => {
    try {
        const userId = req.user.id;

        const [vendors] = await pool.query(
            `SELECT v.*, u.name, u.email
             FROM vendors v
             INNER JOIN users u ON v.user_id = u.id
             WHERE v.user_id = ?`,
            [userId]
        );

        if (vendors.length === 0) {
            return res.status(404).json({
                error: 'Vendor profile not found'
            });
        }

        res.status(200).json({
            message: 'Profile retrieved successfully',
            data: vendors[0]
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            error: 'Server error while retrieving profile'
        });
    }
});

// POST /api/vendors/profile - Create vendor profile
router.post('/profile', async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            business_name,
            business_address,
            category,
            description,
            logo_url,
            operating_hours
        } = req.body;

        // Validate required fields
        if (!business_name) {
            return res.status(400).json({
                error: 'Business name is required'
            });
        }

        if (!category) {
            return res.status(400).json({
                error: 'Category is required'
            });
        }

        // Validate category
        if (!ALLOWED_CATEGORIES.includes(category)) {
            return res.status(400).json({
                error: `Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(', ')}`
            });
        }

        // Check if profile already exists
        const [existing] = await pool.query(
            'SELECT id FROM vendors WHERE user_id = ?',
            [userId]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                error: 'Vendor profile already exists. Use PUT to update.'
            });
        }

        // Insert new profile
        const [result] = await pool.query(
            `INSERT INTO vendors
             (user_id, business_name, business_address, category, description, logo_url, operating_hours)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                business_name,
                business_address || null,
                category,
                description || null,
                logo_url || null,
                operating_hours || null
            ]
        );

        // Fetch created profile
        const [created] = await pool.query(
            'SELECT * FROM vendors WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json({
            message: 'Vendor profile created successfully',
            data: created[0]
        });

    } catch (error) {
        console.error('Create profile error:', error);
        res.status(500).json({
            error: 'Server error while creating profile'
        });
    }
});

// PUT /api/vendors/profile - Update vendor profile
router.put('/profile', async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            business_name,
            business_address,
            category,
            description,
            logo_url,
            operating_hours
        } = req.body;

        // Validate required fields
        if (!business_name) {
            return res.status(400).json({
                error: 'Business name is required'
            });
        }

        if (!category) {
            return res.status(400).json({
                error: 'Category is required'
            });
        }

        // Validate category
        if (!ALLOWED_CATEGORIES.includes(category)) {
            return res.status(400).json({
                error: `Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(', ')}`
            });
        }

        // Check if profile exists
        const [existing] = await pool.query(
            'SELECT id FROM vendors WHERE user_id = ?',
            [userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                error: 'Vendor profile not found. Create one first.'
            });
        }

        // Update profile
        await pool.query(
            `UPDATE vendors
             SET business_name = ?, business_address = ?, category = ?,
                 description = ?, logo_url = ?, operating_hours = ?
             WHERE user_id = ?`,
            [
                business_name,
                business_address || null,
                category,
                description || null,
                logo_url || null,
                operating_hours || null,
                userId
            ]
        );

        // Fetch updated profile
        const [updated] = await pool.query(
            'SELECT * FROM vendors WHERE user_id = ?',
            [userId]
        );

        res.status(200).json({
            message: 'Vendor profile updated successfully',
            data: updated[0]
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            error: 'Server error while updating profile'
        });
    }
});

// ============= MENU MANAGEMENT =============

// GET /api/vendors/menu - Get all vendor's menu items
router.get('/menu', async (req, res) => {
    try {
        const userId = req.user.id;

        const [items] = await pool.query(
            `SELECT m.*
             FROM menu_items m
             INNER JOIN vendors v ON m.vendor_id = v.id
             WHERE v.user_id = ?
             ORDER BY m.created_at DESC`,
            [userId]
        );

        res.status(200).json({
            message: 'Menu items retrieved successfully',
            data: items
        });

    } catch (error) {
        console.error('Get menu items error:', error);
        res.status(500).json({
            error: 'Server error while retrieving menu items'
        });
    }
});

// POST /api/vendors/menu - Add menu item
router.post('/menu', async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            name,
            description,
            price,
            image_url,
            available
        } = req.body;

        // Validate required fields
        if (!name) {
            return res.status(400).json({
                error: 'Item name is required'
            });
        }

        if (price === undefined || price === null) {
            return res.status(400).json({
                error: 'Price is required'
            });
        }

        // Validate price
        const priceNum = parseFloat(price);
        if (isNaN(priceNum) || priceNum < 0) {
            return res.status(400).json({
                error: 'Price must be a positive number'
            });
        }

        // Get vendor_id from user_id
        const [vendors] = await pool.query(
            'SELECT id FROM vendors WHERE user_id = ?',
            [userId]
        );

        if (vendors.length === 0) {
            return res.status(400).json({
                error: 'Please create your vendor profile first'
            });
        }

        const vendorId = vendors[0].id;

        // Insert menu item
        const [result] = await pool.query(
            `INSERT INTO menu_items
             (vendor_id, name, description, price, image_url, available)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                vendorId,
                name,
                description || null,
                priceNum,
                image_url || null,
                available !== undefined ? available : true
            ]
        );

        // Fetch created item
        const [created] = await pool.query(
            'SELECT * FROM menu_items WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json({
            message: 'Menu item created successfully',
            data: created[0]
        });

    } catch (error) {
        console.error('Create menu item error:', error);
        res.status(500).json({
            error: 'Server error while creating menu item'
        });
    }
});

// PUT /api/vendors/menu/:id - Update menu item
router.put('/menu/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const itemId = req.params.id;
        const {
            name,
            description,
            price,
            image_url,
            available
        } = req.body;

        // Validate required fields
        if (!name) {
            return res.status(400).json({
                error: 'Item name is required'
            });
        }

        if (price === undefined || price === null) {
            return res.status(400).json({
                error: 'Price is required'
            });
        }

        // Validate price
        const priceNum = parseFloat(price);
        if (isNaN(priceNum) || priceNum < 0) {
            return res.status(400).json({
                error: 'Price must be a positive number'
            });
        }

        // Verify ownership
        const [ownership] = await pool.query(
            `SELECT m.id
             FROM menu_items m
             INNER JOIN vendors v ON m.vendor_id = v.id
             WHERE m.id = ? AND v.user_id = ?`,
            [itemId, userId]
        );

        if (ownership.length === 0) {
            return res.status(404).json({
                error: 'Menu item not found'
            });
        }

        // Update menu item
        await pool.query(
            `UPDATE menu_items
             SET name = ?, description = ?, price = ?, image_url = ?, available = ?
             WHERE id = ?`,
            [
                name,
                description || null,
                priceNum,
                image_url || null,
                available !== undefined ? available : true,
                itemId
            ]
        );

        // Fetch updated item
        const [updated] = await pool.query(
            'SELECT * FROM menu_items WHERE id = ?',
            [itemId]
        );

        res.status(200).json({
            message: 'Menu item updated successfully',
            data: updated[0]
        });

    } catch (error) {
        console.error('Update menu item error:', error);
        res.status(500).json({
            error: 'Server error while updating menu item'
        });
    }
});

// DELETE /api/vendors/menu/:id - Delete menu item
router.delete('/menu/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const itemId = req.params.id;

        // Verify ownership
        const [ownership] = await pool.query(
            `SELECT m.id
             FROM menu_items m
             INNER JOIN vendors v ON m.vendor_id = v.id
             WHERE m.id = ? AND v.user_id = ?`,
            [itemId, userId]
        );

        if (ownership.length === 0) {
            return res.status(404).json({
                error: 'Menu item not found'
            });
        }

        // Delete menu item
        await pool.query(
            'DELETE FROM menu_items WHERE id = ?',
            [itemId]
        );

        res.status(200).json({
            message: 'Menu item deleted successfully'
        });

    } catch (error) {
        console.error('Delete menu item error:', error);
        res.status(500).json({
            error: 'Server error while deleting menu item'
        });
    }
});

module.exports = router;
