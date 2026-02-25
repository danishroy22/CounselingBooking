// env-config.js - Environment configuration
// Update these values with your Firebase project credentials

const developmentConfig = {
  FIREBASE_API_KEY: "AIzaSyAYY110F-kNbufn_TuHmLYoQk6-phzZ484",
  FIREBASE_AUTH_DOMAIN: "psychologybooking.firebaseapp.com",
  FIREBASE_DATABASE_URL: "https://psychologybooking-default-rtdb.firebaseio.com",
  FIREBASE_PROJECT_ID: "psychologybooking",
  FIREBASE_STORAGE_BUCKET: "psychologybooking.firebasestorage.app",
  FIREBASE_MESSAGING_SENDER_ID: "433493064810",
  FIREBASE_APP_ID: "1:433493064810:web:37b81b43d4da27de8bde13",
  FIREBASE_MEASUREMENT_ID: "G-6VGELSMRTY",
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
