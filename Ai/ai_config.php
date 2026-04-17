<?php
/*
 * ═══════════════════════════════════════════════════════════
 * AI Configuration File
 * Central place to set your Google Gemini API key and model.
 * Also contains the callGemini() helper used by AI features.
 * ═══════════════════════════════════════════════════════════
 */

require_once __DIR__ . '/../DataBase/db_connect.php';

/* ── 1. PUT YOUR GEMINI API KEY HERE ── */
$GEMINI_API_KEY = 'AIzaSyDhLYX0y12fw4Sri1YDIUfLTP8iXX-7f_s';

/* ── 2. CHOOSE THE AI MODEL ── */
// 'gemini-1.5-pro' is great for complex reasoning.
// 'gemini-1.5-flash' is faster and often sufficient for simpler tasks.
$GEMINI_MODEL = 'gemini-2.5-flash';

/* ── 3. API ENDPOINT ── */
$GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{$GEMINI_MODEL}:generateContent?key={$GEMINI_API_KEY}";

/* ─────────────────────────────────────────────────────
   getClinicContext()

   Fetches real-time clinic data from the database to
   inject into the AI's system prompt, ensuring the AI
   knows the current state of the clinic.
   ───────────────────────────────────────────────────── */
function getClinicContext() {
    global $conn;
    
    // Default fallback context
    if (!$conn) return "Clinic Data Unavailable.";

    $context = "CURRENT CLINIC STATUS:\n";

    // 1. Doctor availability and presence status
    $docQuery = "
        SELECT d.doctor_id, d.first_name, d.last_name, d.specialization, d.presence_status,
               (SELECT COUNT(*) FROM appointments a WHERE a.doctor_id = d.doctor_id AND a.status = 'accepted') as active_sessions
        FROM doctors d
    ";
    
    $result = $conn->query($docQuery);
    $availableChairs = 0;
    $statusLabels = [
        'on_duty' => '🩺 On Duty',
        'in_consultation' => '🚪 In Consultation (Busy)',
        'on_break' => '☕ On Break',
        'off_shift' => '🌙 Off Shift'
    ];
    if ($result) {
        $context .= "- Doctors Details:\n";
        while($row = $result->fetch_assoc()) {
            $presence = $statusLabels[$row['presence_status'] ?? 'off_shift'] ?? '🌙 Off Shift';
            $isAvailable = ($row['presence_status'] === 'on_duty' && $row['active_sessions'] == 0);
            if ($isAvailable) $availableChairs++;
            $context .= "  * Dr. {$row['first_name']} {$row['last_name']} ({$row['specialization']}) - Status: {$presence} - Available for new patients: " . ($isAvailable ? "Yes" : "No") . "\n";
        }
        $context .= "- Total Available Chairs/Rooms: {$availableChairs}\n";
    }

    // 2. Waiting Patients Queue
    $pendingQuery = "
        SELECT COUNT(*) as waiting_count 
        FROM appointments 
        WHERE status = 'pending'
    ";
    $result = $conn->query($pendingQuery);
    if($result && $row = $result->fetch_assoc()) {
        $context .= "- Total Patients Waiting in Queue: {$row['waiting_count']}\n";
    }

    // 3. Today's Volume
    $todayQuery = "
        SELECT COUNT(*) as today_total 
        FROM appointments 
        WHERE DATE(created_at) = CURDATE()
    ";
    $result = $conn->query($todayQuery);
    if($result && $row = $result->fetch_assoc()) {
        $context .= "- Total Appointments Today: {$row['today_total']}\n";
    }

    return $context;
}

/* ─────────────────────────────────────────────────────
   getPatientNutritionContext()

   Fetches specific patient metrics (TDEE, medical conditions)
   if a patient is currently logged in, ensuring the AI 
   can provide precise individualized meal recommendations.
   ───────────────────────────────────────────────────── */
function getPatientNutritionContext() {
    global $conn;
    if (session_status() === PHP_SESSION_NONE) { session_start(); }
    if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'patient') return "";

    $stmt = $conn->prepare("SELECT TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) AS age, weight_kg, height_cm, gender, activity_level, medical_conditions FROM patients WHERE user_id = ?");
    if(!$stmt) return "";
    $stmt->bind_param("i", $_SESSION['user_id']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        $weight = $row['weight_kg'];
        $height = $row['height_cm'];
        $age = $row['age'] ? $row['age'] : 25; 
        $gender = $row['gender'] ?? 'male';
        $activity = floatval($row['activity_level'] ?? 1.2);
        
        if ($weight && $height && $age) {
            $bmr = ($gender === 'male' || $gender === 'Male') 
                ? (10 * $weight) + (6.25 * $height) - (5 * $age) + 5
                : (10 * $weight) + (6.25 * $height) - (5 * $age) - 161;
            
            $tdee = round($bmr * $activity);
            $conditions = $row['medical_conditions'] ? $row['medical_conditions'] : "None reported.";

            return "PATIENT NUTRITION PROFILE:\n" .
                   "- Target TDEE: {$tdee} calories\n" .
                   "- Medical Conditions: {$conditions}\n\n" .
                   "If the user asks for meal recommendations or recipes, ALWAYS strictly respect these medical conditions and calorie limits.";
        }
    }
    return "";
}

