document.addEventListener("DOMContentLoaded", function() {
  function generateDates() {
    const grid = document.getElementById("date-grid");
    if (!grid) return;
    grid.innerHTML = "";
    const today = new Date();
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    for (let i = 0; i < 7; i++) {
      let d = new Date(today);
      d.setDate(today.getDate() + i);
      let dayName = i === 0 ? "Today" : days[d.getDay()];
      let dateNum = d.getDate();
      let monthName = months[d.getMonth()];
      let fullDate = d.toISOString().split("T")[0];
      
      let btn = document.createElement("button");
      btn.type = "button";
      btn.className = "date-square-btn flex flex-col items-center justify-center py-3 rounded-xl border border-semantic-border dark:border-semantic-border hover:border-semantic-accent bg-semantic-bg dark:bg-semantic-surface transition-all cursor-pointer";
      btn.dataset.date = fullDate;
      
      btn.innerHTML = `
        <span class="text-[10px] font-bold text-semantic-text uppercase tracking-wider">${dayName}</span>
        <span class="text-lg font-black text-semantic-text dark:text-semantic-text my-1">${dateNum}</span>
        <span class="text-[10px] font-bold text-semantic-text opacity-70">${monthName}</span>
      `;
      
      btn.onclick = function() {
        document.querySelectorAll(".date-square-btn").forEach(b => {
          b.classList.remove("border-semantic-accent", "bg-semantic-surface", "dark:bg-semantic-brand/20");
          b.classList.add("border-semantic-border", "dark:border-semantic-border", "bg-semantic-bg", "dark:bg-semantic-surface");
        });
        this.classList.remove("border-semantic-border", "dark:border-semantic-border", "bg-semantic-bg", "dark:bg-semantic-surface");
        this.classList.add("border-semantic-accent", "bg-semantic-surface", "dark:bg-semantic-brand/20");
        
        let dateInput = document.getElementById("appointment-date");
        if (dateInput) {
          dateInput.value = this.dataset.date;
          dateInput.dispatchEvent(new Event('change'));
        }
      };
      
      grid.appendChild(btn);
    }
  }
  
  generateDates();

  const dateInput = document.getElementById("appointment-date");
  if (dateInput) {
    dateInput.addEventListener("change", function(e) {
      const date = e.target.value;
      if(!date) return;
      fetch("../Ai/ai_scheduler.php?date=" + date)
       .then(res => res.json())
       .then(data => {
         if(data.doctors) {
           allDoctors = data.doctors;
           
           // Capacity Exhaustion Visual Effect for Date Grid
           // Mark date as "Sold Out" if all doctors are full
           let allFull = data.doctors.length> 0 && data.doctors.every(d => d.is_full);
           let activeBtn = document.querySelector(`.date-square-btn[data-date='${date}']`);
           if (allFull && activeBtn) {
             activeBtn.classList.add("opacity-50", "pointer-events-none", "grayscale");
             activeBtn.innerHTML += `<div class="absolute bg-red-600 text-white text-[8px] font-bold px-1 py-0.5 rounded uppercase mt-8 transform rotate-12">Full</div>`;
           }

           renderDoctorsGrid();
           // Check if currently selected doctor is now full
           let selectedId = document.getElementById("selected-doctor-id").value;
           if(selectedId) {
             let doc = allDoctors.find(d => d.id == selectedId);
             if(doc && doc.is_full) {
               document.getElementById("selected-doctor-id").value = "";
               document.getElementById("selected-doctor-display").classList.add("hidden");
               document.getElementById("selected-doctor-display").classList.remove("flex");
               if(typeof Swal !== 'undefined') Swal.fire({toast:true, position:'top-end', icon:'warning', title:'Selected doctor is fully booked on this date.', showConfirmButton:false, timer:3000});
             }
           }
         }
         
         // Auto-load slots
         let selectedId = document.getElementById("selected-doctor-id").value;
         loadBookingSlots(date, selectedId);
       });
    });
  }
});

/**
 * Updates the circular countdown timers in the activity container.
 */
function updateActivityTimers() {
  const timers = document.querySelectorAll(".countdown-wrapper.timer-active[data-target]");
  if (timers.length === 0) {
    if (activityTimerInterval) {
      clearInterval(activityTimerInterval);
      activityTimerInterval = null;
    }
    return;
  }

  const now = new Date().getTime();
  
  timers.forEach(timer => {
    const targetStr = timer.getAttribute("data-target");
    const normalizedTarget = targetStr.replace(/-/g, "/");
    const targetTime = new Date(normalizedTarget).getTime();
    const diffMs = targetTime - now;
    
    if (diffMs <= 0) {
      timer.classList.remove("timer-active");
      timer.innerHTML = `
        <div class="flex flex-col items-center justify-center bg-semantic-accent dark:bg-semantic-accent/20 px-4 py-2 rounded-xl border border-green-100 dark:border-green-800">
          <span class="text-semantic-accent dark:text-[var(--color-ink-navy)] font-black text-lg">✔</span>
          <span class="text-[8px] font-bold text-semantic-accent uppercase">Ready</span>
        </div>
      `;
      setTimeout(fetchDashboardData, 3000);
      return;
    }

    const secsTotal = Math.floor(diffMs / 1000);
    const h = Math.floor(secsTotal / 3600);
    const m = Math.floor((secsTotal % 3600) / 60);
    const s = secsTotal % 60;

    const pad = (n) => n.toString().padStart(2, '0');
    const hStr = pad(h);
    const mStr = pad(m);
    const sStr = pad(s);

    // Update cards
    const boxes = timer.querySelectorAll(".time-box");
    if (boxes.length === 3) {
      const updateCards = (box, val) => {
        const cards = box.querySelectorAll(".digit-card");
        if (cards.length === 2) {
          cards[0].textContent = val[0];
          cards[1].textContent = val[1];
        }
      };
      updateCards(boxes[0], hStr);
      updateCards(boxes[1], mStr);
      updateCards(boxes[2], sStr);
    }
  });
}



