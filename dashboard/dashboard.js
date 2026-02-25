// dashboard.js - Admin dashboard for counseling bookings
import { 
  fetchBookingsRealtime, 
  getAuthInstance, 
  isAdmin, 
  onAuthStateChanged,
  cancelBooking,
  updateBooking,
  fetchBlockedPeriodsRealtime,
  addBlockedPeriod,
  removeBlockedPeriod
} from "../firebase.js";
import { ref, get, child } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import { getDb } from "../firebase.js";

let allBookings = [];
let blockedPeriods = [];
let startDate = new Date();
let currentBooking = null;

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
  let blockedCount = 0;

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
          // Check if date is blocked
          const isBlocked = isDateBlocked(dateStr);
          if (isBlocked) {
            blockedCount++;
            slotDiv.className = "slot blocked";
            slotDiv.innerHTML = `
              <div class="slot-time">${slotTime}</div>
              <div class="slot-status">Blocked</div>
            `;
          } else {
            slotDiv.className = "slot available";
            slotDiv.innerHTML = `
              <div class="slot-time">${slotTime}</div>
              <div class="slot-status">Available</div>
            `;
          }
        }

        dayDiv.appendChild(slotDiv);
      });

      calendar.appendChild(dayDiv);
    }
  });

  // Update summary
  document.getElementById("sumTotal").textContent = totalSlots;
  document.getElementById("sumBooked").textContent = bookedCount;
  document.getElementById("sumAvailable").textContent = (totalSlots - bookedCount - blockedCount);
}

