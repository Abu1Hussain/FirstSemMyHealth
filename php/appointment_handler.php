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
   BOOK A NEW APPOINTMENT
   ══════════════════════════════════════════════════════ */

if (isset($_POST['book_appointment'])) {

    $userId = $_SESSION['user_id'];
    $reason = trim($_POST['reason'] ?? '');

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
    $capacity    = 30;  // Default chairs per hour

    if ($doctorId) {
        // Look up the selected doctor's name and capacity
        $stmt = $conn->prepare(
            "SELECT CONCAT(first_name, ' ', last_name) as name, capacity
             FROM medical_staff
             WHERE staff_id = ?"
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
    /*
     * Loop through each hour from 9 AM to 5 PM and check
     * how many appointments are already booked. Pick the
     * first slot that still has room.
     */

    $assignedTime = null;
    $queueNumber  = 0;
    $startHour    = 9;   // First appointment at 9 AM
    $endHour      = 17;  // Last slot starts at 4 PM

    for ($hour = $startHour; $hour < $endHour; $hour++) {
        $slotStart = "$requestDate " . str_pad($hour, 2, '0', STR_PAD_LEFT) . ":00:00";
        $slotEnd   = "$requestDate " . str_pad($hour + 1, 2, '0', STR_PAD_LEFT) . ":00:00";

        // Count existing appointments in this slot
        if ($doctorId) {
            $stmt = $conn->prepare(
                "SELECT COUNT(*) as booked FROM appointments
                 WHERE appointment_date >= ? AND appointment_date < ? AND staff_id = ?"
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
            $queueNumber  = $bookedCount + 1;
            break;
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
         (patient_id, staff_id, appointment_date, appointment_type, status, reason, ai_priority, ai_suggestion, queue_number)
         VALUES (?, ?, ?, 'General', 'pending', ?, ?, ?, ?)"
    );

    // If no doctor was selected, staff_id will be NULL
    if ($doctorId) {
        $stmt->bind_param("iissssi", $patientId, $doctorId, $assignedTime, $reason, $priority, $aiSuggestion, $queueNumber);
    } else {
        $nullDoctor = null;
        $stmt->bind_param("iissssi", $patientId, $nullDoctor, $assignedTime, $reason, $priority, $aiSuggestion, $queueNumber);
    }

    if ($stmt->execute()) {
        echo json_encode([
            'status'  => 'success',
            'message' => "Appointment booked successfully! AI Priority: $priority"
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
