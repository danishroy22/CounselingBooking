// firebase.js - Simplified Firebase integration for Counseling Booking
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut 
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { 
  getDatabase, 
  ref, 
  push, 
  set, 
  onValue, 
  get, 
  child 
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import { firebaseConfig, getFirebaseConfigAsync, securityConfig } from "./config/firebase-config.js";

// Initialize Firebase app
let app, db, auth;

const initializeFirebase = async () => {
  let config = firebaseConfig;
  
  if (!config) {
    console.log('[Firebase] Loading configuration asynchronously...');
    config = await getFirebaseConfigAsync();
  }
  
  if (!app) {
    app = initializeApp(config);
    try { getAnalytics(app); } catch (e) { /* no-op */ }
    db = getDatabase(app);
    auth = getAuth(app);
    console.log('[Firebase] Initialized successfully');
  }
  
  return { app, db, auth };
};

// Initialize immediately if config is available
if (firebaseConfig) {
  const { app: _app, db: _db, auth: _auth } = await initializeFirebase();
  app = _app;
  db = _db;
  auth = _auth;
} else {
  console.log('[Firebase] Configuration not ready, will initialize on first access');
}

// Export with lazy initialization
export const getDb = async () => {
  if (!db) {
    const initialized = await initializeFirebase();
    return initialized.db;
  }
  return db;
};

export const getAuthInstance = async () => {
  if (!auth) {
    const initialized = await initializeFirebase();
    return initialized.auth;
  }
  return auth;
};

export { db, auth };
export { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut };

/** Fetch bookings in real-time - simplified */
export async function fetchBookingsRealtime(callback) {
  const database = await getDb();
  const bookingsRef = ref(database, "counseling_bookings");
  
  onValue(bookingsRef, (snapshot) => {
    const bookingsByDate = {};
    snapshot.forEach((childSnap) => {
      const booking = childSnap.val();
      const date = booking.date;
      if (!bookingsByDate[date]) {
        bookingsByDate[date] = [];
      }
      bookingsByDate[date].push({ ...booking, key: childSnap.key });
    });
    callback(bookingsByDate);
  });
}

/** Submit a counseling booking - simplified (no complex rules) */
export async function submitBooking(bookingData) {
  const authentication = await getAuthInstance();
  if (!authentication.currentUser) {
    throw new Error('Authentication required. Please log in.');
  }

  // Simple validation
  if (!bookingData.date || !bookingData.time || !bookingData.student_name || !bookingData.student_id || !bookingData.student_email) {
    throw new Error('Please fill in all required fields.');
  }

  // Check if slot is already booked
  const database = await getDb();
  const bookingsRef = ref(database, "counseling_bookings");
  const snapshot = await get(bookingsRef);
  
  if (snapshot.exists()) {
    const bookings = snapshot.val();
    const isBooked = Object.values(bookings).some(booking => 
      booking.date === bookingData.date && 
      booking.time === bookingData.time &&
      booking.status !== 'cancelled'
    );
    
    if (isBooked) {
      throw new Error('This time slot is already booked. Please choose another time.');
    }
  }

  // Create the booking
  const newBookingRef = push(ref(database, "counseling_bookings"));
  const finalBookingData = {
    ...bookingData,
    status: "booked",
    created_by: authentication.currentUser.uid,
    created_at: new Date().toISOString(),
    student_email: authentication.currentUser.email
  };

  await set(newBookingRef, finalBookingData);
  
  // Create/update user record
  const userRef = ref(database, `users/${authentication.currentUser.uid}`);
  await set(userRef, {
    email: authentication.currentUser.email,
    role: securityConfig.adminEmails.includes(authentication.currentUser.email) ? 'admin' : 'student',
    created_at: new Date().toISOString()
  });
  
  return newBookingRef.key;
}

/** Check if a user is admin */
export async function isAdmin(uid) {
  if (!uid) return false;
  
  try {
    const database = await getDb();
    const userSnap = await get(child(ref(database), `users/${uid}`));
    if (!userSnap.exists()) return false;
    
    const userData = userSnap.val();
    return userData.role === 'admin';
  } catch (error) {
    console.error('[isAdmin] Error checking admin status:', error);
    return false;
  }
}

/** Get current user */
export async function getCurrentUser() {
  const authentication = await getAuthInstance();
  return authentication.currentUser;
}
