/**
 * Admin Dashboard Logic
 * Handles API data fetching, table rendering, and Chart.js initialization.
 */

const API_BASE = "../php/admin_api.php";
let allAppointments = [];
let allDocumentQueue = [];
let allDoctorsData = [];
let allPatientsData = [];

// -- UI Logic: Sidebar --
document.addEventListener("DOMContentLoaded", function () {
 const sidebarToggle = document.getElementById("sidebarToggle");
 const sidebar = document.getElementById("sidebar");
 const mainContent = document.getElementById("mainContent");

 if (sidebarToggle && sidebar && mainContent) {
  sidebarToggle.addEventListener("click", () => {
   if (window.innerWidth <= 768) {
    sidebar.classList.toggle("mobile-open");
   } else {
    sidebar.classList.toggle("sidebar-collapsed");
    sidebar.classList.toggle("sidebar-expanded");
    if (sidebar.classList.contains("sidebar-collapsed")) {
     mainContent.classList.remove("ml-64");
     mainContent.classList.add("ml-[4.5rem]");
    } else {
     mainContent.classList.remove("ml-[4.5rem]");
     mainContent.classList.add("ml-64");
    }
   }
  });
  
  // Handle window resize cleanly
  window.addEventListener("resize", () => {
   if (window.innerWidth <= 768) {
    sidebar.classList.remove("sidebar-collapsed", "sidebar-expanded");
    mainContent.classList.remove("ml-[4.5rem]", "ml-64");
   } else {
    sidebar.classList.remove("mobile-open");
    if (!sidebar.classList.contains("sidebar-collapsed")) {
     sidebar.classList.add("sidebar-expanded");
     mainContent.classList.add("ml-64");
    }
   }
  });

  // initial setup based on viewport
  if (window.innerWidth <= 768) {
   sidebar.classList.remove("sidebar-collapsed", "sidebar-expanded");
   mainContent.classList.remove("ml-[4.5rem]", "ml-64");
  }

  // Close sidebar on mobile when a link is clicked and switch view
  const sidebarLinks = sidebar.querySelectorAll(".sidebar-link");
  sidebarLinks.forEach(link => {
   link.addEventListener("click", (e) => {
     const view = link.dataset.view;
     if (view && typeof showSection === "function") {
       showSection(view);
     }
     if (window.innerWidth <= 768) {
       sidebar.classList.remove("mobile-open");
     }
   });
  });
 }
});

// -- Helper: API Fetch --
async function apiFetch(action) {
 try {
  const response = await fetch(`${API_BASE}?action=${action}`, {
   credentials: "include"
  });
  const json = await response.json();
  if (json.status === "error") {
   if (json.message === "Unauthorized") {
    console.warn("Session expired for action:", action);
    window.location.href = "../loginReg/login.html";
   }
   console.error("API error for", action, ":", json.message, json.debug || "");
   return null;
  }
  return json.data;
 } catch (error) {
  console.error("Fetch error for", action, ":", error);
  return null;
 }
}

// -- Dashboard Stats --

function handleLogout() {
 Swal.fire({
  title: "Logout?",
  text: "Are you sure you want to logout?",
  icon: "question",
  showCancelButton: true,
  confirmButtonColor: "#4f46e5",
  confirmButtonText: "Yes, logout",
 }).then((result) => {
  if (result.isConfirmed) window.location.href = "../php/logout.php";
 });
}


/* ===========================================================
  Admin Presence System (3 states - no In Consultation)
  =========================================================== */

const ADMIN_PRESENCE_CONFIG = {
 on_duty:  { emoji: '🩺', label: 'On Duty',  bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-700', darkBg: 'dark:bg-emerald-900/30', darkBorder: 'dark:border-emerald-600', darkText: 'dark:text-emerald-400' },
 on_break: { emoji: '☕', label: 'On Break', bg: 'bg-amber-100',  border: 'border-amber-300',  text: 'text-amber-700',  darkBg: 'dark:bg-amber-900/30',  darkBorder: 'dark:border-amber-600',  darkText: 'dark:text-amber-400' },
 off_shift: { emoji: '🌙', label: 'Off Shift', bg: 'bg-semantic-surface',  border: 'border-semantic-border',  text: 'text-semantic-text opacity-70',  darkBg: 'dark:bg-semantic-bg/30',  darkBorder: 'dark:border-semantic-border',  darkText: 'dark:text-semantic-text dark:opacity-80' }
};

function updateAdminPresenceUI(status) {
 const config = ADMIN_PRESENCE_CONFIG[status] || ADMIN_PRESENCE_CONFIG.on_duty;
 const btn = document.getElementById('adminPresenceToggle');
 const emoji = document.getElementById('admin-presence-emoji');
 const label = document.getElementById('admin-presence-label');
 if (!btn) return;

 // Remove all presence classes
 Object.values(ADMIN_PRESENCE_CONFIG).forEach(c => {
  btn.classList.remove(c.bg, c.border, c.text, c.darkBg, c.darkBorder, c.darkText);
 });

 // Apply new classes
 btn.classList.add(config.bg, config.border, config.text, config.darkBg, config.darkBorder, config.darkText);
 if (emoji) emoji.textContent = config.emoji;
 if (label) label.textContent = config.label;
}

function setAdminPresence(status) {
 updateAdminPresenceUI(status);
 localStorage.setItem('adminPresenceStatus', status);
 // Close dropdown
 document.getElementById('adminPresenceDropdown')?.classList.add('hidden');
 // Show toast
 if (typeof Swal !== 'undefined') {
  const config = ADMIN_PRESENCE_CONFIG[status];
  Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `${config.emoji} Status: ${config.label}`, showConfirmButton: false, timer: 2000, timerProgressBar: true });
 }
}

function toggleAdminPresenceDropdown() {
 const dd = document.getElementById('adminPresenceDropdown');
 if (dd) dd.classList.toggle('hidden');
}

// Close admin presence dropdown on click outside
document.addEventListener('click', function(e) {
 const wrapper = document.getElementById('admin-presence-wrapper');
 const dd = document.getElementById('adminPresenceDropdown');
 if (wrapper && dd && !wrapper.contains(e.target)) {
  dd.classList.add('hidden');
 }
});

/* =======================================================
  AI Predictive Schedule Forecast
  ======================================================= */

