const path = require('path');

// Load server/.env regardless of where jest is started from
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });

// Safe fallbacks so the app can load without real credentials
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy';
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';