import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import config from './config.js';

// Configure Amplify
Amplify.configure({
    // Configuration will be auto-injected by Amplify
});

// Generate Data client
const client = generateClient();

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
                // Generate a random 4-digit code
                const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
                
                // Create subscription record with verification code
                await client.models.PhoneSubscription.create({
                    phoneNumber: phoneNumber,
                    deviceId: 'web-' + Date.now(),
                    verified: false,
                    verificationCode: verificationCode,
                    createdAt: new Date().toISOString()
                });

                // TODO: In a production environment, you would integrate with a service like SNS or Twilio
                // to actually send the SMS. For now, we'll just log it.
                console.log('Verification code (demo):', verificationCode);
                
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

                // Find the subscription record
                const subscriptions = await client.models.PhoneSubscription.list({
                    filter: {
                        phoneNumber: { eq: phoneNumber },
                        verified: { eq: false }
                    }
                });

                if (subscriptions.length === 0) {
                    updateStatus('No pending verification found', 'error');
                    return;
                }

                const subscription = subscriptions[0];
                
                if (subscription.verificationCode !== otpCode) {
                    updateStatus('Invalid verification code', 'error');
                    return;
                }

                // Update subscription as verified
                await client.models.PhoneSubscription.update({
                    id: subscription.id,
                    verified: true
                });

                console.log('Subscription verified successfully');
                
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
