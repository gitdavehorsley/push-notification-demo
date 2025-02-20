import config from './config.js';

// Configure AWS Amplify
const { Amplify, Notifications } = window.aws_amplify;
Amplify.configure({
    API: {
        endpoints: [
            {
                name: "PushNotificationAPI",
                endpoint: config.API_ENDPOINT
            }
        ]
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const phoneInput = document.getElementById('phoneInput');
    const signupButton = document.getElementById('signupButton');
    const statusMessage = document.getElementById('statusMessage');
    let verificationInProgress = false;
    let otpInputElement = null;
    let notificationPermissionGranted = false;

    // Set initial button text
    signupButton.textContent = 'SIGN UP';

    // Initialize Amplify Notifications
    async function initializeNotifications() {
        try {
            const permission = await Notifications.getPushNotification();
            if (permission === 'granted') {
                notificationPermissionGranted = true;
            } else if (permission === 'denied') {
                updateStatus('Push notifications are blocked. Please enable them in your browser settings.', 'error');
                signupButton.disabled = true;
                return;
            }
        } catch (error) {
            console.error('Error initializing notifications:', error);
            updateStatus('Push notifications are not supported', 'error');
            signupButton.disabled = true;
            return;
        }
    }

    // Initialize notifications on load
    initializeNotifications();

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

            // Request notification permission using Amplify
            if (!notificationPermissionGranted) {
                try {
                    await Notifications.requestPermission();
                    notificationPermissionGranted = true;
                } catch (error) {
                    console.error('Error requesting notification permission:', error);
                    updateStatus('Please allow notifications to continue', 'error');
                    return;
                }
            }

            if (!verificationInProgress) {
                // Send OTP
                const data = await Amplify.API.post('PushNotificationAPI', '/validate', {
                    body: {
                        action: 'sendOTP',
                        phoneNumber: phoneNumber
                    }
                });
                
                if (!data.error) {
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

                const data = await Amplify.API.post('PushNotificationAPI', '/validate', {
                    body: {
                        action: 'verifyOTP',
                        phoneNumber: phoneNumber,
                        otp: otpCode,
                        deviceId: 'web-' + Date.now() // Simple device ID generation
                    }
                });
                
                if (!data.error) {
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
