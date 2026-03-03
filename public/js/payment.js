// Payment verification functionality

document.addEventListener('DOMContentLoaded', function() {
    // Get reference from URL
    const reference = getUrlParameter('reference');

    if (!reference) {
        showError('No payment reference found');
        // Redirect to home after 3 seconds
        setTimeout(function() {
            window.location.href = '/customer-home.html';
        }, 3000);
        return;
    }

    // Verify the payment
    verifyPayment(reference);
});

// Get URL parameter by name
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Verify payment with server
async function verifyPayment(reference) {
    const loadingSection = document.getElementById('loadingSection');

    try {
        // Call verification endpoint
        const response = await fetch(`/api/payments/verify/${reference}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        // Hide loading section
        loadingSection.style.display = 'none';

        if (response.ok && data.status === 'success') {
            // Payment successful
            showSuccess(reference);
        } else {
            // Payment failed
            showError(data.message || 'Payment verification failed');
        }

    } catch (error) {
        console.error('Payment verification error:', error);

        // Hide loading section
        loadingSection.style.display = 'none';

        // Show failure
        showError('Unable to verify payment. Please contact support.');
    }
}

// Show success state
function showSuccess(reference) {
    const loadingSection = document.getElementById('loadingSection');
    const successSection = document.getElementById('successSection');
    const failureSection = document.getElementById('failureSection');
    const pageTitle = document.getElementById('pageTitle');
    const orderReference = document.getElementById('orderReference');

    // Hide loading and failure sections
    loadingSection.style.display = 'none';
    failureSection.style.display = 'none';

    // Update page title
    pageTitle.textContent = 'Payment Complete';

    // Display reference number
    orderReference.textContent = reference;

    // Clear cart after successful payment
    localStorage.removeItem('localconnect_cart');

    // Show success section
    successSection.style.display = 'block';
}

// Show error state
function showError(message) {
    const loadingSection = document.getElementById('loadingSection');
    const successSection = document.getElementById('successSection');
    const failureSection = document.getElementById('failureSection');
    const pageTitle = document.getElementById('pageTitle');
    const errorMessage = document.getElementById('errorMessage');

    // Hide loading and success sections
    loadingSection.style.display = 'none';
    successSection.style.display = 'none';

    // Update page title
    pageTitle.textContent = 'Payment Failed';

    // Display error message
    errorMessage.textContent = message;

    // Show failure section
    failureSection.style.display = 'block';
}
