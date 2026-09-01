/* ===========================================================
  Patient Dashboard - Main Script
  Handles: data loading, navigation, doctor modal,
      AI triage, appointment booking, and timeline.

  Connected to:
   - php/dashboard_api.php  (data loading)
   - Ai/ai_triage.php    (symptom analysis)
   - Ai/ai_scheduler.php   (availability timeline)
   - php/appointment_handler.php (booking)
  =========================================================== */

const loadingOverlay = document.getElementById("loading-overlay") || { style: {} };
const sidebar = document.getElementById("sidebar");
const mainContent = document.getElementById("mainContent");
const sidebarToggle = document.getElementById("sidebarToggle");
const darkModeToggle = document.getElementById("darkModeToggle");
const darkModeIcon = document.getElementById("darkModeIcon");
const userMenuButton = document.getElementById("userMenuButton");
const userMenu = document.getElementById("userMenu");
let selectedDoctor = null;
let allDoctors = [];
let showAllDoctors = false;
let activityTimerInterval = null;

/* -- Active Ticket Carousel State -- */
let activeTickets = [];
let activeTicketIndex = 0;
let ticketCarouselInterval = null;

/* -- Demographic Icon Utility -- */
window.calculateAge = function(dobString) {
  if (!dobString || typeof dobString !== 'string') return NaN;
  let dob;
  if (dobString.includes('/')) {
    const parts = dobString.split('/');
    if (parts.length === 3) {
      dob = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } else return NaN;
  } else if (dobString.includes('-')) {
    dob = new Date(dobString);
  } else return NaN;
  
  if (isNaN(dob.getTime())) return NaN;

  const today = new Date();
  let numAge = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    numAge--;
  }
  return numAge;
};

/**
 * Returns an object with { icon, label, color } based on strict age brackets and gender.
 */
window.getDemographicIcon = function(age, gender) {
  let numAge;
  if (typeof age === 'number') {
    numAge = age;
  } else {
    numAge = window.calculateAge(age);
    if (isNaN(numAge)) {
      numAge = parseInt(age, 10);
    }
  }
  if (isNaN(numAge) || numAge < 0) numAge = 30; // fallback

  const isMale = !gender || gender.toLowerCase() === 'male' || gender.toLowerCase() === 'other';

  // INFANT: < 3
  if (numAge < 3) {
    return {
   icon: isMale ? 'fa-solid fa-baby text-semantic-cta dark:text-semantic-text' : 'fa-solid fa-baby text-pink-500',
      label: 'Infant',
      colorLight: isMale ? '#3b82f6' : '#ec4899',
      colorDark: isMale ? '#60a5fa' : '#f472b6'
    };
  }
  // CHILD: 3 - 12
  if (numAge>= 3 && numAge < 13) {
    return {
      icon: isMale ? 'fa-solid fa-child' : 'fa-solid fa-child-dress',
      label: isMale ? 'Boy' : 'Girl',
      colorLight: isMale ? '#3b82f6' : '#ec4899',
      colorDark: isMale ? '#60a5fa' : '#f472b6'
    };
  }
  // YOUNG ADULT: 13 - 24
  if (numAge>= 13 && numAge < 25) {
    return {
      icon: 'fa-solid fa-user-graduate',
      label: isMale ? 'Young Adult Male' : 'Young Adult Female',
      colorLight: isMale ? '#6366f1' : '#a855f7',
      colorDark: isMale ? '#818cf8' : '#c084fc'
    };
  }
  // ADULT: 25 - 64
  if (numAge>= 25 && numAge < 65) {
    return {
      icon: isMale ? 'fa-solid fa-person' : 'fa-solid fa-person-dress',
      label: isMale ? 'Man' : 'Woman',
      colorLight: isMale ? '#0ea5e9' : '#f43f5e',
      colorDark: isMale ? '#38bdf8' : '#fb7185'
    };
  }
  // SENIOR: 65+
  return {
    icon: 'fa-solid fa-person-cane',
    label: isMale ? 'Senior Man' : 'Senior Woman',
    colorLight: isMale ? '#78716c' : '#a8a29e',
    colorDark: isMale ? '#a8a29e' : '#d6d3d1'
  };
};

window.updateGlobalAvatars = function(overrideDob = null, overrideGender = null) {
  let dob = overrideDob;
  let gender = overrideGender;
  
  if (dob === null || gender === null) {
    const dobInput = document.getElementById('prof-dob');
    const genderInput = document.getElementById('prof-gender');
    if (dobInput) dob = dobInput.value;
    if (genderInput) gender = genderInput.value;
  }
  
  if (dob === null || gender === null) return;
  
  const demo = window.getDemographicIcon(dob, gender);
  const isDark = document.documentElement.classList.contains('dark');
  const demoColor = isDark ? demo.colorDark : demo.colorLight;
  
  // Primary Profile Display Card
  const avatarContainer = document.getElementById("profile-dynamic-avatar");
  const demoLabel = document.getElementById("profile-display-demo");
  if (avatarContainer && demoLabel) {
    avatarContainer.innerHTML = `<i class="${demo.icon}" style="color: ${demoColor};"></i>`;
    avatarContainer.style.backgroundColor = `${demoColor}20`;
    avatarContainer.style.borderColor = `${demoColor}40`;
    
    let displayAge = '';
    if (dob) {
      let numAge = window.calculateAge(dob);
      if (!isNaN(numAge)) displayAge = numAge + ' yrs';
    }
    demoLabel.textContent = `${demo.label} ${displayAge ? '• ' + displayAge : ''}`;
  }
  
  // Header Avatars
  const headerAvatar = document.getElementById("user-initial-header");
  if (headerAvatar) {
    headerAvatar.innerHTML = `<i class="${demo.icon}" style="color: ${demoColor}; font-size: 14px;"></i>`;
    headerAvatar.style.backgroundColor = `${demoColor}20`;
    headerAvatar.style.borderColor = `${demoColor}40`;
    headerAvatar.classList.add('border-2');
  }
  
  // Sidebar Avatars
  const sidebarAvatar = document.getElementById("user-initial-sidebar");
  if (sidebarAvatar) {
    sidebarAvatar.innerHTML = `<i class="${demo.icon}" style="color: ${demoColor}; font-size: 20px;"></i>`;
    sidebarAvatar.style.backgroundColor = `${demoColor}20`;
    sidebarAvatar.style.borderColor = `${demoColor}40`;
    sidebarAvatar.classList.add('border-2');
  }
};


/* -- 1. Load Dashboard Data on Page Ready -- */

window.addEventListener("DOMContentLoaded", () => {
 if (typeof fetchDashboardData === "function") fetchDashboardData();
 if (typeof loadAvailabilityTimeline === "function") loadAvailabilityTimeline();
});

