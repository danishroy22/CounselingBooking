// dashboard.js - Simplified admin dashboard for counseling bookings
import { fetchBookingsRealtime, getAuthInstance, isAdmin, onAuthStateChanged } from "../firebase.js";
import { ref, get, child } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import { getDb } from "../firebase.js";

let allBookings = [];
let startDate = new Date();

// Format date helper
function formatDate(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// Generate calendar view
function generateCalendar(start) {
  const calendar = document.getElementById("dashboardCalendar");
  const weekLabel = document.getElementById("weekLabel");
  if (!calendar || !weekLabel) return;

  calendar.innerHTML = "";

  let monday = new Date(start);
  monday.setDate(monday.getDate() - monday.getDay() + 1);
  const friday = new Date(monday.getTime() + 4 * 86400000);
  weekLabel.textContent = `${formatDate(monday)} - ${formatDate(friday)}`;

  // Available time slots for counseling sessions by day
  // Day: 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
  const timeSlotsByDay = {
    2: [ // Tuesday
      "10:00 – 11:00",
      "11:30 – 12:00",
      "13:00 – 14:00"
    ],
    5: [ // Friday
      "10:00 – 11:00",
      "11:30 – 12:30",
      "13:00 – 14:00"
    ]
  };

  let totalSlots = 0;
  let bookedCount = 0;

  // Find Tuesday and Friday in the current week
  const tuesday = new Date(monday.getTime() + 1 * 86400000);
  const fridaySlot = new Date(monday.getTime() + 4 * 86400000);
  
  // Only generate days that have slots (Tuesday = 2, Friday = 5)
  const daysWithSlots = [
    { date: tuesday, dayOfWeek: 2 },
    { date: fridaySlot, dayOfWeek: 5 }
  ];

  daysWithSlots.forEach(({ date, dayOfWeek }) => {
    const dateStr = date.toISOString().split('T')[0];
    const timeSlots = timeSlotsByDay[dayOfWeek] || [];

    if (timeSlots.length > 0) {
      const dayDiv = document.createElement("div");
      dayDiv.className = "day";
      dayDiv.innerHTML = `<h3>${formatDate(date)}</h3>`;

      timeSlots.forEach(slotTime => {
        totalSlots++;
        const slotDiv = document.createElement("div");
        slotDiv.className = "time-slot";
        
        const booking = allBookings.find(b => 
          b.date === dateStr && 
          b.time === slotTime && 
          b.status !== 'cancelled'
        );

        if (booking) {
          bookedCount++;
          slotDiv.className = "slot booked";
          slotDiv.onclick = () => showBookingDetails(booking);
          slotDiv.innerHTML = `
            <div class="slot-time">${slotTime}</div>
            <div class="slot-student">${booking.student_name}</div>
            <div class="slot-id">ID: ${booking.student_id}</div>
            <div class="slot-status">Booked</div>
          `;
        } else {
          slotDiv.className = "slot available";
          slotDiv.innerHTML = `
            <div class="slot-time">${slotTime}</div>
            <div class="slot-status">Available</div>
          `;
        }

        dayDiv.appendChild(slotDiv);
      });

      calendar.appendChild(dayDiv);
    }
  });

  // Update summary
  document.getElementById("sumTotal").textContent = totalSlots;
  document.getElementById("sumBooked").textContent = bookedCount;
  document.getElementById("sumAvailable").textContent = (totalSlots - bookedCount);
}

// Show booking details modal
async function showBookingDetails(booking) {
  const modal = document.getElementById("bookingDetailsModal");
  const details = document.getElementById("bookingDetails");
  if (!modal || !details) return;

  // Get user info if available
  let userInfo = {};
  try {
    const db = await getDb();
    const userSnap = await get(child(ref(db), `users/${booking.created_by}`));
    if (userSnap.exists()) {
      userInfo = userSnap.val();
    }
  } catch (error) {
    console.error('Error fetching user info:', error);
  }

  // Get student email (prefer booking.student_email, fallback to userInfo.email)
  const studentEmail = booking.student_email || userInfo.email || 'N/A';
  
  // Create email subject and body
  const emailSubject = encodeURIComponent(`Counseling Session - ${new Date(booking.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`);
  const emailBody = encodeURIComponent(`Dear ${booking.student_name},\n\nRegarding your counseling session scheduled for:\n\nDate: ${new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\nTime: ${booking.time}\n\n`);
  const mailtoLink = `mailto:${studentEmail}?subject=${emailSubject}&body=${emailBody}`;

  details.innerHTML = `
    <div class="booking-detail-section">
      <h3>Session Details</h3>
      <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p><strong>Time:</strong> ${booking.time}</p>
      <p><strong>Status:</strong> <span class="status-badge ${booking.status}">${booking.status}</span></p>
    </div>
    
    <div class="booking-detail-section">
      <h3>Student Information</h3>
      <div class="student-info-item">
        <span class="info-label">Email (Umail):</span>
        <span class="info-value">${studentEmail}</span>
      </div>
      <div class="student-info-item">
        <span class="info-label">Name:</span>
        <span class="info-value">${booking.student_name}</span>
      </div>
      <div class="student-info-item">
        <span class="info-label">Student ID:</span>
        <span class="info-value">${booking.student_id}</span>
      </div>
      <div class="student-info-item">
        <span class="info-label">Reason for Session:</span>
        <span class="info-value">${booking.reason || 'Not specified'}</span>
      </div>
    </div>
    
    <div class="booking-detail-section">
      <div class="email-action">
        <a href="${mailtoLink}" class="btn-email" target="_blank">
          <span class="email-icon">✉</span>
          Email Student
        </a>
      </div>
    </div>
    
    <div class="booking-detail-section">
      <h3>Booking Information</h3>
      <p><strong>Booked on:</strong> ${new Date(booking.created_at).toLocaleString()}</p>
    </div>
  `;

  modal.style.display = "flex";
  modal.classList.add("show");
}

// Close modal
function closeModal() {
  const modal = document.getElementById("bookingDetailsModal");
  modal.style.display = "none";
  modal.classList.remove("show");
}

// Navigation
function prevWeek() {
  startDate.setDate(startDate.getDate() - 7);
  generateCalendar(startDate);
}

function nextWeek() {
  startDate.setDate(startDate.getDate() + 7);
  generateCalendar(startDate);
}

// Initialize dashboard
async function init() {
  // Check admin access
  const auth = await getAuthInstance();
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      alert('Please log in to access the admin dashboard');
      window.location.href = '../login.html';
      return;
    }

    const admin = await isAdmin(user.uid);
    if (!admin) {
      alert('Access denied. Admin privileges required.');
      window.location.href = '../index.html';
      return;
    }

    // Set up UI
    document.getElementById("dashUserEmail").textContent = user.email;
    document.getElementById("dashLogoutBtn").onclick = async () => {
      const { signOut } = await import("../firebase.js");
      await signOut(auth);
      window.location.href = '../index.html';
    };
  });

  // Set up navigation
  document.getElementById("prevWeek").onclick = prevWeek;
  document.getElementById("nextWeek").onclick = nextWeek;
  document.getElementById("closeModal").onclick = closeModal;
  // goToIndex is now an anchor tag, no need for onclick handler
  
  // Close modal when clicking outside
  const modal = document.getElementById("bookingDetailsModal");
  modal.onclick = (e) => {
    if (e.target === modal) {
      closeModal();
    }
  };

  // Fetch bookings in real-time
  fetchBookingsRealtime((bookingsByDate) => {
    allBookings = [];
    Object.values(bookingsByDate).forEach(bookings => {
      allBookings.push(...bookings);
    });
    generateCalendar(startDate);
  });

  // Initial calendar generation
  generateCalendar(startDate);
}

// Start the dashboard
init().catch(console.error);