/* ---------------------------------------------
   Active Ticket Carousel Helpers
   --------------------------------------------- */
function renderActiveTicket(index) {
  if (!activeTickets[index]) return;
  const t = activeTickets[index];
  
  document.querySelectorAll(".active-ticket-number").forEach(el => el.textContent = t.ticket_code || "#--");
  document.querySelectorAll(".active-ticket-date").forEach(el => el.textContent = t.date || "--");
  document.querySelectorAll(".active-ticket-time").forEach(el => el.textContent = t.wait_time ? "~" + t.wait_time + " min wait" : "--");
  document.querySelectorAll(".active-ticket-doctor").forEach(el => el.textContent = t.doctor || "General Practitioner");
  
  document.querySelectorAll(".active-ticket-priority").forEach(el => {
    let prio = t.priority || "Standard";
    el.textContent = prio;
    el.className = "active-ticket-priority inline-block mt-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full";
    if (prio === "Urgent" || prio === "Emergency") {
      el.classList.add("bg-red-100", "text-red-700", "dark:bg-red-900/40", "dark:text-red-400");
    } else if (prio === "Priority") {
      el.classList.add("bg-orange-100", "text-orange-700", "dark:bg-orange-900/40", "dark:text-orange-400");
    } else {
      el.classList.add("bg-semantic-accent text-[var(--color-ink-navy)]", "text-[var(--color-ink-navy)]", "dark:bg-semantic-accent/40", "dark:text-[var(--color-ink-navy)]");
    }
  });
}

function renderCarouselDots() {
  const dotsContainers = document.querySelectorAll(".ticket-carousel-dots");
  const prevBtns = document.querySelectorAll(".ticket-prev-btn");
  const nextBtns = document.querySelectorAll(".ticket-next-btn");
  
  if (activeTickets.length <= 1) {
    dotsContainers.forEach(c => c.innerHTML = "");
    prevBtns.forEach(btn => btn.classList.add("hidden"));
    nextBtns.forEach(btn => btn.classList.add("hidden"));
    return;
  }
  
  prevBtns.forEach(btn => btn.classList.remove("hidden"));
  nextBtns.forEach(btn => btn.classList.remove("hidden"));
  
  const dotsHtml = activeTickets.map((_, i) =>
    `<span class="inline-block w-2 h-2 rounded-full transition-all duration-300 ${i === activeTicketIndex ? 'bg-semantic-cta scale-125' : 'bg-semantic-cta dark:bg-semantic-surface'}"></span>`
  ).join("");
  
  dotsContainers.forEach(c => c.innerHTML = dotsHtml);
}

function resetCarouselTimer() {
  if (ticketCarouselInterval) clearInterval(ticketCarouselInterval);
  if (activeTickets.length> 1) {
    ticketCarouselInterval = setInterval(() => {
      if (typeof window.nextActiveTicket === "function") {
        window.nextActiveTicket();
      }
    }, 5000);
  }
}

window.prevActiveTicket = function() {
  if (activeTickets.length <= 1) return;
  activeTicketIndex = (activeTicketIndex - 1 + activeTickets.length) % activeTickets.length;
  updateActiveTicketDOM();
  resetCarouselTimer();
};

window.nextActiveTicket = function() {
  if (activeTickets.length <= 1) return;
  activeTicketIndex = (activeTicketIndex + 1) % activeTickets.length;
  updateActiveTicketDOM();
  resetCarouselTimer();
};

function updateActiveTicketDOM() {
  const slideAreas = document.querySelectorAll(".ticket-slide-area");
  slideAreas.forEach(area => area.style.opacity = "0");
  setTimeout(() => {
    renderActiveTicket(activeTicketIndex);
    renderCarouselDots();
    slideAreas.forEach(area => area.style.opacity = "1");
  }, 300);
}

// Swipe Support for Ticket Container
document.addEventListener("DOMContentLoaded", () => {
  const ticketContainers = document.querySelectorAll(".active-ticket-container");
  ticketContainers.forEach(container => {
    let touchstartX = 0;
    let touchendX = 0;
    container.addEventListener('touchstart', e => {
      touchstartX = e.changedTouches[0].screenX;
    }, { passive: true });
    container.addEventListener('touchend', e => {
      touchendX = e.changedTouches[0].screenX;
      if (touchendX < touchstartX - 30) {
        window.nextActiveTicket();
      } else if (touchendX> touchstartX + 30) {
        window.prevActiveTicket();
      }
    }, { passive: true });
  });
});

