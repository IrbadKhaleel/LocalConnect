-- Orders and Payments Database Schema

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INT NOT NULL,
    vendor_id INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    delivery_address TEXT,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    order_type ENUM('delivery', 'pickup') DEFAULT 'delivery',
    status ENUM('awaiting_payment', 'pending', 'preparing', 'ready', 'completed', 'cancelled') DEFAULT 'awaiting_payment',
    payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
    INDEX idx_customer (customer_id),
    INDEX idx_vendor (vendor_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
);

-- Order Items table
CREATE TABLE IF NOT EXISTS order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    menu_item_id INT NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    item_price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    INDEX idx_order (order_id)
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    payment_reference VARCHAR(255) UNIQUE NOT NULL,
    payment_gateway VARCHAR(50) DEFAULT 'paystack',
    amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
    gateway_response TEXT,
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_reference (payment_reference),
    INDEX idx_order (order_id),
    INDEX idx_status (status)
);
