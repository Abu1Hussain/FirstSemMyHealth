<?php
/*
 * ═══════════════════════════════════════════════════════════
 * AI Configuration File
 * Central place to set your OpenAI API key and model.
 * Also contains the callOpenAI() helper used by all AI files.
 * ═══════════════════════════════════════════════════════════
 */


/* ── 1. PUT YOUR OPENAI API KEY HERE ── */

$OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY_HERE';
//                 ^^^^^^^^^^^^^^^^^^^^^^^^
//   Go to https://platform.openai.com/api-keys
//   Create a new key and paste it between the quotes above.


/* ── 2. CHOOSE THE AI MODEL ── */

$OPENAI_MODEL = 'gpt-3.5-turbo';
//               Options: 'gpt-3.5-turbo' (cheap + fast)
//                        'gpt-4'         (smarter, costs more)
//                        'gpt-4o'        (latest, recommended)


/* ── 3. API ENDPOINT ── */

$OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
//                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//   This is the official OpenAI chat completions URL.
//   Do NOT change this unless you are using a proxy or Azure.


/* ─────────────────────────────────────────────────────
   callOpenAI($systemPrompt, $userMessage)

   Sends a message to OpenAI and returns the AI's reply
   as a plain text string, or null if something failed.

   Parameters:
     $systemPrompt  – tells the AI what role to play
     $userMessage   – the actual question / symptom text

   Returns:
     string  – the AI's reply text
     null    – if the API call failed
   ───────────────────────────────────────────────────── */

function callOpenAI($systemPrompt, $userMessage) {

    // Pull in the config variables from above
    global $OPENAI_API_KEY, $OPENAI_MODEL, $OPENAI_API_URL;

    // Build the request body
    $requestBody = json_encode([
        'model'    => $OPENAI_MODEL,
        'messages' => [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user',   'content' => $userMessage]
        ],
        'temperature' => 0.3,   // Low temperature = more consistent answers
        'max_tokens'  => 500    // Keep responses concise
    ]);

    // Set up the HTTP request using cURL
    $curlHandle = curl_init($OPENAI_API_URL);

    curl_setopt($curlHandle, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($curlHandle, CURLOPT_POST, true);
    curl_setopt($curlHandle, CURLOPT_POSTFIELDS, $requestBody);
    curl_setopt($curlHandle, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $OPENAI_API_KEY
    ]);

    // Send the request
    $rawResponse = curl_exec($curlHandle);
    $httpStatus  = curl_getinfo($curlHandle, CURLINFO_HTTP_CODE);
    $curlError   = curl_error($curlHandle);
    curl_close($curlHandle);

    // Check for errors
    if ($curlError) {
        error_log("OpenAI cURL Error: " . $curlError);
        return null;
    }

    if ($httpStatus !== 200) {
        error_log("OpenAI API returned HTTP $httpStatus: " . $rawResponse);
        return null;
    }

    // Parse the JSON response
    $parsedResponse = json_decode($rawResponse, true);

    if (isset($parsedResponse['choices'][0]['message']['content'])) {
        return trim($parsedResponse['choices'][0]['message']['content']);
    }

    error_log("OpenAI response format unexpected: " . $rawResponse);
    return null;
}
?>
