<?php
require_once __DIR__ . '/../../DataBase/db_connect.php';

$queries = [
    "ALTER TABLE doctors ADD COLUMN cpr VARCHAR(20) DEFAULT NULL",
    "ALTER TABLE doctors ADD COLUMN license_number VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE doctors ADD COLUMN professional_title VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE doctors ADD COLUMN clinic_location VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE doctors ADD COLUMN sub_specialties VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE doctors ADD COLUMN education TEXT DEFAULT NULL",
    "ALTER TABLE doctors ADD COLUMN board_certifications TEXT DEFAULT NULL",
    "ALTER TABLE doctors ADD COLUMN languages VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE doctors ADD COLUMN alert_new_appointment TINYINT(1) DEFAULT 1",
    "ALTER TABLE doctors ADD COLUMN alert_cancellation TINYINT(1) DEFAULT 1",
    "ALTER TABLE doctors ADD COLUMN slot_duration INT DEFAULT 30",
    "ALTER TABLE doctors ADD COLUMN buffer_time INT DEFAULT 0",
    "ALTER TABLE doctors ADD COLUMN theme_override VARCHAR(20) DEFAULT 'system'"
];

foreach ($queries as $sql) {
    if ($conn->query($sql) === TRUE) {
        echo "Successfully executed: $sql\n";
    } else {
        echo "Error or already exists executing: $sql\n" . $conn->error . "\n";
    }
}

echo "Migration complete.\n";
?>
