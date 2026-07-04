<?php
/*
 * ═══════════════════════════════════════════════════════════
 * Admin Dashboard API
 * ═══════════════════════════════════════════════════════════
 *
 * Returns all data needed by the admin dashboard. The admin
 * dashboard has multiple tabs, each served by a different
 * "action" parameter.
 *
 * Available actions:
 *   dashboard      – Overview stats and charts
 *   users          – All user accounts
 *   patients       – All patient profiles
 *   doctors        – All doctor/staff profiles
 *   appointments   – All appointments
 *   records        – All medical records
 *   prescriptions  – All prescriptions with patient names
 *   chart_data     – Data for dashboard charts
 *   system_logs    – System event logs
 *   audit_trail    – User action audit trail
 *   ai_logs        – AI triage history
 *   document_queue – Uploaded document queue
 *   feedback       – User feedback and reports
 *
 * SECURITY: All queries use prepared statements where user
 *           input is involved. Admin-only queries that don't
 *           involve user input are safe direct queries.
 * ═══════════════════════════════════════════════════════════
 */

session_start();
header('Content-Type: application/json');

/* ── Connect to the database ── */
require_once __DIR__ . '/../DataBase/db_connect.php';

/* ── Make sure the user is logged in AND is an admin ── */
$userRole = $_SESSION['user_role'] ?? $_SESSION['role'] ?? null;
if (!isset($_SESSION['user_id']) || $userRole !== 'admin') {
    echo json_encode([
        'status' => 'error', 
        'message' => 'Unauthorized',
        'debug' => [
            'has_user_id' => isset($_SESSION['user_id']),
            'role_value' => $userRole,
            'session_keys' => array_keys($_SESSION)
        ]
    ]);
    exit();
}


/* ═══════════════════════════════
   Handle POST actions FIRST
   (delete, create, update operations)
   before GET action routing
   ═══════════════════════════════ */

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !isset($_GET['action'])) {
    // POST without ?action= (e.g. delete_patient, delete_staff, edit_staff)
    // Skip GET action routing — fall through to POST handlers below
    $action = '__POST_HANDLER__';
} else {
    $action = $_GET['action'] ?? 'dashboard';
}


/* ─────────────────────────────────────────────
   ACTION: dashboard
   Returns overview counts for the stats cards
   ───────────────────────────────────────────── */

if ($action === 'dashboard') {
    $data = [
        'total_users'        => 0,
        'total_patients'     => 0,
        'total_doctors'      => 0,
        'total_appointments' => 0,
        'total_records'      => 0,
        'total_prescriptions'=> 0,
        'pending_appointments' => 0,
        'completed_appointments' => 0
    ];

    // Count each entity in the database
    $queries = [
        'total_users'         => "SELECT COUNT(*) as c FROM users",
        'total_patients'      => "SELECT COUNT(*) as c FROM patients",
        'total_doctors'       => "SELECT COUNT(*) as c FROM doctors",
        'total_appointments'  => "SELECT COUNT(*) as c FROM appointments",
        'total_records'       => "SELECT COUNT(*) as c FROM medical_records",
        'total_prescriptions' => "SELECT COUNT(*) as c FROM prescriptions",
        'pending_appointments'   => "SELECT COUNT(*) as c FROM appointments WHERE status = 'pending'",
        'completed_appointments' => "SELECT COUNT(*) as c FROM appointments WHERE status = 'completed'"
    ];

    foreach ($queries as $key => $sql) {
        $result = $conn->query($sql);
        if ($result && $row = $result->fetch_assoc()) {
            $data[$key] = $row['c'];
        }
    }

    echo json_encode(['status' => 'success', 'data' => $data]);
    exit();
}


/* ─────────────────────────────────────────────
   ACTION: users
   Returns all user accounts with display names
   ───────────────────────────────────────────── */

