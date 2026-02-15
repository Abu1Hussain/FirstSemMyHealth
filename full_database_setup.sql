-- 1. Create Database
CREATE DATABASE IF NOT EXISTS `healthcare-ai-db`;
USE `healthcare-ai-db`;

-- 2. Create Users Table
CREATE TABLE IF NOT EXISTS users (
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
);

-- 3. Create Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
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
);

-- 4. Seed Patient (Password: pass1234)
INSERT INTO users (name, email, cpr, phone, password, role) 
VALUES ('Patient Zero', 'patient@AM.com', '123456789', '12345678', 'pass1234', 'patient');

-- 5. Seed Doctors (Password: pass1234)
INSERT INTO users (name, email, cpr, phone, password, role, profile_image, specialization, bio, capacity) VALUES 
('Dr. Confident', 'doc1@AM.com', '100000001', '11111111', 'pass1234', 'doctor', 'doc1.jpg', 'Cardiologist', 'Expert in heart health with 15 years experience.', 15),
('Dr. Smiling', 'doc2@AM.com', '100000002', '22222222', 'pass1234', 'doctor', 'doc2.jpg', 'Pediatrician', 'Loves children and specializes in early development.', 20),
('Dr. Trusted', 'doc3@AM.com', '100000003', '33333333', 'pass1234', 'doctor', 'doc3.jpg', 'General Practitioner', 'Your go-to doctor for general checkups.', 25),
('Dr. Young', 'doc4@AM.com', '100000004', '44444444', 'pass1234', 'doctor', 'doc4.jpg', 'Dermatologist', 'Specialist in skin care and cosmetic treatments.', 12),
('Dr. Crossed', 'doc5@AM.com', '100000005', '55555555', 'pass1234', 'doctor', 'doc5.jpg', 'Neurologist', 'Focused on brain and nervous system disorders.', 10),
('Dr. Professional', 'doc6@AM.com', '100000006', '66666666', 'pass1234', 'doctor', 'doc6.jpg', 'Orthopedic', 'Specialist in bones, joints, and sports injuries.', 18);
