const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

// CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://master.d3ljvakgnw3v0h.amplifyapp.com",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "OPTIONS,POST"
};

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const snsClient = new SNSClient({ region: process.env.REGION });

// Store OTP codes temporarily (in production, use DynamoDB with TTL)
const otpStore = new Map();

const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const sendOTP = async (phoneNumber, otp) => {
  const params = {
    Message: `Your verification code is: ${otp}`,
    PhoneNumber: phoneNumber,
  };

  try {
    await snsClient.send(new PublishCommand(params));
    return true;
  } catch (error) {
    console.error('Error sending OTP:', error);
    return false;
  }
};

const storePhoneAndDevice = async (phoneNumber, deviceId) => {
  const params = {
    TableName: process.env.STORAGE_PHONEDEVICETABLE_NAME,
    Item: {
      phoneNumber: phoneNumber,
      deviceId: deviceId,
      createdAt: new Date().toISOString()
    }
  };

  try {
    await docClient.send(new PutCommand(params));
    return true;
  } catch (error) {
    console.error('Error storing phone and device:', error);
    return false;
  }
};

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
  // Handle preflight requests first
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { action, phoneNumber, deviceId, otp } = body;

    if (!phoneNumber) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Phone number is required' })
      };
    }

    switch (action) {
      case 'sendOTP': {
        const otp = generateOTP();
        const sent = await sendOTP(phoneNumber, otp);
        
        if (!sent) {
          return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to send OTP' })
          };
        }

        // Store OTP with 5 minute expiration
        otpStore.set(phoneNumber, {
          otp,
          expires: Date.now() + 5 * 60 * 1000
        });

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ message: 'OTP sent successfully' })
        };
      }

      case 'verifyOTP': {
        if (!deviceId || !otp) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Device ID and OTP are required' })
          };
        }

        const storedData = otpStore.get(phoneNumber);
        
        if (!storedData || storedData.expires < Date.now()) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'OTP expired or invalid' })
          };
        }

        if (storedData.otp !== otp) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Invalid OTP' })
          };
        }

        // Store phone and device info
        const stored = await storePhoneAndDevice(phoneNumber, deviceId);
        
        if (!stored) {
          return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to store device registration' })
          };
        }

        // Clean up OTP
        otpStore.delete(phoneNumber);

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ message: 'Phone number verified and device registered successfully' })
        };
      }

      default:
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Invalid action' })
        };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
