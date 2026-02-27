/* ═══════════════════════════════════════════════════════════
   Patient Dashboard – Main Script
   Handles: data loading, navigation, doctor modal,
            AI triage, appointment booking, and timeline.

   Connected to:
     - php/dashboard_api.php   (data loading)
     - Ai/ai_triage.php        (symptom analysis)
     - Ai/ai_scheduler.php     (availability timeline)
     - php/appointment_handler.php (booking)
   ═══════════════════════════════════════════════════════════ */

const loadingOverlay = document.getElementById("loading-overlay");
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

/* ── 1. Load Dashboard Data on Page Ready ── */

fetchDashboardData();
loadAvailabilityTimeline();

/* ── 2. UI Logic: Sidebar & Dark Mode ── */
if (sidebarToggle) {
  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("sidebar-collapsed");
    sidebar.classList.toggle("sidebar-expanded");
    if (sidebar.classList.contains("sidebar-collapsed")) {
      mainContent.classList.remove("ml-64");
      mainContent.classList.add("ml-[4.5rem]");
    } else {
      mainContent.classList.remove("ml-[4.5rem]");
      mainContent.classList.add("ml-64");
    }
  });
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

/* ── 3. Appointment Booking Form ── */
const btnAnalyze = document.getElementById("btn-analyze");
if (btnAnalyze) {
  btnAnalyze.addEventListener("click", function () {
    analyzeAndShowTimes();
  });
}

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



/* ─────────────────────────────────────────────
     fetchDashboardData()
     Pulls user info, stats, doctors, appointments,
     and timeline from the API.
     ───────────────────────────────────────────── */
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

      /* ── Extract actual data from wrapper ── */
      if (data.status !== "success") {
        console.error("API returned error:", data.message);
        loadingOverlay.style.display = "none";
        return;
      }

      const responseData = data.data;
      console.log("Dashboard Data Loaded:", responseData); // Helpful debug log
      /* ── Populate User Info ── */
      document.getElementById("welcome-name").textContent =
        responseData.user.name;
      document.getElementById("header-user-name").textContent =
        responseData.user.name;
      document.getElementById("sidebar-user-name").textContent =
        responseData.user.name;
      document.getElementById("profile-display-name").textContent =
        responseData.user.name;

      document.getElementById("user-initial-header").textContent =
        responseData.user.initial;
      document.getElementById("user-initial-sidebar").textContent =
        responseData.user.initial;
      document.getElementById("user-initial-profile").textContent =
        responseData.user.initial;

      document.getElementById("profile-name").value = responseData.user.name;

      /* ── Populate Profile Email ── */
      if (responseData.user.email) {
        document.getElementById("profile-email").value =
          responseData.user.email;
      }

      /* ── Populate Stat Cards ── */
      if (responseData.stats) {
        document.getElementById("stat-health").textContent =
          responseData.stats.health_status || "Good";
        document.getElementById("stat-upcoming").textContent =
          responseData.stats.upcoming || "0";
        document.getElementById("stat-prescriptions").textContent =
          responseData.stats.prescriptions || "0";

        // Apply color to health status
        const healthEl = document.getElementById("stat-health");
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

      /* ── Populate Appointments Table ── */
      var appointmentsBody = document.getElementById("appointments-list");
      appointmentsBody.innerHTML = "";

      if (responseData.appointments.length === 0) {
        appointmentsBody.innerHTML =
          '<tr><td colspan="6">No appointments found.</td></tr>';
        document.getElementById("stat-upcoming").textContent = "0";
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
          var priorityBadge = '<span class="badge badge-gray">Normal</span>';
          if (appointment.priority === "Highly Important")
            priorityBadge =
              '<span class="badge badge-red">Highly Important</span>';
          if (appointment.priority === "Important")
            priorityBadge = '<span class="badge badge-orange">Important</span>';

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
        document.getElementById("stat-upcoming").textContent = pendingCount;

        // Add event listeners to terminate buttons
        document.querySelectorAll(".btn-terminate").forEach((btn) => {
          btn.addEventListener("click", function () {
            terminateAppointment(this.getAttribute("data-id"));
          });
        });
      }

      /* ── Populate Recent Activity ── */
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

      /* ── Populate Notifications ── */
      if (responseData.notifications) {
          renderNotifications(responseData.notifications);
      }

      /* ── Populate Doctors Grid ── */
      const doctorsContainer = document.getElementById("doctors-list");
      if (doctorsContainer && responseData.doctors) {
          allDoctors = responseData.doctors;
          renderDoctorsGrid();
          
          // Show toggle button if more than 5 doctors
          const toggleCont = document.getElementById("doctors-toggle-container");
          if (toggleCont) {
              if (allDoctors.length > 5) {
                  toggleCont.classList.remove("hidden");
              } else {
                  toggleCont.classList.add("hidden");
              }
          }
      }

      /* ── Populate Availability Filter ── */
      var doctorFilter = document.getElementById(
          "availability-doctor-filter",
      );
      if (doctorFilter) {
          // Keep the "All Doctors" option
          doctorFilter.innerHTML = '<option value="">All Doctors</option>';
          var ticketDocSelect = document.getElementById("ticket-doctor-select");
          if (ticketDocSelect)
              ticketDocSelect.innerHTML =
                  '<option value="">Next Available Doctor</option>';

          responseData.doctors.forEach(function (doctor) {
              var option = document.createElement("option");
              option.value = doctor.id;
              option.textContent =
                  doctor.name + " (" + (doctor.specialization || "General") + ")";
              doctorFilter.appendChild(option);

              // Also populate ticket doctor select
              if (ticketDocSelect) {
                  var tOption = option.cloneNode(true);
                  ticketDocSelect.appendChild(tOption);
              }
          });
      }


      /* ── Render Medical Records ── */
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

      /* ── Render Prescriptions ── */
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

      /* ── Populate Profile Form ── */
      // Assuming we add a phone field to the API response later, or use empty for now
      // data.user doesn't have phone in previous API code, let's assume we might need to add it to API
      // or just use what we have. API sends name, email.

      /* ── Hide Loading Overlay ── */
      loadingOverlay.style.display = "none";
    })
    .catch(function (error) {
      console.error("Error fetching dashboard data:", error);
      loadingOverlay.style.display = "none";
    });
}