if ($action === 'users') {
    $users = [];
    $result = $conn->query("SELECT user_id, email, role, status, last_login, created_at FROM users ORDER BY user_id");

    while ($row = $result->fetch_assoc()) {
        // Try to find the user's display name from their profile table
        $displayName = '—';

        if ($row['role'] === 'patient') {
            $stmt = $conn->prepare(
                "SELECT CONCAT(first_name, ' ', last_name) as name
                 FROM patients WHERE user_id = ?"
            );
            $stmt->bind_param("i", $row['user_id']);
            $stmt->execute();
            if ($nameRow = $stmt->get_result()->fetch_assoc()) {
                $displayName = $nameRow['name'];
            }
            $stmt->close();

        } elseif ($row['role'] === 'doctor') {
            $stmt = $conn->prepare(
                "SELECT CONCAT(first_name, ' ', last_name) as name
                 FROM doctors WHERE user_id = ?"
            );
            $stmt->bind_param("i", $row['user_id']);
            $stmt->execute();
            if ($nameRow = $stmt->get_result()->fetch_assoc()) {
                $displayName = $nameRow['name'];
            }
            $stmt->close();

        } else {
            $displayName = 'System Admin';
        }

        $users[] = [
            'id'         => $row['user_id'],
            'name'       => $displayName,
            'email'      => $row['email'],
            'role'       => ucfirst($row['role']),
            'status'     => ucfirst($row['status']),
            'last_login' => $row['last_login'] ? $row['last_login'] : 'Never',
            'created_at' => $row['created_at']
        ];
    }

    echo json_encode(['status' => 'success', 'data' => $users]);
    exit();
}


/* ─────────────────────────────────────────────
   ACTION: patients
   Returns all patient profiles
   ───────────────────────────────────────────── */

if ($action === 'patients') {
    $patients = [];
    $result = $conn->query(
        "SELECT p.patient_id, CONCAT(p.first_name, ' ', p.last_name) as name,
                p.first_name, p.last_name, p.cpr, p.gender,
                p.phone, p.blood_type, p.date_of_birth, u.email
         FROM patients p
         JOIN users u ON p.user_id = u.user_id
         ORDER BY p.patient_id"
    );

    while ($row = $result->fetch_assoc()) {
        $patients[] = $row;
    }

    echo json_encode(['status' => 'success', 'data' => $patients]);
    exit();
}


/* ─────────────────────────────────────────────
   ACTION: doctors
   Returns all doctor/staff profiles
   ───────────────────────────────────────────── */

if ($action === 'doctors') {
    $doctors = [];
    $result = $conn->query(
        "SELECT d.doctor_id as id, d.doctor_id, CONCAT(d.first_name, ' ', d.last_name) as name,
                d.first_name, d.last_name, d.specialization, d.presence_status,
                COALESCE(dept.name, d.department) as department, d.phone, d.profile_image, d.capacity, u.email, d.is_active,
                (SELECT COUNT(*) FROM appointments WHERE doctor_id = d.doctor_id AND LOWER(status) = 'completed') as records_count
         FROM doctors d
         JOIN users u ON d.user_id = u.user_id
         LEFT JOIN departments dept ON d.department_id = dept.dept_id
         ORDER BY d.doctor_id"
    );

    while ($row = $result->fetch_assoc()) {
        $doctors[] = $row;
    }

    echo json_encode(['status' => 'success', 'data' => $doctors]);
    exit();
}


/* ─────────────────────────────────────────────
   ACTION: appointments
   Returns all appointments with patient and
   doctor names
   ───────────────────────────────────────────── */

if ($action === 'appointments') {
    $appointments = [];
    $result = $conn->query(
        "SELECT a.appointment_id, a.appointment_date, a.appointment_type,
                a.status, a.reason, a.ai_priority, a.queue_number,
                CONCAT(p.first_name, ' ', p.last_name) as patient_name,
                CONCAT(ms.first_name, ' ', ms.last_name) as doctor_name
         FROM appointments a
         LEFT JOIN patients p ON a.patient_id = p.patient_id
         LEFT JOIN doctors ms ON a.doctor_id = ms.doctor_id
         ORDER BY a.appointment_date DESC"
    );

    while ($row = $result->fetch_assoc()) {
        $appointments[] = $row;
    }

    echo json_encode(['status' => 'success', 'data' => $appointments]);
    exit();
}


/* ─────────────────────────────────────────────
   ACTION: records
   Returns all medical records with patient and
   doctor names
   ───────────────────────────────────────────── */

