<?php
/*
 * ═══════════════════════════════════════════════════════════
 * Database Setup & Seeding Script
 * ═══════════════════════════════════════════════════════════
 *
 * This script creates all required database tables inside the
 * 'medical_center' database and fills them with demo data.
 *
 * Tables created:
 *   1. users            – Login accounts (email, hashed password, role)
 *   2. patients         – Patient profiles (name, CPR, blood type, etc.)
 *   3. doctors         – Doctor profiles (specialization, image, bio)
 *   4. appointments     – Patient-doctor bookings
 *   5. medical_records  – Visit records and summaries
 *   6. diagnoses        – Diagnosis details linked to records
 *   7. prescriptions    – Medication details linked to records
 *   8. lab_results      – Lab test results linked to records
 *   9. system_logs      – System event logs (admin dashboard)
 *  10. audit_trail      – User action audit log (admin dashboard)
 *  11. ai_logs          – AI usage logs (admin dashboard)
 *  12. document_queue   – Uploaded document queue (admin dashboard)
 *  13. feedback_reports – User feedback and reports (admin dashboard)
 *
 * HOW TO RUN:
 *   Open in your browser: http://localhost/FirstSemMyHealth/php/setup.php
 *
 * NOTE: This uses the 'medical_center' database as the PRIMARY
 *       and ONLY database for the entire website.
 * ═══════════════════════════════════════════════════════════
 */

/* ── Database credentials (same as db_connect.php) ── */
$servername = "localhost";
$username   = "root";
$password   = "";
$dbname     = "medical_center";

/* ── Connect to MySQL (without selecting a database yet) ── */
$conn = new mysqli($servername, $username, $password);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

