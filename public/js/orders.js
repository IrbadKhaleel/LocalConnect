// Orders functionality for customers and vendors

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    if (!isLoggedIn()) {
        window.location.href = '/login.html';
        return;
    }

    // Get user info
    const user = getUserInfo();

    // Display welcome message
    const userWelcome = document.getElementById('userWelcome');
    if (userWelcome && user) {
        userWelcome.textContent = `Welcome, ${user.name}`;
    }

    // Setup navigation links based on user role
    setupRoleBasedLinks(user);

    // Load orders based on user role
    if (user.role === 'vendor') {
        loadVendorOrders();
    } else {
        loadCustomerOrders();
    }
});

// Setup navigation links based on user role
function setupRoleBasedLinks(user) {
    const homeLink = document.getElementById('homeLink');
    const backHomeLink = document.getElementById('backHomeLink');
    const emptyStateLink = document.getElementById('emptyStateLink');
    const pageHeader = document.querySelector('.page-header h2');
    const cartLink = document.getElementById('cartLink');

    if (user.role === 'vendor') {
        // Vendor-specific links and text
        const vendorHome = '/vendor-dashboard.html';

        if (homeLink) homeLink.href = vendorHome;
        if (backHomeLink) {
            backHomeLink.href = vendorHome;
            backHomeLink.textContent = 'Dashboard';
        }
        if (emptyStateLink) {
            emptyStateLink.href = vendorHome;
            emptyStateLink.textContent = 'Go to Dashboard';
        }
        if (pageHeader) {
            pageHeader.textContent = 'Incoming Orders';
        }
        // Hide cart link for vendors (they don't shop)
        if (cartLink) {
            cartLink.style.display = 'none';
        }
    } else {
        // Customer-specific links
        const customerHome = '/customer-home.html';

        if (homeLink) homeLink.href = customerHome;
        if (backHomeLink) backHomeLink.href = customerHome;
        if (emptyStateLink) emptyStateLink.href = customerHome;

        // Update cart badge for customers
        if (typeof updateCartBadge === 'function') {
            updateCartBadge();
        }

        // Update cart link destination based on cart contents
        if (cartLink && typeof getCart === 'function') {
            const cart = getCart();
            if (cart && cart.vendorId) {
                cartLink.href = `/vendor-detail.html?id=${cart.vendorId}`;
            }
        }
    }
}

// Load customer orders
async function loadCustomerOrders() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const ordersList = document.getElementById('ordersList');

    try {
        const token = getToken();

        // Use the endpoint that gets customer ID from JWT token
        const response = await fetch('/api/orders/customer', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        // Hide loading state
        loadingState.style.display = 'none';

        if (!response.ok) {
            throw new Error(data.error || 'Failed to load orders');
        }

        const orders = data.orders || [];

        if (orders.length === 0) {
            emptyState.style.display = 'block';
            return;
        }

        // Display orders
        ordersList.style.display = 'flex';
        ordersList.innerHTML = orders.map(order => createCustomerOrderCard(order)).join('');

    } catch (error) {
        console.error('Error loading orders:', error);
        loadingState.style.display = 'none';
        showMessage('Failed to load orders: ' + error.message, 'error');
    }
}

// Load vendor orders
async function loadVendorOrders() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const ordersList = document.getElementById('ordersList');

    try {
        const token = getToken();

        // Use the endpoint that automatically looks up vendor by user_id from JWT
        const response = await fetch('/api/orders/vendor', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        // Hide loading state
        loadingState.style.display = 'none';

        if (!response.ok) {
            throw new Error(data.error || 'Failed to load orders');
        }

        const orders = data.orders || [];

        if (orders.length === 0) {
            emptyState.style.display = 'block';
            // Update empty state message for vendors
            const emptyStateEl = document.querySelector('.empty-orders');
            if (emptyStateEl) {
                emptyStateEl.innerHTML = `
                    <h3>No orders yet</h3>
                    <p>You haven't received any orders yet. Orders will appear here when customers place them.</p>
                    <a href="/vendor-dashboard.html" class="btn btn-primary">Go to Dashboard</a>
                `;
            }
            return;
        }

        // Display orders
        ordersList.style.display = 'flex';
        ordersList.innerHTML = orders.map(order => createVendorOrderCard(order)).join('');

    } catch (error) {
        console.error('Error loading orders:', error);
        loadingState.style.display = 'none';
        showMessage('Failed to load orders: ' + error.message, 'error');
    }
}

