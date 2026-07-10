<?php
/*
 * ═══════════════════════════════════════════════════════════
 * AI Predictive Schedule Endpoint
 * Analyzes historical appointment data to forecast busy hours
 * for the next 7 days and suggests overflow doctor reassignments.
 *
 * Connected to: appointments table, ai_logs table
 * Called by:    admin.js (for the Forecast widget)
 * ═══════════════════════════════════════════════════════════
 */

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../DataBase/db_connect.php';
require_once __DIR__ . '/ai_config.php';

/* ── 1. Authentication ── */
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized. Admin access required.']);
    exit();
}

/* ── 2. Gather Historical Data ── */
// Get appointment counts grouped by day of week and hour
$historySql = "
    SELECT 
        DAYNAME(appointment_date) as day_of_week,
        HOUR(appointment_date) as hour_of_day,
        appointment_type,
        COUNT(*) as total_appointments
    FROM appointments
    WHERE status != 'cancelled'
    GROUP BY day_of_week, hour_of_day, appointment_type
    ORDER BY day_of_week, hour_of_day
";

$result = $conn->query($historySql);
$historicalData = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $historicalData[] = $row;
    }
}

// If there's absolutely no historical data, we can't forecast well.
if (empty($historicalData)) {
    echo json_encode([
        'status' => 'success',
        'forecast' => [],
        'message' => 'Not enough historical data to generate a forecast.'
    ]);
    exit();
}

/* ── 3. Build AI Prompt ── */
$systemPrompt = "You are an AI clinic administration assistant.
Analyze the following historical appointment volume data (grouped by day of the week, hour, and type).
Your task is to forecast the busy hours for the upcoming 7 days, and identify any shifts that are predicted to exceed our capacity limit of 4 chairs per hour.
If a shift exceeds capacity, suggest an \"overflow doctor reassignment\" (e.g., bringing in a doctor from a less busy specialty).

You MUST return a JSON object with a single array field named \"forecast\".
Each item in the \"forecast\" array must have:
1. \"day\" (e.g., \"Monday\")
2. \"peak_hours\" (e.g., \"09:00 - 11:00\")
3. \"predicted_volume\" (e.g., \"High\")
4. \"overflow_risk\" (boolean true/false)
5. \"suggestion\" (a string suggesting a reassignment if risk is true, or \"Adequate coverage\" if false)

IMPORTANT: Return ONLY valid JSON. Do not include markdown blocks like ```json.
Example output:
{
  \"forecast\": [
    {
      \"day\": \"Monday\",
      \"peak_hours\": \"10:00 - 12:00\",
      \"predicted_volume\": \"High\",
      \"overflow_risk\": true,
      \"suggestion\": \"Move 1 General Medicine doctor from Shift 2 to Shift 1 to cover overflow.\"
    }
  ]
}";

$userMessage = "Historical Data: " . json_encode($historicalData);

/* ── 4. Call Gemini ── */
$aiReplyText = callOpenAI($systemPrompt, $userMessage);

/* ── 5. Parse Response & Fallback ── */
$forecastData = null;

if ($aiReplyText) {
    $startIndex = strpos($aiReplyText, '{');
    $endIndex   = strrpos($aiReplyText, '}');
    
    if ($startIndex !== false && $endIndex !== false && $endIndex >= $startIndex) {
        $cleanJson = substr($aiReplyText, $startIndex, $endIndex - $startIndex + 1);
        $aiResult = json_decode($cleanJson, true);
        if ($aiResult && isset($aiResult['forecast'])) {
            $forecastData = $aiResult['forecast'];
        }
    }
}

// Fallback logic if AI fails or returns bad JSON
if (!$forecastData) {
    error_log("Predictive Schedule AI failed or returned invalid JSON. Using statistical fallback.");
    
    $forecastData = [];
    $days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Group totals by day to find the peak hour
    $dayTotals = [];
    foreach ($historicalData as $row) {
        $d = $row['day_of_week'];
        $h = (int)$row['hour_of_day'];
        if (!isset($dayTotals[$d])) $dayTotals[$d] = [];
        if (!isset($dayTotals[$d][$h])) $dayTotals[$d][$h] = 0;
        $dayTotals[$d][$h] += (int)$row['total_appointments'];
    }

    foreach ($days as $day) {
        if (isset($dayTotals[$day])) {
            $hours = $dayTotals[$day];
            arsort($hours); // Sort by volume descending
            $peakHour = array_key_first($hours);
            $maxVol = $hours[$peakHour];
            
            // Assume the historical data represents a span of ~4 weeks (roughly) to find an average per hour.
            // (In a real production system, we'd divide by the actual number of specific weekdays in the dataset).
            // For the fallback, we'll use a simple threshold on the raw total.
            $isOverflow = ($maxVol > 15); 
            
            $forecastData[] = [
                'day' => $day,
                'peak_hours' => str_pad($peakHour, 2, '0', STR_PAD_LEFT) . ':00 - ' . str_pad($peakHour+1, 2, '0', STR_PAD_LEFT) . ':00',
                'predicted_volume' => $isOverflow ? 'High' : 'Normal',
                'overflow_risk' => $isOverflow,
                'suggestion' => $isOverflow ? 'Statistical fallback: Recommend scheduling an extra doctor.' : 'Adequate coverage (Fallback).'
            ];
        }
    }
}

/* ── 6. Log to ai_logs ── */
$userId = $_SESSION['user_id'];
$logSql = "INSERT INTO ai_logs (user_id, request_type, input_text, ai_response, status) VALUES (?, 'PredictiveSchedule', 'Historical Aggregation', ?, 'success')";
$logStmt = $conn->prepare($logSql);
if ($logStmt) {
    $logResponse = json_encode(['forecast' => $forecastData]);
    $logStmt->bind_param("is", $userId, $logResponse);
    $logStmt->execute();
    $logStmt->close();
}

/* ── 7. Send Response ── */
echo json_encode([
    'status' => 'success',
    'forecast' => $forecastData
]);
?>
