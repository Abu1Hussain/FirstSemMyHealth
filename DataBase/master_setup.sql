-- master_setup.sql
-- Run this file to create databases and the full schema in `medical_center`.
-- Example: mysql -u root -p < master_setup.sql

SOURCE create_databases.sql;
USE `medical_center`;
SOURCE schema_medical_center.sql;
-- (Optional) populate the separate DBs:
SOURCE allusers_simple.sql;
SOURCE patents_simple.sql;
SOURCE doctors_simple.sql;
SOURCE admins_simple.sql;
