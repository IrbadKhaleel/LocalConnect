// Vendor Dashboard JavaScript

// Global state
let hasProfile = false;
let currentMenuItemId = null;

// DOM Elements
const messageDiv = document.getElementById('message');
const vendorNameSpan = document.getElementById('vendorName');
const logoutBtn = document.getElementById('logoutBtn');
const profileForm = document.getElementById('profileForm');
const menuItemsGrid = document.getElementById('menuItemsGrid');
const emptyMenuState = document.getElementById('emptyMenuState');
const addMenuItemBtn = document.getElementById('addMenuItemBtn');
const menuItemModal = document.getElementById('menuItemModal');
const menuItemForm = document.getElementById('menuItemForm');
const saveMenuItemBtn = document.getElementById('saveMenuItemBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalTitle = document.getElementById('modalTitle');

// ============= AUTH & INITIALIZATION =============

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('localconnect_token');
    const userStr = localStorage.getItem('localconnect_user');

    if (!token || !userStr) {
        // Not logged in
        window.location.href = '/login.html';
        return false;
    }

    try {
        const user = JSON.parse(userStr);

        if (user.role !== 'vendor') {
            // Not a vendor
            showMessage('Access denied. Vendor access only.', 'error');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
            return false;
        }

        // Display vendor name
        vendorNameSpan.textContent = user.name;
        return true;
    } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('localconnect_token');
        localStorage.removeItem('localconnect_user');
        window.location.href = '/login.html';
        return false;
    }
}

