// env-config.js - Environment configuration
// Copy this file to env-config.js and update with your Firebase project credentials
// DO NOT commit env-config.js to version control

const developmentConfig = {
  FIREBASE_API_KEY: "YOUR_FIREBASE_API_KEY",
  FIREBASE_AUTH_DOMAIN: "YOUR_PROJECT.firebaseapp.com",
  FIREBASE_DATABASE_URL: "https://psychologybooking-default-rtdb.firebaseio.com",
  FIREBASE_PROJECT_ID: "YOUR_PROJECT_ID",
  FIREBASE_STORAGE_BUCKET: "YOUR_PROJECT.appspot.com",
  FIREBASE_MESSAGING_SENDER_ID: "YOUR_SENDER_ID",
  FIREBASE_APP_ID: "YOUR_APP_ID",
  FIREBASE_MEASUREMENT_ID: "YOUR_MEASUREMENT_ID",
  ADMIN_EMAILS: "admin@umail.uom.ac.mu" // Comma-separated list of admin emails
};

// Use development config for now
const config = developmentConfig;

// Set window variables for Firebase config
window.FIREBASE_API_KEY = config.FIREBASE_API_KEY;
window.FIREBASE_AUTH_DOMAIN = config.FIREBASE_AUTH_DOMAIN;
window.FIREBASE_DATABASE_URL = config.FIREBASE_DATABASE_URL;
window.FIREBASE_PROJECT_ID = config.FIREBASE_PROJECT_ID;
window.FIREBASE_STORAGE_BUCKET = config.FIREBASE_STORAGE_BUCKET;
window.FIREBASE_MESSAGING_SENDER_ID = config.FIREBASE_MESSAGING_SENDER_ID;
window.FIREBASE_APP_ID = config.FIREBASE_APP_ID;
window.FIREBASE_MEASUREMENT_ID = config.FIREBASE_MEASUREMENT_ID;
window.ADMIN_EMAILS = config.ADMIN_EMAILS;

console.log('[Config] Environment configuration loaded');
