/* ===========================================================
  Doctor Dashboard - Main Script
  Handles data loading, specific doctor UI rendering, and
  clinical action flows (status updates, medical records).
  =========================================================== */

let docData = null;

document.addEventListener('DOMContentLoaded', () => {
  fetchDoctorData();

  // Unified Sidebar Edge Toggle (< & >) logic across all screen sizes
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const mobileOverlay = document.getElementById('mobile-overlay');

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      if (window.innerWidth < 768) {
        const isOpening = sidebar.classList.contains('closed') || !sidebar.classList.contains('sidebar-mobile-drawer');
        if (isOpening) {
          sidebar.classList.add('sidebar-mobile-drawer');
          sidebar.classList.remove('closed');
          if (mobileOverlay) mobileOverlay.classList.add('active');
          sidebarToggle.innerHTML = '&#8249;';
          sidebarToggle.classList.remove('mobile-edge-btn-anchored');
        } else {
          sidebar.classList.add('closed');
          if (mobileOverlay) mobileOverlay.classList.remove('active');
          sidebarToggle.innerHTML = '&#8250;';
          sidebarToggle.classList.add('mobile-edge-btn-anchored');
        }
      } else {
        const isClosed = sidebar.classList.toggle('sidebar-closed');
        sidebarToggle.innerHTML = isClosed ? '&#8250;' : '&#8249;';
      }
    });
  }

  if (mobileOverlay && sidebar) {
    mobileOverlay.addEventListener('click', () => {
      sidebar.classList.add('closed');
      mobileOverlay.classList.remove('active');
      if (sidebarToggle) {
        sidebarToggle.innerHTML = '&#8250;';
        sidebarToggle.classList.add('mobile-edge-btn-anchored');
      }
    });
  }
});

function fetchDoctorData() {
  const loadingOverlay = document.getElementById("loading-overlay");
  if (loadingOverlay) loadingOverlay.style.display = "flex";

  fetch('../php/doctor_api.php')
    .then(response => response.json())
    .then(res => {
      if (res.status === 'success' && res.data) {
        docData = res.data;
      } else {
        docData = getMockDoctorData();
      }
      renderDashboard();
    })
    .catch(err => {
      console.warn('Network / API error, rendering demo visualization data:', err);
      docData = getMockDoctorData();
      renderDashboard();
    })
    .finally(() => {
      if (loadingOverlay) loadingOverlay.style.display = "none";
    });
}