// Initialize dashboard
async function init() {
    if (!checkAuth()) return;

    try {
        await loadProfile();
        await loadMenuItems();
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

// ============= API HELPERS =============

// Get auth headers
function getAuthHeaders() {
    const token = localStorage.getItem('localconnect_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// Fetch with auth
async function fetchWithAuth(url, options = {}) {
    const config = {
        ...options,
        headers: getAuthHeaders()
    };

    const response = await fetch(url, config);
    const data = await response.json();

    // Handle 401 (token expired)
    if (response.status === 401) {
        showMessage('Session expired. Please login again.', 'error');
        localStorage.removeItem('localconnect_token');
        localStorage.removeItem('localconnect_user');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 2000);
        throw new Error('Session expired');
    }

    if (!response.ok) {
        throw new Error(data.error || 'Request failed');
    }

    return data;
}

// ============= PROFILE MANAGEMENT =============

// Load vendor profile
async function loadProfile() {
    try {
        const data = await fetchWithAuth('/api/vendors/profile');

        // Profile exists
        hasProfile = true;
        populateProfileForm(data.data);

    } catch (error) {
        if (error.message === 'Session expired') {
            return;
        }

        // Profile doesn't exist (404)
        hasProfile = false;
        console.log('No profile found, showing create form');
    }
}

// Populate profile form
function populateProfileForm(profile) {
    document.getElementById('business_name').value = profile.business_name || '';
    document.getElementById('business_address').value = profile.business_address || '';
    document.getElementById('category').value = profile.category || '';
    document.getElementById('description').value = profile.description || '';
    document.getElementById('logo_url').value = profile.logo_url || '';
    document.getElementById('operating_hours').value = profile.operating_hours || '';
}

// Save profile
async function saveProfile(event) {
    event.preventDefault();
    clearMessage();

    // Get form data
    const formData = {
        business_name: document.getElementById('business_name').value.trim(),
        business_address: document.getElementById('business_address').value.trim(),
        category: document.getElementById('category').value,
        description: document.getElementById('description').value.trim(),
        logo_url: document.getElementById('logo_url').value.trim(),
        operating_hours: document.getElementById('operating_hours').value.trim()
    };

    // Validate
    if (!formData.business_name) {
        showMessage('Business name is required', 'error');
        return;
    }

    if (!formData.category) {
        showMessage('Category is required', 'error');
        return;
    }

    // Set loading state
    const submitBtn = profileForm.querySelector('button[type="submit"]');
    setLoading(submitBtn, true);

    try {
        // Determine method (POST for create, PUT for update)
        const method = hasProfile ? 'PUT' : 'POST';
        const url = '/api/vendors/profile';

        const data = await fetchWithAuth(url, {
            method: method,
            body: JSON.stringify(formData)
        });

        hasProfile = true;
        showMessage(data.message, 'success');

        // Reload menu items if profile was just created
        if (method === 'POST') {
            await loadMenuItems();
        }

    } catch (error) {
        if (error.message !== 'Session expired') {
            showMessage(error.message || 'Failed to save profile', 'error');
        }
    } finally {
        setLoading(submitBtn, false);
    }
}

// ============= MENU MANAGEMENT =============

// Load menu items
async function loadMenuItems() {
    try {
        const data = await fetchWithAuth('/api/vendors/menu');

        const items = data.data || [];

        if (items.length === 0) {
            menuItemsGrid.innerHTML = '';
            emptyMenuState.style.display = 'block';
        } else {
            renderMenuItems(items);
            emptyMenuState.style.display = 'none';
        }

    } catch (error) {
        if (error.message !== 'Session expired') {
            console.error('Failed to load menu items:', error);
        }
    }
}

// Render menu items
function renderMenuItems(items) {
    menuItemsGrid.innerHTML = items.map(item => `
        <div class="menu-item-card">
            <h3>${escapeHtml(item.name)}</h3>
            <div class="menu-item-price">₦${parseFloat(item.price).toFixed(2)}</div>
            ${item.description ? `<p class="menu-item-description">${escapeHtml(item.description)}</p>` : ''}
            <span class="menu-item-status ${item.available ? 'available' : 'unavailable'}">
                ${item.available ? 'Available' : 'Unavailable'}
            </span>
            <div class="menu-item-actions">
                <button class="btn btn-edit" onclick="openEditMenuItemModal(${item.id})">Edit</button>
                <button class="btn btn-delete" onclick="deleteMenuItem(${item.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

// Open menu item modal (add or edit)
function openMenuItemModal(itemId = null) {
    currentMenuItemId = itemId;

    if (itemId) {
        // Edit mode
        modalTitle.textContent = 'Edit Menu Item';
        loadMenuItemForEdit(itemId);
    } else {
        // Add mode
        modalTitle.textContent = 'Add Menu Item';
        menuItemForm.reset();
        document.getElementById('item_available').checked = true;
    }

    menuItemModal.classList.add('active');
}

// Load menu item for editing
async function loadMenuItemForEdit(itemId) {
    try {
        const data = await fetchWithAuth('/api/vendors/menu');
        const item = data.data.find(i => i.id === itemId);

        if (item) {
            document.getElementById('item_name').value = item.name || '';
            document.getElementById('item_description').value = item.description || '';
            document.getElementById('item_price').value = item.price || '';
            document.getElementById('item_image_url').value = item.image_url || '';
            document.getElementById('item_available').checked = item.available !== 0;
        }
    } catch (error) {
        if (error.message !== 'Session expired') {
            showMessage('Failed to load menu item', 'error');
        }
    }
}

// Close menu item modal
function closeMenuItemModal() {
    menuItemModal.classList.remove('active');
    menuItemForm.reset();
    currentMenuItemId = null;
}

// Save menu item
async function saveMenuItem() {
    clearMessage();

    // Get form data
    const formData = {
        name: document.getElementById('item_name').value.trim(),
        description: document.getElementById('item_description').value.trim(),
        price: parseFloat(document.getElementById('item_price').value),
        image_url: document.getElementById('item_image_url').value.trim(),
        available: document.getElementById('item_available').checked
    };

    // Validate
    if (!formData.name) {
        showMessage('Item name is required', 'error');
        return;
    }

    if (!formData.price || formData.price < 0) {
        showMessage('Valid price is required', 'error');
        return;
    }

    // Set loading state
    setLoading(saveMenuItemBtn, true);

    try {
        let url = '/api/vendors/menu';
        let method = 'POST';

        if (currentMenuItemId) {
            // Update existing item
            url = `/api/vendors/menu/${currentMenuItemId}`;
            method = 'PUT';
        }

        const data = await fetchWithAuth(url, {
            method: method,
            body: JSON.stringify(formData)
        });

        showMessage(data.message, 'success');
        closeMenuItemModal();
        await loadMenuItems();

    } catch (error) {
        if (error.message !== 'Session expired') {
            showMessage(error.message || 'Failed to save menu item', 'error');
        }
    } finally {
        setLoading(saveMenuItemBtn, false);
    }
}

// Delete menu item - show custom modal
let itemToDeleteId = null;
let itemToDeleteName = '';

function showDeleteModal(itemId, itemName) {
    itemToDeleteId = itemId;
    itemToDeleteName = itemName;

    const modal = document.getElementById('deleteConfirmModal');
    const nameSpan = document.getElementById('itemToDeleteName');

    if (modal && nameSpan) {
        nameSpan.textContent = itemName;
        modal.classList.add('active');
    }
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
        modal.classList.remove('active');
    }
    itemToDeleteId = null;
    itemToDeleteName = '';
}

async function confirmDeleteItem() {
    if (!itemToDeleteId) return;

    closeDeleteModal();
    clearMessage();

    try {
        const data = await fetchWithAuth(`/api/vendors/menu/${itemToDeleteId}`, {
            method: 'DELETE'
        });

        showMessage(data.message, 'success');
        await loadMenuItems();

    } catch (error) {
        if (error.message !== 'Session expired') {
            showMessage(error.message || 'Failed to delete menu item', 'error');
        }
    }
}

// Legacy function for backwards compatibility
async function deleteMenuItem(itemId) {
    // Try to get item name from the card
    const cards = document.querySelectorAll('.menu-item-card');
    let itemName = 'this item';

    cards.forEach(card => {
        const button = card.querySelector(`button[onclick*="${itemId}"]`);
        if (button) {
            const h3 = card.querySelector('h3');
            if (h3) itemName = h3.textContent;
        }
    });

    showDeleteModal(itemId, itemName);
}

// ============= UI HELPERS =============

// Show message
function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type} show`;
    messageDiv.style.display = 'block';

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            clearMessage();
        }, 5000);
    }
}

// Clear message
function clearMessage() {
    messageDiv.textContent = '';
    messageDiv.className = 'message';
    messageDiv.style.display = 'none';
}

// Set loading state
function setLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.classList.add('loading');
        button.setAttribute('data-text', button.textContent);
        button.textContent = 'Loading...';
    } else {
        button.disabled = false;
        button.classList.remove('loading');
        button.textContent = button.getAttribute('data-text') || button.textContent;
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Logout
function logout() {
    localStorage.removeItem('localconnect_token');
    localStorage.removeItem('localconnect_user');
    localStorage.removeItem('localconnect_cart');
    window.location.href = '/login.html';
}

// ============= EVENT LISTENERS =============

// Profile form submit
profileForm.addEventListener('submit', saveProfile);

// Logout button
logoutBtn.addEventListener('click', logout);

// Add menu item button
addMenuItemBtn.addEventListener('click', () => openMenuItemModal());

// Save menu item button
saveMenuItemBtn.addEventListener('click', saveMenuItem);

// Close modal button
closeModalBtn.addEventListener('click', closeMenuItemModal);

// Close modal on outside click
menuItemModal.addEventListener('click', (e) => {
    if (e.target === menuItemModal) {
        closeMenuItemModal();
    }
});

// Clear message when user starts typing in profile form
profileForm.addEventListener('input', () => {
    if (messageDiv.classList.contains('error')) {
        clearMessage();
    }
});

// Global function for edit button (called from HTML)
window.openEditMenuItemModal = openMenuItemModal;
window.deleteMenuItem = deleteMenuItem;
window.closeMenuItemModal = closeMenuItemModal;
window.showDeleteModal = showDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.confirmDeleteItem = confirmDeleteItem;

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
