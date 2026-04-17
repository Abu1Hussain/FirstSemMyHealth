<?php
ob_start();
/*
 * ═══════════════════════════════════════════════════════════
 * Multimodal Lab Analyzer API
 * Receives Base64 image data of lab reports and sends them
 * to Gemini 1.5 Flash for simplified patient-friendly analysis.
 * ═══════════════════════════════════════════════════════════
 */
require_once __DIR__ . '/ai_config.php';
header('Content-Type: application/json');

// Get raw JSON body
$inputJSON = file_get_contents('php://input');
$data = json_decode($inputJSON, true);

if (!$data || !isset($data['image']) || !isset($data['mime'])) {
    ob_clean(); echo json_encode(['error' => 'Missing image data or mime type.']);
    exit;
}

$base64Image = $data['image'];
// Strip data URI scheme prefix if it exists (e.g. data:image/png;base64,)
if (strpos($base64Image, ',') !== false) {
    $base64Image = explode(',', $base64Image)[1];
}

$mimeType = $data['mime'];

// Optional user question
$question = isset($data['question']) && !empty($data['question']) 
    ? $data['question'] 
    : "Please analyze this medical document or lab result.";

// The stringent system prompt enforcing simple language and a medical disclaimer
$systemPrompt = "You are 'MyHealth Lab Navigator', a friendly AI assistant designed to help patients understand their medical lab results or clinical documents.
When looking at an uploaded image, extract the text and key values. Explain what those values generally mean in VERY SIMPLE, easy-to-understand terms for a non-medical person. Let them know if values appear standard or out of normal reference ranges if provided on the paper.

CRITICAL DIRECTIVE: You MUST ALWAYS conclude your response with a highly visible disclaimer stating:
'⚠️ *Disclaimer: I am an AI, not a doctor. This analysis is for informational purposes only. You must consult your physician to get a proper clinical diagnosis or treatment plan based on these results.*'";

$reply = callGeminiVision($systemPrompt, $question, $base64Image, $mimeType);

if ($reply) {
    ob_clean(); echo json_encode(['reply' => $reply]);
} else {
    ob_clean(); echo json_encode(['error' => 'The AI failed to process the image. The document may be unreadable or API quotas were exceeded.']);
}
?>

