// Environment-specific configuration
const config = {
    dev: {
        API_ENDPOINT: 'https://p674zxo5d0.execute-api.us-east-1.amazonaws.com/dev/verify'
    },
    prod: {
        API_ENDPOINT: '/verify' // In prod, API Gateway URL will be determined by Amplify
    }
};

// Determine environment based on URL
const isProduction = window.location.hostname.includes('amplifyapp.com');
const currentConfig = isProduction ? config.prod : config.dev;

export default currentConfig;