/* -- 2. UI Logic: Sidebar & Dark Mode -- */
if (sidebarToggle) {
 const mobileOverlay = document.getElementById("mobile-overlay");
 const mobileSidebar = document.getElementById("sidebar-mobile");
 
 sidebarToggle.addEventListener("click", () => {
  if (window.innerWidth < 768) {
   // Mobile behavior: slide in the mobile sidebar
   if (mobileSidebar) {
    mobileSidebar.classList.toggle("-translate-x-full");
    if (mobileOverlay) mobileOverlay.classList.toggle("hidden");
   }
  } else {
   // Desktop behavior: zero-width collapse
   const isClosed = sidebar.classList.toggle("sidebar-closed");
   sidebarToggle.innerHTML = isClosed ? '&#8250;' : '&#8249;';
  }
 });

 // Close mobile sidebar on overlay click
 if (mobileOverlay) {
  mobileOverlay.addEventListener("click", () => {
   if (mobileSidebar) mobileSidebar.classList.add("-translate-x-full");
   mobileOverlay.classList.add("hidden");
  });
 }

 // Hook up mobile sidebar navigation links
 if (mobileSidebar) {
  mobileSidebar.querySelectorAll(".sidebar-link[data-view]").forEach((link) => {
   link.addEventListener("click", (e) => {
    e.preventDefault();
    const view = link.dataset.view;
    if (view) window.showSection(view);
    mobileSidebar.classList.add("-translate-x-full");
    if (mobileOverlay) mobileOverlay.classList.add("hidden");
   });
  });
 }
}

const applyDarkMode = (isDark) => {
 if (isDark) {
  document.documentElement.classList.add("dark");
  if (darkModeIcon) darkModeIcon.setAttribute("name", "sunny-outline");
  localStorage.setItem("darkMode", "enabled");
 } else {
  document.documentElement.classList.remove("dark");
  if (darkModeIcon) darkModeIcon.setAttribute("name", "moon-outline");
  localStorage.setItem("darkMode", "disabled");
 }
 const prefTheme = document.getElementById("pref-theme");
 if (prefTheme) {
   if (localStorage.getItem("darkMode") === "enabled") {
     prefTheme.value = "dark";
   } else if (localStorage.getItem("darkMode") === "disabled") {
     prefTheme.value = "light";
   } else {
     prefTheme.value = "system";
   }
   if (typeof window.updateThemeRadioCards === 'function') {
     window.updateThemeRadioCards(prefTheme.value);
   }
 }
};

if (darkModeToggle) {
 applyDarkMode(localStorage.getItem("darkMode") === "enabled");
 darkModeToggle.addEventListener("click", () =>
  applyDarkMode(!document.documentElement.classList.contains("dark")),
 );
}

if (userMenuButton && userMenu) {
 userMenuButton.addEventListener("click", () =>
  userMenu.classList.toggle("hidden"),
 );
 document.addEventListener("click", (e) => {
  if (!userMenuButton.contains(e.target) && !userMenu.contains(e.target))
   userMenu.classList.add("hidden");
 });
}

window.showSection = function (viewId) {
 const sections = document.querySelectorAll(".content-section");
 const navLinks = document.querySelectorAll(
  ".sidebar-link[data-view], .nav-link[data-view]",
 );

 sections.forEach((s) => s.classList.remove("active"));
 const el = document.getElementById("view-" + viewId);
 if (el) {
  el.classList.add("active");
  // Update URL hash without jumping
  if (window.location.hash !== "#" + viewId) {
    history.replaceState(null, null, "#" + viewId);
  }

  if (typeof AOS !== "undefined") AOS.init({ duration: 800, once: true });
  if (typeof AOS !== "undefined") AOS.refreshHard();

  // Update sidebar active state
  navLinks.forEach((link) => {
   const icon = link.querySelector("ion-icon");
   if (link.dataset.view === viewId) {
    link.classList.add("active", "bg-semantic-cta", "text-white");
    if (icon) icon.classList.add("text-white");
   } else {
    link.classList.remove("active", "bg-semantic-cta", "text-white");
    if (icon) icon.classList.remove("text-white");
   }
  });

  // Toggle Global Ticket Anchor visibility
  const globalTicketAnchor = document.getElementById("global-ticket-anchor");
  if (globalTicketAnchor) {
   if (viewId === "dashboard" || viewId === "appointments") {
    globalTicketAnchor.classList.remove("hidden");
   } else {
    globalTicketAnchor.classList.add("hidden");
   }
  }

  if (viewId === "appointments") {
   loadAvailabilityTimeline();
  }
 }
};

// Initialize Section from Hash or Default
window.addEventListener("DOMContentLoaded", syncViewWithHash);
window.addEventListener("hashchange", syncViewWithHash);
// Fallback to ensure it runs even if DOMContentLoaded was missed
window.addEventListener("load", syncViewWithHash);

function syncViewWithHash() {
 const hash = window.location.hash.substring(1) || "dashboard";
 window.showSection(hash);
}

// Hook up navigation links
document
 .querySelectorAll(".sidebar-link[data-view], .nav-link[data-view]")
 .forEach((link) => {
  link.addEventListener("click", (e) => {
   e.preventDefault();
   const view = link.dataset.view;
   if (view) window.showSection(view);
  });
 });

/* -- 3. Appointment Booking Form -- */
/* -- Shift Status Checker & 10-Min Lockout & Early Access -- */
window.getCurrentActiveShift = function() {
  let now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  
  // Shift 1: 09:00 - 17:00
  // Shift 2: 17:00 - 01:00
  // Shift Handover: 16:50 - 17:00 triggers Shift 2 early
  if (hours === 16 && minutes>= 50) return 2;
  if (hours>= 9 && hours < 17) return 1;
  return 2;
};

window.checkShiftStatus = function() {
  let now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();

  let shiftClosing = false;
  let clinicClosed = false;

  // Shift 2 closes at 01:00, so lockout at 00:50
  if (hours === 0 && minutes>= 50) shiftClosing = true; 
  
  // Clinic is closed from 01:00 to 09:00
  if (hours>= 1 && hours < 9) clinicClosed = true;

  const triageContainer = document.getElementById('triage-buttons');
  const quickApptBtn = document.getElementById('btn-quick-appointment');

  if (clinicClosed) {
    if (quickApptBtn) {
      quickApptBtn.disabled = true;
      quickApptBtn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-semantic-surface');
      quickApptBtn.innerHTML = '⚠️ Clinic Closed';
    }
    if (triageContainer) {
      triageContainer.classList.add('hidden');
    }
  } else if (shiftClosing) {
    if (quickApptBtn) {
      quickApptBtn.disabled = true;
      quickApptBtn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-semantic-surface');
      quickApptBtn.innerHTML = '⚠️ Booking is closed for the day. Please check tomorrow\'s availability.';
    }
    if (triageContainer) {
      triageContainer.classList.add('hidden');
    }
  } else {
    if (quickApptBtn) {
      quickApptBtn.disabled = false;
      quickApptBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-semantic-surface');
      quickApptBtn.innerHTML = '⚡ Quick Appointment (Book Now)';
    }
  }
};
setInterval(window.checkShiftStatus, 30000);
document.addEventListener("DOMContentLoaded", window.checkShiftStatus);

// Live tracking for time slots
setInterval(() => {
  // Refresh Today's Availability timeline
  let docFilter = document.getElementById("availability-doctor-filter");
  if (typeof loadAvailabilityTimeline === "function") {
    loadAvailabilityTimeline(docFilter ? docFilter.value : "");
  }
  
  // Hide past booking slots without fully refreshing form (prevents interrupting user)
  let dateInput = document.getElementById("appointment-date");
  let todayStr = new Date().toISOString().split("T")[0];
  if (dateInput && dateInput.value === todayStr) {
    let currentHour = new Date().getHours();
    document.querySelectorAll(".btn-slot").forEach(btn => {
      let timeText = btn.textContent.split(" - ")[0];
      if (!timeText) return;
      let timeParts = timeText.split(" ");
      if (timeParts.length < 2) return;
      let h = parseInt(timeParts[0].split(":")[0]);
      if (timeParts[1].includes("PM") && h < 12) h += 12;
      if (timeParts[1].includes("AM") && h === 12) h = 0;
      
      let mappedH = h === 0 ? 24 : h;
      let mappedCurrent = currentHour === 0 ? 24 : currentHour;
      
      if (mappedH < mappedCurrent) {
        btn.style.display = "none";
      }
    });
  }
}, 60000);

