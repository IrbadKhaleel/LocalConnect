-- Migration: Add order_id to reviews table
-- Run this after the initial schema is created

-- Add order_id column to reviews table
ALTER TABLE reviews
ADD COLUMN order_id INT AFTER id;

-- Add foreign key constraint
ALTER TABLE reviews
ADD CONSTRAINT fk_reviews_order
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- Add unique constraint - one review per order
ALTER TABLE reviews
ADD UNIQUE KEY unique_order_review (order_id);

-- Done
SELECT 'order_id column added to reviews table successfully!' as status;
