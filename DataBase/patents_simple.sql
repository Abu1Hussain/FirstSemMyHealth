-- patents/simple_patients.sql
USE `patents`;

CREATE TABLE IF NOT EXISTS `patients` (
  `patient_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `date_of_birth` DATE NULL,
  `phone` VARCHAR(30) NULL,
  `email` VARCHAR(255) NULL,
  `user_id` INT UNSIGNED NULL,
  PRIMARY KEY (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert 30 patients with explicit IDs and user_id references
INSERT IGNORE INTO `patients` (`patient_id`,`first_name`,`last_name`,`date_of_birth`,`phone`,`email`,`user_id`) VALUES
(6001,'Patient','One','1985-01-01','+97320000001','patient1@example.test',3001),
(6002,'Patient','Two','1990-02-02','+97320000002','patient2@example.test',3002),
(6003,'Patient','Three','1975-03-03','+97320000003','patient3@example.test',3003),
(6004,'Patient','Four','2000-04-04','+97320000004','patient4@example.test',3004),
(6005,'Patient','Five','1995-05-05','+97320000005','patient5@example.test',3005),
(6006,'Patient','Six','1988-06-06','+97320000006','patient6@example.test',3006),
(6007,'Patient','Seven','1979-07-07','+97320000007','patient7@example.test',3007),
(6008,'Patient','Eight','1982-08-08','+97320000008','patient8@example.test',3008),
(6009,'Patient','Nine','1992-09-09','+97320000009','patient9@example.test',3009),
(6010,'Patient','Ten','1999-10-10','+97320000010','patient10@example.test',3010),
(6011,'Patient','Eleven','1986-11-11','+97320000011','patient11@example.test',3011),
(6012,'Patient','Twelve','1978-12-12','+97320000012','patient12@example.test',3012),
(6013,'Patient','Thirteen','1983-01-13','+97320000013','patient13@example.test',3013),
(6014,'Patient','Fourteen','1991-02-14','+97320000014','patient14@example.test',3014),
(6015,'Patient','Fifteen','1987-03-15','+97320000015','patient15@example.test',3015),
(6016,'Patient','Sixteen','1993-04-16','+97320000016','patient16@example.test',3016),
(6017,'Patient','Seventeen','1980-05-17','+97320000017','patient17@example.test',3017),
(6018,'Patient','Eighteen','1996-06-18','+97320000018','patient18@example.test',3018),
(6019,'Patient','Nineteen','1984-07-19','+97320000019','patient19@example.test',3019),
(6020,'Patient','Twenty','1998-08-20','+97320000020','patient20@example.test',3020),
(6021,'Patient','TwentyOne','1981-09-21','+97320000021','patient21@example.test',3021),
(6022,'Patient','TwentyTwo','1994-10-22','+97320000022','patient22@example.test',3022),
(6023,'Patient','TwentyThree','1989-11-23','+97320000023','patient23@example.test',3023),
(6024,'Patient','TwentyFour','1977-12-24','+97320000024','patient24@example.test',3024),
(6025,'Patient','TwentyFive','1986-01-25','+97320000025','patient25@example.test',3025),
(6026,'Patient','TwentySix','1997-02-26','+97320000026','patient26@example.test',3026),
(6027,'Patient','TwentySeven','1982-03-27','+97320000027','patient27@example.test',3027),
(6028,'Patient','TwentyEight','1995-04-28','+97320000028','patient28@example.test',3028),
(6029,'Patient','TwentyNine','1989-05-29','+97320000029','patient29@example.test',3029),
(6030,'Patient','Thirty','1990-06-30','+97320000030','patient30@example.test',3030);