/* -- 3. Quick Appointment Auto-Ticket Form -- */
window.handleTriageBooking = function(priority) {
  let currentShift = window.getCurrentActiveShift();
  let genMedDocs = allDoctors.filter(d => d.specialization && d.specialization.includes('General Medicine') && !d.is_full && d.shift === currentShift);
  if (genMedDocs.length === 0) genMedDocs = allDoctors.filter(d => !d.is_full && d.shift === currentShift);
  
  let randomDoc = genMedDocs[Math.floor(Math.random() * genMedDocs.length)];
  if (!randomDoc) {
    if(typeof Swal !== 'undefined') Swal.fire('Unavailable', 'No available doctors at the moment.', 'warning');
    return;
  }
  
  if(typeof Swal !== 'undefined') {
    Swal.fire({
      title: 'Generating Ticket...',
      text: `Finding closest slot for ${randomDoc.name}...`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
  }

  let today = new Date().toISOString().split('T')[0];
  let availableSlot;
  fetch(`../Ai/ai_scheduler.php?date=${today}&doctor_id=${randomDoc.id}`)
    .then(res => res.json())
    .then(data => {
      if (data.status !== "success" || !data.timeline) throw new Error("Failed to load availability");
      
      let now = new Date();
      let currentHour = now.getHours();
      availableSlot = data.timeline.find(slot => {
        let slotHour = parseInt(slot.time_24h.split(':')[0]);
        // Map hour 0 to 24 so that it registers as the end of the day for filtering future slots
        let mappedSlotHour = slotHour === 0 ? 24 : slotHour;
        let mappedCurrentHour = currentHour === 0 ? 24 : currentHour;
        return slot.chairs_left> 0 && mappedSlotHour>= mappedCurrentHour;
      });

      if (!availableSlot) {
        availableSlot = data.timeline.find(slot => slot.chairs_left> 0);
      }

      if (!availableSlot) throw new Error("Doctor is fully booked today.");

      var formData = new FormData();
      formData.append("take_ticket", "1");
      formData.append("selected_time", availableSlot.time_24h);
      formData.append("doctor_id", randomDoc.id);
      formData.append("priority", priority);

      return fetch("../php/appointment_handler.php", {
        method: "POST",
        body: formData
      });
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === "success") {
        if(typeof Swal !== 'undefined') {
          Swal.fire({
            title: 'Ticket Generated!',
            text: `Ticket #${data.ticket_number} assigned.`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
        }
        const container = document.querySelector('.active-ticket-container');
        if (container) {
          container.classList.remove('hidden');
          if (document.querySelector('.active-ticket-number')) document.querySelector('.active-ticket-number').textContent = data.ticket_number;
          if (document.querySelector('.active-ticket-date')) document.querySelector('.active-ticket-date').textContent = "Today";
          if (document.querySelector('.active-ticket-time')) document.querySelector('.active-ticket-time').textContent = availableSlot.hour || availableSlot.time_24h;
          if (document.querySelector('.active-ticket-doctor')) document.querySelector('.active-ticket-doctor').textContent = randomDoc.name;
        }
        
        if (typeof fetchDashboardData === "function") fetchDashboardData();
        if (typeof loadAvailabilityTimeline === "function") loadAvailabilityTimeline();

        document.getElementById('triage-buttons').classList.add('hidden');
        document.getElementById('btn-quick-appointment').classList.remove('hidden');
      } else {
        throw new Error(data.message || "Failed to generate ticket.");
      }
    })
    .catch(err => {
      console.error("Triage Error:", err);
      if(typeof Swal !== 'undefined') Swal.fire('Error', err.message, 'error');
    });
};

const btnConfirm = document.getElementById("btn-confirm-book");
if (btnConfirm) {
 btnConfirm.addEventListener("click", function () {
  confirmBooking();
 });
}

const btnToggleDocs = document.getElementById("btn-toggle-doctors");
if (btnToggleDocs) {
 btnToggleDocs.addEventListener("click", function () {
  showAllDoctors = !showAllDoctors;
  renderDoctorsGrid();
  
  // Update button text and icon
  const textEl = document.getElementById("toggle-doctors-text");
  const iconEl = document.getElementById("toggle-doctors-icon");
  if (showAllDoctors) {
   textEl.textContent = "Show Less";
   this.classList.add("active");
  } else {
   textEl.textContent = "See All Doctors";
   this.classList.remove("active");
  }
 });
}

const btnUpdateProfile = document.getElementById("btn-update-profile");
if (btnUpdateProfile) {
 btnUpdateProfile.addEventListener("click", function () {
  const newName = document.getElementById("profile-name").value.trim();
  const newEmail = document.getElementById("profile-email").value.trim();

  if (!newName || !newEmail) {
   Swal.fire("Missing Info", "Please provide both name and email.", "warning");
   return;
  }

  const formData = new FormData();
  formData.append("update_profile", "1");
  formData.append("name", newName);
  formData.append("email", newEmail);

  btnUpdateProfile.disabled = true;
  btnUpdateProfile.innerHTML = '<div class="spinner-sm mx-auto"></div>';

  fetch("../php/dashboard_api.php", {
   method: "POST",
   body: formData,
  })
   .then((res) => res.json())
   .then((data) => {
    btnUpdateProfile.disabled = false;
    btnUpdateProfile.textContent = "Update Profile Settings";

    if (data.status === "success") {
     Swal.fire("Success!", data.message, "success");
     
     // Sync UI Everywhere
     document.getElementById("welcome-name").textContent = newName;
     document.getElementById("header-user-name").textContent = newName;
     document.getElementById("sidebar-user-name").textContent = newName;
     document.getElementById("profile-display-name").textContent = newName;
     
     const initial = newName.charAt(0).toUpperCase();
     document.getElementById("user-initial-header").textContent = initial;
     document.getElementById("user-initial-sidebar").textContent = initial;
     document.getElementById("user-initial-profile").textContent = initial;
    } else {
     Swal.fire("Error", data.message, "error");
    }
   })
   .catch((err) => {
    btnUpdateProfile.disabled = false;
    btnUpdateProfile.textContent = "Update Profile Settings";
    console.error("Profile update error:", err);
    Swal.fire("Error", "A connection error occurred.", "error");
   });
 });
}



function getMockPatientData() {
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return {
    user: {
      name: 'Ali Mohamed',
      initial: 'A',
      email: 'ali.mohamed@example.com'
    },
    profile: {
      first_name: 'Ali',
      last_name: 'Mohamed',
      cpr: '950123456',
      date_of_birth: '1995-04-12',
      gender: 'Male',
      phone: '+973 3312 3456',
      email: 'ali.mohamed@example.com',
      address: 'Building 123, Road 45, Manama, Bahrain',
      blood_type: 'O+',
      emergency_contact_name: 'Sara Mohamed',
      emergency_contact_relation: 'Sister',
      emergency_contact_phone: '+973 3911 2233',
      allergies: 'Penicillin, Peanuts',
      chronic_conditions: 'None',
      preferences: {
        sms_notifications: true,
        email_notifications: true,
        theme_mode: 'system'
      }
    },
    stats: {
      health_status: 'Good',
      upcoming: 2,
      prescriptions: 3
    },
    doctors: [
      { id: 1, name: 'Dr. Fatima Khalid', specialization: 'General Medicine', profile_image: 'doc1.png', image_url: '../image/doc1.png', bio: 'Senior Consultant Physician with 12+ years experience in preventive medicine.', capacity: 16, is_full: false, shift: 1 },
      { id: 2, name: 'Dr. Ahmed Al-Din', specialization: 'General Medicine', profile_image: 'doc2.png', image_url: '../image/doc2.png', bio: 'Specialist in internal health diagnostics and metabolic care.', capacity: 16, is_full: false, shift: 1 },
      { id: 3, name: 'Dr. Mohamed Yousif', specialization: 'Dentistry', profile_image: 'doc3.png', image_url: '../image/doc3.png', bio: 'Dental surgeon specializing in cosmetic dentistry and oral hygiene.', capacity: 16, is_full: false, shift: 1 },
      { id: 4, name: 'Dr. Sara Hassan', specialization: 'ENT Specialist', profile_image: 'doc4.png', image_url: '../image/doc4.png', bio: 'Consultant in otolaryngology, sinus care, and allergy therapies.', capacity: 16, is_full: false, shift: 1 },
      { id: 5, name: 'Dr. Omar Saleh', specialization: 'Ophthalmology', profile_image: 'doc5.png', image_url: '../image/doc5.png', bio: 'Ophthalmic specialist in laser eye corrections and vision wellness.', capacity: 16, is_full: false, shift: 1 }
    ],
    appointments: [
      { appointment_id: 101, date: `${today} 10:30 AM`, raw_date: '2026-03-31 10:30:00', reason: 'Routine Cardiology & Blood Pressure Checkup', priority: 'Urgent', status: 'Accepted', queue_number: 2, ticket_code: 'A-102', wait_time: 8, doctor: 'Dr. Fatima Khalid', cpr: '950123456', blood_type: 'O+', patient_name: 'Ali Mohamed', gender: 'Male', date_of_birth: '1995-04-12', created_at: '2026-03-31 10:15:00' },
      { appointment_id: 102, date: `${tomorrow} 02:00 PM`, raw_date: '2026-04-01 14:00:00', reason: 'Dental Prophylaxis & Routine Examination', priority: 'Standard', status: 'Pending', queue_number: 5, ticket_code: 'B-204', wait_time: 25, doctor: 'Dr. Mohamed Yousif', cpr: '950123456', blood_type: 'O+', patient_name: 'Ali Mohamed', gender: 'Male', date_of_birth: '1995-04-12', created_at: '2026-03-31 09:00:00' }
    ],
    records: [
      { date: 'Mar 25, 2026', type: 'Diagnostic Lab', summary: 'Comprehensive Metabolic Panel (CMP) and Lipid Profile. All markers within optimal thresholds.', doctor: 'Dr. Fatima Khalid' },
      { date: 'Mar 10, 2026', type: 'Dental Checkup', summary: 'Bi-annual dental screening. No signs of gingivitis or caries detected.', doctor: 'Dr. Mohamed Yousif' }
    ],
    prescriptions: [
      { medication: 'Amoxicillin Trihydrate 500mg', dosage: '1 Capsule', frequency: 'Twice Daily (with meals)', duration: '7 days remaining', doctor: 'Dr. Fatima Khalid' },
      { medication: 'Cetirizine HCl 10mg', dosage: '1 Tablet', frequency: 'Once Nightly (as needed)', duration: '30 days remaining', doctor: 'Dr. Sara Hassan' },
      { medication: 'Vitamin D3 50,000 IU', dosage: '1 Capsule', frequency: 'Once Weekly', duration: '4 weeks remaining', doctor: 'Dr. Fatima Khalid' }
    ],
    invoices: [
      { id: 501, subtotal: '85.00', tax: '8.50', total: '93.50', status: 'paid', date: 'Mar 24, 2026', due_date: 'Mar 31, 2026', notes: 'General Medicine consultation & initial diagnostic triage' },
      { id: 502, subtotal: '120.00', tax: '12.00', total: '132.00', status: 'pending', date: today, due_date: 'Apr 14, 2026', notes: 'Dental prophylaxis and specialized radiography' }
    ],
    notifications: [
      { id: 1, sender: 'Reception Desk', topic: 'Upcoming Consultation', message: 'Your appointment with Dr. Fatima Khalid is confirmed for today at 10:30 AM.', is_read: 0, date: `${today} 10:00 AM` },
      { id: 2, sender: 'Laboratory AI', topic: 'Lab Report Uploaded', message: 'Your blood work and diagnostic summary are now available in your Medical Records tab.', is_read: 0, date: 'Mar 25, 2026' }
    ],
    family_members: [
      { member_id: 1, relationship: 'Child', first_name: 'Zain', last_name: 'Mohamed', cpr: '150987654', date_of_birth: '2015-08-20', gender: 'Male', blood_type: 'O+', phone: '+973 3312 3456', email: 'ali.mohamed@example.com' }
    ]
  };
}

/* ---------------------------------------------
   fetchDashboardData()
   Pulls user info, stats, doctors, appointments,
   and timeline from the API.
   --------------------------------------------- */
function fetchDashboardData() {
 fetch("../php/dashboard_api.php")
  .then(function (response) {
   return response.json();
  })
  .then(function (data) {
   const responseData = (data && data.status === "success" && data.data) ? data.data : getMockPatientData();
   renderPatientDashboard(responseData);
  })
  .catch(function (error) {
   console.warn("Using demo visualization data for patient dashboard:", error);
   renderPatientDashboard(getMockPatientData());
  });
}

function renderPatientDashboard(responseData) {
   console.log("Dashboard Data Loaded:", responseData);
   /* -- Helper for safe text assignments -- */
   function setElText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
   }
   function setElValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
   }

   /* -- Populate User Info -- */
   if (responseData.user) {
     setElText("welcome-name", responseData.user.name);
     setElText("header-user-name", responseData.user.name);
     setElText("sidebar-user-name", responseData.user.name);
     setElText("profile-display-name", responseData.user.name);
   }

   setElText("user-initial-header", "");
   setElText("user-initial-sidebar", "");
   /* -- Populate Profile Form -- */
   if (responseData.profile) {
    const p = responseData.profile;
    setElValue("prof-fname", p.first_name);
    setElValue("prof-lname", p.last_name);
    setElValue("prof-cpr", p.cpr);
    setElValue("prof-dob", p.date_of_birth);
    if (p.date_of_birth) {
      const [y, m, d] = p.date_of_birth.split('-');
      if (y && m && d) setElValue("prof-dob-display", `${d}/${m}/${y}`);
    }
    setElValue("prof-gender", p.gender);
    setElValue("prof-blood", p.blood_type);
    setElValue("prof-phone", p.phone);
    setElValue("prof-email", p.email);
    
    setElValue("prof-em-name", p.emergency_contact_name);
    setElValue("prof-em-rel", p.emergency_contact_relation);
    setElValue("prof-em-phone", p.emergency_contact_phone);
    setElValue("prof-allergies", p.allergies);
    setElValue("prof-chronic", p.chronic_conditions);
    
    if (p.preferences) {
      if (document.getElementById("pref-sms")) document.getElementById("pref-sms").checked = p.preferences.sms_notifications;
      if (document.getElementById("pref-email")) document.getElementById("pref-email").checked = p.preferences.email_notifications;
      setElValue("pref-theme", p.preferences.theme_mode || 'system');
    }
    
    // Save initial state for dirty checking
    if (typeof getProfileFormData === 'function') {
      window.initialProfileState = getProfileFormData();
    }
    
    // Update Dynamic Avatars globally
    if (typeof window.updateGlobalAvatars === 'function') {
      window.updateGlobalAvatars(p.date_of_birth, p.gender);
    }
   }

   /* -- Populate Family Members -- */
   if (responseData.family_members && typeof window.renderFamilyMembers === 'function') {
     window.renderFamilyMembers(responseData.family_members);
   }

   /* -- Populate Stat Cards -- */
   if (responseData.stats) {
    setElText("stat-health", responseData.stats.health_status || "Good");
    setElText("stat-upcoming", responseData.stats.upcoming || "0");
    setElText("stat-prescriptions", responseData.stats.prescriptions || "0");

    // Apply color to health status
    const healthEl = document.getElementById("stat-health");
    if (healthEl) {
     if (responseData.stats.health_status === "Critical") {
      healthEl.className =
       "text-2xl font-bold text-red-500 dark:text-red-400";
     } else if (responseData.stats.health_status === "Fair") {
      healthEl.className =
       "text-2xl font-bold text-orange-500 dark:text-orange-400";
     } else {
      healthEl.className =
       "text-2xl font-bold text-semantic-accent dark:text-[var(--color-ink-navy)]";
     }
    }
   }

   /* -- Populate Appointments Table -- */
   var appointmentsBody = document.getElementById("appointments-list");
   if (appointmentsBody && responseData.appointments) {
    appointmentsBody.innerHTML = "";
    
    if (responseData.appointments.length === 0) {
     appointmentsBody.innerHTML =
      '<tr><td colspan="6">No appointments found.</td></tr>';
    } else {
    var allRows = "";
    var pendingCount = 0;
    responseData.appointments.forEach(function (appointment) {
     if (
      appointment.status.toLowerCase() !== "terminated" &&
      appointment.status.toLowerCase() !== "cancelled" &&
      appointment.status.toLowerCase() !== "completed"
     ) {
      pendingCount++;
     }

     // Decide the badge colour based on priority
     var priorityBadge = '<span class="badge badge-green">Standard</span>';
     if (appointment.priority === "Highly Important" || appointment.priority === "Urgent")
      priorityBadge =
       '<span class="badge badge-red">' + appointment.priority + '</span>';
     else if (appointment.priority === "Important" || appointment.priority === "Priority")
      priorityBadge = '<span class="badge badge-orange">' + appointment.priority + '</span>';
     else if (appointment.priority === "Normal" || appointment.priority === "Standard")
      priorityBadge = '<span class="badge badge-green">' + appointment.priority + '</span>';

     allRows +=
      "<tr>" +
      "<td>" +
      '<div class="font-bold text-semantic-text dark:text-semantic-text">' +
      appointment.date +
      "</div>" +
      "</td>" +
      "<td>" +
      appointment.reason +
      "</td>" +
      "<td>" +
      priorityBadge +
      "</td>" +
      "<td>" +
      '<span class="badge badge-blue">' +
      appointment.status +
      "</span>" +
      "</td>" +
      "<td>" +
      '<div class="flex items-center gap-2">' +
   '<div class="h-8 w-8 rounded-lg bg-semantic-cta dark:bg-semantic-brand flex items-center justify-center text-semantic-cta dark:text-semantic-text font-bold">' +
      appointment.ticket_code +
      "</div>" +
      '<span class="text-xs text-semantic-text opacity-70">~' +
      appointment.wait_time +
      "m</span>" +
      "</div>" +
      "</td>" +
      appointment.appointment_type.toLowerCase().includes('telehealth') &&
      ["pending", "accepted", "delayed"].includes(appointment.status.toLowerCase())
     ) {
      allRows +=
       '<a href="../telemed_room.html?appt_id=' + appointment.appointment_id + '&role=patient" class="bg-semantic-cta hover:bg-semantic-ctaHover text-white p-2 rounded-lg transition-colors flex items-center gap-1 text-sm font-bold shadow-sm">' +
       '<ion-icon name="videocam" class="text-lg"></ion-icon> Join Call</a>';
     }

     // Show Terminate button for pending/accepted/delayed appointments
     if (
      ["pending", "accepted", "delayed", "general", "walk-in"].includes(
       appointment.status.toLowerCase(),
      )
     ) {
      allRows +=
       '<button class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors btn-terminate flex items-center gap-1 text-sm font-bold" data-id="' +
       appointment.appointment_id +
       '"><ion-icon name="close-circle-outline" class="text-lg"></ion-icon> Cancel</button>';
     }

     allRows += "</div></td>" + "</tr>";
    });
    appointmentsBody.innerHTML = allRows;
    setElText("stat-upcoming", pendingCount);

    // Add event listeners to terminate buttons
    document.querySelectorAll(".btn-terminate").forEach((btn) => {
     btn.addEventListener("click", function () {
      terminateAppointment(this.getAttribute("data-id"));
     });
    });
   }
  }

   /* -- Populate Recent Activity -- */
   const actContainer = document.getElementById("activity-container");
   if (actContainer) {
    let activityHtml = "";
    const appts = responseData.appointments || [];
    if (appts.length> 0) {
     // Clear any existing intervals
     if (activityTimerInterval) clearInterval(activityTimerInterval);
     
     // Show last 3 active appointments as activity
     appts.slice(0, 3).forEach((appt, index) => {
      const statusColor = "#4caf50";
      const icon = appt.status.toLowerCase() === "terminated" ? "close-outline" : "calendar-outline";
      
      // Generate circular timer HTML if it has a target date and is active
      let timerHtml = "";
      if (appt.raw_date && appt.status.toLowerCase() !== "terminated" && appt.status.toLowerCase() !== "completed") {
        // Ensure date string is compatible with all browsers (replace - with /)
        const dateStr = appt.raw_date.replace(/-/g, "/");
        const targetTime = new Date(dateStr).getTime();
        const now = new Date().getTime();
        const diffMs = targetTime - now;

        if (diffMs> 0) {

          const secsTotal = Math.floor(diffMs / 1000);
          const h = Math.floor(secsTotal / 3600);
          const m = Math.floor((secsTotal % 3600) / 60);
          const s = secsTotal % 60;

          const pad = (n) => n.toString().padStart(2, '0');
          const [h1, h2] = pad(h).split('');
          const [m1, m2] = pad(m).split('');
          const [s1, s2] = pad(s).split('');

          timerHtml = `
            <div class="countdown-wrapper timer-active" id="timer-activity-${index}" data-target="${appt.raw_date}">
              <div class="time-box">
                <span class="time-label">Hours</span>
                <div class="card-container">
                  <div class="digit-card">${h1}</div>
                  <div class="digit-card">${h2}</div>
                </div>
              </div>
              <div class="time-box">
                <span class="time-label">Min</span>
                <div class="card-container">
                  <div class="digit-card">${m1}</div>
                  <div class="digit-card">${m2}</div>
                </div>
              </div>
              <div class="time-box">
                <span class="time-label">Sec</span>
                <div class="card-container">
                  <div class="digit-card">${s1}</div>
                  <div class="digit-card">${s2}</div>
                </div>
              </div>
            </div>
          `;
        }
      }




      activityHtml += `
        <div class="flex items-center gap-4 mb-4 pb-4 border-b border-semantic-border dark:border-semantic-border last:border-0 hover:bg-semantic-surface dark:hover:bg-semantic-surface p-2 rounded-xl transition-all duration-300">
          <div class="h-10 w-10 rounded-full flex items-center justify-center text-lg shadow-inner" style="background:${statusColor}22; color:${statusColor};">
            <ion-icon name="${icon}"></ion-icon>
          </div>
          <div class="flex-grow">
            <div class="text-sm font-bold text-semantic-text dark:text-semantic-text">${appt.status.toLowerCase() === "terminated" ? "Appointment Terminated" : "Ticket: " + appt.ticket_code}</div>
            <div class="text-xs text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80">${appt.date} • ${appt.reason.substring(0, 40)}...</div>
          </div>
          ${timerHtml}
        </div>
      `;
     });
     
     // Start live countdown update (every second)
     activityTimerInterval = setInterval(updateActivityTimers, 1000); 

    } else {
     activityHtml = '<p class="py-4 text-center text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80 italic">No recent activity to show.</p>';
    }
    actContainer.innerHTML = activityHtml;
   }

   /* -- Populate Notifications -- */
   if (responseData.notifications) {
     renderNotifications(responseData.notifications);
   }

   /* -- Populate Billing -- */
   if (responseData.invoices) {
     renderBilling(responseData.invoices);
   }

   /* -- Populate Future Doctors Grid -- */
   if (responseData.doctors) {
     allDoctors = responseData.doctors;
     renderDoctorsGrid();
   }

   /* -- Show Active Ticket Carousel (if any) -- */
   if (responseData.appointments) {
     activeTickets = responseData.appointments.filter(a =>
       a.status.toLowerCase() !== "terminated" &&
       a.status.toLowerCase() !== "cancelled" &&
       a.status.toLowerCase() !== "completed"
     );
     
     let emptyStates = document.querySelectorAll(".active-ticket-empty-state");
     let containers = document.querySelectorAll(".active-ticket-container");

     if (activeTickets.length> 0) {
       activeTicketIndex = 0;
       renderActiveTicket(activeTicketIndex);
       renderCarouselDots();
       
       emptyStates.forEach(e => e.classList.add("hidden"));
       containers.forEach(c => c.classList.remove("hidden"));

       if (typeof resetCarouselTimer === "function") {
         resetCarouselTimer();
       }
     } else {
       emptyStates.forEach(e => e.classList.remove("hidden"));
       containers.forEach(c => c.classList.add("hidden"));
     }
   }
   /* -- Render Medical Records -- */
   if (typeof window.renderMedicalRecords === 'function') window.renderMedicalRecords(responseData.records);
   /* -- Render Prescriptions -- */
   if (typeof window.renderPrescriptions === 'function') window.renderPrescriptions(responseData.prescriptions);
   /* -- Populate Profile Form -- */
   /* -- Populate Profile Form -- */
   // Assuming we add a phone field to the API response later, or use empty for now
   // data.user doesn't have phone in previous API code, let's assume we might need to add it to API
   // or just use what we have. API sends name, email.

   /* -- Hide Loading Overlay -- */
   loadingOverlay.style.display = "none";
}

