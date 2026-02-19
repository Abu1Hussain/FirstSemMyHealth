-- schema_medical_center.sql
-- Full schema following the ER diagram you provided. Target: MySQL / MariaDB (InnoDB).

USE `medical_center`;

-- USERS table (central authentication)
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `hash_password` VARCHAR(255) NOT NULL,
  `role` ENUM('patient','doctor','admin') NOT NULL DEFAULT 'patient',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PATIENTS
CREATE TABLE IF NOT EXISTS `patients` (
  `patient_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `date_of_birth` DATE NULL,
  `gender` ENUM('male','female','other') NULL,
  `phone` VARCHAR(30) NULL,
  `email` VARCHAR(255) NULL,
  `address` VARCHAR(500) NULL,
  `blood_type` VARCHAR(5) NULL,
  `user_id` INT UNSIGNED NULL,
  PRIMARY KEY (`patient_id`),
  INDEX (`user_id`),
  CONSTRAINT `fk_patients_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- MEDICAL_STAFF (doctors, nurses, etc.)
CREATE TABLE IF NOT EXISTS `medical_staff` (
  `staff_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `role` VARCHAR(50) NULL,
  `specialization` VARCHAR(200) NULL,
  `phone` VARCHAR(30) NULL,
  `email` VARCHAR(255) NULL,
  `department` VARCHAR(200) NULL,
  `user_id` INT UNSIGNED NULL,
  `profile_image` VARCHAR(255) DEFAULT 'default_user.png',
  `bio` TEXT NULL,
  `capacity` INT DEFAULT 30,
  PRIMARY KEY (`staff_id`),
  INDEX (`user_id`),
  CONSTRAINT `fk_medical_staff_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- MEDICAL_RECORDS
CREATE TABLE IF NOT EXISTS `medical_records` (
  `record_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `created_by` INT UNSIGNED NOT NULL, -- staff_id that created the record
  `patient_id` INT UNSIGNED NOT NULL,
  `record_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `record_type` VARCHAR(100) NULL,
  `summary` TEXT NULL,
  `source_type` VARCHAR(100) NULL,
  PRIMARY KEY (`record_id`),
  INDEX (`created_by`),
  INDEX (`patient_id`),
  CONSTRAINT `fk_records_staff` FOREIGN KEY (`created_by`) REFERENCES `medical_staff` (`staff_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_records_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DIAGNOSES
CREATE TABLE IF NOT EXISTS `diagnoses` (
  `diagnosis_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `record_id` INT UNSIGNED NOT NULL,
  `diagnosis_name` VARCHAR(255) NOT NULL,
  `icd_code` VARCHAR(50) NULL,
  `severity` VARCHAR(50) NULL,
  `notes` TEXT NULL,
  PRIMARY KEY (`diagnosis_id`),
  INDEX (`record_id`),
  CONSTRAINT `fk_diagnoses_record` FOREIGN KEY (`record_id`) REFERENCES `medical_records` (`record_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PRESCRIPTIONS
CREATE TABLE IF NOT EXISTS `prescriptions` (
  `prescription_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `record_id` INT UNSIGNED NOT NULL,
  `medication_name` VARCHAR(255) NOT NULL,
  `dosage` VARCHAR(100) NULL,
  `frequency` VARCHAR(100) NULL,
  `duration` VARCHAR(100) NULL,
  `instructions` TEXT NULL,
  PRIMARY KEY (`prescription_id`),
  INDEX (`record_id`),
  CONSTRAINT `fk_prescriptions_record` FOREIGN KEY (`record_id`) REFERENCES `medical_records` (`record_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- LAB_RESULTS
CREATE TABLE IF NOT EXISTS `lab_results` (
  `lab_result_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `record_id` INT UNSIGNED NOT NULL,
  `test_name` VARCHAR(255) NOT NULL,
  `result_value` VARCHAR(255) NULL,
  `normal_range` VARCHAR(255) NULL,
  `status` VARCHAR(100) NULL,
  PRIMARY KEY (`lab_result_id`),
  INDEX (`record_id`),
  CONSTRAINT `fk_lab_results_record` FOREIGN KEY (`record_id`) REFERENCES `medical_records` (`record_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- APPOINTMENTS
CREATE TABLE IF NOT EXISTS `appointments` (
  `appointment_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `patient_id` INT UNSIGNED NOT NULL,
  `staff_id` INT UNSIGNED NOT NULL,
  `appointment_date` DATETIME NOT NULL,
  `appointment_type` VARCHAR(100) NULL,
  `status` VARCHAR(50) NULL,
  PRIMARY KEY (`appointment_id`),
  INDEX (`patient_id`),
  INDEX (`staff_id`),
  CONSTRAINT `fk_appointments_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_appointments_staff` FOREIGN KEY (`staff_id`) REFERENCES `medical_staff` (`staff_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Useful example views (in medical_center) that mirror the "all users / patients / doctors / admins" concept:
CREATE OR REPLACE VIEW `view_all_users` AS
SELECT user_id, email, role, created_at FROM `users`;

CREATE OR REPLACE VIEW `view_patients_min` AS
SELECT p.patient_id, p.first_name, p.last_name, p.date_of_birth, p.phone, p.email, p.user_id
FROM `patients` p;

CREATE OR REPLACE VIEW `view_doctors_min` AS
SELECT s.staff_id, s.first_name, s.last_name, s.specialization, s.department, s.user_id
FROM `medical_staff` s;

CREATE OR REPLACE VIEW `view_admins_min` AS
SELECT u.user_id, u.email FROM `users` u WHERE u.role = 'admin';

-- ===========================
-- Sample data: default users
-- 10 doctors, 30 patients, 3 admins
-- IDs are explicit to make the sample deterministic.
-- Use caution if running multiple times (explicit IDs may conflict).
-- ===========================

-- Insert users (explicit user_id values)
INSERT IGNORE INTO `users` (`user_id`,`email`,`hash_password`,`role`)
VALUES
(2001,'doctor1@example.test','$2b$10$examplehash','doctor'),
(2002,'doctor2@example.test','$2b$10$examplehash','doctor'),
(2003,'doctor3@example.test','$2b$10$examplehash','doctor'),
(2004,'doctor4@example.test','$2b$10$examplehash','doctor'),
(2005,'doctor5@example.test','$2b$10$examplehash','doctor'),
(2006,'doctor6@example.test','$2b$10$examplehash','doctor'),
(2007,'doctor7@example.test','$2b$10$examplehash','doctor'),
(2008,'doctor8@example.test','$2b$10$examplehash','doctor'),
(2009,'doctor9@example.test','$2b$10$examplehash','doctor'),
(2010,'doctor10@example.test','$2b$10$examplehash','doctor'),
(3001,'patient1@example.test','$2b$10$examplehash','patient'),
(3002,'patient2@example.test','$2b$10$examplehash','patient'),
(3003,'patient3@example.test','$2b$10$examplehash','patient'),
(3004,'patient4@example.test','$2b$10$examplehash','patient'),
(3005,'patient5@example.test','$2b$10$examplehash','patient'),
(3006,'patient6@example.test','$2b$10$examplehash','patient'),
(3007,'patient7@example.test','$2b$10$examplehash','patient'),
(3008,'patient8@example.test','$2b$10$examplehash','patient'),
(3009,'patient9@example.test','$2b$10$examplehash','patient'),
(3010,'patient10@example.test','$2b$10$examplehash','patient'),
(3011,'patient11@example.test','$2b$10$examplehash','patient'),
(3012,'patient12@example.test','$2b$10$examplehash','patient'),
(3013,'patient13@example.test','$2b$10$examplehash','patient'),
(3014,'patient14@example.test','$2b$10$examplehash','patient'),
(3015,'patient15@example.test','$2b$10$examplehash','patient'),
(3016,'patient16@example.test','$2b$10$examplehash','patient'),
(3017,'patient17@example.test','$2b$10$examplehash','patient'),
(3018,'patient18@example.test','$2b$10$examplehash','patient'),
(3019,'patient19@example.test','$2b$10$examplehash','patient'),
(3020,'patient20@example.test','$2b$10$examplehash','patient'),
(3021,'patient21@example.test','$2b$10$examplehash','patient'),
(3022,'patient22@example.test','$2b$10$examplehash','patient'),
(3023,'patient23@example.test','$2b$10$examplehash','patient'),
(3024,'patient24@example.test','$2b$10$examplehash','patient'),
(3025,'patient25@example.test','$2b$10$examplehash','patient'),
(3026,'patient26@example.test','$2b$10$examplehash','patient'),
(3027,'patient27@example.test','$2b$10$examplehash','patient'),
(3028,'patient28@example.test','$2b$10$examplehash','patient'),
(3029,'patient29@example.test','$2b$10$examplehash','patient'),
(3030,'patient30@example.test','$2b$10$examplehash','patient'),
(4001,'admin1@example.test','$2b$10$examplehash','admin'),
(4002,'admin2@example.test','$2b$10$examplehash','admin'),
(4003,'admin3@example.test','$2b$10$examplehash','admin');

-- Insert medical_staff entries for the 10 doctors (explicit staff_id values)
INSERT IGNORE INTO `medical_staff` (`staff_id`,`first_name`,`last_name`,`role`,`specialization`,`phone`,`email`,`department`,`user_id`)
VALUES
(5001,'Ahmed','Al-Din','doctor','General Medicine','+97310000001','doctor1@example.test','General',2001),
(5002,'Fatima','Khalid','doctor','Pediatrics','+97310000002','doctor2@example.test','Pediatrics',2002),
(5003,'Mohamed','Yousif','doctor','Cardiology','+97310000003','doctor3@example.test','Cardiology',2003),
(5004,'Sara','Hassan','doctor','Dermatology','+97310000004','doctor4@example.test','Dermatology',2004),
(5005,'Omar','Saleh','doctor','Orthopedics','+97310000005','doctor5@example.test','Orthopedics',2005),
(5006,'Huda','Nasser','doctor','Gynecology','+97310000006','doctor6@example.test','Gynecology',2006),
(5007,'Khalid','Abbas','doctor','Neurology','+97310000007','doctor7@example.test','Neurology',2007),
(5008,'Lina','Mahmood','doctor','Endocrinology','+97310000008','doctor8@example.test','Endocrinology',2008),
(5009,'Yousef','Ibrahim','doctor','ENT','+97310000009','doctor9@example.test','ENT',2009),
(5010,'Nada','Rashid','doctor','Ophthalmology','+97310000010','doctor10@example.test','Ophthalmology',2010);

-- Insert 30 patients (explicit patient_id values)
INSERT IGNORE INTO `patients` (`patient_id`,`first_name`,`last_name`,`date_of_birth`,`gender`,`phone`,`email`,`address`,`blood_type`,`user_id`)
VALUES
(6001,'Patient','One','1985-01-01','male','+97320000001','patient1@example.test','Address 1','O+',3001),
(6002,'Patient','Two','1990-02-02','female','+97320000002','patient2@example.test','Address 2','A+',3002),
(6003,'Patient','Three','1975-03-03','male','+97320000003','patient3@example.test','Address 3','B+',3003),
(6004,'Patient','Four','2000-04-04','female','+97320000004','patient4@example.test','Address 4','AB+',3004),
(6005,'Patient','Five','1995-05-05','male','+97320000005','patient5@example.test','Address 5','O-',3005),
(6006,'Patient','Six','1988-06-06','female','+97320000006','patient6@example.test','Address 6','A-',3006),
(6007,'Patient','Seven','1979-07-07','male','+97320000007','patient7@example.test','Address 7','B-',3007),
(6008,'Patient','Eight','1982-08-08','female','+97320000008','patient8@example.test','Address 8','AB-',3008),
(6009,'Patient','Nine','1992-09-09','male','+97320000009','patient9@example.test','Address 9','O+',3009),
(6010,'Patient','Ten','1999-10-10','female','+97320000010','patient10@example.test','Address 10','A+',3010),
(6011,'Patient','Eleven','1986-11-11','male','+97320000011','patient11@example.test','Address 11','B+',3011),
(6012,'Patient','Twelve','1978-12-12','female','+97320000012','patient12@example.test','Address 12','AB+',3012),
(6013,'Patient','Thirteen','1983-01-13','male','+97320000013','patient13@example.test','Address 13','O-',3013),
(6014,'Patient','Fourteen','1991-02-14','female','+97320000014','patient14@example.test','Address 14','A-',3014),
(6015,'Patient','Fifteen','1987-03-15','male','+97320000015','patient15@example.test','Address 15','B-',3015),
(6016,'Patient','Sixteen','1993-04-16','female','+97320000016','patient16@example.test','Address 16','AB-',3016),
(6017,'Patient','Seventeen','1980-05-17','male','+97320000017','patient17@example.test','Address 17','O+',3017),
(6018,'Patient','Eighteen','1996-06-18','female','+97320000018','patient18@example.test','Address 18','A+',3018),
(6019,'Patient','Nineteen','1984-07-19','male','+97320000019','patient19@example.test','Address 19','B+',3019),
(6020,'Patient','Twenty','1998-08-20','female','+97320000020','patient20@example.test','Address 20','AB+',3020),
(6021,'Patient','TwentyOne','1981-09-21','male','+97320000021','patient21@example.test','Address 21','O-',3021),
(6022,'Patient','TwentyTwo','1994-10-22','female','+97320000022','patient22@example.test','Address 22','A-',3022),
(6023,'Patient','TwentyThree','1989-11-23','male','+97320000023','patient23@example.test','Address 23','B-',3023),
(6024,'Patient','TwentyFour','1977-12-24','female','+97320000024','patient24@example.test','Address 24','AB-',3024),
(6025,'Patient','TwentyFive','1986-01-25','male','+97320000025','patient25@example.test','Address 25','O+',3025),
(6026,'Patient','TwentySix','1997-02-26','female','+97320000026','patient26@example.test','Address 26','A+',3026),
(6027,'Patient','TwentySeven','1982-03-27','male','+97320000027','patient27@example.test','Address 27','B+',3027),
(6028,'Patient','TwentyEight','1995-04-28','female','+97320000028','patient28@example.test','Address 28','AB+',3028),
(6029,'Patient','TwentyNine','1989-05-29','male','+97320000029','patient29@example.test','Address 29','O-',3029),
(6030,'Patient','Thirty','1990-06-30','female','+97320000030','patient30@example.test','Address 30','A-',3030);

-- Admin users already inserted above (4001..4003). Optionally create an admin metadata table in medical_center if needed.


-- -----------------------------------------------------------
-- ADMIN DASHBOARD TABLES (Added for completeness)
-- -----------------------------------------------------------

-- SYSTEM_LOGS
CREATE TABLE IF NOT EXISTS system_logs (
    log_id     INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED,
    event      VARCHAR(255) NOT NULL,
    status     VARCHAR(50) DEFAULT 'info',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AUDIT_TRAIL
CREATE TABLE IF NOT EXISTS audit_trail (
    audit_id       INT AUTO_INCREMENT PRIMARY KEY,
    user_id        INT UNSIGNED,
    action         VARCHAR(255) NOT NULL,
    table_affected VARCHAR(100),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AI_LOGS
CREATE TABLE IF NOT EXISTS ai_logs (
    log_id      INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED,
    action_type VARCHAR(100) NOT NULL,
    details     TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DOCUMENT_QUEUE
CREATE TABLE IF NOT EXISTS document_queue (
    doc_id      INT AUTO_INCREMENT PRIMARY KEY,
    patient_id  INT UNSIGNED NOT NULL,
    file_name   VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- FEEDBACK_REPORTS
CREATE TABLE IF NOT EXISTS feedback_reports (
    report_id  INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED,
    type       VARCHAR(50) NOT NULL,
    message    TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

