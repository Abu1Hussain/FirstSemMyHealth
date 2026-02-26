<?php
/*
 * ═══════════════════════════════════════════════════════════
 * Doctors API (Public)
 * ═══════════════════════════════════════════════════════════
 *
 * Returns a list of all doctors from the database.
 * This endpoint does NOT require login — it's used by
 * the homepage to display the "Our Doctors" section.
 *
 * Returns JSON with each doctor's:
 *   - first_name, last_name (display name)
 *   - specialization (e.g. "Cardiology")
 *   - department
 *   - profile_image (filename in the /image/ folder)
 *   - bio (short description)
 *
 * Example usage (from JavaScript):
 *   fetch('php/doctors_api.php')
 *     .then(response => response.json())
 *     .then(data => { ... })
 * ═══════════════════════════════════════════════════════════
 */

header('Content-Type: application/json');

/* ── Connect to the database ── */
require_once '../DataBase/db_connect.php';

/* ── Fetch all doctors from the doctors table ── */
$query = "SELECT first_name, last_name, specialization, department, profile_image, bio
          FROM doctors
          ORDER BY doctor_id ASC";

$result = $conn->query($query);

/* ── Build the response array ── */
$doctors = [];

if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $doctors[] = [
            'name'           => $row['first_name'] . ' ' . $row['last_name'],
            'specialization' => $row['specialization'],
            'department'     => $row['department'],
            'image'          => 'image/' . $row['profile_image'],
            'bio'            => $row['bio']
        ];
    }
}

/* ── Send the JSON response ── */
echo json_encode([
    'status'  => 'success',
    'doctors' => $doctors
]);
?>
