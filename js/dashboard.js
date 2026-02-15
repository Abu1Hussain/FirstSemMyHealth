document.addEventListener("DOMContentLoaded", function () {
  const loading = document.getElementById("loading");

  // 1. Initial Data Fetch & Auth Check
  fetchDashboardData();

  // 2. Navigation Logic
  const navLinks = document.querySelectorAll(".nav-link[data-view]");
  const sections = document.querySelectorAll(".content-section");

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();

      // Activate Link
      navLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      // Show Section
      const view = link.getAttribute("data-view");
      sections.forEach((s) => s.classList.remove("active"));
      document.getElementById("view-" + view).classList.add("active");
    });
  });

  // 3. Appointment Form Logic
  const apptForm = document.getElementById("appointmentForm");
  if (apptForm) {
    apptForm.addEventListener("submit", (e) => {
      e.preventDefault();
      submitAppointment();
    });
  }

  function fetchDashboardData() {
    fetch("../php/dashboard_api.php")
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "error" && data.message === "Unauthorized") {
          window.location.href = "../loginReg/login.html";
          return;
        }

        // Populate User Info
        document.getElementById("user-name").textContent = data.user.name;
        document.getElementById("user-initial").textContent = data.user.initial;
        document.getElementById("profile-name").value = data.user.name;

        // Populate Stats
        document.getElementById("stat-upcoming").textContent =
          data.stats.upcoming;

        // Populate Appointments
        const tbody = document.getElementById("appointments-list");
        tbody.innerHTML = "";

        if (data.appointments.length === 0) {
          tbody.innerHTML =
            '<tr><td colspan="5">No appointments found.</td></tr>';
        } else {
          data.appointments.forEach((appt) => {
            let pClass = "priority-normal";
            if (appt.priority === "Highly Important") pClass = "priority-high";
            if (appt.priority === "Important") pClass = "priority-medium";

            const row = `
                        <tr>
                            <td>${appt.date}</td>
                            <td>${appt.reason}</td>
                            <td><span class="${pClass}">${appt.priority}</span></td>
                            <td>${appt.status}</td>
                            <td>
                                <strong>#${appt.queue_number}</strong><br>
                                <small class="text-muted">~${appt.wait_time} mins</small>
                            </td>
                        </tr>
                    `;
            tbody.innerHTML += row;
            tbody.innerHTML += row;
          });
        }

        // Populate Timeline
        const timelineDiv = document.getElementById("daily-timeline");
        if (timelineDiv && data.timeline) {
            timelineDiv.innerHTML = "";
            let timelineHtml = "";
            data.timeline.forEach(slot => {
                let badgeClass = 'badge-available';
                let icon = '🪑'; // Default chair
                
                if (slot.chairs_left === 0) {
                    badgeClass = 'badge-full';
                    icon = '🚫';
                } else if (slot.chairs_left < 10) {
                    badgeClass = 'badge-limited';
                }

                timelineHtml += `
                    <div class="timeline-hour">
                        <div style="font-weight:600; color:#444;">${slot.hour}</div>
                        <div class="chairs-badge ${badgeClass}">
                            <span class="chair-icon">${icon}</span>
                            <span>${slot.chairs_left} Chairs Left</span>
                        </div>
                    </div>
                `;
            });
            timelineDiv.innerHTML = timelineHtml;
        }

        // Populate Doctors List
        const doctorsList = document.getElementById("doctors-list");
        if (doctorsList && data.doctors) {
            doctorsList.innerHTML = "";
            data.doctors.forEach(doc => {
                const div = document.createElement('div');
                div.className = 'doctor-card-mini';
                div.innerHTML = `
                    <img src="${doc.image_url}" class="doctor-img-mini" onerror="this.src='../image/default_user.png'">
                    <div class="doctor-name-mini">${doc.name}</div>
                    <div class="doctor-spec-mini">${doc.specialization || 'General'}</div>
                `;
                div.onclick = () => openDoctorModal(doc);
                doctorsList.appendChild(div);
            });
        }

        // Hide Loader
        loading.style.display = "none";
      })
      .catch(error => {
        console.error('Error fetching dashboard data:', error);
        loading.style.display = "none";
      });
  }

  // Doctor Modal Logic
  const modal = document.getElementById("doctor-modal");
  const closeModal = document.querySelector(".close-modal");
  let currentDoctor = null;

  if (closeModal) {
      closeModal.onclick = () => {
          modal.style.display = "none";
      };
  }

  window.onclick = (event) => {
      if (event.target == modal) {
          modal.style.display = "none";
      }
  };

  function openDoctorModal(doc) {
      currentDoctor = doc;
      document.getElementById("modal-doc-img").src = doc.image_url;
      document.getElementById("modal-doc-name").textContent = doc.name;
      document.getElementById("modal-doc-spec").textContent = doc.specialization;
      document.getElementById("modal-doc-bio").textContent = doc.bio || "No biography available.";
      document.getElementById("modal-doc-capacity").textContent = doc.capacity;
      
      modal.style.display = "flex";
  }

  document.getElementById("btn-book-doc").onclick = () => {
      if (currentDoctor) {
          // Set hidden input
          document.getElementById("selected-doctor-id").value = currentDoctor.id;
          
          // Update display
          document.getElementById("display-doc-img").src = currentDoctor.image_url;
          document.getElementById("display-doc-name").textContent = currentDoctor.name;
          document.getElementById("selected-doctor-display").style.display = "flex";
          
          // Scroll to form
          document.getElementById("appointmentForm").scrollIntoView({behavior: "smooth"});
          
          // Close modal
          modal.style.display = "none";
      }
  };

  document.getElementById("change-doc-btn").onclick = () => {
      document.getElementById("selected-doctor-id").value = "";
      document.getElementById("selected-doctor-display").style.display = "none";
      currentDoctor = null;
  };

  function submitAppointment() {
    const reason = document.getElementById("reason").value;
    const date = document.getElementById("appointment-date").value;
    const fileInput = document.getElementById("document");

    const formData = new FormData();
    formData.append("book_appointment", "1");
    formData.append("reason", reason);
    formData.append("date", date);
    if (fileInput.files.length > 0) {
      formData.append("document", fileInput.files[0]);
    }

    fetch("../php/appointment_handler.php", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        const msgDiv = document.getElementById("appt-message");
        msgDiv.style.display = "block";

        if (data.status === "success") {
          msgDiv.style.background = "#e8f5e9";
          msgDiv.style.color = "#2e7d32";
          msgDiv.innerHTML = `<strong>Success!</strong> ${data.message}`;
          document.getElementById("appointmentForm").reset();
          fetchDashboardData(); // Refresh list
        } else {
          msgDiv.style.background = "#ffebee";
          msgDiv.style.color = "#c62828";
          msgDiv.textContent = data.message;
        }
      })
      .catch((err) => {
        console.error(err);
        alert("Submission failed.");
      });
  }
});
