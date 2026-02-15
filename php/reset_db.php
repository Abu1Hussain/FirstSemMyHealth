<?php
$servername = "localhost";
$username = "admin";
$password = "password123";
$dbname = "healthcare_ai_db";

$conn = new mysqli($servername, $username, $password);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$conn->query("CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
$conn->select_db($dbname);

$conn->query("DROP TABLE IF EXISTS appointments");
$conn->query("DROP TABLE IF EXISTS users");

$conn->query("CREATE TABLE users (
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
)");

$conn->query("CREATE TABLE appointments (
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
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
)");

$pass = 'pass1234';
$conn->query("INSERT INTO users (name, email, cpr, phone, password, role) VALUES ('Patient Zero', 'patient@AM.com', '123456789', '12345678', '$pass', 'patient')");
$conn->query("INSERT INTO users (name, email, cpr, phone, password, role) VALUES ('System Admin', 'admin@AM.com', '999999999', '99999999', '$pass', 'admin')");

$doctors = [
    ['Dr. Confident', 'doc1@AM.com', '100000001', '11111111', 'doc1.jpg', 'Cardiologist', 'Expert in heart health.', 15],
    ['Dr. Smiling', 'doc2@AM.com', '100000002', '22222222', 'doc2.jpg', 'Pediatrician', 'Loves children.', 20]
];

foreach ($doctors as $doc) {
    $conn->query("INSERT INTO users (name, email, cpr, phone, password, role, profile_image, specialization, bio, capacity) VALUES ('$doc[0]', '$doc[1]', '$doc[2]', '$doc[3]', '$pass', 'doctor', '$doc[4]', '$doc[5]', '$doc[6]', $doc[7])");
}

$conn->close();
echo "DATABASE RESET AND SEEDED SUCCESSFULLY.";
?>