/* ── Create the database if it doesn't exist ── */
$conn->query("CREATE DATABASE IF NOT EXISTS `$dbname` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
$conn->select_db($dbname);
$conn->set_charset("utf8mb4");
echo "✅ Database '$dbname' is ready.<br><br>";


/* ────────────────────────────────────────────────────
   TABLE 1: users
   Stores login credentials and role for every user.
   Every person who can log in has a row here.
   ──────────────────────────────────────────────────── */

$conn->query("CREATE TABLE IF NOT EXISTS users (
    user_id       INT AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    hash_password VARCHAR(255) NOT NULL,
    role          ENUM('patient', 'doctor', 'admin') DEFAULT 'patient',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

// --- Migration: Rename password_hash to hash_password if it exists ---
$checkColumn = $conn->query("SHOW COLUMNS FROM users LIKE 'password_hash'");
if ($checkColumn && $checkColumn->num_rows > 0) {
    $conn->query("ALTER TABLE users CHANGE password_hash hash_password VARCHAR(255) NOT NULL");
    echo "🔄 Migrated 'users' table: Renamed 'password_hash' to 'hash_password'.<br>";
}

echo "📋 Table 'users' ready.<br>";


/* ────────────────────────────────────────────────────
   TABLE 2: patients
   Stores detailed profile info for patients.
   Linked to the users table via user_id.
   ──────────────────────────────────────────────────── */

$conn->query("CREATE TABLE IF NOT EXISTS patients (
    patient_id    INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT NOT NULL,
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    cpr           VARCHAR(20) NOT NULL UNIQUE,
    date_of_birth DATE,
    gender        ENUM('Male', 'Female'),
    phone         VARCHAR(20),
    email         VARCHAR(255),
    address       TEXT,
    blood_type    VARCHAR(5),
    emergency_contact_name VARCHAR(100),
    emergency_contact_relation VARCHAR(50),
    emergency_contact_phone VARCHAR(20),
    allergies     TEXT,
    chronic_conditions TEXT,
    preferences   TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
echo "📋 Table 'patients' created.<br>";


/* ────────────────────────────────────────────────────
   TABLE: family_members
   Stores family accounts linked to the primary user.
   ──────────────────────────────────────────────────── */

$conn->query("CREATE TABLE IF NOT EXISTS family_members (
    member_id       INT AUTO_INCREMENT PRIMARY KEY,
    primary_user_id INT NOT NULL,
    relationship    ENUM('Child', 'Mother/Father', 'Brother/Sister') NOT NULL,
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    cpr             VARCHAR(20),
    date_of_birth   DATE,
    gender          ENUM('Male', 'Female'),
    blood_type      VARCHAR(5),
    phone           VARCHAR(20),
    email           VARCHAR(255),
    FOREIGN KEY (primary_user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
echo "📋 Table 'family_members' created.<br>";


/* ────────────────────────────────────────────────────
   TABLE 3: doctors
   Stores detailed profile info for doctors and staff.
   Linked to the users table via user_id.
   The profile_image column stores the filename of the
   doctor's photo from the /image/ folder.
   ──────────────────────────────────────────────────── */

$conn->query("CREATE TABLE IF NOT EXISTS doctors (
    doctor_id      INT AUTO_INCREMENT PRIMARY KEY,
    user_id        INT NOT NULL,
    first_name     VARCHAR(100) NOT NULL,
    last_name      VARCHAR(100) NOT NULL,
    role           VARCHAR(50) DEFAULT 'Doctor',
    specialization VARCHAR(100),
    phone          VARCHAR(20),
    email          VARCHAR(255),
    department     VARCHAR(100),
    profile_image  VARCHAR(255) DEFAULT 'default_user.png',
    bio            TEXT,
    capacity       INT DEFAULT 30,
    presence_status ENUM('on_duty','in_consultation','on_break','off_shift') DEFAULT 'off_shift',
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

// --- Migration: Add presence_status column if it doesn't exist ---
$checkCol = $conn->query("SHOW COLUMNS FROM doctors LIKE 'presence_status'");
if ($checkCol && $checkCol->num_rows == 0) {
    $conn->query("ALTER TABLE doctors ADD COLUMN presence_status ENUM('on_duty','in_consultation','on_break','off_shift') DEFAULT 'off_shift'");
    echo "🔄 Migrated 'doctors' table: Added 'presence_status' column.<br>";
}

echo "📋 Table 'doctors' created.<br>";


/* ────────────────────────────────────────────────────
   TABLE 4: appointments
   Tracks patient bookings with doctors.
   Includes AI triage priority and queue number.
   ──────────────────────────────────────────────────── */

$conn->query("CREATE TABLE IF NOT EXISTS appointments (
    appointment_id   INT AUTO_INCREMENT PRIMARY KEY,
    patient_id       INT NOT NULL,
    doctor_id        INT,
    appointment_date DATETIME NOT NULL,
    appointment_type VARCHAR(100) DEFAULT 'General',
    status           VARCHAR(50) DEFAULT 'pending',
    reason           TEXT,
    ai_priority      VARCHAR(50) DEFAULT 'Standard',
    ai_suggestion    TEXT,
    queue_number     INT,
    created_by       INT,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id)   REFERENCES doctors(doctor_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

// --- Migration: Change ai_priority from ENUM to VARCHAR(50) if needed ---
$colInfo = $conn->query("SHOW COLUMNS FROM appointments LIKE 'ai_priority'");
if ($colInfo && $colInfo->num_rows > 0) {
    $colRow = $colInfo->fetch_assoc();
    if (stripos($colRow['Type'], 'enum') !== false) {
        $conn->query("ALTER TABLE appointments MODIFY COLUMN ai_priority VARCHAR(50) DEFAULT 'Standard'");
        echo "🔄 Migrated 'appointments' table: Changed 'ai_priority' from ENUM to VARCHAR(50).<br>";
    }
}

echo "📋 Table 'appointments' ready.<br>";


/* ────────────────────────────────────────────────────
   TABLE 5: medical_records
   Stores visit records written by doctors for patients.
   ──────────────────────────────────────────────────── */

$conn->query("CREATE TABLE IF NOT EXISTS medical_records (
    record_id   INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id   INT,
    patient_id  INT NOT NULL,
    record_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    record_type VARCHAR(100),
    summary     TEXT,
    source_type VARCHAR(50),
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE SET NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
echo "📋 Table 'medical_records' created.<br>";


/* ────────────────────────────────────────────────────
   TABLE 6: diagnoses
   Stores diagnosis details linked to medical records.
   ──────────────────────────────────────────────────── */

$conn->query("CREATE TABLE IF NOT EXISTS diagnoses (
    diagnosis_id   INT AUTO_INCREMENT PRIMARY KEY,
    record_id      INT NOT NULL,
    diagnosis_name VARCHAR(255) NOT NULL,
    icd_code       VARCHAR(20),
    severity       ENUM('Mild', 'Moderate', 'Severe', 'Critical') DEFAULT 'Mild',
    notes          TEXT,
    FOREIGN KEY (record_id) REFERENCES medical_records(record_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
echo "📋 Table 'diagnoses' created.<br>";


/* ────────────────────────────────────────────────────
   TABLE 7: prescriptions
   Stores medication details linked to medical records.
   ──────────────────────────────────────────────────── */

$conn->query("CREATE TABLE IF NOT EXISTS prescriptions (
    prescription_id INT AUTO_INCREMENT PRIMARY KEY,
    record_id       INT NOT NULL,
    medication_name VARCHAR(255) NOT NULL,
    dosage          VARCHAR(100),
    frequency       VARCHAR(100),
    duration        VARCHAR(100),
    instructions    TEXT,
    FOREIGN KEY (record_id) REFERENCES medical_records(record_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
echo "📋 Table 'prescriptions' created.<br>";


/* ────────────────────────────────────────────────────
   TABLE 8: lab_results
   Stores lab test results linked to medical records.
   ──────────────────────────────────────────────────── */

$conn->query("CREATE TABLE IF NOT EXISTS lab_results (
    lab_result_id INT AUTO_INCREMENT PRIMARY KEY,
    record_id     INT NOT NULL,
    test_name     VARCHAR(255) NOT NULL,
    result_value  VARCHAR(255),
    normal_range  VARCHAR(100),
    status        ENUM('Normal', 'Abnormal', 'Critical') DEFAULT 'Normal',
    FOREIGN KEY (record_id) REFERENCES medical_records(record_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
echo "📋 Table 'lab_results' created.<br>";


/* ────────────────────────────────────────────────────
   TABLE 9: system_logs
   Records system events (logins, errors, etc.)
   Used by the admin dashboard's "System Logs" tab.
   ──────────────────────────────────────────────────── */

$conn->query("CREATE TABLE IF NOT EXISTS system_logs (
    log_id     INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT,
    event      VARCHAR(255) NOT NULL,
    status     VARCHAR(50) DEFAULT 'info',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
echo "📋 Table 'system_logs' created.<br>";


/* ────────────────────────────────────────────────────
   TABLE 10: audit_trail
   Records who did what and when (for admin auditing).
   Used by the admin dashboard's "Audit Trail" tab.
   ──────────────────────────────────────────────────── */

$conn->query("CREATE TABLE IF NOT EXISTS audit_trail (
    audit_id       INT AUTO_INCREMENT PRIMARY KEY,
    user_id        INT,
    action         VARCHAR(255) NOT NULL,
    table_affected VARCHAR(100),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
echo "📋 Table 'audit_trail' created.<br>";


/* ────────────────────────────────────────────────────
   TABLE 11: ai_logs
   Records AI triage actions and results.
   Used by the admin dashboard's "AI Logs" tab.
   ──────────────────────────────────────────────────── */

$conn->query("CREATE TABLE IF NOT EXISTS ai_logs (
    log_id      INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT,
    action_type VARCHAR(100) NOT NULL,
    details     TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
echo "📋 Table 'ai_logs' created.<br>";


/* ────────────────────────────────────────────────────
   TABLE 12: document_queue
   Stores uploaded medical documents from patients.
   Used by the admin dashboard's "Document Queue" tab.
   ──────────────────────────────────────────────────── */

$conn->query("CREATE TABLE IF NOT EXISTS document_queue (
    doc_id      INT AUTO_INCREMENT PRIMARY KEY,
    patient_id  INT NOT NULL,
    file_name   VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
echo "📋 Table 'document_queue' created.<br>";


/* ────────────────────────────────────────────────────
   TABLE 13: feedback_reports
   Stores user feedback and bug reports.
   Used by the admin dashboard's "Reports" tab.
   ──────────────────────────────────────────────────── */

$conn->query("CREATE TABLE IF NOT EXISTS feedback_reports (
    report_id  INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT,
    type       VARCHAR(50) NOT NULL,
    message    TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
echo "📋 Table 'feedback_reports' created.<br>";


/* ────────────────────────────────────────────────────
   TABLE 13b: invoices
   Stores billing invoices for patients.
   Created by admins, visible to patients.
   ──────────────────────────────────────────────────── */

$conn->query("CREATE TABLE IF NOT EXISTS invoices (
    invoice_id     INT AUTO_INCREMENT PRIMARY KEY,
    patient_id     INT NOT NULL,
    admin_id       INT DEFAULT NULL,
    subtotal       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_rate       DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    tax_amount     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status         ENUM('pending','paid','cancelled','terminated') DEFAULT 'pending',
    issue_date     DATETIME DEFAULT CURRENT_TIMESTAMP,
    due_date       DATE,
    paid_at        DATETIME DEFAULT NULL,
    payment_method VARCHAR(50) DEFAULT NULL,
    notes          TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
echo "📋 Table 'invoices' created.<br>";

// Migration: add tax columns to existing invoices table if missing
$colCheck = $conn->query("SHOW COLUMNS FROM invoices LIKE 'subtotal'");
if ($colCheck && $colCheck->num_rows == 0) {
    $conn->query("ALTER TABLE invoices ADD COLUMN subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER patient_id");
    $conn->query("ALTER TABLE invoices ADD COLUMN tax_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00 AFTER subtotal");
    $conn->query("ALTER TABLE invoices ADD COLUMN tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER tax_rate");
    $conn->query("ALTER TABLE invoices ADD COLUMN due_date DATE AFTER issue_date");
    echo "📋 Migration: Added tax columns to 'invoices'.<br>";
}

// Migration: add admin_id if missing
$colCheck2 = $conn->query("SHOW COLUMNS FROM invoices LIKE 'admin_id'");
if ($colCheck2 && $colCheck2->num_rows == 0) {
    $conn->query("ALTER TABLE invoices ADD COLUMN admin_id INT DEFAULT NULL AFTER patient_id");
    echo "📋 Migration: Added admin_id to 'invoices'.<br>";
}

// Migration: add paid_at & payment_method if missing
$colCheck3 = $conn->query("SHOW COLUMNS FROM invoices LIKE 'paid_at'");
if ($colCheck3 && $colCheck3->num_rows == 0) {
    $conn->query("ALTER TABLE invoices ADD COLUMN paid_at DATETIME DEFAULT NULL AFTER due_date");
    $conn->query("ALTER TABLE invoices ADD COLUMN payment_method VARCHAR(50) DEFAULT NULL AFTER paid_at");
    echo "📋 Migration: Added payment columns to 'invoices'.<br>";
}

// Migration: update status enum to include pending/terminated
$conn->query("ALTER TABLE invoices MODIFY COLUMN status ENUM('pending','unpaid','paid','cancelled','terminated','overdue') DEFAULT 'pending'");
// Convert old 'unpaid' to 'pending'
$conn->query("UPDATE invoices SET status='pending' WHERE status='unpaid'");

/* ────────────────────────────────────────────────────
   TABLE 14: tickets
   Stores patient tickets for their appointments.
   Linked to doctors via staff_id for easier filtering.
   ──────────────────────────────────────────────────── */

$conn->query("CREATE TABLE IF NOT EXISTS tickets (
    ticket_id      INT AUTO_INCREMENT PRIMARY KEY,
    patient_id     INT NOT NULL,
    appointment_id INT NOT NULL,
    doctor_id       INT,
    ticket_code    VARCHAR(20) NOT NULL,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id)     REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id)       REFERENCES doctors(doctor_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
echo "📋 Table 'tickets' created.<br>";


/* ────────────────────────────────────────────────────
   TABLE 15: notifications
   Stores notifications sent from admin to users.
   ──────────────────────────────────────────────────── */

$conn->query("CREATE TABLE IF NOT EXISTS notifications (
    notif_id     INT AUTO_INCREMENT PRIMARY KEY,
    sender       VARCHAR(255) NOT NULL,
    target       VARCHAR(255) NOT NULL,
    target_user_id INT NULL,
    topic        VARCHAR(255) NOT NULL,
    message      TEXT NOT NULL,
    is_read      BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (target_user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
echo "📋 Table 'notifications' created.<br>";


/* ═══════════════════════════════════════════════════
   SEEDING DEMO DATA
   ═══════════════════════════════════════════════════ */

echo "<br><strong>🌱 Seeding demo data...</strong><br><br>";

/*
 * All demo accounts use this password.
 * We hash it properly using password_hash() so it's stored securely.
 * To log in with any demo account, use: pass1234
 */
$defaultPassword    = 'pass1234';
$hashedPassword     = password_hash($defaultPassword, PASSWORD_DEFAULT);


/* ── Seed Admin Account ── */

$stmt = $conn->prepare("INSERT INTO users (email, hash_password, role) VALUES (?, ?, 'admin') ON DUPLICATE KEY UPDATE hash_password = ?");
$stmt->bind_param("sss", $adminEmail, $hashedPassword, $hashedPassword);
$adminEmail = 'admin@AM.com';
$stmt->execute();
$stmt->close();
echo "👤 Admin: admin@AM.com / pass1234<br>";


/* ── Seed Demo Patient ── */

$stmt = $conn->prepare("INSERT INTO users (email, hash_password, role) VALUES (?, ?, 'patient') ON DUPLICATE KEY UPDATE hash_password = ?");
$stmt->bind_param("sss", $patientEmail, $hashedPassword, $hashedPassword);
$patientEmail = 'patient@AM.com';
$stmt->execute();
$stmt->close();

// Get the user_id we just created for the patient
$patientUserId = $conn->query("SELECT user_id FROM users WHERE email = 'patient@AM.com'")->fetch_assoc()['user_id'];

// Create the patient profile if it doesn't already exist
$existingPatient = $conn->query("SELECT patient_id FROM patients WHERE user_id = $patientUserId");
if ($existingPatient->num_rows === 0) {
    $stmt = $conn->prepare("INSERT INTO patients (user_id, first_name, last_name, cpr, date_of_birth, gender, phone, email, address, blood_type) VALUES (?, 'Patient', 'Zero', '123456789', '1995-05-15', 'Male', '12345678', 'patient@AM.com', '123 Health St, Manama', 'O+')");
    $stmt->bind_param("i", $patientUserId);
    $stmt->execute();
    $stmt->close();
}
echo "👤 Patient: patient@AM.com / pass1234<br>";


/* ── Seed 10 Doctors ── */

/*
 * Each doctor has:
 *   - A login account in the 'users' table
 *   - A profile in the 'doctors' table
 *   - An image file in the /image/ folder
 *
 * The image files are named doc1(Female).jpg, doc2(Male).jpg, etc.
 * We match each doctor to the correct image based on their gender.
 *
 * Doctor names and specializations match the data in
 * DataBase/schema_medical_center.sql
 */

$doctorsList = [
    // Doctor 1: Fatima Khalid (Female) → uses doc1(Female).jpg
    [
        'firstName'      => 'Fatima',
        'lastName'       => 'Khalid',
        'email'          => 'doctor1@example.test',
        'phone'          => '+97310000001',
        'image'          => 'doc1(Female).jpg',
        'specialization' => 'General Medicine',
        'department'     => 'General Medicine',
        'bio'            => 'Expert in general medicine with 15 years of experience in primary care.',
        'capacity'       => 5
    ],
    // Doctor 2: Ahmed Al-Din (Male) → uses doc2(Male).jpg
    [
        'firstName'      => 'Ahmed',
        'lastName'       => 'Al-Din',
        'email'          => 'doctor2@example.test',
        'phone'          => '+97310000002',
        'image'          => 'doc2(Male).jpg',
        'specialization' => 'General Medicine',
        'department'     => 'General Medicine',
        'bio'            => 'Specialist in general medicine and family health.',
        'capacity'       => 5
    ],
    // Doctor 3: Mohamed Yousif (Male) → uses doc3(Male).jpg
    [
        'firstName'      => 'Mohamed',
        'lastName'       => 'Yousif',
        'email'          => 'doctor3@example.test',
        'phone'          => '+97310000003',
        'image'          => 'doc3(Male).jpg',
        'specialization' => 'Dentistry',
        'department'     => 'Dentistry',
        'bio'            => 'Experienced dentist providing comprehensive dental care.',
        'capacity'       => 5
    ],
    // Doctor 4: Sara Hassan (Female) → uses doc4(Female).jpg
    [
        'firstName'      => 'Sara',
        'lastName'       => 'Hassan',
        'email'          => 'doctor4@example.test',
        'phone'          => '+97310000004',
        'image'          => 'doc4(Female).jpg',
        'specialization' => 'ENT (Ear, Nose, and Throat) Specialist',
        'department'     => 'ENT',
        'bio'            => 'ENT specialist with expertise in ear, nose, and throat treatments.',
        'capacity'       => 5
    ],
    // Doctor 5: Omar Saleh (Male) → uses doc5(Male).jpg
    [
        'firstName'      => 'Omar',
        'lastName'       => 'Saleh',
        'email'          => 'doctor5@example.test',
        'phone'          => '+97310000005',
        'image'          => 'doc5(Male).jpg',
        'specialization' => 'Ophthalmology',
        'department'     => 'Ophthalmology',
        'bio'            => 'Eye care specialist focused on vision correction and eye disease treatment.',
        'capacity'       => 5
    ],
    // Doctor 6: Khalid Abbas (Male) → uses doc6(Male).jpg
    [
        'firstName'      => 'Khalid',
        'lastName'       => 'Abbas',
        'email'          => 'doctor6@example.test',
        'phone'          => '+97310000006',
        'image'          => 'doc6(Male).jpg',
        'specialization' => 'General Medicine',
        'department'     => 'General Medicine',
        'bio'            => 'General Medicine expert with a focus on comprehensive adult care.',
        'capacity'       => 5
    ],
    // Doctor 7: Huda Nasser (Female) → uses doc7(Female).jpg
    [
        'firstName'      => 'Huda',
        'lastName'       => 'Nasser',
        'email'          => 'doctor7@example.test',
        'phone'          => '+97310000007',
        'image'          => 'doc7(Female).jpg',
        'specialization' => 'General Medicine',
        'department'     => 'General Medicine',
        'bio'            => 'Dedicated general practitioner serving all ages.',
        'capacity'       => 5
    ],
    // Doctor 8: Lina Mahmood (Female) → uses doc8(Female).jpg
    [
        'firstName'      => 'Lina',
        'lastName'       => 'Mahmood',
        'email'          => 'doctor8@example.test',
        'phone'          => '+97310000008',
        'image'          => 'doc8(Female).jpg',
        'specialization' => 'Dentistry',
        'department'     => 'Dentistry',
        'bio'            => 'Expert in cosmetic and restorative dentistry.',
        'capacity'       => 5
    ],
    // Doctor 9: Yousef Ibrahim (Male) → uses doc9(Male).jpg
    [
        'firstName'      => 'Yousef',
        'lastName'       => 'Ibrahim',
        'email'          => 'doctor9@example.test',
        'phone'          => '+97310000009',
        'image'          => 'doc9(Male).jpg',
        'specialization' => 'ENT (Ear, Nose, and Throat) Specialist',
        'department'     => 'ENT',
        'bio'            => 'Ear, nose, and throat specialist with expertise in surgical and non-surgical treatments.',
        'capacity'       => 5
    ],
    // Doctor 10: Nada Rashid (Female) → uses doc10(Female).jpg
    [
        'firstName'      => 'Nada',
        'lastName'       => 'Rashid',
        'email'          => 'doctor10@example.test',
        'phone'          => '+97310000010',
        'image'          => 'doc10(Female).jpg',
        'specialization' => 'Ophthalmology',
        'department'     => 'Ophthalmology',
        'bio'            => 'Eye care specialist focused on vision correction and eye disease treatment.',
        'capacity'       => 5
    ]
];

foreach ($doctorsList as $doctor) {
    /*
     * Step 1: Create or update the login account in the users table.
     * ON DUPLICATE KEY UPDATE ensures we don't get an error if the
     * email already exists — it just updates the password instead.
     */
    $stmt = $conn->prepare("INSERT INTO users (email, hash_password, role) VALUES (?, ?, 'doctor') ON DUPLICATE KEY UPDATE hash_password = ?");
    $stmt->bind_param("sss", $doctor['email'], $hashedPassword, $hashedPassword);
    $stmt->execute();
    $stmt->close();

    // Get the doctor_id for this doctor
    $doctorUserId = $conn->query("SELECT user_id FROM users WHERE email = '" . $conn->real_escape_string($doctor['email']) . "'")->fetch_assoc()['user_id'];

    /*
     * Step 2: Create or update the staff profile.
     * This links the doctor's profile to their login account.
     */
    $existingStaff = $conn->query("SELECT doctor_id FROM doctors WHERE user_id = $doctorUserId");

    if ($existingStaff->num_rows === 0) {
        // New doctor — insert their profile
        $stmt = $conn->prepare("INSERT INTO doctors (user_id, first_name, last_name, role, specialization, phone, email, department, profile_image, bio, capacity) VALUES (?, ?, ?, 'Doctor', ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("issssssssi",
            $doctorUserId,
            $doctor['firstName'],
            $doctor['lastName'],
            $doctor['specialization'],
            $doctor['phone'],
            $doctor['email'],
            $doctor['department'],
            $doctor['image'],
            $doctor['bio'],
            $doctor['capacity']
        );
        $stmt->execute();
        $stmt->close();
    } else {
        // Existing doctor — update their profile
        $stmt = $conn->prepare("UPDATE doctors SET first_name = ?, last_name = ?, specialization = ?, department = ?, profile_image = ?, bio = ?, capacity = ? WHERE user_id = ?");
        $stmt->bind_param("ssssssii",
            $doctor['firstName'],
            $doctor['lastName'],
            $doctor['specialization'],
            $doctor['department'],
            $doctor['image'],
            $doctor['bio'],
            $doctor['capacity'],
            $doctorUserId
        );
        $stmt->execute();
        $stmt->close();
    }

    echo "🩺 Doctor: {$doctor['firstName']} {$doctor['lastName']} ({$doctor['email']}) — Image: {$doctor['image']}<br>";
}


/* ── Seed Sample Medical Data ── */

$patientIdResult = $conn->query("SELECT patient_id FROM patients WHERE user_id = $patientUserId");

if ($patientIdResult && $patientIdResult->num_rows > 0) {
    $patientId     = $patientIdResult->fetch_assoc()['patient_id'];
    $firstDoctorId = $conn->query("SELECT doctor_id FROM doctors LIMIT 1")->fetch_assoc()['doctor_id'];

    // Only seed if no records exist yet (avoid duplicates on re-run)
    $existingRecords = $conn->query("SELECT record_id FROM medical_records WHERE patient_id = $patientId LIMIT 1");

    if ($existingRecords->num_rows === 0) {
        // Create a sample medical record
        $conn->query("INSERT INTO medical_records (doctor_id, patient_id, record_date, record_type, summary, source_type)
                      VALUES ($firstDoctorId, $patientId, NOW(), 'Consultation', 'Patient visited for severe migraine and dizziness. Referred for further tests.', 'In-Person')");
        $recordId = $conn->insert_id;

        // Add a diagnosis for this record
        $conn->query("INSERT INTO diagnoses (record_id, diagnosis_name, icd_code, severity, notes)
                      VALUES ($recordId, 'Migraine', 'G43.9', 'Moderate', 'Recurring migraines, triggered by stress.')");

        // Add a prescription for this record
        $conn->query("INSERT INTO prescriptions (record_id, medication_name, dosage, frequency, duration, instructions)
                      VALUES ($recordId, 'Ibuprofen', '400mg', 'Twice daily', '7 days', 'Take with food. Avoid on an empty stomach.')");

        // Add a lab result for this record
        $conn->query("INSERT INTO lab_results (record_id, test_name, result_value, normal_range, status)
                      VALUES ($recordId, 'Complete Blood Count', '13.5 g/dL', '12.0-17.5 g/dL', 'Normal')");

        echo "<br>📄 Sample medical record, diagnosis, prescription, and lab result seeded.<br>";
    }

    /* 
       Dummy appointments for TODAY have been removed 
       to allow for a clean testing environment.
    */
}


$conn->close();
echo "<br><strong>✅ Setup and seeding completed successfully!</strong>";
echo "<br><br>📝 <strong>Demo Login Credentials:</strong>";
echo "<br>   Admin:   admin@AM.com / pass1234";
echo "<br>   Patient: patient@AM.com / pass1234";
echo "<br>   Doctors: doctor1@example.test through doctor10@example.test / pass1234";
?>
