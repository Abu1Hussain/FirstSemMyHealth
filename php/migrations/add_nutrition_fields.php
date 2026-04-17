<?php
require_once __DIR__ . '/../../DataBase/db_connect.php';

echo "🚀 Starting Nutrition Fields Migration...<br>";

// Add height_cm
$checkColumn = $conn->query("SHOW COLUMNS FROM patients LIKE 'height_cm'");
if ($checkColumn && $checkColumn->num_rows == 0) {
    if($conn->query("ALTER TABLE patients ADD COLUMN height_cm FLOAT NULL")) {
        echo "✅ Added height_cm.<br>";
    } else {
        echo "❌ Error adding height_cm: " . $conn->error . "<br>";
    }
}

// Add weight_kg
$checkColumn = $conn->query("SHOW COLUMNS FROM patients LIKE 'weight_kg'");
if ($checkColumn && $checkColumn->num_rows == 0) {
    if($conn->query("ALTER TABLE patients ADD COLUMN weight_kg FLOAT NULL")) {
        echo "✅ Added weight_kg.<br>";
    } else {
        echo "❌ Error adding weight_kg: " . $conn->error . "<br>";
    }
}

// Add activity_level
$checkColumn = $conn->query("SHOW COLUMNS FROM patients LIKE 'activity_level'");
if ($checkColumn && $checkColumn->num_rows == 0) {
    if($conn->query("ALTER TABLE patients ADD COLUMN activity_level VARCHAR(50) DEFAULT '1.2'")) {
        echo "✅ Added activity_level.<br>";
    } else {
        echo "❌ Error adding activity_level: " . $conn->error . "<br>";
    }
}

// Add medical_conditions
$checkColumn = $conn->query("SHOW COLUMNS FROM patients LIKE 'medical_conditions'");
if ($checkColumn && $checkColumn->num_rows == 0) {
    if($conn->query("ALTER TABLE patients ADD COLUMN medical_conditions TEXT NULL")) {
        echo "✅ Added medical_conditions.<br>";
    } else {
        echo "❌ Error adding medical_conditions: " . $conn->error . "<br>";
    }
}

echo "🎉 Migration Complete!";
?>
