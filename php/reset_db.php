<?php
/*
 * ═══════════════════════════════════════════════════════════
 * Database Reset Script
 * ═══════════════════════════════════════════════════════════
 *
 * Drops the entire 'medical_center' database and recreates
 * it from scratch by running setup.php.
 *
 * ⚠️ WARNING: This will DELETE ALL existing data!
 *    Only use this if you want a fresh start.
 *
 * HOW TO RUN:
 *   http://localhost/FirstSemMyHealth/php/reset_db.php
 * ═══════════════════════════════════════════════════════════
 */

/* ── Database credentials (same as db_connect.php) ── */
$servername = "localhost";
$username   = "root";
$password   = "";
$dbname     = "medical_center";

/* ── Connect to MySQL ── */
$conn = new mysqli($servername, $username, $password);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

/* ── Drop the old database completely ── */
$conn->query("DROP DATABASE IF EXISTS `$dbname`");
echo "🗑️ Old database '$dbname' has been dropped.<br><br>";
$conn->close();

/* ── Recreate everything by running setup.php ── */
echo "🔄 Rebuilding database from scratch...<br><br>";
echo "<hr><br>";
include 'setup.php';
?>
