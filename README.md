# Push Notification Demo with Phone Verification

This project demonstrates a web application that enables push notifications with phone number verification as a backup notification method. It uses AWS Lambda, DynamoDB, and SNS for the backend infrastructure.

## Features

- Browser push notification opt-in
- Phone number verification with OTP (One-Time Password)
- Secure storage of verified phone numbers and device IDs
- AWS infrastructure deployed via CloudFormation

## Project Structure

```
push-notification-demo/
├── index.html              # Main application page
├── css/
│   ├── styles.css         # Main styles
│   └── admin.css          # Admin panel styles
├── js/
│   ├── main.js            # Main application logic
│   └── admin.js           # Admin panel logic
├── admin/
│   └── index.html         # Admin panel
└── infrastructure/
    └── template.yaml      # CloudFormation template
```

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI installed and configured
3. Node.js and npm (for local development)

## Infrastructure Deployment

1. Deploy the CloudFormation stack:

```bash
aws cloudformation deploy \
  --template-file infrastructure/template.yaml \
  --stack-name push-notification-demo \
  --parameter-overrides Environment=dev \
  --capabilities CAPABILITY_IAM
```

2. After deployment, note the API Gateway endpoint URL from the stack outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name push-notification-demo \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text
```

3. Update the frontend API endpoint in `js/main.js` with the deployed API Gateway URL.

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Start a local development server:
```bash
npm run dev
```

## Phone Number Verification Flow

1. User enters their phone number
2. System sends a 4-digit OTP via SMS
3. User enters the OTP code
4. Upon successful verification:
   - Phone number is stored in DynamoDB
   - Device ID is associated with the phone number
   - UI updates to show verification success

## Security Considerations

- OTP codes expire after 5 minutes
- Maximum 3 attempts per OTP code
- Phone numbers are validated before sending OTP
- API Gateway endpoints use HTTPS
- DynamoDB tables use encryption at rest
- Lambda function has minimal IAM permissions

## Infrastructure Details

### DynamoDB Tables

1. `push-notification-subscribers`
   - Stores verified phone numbers and device IDs
   - TTL enabled for subscription expiration

2. `phone-verification-codes`
   - Stores temporary OTP codes
   - TTL enabled for code expiration

### Lambda Function

- Handles both OTP generation and verification
- Uses AWS SNS for sending SMS messages
- Implements rate limiting and security measures

### API Gateway

- Regional endpoint
- CORS enabled
- Lambda proxy integration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - See LICENSE file for details
