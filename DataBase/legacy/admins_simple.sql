-- admins/simple_admins.sql
USE `admins`;

CREATE TABLE IF NOT EXISTS `admins` (
  `admin_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NULL,
  `display_name` VARCHAR(255) NULL,
  PRIMARY KEY (`admin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert 3 admin users (user entries are in the allusers DB or medical_center.users)
INSERT IGNORE INTO `admins` (`admin_id`,`user_id`,`display_name`) VALUES
(7001,4001,'Site Admin 1'),
(7002,4002,'Site Admin 2'),
(7003,4003,'Site Admin 3');
