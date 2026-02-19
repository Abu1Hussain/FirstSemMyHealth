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
  function fetchDoctorData() {
    fetch("../php/doctor_api.php")
      .then((response) => response.json())
      .then((data) => {
        // If not logged in, redirect to login page
        if (data.status === "error" && data.message === "Unauthorized") {
          window.location.href = "../loginReg/login.html";
          return;
        }

        /* ── Populate Doctor Info ── */
        document.getElementById("user-name").textContent   = data.user.name;
        document.getElementById("user-initial").textContent = data.user.initial;
        document.getElementById("profile-name").value       = data.user.name;

        /* ── Populate Profile Email & Specialization ── */
        if (data.user.email) {
          document.getElementById("profile-email").value = data.user.email;
        }
        if (data.specialization) {
          document.getElementById("profile-specialization").value = data.specialization;
        }

        /* ── Populate Stat Cards ── */
        if (data.stats) {
          const totalPatients     = data.stats.total_patients     || 0;
          const todayAppointments = data.stats.today_appointments || 0;
          const pendingReviews    = data.stats.pending_reviews    || 0;

          document.getElementById("stat-patients").textContent     = totalPatients;
          document.getElementById("stat-appointments").textContent = todayAppointments;
          document.getElementById("stat-pending").textContent      = pendingReviews;
        }

        /* ── Hide Loading Overlay ── */
        loadingOverlay.style.display = "none";
      })
      .catch((error) => {
        console.error("Error fetching doctor data:", error);
        // Still hide the loader so the UI isn't stuck
        loadingOverlay.style.display = "none";
      });
  }
});
