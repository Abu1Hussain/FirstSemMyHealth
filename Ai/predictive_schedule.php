<?php
/*
 * ═══════════════════════════════════════════════════════════
 * Predictive Scheduling API
 * Analyzes patient schedules to predict No-Show likelihood.
 * ═══════════════════════════════════════════════════════════
 */
require_once __DIR__ . '/ai_config.php';
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['patients'])) {
    echo json_encode(['error' => 'No patient data provided.']);
    exit;
}

$patients = $data['patients']; 

$systemPrompt = "You are a healthcare analytics AI. Your task is to estimate the 'No-Show' risk percentage for a list of scheduled patients based on their de-identified profile.
Factors increasing risk: High previous_no_shows, long distance_from_clinic, late appointment_time (e.g. late afternoon/evening), younger demographics.
Factors decreasing risk: 0 previous_no_shows, close distance, morning appointments.

OUTPUT FORMAT REQUIREMENTS:
You MUST return ONLY a valid JSON array of objects.
Each object must have:
- 'id' (matching the input id)
- 'risk_percentage' (integer 0-100)
- 'risk_factor' (short string explaining the primary reason for the risk score, e.g. 'History of missed appointments' or 'First time patient, evening slot').

DO NOT wrap the response in markdown blocks like ```json. Output raw JSON only.";

$userMessage = "Analyze these patients: \n" . json_encode($patients);

$reply = callOpenAI($systemPrompt, $userMessage);

if ($reply) {
    // Strip possible markdown if Gemini disobeys formatting constraints
    $reply = str_replace(array('```json', '```'), '', $reply);
    
    $decodedJSON = json_decode(trim($reply), true);
    if($decodedJSON === null) {
         echo json_encode(['error' => 'AI returned malformed JSON.', 'raw' => trim($reply)]);
    } else {
         echo json_encode(['predictions' => $decodedJSON]);
    }
} else {
    echo json_encode(['error' => 'Prediction failed due to API threshold or network error.']);
}
?>
