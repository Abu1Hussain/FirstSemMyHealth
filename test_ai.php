<?php
require_once __DIR__ . '/Ai/ai_config.php';

$systemPrompt = "You are a helpful virtual assistant for a clinic. Be very concise in your answer.";
$userMessage = "Can you check how many chairs/rooms are available right now and how many people are waiting?";

echo callOpenAI($systemPrompt, $userMessage);
?>
