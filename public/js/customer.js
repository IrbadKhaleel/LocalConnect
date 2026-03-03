// Customer Interface JavaScript

// Global state
let vendors = [];
let allVendors = [];
let currentVendor = null;
let cart = null;
let categories = [];
let searchTimeout = null;

// DOM Elements (will be set based on page)
let messageDiv, vendorGrid, emptyState, loadingSpinner;

// ============= INITIALIZATION =============

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Detect which page we're on
    if (window.location.pathname.includes('customer-home')) {
        initCustomerHome();
    } else if (window.location.pathname.includes('vendor-detail')) {
        initVendorDetail();
    }
});

// Initialize customer home page
async function initCustomerHome() {
    messageDiv = document.getElementById('message');
    vendorGrid = document.getElementById('vendorGrid');
    emptyState = document.getElementById('emptyState');
    loadingSpinner = document.getElementById('loadingSpinner');

    // Update navbar auth state
    if (typeof updateNavbar === 'function') {
        updateNavbar();
    }

    // Load categories and vendors
    await loadCategories();
    await loadVendors();

    // Note: Event listeners are now handled via inline handlers (onkeyup, onchange)
    // in the HTML for better visibility and control
}

// Initialize vendor detail page
async function initVendorDetail() {
    messageDiv = document.getElementById('message');

    // Update navbar auth state
    if (typeof updateNavbar === 'function') {
        updateNavbar();
    }

    // Get vendor ID from URL
    const vendorId = getQueryParam('id');

    if (!vendorId) {
        showMessage('Invalid vendor ID', 'error');
        setTimeout(() => {
            window.location.href = '/customer-home.html';
        }, 2000);
        return;
    }

    // Load cart
    loadCart();

    // Load vendor details
    await loadVendorDetails(vendorId);

    // Set up event listeners
    const checkoutBtn = document.getElementById('checkoutBtn');
    const clearCartBtn = document.getElementById('clearCartBtn');
    const cartToggle = document.getElementById('cartToggle');

    if (checkoutBtn) checkoutBtn.addEventListener('click', handleCheckout);
    if (clearCartBtn) clearCartBtn.addEventListener('click', handleClearCart);
    if (cartToggle) cartToggle.addEventListener('click', toggleCart);
}

// ============= API FUNCTIONS =============

