<?php
session_start();
header('Content-Type: application/json');
require_once 'db_connect.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit();
}

$user_id = $_SESSION['user_id'];
$response = [];

// 1. User Info
$response['user'] = [
    'name' => $_SESSION['user_name'],
    'initial' => strtoupper(substr($_SESSION['user_name'], 0, 1))
];

// 2. Stats
$stats = [
    'health_status' => 'Good',
    'upcoming' => 0,
    'prescriptions' => 0
];

// Count upcoming appointments
$query = "SELECT COUNT(*) as count FROM appointments WHERE patient_id='$user_id' AND status='pending'";
$result = mysqli_query($conn, $query);
if ($row = mysqli_fetch_assoc($result)) {
    $stats['upcoming'] = $row['count'];
}

$response['stats'] = $stats;

// 4. Timeline Data (Today)
$timeline = [];
$today = date('Y-m-d');
$start_hour = 9;
$end_hour = 17; // 5 PM
$capacity_per_hour = 30; // Default fallback

// Fetch doctors
$doctors = [];
$q_docs = "SELECT id, name, profile_image, specialization, bio, capacity FROM users WHERE role='doctor'";
$r_docs = mysqli_query($conn, $q_docs);
while ($row = mysqli_fetch_assoc($r_docs)) {
    // Add image path prefix if needed, or assume relative to dashboard
    $row['image_url'] = '../image/' . $row['profile_image']; 
    $doctors[] = $row;
}
$response['doctors'] = $doctors;

for ($h = $start_hour; $h < $end_hour; $h++) {
    $time_start = "$today " . str_pad($h, 2, '0', STR_PAD_LEFT) . ":00:00";
    $time_end = "$today " . str_pad($h+1, 2, '0', STR_PAD_LEFT) . ":00:00";
    
    // Check count for this hour
    $q_time = "SELECT COUNT(*) as c FROM appointments WHERE appointment_time >= '$time_start' AND appointment_time < '$time_end'";
    $r_time = mysqli_query($conn, $q_time);
    $count = ($r_time) ? mysqli_fetch_assoc($r_time)['c'] : 0;
    
    $chairs_left = $capacity_per_hour - $count;
    $timeline[] = [
        'hour' => date('h:00 A', strtotime($time_start)) . ' - ' . date('h:00 A', strtotime($time_end)),
        'chairs_left' => max(0, $chairs_left),
        'total_chairs' => $capacity_per_hour,
        'status' => ($chairs_left > 0) ? 'Available' : 'Full'
    ];
}
$response['timeline'] = $timeline;

// 3. Appointments List
$appointments = [];
$query = "SELECT * FROM appointments WHERE patient_id='$user_id' ORDER BY appointment_time DESC";
$result = mysqli_query($conn, $query);
while ($row = mysqli_fetch_assoc($result)) {
    // Calculate wait time
    $wait_mins = ceil(($row['queue_number'] / 6) * 15);
    
    $appointments[] = [
        'date' => date('M d, Y h:i A', strtotime($row['appointment_time'])),
        'reason' => $row['reason'],
        'priority' => $row['ai_priority'],
        'status' => ucfirst($row['status']),
        'queue_number' => $row['queue_number'],
        'wait_time' => $wait_mins
    ];
}
$response['appointments'] = $appointments;

echo json_encode(['status' => 'success', 'data' => $response]);
?>