/**
 * Renders the doctors grid for Future Schedule selection.
 */
function renderDoctorsGrid() {
  const list = document.getElementById("future-doctors-grid");
  if (!list) return;
  list.innerHTML = "";
  
  allDoctors.forEach(function(doctor) {
    const card = document.createElement("div");
    let fullClass = doctor.is_full ? "grayscale opacity-60 pointer-events-none" : "hover:border-semantic-accent cursor-pointer";
    let badgeHtml = doctor.is_full ? `<div class="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center"><span class="text-[7px] font-bold text-white bg-red-600 px-1 py-0.5 rounded uppercase transform -rotate-12 shadow-sm">Fully Booked</span></div>` : "";

    card.className = `doctor-card-mini group animate-fade-in border-2 border-transparent rounded-xl p-2 bg-semantic-surface dark:bg-semantic-surface transition-all text-center ${fullClass}`;
    let gender = (doctor.image_url && doctor.image_url.includes('Female')) ? 'Female' : 'Male';
    card.innerHTML = `
      <div class="relative mb-2 overflow-hidden rounded-full w-12 h-12 mx-auto">
        <img src="${doctor.image_url}" 
           class="w-full h-full object-cover"
           onerror="this.src='../image/default_user.png'">
        ${badgeHtml}
      </div>
      <div class="font-bold text-xs text-semantic-text dark:text-semantic-text truncate">${doctor.name}</div>
      <div class="text-[9px] text-semantic-text opacity-70 font-semibold uppercase tracking-wider">${gender}</div>
   <div class="text-[9px] text-semantic-cta dark:text-semantic-text font-bold uppercase tracking-wider mt-0.5">${doctor.specialization || 'General'}</div>
    `;
    
    if (!doctor.is_full) {
      card.onclick = () => {
        // Remove selection from others
        list.querySelectorAll('.doctor-card-mini').forEach(c => {
          c.classList.remove('border-semantic-accent', 'bg-semantic-surface', 'dark:bg-semantic-brand/20');
          c.classList.add('border-transparent');
        });
        // Add selection to this
        card.classList.remove('border-transparent');
        card.classList.add('border-semantic-accent', 'bg-semantic-surface', 'dark:bg-semantic-brand/20');
        
        // Set values
        document.getElementById("selected-doctor-id").value = doctor.id;
        document.getElementById("display-doc-img").src = doctor.image_url || '../image/default_user.png';
        document.getElementById("display-doc-name").textContent = doctor.name;
        document.getElementById("selected-doctor-display").classList.remove("hidden");
        document.getElementById("selected-doctor-display").classList.add("flex");
        
        // Real-time slot update
        let currentDate = document.getElementById("appointment-date");
        if (currentDate && currentDate.value) {
          loadBookingSlots(currentDate.value, doctor.id);
        }
      };
    }
    list.appendChild(card);
  });
}

