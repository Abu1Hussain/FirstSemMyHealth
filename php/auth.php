<?php
/*
 * ═══════════════════════════════════════════════════════════
 * Authentication Handler
 * ═══════════════════════════════════════════════════════════
 *
 * Handles two actions:
 *   1. REGISTRATION — Creates a new patient account
 *      - Inserts a row into the 'users' table (login credentials)
 *      - Inserts a row into the 'patients' table (profile info)
 *
 *   2. LOGIN — Authenticates any user (patient, doctor, admin)
 *      - Accepts email OR CPR as the identifier
 *      - Verifies the password using password_verify()
 *      - Sets session variables for the logged-in user
 *
 * SECURITY:
 *   - All database queries use PREPARED STATEMENTS to prevent
 *     SQL injection attacks.
 *   - Passwords are hashed with password_hash() and verified
 *     with password_verify() — never stored as plain text.
 * ═══════════════════════════════════════════════════════════
 */

session_start();
header('Content-Type: application/json');

/* ── Connect to the database ── */
require_once '../DataBase/db_connect.php';


/**
 * sendResponse()
 * Sends a JSON response back to the frontend and stops execution.
 *
 * @param string $status   'success' or 'error'
 * @param string $message  Human-readable message to display
 * @param string $redirect (optional) Page to redirect to
 * @param string $role     (optional) User's role (patient/doctor/admin)
 */
function sendResponse($status, $message, $redirect = null, $role = null) {
    echo json_encode([
        'status'   => $status,
        'message'  => $message,
        'redirect' => $redirect,
        'role'     => $role
    ]);
    exit();
}


/* ══════════════════════════════════════════════════════
   REGISTRATION  (Patients only)
   ══════════════════════════════════════════════════════ */

$isRegistering = isset($_POST['register_btn'])
              || (isset($_POST['action']) && $_POST['action'] === 'register');

if ($isRegistering) {

    // --- Step 1: Grab and clean up the form inputs ---

    $firstName = trim($_POST['firstName'] ?? '');
    $lastName  = trim($_POST['lastName']  ?? '');
    $fullName  = trim($_POST['name']      ?? '');
    $email     = trim($_POST['email']     ?? '');
    $phone     = trim($_POST['phone']     ?? '');
    $cpr       = trim($_POST['cpr']       ?? '');
    $password  = $_POST['password'] ?? '';

    // If name was sent as one field (e.g. "John Doe") instead of
    // separate first/last, split it into two parts
    if (empty($firstName) && !empty($fullName)) {
        $nameParts = explode(' ', $fullName, 2);
        $firstName = $nameParts[0];
        $lastName  = isset($nameParts[1]) ? $nameParts[1] : '';
    }


    // --- Step 2: Check if the email is already taken ---

    $stmt = $conn->prepare("SELECT user_id FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows > 0) {
        $stmt->close();
        sendResponse('error', 'This email is already registered.');
    }
    $stmt->close();


    // --- Step 3: Check if the CPR is already taken ---

    $stmt = $conn->prepare("SELECT patient_id FROM patients WHERE cpr = ?");
    $stmt->bind_param("s", $cpr);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows > 0) {
        $stmt->close();
        sendResponse('error', 'This CPR number is already registered.');
    }
    $stmt->close();


    // --- Step 4: Hash the password securely ---
    // password_hash() creates a secure, salted hash
    // This means even if the database is stolen, passwords can't be read
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);


    // --- Step 5: Create the login account in the users table ---

    $stmt = $conn->prepare("INSERT INTO users (email, hash_password, role) VALUES (?, ?, 'patient')");
    $stmt->bind_param("ss", $email, $hashedPassword);

    if ($stmt->execute()) {
        $newUserId = $conn->insert_id;
        $stmt->close();

        // --- Step 6: Create the patient profile linked to the login account ---

        $stmt = $conn->prepare("INSERT INTO patients (user_id, first_name, last_name, cpr, phone, email) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("isssss", $newUserId, $firstName, $lastName, $cpr, $phone, $email);

        if ($stmt->execute()) {
            $stmt->close();
            $_SESSION['email'] = $email;
            sendResponse('success', 'Registration successful!', 'MFA.html');
        } else {
            $stmt->close();
            // Something went wrong with the patient profile — undo the user account
            $conn->query("DELETE FROM users WHERE user_id = $newUserId");
            sendResponse('error', 'Could not create patient profile. Please try again.');
        }
    } else {
        $stmt->close();
        sendResponse('error', 'Could not create account. Please try again.');
    }
}


