/**
 * Admin Dashboard Logic
 * Handles API data fetching, table rendering, and Chart.js initialization.
 */

const API_BASE = "../php/admin_api.php";
let allAppointments = [];
let allDocumentQueue = [];
let allDoctorsData = [];
let allPatientsData = [];

// -- UI Logic: Sidebar --
document.addEventListener("DOMContentLoaded", function () {
 const sidebarToggle = document.getElementById("sidebarToggle");
 const sidebar = document.getElementById("sidebar");
 const mainContent = document.getElementById("mainContent");
 const mobileOverlay = document.getElementById("mobile-overlay");

 if (sidebarToggle && sidebar && mainContent) {
  sidebarToggle.addEventListener("click", () => {
   if (window.innerWidth <= 768) {
    const isOpen = sidebar.classList.toggle("mobile-open");
    if (mobileOverlay) mobileOverlay.classList.toggle("active", isOpen);
   } else {
    sidebar.classList.toggle("sidebar-collapsed");
    sidebar.classList.toggle("sidebar-expanded");
    if (sidebar.classList.contains("sidebar-collapsed")) {
     mainContent.classList.remove("ml-64");
     mainContent.classList.add("ml-[4.5rem]");
    } else {
     mainContent.classList.remove("ml-[4.5rem]");
     mainContent.classList.add("ml-64");
    }
   }
  });

  if (mobileOverlay) {
   mobileOverlay.addEventListener("click", () => {
    sidebar.classList.remove("mobile-open");
    mobileOverlay.classList.remove("active");
   });
  }
  
  // Handle window resize cleanly
  window.addEventListener("resize", () => {
   if (window.innerWidth <= 768) {
    sidebar.classList.remove("sidebar-collapsed", "sidebar-expanded");
    mainContent.classList.remove("ml-[4.5rem]", "ml-64");
   } else {
    if (mobileOverlay) mobileOverlay.classList.remove("active");
    if (sidebar.classList.contains("sidebar-collapsed")) {
      mainContent.classList.add("ml-[4.5rem]");
      mainContent.classList.remove("ml-64");
    } else {
      mainContent.classList.add("ml-64");
      mainContent.classList.remove("ml-[4.5rem]");
    }
   }
  });

  // initial setup based on viewport
  if (window.innerWidth <= 768) {
   sidebar.classList.remove("sidebar-collapsed", "sidebar-expanded");
   mainContent.classList.remove("ml-[4.5rem]", "ml-64");
  }

  // Close sidebar on mobile when a link is clicked
  const sidebarLinks = sidebar.querySelectorAll(".sidebar-link");
  sidebarLinks.forEach(link => {
   link.addEventListener("click", () => {
     if(window.innerWidth <= 768) {
       sidebar.classList.remove("mobile-open");
     }
   });
  });
 }
});

// -- Helper: API Fetch (with fallback mock data for visual presentation) --
async function apiFetch(action) {
 try {
  const response = await fetch(`${API_BASE}?action=${action}`, {
   credentials: "include"
  });
  const json = await response.json();
  if (json.status === "success" && json.data) {
   return json.data;
  }
  return getMockAdminData(action);
 } catch (error) {
  console.warn("Using demo visualization data for action:", action, error);
  return getMockAdminData(action);
 }
}