if ($action === 'records') {
    $records = [];
    $result = $conn->query(
        "SELECT mr.record_id, mr.record_date, mr.record_type, mr.summary,
                CONCAT(p.first_name, ' ', p.last_name) as patient_name,
                CONCAT(ms.first_name, ' ', ms.last_name) as doctor_name
         FROM medical_records mr
         LEFT JOIN patients p ON mr.patient_id = p.patient_id
         LEFT JOIN doctors ms ON mr.doctor_id = ms.doctor_id
         ORDER BY mr.record_date DESC"
    );

    while ($row = $result->fetch_assoc()) {
        $records[] = $row;
    }

    echo json_encode(['status' => 'success', 'data' => $records]);
    exit();
}


/* ─────────────────────────────────────────────
   ACTION: prescriptions
   Returns all prescriptions with patient names
   ───────────────────────────────────────────── */

if ($action === 'prescriptions') {
    $prescriptions = [];
    $result = $conn->query(
        "SELECT pr.prescription_id, pr.medication_name, pr.dosage,
                pr.frequency, pr.duration, pr.instructions,
                CONCAT(p.first_name, ' ', p.last_name) as patient_name,
                CONCAT(ms.first_name, ' ', ms.last_name) as doctor_name
         FROM prescriptions pr
         JOIN medical_records mr ON pr.record_id = mr.record_id
         JOIN patients p ON mr.patient_id = p.patient_id
         LEFT JOIN doctors ms ON mr.doctor_id = ms.doctor_id
         ORDER BY pr.prescription_id DESC"
    );

    while ($row = $result->fetch_assoc()) {
        $prescriptions[] = $row;
    }

    echo json_encode(['status' => 'success', 'data' => $prescriptions]);
    exit();
}


/* ─────────────────────────────────────────────
   ACTION: chart_data
   Returns data for the admin dashboard charts
   ───────────────────────────────────────────── */

if ($action === 'chart_data') {
    $chartData = [];

    // 1. SIGNUPS (Last 7 days)
    $signups = ['labels' => [], 'data' => []];
    for ($i = 6; $i >= 0; $i--) {
        $day = date('Y-m-d', strtotime("-$i days"));
        $label = date('D', strtotime($day));
        $res = $conn->query("SELECT COUNT(*) as c FROM users WHERE DATE(created_at) = '$day' AND role = 'patient'");
        $count = ($res && $row = $res->fetch_assoc()) ? (int)$row['c'] : 0;
        
        $signups['labels'][] = $label;
        $signups['data'][] = $count;
    }
    $chartData['signups'] = $signups;

    // 2. DOCTOR_CHART (Top 5 doctors by appointment count)
    $doctorChart = ['labels' => [], 'data' => []];
    $res = $conn->query(
        "SELECT CONCAT(d.first_name, ' ', d.last_name) as name, COUNT(a.appointment_id) as count
         FROM doctors d
         LEFT JOIN appointments a ON d.doctor_id = a.doctor_id
         GROUP BY d.doctor_id
         ORDER BY count DESC
         LIMIT 5"
    );
    while ($row = $res->fetch_assoc()) {
        $doctorChart['labels'][] = $row['name'];
        $doctorChart['data'][] = (int)$row['count'];
    }
    $chartData['doctor_chart'] = $doctorChart;

    // 3. TIME_CHART (Visits per hour today)
    $timeChart = ['labels' => [], 'data' => []];
    $today = date('Y-m-d');
    for ($h = 9; $h < 18; $h++) {
        $label = date('h A', strtotime("$h:00"));
        $slotStart = "$today " . str_pad($h, 2, '0', STR_PAD_LEFT) . ":00:00";
        $slotEnd   = "$today " . str_pad($h + 1, 2, '0', STR_PAD_LEFT) . ":00:00";
        
        $res = $conn->query("SELECT COUNT(*) as c FROM appointments WHERE appointment_date >= '$slotStart' AND appointment_date < '$slotEnd'");
        $count = ($res && $row = $res->fetch_assoc()) ? (int)$row['c'] : 0;
        
        $timeChart['labels'][] = $label;
        $timeChart['data'][] = $count;
    }
    $chartData['time_chart'] = $timeChart;

    echo json_encode(['status' => 'success', 'data' => $chartData]);
    exit();
}


/* ─────────────────────────────────────────────
   ACTION: system_logs
   Returns system event logs (logins, errors)
   ───────────────────────────────────────────── */

