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
  var appointmentForm = document.getElementById("appointmentForm");
  if (appointmentForm) {
    appointmentForm.addEventListener("submit", function (event) {
      event.preventDefault();
      analyzeAndBook();
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
                  '<strong>#' + appointment.queue_number + '</strong><br>' +
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
        }

        /* ── Hide Loading Overlay ── */
        loadingOverlay.style.display = "none";
      })
      .catch(function (error) {
        console.error("Error fetching dashboard data:", error);
        loadingOverlay.style.display = "none";
      });
  }

  /* ─────────────────────────────────────────────
     loadAvailabilityTimeline()
     Calls the AI Scheduler to get today's hourly
     chair availability and renders the timeline.
     Connected to: 📊 Today's Availability
     ───────────────────────────────────────────── */
  function loadAvailabilityTimeline() {
    var today = new Date().toISOString().split("T")[0];

    fetch("../Ai/ai_scheduler.php?date=" + today)
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
     analyzeAndBook()
     Two-step booking flow:
       Step 1 – Call AI Triage to analyze symptoms
       Step 2 – Show AI results, then book the appointment
     Connected to: 📅 Book New Appointment
     ───────────────────────────────────────────── */
  function analyzeAndBook() {
    var reasonText      = document.getElementById("reason").value;
    var appointmentDate = document.getElementById("appointment-date").value;
    var doctorIdInput   = document.getElementById("selected-doctor-id").value;
    var fileInput       = document.getElementById("document");

    if (!reasonText || !appointmentDate) {
      alert("Please fill in the date and reason.");
      return;
    }

    // Show the AI loading spinner
    var aiLoading    = document.getElementById("ai-loading");
    var aiResultPanel = document.getElementById("ai-result-panel");
    var submitButton  = document.getElementById("btn-book-submit");

    aiLoading.style.display    = "block";
    aiResultPanel.style.display = "none";
    submitButton.disabled       = true;
    submitButton.textContent    = "Analyzing...";

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
      // Hide the loading spinner
      aiLoading.style.display = "none";

      // Show the AI result panel
      if (aiData.status === "success" && aiData.triage) {
        displayAiResults(aiData);
      }

      /* ── Step 2: Now book the appointment ── */
      bookAppointment(reasonText, appointmentDate, doctorIdInput, fileInput);
    })
    .catch(function (error) {
      console.error("AI triage error:", error);
      aiLoading.style.display = "none";

      // Even if AI fails, still book the appointment
      bookAppointment(reasonText, appointmentDate, doctorIdInput, fileInput);
    });
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
  function bookAppointment(reasonText, appointmentDate, doctorIdInput, fileInput) {
    var formData = new FormData();
    formData.append("book_appointment", "1");
    formData.append("reason", reasonText);
    formData.append("date", appointmentDate);

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
        var submitButton = document.getElementById("btn-book-submit");

        messageDiv.style.display = "block";
        submitButton.disabled    = false;
        submitButton.textContent = "Analyze & Book Appointment";

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
        var submitButton = document.getElementById("btn-book-submit");
        submitButton.disabled    = false;
        submitButton.textContent = "Analyze & Book Appointment";
        alert("Submission failed. Please try again.");
      });
  }
});
