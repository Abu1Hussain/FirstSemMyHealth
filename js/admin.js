/**
 * Admin Dashboard Logic
 * Handles API data fetching, table rendering, and Chart.js initialization.
 */

const API_BASE = "../php/admin_api.php";
let allAppointments = [];
let allDocumentQueue = [];
let allDoctorsData = [];

// ── Helper: API Fetch ──
async function apiFetch(action) {
  try {
    const response = await fetch(`${API_BASE}?action=${action}`);
    const json = await response.json();
    if (json.status === "error") {
      if (json.message === "Unauthorized") {
        window.location.href = "../loginReg/login.html";
      }
      console.error("API error:", json.message);
      return null;
    }
    return json.data;
  } catch (error) {
    console.error("Fetch error:", error);
    return null;
  }
}

// ── Dashboard Stats ──
async function loadDashboardStats() {
  const data = await apiFetch("dashboard");
  if (!data) return;
  document.getElementById("stat-total-users").textContent =
    data.total_users || "0";
  document.getElementById("stat-total-patients").textContent =
    data.total_patients || "0";
  document.getElementById("stat-total-doctors").textContent =
    data.total_doctors || "0";
  document.getElementById("stat-total-appointments").textContent =
    data.total_appointments || "0";
}

// ── Table Rendering ──
async function loadAllTables() {
  // 1. Users
  const users = await apiFetch("users");
  if (users) {
    document.getElementById("usersTableBody").innerHTML = users
      .map(
        (u) =>
          `<tr>
                <td>${u.name}</td>
                <td><span class="px-2 py-1 rounded text-xs font-semibold ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}">${u.role.toUpperCase()}</span></td>
                <td><span class="status-badge status-active">Active</span></td>
                <td>${u.last_login || "Just Now"}</td>
            </tr>`,
      )
      .join("");
  }

  // 2. Patients
  const patients = await apiFetch("patients");
  if (patients) {
    document.getElementById("patientsTableBody").innerHTML = patients
      .map(
        (p) =>
          `<tr>
                <td>${p.name}</td>
                <td>${p.cpr || "N/A"}</td>
                <td><button onclick="bookForPatient(${p.patient_id}, '${p.name.replace(/'/g, "\\'")}')" class="text-indigo-600 hover:text-indigo-900 font-medium whitespace-nowrap"><i class="fas fa-calendar-plus mr-1"></i>Book Appointment</button></td>
            </tr>`,
      )
      .join("");
  }

  // 3. Doctors
  const doctors = await apiFetch("doctors");
  if (doctors) {
    allDoctorsData = doctors;
    renderDoctorsTable();
  }

  // 4. Appointments
  const appointments = await apiFetch("appointments");
  if (appointments) {
    allAppointments = appointments.map((a) => ({
      date: new Date(a.appointment_date),
      patient: a.patient_name,
      doctor: a.doctor_name || "N/A",
      status: a.status
        ? a.status.charAt(0).toUpperCase() + a.status.slice(1)
        : "Pending",
      id: a.appointment_id,
    }));
    setupYearFilter();
    filterAppointments();
  }

  // 5. Records
  const records = await apiFetch("records");
  if (records) {
    document.getElementById("recordsTableBody").innerHTML = records
      .map(
        (r) =>
          `<tr><td>${r.patient_name}</td><td>${r.summary || r.record_type}</td></tr>`,
      )
      .join("");
  }

  // 6. Prescriptions
  const prescriptions = await apiFetch("prescriptions");
  if (prescriptions) {
    document.getElementById("prescriptionsTableBody").innerHTML = prescriptions
      .map(
        (p) =>
          `<tr><td>${p.patient_name}</td><td>${p.doctor_name}</td><td>${p.medication_name}</td></tr>`,
      )
      .join("");
  }

  // 7. AI Logs
  const aiLogs = await apiFetch("ai_logs");
  if (aiLogs) {
    document.getElementById("aiLogsTableBody").innerHTML = aiLogs
      .map(
        (l) =>
          `<tr><td>${l.user}</td><td>${l.time}</td><td>${l.action}</td></tr>`,
      )
      .join("");
  }

  // 8. Document Queue
  const docQueue = await apiFetch("document_queue");
  if (docQueue) {
    allDocumentQueue = docQueue;
    document.getElementById("docQueueTableBody").innerHTML = docQueue
      .map(
        (q, i) =>
          `<tr><td>${q.patient}</td><td>${q.date}</td><td><button class="status-badge status-active" onclick="viewDocuments(${i})"><i class="fas fa-eye"></i> View</button></td></tr>`,
      )
      .join("");
  }

  // 9. System Logs
  const sysLogs = await apiFetch("system_logs");
  if (sysLogs) {
    document.getElementById("sysLogsTableBody").innerHTML = sysLogs
      .map(
        (l) =>
          `<tr><td>${l.user}</td><td>${l.date}</td><td>${l.time}</td><td><span class="status-badge status-active">${l.status}</span></td></tr>`,
      )
      .join("");
  }

  // 10. Audit Trail
  const audit = await apiFetch("audit_trail");
  if (audit) {
    document.getElementById("auditTableBody").innerHTML = audit
      .map(
        (a) =>
          `<tr><td>${a.user}</td><td>${a.action}</td><td>${a.time}</td></tr>`,
      )
      .join("");
  }

  // 11. Feedback
  const feedback = await apiFetch("feedback");
  if (feedback) {
    document.getElementById("reportsTableBody").innerHTML = feedback
      .map(
        (r) =>
          `<tr><td>${r.user}</td><td>${r.type}</td><td>${r.message}</td><td>${r.date}</td></tr>`,
      )
      .join("");
  }
}

