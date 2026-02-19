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
require_once '../DataBase/db_connect.php';

/* ── Make sure the user is logged in AND is an admin ── */
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'admin') {
    echo json_encode(['status' => 'error', 'message' => 'Admin access required.']);
    exit();
}


/* ═══════════════════════════════
   Determine which tab the admin
   is asking data for
   ═══════════════════════════════ */

$action = $_GET['action'] ?? 'dashboard';


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
        'total_doctors'       => "SELECT COUNT(*) as c FROM medical_staff",
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
    $result = $conn->query("SELECT user_id, email, role, created_at FROM users ORDER BY user_id");

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
                 FROM medical_staff WHERE user_id = ?"
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
        "SELECT ms.staff_id as id, ms.staff_id, CONCAT(ms.first_name, ' ', ms.last_name) as name,
                ms.first_name, ms.last_name, ms.specialization,
                ms.department, ms.phone, ms.profile_image, ms.capacity, u.email
         FROM medical_staff ms
         JOIN users u ON ms.user_id = u.user_id
         ORDER BY ms.staff_id"
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
         LEFT JOIN medical_staff ms ON a.staff_id = ms.staff_id
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
         LEFT JOIN medical_staff ms ON mr.created_by = ms.staff_id
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
         LEFT JOIN medical_staff ms ON mr.created_by = ms.staff_id
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

    // Appointments by status (for a pie chart)
    $statusCounts = [];
    $result = $conn->query(
        "SELECT status, COUNT(*) as count
         FROM appointments
         GROUP BY status"
    );
    while ($row = $result->fetch_assoc()) {
        $statusCounts[$row['status']] = $row['count'];
    }
    $chartData['appointment_statuses'] = $statusCounts;

    // Patients by blood type (for a bar chart)
    $bloodTypes = [];
    $result = $conn->query(
        "SELECT blood_type, COUNT(*) as count
         FROM patients
         WHERE blood_type IS NOT NULL
         GROUP BY blood_type"
    );
    while ($row = $result->fetch_assoc()) {
        $bloodTypes[$row['blood_type']] = $row['count'];
    }
    $chartData['blood_types'] = $bloodTypes;

    // Appointments per day this week (for a line chart)
    $weeklyAppointments = [];
    for ($i = 6; $i >= 0; $i--) {
        $day = date('Y-m-d', strtotime("-$i days"));
        $result = $conn->query(
            "SELECT COUNT(*) as count FROM appointments
             WHERE DATE(appointment_date) = '$day'"
        );
        $count = ($result && $row = $result->fetch_assoc()) ? $row['count'] : 0;
        $weeklyAppointments[date('D', strtotime($day))] = $count;
    }
    $chartData['weekly_appointments'] = $weeklyAppointments;

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
            $logs[] = $row;
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
            $trail[] = $row;
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
            $logs[] = $row;
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
            $docs[] = $row;
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
            $reports[] = $row;
        }
    }

    echo json_encode(['status' => 'success', 'data' => $reports]);
    exit();
}


/* ─────────────────────────────────────────────
   Unknown action — return an error
   ───────────────────────────────────────────── */

echo json_encode(['status' => 'error', 'message' => "Unknown action: $action"]);
?>
