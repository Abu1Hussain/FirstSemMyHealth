/* ===========================================================
   Patient Dashboard - Main Script
   Handles: data loading, navigation, doctor modal,
            AI triage, appointment booking, and timeline.

   Connected to:
     - php/dashboard_api.php   (data loading)
     - Ai/ai_triage.php        (symptom analysis)
     - Ai/ai_scheduler.php     (availability timeline)
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
        link.classList.add("active", "bg-blue-600", "text-white");
        if (icon) icon.classList.add("text-white");
      } else {
        link.classList.remove("active", "bg-blue-600", "text-white");
        if (icon) icon.classList.remove("text-white");
      }
    });

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
    if (hours === 16 && minutes >= 50) return 2;
    if (hours >= 9 && hours < 17) return 1;
    return 2;
};

window.checkShiftStatus = function() {
    let now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();

    let shiftClosing = false;
    let clinicClosed = false;

    // Shift 2 closes at 01:00, so lockout at 00:50
    if (hours === 0 && minutes >= 50) shiftClosing = true; 
    
    // Clinic is closed from 01:00 to 09:00
    if (hours >= 1 && hours < 9) clinicClosed = true;

    const triageContainer = document.getElementById('triage-buttons');
    const quickApptBtn = document.getElementById('btn-quick-appointment');

    if (clinicClosed) {
        if (quickApptBtn) {
            quickApptBtn.disabled = true;
            quickApptBtn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-gray-400');
            quickApptBtn.innerHTML = '⚠️ Clinic Closed';
        }
        if (triageContainer) {
            triageContainer.classList.add('hidden');
        }
    } else if (shiftClosing) {
        if (quickApptBtn) {
            quickApptBtn.disabled = true;
            quickApptBtn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-gray-400');
            quickApptBtn.innerHTML = '⚠️ Booking is closed for the day. Please check tomorrow\'s availability.';
        }
        if (triageContainer) {
            triageContainer.classList.add('hidden');
        }
    } else {
        if (quickApptBtn) {
            quickApptBtn.disabled = false;
            quickApptBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-gray-400');
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
                return slot.chairs_left > 0 && mappedSlotHour >= mappedCurrentHour;
            });

            if (!availableSlot) {
                availableSlot = data.timeline.find(slot => slot.chairs_left > 0);
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
                
                const container = document.getElementById('active-ticket-container');
                if (container) {
                    container.classList.remove('hidden');
                    if (document.getElementById('active-ticket-number')) document.getElementById('active-ticket-number').textContent = data.ticket_number;
                    if (document.getElementById('active-ticket-date')) document.getElementById('active-ticket-date').textContent = "Today";
                    if (document.getElementById('active-ticket-time')) document.getElementById('active-ticket-time').textContent = availableSlot.hour || availableSlot.time_24h;
                    if (document.getElementById('active-ticket-doctor')) document.getElementById('active-ticket-doctor').textContent = randomDoc.name;
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

      setElText("user-initial-header", responseData.user.initial);
      setElText("user-initial-sidebar", responseData.user.initial);
      setElText("user-initial-profile", responseData.user.initial);

      setElValue("profile-name", responseData.user.name);

      /* -- Populate Profile Email -- */
      if (responseData.user.email) {
        setElValue("profile-email", responseData.user.email);
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
              "text-2xl font-bold text-green-500 dark:text-green-400";
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
            '<div class="font-bold text-gray-900 dark:text-white">' +
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
            '<div class="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 font-bold">' +
            appointment.ticket_code +
            "</div>" +
            '<span class="text-xs text-gray-500">~' +
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
        if (appts.length > 0) {
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

                if (diffMs > 0) {

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
                <div class="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 p-2 rounded-xl transition-all duration-300">
                    <div class="h-10 w-10 rounded-full flex items-center justify-center text-lg shadow-inner" style="background:${statusColor}22; color:${statusColor};">
                        <ion-icon name="${icon}"></ion-icon>
                    </div>
                    <div class="flex-grow">
                        <div class="text-sm font-bold text-gray-900 dark:text-white">${appt.status.toLowerCase() === "terminated" ? "Appointment Terminated" : "Ticket: " + appt.ticket_code}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">${appt.date} • ${appt.reason.substring(0, 40)}...</div>
                    </div>
                    ${timerHtml}
                </div>
            `;
          });
          
          // Start live countdown update (every second)
          activityTimerInterval = setInterval(updateActivityTimers, 1000); 

        } else {
          activityHtml = '<p class="py-4 text-center text-gray-500 dark:text-gray-400 italic">No recent activity to show.</p>';
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
          
          let emptyState = document.getElementById("active-ticket-empty-state");
          let containers = document.querySelectorAll(".active-ticket-container");

          if (activeTickets.length > 0) {
              activeTicketIndex = 0;
              renderActiveTicket(activeTicketIndex);
              renderCarouselDots();
              
              if (emptyState) emptyState.classList.add("hidden");
              containers.forEach(c => c.classList.remove("hidden"));

              if (typeof resetCarouselTimer === "function") {
                  resetCarouselTimer();
              }
          } else {
              if (emptyState) emptyState.classList.remove("hidden");
              containers.forEach(c => c.classList.add("hidden"));
          }
      }
      /* -- Render Medical Records -- */
      var recordsBody = document.getElementById("records-list");
      if (recordsBody && responseData.records) {
        recordsBody.innerHTML = responseData.records.length
          ? responseData.records
              .map(
                (r) =>
                  `<tr>
                    <td><div class="font-bold text-gray-900 dark:text-white">${r.date}</div></td>
                    <td><span class="badge badge-blue">${r.type}</span></td>
                    <td class="max-w-xs truncate">${r.summary}</td>
                    <td><div class="flex items-center gap-2"><ion-icon name="person-circle-outline"></ion-icon> ${r.doctor}</div></td>
                </tr>`,
              )
              .join("")
          : '<tr><td colspan="4" class="py-12 text-center text-gray-500">No records found.</td></tr>';
      }

      /* -- Render Prescriptions -- */
      var prescriptionsBody = document.getElementById("prescriptions-list");
      if (prescriptionsBody && responseData.prescriptions) {
        prescriptionsBody.innerHTML = responseData.prescriptions.length
          ? responseData.prescriptions
              .map(
                (p) =>
                  `<tr>
                    <td><div class="font-bold text-gray-900 dark:text-white">${p.medication}</div></td>
                    <td><span class="badge badge-indigo">${p.dosage}</span></td>
                    <td>${p.frequency}</td>
                    <td>${p.duration}</td>
                    <td><div class="flex items-center gap-2"><ion-icon name="person-circle-outline"></ion-icon> ${p.doctor}</div></td>
                </tr>`,
              )
              .join("")
          : '<tr><td colspan="5" class="py-12 text-center text-gray-500">No prescriptions found.</td></tr>';
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
        let fullClass = doctor.is_full ? "grayscale opacity-60 pointer-events-none" : "hover:border-blue-500 cursor-pointer";
        let badgeHtml = doctor.is_full ? `<div class="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center"><span class="text-[7px] font-bold text-white bg-red-600 px-1 py-0.5 rounded uppercase transform -rotate-12 shadow-sm">Fully Booked</span></div>` : "";

        card.className = `doctor-card-mini group animate-fade-in border-2 border-transparent rounded-xl p-2 bg-gray-50 dark:bg-gray-700 transition-all text-center ${fullClass}`;
        let gender = (doctor.image_url && doctor.image_url.includes('Female')) ? 'Female' : 'Male';
        card.innerHTML = `
            <div class="relative mb-2 overflow-hidden rounded-full w-12 h-12 mx-auto">
                <img src="${doctor.image_url}" 
                     class="w-full h-full object-cover"
                     onerror="this.src='../image/default_user.png'">
                ${badgeHtml}
            </div>
            <div class="font-bold text-xs text-gray-900 dark:text-white truncate">${doctor.name}</div>
            <div class="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">${gender}</div>
            <div class="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mt-0.5">${doctor.specialization || 'General'}</div>
        `;
        
        if (!doctor.is_full) {
            card.onclick = () => {
                // Remove selection from others
                list.querySelectorAll('.doctor-card-mini').forEach(c => {
                    c.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
                    c.classList.add('border-transparent');
                });
                // Add selection to this
                card.classList.remove('border-transparent');
                card.classList.add('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
                
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
            btn.className = "date-square-btn flex flex-col items-center justify-center py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 bg-white dark:bg-gray-800 transition-all cursor-pointer";
            btn.dataset.date = fullDate;
            
            btn.innerHTML = `
                <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">${dayName}</span>
                <span class="text-lg font-black text-gray-900 dark:text-white my-1">${dateNum}</span>
                <span class="text-[10px] font-bold text-gray-500">${monthName}</span>
            `;
            
            btn.onclick = function() {
                document.querySelectorAll(".date-square-btn").forEach(b => {
                    b.classList.remove("border-blue-500", "bg-blue-50", "dark:bg-blue-900/20");
                    b.classList.add("border-gray-200", "dark:border-gray-700", "bg-white", "dark:bg-gray-800");
                });
                this.classList.remove("border-gray-200", "dark:border-gray-700", "bg-white", "dark:bg-gray-800");
                this.classList.add("border-blue-500", "bg-blue-50", "dark:bg-blue-900/20");
                
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
                      let allFull = data.doctors.length > 0 && data.doctors.every(d => d.is_full);
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
                <div class="flex flex-col items-center justify-center bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-xl border border-green-100 dark:border-green-800">
                    <span class="text-green-600 dark:text-green-400 font-black text-lg">✔</span>
                    <span class="text-[8px] font-bold text-green-600 uppercase">Ready</span>
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
            el.classList.add("bg-green-100", "text-green-700", "dark:bg-green-900/40", "dark:text-green-400");
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
        `<span class="inline-block w-2 h-2 rounded-full transition-all duration-300 ${i === activeTicketIndex ? 'bg-blue-600 scale-125' : 'bg-blue-300 dark:bg-gray-500'}"></span>`
    ).join("");
    
    dotsContainers.forEach(c => c.innerHTML = dotsHtml);
}

function resetCarouselTimer() {
    if (ticketCarouselInterval) clearInterval(ticketCarouselInterval);
    if (activeTickets.length > 1) {
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
            } else if (touchendX > touchstartX + 30) {
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
        popupBg:       isDark ? '#1f2937' : '#ffffff',
        popupBorder:   isDark ? '#374151' : '#e5e7eb',
        textPrimary:   isDark ? '#f9fafb' : '#111827',
        textSecondary: isDark ? '#9ca3af' : '#6b7280',
        textMuted:     isDark ? '#d1d5db' : '#374151',
        divider:       isDark ? '#374151' : '#e5e7eb',
        timestampBg:   isDark ? '#111827' : '#f3f4f6',
        btnBg:         isDark ? '#4338ca' : '#4f46e5',
        btnHoverBg:    isDark ? '#4f46e5' : '#4338ca',
        backdrop:      isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.45)',
    };

    let prioName = t.priority || "Standard";
    let prioColor = theme.textPrimary;
    if (prioName === "Urgent" || prioName === "Emergency") prioColor = "#ef4444";
    else if (prioName === "Priority") prioColor = "#f97316";
    else prioColor = "#22c55e";

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
                        <p style="font-size:18px; font-weight:700; color:${theme.textPrimary};">${t.patient_name || 'N/A'}</p>
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
                    <div style="grid-column: span 2;">
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
            <div class="timeline-hour flex flex-col items-center justify-center min-w-[120px] p-4 border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:border-blue-500 transition-all ${isFull ? "opacity-60 grayscale" : ""} relative" 
                 style="${clickableStyle}" onclick="${clickHandler}">
                <div class="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 ${isFull ? 'line-through' : ''}">${slot.hour}</div>
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

/* -- AI Booking logic removed per refactor -- */
/* ---------------------------------------------
     loadBookingSlots(date, doctorId)
     Fetches available hours from AI Scheduler
     and renders selectable buttons.
     --------------------------------------------- */
function loadBookingSlots(date, doctorId) {
  var url = "../Ai/ai_scheduler.php?date=" + date;
  if (doctorId) url += "&doctor_id=" + doctorId;



  fetch(url)
    .then(function (res) {
      return res.json();
    })
    .then(function (data) {
      var section = document.getElementById("time-slot-section");
      var container = document.getElementById("time-slots-container");
      section.style.display = "block";
      container.innerHTML = "";

      if (!data.timeline || data.timeline.length === 0) {
        container.innerHTML = "<p>No available slots for this date.</p>";
        return;
      }

      let todayStr = new Date().toISOString().split("T")[0];
      let isToday = (date === todayStr);
      let currentHour = new Date().getHours();

      data.timeline.forEach(function (slot) {
        // "hour" string format example: "09:00 AM - 10:00 AM"
        var timeStr = slot.hour.split(" - ")[0]; // "09:00 AM"
        var timeParts = timeStr.split(" "); // ["09:00", "AM"]
        var hm = timeParts[0].split(":");
        var h = parseInt(hm[0]);
        if (timeParts[1] === "PM" && h < 12) h += 12;
        if (timeParts[1] === "AM" && h === 12) h = 0;
        
        if (isToday && h < currentHour) return;

        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-slot px-4 py-3 border border-gray-200 bg-white text-gray-900 rounded-xl cursor-pointer font-medium text-sm transition-all hover:border-blue-500";

        btn.textContent = slot.hour;

        if (slot.chairs_left === 0) {
          btn.disabled = true;
          btn.className += " opacity-50 line-through cursor-not-allowed";
          btn.textContent += " (Full)";
        } else {
          btn.onclick = function () {
            // Deselect others
            document.querySelectorAll(".btn-slot").forEach((b) => {
              b.classList.remove("slot-selected");
            });
            // Select this
            btn.classList.add("slot-selected");

            // Convert "09:00 AM" to "09:00:00" for DB
            var timeParts = timeStr.split(" "); // ["09:00", "AM"]
            var hm = timeParts[0].split(":");
            var h = parseInt(hm[0]);
            var m = hm[1];
            if (timeParts[1] === "PM" && h < 12) h += 12;
            if (timeParts[1] === "AM" && h === 12) h = 0;

            var formattedTime = h.toString().padStart(2, "0") + ":" + m + ":00";

            document.getElementById("selected-time-slot").value = formattedTime;
            document.getElementById("btn-confirm-book").style.display = "block";
          };
        }
        container.appendChild(btn);

        // Auto-select if this is the AI recommended slot
        if (window.aiRecommendedSlot && window.aiRecommendedSlot === slot.hour && !btn.disabled) {
            // Use setTimeout to ensure the DOM is ready and the button can be styled correctly
            setTimeout(() => {
                btn.click();
            }, 100);
        }
      });

      // Scroll to times
      section.classList.remove("hidden");
      section.scrollIntoView({ behavior: "smooth" });
    });
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

  if (fileInput && fileInput.files && fileInput.files.length > 0) {
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
                popup: "bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700",
                title: "dark:text-white",
                confirmButton: "bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 px-6 py-2.5 rounded-xl border border-blue-500 hover:border-blue-600 shadow-blue-500/30"
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
                popup: "bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700",
                title: "dark:text-white",
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
          popup: "bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700",
          title: "dark:text-white",
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
          popup: "bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700",
          title: "dark:text-white",
          confirmButton: "bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-2 px-6 py-2.5 rounded-xl border border-red-500 w-full mb-2",
          cancelButton: "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white text-gray-800 font-bold px-6 py-2.5 rounded-xl transition-colors w-full",
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
        el.classList.remove("border-blue-600", "ring-2", "ring-blue-100", "dark:ring-blue-900/40");
        el.style.borderColor = "";
    });
    element.classList.add("border-blue-600", "ring-2", "ring-blue-100", "dark:ring-blue-900/40");
    element.style.borderColor = "#2563eb";
  }

  var timeSlotField = document.getElementById("selected-time-slot");
  if (timeSlotField) timeSlotField.value = time24h;

  // Derive shift from the SELECTED TIME SLOT, not the wall clock
  let slotHour = parseInt(time24h.split(':')[0]);
  let slotShift = (slotHour >= 9 && slotHour < 17) ? 1 : 2;

  // Inter-Shift Transition Logic: Handover 16:50 - 17:00
  let now = new Date();
  if (now.getHours() === 16 && now.getMinutes() >= 50) {
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
      <div onclick="confirmManualWalkin('${doc.id}', '${time24h}', '${hourStr}')" class="doc-select-card cursor-pointer flex items-center p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all bg-white">
          <img src="${doc.image_url}" class="w-12 h-12 rounded-full object-cover mr-4 border-2 border-gray-200" onerror="this.src='../image/default_user.png'">
          <div>
              <p class="doc-name font-bold text-gray-900">${doc.name}</p>
              <p class="doc-gender text-xs font-semibold text-indigo-500 uppercase tracking-wider">${gender}</p>
              <p class="doc-spec text-xs text-gray-500">${doc.specialization}</p>
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
        
        todayBtn.classList.add("bg-white", "dark:bg-gray-700", "shadow-sm", "text-blue-600", "dark:text-blue-400");
        todayBtn.classList.remove("text-gray-500");
        
        futureBtn.classList.remove("bg-white", "dark:bg-gray-700", "shadow-sm", "text-blue-600", "dark:text-blue-400");
        futureBtn.classList.add("text-gray-500");
    } else {
        todayContent.classList.add("hidden");
        futureContent.classList.remove("hidden");
        
        futureBtn.classList.add("bg-white", "dark:bg-gray-700", "shadow-sm", "text-blue-600", "dark:text-blue-400");
        futureBtn.classList.remove("text-gray-500");
        
        todayBtn.classList.remove("bg-white", "dark:bg-gray-700", "shadow-sm", "text-blue-600", "dark:text-blue-400");
        todayBtn.classList.add("text-gray-500");
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
            <div class="md:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 py-16 text-center">
                <ion-icon name="receipt-outline" style="font-size: 4rem;" class="text-gray-200 dark:text-gray-700 block mx-auto mb-3"></ion-icon>
                <p class="text-gray-400 dark:text-gray-500 text-lg font-medium">No invoices yet</p>
                <p class="text-gray-300 dark:text-gray-600 text-sm mt-1">When your clinic issues a bill, it will appear here.</p>
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
        if (unpaidCount > 0) {
            alertBanner.classList.remove('hidden');
            const alertTotal = document.getElementById('billing-alert-total');
            const alertText = document.getElementById('billing-alert-text');
            if (alertTotal) alertTotal.textContent = '$' + unpaidTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            if (alertText) alertText.textContent = `You have ${unpaidCount} unpaid invoice${unpaidCount > 1 ? 's' : ''}. Please settle them before the due date.`;
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
                : 'border-gray-200 dark:border-gray-700 opacity-60';

        // Status stamp
        let stampHtml = '';
        if (isPending) {
            stampHtml = `<div class="absolute top-4 right-4 rotate-[-12deg] border-[3px] border-red-500 text-red-500 font-black text-sm px-3 py-1 rounded-md uppercase tracking-wider opacity-80">Unpaid</div>`;
        } else if (isPaid) {
            stampHtml = `<div class="absolute top-4 right-4 rotate-[-12deg] border-[3px] border-emerald-500 text-emerald-500 font-black text-sm px-3 py-1 rounded-md uppercase tracking-wider opacity-80">Paid</div>`;
        } else {
            stampHtml = `<div class="absolute top-4 right-4 rotate-[-12deg] border-[3px] border-gray-400 text-gray-400 font-black text-sm px-3 py-1 rounded-md uppercase tracking-wider opacity-60">${inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}</div>`;
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
        <div class="relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm border-2 ${borderClass} overflow-hidden transition-all hover:shadow-md">
            ${stampHtml}

            <!-- Receipt Header -->
            <div class="px-6 pt-5 pb-3">
                <div class="flex items-center gap-3 mb-1">
                    <div class="w-10 h-10 rounded-xl ${isPending ? 'bg-red-100 dark:bg-red-900/30' : isPaid ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gray-100 dark:bg-gray-700'} flex items-center justify-center">
                        <ion-icon name="${isPending ? 'time-outline' : isPaid ? 'checkmark-done-outline' : 'close-outline'}" class="text-xl ${isPending ? 'text-red-500' : isPaid ? 'text-emerald-500' : 'text-gray-400'}"></ion-icon>
                    </div>
                    <div>
                        <p class="text-sm font-bold text-gray-900 dark:text-white">Invoice #INV-${String(inv.id).padStart(4, '0')}</p>
                        <p class="text-xs text-gray-400 dark:text-gray-500">Issued: ${inv.date}</p>
                    </div>
                </div>
            </div>

            <!-- Dashed Separator -->
            <div class="px-6"><div class="border-t-2 border-dashed border-gray-200 dark:border-gray-700"></div></div>

            <!-- Itemized Breakdown -->
            <div class="px-6 py-4 space-y-2.5">
                <div class="flex justify-between text-sm">
                    <span class="text-gray-500 dark:text-gray-400">Subtotal</span>
                    <span class="text-gray-700 dark:text-gray-300 font-medium">$${inv.subtotal}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-gray-500 dark:text-gray-400">Tax (10%)</span>
                    <span class="text-amber-600 dark:text-amber-400 font-medium">+$${inv.tax}</span>
                </div>
            </div>

            <!-- Dashed Separator -->
            <div class="px-6"><div class="border-t-2 border-dashed border-gray-200 dark:border-gray-700"></div></div>

            <!-- Total -->
            <div class="px-6 py-3 flex justify-between items-center">
                <span class="text-base font-bold text-gray-900 dark:text-white">TOTAL</span>
                <span class="text-2xl font-black ${isPending ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}">$${inv.total}</span>
            </div>

            <!-- Due Date -->
            <div class="px-6 pb-2">
                <div class="flex justify-between text-xs">
                    <span class="text-gray-400 dark:text-gray-500">Due Date</span>
                    <span class="${isPending ? 'text-red-500 font-semibold' : 'text-gray-500 dark:text-gray-400'}">${inv.due_date || 'N/A'}</span>
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
    if (v.length >= 3) v = v.substring(0, 2) + '/' + v.substring(2);
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
                html: `<p class="text-gray-600">${data.message}</p>`,
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
        if (notifications && notifications.length > 0) {
            const latest = notifications[0];
            const msgPreview = latest.message.length > 60 ? latest.message.substring(0, 60) + '...' : latest.message;
            latestContainer.innerHTML = `
                <p class="text-xs font-bold text-gray-900 dark:text-white mb-1">${latest.topic || 'Update'}</p>
                <p class="text-[11px] text-gray-500 dark:text-gray-400">${msgPreview}</p>
                <p class="text-[9px] text-gray-400 mt-2 text-right">${latest.date || ''}</p>
            `;
            latestContainer.classList.add("cursor-pointer", "hover:bg-blue-100/50", "dark:hover:bg-gray-600/50", "transition-colors");
            latestContainer.onclick = function() {
                handleViewNotification(latest);
                toggleNotificationMenu();
            };
        } else {
            latestContainer.innerHTML = '<p class="text-xs text-gray-500 text-center py-2">No recent notifications</p>';
            latestContainer.onclick = null;
            latestContainer.className = "bg-blue-50/50 dark:bg-gray-700/50 rounded-xl p-3 border border-blue-100/50 dark:border-gray-600";
        }
    }

    if (!notifications || notifications.length === 0) {
      html = '<tr><td colspan="4" class="py-12 text-center text-gray-500">No notifications yet.</td></tr>';
    } else {
      notifications.forEach((notif) => {
        if (notif.is_read == 0) unreadCount++;
        const date = notif.date || 'N/A';
        const topic = notif.topic || 'General';
        const msgPreview = notif.message.length > 60 ? notif.message.substring(0, 60) + '...' : notif.message;
        const readBold = notif.is_read == 0 ? 'font-bold' : '';
        const unreadBg = notif.is_read == 0 ? 'bg-blue-50/50 dark:bg-blue-900/10' : '';
        const unreadBadge = notif.is_read == 0 ? '<span class="notif-new-badge ml-2 px-1.5 py-0.5 bg-blue-600 text-white text-[10px] rounded-full uppercase tracking-tighter">New</span>' : '';
        
        // Display 'Admin' instead of full email if the sender is admin
        let sender = notif.sender_name || notif.sender || 'Admin';
        if (sender.toLowerCase().includes('admin')) sender = 'Admin';
        
        const fullDate = notif.date || 'N/A';
        
        const formattedDate = notif.date ? new Date(notif.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
        const boldClass = notif.is_read == 0 ? 'font-bold' : '';
        const bgClass = notif.is_read == 0 ? 'bg-blue-50/50 dark:bg-blue-900/10' : '';

        let tagClass = 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'; // Default
        if (notif.topic && notif.topic.toLowerCase().includes('appointment')) {
            tagClass = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
        } else if (notif.topic && notif.topic.toLowerCase().includes('system')) {
            tagClass = 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
        } else if (notif.topic && notif.topic.toLowerCase().includes('alert')) {
            tagClass = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
        } else if (notif.topic && notif.topic.toLowerCase().includes('message')) {
            tagClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
        }

        const rowHtml = `
            <tr id="notif-row-${notif.id}" class="transition-all duration-300 ${bgClass} ${boldClass}" data-notif-id="${notif.id}">
                <td class="py-4 px-4 text-xs text-gray-500 whitespace-nowrap">${formattedDate}</td>
                <td class="py-4 px-4">
                    <div class="flex items-center gap-2">
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${tagClass}">
                            ${notif.topic || "Alert"}
                        </span>
                        ${notif.is_read == 0 ? `<span class="notif-new-badge px-1.5 py-0.5 bg-blue-500 text-white text-[9px] font-black rounded uppercase tracking-tighter">New</span>` : ""}
                    </div>
                </td>
                <td class="py-4 px-4 text-center">
                    <button onclick='handleViewNotification(${JSON.stringify(notif).replace(/'/g, "&apos;")})' class="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all" title="View Details">
                        <ion-icon name="eye-outline" class="text-lg"></ion-icon>
                    </button>
                </td>
            </tr>
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
        if (unreadCount > 0) {
            sidebarBadge.textContent = unreadCount;
            sidebarBadge.classList.remove("hidden");
        } else {
            sidebarBadge.classList.add("hidden");
        }
    }

    const headerBadge = document.getElementById("header-notif-badge");
    if (headerBadge) {
        if (unreadCount > 0) {
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
            row.classList.remove("font-bold", "bg-blue-50/50", "dark:bg-blue-900/10");
            const badge = row.querySelector(".notif-new-badge");
            if (badge) badge.remove();
        }

        // Decrease badge count instantly
        const sidebarBadge = document.getElementById("notif-badge");
        if (sidebarBadge && !sidebarBadge.classList.contains("hidden")) {
            let count = parseInt(sidebarBadge.textContent) || 0;
            count = Math.max(0, count - 1);
            if (count > 0) {
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
    if (currentCalendarMonth > 11) {
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
    if (nextMonth > 11) {
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
            btn.className += " text-gray-300 dark:text-gray-600 cursor-not-allowed";
            btn.disabled = true;
        } else {
            btn.className += " text-gray-700 dark:text-gray-200 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400";
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
        b.classList.remove("border-blue-500", "bg-blue-50", "dark:bg-blue-900/20");
        b.classList.add("border-gray-200", "dark:border-gray-700", "bg-white", "dark:bg-gray-800");
    });
    
    let existingBtn = document.querySelector(`.date-square-btn[data-date="${dateStr}"]`);
    if (existingBtn) {
        existingBtn.classList.remove("border-gray-200", "dark:border-gray-700", "bg-white", "dark:bg-gray-800");
        existingBtn.classList.add("border-blue-500", "bg-blue-50", "dark:bg-blue-900/20");
    } else {
        let btn = document.createElement("button");
        btn.type = "button";
        btn.className = "date-square-btn flex flex-col items-center justify-center py-3 rounded-xl border border-blue-500 bg-blue-50 dark:bg-blue-900/20 transition-all cursor-pointer";
        btn.dataset.date = dateStr;
        
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        btn.innerHTML = `
            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">${days[dateObj.getDay()]}</span>
            <span class="text-lg font-black text-gray-900 dark:text-white my-1">${dateObj.getDate()}</span>
            <span class="text-[10px] font-bold text-gray-500">${months[dateObj.getMonth()]}</span>
        `;
        
        btn.onclick = function() {
            document.querySelectorAll(".date-square-btn").forEach(b => {
                b.classList.remove("border-blue-500", "bg-blue-50", "dark:bg-blue-900/20");
                b.classList.add("border-gray-200", "dark:border-gray-700", "bg-white", "dark:bg-gray-800");
            });
            this.classList.remove("border-gray-200", "dark:border-gray-700", "bg-white", "dark:bg-gray-800");
            this.classList.add("border-blue-500", "bg-blue-50", "dark:bg-blue-900/20");
            
            if (dateInput) {
                dateInput.value = this.dataset.date;
                dateInput.dispatchEvent(new Event('change'));
            }
        };
        
        if (grid.children.length >= 7) {
            grid.removeChild(grid.lastChild);
        }
        grid.appendChild(btn);
    }
}
