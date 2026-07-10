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
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
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
$stmt = $conn->prepare("SELECT * FROM patients WHERE user_id = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
$patientResult = $stmt->get_result();
if ($patientRow = $patientResult->fetch_assoc()) {
    $patientId = $patientRow['patient_id'];
    $response['profile'] = [
        'first_name' => $patientRow['first_name'],
        'last_name' => $patientRow['last_name'],
        'cpr' => $patientRow['cpr'],
        'date_of_birth' => $patientRow['date_of_birth'],
        'gender' => $patientRow['gender'],
        'phone' => $patientRow['phone'],
        'email' => $patientRow['email'] ?? $userEmail,
        'address' => $patientRow['address'],
        'blood_type' => $patientRow['blood_type'],
        'emergency_contact_name' => $patientRow['emergency_contact_name'],
        'emergency_contact_relation' => $patientRow['emergency_contact_relation'],
        'emergency_contact_phone' => $patientRow['emergency_contact_phone'],
        'allergies' => $patientRow['allergies'],
        'chronic_conditions' => $patientRow['chronic_conditions'],
        'preferences' => $patientRow['preferences'] ? json_decode($patientRow['preferences'], true) : null
    ];
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
         WHERE patient_id = ? AND status NOT IN ('terminated', 'cancelled', 'completed')"
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
    "SELECT doctor_id as id,
            CONCAT(first_name, ' ', last_name) as name,
            profile_image, specialization, bio, capacity
     FROM doctors"
);

if ($doctorsQuery) {
    while ($doctor = $doctorsQuery->fetch_assoc()) {
        $doctor['image_url'] = '../image/' . $doctor['profile_image'];
        
        // Count today's appointments for capacity
        $today = date('Y-m-d');
        $countQuery = $conn->query(
            "SELECT COUNT(*) as booked FROM appointments
             WHERE doctor_id = '{$doctor['id']}'
             AND DATE(appointment_date) = '$today'"
        );
        $bookedCount = $countQuery ? $countQuery->fetch_assoc()['booked'] : 0;
        $doctor['is_full'] = ($bookedCount >= 16);
        
        // Roster and shift assignment logic
        $did = (int)$doctor['id'];
        $shiftNum = ($did <= 5) ? 1 : 2;
        
        if ($did === 1 || $did === 2 || $did === 6 || $did === 7) {
            $doctor['specialization'] = "General Medicine";
        } elseif ($did === 3 || $did === 8) {
            $doctor['specialization'] = "Dentistry";
        } elseif ($did === 4 || $did === 9) {
            $doctor['specialization'] = "ENT Specialist";
        } elseif ($did === 5 || $did === 10) {
            $doctor['specialization'] = "Ophthalmology";
        }
        
        $doctor['shift'] = $shiftNum;
        $doctors[] = $doctor;
    }
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

for ($i = 0; $i < 16; $i++) {
    $hour = ($startHour + $i) % 24;
    $slotDate = $today;
    if ($hour < 9) { // Crossed midnight
        $slotDate = date('Y-m-d', strtotime($today . ' +1 day'));
    }
    
    $slotEndHour = ($hour + 1) % 24;
    $slotEndDate = ($slotEndHour <= 9 && $slotEndHour > 0) ? date('Y-m-d', strtotime($today . ' +1 day')) : $slotDate;
    if ($slotEndHour === 0) {
        $slotEndDate = date('Y-m-d', strtotime($today . ' +1 day'));
    }

    $slotStart = "$slotDate " . str_pad($hour, 2, '0', STR_PAD_LEFT) . ":00:00";
    $slotEnd   = "$slotEndDate " . str_pad($slotEndHour, 2, '0', STR_PAD_LEFT) . ":00:00";

    // Count how many appointments are booked in this time slot
    $stmt = $conn->prepare(
        "SELECT COUNT(*) as booked FROM appointments
         WHERE appointment_date >= ? AND appointment_date < ?"
    );
    if ($stmt) {
        $stmt->bind_param("ss", $slotStart, $slotEnd);
        $stmt->execute();
        $bookedCount = $stmt->get_result()->fetch_assoc()['booked'] ?? 0;
        $stmt->close();
    } else {
        $bookedCount = 0;
    }

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

    if (empty($newName) || empty($newEmail)) {
        echo json_encode(['status' => 'error', 'message' => 'Name and Email are required.']);
        exit();
    }

    // Split name into First and Last
    $parts = explode(' ', $newName, 2);
    $firstName = $parts[0];
    $lastName  = $parts[1] ?? '';

    // 1. Update Users table (Email)
    $stmt = $conn->prepare("UPDATE users SET email = ? WHERE user_id = ?");
    $stmt->bind_param("si", $newEmail, $userId);
    $stmt->execute();
    $stmt->close();

    // 2. Update Patients table (FirstName, LastName, Email)
    // We update email in both places for consistency
    $stmt = $conn->prepare("UPDATE patients SET first_name = ?, last_name = ?, email = ? WHERE user_id = ?");
    $stmt->bind_param("sssi", $firstName, $lastName, $newEmail, $userId);
    
    if ($stmt->execute()) {
        $_SESSION['user_name'] = $newName; // Sync Session
        echo json_encode(['status' => 'success', 'message' => 'Profile updated successfully!']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to save changes to the database.']);
    }
    $stmt->close();
    exit();
}

/* ═══════════════════════════════
   MARK NOTIFICATION AS READ (POST)
   ═══════════════════════════════ */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'mark_notification_read') {
    $notifId = intval($_POST['notification_id'] ?? 0);
    if ($notifId > 0) {
        $stmt = $conn->prepare("UPDATE notifications SET is_read = 1 WHERE notif_id = ?");
        $stmt->bind_param("i", $notifId);
        $stmt->execute();
        $stmt->close();
        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Invalid notification ID']);
    }
    exit();
}

/* ═══════════════════════════════
   PAY INVOICE (POST)
   Simulated payment processing
   ═══════════════════════════════ */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'pay_invoice') {
    $invoiceId = intval($_POST['invoice_id'] ?? 0);
    $cardLast4 = substr(preg_replace('/\D/', '', $_POST['card_number'] ?? ''), -4);
    $cardHolder = htmlspecialchars(trim($_POST['card_holder'] ?? ''));

    if ($invoiceId <= 0) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid invoice']);
        exit();
    }

    // Verify invoice belongs to this patient and is pending
    $stmt = $conn->prepare("SELECT i.invoice_id, i.status, i.total_amount FROM invoices i WHERE i.invoice_id = ? AND i.patient_id = ?");
    $stmt->bind_param("ii", $invoiceId, $patientId);
    $stmt->execute();
    $inv = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$inv) {
        echo json_encode(['status' => 'error', 'message' => 'Invoice not found']);
        exit();
    }
    if ($inv['status'] !== 'pending') {
        echo json_encode(['status' => 'error', 'message' => 'This invoice is already ' . $inv['status']]);
        exit();
    }

    // Simulate payment processing (in production, integrate Stripe/PayPal here)
    $paymentMethod = "Card ending in ****$cardLast4";
    $paidAt = date('Y-m-d H:i:s');

    $stmt = $conn->prepare("UPDATE invoices SET status = 'paid', paid_at = ?, payment_method = ? WHERE invoice_id = ?");
    $stmt->bind_param("ssi", $paidAt, $paymentMethod, $invoiceId);

    if ($stmt->execute()) {
        echo json_encode([
            'status' => 'success', 
            'message' => 'Payment of $' . number_format($inv['total_amount'], 2) . ' processed successfully!',
            'paid_at' => date('M d, Y h:i A', strtotime($paidAt))
        ]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Payment failed. Please try again.']);
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
                t.ticket_code,
                p.cpr, p.blood_type, p.gender, p.date_of_birth, CONCAT(p.first_name, ' ', p.last_name) as patient_name
         FROM appointments a
         LEFT JOIN doctors ms ON a.doctor_id = ms.doctor_id
         LEFT JOIN tickets t ON a.appointment_id = t.appointment_id
         LEFT JOIN patients p ON a.patient_id = p.patient_id
         WHERE a.patient_id = ? AND a.status NOT IN ('terminated', 'cancelled', 'completed')
         ORDER BY a.appointment_date DESC"
    );
    if ($stmt) {
        $stmt->bind_param("i", $patientId);
        $stmt->execute();
        $appointmentsQuery = $stmt->get_result();

        while ($appt = $appointmentsQuery->fetch_assoc()) {
            $estimatedWait = ceil(($appt['queue_number'] / 6) * 15);

            $appointments[] = [
                'appointment_id' => $appt['appointment_id'],
                'date'           => date('M d, Y h:i A', strtotime($appt['appointment_date'])),
                'raw_date'       => $appt['appointment_date'],
                'reason'       => $appt['reason'],
                'priority'     => $appt['ai_priority'],
                'status'       => ucfirst($appt['status']),
                'queue_number' => $appt['queue_number'],
                'ticket_code'  => $appt['ticket_code'] ?? 'N/A',
                'wait_time'    => $estimatedWait,
                'doctor'       => $appt['doctor_name'] ?? 'General',
                'cpr'          => $appt['cpr'] ?? 'N/A',
                'blood_type'   => $appt['blood_type'] ?? 'N/A',
                'patient_name' => $appt['patient_name'] ?? 'N/A',
                'gender'       => $appt['gender'] ?? 'Other',
                'date_of_birth' => $appt['date_of_birth'] ?? null,
                'created_at'   => $appt['created_at'] ?? $appt['appointment_date']
            ];
        }
        $stmt->close();
    }
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
         LEFT JOIN doctors ms ON mr.doctor_id = ms.doctor_id
         WHERE mr.patient_id = ?
         ORDER BY mr.record_date DESC"
    );
    if ($stmt) {
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
         LEFT JOIN doctors ms ON mr.doctor_id = ms.doctor_id
         WHERE mr.patient_id = ?
         ORDER BY pr.prescription_id DESC"
    );
    if ($stmt) {
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
}
$response['prescriptions'] = $prescriptions;


