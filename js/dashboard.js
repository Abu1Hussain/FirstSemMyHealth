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

document.addEventListener("DOMContentLoaded", function () {
  var loadingOverlay = document.getElementById("loading");

  /* ── 1. Load Dashboard Data on Page Ready ── */
  fetchDashboardData();
  loadAvailabilityTimeline();

  /* ── 2. Sidebar Navigation ── */
  // Only select links that actually have a data-view attribute
  var navLinks = document.querySelectorAll(".nav-link[data-view]");
  var sections = document.querySelectorAll(".content-section");

  navLinks.forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();

      // Highlight the active link
      navLinks.forEach(function (otherLink) {
        otherLink.classList.remove("active");
      });
      link.classList.add("active");

      // Show the matching section
      var targetView = link.getAttribute("data-view");
      sections.forEach(function (section) {
        section.classList.remove("active");
      });
      document.getElementById("view-" + targetView).classList.add("active");

      // Refresh availability when switching to appointments tab
      if (targetView === "appointments") {
        loadAvailabilityTimeline();
      }
    });
  });

  /* ── 3. Appointment Booking Form ── */
  // Removed global submit listener in favor of specific buttons
  var btnAnalyze = document.getElementById("btn-analyze");
  if (btnAnalyze) {
    btnAnalyze.addEventListener("click", function() {
        analyzeAndShowTimes();
    });
  }

  var btnConfirm = document.getElementById("btn-confirm-book");
  if (btnConfirm) {
    btnConfirm.addEventListener("click", function() {
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
      .then(function (response) { return response.json(); })
      .then(function (data) {
        // If not logged in, redirect to login page
        if (data.status === "error" && data.message === "Unauthorized") {
          window.location.href = "../loginReg/login.html";
          return;
        }

        /* ── Populate User Info ── */
        document.getElementById("user-name").textContent    = data.user.name;
        document.getElementById("user-initial").textContent  = data.user.initial;
        document.getElementById("profile-name").value        = data.user.name;

        /* ── Populate Profile Email ── */
        if (data.user.email) {
          document.getElementById("profile-email").value = data.user.email;
        }

        /* ── Populate Stat Cards ── */
        document.getElementById("stat-upcoming").textContent = data.stats.upcoming;

        /* ── Populate Appointments Table ── */
        var appointmentsBody = document.getElementById("appointments-list");
        appointmentsBody.innerHTML = "";

        if (data.appointments.length === 0) {
          appointmentsBody.innerHTML =
            '<tr><td colspan="5">No appointments found.</td></tr>';
        } else {
          var allRows = "";
          data.appointments.forEach(function (appointment) {
            // Decide the badge colour based on priority
            var priorityClass = "priority-normal";
            if (appointment.priority === "Highly Important") priorityClass = "priority-high";
            if (appointment.priority === "Important")        priorityClass = "priority-medium";

            allRows +=
              '<tr>' +
                '<td>' + appointment.date + '</td>' +
                '<td>' + appointment.reason + '</td>' +
                '<td><span class="' + priorityClass + '">' + appointment.priority + '</span></td>' +
                '<td>' + appointment.status + '</td>' +
                '<td>' +
                  '<strong style="font-size:1.1em; color:#1565c0;">' + appointment.ticket_code + '</strong><br>' +
                  '<small style="color:#7f8c8d;">~' + appointment.wait_time + ' mins</small>' +
                '</td>' +
              '</tr>';
          });
          appointmentsBody.innerHTML = allRows;
        }

        /* ── Populate Doctors Grid ── */
        var doctorsList = document.getElementById("doctors-list");
        if (doctorsList && data.doctors) {
          doctorsList.innerHTML = "";

          data.doctors.forEach(function (doctor) {
            var card = document.createElement("div");
            card.className = "doctor-card-mini";
            card.innerHTML =
              '<img src="' + doctor.image_url + '"' +
              '     class="doctor-img-mini"' +
              '     onerror="this.src=\'../image/default_user.png\'">' +
              '<div class="doctor-name-mini">' + doctor.name + '</div>' +
              '<div class="doctor-spec-mini">' + (doctor.specialization || "General") + '</div>';
            card.onclick = function () { openDoctorModal(doctor); };
            doctorsList.appendChild(card);
          });

          /* ── Populate Availability Filter ── */
          var doctorFilter = document.getElementById("availability-doctor-filter");
          if (doctorFilter) {
            // Keep the "All Doctors" option
            doctorFilter.innerHTML = '<option value="">All Doctors</option>';
            data.doctors.forEach(function(doctor) {
              var option = document.createElement("option");
              option.value = doctor.id;
              option.textContent = doctor.name + " (" + (doctor.specialization || "General") + ")";
              doctorFilter.appendChild(option);
            });
          }
          }


        /* ── Render Medical Records ── */
        var recordsBody = document.getElementById("records-list");
        if (recordsBody && data.records) {
            recordsBody.innerHTML = data.records.length ? data.records.map(r => 
                `<tr>
                    <td>${r.date}</td>
                    <td>${r.type}</td>
                    <td>${r.summary}</td>
                    <td>${r.doctor}</td>
                </tr>`
            ).join('') : '<tr><td colspan="4">No records found.</td></tr>';
        }

        /* ── Render Prescriptions ── */
        var prescriptionsBody = document.getElementById("prescriptions-list");
        if (prescriptionsBody && data.prescriptions) {
            prescriptionsBody.innerHTML = data.prescriptions.length ? data.prescriptions.map(p => 
                `<tr>
                    <td>${p.medication}</td>
                    <td>${p.dosage}</td>
                    <td>${p.frequency}</td>
                    <td>${p.duration}</td>
                    <td>${p.doctor}</td>
                </tr>`
            ).join('') : '<tr><td colspan="5">No prescriptions found.</td></tr>';
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
      .then(function (response) { return response.json(); })
      .then(function (data) {
        if (data.status !== "success") return;

        var timelineContainer = document.getElementById("daily-timeline");
        if (!timelineContainer) return;

        timelineContainer.innerHTML = "";
        var timelineHtml = "";

        data.timeline.forEach(function (slot) {
          var badgeClass = "badge-available";
          var chairIcon  = "🪑";

          if (slot.chairs_left === 0) {
            badgeClass = "badge-full";
            chairIcon  = "🚫";
          } else if (slot.status === "Almost Full") {
            badgeClass = "badge-limited";
          }

          timelineHtml +=
            '<div class="timeline-hour">' +
              '<div class="time-slot">' + slot.hour + '</div>' +
              '<div class="chairs-badge ' + badgeClass + '">' +
                '<span class="chair-icon">' + chairIcon + '</span>' +
                '<span>' + slot.chairs_left + ' Chairs Left</span>' +
              '</div>' +
            '</div>';
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
    doctorFilter.addEventListener("change", function() {
      loadAvailabilityTimeline(this.value);
    });
  }

  /* ── Take a Ticket Functionality ── */
  var btnTakeTicket = document.getElementById("btn-take-ticket");
  if (btnTakeTicket) {
    btnTakeTicket.addEventListener("click", function() {
      if (!confirm("Are you sure you want to take a ticket for immediate service?")) return;

      var doctorId = document.getElementById("availability-doctor-filter").value;
      
      var formData = new FormData();
      formData.append("take_ticket", "1");
      if (doctorId) formData.append("doctor_id", doctorId);

      fetch("../php/appointment_handler.php", {
        method: "POST",
        body: formData
      })
      .then(function(response) { return response.json(); })
      .then(function(data) {
        if (data.status === "success") {
          document.getElementById("ticket-number").textContent = "#" + data.ticket_number;
          document.getElementById("ticket-result").style.display = "block";
          
          // Refresh data
          fetchDashboardData();
          loadAvailabilityTimeline(doctorId);
        } else {
          alert("Error: " + data.message);
        }
      })
      .catch(function(error) {
        console.error("Error taking ticket:", error);
        alert("Failed to take a ticket. Please try again.");
      });
    });
  }

  /* ─────────────────────────────────────────────
     Doctor Profile Modal
     Shows doctor details and lets users book.
     ───────────────────────────────────────────── */
  var doctorModal      = document.getElementById("doctor-modal");
  var closeModalButton = document.querySelector(".close-modal");
  var selectedDoctor   = null;

  // Close when clicking ×
  if (closeModalButton) {
    closeModalButton.onclick = function () { doctorModal.style.display = "none"; };
  }

  // Close when clicking backdrop
  window.onclick = function (event) {
    if (event.target === doctorModal) {
      doctorModal.style.display = "none";
    }
  };

  function openDoctorModal(doctor) {
    selectedDoctor = doctor;

    document.getElementById("modal-doc-img").src          = doctor.image_url;
    document.getElementById("modal-doc-name").textContent  = doctor.name;
    document.getElementById("modal-doc-spec").textContent  = doctor.specialization;
    document.getElementById("modal-doc-bio").textContent   = doctor.bio || "No biography available.";
    document.getElementById("modal-doc-capacity").textContent = doctor.capacity;

    doctorModal.style.display = "flex";
  }

  /* ── "Book Appointment" inside modal ── */
  document.getElementById("btn-book-doc").onclick = function () {
    if (!selectedDoctor) return;

    // Fill the hidden input with the doctor's ID
    document.getElementById("selected-doctor-id").value = selectedDoctor.id;

    // Show the selected-doctor display strip
    document.getElementById("display-doc-img").src           = selectedDoctor.image_url;
    document.getElementById("display-doc-name").textContent   = selectedDoctor.name;
    document.getElementById("selected-doctor-display").style.display = "flex";

    // Scroll down to the booking form
    document.getElementById("appointmentForm").scrollIntoView({ behavior: "smooth" });

    // Close the modal
    doctorModal.style.display = "none";
  };

  /* ── "Change" doctor link ── */
  document.getElementById("change-doc-btn").onclick = function () {
    document.getElementById("selected-doctor-id").value           = "";
    document.getElementById("selected-doctor-display").style.display = "none";
    selectedDoctor = null;
  };

  /* ─────────────────────────────────────────────
     analyzeAndShowTimes()
     Step 1: AI Triage -> Step 2: Show Time Slots
     ───────────────────────────────────────────── */
  function analyzeAndShowTimes() {
    var reasonText      = document.getElementById("reason").value;
    var appointmentDate = document.getElementById("appointment-date").value;
    var doctorIdInput   = document.getElementById("selected-doctor-id").value;

    if (!reasonText || !appointmentDate) {
      alert("Please fill in the date and reason.");
      return;
    }

    // Show the AI loading spinner
    var aiLoading     = document.getElementById("ai-loading");
    var aiResultPanel = document.getElementById("ai-result-panel");
    var timeSlotSection = document.getElementById("time-slot-section");
    var btnAnalyze    = document.getElementById("btn-analyze");

    aiLoading.style.display     = "block";
    aiResultPanel.style.display = "none";
    timeSlotSection.style.display = "none";
    btnAnalyze.disabled         = true;
    btnAnalyze.textContent      = "Analyzing...";

    /* ── Step 1: Call AI Triage ── */
    fetch("../Ai/ai_triage.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason:    reasonText,
        date:      appointmentDate,
        doctor_id: doctorIdInput || null
      })
    })
    .then(function (response) { return response.json(); })
    .then(function (aiData) {
      aiLoading.style.display = "none";
      btnAnalyze.disabled     = false;
      btnAnalyze.textContent  = "🔍 Analyze Symptoms & Find Time";

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
      btnAnalyze.disabled     = false;
      btnAnalyze.textContent  = "🔍 Analyze Symptoms & Find Time";
      
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
      .then(function(res) { return res.json(); })
      .then(function(data) {
        var section = document.getElementById("time-slot-section");
        var container = document.getElementById("time-slots-container");
        section.style.display = "block";
        container.innerHTML = "";

        if (!data.timeline || data.timeline.length === 0) {
            container.innerHTML = "<p>No available slots for this date.</p>";
            return;
        }

        data.timeline.forEach(function(slot) {
            // "hour" string format example: "09:00 AM - 10:00 AM"
            // We just want the start time for the value, e.g. "09:00:00"
            // Let's parse the start hour from the display string or just rely on index/logic
            // Ideally backend sends raw time. But here we have formatted string.
            // Let's re-construct standard time from the "hour" property or add raw_time to PHP.
            // For now, let's assume we can parse or use the loop index if needed.
            // Actually, best to update PHP to send standardized start time.
            // BUT, to save a step, let's parse "09:00 AM" -> "09:00:00" logic here.
            
            var timeStr = slot.hour.split(' - ')[0]; // "09:00 AM"
            
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "btn-slot"; // We need to add CSS for this potentially
            btn.style.cssText = "padding:10px; border:1px solid #ddd; background:white; border-radius:5px; cursor:pointer;";
            btn.textContent = slot.hour;
            
            if (slot.chairs_left === 0) {
                btn.disabled = true;
                btn.style.opacity = "0.5";
                btn.style.background = "#eee";
                btn.textContent += " (Full)";
            } else {
                btn.onclick = function() {
                    // Deselect others
                    document.querySelectorAll(".btn-slot").forEach(b => {
                        b.style.background = "white"; 
                        b.style.color = "black";
                        b.style.borderColor = "#ddd";
                    });
                    // Select this
                    btn.style.background = "#4caf50";
                    btn.style.color = "white";
                    btn.style.borderColor = "#4caf50";
                    
                    // Convert "09:00 AM" to "09:00:00" for DB
                    var timeParts = timeStr.split(' '); // ["09:00", "AM"]
                    var hm = timeParts[0].split(':'); 
                    var h = parseInt(hm[0]);
                    var m = hm[1];
                    if (timeParts[1] === 'PM' && h < 12) h += 12;
                    if (timeParts[1] === 'AM' && h === 12) h = 0;
                    
                    var formattedTime = h.toString().padStart(2, '0') + ":" + m + ":00";
                    
                    document.getElementById("selected-time-slot").value = formattedTime;
                    document.getElementById("btn-confirm-book").style.display = "block";
                };
            }
            container.appendChild(btn);
        });
        
        // Scroll to times
        section.scrollIntoView({behavior: "smooth"});
      });
  }

  /* ─────────────────────────────────────────────
     confirmBooking()
     Final step: submit everything
     ───────────────────────────────────────────── */
  function confirmBooking() {
    var reasonText      = document.getElementById("reason").value;
    var appointmentDate = document.getElementById("appointment-date").value;
    var doctorIdInput   = document.getElementById("selected-doctor-id").value;
    var selectedTime    = document.getElementById("selected-time-slot").value;
    var fileInput       = document.getElementById("document");

    if (!selectedTime) {
        alert("Please select a time slot.");
        return;
    }

    bookAppointment(reasonText, appointmentDate, doctorIdInput, fileInput, selectedTime);
  }

  /* ─────────────────────────────────────────────
     displayAiResults(aiData)
     Shows the AI triage analysis in the result panel.
     ───────────────────────────────────────────── */
  function displayAiResults(aiData) {
    var triageInfo  = aiData.triage;
    var resultPanel = document.getElementById("ai-result-panel");

    // Fill in the priority, suggestion, specialty
    document.getElementById("ai-priority").textContent   = triageInfo.priority;
    document.getElementById("ai-suggestion").textContent  = triageInfo.suggestion;
    document.getElementById("ai-specialty").textContent   = triageInfo.recommended_specialty;

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
    var doctorsListContainer   = document.getElementById("ai-doctors-list");

    if (aiData.matching_doctors && aiData.matching_doctors.length > 0) {
      matchingDoctorsSection.style.display = "block";
      doctorsListContainer.innerHTML = "";

      aiData.matching_doctors.forEach(function (doctor) {
        var doctorChip = document.createElement("div");
        doctorChip.style.cssText = "background:white; padding:8px 14px; border-radius:20px; font-size:13px; display:flex; align-items:center; gap:6px; cursor:pointer; border:1px solid #e0e0e0;";
        doctorChip.innerHTML = '👨‍⚕️ <strong>' + doctor.name + '</strong> <small>(' + doctor.specialization + ')</small>';

        // Clicking a recommended doctor selects them
        doctorChip.onclick = function () {
          document.getElementById("selected-doctor-id").value = doctor.id;
          document.getElementById("display-doc-name").textContent = doctor.name;
          document.getElementById("selected-doctor-display").style.display = "flex";
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
    resultPanel.style.display = "block";
  }

  /* ─────────────────────────────────────────────
     bookAppointment()
     Sends the booking form to the server and
     shows success / error feedback.
     ───────────────────────────────────────────── */
  function bookAppointment(reasonText, appointmentDate, doctorIdInput, fileInput, selectedTime) {
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
      .then(function (response) { return response.json(); })
      .then(function (result) {
        var messageDiv   = document.getElementById("appt-message");
        var btnConfirm   = document.getElementById("btn-confirm-book");
        var btnAnalyze   = document.getElementById("btn-analyze");

        messageDiv.style.display = "block";
        if (btnConfirm) btnConfirm.style.display = "none"; // Hide confirm button
        
        // Reset Analyze Button
        btnAnalyze.disabled = false;
        btnAnalyze.textContent = "🔍 Analyze Symptoms & Find Time";

        if (result.status === "success") {
          messageDiv.style.background = "#e8f5e9";
          messageDiv.style.color      = "#2e7d32";
          messageDiv.innerHTML = '<strong>Success!</strong> ' + result.message;

          // Reset the form and refresh data
          document.getElementById("appointmentForm").reset();
          document.getElementById("ai-result-panel").style.display = "none";
          document.getElementById("selected-doctor-display").style.display = "none";
          fetchDashboardData();
          loadAvailabilityTimeline();
        } else {
          messageDiv.style.background = "#ffebee";
          messageDiv.style.color      = "#c62828";
          messageDiv.textContent      = result.message;
        }
      })
      .catch(function (error) {
        console.error("Booking error:", error);
        var btnAnalyze = document.getElementById("btn-analyze");
        btnAnalyze.disabled    = false;
        btnAnalyze.textContent = "🔍 Analyze Symptoms & Find Time";
        alert("Submission failed. Please try again.");
      });
  }

  /* ── 4. Profile Update ── */
  var btnUpdateProfile = document.getElementById("btn-update-profile");
  if (btnUpdateProfile) {
      btnUpdateProfile.addEventListener("click", function() {
          var name  = document.getElementById("profile-name").value;
          var email = document.getElementById("profile-email").value;
          var phone = document.getElementById("profile-phone").value;

          var formData = new FormData();
          formData.append("update_profile", "1");
          formData.append("name", name);
          formData.append("email", email);
          formData.append("phone", phone);

          fetch("../php/dashboard_api.php", {
              method: "POST",
              body: formData
          })
          .then(res => res.json())
          .then(data => {
              if (data.status === "success") {
                  alert("Profile updated successfully!");
                  document.getElementById("user-name").textContent = name; // Update header
              } else {
                  alert("Error: " + data.message);
              }
          })
          .catch(err => console.error(err));
      });
  }

});
