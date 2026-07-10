<?php
/*
 * ═══════════════════════════════════════════════════════════
 * Family Member Handler API
 * ═══════════════════════════════════════════════════════════
 * Handles adding new family members to the primary account by 
 * creating them as full users and patients.
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
        // Fetch primary user info to inherit address, phone, and email if needed
        $primaryPhone = null;
        $primaryAddress = null;
        $primaryEmail = null;
        $stmtPrimary = $conn->prepare("SELECT phone, address, email FROM patients WHERE user_id = ?");
        if ($stmtPrimary) {
            $stmtPrimary->bind_param("i", $userId);
            $stmtPrimary->execute();
            $resPrimary = $stmtPrimary->get_result();
            if ($row = $resPrimary->fetch_assoc()) {
                $primaryPhone = $row['phone'];
                $primaryAddress = $row['address'];
                $primaryEmail = $row['email'];
            }
            $stmtPrimary->close();
        }

        if (empty($phone)) $phone = $primaryPhone;
        
        // The users table requires a UNIQUE email for authentication.
        // We generate a dummy email for the 'users' table, but store the inherited email in 'patients' table.
        $userEmail = "dependent_" . time() . "_" . rand(1000, 9999) . "@myhealth.local";
        if (empty($email)) $email = $primaryEmail;
        
        $userPassword = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);
        $role = 'patient';

        $conn->begin_transaction();
        try {
            // 1. Insert into users (dummy unique email)
            $stmtUser = $conn->prepare("INSERT INTO users (email, hash_password, role) VALUES (?, ?, ?)");
            $stmtUser->bind_param("sss", $userEmail, $userPassword, $role);
            $stmtUser->execute();
            $dependentUserId = $conn->insert_id;
            $stmtUser->close();

            // 2. Insert into patients (real inherited email)
            $stmtPatient = $conn->prepare("INSERT INTO patients (first_name, last_name, cpr, date_of_birth, gender, phone, email, address, blood_type, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmtPatient->bind_param("sssssssssi", $firstName, $lastName, $cpr, $dob, $gender, $phone, $email, $primaryAddress, $bloodType, $dependentUserId);
            $stmtPatient->execute();
            $stmtPatient->close();

            // 3. Insert into family_members
            $stmtFamily = $conn->prepare("INSERT INTO family_members (primary_user_id, dependent_user_id, relationship) VALUES (?, ?, ?)");
            $stmtFamily->bind_param("iis", $userId, $dependentUserId, $relationship);
            $stmtFamily->execute();
            $stmtFamily->close();

            $conn->commit();
            echo json_encode(['status' => 'success', 'message' => 'Family member added successfully.']);
        } catch (Exception $e) {
            $conn->rollback();
            echo json_encode(['status' => 'error', 'message' => 'Failed to add family member: ' . $e->getMessage()]);
        }
    } elseif ($action === 'edit') {
        if ($memberId <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'Invalid member ID.']);
            exit();
        }
        
        // Find dependent_user_id
        $dependentUserId = 0;
        $stmtFind = $conn->prepare("SELECT dependent_user_id FROM family_members WHERE member_id = ? AND primary_user_id = ?");
        if ($stmtFind) {
            $stmtFind->bind_param("ii", $memberId, $userId);
            $stmtFind->execute();
            $resFind = $stmtFind->get_result();
            if ($row = $resFind->fetch_assoc()) {
                $dependentUserId = $row['dependent_user_id'];
            }
            $stmtFind->close();
        }

        if ($dependentUserId === 0) {
            echo json_encode(['status' => 'error', 'message' => 'Family member not found.']);
            exit();
        }

        $conn->begin_transaction();
        try {
            // Update patients table
            $stmtPatient = $conn->prepare("UPDATE patients SET first_name=?, last_name=?, cpr=?, date_of_birth=?, gender=?, blood_type=?, phone=?, email=? WHERE user_id=?");
            $stmtPatient->bind_param("ssssssssi", $firstName, $lastName, $cpr, $dob, $gender, $bloodType, $phone, $email, $dependentUserId);
            $stmtPatient->execute();
            $stmtPatient->close();

            // Update family_members table
            $stmtFamily = $conn->prepare("UPDATE family_members SET relationship=? WHERE member_id=?");
            $stmtFamily->bind_param("si", $relationship, $memberId);
            $stmtFamily->execute();
            $stmtFamily->close();

            $conn->commit();
            echo json_encode(['status' => 'success', 'message' => 'Family member updated successfully.']);
        } catch (Exception $e) {
            $conn->rollback();
            echo json_encode(['status' => 'error', 'message' => 'Failed to update family member.']);
        }
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
}
?>
