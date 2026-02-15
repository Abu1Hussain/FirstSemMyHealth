<?php
$servername = "localhost";
$username = "admin";
$password = "password123";
$dbname = "healthcare_ai_db";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>
