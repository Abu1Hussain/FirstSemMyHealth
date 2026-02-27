<?php
require_once __DIR__ . '/Ai/ai_config.php';

$url = "https://generativelanguage.googleapis.com/v1beta/models?key={$GEMINI_API_KEY}";

$curlHandle = curl_init($url);
curl_setopt($curlHandle, CURLOPT_RETURNTRANSFER, true);

$rawResponse = curl_exec($curlHandle);
$httpStatus  = curl_getinfo($curlHandle, CURLINFO_HTTP_CODE);
$curlError   = curl_error($curlHandle);
curl_close($curlHandle);

echo $rawResponse;
?>