function getMockDoctorData() {
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return {
    user: {
      name: 'Fatima Khalid',
      initial: 'F',
      email: 'doctor1@example.test',
      image_url: '../image/doc1.png',
      presence_status: 'Available'
    },
    specialization: 'General Medicine',
    stats: {
      total_patients: 24,
      today_appointments: 6,
      pending_reviews: 2
    },
    patients_today: [
      {
        appointment_id: 1,
        patient_id: 6001,
        patient_name: 'Ali Mohamed',
        cpr: '950123456',
        blood_type: 'O+',
        gender: 'Male',
        date_of_birth: '1995-04-12',
        appointment_date: `${today} 10:30:00`,
        reason: 'Routine Cardiology & Blood Pressure Checkup',
        ai_priority: 'Fast/Hard',
        status: 'accepted',
        queue_number: 2,
        ticket_code: 'A-102',
        summary: 'Patient reports occasional chest tightness after physical exertion.'
      },
      {
        appointment_id: 2,
        patient_id: 6002,
        patient_name: 'Fatima Al-Sayed',
        cpr: '980654321',
        blood_type: 'A+',
        gender: 'Female',
        date_of_birth: '1998-06-22',
        appointment_date: `${today} 11:15:00`,
        reason: 'Severe Migraine with Aura & Sensitivity',
        ai_priority: 'Medium',
        status: 'pending',
        queue_number: 3,
        ticket_code: 'A-103',
        summary: 'Recurrent unilateral headache accompanied by photophobia.'
      },
      {
        appointment_id: 3,
        patient_id: 6003,
        patient_name: 'Hassan Salman',
        cpr: '880312456',
        blood_type: 'B+',
        gender: 'Male',
        date_of_birth: '1988-03-15',
        appointment_date: `${today} 09:00:00`,
        reason: 'Annual Preventive Health Exam',
        ai_priority: 'Standard',
        status: 'completed',
        queue_number: 1,
        ticket_code: 'A-101',
        summary: 'Annual physical checkup completed. Vitals stable.'
      }
    ],
    all_appointments: [
      { appointment_id: 1, appointment_date: `${today} 10:30 AM`, patient_name: 'Ali Mohamed', appointment_type: 'In-Person', status: 'accepted', ai_priority: 'Fast/Hard', queue_number: 2, ticket_code: 'A-102' },
      { appointment_id: 2, appointment_date: `${today} 11:15 AM`, patient_name: 'Fatima Al-Sayed', appointment_type: 'In-Person', status: 'pending', ai_priority: 'Medium', queue_number: 3, ticket_code: 'A-103' },
      { appointment_id: 3, appointment_date: `${today} 09:00 AM`, patient_name: 'Hassan Salman', appointment_type: 'In-Person', status: 'completed', ai_priority: 'Standard', queue_number: 1, ticket_code: 'A-101' }
    ],
    all_records: [
      { record_id: 1, patient_name: 'Ali Mohamed', record_date: `${today}`, record_type: 'Diagnostic Lab', summary: 'Full lipid panel and ECG evaluation. Recommended dietary adjustments.', source_type: 'In-Person' },
      { record_id: 2, patient_name: 'Fatima Al-Sayed', record_date: `${today}`, record_type: 'Consultation', summary: 'Neurological evaluation for episodic migraines. Prescribed prophylaxis.', source_type: 'Telemedicine' }
    ],
    all_prescriptions: [
      { prescription_id: 1, patient_name: 'Ali Mohamed', medication_name: 'Amoxicillin 500mg', dosage: '1 Capsule', frequency: 'Twice Daily', duration: '7 days', record_date: today },
      { prescription_id: 2, patient_name: 'Fatima Al-Sayed', medication_name: 'Sumatriptan 50mg', dosage: '1 Tablet', frequency: 'At onset of migraine', duration: '6 tablets', record_date: today }
    ],
    all_staff: [
      { name: 'Dr. Ahmed Al-Din', specialization: 'General Medicine', department: 'General Medicine', presence_status: 'Available', image_url: '../image/doc2.png' },
      { name: 'Dr. Mohamed Yousif', specialization: 'Dentistry', department: 'Dentistry', presence_status: 'In Consultation', image_url: '../image/doc3.png' },
      { name: 'Dr. Sara Hassan', specialization: 'ENT Specialist', department: 'ENT', presence_status: 'Available', image_url: '../image/doc4.png' },
      { name: 'Dr. Omar Saleh', specialization: 'Ophthalmology', department: 'Ophthalmology', presence_status: 'Off Duty', image_url: '../image/doc5.png' }
    ]
  };
}

function renderDashboard() {
  if (!docData) return;

  // Header updates
  if (docData.user) {
    document.getElementById('header-user-name').textContent = `Dr. ${docData.user.name}`;
    document.getElementById('header-user-spec').textContent = docData.specialization || 'Doctor';
    
    const avatarImg = document.getElementById('user-initial-header');
    if (avatarImg && docData.user.image_url) {
      avatarImg.src = docData.user.image_url;
    }

    const presenceSelect = document.getElementById('presence-select');
    if (presenceSelect && docData.user.presence_status) {
      presenceSelect.value = docData.user.presence_status;
      updatePresenceSelectStyle(docData.user.presence_status);
    }
  }

  // KPI Cards
  if (docData.stats) {
    document.getElementById('stat-patients').textContent = docData.stats.total_patients;
    document.getElementById('stat-today').textContent = docData.stats.today_appointments;
    document.getElementById('stat-pending').textContent = docData.stats.pending_reviews;
  }

  renderTodayPatients();
  renderAppointments('today'); // Default tab
  renderRecords();
  renderPrescriptions();
  renderStaff();
}

function getStatusBadge(status) {
  switch (status.toLowerCase()) {
    case 'pending': return '<span class="badge badge-orange">Pending</span>';
    case 'accepted': return '<span class="badge badge-blue">Accepted</span>';
    case 'completed': return '<span class="badge badge-green">Completed</span>';
    case 'terminated': return '<span class="badge badge-red">Terminated</span>';
    case 'cancelled': return '<span class="badge badge-gray">Cancelled</span>';
    default: return `<span class="badge badge-gray">${status}</span>`;
  }
}

function getPriorityBadge(priority) {
  if (!priority) return '';
  switch (priority) {
    case 'Fast/Hard': return '<span class="badge badge-red">Urgent</span>';
    case 'Medium': return '<span class="badge badge-orange">Priority</span>';
    default: return '<span class="badge badge-gray">Standard</span>';
  }
}