// Create order card HTML for customers
function createCustomerOrderCard(order) {
    const items = order.items || [];
    const itemsList = items.map(item =>
        `<li>
            <span class="item-name">${escapeHtml(item.item_name || item.name || 'Item')}</span>
            <span class="item-qty">x${item.quantity}</span>
        </li>`
    ).join('');

    const statusClass = getStatusClass(order.status);
    const paymentClass = order.payment_status === 'paid' ? 'payment-paid' : 'payment-unpaid';
    const paymentText = order.payment_status === 'paid' ? 'Paid' : 'Unpaid';

    // Build vendor contact section
    let vendorContactHtml = '';
    if (order.vendor_phone) {
        const whatsappNumber = formatPhoneForWhatsApp(order.vendor_phone);
        const whatsappMessage = encodeURIComponent(`Hello, I have a question about order #${order.id}`);
        vendorContactHtml = `
            <div class="vendor-contact">
                <h4>Vendor Contact</h4>
                <div class="contact-row">
                    <span class="contact-label">📞 Phone:</span>
                    <a href="tel:${order.vendor_phone}" class="contact-value">${escapeHtml(order.vendor_phone)}</a>
                </div>
                <a href="https://wa.me/${whatsappNumber}?text=${whatsappMessage}"
                   class="whatsapp-btn"
                   target="_blank">
                    💬 Contact on WhatsApp
                </a>
            </div>
        `;
    } else {
        vendorContactHtml = `
            <div class="vendor-contact">
                <h4>Vendor Contact</h4>
                <p class="no-contact">Contact information not available</p>
            </div>
        `;
    }

    // Build order actions (cancel for pending, rate for completed/ready)
    let orderActionsHtml = '';
    if (order.status === 'pending') {
        orderActionsHtml = `
            <div class="order-actions">
                <button class="cancel-order-btn" onclick="showCancelOrderModal(${order.id})">
                    Cancel Order
                </button>
            </div>
        `;
    } else if ((order.status === 'completed' || order.status === 'ready') && !order.hasReview) {
        const vendorName = escapeHtml(order.vendor_name || 'Vendor').replace(/'/g, "\\'");
        orderActionsHtml = `
            <div class="order-actions">
                <button class="rate-order-btn" onclick="showRatingModal(${order.id}, ${order.vendor_table_id || order.vendor_id}, '${vendorName}')">
                    ⭐ Rate This Order
                </button>
            </div>
        `;
    } else if ((order.status === 'completed' || order.status === 'ready') && order.hasReview) {
        orderActionsHtml = `
            <div class="order-actions">
                <div class="already-rated">
                    <span>✅ You rated this order</span>
                </div>
            </div>
        `;
    }

    return `
        <div class="order-card">
            <div class="order-header">
                <div class="order-info">
                    <span class="order-id">Order #${order.id}</span>
                    <span class="order-vendor">${escapeHtml(order.vendor_name || 'Unknown Vendor')}</span>
                    <span class="order-date">${formatDate(order.created_at)}</span>
                </div>
                <div class="order-badges">
                    <span class="status-badge ${statusClass}">${order.status}</span>
                    <span class="payment-badge ${paymentClass}">${paymentText}</span>
                </div>
            </div>
            <div class="order-body">
                <div class="order-items">
                    <h4>Items</h4>
                    <ul class="order-items-list">
                        ${itemsList || '<li>No items</li>'}
                    </ul>
                </div>
                <div class="order-footer">
                    <span class="order-type">Type: <span>${escapeHtml(order.order_type || 'N/A')}</span></span>
                    <span class="order-total">${formatCurrency(order.total_amount)}</span>
                </div>
                ${vendorContactHtml}
                ${orderActionsHtml}
            </div>
        </div>
    `;
}

// Create order card HTML for vendors
function createVendorOrderCard(order) {
    const items = order.items || [];
    const itemsList = items.map(item =>
        `<li>
            <span class="item-name">${escapeHtml(item.item_name || item.name || 'Item')}</span>
            <span class="item-qty">x${item.quantity}</span>
        </li>`
    ).join('');

    const statusClass = getStatusClass(order.status);
    const paymentClass = order.payment_status === 'paid' ? 'payment-paid' : 'payment-unpaid';
    const paymentText = order.payment_status === 'paid' ? 'Paid' : 'Unpaid';

    // Status options for dropdown
    const statusOptions = ['preparing', 'ready', 'completed', 'cancelled'];
    const statusDropdown = statusOptions.map(status =>
        `<option value="${status}" ${order.status === status ? 'selected' : ''}>${status.charAt(0).toUpperCase() + status.slice(1)}</option>`
    ).join('');

    return `
        <div class="order-card">
            <div class="order-header">
                <div class="order-info">
                    <span class="order-id">Order #${order.id}</span>
                    <span class="order-vendor">Customer: ${escapeHtml(order.customer_name || 'Unknown')}</span>
                    <span class="order-date">${formatDate(order.created_at)}</span>
                    ${order.customer_phone ? `<span class="order-date">Phone: ${escapeHtml(order.customer_phone)}</span>` : ''}
                </div>
                <div class="order-badges">
                    <span class="status-badge ${statusClass}">${order.status}</span>
                    <span class="payment-badge ${paymentClass}">${paymentText}</span>
                </div>
            </div>
            <div class="order-body">
                <div class="order-items">
                    <h4>Items</h4>
                    <ul class="order-items-list">
                        ${itemsList || '<li>No items</li>'}
                    </ul>
                </div>
                ${order.delivery_address ? `
                    <div class="order-items">
                        <h4>Delivery Address</h4>
                        <p style="color: var(--text-color); padding: 0.5rem 0;">${escapeHtml(order.delivery_address)}</p>
                    </div>
                ` : ''}
                ${order.customer_notes ? `
                    <div class="order-notes" style="background: #fff9e6; border-left: 3px solid #f39c12; padding: 12px; margin: 12px 0; border-radius: 4px;">
                        <strong style="color: #92400e; font-size: 0.875rem;">Special Instructions:</strong>
                        <p style="color: var(--text-color); margin-top: 6px; font-size: 0.9rem;">${escapeHtml(order.customer_notes)}</p>
                    </div>
                ` : ''}
                <div class="order-footer">
                    <div class="status-update">
                        <label for="status-${order.id}" style="font-size: 0.875rem; color: var(--text-light); margin-right: 0.5rem;">Update Status:</label>
                        <select id="status-${order.id}" onchange="updateOrderStatus(${order.id}, this.value)"
                            style="padding: 0.5rem; border: 2px solid var(--border-color); border-radius: var(--border-radius); font-size: 0.875rem;">
                            ${statusDropdown}
                        </select>
                    </div>
                    <span class="order-total">${formatCurrency(order.total_amount)}</span>
                </div>
            </div>
        </div>
    `;
}

// Update order status (vendor only)
async function updateOrderStatus(orderId, newStatus) {
    try {
        const token = getToken();

        const response = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to update status');
        }

        showMessage('Order status updated successfully!', 'success');

        // Reload orders to reflect changes
        setTimeout(() => {
            loadVendorOrders();
        }, 1000);

    } catch (error) {
        console.error('Error updating status:', error);
        showMessage('Failed to update status: ' + error.message, 'error');
        // Reload to reset dropdown
        loadVendorOrders();
    }
}

