<?php
$servername = "localhost";
$username = "admin";
$password = "password123";
$dbname = "healthcare_ai_db";

// Create connection
$conn = new mysqli($servername, $username, $password);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Create Database
$sql = "CREATE DATABASE IF NOT EXISTS `$dbname`";
if ($conn->query($sql) === TRUE) {
    echo "Database created successfully<br>";
} else {
    echo "Error creating database: " . $conn->error . "<br>";
}

$conn->select_db($dbname);

// Create Users Table (Updated with profile fields)
$sql_users = "CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    cpr VARCHAR(20) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('patient', 'doctor', 'admin') DEFAULT 'patient',
    profile_image VARCHAR(255) DEFAULT 'default_user.png',
    bio TEXT,
    specialization VARCHAR(100),
    capacity INT DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)";

if ($conn->query($sql_users) === TRUE) {
    echo "Users table created/updated successfully<br>";
} else {
    echo "Error creating users table: " . $conn->error . "<br>";
}

// Add columns if they don't exist (for existing DB)
$conn->query("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image VARCHAR(255) DEFAULT 'default_user.png'");
$conn->query("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT");
$conn->query("ALTER TABLE users ADD COLUMN IF NOT EXISTS specialization VARCHAR(100)");
$conn->query("ALTER TABLE users ADD COLUMN IF NOT EXISTS capacity INT DEFAULT 30");

// Create Appointments Table
$sql_appointments = "CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT, 
    doctor_name VARCHAR(255),
    appointment_time DATETIME NOT NULL,
    reason TEXT NOT NULL,
    ai_priority ENUM('Highly Important', 'Important', 'Normal') DEFAULT 'Normal',
    ai_suggestion TEXT,
    status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
    queue_number INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id)
)";

if ($conn->query($sql_appointments) === TRUE) {
    echo "Appointments table created successfully<br>";
} else {
    echo "Error creating appointments table: " . $conn->error . "<br>";
}

// Add doctor_id if missing
$conn->query("ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_id INT");

// Seed Users
$pass = 'pass1234';

// 1. Patient
$sql_seed_patient = "INSERT INTO users (name, email, cpr, phone, password, role) 
                     VALUES ('Patient Zero', 'patient@AM.com', '123456789', '12345678', '$pass', 'patient')
                     ON DUPLICATE KEY UPDATE password='$pass'";
$conn->query($sql_seed_patient);

// 2. Doctors (Seeding with specific images)
$doctors = [
    ['Dr. Confident', 'doc1@AM.com', '100000001', '11111111', 'doc1.jpg', 'Cardiologist', 'Expert in heart health with 15 years experience.', 15],
    ['Dr. Smiling', 'doc2@AM.com', '100000002', '22222222', 'doc2.jpg', 'Pediatrician', 'Loves children and specializes in early development.', 20],
    ['Dr. Trusted', 'doc3@AM.com', '100000003', '33333333', 'doc3.jpg', 'General Practitioner', 'Your go-to doctor for general checkups.', 25],
    ['Dr. Young', 'doc4@AM.com', '100000004', '44444444', 'doc4.jpg', 'Dermatologist', 'Specialist in skin care and cosmetic treatments.', 12],
    ['Dr. Crossed', 'doc5@AM.com', '100000005', '55555555', 'doc5.jpg', 'Neurologist', 'Focused on brain and nervous system disorders.', 10],
    ['Dr. Professional', 'doc6@AM.com', '100000006', '66666666', 'doc6.jpg', 'Orthopedic', 'Specialist in bones, joints, and sports injuries.', 18]
];

foreach ($doctors as $doc) {
    $name = $doc[0];
    $email = $doc[1];
    $cpr = $doc[2];
    $phone = $doc[3];
    $img = $doc[4];
    $spec = $doc[5];
    $bio = $doc[6];
    $cap = $doc[7];
    
    $q = "INSERT INTO users (name, email, cpr, phone, password, role, profile_image, specialization, bio, capacity) 
          VALUES ('$name', '$email', '$cpr', '$phone', '$pass', 'doctor', '$img', '$spec', '$bio', $cap)
          ON DUPLICATE KEY UPDATE 
            name='$name', profile_image='$img', specialization='$spec', bio='$bio', capacity=$cap";
    
    if (!$conn->query($q)) {
        echo "Error seeding $name: " . $conn->error . "<br>";
    } else {
        echo "Seeded $name<br>";
    }
}

// 3. Admin (admin@AM.com)
$sql_seed_admin = "INSERT INTO users (name, email, cpr, phone, password, role) 
                     VALUES ('System Admin', 'admin@AM.com', '999999999', '99999999', '$pass', 'admin')
                     ON DUPLICATE KEY UPDATE password='$pass'";
if ($conn->query($sql_seed_admin) === TRUE) {
    echo "Seeded Admin (admin@AM.com)<br>";
} else {
    echo "Error seeding admin: " . $conn->error . "<br>";
}

$conn->close();
echo "<br><strong>Setup and Seeding Completed.</strong>";
?>
