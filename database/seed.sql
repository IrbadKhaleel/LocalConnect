-- LocalConnect Minimal Seed Data
-- Simple, direct approach for Aiven MySQL
-- Password for all: test123

USE defaultdb;

-- Disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- Clear all data using DELETE (works with foreign keys)
DELETE FROM reviews;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM vendor_wallets;
DELETE FROM menu_items;
DELETE FROM vendors;
DELETE FROM users;

-- Reset auto-increment to start IDs from 1
ALTER TABLE users AUTO_INCREMENT = 1;
ALTER TABLE vendors AUTO_INCREMENT = 1;
ALTER TABLE menu_items AUTO_INCREMENT = 1;
ALTER TABLE orders AUTO_INCREMENT = 1;
ALTER TABLE order_items AUTO_INCREMENT = 1;
ALTER TABLE reviews AUTO_INCREMENT = 1;
ALTER TABLE vendor_wallets AUTO_INCREMENT = 1;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- USERS (Password for all: test123)
-- =====================================================

-- Admin (ID: 1)
INSERT INTO users (email, password, role, name, phone) VALUES
('admin@localconnect.com', '$2b$10$.z3L5bok.hZrCwua1GU3LexaHGj.xvRR9PKCMtUsyNeLWaBDBItk6', 'admin', 'Admin User', '08012345678');

-- Customers (IDs: 2-4)
INSERT INTO users (email, password, role, name, phone) VALUES
('customer1@test.com', '$2b$10$.z3L5bok.hZrCwua1GU3LexaHGj.xvRR9PKCMtUsyNeLWaBDBItk6', 'customer', 'Aisha Mohammed', '08011111111'),
('customer2@test.com', '$2b$10$.z3L5bok.hZrCwua1GU3LexaHGj.xvRR9PKCMtUsyNeLWaBDBItk6', 'customer', 'Ibrahim Sani', '08022222222'),
('customer3@test.com', '$2b$10$.z3L5bok.hZrCwua1GU3LexaHGj.xvRR9PKCMtUsyNeLWaBDBItk6', 'customer', 'Fatima Yusuf', '08033333333');

-- Vendor Users (IDs: 5-7)
INSERT INTO users (email, password, role, name, phone) VALUES
('vendor1@test.com', '$2b$10$.z3L5bok.hZrCwua1GU3LexaHGj.xvRR9PKCMtUsyNeLWaBDBItk6', 'vendor', 'Ninnys Delicacies', '08091234567'),
('vendor2@test.com', '$2b$10$.z3L5bok.hZrCwua1GU3LexaHGj.xvRR9PKCMtUsyNeLWaBDBItk6', 'vendor', 'Arewa Kitchen', '08091234568'),
('vendor3@test.com', '$2b$10$.z3L5bok.hZrCwua1GU3LexaHGj.xvRR9PKCMtUsyNeLWaBDBItk6', 'vendor', 'Suya Paradise', '08091234569');

-- =====================================================
-- VENDORS (Using direct user_id: 5, 6, 7)
-- =====================================================

INSERT INTO vendors (user_id, business_name, business_address, category, description, logo_url, operating_hours) VALUES
(5, 'Ninnys Delicacies', 'Sabon Gari Market, Kano', 'Northern Nigerian', 'Traditional tuwo and soups', 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400', 'Mon-Sat: 10AM-8PM'),
(6, 'Arewa Kitchen', 'Zoo Road, Kano', 'Rice & Nigerian Food', 'Jollof rice and more', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400', 'Mon-Sun: 9AM-10PM'),
(7, 'Suya Paradise', 'Murtala Mohammed Way, Kano', 'Grills & BBQ', 'Premium suya', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400', 'Mon-Sun: 4PM-11PM');

-- =====================================================
-- VENDOR WALLETS (vendor_id: 1, 2, 3)
-- =====================================================

INSERT INTO vendor_wallets (vendor_id, available_balance, pending_balance) VALUES
(1, 15000.00, 5000.00),
(2, 20000.00, 8000.00),
(3, 12000.00, 4000.00);

-- =====================================================
-- MENU ITEMS (vendor_id: 1, 2, 3)
-- =====================================================

-- Vendor 1 menu (menu_item_id: 1-3)
INSERT INTO menu_items (vendor_id, name, description, price, image_url, available) VALUES
(1, 'Tuwo Shinkafa with Miyan Kuka', 'Rice tuwo with kuka soup', 1500.00, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400', 1),
(1, 'Tuwo Masara with Miyan Taushe', 'Corn tuwo with pumpkin soup', 1400.00, 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400', 1),
(1, 'Semo with Miyan Karkashi', 'Semovita with okra soup', 1300.00, 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400', 1);

-- Vendor 2 menu (menu_item_id: 4-6)
INSERT INTO menu_items (vendor_id, name, description, price, image_url, available) VALUES
(2, 'Jollof Rice with Chicken', 'Spicy jollof with grilled chicken', 2000.00, 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400', 1),
(2, 'Fried Rice Special', 'Fried rice with vegetables', 2200.00, 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400', 1),
(2, 'Rice and Beans', 'Rice and beans combo', 1800.00, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', 1);

-- Vendor 3 menu (menu_item_id: 7-9)
INSERT INTO menu_items (vendor_id, name, description, price, image_url, available) VALUES
(3, 'Beef Suya', 'Spicy grilled beef suya', 2500.00, 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400', 1),
(3, 'Chicken Suya', 'Grilled chicken suya', 2000.00, 'https://images.unsplash.com/photo-1607623488023-0331c0b71c97?w=400', 1),
(3, 'Kilishi', 'Dried spicy meat', 3000.00, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400', 1);

-- =====================================================
-- ORDERS (customer_id: 2, 3 | vendor_id: 1, 2, 3)
-- =====================================================

INSERT INTO orders (customer_id, vendor_id, total_amount, status, payment_status, delivery_address, order_type, commission_rate, commission_amount, vendor_amount) VALUES
(2, 1, 2900.00, 'completed', 'paid', '12 Zoo Road, Kano', 'delivery', 10.00, 290.00, 2610.00),
(2, 2, 4000.00, 'completed', 'paid', '12 Zoo Road, Kano', 'delivery', 10.00, 400.00, 3600.00),
(3, 1, 1500.00, 'pending', 'paid', '45 Ahmadu Bello Way, Kano', 'delivery', 10.00, 150.00, 1350.00),
(3, 3, 2500.00, 'preparing', 'paid', '45 Ahmadu Bello Way, Kano', 'pickup', 10.00, 250.00, 2250.00);

-- =====================================================
-- ORDER ITEMS (order_id: 1, 2, 3, 4 | menu_item_id: 1-9)
-- =====================================================

-- Order 1 items
INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal) VALUES
(1, 1, 1, 1500.00, 1500.00),
(1, 2, 1, 1400.00, 1400.00);

-- Order 2 items
INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal) VALUES
(2, 4, 2, 2000.00, 4000.00);

-- Order 3 items
INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal) VALUES
(3, 1, 1, 1500.00, 1500.00);

-- Order 4 items
INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal) VALUES
(4, 7, 1, 2500.00, 2500.00);

-- =====================================================
-- REVIEWS (order_id: 1, 2 | customer_id: 2 | vendor_id: 1, 2)
-- =====================================================

INSERT INTO reviews (order_id, customer_id, vendor_id, rating, comment) VALUES
(1, 2, 1, 5, 'Excellent food! The tuwo was perfect.'),
(2, 2, 2, 5, 'Amazing jollof rice!');

-- Done
SELECT 'Seed data loaded successfully!' as status;
