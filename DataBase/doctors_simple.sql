-- doctors/simple_staff.sql
USE `doctors`;

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
  PRIMARY KEY (`staff_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert 10 doctors with explicit IDs and user_id references
INSERT IGNORE INTO `medical_staff` (`staff_id`,`first_name`,`last_name`,`role`,`specialization`,`phone`,`email`,`department`,`user_id`) VALUES
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
