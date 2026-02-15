<?php
session_start();
require_once 'db_connect.php';

if (!isset($_SESSION['user_id'])) {
    die("Unauthorized Access");
}

if (isset($_POST['book_appointment'])) {
    $patient_id = $_SESSION['user_id'];
    $reason = mysqli_real_escape_string($conn, $_POST['reason']);
    $priority = 'Normal';
    $ai_suggestion = '';
    
    // ---------------------------------------------------------
    // 1. AI Triage Logic (Mocked for now, insert API call here)
    // ---------------------------------------------------------
    // $openai_key = 'YOUR_API_KEY';
    // $prompt = "Analyze priority for: $reason";
    // For demo, simple keyword matching or random
    if (stripos($reason, 'pain') !== false || stripos($reason, 'emergency') !== false) {
        $priority = 'Highly Important';
        $ai_suggestion = 'Immediate attention recommended. Please proceed to ER if critical.';
    } elseif (stripos($reason, 'fever') !== false || stripos($reason, 'sick') !== false) {
        $priority = 'Important';
        $ai_suggestion = 'Schedule within 24 hours.';
    } else {
        $priority = 'Normal';
        $ai_suggestion = 'Regular checkup schedule applies.';
    }
    
    // ---------------------------------------------------------
    // 2. Chair/Slot Constraint Logic & Queueing
    // ---------------------------------------------------------
    // Limit: 30 chairs/hour. 6 doctors.
    
    $request_date = $_POST['date'] ?? date('Y-m-d');
$doctor_id = $_POST['doctor_id'] ?? null;
$doctor_name = "General Doctor";
$capacity = 30; // Default

if ($doctor_id) {
    // Get Doctor Capacity & Name
    $q_doc = "SELECT name, capacity FROM users WHERE id='$doctor_id' AND role='doctor'";
    $r_doc = mysqli_query($conn, $q_doc);
    if ($doc_data = mysqli_fetch_assoc($r_doc)) {
        $doctor_name = $doc_data['name'];
        $capacity = $doc_data['capacity'];
    }
}

// Find first available slot on that date (9 AM - 5 PM)
$assigned_time = null;
$start_hour = 9;
$end_hour = 17;
$queue_number = 0;

for ($h = $start_hour; $h < $end_hour; $h++) {
   $start_str = "$request_date " . str_pad($h, 2, '0', STR_PAD_LEFT) . ":00:00";
   $end_str = "$request_date " . str_pad($h+1, 2, '0', STR_PAD_LEFT) . ":00:00";
   
   // Check count for THIS doctor if selected, else global (simplified)
   // If doctor_id is set, we check appointments for that doctor
   $query_check = "SELECT COUNT(*) as c FROM appointments WHERE appointment_time >= '$start_str' AND appointment_time < '$end_str'";
   if ($doctor_id) {
       $query_check .= " AND doctor_id='$doctor_id'";
   }
   
   $r = mysqli_query($conn, $query_check);
   $cnt = mysqli_fetch_assoc($r)['c'];
   
   if ($cnt < $capacity) {
       // Slot found
       $assigned_time = $start_str; 
       $queue_number = $cnt + 1;
       break;
   }
}

if (!$assigned_time) {
    echo json_encode(['status' => 'error', 'message' => "Sorry, Dr. $doctor_name is fully booked on $request_date. Please choose another date or doctor."]);
    exit();
}

$appointment_time = $assigned_time;
    
    // Handle File Upload
    $file_path = '';
    if (isset($_FILES['document']) && $_FILES['document']['error'] == 0) {
        $upload_dir = '../uploads/';
        if (!is_dir($upload_dir)) mkdir($upload_dir);
        $file_name = time() . '_' . $_FILES['document']['name'];
        move_uploaded_file($_FILES['document']['tmp_name'], $upload_dir . $file_name);
        $file_path = $file_name;
    }
    
    // Insert with Queue Number
    $query = "INSERT INTO appointments (patient_id, reason, ai_priority, ai_suggestion, appointment_time, queue_number) 
              VALUES ('$patient_id', '$reason', '$priority', '$ai_suggestion', '$appointment_time', '$queue_number')";
              
    if (mysqli_query($conn, $query)) {
        echo json_encode([
            'status' => 'success', 
            'message' => "Appointment booked successfully! Priority: $priority",
            'debug_ai' => $priority
        ]);
    } else {
        echo json_encode(['status' => 'error', 'message' => "Error booking: " . mysqli_error($conn)]);
    }
    exit();
}
?>
