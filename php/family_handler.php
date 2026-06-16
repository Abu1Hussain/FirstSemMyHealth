<?php
/*
 * ═══════════════════════════════════════════════════════════
 * Family Member Handler API
 * ═══════════════════════════════════════════════════════════
 * Handles adding new family members to the primary account.
 * ═══════════════════════════════════════════════════════════
 */

session_start();
header('Content-Type: application/json');

require_once '../DataBase/db_connect.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized access.']);
    exit();
}

$userId = $_SESSION['user_id'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $relationship = trim($_POST['relationship'] ?? '');
    $firstName    = trim($_POST['first_name'] ?? '');
    $lastName     = trim($_POST['last_name'] ?? '');
    $cpr          = trim($_POST['cpr'] ?? '');
    $dob          = trim($_POST['date_of_birth'] ?? '');
    $gender       = trim($_POST['gender'] ?? 'Other');
    $bloodType    = trim($_POST['blood_type'] ?? '');
    $phone        = trim($_POST['phone'] ?? '');
    $email        = trim($_POST['email'] ?? '');

    if (empty($relationship) || empty($firstName) || empty($lastName)) {
        echo json_encode(['status' => 'error', 'message' => 'Relationship, First Name, and Last Name are required.']);
        exit();
    }

    if (!in_array($relationship, ['Child', 'Mother/Father', 'Brother/Sister'])) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid relationship type.']);
        exit();
    }

    if (!empty($cpr) && !preg_match('/^\d{9}$/', $cpr)) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid CPR format. Must be exactly 9 digits.']);
        exit();
    }

    $stmt = $conn->prepare("INSERT INTO family_members (primary_user_id, relationship, first_name, last_name, cpr, date_of_birth, gender, blood_type, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    if ($stmt) {
        $stmt->bind_param(
            "isssssssss",
            $userId, $relationship, $firstName, $lastName, $cpr, $dob, $gender, $bloodType, $phone, $email
        );
        
        if ($stmt->execute()) {
            echo json_encode(['status' => 'success', 'message' => 'Family member added successfully.']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to add family member.']);
        }
        $stmt->close();
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Database error.']);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
}
