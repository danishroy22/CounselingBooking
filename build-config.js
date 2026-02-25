// build-config.js - Generate env-config.js from Netlify environment variables
// This script runs during Netlify build to create the config file

const fs = require('fs');
const path = require('path');

// Get environment variables (Netlify provides these)
const config = {
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || '',
  FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || '',
  FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL || '',
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || '',
  FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  FIREBASE_APP_ID: process.env.FIREBASE_APP_ID || '',
  FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID || '',
  ADMIN_EMAILS: process.env.ADMIN_EMAILS || 'admin@umail.uom.ac.mu'
};

// Generate the config file
const configContent = `// env-config.js - Environment configuration
// This file is auto-generated during build from Netlify environment variables
// DO NOT edit manually - update environment variables in Netlify dashboard instead

const developmentConfig = {
  FIREBASE_API_KEY: "${config.FIREBASE_API_KEY}",
  FIREBASE_AUTH_DOMAIN: "${config.FIREBASE_AUTH_DOMAIN}",
  FIREBASE_DATABASE_URL: "${config.FIREBASE_DATABASE_URL}",
  FIREBASE_PROJECT_ID: "${config.FIREBASE_PROJECT_ID}",
  FIREBASE_STORAGE_BUCKET: "${config.FIREBASE_STORAGE_BUCKET}",
  FIREBASE_MESSAGING_SENDER_ID: "${config.FIREBASE_MESSAGING_SENDER_ID}",
  FIREBASE_APP_ID: "${config.FIREBASE_APP_ID}",
  FIREBASE_MEASUREMENT_ID: "${config.FIREBASE_MEASUREMENT_ID}",
  ADMIN_EMAILS: "${config.ADMIN_EMAILS}" // Comma-separated list of admin emails
};

// Use development config for now
const configObj = developmentConfig;

// Set window variables for Firebase config
window.FIREBASE_API_KEY = configObj.FIREBASE_API_KEY;
window.FIREBASE_AUTH_DOMAIN = configObj.FIREBASE_AUTH_DOMAIN;
window.FIREBASE_DATABASE_URL = configObj.FIREBASE_DATABASE_URL;
window.FIREBASE_PROJECT_ID = configObj.FIREBASE_PROJECT_ID;
window.FIREBASE_STORAGE_BUCKET = configObj.FIREBASE_STORAGE_BUCKET;
window.FIREBASE_MESSAGING_SENDER_ID = configObj.FIREBASE_MESSAGING_SENDER_ID;
window.FIREBASE_APP_ID = configObj.FIREBASE_APP_ID;
window.FIREBASE_MEASUREMENT_ID = configObj.FIREBASE_MEASUREMENT_ID;
window.ADMIN_EMAILS = configObj.ADMIN_EMAILS;

console.log('[Config] Environment configuration loaded');
`;

// Ensure config directory exists
const configDir = path.join(__dirname, 'config');
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// Write the config file
const configPath = path.join(configDir, 'env-config.js');
fs.writeFileSync(configPath, configContent, 'utf8');

console.log('✅ Generated config/env-config.js from environment variables');
