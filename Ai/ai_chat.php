<?php
/*
 * ═══════════════════════════════════════════════════════════
 * AI Chat Proxy — Server-Side Endpoint for Care Navigator
 * ═══════════════════════════════════════════════════════════
 *
 * This endpoint replaces direct client→Gemini calls so we can:
 *   1. Inject role-based system prompts (patient vs doctor/admin)
 *   2. Inject deep patient context (history, conditions, nutrition)
 *   3. Enforce medical guardrails server-side
 *   4. Return action triggers for UI navigation
 *
 * Called by: ai-widget.js (POST with JSON body)
 * ═══════════════════════════════════════════════════════════
 */

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../DataBase/db_connect.php';
require_once __DIR__ . '/ai_config.php';

/* ── Auth check ── */
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit();
}

$userId   = $_SESSION['user_id'];
$userRole = $_SESSION['role'] ?? $_SESSION['user_role'] ?? 'patient';
$userName = $_SESSION['user_name'] ?? 'User';

/* ── Read incoming messages ── */
$input = json_decode(file_get_contents('php://input'), true);
$messages = $input['messages'] ?? [];
$latestMessage = '';
if (!empty($messages)) {
    $last = end($messages);
    $latestMessage = $last['text'] ?? '';
}

/* ═══════════════════════════════════════════════════════════
   EMERGENCY KEYWORD DETECTION
   ═══════════════════════════════════════════════════════════ */
$emergencyKeywords = [
    'chest pain', 'heart attack', 'can\'t breathe', 'cannot breathe',
    'difficulty breathing', 'severe bleeding', 'unconscious',
    'stroke', 'seizure', 'choking', 'suicide', 'overdose',
    'anaphylaxis', 'allergic reaction', 'not breathing'
];

$isEmergency = false;
$lowerMsg = strtolower($latestMessage);
foreach ($emergencyKeywords as $keyword) {
    if (strpos($lowerMsg, $keyword) !== false) {
        $isEmergency = true;
        break;
    }
}

if ($isEmergency) {
    echo json_encode([
        'status'  => 'success',
        'reply'   => "🚨 **EMERGENCY DETECTED** 🚨\n\nBased on what you've described, this sounds like it could be a medical emergency.\n\n**Please take these steps immediately:**\n1. 📞 **Call Emergency Services (999 / 911)** right now\n2. 🏥 Go to the nearest Emergency Room\n3. Do NOT wait for an online appointment\n\nIf someone is with you, ask them to help while you call.\n\n_Your safety is our #1 priority. The Care Navigator cannot replace emergency medical care._",
        'action'  => 'emergency_alert',
        'emergency' => true
    ]);
    exit();
}


/* ═══════════════════════════════════════════════════════════
   DEEP CONTEXT INJECTION — Build User Profile
   ═══════════════════════════════════════════════════════════ */

$userContext = "";