/* ─────────────────────────────────────────────────────
   callOpenAI($systemPrompt, $userMessage)

   Kept the same function name so existing codebase 
   doesn't break, but internally routes to Google Gemini.

   Sends a message to Gemini and returns the AI's reply
   as a plain text string, or null if something failed.
   ───────────────────────────────────────────────────── */
function callOpenAI($systemPrompt, $userMessage) {
    global $GEMINI_API_URL;

    // Inject live clinic data into the system prompt
    $clinicContext = getClinicContext();
    $patientContext = getPatientNutritionContext();
    $enhancedSystemPrompt = $systemPrompt . "\n\n" . $clinicContext . "\n\n" . $patientContext;

    // Gemini API Request Format
    $requestBody = json_encode([
        'contents' => [
            [
                'role' => 'user', 
                'parts' => [
                    ['text' => "System Instructions: " . $enhancedSystemPrompt . "\n\nUser Message: " . $userMessage]
                ]
            ]
        ],
        'generationConfig' => [
            'temperature' => 0.3, // Lower temp for more consistent answers
            'maxOutputTokens' => 500,
        ]
    ]);

    // Set up the HTTP request using cURL
    $curlHandle = curl_init($GEMINI_API_URL);

    curl_setopt($curlHandle, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($curlHandle, CURLOPT_POST, true);
    curl_setopt($curlHandle, CURLOPT_POSTFIELDS, $requestBody);
    curl_setopt($curlHandle, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);

    // Send the request
    $rawResponse = curl_exec($curlHandle);
    $httpStatus  = curl_getinfo($curlHandle, CURLINFO_HTTP_CODE);
    $curlError   = curl_error($curlHandle);
    curl_close($curlHandle);

    // Check for errors
    if ($curlError) {
        error_log("Gemini cURL Error: " . $curlError);
        return null;
    }

    if ($httpStatus !== 200) {
        error_log("Gemini API returned HTTP $httpStatus: " . $rawResponse);
        return null;
    }

    // Parse the JSON response
    $parsedResponse = json_decode($rawResponse, true);

    if (isset($parsedResponse['candidates'][0]['content']['parts'][0]['text'])) {
        return trim($parsedResponse['candidates'][0]['content']['parts'][0]['text']);
    }

    error_log("Gemini response format unexpected: " . $rawResponse);
    return null;
}

/* ─────────────────────────────────────────────────────
   callGeminiVision($systemPrompt, $userMessage, $base64Image, $mimeType)
   Allows processing images using Gemini 1.5 Flash Vision capabilities.
   ───────────────────────────────────────────────────── */
function callGeminiVision($systemPrompt, $userMessage, $base64Image, $mimeType) {
    global $GEMINI_API_URL, $GEMINI_API_KEY;
    // For vision, we recommend using gemini-1.5-flash explicitly 
    $visionUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$GEMINI_API_KEY}";

    $requestBody = json_encode([
        'contents' => [
            [
                'role' => 'user', 
                'parts' => [
                    ['text' => "System Instructions: " . $systemPrompt . "\n\nUser Message: " . $userMessage],
                    [
                        'inline_data' => [
                            'mime_type' => $mimeType,
                            'data' => $base64Image
                        ]
                    ]
                ]
            ]
        ],
        'generationConfig' => [
            'temperature' => 0.4,
            'maxOutputTokens' => 800,
        ]
    ]);

    $curlHandle = curl_init($visionUrl);
    curl_setopt($curlHandle, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($curlHandle, CURLOPT_POST, true);
    curl_setopt($curlHandle, CURLOPT_POSTFIELDS, $requestBody);
    curl_setopt($curlHandle, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    
    $rawResponse = curl_exec($curlHandle);
    $httpStatus = curl_getinfo($curlHandle, CURLINFO_HTTP_CODE);
    curl_close($curlHandle);

    if ($httpStatus !== 200) {
        error_log("Gemini Vision HTTP $httpStatus: " . $rawResponse);
        return null;
    }

    $parsedResponse = json_decode($rawResponse, true);
    if (isset($parsedResponse['candidates'][0]['content']['parts'][0]['text'])) {
        return trim($parsedResponse['candidates'][0]['content']['parts'][0]['text']);
    }
    error_log("Gemini Vision response unexpected: " . $rawResponse);
    return null;
}
?>