function getMockAdminData(action) {
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  switch (action) {
    case 'dashboard':
      return {
        total_users: 43,
        total_patients: 30,
        total_doctors: 10,
        total_appointments: 18,
        total_records: 24,
        total_prescriptions: 16,
        pending_appointments: 5,
        completed_appointments: 12
      };
    case 'users':
      return [
        { id: 4001, name: 'System Admin', email: 'admin1@example.test', role: 'Admin', status: 'Active', last_login: 'Just Now', created_at: '2026-01-01' },
        { id: 2001, name: 'Dr. Fatima Khalid', email: 'doctor1@example.test', role: 'Doctor', status: 'Active', last_login: '10 mins ago', created_at: '2026-01-05' },
        { id: 2002, name: 'Dr. Ahmed Al-Din', email: 'doctor2@example.test', role: 'Doctor', status: 'Active', last_login: '1 hour ago', created_at: '2026-01-05' },
        { id: 2003, name: 'Dr. Mohamed Yousif', email: 'doctor3@example.test', role: 'Doctor', status: 'Active', last_login: '2 hours ago', created_at: '2026-01-06' },
        { id: 3001, name: 'Ali Mohamed', email: 'patient1@example.test', role: 'Patient', status: 'Active', last_login: 'Today', created_at: '2026-01-10' },
        { id: 3002, name: 'Fatima Al-Sayed', email: 'patient2@example.test', role: 'Patient', status: 'Active', last_login: 'Yesterday', created_at: '2026-01-12' },
        { id: 3003, name: 'Hassan Salman', email: 'patient3@example.test', role: 'Patient', status: 'Active', last_login: '3 days ago', created_at: '2026-01-15' }
      ];
    case 'patients':
      return [
        { patient_id: 6001, name: 'Ali Mohamed', first_name: 'Ali', last_name: 'Mohamed', cpr: '950123456', gender: 'Male', phone: '+973 3312 3456', blood_type: 'O+', date_of_birth: '1995-04-12', email: 'ali.mohamed@example.com' },
        { patient_id: 6002, name: 'Fatima Al-Sayed', first_name: 'Fatima', last_name: 'Al-Sayed', cpr: '980654321', gender: 'Female', phone: '+973 3922 4455', blood_type: 'A+', date_of_birth: '1998-06-22', email: 'fatima.sayed@example.com' },
        { patient_id: 6003, name: 'Hassan Salman', first_name: 'Hassan', last_name: 'Salman', cpr: '880312456', gender: 'Male', phone: '+973 3655 7788', blood_type: 'B+', date_of_birth: '1988-03-15', email: 'hassan.salman@example.com' },
        { patient_id: 6004, name: 'Mariam Yusuf', first_name: 'Mariam', last_name: 'Yusuf', cpr: '010899123', gender: 'Female', phone: '+973 3400 1122', blood_type: 'AB+', date_of_birth: '2001-08-09', email: 'mariam.yusuf@example.com' }
      ];
    case 'doctors':
      return [
        { id: 1, doctor_id: 1, name: 'Dr. Fatima Khalid', first_name: 'Fatima', last_name: 'Khalid', specialization: 'General Medicine', department: 'General Medicine', presence_status: 'Available', phone: '+973 1700 0001', profile_image: 'doc1.png', capacity: 16, email: 'doctor1@example.test', is_active: 1, records_count: 12 },
        { id: 2, doctor_id: 2, name: 'Dr. Ahmed Al-Din', first_name: 'Ahmed', last_name: 'Al-Din', specialization: 'General Medicine', department: 'General Medicine', presence_status: 'Available', phone: '+973 1700 0002', profile_image: 'doc2.png', capacity: 16, email: 'doctor2@example.test', is_active: 1, records_count: 8 },
        { id: 3, doctor_id: 3, name: 'Dr. Mohamed Yousif', first_name: 'Mohamed', last_name: 'Yousif', specialization: 'Dentistry', department: 'Dentistry', presence_status: 'In Consultation', phone: '+973 1700 0003', profile_image: 'doc3.png', capacity: 16, email: 'doctor3@example.test', is_active: 1, records_count: 15 },
        { id: 4, doctor_id: 4, name: 'Dr. Sara Hassan', first_name: 'Sara', last_name: 'Hassan', specialization: 'ENT Specialist', department: 'ENT', presence_status: 'Available', phone: '+973 1700 0004', profile_image: 'doc4.png', capacity: 16, email: 'doctor4@example.test', is_active: 1, records_count: 9 },
        { id: 5, doctor_id: 5, name: 'Dr. Omar Saleh', first_name: 'Omar', last_name: 'Saleh', specialization: 'Ophthalmology', department: 'Ophthalmology', presence_status: 'Off Duty', phone: '+973 1700 0005', profile_image: 'doc5.png', capacity: 16, email: 'doctor5@example.test', is_active: 1, records_count: 11 }
      ];
    case 'appointments':
      return [
        { appointment_id: 101, appointment_date: '2026-03-31 10:30:00', appointment_type: 'In-Person', status: 'accepted', reason: 'Routine Cardiology & Blood Pressure Checkup', ai_priority: 'Fast/Hard', queue_number: 2, patient_name: 'Ali Mohamed', doctor_name: 'Dr. Fatima Khalid' },
        { appointment_id: 102, appointment_date: '2026-03-31 11:15:00', appointment_type: 'In-Person', status: 'pending', reason: 'Severe Migraine with Aura', ai_priority: 'Medium', queue_number: 3, patient_name: 'Fatima Al-Sayed', doctor_name: 'Dr. Fatima Khalid' },
        { appointment_id: 103, appointment_date: '2026-04-01 14:00:00', appointment_type: 'In-Person', status: 'pending', reason: 'Dental Prophylaxis & Routine Exam', ai_priority: 'Standard', queue_number: 5, patient_name: 'Ali Mohamed', doctor_name: 'Dr. Mohamed Yousif' },
        { appointment_id: 104, appointment_date: '2026-03-30 09:00:00', appointment_type: 'In-Person', status: 'completed', reason: 'Annual Preventive Health Exam', ai_priority: 'Standard', queue_number: 1, patient_name: 'Hassan Salman', doctor_name: 'Dr. Fatima Khalid' }
      ];
    case 'records':
      return [
        { record_id: 1, record_date: '2026-03-25 10:30:00', record_type: 'Diagnostic Lab', summary: 'Comprehensive Metabolic Panel (CMP) and Lipid Profile. All markers normal.', patient_name: 'Ali Mohamed', doctor_name: 'Dr. Fatima Khalid' },
        { record_id: 2, record_date: '2026-03-15 14:00:00', record_type: 'Neurology Consult', summary: 'Episodic migraine diagnostic review. Prescribed sumatriptan.', patient_name: 'Fatima Al-Sayed', doctor_name: 'Dr. Fatima Khalid' }
      ];
    case 'prescriptions':
      return [
        { prescription_id: 1, medication_name: 'Amoxicillin 500mg', dosage: '1 Capsule', frequency: 'Twice Daily', duration: '7 days', instructions: 'Take with food', patient_name: 'Ali Mohamed', doctor_name: 'Dr. Fatima Khalid' },
        { prescription_id: 2, medication_name: 'Sumatriptan 50mg', dosage: '1 Tablet', frequency: 'As needed', duration: '6 tablets', instructions: 'Take at onset of migraine', patient_name: 'Fatima Al-Sayed', doctor_name: 'Dr. Fatima Khalid' }
      ];
    case 'chart_data':
      return {
        signups: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], data: [4, 7, 5, 8, 12, 6, 9] },
        doctor_chart: { labels: ['Dr. Fatima Khalid', 'Dr. Mohamed Yousif', 'Dr. Ahmed Al-Din', 'Dr. Sara Hassan', 'Dr. Omar Saleh'], data: [18, 15, 12, 10, 8] },
        time_chart: { labels: ['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM'], data: [2, 5, 8, 6, 4, 7, 9, 5, 3] }
      };
    case 'system_logs':
      return [
        { user: 'admin1@example.test', date: '2026-03-31', time: '10:45 AM', event: 'Admin dashboard overview viewed', status: 'info' },
        { user: 'doctor1@example.test', date: '2026-03-31', time: '10:30 AM', event: 'Clinical scribe transcribed audio note', status: 'success' },
        { user: 'patient1@example.test', date: '2026-03-31', time: '09:50 AM', event: 'New appointment scheduled', status: 'success' }
      ];
    case 'audit_trail':
      return [
        { user: 'admin1@example.test', action: 'Approved new doctor profile', table_affected: 'doctors', time: 'Mar 31, 10:40 AM' },
        { user: 'doctor1@example.test', action: 'Created new prescription', table_affected: 'prescriptions', time: 'Mar 31, 10:32 AM' }
      ];
    case 'ai_logs':
      return [
        { user: 'patient1@example.test', action: 'AI Triage Priority Assessment', details: 'Chest tightness evaluated -> Urgent priority', time: 'Mar 31, 09:48 AM' },
        { user: 'doctor1@example.test', action: 'AI Clinical Scribe Summary', details: 'Generated SOAP clinical note from live audio', time: 'Mar 31, 10:30 AM' }
      ];
    case 'document_queue':
      return [
        { patient: 'Ali Mohamed', file: 'lipid_profile_report_2026.pdf', date: 'Mar 29, 2026' },
        { patient: 'Fatima Al-Sayed', file: 'mri_brain_scan_diagnostic.pdf', date: 'Mar 26, 2026' }
      ];
    case 'feedback':
      return [
        { user: 'patient1@example.test', type: 'Feature Request', message: 'Fast queue booking is very helpful!', date: 'Mar 30, 2026' }
      ];
    case 'billing':
      return [
        { id: 501, patient: 'Ali Mohamed', subtotal: '$85.00', tax: '$8.50', amount: '$93.50', status: 'Paid', date: 'Mar 24, 2026', due_date: 'Mar 31, 2026', notes: 'Consultation & Diagnostics' },
        { id: 502, patient: 'Ali Mohamed', subtotal: '$120.00', tax: '$12.00', amount: '$132.00', status: 'Pending', date: 'Mar 31, 2026', due_date: 'Apr 14, 2026', notes: 'Dental prophylaxis' }
      ];
    default:
      return [];
  }
}