// Get CSS class for status badge
function getStatusClass(status) {
    const statusClasses = {
        'pending': 'status-pending',
        'preparing': 'status-preparing',
        'ready': 'status-ready',
        'completed': 'status-completed',
        'cancelled': 'status-cancelled'
    };
    return statusClasses[status] || 'status-pending';
}

// Format date to readable string
function formatDate(dateString) {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);

    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    };

    return date.toLocaleDateString('en-US', options);
}

// Format currency in Naira
function formatCurrency(amount) {
    if (!amount && amount !== 0) return '₦0.00';

    return '₦' + parseFloat(amount).toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Format phone number for WhatsApp link
function formatPhoneForWhatsApp(phone) {
    if (!phone) return '';

    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');

    // Add Nigeria country code if not present
    if (!cleaned.startsWith('234')) {
        // Remove leading 0 if present
        if (cleaned.startsWith('0')) {
            cleaned = cleaned.substring(1);
        }
        cleaned = '234' + cleaned;
    }

    return cleaned;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show message to user
function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type} show`;

        // Auto-hide after 3 seconds
        setTimeout(() => {
            messageDiv.classList.remove('show');
        }, 3000);
    }
}

// ============= CANCEL ORDER FUNCTIONS =============

let orderToCancel = null;

function showCancelOrderModal(orderId) {
    orderToCancel = orderId;
    document.getElementById('cancelOrderModal').classList.add('show');
}

function closeCancelOrderModal() {
    orderToCancel = null;
    document.getElementById('cancelOrderModal').classList.remove('show');
}

async function confirmCancelOrder() {
    if (!orderToCancel) {
        showMessage('Error: No order selected to cancel', 'error');
        return;
    }

    // Save the order ID before closing modal (which sets orderToCancel = null)
    const orderIdToCancel = orderToCancel;

    try {
        closeCancelOrderModal();

        const response = await fetch(`/api/orders/${orderIdToCancel}/cancel`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to cancel order');
        }

        showMessage('Order cancelled successfully! Refund will be processed within 3-5 business days.', 'success');

        // Reload orders to show updated status
        setTimeout(() => {
            loadCustomerOrders();
        }, 1500);

    } catch (error) {
        console.error('Cancel order error:', error);
        showMessage('Failed to cancel order: ' + error.message, 'error');
    }
}

// ============= RATING FUNCTIONS =============

let currentRating = 0;
let ratingOrderId = null;
let ratingVendorId = null;

function showRatingModal(orderId, vendorId, vendorName) {
    ratingOrderId = orderId;
    ratingVendorId = vendorId;
    currentRating = 0;

    document.getElementById('ratingVendorName').textContent = vendorName;
    document.getElementById('reviewText').value = '';
    document.getElementById('submitRatingBtn').disabled = true;

    // Reset stars
    document.querySelectorAll('.star').forEach(star => {
        star.classList.remove('active');
    });

    document.getElementById('ratingLabel').textContent = 'Tap to rate';
    document.getElementById('ratingModal').classList.add('show');
}

function closeRatingModal() {
    document.getElementById('ratingModal').classList.remove('show');
    currentRating = 0;
    ratingOrderId = null;
    ratingVendorId = null;
}

function setRating(rating) {
    currentRating = rating;

    // Update stars
    document.querySelectorAll('.star').forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });

    // Update label
    const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
    document.getElementById('ratingLabel').textContent = labels[rating];

    // Enable submit button
    document.getElementById('submitRatingBtn').disabled = false;
}

async function submitRating() {
    if (!currentRating || !ratingOrderId) return;

    try {
        const reviewText = document.getElementById('reviewText').value.trim();

        const response = await fetch('/api/reviews/create', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                orderId: ratingOrderId,
                vendorId: ratingVendorId,
                rating: currentRating,
                reviewText: reviewText
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to submit rating');
        }

        showMessage('Thank you for your feedback! ⭐', 'success');
        closeRatingModal();

        // Reload orders to show "already rated"
        setTimeout(() => {
            loadCustomerOrders();
        }, 1500);

    } catch (error) {
        console.error('Submit rating error:', error);
        showMessage('Failed to submit rating: ' + error.message, 'error');
    }
}

// Make functions available globally
window.updateOrderStatus = updateOrderStatus;
window.showCancelOrderModal = showCancelOrderModal;
window.closeCancelOrderModal = closeCancelOrderModal;
window.confirmCancelOrder = confirmCancelOrder;
window.showRatingModal = showRatingModal;
window.closeRatingModal = closeRatingModal;
window.setRating = setRating;
window.submitRating = submitRating;
