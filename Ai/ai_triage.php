<?php
/*
 * ═══════════════════════════════════════════════════════════
 * AI Triage Endpoint
 * Receives a patient's symptoms and uses OpenAI to determine:
 *   - Priority level  (Highly Important / Important / Normal)
 *   - Suggestion      (what the patient should do)
 *   - Recommended specialty (which type of doctor to see)
 *
 * Connected to: appointments table, doctors table
 * Called by:     dashboard.js  (when patient books appointment)
 * ═══════════════════════════════════════════════════════════
 */

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../DataBase/db_connect.php';
require_once __DIR__ . '/ai_config.php';


/* ── Make sure the user is logged in ── */

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Please log in first.']);
    exit();
}


/* ── Read the incoming data ── */

$inputData = json_decode(file_get_contents('php://input'), true);

$symptoms      = $inputData['reason']  ?? '';
$requestedDate = $inputData['date']    ?? date('Y-m-d');
$doctorId      = $inputData['doctor_id'] ?? null;

if (empty($symptoms)) {
    echo json_encode(['status' => 'error', 'message' => 'Please describe your symptoms.']);
    exit();
}


/* ─────────────────────────────────────────────────────
   Step 1: Ask OpenAI to analyze the symptoms
   ───────────────────────────────────────────────────── */

$systemPrompt = "You are a medical triage AI assistant for a healthcare scheduling system.

Your job is to analyze a patient's symptoms and return a JSON object with exactly three fields:

1. \"priority\"    – MUST be one of: \"Fast/Hard\", \"Medium\", or \"Normal\"
2. \"suggestion\"  – a short, friendly sentence advising what the patient should do (max 2 sentences)
3. \"specialty\"   – the type of doctor who should see this patient (e.g. \"Cardiologist\", \"General Practitioner\", \"Neurologist\", \"Dermatologist\", \"Pediatrician\", \"Orthopedic\")

Rules:
- If symptoms mention chest pain, difficulty breathing, severe bleeding, or loss of consciousness → Fast/Hard
- If symptoms mention fever, persistent pain, infection, or vomiting → Medium
- For routine checkups, mild symptoms, or follow-ups → Normal