/**
 * Renders the doctors grid based on the 'showAllDoctors' flag.
 */
function renderDoctorsGrid() {
    const list = document.getElementById("doctors-list");
    if (!list) return;
    list.innerHTML = "";
    
    // Slice doctors if needed
    const doctorsToShow = showAllDoctors ? allDoctors : allDoctors.slice(0, 5);
    
    doctorsToShow.forEach(function(doctor) {
        const card = document.createElement("div");
        card.className = "doctor-card-mini group animate-fade-in";
        card.innerHTML = `
            <div class="relative mb-3 overflow-hidden rounded-xl">
                <img src="${doctor.image_url}" 
                     class="w-full h-32 object-cover transform group-hover:scale-110 transition-transform duration-500"
                     onerror="this.src='../image/default_user.png'">
            </div>
            <div class="font-bold text-sm text-gray-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">${doctor.name}</div>
            <div class="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mt-1">${doctor.specialization || 'General'}</div>
        `;
        card.onclick = () => openDoctorModal(doctor);
        list.appendChild(card);
    });
}

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



/* ─────────────────────────────────────────────
     loadAvailabilityTimeline(doctorId)
     Calls the AI Scheduler to get today's hourly
     chair availability and renders the timeline.
     Connected to: 📊 Today's Availability
     ───────────────────────────────────────────── */
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

      data.timeline.forEach(function (slot) {
        var isFull = slot.chairs_left === 0;
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
          : `selectTimeFromTimeline('${slot.time_24h}', '${slot.hour}', this)`;

        timelineHtml += `
            <div class="timeline-hour flex flex-col items-center justify-center min-w-[120px] p-4 border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:border-blue-500 transition-all ${isFull ? "opacity-60" : ""}" 
                 style="${clickableStyle}" onclick="${clickHandler}">
                <div class="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">${slot.hour}</div>
                <div class="badge ${badgeClass} text-[10px] w-full flex justify-center py-1">
                    <span class="mr-1">${chairIcon}</span>
                    <span>${slot.chairs_left} Left</span>
                </div>
            </div>`;
      });

      timelineContainer.innerHTML = timelineHtml;
    })
    .catch(function (error) {
      console.error("Error loading availability:", error);
    });
}

