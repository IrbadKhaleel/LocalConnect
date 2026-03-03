// Get form and message elements
const loginForm = document.getElementById('loginForm');
const messageDiv = document.getElementById('message');

// Form submission handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous messages
    clearMessage();

    // Get form data
    const formData = {
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value
    };

    // Client-side validation
    if (!validateForm(formData)) {
        return;
    }

    // Set loading state
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    setLoading(submitBtn, true);

    try {
        // Make API request
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            // Success - store token and user data
            storeAuthData(data.token, data.user);

            showMessage('Login successful! Redirecting...', 'success');
            loginForm.reset();

            // Redirect based on role after 1 second
            setTimeout(() => {
                redirectUser(data.user.role);
            }, 1000);
        } else {
            // Error from server
            showMessage(data.error || 'Login failed. Please try again.', 'error');
            setLoading(submitBtn, false);
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Network error. Please check your connection and try again.', 'error');
        setLoading(submitBtn, false);
    }
});

// Validation function
function validateForm(data) {
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        showMessage('Please enter a valid email address', 'error');
        return false;
    }

    // Validate password
    if (data.password.length === 0) {
        showMessage('Please enter your password', 'error');
        return false;
    }

    return true;
}

// Store authentication data
function storeAuthData(token, user) {
    localStorage.setItem('localconnect_token', token); 
    localStorage.setItem('localconnect_user', JSON.stringify(user));
}

// Redirect user based on role
function redirectUser(role) {
    if (role === 'vendor') {
        window.location.href = '/vendor-dashboard.html';
    } else if (role === 'customer') {
        window.location.href = '/customer-home.html';
    } else if (role === 'admin') {
        window.location.href = '/admin-dashboard.html';
    } else {
        window.location.href = '/';
    }
}

// Show message function
function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type} show`;
    messageDiv.style.display = 'block';
}

// Clear message function
function clearMessage() {
    messageDiv.textContent = '';
    messageDiv.className = 'message';
    messageDiv.style.display = 'none';
}

// Loading state function
function setLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.classList.add('loading');
        button.setAttribute('data-text', button.textContent);
        button.textContent = 'Loading...';
    } else {
        button.disabled = false;
        button.classList.remove('loading');
        button.textContent = button.getAttribute('data-text') || 'Login';
    }
}

// Clear message when user starts typing
loginForm.addEventListener('input', () => {
    if (messageDiv.classList.contains('error')) {
        clearMessage();
    }
});
