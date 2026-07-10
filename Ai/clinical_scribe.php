<?php
/*
 * ═══════════════════════════════════════════════════════════
 * AI Clinical Scribe Endpoint
 * Takes unstructured doctor dictation/notes and uses Gemini to
 * structure them into a formal medical record shape (Chief Complaint,
 * HPI, Assessment, Plan, Suggested ICD codes).
 *
 * Connected to: ai_logs table (for auditing)
 * Called by:    doctor-dashboard.js
 * ═══════════════════════════════════════════════════════════
 */

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../DataBase/db_connect.php';
require_once __DIR__ . '/ai_config.php';

/* ── 1. Authentication ── */
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'doctor') {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized. Doctor access required.']);
    exit();
}

/* ── 2. Parse Input ── */
$inputData = json_decode(file_get_contents('php://input'), true);

$patientId     = $inputData['patient_id'] ?? null;
$appointmentId = $inputData['appointment_id'] ?? null;
$freeText      = $inputData['free_text'] ?? '';

if (empty($freeText)) {
    echo json_encode(['status' => 'error', 'message' => 'No dictation text provided.']);
    exit();
}

/* ── 3. Build AI Prompt ── */
$systemPrompt = "You are an expert clinical scribe AI assisting a doctor.
Your task is to take the doctor's unstructured free-text dictation or notes from a patient visit and convert it into a highly structured clinical note.

You MUST return a JSON object with exactly these fields:
1. \"chief_complaint\" - A concise summary of the primary reason for the visit.
2. \"hpi\" - History of Present Illness (a narrative paragraph based on the notes).
3. \"assessment\" - The doctor's diagnosis or clinical impressions.
4. \"plan\" - The recommended treatment, prescriptions, or follow-up actions.
5. \"icd_codes\" - An array of strings containing suggested ICD-10 codes based on the assessment. (e.g., [\"J20.9 - Acute bronchitis, unspecified\"])

IMPORTANT CONSTRAINTS:
- Use a concise, professional, clinical tone.
- Do NOT hallucinate medical data. If information for a section is missing from the dictation, simply output \"Not provided.\"
- Return ONLY valid JSON. Do not include markdown blocks like ```json.
Example output format:
{
  \"chief_complaint\": \"Persistent cough for 3 days.\",
  \"hpi\": \"Patient presents with a 3-day history of dry cough...\",
  \"assessment\": \"Acute bronchitis.\",
  \"plan\": \"Rest, hydration, and prescribed Albuterol inhaler.\",
  \"icd_codes\": [\"J20.9 - Acute bronchitis, unspecified\"]
}";

$userMessage = "Doctor's dictation: " . $freeText;

/* ── 4. Call Gemini ── */
$aiReplyText = callOpenAI($systemPrompt, $userMessage);

/* ── 5. Parse Response & Fallback ── */
if ($aiReplyText) {
    // Extract JSON safely
    $startIndex = strpos($aiReplyText, '{');
    $endIndex   = strrpos($aiReplyText, '}');
    
    if ($startIndex !== false && $endIndex !== false && $endIndex >= $startIndex) {
        $cleanJson = substr($aiReplyText, $startIndex, $endIndex - $startIndex + 1);
        $aiResult = json_decode($cleanJson, true);
    } else {
        $aiResult = null;
    }

    if ($aiResult && isset($aiResult['chief_complaint'])) {
        // Success
        $structuredData = $aiResult;
        // Enforce the "suggested" flag requirement for ICD codes
        if (isset($structuredData['icd_codes']) && is_array($structuredData['icd_codes'])) {
            foreach ($structuredData['icd_codes'] as &$code) {
                $code .= " (Suggested, doctor must confirm)";
            }
        }
    } else {
        error_log("Clinical Scribe returned non-JSON or invalid schema: " . $aiReplyText);
        echo json_encode(['status' => 'error', 'message' => 'AI returned an invalid format. Please manually structure your notes.']);
        exit();
    }
} else {
    // API Failed
    echo json_encode(['status' => 'error', 'message' => 'AI scribe service is temporarily unavailable.']);
    exit();
}

/* ── 6. Log to ai_logs ── */
$userId = $_SESSION['user_id'];
$logSql = "INSERT INTO ai_logs (user_id, request_type, input_text, ai_response, status) VALUES (?, 'Scribe', ?, ?, 'success')";
$logStmt = $conn->prepare($logSql);
if ($logStmt) {
    $logResponse = json_encode($structuredData);
    $logStmt->bind_param("iss", $userId, $freeText, $logResponse);
    $logStmt->execute();
    $logStmt->close();
}

/* ── 7. Send Response ── */
echo json_encode([
    'status' => 'success',
    'data'   => $structuredData
]);
?>
