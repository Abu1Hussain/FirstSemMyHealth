<?php
require_once 'DataBase/db_connect.php';

header('Content-Type: text/plain');

echo "--- Doctors Table Schema ---\n";
$res = $conn->query("DESCRIBE doctors");
if ($res) {
    while($row = $res->fetch_assoc()) {
        print_r($row);
    }
}

echo "\n--- Users Table Schema ---\n";
$res = $conn->query("DESCRIBE users");
if ($res) {
    while($row = $res->fetch_assoc()) {
        print_r($row);
    }
}

echo "\n--- Departments Table ---\n";
$res = $conn->query("SHOW TABLES LIKE 'departments'");
if ($res && $res->num_rows > 0) {
    echo "Departments table EXISTS.\n";
    $desc = $conn->query("DESCRIBE departments");
    while($d = $desc->fetch_assoc()) { print_r($d); }
} else {
    echo "Departments table DOES NOT EXIST.\n";
}
?>
