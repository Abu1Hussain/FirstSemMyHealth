function renderPatientsTable() {
 const tableBody = document.getElementById("patientsTableBody");
 if (!tableBody) return;

 let filteredPatients = allPatientsData;
 const searchTerm =
  document.getElementById("patient-search")?.value.toLowerCase() || "";

 if (searchTerm) {
  filteredPatients = allPatientsData.filter(
   (p) =>
    (p.name && p.name.toLowerCase().includes(searchTerm)) ||
    (p.cpr && p.cpr.toString().toLowerCase().includes(searchTerm)),
  );
 }

 if (filteredPatients.length === 0) {
  tableBody.innerHTML =
   '<tr><td colspan="4" class="text-center py-8 text-semantic-text opacity-70">No patients found matching your search.</td></tr>';
  return;
 }

 tableBody.innerHTML = filteredPatients
  .map(
   (p) =>
    `<tr>
      <td><div class="font-medium text-semantic-text dark:text-semantic-text">${p.name}</div></td>
      <td><div class="text-sm text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80">${p.cpr || "N/A"}</div></td>
      <td><div class="text-sm text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80">${p.email || "N/A"}</div></td>
      <td>
       <div class="flex items-center gap-2 flex-wrap">
    <button onclick="bookForPatient(${p.patient_id}, '${p.name.replace(/'/g, "\\\'")}')" class="text-semantic-cta dark:text-semantic-accent hover:text-semantic-cta dark:text-semantic-accent dark:hover:text-semantic-cta dark:text-semantic-accent font-medium whitespace-nowrap bg-semantic-surface hover:bg-semantic-cta dark:bg-semantic-brand/30 dark:hover:bg-semantic-brand/50 px-3 py-1.5 rounded-lg transition-colors text-xs"><i class="fas fa-calendar-plus mr-1"></i>Book</button>
    <button onclick="editPatient(${p.patient_id})" class="text-semantic-cta dark:text-semantic-accent hover:text-semantic-cta dark:text-semantic-accent font-medium whitespace-nowrap bg-semantic-surface hover:bg-semantic-cta dark:bg-semantic-brand/30 dark:hover:bg-semantic-brand/50 px-3 py-1.5 rounded-lg transition-colors text-xs"><i class="fas fa-edit mr-1"></i>Edit</button>
        <button onclick="deletePatient(${p.patient_id}, '${p.name.replace(/'/g, "\\\'")}')" class="text-red-600 hover:text-red-900 dark:text-red-400 font-medium whitespace-nowrap bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-800/50 px-3 py-1.5 rounded-lg transition-colors text-xs"><i class="fas fa-trash mr-1"></i>Delete</button>
       </div>
      </td>
    </tr>`,
  )
  .join("");
}

