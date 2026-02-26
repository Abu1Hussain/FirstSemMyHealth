<?php
/*
 * ═══════════════════════════════════════════════════════════
 * Appointment Booking Handler
 * ═══════════════════════════════════════════════════════════
 *
 * Handles creating new appointments for patients.
 *
 * Features:
 *   - AI triage via OpenAI (assigns priority based on symptoms)
 *   - Keyword-based fallback if OpenAI is unavailable
 *   - Doctor selection with capacity checks
 *   - Automatic time slot assignment (9 AM — 5 PM)
 *   - Queue number assignment
 *   - File upload support for medical documents
 *
 * Connected to: Ai/ai_config.php (OpenAI helper)
 *
 * SECURITY: All database queries use prepared statements
 *           to prevent SQL injection attacks.
 * ═══════════════════════════════════════════════════════════
 */

session_start();
header('Content-Type: application/json');

/* ── Connect to the database and AI config ── */
require_once '../DataBase/db_connect.php';
require_once '../Ai/ai_config.php';

/* ── Make sure the user is logged in ── */
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Please log in first.']);
    exit();
}


/* ══════════════════════════════════════════════════════
   TAKE A TICKET (Walk-in / Immediate)
   ══════════════════════════════════════════════════════ */

if (isset($_POST['take_ticket'])) {
    $userId    = $_SESSION['user_id'];
    $requestDate = date('Y-m-d');
    $doctorIdVal = $_POST['doctor_id'] ?? null;
    $selectedTime = $_POST['selected_time'] ?? null; // e.g. "14:00:00"

    // Look up the patient profile
    $stmt = $conn->prepare("SELECT patient_id FROM patients WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $patientResult = $stmt->get_result();

    if (!$patientResult || $patientResult->num_rows === 0) {
        $stmt->close();
        echo json_encode(['status' => 'error', 'message' => 'Patient profile not found.']);
        exit();
    }
    $patientId = $patientResult->fetch_assoc()['patient_id'];
    $stmt->close();

    // --- Daily Ticket Limit (Max 2 per day) ---
    $limitCheckSql = "SELECT COUNT(*) as ticket_count FROM appointments WHERE patient_id = ? AND DATE(appointment_date) = ?";
    $stmt = $conn->prepare($limitCheckSql);
    $stmt->bind_param("is", $patientId, $requestDate);
    $stmt->execute();
    $ticketCount = $stmt->get_result()->fetch_assoc()['ticket_count'] ?? 0;
    $stmt->close();

    if ($ticketCount >= 2) {
        echo json_encode(['status' => 'error', 'message' => 'Daily limit reached. You can only take 2 tickets per day.']);
        exit();
    }

    // --- Handle Time Selection ---
    $currentHour = (int)date('H');
    if ($selectedTime) {
        $hour = (int)explode(':', $selectedTime)[0];
        $slotStart = "$requestDate " . $selectedTime;
    } else {
        // If before 9 AM, default to the first opening slot (9 AM)
        if ($currentHour < 9) {
            $hour = 9;
        } else if ($currentHour >= 17) {
            echo json_encode(['status' => 'error', 'message' => 'Clinic is closed. Please come back tomorrow.']);
            exit();
        } else {
            $hour = $currentHour;
        }
        $slotStart = "$requestDate " . str_pad($hour, 2, '0', STR_PAD_LEFT) . ":00:00";
    }
    
    // Calculate Daily Queue Number
    $dailyCountSql = "SELECT COUNT(*) as daily_total FROM appointments WHERE DATE(appointment_date) = ?";
    $stmt = $conn->prepare($dailyCountSql);
    $stmt->bind_param("s", $requestDate);
    $stmt->execute();
    $dailyTotal = $stmt->get_result()->fetch_assoc()['daily_total'] ?? 0;
    $stmt->close();

    $newQueueNumber = $dailyTotal + 1;

    // Calculate Letter based on Hour (9=A, 10=B, etc.)
    $letter = chr(ord('A') + ($hour - 9)); 
    $ticketCode = $letter . '-' . str_pad($newQueueNumber, 2, '0', STR_PAD_LEFT);

    // Insert Appointment
    $stmt = $conn->prepare(
        "INSERT INTO appointments
         (patient_id, doctor_id, appointment_date, appointment_type, status, reason, ai_priority, ai_suggestion, queue_number, created_by)
         VALUES (?, ?, ?, 'Walk-in', 'pending', 'Walk-in Ticket', 'Normal', ?, ?, ?)"
    );

    $dIdVal = $doctorIdVal ? $doctorIdVal : null;
    $aiSugDummy = 'Walk-in automated ticket.';
    // Parameters: patient_id (i), doctor_id (i), appointment_date (s), ai_suggestion (s), queue_number (i), created_by (i)
    $stmt->bind_param("iisssi", $patientId, $dIdVal, $slotStart, $aiSugDummy, $newQueueNumber, $userId);


    if ($stmt->execute()) {
        // Log the event
        $logMsg = "Ticket Generated: $ticketCode at $slotStart";
        $stmtLog = $conn->prepare("INSERT INTO system_logs (user_id, event, status) VALUES (?, ?, 'info')");
        $stmtLog->bind_param("is", $userId, $logMsg);
        $stmtLog->execute();
        $stmtLog->close();

        // --- NEW: Insert into TICKETS table ---
        $apptId = $conn->insert_id;
        $stmtTick = $conn->prepare("INSERT INTO tickets (patient_id, appointment_id, doctor_id, ticket_code) VALUES (?, ?, ?, ?)");
        $stmtTick->bind_param("iiis", $patientId, $apptId, $dIdVal, $ticketCode);
        $stmtTick->execute();
        $stmtTick->close();

        echo json_encode([
            'status'        => 'success',
            'ticket_number' => $ticketCode,
            'message'       => 'Ticket generated successfully.'
        ]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to generate ticket.']);
    }
    $stmt->close();
    exit();
}


/* ══════════════════════════════════════════════════════
   BOOK A NEW APPOINTMENT
   ══════════════════════════════════════════════════════ */

if (isset($_POST['book_appointment'])) {

    $userId = $_SESSION['user_id'];
    $reason = trim($_POST['reason'] ?? '');

    $userRole = $_SESSION['user_role'] ?? 'patient';
    $patientId = null;

    if ($userRole === 'admin' && isset($_POST['patient_id'])) {
        // Admin booking for a specific patient
        $patientId = $_POST['patient_id'];
    } else {
        // Look up the patient profile for this user
        $stmt = $conn->prepare("SELECT patient_id FROM patients WHERE user_id = ?");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $patientResult = $stmt->get_result();

        if (!$patientResult || $patientResult->num_rows === 0) {
            $stmt->close();
            echo json_encode(['status' => 'error', 'message' => 'Patient profile not found. Please contact support.']);
            exit();
        }

        $patientId = $patientResult->fetch_assoc()['patient_id'];
        $stmt->close();
    }


    /* ── AI Triage: Determine Priority via OpenAI ── */
    /*
     * We send the patient's symptoms to OpenAI and ask it to
     * classify the urgency. If OpenAI is unavailable, we fall
     * back to a simple keyword-based system.
     */

    $priority     = 'Normal';
    $aiSuggestion = 'Regular checkup schedule applies.';

    // Build the system prompt for OpenAI
    $systemPrompt = "You are a medical triage AI. Analyze the patient's symptoms and return JSON with:
1. \"priority\" – one of: \"Highly Important\", \"Important\", or \"Normal\"
2. \"suggestion\" – a short sentence advising what the patient should do (max 2 sentences)

Rules:
- Chest pain, breathing difficulty, severe bleeding → Highly Important
- Fever, persistent pain, infection, vomiting → Important
- Routine checkups, mild symptoms → Normal

Return ONLY valid JSON. Example: {\"priority\": \"Important\", \"suggestion\": \"Schedule within 24 hours.\"}";

    $userMessage = "Patient symptoms: " . $reason;
    $aiReplyText = callOpenAI($systemPrompt, $userMessage);

    if ($aiReplyText) {
        // Try to parse the JSON from OpenAI
        $aiResult = json_decode($aiReplyText, true);

        if ($aiResult && isset($aiResult['priority'])) {
            $priority     = $aiResult['priority'];
            $aiSuggestion = $aiResult['suggestion'] ?? $aiSuggestion;
        } else {
            // OpenAI returned something unexpected — use keyword fallback
            $priority     = keywordFallbackPriority($reason);
            $aiSuggestion = 'AI returned unexpected format. Priority set by keywords.';
        }
    } else {
        // API call failed — use keyword fallback
        $priority     = keywordFallbackPriority($reason);
        $aiSuggestion = 'AI service unavailable. Priority set by keyword analysis.';
    }


    /* ── Doctor Selection ── */

    $requestDate = $_POST['date'] ?? date('Y-m-d');
    $doctorId    = $_POST['doctor_id'] ?? null;
    $doctorName  = "General Doctor";
    $capacity    = 4;  // Default chairs per hour (logical max)

    if ($doctorId) {
        // Look up the selected doctor's name and capacity
        $stmt = $conn->prepare(
            "SELECT CONCAT(first_name, ' ', last_name) as name, capacity
             FROM doctors
             WHERE doctor_id = ?"
        );
        $stmt->bind_param("i", $doctorId);
        $stmt->execute();
        if ($doctorData = $stmt->get_result()->fetch_assoc()) {
            $doctorName = $doctorData['name'];
            $capacity   = $doctorData['capacity'];
        }
        $stmt->close();
    }


    /* ── Find an Available Time Slot ── */

    $assignedTime = null;
    $queueNumber  = 0;
    $startHour    = 9;
    $endHour      = 17;
    $selectedTimePost = $_POST['selected_time'] ?? null;

    if ($selectedTimePost) {
        // User selected a specific time (e.g. "14:00:00")
        // Combine date and time
        $requestedSlotStart = "$requestDate " . $selectedTimePost;
        
        // Validate it's within bounds
        $reqHour = (int)explode(':', $selectedTimePost)[0];
        if ($reqHour < $startHour || $reqHour >= $endHour) {
            echo json_encode(['status' => 'error', 'message' => "Selected time is outside clinic hours."]);
            exit();
        }

        $slotStart = $requestedSlotStart;
        $slotEnd   = date('Y-m-d H:i:s', strtotime($slotStart . ' +1 hour'));

        // Check availability for this specific slot
        if ($doctorId) {
            $stmt = $conn->prepare("SELECT COUNT(*) as booked FROM appointments WHERE appointment_date >= ? AND appointment_date < ? AND doctor_id = ?");
            $stmt->bind_param("ssi", $slotStart, $slotEnd, $doctorId);
        } else {
            $stmt = $conn->prepare("SELECT COUNT(*) as booked FROM appointments WHERE appointment_date >= ? AND appointment_date < ?");
            $stmt->bind_param("ss", $slotStart, $slotEnd);
        }
        $stmt->execute();
        $bookedCount = $stmt->get_result()->fetch_assoc()['booked'];
        $stmt->close();

        if ($bookedCount < $capacity) {
            $assignedTime = $slotStart;
            // queueNumber calculated later based on daily total
        } else {
            echo json_encode(['status' => 'error', 'message' => "Selected time slot is fully booked. Please choose another."]);
            exit();
        }

    } else {
        // Fallback: Auto-assign logic (First available)
        for ($hour = $startHour; $hour < $endHour; $hour++) {
            $slotStart = "$requestDate " . str_pad($hour, 2, '0', STR_PAD_LEFT) . ":00:00";
            $slotEnd   = "$requestDate " . str_pad($hour + 1, 2, '0', STR_PAD_LEFT) . ":00:00";

            // Count existing appointments in this slot
            if ($doctorId) {
                $stmt = $conn->prepare(
                    "SELECT COUNT(*) as booked FROM appointments
                     WHERE appointment_date >= ? AND appointment_date < ? AND doctor_id = ?"
                );
                $stmt->bind_param("ssi", $slotStart, $slotEnd, $doctorId);
            } else {
                $stmt = $conn->prepare(
                    "SELECT COUNT(*) as booked FROM appointments
                     WHERE appointment_date >= ? AND appointment_date < ?"
                );
                $stmt->bind_param("ss", $slotStart, $slotEnd);
            }

            $stmt->execute();
            $bookedCount = $stmt->get_result()->fetch_assoc()['booked'];
            $stmt->close();

            // If there's room in this slot, assign it
            if ($bookedCount < $capacity) {
                $assignedTime = $slotStart;
                // queueNumber calculated later
                break;
            }
        }
    }

    // If no slot was found, the doctor is fully booked
    if (!$assignedTime) {
        echo json_encode([
            'status'  => 'error',
            'message' => "Sorry, $doctorName is fully booked on $requestDate. Please try a different date or doctor."
        ]);
        exit();
    }

    // Calculate Daily Queue Number
    $dailyCountSql = "SELECT COUNT(*) as daily_total FROM appointments WHERE DATE(appointment_date) = ?";
    $stmt = $conn->prepare($dailyCountSql);
    $stmt->bind_param("s", $requestDate);
    $stmt->execute();
    $dailyTotal = $stmt->get_result()->fetch_assoc()['daily_total'] ?? 0;
    $stmt->close();

    $queueNumber = $dailyTotal + 1;


    /* ── Handle Document Upload (if any) ── */

    $filePath = '';
    if (isset($_FILES['document']) && $_FILES['document']['error'] === 0) {
        $uploadDir = '../uploads/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        // Add timestamp to filename to avoid conflicts
        $fileName = time() . '_' . basename($_FILES['document']['name']);
        move_uploaded_file($_FILES['document']['tmp_name'], $uploadDir . $fileName);
        $filePath = $fileName;
    }


    /* ── Save the Appointment to the Database ── */

    $stmt = $conn->prepare(
        "INSERT INTO appointments
         (patient_id, doctor_id, appointment_date, appointment_type, status, reason, ai_priority, ai_suggestion, queue_number, created_by)
         VALUES (?, ?, ?, 'General', 'pending', ?, ?, ?, ?, ?)"
    );

    // If no doctor was selected, doctor_id will be NULL
    if ($doctorId) {
        $stmt->bind_param("iissssii", $patientId, $doctorId, $assignedTime, $reason, $priority, $aiSuggestion, $queueNumber, $userId);
    } else {
        $nullDoctor = null;
        $stmt->bind_param("iissssii", $patientId, $nullDoctor, $assignedTime, $reason, $priority, $aiSuggestion, $queueNumber, $userId);
    }

    if ($stmt->execute()) {
        $apptId = $conn->insert_id;

        // --- NEW: Insert into TICKETS table for Booked Appointment ---
        // Reuse ticket code logic
        $hour = (int)date('H', strtotime($assignedTime));
        $letter = chr(ord('A') + ($hour - 9)); 
        $ticketCode = $letter . '-' . str_pad($queueNumber, 2, '0', STR_PAD_LEFT);

        $stmtTick = $conn->prepare("INSERT INTO tickets (patient_id, appointment_id, doctor_id, ticket_code) VALUES (?, ?, ?, ?)");
        $stmtTick->bind_param("iiis", $patientId, $apptId, $doctorId, $ticketCode);
        $stmtTick->execute();
        $stmtTick->close();

        echo json_encode([
            'status'  => 'success',
            'message' => "Appointment booked successfully! AI Priority: $priority. Ticket: $ticketCode"
        ]);
    } else {
        echo json_encode([
            'status'  => 'error',
            'message' => "Failed to book appointment. Please try again."
        ]);
    }
    $stmt->close();
    exit();
}



/* ══════════════════════════════════════════════════════
   TERMINATE APPOINTMENT
   ══════════════════════════════════════════════════════ */

if (isset($_POST['terminate_appointment'])) {
    $userId = $_SESSION['user_id'];
    $userRole = $_SESSION['user_role'] ?? 'patient';
    $apptId = $_POST['appointment_id'] ?? null;
    $today = date('Y-m-d');

    if (!$apptId) {
        echo json_encode(['status' => 'error', 'message' => 'Appointment ID is required.']);
        exit();
    }

    // --- Daily Cancellation Limit Removed ---
    // User can now cancel unlimited times per day as requested.


    // --- Verify Ownership and Fetch Info for Archival ---
    $checkSql = "SELECT a.patient_id, a.doctor_id, p.user_id, 
                        CONCAT(ms.first_name, ' ', ms.last_name) as doctor_name
                 FROM appointments a
                 JOIN patients p ON a.patient_id = p.patient_id
                 LEFT JOIN doctors ms ON a.doctor_id = ms.doctor_id
                 WHERE a.appointment_id = ?";
    $stmtCheck = $conn->prepare($checkSql);
    $stmtCheck->bind_param("i", $apptId);
    $stmtCheck->execute();
    $apptInfo = $stmtCheck->get_result()->fetch_assoc();
    $stmtCheck->close();

    if (!$apptInfo) {
        echo json_encode(['status' => 'error', 'message' => 'Appointment not found.']);
        exit();
    }

    // Authorization Check
    if ($userRole !== 'admin' && $apptInfo['user_id'] != $userId) {
        echo json_encode(['status' => 'error', 'message' => 'Unauthorized access.']);
        exit();
    }

    // --- Create Medical Record Entry (Archive) ---
    $pId = $apptInfo['patient_id'];
    $dId = $apptInfo['doctor_id'];
    if (!$dId) {
        // Fallback: Get the first available staff member if none assigned
        $fallbackRes = $conn->query("SELECT doctor_id FROM doctors LIMIT 1");
        $dId = ($fallbackRes && $row = $fallbackRes->fetch_assoc()) ? $row['doctor_id'] : null;
    }
    $docName = $apptInfo['doctor_name'] ?? 'General Doctor';
    $summary = "Terminated (Dr. " . $docName . ")";

    
    $recordSql = "INSERT INTO medical_records (patient_id, doctor_id, record_date, record_type, summary) 
                  VALUES (?, ?, NOW(), '', ?)";
    $stmtRec = $conn->prepare($recordSql);
    $stmtRec->bind_param("iis", $pId, $dId, $summary);
    $stmtRec->execute();
    $stmtRec->close();

    // --- Perform Final Termination (Update to 'terminated' status) ---
    $stmt = $conn->prepare("UPDATE appointments SET status = 'terminated' WHERE appointment_id = ?");
    $stmt->bind_param("i", $apptId);

    if ($stmt->execute()) {
        $msg = ($userRole === 'admin') ? 'Appointment deleted successfully.' : 'Appointment terminated successfully.';
        
        // Log the cancellation
        $logMsg = "Appointment $apptId Cancelled by User $userId";
        $stmtLog = $conn->prepare("INSERT INTO system_logs (user_id, event, status) VALUES (?, ?, 'warning')");
        $stmtLog->bind_param("is", $userId, $logMsg);
        $stmtLog->execute();
        $stmtLog->close();

        echo json_encode(['status' => 'success', 'message' => $msg]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to process termination request.']);
    }
    $stmt->close();
    exit();
}


/* ═════════════════════════════════════════════════════
   keywordFallbackPriority($symptoms)

   Simple keyword-based fallback if OpenAI is unavailable.
   Scans the symptom text for urgent/important keywords
   and returns the appropriate priority level.
   ═════════════════════════════════════════════════════ */

function keywordFallbackPriority($symptoms) {
    $lowerSymptoms = strtolower($symptoms);

    // Words that indicate an urgent/emergency situation
    $urgentWords = ['chest pain', 'breathing', 'unconscious', 'bleeding', 'heart', 'stroke', 'emergency'];
    foreach ($urgentWords as $word) {
        if (strpos($lowerSymptoms, $word) !== false) {
            return 'Highly Important';
        }
    }

    // Words that indicate a moderately serious situation
    $importantWords = ['fever', 'pain', 'infection', 'vomiting', 'sick', 'swelling', 'injury'];
    foreach ($importantWords as $word) {
        if (strpos($lowerSymptoms, $word) !== false) {
            return 'Important';
        }
    }

    // Everything else is routine
    return 'Normal';
}
?>
