// script.js - Simplified counseling booking logic
import { 
  fetchBookingsRealtime, 
  submitBooking, 
  onAuthStateChanged, 
  getAuthInstance, 
  isAdmin,
  fetchBlockedPeriodsRealtime
} from "./firebase.js";

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

let bookedSlots = {}; // { "YYYY-MM-DD": [ {time, student_name, ...}, ... ] }
let blockedPeriods = [];
let startDate = new Date();
let currentUser = null;

// Check if date is blocked
function isDateBlocked(dateStr) {
  const date = new Date(dateStr);
  return blockedPeriods.some(block => {
    const start = new Date(block.start_date);
    const end = new Date(block.end_date);
    return date >= start && date <= end;
  });
}

// Calendar generation - only show days with available slots
function generateCalendar(start) {
  const calendar = document.getElementById("calendar");
  const weekLabel = document.getElementById("weekLabel");
  if (!calendar || !weekLabel) return;

  calendar.innerHTML = "";

  // Show current week (Monday to Friday)
  let monday = new Date(start);
  monday.setDate(monday.getDate() - monday.getDay() + 1); // Get Monday
  const friday = new Date(monday.getTime() + 4 * 86400000);
  
  // Find Tuesday and Friday in the current week
  const tuesday = new Date(monday.getTime() + 1 * 86400000);
  const fridaySlot = new Date(monday.getTime() + 4 * 86400000);
  
  // Update week label to show the range
  weekLabel.textContent = `${formatDate(monday)} - ${formatDate(friday)}`;

  // Only generate days that have slots (Tuesday = 2, Friday = 5)
  const daysWithSlots = [
    { date: tuesday, dayOfWeek: 2 },
    { date: fridaySlot, dayOfWeek: 5 }
  ];

  daysWithSlots.forEach(({ date, dayOfWeek }) => {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeSlots = timeSlotsByDay[dayOfWeek] || [];

    if (timeSlots.length > 0) {
      const dayDiv = document.createElement("div");
      dayDiv.className = "day";
      dayDiv.innerHTML = `<h3>${formatDate(date)}</h3>`;

      // Add time slots for this day
      timeSlots.forEach(slotTime => {
        const slotDiv = document.createElement("div");
        slotDiv.className = "time-slot";
        
        const isBooked = (bookedSlots[dateStr] || []).some(b => 
          b.time === slotTime && b.status !== 'cancelled'
        );
        
        if (isBooked) {
          const booking = (bookedSlots[dateStr] || []).find(b =>
            b.time === slotTime && b.status !== 'cancelled'
          );
          slotDiv.className = "slot booked";
          slotDiv.innerHTML = `
            <div class="slot-time">${slotTime}</div>
            <div class="slot-status">Booked</div>
            ${currentUser && booking.created_by === currentUser.uid ? 
              `<div class="slot-owner">Your booking</div>` : ''}
          `;
        } else {
          // Check if date is blocked
          const isBlocked = isDateBlocked(dateStr);
          if (isBlocked) {
            slotDiv.className = "slot blocked";
            slotDiv.innerHTML = `
              <div class="slot-time">${slotTime}</div>
              <div class="slot-status">Blocked</div>
            `;
          } else {
            slotDiv.className = "slot available";
            slotDiv.onclick = () => openBookingModal(dateStr, slotTime);
            slotDiv.innerHTML = `
              <div class="slot-time">${slotTime}</div>
              <div class="slot-status">Available</div>
              <div class="slot-action">Click to book</div>
            `;
          }
        }
        
        dayDiv.appendChild(slotDiv);
      });

      calendar.appendChild(dayDiv);
    }
  });
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// Open booking modal
function openBookingModal(date, time) {
  const auth = getAuthInstance();
  if (!auth || !auth.currentUser) {
    alert("Please log in to book a session");
    window.location.href = "login.html";
    return;
  }

  const modal = document.getElementById("bookingModal");
  const bookingDetails = document.getElementById("bookingDetails");
  
  document.getElementById("bookingDate").value = date;
  document.getElementById("bookingTime").value = time;
  
  bookingDetails.innerHTML = `
    <p><strong>Date:</strong> ${new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    <p><strong>Time:</strong> ${time}</p>
  `;

  modal.style.display = "flex";
}

// Close booking modal
function closeBookingModal() {
  document.getElementById("bookingModal").style.display = "none";
  document.getElementById("bookingForm").reset();
}

// Submit booking
async function handleBookingSubmit(e) {
  e.preventDefault();
  
  const auth = await getAuthInstance();
  if (!auth || !auth.currentUser) {
    alert("Please log in to book a session");
    window.location.href = "login.html";
    return;
  }

  const date = document.getElementById("bookingDate").value;
  const time = document.getElementById("bookingTime").value;
  const studentName = document.getElementById("studentName").value.trim();
  const studentId = document.getElementById("studentId").value.trim();
  const reason = document.getElementById("reason").value.trim();

  if (!studentName || !studentId) {
    alert("Please fill in all required fields");
    return;
  }

  // Check if date is blocked
  if (isDateBlocked(date)) {
    alert("This date is blocked. Please select another date.");
    return;
  }

  try {
    const submitBtn = document.getElementById("submitBookingBtn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Booking...";

    await submitBooking({
      date,
      time,
      student_name: studentName,
      student_id: studentId,
      reason: reason || "General counseling"
    });

    alert("Your session has been booked successfully!");
    closeBookingModal();
    // Calendar will update automatically via real-time listener
  } catch (error) {
    alert("Error: " + error.message);
  } finally {
    const submitBtn = document.getElementById("submitBookingBtn");
    submitBtn.disabled = false;
    submitBtn.textContent = "Book Session";
  }
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

// Initialize
async function init() {
  // Set up auth state listener
  onAuthStateChanged(await getAuthInstance(), async (user) => {
    currentUser = user;
    const userEmailEl = document.getElementById("userEmail");
    const loginBtn = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const adminBtn = document.getElementById("adminDashboardBtn");

    if (user) {
      userEmailEl.textContent = user.email;
      userEmailEl.style.display = "inline";
      loginBtn.style.display = "none";
      logoutBtn.style.display = "inline-block";
      
      // Check if admin
      const admin = await isAdmin(user.uid);
      if (admin) {
        adminBtn.style.display = "inline-block";
      } else {
        adminBtn.style.display = "none";
      }
    } else {
      userEmailEl.style.display = "none";
      loginBtn.style.display = "inline-block";
      logoutBtn.style.display = "none";
      adminBtn.style.display = "none";
    }
  });

  // Set up logout
  document.getElementById("logoutBtn").onclick = async () => {
    const { signOut } = await import("./firebase.js");
    await signOut(await getAuthInstance());
    window.location.href = "index.html";
  };

  // Set up booking form
  document.getElementById("bookingForm").onsubmit = handleBookingSubmit;
  document.getElementById("closeModal").onclick = closeBookingModal;
  document.getElementById("cancelBtn").onclick = closeBookingModal;
  document.getElementById("prevWeek").onclick = prevWeek;
  document.getElementById("nextWeek").onclick = nextWeek;
  
  // Close modal when clicking outside
  const modal = document.getElementById("bookingModal");
  modal.onclick = (e) => {
    if (e.target === modal) {
      closeBookingModal();
    }
  };

  // Fetch bookings in real-time
  fetchBookingsRealtime((bookingsByDate) => {
    bookedSlots = bookingsByDate;
    generateCalendar(startDate);
  });

  // Fetch blocked periods in real-time
  fetchBlockedPeriodsRealtime((periods) => {
    blockedPeriods = periods;
    generateCalendar(startDate);
  });

  // Initial calendar generation
  generateCalendar(startDate);

  // Initialize info tabs
  initInfoTabs();
}

// Info tabs functionality
function initInfoTabs() {
  const tabBtns = document.querySelectorAll('.info-tab-btn');
  const sections = document.querySelectorAll('.info-section');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.infoTab;
      
      // Update buttons
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update sections
      sections.forEach(section => {
        section.classList.remove('active');
        if (section.id === targetTab + 'Section') {
          section.classList.add('active');
        }
      });
    });
  });
}

// Start the app
init().catch(console.error);
