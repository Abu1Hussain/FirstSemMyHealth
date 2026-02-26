<?php
session_start();
$_SESSION['user_id'] = 4001; // Admin ID
$_SESSION['user_role'] = 'admin';

require_once 'DataBase/db_connect.php';

echo "--- CHART DATA ---\n";
$_GET['action'] = 'chart_data';
include 'php/admin_api.php';
echo "\n\n";

echo "--- SYSTEM LOGS ---\n";
// Re-initialize for next include if needed, but admin_api exits
// We'll use a separate output capture or just run one by one.
?>