/* ══════════════════════════════════════════════════════
   LOGIN  (All roles: Patient, Doctor, Admin)
   ══════════════════════════════════════════════════════ */

$isLoggingIn = isset($_POST['login_btn'])
            || (isset($_POST['action']) && $_POST['action'] === 'login');

if ($isLoggingIn) {

    // The user can log in with either their email or CPR number
    $identifier = trim($_POST['identifier'] ?? '');
    $password   = $_POST['password'] ?? '';


    // --- Step 1: Try to find the user by email ---

    $stmt = $conn->prepare("SELECT user_id, email, hash_password, role FROM users WHERE email = ?");
    $stmt->bind_param("s", $identifier);
    $stmt->execute();
    $result = $stmt->get_result();
    $user   = $result->fetch_assoc();
    $stmt->close();


    // --- Step 2: If email didn't match, try finding by CPR (patients only) ---

    if (!$user) {
        $stmt = $conn->prepare(
            "SELECT u.user_id, u.email, u.hash_password, u.role
             FROM users u
             JOIN patients p ON u.user_id = p.user_id
             WHERE p.cpr = ?"
        );
        $stmt->bind_param("s", $identifier);
        $stmt->execute();
        $result = $stmt->get_result();
        $user   = $result->fetch_assoc();
        $stmt->close();
    }


    // --- Step 3: Verify the password ---

    if (!$user) {
        sendResponse('error', 'Incorrect email/CPR or password. Please try again.');
    }

    /*
     * password_verify() compares the plain-text password the user
     * just typed with the hashed version stored in the database.
     * It returns true if they match, false if they don't.
     */
    if (!password_verify($password, $user['hash_password'])) {
        sendResponse('error', 'Incorrect email/CPR or password. Please try again.');
    }


    // --- Step 4: Login successful — save user info to session ---

    $_SESSION['user_id']   = $user['user_id'];
    $_SESSION['user_role'] = $user['role'];

    // Get the user's display name from the appropriate profile table
    $displayName = 'User';

    if ($user['role'] === 'patient') {
        // Patients have their name in the 'patients' table
        $stmt = $conn->prepare("SELECT first_name, last_name, patient_id FROM patients WHERE user_id = ?");
        $stmt->bind_param("i", $user['user_id']);
        $stmt->execute();
        $profile = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if ($profile) {
            $displayName = $profile['first_name'] . ' ' . $profile['last_name'];
            $_SESSION['patient_id'] = $profile['patient_id'];
        }

    } elseif ($user['role'] === 'doctor') {
        // Doctors have their name in the 'medical_staff' table
        $stmt = $conn->prepare("SELECT first_name, last_name, staff_id FROM medical_staff WHERE user_id = ?");
        $stmt->bind_param("i", $user['user_id']);
        $stmt->execute();
        $profile = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if ($profile) {
            $displayName = $profile['first_name'] . ' ' . $profile['last_name'];
            $_SESSION['staff_id'] = $profile['staff_id'];
        }

    } else {
        // Admin doesn't have a separate profile table
        $displayName = 'System Admin';
    }

    $_SESSION['user_name'] = $displayName;
    sendResponse('success', 'Login successful!', 'MFA.html', $user['role']);
}
?>