/* ── Filter Availability by Doctor ── */
var doctorFilter = document.getElementById("availability-doctor-filter");
if (doctorFilter) {
  doctorFilter.addEventListener("change", function () {
    loadAvailabilityTimeline(this.value);
  });
}

  /* ── Take a Ticket Functionality ── */
  var btnTakeTicket = document.getElementById("btn-take-ticket");
  if (btnTakeTicket) {
    btnTakeTicket.addEventListener("click", function () {
      Swal.fire({
          title: 'Immediate Ticket',
          text: "Are you sure you want to take a ticket for immediate service?",
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#3b82f6',
          cancelButtonColor: '#9ca3af',
          confirmButtonText: 'Yes, get ticket'
      }).then((result) => {
          if (result.isConfirmed) {
              var doctorId = document.getElementById("ticket-doctor-select").value;
              var selectedTime = document.getElementById("selected-time-slot").value;
              
              var formData = new FormData();
              formData.append("take_ticket", "1");
              if (doctorId) formData.append("doctor_id", doctorId);
              if (selectedTime) formData.append("selected_time", selectedTime);

              fetch("../php/appointment_handler.php", {
                method: "POST",
                body: formData,
              })
                .then(function (response) {
                  return response.json();
                })
                .then(function (data) {
                  if (data.status === "success") {
                    const ticketRes = document.getElementById("ticket-result");
                    document.getElementById("ticket-number").textContent = "#" + data.ticket_number;
                    ticketRes.classList.remove("hidden");
                    ticketRes.style.display = "block";

                    Swal.fire({
                        title: 'Ticket Issued!',
                        text: 'Your walk-in ticket #' + data.ticket_number + ' is ready.',
                        icon: 'success',
                        confirmButtonColor: '#3b82f6'
                    });

                    // Refresh data
                    fetchDashboardData();
                    loadAvailabilityTimeline(doctorId);
                  } else {
                    Swal.fire('Error', data.message, 'error');
                  }
                })
                .catch(function (error) {
                  console.error("Error taking ticket:", error);
                  Swal.fire('Error', "Failed to take a ticket. Please try again.", 'error');
                });
          }
      });
    });
  }
  /* ─────────────────────────────────────────────
     Doctor Profile Modal
     Shows doctor details and lets users book.
     ───────────────────────────────────────────── */
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

/* ── "Book Appointment" inside modal ── */
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

/* ── "Change" doctor link ── */
document.getElementById("change-doc-btn").onclick = function () {
  document.getElementById("selected-doctor-id").value = "";
  document.getElementById("selected-doctor-display").classList.add("hidden");
  document.getElementById("selected-doctor-display").classList.remove("flex");
  selectedDoctor = null;
};

/* ─────────────────────────────────────────────
     analyzeAndShowTimes()
     Step 1: AI Triage -> Step 2: Show Time Slots
     ───────────────────────────────────────────── */