if ($action === 'system_logs') {
    $logs = [];
    $result = $conn->query(
        "SELECT sl.log_id, sl.event, sl.status, sl.created_at, u.email
         FROM system_logs sl
         LEFT JOIN users u ON sl.user_id = u.user_id
         ORDER BY sl.created_at DESC
         LIMIT 100"
    );

    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $logs[] = [
                'user'   => $row['email'] ?: 'System',
                'date'   => date('Y-m-d', strtotime($row['created_at'])),
                'time'   => date('h:i A', strtotime($row['created_at'])),
                'event'  => $row['event'],
                'status' => $row['status']
            ];
        }
    }

    echo json_encode(['status' => 'success', 'data' => $logs]);
    exit();
}


/* ─────────────────────────────────────────────
   ACTION: audit_trail
   Returns user action audit records
   ───────────────────────────────────────────── */

if ($action === 'audit_trail') {
    $trail = [];
    $result = $conn->query(
        "SELECT at.audit_id, at.action, at.table_affected, at.created_at, u.email
         FROM audit_trail at
         LEFT JOIN users u ON at.user_id = u.user_id
         ORDER BY at.created_at DESC
         LIMIT 100"
    );

    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $trail[] = [
                'user'           => $row['email'] ?: 'Anonymous',
                'action'         => $row['action'],
                'table_affected' => $row['table_affected'],
                'time'           => date('M d, h:i A', strtotime($row['created_at']))
            ];
        }
    }

    echo json_encode(['status' => 'success', 'data' => $trail]);
    exit();
}


/* ─────────────────────────────────────────────
   ACTION: ai_logs
   Returns AI triage usage logs
   ───────────────────────────────────────────── */

if ($action === 'ai_logs') {
    $logs = [];
    $result = $conn->query(
        "SELECT al.log_id, al.action_type, al.details, al.created_at, u.email
         FROM ai_logs al
         LEFT JOIN users u ON al.user_id = u.user_id
         ORDER BY al.created_at DESC
         LIMIT 100"
    );

    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $logs[] = [
                'user'        => $row['email'] ?: 'System',
                'action'      => $row['action_type'],
                'details'     => $row['details'],
                'time'        => date('M d, h:i A', strtotime($row['created_at']))
            ];
        }
    }

    echo json_encode(['status' => 'success', 'data' => $logs]);
    exit();
}


/* ─────────────────────────────────────────────
   ACTION: document_queue
   Returns uploaded medical documents
   ───────────────────────────────────────────── */

if ($action === 'document_queue') {
    $docs = [];
    $result = $conn->query(
        "SELECT dq.doc_id, dq.file_name, dq.uploaded_at,
                CONCAT(p.first_name, ' ', p.last_name) as patient_name
         FROM document_queue dq
         JOIN patients p ON dq.patient_id = p.patient_id
         ORDER BY dq.uploaded_at DESC
         LIMIT 100"
    );

    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $docs[] = [
                'patient' => $row['patient_name'],
                'file'    => $row['file_name'],
                'date'    => date('M d, Y', strtotime($row['uploaded_at']))
            ];
        }
    }

    echo json_encode(['status' => 'success', 'data' => $docs]);
    exit();
}


/* ─────────────────────────────────────────────
   ACTION: feedback
   Returns user feedback and bug reports
   ───────────────────────────────────────────── */

if ($action === 'feedback') {
    $reports = [];
    $result = $conn->query(
        "SELECT fr.report_id, fr.type, fr.message, fr.created_at, u.email
         FROM feedback_reports fr
         LEFT JOIN users u ON fr.user_id = u.user_id
         ORDER BY fr.created_at DESC
         LIMIT 100"
    );

    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $reports[] = [
                'user'    => $row['email'] ?: 'Guest',
                'type'    => $row['type'],
                'message' => $row['message'],
                'date'    => date('M d, Y', strtotime($row['created_at']))
            ];
        }
    }

    echo json_encode(['status' => 'success', 'data' => $reports]);
    exit();
}


/* ─────────────────────────────────────────────
   ACTION: billing
   Returns all invoices
   ───────────────────────────────────────────── */

