// firebase-config.js - Firebase configuration loader

const getFirebaseConfig = () => {
  const config = {
    apiKey: window.FIREBASE_API_KEY,
    authDomain: window.FIREBASE_AUTH_DOMAIN,
    databaseURL: window.FIREBASE_DATABASE_URL,
    projectId: window.FIREBASE_PROJECT_ID,
    storageBucket: window.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: window.FIREBASE_MESSAGING_SENDER_ID,
    appId: window.FIREBASE_APP_ID,
    measurementId: window.FIREBASE_MEASUREMENT_ID
  };

  if (!config.apiKey || !config.projectId || !config.authDomain) {
    throw new Error('Firebase configuration is incomplete. Please ensure env-config.js is properly configured.');
  }

  return config;
};

export const firebaseConfig = getFirebaseConfig();
export const getFirebaseConfigAsync = async () => getFirebaseConfig();

export const securityConfig = {
  adminEmails: (window.ADMIN_EMAILS || '').split(',').filter(email => email.trim())
};
