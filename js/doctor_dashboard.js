/* ═══════════════════════════════════════════════════════════
   Doctor Dashboard – Main Script
   Handles: data loading, sidebar navigation,
            and populating the doctor-specific stats.
   ═══════════════════════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", function () {
  // 1. Initialize AOS (Animate On Scroll) immediately
  if (typeof AOS !== "undefined") {
    AOS.init({
      duration: 800,
      easing: "ease-in-out",
      once: true,
      mirror: false,
    });
  }

  const loadingOverlay = document.getElementById("loading-overlay");

  let patientAdmissionsChartInstance, departmentPopularityChartInstance;
  let isCalendarRendered = false;
  let calendarInstance = null;

  const sidebar = document.getElementById("sidebar");
  const mainContent = document.getElementById("mainContent");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const darkModeToggle = document.getElementById("darkModeToggle");
  const darkModeIcon = document.getElementById("darkModeIcon");
  const userMenuButton = document.getElementById("userMenuButton");
  const userMenu = document.getElementById("userMenu");

  /* ── UI Logic: Sidebar & Dark Mode ── */
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

    // Handle all sidebar links including new section ones
    document
      .querySelectorAll(".sidebar-link[data-section], .sidebar-link[data-view]")
      .forEach((link) => {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const section = link.dataset.section || link.dataset.view;
          if (section) showSection(section);
        });
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
      ".nav-link[data-section], .sidebar-link[data-section], .nav-link[data-view], .sidebar-link[data-view]",
    );

    // Fade out all sections
    sections.forEach((s) => {
      s.classList.remove("active");
      s.classList.add("hidden");
    });

    const el = document.getElementById("view-" + viewId);
    if (el) {
      el.classList.remove("hidden");
      el.classList.add("active");

      // Update URL hash without jumping
      if (window.location.hash !== "#" + viewId) {
        history.replaceState(null, null, "#" + viewId);
      }

      if (typeof AOS !== "undefined") {
        AOS.refresh();
      }

      // Update sidebar active state
      navLinks.forEach((link) => {
        const icon = link.querySelector("ion-icon");
        const linkView = link.dataset.section || link.dataset.view;
        if (linkView === viewId) {
          link.classList.add("active", "bg-blue-600", "text-white");
          if (icon) icon.classList.add("text-white");
        } else {
          link.classList.remove("active", "bg-blue-600", "text-white");
          if (icon) icon.classList.remove("text-white");
        }
      });

      // Special per-view logic
      if (
        viewId === "appointments" &&
        !isCalendarRendered &&
        typeof FullCalendar !== "undefined"
      ) {
        initFullCalendar();
      } else if (viewId === "appointments" && calendarInstance) {
        setTimeout(() => calendarInstance.updateSize(), 100);
      }
    }
  };

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

        /* ── Extract actual data from wrapper ── */
        var responseData = data.data || data;

        /* ── Populate Doctor Info ── */
        // Main Welcome Header
        const welcomeName = document.getElementById("user-name");
        if (welcomeName && responseData.user)
          welcomeName.textContent = responseData.user.name;

        // Sidebar Profile Info
        const sidebarDocName = document.querySelector(
          ".profile-info p.font-medium",
        );
        if (sidebarDocName && responseData.user)
          sidebarDocName.textContent = "Dr. " + responseData.user.name;

        const headerAvatar = document.getElementById("header-avatar");
        if (headerAvatar && responseData.user)
          headerAvatar.textContent = responseData.user.initial;

        // Profile Form (Redesigned)
        const profileNameInput = document.getElementById("profile-name");
        if (profileNameInput && responseData.user)
          profileNameInput.value = responseData.user.name;

        const profileDisplayName = document.getElementById(
          "profile-display-name",
        );
        if (profileDisplayName && responseData.user)
          profileDisplayName.textContent = responseData.user.name;

        const profileAvatar = document.getElementById("profile-initial-avatar");
        if (profileAvatar && responseData.user)
          profileAvatar.textContent = responseData.user.initial;

        // Show doctor images if available
        if (responseData.user && responseData.user.image_url) {
          const headerAv = document.getElementById("header-avatar");
          if (headerAv) {
            headerAv.innerHTML = `<img src="${responseData.user.image_url}" class="h-8 w-8 rounded-full object-cover">`;
            headerAv.classList.remove(
              "bg-blue-600",
              "flex",
              "items-center",
              "justify-center",
              "text-white",
            );
          }

          if (sidebar) {
            const sidebarAvatarImg = sidebar.querySelector("img");
            if (sidebarAvatarImg)
              sidebarAvatarImg.src = responseData.user.image_url;
          }

          if (profileAvatar) {
            profileAvatar.innerHTML = `<img src="${responseData.user.image_url}" class="h-24 w-24 rounded-full object-cover shadow-lg border-4 border-white dark:border-gray-800">`;
            profileAvatar.classList.remove(
              "bg-blue-600",
              "flex",
              "items-center",
              "justify-center",
              "text-white",
            );
          }
        }

        /* ── Populate Profile Email & Specialization ── */
        const emailInput = document.getElementById("profile-email");
        if (emailInput)
          emailInput.value =
            responseData.user && responseData.user.email
              ? responseData.user.email
              : "—";

        const specInput = document.getElementById("profile-specialization");
        if (specInput)
          specInput.value = responseData.specialization || "General Medicine";

        /* ── Populate Stat Cards ── */
        const stats = responseData.stats || {
          total_patients: 0,
          today_appointments: 0,
          pending_reviews: 0,
        };
        const pStat = document.getElementById("stat-patients");
        if (pStat) pStat.textContent = stats.total_patients;

        const aStat = document.getElementById("stat-appointments");
        if (aStat) aStat.textContent = stats.today_appointments;

        const rStat = document.getElementById("stat-pending");
        if (rStat) rStat.textContent = stats.pending_reviews;

        /* ── Initialize Visuals ── */
        initCharts();

        /* ── Render Patients List (Today) ── */
        renderPatientsList(responseData.patients_today || []);

        /* ── Render Full Patient Directory ── */
        renderAllPatientsList(responseData.all_patients || []);

        /* ── Render Doctors Directory Table ── */
        renderDoctorsTable(responseData.all_staff || []);

        /* ── Render Activity Logs ── */
        renderActivityLogs(responseData.all_appointments || { today: [] });

        /* ── Render Individual Appointment History ── */
        if (responseData.all_appointments) {
          renderAllAppointments(responseData.all_appointments);
        } else {
          renderAllAppointments({ past: [], today: [], upcoming: [] });
        }

        /* ── Render Global Records & Prescriptions ── */
        renderAllRecords(responseData.all_records || []);
        renderAllPrescriptions(responseData.all_prescriptions || []);

        const overlay = document.getElementById("loading-overlay");
        if (overlay) overlay.style.display = "none";
      })
      .catch((error) => {
        console.error("Error fetching doctor data:", error);
        const overlay = document.getElementById("loading-overlay");
        if (overlay) overlay.style.display = "none";
      });
  }

  window.renderAllPatientsList = function (patients) {
    const container = document.getElementById("patients-full-list");
    if (!container) return;

    if (!patients || patients.length === 0) {
      container.innerHTML = `
        <div class="text-center py-10 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-100 dark:border-gray-700">
            <ion-icon name="people-outline" class="text-4xl text-gray-300 mb-2"></ion-icon>
            <p class="text-gray-500">No patients found in the system yet.</p>
        </div>
      `;
      return;
    }

    let html = `
      <table id="patients-table" class="appt-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>CPR</th>
            <th>Contact</th>
            <th>Gender/DOB</th>
            <th>Blood</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
    `;

    patients.forEach((p) => {
      const pName = `${p.first_name || ""} ${p.last_name || ""}`;
      const safeData = encodeURIComponent(
        JSON.stringify({ ...p, patient_name: pName }),
      );
      html += `
        <tr>
          <td><span class="text-xs font-mono">#P${(p.patient_id || 0).toString().padStart(4, "0")}</span></td>
          <td><div class="font-bold">${pName}</div></td>
          <td><div class="text-xs font-mono">${p.cpr || "—"}</div></td>
          <td>
            <div class="text-xs">${p.email || "—"}</div>
            <div class="text-[10px] text-gray-400 font-bold">${p.phone || "—"}</div>
          </td>
          <td>
            <div class="flex items-center gap-1">
               <span class="badge ${p.gender === "male" ? "badge-blue" : "badge-red"} capitalize">${p.gender || "—"}</span>
               <span class="text-[10px] text-gray-400">${p.date_of_birth || "—"}</span>
            </div>
          </td>
          <td><span class="font-bold text-red-600">${p.blood_type || "—"}</span></td>
          <td>
            <button onclick="showPatientDetail('${safeData}')" class="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all">
                <ion-icon name="eye-outline"></ion-icon>
            </button>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
  };

  function renderActivityLogs(appointments) {
    const miniLog = document.getElementById("mini-activity-log");
    const fullLog = document.getElementById("system-activity-log");

    if (!miniLog && !fullLog) return;

    let items = [];
    if (appointments && appointments.today) {
      appointments.today.slice(0, 5).forEach((a) => {
        items.push({
          icon: "calendar-outline",
          color: "text-blue-500",
          text: `Appointment for <strong>${a.patient_name}</strong> marked as <strong>${a.status}</strong>`,
          time: "Just now",
        });
      });
    }

    // Default mock items if no recent real data
    if (items.length < 3) {
      items.push(
        {
          icon: "flask-outline",
          color: "text-purple-500",
          text: "New prescription added for #P0042",
          time: "1 hour ago",
        },
        {
          icon: "shield-checkmark-outline",
          color: "text-green-500",
          text: "Medical record #R881 finalized",
          time: "2 hours ago",
        },
        {
          icon: "alert-circle-outline",
          color: "text-yellow-500",
          text: "Low stock alert: Paracetamol 500mg",
          time: "3 hours ago",
        },
      );
    }

    let html = items
      .map(
        (item) => `
        <div class="flex items-start gap-3">
            <div class="mt-1"><ion-icon name="${item.icon}" class="${item.color}"></ion-icon></div>
            <div>
                <p class="text-[11px] leading-tight text-gray-700 dark:text-gray-300">${item.text}</p>
                <p class="text-[9px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5">${item.time}</p>
            </div>
        </div>
    `,
      )
      .join("");

    if (miniLog) miniLog.innerHTML = html;
    if (fullLog) fullLog.innerHTML = html;
  }

  function renderAllRecords(records) {
    const listContainer = document.getElementById("records-list-container");
    if (!listContainer) return;
    if (!records || records.length === 0) {
      listContainer.innerHTML =
        '<p class="text-gray-500 py-6 text-center">No medical records created yet.</p>';
      return;
    }
    let html =
      '<table class="appt-table"><thead><tr><th>Date</th><th>Patient</th><th>Doctor</th><th>Type</th><th>Summary</th></tr></thead><tbody>';
    records.forEach((r) => {
      const d = new Date(r.record_date).toLocaleDateString();
      const docName = r.doctor_name ? `Dr. ${r.doctor_name}` : "—";
      html += `<tr>
            <td>${d}</td>
            <td><strong>${r.patient_name}</strong></td>
            <td><span class="text-indigo-600 dark:text-indigo-400 font-medium text-xs">${docName}</span></td>
            <td><span class="badge badge-blue">${r.record_type}</span></td>
            <td><div class="text-xs truncate max-w-[200px]">${r.summary}</div></td>
        </tr>`;
    });
    html += "</tbody></table>";
    listContainer.innerHTML = html;
  }

  /* ─────────────────────────────────────────────
     renderDoctorsTable(staff)
     Renders a premium searchable doctors directory table
     with photo, contact, specialization and record count.
     ───────────────────────────────────────────── */
  var allDoctorsData = [];

  window.renderDoctorsTable = function (doctors) {
    if (doctors) allDoctorsData = doctors;

    const container = document.getElementById("doctors-table-container");
    if (!container) return;

    let filteredDoctors = allDoctorsData;
    const searchTerm =
      document.getElementById("doctor-search")?.value.toLowerCase() || "";

    if (searchTerm) {
      filteredDoctors = allDoctorsData.filter(
        (d) =>
          (d.name && d.name.toLowerCase().includes(searchTerm)) ||
          (d.specialization &&
            d.specialization.toLowerCase().includes(searchTerm)) ||
          (d.department && d.department.toLowerCase().includes(searchTerm)),
      );
    }

    if (filteredDoctors.length === 0) {
      container.innerHTML =
        '<p class="text-center py-8 text-gray-500">No doctors found matching your search.</p>';
      return;
    }

    let html = `
      <table class="appt-table">
        <thead>
          <tr>
            <th>Doctor</th>
            <th>Contact</th>
            <th>Department</th>
            <th>Specialization</th>
            <th>Records</th>
          </tr>
        </thead>
        <tbody>
    `;

    filteredDoctors.forEach((d) => {
      const initials = d.name ? d.name.charAt(0).toUpperCase() : "?";
      let avatarHtml = d.profile_image
        ? `<img src="${d.profile_image}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">`
        : `<div style="width:40px; height:40px; border-radius:50%; background:#e0e7ff; color:#3730a3; display:flex; align-items:center; justify-content:center; font-weight:bold;">${initials}</div>`;

      html += `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:12px;">
              ${avatarHtml}
              <div>
                <div style="font-weight:600; color:#1e1b4b;" class="dark:text-white">${d.name || "Unknown"}</div>
                <div style="font-size:0.8rem; color:#6b7280;">ID: #${(d.id || d.doctor_id || 0).toString().padStart(4, "0")}</div>
              </div>
            </div>
          </td>
          <td>
            <div style="font-size:0.85rem;" class="text-gray-600 dark:text-gray-300">
              <div><ion-icon name="mail-outline"></ion-icon> ${d.email || "—"}</div>
              <div style="margin-top:4px;"><ion-icon name="call-outline"></ion-icon> ${d.phone || "—"}</div>
            </div>
          </td>
          <td>
            <span class="badge badge-indigo">${d.department || "General"}</span>
          </td>
          <td class="text-gray-700 dark:text-gray-300">${d.specialization || "General Medicine"}</td>
          <td>
            <div style="display:flex; align-items:center; justify-content:center; width:30px; height:30px; background:#f1f5f9; border-radius:8px; font-weight:bold; color:#475569;" class="dark:bg-gray-700 dark:text-gray-300">
              ${d.records_count || 0}
            </div>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
  };

  window.filterDoctorsTable = function () {
    renderDoctorsTable();
  };

  function renderAllPrescriptions(prescriptions) {
    const listContainer = document.getElementById(
      "prescriptions-list-container",
    );
    if (!listContainer) return;
    if (!prescriptions || prescriptions.length === 0) {
      listContainer.innerHTML =
        '<p class="text-gray-500 py-6 text-center">No prescriptions created yet.</p>';
      return;
    }
    let html =
      '<table class="appt-table"><thead><tr><th>Date</th><th>Patient</th><th>Medication</th><th>Dosage</th><th>Freq.</th></tr></thead><tbody>';
    prescriptions.forEach((p) => {
      const d = new Date(p.record_date).toLocaleDateString();
      html += `<tr>
            <td>${d}</td>
            <td><strong>${p.patient_name}</strong></td>
            <td><span class="badge badge-indigo">${p.medication_name}</span></td>
            <td>${p.dosage}</td>
            <td>${p.frequency}</td>
        </tr>`;
    });
    html += "</tbody></table>";
    listContainer.innerHTML = html;
  }

  /* ─────────────────────────────────────────────
     renderAllAppointments(groups)
     Renders the categorized appointment history
     with patient details and "View" button.
     ───────────────────────────────────────────── */
  function renderAllAppointments(groups) {
    const categories = ["past", "today", "upcoming"];

    categories.forEach((cat) => {
      const container = document.querySelector(
        `#appt-list-${cat} .list-content`,
      );
      const appointments = groups[cat];

      if (!container) return;

      if (!appointments || appointments.length === 0) {
        container.innerHTML = `<p class="text-gray-500 dark:text-gray-400 py-6 text-center">No ${cat} appointments found.</p>`;
        return;
      }

      let html =
        '<table class="appt-table">' +
        "<thead><tr>" +
        "<th>Date/Time</th>" +
        "<th>Patient</th>" +
        "<th>Reason</th>" +
        "<th>Priority</th>" +
        "<th>Status</th>" +
        "<th>Details</th>" +
        "</tr></thead><tbody>";

      appointments.forEach((appt) => {
        const date = new Date(appt.appointment_date);
        const formattedDate =
          date.toLocaleDateString() +
          " " +
          date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        let statusBadge = "";
        if (appt.status === "completed")
          statusBadge = '<span class="badge badge-green">Completed</span>';
        else if (appt.status === "cancelled" || appt.status === "terminated")
          statusBadge = '<span class="badge badge-red">Terminated</span>';
        else if (appt.status === "pending")
          statusBadge = '<span class="badge badge-orange">Pending</span>';
        else if (appt.status === "accepted")
          statusBadge = '<span class="badge badge-blue">Accepted</span>';
        else
          statusBadge = `<span class="badge badge-gray">${appt.status.toUpperCase()}</span>`;

        let priorityBadge = "";
        const p = appt.ai_priority || "Normal";
        if (p === "Highly Important")
          priorityBadge =
            '<span class="px-2 py-1 rounded-md text-[10px] font-bold bg-red-100 text-red-600 border border-red-200">🚩 Highly Important</span>';
        else if (p === "Important")
          priorityBadge =
            '<span class="px-2 py-1 rounded-md text-[10px] font-bold bg-orange-100 text-orange-600 border border-orange-200">🟠 Important</span>';
        else
          priorityBadge =
            '<span class="px-2 py-1 rounded-md text-[10px] font-bold bg-blue-100 text-blue-600 border border-blue-200">🟢 Normal</span>';

        const safeData = encodeURIComponent(JSON.stringify(appt));

        html += `<tr>
                <td><div class="font-medium">${formattedDate}</div></td>
                <td>
                  <div class="font-bold">${appt.patient_name}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">CPR: ${appt.cpr || "—"}</div>
                </td>
                <td><div class="text-sm">${appt.reason}</div></td>
                <td>${priorityBadge}</td>
                <td>${statusBadge}</td>
                <td>
                  <button onclick="showPatientDetail('${safeData}')" 
                    class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1">
                    <ion-icon name="eye-outline"></ion-icon> View
                  </button>
                </td>
            </tr>`;
      });

      html += "</tbody></table>";
      container.innerHTML = html;
    });
  }

  /* ─────────────────────────────────────────────
     showApptCategory(category)
     Toggles visibility between Past, Today, and Upcoming.
     ───────────────────────────────────────────── */
  window.showApptCategory = function (category) {
    // Hide all categories
    document
      .querySelectorAll(".appt-category")
      .forEach((el) => (el.style.display = "none"));

    // Show selected
    document.getElementById(`appt-list-${category}`).style.display = "block";

    // Update button styles
    const buttons = document.querySelectorAll("#appt-filters button");
    buttons.forEach((btn) => {
      if (btn.innerText.toLowerCase() === category) {
        btn.style.background = "#1976d2";
        btn.style.color = "white";
      } else {
        btn.style.background = "#e0e0e0";
        btn.style.color = "#333";
      }
    });
  };

  /* ─────────────────────────────────────────────
     switchModalTab(tabName)
     Toggles between Info, History, and Add Record.
     ───────────────────────────────────────────── */
  window.switchModalTab = function (tabName) {
    // Hide all contents
    document
      .querySelectorAll(".modal-tab-content")
      .forEach((c) => c.classList.add("hidden"));
    // Show selected
    document.getElementById("modal-tab-" + tabName).classList.remove("hidden");

    // Update button styles
    document.querySelectorAll(".modal-tab-btn").forEach((btn) => {
      btn.classList.remove("border-blue-600", "text-blue-600");
      btn.classList.add("text-gray-500", "border-transparent");
    });
    const activeBtn = document.getElementById("tab-btn-" + tabName);
    activeBtn.classList.remove("text-gray-500", "border-transparent");
    activeBtn.classList.add("border-blue-600", "text-blue-600");
  };

  /* ─────────────────────────────────────────────
     fetchPatientHistory(patientId)
     Pulls past records and meds for the patient.
     ───────────────────────────────────────────── */
  function fetchPatientHistory(patientId) {
    const list = document.getElementById("pd-history-list");
    list.innerHTML =
      '<p class="text-center text-gray-400 py-4 italic text-sm animate-pulse">Fetching history...</p>';

    fetch(
      `../php/doctor_api.php?action=get_patient_history&patient_id=${patientId}`,
    )
      .then((res) => res.json())
      .then((result) => {
        if (result.status === "success") {
          const data = result.data;
          if (data.records.length === 0) {
            list.innerHTML =
              '<p class="text-center text-gray-500 py-6 text-sm">No previous health records found.</p>';
            return;
          }

          let html = "";
          data.records.forEach((r) => {
            const date = new Date(r.record_date).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
            html += `
              <div class="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                <div class="flex justify-between items-start mb-1">
                  <span class="text-[10px] font-bold text-blue-600 uppercase">${r.record_type}</span>
                  <span class="text-[10px] text-gray-400 font-medium">${date}</span>
                </div>
                <p class="text-xs font-bold text-gray-800 dark:text-gray-200">${r.summary}</p>
                <div class="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center gap-1">
                  <ion-icon name="person-circle-outline" class="text-gray-400"></ion-icon>
                  <span class="text-[10px] text-gray-500">Dr. ${r.doctor_name || "System"}</span>
                </div>
              </div>
            `;
          });
          list.innerHTML = html;
        }
      })
      .catch((err) => {
        console.error("History fetch error:", err);
        list.innerHTML =
          '<p class="text-center text-red-500 text-xs">Failed to load history.</p>';
      });
  }

  /* ─────────────────────────────────────────────
     showPatientDetail(encodedData)
     Opens the patient detail modal with full info.
     ───────────────────────────────────────────── */
  window.showPatientDetail = function (encodedData) {
    const appt = JSON.parse(decodeURIComponent(encodedData));
    const pId = appt.patient_id;

    // Reset to first tab
    switchModalTab("info");

    // Set hidden ID for form
    document.getElementById("form-patient-id").value = pId;

    // Set hidden appointment ID
    let apptIdField = document.getElementById("form-appointment-id");
    if(!apptIdField) {
        apptIdField = document.createElement("input");
        apptIdField.type = "hidden";
        apptIdField.id = "form-appointment-id";
        document.getElementById("clinical-action-form").appendChild(apptIdField);
    }
    apptIdField.value = appt.appointment_id;

    // Check Global Timer
    const timerContainer = document.getElementById("pd-timer-container");
    if(timerContainer) {
        if(window.activeConsultation && window.activeConsultation.appointmentId == appt.appointment_id) {
            timerContainer.classList.remove("hidden");
            timerContainer.classList.add("flex");
        } else {
            timerContainer.classList.add("hidden");
            timerContainer.classList.remove("flex");
        }
    }

    // Populate transfer dropdown if empty
    const transferSelect = document.getElementById("modal-transfer-doctor");
    if (transferSelect && transferSelect.options.length <= 1) {
      if (typeof allDoctorsData !== 'undefined' && allDoctorsData && allDoctorsData.length > 0) {
        let options = '<option value="">Select a doctor or department...</option>';
        allDoctorsData.forEach(d => {
          options += `<option value="${d.doctor_id}">${d.name || d.first_name + ' ' + d.last_name} (${d.department || d.specialization || 'General'})</option>`;
        });
        transferSelect.innerHTML = options;
      }
    }

    document.getElementById("pd-name").textContent =
      appt.patient_name || "Unknown";
    document.getElementById("pd-avatar").textContent = (appt.patient_name ||
      "?")[0].toUpperCase();
    document.getElementById("pd-cpr").textContent = "CPR: " + (appt.cpr || "—");
    document.getElementById("pd-email").textContent = appt.email || "—";
    document.getElementById("pd-phone").textContent = appt.phone || "—";
    document.getElementById("pd-dob").textContent = appt.date_of_birth || "—";
    document.getElementById("pd-gender").textContent = appt.gender
      ? appt.gender.charAt(0).toUpperCase() + appt.gender.slice(1)
      : "—";
    document.getElementById("pd-blood").textContent = appt.blood_type || "—";
    document.getElementById("pd-appt-type").textContent =
      appt.appointment_type || "—";
    document.getElementById("pd-reason").textContent = appt.reason || "—";

    const p = appt.ai_priority || "Normal";
    let pText = "🟢 " + p;
    if (p === "Highly Important") pText = "🔴 " + p;
    else if (p === "Important") pText = "🟠 " + p;
    // document.getElementById('pd-priority').textContent = pText; // Field removed in new layout

    // Pre-fetch history for the history tab
    fetchPatientHistory(pId);

    document.getElementById("patient-detail-modal").style.display = "flex";
  };

  /* ── Prescription Field Toggle ── */
  document
    .getElementById("add-prescription-toggle")
    ?.addEventListener("change", function (e) {
      const fields = document.getElementById("prescription-fields");
      if (e.target.checked) fields.classList.remove("hidden");
      else fields.classList.add("hidden");
    });

  /* ── Submit Clinical Form ── */
  document
    .getElementById("clinical-action-form")
    ?.addEventListener("submit", function (e) {
      e.preventDefault();
      const btn = e.target.querySelector("submit");
      const pId = document.getElementById("form-patient-id").value;

      const formData = new FormData();
      formData.append("action", "add_medical_record");
      formData.append("patient_id", pId);
      formData.append(
        "record_type",
        document.getElementById("form-record-type").value,
      );
      formData.append(
        "diagnosis",
        document.getElementById("form-diagnosis").value,
      );
      formData.append("summary", document.getElementById("form-summary").value);

      fetch("../php/doctor_api.php", { method: "POST", body: formData })
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "success") {
            const recordId = data.record_id;

            // Check if we need to add a prescription
            if (document.getElementById("add-prescription-toggle").checked) {
              const rxData = new FormData();
              rxData.append("action", "add_prescription");
              rxData.append("record_id", recordId);
              rxData.append(
                "medication_name",
                document.getElementById("form-medication").value,
              );
              rxData.append(
                "dosage",
                document.getElementById("form-dosage").value,
              );
              rxData.append(
                "frequency",
                document.getElementById("form-frequency").value,
              );
              rxData.append(
                "duration",
                document.getElementById("form-duration").value,
              );
              rxData.append(
                "instructions",
                document.getElementById("form-instructions").value,
              );

              return fetch("../php/doctor_api.php", {
                method: "POST",
                body: rxData,
              }).then((r) => r.json());
            }
            return data;
          } else throw new Error(data.message);
        })
        .then((final) => {
          if (final.status === "success") {
            Swal.fire(
              "Saved!",
              "Clinical record saved successfully!",
              "success",
            );
            closePatientModal();
            e.target.reset();
            document
              .getElementById("prescription-fields")
              .classList.add("hidden");
          } else {
            Swal.fire("Error", final.message, "error");
          }
        })
        .catch((err) => {
          console.error("Clinical record error:", err);
          Swal.fire("Error", err.message, "error");
        });
    });

  /* ─────────────────────────────────────────────
     closePatientModal()
     Closes the patient detail modal.
     ───────────────────────────────────────────── */
  window.closePatientModal = function () {
    document.getElementById("patient-detail-modal").style.display = "none";
  };

  /* ─────────────────────────────────────────────
     Global Timer & Transfer Logic for Modal
     ───────────────────────────────────────────── */
  window.activeConsultation = {
    appointmentId: null,
    startTime: null,
    interval: null
  };

  window.startGlobalTimer = function(appointmentId) {
     if(window.activeConsultation.interval) clearInterval(window.activeConsultation.interval);
     window.activeConsultation.appointmentId = appointmentId;
     window.activeConsultation.startTime = new Date().getTime();
     
     window.activeConsultation.interval = setInterval(() => {
        if(document.getElementById("patient-detail-modal").style.display === "flex") {
            const currentModalApptId = document.getElementById("form-appointment-id")?.value;
            if(currentModalApptId == appointmentId) {
                const now = new Date().getTime();
                const diff = now - window.activeConsultation.startTime;
                
                let m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, "0");
                let s = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, "0");
                
                const timerDisplay = document.getElementById("pd-timer-display");
                if(timerDisplay) {
                    timerDisplay.textContent = `${m}:${s}`;
                }
            }
        }
     }, 1000);
  };

  window.transferPatientFromModal = function() {
      const apptId = document.getElementById("form-appointment-id")?.value;
      const targetDoctorId = document.getElementById("modal-transfer-doctor")?.value;

      if (!apptId) {
          Swal.fire("Error", "No active appointment selected.", "error");
          return;
      }
      if (!targetDoctorId) {
          Swal.fire("Warning", "Please select a doctor or department to transfer to.", "warning");
          return;
      }

      Swal.fire({
          title: "Transfer Patient?",
          text: "Are you sure you want to transfer this patient?",
          icon: "question",
          showCancelButton: true,
          confirmButtonColor: "#f97316",
          cancelButtonColor: "#9ca3af",
          confirmButtonText: "Yes, transfer",
      }).then((result) => {
          if (result.isConfirmed) {
              const formData = new FormData();
              formData.append("action", "transfer_appointment");
              formData.append("appointment_id", apptId);
              formData.append("target_doctor_id", targetDoctorId);

              fetch("../php/doctor_api.php", {
                  method: "POST",
                  body: formData,
              })
              .then((res) => res.json())
              .then((data) => {
                  if (data.status === "success") {
                      Swal.fire("Transferred!", "The patient has been transferred successfully.", "success");
                      closePatientModal();
                      fetchDoctorData();
                  } else {
                      Swal.fire("Error", data.message, "error");
                  }
              })
              .catch((err) => {
                  console.error("Error transferring patient:", err);
                  Swal.fire("Error", "Failed to transfer patient.", "error");
              });
          }
      });
  };

  window.finishAppointmentDirectly = function (appointmentId) {
    Swal.fire({
      title: "Complete Consultation?",
      text: "Are you sure you want to mark this appointment as completed?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#9ca3af",
      confirmButtonText: "Yes, complete it",
    }).then((result) => {
      if (result.isConfirmed) {
        window.updateStatus(appointmentId, "completed");
      }
    });
  };

  /* ─────────────────────────────────────────────
     renderPatientsList(patients)
     Renders the list of today's patients with
     patient details, CPR, phone, and action buttons.
     ───────────────────────────────────────────── */
  function renderPatientsList(patients) {
    const listContainer = document.getElementById("patients-list-container");
    const scheduleContainer = document.getElementById("today-schedule");

    if (!patients || patients.length === 0) {
      let emptyHtml =
        '<p class="text-gray-500 dark:text-gray-400 py-6 text-center">No patients scheduled for today.</p>';
      if (listContainer) listContainer.innerHTML = emptyHtml;
      if (scheduleContainer) scheduleContainer.innerHTML = emptyHtml;
      return;
    }

    if (!listContainer) return; // Exit if the main container is missing to prevent crashes

    // ── Build List Table for the main Patients View ──
    let tableHtml =
      '<table class="appt-table"><thead><tr>' +
      "<th>Time</th>" +
      "<th>Patient</th>" +
      "<th>CPR</th>" +
      "<th>Phone</th>" +
      "<th>Reason</th>" +
      "<th>Action</th></tr></thead><tbody>";

    // ── Build Widget HTML for the Dashboard View ──
    let widgetHtml = '<div class="space-y-4">';

    patients.forEach((patient) => {
      let time = new Date(patient.appointment_date).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      let actionBtn = "";
      const safeData = encodeURIComponent(JSON.stringify(patient));

      if (patient.status === "completed") {
        actionBtn = '<span class="badge badge-green">Completed</span>';
      } else if (patient.status === "pending") {
        actionBtn = `
                <div class="flex items-center gap-2">
                  <button class="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" onclick="window.updateStatus(${patient.appointment_id}, 'accepted')">Accept</button>
                  <button class="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" onclick="window.updateStatus(${patient.appointment_id}, 'delayed')">Delay</button>
                  <button class="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" onclick="window.finishAppointmentDirectly(${patient.appointment_id})">Finish</button>
                </div>
            `;
      } else if (patient.status === "accepted") {
        actionBtn = `
                <div class="flex items-center gap-2">
                  <span class="badge badge-blue">Accepted</span>
                  <button class="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" onclick="window.finishAppointmentDirectly(${patient.appointment_id})">Finish</button>
                </div>
            `;
      } else if (patient.status === "delayed") {
        actionBtn = `
                <div class="flex items-center gap-2">
                  <span class="badge badge-blue">Delayed</span>
                  <button class="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" onclick="window.updateStatus(${patient.appointment_id}, 'accepted')">Accept</button>
                  <button class="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" onclick="window.finishAppointmentDirectly(${patient.appointment_id})">Finish</button>
                </div>
            `;
      } else {
        actionBtn = `
                <div class="flex items-center gap-2">
                  <button class="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" onclick="window.finishAppointmentDirectly(${patient.appointment_id})">Finish</button>
                </div>
            `;
      }

      actionBtn += ` <button onclick="showPatientDetail('${safeData}')" class="bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded-lg transition-colors inline-flex items-center justify-center ml-1" title="View details"><ion-icon name="eye-outline" class="text-sm"></ion-icon></button>`;

      tableHtml += `<tr>
            <td><div class="font-medium">${time}</div></td>
            <td><strong>${patient.patient_name}</strong></td>
            <td>${patient.cpr || "—"}</td>
            <td>${patient.phone || "—"}</td>
            <td><div class="text-xs max-w-[150px] truncate">${patient.reason}</div></td>
            <td>${actionBtn}</td>
        </tr>`;

      if (scheduleContainer) {
        widgetHtml += `
          <div class="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-500 transition-all">
            <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] font-bold text-blue-600 uppercase tracking-wider">${time}</span>
                ${patient.status === "completed" ? '<ion-icon name="checkmark-circle" class="text-green-500 text-lg"></ion-icon>' : ""}
            </div>
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold">
                    ${patient.patient_name[0]}
                </div>
                <div class="flex-grow">
                    <div class="text-sm font-bold text-gray-800 dark:text-white">${patient.patient_name}</div>
                    <div class="text-[10px] text-gray-500 truncate max-w-[150px]">${patient.reason}</div>
                </div>
            </div>
          </div>`;
      }
    });

    tableHtml += "</tbody></table>";
    widgetHtml += "</div>";

    if (listContainer) listContainer.innerHTML = tableHtml;
    if (scheduleContainer) scheduleContainer.innerHTML = widgetHtml;
  }

  /* ─────────────────────────────────────────────
     Timer Logic
     ───────────────────────────────────────────── */
  let timerInterval;
  let currentAppointmentId = null;

  window.startTimer = function (appointmentId, patientName) {
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
      let m = Math.floor(timeLeft / 60)
        .toString()
        .padStart(2, "0");
      let s = (timeLeft % 60).toString().padStart(2, "0");
      timerDisplay.textContent = `${m}:${s}`;

      // Update circle progress
      const offset = circumference - (timeLeft / maxTime) * circumference;
      timerProgress.style.strokeDashoffset = offset;
    }, 1000);
  };

  // --- Timer Actions ---
  
  // 1. Complete Appointment
  document.getElementById("btn-complete-ticket")?.addEventListener("click", function () {
    if (!currentAppointmentId) return;

    Swal.fire({
      title: "Complete Consultation?",
      text: "Are you sure you want to mark this appointment as completed?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#9ca3af",
      confirmButtonText: "Yes, complete it",
    }).then((result) => {
      if (result.isConfirmed) {
        clearInterval(timerInterval);
        document.getElementById("timer-modal").style.display = "none";
        updateStatus(currentAppointmentId, "completed");
      }
    });
  });

  // 2. Terminate / Cancel ticket
  document.getElementById("btn-terminate-ticket")?.addEventListener("click", function () {
    if (!currentAppointmentId) return;

    Swal.fire({
      title: "Cancel / Close Timer?",
      text: "Stop the timer without completing the appointment?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#9ca3af",
      confirmButtonText: "Yes, stop timer",
    }).then((result) => {
      if (result.isConfirmed) {
        clearInterval(timerInterval);
        document.getElementById("timer-modal").style.display = "none";
        // Optionally updateStatus to 'cancelled' or just close the modal. We just close for now.
      }
    });
  });

  // 3. Transfer Patient
  document.getElementById("btn-show-transfer")?.addEventListener("click", function () {
    const transferSection = document.getElementById("transfer-section");
    const actionsContainer = document.getElementById("timer-actions-container");
    
    // Hide primary actions, show transfer UI
    actionsContainer.classList.add("hidden");
    transferSection.classList.remove("hidden");

    // Populate dropdown if empty
    const select = document.getElementById("transfer-doctor-select");
    if (select && select.options.length <= 1) {
      if (allDoctorsData && allDoctorsData.length > 0) {
        let options = '<option value="">Select a doctor or department...</option>';
        allDoctorsData.forEach(d => {
          options += `<option value="${d.doctor_id}">${d.name || d.first_name + ' ' + d.last_name} (${d.department || d.specialization || 'General'})</option>`;
        });
        select.innerHTML = options;
      } else {
        select.innerHTML = '<option value="">No doctors available</option>';
      }
    }
  });

  document.getElementById("btn-cancel-transfer")?.addEventListener("click", function () {
    document.getElementById("transfer-section").classList.add("hidden");
    document.getElementById("timer-actions-container").classList.remove("hidden");
  });

  document.getElementById("btn-confirm-transfer")?.addEventListener("click", function () {
    if (!currentAppointmentId) return;
    
    const targetDoctorId = document.getElementById("transfer-doctor-select").value;
    if (!targetDoctorId) {
      Swal.fire("Error", "Please select a doctor to transfer to.", "error");
      return;
    }

    Swal.fire({
      title: "Transfer Patient?",
      text: "Are you sure you want to transfer this patient?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#f97316",
      cancelButtonColor: "#9ca3af",
      confirmButtonText: "Yes, transfer",
    }).then((result) => {
      if (result.isConfirmed) {
        clearInterval(timerInterval);
        document.getElementById("timer-modal").style.display = "none";
        
        // Reset modal UI for next time
        document.getElementById("transfer-section").classList.add("hidden");
        document.getElementById("timer-actions-container").classList.remove("hidden");

        // Call API to handle transfer
        const formData = new FormData();
        formData.append("action", "transfer_appointment");
        formData.append("appointment_id", currentAppointmentId);
        formData.append("target_doctor_id", targetDoctorId);

        fetch("../php/doctor_api.php", {
          method: "POST",
          body: formData,
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.status === "success") {
              Swal.fire("Transferred!", "The patient has been transferred successfully.", "success");
              fetchDoctorData(); // Refresh list
            } else {
              Swal.fire("Error", data.message, "error");
            }
          })
          .catch((error) => {
            console.error("Error transferring patient:", error);
            Swal.fire("Error", "Failed to transfer patient.", "error");
          });
      }
    });
  });

  window.updateStatus = function (appointmentId, status) {
    const formData = new FormData();
    formData.append("appointment_id", appointmentId);
    formData.append("status", status);

    fetch("../php/doctor_api.php", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          Swal.fire({
            title: "Updated!",
            text: `Appointment marked as ${status}.`,
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });
          if (status === 'accepted') {
              window.startGlobalTimer(appointmentId);
          }
          if (status === 'completed') {
              if (window.activeConsultation && window.activeConsultation.appointmentId == appointmentId) {
                  clearInterval(window.activeConsultation.interval);
                  window.activeConsultation.appointmentId = null;
              }
          }
          fetchDoctorData(); // Refresh list
        } else {
          Swal.fire("Error", data.message, "error");
        }
      })
      .catch((error) => {
        console.error("Error updating status:", error);
        Swal.fire("Error", "Failed to update appointment status.", "error");
      });
  };

  /* ─────────────────────────────────────────────
     Visuals: Charts & Calendar
     ───────────────────────────────────────────── */
  function getChartColors() {
    const isDark = document.documentElement.classList.contains("dark");
    return {
      textColor: isDark ? "#E5E7EB" : "#374151",
      gridColor: isDark ? "rgba(75, 85, 99, 0.5)" : "rgba(209, 213, 219, 0.5)",
      primaryColor: "#3B82F6",
      secondaryColor: "#10B981",
      tertiaryColor: "#F59E0B",
    };
  }

  function initCharts() {
    initPatientAdmissionsChart();
    initDepartmentPopularityChart();
  }

  function initPatientAdmissionsChart() {
    const canvas = document.getElementById("patientAdmissionsChart");
    if (!canvas || typeof Chart === "undefined") return;
    if (patientAdmissionsChartInstance)
      patientAdmissionsChartInstance.destroy();

    const ctx = canvas.getContext("2d");
    const colors = getChartColors();
    patientAdmissionsChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
        datasets: [
          {
            label: "Admissions",
            data: [65, 59, 80, 81, 56, 55, 90],
            fill: true,
            borderColor: colors.primaryColor,
            tension: 0.3,
            backgroundColor: "rgba(59, 130, 246, 0.1)",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: colors.textColor },
            grid: { color: colors.gridColor },
          },
          x: {
            ticks: { color: colors.textColor },
            grid: { color: colors.gridColor },
          },
        },
        plugins: { legend: { labels: { color: colors.textColor } } },
      },
    });
  }

  function initDepartmentPopularityChart() {
    const canvas = document.getElementById("departmentPopularityChart");
    if (!canvas || typeof Chart === "undefined") return;
    if (departmentPopularityChartInstance)
      departmentPopularityChartInstance.destroy();

    const ctx = canvas.getContext("2d");
    const colors = getChartColors();
    departmentPopularityChartInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: [
          "Cardiology",
          "Neurology",
          "Pediatrics",
          "Oncology",
          "Orthopedics",
        ],
        datasets: [
          {
            label: "Patient Visits",
            data: [300, 150, 220, 180, 250],
            backgroundColor: [
              colors.primaryColor,
              colors.secondaryColor,
              colors.tertiaryColor,
              "#6366F1",
              "#EC4899",
            ],
            hoverOffset: 4,
            borderColor: document.documentElement.classList.contains("dark")
              ? "#1f2937"
              : "#ffffff",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { color: colors.textColor } },
        },
      },
    });
  }

  function initFullCalendar() {
    const calendarEl = document.getElementById("calendar");
    // If we don't have a calendar div in the HTML yet, we should add one inside view-appointments
    if (!calendarEl) {
      const apptView = document.getElementById("view-appointments");
      if (apptView) {
        const calContainer = document.createElement("div");
        calContainer.className =
          "bg-white dark:bg-gray-800 rounded-xl shadow-lg mt-8 p-6";
        calContainer.innerHTML =
          '<h3 class="text-xl font-semibold mb-6">📅 Calendar Schedule</h3><div id="calendar" class="min-h-[500px]"></div>';
        apptView.appendChild(calContainer);
      }
    }

    const targetEl = document.getElementById("calendar");
    if (
      targetEl &&
      !isCalendarRendered &&
      typeof FullCalendar !== "undefined"
    ) {
      calendarInstance = new FullCalendar.Calendar(targetEl, {
        initialView: "dayGridMonth",
        headerToolbar: {
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
        },
        events: [
          {
            title: "Meeting with Dr. Smith",
            start: "2025-05-20T10:30:00",
            backgroundColor: "#3B82F6",
          },
          {
            title: "Surgery - Patient X",
            start: "2025-05-22T09:00:00",
            backgroundColor: "#EF4444",
          },
          {
            title: "Conference Call",
            start: "2025-05-25",
            backgroundColor: "#10B981",
          },
        ],
        editable: true,
        selectable: true,
      });
      calendarInstance.render();
      isCalendarRendered = true;
    }
  }

  // Handle AOS and UI refreshes
  window.addEventListener("resize", () => {
    if (patientAdmissionsChartInstance) patientAdmissionsChartInstance.resize();
    if (departmentPopularityChartInstance)
      departmentPopularityChartInstance.resize();
  });

  // Re-init charts on dark mode change
  document.getElementById("darkModeToggle")?.addEventListener("click", () => {
    setTimeout(initCharts, 100);
  });

  // Hook up navigation links to showSection
  document
    .querySelectorAll(".nav-link[data-view], .sidebar-link[data-view]")
    .forEach((link) => {
      link.addEventListener("click", (event) => {
        const view = link.getAttribute("data-view");
        if (view) {
          event.preventDefault();
          window.showSection(view);
        }
      });
    });

  /* ── 1. Load Doctor Data on Page Ready ── */
  fetchDoctorData();

  // Initialize Section from Hash or Default
  window.addEventListener("hashchange", syncViewWithHash);

  function syncViewWithHash() {
    const hash = window.location.hash.substring(1) || "dashboard";
    window.showSection(hash);
  }

  // Run immediately since we're already inside DOMContentLoaded
  syncViewWithHash();
});

/* ── Secure Logout ── */
window.handleLogout = function () {
  if (typeof Swal !== "undefined") {
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
  } else {
    if (confirm("Are you sure you want to logout?")) {
      window.location.href = "../php/logout.php";
    }
  }
};
