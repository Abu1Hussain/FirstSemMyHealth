README - DataBase folder
------------------------
Files created:
 - create_databases.sql         : creates DBs allusers, patents, doctors, admins and medical_center
 - schema_medical_center.sql    : full schema for medical_center (tables and views)
 - allusers_simple.sql          : minimal users table in allusers DB with example inserts
 - patents_simple.sql           : minimal patients table in patents DB with example insert
 - doctors_simple.sql           : minimal medical_staff table in doctors DB with example insert
 - admins_simple.sql            : minimal admins table in admins DB with example insert
 - master_setup.sql             : convenience script that sources the others (may need path adjustments)

Instructions:
 1. Place these files on a machine with MySQL/MariaDB.
 2. Run `mysql -u root -p < create_databases.sql` to create the DBs.
 3. Run `mysql -u root -p medical_center < schema_medical_center.sql` to create the full schema.
 4. Optionally load the small example tables into the separate DBs using their respective scripts.

Note:
 - The combined, normalized schema is in `medical_center`. The other DBs (allusers, patents, doctors, admins)
   contain small standalone tables mirroring the same concepts, per your request to "make" those databases.
 - If you want everything in separate DBs instead of a single medical_center, I can split the full schema across
   the four DBs as well — tell me and I'll regenerate scripts accordingly.
