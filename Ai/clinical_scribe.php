<?php
ob_start();
/*
 * ═══════════════════════════════════════════════════════════
 * Clinical Scribe API
 * Receives raw conversation transcripts and generates SOAP notes.
 * ═══════════════════════════════════════════════════════════
 */
require_once __DIR__ . '/ai_config.php';
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['transcript'])) {
    ob_clean(); echo json_encode(['error' => 'No transcript provided.']);
    exit;
}

$transcript = $data['transcript'];

$systemPrompt = "You are an expert Clinical Documentation Specialist AI. Your task is to analyze the provided raw transcript of a doctor-patient conversation and extract the clinical information into a highly professional SOAP note format.

S = Subjective (Chief complaint, HPI, symptoms as described by patient)
O = Objective (Vitals, physical exam findings mentioned)
A = Assessment (Diagnosis, differentials)
P = Plan (Medications, follow-up, instructions given)

If any section cannot be derived from the conversation, put 'Not mentioned in transcript.' Do not invent data.

OUTPUT FORMAT REQUIREMENTS:
Return valid JSON only. DO NOT wrap with markdown blocks like ```json.
Expected structure:
{
  \"subjective\": \"...\",
  \"objective\": \"...\",
  \"assessment\": \"...\",
  \"plan\": \"...\"
}";

$userMessage = "Raw Transcript:\n" . $transcript;

$reply = callOpenAI($systemPrompt, $userMessage);

if ($reply) {
    $reply = str_replace(array('```json', '```'), '', $reply);
    
    $decodedJSON = json_decode(trim($reply), true);
    if($decodedJSON === null) {
         ob_clean(); echo json_encode(['error' => 'AI returned malformed SOAP structure.', 'raw' => trim($reply)]);
    } else {
         ob_clean(); echo json_encode(['soap' => $decodedJSON]);
    }
} else {
    ob_clean(); echo json_encode(['error' => 'Scribe analysis failed due to network or quota issues.']);
}
?>