// -- Dashboard Stats --
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

// -- Table Rendering --
async function loadAllTables() {
 try {
 // 1. Users
 const users = await apiFetch("users");
 if (users) {
  document.getElementById("usersTableBody").innerHTML = users
   .map(
    (u) =>
     `<tr>
        <td>${u.name}</td>
    <td><span class="px-2 py-1 rounded text-xs font-semibold ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-semantic-cta text-semantic-cta dark:text-semantic-text"}">${u.role.toUpperCase()}</span></td>
        <td><span class="status-badge status-active">Active</span></td>
        <td>${u.last_login || "Just Now"}</td>
      </tr>`,
   )
   .join("");
 }

 // 2. Patients
 const patients = await apiFetch("patients");
 if (patients) {
  allPatientsData = patients;
  renderPatientsTable();
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
 } catch(e) { console.error('Error loading tables 1-11:', e); }

 // 12. Invoices (Billing) - loaded independently so earlier errors don't block it
 try {
 const invoices = await apiFetch("billing");
 const billingBody = document.getElementById("billingTableBody");
 if (!invoices || invoices.length === 0) {
  if (billingBody) billingBody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-semantic-text">
   <ion-icon name="receipt-outline" style="font-size:2rem" class="block mx-auto mb-2 opacity-30"></ion-icon>
   No invoices found. Create a bill to get started.</td></tr>`;
 } else if (billingBody) {
  try {
   billingBody.innerHTML = invoices
    .map((inv) => {
     const statusColors = {
      paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      cancelled: "bg-semantic-surface text-semantic-text opacity-80 dark:bg-semantic-surface dark:text-semantic-text dark:opacity-80",
      terminated: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
     };
     const st = (inv.status || 'pending').toLowerCase();
     const statusClass = statusColors[st] || statusColors.pending;

     // Build status dropdown options
     const statuses = ['pending', 'paid', 'cancelled', 'terminated'];
     const optionsHtml = statuses.map(s => 
      `<option value="${s}" ${st === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`
     ).join('');

     return `<tr>
         <td>${inv.patient || '-'}</td>
         <td class="text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80">${inv.subtotal || '$0.00'}</td>
         <td class="text-amber-600 dark:text-amber-400 text-xs">${inv.tax || '$0.00'}</td>
         <td class="font-bold">${inv.amount || '$0.00'}</td>
         <td><span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${statusClass}">${inv.status || 'Pending'}</span></td>
         <td>${inv.date || '-'}</td>
         <td class="text-semantic-text opacity-70">${inv.due_date || 'N/A'}</td>
         <td>
          <select onchange="changeInvoiceStatus(${inv.id}, this.value)" 
           class="text-xs bg-semantic-surface dark:bg-semantic-surface border border-semantic-border dark:border-semantic-border rounded-lg px-2 py-1.5 text-semantic-text opacity-90 dark:text-semantic-text dark:opacity-90 focus:ring-semantic-accent focus:border-semantic-accent cursor-pointer">
           ${optionsHtml}
          </select>
         </td>
       </tr>`;
    })
    .join("");
  } catch (e) {
   console.error("Billing render error:", e);
   billingBody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-red-400">Error rendering invoices</td></tr>`;
  }

  // Update billing summary cards
  let outstanding = 0, paid = 0, pendingCount = 0;
  invoices.forEach((inv) => {
   const amount = parseFloat((inv.amount || '0').replace(/[$,]/g, '')) || 0;
   const st = (inv.status || '').toLowerCase();
   if (st === 'pending') { outstanding += amount; pendingCount++; }
   else if (st === 'paid') { paid += amount; }
  });
  const outEl = document.getElementById('billing-outstanding');
  const paidEl = document.getElementById('billing-paid');
  const pendEl = document.getElementById('billing-pending-count');
  if (outEl) outEl.textContent = '$' + outstanding.toFixed(2);
  if (paidEl) paidEl.textContent = '$' + paid.toFixed(2);
  if (pendEl) pendEl.textContent = pendingCount;
 }
 } catch(e) { console.error('Error loading billing:', e); }
}

// -- Change Invoice Status (Admin) --
async function changeInvoiceStatus(invoiceId, newStatus) {
 const formData = new FormData();
 formData.append("invoice_id", invoiceId);
 formData.append("status", newStatus);
 try {
  const res = await fetch(`${API_BASE}?action=update_invoice_status`, {
   method: "POST",
   body: formData,
   credentials: "include",
  });
  const data = await res.json();
  if (data.status === "success") {
   Swal.fire({ icon: "success", title: data.message, timer: 1500, showConfirmButton: false });
   loadAllTables();
  } else {
   Swal.fire("Error", data.message, "error");
  }
 } catch (e) {
  Swal.fire("Error", "Network error", "error");
 }
}

// -- Specific Table Filters & Rendering --

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

// -- Admin Actions --

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
     ${queueEntry.files ? queueEntry.files.map((f) => `<li><a href="#" class="text-semantic-cta dark:text-semantic-accent hover:underline"><i class="fas fa-file-pdf mr-2"></i>${f}</a></li>`).join("") : "<li>No files</li>"}
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
 document.getElementById("bookApptTitle").textContent =
  "Book Appt: " + patientName;
 document.getElementById("book-patient-id").value = patientId;

 // Set default datetime to now
 const now = new Date();
 now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
 document.getElementById("book-date").value = now.toISOString().slice(0, 16);

 document.getElementById("bookApptForm").reset();
 document.getElementById("bookApptModal").classList.remove("hidden");
}

