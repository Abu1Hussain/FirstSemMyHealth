<?php
/*
 * ═══════════════════════════════════════════════════════════
 * AI Scheduler Endpoint
 * Returns smart availability data for a given date and
 * (optionally) a specific doctor.
 *
 * Connected to: appointments table, doctors table
 * Called by:    dashboard.js  (for "Today's Availability")
 *
 * Query parameters:
 *   ?date=2026-02-20          (optional, defaults to today)
 *   ?doctor_id=3              (optional, filter by doctor)
 * ═══════════════════════════════════════════════════════════
 */

session_start();
header('Content-Type: application/json');

require_once '../DataBase/db_connect.php';


/* ── Make sure the user is logged in ── */

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Please log in first.']);
    exit();
}


/* ── Read the query parameters ── */

$requestedDate = $_GET['date']      ?? date('Y-m-d');
$doctorId      = $_GET['doctor_id'] ?? null;


/* ─────────────────────────────────────────────────────
   Step 1: Get the doctor list (with today's booking count)
   ───────────────────────────────────────────────────── */

$doctors = [];

$doctorQuery = $conn->query(
    "SELECT doctor_id as id,
            CONCAT(first_name, ' ', last_name) as name,
            specialization, capacity, profile_image
     FROM doctors
     ORDER BY first_name"
);

if ($doctorQuery) {
    while ($doctor = $doctorQuery->fetch_assoc()) {
        // Count how many appointments this doctor has on the requested date
        $countQuery = $conn->query(
            "SELECT COUNT(*) as booked FROM appointments
             WHERE doctor_id = '{$doctor['id']}'
             AND DATE(appointment_date) = '$requestedDate'"
        );
        $bookedCount = $countQuery ? $countQuery->fetch_assoc()['booked'] : 0;

        $doctor['image_url']        = '../image/' . $doctor['profile_image'];
        $doctor['booked_today']     = $bookedCount;
        $doctor['available_chairs'] = max(0, $doctor['capacity'] - $bookedCount);
        $doctor['is_full']          = ($bookedCount >= $doctor['capacity']);
        $doctors[] = $doctor;
    }
}


/* ─────────────────────────────────────────────────────
   Step 2: Build hourly timeline
   Shows chair availability for each hour of the day.
   If a doctor is selected, show that doctor's slots.
   Otherwise show the combined clinic availability.
   ───────────────────────────────────────────────────── */

$timeline  = [];
$startHour = 9;    // Clinic opens at 9 AM
$endHour   = 17;   // Clinic closes at 5 PM

for ($hour = $startHour; $hour < $endHour; $hour++) {
    $slotStart = $requestedDate . ' ' . str_pad($hour, 2, '0', STR_PAD_LEFT) . ':00:00';
    $slotEnd   = $requestedDate . ' ' . str_pad($hour + 1, 2, '0', STR_PAD_LEFT) . ':00:00';

    // Build the count query
    $countSql = "SELECT COUNT(*) as booked FROM appointments
                 WHERE appointment_date >= '$slotStart' AND appointment_date < '$slotEnd'";

    if ($doctorId) {
        $countSql .= " AND doctor_id = '$doctorId'";
    }

    $result      = $conn->query($countSql);
    $bookedCount = $result ? $result->fetch_assoc()['booked'] : 0;

    // Determine max chairs for this slot
    $maxChairs = 4; // Default clinic-wide capacity (logical max per hour)
    if ($doctorId) {
        // Use the specific doctor's capacity
        $capQuery = $conn->query("SELECT capacity FROM doctors WHERE doctor_id = '$doctorId'");
        if ($capQuery && $capRow = $capQuery->fetch_assoc()) {
            $maxChairs = $capRow['capacity'];
        }
    }

    $availableChairs = max(0, $maxChairs - $bookedCount);

    // Determine status label
    $slotStatus = 'Available';
    if ($availableChairs === 0) {
        $slotStatus = 'Full';
    } elseif ($availableChairs < ($maxChairs * 0.3)) {
        $slotStatus = 'Almost Full';
    }

    $timeline[] = [
        'hour'         => date('h:00 A', strtotime($slotStart)) . ' - ' . date('h:00 A', strtotime($slotEnd)),
        'time_24h'     => str_pad($hour, 2, '0', STR_PAD_LEFT) . ':00:00',
        'chairs_left'  => $availableChairs,
        'total_chairs' => $maxChairs,
        'status'       => $slotStatus,
        'booked'       => $bookedCount
    ];
}


/* ─────────────────────────────────────────────────────
   Step 3: Summary statistics
   ───────────────────────────────────────────────────── */

$totalAppointmentsToday = 0;
$totalAvailableChairs   = 0;

foreach ($timeline as $slot) {
    $totalAppointmentsToday += $slot['booked'];
    $totalAvailableChairs   += $slot['chairs_left'];
}

$summary = [
    'date'                   => $requestedDate,
    'total_appointments'     => $totalAppointmentsToday,
    'total_available_chairs' => $totalAvailableChairs,
    'clinic_hours'           => $startHour . ':00 AM - ' . ($endHour > 12 ? ($endHour - 12) : $endHour) . ':00 PM',
    'doctors_count'          => count($doctors)
];


/* ─────────────────────────────────────────────────────
   Step 4: Send response back
   ───────────────────────────────────────────────────── */

echo json_encode([
    'status'   => 'success',
    'summary'  => $summary,
    'timeline' => $timeline,
    'doctors'  => $doctors
]);
?>
