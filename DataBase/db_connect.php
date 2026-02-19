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
$servername = "localhost";   // Where MySQL is running
$username   = "root";        // MySQL username (XAMPP default is 'root')
$password   = "";            // MySQL password (XAMPP default is empty)
$dbname     = "medical_center";  // The primary database for this project

/* ── Connect to MySQL and select the database ── */
$conn = new mysqli($servername, $username, $password, $dbname);

/* ── Check if the connection was successful ── */
if ($conn->connect_error) {
    /*
     * If the connection fails, stop everything and show the error.
     * Common reasons for failure:
     *   - MySQL/XAMPP is not running
     *   - Wrong username or password
     *   - The 'medical_center' database has not been created yet
     *     (run setup.php first to create it)
     */
    die("Database connection failed: " . $conn->connect_error);
}

/* ── Set character encoding to UTF-8 ── */
// This makes sure special characters (like Arabic names) display correctly
$conn->set_charset("utf8mb4");
?>