// Fetch all vendors
async function loadVendors() {
    showLoading();

    try {
        const response = await fetch('/api/customers/vendors');
        const data = await response.json();

        if (response.ok) {
            vendors = data.data;
            allVendors = [...data.data];
            renderVendors(vendors);
        } else {
            showMessage(data.error || 'Failed to load vendors', 'error');
        }
    } catch (error) {
        console.error('Load vendors error:', error);
        showMessage('Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// Fetch vendor details with menu
async function loadVendorDetails(vendorId) {
    try {
        const response = await fetch(`/api/customers/vendors/${vendorId}`);
        const data = await response.json();

        if (response.ok) {
            currentVendor = data.data.vendor;
            renderVendorInfo(data.data.vendor);
            renderMenuItems(data.data.menuItems);
        } else {
            showMessage(data.error || 'Vendor not found', 'error');
            setTimeout(() => {
                window.location.href = '/customer-home.html';
            }, 2000);
        }
    } catch (error) {
        console.error('Load vendor details error:', error);
        showMessage('Failed to load vendor details', 'error');
    }
}

// Fetch categories
async function loadCategories() {
    try {
        const response = await fetch('/api/customers/categories');
        const data = await response.json();

        if (response.ok) {
            categories = data.data;
            renderCategories(categories);
        }
    } catch (error) {
        console.error('Load categories error:', error);
    }
}

// Search vendors
async function searchVendors(query) {
    if (query.length < 2) {
        vendors = [...allVendors];
        renderVendors(vendors);
        return;
    }

    showLoading();

    try {
        const response = await fetch(`/api/customers/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (response.ok) {
            vendors = data.data;
            renderVendors(vendors);
        } else {
            showMessage(data.error || 'Search failed', 'error');
        }
    } catch (error) {
        console.error('Search error:', error);
        showMessage('Search failed', 'error');
    } finally {
        hideLoading();
    }
}

// ============= RENDER FUNCTIONS =============

// Render vendors grid
function renderVendors(vendorsList) {
    if (!vendorGrid) return;

    // Update results count
    updateResultsCount(vendorsList.length, allVendors.length);

    if (vendorsList.length === 0) {
        vendorGrid.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    vendorGrid.innerHTML = vendorsList.map(vendor => `
        <div class="vendor-card">
            <div class="vendor-logo">
                ${vendor.logo_url
                    ? `<img src="${escapeHtml(vendor.logo_url)}" alt="${escapeHtml(vendor.business_name)}">`
                    : '<span class="vendor-logo-placeholder">🍽️</span>'
                }
            </div>
            <h3 class="vendor-name">${escapeHtml(vendor.business_name)}</h3>
            <span class="vendor-category-badge">${escapeHtml(vendor.category || 'Food')}</span>
            <div class="vendor-rating">
                <span class="stars">${generateStars(vendor.averageRating || 0)}</span>
                <span class="rating-text">${(vendor.averageRating || 0).toFixed(1)} (${vendor.totalReviews || 0})</span>
            </div>
            <p class="vendor-description">${escapeHtml(vendor.description || 'Delicious food awaits!')}</p>
            <a href="/vendor-detail.html?id=${vendor.id}" class="btn btn-primary">View Menu</a>
        </div>
    `).join('');
}

// Generate star rating display
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    let stars = '';
    for (let i = 0; i < fullStars; i++) stars += '★';
    if (hasHalfStar) stars += '★';
    for (let i = 0; i < emptyStars; i++) stars += '☆';

    return stars;
}

// Render categories dropdown
function renderCategories(categoryList) {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;

    categoryList.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.category_name;
        option.textContent = cat.category_name;
        categoryFilter.appendChild(option);
    });
}

// Render vendor info banner
function renderVendorInfo(vendor) {
    const vendorInfo = document.getElementById('vendorInfo');
    if (!vendorInfo) return;

    vendorInfo.innerHTML = `
        <h1>${escapeHtml(vendor.business_name)}</h1>
        <span class="vendor-category-badge">${escapeHtml(vendor.category || 'Food')}</span>
        <div class="vendor-rating-banner">
            <span class="stars">${generateStars(vendor.averageRating || 0)}</span>
            <span class="rating-text">${(vendor.averageRating || 0).toFixed(1)} (${vendor.totalReviews || 0} reviews)</span>
        </div>
        ${vendor.operating_hours ? `<p class="vendor-info-hours">⏰ ${escapeHtml(vendor.operating_hours)}</p>` : ''}
        ${vendor.business_address ? `<p class="vendor-info-hours">📍 ${escapeHtml(vendor.business_address)}</p>` : ''}
        ${vendor.description ? `<p class="vendor-info-description">${escapeHtml(vendor.description)}</p>` : ''}
    `;

    // Load reviews for this vendor
    loadVendorReviews(vendor.id);
}

// Render menu items
function renderMenuItems(items) {
    const menuItemsGrid = document.getElementById('menuItemsGrid');
    const emptyMenu = document.getElementById('emptyMenu');

    if (!menuItemsGrid) return;

    if (items.length === 0) {
        menuItemsGrid.innerHTML = '';
        emptyMenu.style.display = 'block';
        return;
    }

    emptyMenu.style.display = 'none';

    menuItemsGrid.innerHTML = items.map(item => `
        <div class="menu-item-card-customer">
            <div class="menu-item-image">
                ${item.image_url
                    ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}">`
                    : '🍽️'
                }
            </div>
            <div class="menu-item-content">
                <h4 class="menu-item-name">${escapeHtml(item.name)}</h4>
                ${item.description ? `<p class="menu-item-description-customer">${escapeHtml(item.description)}</p>` : ''}
                <div class="menu-item-footer">
                    <span class="menu-item-price-customer">₦${formatPrice(item.price)}</span>
                    <button class="btn btn-primary btn-add-cart" onclick="addToCart(${item.id}, '${escapeHtml(item.name)}', ${item.price})">
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ============= CART MANAGEMENT =============

// Load cart from localStorage
function loadCart() {
    const cartStr = localStorage.getItem('localconnect_cart');
    cart = cartStr ? JSON.parse(cartStr) : null;
    updateCartDisplay();
}

// Save cart to localStorage
function saveCart() {
    if (cart && cart.items.length > 0) {
        localStorage.setItem('localconnect_cart', JSON.stringify(cart));
    } else {
        localStorage.removeItem('localconnect_cart');
        cart = null;
    }
}

// Pending item for vendor switch
let pendingItem = null;

// Add item to cart
function addToCart(itemId, itemName, itemPrice) {
    // Check if cart exists and if it's from a different vendor
    if (cart && cart.vendorId !== currentVendor.id) {
        // Store pending item and show modal
        pendingItem = { id: itemId, name: itemName, price: itemPrice };
        document.getElementById('switchVendorMessage').textContent =
            `Your cart contains items from ${cart.vendorName}. Clear cart to order from ${currentVendor.business_name}?`;
        document.getElementById('switchVendorModal').classList.add('show');
        return;
    }

    // Actually add the item
    addItemToCartInternal(itemId, itemName, itemPrice);
}

// Internal function to add item
function addItemToCartInternal(itemId, itemName, itemPrice) {

    // Create new cart if needed
    if (!cart) {
        cart = {
            vendorId: currentVendor.id,
            vendorName: currentVendor.business_name,
            items: [],
            total: 0,
            itemCount: 0,
            createdAt: new Date().toISOString()
        };
    }

    // Check if item already in cart
    const existingItem = cart.items.find(i => i.id === itemId);

    if (existingItem) {
        existingItem.quantity++;
        existingItem.subtotal = existingItem.quantity * existingItem.price;
    } else {
        cart.items.push({
            id: itemId,
            name: itemName,
            price: parseFloat(itemPrice),
            quantity: 1,
            subtotal: parseFloat(itemPrice)
        });
    }

    // Recalculate totals
    cart.total = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
    cart.itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    saveCart();
    updateCartDisplay();
    // Update navbar cart badge
    if (typeof updateCartBadge === 'function') {
        updateCartBadge();
    }
    showMessage('Item added to cart!', 'success');
}

// Remove item from cart
function removeFromCart(itemId) {
    if (!cart) return;

    cart.items = cart.items.filter(item => item.id !== itemId);

    if (cart.items.length === 0) {
        clearCart();
        return;
    }

    // Recalculate totals
    cart.total = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
    cart.itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    saveCart();
    updateCartDisplay();
    // Update navbar cart badge
    if (typeof updateCartBadge === 'function') {
        updateCartBadge();
    }
}

// Clear cart
function clearCart() {
    cart = null;
    localStorage.removeItem('localconnect_cart');
    updateCartDisplay();
    // Update navbar cart badge
    if (typeof updateCartBadge === 'function') {
        updateCartBadge();
    }
}

// Update cart display
function updateCartDisplay() {
    const cartItems = document.getElementById('cartItems');
    const cartEmpty = document.getElementById('cartEmpty');
    const cartSummary = document.getElementById('cartSummary');
    const cartTotal = document.getElementById('cartTotal');
    const cartVendorName = document.getElementById('cartVendorName');

    if (!cartItems) return;

    if (!cart || cart.items.length === 0) {
        cartItems.innerHTML = '';
        cartEmpty.style.display = 'block';
        cartSummary.style.display = 'none';
        cartVendorName.textContent = '';
        return;
    }

    cartEmpty.style.display = 'none';
    cartSummary.style.display = 'block';
    cartVendorName.textContent = `From: ${cart.vendorName}`;

    cartItems.innerHTML = cart.items.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${escapeHtml(item.name)}</div>
                <div class="cart-item-quantity">Qty: ${item.quantity}</div>
            </div>
            <span class="cart-item-price">₦${formatPrice(item.subtotal)}</span>
            <button class="cart-item-remove" onclick="removeFromCart(${item.id})">×</button>
        </div>
    `).join('');

    cartTotal.textContent = `₦${formatPrice(cart.total)}`;
}

// ============= EVENT HANDLERS =============

// Handle search input (debounced)
function handleSearch(event) {
    const query = event.target.value.trim();

    clearTimeout(searchTimeout);

    if (query.length === 0) {
        vendors = [...allVendors];
        renderVendors(vendors);
        return;
    }

    searchTimeout = setTimeout(() => {
        searchVendors(query);
    }, 300);
}

// Handle category filter
function handleCategoryFilter(event) {
    const category = event.target.value;

    if (!category) {
        vendors = [...allVendors];
        renderVendors(vendors);
        return;
    }

    vendors = allVendors.filter(v => v.category === category);
    renderVendors(vendors);
}

// Filter vendors by search and category (combined filter function)
function filterVendors() {
    const searchInput = document.getElementById('searchBar');
    const categoryFilter = document.getElementById('categoryFilter');
    const clearBtn = document.getElementById('clearSearch');

    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const category = categoryFilter ? categoryFilter.value : '';

    // Show/hide clear button
    if (clearBtn) {
        clearBtn.style.display = searchTerm ? 'flex' : 'none';
    }

    // Filter vendors
    let filteredVendors = [...allVendors];

    // Filter by search term
    if (searchTerm) {
        filteredVendors = filteredVendors.filter(vendor => {
            const name = (vendor.business_name || '').toLowerCase();
            const description = (vendor.description || '').toLowerCase();
            const vendorCategory = (vendor.category || '').toLowerCase();

            return name.includes(searchTerm) ||
                   description.includes(searchTerm) ||
                   vendorCategory.includes(searchTerm);
        });
    }

    // Filter by category
    if (category) {
        filteredVendors = filteredVendors.filter(v => v.category === category);
    }

    vendors = filteredVendors;
    renderVendors(vendors);
    updateResultsCount(filteredVendors.length, allVendors.length);
}

// Clear search input
function clearSearch() {
    const searchInput = document.getElementById('searchBar');
    if (searchInput) {
        searchInput.value = '';
        filterVendors();
    }
}

// Update results count display
function updateResultsCount(showing, total) {
    const resultsCount = document.getElementById('resultsCount');
    if (!resultsCount) return;

    if (showing === total) {
        resultsCount.innerHTML = `Showing <strong>${total}</strong> vendors`;
    } else {
        resultsCount.innerHTML = `Showing <strong>${showing}</strong> of <strong>${total}</strong> vendors`;
    }
}

// Handle clear cart - show modal
function handleClearCart() {
    document.getElementById('clearCartModal').classList.add('show');
}

// Close clear cart modal
function closeClearCartModal() {
    document.getElementById('clearCartModal').classList.remove('show');
}

// Confirm clear cart
function confirmClearCart() {
    closeClearCartModal();
    clearCart();
    showMessage('Cart cleared', 'success');
}

// Handle checkout
function handleCheckout() {
    if (!cart || cart.items.length === 0) {
        showMessage('Your cart is empty', 'error');
        return;
    }

    // Check if user is logged in
    if (typeof isLoggedIn === 'function' && !isLoggedIn()) {
        showMessage('Please login to checkout', 'error');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1500);
        return;
    }

    // Redirect to checkout page
    window.location.href = '/checkout.html';
}

// Toggle cart (mobile)
function toggleCart() {
    const cartSidebar = document.getElementById('cartSidebar');
    cartSidebar.classList.toggle('expanded');
}

// ============= UTILITY FUNCTIONS =============

// Show message
function showMessage(text, type) {
    if (!messageDiv) return;

    messageDiv.textContent = text;
    messageDiv.className = `message ${type} show`;
    messageDiv.style.display = 'block';

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (type === 'success') {
        setTimeout(() => {
            clearMessage();
        }, 5000);
    }
}

// Clear message
function clearMessage() {
    if (!messageDiv) return;

    messageDiv.textContent = '';
    messageDiv.className = 'message';
    messageDiv.style.display = 'none';
}

// Show loading
function showLoading() {
    if (loadingSpinner) loadingSpinner.style.display = 'block';
    if (vendorGrid) vendorGrid.style.display = 'none';
}

// Hide loading
function hideLoading() {
    if (loadingSpinner) loadingSpinner.style.display = 'none';
    if (vendorGrid) vendorGrid.style.display = 'grid';
}

// Format price
function formatPrice(price) {
    return parseFloat(price).toFixed(2);
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Get query parameter
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Switch vendor modal functions
function closeSwitchVendorModal() {
    document.getElementById('switchVendorModal').classList.remove('show');
    pendingItem = null;
}

function confirmSwitchVendor() {
    closeSwitchVendorModal();
    cart = null;
    if (pendingItem) {
        addItemToCartInternal(pendingItem.id, pendingItem.name, pendingItem.price);
        pendingItem = null;
    }
}

// ============= REVIEWS FUNCTIONS =============

// Load and display vendor reviews
async function loadVendorReviews(vendorId) {
    const reviewsContainer = document.getElementById('reviewsContainer');
    if (!reviewsContainer) return;

    try {
        const response = await fetch(`/api/reviews/vendor/${vendorId}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to load reviews');
        }

        const reviews = data.reviews || [];

        if (reviews.length === 0) {
            reviewsContainer.innerHTML = `
                <div class="no-reviews">
                    <p>No reviews yet. Be the first to review!</p>
                </div>
            `;
            return;
        }

        reviewsContainer.innerHTML = reviews.map(review => `
            <div class="review-card">
                <div class="review-header">
                    <div>
                        <div class="review-author">${escapeHtml(review.customer_name || 'Anonymous')}</div>
                        <div class="review-stars">${generateStars(review.rating)}</div>
                    </div>
                    <div class="review-date">${formatReviewDate(review.created_at)}</div>
                </div>
                ${review.review_text ? `<div class="review-text">${escapeHtml(review.review_text)}</div>` : ''}
            </div>
        `).join('');

    } catch (error) {
        console.error('Load reviews error:', error);
        reviewsContainer.innerHTML = '<p class="error-text">Failed to load reviews</p>';
    }
}

// Format review date
function formatReviewDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ============= MENU SEARCH FUNCTIONS =============

// Store all menu items for filtering
let allMenuItems = [];

// Filter menu items by search term
function filterMenuItems() {
    const searchInput = document.getElementById('menuSearch');
    if (!searchInput) return;

    const searchTerm = searchInput.value.toLowerCase();
    const clearBtn = document.getElementById('clearMenuSearch');

    // Show/hide clear button
    if (clearBtn) {
        clearBtn.style.display = searchTerm ? 'flex' : 'none';
    }

    // Get all menu item cards
    const menuCards = document.querySelectorAll('.menu-item-card-customer');
    let visibleCount = 0;

    menuCards.forEach(card => {
        const itemName = card.querySelector('.menu-item-name')?.textContent.toLowerCase() || '';
        const itemDescription = card.querySelector('.menu-item-description-customer')?.textContent.toLowerCase() || '';

        const matches = itemName.includes(searchTerm) || itemDescription.includes(searchTerm);

        if (matches) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    // Show "no results" message
    let noResultsMsg = document.getElementById('noMenuResultsMessage');
    const menuGrid = document.getElementById('menuItemsGrid');

    if (visibleCount === 0 && searchTerm) {
        if (!noResultsMsg && menuGrid) {
            noResultsMsg = document.createElement('div');
            noResultsMsg.id = 'noMenuResultsMessage';
            noResultsMsg.className = 'no-results';
            noResultsMsg.innerHTML = `
                <div class="no-results-icon">🔍</div>
                <h3>No menu items found</h3>
                <p>Try searching with different keywords</p>
            `;
            menuGrid.after(noResultsMsg);
        }
        if (noResultsMsg) noResultsMsg.style.display = 'block';
    } else if (noResultsMsg) {
        noResultsMsg.style.display = 'none';
    }
}

// Clear menu search
function clearMenuSearch() {
    const searchInput = document.getElementById('menuSearch');
    if (searchInput) {
        searchInput.value = '';
        filterMenuItems();
    }
}

// Make functions available globally
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.closeClearCartModal = closeClearCartModal;
window.confirmClearCart = confirmClearCart;
window.closeSwitchVendorModal = closeSwitchVendorModal;
window.confirmSwitchVendor = confirmSwitchVendor;
window.filterMenuItems = filterMenuItems;
window.clearMenuSearch = clearMenuSearch;
window.filterVendors = filterVendors;
window.clearSearch = clearSearch;