function closeBookApptModal() {
 document.getElementById("bookApptModal").classList.add("hidden");
 document.getElementById("bookApptForm").reset();
}

async function submitBookAppt() {
 const patientId = document.getElementById("book-patient-id").value;
 const reason = document.getElementById("book-reason").value;
 const date = document.getElementById("book-date").value;
 const doctor = document.getElementById("book-doctor").value;

 if (!reason || !date) {
  Swal.fire({
   title: "Validation Error",
   text: "Reason and Date are required.",
   icon: "warning",
   customClass: {
    popup:
     "bg-semantic-bg dark:bg-semantic-surface rounded-2xl shadow-xl border border-semantic-border dark:border-semantic-border",
    title: "dark:text-semantic-text",
    confirmButton:
     "bg-semantic-cta hover:bg-semantic-ctaHover text-white font-medium py-2 px-4 rounded-lg",
   },
   buttonsStyling: false,
  });
  return;
 }

 const formData = new FormData();
 formData.append("book_appointment", "1");
 formData.append("patient_id", patientId);
 formData.append("reason", reason);
 formData.append("date", date.replace("T", " ")); // MySQL format
 if (doctor) {
  formData.append("doctor_id", doctor);
 }

 try {
  const response = await fetch("../php/appointment_handler.php", {
   method: "POST",
   body: formData,
  });
  const data = await response.json();
  if (data.status === "success") {
   closeBookApptModal();
   Swal.fire({
    title: "Booked!",
    text: "Appointment booked successfully.",
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
   Swal.fire("Error", data.message || "Failed to book appointment", "error");
  }
 } catch (err) {
  console.error("Booking error:", err);
  Swal.fire("Error", "Networking or Server Error.", "error");
 }
}

// -- Tax Preview (live calculation) --
function updateTaxPreview() {
 const subtotal = parseFloat(document.getElementById("bill-amount").value) || 0;
 const taxRate = 0.10; // Fixed 10%
 const tax = Math.round(subtotal * taxRate * 100) / 100;
 const total = Math.round((subtotal + tax) * 100) / 100;

 const subEl = document.getElementById("tax-preview-subtotal");
 const taxEl = document.getElementById("tax-preview-tax");
 const totalEl = document.getElementById("tax-preview-total");
 if (subEl) subEl.textContent = "$" + subtotal.toFixed(2);
 if (taxEl) taxEl.textContent = "$" + tax.toFixed(2);
 if (totalEl) totalEl.textContent = "$" + total.toFixed(2);
}

// -- Billing Actions --
function openBillModal() {
 const patientSelect = document.getElementById("bill-patient");
 if (patientSelect && patientSelect.options.length <= 1) {
  // Populate patients dynamically
  apiFetch("patients").then((patients) => {
   if (patients) {
    patients.forEach((p) => {
     const opt = document.createElement("option");
     opt.value = p.patient_id;
     opt.text = p.name + " (" + (p.cpr || "No CPR") + ")";
     patientSelect.appendChild(opt);
    });
   }
  });
 }
 document.getElementById("billModal").classList.remove("hidden");
}

function closeBillModal() {
 document.getElementById("billModal").classList.add("hidden");
 document.getElementById("createBillForm").reset();
}

async function submitBill() {
 const patient = document.getElementById("bill-patient").value;
 const amount = parseFloat(document.getElementById("bill-amount").value);
 const notes = document.getElementById("bill-notes").value;
 const sender = document.getElementById("bill-sender").value;

 if (!patient || !amount || amount <= 0) {
  Swal.fire("Error", "Patient and a valid Amount are required.", "error");
  return;
 }

 const formData = new FormData();
 formData.append("patient_id", patient);
 formData.append("amount", amount);
 formData.append("notes", notes);
 formData.append("sender", sender);

 try {
  const res = await fetch(`${API_BASE}?action=create_bill`, {
   method: "POST",
   body: formData,
   credentials: "include",
  });
  const data = await res.json();
  if (data.status === "success") {
   const bd = data.breakdown;
   Swal.fire({
    icon: "success",
    title: "Bill Created!",
    html: `<div class="text-left space-y-1 mt-2">
     <div class="flex justify-between"><span class="text-semantic-text opacity-70">Subtotal:</span><span class="font-medium">$${bd.subtotal}</span></div>
     <div class="flex justify-between"><span class="text-semantic-text opacity-70">Tax (10%):</span><span class="font-medium text-amber-600">$${bd.tax}</span></div>
     <hr class="my-1 border-semantic-border">
   <div class="flex justify-between"><span class="font-bold">Total:</span><span class="font-bold text-semantic-cta dark:text-semantic-text">$${bd.total}</span></div>
    </div>`,
    customClass: {
     popup: "bg-semantic-bg dark:bg-semantic-surface rounded-2xl shadow-xl border border-semantic-border dark:border-semantic-border",
     title: "dark:text-semantic-text",
     htmlContainer: "dark:text-semantic-text dark:opacity-90",
    },
   });
   closeBillModal();
   loadAllTables();
  } else {
   Swal.fire("Error", data.message, "error");
  }
 } catch (e) {
  Swal.fire("Error", "Networking Error", "error");
 }
}

// -- Staff Actions --
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

async function sendNotification() {
 const sender = document.getElementById("notif-sender").value;
 let target = document.getElementById("notif-target").value;

 if (target === "other") {
  const otherEmail = document.getElementById("notif-target-other").value;
  if (!otherEmail) {
   Swal.fire("Error", "Please specify the users email.", "error");
   return;
  }
  target = otherEmail;
 }
 const msg = document.getElementById("notif-msg").value;
 const topic = document.getElementById("notif-topic").value;

 if (!topic) {
  Swal.fire("Error", "Topic cannot be empty", "error");
  return;
 }
 if (!msg) {
  Swal.fire("Error", "Message cannot be empty", "error");
  return;
 }

 const formData = new FormData();
 formData.append("sender", sender);
 formData.append("target", target);
 formData.append("topic", topic);
 formData.append("message", msg);

 try {
  const res = await fetch(`${API_BASE}?action=send_notification`, {
   method: "POST",
   body: formData,
  });
  const data = await res.json();
  if (data.status === "success") {
   Swal.fire("Sent!", data.message, "success");
   document.getElementById("notif-msg").value = "";
   loadAllTables(); // sync logs
  } else {
   Swal.fire("Error", "Failed to send notification", "error");
  }
 } catch (e) {
  Swal.fire("Error", "Networking Error", "error");
 }
}

// -- Charts --
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

// -- Patient CRUD --
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

/* ===========================================================
  Admin Presence System (3 states - no In Consultation)
  =========================================================== */

const ADMIN_PRESENCE_CONFIG = {
 on_duty:  { emoji: '🩺', label: 'On Duty',  bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-700', darkBg: 'dark:bg-emerald-900/30', darkBorder: 'dark:border-emerald-600', darkText: 'dark:text-emerald-400' },
 on_break: { emoji: '☕', label: 'On Break', bg: 'bg-amber-100',  border: 'border-amber-300',  text: 'text-amber-700',  darkBg: 'dark:bg-amber-900/30',  darkBorder: 'dark:border-amber-600',  darkText: 'dark:text-amber-400' },
 off_shift: { emoji: '🌙', label: 'Off Shift', bg: 'bg-semantic-surface',  border: 'border-semantic-border',  text: 'text-semantic-text opacity-70',  darkBg: 'dark:bg-semantic-bg/30',  darkBorder: 'dark:border-semantic-border',  darkText: 'dark:text-semantic-text dark:opacity-80' }
};

function updateAdminPresenceUI(status) {
 const config = ADMIN_PRESENCE_CONFIG[status] || ADMIN_PRESENCE_CONFIG.on_duty;
 const btn = document.getElementById('adminPresenceToggle');
 const emoji = document.getElementById('admin-presence-emoji');
 const label = document.getElementById('admin-presence-label');
 if (!btn) return;

 // Remove all presence classes
 Object.values(ADMIN_PRESENCE_CONFIG).forEach(c => {
  btn.classList.remove(c.bg, c.border, c.text, c.darkBg, c.darkBorder, c.darkText);
 });

 // Apply new classes
 btn.classList.add(config.bg, config.border, config.text, config.darkBg, config.darkBorder, config.darkText);
 if (emoji) emoji.textContent = config.emoji;
 if (label) label.textContent = config.label;
}

function setAdminPresence(status) {
 updateAdminPresenceUI(status);
 localStorage.setItem('adminPresenceStatus', status);
 // Close dropdown
 document.getElementById('adminPresenceDropdown')?.classList.add('hidden');
 // Show toast
 if (typeof Swal !== 'undefined') {
  const config = ADMIN_PRESENCE_CONFIG[status];
  Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `${config.emoji} Status: ${config.label}`, showConfirmButton: false, timer: 2000, timerProgressBar: true });
 }
}

function toggleAdminPresenceDropdown() {
 const dd = document.getElementById('adminPresenceDropdown');
 if (dd) dd.classList.toggle('hidden');
}

// Close admin presence dropdown on click outside
document.addEventListener('click', function(e) {
 const wrapper = document.getElementById('admin-presence-wrapper');
 const dd = document.getElementById('adminPresenceDropdown');
 if (wrapper && dd && !wrapper.contains(e.target)) {
  dd.classList.add('hidden');
 }
});

/* =======================================================
  AI Predictive Schedule Forecast
  ======================================================= */
function fetchForecast() {
  const container = document.getElementById('forecast-container');
  if (!container) return;

  container.innerHTML = `
    <div class="col-span-full py-6 text-center text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80 text-sm">
      <div class="spinner mx-auto mb-3 border-semantic-accent"></div>
      Generating AI predictions...
    </div>
  `;

  fetch('../Ai/predictive_schedule.php')
    .then(response => response.json())
    .then(res => {
      if (res.status === 'error') {
        container.innerHTML = `<div class="col-span-full py-4 text-center text-red-500 font-bold">${res.message}</div>`;
        return;
      }

      container.innerHTML = '';
      
      if (!res.forecast || res.forecast.length === 0) {
        container.innerHTML = `<div class="col-span-full py-4 text-center text-semantic-text opacity-70 font-bold">No historical data available for forecast.</div>`;
        return;
      }

      res.forecast.forEach(f => {
        const isRisk = f.overflow_risk;
        const riskBadge = isRisk 
          ? `<span class="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Overflow Risk</span>`
          : `<span class="bg-semantic-accent text-[var(--color-ink-navy)] text-[var(--color-ink-navy)] dark:bg-semantic-accent/30 dark:text-[var(--color-ink-navy)] text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Adequate</span>`;

        const card = document.createElement('div');
        card.className = `bg-semantic-bg dark:bg-semantic-surface rounded-xl p-4 border ${isRisk ? 'border-red-200 dark:border-red-900/50 shadow-sm shadow-red-100 dark:shadow-none' : 'border-semantic-border dark:border-semantic-border'} flex flex-col gap-2 relative transition-transform hover:-translate-y-1`;
        
        card.innerHTML = `
          <div class="flex justify-between items-start mb-2">
            <div class="font-bold text-semantic-text dark:text-semantic-text">${f.day}</div>
            ${riskBadge}
          </div>
          <div class="text-xs text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80 flex items-center gap-2">
            <ion-icon name="time-outline" class="${isRisk ? 'text-red-500' : 'text-semantic-text'}"></ion-icon> 
            <span class="font-semibold text-semantic-text opacity-90 dark:text-semantic-text dark:opacity-90">Peak: ${f.peak_hours}</span>
          </div>
          <div class="mt-auto pt-3 border-t ${isRisk ? 'border-red-100 dark:border-red-900/30' : 'border-semantic-border dark:border-semantic-border'} text-[11px] leading-snug ${isRisk ? 'text-red-600 dark:text-red-400 font-medium' : 'text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80'}">
            ${f.suggestion}
          </div>
        `;
        container.appendChild(card);
      });
    })
    .catch(err => {
      console.error("Forecast Error:", err);
      container.innerHTML = `<div class="col-span-full py-4 text-center text-red-500 font-bold">Failed to load forecast data.</div>`;
    });
}

document.addEventListener("DOMContentLoaded", () => {
  fetchForecast();
});
