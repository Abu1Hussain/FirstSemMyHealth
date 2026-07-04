<?php
/**
 * Migration script to calculate and update the medical_license_number
 * for all existing doctors in the database.
 */

require_once dirname(dirname(__DIR__)) . '/DataBase/db_connect.php';
require_once dirname(__DIR__) . '/utils/license_generator.php';

echo "Starting Medical License Number Migration...\n";

// Fetch all doctors and their user creation date
$sql = "SELECT d.doctor_id, d.user_id, d.first_name, d.specialization, u.created_at 
        FROM doctors d
        JOIN users u ON d.user_id = u.user_id";

$result = $conn->query($sql);

if (!$result) {
    die("Error fetching doctors: " . $conn->error);
}

$updatedCount = 0;

$stmt = $conn->prepare("UPDATE doctors SET license_number = ? WHERE doctor_id = ?");

while ($row = $result->fetch_assoc()) {
    $year = date('Y', strtotime($row['created_at']));
    
    $licenseNo = generateMedicalLicenseNumber($year, $row['first_name'], $row['specialization'], $row['user_id']);
    
    $stmt->bind_param("si", $licenseNo, $row['doctor_id']);
    if ($stmt->execute()) {
        echo "Updated Doctor ID {$row['doctor_id']} (User ID {$row['user_id']}) -> {$licenseNo}\n";
        $updatedCount++;
    } else {
        echo "Failed to update Doctor ID {$row['doctor_id']}: " . $stmt->error . "\n";
    }
}

$stmt->close();
$conn->close();

echo "\nMigration complete! Total doctors updated: {$updatedCount}\n";
?>
