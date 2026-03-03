// Authentication utility functions
// Shared across all pages for consistent auth state management

// Get user info from localStorage
function getUserInfo() {
    const userStr = localStorage.getItem('localconnect_user')
    if (!userStr) return null;

    try {
        return JSON.parse(userStr);
    } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
    }
}

// Get token from localStorage
function getToken() {
    return localStorage.getItem('localconnect_token')
}

// Check if user is logged in
function isLoggedIn() {
    const token = getToken();
    const user = getUserInfo();
    return !!(token && user);
}

// Logout function - clear localStorage and redirect
function logout() {
    // Clear auth data
    localStorage.removeItem('localconnect_token');
    localStorage.removeItem('localconnect_user');
    localStorage.removeItem('localconnect_cart'); // Also clear cart on logout

    // Redirect to landing page
    window.location.href = '/';
}

// Update navbar based on authentication state
function updateNavbar() {
    const authLinks = document.getElementById('authLinks');
    const userInfo = document.getElementById('userInfo');

    if (!authLinks || !userInfo) return; // Elements don't exist on this page

    if (isLoggedIn()) {
        const user = getUserInfo();

        // Hide login/register links
        authLinks.style.display = 'none';

        // Show user info with Cart and My Orders links (for customers)
        userInfo.style.display = 'flex';

        if (user.role === 'customer') {
            userInfo.innerHTML = `
                <span class="user-welcome">Welcome, ${escapeHtml(user.name)}!</span>
                <a href="/vendor-detail.html" class="btn btn-secondary btn-sm" id="cartLink" style="background: white !important; color: #7bb042 !important; border: 2px solid #7bb042 !important;">
                    🛒 Cart <span class="cart-badge" id="navCartBadge">0</span>
                </a>
                <a href="/my-orders.html" class="btn btn-secondary btn-sm" style="background: white !important; color: #7bb042 !important; border: 2px solid #7bb042 !important;">My Orders</a>
                <button onclick="logout()" class="btn btn-primary btn-sm">Logout</button>
            `;
            // Update cart badge after navbar is rendered
            setTimeout(updateCartBadge, 0);
        } else {
            // For vendors, show simple navbar (they don't have a cart)
            userInfo.innerHTML = `
                <span class="user-welcome">Welcome, ${escapeHtml(user.name)}!</span>
                <a href="/vendor-dashboard.html" class="btn btn-primary btn-sm">Dashboard</a>
                <button onclick="logout()" class="btn btn-secondary btn-sm">Logout</button>
            `;
        }
    } else {
        // Show login/register links
        authLinks.style.display = 'flex';

        // Hide user info
        userInfo.style.display = 'none';
    }
}

// Get cart from localStorage
function getCart() {
    const cartStr = localStorage.getItem('localconnect_cart');
    if (!cartStr) return null;
    try {
        return JSON.parse(cartStr);
    } catch (error) {
        return null;
    }
}

// Update cart badge in navbar
function updateCartBadge() {
    const cartBadge = document.getElementById('navCartBadge');
    const cartLink = document.getElementById('cartLink');
    if (!cartBadge) return;

    const cart = getCart();
    const itemCount = cart && cart.items ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;

    if (itemCount > 0) {
        cartBadge.textContent = itemCount;
        cartBadge.style.display = 'inline-block';
        // Update cart link to go to the vendor's detail page if cart has items
        if (cartLink && cart && cart.vendorId) {
            cartLink.href = `/vendor-detail.html?id=${cart.vendorId}`;
        }
    } else {
        cartBadge.style.display = 'none';
        // If no items, link to browse vendors
        if (cartLink) {
            cartLink.href = '/customer-home.html';
        }
    }
}

// Simple HTML escape function for security
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions available globally
window.getUserInfo = getUserInfo;
window.getToken = getToken;
window.isLoggedIn = isLoggedIn;
window.logout = logout;
window.updateNavbar = updateNavbar;
window.getCart = getCart;
window.updateCartBadge = updateCartBadge;