if ($action === 'billing') {
    $invoices = [];
    $result = $conn->query(
        "SELECT i.invoice_id, i.subtotal, i.tax_amount, i.total_amount, i.status, i.issue_date, i.due_date, i.notes,
                CONCAT(p.first_name, ' ', p.last_name) as patient_name
         FROM invoices i
         JOIN patients p ON i.patient_id = p.patient_id
         ORDER BY i.issue_date DESC"
    );

    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $invoices[] = [
                'id' => $row['invoice_id'],
                'patient' => $row['patient_name'],
                'subtotal' => '$' . number_format($row['subtotal'] ?: $row['total_amount'], 2),
                'tax' => '$' . number_format($row['tax_amount'] ?: 0, 2),
                'amount' => '$' . number_format($row['total_amount'], 2),
                'status' => ucfirst($row['status']),
                'date' => date('M d, Y', strtotime($row['issue_date'])),
                'due_date' => $row['due_date'] ? date('M d, Y', strtotime($row['due_date'])) : 'N/A',
                'notes' => $row['notes'] ?? ''
            ];
        }
    }
    echo json_encode(['status' => 'success', 'data' => $invoices]);
    exit();
}

/* ─────────────────────────────────────────────
   ACTION: create_bill
   Creates a new invoice with hardcoded 10% tax
   ───────────────────────────────────────────── */

if ($action === 'create_bill' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $patient_id = intval($_POST['patient_id'] ?? 0);
    $subtotal = floatval($_POST['amount'] ?? 0);
    $notes = $_POST['notes'] ?? '';
    $sender = $_POST['sender'] ?? ''; 
    $full_notes = "Sender: $sender | " . $notes;
    $adminId = $_SESSION['user_id'];

    // Hardcoded 10% tax — immutable
    $taxRate = 10.00;
    $taxAmount = round($subtotal * ($taxRate / 100), 2);
    $totalAmount = round($subtotal + $taxAmount, 2);

    // Due date: 30 days from now
    $dueDate = date('Y-m-d', strtotime('+30 days'));

    $stmt = $conn->prepare("INSERT INTO invoices (patient_id, admin_id, subtotal, tax_rate, tax_amount, total_amount, status, issue_date, due_date, notes) VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW(), ?, ?)");
    $stmt->bind_param("iiddddss", $patient_id, $adminId, $subtotal, $taxRate, $taxAmount, $totalAmount, $dueDate, $full_notes);
    
    if ($stmt->execute()) {
        echo json_encode([
            'status' => 'success', 
            'message' => 'Bill created successfully',
            'breakdown' => [
                'subtotal' => number_format($subtotal, 2),
                'tax' => number_format($taxAmount, 2),
                'total' => number_format($totalAmount, 2)
            ]
        ]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $stmt->error]);
    }
    $stmt->close();
    exit();
}

/* ─────────────────────────────────────────────
   ACTION: update_invoice_status
   Admin changes an invoice's status
   ───────────────────────────────────────────── */

if ($action === 'update_invoice_status' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $invoiceId = intval($_POST['invoice_id'] ?? 0);
    $newStatus = $_POST['status'] ?? '';
    
    $allowed = ['pending', 'paid', 'cancelled', 'terminated'];
    if (!in_array($newStatus, $allowed)) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid status']);
        exit();
    }

    $paidAt = ($newStatus === 'paid') ? date('Y-m-d H:i:s') : null;

    $stmt = $conn->prepare("UPDATE invoices SET status = ?, paid_at = ? WHERE invoice_id = ?");
    $stmt->bind_param("ssi", $newStatus, $paidAt, $invoiceId);
    
    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Invoice updated to ' . ucfirst($newStatus)]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Database error']);
    }
    $stmt->close();
    exit();
}

/* ─────────────────────────────────────────────
   ACTION: add_staff
   Creates a new doctor account
   ───────────────────────────────────────────── */