// ── Specific Table Filters & Rendering ──

function renderDoctorsTable() {
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

  let html = `<table class="appt-table"><thead><tr><th>Doctor</th><th>Contact</th><th>Department</th><th>Specialization</th><th>Records</th></tr></thead><tbody>`;
  filteredDoctors.forEach((d) => {
    const initials = d.name ? d.name.charAt(0).toUpperCase() : "?";
    let avatarHtml = d.profile_image
      ? `<img src="${d.profile_image}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">`
      : `<div style="width:40px; height:40px; border-radius:50%; background:#e0e7ff; color:#3730a3; display:flex; align-items:center; justify-content:center; font-weight:bold;">${initials}</div>`;
    html += `<tr>
            <td><div class="flex items-center gap-3">${avatarHtml}<div><div class="font-semibold text-gray-800">${d.name || "Unknown"}</div><div class="text-xs text-gray-500">ID: #${(d.id || 0).toString().padStart(4, "0")}</div></div></div></td>
            <td><div class="text-xs"><div><i class="fas fa-envelope text-gray-400 w-4"></i> ${d.email || "—"}</div><div class="mt-1"><i class="fas fa-phone text-gray-400 w-4"></i> ${d.phone || "—"}</div></div></td>
            <td><span class="status-badge" style="background:#e0e7ff; color:#3730a3;">${d.department || "General"}</span></td>
            <td>${d.specialization || "General Medicine"}</td>
            <td><div class="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg font-bold text-gray-600">${d.records_count || 0}</div></td>
        </tr>`;
  });
  html += `</tbody></table>`;
  container.innerHTML = html;
}

function filterDoctorsTable() {
  renderDoctorsTable();
}

function filterAppointments() {
  const selectedYear = document.getElementById("appointYear").value;
  const selectedMonth = document.getElementById("appointMonth").value;
  const tableBody = document.getElementById("appointmentsTableBody");

  const filtered = allAppointments.filter((a) => {
    const yearOk =
      selectedYear === "all" ||
      a.date.getFullYear().toString() === selectedYear;
    const monthOk =
      selectedMonth === "all" || a.date.getMonth().toString() === selectedMonth;
    return yearOk && monthOk;
  });

  if (filtered.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="4" style="text-align:center;">No data</td></tr>';
  } else {
    tableBody.innerHTML = filtered
      .map((a) => {
        const statusClass =
          a.status.toLowerCase() === "pending"
            ? "status-pending"
            : a.status.toLowerCase() === "completed"
              ? "status-active"
              : "status-danger";
        return `<tr>
                <td>${a.date.toDateString()}</td>
                <td>${a.patient}</td>
                <td>${a.doctor}</td>
                <td>
                    <span class="status-badge ${statusClass}">${a.status}</span>
                    ${
                      a.status.toLowerCase() !== "terminated" &&
                      a.status.toLowerCase() !== "completed"
                        ? `<button class="status-badge status-danger" style="background:#ef4444; color:white; border:none; cursor:pointer;" onclick="terminateAppointment(${a.id})">Terminate</button>`
                        : ""
                    }
                </td>
            </tr>`;
      })
      .join("");
  }
}

function setupYearFilter() {
  const uniqueYears = [];
  allAppointments.forEach((a) => {
    const y = a.date.getFullYear();
    if (!uniqueYears.includes(y)) uniqueYears.push(y);
  });
  uniqueYears.sort();
  const yearDropdown = document.getElementById("appointYear");
  yearDropdown.innerHTML =
    '<option value="all">All Years</option>' +
    uniqueYears.map((y) => `<option value="${y}">${y}</option>`).join("");
}

// ── Admin Actions ──

function terminateAppointment(apptId) {
  Swal.fire({
    title: "Terminate Appointment?",
    text: "Are you sure you want to terminate/delete this appointment?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#9ca3af",
    confirmButtonText: "Yes, terminate it",
  }).then(async (result) => {
    if (result.isConfirmed) {
      const formData = new FormData();
      formData.append("terminate_appointment", "1");
      formData.append("appointment_id", apptId);
      const response = await fetch("../php/appointment_handler.php", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.status === "success") {
        Swal.fire("Terminated!", data.message, "success");
        loadAllTables();
      } else {
        Swal.fire("Error", data.message, "error");
      }
    }
  });
}

