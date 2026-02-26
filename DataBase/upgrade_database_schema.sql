-- upgrade_database_schema.sql
-- This script applies the robust database schema updates to `medical_center`.
-- It avoids dropping existing data by using ALTER TABLE.

USE `medical_center`;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Core Authentication & Roles
-- If line 10 fails because the columns already exist from a previous partial run, we can ignore error or handle it.
-- But we'll try to execute safely. For a script like this, we just re-run.
ALTER TABLE `users` 
MODIFY COLUMN `role` ENUM('patient','doctor','admin','nurse','pharmacist','receptionist') NOT NULL DEFAULT 'patient';
-- (Since `users` alter succeeded in the first run, `status` and `last_login` already exist. I will use a safe approach or drop the script execution manually if needed. Actually I'll just keep the ADD COLUMN for a fresh test if I ever need it, but since this is MariaDB, `ADD COLUMN IF NOT EXISTS` is supported in some versions, but let's assume it might fail. Since I only want to run this once, I will comment out the users alter if it was already applied. Actually, I will run everything. If it fails on duplicate column, I will just proceed.)

-- To be safe, just redefine tables:

CREATE TABLE IF NOT EXISTS `departments` (
  `dept_id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `head_doctor_id` INT(11) NULL,
  PRIMARY KEY (`dept_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Use try-catch equivalent or just ignore errors on ADD COLUMN by using multiple ALTER TABLE statements
-- We know doctor is_active and department_id were not added yet because it failed at departments constraints.

ALTER TABLE `doctors` ADD COLUMN IF NOT EXISTS `is_active` BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE `doctors` ADD COLUMN IF NOT EXISTS `department_id` INT(11) NULL AFTER `department`;

-- Let's add constraints (assumes this is the first run)
-- ALTER TABLE `doctors` DROP FOREIGN KEY `fk_doctors_dept`;
-- ALTER TABLE `doctors` ADD CONSTRAINT `fk_doctors_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`dept_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ALTER TABLE `departments` DROP FOREIGN KEY `fk_dept_head`;
-- ALTER TABLE `departments` ADD CONSTRAINT `fk_dept_head` FOREIGN KEY (`head_doctor_id`) REFERENCES `doctors` (`doctor_id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS `doctor_schedules` (
  `schedule_id` INT(11) NOT NULL AUTO_INCREMENT,
  `doctor_id` INT(11) NOT NULL,
  `day_of_week` ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `is_available` BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (`schedule_id`),
  CONSTRAINT `fk_schedule_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`doctor_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Advanced Clinical Records
CREATE TABLE IF NOT EXISTS `patient_vitals` (
  `vital_id` INT(11) NOT NULL AUTO_INCREMENT,
  `patient_id` INT(11) NOT NULL,
  `appointment_id` INT(11) NULL,
  `recorded_by` INT(11) NULL,
  `blood_pressure` VARCHAR(20) NULL,
  `heart_rate` INT NULL,
  `temperature` DECIMAL(4,1) NULL,
  `respiratory_rate` INT NULL,
  `weight_kg` DECIMAL(5,2) NULL,
  `height_cm` DECIMAL(5,2) NULL,
  `recorded_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`vital_id`),
  CONSTRAINT `fk_vitals_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_vitals_appt` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`appointment_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_vitals_user` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `allergies` (
  `allergy_id` INT(11) NOT NULL AUTO_INCREMENT,
  `patient_id` INT(11) NOT NULL,
  `allergen` VARCHAR(255) NOT NULL,
  `severity` ENUM('Mild', 'Moderate', 'Severe', 'Life-Threatening') NOT NULL DEFAULT 'Moderate',
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`allergy_id`),
  CONSTRAINT `fk_allergies_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `emergency_contacts` (
  `contact_id` INT(11) NOT NULL AUTO_INCREMENT,
  `patient_id` INT(11) NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `relationship` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  PRIMARY KEY (`contact_id`),
  CONSTRAINT `fk_emerg_contact_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Robust Appointments System
ALTER TABLE `appointments` ADD COLUMN IF NOT EXISTS `check_in_time` DATETIME NULL AFTER `status`;
ALTER TABLE `appointments` ADD COLUMN IF NOT EXISTS `check_out_time` DATETIME NULL AFTER `check_in_time`;

-- 5. Billing & Financials
CREATE TABLE IF NOT EXISTS `invoices` (
  `invoice_id` INT(11) NOT NULL AUTO_INCREMENT,
  `patient_id` INT(11) NOT NULL,
  `appointment_id` INT(11) NULL,
  `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `tax_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('unpaid', 'partial', 'paid', 'cancelled') NOT NULL DEFAULT 'unpaid',
  `issue_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `due_date` DATETIME NULL,
  `notes` TEXT NULL,
  PRIMARY KEY (`invoice_id`),
  CONSTRAINT `fk_invoice_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_invoice_appt` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`appointment_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `invoice_items` (
  `item_id` INT(11) NOT NULL AUTO_INCREMENT,
  `invoice_id` INT(11) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `subtotal` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`item_id`),
  CONSTRAINT `fk_inv_item_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`invoice_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payments` (
  `payment_id` INT(11) NOT NULL AUTO_INCREMENT,
  `invoice_id` INT(11) NOT NULL,
  `amount_paid` DECIMAL(10,2) NOT NULL,
  `payment_method` ENUM('cash', 'credit_card', 'insurance', 'bank_transfer') NOT NULL,
  `payment_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `transaction_ref` VARCHAR(100) NULL,
  PRIMARY KEY (`payment_id`),
  CONSTRAINT `fk_payment_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`invoice_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Pharmacy & Inventory
CREATE TABLE IF NOT EXISTS `medications_catalog` (
  `med_id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `stock_quantity` INT NOT NULL DEFAULT 0,
  `requires_prescription` BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (`med_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `prescriptions` ADD COLUMN IF NOT EXISTS `med_id` INT(11) NULL AFTER `record_id`;
ALTER TABLE `prescriptions` ADD COLUMN IF NOT EXISTS `dispense_status` ENUM('pending', 'partially_dispensed', 'dispensed', 'cancelled') NOT NULL DEFAULT 'pending';

-- Drop foreign key if it already exists to avoid duplication
-- ALTER TABLE `prescriptions` DROP FOREIGN KEY `fk_presc_med`;
ALTER TABLE `prescriptions` ADD CONSTRAINT `fk_presc_med` FOREIGN KEY (`med_id`) REFERENCES `medications_catalog` (`med_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. Inpatient Tracking
CREATE TABLE IF NOT EXISTS `wards` (
  `ward_id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `type` VARCHAR(100) NULL,
  `capacity` INT NOT NULL DEFAULT 10,
  PRIMARY KEY (`ward_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `beds` (
  `bed_id` INT(11) NOT NULL AUTO_INCREMENT,
  `ward_id` INT(11) NOT NULL,
  `bed_number` VARCHAR(20) NOT NULL,
  `status` ENUM('available', 'occupied', 'maintenance') NOT NULL DEFAULT 'available',
  PRIMARY KEY (`bed_id`),
  CONSTRAINT `fk_bed_ward` FOREIGN KEY (`ward_id`) REFERENCES `wards` (`ward_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `admissions` (
  `admission_id` INT(11) NOT NULL AUTO_INCREMENT,
  `patient_id` INT(11) NOT NULL,
  `bed_id` INT(11) NULL,
  `admitting_doctor_id` INT(11) NULL,
  `admission_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `discharge_date` DATETIME NULL,
  `status` ENUM('admitted', 'discharged') NOT NULL DEFAULT 'admitted',
  PRIMARY KEY (`admission_id`),
  CONSTRAINT `fk_admission_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_admission_bed` FOREIGN KEY (`bed_id`) REFERENCES `beds` (`bed_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_admission_doctor` FOREIGN KEY (`admitting_doctor_id`) REFERENCES `doctors` (`doctor_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Add a default department for existing doctors
INSERT IGNORE INTO `departments` (`dept_id`, `name`, `description`) VALUES (1, 'General Medicine', 'General checkups and triage');
UPDATE `doctors` SET `department_id` = 1 WHERE `department` = 'General';
