<?php
/*
 * ═══════════════════════════════════════════════════════════
 * Database Connection File
 * ═══════════════════════════════════════════════════════════
 *
 * This file creates a single shared connection to the
 * 'medical_center' database.  Every PHP file in the project
 * includes this file with:
 *     require_once '../DataBase/db_connect.php';
 *
 * After including this file you can use the $conn variable
 * to run queries against the database.
 *
 * HOW TO CHANGE CREDENTIALS:
 *   Edit the four variables below to match your MySQL setup.
 *   Default values are set for a standard XAMPP installation.
 * ═══════════════════════════════════════════════════════════
 */

/* ── Database credentials ── */
$servername = getenv('DB_HOST') ?: "localhost";   // Where MySQL is running
$username   = getenv('DB_USER') ?: "root";        // MySQL username (XAMPP default is 'root')
$password   = getenv('DB_PASS') !== false ? getenv('DB_PASS') : "";            // MySQL password (XAMPP default is empty)
$dbname     = getenv('DB_NAME') ?: "medical_center";  // The primary database for this project

/* ── Connect to MySQL and select the database ── */
try {
    // Suppress warnings with @ to catch the exception/error cleanly
    @$conn = new mysqli($servername, $username, $password, $dbname);

    /* ── Check if the connection was successful ── */
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }

    /* ── Set character encoding to UTF-8 ── */
    // This makes sure special characters (like Arabic names) display correctly
    $conn->set_charset("utf8mb4");
} catch (Exception $e) {
    /*
     * If the connection fails, stop everything and output a clean JSON error.
     * This ensures the frontend doesn't break due to raw HTML errors.
     */
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'error',
        'message' => 'Database connection error: ' . $e->getMessage()
    ]);
    exit();
}
?>