if ($userRole === 'patient') {
    // Fetch full patient profile
    $stmt = $conn->prepare("
        SELECT p.patient_id, p.first_name, p.last_name, p.date_of_birth, p.gender, 
               p.blood_type, p.phone, p.email,
               TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) AS age
        FROM patients p WHERE p.user_id = ?
    ");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $patient = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($patient) {
        $patientId = $patient['patient_id'];
        $userContext .= "CURRENT PATIENT PROFILE:\n";
        $userContext .= "- Name: {$patient['first_name']} {$patient['last_name']}\n";
        $userContext .= "- Age: {$patient['age']} years old\n";
        $userContext .= "- Gender: {$patient['gender']}\n";
        $userContext .= "- Blood Type: {$patient['blood_type']}\n\n";

        // Last appointment
        $stmt = $conn->prepare("
            SELECT a.appointment_date, a.reason, a.status, a.appointment_type,
                   CONCAT(d.first_name, ' ', d.last_name) as doctor_name, d.specialization
            FROM appointments a
            LEFT JOIN doctors d ON a.doctor_id = d.doctor_id
            WHERE a.patient_id = ?
            ORDER BY a.appointment_date DESC LIMIT 1
        ");
        $stmt->bind_param("i", $patientId);
        $stmt->execute();
        $lastAppt = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if ($lastAppt) {
            $userContext .= "LAST APPOINTMENT:\n";
            $userContext .= "- Date: {$lastAppt['appointment_date']}\n";
            $userContext .= "- Doctor: Dr. {$lastAppt['doctor_name']} ({$lastAppt['specialization']})\n";
            $userContext .= "- Reason: {$lastAppt['reason']}\n";
            $userContext .= "- Status: {$lastAppt['status']}\n\n";
        }

        // Recent diagnoses
        $stmt = $conn->prepare("
            SELECT d.diagnosis_name, mr.record_date, mr.summary
            FROM diagnoses d
            JOIN medical_records mr ON d.record_id = mr.record_id
            WHERE mr.patient_id = ?
            ORDER BY mr.record_date DESC LIMIT 5
        ");
        $stmt->bind_param("i", $patientId);
        $stmt->execute();
        $diagResult = $stmt->get_result();
        $diagnoses = [];
        while ($row = $diagResult->fetch_assoc()) {
            $diagnoses[] = $row;
        }
        $stmt->close();

        if (!empty($diagnoses)) {
            $userContext .= "MEDICAL CONDITIONS/DIAGNOSES:\n";
            foreach ($diagnoses as $diag) {
                $userContext .= "- {$diag['diagnosis_name']} (recorded {$diag['record_date']})\n";
            }
            $userContext .= "\n";
        }

        // Active prescriptions
        $stmt = $conn->prepare("
            SELECT pr.medication_name, pr.dosage, pr.frequency, pr.duration
            FROM prescriptions pr
            JOIN medical_records mr ON pr.record_id = mr.record_id
            WHERE mr.patient_id = ?
            ORDER BY mr.record_date DESC LIMIT 5
        ");
        $stmt->bind_param("i", $patientId);
        $stmt->execute();
        $rxResult = $stmt->get_result();
        $prescriptions = [];
        while ($row = $rxResult->fetch_assoc()) {
            $prescriptions[] = $row;
        }
        $stmt->close();

        if (!empty($prescriptions)) {
            $userContext .= "CURRENT MEDICATIONS:\n";
            foreach ($prescriptions as $rx) {
                $userContext .= "- {$rx['medication_name']} ({$rx['dosage']}, {$rx['frequency']})\n";
            }
            $userContext .= "\n";
        }
    }

    // Add nutrition context
    $nutritionCtx = getPatientNutritionContext();
    if ($nutritionCtx) {
        $userContext .= $nutritionCtx . "\n";
    }
}


/* ═══════════════════════════════════════════════════════════
   ROLE-BASED SYSTEM PROMPTS
   ═══════════════════════════════════════════════════════════ */

$clinicContext = getClinicContext();

// Available doctors for action matching
$doctorList = [];
$docResult = $conn->query("SELECT doctor_id, first_name, last_name, specialization FROM doctors");
if ($docResult) {
    while ($row = $docResult->fetch_assoc()) {
        $doctorList[] = "Dr. {$row['first_name']} {$row['last_name']} (ID: {$row['doctor_id']}, Specialty: {$row['specialization']})";
    }
}
$doctorListStr = implode("\n", $doctorList);

if ($userRole === 'patient') {
    $systemPrompt = <<<PROMPT
You are the MyHealth Care Navigator — a warm, empathetic, and highly intelligent medical assistant integrated into the MyHealth Healthcare Portal.

═══ YOUR IDENTITY ═══
- You are speaking to a PATIENT. Use their first name when greeting them.
- Your tone is: warm, reassuring, empathetic, and easy to understand.
- NEVER use complex medical jargon. Explain everything in simple, clear language.
- Be conversational and human — like a caring nurse at the front desk.

═══ STRICT MEDICAL GUARDRAILS ═══
1. **NO DIAGNOSIS RULE**: You are a Medical Triage Assistant, NOT a licensed doctor. You must NEVER give a definitive medical diagnosis or prescribe medication. You may suggest potential causes and always recommend they book an appointment with our specialists.
2. **NO PRESCRIBING**: Never tell a patient to take specific medications or change doses.
3. When discussing health topics, always end with: "I'd recommend discussing this with one of our doctors for personalized advice."

═══ WHAT YOU CAN DO ═══
- Help navigate the app: Dashboard, Appointments, Medical Records, Prescriptions, Profile, Nutrition Hub
- Provide general health education (not diagnosis)
- Help book appointments and suggest which specialist to see
- Answer questions about their medical history (you have access to their records)
- Provide meal and nutrition guidance based on their TDEE and conditions
- Comfort and reassure anxious patients

═══ ACTION TRIGGERS ═══
When the user wants to take an action, include a JSON action block at the END of your reply on its own line, formatted exactly like:
<!--ACTION:{"type":"navigate","target":"appointments"}-->
<!--ACTION:{"type":"navigate","target":"records"}-->
<!--ACTION:{"type":"navigate","target":"prescriptions"}-->
<!--ACTION:{"type":"navigate","target":"profile"}-->
<!--ACTION:{"type":"navigate","target":"nutrition"}-->
<!--ACTION:{"type":"book_appointment","specialty":"Cardiologist"}-->

Only include an action when the user clearly wants to go somewhere or book something. Do NOT include actions for general conversation.

═══ AVAILABLE DOCTORS ═══
{$doctorListStr}

═══ LIVE CLINIC DATA ═══
{$clinicContext}

═══ PATIENT CONTEXT (CONFIDENTIAL) ═══
{$userContext}

Use this patient context to personalize your responses. For example, greet them by name, reference their last visit, and be aware of their conditions when giving advice.
PROMPT;

} else {
    // Doctor or Admin
    $systemPrompt = <<<PROMPT
You are the MyHealth Clinical Assistant — a highly efficient, data-driven AI integrated into the MyHealth Healthcare Portal.

═══ YOUR IDENTITY ═══
- You are speaking to a {$userRole} ({$userName}).
- Your tone is: concise, clinical, data-driven, and professional.
- Use proper medical terminology — the user is a healthcare professional.
- Be efficient: summarize data in bullet points, highlight risks, save time.

═══ CAPABILITIES ═══
- Summarize patient files, appointment histories, and lab results
- Highlight clinical risks and flag anomalies
- Help with triage decisions and scheduling optimization
- Provide evidence-based clinical references
- Answer administrative questions about the platform

═══ STRICT RULES ═══
1. You assist with clinical decision support but NEVER make final treatment decisions.
2. Always note when data may be incomplete: "Based on available records..."
3. Never share patient data with unauthorized users.

═══ ACTION TRIGGERS ═══
When the user wants to navigate, include at the END of your reply:
<!--ACTION:{"type":"navigate","target":"dashboard"}-->
<!--ACTION:{"type":"navigate","target":"appointments"}-->
<!--ACTION:{"type":"navigate","target":"patients"}-->
<!--ACTION:{"type":"navigate","target":"records"}-->

═══ LIVE CLINIC DATA ═══
{$clinicContext}

═══ AVAILABLE STAFF ═══
{$doctorListStr}
PROMPT;
}


/* ═══════════════════════════════════════════════════════════
   CALL GEMINI API
   ═══════════════════════════════════════════════════════════ */

$aiReply = callOpenAI($systemPrompt, $latestMessage);

if (!$aiReply) {
    $aiReply = "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.";
}

/* ═══════════════════════════════════════════════════════════
   PARSE ACTION TRIGGERS FROM RESPONSE
   ═══════════════════════════════════════════════════════════ */
$action = null;
if (preg_match('/<!--ACTION:(.*?)-->/', $aiReply, $matches)) {
    $action = json_decode($matches[1], true);
    // Remove the action tag from visible reply
    $aiReply = trim(preg_replace('/<!--ACTION:.*?-->/', '', $aiReply));
}

/* ═══════════════════════════════════════════════════════════
   SEND RESPONSE
   ═══════════════════════════════════════════════════════════ */
echo json_encode([
    'status' => 'success',
    'reply'  => $aiReply,
    'action' => $action,
    'role'   => $userRole
]);
?>