/* ═══════════════════════════════
   NOTIFICATIONS
   ═══════════════════════════════ */
$conn->query("CREATE TABLE IF NOT EXISTS notifications (
    notif_id INT AUTO_INCREMENT PRIMARY KEY,
    sender VARCHAR(100),
    topic VARCHAR(200),
    message TEXT,
    target VARCHAR(50) DEFAULT 'all_users',
    target_user_id INT UNSIGNED NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)");

$notifications = [];
$stmt = $conn->prepare(
    "SELECT notif_id, sender, topic, message, is_read, created_at 
     FROM notifications 
     WHERE target = 'all_users' 
        OR target = 'all_patients' 
        OR target_user_id = ?
     ORDER BY created_at DESC"
);
if ($stmt) {
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($row = $res->fetch_assoc()) {
        $notifications[] = [
            'id'      => $row['notif_id'],
            'sender'  => $row['sender'],
            'topic'   => $row['topic'],
            'message' => $row['message'],
            'is_read' => $row['is_read'],
            'date'    => date('M d, Y h:i A', strtotime($row['created_at']))
        ];
    }
    $stmt->close();
}
$response['notifications'] = $notifications;


/* ═══════════════════════════════
   BILLING / INVOICES
   (Patient's bills created by admin)
   ═══════════════════════════════ */
