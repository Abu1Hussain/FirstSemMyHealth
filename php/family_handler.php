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
    $action = $_POST['action'] ?? 'add';
    $memberId = isset($_POST['member_id']) ? intval($_POST['member_id']) : 0;

    if ($action === 'remove') {
        if ($memberId <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'Invalid member ID.']);
            exit();
        }
        $stmt = $conn->prepare("DELETE FROM family_members WHERE member_id = ? AND primary_user_id = ?");
        if ($stmt) {
            $stmt->bind_param("ii", $memberId, $userId);
            if ($stmt->execute()) {
                echo json_encode(['status' => 'success', 'message' => 'Family member removed successfully.']);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Failed to remove family member.']);
            }
            $stmt->close();
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Database error.']);
        }
        exit();
    }

    $relationship = trim($_POST['relationship'] ?? '');
    $firstName    = trim($_POST['first_name'] ?? '');
    $lastName     = trim($_POST['last_name'] ?? '');

    // Convert optional fields to NULL/defaults if empty
    $cpr          = trim($_POST['cpr'] ?? '');
    $cpr          = ($cpr === '') ? null : $cpr;

    $dob          = trim($_POST['date_of_birth'] ?? '');
    $dob          = ($dob === '') ? null : $dob;

    $gender       = trim($_POST['gender'] ?? 'Not Selected');
    $gender       = ($gender === '') ? 'Not Selected' : $gender;

    $bloodType    = trim($_POST['blood_type'] ?? '');
    $bloodType    = ($bloodType === '') ? null : $bloodType;

    $phone        = trim($_POST['phone'] ?? '');
    $phone        = ($phone === '') ? null : $phone;

    $email        = trim($_POST['email'] ?? '');
    $email        = ($email === '') ? null : $email;

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

    if ($action === 'add') {
        $stmt = $conn->prepare("INSERT INTO family_members (primary_user_id, relationship, first_name, last_name, cpr, date_of_birth, gender, blood_type, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        if ($stmt) {
            $stmt->bind_param("isssssssss", $userId, $relationship, $firstName, $lastName, $cpr, $dob, $gender, $bloodType, $phone, $email);
            if ($stmt->execute()) {
                echo json_encode(['status' => 'success', 'message' => 'Family member added successfully.']);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Failed to add family member.']);
            }
            $stmt->close();
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Database error.']);
        }
    } elseif ($action === 'edit') {
        if ($memberId <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'Invalid member ID.']);
            exit();
        }
        $stmt = $conn->prepare("UPDATE family_members SET relationship=?, first_name=?, last_name=?, cpr=?, date_of_birth=?, gender=?, blood_type=?, phone=?, email=? WHERE member_id=? AND primary_user_id=?");
        if ($stmt) {
            $stmt->bind_param("sssssssssii", $relationship, $firstName, $lastName, $cpr, $dob, $gender, $bloodType, $phone, $email, $memberId, $userId);
            if ($stmt->execute()) {
                echo json_encode(['status' => 'success', 'message' => 'Family member updated successfully.']);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Failed to update family member.']);
            }
            $stmt->close();
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Database error.']);
        }
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
}
