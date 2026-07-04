<?php
session_start();
header('Content-Type: application/json');

require_once '../DataBase/db_connect.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit();
}

$userId = $_SESSION['user_id'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Log incoming request
    error_log("--- DOCTOR PROFILE FETCH DIAGNOSTIC ---");
    error_log("Incoming GET Request from User ID: " . $userId);
    
    // Fetch current doctor's profile
    $stmt = $conn->prepare("SELECT d.*, u.email as user_email FROM doctors d JOIN users u ON d.user_id = u.user_id WHERE d.user_id = ?");
    if (!$stmt) {
        error_log("Query Prepare Error: " . $conn->error);
        echo json_encode(['status' => 'error', 'message' => 'Query preparation failed']);
        exit();
    }
    
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        // Fetch Notifications
        $notifications = [];
        $notif_stmt = $conn->prepare("SELECT notif_id, sender, topic, message, is_read, created_at 
            FROM notifications 
            WHERE target = 'all_users' 
               OR target = 'all_doctors' 
               OR target_user_id = ?
            ORDER BY created_at DESC");
        
        if ($notif_stmt) {
            $notif_stmt->bind_param("i", $userId);
            $notif_stmt->execute();
            $notif_res = $notif_stmt->get_result();
            while ($notif_row = $notif_res->fetch_assoc()) {
                $notifications[] = [
                    'id'      => $notif_row['notif_id'],
                    'sender'  => $notif_row['sender'],
                    'topic'   => $notif_row['topic'],
                    'message' => $notif_row['message'],
                    'is_read' => $notif_row['is_read'],
                    'date'    => date('M d, Y h:i A', strtotime($notif_row['created_at']))
                ];
            }
            $notif_stmt->close();
        }
        $row['notifications'] = $notifications;

        error_log("Database Fetch Success. Data Object returned to frontend.");
        echo json_encode(['status' => 'success', 'data' => $row]);
    } else {
        error_log("Database Fetch Failed. No matching row in doctors table for user_id: " . $userId);
        echo json_encode(['status' => 'error', 'message' => 'Profile not found']);
    }
    $stmt->close();
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['action']) && $_POST['action'] === 'mark_notification_read') {
        $notifId = intval($_POST['notification_id'] ?? 0);
        if ($notifId > 0) {
            $stmt = $conn->prepare("UPDATE notifications SET is_read = 1 WHERE notif_id = ?");
            $stmt->bind_param("i", $notifId);
            $stmt->execute();
            $stmt->close();
            echo json_encode(['status' => 'success']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Invalid notification ID']);
        }
        exit();
    }

    // Collect data
    $firstName = $_POST['first_name'] ?? '';
    $lastName = $_POST['last_name'] ?? '';
    $cpr = $_POST['cpr'] ?? '';
    $title = $_POST['title'] ?? '';
    $location = $_POST['location'] ?? '';
    $phone = $_POST['phone'] ?? '';
    
    $specialty = $_POST['specialty'] ?? '';
    $subspecialty = $_POST['subspecialty'] ?? '';
    $education = $_POST['education'] ?? '';
    $certifications = $_POST['certifications'] ?? '';
    $languages = $_POST['languages'] ?? '';
    $bio = $_POST['bio'] ?? '';

    $alertNew = isset($_POST['pref_alert_new']) ? 1 : 0;
    $alertCancel = isset($_POST['pref_alert_cancel']) ? 1 : 0;
    $slotDuration = $_POST['slot_duration'] ?? 30;
    $bufferTime = $_POST['buffer_time'] ?? 0;
    $theme = $_POST['pref_theme'] ?? 'system';

    // Update doctors table
    $stmt = $conn->prepare("UPDATE doctors SET 
        first_name = ?, last_name = ?, cpr = ?, professional_title = ?,
        clinic_location = ?, phone = ?, specialization = ?, sub_specialties = ?,
        education = ?, board_certifications = ?, languages = ?, bio = ?,
        alert_new_appointment = ?, alert_cancellation = ?, slot_duration = ?, buffer_time = ?, theme_override = ?
        WHERE user_id = ?");

    $stmt->bind_param("ssssssssssssiiiisi", 
        $firstName, $lastName, $cpr, $title, 
        $location, $phone, $specialty, $subspecialty, 
        $education, $certifications, $languages, $bio,
        $alertNew, $alertCancel, $slotDuration, $bufferTime, $theme, 
        $userId
    );

    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Profile updated successfully']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to update profile: ' . $conn->error]);
    }
    $stmt->close();
    exit();
}
?>
