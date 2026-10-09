/**
 * Standalone FCM Push Notification Sender CLI Script
 * Usage:
 *   node backend/send-push.js --title="Order Update" --body="Your order #1089 is out for delivery." --screen="Orders"
 */
const http = require('http');

const args = process.argv.slice(2);
const options = {
  title: 'Order Status Update',
  body: 'Your package is on the way! Tap to track delivery.',
  screen: 'Orders',
  token: null,
};

args.forEach((arg) => {
  if (arg.startsWith('--title=')) options.title = arg.replace('--title=', '');
  if (arg.startsWith('--body=')) options.body = arg.replace('--body=', '');
  if (arg.startsWith('--screen=')) options.screen = arg.replace('--screen=', '');
  if (arg.startsWith('--token=')) options.token = arg.replace('--token=', '');
});

console.log('Dispatching FCM Push Notification payload:');
console.log('Title:', options.title);
console.log('Body:', options.body);
console.log('Screen:', options.screen);
if (options.token) console.log('Target Token:', options.token);

const postData = JSON.stringify({
  token: options.token,
  title: options.title,
  body: options.body,
  screen: options.screen,
  data: {
    screen: options.screen,
    timestamp: String(Date.now()),
  },
});

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const port = parseInt(process.env.PORT || '8001', 10);

const req = http.request(
  {
    hostname: 'localhost',
    port: port,
    path: '/api/notifications/send-push',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  },
  (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      console.log('Response from backend:', data);
    });
  }
);

req.on('error', (e) => {
  console.error('Failed to send request to backend server:', e.message);
});

req.write(postData);
req.end();
