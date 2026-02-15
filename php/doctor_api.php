<?php
session_start();
header('Content-Type: application/json');
require_once 'db_connect.php';

// Check if user is logged in (and is a doctor - explicit check recommended)
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit();
}

$user_id = $_SESSION['user_id'];
$response = [];

// 1. User Info
$response['user'] = [
    'name' => $_SESSION['user_name'] ?? 'Doctor',
    'initial' => strtoupper(substr($_SESSION['user_name'] ?? 'D', 0, 1))
];

// 2. Stats (Mocked for now as we don't know the exact DB schema for patients/doctors relation)
// In a real app, we would query:
// SELECT COUNT(*) FROM patients WHERE doctor_id = $user_id
// SELECT COUNT(*) FROM appointments WHERE doctor_id = $user_id AND date = CURDATE()

$response['stats'] = [
    'total_patients' => 12, // Dummy
    'today_appointments' => 5, // Dummy
    'pending_reviews' => 2 // Dummy
];

echo json_encode(['status' => 'success', 'data' => $response]);
?>