// Show booking details modal
async function showBookingDetails(booking) {
  const modal = document.getElementById("bookingDetailsModal");
  const details = document.getElementById("bookingDetails");
  if (!modal || !details) return;

  currentBooking = booking;

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

  const isCancelled = booking.status === 'cancelled';
  const adminActions = isCancelled ? '' : `
    <div class="booking-detail-section">
      <h3>Admin Actions</h3>
      <div class="admin-actions">
        <button class="btn-action btn-reschedule" onclick="openRescheduleModal('${booking.key}')">
          📅 Reschedule
        </button>
        <button class="btn-action btn-cancel" onclick="handleCancelBooking('${booking.key}')">
          ❌ Cancel Booking
        </button>
        <button class="btn-action btn-modify" onclick="openModifyModal('${booking.key}')">
          ✏️ Modify Details
        </button>
      </div>
    </div>
  `;

  details.innerHTML = `
    <div class="booking-detail-section">
      <h3>Session Details</h3>
      <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p><strong>Time:</strong> ${booking.time}</p>
      <p><strong>Status:</strong> <span class="status-badge ${booking.status}">${booking.status}</span></p>
      ${booking.cancellation_reason ? `<p><strong>Cancellation Reason:</strong> ${booking.cancellation_reason}</p>` : ''}
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
    
    ${adminActions}
    
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
      ${booking.updated_at ? `<p><strong>Last updated:</strong> ${new Date(booking.updated_at).toLocaleString()}</p>` : ''}
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
  currentBooking = null;
}

// Admin Actions
window.openRescheduleModal = function(bookingId) {
  const booking = allBookings.find(b => b.key === bookingId);
  if (!booking) return;
  
  document.getElementById("rescheduleBookingId").value = bookingId;
  document.getElementById("rescheduleDate").value = booking.date;
  document.getElementById("rescheduleTime").value = booking.time;
  document.getElementById("rescheduleReason").value = '';
  
  const modal = document.getElementById("rescheduleModal");
  modal.style.display = "flex";
  modal.classList.add("show");
};

window.openModifyModal = function(bookingId) {
  const booking = allBookings.find(b => b.key === bookingId);
  if (!booking) return;
  
  // For now, use reschedule modal for modification
  openRescheduleModal(bookingId);
};

window.handleCancelBooking = async function(bookingId) {
  if (!confirm('Are you sure you want to cancel this booking? The student will need to book a new session.')) {
    return;
  }
  
  const reason = prompt('Please provide a reason for cancellation (optional):') || '';
  
  try {
    await cancelBooking(bookingId, reason);
    alert('Booking cancelled successfully.');
    closeModal();
    // Calendar will update automatically via real-time listener
  } catch (error) {
    alert('Error cancelling booking: ' + error.message);
  }
};

// Handle reschedule form
async function handleReschedule(e) {
  e.preventDefault();
  
  const bookingId = document.getElementById("rescheduleBookingId").value;
  const newDate = document.getElementById("rescheduleDate").value;
  const newTime = document.getElementById("rescheduleTime").value;
  const reason = document.getElementById("rescheduleReason").value;
  
  try {
    await updateBooking(bookingId, {
      date: newDate,
      time: newTime,
      reschedule_reason: reason
    });
    
    alert('Booking updated successfully.');
    closeRescheduleModal();
    closeModal();
    // Calendar will update automatically
  } catch (error) {
    alert('Error updating booking: ' + error.message);
  }
}

function closeRescheduleModal() {
  const modal = document.getElementById("rescheduleModal");
  modal.style.display = "none";
  modal.classList.remove("show");
  document.getElementById("rescheduleForm").reset();
}

// Analytics Functions
function calculateAnalytics() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const weekBookings = allBookings.filter(b => 
    new Date(b.created_at) >= weekAgo && b.status !== 'cancelled'
  ).length;
  
  const monthBookings = allBookings.filter(b => 
    new Date(b.created_at) >= monthAgo && b.status !== 'cancelled'
  ).length;
  
  const cancelledCount = allBookings.filter(b => 
    new Date(b.created_at) >= monthAgo && b.status === 'cancelled'
  ).length;
  
  const totalMonth = allBookings.filter(b => 
    new Date(b.created_at) >= monthAgo
  ).length;
  
  const cancelRate = totalMonth > 0 ? ((cancelledCount / totalMonth) * 100).toFixed(1) : 0;
  const avgPerDay = weekBookings > 0 ? (weekBookings / 7).toFixed(1) : 0;
  
  document.getElementById("weekBookings").textContent = weekBookings;
  document.getElementById("monthBookings").textContent = monthBookings;
  document.getElementById("cancelRate").textContent = cancelRate + '%';
  document.getElementById("avgPerDay").textContent = avgPerDay;
  
  // Recent activity
  const recentBookings = allBookings
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10);
  
  const activityList = document.getElementById("recentActivity");
  if (activityList) {
    activityList.innerHTML = recentBookings.map(booking => `
      <div class="activity-item">
        <div class="activity-date">${new Date(booking.created_at).toLocaleDateString()}</div>
        <div class="activity-details">
          <strong>${booking.student_name}</strong> (ID: ${booking.student_id})
          <span class="status-badge ${booking.status}">${booking.status}</span>
        </div>
        <div class="activity-time">${booking.date} at ${booking.time}</div>
      </div>
    `).join('');
  }
}

// Blocked Periods Functions
function renderBlockedPeriods() {
  const list = document.getElementById("blockedPeriodsList");
  if (!list) return;
  
  if (blockedPeriods.length === 0) {
    list.innerHTML = '<p class="no-blocks">No blocked periods. Click "Add Block Period" to create one.</p>';
    return;
  }
  
  list.innerHTML = blockedPeriods.map(block => {
    const startDate = new Date(block.start_date);
    const endDate = new Date(block.end_date);
    const isActive = new Date() <= endDate;
    
    return `
      <div class="blocked-item ${isActive ? 'active' : 'expired'}">
        <div class="blocked-dates">
          <strong>${startDate.toLocaleDateString()}</strong> to <strong>${endDate.toLocaleDateString()}</strong>
        </div>
        <div class="blocked-reason">${block.reason}</div>
        <div class="blocked-actions">
          <button class="btn-remove" onclick="handleRemoveBlock('${block.key}')">Remove</button>
        </div>
      </div>
    `;
  }).join('');
}

window.handleRemoveBlock = async function(blockId) {
  if (!confirm('Are you sure you want to remove this blocked period?')) {
    return;
  }
  
  try {
    await removeBlockedPeriod(blockId);
    alert('Blocked period removed successfully.');
  } catch (error) {
    alert('Error removing blocked period: ' + error.message);
  }
};

async function handleAddBlock(e) {
  e.preventDefault();
  
  const startDate = document.getElementById("blockStartDate").value;
  const endDate = document.getElementById("blockEndDate").value;
  const reason = document.getElementById("blockReason").value;
  
  if (new Date(startDate) > new Date(endDate)) {
    alert('End date must be after start date.');
    return;
  }
  
  try {
    await addBlockedPeriod({
      start_date: startDate,
      end_date: endDate,
      reason: reason
    });
    
    alert('Blocked period added successfully.');
    closeBlockModal();
  } catch (error) {
    alert('Error adding blocked period: ' + error.message);
  }
}

function closeBlockModal() {
  const modal = document.getElementById("blockPeriodModal");
  modal.style.display = "none";
  modal.classList.remove("show");
  document.getElementById("blockPeriodForm").reset();
  document.getElementById("blockPeriodId").value = '';
}

// Tab switching
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      
      // Update buttons
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update content
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === targetTab + 'Tab') {
          content.classList.add('active');
        }
      });
    });
  });
}

// Check if date is blocked
function isDateBlocked(dateStr) {
  const date = new Date(dateStr);
  return blockedPeriods.some(block => {
    const start = new Date(block.start_date);
    const end = new Date(block.end_date);
    return date >= start && date <= end;
  });
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
  
  // Set up modals
  document.getElementById("closeRescheduleModal").onclick = closeRescheduleModal;
  document.getElementById("cancelReschedule").onclick = closeRescheduleModal;
  document.getElementById("rescheduleForm").onsubmit = handleReschedule;
  
  document.getElementById("closeBlockModal").onclick = closeBlockModal;
  document.getElementById("cancelBlock").onclick = closeBlockModal;
  document.getElementById("addBlockBtn").onclick = () => {
    document.getElementById("blockPeriodId").value = '';
    document.getElementById("blockModalTitle").textContent = 'Add Block Period';
    document.getElementById("submitBlockBtn").textContent = 'Add Block Period';
    const modal = document.getElementById("blockPeriodModal");
    modal.style.display = "flex";
    modal.classList.add("show");
  };
  document.getElementById("blockPeriodForm").onsubmit = handleAddBlock;
  
  // Close modals when clicking outside
  const modals = ['bookingDetailsModal', 'rescheduleModal', 'blockPeriodModal'];
  modals.forEach(modalId => {
    const modal = document.getElementById(modalId);
    modal.onclick = (e) => {
      if (e.target === modal) {
        if (modalId === 'bookingDetailsModal') closeModal();
        if (modalId === 'rescheduleModal') closeRescheduleModal();
        if (modalId === 'blockPeriodModal') closeBlockModal();
      }
    };
  });

  // Initialize tabs
  initTabs();

  // Fetch bookings in real-time
  fetchBookingsRealtime((bookingsByDate) => {
    allBookings = [];
    Object.values(bookingsByDate).forEach(bookings => {
      allBookings.push(...bookings);
    });
    calculateAnalytics();
    generateCalendar(startDate);
  });

  // Fetch blocked periods in real-time
  fetchBlockedPeriodsRealtime((periods) => {
    blockedPeriods = periods;
    renderBlockedPeriods();
    generateCalendar(startDate);
  });

  // Initial calendar generation
  generateCalendar(startDate);
  calculateAnalytics();
}

// Start the dashboard
init().catch(console.error);
