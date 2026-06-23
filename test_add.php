<?php
require_once 'c:\xampp\htdocs\school attendance\api\config.php';
$_POST['name'] = 'Test';
$_POST['username'] = 'testadmin';
$_POST['password'] = 'admin123';
$_POST['role'] = 'Admin';
$_POST['permissions'] = '["all"]';

// Fake token since we skipped auth via directly calling the file? No, staff.php requires auth.
// Let's just include staff.php? We can't because of the `exit` statements. Let's do it manually.

$name = $_POST['name'];
$username = $_POST['username'];
$password = $_POST['password'];
$role = $_POST['role'];
$permissions = $_POST['permissions'];

$check = $pdo->prepare("SELECT id FROM users WHERE username = ?");
$check->execute([$username]);
if($check->fetch()) {
    echo "Username exists\n";
} else {
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (name, username, password_hash, role, permissions) VALUES (?, ?, ?, ?, ?)");
    if ($stmt->execute([$name, $username, $hash, $role, $permissions])) {
        echo "Success\n";
    } else {
        print_r($stmt->errorInfo());
    }
}
?>
