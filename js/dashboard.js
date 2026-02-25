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
      applyDarkMode(!document.documentElement.classList.contains("dark"))
    );
  }

  if (userMenuButton && userMenu) {
    userMenuButton.addEventListener("click", () =>
      userMenu.classList.toggle("hidden")
    );
    document.addEventListener("click", (e) => {
      if (!userMenuButton.contains(e.target) && !userMenu.contains(e.target))
        userMenu.classList.add("hidden");
    });
  }

  window.showSection = function (viewId) {
    const sections = document.querySelectorAll(".content-section");
    const navLinks = document.querySelectorAll(".sidebar-link[data-view], .nav-link[data-view]");

    sections.forEach((s) => s.classList.remove("active"));
    const el = document.getElementById("view-" + viewId);
    if (el) {
      el.classList.add("active");
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

  // Initialize Default Section
  window.addEventListener("DOMContentLoaded", () => {
    window.showSection("dashboard");
  });

  // Hook up navigation links
  document.querySelectorAll(".sidebar-link[data-view], .nav-link[data-view]").forEach((link) => {
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
        document.getElementById("welcome-name").textContent = responseData.user.name;
        document.getElementById("header-user-name").textContent = responseData.user.name;
        document.getElementById("sidebar-user-name").textContent = responseData.user.name;
        document.getElementById("profile-display-name").textContent = responseData.user.name;
        
        document.getElementById("user-initial-header").textContent = responseData.user.initial;
        document.getElementById("user-initial-sidebar").textContent = responseData.user.initial;
        document.getElementById("user-initial-profile").textContent = responseData.user.initial;
        
        document.getElementById("profile-name").value = responseData.user.name;

        /* ── Populate Profile Email ── */
        if (responseData.user.email) {
          document.getElementById("profile-email").value = responseData.user.email;
        }

        /* ── Populate Stat Cards ── */
        if (responseData.stats) {
            document.getElementById("stat-health").textContent = responseData.stats.health_status || "Good";
            document.getElementById("stat-upcoming").textContent = responseData.stats.upcoming || "0";
            document.getElementById("stat-prescriptions").textContent = responseData.stats.prescriptions || "0";
            
            // Apply color to health status
            const healthEl = document.getElementById("stat-health");
            if (responseData.stats.health_status === 'Critical') {
                healthEl.className = "text-2xl font-bold text-red-500";
            } else if (responseData.stats.health_status === 'Fair') {
                healthEl.className = "text-2xl font-bold text-orange-500";
            } else {
                healthEl.className = "text-2xl font-bold text-green-500";
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
            if (appointment.status.toLowerCase() !== "terminated" && appointment.status.toLowerCase() !== "cancelled" && appointment.status.toLowerCase() !== "completed") {
                pendingCount++;
            }

            // Decide the badge colour based on priority
            var priorityBadge = '<span class="badge badge-gray">Normal</span>';
            if (appointment.priority === "Highly Important")
              priorityBadge = '<span class="badge badge-red">Highly Important</span>';
            if (appointment.priority === "Important")
              priorityBadge = '<span class="badge badge-orange">Important</span>';

            allRows +=
              "<tr>" +
              "<td>" +
              '<div class="font-bold text-gray-900 dark:text-white">' + appointment.date + '</div>' +
              '</td>' +
              "<td>" +
              appointment.reason +
              "</td>" +
              '<td>' + priorityBadge + '</td>' +
              "<td>" +
              '<span class="badge badge-blue">' + appointment.status + '</span>' +
              "</td>" +
              "<td>" +
              '<div class="flex items-center gap-2">' +
              '<div class="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 font-bold">' + appointment.ticket_code + '</div>' +
              '<span class="text-xs text-gray-500">~' + appointment.wait_time + 'm</span>' +
              '</div>' +
              "</td>" +
              "<td>";

            // Show Terminate button for pending/accepted/delayed appointments
            if (
              ["pending", "accepted", "delayed", "general", "walk-in"].includes(
                appointment.status.toLowerCase(),
              )
            ) {
              allRows +=
                '<button class="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors btn-terminate" data-id="' +
                appointment.appointment_id +
                '"><ion-icon name="trash-outline" class="text-lg"></ion-icon></button>';
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

        /* ── Populate Recent Activity (New Logic) ── */
        const actContainer = document.getElementById("activity-container");
        if (actContainer) {
            let activityHtml = "";
            const appts = responseData.appointments || [];
            if (appts.length > 0) {
                // Show last 3 appointments as activity
                appts.slice(0, 3).forEach(appt => {
                    const statusColor = appt.status.toLowerCase() === 'terminated' ? '#f44336' : '#4caf50';
                    const icon = appt.status.toLowerCase() === 'terminated' ? 'close-outline' : 'calendar-outline';
                    activityHtml += `
                        <div class="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
                            <div class="h-10 w-10 rounded-full flex items-center justify-center text-lg" style="background:${statusColor}22; color:${statusColor};">
                                <ion-icon name="${icon}"></ion-icon>
                            </div>
                            <div class="flex-grow">
                                <div class="text-sm font-bold text-gray-900 dark:text-white">${appt.status.toLowerCase() === 'terminated' ? 'Appointment Terminated' : 'Ticket: ' + appt.ticket_code}</div>
                                <div class="text-xs text-gray-500 dark:text-gray-400">${appt.date} • ${appt.reason.substring(0, 40)}...</div>
                            </div>
                        </div>
                    `;
                });
            } else {
                activityHtml = '<p class="py-4 text-center text-gray-500 dark:text-gray-400 italic">No recent activity to show.</p>';
            }
            actContainer.innerHTML = activityHtml;
        }

        /* ── Populate Doctors Grid ── */
        var doctorsList = document.getElementById("doctors-list");
        if (doctorsList && responseData.doctors) {
          doctorsList.innerHTML = "";

          responseData.doctors.forEach(function (doctor) {
            var card = document.createElement("div");
            card.className = "doctor-card-mini group";
            card.innerHTML =
              '<div class="relative mb-3">' +
              '<img src="' + doctor.image_url + '"' +
              '     class="w-full h-32 rounded-xl object-cover"' +
              "     onerror=\"this.src='../image/default_user.png'\">" +
              '</div>' +
              '<div class="font-bold text-sm text-gray-900 dark:text-white truncate">' + doctor.name + '</div>' +
              '<div class="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mt-1">' + (doctor.specialization || "General") + '</div>';
            card.onclick = function () {
              openDoctorModal(doctor);
            };
            doctorsList.appendChild(card);
          });

          /* ── Populate Availability Filter ── */
          var doctorFilter = document.getElementById(
            "availability-doctor-filter",
          );
          if (doctorFilter) {
            // Keep the "All Doctors" option
            doctorFilter.innerHTML = '<option value="">All Doctors</option>';
            var ticketDocSelect = document.getElementById(
              "ticket-doctor-select",
            );
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
        
        // Ensure Dashboard is visible after data is loaded
        window.showSection("dashboard");
      })
      .catch(function (error) {
        console.error("Error fetching dashboard data:", error);
        loadingOverlay.style.display = "none";
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
          var badgeClass = isFull ? "badge-full" : (slot.status === "Almost Full" ? "badge-limited" : "badge-available");
          var chairIcon = isFull ? "🚫" : "🪑";
          var clickableStyle = isFull ? "opacity: 0.6; cursor: not-allowed;" : "cursor: pointer;";
          var clickHandler = isFull ? `Swal.fire('Slot Full', 'Please choose another time.', 'info')` : `selectTimeFromTimeline('${slot.time_24h}', '${slot.hour}')`;

          timelineHtml += `
            <div class="timeline-hour flex flex-col items-center justify-center min-w-[120px] p-4 border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:border-blue-500 transition-all ${isFull ? 'opacity-60' : ''}" 
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
      if (
        !confirm(
          "Are you sure you want to take a ticket for immediate service?",
        )
      )
        return;

      var doctorId = document.getElementById("ticket-doctor-select").value;

      var formData = new FormData();
      formData.append("take_ticket", "1");
      if (doctorId) formData.append("doctor_id", doctorId);

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
          alert("Failed to take a ticket. Please try again.");
        });
    });
  }

  /* ─────────────────────────────────────────────
     Doctor Profile Modal
     Shows doctor details and lets users book.
     ───────────────────────────────────────────── */
  window.closeDoctorModal = function() {
    document.getElementById("doctor-modal").classList.add("hidden");
  };

  function openDoctorModal(doctor) {
    selectedDoctor = doctor;

    document.getElementById("modal-doc-img").src = doctor.image_url;
    document.getElementById("modal-doc-name").textContent = doctor.name;
    document.getElementById("modal-doc-spec").textContent =
      doctor.specialization;
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
    document.getElementById("display-doc-name").textContent =
      selectedDoctor.name;
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
    var reasonText = document.getElementById("reason").value;
    var appointmentDate = document.getElementById("appointment-date").value;
    var doctorIdInput = document.getElementById("selected-doctor-id").value;

    if (!reasonText || !appointmentDate) {
      alert("Please fill in the date and reason.");
      return;
    }

    // Show the AI loading spinner
    const aiLoading = document.getElementById("ai-loading");
    const aiResultPanel = document.getElementById("ai-result-panel");
    const timeSlotSection = document.getElementById("time-slot-section");
    const btnAnalyze = document.getElementById("btn-analyze");

    aiLoading.classList.remove("hidden");
    aiResultPanel.classList.add("hidden");
    timeSlotSection.classList.add("hidden");
    btnAnalyze.disabled = true;
    btnAnalyze.textContent = "Analyzing...";

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
        btnAnalyze.textContent = "🔍 Analyze Symptoms & Find Time";

        if (aiData.status === "success" && aiData.triage) {
          displayAiResults(aiData);
          // Step 2: Load available slots
          loadBookingSlots(appointmentDate, doctorIdInput);
        } else {
          alert("AI Analysis failed. Showing available times anyway.");
          loadBookingSlots(appointmentDate, doctorIdInput);
        }
      })
      .catch(function (error) {
        console.error("AI triage error:", error);
        aiLoading.style.display = "none";
        btnAnalyze.disabled = false;
        btnAnalyze.textContent = "🔍 Analyze Symptoms & Find Time";

        // Fallback
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
            "padding:10px; border:1px solid #ddd; background:white; border-radius:5px; cursor:pointer;";
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

              var formattedTime =
                h.toString().padStart(2, "0") + ":" + m + ":00";

              document.getElementById("selected-time-slot").value =
                formattedTime;
              document.getElementById("btn-confirm-book").style.display =
                "block";
            };
          }
          container.appendChild(btn);
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
    document.getElementById("ai-suggestion").textContent =
      triageInfo.suggestion;
    document.getElementById("ai-specialty").textContent =
      triageInfo.recommended_specialty;

    // Color the priority text based on level
    var priorityElement = document.getElementById("ai-priority");
    if (triageInfo.priority === "Highly Important") {
      priorityElement.style.color = "#c62828";
    } else if (triageInfo.priority === "Important") {
      priorityElement.style.color = "#e65100";
    } else {
      priorityElement.style.color = "#2e7d32";
    }

    // Show matching doctors if available
    var matchingDoctorsSection = document.getElementById("ai-matching-doctors");
    var doctorsListContainer = document.getElementById("ai-doctors-list");

    if (aiData.matching_doctors && aiData.matching_doctors.length > 0) {
      matchingDoctorsSection.style.display = "block";
      doctorsListContainer.innerHTML = "";

      aiData.matching_doctors.forEach(function (doctor) {
        var doctorChip = document.createElement("div");
        doctorChip.style.cssText =
          "background:white; padding:8px 14px; border-radius:20px; font-size:13px; display:flex; align-items:center; gap:6px; cursor:pointer; border:1px solid #e0e0e0;";
        doctorChip.innerHTML =
          "👨‍⚕️ <strong>" +
          doctor.name +
          "</strong> <small>(" +
          doctor.specialization +
          ")</small>";

        // Clicking a recommended doctor selects them
        doctorChip.onclick = function () {
          document.getElementById("selected-doctor-id").value = doctor.id;
          document.getElementById("display-doc-name").textContent = doctor.name;
          document.getElementById("selected-doctor-display").style.display =
            "flex";
          if (doctor.image_url) {
            document.getElementById("display-doc-img").src = doctor.image_url;
          }
        };

        doctorsListContainer.appendChild(doctorChip);
      });
    } else {
      matchingDoctorsSection.style.display = "none";
    }

    // Show the panel
    resultPanel.classList.remove("hidden");
    resultPanel.style.display = "block"; // Keep for compatibility if needed
    
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

        if (result.status === "success") {
          messageDiv.style.background = "#e8f5e9";
          messageDiv.style.color = "#2e7d32";
          messageDiv.innerHTML = "<strong>Success!</strong> " + result.message;

          // Reset the form and refresh data
          document.getElementById("appointmentForm").reset();
          document.getElementById("ai-result-panel").classList.add("hidden");
          document.getElementById("selected-doctor-display").classList.add("hidden");
          document.getElementById("selected-doctor-display").classList.remove("flex");
          fetchDashboardData();
          loadAvailabilityTimeline();
        } else {
          messageDiv.style.background = "#ffebee";
          messageDiv.style.color = "#c62828";
          messageDiv.textContent = result.message;
        }
      })
      .catch(function (error) {
        console.error("Booking error:", error);
        var btnAnalyze = document.getElementById("btn-analyze");
        btnAnalyze.disabled = false;
        btnAnalyze.textContent = "🔍 Analyze Symptoms & Find Time";
        alert("Submission failed. Please try again.");
      });
  }

  /* ── 4. Profile Update ── */
  var btnUpdateProfile = document.getElementById("btn-update-profile");
  if (btnUpdateProfile) {
    btnUpdateProfile.addEventListener("click", function () {
      var name = document.getElementById("profile-name").value;
      var email = document.getElementById("profile-email").value;
      var phone = document.getElementById("profile-phone").value;

      var formData = new FormData();
      formData.append("update_profile", "1");
      formData.append("name", name);
      formData.append("email", email);
      formData.append("phone", phone);

      fetch("../php/dashboard_api.php", {
        method: "POST",
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "success") {
            alert("Profile updated successfully!");
            document.getElementById("user-name").textContent = name; // Update header
          } else {
            alert("Error: " + data.message);
          }
        })
        .catch((err) => console.error(err));
    });
  }

  /* ── 5. Terminate Appointment ── */
  window.terminateAppointment = function (apptId) {
    if (!confirm("Are you sure you want to terminate this appointment?"))
      return;

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
          alert("Appointment terminated successfully.");
          fetchDashboardData(); // Refresh list
        } else {
          alert("Error: " + data.message);
        }
      })
      .catch((err) => {
        console.error("Termination error:", err);
        alert("Failed to terminate appointment.");
      });
  };

  /* ── 6. Select Time from Timeline ── */
  window.selectTimeFromTimeline = function (time24h, hourStr) {
    // 1. Scroll to the booking form section
    var target = document.getElementById("view-appointments");
    if (target) {
        target.scrollIntoView({ behavior: "smooth" });
    }

    // 2. Pre-fill today's date
    var today = new Date().toISOString().split("T")[0];
    var dateField = document.getElementById("appointment-date");
    if (dateField) {
        dateField.value = today;
    }

    // 3. Set the hidden time slot 24h value
    var timeSlotField = document.getElementById("selected-time-slot");
    if (timeSlotField) {
        timeSlotField.value = time24h;
    }

    // 4. Update UI to show what time they're aiming for
    var msgDiv = document.getElementById("appt-message");
    if (msgDiv) {
        msgDiv.style.display = "block";
        msgDiv.style.background = "#e3f2fd";
        msgDiv.style.color = "#1565c0";
        msgDiv.innerHTML = "<strong>Time Selected: " + hourStr + "</strong><br>Please describe your symptoms/reason below and click Analyze to confirm availability.";
    }

    // 5. Show the confirmation button if they click from timeline
    var confirmBtn = document.getElementById("btn-confirm-book");
    if (confirmBtn) {
        confirmBtn.style.display = "block";
    }

    // 6. Focus on reason
    var reasonField = document.getElementById("reason");
    if (reasonField) {
        reasonField.focus();
        // Subtle animation
        reasonField.style.boxShadow = "0 0 10px rgba(33, 150, 243, 0.5)";
        setTimeout(function() {
            reasonField.style.boxShadow = "none";
        }, 2000);
    }
  };