function renderTodayPatients() {
  const tbody = document.getElementById('today-patients-tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!docData.patients_today || docData.patients_today.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-semantic-text opacity-70">No patients scheduled for today.</td></tr>`;
    return;
  }

  docData.patients_today.forEach(appt => {
    const time = new Date(appt.appointment_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    let actions = '';
    if (appt.status === 'pending') {
   actions = `<button onclick="updateStatus(${appt.appointment_id}, 'accepted')" class="text-xs font-bold px-3 py-1 bg-semantic-cta text-semantic-cta dark:text-semantic-accent hover:bg-semantic-cta rounded">Accept</button>`;
    } else if (appt.status === 'accepted') {
      actions = `
        <div class="flex gap-2">
     <button onclick="startMedicalRecordFlow(${appt.patient_id}, ${appt.appointment_id})" class="text-xs font-bold px-3 py-1 bg-semantic-cta text-semantic-cta dark:text-semantic-accent hover:bg-semantic-cta rounded">+ Record</button>
          <button onclick="updateStatus(${appt.appointment_id}, 'completed')" class="text-xs font-bold px-3 py-1 bg-semantic-accent text-[var(--color-ink-navy)] text-[var(--color-ink-navy)] hover:bg-semantic-accent rounded">Complete</button>
        </div>
      `;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="font-medium">
        <div>${time}</div>
        <div class="text-xs text-semantic-text opacity-70 mt-1">Queue: #${appt.queue_number || '--'}</div>
      </td>
      <td>
        <div class="font-bold text-semantic-text dark:text-semantic-text">${appt.patient_name}</div>
        <div class="text-xs text-semantic-text opacity-70 mt-1">CPR: ${appt.cpr} | ${appt.gender}</div>
      </td>
      <td>
        <div class="text-sm">${appt.reason || 'Not specified'}</div>
        <div class="mt-1">${getPriorityBadge(appt.ai_priority)}</div>
      </td>
      <td>${getStatusBadge(appt.status)}</td>
      <td>${actions}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderAppointments(tab) {
  const tbody = document.getElementById('appointments-tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  const list = docData.all_appointments[tab] || [];
  
  // Update tabs UI
  ['today', 'upcoming', 'past'].forEach(t => {
    const btn = document.getElementById(`tab-${t}`);
    if(btn) {
      if(t === tab) {
    btn.classList.add('text-semantic-cta dark:text-semantic-accent', 'border-semantic-accent', 'font-bold');
        btn.classList.remove('text-semantic-text opacity-70', 'border-transparent', 'font-medium');
      } else {
        btn.classList.add('text-semantic-text opacity-70', 'border-transparent', 'font-medium');
    btn.classList.remove('text-semantic-cta dark:text-semantic-accent', 'border-semantic-accent', 'font-bold');
      }
    }
  });

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-semantic-text opacity-70">No appointments found.</td></tr>`;
    return;
  }

  list.forEach(appt => {
    const date = new Date(appt.appointment_date).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="font-medium">${date}</td>
      <td>
        <div class="font-bold">${appt.patient_name}</div>
        <div class="text-xs text-semantic-text opacity-70">${appt.cpr}</div>
      </td>
      <td>${appt.appointment_type || 'General'}</td>
      <td>${getStatusBadge(appt.status)}</td>
    `;
    tbody.appendChild(tr);
  });
}
window.switchApptTab = renderAppointments;

function renderRecords() {
  const tbody = document.getElementById('records-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  if (!docData.all_records || docData.all_records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-semantic-text opacity-70">No records authored yet.</td></tr>`;
    return;
  }

  docData.all_records.forEach(rec => {
    const date = new Date(rec.record_date).toLocaleDateString();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="font-medium">${date}</td>
      <td class="font-bold">${rec.patient_name}</td>
      <td>${rec.record_type}</td>
      <td class="text-sm truncate max-w-xs">${rec.summary}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderPrescriptions() {
  const tbody = document.getElementById('prescriptions-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  if (!docData.all_prescriptions || docData.all_prescriptions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-semantic-text opacity-70">No prescriptions issued yet.</td></tr>`;
    return;
  }

  docData.all_prescriptions.forEach(rx => {
    const date = new Date(rx.record_date).toLocaleDateString();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="font-medium">${date}</td>
      <td class="font-bold">${rx.patient_name}</td>
   <td class="font-bold text-semantic-cta dark:text-semantic-text ">${rx.medication_name}</td>
      <td class="text-sm">${rx.dosage} - ${rx.frequency} (for ${rx.duration})</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderStaff() {
  const grid = document.getElementById('staff-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (!docData.all_staff) return;

  docData.all_staff.forEach(staff => {
    const img = staff.profile_image ? `../image/${staff.profile_image}` : '../image/default_user.png';
    const card = document.createElement('div');
    card.className = "bg-semantic-bg dark:bg-semantic-surface rounded-2xl p-5 shadow-sm border border-semantic-border dark:border-semantic-border flex flex-col items-center text-center hover:shadow-md transition-shadow";
    card.innerHTML = `
      <img src="${img}" class="w-20 h-20 rounded-full object-cover mb-4 border-2 border-semantic-border dark:border-semantic-border">
      <h3 class="font-bold text-semantic-text dark:text-semantic-text mb-1">Dr. ${staff.first_name} ${staff.last_name}</h3>
   <p class="text-xs font-bold text-semantic-cta dark:text-semantic-text uppercase tracking-wider mb-3">${staff.specialization}</p>
      <div class="text-xs text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80 space-y-1 w-full">
        <p class="flex items-center justify-center gap-2"><ion-icon name="mail-outline"></ion-icon> ${staff.email || 'N/A'}</p>
        <p class="flex items-center justify-center gap-2"><ion-icon name="call-outline"></ion-icon> ${staff.phone || 'N/A'}</p>
      </div>
    `;
    grid.appendChild(card);
  });
}

/* =======================================================
  ACTIONS (POST to doctor_api.php)
  ======================================================= */

window.updatePresence = function(newStatus) {
  const formData = new FormData();
  formData.append('action', 'update_presence');
  formData.append('status', newStatus);

  fetch('../php/doctor_api.php', { method: 'POST', body: formData })
    .then(r => r.json())
    .then(res => {
      if(res.status === 'success') {
        updatePresenceSelectStyle(newStatus);
      } else {
        Swal.fire('Error', res.message, 'error');
        // Revert
        if(docData) document.getElementById('presence-select').value = docData.user.presence_status;
      }
    });
};

function updatePresenceSelectStyle(status) {
  const sel = document.getElementById('presence-select');
  if(!sel) return;
  sel.className = 'bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer pl-3 pr-8 ';
  if(status === 'on_duty') sel.classList.add('text-semantic-accent', 'dark:text-[var(--color-ink-navy)]');
  else if(status === 'in_consultation') sel.classList.add('text-red-600', 'dark:text-red-400');
  else if(status === 'on_break') sel.classList.add('text-orange-500', 'dark:text-orange-400');
  else sel.classList.add('text-semantic-text opacity-70');
}

window.updateStatus = function(apptId, newStatus) {
  Swal.fire({
    title: `Mark as ${newStatus}?`,
    text: newStatus === 'completed' ? "This will archive the ticket." : "",
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    confirmButtonColor: newStatus === 'completed' ? '#059669' : '#2563eb'
  }).then(result => {
    if(result.isConfirmed) {
      const formData = new FormData();
      formData.append('appointment_id', apptId);
      formData.append('status', newStatus);

      fetch('../php/doctor_api.php', { method: 'POST', body: formData })
        .then(r => r.json())
        .then(res => {
          if(res.status === 'success') {
            Swal.fire('Success', res.message, 'success');
            fetchDoctorData(); // Refresh UI
          } else {
            Swal.fire('Error', res.message, 'error');
          }
        });
    }
  });
};

/* --- Chained Flow: Record -> Diagnosis -> Prescription --- */

window.startMedicalRecordFlow = function(patientId, apptId) {
  Swal.fire({
    title: 'Add Medical Record',
    html: `
      <div class="text-left space-y-4">
        <div>
          <label class="block text-sm font-bold mb-1">Record Type</label>
          <select id="rec-type" class="w-full border rounded-lg p-2 dark:bg-semantic-surface dark:border-semantic-border">
            <option value="Consultation">Consultation</option>
            <option value="Follow-up">Follow-up</option>
            <option value="Check-up">Check-up</option>
            <option value="Emergency">Emergency</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-bold mb-1">Diagnosis</label>
          <input type="text" id="rec-diag" class="w-full border rounded-lg p-2 dark:bg-semantic-surface dark:border-semantic-border" placeholder="e.g. Acute Bronchitis">
        </div>
        <div>
          <label class="block text-sm font-bold mb-1">Summary / Notes</label>
          <textarea id="rec-sum" rows="3" class="w-full border rounded-lg p-2 dark:bg-semantic-surface dark:border-semantic-border" placeholder="Patient presented with..."></textarea>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Save & Continue',
    preConfirm: () => {
      const type = document.getElementById('rec-type').value;
      const diag = document.getElementById('rec-diag').value;
      const sum = document.getElementById('rec-sum').value;
      if(!diag || !sum) {
        Swal.showValidationMessage('Diagnosis and Summary are required');
        return false;
      }
      return { type, diag, sum };
    }
  }).then(result => {
    if (result.isConfirmed) {
      saveRecordAndDiagnosis(patientId, result.value);
    }
  });
};

function saveRecordAndDiagnosis(patientId, data) {
  const formData = new FormData();
  formData.append('action', 'add_medical_record');
  formData.append('patient_id', patientId);
  formData.append('record_type', data.type);
  formData.append('diagnosis', data.diag);
  formData.append('summary', data.sum);

  fetch('../php/doctor_api.php', { method: 'POST', body: formData })
    .then(r => r.json())
    .then(res => {
      if(res.status === 'success') {
        promptForPrescription(res.record_id);
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    });
}

function promptForPrescription(recordId) {
  Swal.fire({
    title: 'Record Saved. Add a Prescription?',
    text: 'Would you like to issue a prescription for this visit?',
    icon: 'success',
    showCancelButton: true,
    confirmButtonText: 'Yes, Add Rx',
    cancelButtonText: 'No, Finish'
  }).then(result => {
    if (result.isConfirmed) {
      Swal.fire({
        title: 'New Prescription',
        html: `
          <div class="text-left space-y-4">
            <div>
              <label class="block text-sm font-bold mb-1">Medication Name</label>
              <input type="text" id="rx-name" class="w-full border rounded-lg p-2 dark:bg-semantic-surface dark:border-semantic-border">
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-bold mb-1">Dosage</label>
                <input type="text" id="rx-dose" class="w-full border rounded-lg p-2 dark:bg-semantic-surface dark:border-semantic-border" placeholder="e.g. 500mg">
              </div>
              <div>
                <label class="block text-sm font-bold mb-1">Frequency</label>
                <input type="text" id="rx-freq" class="w-full border rounded-lg p-2 dark:bg-semantic-surface dark:border-semantic-border" placeholder="e.g. Twice a day">
              </div>
            </div>
            <div>
              <label class="block text-sm font-bold mb-1">Duration</label>
              <input type="text" id="rx-dur" class="w-full border rounded-lg p-2 dark:bg-semantic-surface dark:border-semantic-border" placeholder="e.g. 7 days">
            </div>
            <div>
              <label class="block text-sm font-bold mb-1">Instructions</label>
              <input type="text" id="rx-inst" class="w-full border rounded-lg p-2 dark:bg-semantic-surface dark:border-semantic-border" placeholder="e.g. Take after meals">
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Issue Prescription',
        preConfirm: () => {
          const name = document.getElementById('rx-name').value;
          const dose = document.getElementById('rx-dose').value;
          if(!name || !dose) {
            Swal.showValidationMessage('Name and Dosage are required');
            return false;
          }
          return {
            name, dose,
            freq: document.getElementById('rx-freq').value,
            dur: document.getElementById('rx-dur').value,
            inst: document.getElementById('rx-inst').value
          };
        }
      }).then(rxResult => {
        if(rxResult.isConfirmed) {
          savePrescription(recordId, rxResult.value);
        } else {
          fetchDoctorData(); // Refresh UI if cancelled Rx
        }
      });
    } else {
      fetchDoctorData(); // Refresh UI if chose "No"
    }
  });
}

function savePrescription(recordId, rxData) {
  const formData = new FormData();
  formData.append('action', 'add_prescription');
  formData.append('record_id', recordId);
  formData.append('medication_name', rxData.name);
  formData.append('dosage', rxData.dose);
  formData.append('frequency', rxData.freq);
  formData.append('duration', rxData.dur);
  formData.append('instructions', rxData.inst);

  fetch('../php/doctor_api.php', { method: 'POST', body: formData })
    .then(r => r.json())
    .then(res => {
      if(res.status === 'success') {
        Swal.fire('Done', 'Medical Record and Prescription saved successfully.', 'success')
          .then(() => fetchDoctorData());
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    });
}