function filterPatientsTable() {
 renderPatientsTable();
}

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
   '<p class="text-center py-8 text-semantic-text opacity-70">No staff found matching your search.</p>';
  return;
 }

 let html = `<table class="appt-table"><thead><tr><th>Staff</th><th>Status</th><th>Contact</th><th>Department</th><th>Specialization</th><th>Completed</th><th>Actions</th></tr></thead><tbody>`;
 const presenceMap = {
  on_duty:     { emoji: '🩺', label: 'On Duty',     cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  in_consultation: { emoji: '🚪', label: 'Busy',      cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
  on_break:    { emoji: '☕', label: 'Break',      cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  off_shift:    { emoji: '🌙', label: 'Off Shift',    cls: 'bg-semantic-surface text-semantic-text opacity-70 dark:bg-semantic-bg/30 dark:text-semantic-text dark:opacity-80' }
 };
 filteredDoctors.forEach((d) => {
  const initials = d.name ? d.name.charAt(0).toUpperCase() : "?";
  let avatarHtml;
  if (d.profile_image) {
   // If the backend returns just a filename, prepend the path, otherwise use it directly if it's already a full path
   const imgSrc = d.profile_image.includes("/")
    ? d.profile_image
    : `../image/${d.profile_image}`;
   avatarHtml = `<img src="${imgSrc}" onerror="this.src='../image/default_user.png'" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">`;
  } else {
   avatarHtml = `<div style="width:40px; height:40px; border-radius:50%; background:#e0e7ff; color:#3730a3; display:flex; align-items:center; justify-content:center; font-weight:bold;">${initials}</div>`;
  }
  const safeName = (d.name || "Unknown").replace(/'/g, "\\'");
  const pStatus = d.presence_status || 'off_shift';
  const pConf = presenceMap[pStatus] || presenceMap.off_shift;
  const presenceBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${pConf.cls}">${pConf.emoji} ${pConf.label}</span>`;
  html += `<tr>
      <td><div class="flex items-center gap-3">${avatarHtml}<div><div class="font-semibold text-semantic-text dark:text-semantic-text">${d.name || "Unknown"}</div><div class="text-xs text-semantic-text opacity-70">ID: #${(d.id || 0).toString().padStart(4, "0")}</div></div></div></td>
      <td>${presenceBadge}</td>
      <td><div class="text-xs"><div><i class="fas fa-envelope text-semantic-text w-4"></i> ${d.email || "\u2014"}</div><div class="mt-1"><i class="fas fa-phone text-semantic-text w-4"></i> ${d.phone || "\u2014"}</div></div></td>
      <td><span class="status-badge" style="background:#e0e7ff; color:#3730a3;">${d.department || "General"}</span></td>
      <td>${d.specialization || "General Medicine"}</td>
      <td><div class="flex items-center justify-center w-8 h-8 bg-semantic-surface dark:bg-semantic-surface rounded-lg font-bold text-semantic-text opacity-80 dark:text-semantic-text dark:opacity-90">${d.records_count || 0}</div></td>
      <td>
       <div class="flex items-center gap-2">
    <button onclick="editStaff(${d.doctor_id})" class="text-semantic-cta dark:text-semantic-accent hover:text-semantic-cta dark:text-semantic-accent font-medium whitespace-nowrap bg-semantic-surface hover:bg-semantic-cta dark:bg-semantic-brand/30 dark:hover:bg-semantic-brand/50 px-3 py-1.5 rounded-lg transition-colors text-xs"><i class="fas fa-edit mr-1"></i>Edit</button>
        <button onclick="deleteStaff(${d.doctor_id}, '${safeName}')" class="text-red-600 hover:text-red-900 dark:text-red-400 font-medium whitespace-nowrap bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-800/50 px-3 py-1.5 rounded-lg transition-colors text-xs"><i class="fas fa-trash mr-1"></i>Delete</button>
       </div>
      </td>
    </tr>`;
 });
 html += `</tbody></table>`;
 container.innerHTML = html;
}

function filterDoctorsTable() {
 renderDoctorsTable();
}


function openStaffModal() {
 document.getElementById("createStaffForm").reset();
 document.getElementById("edit-staff-id").value = "";
 document.getElementById("staffModalTitle").textContent = "Register New Staff";
 document.getElementById("staff-password-row").style.display = "";
 document.getElementById("staffModal").classList.remove("hidden");
}

function closeStaffModal() {
 document.getElementById("staffModal").classList.add("hidden");
 document.getElementById("createStaffForm").reset();
 document.getElementById("edit-staff-id").value = "";
}

async function submitStaff() {
 const editId = document.getElementById("edit-staff-id").value;
 const fname = document.getElementById("staff-fname").value;
 const lname = document.getElementById("staff-lname").value;
 const email = document.getElementById("staff-email").value;
 const pass = document.getElementById("staff-pass").value;
 const spec = document.getElementById("staff-spec").value;
 const dept = document.getElementById("staff-dept").value;

 if (!fname || !lname || !email) {
  Swal.fire("Error", "Please fill essential fields", "error");
  return;
 }
 if (!editId && !pass) {
  Swal.fire("Error", "Password is required for new staff", "error");
  return;
 }

 const formData = new FormData();

 if (editId) {
  // Edit mode
  formData.append("update_staff", "1");
  formData.append("doctor_id", editId);
  formData.append("first_name", fname);
  formData.append("last_name", lname);
  formData.append("email", email);
  formData.append(
   "phone",
   document.getElementById("staff-phone")?.value || "",
  );
  formData.append("specialization", spec);
 } else {
  // Add mode
  formData.append("fname", fname);
  formData.append("lname", lname);
  formData.append("email", email);
  formData.append("password", pass);
  formData.append("specialization", spec);
  formData.append("department", dept);
 }

 try {
  const url = editId
   ? "../php/admin_api.php"
   : `${API_BASE}?action=add_staff`;
  const res = await fetch(url, { method: "POST", body: formData });
  const data = await res.json();
  if (data.status === "success") {
   Swal.fire("Success", data.message, "success");
   closeStaffModal();
   loadAllTables();
  } else {
   Swal.fire("Error", data.message, "error");
  }
 } catch (e) {
  Swal.fire("Error", "Networking Error", "error");
 }
}

// -- Notifications --
function toggleOtherEmail(selectElement) {
 const otherEmailContainer = document.getElementById("other-email-container");
 if (selectElement.value === "other") {
  otherEmailContainer.classList.remove("hidden");
 } else {
  otherEmailContainer.classList.add("hidden");
 }
}


function openPatientModal(patientId = null) {
 document.getElementById("patientForm").reset();
 document.getElementById("edit-patient-id").value = "";
 if (patientId) {
  const p = allPatientsData.find((pt) => pt.patient_id == patientId);
  if (p) {
   document.getElementById("patientModalTitle").textContent = "Edit Patient";
   document.getElementById("patientSubmitText").textContent =
    "Update Patient";
   document.getElementById("edit-patient-id").value = p.patient_id;
   document.getElementById("patient-fname").value = p.first_name || "";
   document.getElementById("patient-lname").value = p.last_name || "";
   document.getElementById("patient-email").value = p.email || "";
   document.getElementById("patient-cpr").value = p.cpr || "";
   document.getElementById("patient-phone").value = p.phone || "";
   document.getElementById("patient-gender").value = p.gender || "Male";
   document.getElementById("patient-blood").value = p.blood_type || "";
   document.getElementById("patient-password-row").style.display = "none";
  }
 } else {
  document.getElementById("patientModalTitle").textContent = "Add Patient";
  document.getElementById("patientSubmitText").textContent = "Save Patient";
  document.getElementById("patient-password-row").style.display = "";
 }
 document.getElementById("patientModal").classList.remove("hidden");
}

function closePatientModal() {
 document.getElementById("patientModal").classList.add("hidden");
}

async function submitPatient() {
 const id = document.getElementById("edit-patient-id").value;
 const formData = new FormData();
 formData.append("first_name", document.getElementById("patient-fname").value);
 formData.append("last_name", document.getElementById("patient-lname").value);
 formData.append("email", document.getElementById("patient-email").value);
 formData.append("cpr", document.getElementById("patient-cpr").value);
 formData.append("phone", document.getElementById("patient-phone").value);
 formData.append("gender", document.getElementById("patient-gender").value);
 formData.append("blood_type", document.getElementById("patient-blood").value);

 if (id) {
  formData.append("update_patient", "1");
  formData.append("patient_id", id);
 } else {
  formData.append("add_patient", "1");
  formData.append(
   "password",
   document.getElementById("patient-password").value,
  );
 }

 try {
  const res = await fetch("../php/admin_api.php", {
   method: "POST",
   body: formData,
  });
  const data = await res.json();
  if (data.status === "success") {
   closePatientModal();
   Swal.fire({
    title: id ? "Updated!" : "Added!",
    text: data.message,
    icon: "success",
    customClass: {
     popup:
      "bg-semantic-bg dark:bg-semantic-surface rounded-2xl shadow-xl border border-semantic-border dark:border-semantic-border",
     title: "dark:text-semantic-text",
     confirmButton:
      "bg-semantic-cta hover:bg-semantic-ctaHover text-white font-medium py-2 px-4 rounded-lg",
    },
    buttonsStyling: false,
   });
   loadAllTables();
  } else {
   Swal.fire("Error", data.message || "Operation failed", "error");
  }
 } catch (err) {
  console.error(err);
  Swal.fire("Error", "Network error", "error");
 }
}

function editPatient(patientId) {
 openPatientModal(patientId);
}

function deletePatient(patientId, patientName) {
 Swal.fire({
  title: "Delete Patient?",
  text:
   "Are you sure you want to remove " +
   patientName +
   "? This cannot be undone.",
  icon: "warning",
  showCancelButton: true,
  confirmButtonText: "Yes, delete",
  customClass: {
   popup:
    "bg-semantic-bg dark:bg-semantic-surface rounded-2xl shadow-xl border border-semantic-border dark:border-semantic-border",
   title: "dark:text-semantic-text",
   confirmButton:
    "bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg",
   cancelButton:
    "bg-semantic-surface hover:bg-semantic-surface dark:bg-semantic-surface dark:hover:bg-semantic-surface text-semantic-text dark:text-semantic-text font-medium py-2 px-4 rounded-lg ml-2",
  },
  buttonsStyling: false,
 }).then(async (result) => {
  if (result.isConfirmed) {
   const formData = new FormData();
   formData.append("delete_patient", "1");
   formData.append("patient_id", patientId);
   try {
    const res = await fetch(`${API_BASE}`, {
     method: "POST",
     body: formData,
     credentials: "include",
    });
    const text = await res.text();
    console.log("Delete response:", text);
    let data;
    try {
     data = JSON.parse(text);
    } catch (e) {
     Swal.fire("Error", "Server returned invalid response: " + text.substring(0, 200), "error");
     return;
    }
    if (data.status === "success") {
     Swal.fire("Deleted!", data.message, "success");
     loadAllTables();
    } else {
     Swal.fire("Error", data.message + (data.debug ? "\n\nDebug: " + JSON.stringify(data.debug) : ""), "error");
    }
   } catch (err) {
    console.error("Delete error:", err);
    Swal.fire("Error", "Network error: " + err.message, "error");
   }
  }
 });
}

// -- Staff CRUD --
function editStaff(doctorId) {
 const d = allDoctorsData.find((doc) => doc.doctor_id == doctorId);
 if (!d) return;
 // Reuse the staff modal for editing
 document.getElementById("createStaffForm").reset();
 document.getElementById("staffModalTitle").textContent = "Edit Staff";
 if (document.getElementById("edit-staff-id")) {
  document.getElementById("edit-staff-id").value = d.doctor_id;
 }
 document.getElementById("staff-fname").value = d.first_name || "";
 document.getElementById("staff-lname").value = d.last_name || "";
 document.getElementById("staff-email").value = d.email || "";
 document.getElementById("staff-phone").value = d.phone || "";
 document.getElementById("staff-spec").value = d.specialization || "";
 if (document.getElementById("staff-password-row")) {
  document.getElementById("staff-password-row").style.display = "none";
 }
 document.getElementById("staffModal").classList.remove("hidden");
}

function deleteStaff(doctorId, doctorName) {
 Swal.fire({
  title: "Delete Staff?",
  text:
   "Are you sure you want to remove " +
   doctorName +
   "? This cannot be undone.",
  icon: "warning",
  showCancelButton: true,
  confirmButtonText: "Yes, delete",
  customClass: {
   popup:
    "bg-semantic-bg dark:bg-semantic-surface rounded-2xl shadow-xl border border-semantic-border dark:border-semantic-border",
   title: "dark:text-semantic-text",
   confirmButton:
    "bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg",
   cancelButton:
    "bg-semantic-surface hover:bg-semantic-surface dark:bg-semantic-surface dark:hover:bg-semantic-surface text-semantic-text dark:text-semantic-text font-medium py-2 px-4 rounded-lg ml-2",
  },
  buttonsStyling: false,
 }).then(async (result) => {
  if (result.isConfirmed) {
   const formData = new FormData();
   formData.append("delete_staff", "1");
   formData.append("doctor_id", doctorId);
   try {
    const res = await fetch("../php/admin_api.php", {
     method: "POST",
     body: formData,
    });
    const data = await res.json();
    if (data.status === "success") {
     Swal.fire("Deleted!", data.message, "success");
     loadAllTables();
    } else {
     Swal.fire("Error", data.message, "error");
    }
   } catch (err) {
    Swal.fire("Error", "Network error", "error");
   }
  }
 });
}

// -- Initialization --
document.addEventListener("DOMContentLoaded", () => {
 loadDashboardStats();
 loadAllTables();
 loadCharts();

 // Initialize admin presence from localStorage
 const savedPresence = localStorage.getItem('adminPresenceStatus') || 'on_duty';
 updateAdminPresenceUI(savedPresence);
});


