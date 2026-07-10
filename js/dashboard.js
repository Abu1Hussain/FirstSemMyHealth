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

fetchDashboardData();
loadAvailabilityTimeline();

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
   // If not logged in, redirect to login page
   if (data.status === "error" && data.message === "Unauthorized") {
    window.location.href = "../loginReg/login.html";
    return;
   }

   /* -- Extract actual data from wrapper -- */
   if (data.status !== "success") {
    console.error("API returned error:", data.message);
    loadingOverlay.style.display = "none";
    return;
   }

   const responseData = data.data;
   console.log("Dashboard Data Loaded:", responseData); // Helpful debug log
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
   setElText("welcome-name", responseData.user.name);
   setElText("header-user-name", responseData.user.name);
   setElText("sidebar-user-name", responseData.user.name);
   setElText("profile-display-name", responseData.user.name);

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
    window.initialProfileState = getProfileFormData();
    
    // Update Dynamic Avatars globally
    window.updateGlobalAvatars(p.date_of_birth, p.gender);
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
   if (appointmentsBody) {
    appointmentsBody.innerHTML = "";
    
    if (responseData.appointments.length === 0) {
     appointmentsBody.innerHTML =
      '<tr><td colspan="6">No appointments found.</td></tr>';
     setElText("stat-upcoming", "0");
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
      "<td>";

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

     allRows += "</td>" + "</tr>";
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
   var recordsBody = document.getElementById("records-list");
   if (recordsBody && responseData.records) {
    recordsBody.innerHTML = responseData.records.length
     ? responseData.records
       .map((r) => {
         let visual = '';
         let icon = 'document-text';
         let color = 'blue';
         
         if (r.type.includes('Lab')) {
           icon = 'flask'; color = 'purple';
         } else if (r.type.includes('Vital')) {
           icon = 'pulse'; color = 'red';
           const val = Math.floor(Math.random() * 40) + 60; // Mock metric
           visual = `<div class="mt-4"><div class="flex justify-between text-xs mb-1"><span class="font-semibold text-semantic-text opacity-70">Metric Level</span><span class="font-bold">${val}%</span></div><div class="w-full bg-semantic-surface dark:bg-semantic-surface rounded-full h-1.5"><div class="bg-red-500 h-1.5 rounded-full" style="width: ${val}%"></div></div></div>`;
         } else if (r.type.includes('Note')) {
           icon = 'create'; color = 'emerald';
         }

         return `
         <div class="bg-semantic-bg dark:bg-semantic-surface rounded-2xl p-6 border border-semantic-border dark:border-semantic-border shadow-sm hover:shadow-md hover:border-${color}-300 dark:hover:border-${color}-700 transition-all duration-200 group relative flex flex-col h-full">
           <div class="flex justify-between items-start mb-3">
             <div class="bg-${color}-50 text-${color}-600 dark:bg-${color}-900/20 dark:text-${color}-400 p-2.5 rounded-xl transition-colors">
               <ion-icon name="${icon}-outline" class="text-xl"></ion-icon>
             </div>
             <span class="text-xs font-bold text-semantic-text bg-semantic-surface dark:bg-semantic-surface px-2.5 py-1 rounded-full">${r.date}</span>
           </div>
           <h4 class="font-bold text-semantic-text dark:text-semantic-text text-lg mb-1 group-hover:text-${color}-600 dark:group-hover:text-${color}-400 transition-colors">${r.type}</h4>
           <p class="text-sm text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80 line-clamp-2 flex-grow">${r.summary}</p>
           ${visual}
           <div class="mt-5 pt-4 border-t border-semantic-border dark:border-semantic-border/50 flex justify-between items-center">
             <div class="flex items-center gap-2 text-xs font-medium text-semantic-text opacity-80 dark:text-semantic-text dark:opacity-80">
               <ion-icon name="person-circle-outline" class="text-semantic-text text-lg"></ion-icon>
               ${r.doctor}
             </div>
             <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
        <button class="p-1.5 text-semantic-cta dark:text-semantic-accent hover:bg-semantic-surface dark:hover:bg-semantic-brand/20 rounded-lg transition-colors" title="View Details"><ion-icon name="eye-outline"></ion-icon></button>
               <button class="p-1.5 text-semantic-text opacity-80 dark:text-semantic-text dark:opacity-80 hover:bg-semantic-surface dark:hover:bg-semantic-surface rounded-lg transition-colors" title="Download PDF"><ion-icon name="download-outline"></ion-icon></button>
             </div>
           </div>
         </div>`;
       })
       .join("")
     : '<div class="col-span-full py-12 text-center text-semantic-text opacity-70">No records found.</div>';
   }

   /* -- Render Prescriptions -- */
   var prescriptionsBody = document.getElementById("prescriptions-list");
   if (prescriptionsBody && responseData.prescriptions) {
    prescriptionsBody.innerHTML = responseData.prescriptions.length
     ? responseData.prescriptions
       .map((p) => {
         let status = 'Active';
         let statusBg = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400';
     let btnColor = 'bg-semantic-surface text-semantic-cta dark:text-semantic-accent hover:bg-semantic-cta dark:bg-semantic-brand/30 dark:hover:bg-semantic-brand/50';
         let btnText = 'Request Refill';
         let progress = Math.floor(Math.random() * 60) + 20;

         if (p.duration.toLowerCase().includes('completed') || p.duration.includes('0 days')) {
           status = 'Completed'; statusBg = 'bg-semantic-surface text-semantic-text opacity-80 dark:bg-semantic-surface dark:text-semantic-text dark:opacity-80';
           btnText = 'View Details'; progress = 100;
         } else if (progress < 30) {
           status = 'Refill Needed'; statusBg = 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400';
           btnColor = 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-200 dark:shadow-none';
         }

         let timeIcon = p.frequency.toLowerCase().includes('night') ? 'moon' : 'sunny';
         if (p.frequency.toLowerCase().includes('twice')) timeIcon = 'sync';

         return `
         <div class="bg-semantic-bg dark:bg-semantic-surface rounded-2xl p-6 border border-semantic-border dark:border-semantic-border shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden flex flex-col h-full group">
           <div class="flex justify-between items-start mb-5">
             <div>
               <span class="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${statusBg} mb-2">${status}</span>
               <h4 class="font-bold text-semantic-text dark:text-semantic-text text-xl">${p.medication}</h4>
             </div>
             <div class="relative w-12 h-12 flex items-center justify-center">
               <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                 <path class="text-semantic-text dark:text-semantic-text opacity-90" stroke-width="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
         <path class="text-semantic-cta dark:text-semantic-text transition-all duration-1000 ease-out" stroke-dasharray="${progress}, 100" stroke-width="3" stroke-linecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
               </svg>
               <span class="absolute text-[10px] font-bold text-semantic-text opacity-90 dark:text-semantic-text dark:opacity-90">${progress}%</span>
             </div>
           </div>
           
           <div class="grid grid-cols-2 gap-4 mb-5 flex-grow">
             <div class="bg-semantic-surface dark:bg-semantic-surface rounded-xl p-3 flex items-center gap-3">
        <div class="bg-semantic-bg dark:bg-semantic-surface p-1.5 rounded-lg shadow-sm text-semantic-cta dark:text-semantic-accent"><ion-icon name="medical-outline" class="text-lg"></ion-icon></div>
               <div class="min-w-0">
                 <p class="text-[10px] text-semantic-text font-bold uppercase tracking-wider truncate">Dosage</p>
                 <p class="text-sm font-bold text-semantic-text dark:text-semantic-text truncate" title="${p.dosage}">${p.dosage}</p>
               </div>
             </div>
             <div class="bg-semantic-surface dark:bg-semantic-surface rounded-xl p-3 flex items-center gap-3">
               <div class="bg-semantic-bg dark:bg-semantic-surface p-1.5 rounded-lg shadow-sm text-amber-500"><ion-icon name="${timeIcon}-outline" class="text-lg"></ion-icon></div>
               <div class="min-w-0">
                 <p class="text-[10px] text-semantic-text font-bold uppercase tracking-wider truncate">Frequency</p>
                 <p class="text-sm font-bold text-semantic-text dark:text-semantic-text truncate" title="${p.frequency}">${p.frequency}</p>
               </div>
             </div>
           </div>
           
           <div class="flex items-center justify-between pt-4 border-t border-semantic-border dark:border-semantic-border/50">
             <p class="text-xs text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80 truncate max-w-[120px]" title="${p.doctor}">Dr. ${p.doctor}</p>
             <button class="px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${btnColor}">
               ${btnText}
             </button>
           </div>
         </div>`;
       })
       .join("")
     : '<div class="col-span-full py-12 text-center text-semantic-text opacity-70">No prescriptions found.</div>';
   }

   /* -- Populate Profile Form -- */
   // Assuming we add a phone field to the API response later, or use empty for now
   // data.user doesn't have phone in previous API code, let's assume we might need to add it to API
   // or just use what we have. API sends name, email.

   /* -- Hide Loading Overlay -- */
   loadingOverlay.style.display = "none";
  })
  .catch(function (error) {
   console.error("Error fetching dashboard data:", error);
   loadingOverlay.style.display = "none";
  });
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
document.addEventListener("DOMContentLoaded", function() {
  function generateDates() {
    const grid = document.getElementById("date-grid");
    if (!grid) return;
    grid.innerHTML = "";
    const today = new Date();
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    for (let i = 0; i < 7; i++) {
      let d = new Date(today);
      d.setDate(today.getDate() + i);
      let dayName = i === 0 ? "Today" : days[d.getDay()];
      let dateNum = d.getDate();
      let monthName = months[d.getMonth()];
      let fullDate = d.toISOString().split("T")[0];
      
      let btn = document.createElement("button");
      btn.type = "button";
      btn.className = "date-square-btn flex flex-col items-center justify-center py-3 rounded-xl border border-semantic-border dark:border-semantic-border hover:border-semantic-accent bg-semantic-bg dark:bg-semantic-surface transition-all cursor-pointer";
      btn.dataset.date = fullDate;
      
      btn.innerHTML = `
        <span class="text-[10px] font-bold text-semantic-text uppercase tracking-wider">${dayName}</span>
        <span class="text-lg font-black text-semantic-text dark:text-semantic-text my-1">${dateNum}</span>
        <span class="text-[10px] font-bold text-semantic-text opacity-70">${monthName}</span>
      `;
      
      btn.onclick = function() {
        document.querySelectorAll(".date-square-btn").forEach(b => {
          b.classList.remove("border-semantic-accent", "bg-semantic-surface", "dark:bg-semantic-brand/20");
          b.classList.add("border-semantic-border", "dark:border-semantic-border", "bg-semantic-bg", "dark:bg-semantic-surface");
        });
        this.classList.remove("border-semantic-border", "dark:border-semantic-border", "bg-semantic-bg", "dark:bg-semantic-surface");
        this.classList.add("border-semantic-accent", "bg-semantic-surface", "dark:bg-semantic-brand/20");
        
        let dateInput = document.getElementById("appointment-date");
        if (dateInput) {
          dateInput.value = this.dataset.date;
          dateInput.dispatchEvent(new Event('change'));
        }
      };
      
      grid.appendChild(btn);
    }
  }
  
  generateDates();

  const dateInput = document.getElementById("appointment-date");
  if (dateInput) {
    dateInput.addEventListener("change", function(e) {
      const date = e.target.value;
      if(!date) return;
      fetch("../Ai/ai_scheduler.php?date=" + date)
       .then(res => res.json())
       .then(data => {
         if(data.doctors) {
           allDoctors = data.doctors;
           
           // Capacity Exhaustion Visual Effect for Date Grid
           // Mark date as "Sold Out" if all doctors are full
           let allFull = data.doctors.length> 0 && data.doctors.every(d => d.is_full);
           let activeBtn = document.querySelector(`.date-square-btn[data-date='${date}']`);
           if (allFull && activeBtn) {
             activeBtn.classList.add("opacity-50", "pointer-events-none", "grayscale");
             activeBtn.innerHTML += `<div class="absolute bg-red-600 text-white text-[8px] font-bold px-1 py-0.5 rounded uppercase mt-8 transform rotate-12">Full</div>`;
           }

           renderDoctorsGrid();
           // Check if currently selected doctor is now full
           let selectedId = document.getElementById("selected-doctor-id").value;
           if(selectedId) {
             let doc = allDoctors.find(d => d.id == selectedId);
             if(doc && doc.is_full) {
               document.getElementById("selected-doctor-id").value = "";
               document.getElementById("selected-doctor-display").classList.add("hidden");
               document.getElementById("selected-doctor-display").classList.remove("flex");
               if(typeof Swal !== 'undefined') Swal.fire({toast:true, position:'top-end', icon:'warning', title:'Selected doctor is fully booked on this date.', showConfirmButton:false, timer:3000});
             }
           }
         }
         
         // Auto-load slots
         let selectedId = document.getElementById("selected-doctor-id").value;
         loadBookingSlots(date, selectedId);
       });
    });
  }
});

