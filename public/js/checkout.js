// Checkout page functionality

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    if (!isLoggedIn()) {
        window.location.href = '/login.html';
        return;
    }

    // Load and display cart
    loadCheckoutPage();

    // Setup form submission
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleCheckout);
    }

    // Setup character counter for notes
    setupNotesCharCounter();
});

// Load checkout page with cart data
function loadCheckoutPage() {
    const cart = getCart();
    const emptyCartDiv = document.getElementById('emptyCart');
    const checkoutContent = document.getElementById('checkoutContent');
    const userWelcome = document.getElementById('userWelcome');

    // Display user welcome message
    const user = getUserInfo();
    if (user && userWelcome) {
        userWelcome.textContent = `Welcome, ${user.name}`;
    }

    // Check if cart is empty
    if (!cart || !cart.items || cart.items.length === 0) {
        emptyCartDiv.style.display = 'block';
        checkoutContent.style.display = 'none';
        return;
    }

    // Show checkout content
    emptyCartDiv.style.display = 'none';
    checkoutContent.style.display = 'block';

    // Display vendor name
    document.getElementById('vendorName').textContent = cart.vendorName || 'Unknown Vendor';

    // Display order items
    const orderItemsBody = document.getElementById('orderItems');
    orderItemsBody.innerHTML = '';

    cart.items.forEach(item => {
        const subtotal = item.price * item.quantity;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(item.name)}</td>
            <td class="qty-col">${item.quantity}</td>
            <td class="price-col">${formatCurrency(item.price)}</td>
            <td class="subtotal-col">${formatCurrency(subtotal)}</td>
        `;
        orderItemsBody.appendChild(row);
    });

    // Display total
    document.getElementById('totalAmount').textContent = formatCurrency(cart.total);

    // Pre-fill name from user info
    if (user && user.name) {
        document.getElementById('fullName').value = user.name;
    }
}

// Get cart from localStorage
function getCart() {
    const cartStr = localStorage.getItem('localconnect_cart');
    if (!cartStr) return null;

    try {
        return JSON.parse(cartStr);
    } catch (error) {
        console.error('Error parsing cart:', error);
        return null;
    }
}

// Format currency in Naira
function formatCurrency(amount) {
    return '₦' + parseFloat(amount).toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Validate form fields
function validateForm() {
    const fullName = document.getElementById('fullName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const deliveryAddress = document.getElementById('deliveryAddress').value.trim();
    const orderType = document.querySelector('input[name="orderType"]:checked');

    if (!fullName) {
        showMessage('Please enter your full name', 'error');
        return false;
    }

    if (!phone) {
        showMessage('Please enter your phone number', 'error');
        return false;
    }

    if (!deliveryAddress) {
        showMessage('Please enter your delivery address', 'error');
        return false;
    }

    if (!orderType) {
        showMessage('Please select an order type', 'error');
        return false;
    }

    return true;
}

// Show message to user
function showMessage(text, type) {
    const messageDiv = document.getElementById('formMessage');
    if (messageDiv) {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type} show`;
    }
}

// Handle checkout form submission
async function handleCheckout(event) {
    event.preventDefault();

    // Validate form
    if (!validateForm()) {
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    try {
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        submitBtn.textContent = 'Processing...';

        // Get cart and user data
        const cart = getCart();
        const user = getUserInfo();
        const token = getToken();

        if (!token) {
            throw new Error('Authentication token not found. Please log in again.');
        }

        if (!cart || !cart.items || cart.items.length === 0) {
            throw new Error('Your cart is empty');
        }

        if (!user || !user.email) {
            throw new Error('User information not found. Please log in again.');
        }

        // Get form data
        const deliveryAddress = document.getElementById('deliveryAddress').value.trim();
        const orderType = document.querySelector('input[name="orderType"]:checked').value;
        const customerNotes = document.getElementById('customerNotes').value.trim();

        // Prepare order payload
        const orderPayload = {
            vendorId: cart.vendorId,
            items: cart.items.map(item => ({
                menuItemId: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity
            })),
            totalAmount: cart.total,
            deliveryAddress: deliveryAddress,
            orderType: orderType,
            customerNotes: customerNotes
        };

        // Step 1: Create order
        const orderResponse = await fetch('/api/orders/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderPayload)
        });

        if (!orderResponse.ok) {
            let errorMessage = 'Failed to create order';
            try {
                const errorData = await orderResponse.json();
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                errorMessage = `Failed to create order: ${orderResponse.status}`;
            }
            throw new Error(errorMessage);
        }

        const orderData = await orderResponse.json();
        const orderId = orderData.orderId;

        if (!orderId) {
            throw new Error('Order ID not received from server');
        }

        // Step 2: Show notification and redirect to payment method selection page
        const vendorName = cart.vendorName || 'LocalConnect';
        const paymentUrl = `payment-methods.html?orderId=${orderId}&amount=${cart.total}&email=${encodeURIComponent(user.email)}&vendor=${encodeURIComponent(vendorName)}`;

        // Show notification toast
        showNotificationToast();

        // Delay redirect slightly so user sees notification
        setTimeout(() => {
            window.location.href = paymentUrl;
        }, 1500);

    } catch (error) {
        showMessage(error.message || 'An error occurred during checkout', 'error');

        // Reset button
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        submitBtn.textContent = originalText;
    }
}

// Setup character counter for customer notes
function setupNotesCharCounter() {
    const notesTextarea = document.getElementById('customerNotes');
    const notesCount = document.getElementById('notesCount');

    if (notesTextarea && notesCount) {
        notesTextarea.addEventListener('input', function() {
            const currentLength = this.value.length;
            notesCount.textContent = currentLength;

            // Toggle exceeded class
            const charCountDiv = notesCount.parentElement;
            if (currentLength > 500) {
                charCountDiv.classList.add('exceeded');
            } else {
                charCountDiv.classList.remove('exceeded');
            }
        });
    }
}

// Show notification toast
function showNotificationToast() {
    const toast = document.getElementById('notificationToast');
    if (!toast) return;

    toast.classList.add('show');

    // Auto-hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}