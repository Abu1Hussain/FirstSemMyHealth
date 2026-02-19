/* ═══════════════════════════════════════════════════════════
   Doctor Dashboard – Main Script
   Handles: data loading, sidebar navigation,
            and populating the doctor-specific stats.
   ═══════════════════════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", function () {
  const loadingOverlay = document.getElementById("loading");

  /* ── 1. Load Doctor Data on Page Ready ── */
  fetchDoctorData();

  /* ── 2. Sidebar Navigation ── */
  // Only select links that actually have a data-view attribute
  const navLinks = document.querySelectorAll(".nav-link[data-view]");
  const sections = document.querySelectorAll(".content-section");

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();

      // Highlight the active link
      navLinks.forEach((otherLink) => otherLink.classList.remove("active"));
      link.classList.add("active");

      // Show the matching section
      const targetView = link.getAttribute("data-view");
      sections.forEach((section) => section.classList.remove("active"));
      document.getElementById("view-" + targetView).classList.add("active");
    });
  });

  /* ─────────────────────────────────────────────
     fetchDoctorData()
     Pulls the doctor's profile info and statistics
     from the server API.
     ───────────────────────────────────────────── */
  /* ─────────────────────────────────────────────
     fetchDoctorData()
     Pulls the doctor's profile info and statistics
     from the server API.
     ───────────────────────────────────────────── */
  function fetchDoctorData() {
    fetch("../php/doctor_api.php")
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "error" && data.message === "Unauthorized") {
          window.location.href = "../loginReg/login.html";
          return;
        }

        /* ── Populate Doctor Info ── */
        document.getElementById("user-name").textContent   = data.user.name;
        document.getElementById("user-initial").textContent = data.user.initial;
        document.getElementById("profile-name").value       = data.user.name;
        
        // Show doctor image if available
        if (data.user.image_url) {
            const img = document.getElementById("header-doc-img");
            img.src = data.user.image_url;
            img.style.display = "inline-block";
            document.getElementById("user-initial").style.display = "none";
        }

        /* ── Populate Profile Email & Specialization ── */
        if (data.user.email) {
          document.getElementById("profile-email").value = data.user.email;
        }
        if (data.specialization) {
          document.getElementById("profile-specialization").value = data.specialization;
        }

        /* ── Populate Stat Cards ── */
        if (data.stats) {
          document.getElementById("stat-patients").textContent     = data.stats.total_patients     || 0;
          document.getElementById("stat-appointments").textContent = data.stats.today_appointments || 0;
          document.getElementById("stat-pending").textContent      = data.stats.pending_reviews    || 0;
        }

        /* ── Render Patients List ── */
        if (data.patients_today) {
            renderPatientsList(data.patients_today);
        }

        loadingOverlay.style.display = "none";
      })
      .catch((error) => {
        console.error("Error fetching doctor data:", error);
        loadingOverlay.style.display = "none";
      });
  }

  /* ─────────────────────────────────────────────
     renderPatientsList(patients)
     Renders the list of today's patients with
     "Call Patient" buttons.
     ───────────────────────────────────────────── */
  function renderPatientsList(patients) {
    const listContainer = document.getElementById("patients-list-container");
    const scheduleContainer = document.getElementById("today-schedule");
    
    if (!patients || patients.length === 0) {
        let emptyHtml = "<p>No patients scheduled for today.</p>";
        listContainer.innerHTML = emptyHtml;
        scheduleContainer.innerHTML = emptyHtml;
        return;
    }

    let html = '<table style="width:100%; border-collapse:collapse;"><thead><tr style="background:#f8f9fa;">'+
               '<th style="padding:10px; border-bottom:2px solid #eee;">Time</th>'+
               '<th style="padding:10px; border-bottom:2px solid #eee;">Patient</th>'+
               '<th style="padding:10px; border-bottom:2px solid #eee;">Reason</th>'+
               '<th style="padding:10px; border-bottom:2px solid #eee;">Action</th></tr></thead><tbody>';

    patients.forEach(patient => {
        let time = new Date(patient.appointment_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        let actionBtn = '';
        if (patient.status === 'completed') {
            actionBtn = '<span class="badge-success" style="color:green; font-weight:bold;">Completed</span>';
        } else {
            actionBtn = `<button class="btn-primary" onclick="window.startTimer(${patient.appointment_id}, '${patient.patient_name}')" style="padding:6px 12px; font-size:13px;">📞 Call Patient</button>`;
        }

        html += `<tr>
            <td style="padding:12px; border-bottom:1px solid #eee;">${time}</td>
            <td style="padding:12px; border-bottom:1px solid #eee;"><strong>${patient.patient_name}</strong></td>
            <td style="padding:12px; border-bottom:1px solid #eee;">${patient.reason}</td>
            <td style="padding:12px; border-bottom:1px solid #eee;">${actionBtn}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    
    listContainer.innerHTML = html;
    scheduleContainer.innerHTML = html; // Also update the dashboard widget
  }

  /* ─────────────────────────────────────────────
     Timer Logic
     ───────────────────────────────────────────── */
  let timerInterval;
  let currentAppointmentId = null;

  window.startTimer = function(appointmentId, patientName) {
      currentAppointmentId = appointmentId;
      document.getElementById("timer-patient-name").textContent = patientName;
      document.getElementById("timer-modal").style.display = "flex";

      let timeLeft = 600; // 10 minutes in seconds
      const maxTime = 600;
      const timerDisplay = document.getElementById("timer-display");
      const timerProgress = document.getElementById("timer-progress");
      const circumference = 2 * Math.PI * 90; // r=90

      // Reset timer visual
      timerProgress.style.strokeDashoffset = 0;
      
      // Update status to 'calling' via API (optional implementation)
      // updateStatus(appointmentId, 'calling');

      clearInterval(timerInterval);
      timerInterval = setInterval(() => {
          if (timeLeft <= 0) {
              clearInterval(timerInterval);
              timerDisplay.textContent = "00:00";
              alert("Time is up!");
              return;
          }

          timeLeft--;
          
          // Update text
          let m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
          let s = (timeLeft % 60).toString().padStart(2, '0');
          timerDisplay.textContent = `${m}:${s}`;

          // Update circle progress
          const offset = circumference - (timeLeft / maxTime) * circumference;
          timerProgress.style.strokeDashoffset = offset;

      }, 1000);
  };

  /* ── Terminate Ticket Button ── */
  document.getElementById("btn-terminate-ticket").addEventListener("click", function() {
      if (!currentAppointmentId) return;
      
      if (confirm("Are you sure you want to terminate this ticket?")) {
          clearInterval(timerInterval);
          document.getElementById("timer-modal").style.display = "none";
          
          terminateTicket(currentAppointmentId);
      }
  });

  function terminateTicket(appointmentId) {
      const formData = new FormData();
      formData.append("appointment_id", appointmentId);
      formData.append("status", "completed");

      fetch("../php/doctor_api.php", {
          method: "POST",
          body: formData
      })
      .then(response => response.json())
      .then(data => {
          if (data.status === "success") {
              alert("Ticket terminated. Patient marked as completed.");
              fetchDoctorData(); // Refresh list
          } else {
              alert("Error: " + data.message);
          }
      })
      .catch(error => console.error("Error terminating ticket:", error));
  }
});