/**
 * Updates the circular countdown timers in the activity container.
 */
function updateActivityTimers() {
  const timers = document.querySelectorAll(".countdown-wrapper.timer-active[data-target]");
  if (timers.length === 0) {
    if (activityTimerInterval) {
      clearInterval(activityTimerInterval);
      activityTimerInterval = null;
    }
    return;
  }

  const now = new Date().getTime();
  
  timers.forEach(timer => {
    const targetStr = timer.getAttribute("data-target");
    const normalizedTarget = targetStr.replace(/-/g, "/");
    const targetTime = new Date(normalizedTarget).getTime();
    const diffMs = targetTime - now;
    
    if (diffMs <= 0) {
      timer.classList.remove("timer-active");
      timer.innerHTML = `
        <div class="flex flex-col items-center justify-center bg-semantic-accent dark:bg-semantic-accent/20 px-4 py-2 rounded-xl border border-green-100 dark:border-green-800">
          <span class="text-semantic-accent dark:text-[var(--color-ink-navy)] font-black text-lg">✔</span>
          <span class="text-[8px] font-bold text-semantic-accent uppercase">Ready</span>
        </div>
      `;
      setTimeout(fetchDashboardData, 3000);
      return;
    }

    const secsTotal = Math.floor(diffMs / 1000);
    const h = Math.floor(secsTotal / 3600);
    const m = Math.floor((secsTotal % 3600) / 60);
    const s = secsTotal % 60;

    const pad = (n) => n.toString().padStart(2, '0');
    const hStr = pad(h);
    const mStr = pad(m);
    const sStr = pad(s);

    // Update cards
    const boxes = timer.querySelectorAll(".time-box");
    if (boxes.length === 3) {
      const updateCards = (box, val) => {
        const cards = box.querySelectorAll(".digit-card");
        if (cards.length === 2) {
          cards[0].textContent = val[0];
          cards[1].textContent = val[1];
        }
      };
      updateCards(boxes[0], hStr);
      updateCards(boxes[1], mStr);
      updateCards(boxes[2], sStr);
    }
  });
}



/* ---------------------------------------------
   Active Ticket Carousel Helpers
   --------------------------------------------- */
function renderActiveTicket(index) {
  if (!activeTickets[index]) return;
  const t = activeTickets[index];
  
  document.querySelectorAll(".active-ticket-number").forEach(el => el.textContent = t.ticket_code || "#--");
  document.querySelectorAll(".active-ticket-date").forEach(el => el.textContent = t.date || "--");
  document.querySelectorAll(".active-ticket-time").forEach(el => el.textContent = t.wait_time ? "~" + t.wait_time + " min wait" : "--");
  document.querySelectorAll(".active-ticket-doctor").forEach(el => el.textContent = t.doctor || "General Practitioner");
  
  document.querySelectorAll(".active-ticket-priority").forEach(el => {
    let prio = t.priority || "Standard";
    el.textContent = prio;
    el.className = "active-ticket-priority inline-block mt-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full";
    if (prio === "Urgent" || prio === "Emergency") {
      el.classList.add("bg-red-100", "text-red-700", "dark:bg-red-900/40", "dark:text-red-400");
    } else if (prio === "Priority") {
      el.classList.add("bg-orange-100", "text-orange-700", "dark:bg-orange-900/40", "dark:text-orange-400");
    } else {
      el.classList.add("bg-semantic-accent text-[var(--color-ink-navy)]", "text-[var(--color-ink-navy)]", "dark:bg-semantic-accent/40", "dark:text-[var(--color-ink-navy)]");
    }
  });
}

function renderCarouselDots() {
  const dotsContainers = document.querySelectorAll(".ticket-carousel-dots");
  const prevBtns = document.querySelectorAll(".ticket-prev-btn");
  const nextBtns = document.querySelectorAll(".ticket-next-btn");
  
  if (activeTickets.length <= 1) {
    dotsContainers.forEach(c => c.innerHTML = "");
    prevBtns.forEach(btn => btn.classList.add("hidden"));
    nextBtns.forEach(btn => btn.classList.add("hidden"));
    return;
  }
  
  prevBtns.forEach(btn => btn.classList.remove("hidden"));
  nextBtns.forEach(btn => btn.classList.remove("hidden"));
  
  const dotsHtml = activeTickets.map((_, i) =>
    `<span class="inline-block w-2 h-2 rounded-full transition-all duration-300 ${i === activeTicketIndex ? 'bg-semantic-cta scale-125' : 'bg-semantic-cta dark:bg-semantic-surface'}"></span>`
  ).join("");
  
  dotsContainers.forEach(c => c.innerHTML = dotsHtml);
}

function resetCarouselTimer() {
  if (ticketCarouselInterval) clearInterval(ticketCarouselInterval);
  if (activeTickets.length> 1) {
    ticketCarouselInterval = setInterval(() => {
      if (typeof window.nextActiveTicket === "function") {
        window.nextActiveTicket();
      }
    }, 5000);
  }
}

window.prevActiveTicket = function() {
  if (activeTickets.length <= 1) return;
  activeTicketIndex = (activeTicketIndex - 1 + activeTickets.length) % activeTickets.length;
  updateActiveTicketDOM();
  resetCarouselTimer();
};

window.nextActiveTicket = function() {
  if (activeTickets.length <= 1) return;
  activeTicketIndex = (activeTicketIndex + 1) % activeTickets.length;
  updateActiveTicketDOM();
  resetCarouselTimer();
};

function updateActiveTicketDOM() {
  const slideAreas = document.querySelectorAll(".ticket-slide-area");
  slideAreas.forEach(area => area.style.opacity = "0");
  setTimeout(() => {
    renderActiveTicket(activeTicketIndex);
    renderCarouselDots();
    slideAreas.forEach(area => area.style.opacity = "1");
  }, 300);
}

// Swipe Support for Ticket Container
document.addEventListener("DOMContentLoaded", () => {
  const ticketContainers = document.querySelectorAll(".active-ticket-container");
  ticketContainers.forEach(container => {
    let touchstartX = 0;
    let touchendX = 0;
    container.addEventListener('touchstart', e => {
      touchstartX = e.changedTouches[0].screenX;
    }, { passive: true });
    container.addEventListener('touchend', e => {
      touchendX = e.changedTouches[0].screenX;
      if (touchendX < touchstartX - 30) {
        window.nextActiveTicket();
      } else if (touchendX> touchstartX + 30) {
        window.prevActiveTicket();
      }
    }, { passive: true });
  });
});