if ($action === 'add_staff' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $fname = trim($_POST['fname'] ?? '');
    $lname = trim($_POST['lname'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $pass  = $_POST['password'] ?? '';
    $spec  = trim($_POST['specialization'] ?? 'General Medicine');
    $dept  = (int)($_POST['department'] ?? 1);

    if (empty($fname) || empty($lname) || empty($email) || empty($pass)) {
        echo json_encode(['status' => 'error', 'message' => 'All fields required']);
        exit();
    }

    $conn->begin_transaction();
    try {
        $hashed = password_hash($pass, PASSWORD_DEFAULT);
        $role = 'doctor';
        
        $stmt1 = $conn->prepare("INSERT INTO users (email, hash_password, role) VALUES (?, ?, ?)");
        $stmt1->bind_param("sss", $email, $hashed, $role);
        $stmt1->execute();
        $user_id = $conn->insert_id;
        $stmt1->close();

        require_once 'utils/license_generator.php';
        $licenseNo = generateMedicalLicenseNumber(date('Y'), $fname, $spec, $user_id);

        $stmt2 = $conn->prepare("INSERT INTO doctors (first_name, last_name, specialization, department, user_id, department_id, email, license_number) VALUES (?, ?, ?, 'General', ?, ?, ?, ?)");
        $stmt2->bind_param("sssiiss", $fname, $lname, $spec, $user_id, $dept, $email, $licenseNo);
        $stmt2->execute();
        $stmt2->close();

        $conn->commit();
        echo json_encode(['status' => 'success', 'message' => 'Staff member added successfully']);
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['status' => 'error', 'message' => 'Failed to create staff account. Email may already exist.']);
    }
    exit();
}

/* ─────────────────────────────────────────────
   ACTION: send_notification
   Simulates sending a notification 
   ───────────────────────────────────────────── */

if ($action === 'send_notification' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $sender = $_POST['sender'] ?? 'admin';
    $target = $_POST['target'] ?? '';
    $topic  = $_POST['topic'] ?? '';
    $msg    = $_POST['message'] ?? '';
    
    // First log to system_logs as before
    $event = "Notification Sent by $sender to $target";
    $stmt = $conn->prepare("INSERT INTO system_logs (user_id, event, status, created_at) VALUES (?, ?, 'success', NOW())");
    $stmt->bind_param("is", $_SESSION['user_id'], $event);
    $stmt->execute();
    $stmt->close();

    // Now insert into notifications table
    if ($target === 'all_patients' || $target === 'all_doctors' || $target === 'all_users') {
        // Send to group - target_user_id is NULL, target holds the group name
        $stmt = $conn->prepare("INSERT INTO notifications (sender, target, topic, message) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("ssss", $sender, $target, $topic, $msg);
        $stmt->execute();
        $stmt->close();
    } else {
        // Send to specific email - resolve user_id first
        $user_id = null;
        $stmt = $conn->prepare("SELECT user_id FROM users WHERE email = ?");
        $stmt->bind_param("s", $target);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($row = $res->fetch_assoc()) {
            $user_id = $row['user_id'];
        }
        $stmt->close();
        
        $stmt = $conn->prepare("INSERT INTO notifications (sender, target, target_user_id, topic, message) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("ssiss", $sender, $target, $user_id, $topic, $msg);
        $stmt->execute();
        $stmt->close();
    }

    echo json_encode(['status' => 'success', 'message' => 'Notification successfully dispatched and saved!']);
    exit();
}

/* ─────────────────────────────────────────────
   ACTION: add_patient (POST)
   ───────────────────────────────────────────── */

if (isset($_POST['add_patient'])) {
    $fname = trim($_POST['first_name'] ?? '');
    $lname = trim($_POST['last_name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $cpr = trim($_POST['cpr'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $gender = trim($_POST['gender'] ?? 'Male');
    $blood = trim($_POST['blood_type'] ?? '');

    if (!$fname || !$lname || !$email || strlen($password) < 6) {
        echo json_encode(['status' => 'error', 'message' => 'First name, last name, email, and password (min 6 chars) are required.']);
        exit();
    }

    $conn->begin_transaction();
    try {
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $role = 'patient';
        $stmt1 = $conn->prepare("INSERT INTO users (email, password, role) VALUES (?, ?, ?)");
        $stmt1->bind_param("sss", $email, $hash, $role);
        $stmt1->execute();
        $user_id = $conn->insert_id;
        $stmt1->close();

        $stmt2 = $conn->prepare("INSERT INTO patients (first_name, last_name, cpr, gender, phone, blood_type, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt2->bind_param("ssssssi", $fname, $lname, $cpr, $gender, $phone, $blood, $user_id);
        $stmt2->execute();
        $stmt2->close();

        $conn->commit();
        echo json_encode(['status' => 'success', 'message' => 'Patient added successfully.']);
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['status' => 'error', 'message' => 'Failed to add patient. Email may already exist.']);
    }
    exit();
}

/* ─────────────────────────────────────────────
   ACTION: update_patient (POST)
   ───────────────────────────────────────────── */

if (isset($_POST['update_patient'])) {
    $pid = intval($_POST['patient_id'] ?? 0);
    $fname = trim($_POST['first_name'] ?? '');
    $lname = trim($_POST['last_name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $cpr = trim($_POST['cpr'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $gender = trim($_POST['gender'] ?? 'Male');
    $blood = trim($_POST['blood_type'] ?? '');

    $stmt = $conn->prepare("UPDATE patients SET first_name=?, last_name=?, cpr=?, gender=?, phone=?, blood_type=? WHERE patient_id=?");
    $stmt->bind_param("ssssssi", $fname, $lname, $cpr, $gender, $phone, $blood, $pid);
    $stmt->execute();
    $stmt->close();

    // Also update email in users table
    $stmt2 = $conn->prepare("UPDATE users SET email=? WHERE user_id = (SELECT user_id FROM patients WHERE patient_id=?)");
    $stmt2->bind_param("si", $email, $pid);
    $stmt2->execute();
    $stmt2->close();

    echo json_encode(['status' => 'success', 'message' => 'Patient updated successfully.']);
    exit();
}

/* ─────────────────────────────────────────────
   ACTION: delete_patient (POST)
   ───────────────────────────────────────────── */

if (isset($_POST['delete_patient'])) {
    $pid = intval($_POST['patient_id'] ?? 0);
    $result = $conn->query("SELECT user_id FROM patients WHERE patient_id=$pid");
    if ($row = $result->fetch_assoc()) {
        $uid = $row['user_id'];
        
        $conn->begin_transaction();
        try {
            $conn->query("SET FOREIGN_KEY_CHECKS=0");

            // Helper: safely delete from a table (ignores if table doesn't exist)
            $safeDelete = function($sql) use ($conn) {
                try { $conn->query($sql); } catch (Exception $e) { /* table may not exist */ }
            };

            // Clean up related tables (some may not exist in all installations)
            $safeDelete("DELETE FROM tickets WHERE patient_id=$pid");
            $safeDelete("DELETE FROM patient_vitals WHERE patient_id=$pid");
            $safeDelete("DELETE FROM emergency_contacts WHERE patient_id=$pid");
            $safeDelete("DELETE FROM admissions WHERE patient_id=$pid");
            $safeDelete("DELETE FROM allergies WHERE patient_id=$pid");

            $safeDelete("DELETE FROM invoice_items WHERE invoice_id IN (SELECT invoice_id FROM invoices WHERE patient_id=$pid)");
            $safeDelete("DELETE FROM payments WHERE invoice_id IN (SELECT invoice_id FROM invoices WHERE patient_id=$pid)");
            $safeDelete("DELETE FROM invoices WHERE patient_id=$pid");

            // Core medical data (these tables definitely exist)
            $safeDelete("DELETE FROM prescriptions WHERE record_id IN (SELECT record_id FROM medical_records WHERE patient_id=$pid)");
            $safeDelete("DELETE FROM diagnoses WHERE record_id IN (SELECT record_id FROM medical_records WHERE patient_id=$pid)");
            $safeDelete("DELETE FROM lab_results WHERE record_id IN (SELECT record_id FROM medical_records WHERE patient_id=$pid)");
            $safeDelete("DELETE FROM medical_records WHERE patient_id=$pid");

            $safeDelete("DELETE FROM document_queue WHERE patient_id=$pid");
            $safeDelete("DELETE FROM appointments WHERE patient_id=$pid");

            $safeDelete("DELETE FROM feedback_reports WHERE user_id=$uid");
            $safeDelete("DELETE FROM ai_logs WHERE user_id=$uid");
            $safeDelete("DELETE FROM audit_trail WHERE user_id=$uid");
            $safeDelete("DELETE FROM notifications WHERE target_user_id=$uid");
            $safeDelete("DELETE FROM system_logs WHERE user_id=$uid");

            // Finally delete the patient and user records
            $conn->query("DELETE FROM patients WHERE patient_id=$pid");
            $conn->query("DELETE FROM users WHERE user_id=$uid");

            $conn->query("SET FOREIGN_KEY_CHECKS=1");
            $conn->commit();
            echo json_encode(['status' => 'success', 'message' => 'Patient deleted successfully.']);
        } catch (Exception $e) {
            $conn->rollback();
            $conn->query("SET FOREIGN_KEY_CHECKS=1");
            echo json_encode(['status' => 'error', 'message' => 'Error: ' . $e->getMessage()]);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Patient not found.']);
    }
    exit();
}

/* ─────────────────────────────────────────────
   ACTION: update_staff (POST)
   ───────────────────────────────────────────── */

if (isset($_POST['update_staff'])) {
    $did = intval($_POST['doctor_id'] ?? 0);
    $fname = trim($_POST['first_name'] ?? '');
    $lname = trim($_POST['last_name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $spec = trim($_POST['specialization'] ?? '');

    $stmt = $conn->prepare("UPDATE doctors SET first_name=?, last_name=?, specialization=?, phone=? WHERE doctor_id=?");
    $stmt->bind_param("ssssi", $fname, $lname, $spec, $phone, $did);
    $stmt->execute();
    $stmt->close();

    // Also update email in users table
    $stmt2 = $conn->prepare("UPDATE users SET email=? WHERE user_id = (SELECT user_id FROM doctors WHERE doctor_id=?)");
    $stmt2->bind_param("si", $email, $did);
    $stmt2->execute();
    $stmt2->close();

    echo json_encode(['status' => 'success', 'message' => 'Staff updated successfully.']);
    exit();
}

/* ─────────────────────────────────────────────
   ACTION: delete_staff (POST)
   ───────────────────────────────────────────── */

if (isset($_POST['delete_staff'])) {
    $did = intval($_POST['doctor_id'] ?? 0);
    $result = $conn->query("SELECT user_id FROM doctors WHERE doctor_id=$did");
    if ($row = $result->fetch_assoc()) {
        $uid = $row['user_id'];
        
        mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
        $conn->begin_transaction();
        try {
            $conn->query("SET FOREIGN_KEY_CHECKS=0");

            $conn->query("UPDATE medical_records SET doctor_id=NULL WHERE doctor_id=$did");
            $conn->query("UPDATE prescriptions SET doctor_id=NULL WHERE doctor_id=$did");
            $conn->query("UPDATE appointments SET doctor_id=NULL WHERE doctor_id=$did");
            $conn->query("UPDATE admissions SET admitting_doctor_id=NULL WHERE admitting_doctor_id=$did");
            $conn->query("UPDATE tickets SET doctor_id=NULL WHERE doctor_id=$did");
            
            $conn->query("DELETE FROM doctor_schedules WHERE doctor_id=$did");

            $conn->query("DELETE FROM feedback_reports WHERE user_id=$uid");
            $conn->query("DELETE FROM ai_logs WHERE user_id=$uid");
            $conn->query("DELETE FROM audit_trail WHERE user_id=$uid");
            $conn->query("DELETE FROM notifications WHERE target_user_id=$uid OR target=(SELECT email FROM users WHERE user_id=$uid)");
            $conn->query("DELETE FROM system_logs WHERE user_id=$uid");

            $conn->query("DELETE FROM doctors WHERE doctor_id=$did");
            $conn->query("DELETE FROM users WHERE user_id=$uid");

            $conn->query("SET FOREIGN_KEY_CHECKS=1");
            $conn->commit();
            echo json_encode(['status' => 'success', 'message' => 'Staff member deleted successfully.']);
        } catch (Exception $e) {
            $conn->rollback();
            $conn->query("SET FOREIGN_KEY_CHECKS=1");
            echo json_encode(['status' => 'error', 'message' => 'Error: ' . $e->getMessage()]);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Staff member not found.']);
    }
    exit();
}

/* ─────────────────────────────────────────────
   Unknown action — return an error
   ───────────────────────────────────────────── */

echo json_encode(['status' => 'error', 'message' => "Unknown action: $action"]);
?>
