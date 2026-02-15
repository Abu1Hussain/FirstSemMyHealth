<?php
session_start();
header('Content-Type: application/json');
require_once 'db_connect.php';

$response = ['status' => 'error', 'message' => 'Invalid Request'];

// Helper to send response
function sendResponse($status, $message, $redirect = null, $role = null) {
    echo json_encode(['status' => $status, 'message' => $message, 'redirect' => $redirect, 'role' => $role]);
    exit();
}

// Registration Logic
if (isset($_POST['register_btn']) || isset($_POST['action']) && $_POST['action'] == 'register') {
    $name = mysqli_real_escape_string($conn, $_POST['name']);
    $email = mysqli_real_escape_string($conn, $_POST['email']);
    $phone = mysqli_real_escape_string($conn, $_POST['phone']);
    $cpr = mysqli_real_escape_string($conn, $_POST['cpr']);
    $password = mysqli_real_escape_string($conn, $_POST['password']);
    
    // Check if user exists
    $user_check_query = "SELECT * FROM users WHERE email='$email' OR cpr='$cpr' LIMIT 1";
    $result = mysqli_query($conn, $user_check_query);
    $user = mysqli_fetch_assoc($result);
    
    if ($user) {
        if ($user['email'] === $email) sendResponse('error', "Email already exists");
        if ($user['cpr'] === $cpr) sendResponse('error', "CPR already exists");
    }

    // Register user
    $query = "INSERT INTO users (name, email, cpr, phone, password, role) 
              VALUES('$name', '$email', '$cpr', '$phone', '$password', 'patient')";
    if(mysqli_query($conn, $query)) {
        $_SESSION['email'] = $email;
        $_SESSION['success'] = "You are now logged in";
        sendResponse('success', 'Registration successful', 'MFA.html');
    } else {
        sendResponse('error', 'Database error: ' . mysqli_error($conn));
    }
}

// Login Logic
if (isset($_POST['login_btn']) || isset($_POST['action']) && $_POST['action'] == 'login') {
    $identifier = mysqli_real_escape_string($conn, $_POST['identifier']);
    $password = mysqli_real_escape_string($conn, $_POST['password']);

    $query = "SELECT * FROM users WHERE (email='$identifier' OR cpr='$identifier') AND password='$password'";
    $results = mysqli_query($conn, $query);
    if (mysqli_num_rows($results) == 1) {
        $user = mysqli_fetch_assoc($results);
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_name'] = $user['name'];
        $_SESSION['user_role'] = $user['role'];
        $_SESSION['success'] = "You are now logged in";
        
        // Include role in response
        sendResponse('success', 'Login successful', 'MFA.html', $user['role']);
    } else {
        sendResponse('error', "Wrong username/password combination");
    }
}
?>
