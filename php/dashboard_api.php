<?php
/*
 * ═══════════════════════════════════════════════════════════
 * Patient Dashboard API
 * ═══════════════════════════════════════════════════════════
 *
 * Returns all the data needed by the patient dashboard:
 *   - User info & initials (for the top-right avatar)
 *   - Health stats (upcoming appointments, prescription count)
 *   - Available doctors list (for booking)
 *   - Today's appointment timeline with chair availability
 *   - Patient's appointment history
 *
 * SECURITY: All queries use prepared statements to prevent
 *           SQL injection attacks.
 * ═══════════════════════════════════════════════════════════
 */

session_start();
header('Content-Type: application/json');

/* ── Connect to the database ── */
require_once '../DataBase/db_connect.php';

/* ── Make sure the user is logged in ── */
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Please log in first.']);
    exit();
}

$userId   = $_SESSION['user_id'];
$userRole = $_SESSION['user_role'];
$response = [];


/* ═══════════════════════════════
   USER INFO
   (Name, initial, and email for
   the dashboard header)
   ═══════════════════════════════ */

$userName = $_SESSION['user_name'] ?? 'User';

// Fetch the user's email from the users table
$userEmail = '';
$stmt = $conn->prepare("SELECT email FROM users WHERE user_id = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
$emailResult = $stmt->get_result();
if ($emailRow = $emailResult->fetch_assoc()) {
    $userEmail = $emailRow['email'];
}
$stmt->close();

$response['user'] = [
    'name'    => $userName,
    'initial' => strtoupper(substr($userName, 0, 1)),  // First letter of name
    'email'   => $userEmail
];


/* ═══════════════════════════════
   FIND THE PATIENT PROFILE
   (We need the patient_id to look
   up their appointments, etc.)
   ═══════════════════════════════ */

$patientId = null;
$stmt = $conn->prepare("SELECT patient_id FROM patients WHERE user_id = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
$patientResult = $stmt->get_result();
if ($patientRow = $patientResult->fetch_assoc()) {
    $patientId = $patientRow['patient_id'];
}
$stmt->close();


/* ═══════════════════════════════
   HEALTH STATS
   (Counts of upcoming appointments
   and active prescriptions)
   ═══════════════════════════════ */

$stats = [
    'health_status'  => 'Good',
    'upcoming'       => 0,
    'prescriptions'  => 0
];

if ($patientId) {
    // Count how many pending appointments this patient has
    $stmt = $conn->prepare(
        "SELECT COUNT(*) as total FROM appointments
         WHERE patient_id = ? AND status = 'pending'"
    );
    $stmt->bind_param("i", $patientId);
    $stmt->execute();
    if ($row = $stmt->get_result()->fetch_assoc()) {
        $stats['upcoming'] = $row['total'];
    }
    $stmt->close();

    // Count how many prescriptions this patient has
    $stmt = $conn->prepare(
        "SELECT COUNT(*) as total FROM prescriptions
         JOIN medical_records ON prescriptions.record_id = medical_records.record_id
         WHERE medical_records.patient_id = ?"
    );
    $stmt->bind_param("i", $patientId);
    $stmt->execute();
    if ($row = $stmt->get_result()->fetch_assoc()) {
        $stats['prescriptions'] = $row['total'];
    }
    $stmt->close();
}

$response['stats'] = $stats;


/* ═══════════════════════════════
   AVAILABLE DOCTORS
   (List of all doctors for the
   booking form dropdown/grid)
   ═══════════════════════════════ */

$doctors = [];
$doctorsQuery = $conn->query(
    "SELECT staff_id as id,
            CONCAT(first_name, ' ', last_name) as name,
            profile_image, specialization, bio, capacity
     FROM medical_staff"
);

while ($doctor = $doctorsQuery->fetch_assoc()) {
    // Build the full image URL path relative to the dashboard page
    $doctor['image_url'] = '../image/' . $doctor['profile_image'];
    $doctors[] = $doctor;
}
$response['doctors'] = $doctors;


/* ═══════════════════════════════
   TODAY'S APPOINTMENT TIMELINE
   (Shows each hour slot from 9 AM
   to 5 PM with chairs available)
   ═══════════════════════════════ */

$timeline   = [];
$today      = date('Y-m-d');
$startHour  = 9;   // Clinic opens at 9 AM
$endHour    = 17;  // Clinic closes at 5 PM
$maxChairs  = 30;  // Maximum patients per hour slot

for ($hour = $startHour; $hour < $endHour; $hour++) {
    $slotStart = "$today " . str_pad($hour, 2, '0', STR_PAD_LEFT) . ":00:00";
    $slotEnd   = "$today " . str_pad($hour + 1, 2, '0', STR_PAD_LEFT) . ":00:00";

    // Count how many appointments are booked in this time slot
    $stmt = $conn->prepare(
        "SELECT COUNT(*) as booked FROM appointments
         WHERE appointment_date >= ? AND appointment_date < ?"
    );
    $stmt->bind_param("ss", $slotStart, $slotEnd);
    $stmt->execute();
    $bookedCount = $stmt->get_result()->fetch_assoc()['booked'];
    $stmt->close();

    $availableChairs = $maxChairs - $bookedCount;
    $timeline[] = [
        'hour'         => date('h:00 A', strtotime($slotStart)) . ' - ' . date('h:00 A', strtotime($slotEnd)),
        'chairs_left'  => max(0, $availableChairs),
        'total_chairs' => $maxChairs,
        'status'       => ($availableChairs > 0) ? 'Available' : 'Full'
    ];
}
$response['timeline'] = $timeline;


/* ═══════════════════════════════
   PATIENT'S APPOINTMENTS LIST
   (All past and upcoming appointments
   with doctor name and wait time)
   ═══════════════════════════════ */

$appointments = [];

if ($patientId) {
    $stmt = $conn->prepare(
        "SELECT a.*, CONCAT(ms.first_name, ' ', ms.last_name) as doctor_name
         FROM appointments a
         LEFT JOIN medical_staff ms ON a.staff_id = ms.staff_id
         WHERE a.patient_id = ?
         ORDER BY a.appointment_date DESC"
    );
    $stmt->bind_param("i", $patientId);
    $stmt->execute();
    $appointmentsQuery = $stmt->get_result();

    while ($appt = $appointmentsQuery->fetch_assoc()) {
        // Estimate wait time based on queue position
        // (roughly 15 minutes per 6 patients)
        $estimatedWait = ceil(($appt['queue_number'] / 6) * 15);

        $appointments[] = [
            'date'         => date('M d, Y h:i A', strtotime($appt['appointment_date'])),
            'reason'       => $appt['reason'],
            'priority'     => $appt['ai_priority'],
            'status'       => ucfirst($appt['status']),
            'queue_number' => $appt['queue_number'],
            'wait_time'    => $estimatedWait,
            'doctor'       => $appt['doctor_name'] ?? 'General'
        ];
    }
    $stmt->close();
}
$response['appointments'] = $appointments;


/* ═══════════════════════════════
   SEND EVERYTHING BACK
   (One big JSON response with
   all dashboard data)
   ═══════════════════════════════ */

echo json_encode(['status' => 'success', 'data' => $response]);
?>
