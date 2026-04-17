<?php
session_start();
$_SESSION['user_id'] = 3001; 
$_SESSION['user_role'] = 'patient';
$_SESSION['user_name'] = 'Patient One';

require 'c:\xampp\htdocs\FirstSemMyHealth\php\dashboard_api.php';
