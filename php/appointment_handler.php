<?php
ob_start();
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
require_once __DIR__ . '/../DataBase/db_connect.php';
require_once __DIR__ . '/../Ai/ai_config.php';

/* ── Make sure the user is logged in (with fallback demo session) ── */
if (!isset($_SESSION['user_id'])) {
    $_SESSION['user_id'] = 3001;
    $_SESSION['patient_id'] = 6001;
    $_SESSION['user_role'] = 'patient';
    $_SESSION['user_name'] = 'Patient One';
}


/* ══════════════════════════════════════════════════════
   END-OF-DAY BOOKING BLOCK (SHIFT 2 CUTOFF)
   ══════════════════════════════════════════════════════ */
if (isset($_POST['take_ticket']) || isset($_POST['book_appointment'])) {
    $currentHour = (int)date('H');
    $currentMinute = (int)date('i');
    if ($currentHour === 0 && $currentMinute >= 50) {
        ob_clean(); echo json_encode(['status' => 'error', 'message' => "Booking is closed for the day. Please check tomorrow's availability."]);
        exit();
    }
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
        ob_clean(); echo json_encode(['status' => 'error', 'message' => 'Patient profile not found.']);
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
        ob_clean(); echo json_encode(['status' => 'error', 'message' => 'Daily limit reached. You can only take 2 tickets per day.']);
        exit();
    }

    // --- Handle Time Selection & Midnight Crossover ---
    $currentHour = (int)date('H');
    $clinicDate = ($currentHour < 9) ? date('Y-m-d', strtotime('-1 day')) : date('Y-m-d');

    if ($selectedTime) {
        $hour = (int)explode(':', $selectedTime)[0];
        $slotDate = $clinicDate;
        if ($hour < 9) {
            $slotDate = date('Y-m-d', strtotime($clinicDate . ' +1 day'));
        }
        $slotStart = "$slotDate " . $selectedTime;
    } else {
        // If before 9 AM, default to the first opening slot (9 AM)
        if ($currentHour < 9) {
            $hour = 9;
        } else if ($currentHour >= 17) {
            ob_clean(); echo json_encode(['status' => 'error', 'message' => 'Clinic is closed. Please come back tomorrow.']);
            exit();
        } else {
            $hour = $currentHour;
        }
        $slotDate = ($hour < 9) ? date('Y-m-d', strtotime($clinicDate . ' +1 day')) : $clinicDate;
        $slotStart = "$slotDate " . str_pad($hour, 2, '0', STR_PAD_LEFT) . ":00:00";
    }

    $reqTimestamp = strtotime($slotStart);
    $currentTimestampHour = strtotime(date('Y-m-d H:00:00'));
    if ($reqTimestamp < $currentTimestampHour) {
        ob_clean(); echo json_encode(['status' => 'error', 'message' => "Selected time slot is in the past."]);
        exit();
    }
    
    // Calculate Daily Queue Number based on the actual slot date
    $dailyCountSql = "SELECT COUNT(*) as daily_total FROM appointments WHERE DATE(appointment_date) = ?";
    $stmt = $conn->prepare($dailyCountSql);
    $stmt->bind_param("s", $slotDate);
    $stmt->execute();
    $dailyTotal = $stmt->get_result()->fetch_assoc()['daily_total'] ?? 0;
    $stmt->close();

    $newQueueNumber = $dailyTotal + 1;

    $priorityParam = $_POST['priority'] ?? 'Standard';

    // Calculate Letter based on Hour (9=A, 10=B, etc., up to 0=P)
    $effectiveHour = ($hour < 9) ? $hour + 24 : $hour;
    $letter = chr(ord('A') + ($effectiveHour - 9)); 
    $ticketCode = $letter . '-' . str_pad($newQueueNumber, 2, '0', STR_PAD_LEFT);

    // Insert Appointment
    $stmt = $conn->prepare(
        "INSERT INTO appointments
         (patient_id, doctor_id, appointment_date, appointment_type, status, reason, ai_priority, ai_suggestion, queue_number, created_by)
         VALUES (?, ?, ?, 'Walk-in', 'pending', 'Walk-in Ticket', ?, ?, ?, ?)"
    );

    // GP Auto-Assignment
    $reqDoctorId = $_POST['doctor_id'] ?? null;
    if (!empty($reqDoctorId)) {
        $dIdVal = $reqDoctorId;
    } else {
        $stmtGP = $conn->prepare("SELECT doctor_id FROM doctors WHERE specialization LIKE '%General%' OR department LIKE '%General%' LIMIT 1");
        $stmtGP->execute();
        $gpResult = $stmtGP->get_result();
        $dIdVal = ($gpResult && $gpResult->num_rows > 0) ? $gpResult->fetch_assoc()['doctor_id'] : 1;
        $stmtGP->close();
    }

    $aiSugDummy = 'Walk-in automated ticket (Auto-assigned GP).';
    $stmt->bind_param("iisssii", $patientId, $dIdVal, $slotStart, $priorityParam, $aiSugDummy, $newQueueNumber, $userId);


    if ($stmt->execute()) {
        $apptId = $conn->insert_id; // Capture ID IMMEDIATELY

        // Log the event
        $logMsg = "Ticket Generated: $ticketCode at $slotStart";
        $stmtLog = $conn->prepare("INSERT INTO system_logs (user_id, event, status) VALUES (?, ?, 'info')");
        $stmtLog->bind_param("is", $userId, $logMsg);
        $stmtLog->execute();
        $stmtLog->close();

        // --- NEW: Insert into TICKETS table ---
        $stmtTick = $conn->prepare("INSERT INTO tickets (patient_id, appointment_id, doctor_id, ticket_code) VALUES (?, ?, ?, ?)");
        $stmtTick->bind_param("iiis", $patientId, $apptId, $dIdVal, $ticketCode);
        $stmtTick->execute();
        $stmtTick->close();

        ob_clean(); echo json_encode([
            'status'        => 'success',
            'ticket_number' => $ticketCode,
            'message'       => 'Ticket generated successfully.'
        ]);
    } else {
        ob_clean(); echo json_encode(['status' => 'error', 'message' => 'Failed to generate ticket.']);
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
            ob_clean(); echo json_encode(['status' => 'error', 'message' => 'Patient profile not found. Please contact support.']);
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
1. \"priority\" – MUST be one of: \"Fast/Hard\", \"Medium\", or \"Normal\"
2. \"suggestion\" – a short sentence advising what the patient should do (max 2 sentences)

Rules:
- Chest pain, breathing difficulty, severe bleeding → Fast/Hard
- Fever, persistent pain, infection, vomiting → Medium
- Routine checkups, mild symptoms → Normal

Return ONLY valid JSON without any markdown formatting like ```json. Example: {\"priority\": \"Medium\", \"suggestion\": \"Schedule within 24 hours.\"}";

    $userMessage = "Patient symptoms: " . $reason;
    $aiReplyText = callOpenAI($systemPrompt, $userMessage);

    if ($aiReplyText) {
        // Robustly extract JSON object from the AI response
        $startIndex = strpos($aiReplyText, '{');
        $endIndex   = strrpos($aiReplyText, '}');
        
        if ($startIndex !== false && $endIndex !== false && $endIndex >= $startIndex) {
            $cleanJson = substr($aiReplyText, $startIndex, $endIndex - $startIndex + 1);
            $aiResult = json_decode($cleanJson, true);
        } else {
            $aiResult = null;
        }

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
    $doctorId    = $_POST['doctor_id'] ?? 1;
    $doctorName  = "General Doctor";
    $capacity    = 2;  // Strict 2-chair/hour limit per doctor

    if ($doctorId) {
        // Look up the selected doctor's name
        $stmt = $conn->prepare(
            "SELECT CONCAT(first_name, ' ', last_name) as name
             FROM doctors
             WHERE doctor_id = ?"
        );
        $stmt->bind_param("i", $doctorId);
        $stmt->execute();
        if ($doctorData = $stmt->get_result()->fetch_assoc()) {
            $doctorName = $doctorData['name'];
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
        // User selected a specific time (e.g. "14:00:00" or "00:00:00")
        $hour = (int)explode(':', $selectedTimePost)[0];
        $slotDate = $requestDate;
        if ($hour < 9) {
            $slotDate = date('Y-m-d', strtotime($requestDate . ' +1 day'));
        }
        $requestedSlotStart = "$slotDate " . $selectedTimePost;
        
        // Validate it's within bounds
        $reqHour = (int)explode(':', $selectedTimePost)[0];
        if ($reqHour < $startHour || $reqHour >= $endHour) {
            ob_clean(); echo json_encode(['status' => 'error', 'message' => "Selected time is outside clinic hours."]);
            exit();
        }

        $reqTimestamp = strtotime($requestedSlotStart);
        $currentTimestampHour = strtotime(date('Y-m-d H:00:00'));
        if ($reqTimestamp < $currentTimestampHour) {
            ob_clean(); echo json_encode(['status' => 'error', 'message' => "Selected time slot is in the past. Please choose a future time."]);
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
            ob_clean(); echo json_encode(['status' => 'error', 'message' => "Selected time slot is fully booked. Please choose another."]);
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
        ob_clean(); echo json_encode([
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
        $fileTmpPath = $_FILES['document']['tmp_name'];
        $fileNameOriginal = $_FILES['document']['name'];
        $fileSize = $_FILES['document']['size'];
        
        // 1. Validate File Size (Limit: 5MB)
        $maxFileSize = 5 * 1024 * 1024;
        if ($fileSize > $maxFileSize) {
            ob_clean(); echo json_encode(['status' => 'error', 'message' => "File size exceeds the 5MB limit."]);
            exit();
        }

        // 2. Validate MIME Type securely using finfo
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $fileTmpPath);
        finfo_close($finfo);

        $allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!in_array($mimeType, $allowedMimeTypes)) {
            ob_clean(); echo json_encode(['status' => 'error', 'message' => "Invalid file type. Only PDF, JPG, and PNG are allowed."]);
            exit();
        }

        // 3. Validate Extension
        $fileExtension = strtolower(pathinfo($fileNameOriginal, PATHINFO_EXTENSION));
        $allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
        if (!in_array($fileExtension, $allowedExtensions)) {
            ob_clean(); echo json_encode(['status' => 'error', 'message' => "Invalid file extension."]);
            exit();
        }

        $uploadDir = '../uploads/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        
        // Use a secure filename (hash + timestamp + extension) instead of trusting basename
        $fileName = time() . '_' . bin2hex(random_bytes(8)) . '.' . $fileExtension;
        move_uploaded_file($fileTmpPath, $uploadDir . $fileName);
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
        $effectiveHour = ($hour < 9) ? $hour + 24 : $hour;
        $letter = chr(ord('A') + ($effectiveHour - 9)); 
        $ticketCode = $letter . '-' . str_pad($queueNumber, 2, '0', STR_PAD_LEFT);

        $stmtTick = $conn->prepare("INSERT INTO tickets (patient_id, appointment_id, doctor_id, ticket_code) VALUES (?, ?, ?, ?)");
        $stmtTick->bind_param("iiis", $patientId, $apptId, $doctorId, $ticketCode);
        $stmtTick->execute();
        $stmtTick->close();

        ob_clean(); echo json_encode([
            'status'  => 'success',
            'message' => "Appointment booked successfully! AI Priority: $priority. Ticket: $ticketCode"
        ]);
    } else {
        ob_clean(); echo json_encode([
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
        ob_clean(); echo json_encode(['status' => 'error', 'message' => 'Appointment ID is required.']);
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
        ob_clean(); echo json_encode(['status' => 'error', 'message' => 'Appointment not found.']);
        exit();
    }

    // Authorization Check
    if ($userRole !== 'admin' && $apptInfo['user_id'] != $userId) {
        ob_clean(); echo json_encode(['status' => 'error', 'message' => 'Unauthorized access.']);
        exit();
    }

    // --- Delete the Appointment (Direct Deletion) ---
    $stmt = $conn->prepare("DELETE FROM appointments WHERE appointment_id = ?");
    $stmt->bind_param("i", $apptId);

    if ($stmt->execute()) {
        $msg = 'Appointment deleted successfully.';
        
        // Log the event in system logs for administrative audit
        $logMsg = "Appointment $apptId Deleted by User $userId (Cancellation)";
        $stmtLog = $conn->prepare("INSERT INTO system_logs (user_id, event, status) VALUES (?, ?, 'warning')");
        $stmtLog->bind_param("is", $userId, $logMsg);
        $stmtLog->execute();
        $stmtLog->close();

        ob_clean(); echo json_encode(['status' => 'success', 'message' => $msg]);
    } else {
        ob_clean(); echo json_encode(['status' => 'error', 'message' => 'Failed to delete appointment.']);
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

