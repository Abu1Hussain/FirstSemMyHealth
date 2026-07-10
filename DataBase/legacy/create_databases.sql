-- create_databases.sql
-- This script creates the requested databases and a main working database 'medical_center'.
-- Run this first (MySQL / MariaDB syntax assumed).

CREATE DATABASE IF NOT EXISTS `allusers` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS `patents` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS `doctors` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS `admins` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- A single combined database that follows the full schema shown in the diagram:
CREATE DATABASE IF NOT EXISTS `medical_center` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Note: cross-database foreign keys are possible in MySQL if all databases use InnoDB and same
-- character set/collation. For clarity this package places the full schema in `medical_center`.