IMPORTANT: Return ONLY valid JSON without any markdown formatting like ```json. Example:
{\"priority\": \"Medium\", \"suggestion\": \"Please schedule within 24 hours. Stay hydrated.\", \"specialty\": \"General Practitioner\"}";

$userMessage = "Patient symptoms: " . $symptoms;

$aiReplyText = callOpenAI($systemPrompt, $userMessage);


/* ─────────────────────────────────────────────────────
   Step 2: Parse the AI response (with fallback)
   ───────────────────────────────────────────────────── */

$priority        = 'Normal';
$aiSuggestion    = 'Regular checkup schedule applies.';
$specialty       = 'General Practitioner';

if ($aiReplyText) {
    // Robustly extract JSON object from the AI response
    // This finds the first { and the last } and takes everything in between
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
        $aiSuggestion = $aiResult['suggestion']  ?? $aiSuggestion;
        $specialty    = $aiResult['specialty']    ?? $specialty;
    } else {
        // If OpenAI returned text instead of JSON, use keyword fallback
        error_log("AI returned non-JSON: " . $aiReplyText);
        $priority     = keywordFallbackPriority($symptoms);
        $aiSuggestion = 'AI analysis unavailable. Priority set by keyword matching.';
    }
} else {
    // API call failed – use keyword fallback
    $priority     = keywordFallbackPriority($symptoms);
    $aiSuggestion = 'AI service temporarily unavailable. Priority set by keyword matching.';
}


/* ─────────────────────────────────────────────────────
   Step 3: Find matching doctors by specialty
   ───────────────────────────────────────────────────── */

$matchingDoctors = [];

$doctorQuery = $conn->query(
    "SELECT doctor_id as id,
            CONCAT(first_name, ' ', last_name) as name,
            specialization, capacity, profile_image
     FROM doctors
     WHERE specialization LIKE '%$specialty%'
     ORDER BY capacity DESC"
);

if ($doctorQuery && $doctorQuery->num_rows > 0) {
    while ($doctor = $doctorQuery->fetch_assoc()) {
        $doctor['image_url'] = '../image/' . $doctor['profile_image'];
        $matchingDoctors[] = $doctor;
    }
}

// If no specialist found, default to Dr Ahmed (doctor_id = 1)
if (empty($matchingDoctors)) {
    $fallbackDoctorQuery = $conn->query(
        "SELECT doctor_id as id,
                CONCAT(first_name, ' ', last_name) as name,
                specialization, capacity, profile_image
         FROM doctors
         WHERE doctor_id = 1"
    );
    if ($fallbackDoctorQuery && $doctor = $fallbackDoctorQuery->fetch_assoc()) {
        $doctor['image_url'] = '../image/' . $doctor['profile_image'];
        $matchingDoctors[] = $doctor;
    }
}


/* ─────────────────────────────────────────────────────
   Step 4: Check availability for the requested date
   ───────────────────────────────────────────────────── */

$availableSlots = [];
$startHour      = 9;   // Clinic opens at 9 AM
$endHour        = 17;  // Clinic closes at 5 PM

// If a specific doctor was requested, use them. Otherwise, use the first matching/fallback doctor.
$checkDoctorId = $doctorId;
if (!$checkDoctorId && !empty($matchingDoctors)) {
    $checkDoctorId = $matchingDoctors[0]['id'];
}

for ($hour = $startHour; $hour < $endHour; $hour++) {
    $slotStart = $requestedDate . ' ' . str_pad($hour, 2, '0', STR_PAD_LEFT) . ':00:00';
    $slotEnd   = $requestedDate . ' ' . str_pad($hour + 1, 2, '0', STR_PAD_LEFT) . ':00:00';

    $countQuery = "SELECT COUNT(*) as booked FROM appointments
                   WHERE appointment_date >= '$slotStart' AND appointment_date < '$slotEnd'";

    if ($checkDoctorId) {
        $countQuery .= " AND doctor_id = '$checkDoctorId'";
    }

    $result      = $conn->query($countQuery);
    $bookedCount = $result ? $result->fetch_assoc()['booked'] : 0;

    $maxChairs       = 30;
    // If checking a specific doctor, use their capacity if available, otherwise default to 1 for that doctor
    if ($checkDoctorId && !empty($matchingDoctors[0]['capacity'])) {
        $maxChairs = $matchingDoctors[0]['capacity'];
    }
    
    $availableChairs = $maxChairs - $bookedCount;

    if ($availableChairs > 0) {
        // Build the display string matching what the frontend expects
        $hourStr = date('h:00 A', strtotime($slotStart)) . ' - ' . date('h:00 A', strtotime($slotEnd));
        
        $availableSlots[] = [
            'hour'         => $hourStr,
            'chairs_left'  => $availableChairs,
            'queue_number' => $bookedCount + 1,
            'slot_start'   => $slotStart
        ];
    }
}

// Auto-select nearest time slot if priority is Medium or Fast/Hard
$recommendedSlot = null;
if (($priority === 'Medium' || $priority === 'Fast/Hard') && !empty($availableSlots)) {
    // Sort slots by start time to ensure chronological order
    usort($availableSlots, function($a, $b) {
        return strtotime($a['slot_start']) - strtotime($b['slot_start']);
    });
    
    // Pick the earliest available one
    $recommendedSlot = $availableSlots[0]['hour'];
}

/* ─────────────────────────────────────────────────────
   Step 4.5: Log the triage request
   ───────────────────────────────────────────────────── */
$userId = $_SESSION['user_id'] ?? null;
$logSql = "INSERT INTO ai_logs (user_id, request_type, input_text, ai_response, status) VALUES (?, 'Triage', ?, ?, 'success')";
$logStmt = $conn->prepare($logSql);
if ($logStmt) {
    $logResponse = json_encode([
        'priority' => $priority,
        'suggestion' => $aiSuggestion,
        'specialty' => $specialty
    ]);
    $logStmt->bind_param("iss", $userId, $symptoms, $logResponse);
    $logStmt->execute();
    $logStmt->close();
}

/* ─────────────────────────────────────────────────────
   Step 5: Send response back to the frontend
   ───────────────────────────────────────────────────── */

echo json_encode([
    'status'  => 'success',
    'triage'  => [
        'priority'              => $priority,
        'suggestion'            => $aiSuggestion,
        'recommended_specialty' => $specialty,
        'recommended_slot'      => $recommendedSlot
    ],
    'matching_doctors'  => $matchingDoctors,
    'available_slots'   => $availableSlots
]);


/* ─────────────────────────────────────────────────────
   keywordFallbackPriority($symptoms)

   Simple keyword-based fallback if OpenAI is unavailable.
   Scans symptom text for urgent/important keywords.
   ───────────────────────────────────────────────────── */

function keywordFallbackPriority($symptoms) {
    $lowerSymptoms = strtolower($symptoms);

    // Urgent keywords
    $urgentWords = ['chest pain', 'breathing', 'unconscious', 'bleeding', 'heart', 'stroke', 'emergency'];
    foreach ($urgentWords as $word) {
        if (strpos($lowerSymptoms, $word) !== false) {
            return 'Fast/Hard';
        }
    }

    // Important keywords
    $importantWords = ['fever', 'pain', 'infection', 'vomiting', 'sick', 'swelling', 'injury'];
    foreach ($importantWords as $word) {
        if (strpos($lowerSymptoms, $word) !== false) {
            return 'Medium';
        }
    }

    return 'Normal';
}
?>
