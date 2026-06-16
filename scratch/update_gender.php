<?php
$servername = "localhost";
$username   = "root";
$password   = "";
$dbname     = "medical_center";

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

if ($conn->query("ALTER TABLE patients MODIFY gender ENUM('Male', 'Female')") === TRUE) {
    echo "Patients table updated successfully.\n";
} else {
    echo "Error updating patients table: " . $conn->error . "\n";
}

if ($conn->query("ALTER TABLE family_members MODIFY gender ENUM('Male', 'Female')") === TRUE) {
    echo "Family Members table updated successfully.\n";
} else {
    echo "Error updating family_members table: " . $conn->error . "\n";
}

$conn->close();
?>
