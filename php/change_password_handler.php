<?php
/*
 * ═══════════════════════════════════════════════════════════
 * Change Password Handler
 * ═══════════════════════════════════════════════════════════
 *
 * Verifies the current password, validates the new password
 * mismatch, and updates the secure hash in the database.
 * ═══════════════════════════════════════════════════════════
 */

session_start();
header('Content-Type: application/json');

/* ── Connect to the database ── */
require_once '../DataBase/db_connect.php';

/* ── Check authentication ── */
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized access.']);
    exit();
}

$userId = $_SESSION['user_id'];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['change_password'])) {
    $currentPass = $_POST['current_password'] ?? '';
    $newPass     = $_POST['new_password']     ?? '';
    $confirmPass = $_POST['confirm_password'] ?? '';

    // 1. Basic empty check
    if (empty($currentPass) || empty($newPass) || empty($confirmPass)) {
        echo json_encode(['status' => 'error', 'message' => 'All fields are required.']);
        exit();
    }

    // 2. Matching check
    if ($newPass !== $confirmPass) {
        echo json_encode(['status' => 'error', 'message' => 'New passwords do not match.']);
        exit();
    }

    // 3. Length check
    if (strlen($newPass) < 8) {
        echo json_encode(['status' => 'error', 'message' => 'New password must be at least 8 characters.']);
        exit();
    }

    // 4. Fetch current password hash
    $stmt = $conn->prepare("SELECT hash_password FROM users WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        $storedHash = $row['hash_password'];

        // 5. Verify current password
        if (password_verify($currentPass, $storedHash)) {
            
            // 6. Hash and Update
            $newHash = password_hash($newPass, PASSWORD_DEFAULT);
            $updateStmt = $conn->prepare("UPDATE users SET hash_password = ? WHERE user_id = ?");
            $updateStmt->bind_param("si", $newHash, $userId);
            
            if ($updateStmt->execute()) {
                echo json_encode([
                    'status' => 'success', 
                    'message' => 'Password updated successfully. Please use your new password next time you log in.'
                ]);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Failed to update password in database.']);
            }
            $updateStmt->close();

        } else {
            // Suggest Forgot Password flow on UI
            echo json_encode([
                'status' => 'error', 
                'type' => 'auth_fail', 
                'message' => 'The current password you entered is incorrect.'
            ]);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'User not found.']);
    }
    $stmt->close();
    exit();
}
?>
