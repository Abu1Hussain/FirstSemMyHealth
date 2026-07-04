<?php
/**
 * Helper function to generate a standardized Medical License Number
 * Format: [Year]-[First Letter of First Name]-[First Letter of Primary Specialty]-[Database User ID]
 */
function generateMedicalLicenseNumber($year, $firstName, $specialty, $userId) {
    // 1. Get the year (if a timestamp string is passed, parse it; otherwise use current year)
    // If $year is already just a 4-digit string, use it.
    if (!empty($year)) {
        if (is_numeric($year) && strlen((string)$year) === 4) {
            $yearStr = $year;
        } else {
            $yearStr = date('Y', strtotime($year));
        }
    } else {
        $yearStr = date('Y');
    }
    
    // 2. Get first letter of First Name
    $fNameLetter = !empty(trim($firstName)) ? strtoupper(substr(trim($firstName), 0, 1)) : 'X';
    
    // 3. Get first letter of Primary Specialty
    $specLetter = !empty(trim($specialty)) ? strtoupper(substr(trim($specialty), 0, 1)) : 'X';
    
    // 4. Ensure userId is present
    $uid = !empty($userId) ? $userId : '0';

    return "{$yearStr}-{$fNameLetter}-{$specLetter}-{$uid}";
}
?>
