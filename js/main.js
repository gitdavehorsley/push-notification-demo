import config from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const phoneInput = document.getElementById('phoneInput');
    const signupButton = document.getElementById('signupButton');
    const statusMessage = document.getElementById('statusMessage');
    let verificationInProgress = false;
    let otpInputElement = null;

    // Set initial button text
    signupButton.textContent = 'SIGN UP';

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
            const rawNumber = phoneInput.value.replace(/\D/g, '');
            console.log('Raw phone number:', rawNumber);
            
            // Validate phone number format
            if (!/^\d{10}$/.test(rawNumber)) {
                updateStatus('Please enter a valid 10-digit phone number', 'error');
                return;
            }
            
            const phoneNumber = '+1' + rawNumber; // TODO: Make country code configurable
            console.log('Formatted phone number:', phoneNumber);

            if (!verificationInProgress) {
                // Send OTP
                console.log('Sending request to:', config.API_ENDPOINT);
                const response = await fetch(config.API_ENDPOINT, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'sendOTP',
                        phoneNumber: phoneNumber
                    })
                });
                // In no-cors mode, we can't read the response
                // We'll assume success if the request didn't throw an error
                console.log('Request sent successfully');
                
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
                    otpInputElement.className = 'otp-input';
                    phoneInput.parentNode.insertBefore(otpInputElement, signupButton);
                }
                
                updateStatus('Verification code sent to your phone', 'success');
            } else {
                // Verify OTP
                const otpCode = otpInputElement.value;
                if (!/^\d{4}$/.test(otpCode)) {
                    updateStatus('Please enter a valid 4-digit code', 'error');
                    return;
                }

                const response = await fetch(config.API_ENDPOINT, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'verifyOTP',
                        phoneNumber: phoneNumber,
                        otp: otpCode,
                        deviceId: 'web-' + Date.now() // Simple device ID generation
                    })
                });
                // In no-cors mode, we can't read the response
                // We'll assume success if the request didn't throw an error
                console.log('Verification request sent successfully');
                
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
            }
        } catch (error) {
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                error
            });
            updateStatus('An error occurred during signup. Check console for details.', 'error');
        }
    });

    // Helper function to update status message
    function updateStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = 'status-message ' + type;
    }
});
