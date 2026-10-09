const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const outputPath = path.join(__dirname, 'src', 'services', 'env.ts');

let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
} else {
  const examplePath = path.join(__dirname, '.env.example');
  if (fs.existsSync(examplePath)) {
    envContent = fs.readFileSync(examplePath, 'utf8');
  }
}

const vars = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const index = trimmed.indexOf('=');
    if (index !== -1) {
      const key = trimmed.substring(0, index).trim();
      const val = trimmed.substring(index + 1).trim().replace(/^['"]|['"]$/g, '');
      vars[key] = val;
    }
  }
});

// Cleanly derive client endpoints
const backendUrl = (vars.BACKEND_URL || 'https://api.ficapp.in').replace(/\/+$/, '');
const apiUrl = (vars.API_URL || `${backendUrl}/api`).replace(/\/+$/, '');
const apiUrlAndroid = (vars.API_URL_ANDROID || apiUrl).replace(/\/+$/, '');
const apiUrlIos = (vars.API_URL_IOS || apiUrl).replace(/\/+$/, '');
const socketUrlAndroid = (vars.SOCKET_URL_ANDROID || backendUrl).replace(/\/+$/, '');
const socketUrlIos = (vars.SOCKET_URL_IOS || backendUrl).replace(/\/+$/, '');
const razorpayKeyId = vars.RAZORPAY_KEY_ID || 'rzp_test_THLM17MgXLM2tP';
const cloudinaryCloudName = vars.CLOUDINARY_CLOUD_NAME || 'yvsm7ze0';
const vendorBackendUrl = (vars.VENDOR_BACKEND_URL || 'http://127.0.0.1:8002').replace(/\/+$/, '');
const port = vars.PORT || '8001';

const fileContent = `// Automatically generated from .env - DO NOT EDIT DIRECTLY
export const BACKEND_URL = '${backendUrl}';
export const API_URL = '${apiUrl}';
export const API_URL_ANDROID = '${apiUrlAndroid}';
export const API_URL_IOS = '${apiUrlIos}';
export const SOCKET_URL_ANDROID = '${socketUrlAndroid}';
export const SOCKET_URL_IOS = '${socketUrlIos}';
export const RAZORPAY_KEY_ID = '${razorpayKeyId}';
export const CLOUDINARY_CLOUD_NAME = '${cloudinaryCloudName}';
export const VENDOR_BACKEND_URL = '${vendorBackendUrl}';
export const PORT = '${port}';
`;

fs.writeFileSync(outputPath, fileContent, 'utf8');
console.log('[load-env] Generated src/services/env.ts from .env');
