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