function viewDocuments(index) {
  const queueEntry = allDocumentQueue[index];
  Swal.fire({
    title: "Patient Documents",
    html: `
            <div class="text-left">
                <p class="font-bold mb-2">Patient: ${queueEntry.patient}</p>
                <ul class="space-y-1">
                    ${queueEntry.files ? queueEntry.files.map((f) => `<li><a href="#" class="text-indigo-600 hover:underline"><i class="fas fa-file-pdf mr-2"></i>${f}</a></li>`).join("") : "<li>No files</li>"}
                </ul>
            </div>
        `,
    confirmButtonText: "Close",
  });
}

function handleLogout() {
  Swal.fire({
    title: "Logout?",
    text: "Are you sure you want to logout?",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#4f46e5",
    confirmButtonText: "Yes, logout",
  }).then((result) => {
    if (result.isConfirmed) window.location.href = "../php/logout.php";
  });
}

function bookForPatient(patientId, patientName) {
  Swal.fire({
    title: "Book Appointment for " + patientName,
    html:
      '<div class="swal2-input-group text-left">' +
      '<label class="swal2-input-label text-sm font-semibold text-gray-700 mb-1 block">Reason for Appointment</label>' +
      '<input id="swal-reason" class="swal2-input w-full p-2 border rounded mb-3" placeholder="e.g. Regular Checkup">' +
      '<label class="swal2-input-label text-sm font-semibold text-gray-700 mb-1 block">Date and Time</label>' +
      '<input id="swal-date" type="datetime-local" class="swal2-input w-full p-2 border rounded mb-3" value="' +
      new Date().toISOString().slice(0, 16) +
      '">' +
      '<label class="swal2-input-label text-sm font-semibold text-gray-700 mb-1 block">Staff/Doctor ID</label>' +
      '<input id="swal-doctor" type="number" class="swal2-input w-full p-2 border rounded mb-3" placeholder="Staff ID">' +
      "</div>",
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonColor: "#4f46e5",
    confirmButtonText: "Book Now",
    preConfirm: () => {
      const reason = document.getElementById("swal-reason").value;
      const date = document.getElementById("swal-date").value;
      const doctor = document.getElementById("swal-doctor").value;
      if (!reason || !date || !doctor) {
        Swal.showValidationMessage("Please fill in all fields");
      }
      return { reason: reason, date: date, doctor: doctor };
    },
  }).then(async (result) => {
    if (result.isConfirmed) {
      const val = result.value;
      const formData = new FormData();
      formData.append("book_appointment", "1");
      formData.append("patient_id", patientId);
      formData.append("reason", val.reason);
      formData.append("date", val.date.replace("T", " ")); // MySQL format
      formData.append("doctor_id", val.doctor);

      try {
        const response = await fetch("../php/appointment_handler.php", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        if (data.status === "success") {
          Swal.fire(
            "Booked!",
            "Appointment booked successfully for " + patientName,
            "success",
          );
          loadAllTables();
        } else {
          Swal.fire(
            "Error",
            data.message || "Failed to book appointment",
            "error",
          );
        }
      } catch (err) {
        console.error("Booking error:", err);
        Swal.fire("Error", "Networking or Server Error.", "error");
      }
    }
  });
}

// ── Charts ──
async function loadCharts() {
  const data = await apiFetch("chart_data");
  if (!data) return;

  // 1. User Growth
  new Chart(document.getElementById("userGrowthChart"), {
    type: "line",
    data: {
      labels: data.signups.labels,
      datasets: [
        {
          label: "Signups",
          data: data.signups.data,
          borderColor: "#4f46e5",
          tension: 0.4,
          fill: true,
          backgroundColor: "rgba(79, 70, 229, 0.05)",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
    },
  });

  // 2. Doctor Allocation
  new Chart(document.getElementById("aiDoctorsChart"), {
    type: "bar",
    data: {
      labels: data.doctor_chart.labels,
      datasets: [
        {
          label: "Appointments",
          data: data.doctor_chart.data,
          backgroundColor: "#4f46e5",
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
    },
  });

  // 3. Visit Times
  new Chart(document.getElementById("aiTimeChart"), {
    type: "line",
    data: {
      labels: data.time_chart.labels,
      datasets: [
        {
          label: "Visits",
          data: data.time_chart.data,
          borderColor: "#10b981",
          tension: 0.4,
          fill: true,
          backgroundColor: "rgba(16, 185, 129, 0.05)",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
    },
  });
}

// ── Initialization ──
document.addEventListener("DOMContentLoaded", () => {
  loadDashboardStats();
  loadAllTables();
  loadCharts();
});
