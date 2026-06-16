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
        $doctor['available_chairs'] = max(0, 16 - $bookedCount); // 16 daily capacity
        $doctor['is_full']          = ($bookedCount >= 16);
        $doctors[] = $doctor;
    }
}

// Ensure the 2-shift roster guarantees at least 1 Male and 1 Female General Medicine doctor per shift
// Ensure the 2-shift roster guarantees exactly 5 doctors per shift (no overlap).
// First Shift Roster (Shift 1): Doctors 1 to 5. (09:00 to 13:00)
// Second Shift Roster (Shift 2): Doctors 6 to 10. (13:00 to 17:00)
foreach ($doctors as &$doc) {
    $did = (int)$doc['id'];
    $shiftNum = ($did <= 5) ? 1 : 2;
    $shiftName = ($shiftNum === 1) ? 'Morning Shift (09:00 - 13:00)' : 'Evening Shift (13:00 - 17:00)';
    
    // Determine active shift based on current time (with 10-min early access offset)
    $currentHour = (int)date('H');
    $currentMinute = (int)date('i');
    $activeShift = ($currentHour < 13) ? 1 : 2;
    if ($currentHour == 12 && $currentMinute >= 50) {
        $activeShift = 2;
    }
    
    $dutyStatus = "";
    if ($shiftNum === $activeShift) {
        $dutyStatus = "(On-Duty)";
    } else {
        $dutyStatus = ($shiftNum > $activeShift) ? "(Available Later)" : "(Off-Duty)";
    }
    
    // Assign explicit specialties
    if ($did === 1) {
        $doc['specialization'] = "General Medicine";
    } elseif ($did === 2) {
        $doc['specialization'] = "General Medicine";
    } elseif ($did === 3) {
        $doc['specialization'] = "Dentistry";
    } elseif ($did === 4) {
        $doc['specialization'] = "ENT Specialist";
    } elseif ($did === 5) {
        $doc['specialization'] = "Ophthalmology";
    } elseif ($did === 6) {
        $doc['specialization'] = "General Medicine";
    } elseif ($did === 7) {
        $doc['specialization'] = "General Medicine";
    } elseif ($did === 8) {
        $doc['specialization'] = "Dentistry";
    } elseif ($did === 9) {
        $doc['specialization'] = "ENT Specialist";
    } elseif ($did === 10) {
        $doc['specialization'] = "Ophthalmology";
    } else {
        $doc['specialization'] = $doc['specialization'];
    }
    
    $doc['shift'] = $shiftNum;
}
unset($doc);


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

    // Determine active doctors in this hour's shift
    $currentShift = ($hour < 13) ? 1 : 2;
    
    // STRICT 4-CHAIR LIMIT per time slot — no multiplication
    $maxChairs = 4;
    
    if ($doctorId) {
        $did = (int)$doctorId;
        $docShift = ($did <= 5) ? 1 : 2;
        if ($docShift !== $currentShift) {
            continue; // Skip rendering this slot entirely for the doctor's off-shift hours
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