// 7-Day Date Grid Replacement
window.toggleNotificationMenu = function(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('notificationMenu');
  if (menu) {
    if (menu.classList.contains('hidden')) {
      menu.classList.remove('hidden');
      setTimeout(() => {
        menu.classList.remove('opacity-0', 'scale-95');
        menu.classList.add('opacity-100', 'scale-100', 'pointer-events-auto');
      }, 10);
    } else {
      menu.classList.remove('opacity-100', 'scale-100', 'pointer-events-auto');
      menu.classList.add('opacity-0', 'scale-95');
      setTimeout(() => {
        menu.classList.add('hidden');
      }, 200);
    }
  }
};

// Close dropdown on outside click
document.addEventListener('click', function(e) {
  const menu = document.getElementById('notificationMenu');
  const btn = document.getElementById('notificationMenuButton');
  if (menu && !menu.classList.contains('hidden') && !menu.contains(e.target) && (!btn || !btn.contains(e.target))) {
    toggleNotificationMenu();
  }
});

window.renderNotifications = function (notifications) {
  const tableBody = document.getElementById("notifications-table-body");
  if (!tableBody) return;

  let html = "";
  let unreadCount = 0;

  /* -- Populate Header Micro-window -- */
  const latestContainer = document.getElementById("latest-notification-container");
  if (latestContainer) {
    if (notifications && notifications.length> 0) {
      const latest = notifications[0];
      const msgPreview = latest.message.length> 60 ? latest.message.substring(0, 60) + '...' : latest.message;
      latestContainer.innerHTML = `
        <p class="text-xs font-bold text-semantic-text dark:text-semantic-text mb-1">${latest.topic || 'Update'}</p>
        <p class="text-[11px] text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80">${msgPreview}</p>
        <p class="text-[9px] text-semantic-text mt-2 text-right">${latest.date || ''}</p>
      `;
      latestContainer.classList.add("cursor-pointer", "hover:bg-semantic-cta", "dark:hover:bg-semantic-surface", "transition-colors");
      latestContainer.onclick = function() {
        handleViewNotification(latest);
        toggleNotificationMenu();
      };
    } else {
      latestContainer.innerHTML = '<p class="text-xs text-semantic-text opacity-70 text-center py-2">No recent notifications</p>';
      latestContainer.onclick = null;
      latestContainer.className = "bg-semantic-surface/50 dark:bg-semantic-surface rounded-xl p-3 border border-semantic-accent/50 dark:border-semantic-border";
    }
  }

  if (!notifications || notifications.length === 0) {
   html = '<div class="py-12 text-center text-semantic-text opacity-70 flex-1 flex items-center justify-center">No notifications yet.</div>';
  } else {
   notifications.forEach((notif) => {
    if (notif.is_read == 0) unreadCount++;
    const msgPreview = notif.message.length> 80 ? notif.message.substring(0, 80) + '...' : notif.message;
    const formattedDate = notif.date ? new Date(notif.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A';
    
    let icon = 'notifications-outline';
    let iconColor = 'text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80';
    let bgIconClass = 'bg-semantic-surface dark:bg-semantic-surface';

    if (notif.topic && notif.topic.toLowerCase().includes('appointment')) {
      icon = 'calendar-outline';
      iconColor = 'text-semantic-accent'; bgIconClass = 'bg-semantic-accent text-[var(--color-ink-navy)] dark:bg-semantic-accent/30';
    } else if (notif.topic && notif.topic.toLowerCase().includes('system')) {
      icon = 'construct-outline';
      iconColor = 'text-purple-500'; bgIconClass = 'bg-purple-100 dark:bg-purple-900/30';
    } else if (notif.topic && notif.topic.toLowerCase().includes('alert')) {
      icon = 'warning-outline';
      iconColor = 'text-red-500'; bgIconClass = 'bg-red-100 dark:bg-red-900/30';
    } else if (notif.topic && notif.topic.toLowerCase().includes('message')) {
      icon = 'chatbubble-ellipses-outline';
   iconColor = 'text-semantic-cta dark:text-semantic-text'; bgIconClass = 'bg-semantic-cta dark:bg-semantic-brand/30';
    } else if (notif.topic && notif.topic.toLowerCase().includes('result') || notif.topic.toLowerCase().includes('lab')) {
      icon = 'flask-outline';
      iconColor = 'text-fuchsia-500'; bgIconClass = 'bg-fuchsia-100 dark:bg-fuchsia-900/30';
    } else if (notif.topic && notif.topic.toLowerCase().includes('prescription') || notif.topic.toLowerCase().includes('medication')) {
      icon = 'medical-outline';
   iconColor = 'text-semantic-cta dark:text-semantic-text'; bgIconClass = 'bg-semantic-cta dark:bg-semantic-brand/30';
    }

    const bgClass = notif.is_read == 0 ? 'bg-semantic-surface/40 dark:bg-semantic-brand/10 hover:bg-semantic-surface dark:hover:bg-semantic-brand/20' : 'hover:bg-semantic-surface dark:hover:bg-semantic-surface';
    const unreadDot = notif.is_read == 0 ? '<div class="w-2.5 h-2.5 bg-semantic-cta rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)] mr-3 flex-shrink-0"></div>' : '<div class="w-2.5 h-2.5 mr-3 flex-shrink-0"></div>';

    const rowHtml = `
      <div id="notif-row-${notif.id}" class="transition-all duration-200 border-b border-semantic-border dark:border-semantic-border/50 flex items-center p-4 cursor-pointer group ${bgClass}" data-notif-id="${notif.id}" onclick='handleViewNotification(${JSON.stringify(notif).replace(/'/g, "&apos;")})'>
        ${unreadDot}
        
        <div class="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${bgIconClass} ${iconColor} mr-4 transition-transform group-hover:scale-110 duration-200">
          <ion-icon name="${icon}" class="text-xl"></ion-icon>
        </div>
        
        <div class="flex-1 min-w-0 pr-4">
          <div class="flex items-center justify-between mb-0.5">
      <p class="text-sm font-bold text-semantic-text dark:text-semantic-text truncate ${notif.is_read == 0 ? 'text-semantic-cta dark:text-semantic-text ' : ''}">
              ${notif.topic || "Alert"}
            </p>
            <p class="text-xs text-semantic-text whitespace-nowrap ml-2">${formattedDate}</p>
          </div>
          <p class="text-sm text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80 truncate ${notif.is_read == 0 ? 'font-medium text-semantic-text dark:text-semantic-text' : ''}">${msgPreview}</p>
        </div>
        
        <div class="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
     <button class="p-2 text-semantic-cta dark:text-semantic-accent hover:bg-semantic-cta dark:hover:bg-semantic-brand/50 rounded-lg transition-colors" title="View Details" onclick="event.stopPropagation(); handleViewNotification(${JSON.stringify(notif).replace(/'/g, "&apos;")})">
            <ion-icon name="eye-outline" class="text-lg"></ion-icon>
          </button>
          <!-- Assuming deleteNotification/markRead exist or will be added -->
        </div>
      </div>
    `;
    html += rowHtml;
   });
  }
  tableBody.innerHTML = html;

  // Update badges
  updateNotifBadges(unreadCount);
}

// Centralized badge updater
function updateNotifBadges(unreadCount) {
  const sidebarBadge = document.getElementById("notif-badge");
  if (sidebarBadge) {
    if (unreadCount> 0) {
      sidebarBadge.textContent = unreadCount;
      sidebarBadge.classList.remove("hidden");
    } else {
      sidebarBadge.classList.add("hidden");
    }
  }

  const headerBadge = document.getElementById("header-notif-badge");
  if (headerBadge) {
    if (unreadCount> 0) {
      headerBadge.classList.remove("hidden");
    } else {
      headerBadge.classList.add("hidden");
    }
  }
}

// Handle View button click - opens modal, marks as read, and instantly updates the UI row
window.handleViewNotification = function(notif) {
  const modal = document.getElementById("notif-modal");
  if (!modal) return;

  // Open the notification modal
  document.getElementById("modal-notif-topic").textContent = notif.topic || 'Notification';
  document.getElementById("modal-notif-message").textContent = notif.message;
  document.getElementById("modal-notif-date").textContent = notif.date;
  
  // Ensure display says 'Admin' if sender contains admin
  const displaySender = (notif.sender && notif.sender.toLowerCase().includes('admin')) ? 'Admin' : (notif.sender_name || notif.sender || 'Admin');
  document.getElementById("modal-notif-sender").textContent = 'From: ' + displaySender;
  
  modal.classList.remove("hidden");

  // If unread, mark as read and instantly update the row + badge
  if (notif.is_read == 0) {
    // Instant UI update: remove bold, background, and "New" badge from this row
    const row = document.getElementById("notif-row-" + notif.id);
    if (row) {
      row.classList.remove("font-bold", "bg-semantic-surface/50", "dark:bg-semantic-brand/10");
      const badge = row.querySelector(".notif-new-badge");
      if (badge) badge.remove();
    }

    // Decrease badge count instantly
    const sidebarBadge = document.getElementById("notif-badge");
    if (sidebarBadge && !sidebarBadge.classList.contains("hidden")) {
      let count = parseInt(sidebarBadge.textContent) || 0;
      count = Math.max(0, count - 1);
      if (count> 0) {
        sidebarBadge.textContent = count;
      } else {
        sidebarBadge.classList.add("hidden");
        const headerBadge = document.getElementById("header-notif-badge");
        if (headerBadge) headerBadge.classList.add("hidden");
      }
    }

    // Send mark-as-read to backend
    markNotificationAsRead(notif.id);
  }
}

/* -- 10. Notification Modal Helpers -- */
window.closeNotifModal = function() {
  const modal = document.getElementById("notif-modal");
  if (modal) modal.classList.add("hidden");
}

window.markNotificationAsRead = function(notifId) {
  const formData = new FormData();
  formData.append("action", "mark_notification_read");
  formData.append("notification_id", notifId);
  
  fetch("../php/dashboard_api.php", {
    method: "POST",
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    // Background refresh to keep data in sync
    if (data.status === "success") {
      fetchDashboardData();
    }
  })
  .catch(error => console.error("Error marking notification read:", error));
}

/* -- 11. Secure Logout -- */
window.handleLogout = function () {
 Swal.fire({
  title: "Confirm Logout",
  text: "Are you sure you want to end your session?",
  icon: "warning",
  showCancelButton: true,
  confirmButtonColor: "#3b82f6",
  cancelButtonColor: "#9ca3af",
  confirmButtonText: "Yes, logout",
 });
};

/* -- 12. Full Calendar Modal Logic -- */
let currentCalendarYear = new Date().getFullYear();
let currentCalendarMonth = new Date().getMonth();

window.openCalendarModal = function() {
  const today = new Date();
  currentCalendarYear = today.getFullYear();
  currentCalendarMonth = today.getMonth();
  renderCalendar();
  document.getElementById("calendar-modal").classList.remove("hidden");
};

window.closeCalendarModal = function() {
  document.getElementById("calendar-modal").classList.add("hidden");
};

window.changeCalendarYear = function(offset) {
  currentCalendarYear += offset;
  renderCalendar();
};

window.changeCalendarMonth = function(offset) {
  currentCalendarMonth += offset;
  if (currentCalendarMonth> 11) {
    currentCalendarMonth = 0;
    currentCalendarYear++;
  } else if (currentCalendarMonth < 0) {
    currentCalendarMonth = 11;
    currentCalendarYear--;
  }
  renderCalendar();
};

function renderCalendar() {
  document.getElementById("calendar-year-display").textContent = currentCalendarYear;
  
  // Render Month 1
  renderMonthGrid("calendar-month-1-grid", "calendar-month-1-name", currentCalendarYear, currentCalendarMonth);
  
  // Render Month 2
  let nextMonth = currentCalendarMonth + 1;
  let nextYear = currentCalendarYear;
  if (nextMonth> 11) {
    nextMonth = 0;
    nextYear++;
  }
  renderMonthGrid("calendar-month-2-grid", "calendar-month-2-name", nextYear, nextMonth);
}

function renderMonthGrid(gridId, nameId, year, month) {
  const grid = document.getElementById(gridId);
  const nameEl = document.getElementById(nameId);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  if(!grid || !nameEl) return;
  
  nameEl.textContent = months[month];
  grid.innerHTML = "";
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  
  for (let i = 0; i < firstDay; i++) {
    grid.appendChild(document.createElement("div"));
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    const dateObj = new Date(year, month, i);
    // Correctly format to local YYYY-MM-DD
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = i;
    btn.className = "p-2 rounded-xl text-sm font-bold transition-all border border-transparent";
    
    if (dateObj.setHours(0,0,0,0) < today.setHours(0,0,0,0)) {
      btn.className += " text-semantic-text dark:text-semantic-text opacity-80 cursor-not-allowed";
      btn.disabled = true;
    } else {
   btn.className += " text-semantic-text opacity-90 dark:text-semantic-text hover:bg-semantic-surface hover:text-semantic-cta dark:text-semantic-accent dark:hover:bg-semantic-brand/30 dark:hover:text-semantic-cta dark:text-semantic-accent";
      btn.onclick = function() {
        selectDateFromCalendar(dateStr, new Date(year, month, i));
      };
    }
    
    grid.appendChild(btn);
  }
}

function selectDateFromCalendar(dateStr, dateObj) {
  closeCalendarModal();
  
  const dateInput = document.getElementById("appointment-date");
  if (dateInput) {
    dateInput.value = dateStr;
    dateInput.dispatchEvent(new Event('change'));
  }
  
  const grid = document.getElementById("date-grid");
  if (!grid) return;
  
  document.querySelectorAll(".date-square-btn").forEach(b => {
    b.classList.remove("border-semantic-accent", "bg-semantic-surface", "dark:bg-semantic-brand/20");
    b.classList.add("border-semantic-border", "dark:border-semantic-border", "bg-semantic-bg", "dark:bg-semantic-surface");
  });
  
  let existingBtn = document.querySelector(`.date-square-btn[data-date="${dateStr}"]`);
  if (existingBtn) {
    existingBtn.classList.remove("border-semantic-border", "dark:border-semantic-border", "bg-semantic-bg", "dark:bg-semantic-surface");
    existingBtn.classList.add("border-semantic-accent", "bg-semantic-surface", "dark:bg-semantic-brand/20");
  } else {
    let btn = document.createElement("button");
    btn.type = "button";
    btn.className = "date-square-btn flex flex-col items-center justify-center py-3 rounded-xl border border-semantic-accent bg-semantic-surface dark:bg-semantic-brand/20 transition-all cursor-pointer";
    btn.dataset.date = dateStr;
    
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    btn.innerHTML = `
      <span class="text-[10px] font-bold text-semantic-text uppercase tracking-wider">${days[dateObj.getDay()]}</span>
      <span class="text-lg font-black text-semantic-text dark:text-semantic-text my-1">${dateObj.getDate()}</span>
      <span class="text-[10px] font-bold text-semantic-text opacity-70">${months[dateObj.getMonth()]}</span>
    `;
    
    btn.onclick = function() {
      document.querySelectorAll(".date-square-btn").forEach(b => {
        b.classList.remove("border-semantic-accent", "bg-semantic-surface", "dark:bg-semantic-brand/20");
        b.classList.add("border-semantic-border", "dark:border-semantic-border", "bg-semantic-bg", "dark:bg-semantic-surface");
      });
      this.classList.remove("border-semantic-border", "dark:border-semantic-border", "bg-semantic-bg", "dark:bg-semantic-surface");
      this.classList.add("border-semantic-accent", "bg-semantic-surface", "dark:bg-semantic-brand/20");
      
      if (dateInput) {
        dateInput.value = this.dataset.date;
        dateInput.dispatchEvent(new Event('change'));
      }
    };
    
    if (grid.children.length>= 7) {
      grid.removeChild(grid.lastChild);
    }
    grid.appendChild(btn);
  }
}

/* ---------------------------------------------
   Profile Form Logic & Validation
   --------------------------------------------- */
