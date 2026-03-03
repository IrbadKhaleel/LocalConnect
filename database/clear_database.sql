-- =====================================================
-- LocalConnect Database Clear Script
-- =====================================================
-- Purpose: Safely clear all existing data from database
-- Run this BEFORE seeding to start fresh
-- Preserves table structure, only removes data
-- =====================================================

USE localconnect_db;

-- Disable foreign key checks temporarily to allow truncation
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- Clear all tables in reverse dependency order
-- =====================================================

-- Clear reviews first (depends on orders, customers, vendors)
TRUNCATE TABLE reviews;

-- Clear order items (depends on orders, menu_items)
TRUNCATE TABLE order_items;

-- Clear orders (depends on customers, vendors)
TRUNCATE TABLE orders;

-- Clear payouts (depends on vendor_wallets)
TRUNCATE TABLE payouts;

-- Clear vendor wallets (depends on vendors/users)
TRUNCATE TABLE vendor_wallets;

-- Clear menu items (depends on vendors/users)
TRUNCATE TABLE menu_items;

-- Clear users last (base table)
TRUNCATE TABLE users;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- Verification: Confirm all tables are empty
-- =====================================================

SELECT '=== DATABASE CLEAR VERIFICATION ===' AS '';

SELECT 'Users' AS table_name, COUNT(*) AS remaining_rows FROM users
UNION ALL
SELECT 'Menu Items', COUNT(*) FROM menu_items
UNION ALL
SELECT 'Orders', COUNT(*) FROM orders
UNION ALL
SELECT 'Order Items', COUNT(*) FROM order_items
UNION ALL
SELECT 'Reviews', COUNT(*) FROM reviews
UNION ALL
SELECT 'Vendor Wallets', COUNT(*) FROM vendor_wallets
UNION ALL
SELECT 'Payouts', COUNT(*) FROM payouts;

SELECT '=== DATABASE CLEARED SUCCESSFULLY ===' AS status;
SELECT 'Ready for seeding with seed_data.sql' AS next_step;
