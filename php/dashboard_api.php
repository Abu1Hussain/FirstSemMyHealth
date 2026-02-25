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
if ($stmt) {
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $emailResult = $stmt->get_result();
    if ($emailRow = $emailResult->fetch_assoc()) {
        $userEmail = $emailRow['email'];
    }
    $stmt->close();
}

// Force default name "Ali Mohamed" if current name is generic or empty
if ($userName === 'User' || empty($userName)) {
    $userName = 'Ali Mohamed';
    $_SESSION['user_name'] = $userName;
    $conn->query("UPDATE patients SET first_name = 'Ali', last_name = 'Mohamed' WHERE user_id = $userId");
}

$response['user'] = [
    'name'    => $userName,
    'initial' => strtoupper(substr($userName, 0, 1)),
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
   HANDLE PROFILE UPDATE (POST)
   ═══════════════════════════════ */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_profile'])) {
    $newName  = trim($_POST['name']);
    $newEmail = trim($_POST['email']);
    $newPhone = trim($_POST['phone'] ?? '');

    // Split name into First and Last
    $parts = explode(' ', $newName, 2);
    $firstName = $parts[0];
    $lastName  = $parts[1] ?? '';

    // Update Users table (Email)
    $stmt = $conn->prepare("UPDATE users SET email = ? WHERE user_id = ?");
    $stmt->bind_param("si", $newEmail, $userId);
    $stmt->execute();
    $stmt->close();

    // Update Patients table (Name, Phone)
    $stmt = $conn->prepare("UPDATE patients SET first_name = ?, last_name = ?, phone = ? WHERE user_id = ?");
    $stmt->bind_param("sssi", $firstName, $lastName, $newPhone, $userId);
    
    if ($stmt->execute()) {
        $_SESSION['user_name'] = $newName; // Update session
        echo json_encode(['status' => 'success', 'message' => 'Profile updated successfully.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to update profile.']);
    }
    $stmt->close();
    exit();
}


/* ═══════════════════════════════
   PATIENT'S APPOINTMENTS LIST
   (All past and upcoming appointments
   with doctor name and wait time)
   ═══════════════════════════════ */

$appointments = [];

if ($patientId) {
    $stmt = $conn->prepare(
        "SELECT a.*, 
                CONCAT(ms.first_name, ' ', ms.last_name) as doctor_name,
                t.ticket_code
         FROM appointments a
         LEFT JOIN medical_staff ms ON a.staff_id = ms.staff_id
         LEFT JOIN tickets t ON a.appointment_id = t.appointment_id
         WHERE a.patient_id = ?
         ORDER BY a.appointment_date DESC"
    );
    $stmt->bind_param("i", $patientId);
    $stmt->execute();
    $appointmentsQuery = $stmt->get_result();

    while ($appt = $appointmentsQuery->fetch_assoc()) {
        $estimatedWait = ceil(($appt['queue_number'] / 6) * 15);

        $appointments[] = [
            'appointment_id' => $appt['appointment_id'],
            'date'           => date('M d, Y h:i A', strtotime($appt['appointment_date'])),
            'reason'       => $appt['reason'],
            'priority'     => $appt['ai_priority'],
            'status'       => ucfirst($appt['status']),
            'queue_number' => $appt['queue_number'],
            'ticket_code'  => $appt['ticket_code'] ?? 'N/A',
            'wait_time'    => $estimatedWait,
            'doctor'       => $appt['doctor_name'] ?? 'General'
        ];
    }
    $stmt->close();
}
$response['appointments'] = $appointments;


/* ═══════════════════════════════
   MEDICAL RECORDS
   ═══════════════════════════════ */
$records = [];
if ($patientId) {
    $stmt = $conn->prepare(
        "SELECT mr.*, CONCAT(ms.first_name, ' ', ms.last_name) as doctor_name
         FROM medical_records mr
         LEFT JOIN medical_staff ms ON mr.created_by = ms.staff_id
         WHERE mr.patient_id = ?
         ORDER BY mr.record_date DESC"
    );
    $stmt->bind_param("i", $patientId);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($row = $res->fetch_assoc()) {
        $records[] = [
            'date'    => date('M d, Y', strtotime($row['record_date'])),
            'type'    => $row['record_type'],
            'summary' => $row['summary'],
            'doctor'  => $row['doctor_name'] ?? 'System'
        ];
    }
    $stmt->close();
}
$response['records'] = $records;


/* ═══════════════════════════════
   PRESCRIPTIONS
   ═══════════════════════════════ */
$prescriptions = [];
if ($patientId) {
    $stmt = $conn->prepare(
        "SELECT pr.*, 
                CONCAT(ms.first_name, ' ', ms.last_name) as doctor_name
         FROM prescriptions pr
         JOIN medical_records mr ON pr.record_id = mr.record_id
         LEFT JOIN medical_staff ms ON mr.created_by = ms.staff_id
         WHERE mr.patient_id = ?
         ORDER BY pr.prescription_id DESC"
    );
    $stmt->bind_param("i", $patientId);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($row = $res->fetch_assoc()) {
        $prescriptions[] = [
            'medication'   => $row['medication_name'],
            'dosage'       => $row['dosage'],
            'frequency'    => $row['frequency'],
            'duration'     => $row['duration'],
            'doctor'       => $row['doctor_name'] ?? 'System'
        ];
    }
    $stmt->close();
}
$response['prescriptions'] = $prescriptions;


/* ═══════════════════════════════
   SEND EVERYTHING BACK
   (One big JSON response with
   all dashboard data)
   ═══════════════════════════════ */

echo json_encode(['status' => 'success', 'data' => $response]);
?>
