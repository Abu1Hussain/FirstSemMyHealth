<?php
/*
 * ═══════════════════════════════════════════════════════════
 * Doctor Dashboard API
 * ═══════════════════════════════════════════════════════════
 *
 * Returns all the data needed by the doctor's dashboard:
 *   - Doctor's profile info (name, specialization, department)
 *   - Stats: total patients, today's appointments, pending reviews
 *   - Today's patient list with appointment details
 *
 * SECURITY: All queries use prepared statements to prevent
 *           SQL injection.
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
$response = [];


/* ═══════════════════════════════
   DOCTOR'S INFO
   (Name, email, initial for the
   dashboard header)
   ═══════════════════════════════ */

$doctorName = $_SESSION['user_name'] ?? 'Doctor';

// Fetch the doctor's email from the users table
$doctorEmail = '';
$stmt = $conn->prepare("SELECT email FROM users WHERE user_id = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
if ($emailRow = $stmt->get_result()->fetch_assoc()) {
    $doctorEmail = $emailRow['email'];
}
$stmt->close();

$response['user'] = [
    'name'    => $doctorName,
    'initial' => strtoupper(substr($doctorName, 0, 1)),
    'email'   => $doctorEmail
];


/* ═══════════════════════════════
   FIND DOCTOR'S STAFF PROFILE
   (Specialization, department,
   and staff_id for queries)
   ═══════════════════════════════ */

$staffId = null;
$stmt = $conn->prepare(
    "SELECT staff_id, specialization, department
     FROM medical_staff
     WHERE user_id = ?"
);
$stmt->bind_param("i", $userId);
$stmt->execute();
$staffResult = $stmt->get_result();

if ($staffRow = $staffResult->fetch_assoc()) {
    $staffId = $staffRow['staff_id'];
    $response['specialization'] = $staffRow['specialization'];
    $response['department']     = $staffRow['department'];
}
$stmt->close();


/* ═══════════════════════════════
   DASHBOARD STATS
   (Key numbers for the stats cards)
   ═══════════════════════════════ */

$totalPatients      = 0;
$todayAppointments  = 0;
$pendingReviews     = 0;

if ($staffId) {
    $today = date('Y-m-d');

    // How many unique patients has this doctor seen?
    $stmt = $conn->prepare(
        "SELECT COUNT(DISTINCT patient_id) as total
         FROM appointments
         WHERE staff_id = ?"
    );
    $stmt->bind_param("i", $staffId);
    $stmt->execute();
    if ($row = $stmt->get_result()->fetch_assoc()) {
        $totalPatients = $row['total'];
    }
    $stmt->close();

    // How many appointments does this doctor have today?
    $stmt = $conn->prepare(
        "SELECT COUNT(*) as total
         FROM appointments
         WHERE staff_id = ? AND DATE(appointment_date) = ?"
    );
    $stmt->bind_param("is", $staffId, $today);
    $stmt->execute();
    if ($row = $stmt->get_result()->fetch_assoc()) {
        $todayAppointments = $row['total'];
    }
    $stmt->close();

    // How many appointments are still pending review?
    $stmt = $conn->prepare(
        "SELECT COUNT(*) as total
         FROM appointments
         WHERE staff_id = ? AND status = 'pending'"
    );
    $stmt->bind_param("i", $staffId);
    $stmt->execute();
    if ($row = $stmt->get_result()->fetch_assoc()) {
        $pendingReviews = $row['total'];
    }
    $stmt->close();
}

$response['stats'] = [
    'total_patients'      => $totalPatients,
    'today_appointments'  => $todayAppointments,
    'pending_reviews'     => $pendingReviews
];


/* ═══════════════════════════════
   TODAY'S PATIENT LIST
   (All patients booked with this
   doctor for today, in time order)
   ═══════════════════════════════ */

$patientsToday = [];

if ($staffId) {
    $today = date('Y-m-d');

    $stmt = $conn->prepare(
        "SELECT a.appointment_id, a.appointment_date, a.reason, a.status, a.ai_priority,
                CONCAT(p.first_name, ' ', p.last_name) as patient_name, p.cpr
         FROM appointments a
         JOIN patients p ON a.patient_id = p.patient_id
         WHERE a.staff_id = ? AND DATE(a.appointment_date) = ?
         ORDER BY a.appointment_date ASC"
    );
    $stmt->bind_param("is", $staffId, $today);
    $stmt->execute();
    $patientListResult = $stmt->get_result();

    while ($patient = $patientListResult->fetch_assoc()) {
        $patientsToday[] = $patient;
    }
    $stmt->close();
}
$response['patients_today'] = $patientsToday;


/* ═══════════════════════════════
   SEND EVERYTHING BACK
   ═══════════════════════════════ */

echo json_encode(['status' => 'success', 'data' => $response]);
?>