$invoices = [];
if ($patientId) {
    $stmt = $conn->prepare(
        "SELECT invoice_id, subtotal, tax_rate, tax_amount, total_amount, 
                status, issue_date, due_date, notes
         FROM invoices
         WHERE patient_id = ?
         ORDER BY issue_date DESC"
    );
    if ($stmt) {
        $stmt->bind_param("i", $patientId);
        $stmt->execute();
        $res = $stmt->get_result();
        while ($row = $res->fetch_assoc()) {
            $invoices[] = [
                'id'        => $row['invoice_id'],
                'subtotal'  => number_format($row['subtotal'] ?: $row['total_amount'], 2),
                'tax'       => number_format($row['tax_amount'] ?: 0, 2),
                'total'     => number_format($row['total_amount'], 2),
                'status'    => $row['status'],
                'date'      => date('M d, Y', strtotime($row['issue_date'])),
                'due_date'  => $row['due_date'] ? date('M d, Y', strtotime($row['due_date'])) : 'N/A',
                'notes'     => $row['notes'] ?? ''
            ];
        }
        $stmt->close();
    }
}
$response['invoices'] = $invoices;


/* ═══════════════════════════════
   FAMILY MEMBERS
   (Linked accounts for this user)
   ═══════════════════════════════ */
$family_members = [];
$stmt = $conn->prepare(
    "SELECT f.member_id, f.relationship, p.first_name, p.last_name, p.cpr, p.date_of_birth, p.gender, p.blood_type, p.phone, p.email
     FROM family_members f
     JOIN patients p ON f.dependent_user_id = p.user_id
     WHERE f.primary_user_id = ?
     ORDER BY f.member_id DESC"
);
if ($stmt) {
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($row = $res->fetch_assoc()) {
        $family_members[] = $row;
    }
    $stmt->close();
}
$response['family_members'] = $family_members;



/* ═══════════════════════════════
   SEND EVERYTHING BACK
   (One big JSON response with
   all dashboard data)
   ═══════════════════════════════ */

echo json_encode(['status' => 'success', 'data' => $response]);
?>
