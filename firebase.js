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

  const database = await getDb();
  
  // Check if date is blocked
  const blockedRef = ref(database, "blocked_periods");
  const blockedSnap = await get(blockedRef);
  if (blockedSnap.exists()) {
    const blocks = blockedSnap.val();
    const bookingDate = new Date(bookingData.date);
    const isBlocked = Object.values(blocks).some(block => {
      const start = new Date(block.start_date);
      const end = new Date(block.end_date);
      return bookingDate >= start && bookingDate <= end;
    });
    
    if (isBlocked) {
      throw new Error('This date is blocked. Please choose another date.');
    }
  }
  
  // Check if slot is already booked
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
    const authentication = await getAuthInstance();
    const currentUser = authentication.currentUser;
    
    // First check: Check user's email against admin emails list (fallback)
    if (currentUser && currentUser.email) {
      const adminEmails = securityConfig.adminEmails.map(e => e.toLowerCase().trim());
      const userEmail = currentUser.email.toLowerCase().trim();
      if (adminEmails.includes(userEmail)) {
        console.log('[isAdmin] User is admin by email:', userEmail);
        return true;
      }
    }
    
    // Second check: Check database role
    const database = await getDb();
    const userSnap = await get(child(ref(database), `users/${uid}`));
    if (userSnap.exists()) {
      const userData = userSnap.val();
      if (userData.role === 'admin') {
        console.log('[isAdmin] User is admin by role');
        return true;
      }
    }
    
    return false;
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

/** Cancel a booking (admin only) */
export async function cancelBooking(bookingId, reason = '') {
  const authentication = await getAuthInstance();
  if (!authentication.currentUser) {
    throw new Error('Authentication required.');
  }
  
  const isAdminUser = await isAdmin(authentication.currentUser.uid);
  if (!isAdminUser) {
    throw new Error('Admin privileges required.');
  }
  
  const database = await getDb();
  const bookingRef = ref(database, `counseling_bookings/${bookingId}`);
  const bookingSnap = await get(bookingRef);
  
  if (!bookingSnap.exists()) {
    throw new Error('Booking not found.');
  }
  
  const booking = bookingSnap.val();
  await set(bookingRef, {
    ...booking,
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
    cancelled_by: authentication.currentUser.uid,
    cancellation_reason: reason
  });
  
  return bookingId;
}

/** Update booking (admin only - for reschedule/modify) */
export async function updateBooking(bookingId, updates) {
  const authentication = await getAuthInstance();
  if (!authentication.currentUser) {
    throw new Error('Authentication required.');
  }
  
  const isAdminUser = await isAdmin(authentication.currentUser.uid);
  if (!isAdminUser) {
    throw new Error('Admin privileges required.');
  }
  
  const database = await getDb();
  const bookingRef = ref(database, `counseling_bookings/${bookingId}`);
  const bookingSnap = await get(bookingRef);
  
  if (!bookingSnap.exists()) {
    throw new Error('Booking not found.');
  }
  
  const booking = bookingSnap.val();
  
  // If changing date/time, check if new slot is available
  if ((updates.date || updates.time) && booking.status !== 'cancelled') {
    const newDate = updates.date || booking.date;
    const newTime = updates.time || booking.time;
    
    if (newDate !== booking.date || newTime !== booking.time) {
      const bookingsRef = ref(database, "counseling_bookings");
      const snapshot = await get(bookingsRef);
      
      if (snapshot.exists()) {
        const bookings = snapshot.val();
        const isBooked = Object.entries(bookings).some(([key, b]) => 
          key !== bookingId &&
          b.date === newDate && 
          b.time === newTime &&
          b.status !== 'cancelled'
        );
        
        if (isBooked) {
          throw new Error('The new time slot is already booked.');
        }
      }
    }
  }
  
  await set(bookingRef, {
    ...booking,
    ...updates,
    updated_at: new Date().toISOString(),
    updated_by: authentication.currentUser.uid
  });
  
  return bookingId;
}

/** Fetch blocked periods in real-time */
export async function fetchBlockedPeriodsRealtime(callback) {
  const database = await getDb();
  const blockedRef = ref(database, "blocked_periods");
  
  onValue(blockedRef, (snapshot) => {
    const blockedPeriods = [];
    snapshot.forEach((childSnap) => {
      blockedPeriods.push({ ...childSnap.val(), key: childSnap.key });
    });
    callback(blockedPeriods);
  });
}

/** Add blocked period (admin only) */
export async function addBlockedPeriod(blockData) {
  const authentication = await getAuthInstance();
  if (!authentication.currentUser) {
    throw new Error('Authentication required.');
  }
  
  const isAdminUser = await isAdmin(authentication.currentUser.uid);
  if (!isAdminUser) {
    throw new Error('Admin privileges required.');
  }
  
  if (!blockData.start_date || !blockData.end_date || !blockData.reason) {
    throw new Error('Start date, end date, and reason are required.');
  }
  
  const database = await getDb();
  const blockedRef = ref(database, "blocked_periods");
  const newBlockRef = push(blockedRef);
  
  const finalBlockData = {
    ...blockData,
    created_by: authentication.currentUser.uid,
    created_at: new Date().toISOString()
  };
  
  await set(newBlockRef, finalBlockData);
  return newBlockRef.key;
}

/** Remove blocked period (admin only) */
export async function removeBlockedPeriod(blockId) {
  const authentication = await getAuthInstance();
  if (!authentication.currentUser) {
    throw new Error('Authentication required.');
  }
  
  const isAdminUser = await isAdmin(authentication.currentUser.uid);
  if (!isAdminUser) {
    throw new Error('Admin privileges required.');
  }
  
  const database = await getDb();
  const blockRef = ref(database, `blocked_periods/${blockId}`);
  await set(blockRef, null);
  
  return blockId;
}