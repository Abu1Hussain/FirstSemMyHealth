<?php
/*
 * ═══════════════════════════════════════════════════════════
 * Profile Handler API
 * ═══════════════════════════════════════════════════════════
 * Handles updating patient profile data, including mandatory
 * fields (Name, CPR, DOB, etc) and optional medical context.
 * ═══════════════════════════════════════════════════════════
 */

session_start();
header('Content-Type: application/json');

require_once '../DataBase/db_connect.php';

// Ensure user is logged in (with fallback demo session)
if (!isset($_SESSION['user_id'])) {
    $_SESSION['user_id'] = 3001;
    $_SESSION['patient_id'] = 6001;
    $_SESSION['user_role'] = 'patient';
    $_SESSION['user_name'] = 'Patient One';
}

$userId = $_SESSION['user_id'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // 1. Retrieve all fields
    $firstName = trim($_POST['first_name'] ?? '');
    $lastName  = trim($_POST['last_name'] ?? '');
    $cpr       = trim($_POST['cpr'] ?? '');
    $dob       = trim($_POST['date_of_birth'] ?? '');
    $gender    = trim($_POST['gender'] ?? 'Not Selected');
    $bloodType = trim($_POST['blood_type'] ?? '');
    $phone     = trim($_POST['phone'] ?? '');
    $email     = trim($_POST['email'] ?? '');
    
    // Optional fields
    $emContactName     = trim($_POST['emergency_contact_name'] ?? '');
    $emContactRelation = trim($_POST['emergency_contact_relation'] ?? '');
    $emContactPhone    = trim($_POST['emergency_contact_phone'] ?? '');
    $allergies         = trim($_POST['allergies'] ?? '');
    $chronicCond       = trim($_POST['chronic_conditions'] ?? '');
    
    // Preferences JSON
    $prefData = [
        'sms_notifications'   => isset($_POST['pref_sms']) && $_POST['pref_sms'] === 'true',
        'email_notifications' => isset($_POST['pref_email']) && $_POST['pref_email'] === 'true',
        'push_notifications'  => isset($_POST['pref_push']) && $_POST['pref_push'] === 'true',
        'theme_mode'          => trim($_POST['pref_theme'] ?? 'system')
    ];
    $preferences = json_encode($prefData);

    // 2. Validation
    if (empty($firstName) || empty($lastName) || empty($cpr)) {
        echo json_encode(['status' => 'error', 'message' => 'Name and CPR are required.']);
        exit();
    }

    // Bahraini CPR strict 9-digit validation
    if (!preg_match('/^\d{9}$/', $cpr)) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid CPR format. Must be exactly 9 digits.']);
        exit();
    }

    // Validate email
    if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid email address format.']);
        exit();
    }

    // 3. Check for CPR uniqueness (excluding current patient)
    $stmt = $conn->prepare("SELECT user_id FROM patients WHERE cpr = ? AND user_id != ?");
    $stmt->bind_param("si", $cpr, $userId);
    $stmt->execute();
    if ($stmt->get_result()->num_rows > 0) {
        echo json_encode(['status' => 'error', 'message' => 'This CPR is already registered to another account.']);
        $stmt->close();
        exit();
    }
    $stmt->close();

    // 4. Update Database
    $query = "UPDATE patients SET 
                first_name = ?, last_name = ?, cpr = ?, date_of_birth = ?, gender = ?, blood_type = ?,
                phone = ?, email = ?, emergency_contact_name = ?, emergency_contact_relation = ?,
                emergency_contact_phone = ?, allergies = ?, chronic_conditions = ?, preferences = ?
              WHERE user_id = ?";
              
    $stmt = $conn->prepare($query);
    if ($stmt) {
        $stmt->bind_param(
            "ssssssssssssssi",
            $firstName, $lastName, $cpr, $dob, $gender, $bloodType,
            $phone, $email, $emContactName, $emContactRelation,
            $emContactPhone, $allergies, $chronicCond, $preferences,
            $userId
        );
        
        if ($stmt->execute()) {
            // Also update the users table email to keep them in sync
            if (!empty($email)) {
                $uStmt = $conn->prepare("UPDATE users SET email = ? WHERE user_id = ?");
                $uStmt->bind_param("si", $email, $userId);
                $uStmt->execute();
                $uStmt->close();
            }
            
            $_SESSION['user_name'] = $firstName . ' ' . $lastName;
            
            echo json_encode(['status' => 'success', 'message' => 'Profile updated successfully.']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to update profile database.']);
        }
        $stmt->close();
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Database error.']);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
}
