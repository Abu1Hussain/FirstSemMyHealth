-- php/migrations/001_create_telemedicine_sessions.sql
-- Run this to add the telemedicine tracking table to the medical_center database

CREATE TABLE IF NOT EXISTS `telemedicine_sessions` (
  `session_id` int(11) NOT NULL AUTO_INCREMENT,
  `appointment_id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `start_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `end_time` datetime DEFAULT NULL,
  `status` enum('active','completed','failed') DEFAULT 'active',
  PRIMARY KEY (`session_id`),
  KEY `appointment_id` (`appointment_id`),
  FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`appointment_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
