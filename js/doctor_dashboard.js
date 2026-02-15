document.addEventListener("DOMContentLoaded", function () {
    const loading = document.getElementById("loading");
  
    // 1. Initial Data Fetch & Auth Check
    fetchDoctorData();
  
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
  
    function fetchDoctorData() {
      // For now, using dashboard_api.php or creating a new one? 
      // User requested doctor dashboard. Let's assume we can fetch data from doctor_api.php
      fetch("../php/doctor_api.php")
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
  
          // Populate Stats (Mocked or Real)
          if (data.stats) {
            document.getElementById("stat-patients").textContent = data.stats.total_patients || 0;
            document.getElementById("stat-appointments").textContent = data.stats.today_appointments || 0;
            document.getElementById("stat-pending").textContent = data.stats.pending_reviews || 0;
          }
        
          // Hide Loader
          loading.style.display = "none";
        })
        .catch((err) => {
          console.error(err);
          // If api doesn't exist yet, just hide loader to show UI
          loading.style.display = "none"; 
        });
    }
  });
