// Get form and message elements
const registerForm = document.getElementById('registerForm');
const messageDiv = document.getElementById('message');

// Form submission handler
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous messages
    clearMessage();

    // Get form data
    const formData = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
        phone: document.getElementById('phone').value.trim(),
        role: document.getElementById('role').value
    };

    // Client-side validation
    if (!validateForm(formData)) {
        return;
    }

    // Set loading state
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    setLoading(submitBtn, true);

    try {
        // Make API request
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            // Success
            showMessage('Registration successful! Redirecting to login...', 'success');
            registerForm.reset();

            // Redirect to login page after 2 seconds
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
        } else {
            // Error from server
            showMessage(data.error || 'Registration failed. Please try again.', 'error');
            setLoading(submitBtn, false);
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('Network error. Please check your connection and try again.', 'error');
        setLoading(submitBtn, false);
    }
});

// Validation function
function validateForm(data) {
    // Validate name
    if (data.name.length < 2) {
        showMessage('Name must be at least 2 characters long', 'error');
        return false;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        showMessage('Please enter a valid email address', 'error');
        return false;
    }

    // Validate password
    if (data.password.length < 6) {
        showMessage('Password must be at least 6 characters long', 'error');
        return false;
    }

    // Validate phone (if provided)
    if (data.phone && data.phone.length > 0) {
        const phoneRegex = /^[0-9+\-\s()]+$/;
        if (!phoneRegex.test(data.phone)) {
            showMessage('Please enter a valid phone number', 'error');
            return false;
        }
    }

    // Validate role
    if (!data.role || !['customer', 'vendor'].includes(data.role)) {
        showMessage('Please select a valid role', 'error');
        return false;
    }

    return true;
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
        button.textContent = button.getAttribute('data-text') || 'Register';
    }
}

// Clear message when user starts typing
registerForm.addEventListener('input', () => {
    if (messageDiv.classList.contains('error')) {
        clearMessage();
    }
});
