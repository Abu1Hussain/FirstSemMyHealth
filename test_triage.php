<?php
require_once __DIR__ . '/Ai/ai_config.php';

$symptoms = "I have chest pain and I'm sweating.";

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

echo "RAW REPLY:\n";
var_dump($aiReplyText);

// Strip markdown JSON blocks often returned by Gemini
$aiReplyText = preg_replace('/```json\s*/i', '', $aiReplyText);
$aiReplyText = preg_replace('/```\s*/i', '', $aiReplyText);
$aiReplyText = trim($aiReplyText);

echo "\nAFTER STRIPPING:\n";
var_dump($aiReplyText);

echo "\nJSON DECODE:\n";
var_dump(json_decode($aiReplyText, true));
?>
