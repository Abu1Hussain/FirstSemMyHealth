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
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit();
}

$userId   = $_SESSION['user_id'];
$response = [];


/* ═══════════════════════════════
   DOCTOR'S INFO
   (Name, email, initial for the
   dashboard header)
   ═══════════════════════════════ */

/* ═══════════════════════════════
   HANDLE CLINICAL ACTIONS (POST)
   (Update Status, Add Record, Add Prescription)
   ═══════════════════════════════ */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // 1. Update Appointment Status
    if (isset($_POST['appointment_id'], $_POST['status']) && !isset($_POST['action'])) {
        $apptId = $_POST['appointment_id'];
        $status = $_POST['status'];

        // Perform status update
        $stmt = $conn->prepare("UPDATE appointments SET status = ? WHERE appointment_id = ?");
        $stmt->bind_param("si", $status, $apptId);
        
        if ($stmt->execute()) {
            $stmt->close();

            // Automatic Ticket Cleanup for 'completed' or 'terminated'
            if ($status === 'completed' || $status === 'terminated') {

                // Delete the ticket since the appointment is finished/terminated
                $ticketStmt = $conn->prepare("DELETE FROM tickets WHERE appointment_id = ?");
                $ticketStmt->bind_param("i", $apptId);
                $ticketStmt->execute();
                $ticketStmt->close();
            }

            echo json_encode(['status' => 'success', 'message' => 'Status updated and archived if terminal']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to update status']);
            $stmt->close();
        }
        exit();
    }

    // 2. Add Medical Record & Diagnosis
    if (isset($_POST['action']) && $_POST['action'] === 'add_medical_record') {
        $patientId  = $_POST['patient_id'];
        $recordType = $_POST['record_type'];
        $summary    = $_POST['summary'];
        $diagnosis  = $_POST['diagnosis'];
        $doctorUid  = $_SESSION['user_id'];

        // Get doctor_id from user_id
        $doctorId = null;
        $st = $conn->prepare("SELECT doctor_id FROM doctors WHERE user_id = ?");
        $st->bind_param("i", $doctorUid);
        $st->execute();
        if ($row = $st->get_result()->fetch_assoc()) $doctorId = $row['doctor_id'];
        $st->close();

        if (!$doctorId) {
            echo json_encode(['status' => 'error', 'message' => 'Doctor profile not found']);
            exit();
        }

        // Insert Record
        $stmt = $conn->prepare("INSERT INTO medical_records (doctor_id, patient_id, record_type, summary, source_type) VALUES (?, ?, ?, ?, 'In-Person')");
        $stmt->bind_param("iiss", $doctorId, $patientId, $recordType, $summary);
        
        if ($stmt->execute()) {
            $recordId = $conn->insert_id;
            // Insert Diagnosis
            $stmtD = $conn->prepare("INSERT INTO diagnoses (record_id, diagnosis_name) VALUES (?, ?)");
            $stmtD->bind_param("is", $recordId, $diagnosis);
            $stmtD->execute();
            $stmtD->close();

            echo json_encode(['status' => 'success', 'message' => 'Medical record added', 'record_id' => $recordId]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to add record']);
        }
        $stmt->close();
        exit();
    }

    // 3. Add Prescription
    if (isset($_POST['action']) && $_POST['action'] === 'add_prescription') {
        $recordId   = $_POST['record_id'];
        $medication = $_POST['medication_name'];
        $dosage     = $_POST['dosage'];
        $frequency  = $_POST['frequency'];
        $duration   = $_POST['duration'];
        $instr      = $_POST['instructions'];

        $stmt = $conn->prepare("INSERT INTO prescriptions (record_id, medication_name, dosage, frequency, duration, instructions) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("isssss", $recordId, $medication, $dosage, $frequency, $duration, $instr);
        
        if ($stmt->execute()) {
            echo json_encode(['status' => 'success', 'message' => 'Prescription saved']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to save prescription']);
        }
        $stmt->close();
        exit();
    }
    // 4. Transfer Appointment
    if (isset($_POST['action']) && $_POST['action'] === 'transfer_appointment') {
        $apptId = $_POST['appointment_id'];
        $targetDoctorId = $_POST['target_doctor_id'];
        $doctorId = null;

        // Verify the appointment exists
        $stmtCheck = $conn->prepare("SELECT patient_id FROM appointments WHERE appointment_id = ?");
        $stmtCheck->bind_param("i", $apptId);
        $stmtCheck->execute();
        $result = $stmtCheck->get_result();
        
        if ($result->num_rows === 0) {
            echo json_encode(['status' => 'error', 'message' => 'Appointment not found.']);
            $stmtCheck->close();
            exit();
        }
        $stmtCheck->close();

        // Update the appointment's doctor_id and set status back to pending
        $stmt = $conn->prepare("UPDATE appointments SET doctor_id = ?, status = 'pending' WHERE appointment_id = ?");
        $stmt->bind_param("ii", $targetDoctorId, $apptId);
        
        if ($stmt->execute()) {
            // Log the transfer
            $userId = $_SESSION['user_id'];
            $logMsg = "Appointment $apptId Transferred to Doctor ID $targetDoctorId by User $userId";
            $stmtLog = $conn->prepare("INSERT INTO system_logs (user_id, event, status) VALUES (?, ?, 'info')");
            $stmtLog->bind_param("is", $userId, $logMsg);
            $stmtLog->execute();
            $stmtLog->close();

            echo json_encode(['status' => 'success', 'message' => 'Appointment transferred successfully.']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to transfer appointment.']);
        }
        $stmt->close();
        exit();
    }
}

/* ═══════════════════════════════
   HANDLE DATA FETCHING (GET)
   (Patient History)
   ═══════════════════════════════ */
if (isset($_GET['action']) && $_GET['action'] === 'get_patient_history' && isset($_GET['patient_id'])) {
    $pId = $_GET['patient_id'];
    $history = ['records' => [], 'prescriptions' => []];

    // Fetch Records
    $stmt = $conn->prepare("SELECT mr.*, CONCAT(ms.first_name, ' ', ms.last_name) as doctor_name 
                            FROM medical_records mr 
                            LEFT JOIN doctors ms ON mr.doctor_id = ms.doctor_id 
                            WHERE mr.patient_id = ? ORDER BY mr.record_date DESC");
    $stmt->bind_param("i", $pId);
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $history['records'][] = $row;
    }
    $stmt->close();

    // Fetch Prescriptions
    $stmt = $conn->prepare("SELECT pr.*, mr.record_date 
                            FROM prescriptions pr 
                            JOIN medical_records mr ON pr.record_id = mr.record_id 
                            WHERE mr.patient_id = ? ORDER BY mr.record_date DESC");
    $stmt->bind_param("i", $pId);
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $history['prescriptions'][] = $row;
    }
    $stmt->close();

    echo json_encode(['status' => 'success', 'data' => $history]);
    exit();
}


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


/* ═══════════════════════════════
   FIND DOCTOR'S STAFF PROFILE
   (Specialization, department,
   and doctor_id for queries)
   ═══════════════════════════════ */

$doctorId = null;
$profileImage = 'default_user.png';

// 4. Get the doctor's doctor_id
$stmt = $conn->prepare("SELECT doctor_id, specialization, department, profile_image FROM doctors WHERE user_id = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
$staffResult = $stmt->get_result();

if ($staffRow = $staffResult->fetch_assoc()) {
    $doctorId = $staffRow['doctor_id'];
    $response['specialization'] = $staffRow['specialization'];
    $response['department']     = $staffRow['department'];
    if (!empty($staffRow['profile_image'])) {
        $profileImage = $staffRow['profile_image'];
    }
}
$stmt->close();

$response['user'] = [
    'name'    => $doctorName,
    'initial' => strtoupper(substr($doctorName, 0, 1)),
    'email'   => $doctorEmail,
    'image_url' => '../image/' . $profileImage
];


/* ═══════════════════════════════
   DASHBOARD STATS
   (Key numbers for the stats cards)
   ═══════════════════════════════ */

$totalPatients      = 0;
$todayAppointments  = 0;
$pendingReviews     = 0;

if ($doctorId) {
    $today = date('Y-m-d');

    // How many unique patients has this doctor seen?
    $stmt = $conn->prepare(
        "SELECT COUNT(DISTINCT patient_id) as total
         FROM appointments
         WHERE doctor_id = ? AND status = 'completed'"
    );
    $stmt->bind_param("i", $doctorId);
    $stmt->execute();
    if ($row = $stmt->get_result()->fetch_assoc()) {
        $totalPatients = $row['total'];
    }
    $stmt->close();

    // How many appointments does this doctor have today?
    $stmt = $conn->prepare(
        "SELECT COUNT(*) as total
         FROM appointments
         WHERE doctor_id = ? AND DATE(appointment_date) = ?"
    );
    $stmt->bind_param("is", $doctorId, $today);
    $stmt->execute();
    if ($row = $stmt->get_result()->fetch_assoc()) {
        $todayAppointments = $row['total'];
    }
    $stmt->close();

    // How many appointments are still pending review?
    $stmt = $conn->prepare(
        "SELECT COUNT(*) as total
         FROM appointments
         WHERE doctor_id = ? AND status = 'pending'"
    );
    $stmt->bind_param("i", $doctorId);
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
   APPOINTMENT LISTS
   (Today's Patients + All History)
   ═══════════════════════════════ */

// Initialize response variables with defaults
$patientsToday    = [];
$allAppointments  = ['past' => [], 'today' => [], 'upcoming' => []];
$allRecords       = [];
$allPrescriptions = [];
$allPatients      = [];
$allStaff         = [];

// 5. Fetch Patients associated with THIS doctor
$allPatients = [];
if ($doctorId) {
    $stmt = $conn->prepare("
        SELECT DISTINCT p.patient_id, p.first_name, p.last_name, p.cpr, p.email, p.phone, p.gender, p.date_of_birth, p.blood_type 
        FROM patients p
        JOIN appointments a ON p.patient_id = a.patient_id
        WHERE a.doctor_id = ? OR a.doctor_id IS NULL
        ORDER BY p.first_name ASC
    ");
    $stmt->bind_param("i", $doctorId);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($row = $res->fetch_assoc()) $allPatients[] = $row;
    $stmt->close();
}

// 6. Fetch ALL Medical Staff (Always available)
$res = $conn->query("SELECT d.doctor_id, d.first_name, d.last_name, d.specialization, d.department, d.email, d.phone, d.profile_image,
                            (SELECT COUNT(*) FROM medical_records mr WHERE mr.doctor_id = d.doctor_id) as records_count
                     FROM doctors d ORDER BY d.first_name ASC");
if ($res) {
    while ($row = $res->fetch_assoc()) $allStaff[] = $row;
}

if ($doctorId) {
    $today = date('Y-m-d');

    // 1. Fetch Today's List (for the main dashboard widget)
    $stmt = $conn->prepare(
        "SELECT a.appointment_id, a.appointment_date, a.reason, a.status, a.ai_priority,
                a.appointment_type, a.queue_number,
                CONCAT(p.first_name, ' ', p.last_name) as patient_name,
                p.patient_id, p.cpr, p.phone, p.email, p.date_of_birth, p.gender, p.blood_type
         FROM appointments a
         JOIN patients p ON a.patient_id = p.patient_id
         WHERE (a.doctor_id = ? OR a.doctor_id IS NULL)
           AND DATE(appointment_date) = ?
           AND a.status NOT IN ('terminated', 'cancelled', 'completed')
         ORDER BY a.appointment_date ASC"
    );
    $stmt->bind_param("is", $doctorId, $today);
    $stmt->execute();
    $patientListResult = $stmt->get_result();
    while ($patient = $patientListResult->fetch_assoc()) {
        $patientsToday[] = $patient;
    }
    $stmt->close();

    // 2. Fetch ALL History (categorized for the Appointments tab)
    // Removed status filter to show COMPLETED and TERMINATED in history
    $stmt = $conn->prepare(
        "SELECT a.appointment_id, a.appointment_date, a.reason, a.status, a.ai_priority,
                a.appointment_type, a.queue_number,
                CONCAT(p.first_name, ' ', p.last_name) as patient_name,
                p.patient_id, p.cpr, p.phone, p.email, p.date_of_birth, p.gender, p.blood_type
         FROM appointments a
         JOIN patients p ON a.patient_id = p.patient_id
         WHERE a.doctor_id = ? OR a.doctor_id IS NULL
         ORDER BY a.appointment_date DESC"
    );
    $stmt->bind_param("i", $doctorId);
    $stmt->execute();
    $allResult = $stmt->get_result();
    
    while ($appt = $allResult->fetch_assoc()) {
        $apptDate = date('Y-m-d', strtotime($appt['appointment_date']));
        
        if ($apptDate < $today) {
            $allAppointments['past'][] = $appt;
        } elseif ($apptDate === $today) {
            $allAppointments['today'][] = $appt;
        } else {
            $allAppointments['upcoming'][] = $appt;
        }
    }
    $stmt->close();

    // 3. Fetch ALL Records created by this doctor
    $stmt = $conn->prepare("SELECT mr.*, CONCAT(p.first_name, ' ', p.last_name) as patient_name 
                            FROM medical_records mr 
                            JOIN patients p ON mr.patient_id = p.patient_id 
                            WHERE mr.doctor_id = ? ORDER BY mr.record_date DESC");
    $stmt->bind_param("i", $doctorId);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($row = $res->fetch_assoc()) $allRecords[] = $row;
    $stmt->close();

    // 4. Fetch ALL Prescriptions created by this doctor
    $stmt = $conn->prepare("SELECT pr.*, mr.record_date, CONCAT(p.first_name, ' ', p.last_name) as patient_name 
                            FROM prescriptions pr 
                            JOIN medical_records mr ON pr.record_id = mr.record_id 
                            JOIN patients p ON mr.patient_id = p.patient_id 
                            WHERE mr.doctor_id = ? ORDER BY mr.record_date DESC");
    $stmt->bind_param("i", $doctorId);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($row = $res->fetch_assoc()) $allPrescriptions[] = $row;
    $stmt->close();
}

$response['patients_today']  = $patientsToday;
$response['all_appointments'] = $allAppointments;
$response['all_records']      = $allRecords;
$response['all_prescriptions'] = $allPrescriptions;
$response['all_patients']     = $allPatients;
$response['all_staff']        = $allStaff;


/* ═══════════════════════════════
   SEND EVERYTHING BACK
   ═══════════════════════════════ */

echo json_encode(['status' => 'success', 'data' => $response]);
?>
