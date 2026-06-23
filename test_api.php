<?php
$_SERVER['HTTP_AUTHORIZATION'] = 'Bearer dummy';
$_REQUEST['token'] = 'dummy'; // Wait, I don't know the admin token.
require_once 'c:\xampp\htdocs\school attendance\api\config.php';

// fetch first admin token
$stmt = $pdo->query("SELECT token FROM users WHERE role = 'Admin' AND token IS NOT NULL LIMIT 1");
$admin = $stmt->fetch();
$token = $admin['token'];

echo "Token: $token\n";

$_GET['action'] = 'list';
$_REQUEST['token'] = $token;

// include api/staff.php directly might exit, let's just use curl in php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "http://localhost/school%20attendance/api/staff.php?action=list&token=" . urlencode($token));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
$output = curl_exec($ch);
curl_close($ch);
echo "Output: \n$output\n";