function analyzeAndShowTimes() {
  var reasonText = document.getElementById("reason").value.trim();
  var appointmentDate = document.getElementById("appointment-date").value;
  var doctorIdInput = document.getElementById("selected-doctor-id").value;

  if (!appointmentDate) {
    alert("Please fill in the date.");
    return;
  }

  const aiLoading = document.getElementById("ai-loading");
  const aiResultPanel = document.getElementById("ai-result-panel");
  const timeSlotSection = document.getElementById("time-slot-section");
  const btnAnalyze = document.getElementById("btn-analyze");

  /* ── If no reason given, skip AI and show defaults ── */
  if (!reasonText) {
    aiLoading.classList.add("hidden");
    // Show panel with "None" defaults
    document.getElementById("ai-priority").textContent = "None";
    document.getElementById("ai-priority").className = "text-lg font-bold text-gray-400";
    document.getElementById("ai-specialty").textContent = "None";
    document.getElementById("ai-suggestion").closest("div.p-4").classList.add("hidden");
    document.getElementById("ai-matching-doctors").classList.add("hidden");
    aiResultPanel.classList.remove("hidden");
    timeSlotSection.classList.remove("hidden");
    loadBookingSlots(appointmentDate, doctorIdInput);
    return;
  }

  // Show the AI loading spinner
  aiLoading.classList.remove("hidden");
  aiResultPanel.classList.add("hidden");
  timeSlotSection.classList.add("hidden");
  btnAnalyze.disabled = true;
  btnAnalyze.innerHTML = "⏳ Analyzing...";
  btnAnalyze.classList.add("opacity-50", "cursor-not-allowed");

  /* ── Step 1: Call AI Triage ── */
  fetch("../Ai/ai_triage.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reason: reasonText,
      date: appointmentDate,
      doctor_id: doctorIdInput || null,
    }),
  })
    .then(function (response) {
      return response.json();
    })
    .then(function (aiData) {
      aiLoading.classList.add("hidden");
      btnAnalyze.disabled = false;
      btnAnalyze.innerHTML = "➡️ Next";
      btnAnalyze.classList.remove("opacity-50", "cursor-not-allowed");

      if (aiData.status === "success" && aiData.triage) {
        displayAiResults(aiData);
        // Step 2: Load available slots with the newly assigned doctor from AI
        var updatedDoctorId = document.getElementById("selected-doctor-id").value;
        loadBookingSlots(appointmentDate, updatedDoctorId);
      } else {
        loadBookingSlots(appointmentDate, doctorIdInput);
      }
    })
    .catch(function (error) {
      console.error("AI triage error:", error);
      aiLoading.style.display = "none";
      btnAnalyze.disabled = false;
      btnAnalyze.innerHTML = "➡️ Next";
      btnAnalyze.classList.remove("opacity-50", "cursor-not-allowed");

      // Fallback: still show time slots
      loadBookingSlots(appointmentDate, doctorIdInput);
    });
}

/* ─────────────────────────────────────────────
     loadBookingSlots(date, doctorId)
     Fetches available hours from AI Scheduler
     and renders selectable buttons.
     ───────────────────────────────────────────── */
