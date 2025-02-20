import config from './config.js';

// API configuration
const API_ENDPOINT = config.API_ENDPOINT;

document.addEventListener('DOMContentLoaded', () => {
    const phoneInput = document.getElementById('phoneInput');
    const signupButton = document.getElementById('signupButton');
    const statusMessage = document.getElementById('statusMessage');
    let verificationInProgress = false;
    let otpInputElement = null;
    let notificationPermissionGranted = false;

    // Set initial button text
    signupButton.textContent = 'SIGN UP';

    // Check if push notifications are supported
    if (!('Notification' in window)) {
        updateStatus('Push notifications are not supported by your browser', 'error');
        signupButton.disabled = true;
        return;
    }

    // Initialize notification state
    if (Notification.permission === 'granted') {
        notificationPermissionGranted = true;
    } else if (Notification.permission === 'denied') {
        updateStatus('Push notifications are blocked. Please enable them in your browser settings.', 'error');
        signupButton.disabled = true;
        return;
    }

    // Phone number input handler
    phoneInput.addEventListener('input', (e) => {
        // Allow only numbers
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        
        // Format as (XXX) XXX-XXXX
        if (e.target.value.length === 10) {
            const formatted = e.target.value.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
            e.target.value = formatted;
        }
    });

    // Signup button handler
    signupButton.addEventListener('click', async () => {
        try {
            const phoneNumber = '+1' + phoneInput.value.replace(/\D/g, '');
            
            if (phoneNumber.length !== 12) { // +1 plus 10 digits
                updateStatus('Please enter a valid 10-digit phone number', 'error');
                return;
            }

            // If notification permission not granted yet, request it first
            if (!notificationPermissionGranted) {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    updateStatus('Please allow notifications to continue', 'error');
                    return;
                }
                notificationPermissionGranted = true;
            }

            if (!verificationInProgress) {
                // Send OTP
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'send_otp',
                        phone_number: phoneNumber
                    })
                });

                const data = await response.json();
                
                if (data.success) {
                    // Show OTP input field
                    verificationInProgress = true;
                    signupButton.textContent = 'VERIFY CODE';
                    
                    // Create OTP input if it doesn't exist
                    if (!otpInputElement) {
                        otpInputElement = document.createElement('input');
                        otpInputElement.type = 'text';
                        otpInputElement.id = 'otpInput';
                        otpInputElement.placeholder = 'Enter 4-digit code';
                        otpInputElement.maxLength = 4;
                        otpInputElement.pattern = '[0-9]*';
                        phoneInput.parentNode.insertBefore(otpInputElement, signupButton);
                    }
                    
                    updateStatus('Verification code sent to your phone', 'success');
                } else {
                    updateStatus(data.message || 'Error sending verification code', 'error');
                }
            } else {
                // Verify OTP
                const otpCode = otpInputElement.value;
                if (!/^\d{4}$/.test(otpCode)) {
                    updateStatus('Please enter a valid 4-digit code', 'error');
                    return;
                }

                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'verify_otp',
                        phone_number: phoneNumber,
                        otp_code: otpCode,
                        device_id: 'web-' + Date.now() // Simple device ID generation
                    })
                });

                const data = await response.json();
                
                if (data.success) {
                    // Remove OTP input and reset state
                    if (otpInputElement) {
                        otpInputElement.remove();
                        otpInputElement = null;
                    }
                    verificationInProgress = false;
                    signupButton.textContent = 'SIGNED UP';
                    phoneInput.disabled = true;
                    signupButton.disabled = true;
                    updateStatus('Successfully signed up for notifications!', 'success');
                } else {
                    updateStatus(data.message || 'Invalid verification code', 'error');
                }
            }
        } catch (error) {
            console.error('Error:', error);
            updateStatus('An error occurred during signup', 'error');
        }
    });

    // Helper function to update status message
    function updateStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = 'status-message ' + type;
    }
});
