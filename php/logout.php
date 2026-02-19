<?php
/*
 * Logout Handler
 * Destroys the user session and redirects to the homepage.
 * Also sets cache-control headers to prevent the browser
 * from loading cached pages after logout.
 */

session_start();
session_unset();
session_destroy();

// Prevent the browser from caching authenticated pages
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

// Send the user back to the homepage
header("Location: ../index.html");
exit();
?>