function loadBookingSlots(date, doctorId) {
  var url = "../Ai/ai_scheduler.php?date=" + date;
  if (doctorId) url += "&doctor_id=" + doctorId;

  // Show doctor name above time slots
  var docDisplay = document.getElementById("slot-doctor-display");
  var docNameEl  = document.getElementById("slot-doctor-name");
  if (docDisplay && docNameEl) {
    if (selectedDoctor && selectedDoctor.name) {
      docNameEl.textContent = selectedDoctor.name;
    } else {
      docNameEl.textContent = "Any Available Doctor";
    }
    docDisplay.classList.remove("hidden");
    docDisplay.classList.add("flex");
  }

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

      data.timeline.forEach(function (slot) {
        // "hour" string format example: "09:00 AM - 10:00 AM"
        // We just want the start time for the value, e.g. "09:00:00"
        // Let's parse the start hour from the display string or just rely on index/logic
        // Ideally backend sends raw time. But here we have formatted string.
        // Let's re-construct standard time from the "hour" property or add raw_time to PHP.
        // For now, let's assume we can parse or use the loop index if needed.
        // Actually, best to update PHP to send standardized start time.
        // BUT, to save a step, let's parse "09:00 AM" -> "09:00:00" logic here.

        var timeStr = slot.hour.split(" - ")[0]; // "09:00 AM"

        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-slot"; // We need to add CSS for this potentially
        btn.style.cssText =
          "padding:10px; border:1px solid #ddd; background:white; color:black; border-radius:5px; cursor:pointer;";
        btn.textContent = slot.hour;

        if (slot.chairs_left === 0) {
          btn.disabled = true;
          btn.style.opacity = "0.5";
          btn.style.background = "#eee";
          btn.textContent += " (Full)";
        } else {
          btn.onclick = function () {
            // Deselect others
            document.querySelectorAll(".btn-slot").forEach((b) => {
              b.style.background = "white";
              b.style.color = "black";
              b.style.borderColor = "#ddd";
            });
            // Select this
            btn.style.background = "#4caf50";
            btn.style.color = "white";
            btn.style.borderColor = "#4caf50";

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

/* ─────────────────────────────────────────────
     confirmBooking()
     Final step: submit everything
     ───────────────────────────────────────────── */
function confirmBooking() {
  var reasonText = document.getElementById("reason").value;
  var appointmentDate = document.getElementById("appointment-date").value;
  var doctorIdInput = document.getElementById("selected-doctor-id").value;
  var selectedTime = document.getElementById("selected-time-slot").value;
  var fileInput = document.getElementById("document");

  if (!selectedTime) {
    alert("Please select a time slot.");
    return;
  }

  bookAppointment(
    reasonText,
    appointmentDate,
    doctorIdInput,
    fileInput,
    selectedTime,
  );
}

/* ─────────────────────────────────────────────
     displayAiResults(aiData)
     Shows the AI triage analysis in the result panel.
     ───────────────────────────────────────────── */
function displayAiResults(aiData) {
  var triageInfo = aiData.triage;
  var resultPanel = document.getElementById("ai-result-panel");

  // Fill in the priority, suggestion, specialty
  document.getElementById("ai-priority").textContent = triageInfo.priority;
  document.getElementById("ai-suggestion").textContent = triageInfo.suggestion;
  document.getElementById("ai-specialty").textContent =
    triageInfo.recommended_specialty;

  // Color the priority text based on level
  var priorityElement = document.getElementById("ai-priority");
  priorityElement.className = "text-lg font-bold"; // Reset classes
  if (triageInfo.priority === "Fast/Hard" || triageInfo.priority === "Highly Important") {
    priorityElement.classList.add("text-red-600", "dark:text-red-400");
  } else if (triageInfo.priority === "Medium" || triageInfo.priority === "Important") {
    priorityElement.classList.add("text-orange-500", "dark:text-orange-400");
  } else {
    priorityElement.classList.add("text-green-600", "dark:text-green-400");
  }

  // Show matching doctors if available
  var matchingDoctorsSection = document.getElementById("ai-matching-doctors");
  var doctorsListContainer = document.getElementById("ai-doctors-list");

  if (aiData.matching_doctors && aiData.matching_doctors.length > 0) {
    matchingDoctorsSection.style.display = "block";
    doctorsListContainer.innerHTML = "";

    aiData.matching_doctors.forEach(function (doctor, index) {
      var doctorBtn = document.createElement("button");
      doctorBtn.type = "button";
      doctorBtn.className = "recommend-doc-btn flex items-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:border-blue-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-sm font-medium";
      doctorBtn.innerHTML =
        "👨‍⚕️ <span><strong>" +
        doctor.name +
        "</strong> <small class='opacity-70 font-normal'>(" +
        doctor.specialization +
        ")</small></span>";

      // Clicking a recommended doctor selects them
      doctorBtn.onclick = function () {
        // Deselect all other recommendation buttons
        document.querySelectorAll(".recommend-doc-btn").forEach(btn => {
            btn.classList.remove("bg-blue-600", "text-white", "border-blue-600", "shadow-blue-200");
            btn.classList.add("bg-white", "dark:bg-gray-800", "text-gray-900", "dark:text-gray-100", "border-gray-200", "dark:border-gray-700");
        });

        // Select this button
        doctorBtn.classList.remove("bg-white", "dark:bg-gray-800", "text-gray-900", "dark:text-gray-100", "border-gray-200", "dark:border-gray-700");
        doctorBtn.classList.add("bg-blue-600", "text-white", "border-blue-600", "shadow-lg", "shadow-blue-200", "dark:shadow-blue-900/40");

        document.getElementById("selected-doctor-id").value = doctor.id;
        document.getElementById("display-doc-name").textContent = doctor.name;
        document.getElementById("selected-doctor-display").style.display = "flex";
        
        if (doctor.image_url) {
          document.getElementById("display-doc-img").src = doctor.image_url;
        }

        // Store the selected doctor profile object
        if (typeof allDoctors !== 'undefined') {
            const docObj = allDoctors.find(d => parseInt(d.id) === parseInt(doctor.id));
            if (docObj) {
                selectedDoctor = docObj;
            }
        }
      };

      doctorsListContainer.appendChild(doctorBtn);

      // Auto-select the first doctor in the list
      if (index === 0) {
          doctorBtn.click();
      }
    });
  } else {
    matchingDoctorsSection.style.display = "none";
  }

  // Store recommended slot globally so loadBookingSlots can auto-click it
  window.aiRecommendedSlot = aiData.triage.recommended_slot;

  // Show the panel
  resultPanel.classList.remove("hidden");
  resultPanel.style.display = "block"; // Keep for compatibility if needed

  // Ensure the time slot section is also visible
  document.getElementById("time-slot-section").classList.remove("hidden");

  // Add success animation/scroll
  resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ─────────────────────────────────────────────
     bookAppointment()
     Sends the booking form to the server and
     shows success / error feedback.
     ───────────────────────────────────────────── */
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

  if (fileInput.files.length > 0) {
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

      messageDiv.style.display = "block";
      if (btnConfirm) btnConfirm.style.display = "none"; // Hide confirm button

      // Reset Analyze Button
      btnAnalyze.disabled = false;
      btnAnalyze.textContent = "🔍 Analyze Symptoms & Find Time";
      btnAnalyze.classList.remove("opacity-50", "cursor-not-allowed");

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
          document.getElementById("ai-result-panel").classList.add("hidden");
          document
            .getElementById("selected-doctor-display")
            .classList.add("hidden");
          document
            .getElementById("selected-doctor-display")
            .classList.remove("flex");
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
      btnAnalyze.disabled = false;
      btnAnalyze.textContent = "🔍 Analyze Symptoms & Find Time";
      btnAnalyze.classList.remove("opacity-50", "cursor-not-allowed");
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


  /* ── 5. Terminate (Cancel) Appointment ── */
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

/* ── 6. Select Time from Timeline ── */
window.selectTimeFromTimeline = function (time24h, hourStr, element) {
  // 0. Visual highlighting in timeline
  if (element) {
    document.querySelectorAll(".timeline-hour").forEach(el => {
        el.classList.remove("border-blue-600", "ring-2", "ring-blue-100", "dark:ring-blue-900/40");
        el.style.borderColor = "";
    });
    element.classList.add("border-blue-600", "ring-2", "ring-blue-100", "dark:ring-blue-900/40");
    element.style.borderColor = "#2563eb";
  }

  // 1. Set the hidden time slot 24h value
  var timeSlotField = document.getElementById("selected-time-slot");
  if (timeSlotField) {
    timeSlotField.value = time24h;
  }

  // 2. Update UI to show what time they're aiming for
  var msgDiv = document.getElementById("appt-message");
  if (msgDiv) {
    msgDiv.style.display = "block";
    msgDiv.style.background = "#e3f2fd";
    msgDiv.style.color = "#1565c0";
    msgDiv.innerHTML =
      "<strong>Time Selected: " +
      hourStr +
      "</strong><br>Your ticket will be issued for this time period.";
  }

  // 3. Show the confirmation button if they click from timeline
  var confirmBtn = document.getElementById("btn-take-ticket");
  if (confirmBtn) {
    confirmBtn.style.display = "block";
  }
};

/* ── 7. Tab Switching Logic ── */
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

/* ── 8. Make Selected Doctor Name Clickable ── */
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

/* ── 9. Render Notifications ── */
window.renderNotifications = function (notifications) {
    const tableBody = document.getElementById("notifications-table-body");
    if (!tableBody) return;

    let html = "";
    let unreadCount = 0;

    if (!notifications || notifications.length === 0) {
      html = '<tr><td colspan="4" class="py-12 text-center text-gray-500">No notifications yet.</td></tr>';
    } else {
      notifications.forEach((notif) => {
        if (notif.is_read == 0) unreadCount++;
        const date = notif.date || 'N/A';
        const topic = notif.topic || 'General';
        const msgPreview = notif.message.length > 60 ? notif.message.substring(0, 60) + '…' : notif.message;
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

// Handle View button click — opens modal, marks as read, and instantly updates the UI row
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

/* ── 10. Notification Modal Helpers ── */
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

/* ── 11. Secure Logout ── */
window.handleLogout = function () {
  Swal.fire({
    title: "Confirm Logout",
    text: "Are you sure you want to end your session?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3b82f6",
    cancelButtonColor: "#9ca3af",
    confirmButtonText: "Yes, logout",
  }).then((result) => {
    if (result.isConfirmed) {
      window.location.href = "../php/logout.php";
    }
  });
};