window.cancelActiveTicket = function() {
  if (!activeTickets[activeTicketIndex]) return;
  const t = activeTickets[activeTicketIndex];
  
  // Detect current theme
  const isDark = document.documentElement.classList.contains('dark');
  const popupBg = isDark ? '#1f2937' : '#ffffff';
  const textColor = isDark ? '#f9fafb' : '#111827';
  const backdrop = isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.45)';

  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: 'Cancel Appointment?',
      text: `Are you sure you want to cancel your appointment with ${t.doctor}? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, cancel it!',
      background: popupBg,
      color: textColor,
      backdrop: backdrop,
      customClass: { popup: 'rounded-2xl' }
    }).then((result) => {
      if (result.isConfirmed) {
        const formData = new FormData();
        formData.append('terminate_appointment', '1');
        formData.append('appointment_id', t.appointment_id);
        
        fetch('../php/appointment_handler.php', {
          method: 'POST',
          body: formData
        })
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') {
            Swal.fire({
              title: 'Cancelled!',
              text: 'Your appointment has been successfully cancelled.',
              icon: 'success',
              background: popupBg,
              color: textColor,
              backdrop: backdrop,
              customClass: { popup: 'rounded-2xl' }
            });
            if (activeTickets.length === 1) {
              document.querySelectorAll(".active-ticket-container").forEach(c => c.classList.add("hidden"));
            }
            fetchDashboardData();
          } else {
            Swal.fire({ title: 'Error', text: data.message || 'Failed to cancel appointment.', icon: 'error', background: popupBg, color: textColor, backdrop: backdrop });
          }
        })
        .catch(err => {
          console.error("Cancellation Error:", err);
          Swal.fire({ title: 'Error', text: 'An unexpected error occurred.', icon: 'error', background: popupBg, color: textColor, backdrop: backdrop });
        });
      }
    });
  }
};

window.openTicketDetailModal = function() {
  if (!activeTickets[activeTicketIndex]) return;
  const t = activeTickets[activeTicketIndex];
  const bookedAt = t.created_at ? new Date(t.created_at.replace(/-/g, "/")).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "N/A";

  // Detect current theme
  const isDark = document.documentElement.classList.contains('dark');

  // Theme-aware color tokens
  const theme = {
    popupBg:    isDark ? '#1f2937' : '#ffffff',
    popupBorder:  isDark ? '#374151' : '#e5e7eb',
    textPrimary:  isDark ? '#f9fafb' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    textMuted:   isDark ? '#d1d5db' : '#374151',
    divider:    isDark ? '#374151' : '#e5e7eb',
    timestampBg:  isDark ? '#111827' : '#f3f4f6',
    btnBg:     isDark ? '#4338ca' : '#4f46e5',
    btnHoverBg:  isDark ? '#4f46e5' : '#4338ca',
    backdrop:   isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.45)',
  };

  let prioName = t.priority || "Standard";
  let prioColor = theme.textPrimary;
  if (prioName === "Urgent" || prioName === "Emergency") prioColor = "#ef4444";
  else if (prioName === "Priority") prioColor = "#f97316";
  else prioColor = "#22c55e";

  // Demographic icon
  const demo = getDemographicIcon(t.date_of_birth || null, t.gender || 'Other');
  const demoColor = isDark ? demo.colorDark : demo.colorLight;

  // Calculate display age
  let displayAge = '';
  if (t.date_of_birth) {
    const dob = new Date(t.date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const md = today.getMonth() - dob.getMonth();
    if (md < 0 || (md === 0 && today.getDate() < dob.getDate())) age--;
    displayAge = age + ' yrs';
  }

  Swal.fire({
    title: '',
    html: `
      <div style="text-align:left; font-family:'Inter',sans-serif; padding:10px;">
        <div style="text-align:center; margin-bottom:24px;">
          <span style="font-size:4rem; font-weight:900; background:linear-gradient(135deg,#4f46e5,#818cf8); -webkit-background-clip:text; -webkit-text-fill-color:transparent; line-height:1;">${t.ticket_code || '#--'}</span>
          <p style="font-size:13px; color:${theme.textSecondary}; text-transform:uppercase; letter-spacing:3px; margin-top:8px; font-weight:600;">Active Ticket ID</p>
        </div>
        <hr style="border-color:${theme.divider}; margin:20px 0;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px;">
          <div>
            <p style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:${theme.textSecondary}; margin-bottom:4px; font-weight:600;">Patient Name</p>
            <div style="display:flex; align-items:center; gap:10px;">
              <i class="${demo.icon}" style="font-size:24px; color:${demoColor};"></i>
              <p style="font-size:18px; font-weight:700; color:${theme.textPrimary}; margin:0;">${t.patient_name || 'N/A'}</p>
            </div>
          </div>
          <div>
            <p style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:${theme.textSecondary}; margin-bottom:4px; font-weight:600;">Demographic</p>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:10px; background:${demoColor}15; border:1px solid ${demoColor}30;">
                <i class="${demo.icon}" style="font-size:14px; color:${demoColor};"></i>
              </span>
              <div>
                <p style="font-size:14px; font-weight:700; color:${theme.textPrimary}; margin:0;">${demo.label}</p>
                <p style="font-size:11px; color:${theme.textSecondary}; margin:0;">${(t.gender || 'N/A')}${displayAge ? ' · ' + displayAge : ''}</p>
              </div>
            </div>
          </div>
          <div>
            <p style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:${theme.textSecondary}; margin-bottom:4px; font-weight:600;">CPR (ID)</p>
            <p style="font-size:18px; font-weight:700; font-family:monospace; color:${theme.textPrimary};">${t.cpr || 'N/A'}</p>
          </div>
          <div>
            <p style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:${theme.textSecondary}; margin-bottom:4px; font-weight:600;">Priority Level</p>
            <p style="font-size:18px; font-weight:800; color:${prioColor};">${prioName}</p>
          </div>
          <div>
            <p style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:${theme.textSecondary}; margin-bottom:4px; font-weight:600;">Blood Type</p>
            <p style="font-size:18px; font-weight:800; color:#ef4444;">${t.blood_type || 'N/A'}</p>
          </div>
          <div>
            <p style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:${theme.textSecondary}; margin-bottom:4px; font-weight:600;">Doctor</p>
            <p style="font-size:18px; font-weight:700; color:${theme.textPrimary};">${t.doctor || 'General Practitioner'}</p>
          </div>
          <div style="grid-column: span 2; background:${theme.timestampBg}; padding:16px; border-radius:12px;">
            <p style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:${theme.textSecondary}; margin-bottom:4px; font-weight:600;">Booking Timestamp</p>
            <p style="font-size:16px; font-weight:600; color:${theme.textMuted};">${bookedAt}</p>
          </div>
        </div>
      </div>
    `,
    showConfirmButton: true,
    confirmButtonText: 'Close Window',
    confirmButtonColor: theme.btnBg,
    width: 580,
    background: theme.popupBg,
    color: theme.textPrimary,
    backdrop: theme.backdrop,
    customClass: { popup: 'rounded-3xl shadow-2xl' }
  });
};

/* ---------------------------------------------
   loadAvailabilityTimeline(doctorId)
   Calls the AI Scheduler to get today's hourly
   chair availability and renders the timeline.
   Connected to: 📊 Today's Availability
   --------------------------------------------- */
function loadAvailabilityTimeline(doctorId = "") {
 var today = new Date().toISOString().split("T")[0];
 var url = "../Ai/ai_scheduler.php?date=" + today;

 if (doctorId) {
  url += "&doctor_id=" + doctorId;
 }

 fetch(url)
  .then(function (response) {
   return response.json();
  })
  .then(function (data) {
   if (data.status !== "success") return;

   var timelineContainer = document.getElementById("daily-timeline");
   if (!timelineContainer) return;

   timelineContainer.innerHTML = "";
   var timelineHtml = "";

   let now = new Date();
   let currentHour = now.getHours();

   data.timeline.forEach(function (slot) {
    // Time validation for past slots
    let slotHour = parseInt(slot.time_24h.split(':')[0]);
    let mappedSlotHour = slotHour === 0 ? 24 : slotHour;
    let mappedCurrentHour = currentHour === 0 ? 24 : currentHour;
    
    if (mappedSlotHour < mappedCurrentHour) return;

    // Slot chairs are determined by ai_scheduler now (4 per active GP), we can use the server's response.
    // We do not override it here unless we have to.
    var isFull = slot.chairs_left <= 0;
    var badgeClass = isFull
     ? "badge-full"
     : slot.status === "Almost Full"
      ? "badge-limited"
      : "badge-available";
    var chairIcon = isFull ? "🚫" : "🪑";
    var clickableStyle = isFull
     ? "opacity: 0.6; cursor: not-allowed;"
     : "cursor: pointer;";
    var clickHandler = isFull
     ? `Swal.fire('Slot Full', 'Please choose another time.', 'info')`
     : `overrideTodayManualSelection('${slot.time_24h}', '${slot.hour}', this)`;

    timelineHtml += `
      <div class="timeline-hour flex flex-col items-center justify-center min-w-[120px] p-4 border border-semantic-border dark:border-semantic-border bg-semantic-bg dark:bg-semantic-surface rounded-2xl shadow-sm hover:border-semantic-accent transition-all ${isFull ? "opacity-60 grayscale" : ""} relative" 
         style="${clickableStyle}" onclick="${clickHandler}">
        <div class="text-xs font-bold text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80 mb-2 ${isFull ? 'line-through' : ''}">${slot.hour}</div>
        <div class="badge ${badgeClass} text-[10px] w-full flex justify-center py-1">
          <span class="mr-1">${chairIcon}</span>
          <span>${slot.chairs_left} Left</span>
        </div>
        ${isFull ? '<div class="absolute top-1 right-1 bg-red-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">FULL</div>' : ''}
      </div>`;
   });

   timelineContainer.innerHTML = timelineHtml;
  })
  .catch(function (error) {
   console.error("Error loading availability:", error);
  });
}

/* -- Filter Availability by Doctor -- */
var doctorFilter = document.getElementById("availability-doctor-filter");
if (doctorFilter) {
 doctorFilter.addEventListener("change", function () {
  loadAvailabilityTimeline(this.value);
 });
}

 /* ---------------------------------------------
   Doctor Profile Modal
   Shows doctor details and lets users book.
   --------------------------------------------- */
window.closeDoctorModal = function () {
 document.getElementById("doctor-modal").classList.add("hidden");
};

function openDoctorModal(doctor) {
 selectedDoctor = doctor;

 document.getElementById("modal-doc-img").src = doctor.image_url;
 document.getElementById("modal-doc-name").textContent = doctor.name;
 document.getElementById("modal-doc-spec").textContent = doctor.specialization;
 document.getElementById("modal-doc-bio").textContent =
  doctor.bio || "No biography available.";
 document.getElementById("modal-doc-capacity").textContent = doctor.capacity;

 const modal = document.getElementById("doctor-modal");
 modal.classList.remove("hidden");
 if (typeof AOS !== "undefined") AOS.refreshHard();
}

/* -- "Book Appointment" inside modal -- */
document.getElementById("btn-book-doc").onclick = function () {
 if (!selectedDoctor) return;

 // Fill the hidden input with the doctor's ID
 document.getElementById("selected-doctor-id").value = selectedDoctor.id;

 // Show the selected-doctor display strip
 document.getElementById("display-doc-img").src = selectedDoctor.image_url;
 document.getElementById("display-doc-name").textContent = selectedDoctor.name;
 document.getElementById("selected-doctor-display").classList.remove("hidden");
 document.getElementById("selected-doctor-display").classList.add("flex");

 // Scroll down to the booking form
 document
  .getElementById("appointmentForm")
  .scrollIntoView({ behavior: "smooth" });

 // Close the modal
 window.closeDoctorModal();
};

/* -- "Change" doctor link -- */
document.getElementById("change-doc-btn").onclick = function () {
 document.getElementById("selected-doctor-id").value = "";
 document.getElementById("selected-doctor-display").classList.add("hidden");
 document.getElementById("selected-doctor-display").classList.remove("flex");
 selectedDoctor = null;
};

/* ---------------------------------------------
   Centralized Doctor Schedules
   Defines the working days (0=Sun, 1=Mon...6=Sat) and shifts for dynamic slot generation
   --------------------------------------------- */
window.doctorSchedules = {
  default: {
    workingDays: [1, 2, 3, 4, 5], // Monday - Friday
    shifts: [
      { start: "09:00", end: "17:00" } // Standard Clinic Hours
    ],
    groupLabel: "Standard Default"
  },
  // SHIFT 1 — Morning/Afternoon Group (doc1 to doc5)
  shift1: {
    workingDays: [1, 2, 3, 4, 5],
    shifts: [
      { start: "09:00", end: "17:00" }
    ],
    groupLabel: "Shift 1 (Daytime)"
  },
  // SHIFT 2 — Evening/Overnight Group (doc6 to doc10)
  shift2: {
    workingDays: [1, 2, 3, 4, 5],
    shifts: [
      { start: "17:00", end: "01:00" }
    ],
    groupLabel: "Shift 2 (Overnight)"
  }
};

/* ---------------------------------------------
   loadBookingSlots(date, doctorId)
   Generates interactive time slots dynamically based on the doctor's specific centralized schedule.
   --------------------------------------------- */
function loadBookingSlots(date, doctorId) {
  var section = document.getElementById("time-slot-section");
  var container = document.getElementById("time-slots-container");
  
  if (!section || !container) return;
  
  // Purge the container to prevent any stale shifts from persisting
  container.innerHTML = "";
  
  section.style.display = "block";
  section.classList.remove("hidden");
  document.getElementById("btn-confirm-book").style.display = "none";
  document.getElementById("btn-confirm-book").classList.add("hidden");
  document.getElementById("selected-time-slot").value = "";

  if (!date) return;

  let targetDate = new Date(date);
  if (isNaN(targetDate.getTime())) return;
  
  let dayOfWeek = targetDate.getDay(); // 0-6
  
  // Determine the Doctor's Shift Group based on ID ranges
  let schedule = window.doctorSchedules.default;
  let docNumMatch = doctorId ? doctorId.toString().match(/\d+/) : null;
  if (docNumMatch) {
    let docNum = parseInt(docNumMatch[0], 10);
    if (docNum>= 1 && docNum <= 5) {
      schedule = window.doctorSchedules.shift1;
    } else if (docNum>= 6 && docNum <= 10) {
      schedule = window.doctorSchedules.shift2;
    }
  }

  if (!schedule.workingDays.includes(dayOfWeek)) {
    container.innerHTML = '<p class="text-sm text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80 py-4 col-span-full">No available working hours for this date.</p>';
    return;
  }

  let todayStr = new Date().toISOString().split("T")[0];
  let isToday = (date === todayStr);
  let now = new Date();
  let currentHour = now.getHours();
  let currentMinute = now.getMinutes();

  let slots = [];
  let shiftRangeDisplays = [];

  // Helper to format HH and MM to "hh:mm A"
  function formatTimeAMPM(h, m) {
    let ampm = h>= 12 ? "PM" : "AM";
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return h12.toString().padStart(2, "0") + ":" + m.toString().padStart(2, "0") + " " + ampm;
  }

  schedule.shifts.forEach(shift => {
    shiftRangeDisplays.push(`${shift.start} to ${shift.end}`);
    let [startH, startM] = shift.start.split(":").map(Number);
    let [endH, endM] = shift.end.split(":").map(Number);
    
    let startTotalMins = startH * 60 + startM;
    let endTotalMins = endH * 60 + endM;
    
    // Handle Overnight Cross-over Logic
    if (endTotalMins <= startTotalMins) {
      endTotalMins += 24 * 60; // Add 1440 mins to span securely past midnight
    }

    let slotDuration = 30; // 30 min intervals

    for (let m = startTotalMins; m < endTotalMins; m += slotDuration) {
      let actualM = m % (24 * 60); // Modulo wraps it securely within a 24-hour cycle
      let slotH = Math.floor(actualM / 60);
      let slotM = actualM % 60;
      
      // Filter past slots if the selected date is today
      if (isToday) {
        let currentTotalMins = currentHour * 60 + currentMinute;
        if (m < currentTotalMins) {
          continue; // Skip past times securely without failing on tomorrow's early morning hours
        }
      }

      let nextTotalMins = (m + slotDuration);
      let nextActualM = nextTotalMins % (24 * 60);
      let nextH = Math.floor(nextActualM / 60);
      let nextM = nextActualM % 60;

      let slotStr24 = slotH.toString().padStart(2, "0") + ":" + slotM.toString().padStart(2, "0");
      let label = formatTimeAMPM(slotH, slotM) + " - " + formatTimeAMPM(nextH, nextM);

      slots.push({
        label: label,
        timeDB: slotStr24 + ":00" // Formatted for the database backend
      });
    }
  });

  // Output Debug Logs exactly as requested
  console.log("Selected Provider:", doctorId || "None");
  console.log("Assigned Shift Group:", schedule.groupLabel);
  console.log("Generated Time Range:", shiftRangeDisplays.join(" | "));

  if (slots.length === 0) {
    container.innerHTML = '<p class="text-sm text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80 py-4 col-span-full">No available working hours for this date.</p>';
    return;
  }

  slots.forEach(slot => {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-slot px-4 py-3 border border-semantic-border dark:border-semantic-border bg-semantic-bg dark:bg-semantic-surface text-semantic-text dark:text-semantic-text rounded-xl cursor-pointer font-medium text-sm transition-all hover:border-semantic-accent dark:hover:border-semantic-accent";
    btn.textContent = slot.label;

    btn.onclick = function () {
      // Deselect others
      document.querySelectorAll(".btn-slot").forEach((b) => {
    b.classList.remove("slot-selected", "border-semantic-accent", "bg-semantic-surface", "dark:border-semantic-accent", "dark:bg-semantic-brand/30", "text-semantic-cta dark:text-semantic-text", "");
      });
      // Select this
   btn.classList.add("slot-selected", "border-semantic-accent", "bg-semantic-surface", "dark:border-semantic-accent", "dark:bg-semantic-brand/30", "text-semantic-cta dark:text-semantic-accent", "");

      document.getElementById("selected-time-slot").value = slot.timeDB;
      document.getElementById("btn-confirm-book").style.display = "block";
      document.getElementById("btn-confirm-book").classList.remove("hidden");
    };

    container.appendChild(btn);
  });

  // Scroll smoothly to time slots
  section.scrollIntoView({ behavior: "smooth" });
}

/* ---------------------------------------------
   confirmBooking()
   Final step: submit everything
   --------------------------------------------- */
function confirmBooking() {
 var appointmentDate = document.getElementById("appointment-date").value;
 var doctorIdInput = document.getElementById("selected-doctor-id").value;
 var selectedTime = document.getElementById("selected-time-slot").value;
 var fileInput = document.getElementById("document");

 if (!selectedTime) {
  if (typeof Swal !== 'undefined') { Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Please select a time slot', showConfirmButton: false, timer: 2500 }); } else { alert("Please select a time slot."); }
  return;
 }

 bookAppointment(
  "", // reasonText removed
  appointmentDate,
  doctorIdInput,
  fileInput,
  selectedTime,
 );
}

/* -- AI Display Logic removed per refactor -- */

/* ---------------------------------------------
   bookAppointment()
   Sends the booking form to the server and
   shows success / error feedback.
   --------------------------------------------- */
function bookAppointment(
 reasonText,
 appointmentDate,
 doctorIdInput,
 fileInput,
 selectedTime,
) {
 var formData = new FormData();
 formData.append("book_appointment", "1");
 formData.append("reason", reasonText);
 formData.append("date", appointmentDate);

 if (selectedTime) {
  formData.append("selected_time", selectedTime);
 }

 if (doctorIdInput) {
  formData.append("doctor_id", doctorIdInput);
 }

 if (fileInput && fileInput.files && fileInput.files.length> 0) {
  formData.append("document", fileInput.files[0]);
 }

 fetch("../php/appointment_handler.php", {
  method: "POST",
  body: formData,
 })
  .then(function (response) {
   return response.json();
  })
  .then(function (result) {
   var messageDiv = document.getElementById("appt-message");
   var btnConfirm = document.getElementById("btn-confirm-book");
   var btnAnalyze = document.getElementById("btn-analyze");

   if (messageDiv) messageDiv.style.display = "block";
   if (btnConfirm) btnConfirm.style.display = "none"; // Hide confirm button

   // Reset Analyze Button
   if (btnAnalyze) {
    btnAnalyze.disabled = false;
    btnAnalyze.textContent = "🔍 Analyze Symptoms & Find Time";
    btnAnalyze.classList.remove("opacity-50", "cursor-not-allowed");
   }

    if (result.status === "success") {
     Swal.fire({
       title: 'Booked!',
       text: result.message,
       icon: 'success',
       customClass: {
        popup: "bg-semantic-bg dark:bg-semantic-surface rounded-2xl shadow-xl border border-semantic-border dark:border-semantic-border",
        title: "dark:text-semantic-text",
        confirmButton: "bg-semantic-cta hover:bg-semantic-ctaHover text-white font-bold flex items-center gap-2 px-6 py-2.5 rounded-xl border border-semantic-accent hover:border-semantic-accent shadow-blue-500/30"
       },
       buttonsStyling: false
     });

     // Reset the form and refresh data
     document.getElementById("appointmentForm").reset();
     const aiPanel = document.getElementById("ai-result-panel");
     if (aiPanel) aiPanel.classList.add("hidden");
     
     const selDocDisplay = document.getElementById("selected-doctor-display");
     if (selDocDisplay) {
      selDocDisplay.classList.add("hidden");
      selDocDisplay.classList.remove("flex");
     }
     
     const timeSlotSection = document.getElementById("time-slot-section");
     if (timeSlotSection) {
      timeSlotSection.classList.add("hidden");
     }

     fetchDashboardData();
     loadAvailabilityTimeline();
    } else {
     Swal.fire({
       title: 'Error',
       text: result.message,
       icon: 'error',
       customClass: {
        popup: "bg-semantic-bg dark:bg-semantic-surface rounded-2xl shadow-xl border border-semantic-border dark:border-semantic-border",
        title: "dark:text-semantic-text",
        confirmButton: "bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-2 px-6 py-2.5 rounded-xl border border-red-500"
       },
       buttonsStyling: false
     });
    }
  })
  .catch(function (error) {
   console.error("Booking error:", error);
   var btnAnalyze = document.getElementById("btn-analyze");
   if (btnAnalyze) {
    btnAnalyze.disabled = false;
    btnAnalyze.textContent = "🔍 Analyze Symptoms & Find Time";
    btnAnalyze.classList.remove("opacity-50", "cursor-not-allowed");
   }
   Swal.fire({
    title: 'Error',
    text: 'Submission failed. Please try again.',
    icon: 'error',
    customClass: {
     popup: "bg-semantic-bg dark:bg-semantic-surface rounded-2xl shadow-xl border border-semantic-border dark:border-semantic-border",
     title: "dark:text-semantic-text",
     confirmButton: "bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-2 px-6 py-2.5 rounded-xl border border-red-500"
    },
    buttonsStyling: false
   });
  });
}


 /* -- 5. Terminate (Cancel) Appointment -- */
 window.terminateAppointment = function (apptId) {
  Swal.fire({
    title: 'Cancel Appointment?',
    text: "Are you sure you want to cancel this appointment/ticket?",
    icon: 'warning',
    customClass: {
     popup: "bg-semantic-bg dark:bg-semantic-surface rounded-2xl shadow-xl border border-semantic-border dark:border-semantic-border",
     title: "dark:text-semantic-text",
     confirmButton: "bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-2 px-6 py-2.5 rounded-xl border border-red-500 w-full mb-2",
     cancelButton: "bg-semantic-surface hover:bg-semantic-surface dark:bg-semantic-surface dark:hover:bg-semantic-surface dark:text-semantic-text text-semantic-text font-bold px-6 py-2.5 rounded-xl transition-colors w-full",
     actions: "flex flex-col w-full px-4"
    },
    buttonsStyling: false,
    showCancelButton: true,
    confirmButtonText: 'Yes, cancel it'
  }).then((result) => {
    if (result.isConfirmed) {
      var formData = new FormData();
      formData.append("terminate_appointment", "1");
      formData.append("appointment_id", apptId);

      fetch("../php/appointment_handler.php", {
       method: "POST",
       body: formData,
      })
       .then((res) => res.json())
       .then((data) => {
        if (data.status === "success") {
         Swal.fire('Cancelled', "Your appointment has been cancelled.", 'success');
         fetchDashboardData(); // Refresh list
        } else {
         Swal.fire('Error', data.message, 'error');
        }
       })
       .catch((err) => {
        console.error("Termination error:", err);
        Swal.fire('Error', "Failed to process cancellation.", 'error');
       });
    }
  });
 };

/* -- 6. Select Time from Timeline -- */
window.overrideTodayManualSelection = function (time24h, hourStr, element) {
 if (element) {
  document.querySelectorAll(".timeline-hour").forEach(el => {
    el.classList.remove("border-semantic-accent", "ring-2", "ring-blue-100", "dark:ring-blue-900/40");
    el.style.borderColor = "";
  });
  element.classList.add("border-semantic-accent", "ring-2", "ring-blue-100", "dark:ring-blue-900/40");
  element.style.borderColor = "#2563eb";
 }

 var timeSlotField = document.getElementById("selected-time-slot");
 if (timeSlotField) timeSlotField.value = time24h;

 // Derive shift from the SELECTED TIME SLOT, not the wall clock
 let slotHour = parseInt(time24h.split(':')[0]);
 let slotShift = (slotHour>= 9 && slotHour < 17) ? 1 : 2;

 // Inter-Shift Transition Logic: Handover 16:50 - 17:00
 let now = new Date();
 if (now.getHours() === 16 && now.getMinutes()>= 50) {
   slotShift = 2;
 }

 let selectedShiftDocs = allDoctors.filter(d => {
   let docId = parseInt(d.id);
   let docShift = docId <= 5 ? 1 : 2;
   return docShift === slotShift;
 });
 
 let docsHtml = selectedShiftDocs.map(doc => {
   let gender = (doc.image_url && doc.image_url.includes('Female')) ? 'FEMALE' : 'MALE';
   return `
   <div onclick="confirmManualWalkin('${doc.id}', '${time24h}', '${hourStr}')" class="doc-select-card cursor-pointer flex items-center p-4 border border-semantic-border rounded-xl hover:border-semantic-accent hover:bg-semantic-surface transition-all bg-semantic-bg">
     <img src="${doc.image_url}" class="w-12 h-12 rounded-full object-cover mr-4 border-2 border-semantic-border" onerror="this.src='../image/default_user.png'">
     <div>
       <p class="doc-name font-bold text-semantic-text">${doc.name}</p>
    <p class="doc-gender text-xs font-semibold text-semantic-cta dark:text-semantic-text uppercase tracking-wider">${gender}</p>
       <p class="doc-spec text-xs text-semantic-text opacity-70">${doc.specialization}</p>
     </div>
   </div>`;
 }).join('');

 if(typeof Swal !== 'undefined') {
   Swal.fire({
     title: 'Select Doctor for ' + hourStr,
     html: `<div class="space-y-3 mt-4 text-left max-h-64 overflow-y-auto">${docsHtml}</div>`,
     showConfirmButton: false,
     showCancelButton: true,
     cancelButtonText: 'Cancel',
     customClass: {
       popup: 'swal2-popup',
       title: 'swal2-title',
       htmlContainer: 'swal2-html-container',
       cancelButton: 'swal2-cancel'
     }
   });
 }
};

window.confirmManualWalkin = function(doctorId, time24h, hourStr) {
  if(typeof Swal !== 'undefined') Swal.close();
  var formData = new FormData();
  formData.append("take_ticket", "1");
  formData.append("selected_time", time24h);
  formData.append("doctor_id", doctorId);

  fetch("../php/appointment_handler.php", {
   method: "POST",
   body: formData,
  })
   .then(res => res.json())
   .then(data => {
    if (data.status === "success") {
     if(typeof Swal !== 'undefined') Swal.fire({ title: 'Ticket Issued!', text: 'Your ticket #' + data.ticket_number + ' is ready.', icon: 'success', confirmButtonColor: '#3b82f6' });
     fetchDashboardData();
     loadAvailabilityTimeline();
    } else {
     if(typeof Swal !== 'undefined') Swal.fire('Error', data.message, 'error');
    }
   })
   .catch(error => {
    console.error("Error taking ticket:", error);
    if(typeof Swal !== 'undefined') Swal.fire('Error', "Failed to take a ticket. Please try again.", 'error');
   });
};

/* -- 7. Tab Switching Logic -- */
window.switchAppointmentTab = function(tab) {
  const todayContent = document.getElementById("appointments-today-content");
  const futureContent = document.getElementById("appointments-future-content");
  const todayBtn = document.getElementById("tab-btn-today");
  const futureBtn = document.getElementById("tab-btn-future");

  if (tab === 'today') {
    todayContent.classList.remove("hidden");
    futureContent.classList.add("hidden");
    
  todayBtn.classList.add("bg-semantic-bg", "dark:bg-semantic-surface", "shadow-sm", "text-semantic-cta dark:text-semantic-text", "");
    todayBtn.classList.remove("text-semantic-text opacity-70");
    
  futureBtn.classList.remove("bg-semantic-bg", "dark:bg-semantic-surface", "shadow-sm", "text-semantic-cta dark:text-semantic-text", "");
    futureBtn.classList.add("text-semantic-text opacity-70");
  } else {
    todayContent.classList.add("hidden");
    futureContent.classList.remove("hidden");
    
  futureBtn.classList.add("bg-semantic-bg", "dark:bg-semantic-surface", "shadow-sm", "text-semantic-cta dark:text-semantic-text", "");
    futureBtn.classList.remove("text-semantic-text opacity-70");
    
  todayBtn.classList.remove("bg-semantic-bg", "dark:bg-semantic-surface", "shadow-sm", "text-semantic-cta dark:text-semantic-text", "");
    todayBtn.classList.add("text-semantic-text opacity-70");
  }
  
  if (typeof AOS !== "undefined") AOS.refreshHard();
};

/* -- 8. Make Selected Doctor Name Clickable -- */
document.addEventListener("DOMContentLoaded", function() {
  const displayDocName = document.getElementById("display-doc-name");
  if (displayDocName) {
    displayDocName.addEventListener("click", function() {
      if (selectedDoctor) {
        openDoctorModal(selectedDoctor);
      }
    });
  }
});

/* -- 9. Render Billing (Receipt-Card Style) -- */
