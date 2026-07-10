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
   type: a.appointment_type,
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
          <div style="display:inline-flex; gap: 8px; margin-left: 8px;">
          ${
           a.type && a.type.toLowerCase().includes('telehealth') && ["Pending", "Accepted", "Delayed"].includes(a.status)
            ? `<a href="../telemed_room.html?appt_id=${a.id}&role=doctor" class="status-badge" style="background:#2563eb; color:white; border:none; cursor:pointer; text-decoration:none;"><ion-icon name="videocam"></ion-icon> Start Call</a>`
            : ""
          }
          ${
           a.status.toLowerCase() !== "terminated" &&
           a.status.toLowerCase() !== "completed"
            ? `<button class="status-badge status-danger" style="background:#ef4444; color:white; border:none; cursor:pointer;" onclick="terminateAppointment(${a.id})">Terminate</button>`
            : ""
          }
          </div>
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

