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

    // 1. Available Chairs (Assuming any doctor not currently with a patient is 'available')
    // A doctor with an 'accepted' appointment is considered occupied.
    $docQuery = "
        SELECT d.doctor_id, d.first_name, d.last_name, d.specialization,
               (SELECT COUNT(*) FROM appointments a WHERE a.doctor_id = d.doctor_id AND a.status = 'accepted') as active_sessions
        FROM doctors d
    ";
    
    $result = $conn->query($docQuery);
    $availableChairs = 0;
    if ($result) {
        $context .= "- Doctors Details:\n";
        while($row = $result->fetch_assoc()) {
            $isAvailable = ($row['active_sessions'] == 0) ? "Yes" : "No (With Patient)";
            if ($row['active_sessions'] == 0) $availableChairs++;
            $context .= "  * Dr. {$row['first_name']} {$row['last_name']} ({$row['specialization']}) - Available Chair: {$isAvailable}\n";
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
    $enhancedSystemPrompt = $systemPrompt . "\n\n" . $clinicContext;

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
?>