window.cancelActiveTicket = function() {
  if (!activeTickets[activeTicketIndex]) return;
  const t = activeTickets[activeTicketIndex];
  
  // Detect current theme
  const isDark = document.documentElement.classList.contains('dark');
  const popupBg = isDark ? '#1f2937' : '#ffffff';
  const textColor = isDark ? '#f9fafb' : '#111827';
  const backdrop = isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.45)';

  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: 'Cancel Appointment?',
      text: `Are you sure you want to cancel your appointment with ${t.doctor}? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, cancel it!',
      background: popupBg,
      color: textColor,
      backdrop: backdrop,
      customClass: { popup: 'rounded-2xl' }
    }).then((result) => {
      if (result.isConfirmed) {
        const formData = new FormData();
        formData.append('terminate_appointment', '1');
        formData.append('appointment_id', t.appointment_id);
        
        fetch('../php/appointment_handler.php', {
          method: 'POST',
          body: formData
        })
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') {
            Swal.fire({
              title: 'Cancelled!',
              text: 'Your appointment has been successfully cancelled.',
              icon: 'success',
              background: popupBg,
              color: textColor,
              backdrop: backdrop,
              customClass: { popup: 'rounded-2xl' }
            });
            if (activeTickets.length === 1) {
              document.querySelectorAll(".active-ticket-container").forEach(c => c.classList.add("hidden"));
            }
            fetchDashboardData();
          } else {
            Swal.fire({ title: 'Error', text: data.message || 'Failed to cancel appointment.', icon: 'error', background: popupBg, color: textColor, backdrop: backdrop });
          }
        })
        .catch(err => {
          console.error("Cancellation Error:", err);
          Swal.fire({ title: 'Error', text: 'An unexpected error occurred.', icon: 'error', background: popupBg, color: textColor, backdrop: backdrop });
        });
      }
    });
  }
};

window.openTicketDetailModal = function() {
  if (!activeTickets[activeTicketIndex]) return;
  const t = activeTickets[activeTicketIndex];
  const bookedAt = t.created_at ? new Date(t.created_at.replace(/-/g, "/")).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "N/A";

  // Detect current theme
  const isDark = document.documentElement.classList.contains('dark');

  // Theme-aware color tokens
  const theme = {
    popupBg:    isDark ? '#1f2937' : '#ffffff',
    popupBorder:  isDark ? '#374151' : '#e5e7eb',
    textPrimary:  isDark ? '#f9fafb' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    textMuted:   isDark ? '#d1d5db' : '#374151',
    divider:    isDark ? '#374151' : '#e5e7eb',
    timestampBg:  isDark ? '#111827' : '#f3f4f6',
    btnBg:     isDark ? '#4338ca' : '#4f46e5',
    btnHoverBg:  isDark ? '#4f46e5' : '#4338ca',
    backdrop:   isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.45)',
  };

  let prioName = t.priority || "Standard";
  let prioColor = theme.textPrimary;
  if (prioName === "Urgent" || prioName === "Emergency") prioColor = "#ef4444";
  else if (prioName === "Priority") prioColor = "#f97316";
  else prioColor = "#22c55e";

  // Demographic icon
  const demo = getDemographicIcon(t.date_of_birth || null, t.gender || 'Other');
  const demoColor = isDark ? demo.colorDark : demo.colorLight;

  // Calculate display age
  let displayAge = '';
  if (t.date_of_birth) {
    const dob = new Date(t.date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const md = today.getMonth() - dob.getMonth();
    if (md < 0 || (md === 0 && today.getDate() < dob.getDate())) age--;
    displayAge = age + ' yrs';
  }

  Swal.fire({
    title: '',
    html: `
      <div style="text-align:left; font-family:'Inter',sans-serif; padding:10px;">
        <div style="text-align:center; margin-bottom:24px;">
          <span style="font-size:4rem; font-weight:900; background:linear-gradient(135deg,#4f46e5,#818cf8); -webkit-background-clip:text; -webkit-text-fill-color:transparent; line-height:1;">${t.ticket_code || '#--'}</span>
          <p style="font-size:13px; color:${theme.textSecondary}; text-transform:uppercase; letter-spacing:3px; margin-top:8px; font-weight:600;">Active Ticket ID</p>
        </div>
        <hr style="border-color:${theme.divider}; margin:20px 0;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px;">
          <div>
            <p style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:${theme.textSecondary}; margin-bottom:4px; font-weight:600;">Patient Name</p>
            <div style="display:flex; align-items:center; gap:10px;">
              <i class="${demo.icon}" style="font-size:24px; color:${demoColor};"></i>
              <p style="font-size:18px; font-weight:700; color:${theme.textPrimary}; margin:0;">${t.patient_name || 'N/A'}</p>
            </div>
          </div>
          <div>
            <p style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:${theme.textSecondary}; margin-bottom:4px; font-weight:600;">Demographic</p>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:10px; background:${demoColor}15; border:1px solid ${demoColor}30;">
                <i class="${demo.icon}" style="font-size:14px; color:${demoColor};"></i>
              </span>
              <div>
                <p style="font-size:14px; font-weight:700; color:${theme.textPrimary}; margin:0;">${demo.label}</p>
                <p style="font-size:11px; color:${theme.textSecondary}; margin:0;">${(t.gender || 'N/A')}${displayAge ? ' · ' + displayAge : ''}</p>
              </div>
            </div>
          </div>
          <div>
            <p style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:${theme.textSecondary}; margin-bottom:4px; font-weight:600;">CPR (ID)</p>
            <p style="font-size:18px; font-weight:700; font-family:monospace; color:${theme.textPrimary};">${t.cpr || 'N/A'}</p>
          </div>
          <div>
            <p style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:${theme.textSecondary}; margin-bottom:4px; font-weight:600;">Priority Level</p>
            <p style="font-size:18px; font-weight:800; color:${prioColor};">${prioName}</p>
          </div>
          <div>
            <p style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:${theme.textSecondary}; margin-bottom:4px; font-weight:600;">Blood Type</p>
            <p style="font-size:18px; font-weight:800; color:#ef4444;">${t.blood_type || 'N/A'}</p>
          </div>
          <div>
            <p style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:${theme.textSecondary}; margin-bottom:4px; font-weight:600;">Doctor</p>
            <p style="font-size:18px; font-weight:700; color:${theme.textPrimary};">${t.doctor || 'General Practitioner'}</p>
          </div>
          <div style="grid-column: span 2; background:${theme.timestampBg}; padding:16px; border-radius:12px;">
            <p style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:${theme.textSecondary}; margin-bottom:4px; font-weight:600;">Booking Timestamp</p>
            <p style="font-size:16px; font-weight:600; color:${theme.textMuted};">${bookedAt}</p>
          </div>
        </div>
      </div>
    `,
    showConfirmButton: true,
    confirmButtonText: 'Close Window',
    confirmButtonColor: theme.btnBg,
    width: 580,
    background: theme.popupBg,
    color: theme.textPrimary,
    backdrop: theme.backdrop,
    customClass: { popup: 'rounded-3xl shadow-2xl' }
  });
};

/* ---------------------------------------------
   loadAvailabilityTimeline(doctorId)
   Calls the AI Scheduler to get today's hourly
   chair availability and renders the timeline.
   Connected to: 📊 Today's Availability
   --------------------------------------------- */
function loadAvailabilityTimeline(doctorId = "") {
 var today = new Date().toISOString().split("T")[0];
 var url = "../Ai/ai_scheduler.php?date=" + today;

 if (doctorId) {
  url += "&doctor_id=" + doctorId;
 }

 fetch(url)
  .then(function (response) {
   return response.json();
  })
  .then(function (data) {
   if (data.status !== "success") return;

   var timelineContainer = document.getElementById("daily-timeline");
   if (!timelineContainer) return;

   timelineContainer.innerHTML = "";
   var timelineHtml = "";

   let now = new Date();
   let currentHour = now.getHours();

   data.timeline.forEach(function (slot) {
    // Time validation for past slots
    let slotHour = parseInt(slot.time_24h.split(':')[0]);
    let mappedSlotHour = slotHour === 0 ? 24 : slotHour;
    let mappedCurrentHour = currentHour === 0 ? 24 : currentHour;
    
    if (mappedSlotHour < mappedCurrentHour) return;

    // Slot chairs are determined by ai_scheduler now (4 per active GP), we can use the server's response.
    // We do not override it here unless we have to.
    var isFull = slot.chairs_left <= 0;
    var badgeClass = isFull
     ? "badge-full"
     : slot.status === "Almost Full"
      ? "badge-limited"
      : "badge-available";
    var chairIcon = isFull ? "🚫" : "🪑";
    var clickableStyle = isFull
     ? "opacity: 0.6; cursor: not-allowed;"
     : "cursor: pointer;";
    var clickHandler = isFull
     ? `Swal.fire('Slot Full', 'Please choose another time.', 'info')`
     : `overrideTodayManualSelection('${slot.time_24h}', '${slot.hour}', this)`;

    timelineHtml += `
      <div class="timeline-hour flex flex-col items-center justify-center min-w-[120px] p-4 border border-semantic-border dark:border-semantic-border bg-semantic-bg dark:bg-semantic-surface rounded-2xl shadow-sm hover:border-semantic-accent transition-all ${isFull ? "opacity-60 grayscale" : ""} relative" 
         style="${clickableStyle}" onclick="${clickHandler}">
        <div class="text-xs font-bold text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80 mb-2 ${isFull ? 'line-through' : ''}">${slot.hour}</div>
        <div class="badge ${badgeClass} text-[10px] w-full flex justify-center py-1">
          <span class="mr-1">${chairIcon}</span>
          <span>${slot.chairs_left} Left</span>
        </div>
        ${isFull ? '<div class="absolute top-1 right-1 bg-red-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">FULL</div>' : ''}
      </div>`;
   });

   timelineContainer.innerHTML = timelineHtml;
  })
  .catch(function (error) {
   console.error("Error loading availability:", error);
  });
}

/* -- Filter Availability by Doctor -- */
var doctorFilter = document.getElementById("availability-doctor-filter");
if (doctorFilter) {
 doctorFilter.addEventListener("change", function () {
  loadAvailabilityTimeline(this.value);
 });
}

 /* ---------------------------------------------
   Doctor Profile Modal
   Shows doctor details and lets users book.
   --------------------------------------------- */
window.closeDoctorModal = function () {
 document.getElementById("doctor-modal").classList.add("hidden");
};

function openDoctorModal(doctor) {
 selectedDoctor = doctor;

 document.getElementById("modal-doc-img").src = doctor.image_url;
 document.getElementById("modal-doc-name").textContent = doctor.name;
 document.getElementById("modal-doc-spec").textContent = doctor.specialization;
 document.getElementById("modal-doc-bio").textContent =
  doctor.bio || "No biography available.";
 document.getElementById("modal-doc-capacity").textContent = doctor.capacity;

 const modal = document.getElementById("doctor-modal");
 modal.classList.remove("hidden");
 if (typeof AOS !== "undefined") AOS.refreshHard();
}

/* -- "Book Appointment" inside modal -- */
document.getElementById("btn-book-doc").onclick = function () {
 if (!selectedDoctor) return;

 // Fill the hidden input with the doctor's ID
 document.getElementById("selected-doctor-id").value = selectedDoctor.id;

 // Show the selected-doctor display strip
 document.getElementById("display-doc-img").src = selectedDoctor.image_url;
 document.getElementById("display-doc-name").textContent = selectedDoctor.name;
 document.getElementById("selected-doctor-display").classList.remove("hidden");
 document.getElementById("selected-doctor-display").classList.add("flex");

 // Scroll down to the booking form
 document
  .getElementById("appointmentForm")
  .scrollIntoView({ behavior: "smooth" });

 // Close the modal
 window.closeDoctorModal();
};

/* -- "Change" doctor link -- */
document.getElementById("change-doc-btn").onclick = function () {
 document.getElementById("selected-doctor-id").value = "";
 document.getElementById("selected-doctor-display").classList.add("hidden");
 document.getElementById("selected-doctor-display").classList.remove("flex");
 selectedDoctor = null;
};

/* ---------------------------------------------
   Centralized Doctor Schedules
   Defines the working days (0=Sun, 1=Mon...6=Sat) and shifts for dynamic slot generation
   --------------------------------------------- */
window.doctorSchedules = {
  default: {
    workingDays: [1, 2, 3, 4, 5], // Monday - Friday
    shifts: [
      { start: "09:00", end: "17:00" } // Standard Clinic Hours
    ],
    groupLabel: "Standard Default"
  },
  // SHIFT 1 — Morning/Afternoon Group (doc1 to doc5)
  shift1: {
    workingDays: [1, 2, 3, 4, 5],
    shifts: [
      { start: "09:00", end: "17:00" }
    ],
    groupLabel: "Shift 1 (Daytime)"
  },
  // SHIFT 2 — Evening/Overnight Group (doc6 to doc10)
  shift2: {
    workingDays: [1, 2, 3, 4, 5],
    shifts: [
      { start: "17:00", end: "01:00" }
    ],
    groupLabel: "Shift 2 (Overnight)"
  }
};

/* ---------------------------------------------
   loadBookingSlots(date, doctorId)
   Generates interactive time slots dynamically based on the doctor's specific centralized schedule.
   --------------------------------------------- */
function loadBookingSlots(date, doctorId) {
  var section = document.getElementById("time-slot-section");
  var container = document.getElementById("time-slots-container");
  
  if (!section || !container) return;
  
  // Purge the container to prevent any stale shifts from persisting
  container.innerHTML = "";
  
  section.style.display = "block";
  section.classList.remove("hidden");
  document.getElementById("btn-confirm-book").style.display = "none";
  document.getElementById("btn-confirm-book").classList.add("hidden");
  document.getElementById("selected-time-slot").value = "";

  if (!date) return;

  let targetDate = new Date(date);
  if (isNaN(targetDate.getTime())) return;
  
  let dayOfWeek = targetDate.getDay(); // 0-6
  
  // Determine the Doctor's Shift Group based on ID ranges
  let schedule = window.doctorSchedules.default;
  let docNumMatch = doctorId ? doctorId.toString().match(/\d+/) : null;
  if (docNumMatch) {
    let docNum = parseInt(docNumMatch[0], 10);
    if (docNum>= 1 && docNum <= 5) {
      schedule = window.doctorSchedules.shift1;
    } else if (docNum>= 6 && docNum <= 10) {
      schedule = window.doctorSchedules.shift2;
    }
  }

  if (!schedule.workingDays.includes(dayOfWeek)) {
    container.innerHTML = '<p class="text-sm text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80 py-4 col-span-full">No available working hours for this date.</p>';
    return;
  }

  let todayStr = new Date().toISOString().split("T")[0];
  let isToday = (date === todayStr);
  let now = new Date();
  let currentHour = now.getHours();
  let currentMinute = now.getMinutes();

  let slots = [];
  let shiftRangeDisplays = [];

  // Helper to format HH and MM to "hh:mm A"
  function formatTimeAMPM(h, m) {
    let ampm = h>= 12 ? "PM" : "AM";
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return h12.toString().padStart(2, "0") + ":" + m.toString().padStart(2, "0") + " " + ampm;
  }

  schedule.shifts.forEach(shift => {
    shiftRangeDisplays.push(`${shift.start} to ${shift.end}`);
    let [startH, startM] = shift.start.split(":").map(Number);
    let [endH, endM] = shift.end.split(":").map(Number);
    
    let startTotalMins = startH * 60 + startM;
    let endTotalMins = endH * 60 + endM;
    
    // Handle Overnight Cross-over Logic
    if (endTotalMins <= startTotalMins) {
      endTotalMins += 24 * 60; // Add 1440 mins to span securely past midnight
    }

    let slotDuration = 30; // 30 min intervals

    for (let m = startTotalMins; m < endTotalMins; m += slotDuration) {
      let actualM = m % (24 * 60); // Modulo wraps it securely within a 24-hour cycle
      let slotH = Math.floor(actualM / 60);
      let slotM = actualM % 60;
      
      // Filter past slots if the selected date is today
      if (isToday) {
        let currentTotalMins = currentHour * 60 + currentMinute;
        if (m < currentTotalMins) {
          continue; // Skip past times securely without failing on tomorrow's early morning hours
        }
      }

      let nextTotalMins = (m + slotDuration);
      let nextActualM = nextTotalMins % (24 * 60);
      let nextH = Math.floor(nextActualM / 60);
      let nextM = nextActualM % 60;

      let slotStr24 = slotH.toString().padStart(2, "0") + ":" + slotM.toString().padStart(2, "0");
      let label = formatTimeAMPM(slotH, slotM) + " - " + formatTimeAMPM(nextH, nextM);

      slots.push({
        label: label,
        timeDB: slotStr24 + ":00" // Formatted for the database backend
      });
    }
  });

  // Output Debug Logs exactly as requested
  console.log("Selected Provider:", doctorId || "None");
  console.log("Assigned Shift Group:", schedule.groupLabel);
  console.log("Generated Time Range:", shiftRangeDisplays.join(" | "));

  if (slots.length === 0) {
    container.innerHTML = '<p class="text-sm text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80 py-4 col-span-full">No available working hours for this date.</p>';
    return;
  }

  slots.forEach(slot => {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-slot px-4 py-3 border border-semantic-border dark:border-semantic-border bg-semantic-bg dark:bg-semantic-surface text-semantic-text dark:text-semantic-text rounded-xl cursor-pointer font-medium text-sm transition-all hover:border-semantic-accent dark:hover:border-semantic-accent";
    btn.textContent = slot.label;

    btn.onclick = function () {
      // Deselect others
      document.querySelectorAll(".btn-slot").forEach((b) => {
    b.classList.remove("slot-selected", "border-semantic-accent", "bg-semantic-surface", "dark:border-semantic-accent", "dark:bg-semantic-brand/30", "text-semantic-cta dark:text-semantic-text", "");
      });
      // Select this
   btn.classList.add("slot-selected", "border-semantic-accent", "bg-semantic-surface", "dark:border-semantic-accent", "dark:bg-semantic-brand/30", "text-semantic-cta dark:text-semantic-accent", "");

      document.getElementById("selected-time-slot").value = slot.timeDB;
      document.getElementById("btn-confirm-book").style.display = "block";
      document.getElementById("btn-confirm-book").classList.remove("hidden");
    };

    container.appendChild(btn);
  });

  // Scroll smoothly to time slots
  section.scrollIntoView({ behavior: "smooth" });
}

/* ---------------------------------------------
   confirmBooking()
   Final step: submit everything
   --------------------------------------------- */
function confirmBooking() {
 var appointmentDate = document.getElementById("appointment-date").value;
 var doctorIdInput = document.getElementById("selected-doctor-id").value;
 var selectedTime = document.getElementById("selected-time-slot").value;
 var fileInput = document.getElementById("document");

 if (!selectedTime) {
  if (typeof Swal !== 'undefined') { Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Please select a time slot', showConfirmButton: false, timer: 2500 }); } else { alert("Please select a time slot."); }
  return;
 }

 bookAppointment(
  "", // reasonText removed
  appointmentDate,
  doctorIdInput,
  fileInput,
  selectedTime,
 );
}

/* -- AI Display Logic removed per refactor -- */

/* ---------------------------------------------
   bookAppointment()
   Sends the booking form to the server and
   shows success / error feedback.
   --------------------------------------------- */
function bookAppointment(
 reasonText,
 appointmentDate,
 doctorIdInput,
 fileInput,
 selectedTime,
) {
 var formData = new FormData();
 formData.append("book_appointment", "1");
 formData.append("reason", reasonText);
 formData.append("date", appointmentDate);

 if (selectedTime) {
  formData.append("selected_time", selectedTime);
 }

 if (doctorIdInput) {
  formData.append("doctor_id", doctorIdInput);
 }

 if (fileInput && fileInput.files && fileInput.files.length> 0) {
  formData.append("document", fileInput.files[0]);
 }

 fetch("../php/appointment_handler.php", {
  method: "POST",
  body: formData,
 })
  .then(function (response) {
   return response.json();
  })
  .then(function (result) {
   var messageDiv = document.getElementById("appt-message");
   var btnConfirm = document.getElementById("btn-confirm-book");
   var btnAnalyze = document.getElementById("btn-analyze");

   if (messageDiv) messageDiv.style.display = "block";
   if (btnConfirm) btnConfirm.style.display = "none"; // Hide confirm button

   // Reset Analyze Button
   if (btnAnalyze) {
    btnAnalyze.disabled = false;
    btnAnalyze.textContent = "🔍 Analyze Symptoms & Find Time";
    btnAnalyze.classList.remove("opacity-50", "cursor-not-allowed");
   }

    if (result.status === "success") {
     Swal.fire({
       title: 'Booked!',
       text: result.message,
       icon: 'success',
       customClass: {
        popup: "bg-semantic-bg dark:bg-semantic-surface rounded-2xl shadow-xl border border-semantic-border dark:border-semantic-border",
        title: "dark:text-semantic-text",
        confirmButton: "bg-semantic-cta hover:bg-semantic-ctaHover text-white font-bold flex items-center gap-2 px-6 py-2.5 rounded-xl border border-semantic-accent hover:border-semantic-accent shadow-blue-500/30"
       },
       buttonsStyling: false
     });

     // Reset the form and refresh data
     document.getElementById("appointmentForm").reset();
     const aiPanel = document.getElementById("ai-result-panel");
     if (aiPanel) aiPanel.classList.add("hidden");
     
     const selDocDisplay = document.getElementById("selected-doctor-display");
     if (selDocDisplay) {
      selDocDisplay.classList.add("hidden");
      selDocDisplay.classList.remove("flex");
     }
     
     const timeSlotSection = document.getElementById("time-slot-section");
     if (timeSlotSection) {
      timeSlotSection.classList.add("hidden");
     }

     fetchDashboardData();
     loadAvailabilityTimeline();
    } else {
     Swal.fire({
       title: 'Error',
       text: result.message,
       icon: 'error',
       customClass: {
        popup: "bg-semantic-bg dark:bg-semantic-surface rounded-2xl shadow-xl border border-semantic-border dark:border-semantic-border",
        title: "dark:text-semantic-text",
        confirmButton: "bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-2 px-6 py-2.5 rounded-xl border border-red-500"
       },
       buttonsStyling: false
     });
    }
  })
  .catch(function (error) {
   console.error("Booking error:", error);
   var btnAnalyze = document.getElementById("btn-analyze");
   if (btnAnalyze) {
    btnAnalyze.disabled = false;
    btnAnalyze.textContent = "🔍 Analyze Symptoms & Find Time";
    btnAnalyze.classList.remove("opacity-50", "cursor-not-allowed");
   }
   Swal.fire({
    title: 'Error',
    text: 'Submission failed. Please try again.',
    icon: 'error',
    customClass: {
     popup: "bg-semantic-bg dark:bg-semantic-surface rounded-2xl shadow-xl border border-semantic-border dark:border-semantic-border",
     title: "dark:text-semantic-text",
     confirmButton: "bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-2 px-6 py-2.5 rounded-xl border border-red-500"
    },
    buttonsStyling: false
   });
  });
}


 /* -- 5. Terminate (Cancel) Appointment -- */
 window.terminateAppointment = function (apptId) {
  Swal.fire({
    title: 'Cancel Appointment?',
    text: "Are you sure you want to cancel this appointment/ticket?",
    icon: 'warning',
    customClass: {
     popup: "bg-semantic-bg dark:bg-semantic-surface rounded-2xl shadow-xl border border-semantic-border dark:border-semantic-border",
     title: "dark:text-semantic-text",
     confirmButton: "bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-2 px-6 py-2.5 rounded-xl border border-red-500 w-full mb-2",
     cancelButton: "bg-semantic-surface hover:bg-semantic-surface dark:bg-semantic-surface dark:hover:bg-semantic-surface dark:text-semantic-text text-semantic-text font-bold px-6 py-2.5 rounded-xl transition-colors w-full",
     actions: "flex flex-col w-full px-4"
    },
    buttonsStyling: false,
    showCancelButton: true,
    confirmButtonText: 'Yes, cancel it'
  }).then((result) => {
    if (result.isConfirmed) {
      var formData = new FormData();
      formData.append("terminate_appointment", "1");
      formData.append("appointment_id", apptId);

      fetch("../php/appointment_handler.php", {
       method: "POST",
       body: formData,
      })
       .then((res) => res.json())
       .then((data) => {
        if (data.status === "success") {
         Swal.fire('Cancelled', "Your appointment has been cancelled.", 'success');
         fetchDashboardData(); // Refresh list
        } else {
         Swal.fire('Error', data.message, 'error');
        }
       })
       .catch((err) => {
        console.error("Termination error:", err);
        Swal.fire('Error', "Failed to process cancellation.", 'error');
       });
    }
  });
 };

/* -- 6. Select Time from Timeline -- */
window.overrideTodayManualSelection = function (time24h, hourStr, element) {
 if (element) {
  document.querySelectorAll(".timeline-hour").forEach(el => {
    el.classList.remove("border-semantic-accent", "ring-2", "ring-blue-100", "dark:ring-blue-900/40");
    el.style.borderColor = "";
  });
  element.classList.add("border-semantic-accent", "ring-2", "ring-blue-100", "dark:ring-blue-900/40");
  element.style.borderColor = "#2563eb";
 }

 var timeSlotField = document.getElementById("selected-time-slot");
 if (timeSlotField) timeSlotField.value = time24h;

 // Derive shift from the SELECTED TIME SLOT, not the wall clock
 let slotHour = parseInt(time24h.split(':')[0]);
 let slotShift = (slotHour>= 9 && slotHour < 17) ? 1 : 2;

 // Inter-Shift Transition Logic: Handover 16:50 - 17:00
 let now = new Date();
 if (now.getHours() === 16 && now.getMinutes()>= 50) {
   slotShift = 2;
 }

 let selectedShiftDocs = allDoctors.filter(d => {
   let docId = parseInt(d.id);
   let docShift = docId <= 5 ? 1 : 2;
   return docShift === slotShift;
 });
 
 let docsHtml = selectedShiftDocs.map(doc => {
   let gender = (doc.image_url && doc.image_url.includes('Female')) ? 'FEMALE' : 'MALE';
   return `
   <div onclick="confirmManualWalkin('${doc.id}', '${time24h}', '${hourStr}')" class="doc-select-card cursor-pointer flex items-center p-4 border border-semantic-border rounded-xl hover:border-semantic-accent hover:bg-semantic-surface transition-all bg-semantic-bg">
     <img src="${doc.image_url}" class="w-12 h-12 rounded-full object-cover mr-4 border-2 border-semantic-border" onerror="this.src='../image/default_user.png'">
     <div>
       <p class="doc-name font-bold text-semantic-text">${doc.name}</p>
    <p class="doc-gender text-xs font-semibold text-semantic-cta dark:text-semantic-text uppercase tracking-wider">${gender}</p>
       <p class="doc-spec text-xs text-semantic-text opacity-70">${doc.specialization}</p>
     </div>
   </div>`;
 }).join('');

 if(typeof Swal !== 'undefined') {
   Swal.fire({
     title: 'Select Doctor for ' + hourStr,
     html: `<div class="space-y-3 mt-4 text-left max-h-64 overflow-y-auto">${docsHtml}</div>`,
     showConfirmButton: false,
     showCancelButton: true,
     cancelButtonText: 'Cancel',
     customClass: {
       popup: 'swal2-popup',
       title: 'swal2-title',
       htmlContainer: 'swal2-html-container',
       cancelButton: 'swal2-cancel'
     }
   });
 }
};

window.confirmManualWalkin = function(doctorId, time24h, hourStr) {
  if(typeof Swal !== 'undefined') Swal.close();
  var formData = new FormData();
  formData.append("take_ticket", "1");
  formData.append("selected_time", time24h);
  formData.append("doctor_id", doctorId);

  fetch("../php/appointment_handler.php", {
   method: "POST",
   body: formData,
  })
   .then(res => res.json())
   .then(data => {
    if (data.status === "success") {
     if(typeof Swal !== 'undefined') Swal.fire({ title: 'Ticket Issued!', text: 'Your ticket #' + data.ticket_number + ' is ready.', icon: 'success', confirmButtonColor: '#3b82f6' });
     fetchDashboardData();
     loadAvailabilityTimeline();
    } else {
     if(typeof Swal !== 'undefined') Swal.fire('Error', data.message, 'error');
    }
   })
   .catch(error => {
    console.error("Error taking ticket:", error);
    if(typeof Swal !== 'undefined') Swal.fire('Error', "Failed to take a ticket. Please try again.", 'error');
   });
};

/* -- 7. Tab Switching Logic -- */
window.switchAppointmentTab = function(tab) {
  const todayContent = document.getElementById("appointments-today-content");
  const futureContent = document.getElementById("appointments-future-content");
  const todayBtn = document.getElementById("tab-btn-today");
  const futureBtn = document.getElementById("tab-btn-future");

  if (tab === 'today') {
    todayContent.classList.remove("hidden");
    futureContent.classList.add("hidden");
    
  todayBtn.classList.add("bg-semantic-bg", "dark:bg-semantic-surface", "shadow-sm", "text-semantic-cta dark:text-semantic-text", "");
    todayBtn.classList.remove("text-semantic-text opacity-70");
    
  futureBtn.classList.remove("bg-semantic-bg", "dark:bg-semantic-surface", "shadow-sm", "text-semantic-cta dark:text-semantic-text", "");
    futureBtn.classList.add("text-semantic-text opacity-70");
  } else {
    todayContent.classList.add("hidden");
    futureContent.classList.remove("hidden");
    
  futureBtn.classList.add("bg-semantic-bg", "dark:bg-semantic-surface", "shadow-sm", "text-semantic-cta dark:text-semantic-text", "");
    futureBtn.classList.remove("text-semantic-text opacity-70");
    
  todayBtn.classList.remove("bg-semantic-bg", "dark:bg-semantic-surface", "shadow-sm", "text-semantic-cta dark:text-semantic-text", "");
    todayBtn.classList.add("text-semantic-text opacity-70");
  }
  
  if (typeof AOS !== "undefined") AOS.refreshHard();
};

/* -- 8. Make Selected Doctor Name Clickable -- */
document.addEventListener("DOMContentLoaded", function() {
  const displayDocName = document.getElementById("display-doc-name");
  if (displayDocName) {
    displayDocName.addEventListener("click", function() {
      if (selectedDoctor) {
        openDoctorModal(selectedDoctor);
      }
    });
  }
});

/* -- 9. Render Billing (Receipt-Card Style) -- */
window.renderBilling = function (invoices) {
  const cardsContainer = document.getElementById("billingPatientCards");
  const alertBanner = document.getElementById("billing-alert-banner");
  if (!cardsContainer) return;

  // Empty state
  if (!invoices || invoices.length === 0) {
    if (alertBanner) alertBanner.classList.add('hidden');
    cardsContainer.innerHTML = `
      <div class="md:col-span-2 bg-semantic-bg dark:bg-semantic-surface rounded-2xl shadow-sm border border-semantic-border dark:border-semantic-border py-16 text-center">
        <ion-icon name="receipt-outline" style="font-size: 4rem;" class="text-semantic-text dark:text-semantic-text opacity-90 block mx-auto mb-3"></ion-icon>
        <p class="text-semantic-text dark:text-semantic-text opacity-70 text-lg font-medium">No invoices yet</p>
        <p class="text-semantic-text dark:text-semantic-text opacity-80 text-sm mt-1">When your clinic issues a bill, it will appear here.</p>
      </div>`;
    return;
  }

  // Calculate unpaid totals for the alert banner
  let unpaidTotal = 0, unpaidCount = 0;
  invoices.forEach(inv => {
    if (inv.status === 'pending' || inv.status === 'unpaid' || inv.status === 'overdue') {
      const numVal = parseFloat(inv.total.toString().replace(/,/g, ''));
      unpaidTotal += isNaN(numVal) ? 0 : numVal;
      unpaidCount++;
    }
  });

  // Show/hide urgent banner
  if (alertBanner) {
    if (unpaidCount> 0) {
      alertBanner.classList.remove('hidden');
      const alertTotal = document.getElementById('billing-alert-total');
      const alertText = document.getElementById('billing-alert-text');
      if (alertTotal) alertTotal.textContent = '$' + unpaidTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
      if (alertText) alertText.textContent = `You have ${unpaidCount} unpaid invoice${unpaidCount> 1 ? 's' : ''}. Please settle them before the due date.`;
    } else {
      alertBanner.classList.add('hidden');
    }
  }

  // Sort: pending first, then others
  const sorted = [...invoices].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return 0;
  });

  // Build receipt cards
  cardsContainer.innerHTML = sorted.map(inv => {
    const isPending = inv.status === 'pending';
    const isPaid = inv.status === 'paid';
    const isCancelled = inv.status === 'cancelled' || inv.status === 'terminated';

    // Card border color
    const borderClass = isPending
      ? 'border-red-200 dark:border-red-900/50 shadow-red-100/50 dark:shadow-none'
      : isPaid
        ? 'border-emerald-200 dark:border-emerald-900/50'
        : 'border-semantic-border dark:border-semantic-border opacity-60';

    // Status stamp
    let stampHtml = '';
    if (isPending) {
      stampHtml = `<div class="absolute top-4 right-4 rotate-[-12deg] border-[3px] border-red-500 text-red-500 font-black text-sm px-3 py-1 rounded-md uppercase tracking-wider opacity-80">Unpaid</div>`;
    } else if (isPaid) {
      stampHtml = `<div class="absolute top-4 right-4 rotate-[-12deg] border-[3px] border-emerald-500 text-emerald-500 font-black text-sm px-3 py-1 rounded-md uppercase tracking-wider opacity-80">Paid</div>`;
    } else {
      stampHtml = `<div class="absolute top-4 right-4 rotate-[-12deg] border-[3px] border-semantic-border text-semantic-text font-black text-sm px-3 py-1 rounded-md uppercase tracking-wider opacity-60">${inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}</div>`;
    }

    // Action button
    let actionHtml = '';
    if (isPending) {
      actionHtml = `
        <button onclick="openPaymentModal(${inv.id}, '${inv.total}')"
          class="w-full mt-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none text-sm">
          <ion-icon name="card-outline" class="text-lg"></ion-icon>
          Pay Now &mdash; $${inv.total}
        </button>`;
    } else if (isPaid) {
      actionHtml = `
        <div class="mt-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl py-2.5 px-4 flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
          <ion-icon name="checkmark-circle" class="text-lg"></ion-icon>
          Payment Completed
        </div>`;
    }

    return `
    <div class="relative bg-semantic-bg dark:bg-semantic-surface rounded-2xl shadow-sm border-2 ${borderClass} overflow-hidden transition-all hover:shadow-md">
      ${stampHtml}

      <!-- Receipt Header -->
      <div class="px-6 pt-5 pb-3">
        <div class="flex items-center gap-3 mb-1">
          <div class="w-10 h-10 rounded-xl ${isPending ? 'bg-red-100 dark:bg-red-900/30' : isPaid ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-semantic-surface dark:bg-semantic-surface'} flex items-center justify-center">
            <ion-icon name="${isPending ? 'time-outline' : isPaid ? 'checkmark-done-outline' : 'close-outline'}" class="text-xl ${isPending ? 'text-red-500' : isPaid ? 'text-emerald-500' : 'text-semantic-text'}"></ion-icon>
          </div>
          <div>
            <p class="text-sm font-bold text-semantic-text dark:text-semantic-text">Invoice #INV-${String(inv.id).padStart(4, '0')}</p>
            <p class="text-xs text-semantic-text dark:text-semantic-text opacity-70">Issued: ${inv.date}</p>
          </div>
        </div>
      </div>

      <!-- Dashed Separator -->
      <div class="px-6"><div class="border-t-2 border-dashed border-semantic-border dark:border-semantic-border"></div></div>

      <!-- Itemized Breakdown -->
      <div class="px-6 py-4 space-y-2.5">
        <div class="flex justify-between text-sm">
          <span class="text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80">Subtotal</span>
          <span class="text-semantic-text opacity-90 dark:text-semantic-text dark:opacity-90 font-medium">$${inv.subtotal}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80">Tax (10%)</span>
          <span class="text-amber-600 dark:text-amber-400 font-medium">+$${inv.tax}</span>
        </div>
      </div>

      <!-- Dashed Separator -->
      <div class="px-6"><div class="border-t-2 border-dashed border-semantic-border dark:border-semantic-border"></div></div>

      <!-- Total -->
      <div class="px-6 py-3 flex justify-between items-center">
        <span class="text-base font-bold text-semantic-text dark:text-semantic-text">TOTAL</span>
        <span class="text-2xl font-black ${isPending ? 'text-red-600 dark:text-red-400' : 'text-semantic-text dark:text-semantic-text'}">$${inv.total}</span>
      </div>

      <!-- Due Date -->
      <div class="px-6 pb-2">
        <div class="flex justify-between text-xs">
          <span class="text-semantic-text dark:text-semantic-text opacity-70">Due Date</span>
          <span class="${isPending ? 'text-red-500 font-semibold' : 'text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80'}">${inv.due_date || 'N/A'}</span>
        </div>
      </div>

      <!-- Action -->
      <div class="px-6 pb-5">
        ${actionHtml}
      </div>
    </div>`;
  }).join('');
};

/* -- 9b. Payment Modal Helpers -- */
window.openPaymentModal = function (invoiceId, totalStr) {
  document.getElementById('pay-invoice-id').value = invoiceId;
  document.getElementById('pay-invoice-label').textContent = '#INV-' + String(invoiceId).padStart(4, '0');
  document.getElementById('pay-invoice-amount').textContent = '$' + totalStr;
  document.getElementById('paymentForm').reset();
  document.getElementById('pay-invoice-id').value = invoiceId;
  
  // Auto-fill dummy card info for fast simulation
  document.getElementById('pay-card-number').value = '4111 1111 1111 1111';
  document.getElementById('pay-card-holder').value = 'Test Patient';
  document.getElementById('pay-card-expiry').value = '12/26';
  document.getElementById('pay-card-cvv').value = '123';
  
  document.getElementById('paymentModal').classList.remove('hidden');
};

window.closePaymentModal = function () {
  document.getElementById('paymentModal').classList.add('hidden');
};

window.formatCardNumber = function (input) {
  let v = input.value.replace(/\D/g, '').substring(0, 16);
  input.value = v.replace(/(.{4})/g, '$1 ').trim();
};

window.formatExpiry = function (input) {
  let v = input.value.replace(/\D/g, '').substring(0, 4);
  if (v.length>= 3) v = v.substring(0, 2) + '/' + v.substring(2);
  input.value = v;
};

window.processPayment = async function () {
  const invoiceId = document.getElementById('pay-invoice-id').value;
  const cardNumber = document.getElementById('pay-card-number').value;
  const cardHolder = document.getElementById('pay-card-holder').value;
  const expiry = document.getElementById('pay-card-expiry').value;
  const cvv = document.getElementById('pay-card-cvv').value;

  if (!cardNumber || cardNumber.replace(/\s/g, '').length < 13) {
    Swal.fire('Error', 'Please enter a valid card number', 'error'); return;
  }
  if (!cardHolder.trim()) {
    Swal.fire('Error', 'Please enter the cardholder name', 'error'); return;
  }
  if (!expiry || expiry.length < 5) {
    Swal.fire('Error', 'Please enter a valid expiry date', 'error'); return;
  }
  if (!cvv || cvv.length < 3) {
    Swal.fire('Error', 'Please enter a valid CVV', 'error'); return;
  }

  const payBtn = document.getElementById('payBtn');
  const origHtml = payBtn.innerHTML;
  payBtn.innerHTML = '<ion-icon name="hourglass-outline" class="text-lg animate-spin"></ion-icon> Processing...';
  payBtn.disabled = true;

  const formData = new FormData();
  formData.append('action', 'pay_invoice');
  formData.append('invoice_id', invoiceId);
  formData.append('card_number', cardNumber);
  formData.append('card_holder', cardHolder);

  try {
    const res = await fetch('../php/dashboard_api.php', {
      method: 'POST', body: formData, credentials: 'include'
    });
    const data = await res.json();
    if (data.status === 'success') {
      closePaymentModal();
      Swal.fire({
        icon: 'success', title: 'Payment Successful!',
        html: `<p class="text-semantic-text opacity-80">${data.message}</p>`,
        confirmButtonColor: '#6366f1'
      });
      if (typeof fetchDashboardData === 'function') fetchDashboardData();
      else location.reload();
    } else {
      Swal.fire('Payment Failed', data.message, 'error');
    }
  } catch (e) {
    Swal.fire('Error', 'Network error. Please try again.', 'error');
  } finally {
    payBtn.innerHTML = origHtml;
    payBtn.disabled = false;
  }
};

/* -- 10. Render Notifications & Dropdown -- */
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
window.switchProfileTab = function(tabName) {
  // Hide all tabs
  document.querySelectorAll('.profile-tab-content').forEach(el => el.classList.add('hidden'));
  // Reset all buttons
  document.querySelectorAll('.profile-tab-btn').forEach(btn => {
    btn.className = "profile-tab-btn flex-1 lg:w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all text-semantic-text opacity-80 hover:bg-semantic-surface dark:text-semantic-text dark:opacity-90 dark:hover:bg-semantic-surface";
  });

  // Show selected tab
  const selectedTab = document.getElementById('tab-' + tabName);
  if (selectedTab) selectedTab.classList.remove('hidden');

  // Highlight active button
  const selectedBtn = document.getElementById('tab-btn-' + tabName);
  if (selectedBtn) {
  selectedBtn.className = "profile-tab-btn flex-1 lg:w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all bg-semantic-surface text-semantic-cta dark:text-semantic-accent dark:bg-semantic-brand/30 ";
  }
};

window.getProfileFormData = function() {
  const form = document.getElementById('profile-form');
  if (!form) return "";
  const formData = new FormData(form);
  const data = {};
  for (let [key, value] of formData.entries()) {
    data[key] = value;
  }
  // Handle unchecked checkboxes
  ['pref_sms', 'pref_email', 'pref_push'].forEach(key => {
    if (!data[key]) data[key] = false;
  });
  return JSON.stringify(data);
};

window.checkProfileDirtyState = function() {
  const currentState = getProfileFormData();
  const actionButtons = document.getElementById('profile-action-buttons');
  if (actionButtons) {
    if (currentState !== window.initialProfileState) {
      actionButtons.classList.remove('opacity-50', 'pointer-events-none');
    } else {
      actionButtons.classList.add('opacity-50', 'pointer-events-none');
    }
  }
  // Update global avatars instantly to reflect any date or gender changes
  if (typeof window.updateGlobalAvatars === 'function') {
    window.updateGlobalAvatars();
  }
};

// Add listeners to profile form inputs
document.addEventListener('DOMContentLoaded', () => {
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('input', checkProfileDirtyState);
    profileForm.addEventListener('change', checkProfileDirtyState);
    
    // Real-time CPR validation
    const cprInput = document.getElementById('prof-cpr');
    const cprError = document.getElementById('cpr-error');
    if (cprInput && cprError) {
      cprInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '').slice(0, 9);
        if (this.value.length> 0 && this.value.length < 9) {
          cprError.classList.remove('hidden');
          this.classList.add('border-red-500', 'focus:ring-red-500');
        } else {
          cprError.classList.add('hidden');
          this.classList.remove('border-red-500', 'focus:ring-red-500');
        }
      });
    }

    // Date of Birth DD/MM/YYYY mask & validation
    const dobDisplay = document.getElementById('prof-dob-display');
    const dobHidden = document.getElementById('prof-dob');
    const dobError = document.getElementById('dob-error');
    
    if (dobDisplay && dobHidden && dobError) {
      dobDisplay.addEventListener('input', function() {
        let v = this.value.replace(/\D/g, '');
        if (v.length>= 2 && v.length < 4) {
          v = v.substring(0, 2) + '/' + v.substring(2);
        } else if (v.length>= 4) {
          v = v.substring(0, 2) + '/' + v.substring(2, 4) + '/' + v.substring(4, 8);
        }
        this.value = v;
        
        if (v.length === 10) {
          const [dd, mm, yyyy] = v.split('/');
          const d = parseInt(dd, 10);
          const m = parseInt(mm, 10);
          const y = parseInt(yyyy, 10);
          
          const isValid = d>= 1 && d <= 31 && m>= 1 && m <= 12 && y>= 1900 && y <= new Date().getFullYear() + 1;
          
          if (isValid) {
            dobError.classList.add('hidden');
            this.classList.remove('border-red-500', 'focus:ring-red-500');
            dobHidden.value = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
            checkProfileDirtyState();
          } else {
            dobError.classList.remove('hidden');
            this.classList.add('border-red-500', 'focus:ring-red-500');
            dobHidden.value = '';
            checkProfileDirtyState();
          }
        } else {
          dobHidden.value = '';
          if (v.length> 0) {
            dobError.classList.remove('hidden');
            this.classList.add('border-red-500', 'focus:ring-red-500');
          } else {
            dobError.classList.add('hidden');
            this.classList.remove('border-red-500', 'focus:ring-red-500');
          }
          checkProfileDirtyState();
        }
      });
    }
  }
});

window.resetProfileForm = function() {
  if (typeof fetchDashboardData === 'function') {
    fetchDashboardData();
  }
  const actionButtons = document.getElementById('profile-action-buttons');
  if (actionButtons) actionButtons.classList.add('opacity-50', 'pointer-events-none');
};

window.submitProfileForm = function() {
  const form = document.getElementById('profile-form');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const cpr = document.getElementById('prof-cpr').value;
  if (cpr.length !== 9) {
    Swal.fire('Validation Error', 'CPR must be exactly 9 digits.', 'error');
    return;
  }

  const formData = new FormData(form);
  
  const isDark = document.documentElement.classList.contains('dark');
  const popupBg = isDark ? '#1f2937' : '#ffffff';
  const textColor = isDark ? '#f9fafb' : '#111827';

  fetch('../php/profile_handler.php', {
    method: 'POST',
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'success') {
      Swal.fire({
        title: 'Saved!',
        text: 'Your profile has been successfully updated.',
        icon: 'success',
        background: popupBg,
        color: textColor,
        timer: 2000,
        showConfirmButton: false
      });
      window.initialProfileState = getProfileFormData();
      checkProfileDirtyState();
      
      // Sync theme if changed
      const themePref = document.getElementById('pref-theme').value;
      if (themePref === 'dark') {
        if (typeof applyDarkMode === 'function') applyDarkMode(true);
      } else if (themePref === 'light') {
        if (typeof applyDarkMode === 'function') applyDarkMode(false);
      } else {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          if (typeof applyDarkMode === 'function') applyDarkMode(true);
        } else {
          if (typeof applyDarkMode === 'function') applyDarkMode(false);
        }
        localStorage.removeItem('darkMode');
        if (document.getElementById('pref-theme')) document.getElementById('pref-theme').value = "system";
      }
      
      fetchDashboardData();
    } else {
      Swal.fire({ title: 'Error', text: data.message || 'Failed to save profile.', icon: 'error', background: popupBg, color: textColor });
    }
  })
  .catch(err => {
    console.error("Profile Save Error:", err);
    Swal.fire({ title: 'Error', text: 'Network error. Please try again.', icon: 'error', background: popupBg, color: textColor });
  });
};

/* ---------------------------------------------
   Family Network Form Logic
   --------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const famRel = document.getElementById('fam-rel');
  if (famRel) {
    famRel.addEventListener('change', function() {
      const rel = this.value;
      const lnameEl = document.getElementById('fam-lname');
      const phoneEl = document.getElementById('fam-phone');
      const emailEl = document.getElementById('fam-email');
      
      // Reset fields
      if (lnameEl) {
        lnameEl.value = '';
        lnameEl.classList.remove('bg-semantic-surface/30', 'dark:bg-semantic-brand/10');
      }
      if (phoneEl) {
        phoneEl.value = '';
        phoneEl.classList.remove('bg-semantic-surface/30', 'dark:bg-semantic-brand/10');
      }
      if (emailEl) {
        emailEl.value = '';
        emailEl.classList.remove('bg-semantic-surface/30', 'dark:bg-semantic-brand/10');
      }

      if (rel && window.initialProfileState) {
        const parentProfile = JSON.parse(window.initialProfileState);
        
        // 1. Global Defaults (Phone & Email for everyone)
        if (phoneEl) {
          phoneEl.value = parentProfile['phone'] || '';
          phoneEl.classList.add('bg-semantic-surface/30', 'dark:bg-semantic-brand/10');
        }
        if (emailEl) {
          emailEl.value = parentProfile['email'] || '';
          emailEl.classList.add('bg-semantic-surface/30', 'dark:bg-semantic-brand/10');
        }
        
        // 2. Last Name Inheritance (Child or Brother/Sister only)
        if (rel === 'Child' || rel === 'Brother/Sister') {
          if (lnameEl) {
            lnameEl.value = parentProfile['last_name'] || '';
            lnameEl.classList.add('bg-semantic-surface/30', 'dark:bg-semantic-brand/10');
          }
        }
      }
    });
  }
});

/* ---------------------------------------------
   Family DOB Input Mask & Strict Validation
   DD/MM/YYYY auto-slash, month 1-12 check,
   future date prevention.
   --------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const famDobDisplay = document.getElementById('fam-dob-display');
  const famDobHidden = document.getElementById('fam-dob');
  const famDobError  = document.getElementById('fam-dob-error');

  if (famDobDisplay && famDobHidden && famDobError) {
    famDobDisplay.addEventListener('input', function () {
      // Strip non-digits
      let digits = this.value.replace(/\D/g, '');

      // --- Inline segment validation while typing ---
      // Day segment (first 2 digits): clamp to 01-31
      if (digits.length>= 2) {
        let dd = parseInt(digits.substring(0, 2), 10);
        if (dd < 1 || dd> 31) {
          digits = digits.substring(0, 1);
        }
      }

      // Month segment (digits 3-4): clamp to 01-12
      if (digits.length>= 4) {
        let mm = parseInt(digits.substring(2, 4), 10);
        if (mm < 1 || mm> 12) {
          digits = digits.substring(0, 3);
        }
      } else if (digits.length === 3) {
        let partialMonth = parseInt(digits.substring(2, 3), 10);
        if (partialMonth> 1) {
          digits = digits.substring(0, 2);
        }
      }

      // Year segment (digits 5-8): prevent future year as user types
      if (digits.length>= 8) {
        let yyyy = parseInt(digits.substring(4, 8), 10);
        let currentYear = new Date().getFullYear();
        if (yyyy> currentYear) {
          digits = digits.substring(0, 7);
        }
      }

      // Rebuild formatted value with auto-slashes
      let formatted = '';
      if (digits.length>= 4) {
        formatted = digits.substring(0, 2) + '/' + digits.substring(2, 4) + '/' + digits.substring(4, 8);
      } else if (digits.length>= 2) {
        formatted = digits.substring(0, 2) + '/' + digits.substring(2);
      } else {
        formatted = digits;
      }
      this.value = formatted;

      // --- Full date validation when complete (DD/MM/YYYY = 10 chars) ---
      if (formatted.length === 10) {
        const parts = formatted.split('/');
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);

        const now = new Date();
        let valid = d>= 1 && d <= 31 && m>= 1 && m <= 12 && y>= 1900 && y <= now.getFullYear();

        if (valid) {
          const daysInMonth = new Date(y, m, 0).getDate();
          if (d> daysInMonth) valid = false;
        }

        if (valid) {
          const enteredDate = new Date(y, m - 1, d);
          if (enteredDate> now) valid = false;
        }

        if (valid) {
          famDobError.classList.add('hidden');
          this.classList.remove('border-red-500', 'focus:ring-red-500');
          famDobHidden.value = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else {
          famDobError.textContent = 'Invalid or future date.';
          famDobError.classList.remove('hidden');
          this.classList.add('border-red-500', 'focus:ring-red-500');
          famDobHidden.value = '';
        }
      } else {
        famDobHidden.value = '';
        if (formatted.length> 0) {
          famDobError.textContent = 'Invalid date format.';
          famDobError.classList.remove('hidden');
          this.classList.add('border-red-500', 'focus:ring-red-500');
        } else {
          famDobError.classList.add('hidden');
          this.classList.remove('border-red-500', 'focus:ring-red-500');
        }
      }
    });
  }
});

window.submitFamilyForm = function() {
  const rel = document.getElementById('fam-rel').value;
  const fname = document.getElementById('fam-fname').value;
  const lname = document.getElementById('fam-lname').value;
  
  if (!rel || !fname || !lname) {
    Swal.fire('Missing Fields', 'Please fill out all required fields (Relationship, First Name, Last Name).', 'warning');
    return;
  }
  
  const cpr = document.getElementById('fam-cpr').value;
  if (cpr && cpr.length !== 9) {
    Swal.fire('Validation Error', 'CPR must be exactly 9 digits if provided.', 'error');
    return;
  }

  const memberIdVal = document.getElementById('fam-member-id').value;
  const isEdit = memberIdVal && parseInt(memberIdVal)> 0;

  const formData = new FormData();
  formData.append('action', isEdit ? 'edit' : 'add');
  if (isEdit) {
    formData.append('member_id', memberIdVal);
  }
  formData.append('relationship', rel);
  formData.append('first_name', fname);
  formData.append('last_name', lname);
  formData.append('cpr', cpr);
  formData.append('date_of_birth', document.getElementById('fam-dob').value);
  formData.append('gender', document.getElementById('fam-gender').value);
  formData.append('blood_type', document.getElementById('fam-blood').value);
  formData.append('phone', document.getElementById('fam-phone').value);
  formData.append('email', document.getElementById('fam-email').value);

  const isDark = document.documentElement.classList.contains('dark');
  const popupBg = isDark ? '#1f2937' : '#ffffff';
  const textColor = isDark ? '#f9fafb' : '#111827';

  fetch('../php/family_handler.php', {
    method: 'POST',
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'success') {
      Swal.fire({
        title: isEdit ? 'Updated!' : 'Linked!',
        text: isEdit ? 'Family member account has been securely updated.' : 'Family member account has been securely added.',
        icon: 'success',
        background: popupBg,
        color: textColor
      });
      
      // Reset/Clean up form
      if (isEdit) {
        window.cancelEditFamilyMember();
      } else {
        document.getElementById('fam-rel').value = '';
        document.getElementById('fam-fname').value = '';
        document.getElementById('fam-lname').value = '';
        document.getElementById('fam-cpr').value = '';
        document.getElementById('fam-dob').value = '';
        const famDobDisplay = document.getElementById('fam-dob-display');
        if(famDobDisplay) famDobDisplay.value = '';
        document.getElementById('fam-gender').value = 'Not Selected';
        document.getElementById('fam-blood').value = '';
        document.getElementById('fam-phone').value = '';
        document.getElementById('fam-email').value = '';
        
        ['fam-lname', 'fam-phone', 'fam-email'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.classList.remove('bg-semantic-surface/30', 'dark:bg-semantic-brand/10');
        });
      }
      
      if (typeof fetchDashboardData === 'function') {
        fetchDashboardData();
      }
    } else {
      Swal.fire({ title: 'Error', text: data.message || (isEdit ? 'Failed to update family member.' : 'Failed to add family member.'), icon: 'error', background: popupBg, color: textColor });
    }
  })
  .catch(err => {
    console.error("Family Save Error:", err);
    Swal.fire({ title: 'Error', text: 'Network error. Please try again.', icon: 'error', background: popupBg, color: textColor });
  });
};

/* ---------------------------------------------
   Family Network Action Functions
   --------------------------------------------- */
window.editFamilyMember = function(id) {
  const member = (window._familyMembersData || []).find(m => m.member_id == id);
  if (!member) return;
  
  // Set form to edit mode
  document.getElementById('fam-member-id').value = member.member_id;
  
  // Change form title and button text
  document.getElementById('fam-form-title').innerText = 'Edit Family Member';
  document.getElementById('fam-submit-text').innerText = 'Update Account';
  const submitIcon = document.getElementById('fam-submit-icon');
  if (submitIcon) submitIcon.setAttribute('name', 'checkmark-outline');
  
  // Show cancel button
  const cancelBtn = document.getElementById('fam-cancel-btn');
  if (cancelBtn) cancelBtn.classList.remove('hidden');
  
  // Set field values
  const famRel = document.getElementById('fam-rel');
  if (famRel) {
    famRel.value = member.relationship || '';
  }
  
  document.getElementById('fam-fname').value = member.first_name || '';
  
  const lnameEl = document.getElementById('fam-lname');
  if (lnameEl) {
    lnameEl.value = member.last_name || '';
    lnameEl.classList.remove('bg-semantic-surface/30', 'dark:bg-semantic-brand/10');
  }
  
  const phoneEl = document.getElementById('fam-phone');
  if (phoneEl) {
    phoneEl.value = member.phone || '';
    phoneEl.classList.remove('bg-semantic-surface/30', 'dark:bg-semantic-brand/10');
  }
  
  const emailEl = document.getElementById('fam-email');
  if (emailEl) {
    emailEl.value = member.email || '';
    emailEl.classList.remove('bg-semantic-surface/30', 'dark:bg-semantic-brand/10');
  }
  
  document.getElementById('fam-cpr').value = member.cpr || '';
  
  // DOB Handling
  const dobInput = document.getElementById('fam-dob');
  const dobDisplayInput = document.getElementById('fam-dob-display');
  if (dobInput) dobInput.value = member.date_of_birth || '';
  if (dobDisplayInput) {
    if (member.date_of_birth) {
      const [y, mm, d] = member.date_of_birth.split('-');
      if (y && mm && d) {
        dobDisplayInput.value = `${d}/${mm}/${y}`;
      } else {
        dobDisplayInput.value = '';
      }
    } else {
      dobDisplayInput.value = '';
    }
  }
  
  document.getElementById('fam-gender').value = member.gender || 'Not Selected';
  document.getElementById('fam-blood').value = member.blood_type || '';
  
  // Scroll to the form section smoothly
  const formTitle = document.getElementById('fam-form-title');
  if (formTitle) {
    formTitle.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};

window.removeFamilyMember = function(id) {
  const isDark = document.documentElement.classList.contains('dark');
  const popupBg = isDark ? '#1f2937' : '#ffffff';
  const textColor = isDark ? '#f9fafb' : '#111827';
  
  Swal.fire({
    title: 'Are you sure?',
    text: "Do you want to unlink this family member? They will no longer be visible in your Family Network.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, remove them!',
    background: popupBg,
    color: textColor
  }).then((result) => {
    if (result.isConfirmed) {
      const formData = new FormData();
      formData.append('action', 'remove');
      formData.append('member_id', id);
      
      fetch('../php/family_handler.php', {
        method: 'POST',
        body: formData
      })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          Swal.fire({
            title: 'Removed!',
            text: 'Family member account has been securely unlinked.',
            icon: 'success',
            background: popupBg,
            color: textColor
          });
          
          // If currently editing this member, cancel the edit mode
          const editingId = document.getElementById('fam-member-id').value;
          if (editingId == id) {
            window.cancelEditFamilyMember();
          }
          
          if (typeof fetchDashboardData === 'function') {
            fetchDashboardData();
          }
        } else {
          Swal.fire({ title: 'Error', text: data.message || 'Failed to remove family member.', icon: 'error', background: popupBg, color: textColor });
        }
      })
      .catch(err => {
        console.error("Family Remove Error:", err);
        Swal.fire({ title: 'Error', text: 'Network error. Please try again.', icon: 'error', background: popupBg, color: textColor });
      });
    }
  });
};

window.cancelEditFamilyMember = function() {
  document.getElementById('fam-member-id').value = '';
  
  document.getElementById('fam-form-title').innerText = 'Add a Family Member';
  document.getElementById('fam-submit-text').innerText = 'Link Account';
  const submitIcon = document.getElementById('fam-submit-icon');
  if (submitIcon) submitIcon.setAttribute('name', 'add-outline');
  
  const cancelBtn = document.getElementById('fam-cancel-btn');
  if (cancelBtn) cancelBtn.classList.add('hidden');
  
  // Reset all form fields
  document.getElementById('fam-rel').value = '';
  document.getElementById('fam-fname').value = '';
  document.getElementById('fam-lname').value = '';
  document.getElementById('fam-cpr').value = '';
  document.getElementById('fam-dob').value = '';
  const famDobDisplay = document.getElementById('fam-dob-display');
  if (famDobDisplay) famDobDisplay.value = '';
  document.getElementById('fam-gender').value = 'Not Selected';
  document.getElementById('fam-blood').value = '';
  document.getElementById('fam-phone').value = '';
  document.getElementById('fam-email').value = '';
  
  ['fam-lname', 'fam-phone', 'fam-email'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('bg-semantic-surface/30', 'dark:bg-semantic-brand/10');
  });
};

/* ---------------------------------------------
   Theme Radio Group Logic
   --------------------------------------------- */
window.setThemeSelection = function(val) {
  const hiddenInput = document.getElementById('pref-theme');
  if (hiddenInput) {
    hiddenInput.value = val;
    window.updateThemeRadioCards(val);
    if (typeof window.checkProfileDirtyState === 'function') {
      window.checkProfileDirtyState();
    }
  }
};

window.updateThemeRadioCards = function(activeVal) {
  const cards = document.querySelectorAll('.theme-radio-card');
  cards.forEach(card => {
    if (card.getAttribute('data-theme-val') === activeVal) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
};

// Initialize cards on load if input has value
document.addEventListener('DOMContentLoaded', () => {
  const hiddenInput = document.getElementById('pref-theme');
  if (hiddenInput && hiddenInput.value) {
    window.updateThemeRadioCards(hiddenInput.value);
  }
});

/* ---------------------------------------------
   Family Network Render Logic
   --------------------------------------------- */
window.renderFamilyMembers = function(members) {
  window._familyMembersData = members || [];
  const container = document.getElementById('linked-accounts-container');
  if (!container) return;
  
  if (!members || members.length === 0) {
    container.innerHTML = '<p class="text-sm text-semantic-text opacity-70 col-span-full italic">No family members linked yet.</p>';
    return;
  }
  
  let html = '';
  members.forEach(m => {
    let displayDob = 'N/A';
    if (m.date_of_birth) {
      const [y, mm, d] = m.date_of_birth.split('-');
      if (y && mm && d) {
        displayDob = `${d}/${mm}/${y}`;
      }
    }
    
    const genderText = m.gender || 'Not Selected';
    const initial = m.first_name ? m.first_name.charAt(0).toUpperCase() : '?';
    
    html += `
    <div class="bg-semantic-bg dark:bg-semantic-surface rounded-xl p-4 border border-semantic-border dark:border-semantic-border shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow relative">
      <div class="absolute top-3 right-3 flex items-center gap-1">
    <button type="button" onclick="editFamilyMember(${m.member_id})" class="p-1.5 text-semantic-text hover:text-semantic-cta dark:text-semantic-accent dark:text-semantic-text opacity-70 dark:hover:text-semantic-cta dark:text-semantic-accent rounded-lg hover:bg-semantic-surface dark:hover:bg-semantic-surface transition-colors" title="Edit Profile">
          <ion-icon name="create-outline" class="text-base"></ion-icon>
        </button>
        <button type="button" onclick="removeFamilyMember(${m.member_id})" class="p-1.5 text-semantic-text hover:text-red-500 dark:text-semantic-text opacity-70 dark:hover:text-red-400 rounded-lg hover:bg-semantic-surface dark:hover:bg-semantic-surface transition-colors" title="Remove Connection">
          <ion-icon name="trash-outline" class="text-base"></ion-icon>
        </button>
      </div>
   <div class="w-12 h-12 rounded-full bg-semantic-cta dark:bg-semantic-brand/50 flex items-center justify-center text-semantic-cta dark:text-semantic-text font-bold text-lg flex-shrink-0">
        ${initial}
      </div>
      <div class="flex-1 overflow-hidden">
        <h4 class="font-bold text-semantic-text dark:text-semantic-text truncate pr-16">${m.first_name} ${m.last_name || ''}</h4>
        <div class="flex items-center gap-2 text-[11px] text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80 mt-1 uppercase tracking-wider font-semibold">
          <span class="bg-semantic-surface dark:bg-semantic-surface px-2 py-0.5 rounded">${m.relationship}</span>
          <span>${genderText}</span>
        </div>
        <div class="text-xs text-semantic-text opacity-70 mt-2 flex items-center gap-3">
          <span title="Date of Birth"><ion-icon name="calendar-outline" class="align-text-bottom mr-1"></ion-icon>${displayDob}</span>
          ${m.cpr ? `<span title="CPR"><ion-icon name="card-outline" class="align-text-bottom mr-1"></ion-icon>${m.cpr}</span>` : ''}
        </div>
      </div>
    </div>`;
  });
  
  container.innerHTML = html;
};
