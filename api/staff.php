<?php
header('Content-Type: application/json');
require_once 'config.php';

// Simple check to ensure only Admin uses this. 
// In a production environment, you would check the token in the headers here.
$token = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_REQUEST['token'] ?? '');
if(strpos($token, 'Bearer ') === 0) {
    $token = substr($token, 7);
}

$stmt = $pdo->prepare("SELECT role FROM users WHERE token = ?");
$stmt->execute([$token]);
$currentUser = $stmt->fetch();

if (!$currentUser || $currentUser['role'] !== 'Admin') {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized. Admin access required.']);
    exit;
}

$action = $_GET['action'] ?? 'list';

try {
    if ($action === 'list') {
        $stmt = $pdo->query("SELECT id, name, username, role, permissions, created_at FROM users");
        $staff = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['status' => 'success', 'data' => $staff]);
    } 
    elseif ($action === 'add' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $name = $_POST['name'] ?? '';
        $username = $_POST['username'] ?? '';
        $password = $_POST['password'] ?? '';
        $role = $_POST['role'] ?? 'Staff';
        $permissions = $_POST['permissions'] ?? '[]'; // JSON array string

        if (!$name || !$username || !$password) {
            echo json_encode(['status' => 'error', 'message' => 'All fields are required']);
            exit;
        }

        // Check if username exists
        $check = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $check->execute([$username]);
        if($check->fetch()) {
            echo json_encode(['status' => 'error', 'message' => 'Username already exists']);
            exit;
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO users (name, username, password_hash, role, permissions) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$name, $username, $hash, $role, $permissions]);
        
        echo json_encode(['status' => 'success', 'message' => 'Staff added successfully']);
    }
    elseif ($action === 'edit' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $id = $_POST['id'] ?? 0;
        $name = $_POST['name'] ?? '';
        $username = $_POST['username'] ?? '';
        $password = $_POST['password'] ?? '';
        $role = $_POST['role'] ?? 'Staff';
        $permissions = $_POST['permissions'] ?? '[]'; // JSON array string

        if (!$id || !$name || !$username) {
            echo json_encode(['status' => 'error', 'message' => 'Name and Username are required']);
            exit;
        }

        // Check if username exists for OTHER users
        $check = $pdo->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
        $check->execute([$username, $id]);
        if($check->fetch()) {
            echo json_encode(['status' => 'error', 'message' => 'Username already exists']);
            exit;
        }

        if (!empty($password)) {
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("UPDATE users SET name = ?, username = ?, password_hash = ?, role = ?, permissions = ? WHERE id = ?");
            $stmt->execute([$name, $username, $hash, $role, $permissions, $id]);
        } else {
            $stmt = $pdo->prepare("UPDATE users SET name = ?, username = ?, role = ?, permissions = ? WHERE id = ?");
            $stmt->execute([$name, $username, $role, $permissions, $id]);
        }
        
        echo json_encode(['status' => 'success', 'message' => 'Staff updated successfully']);
    }
    elseif ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $id = $_POST['id'] ?? 0;
        
        // Prevent deleting oneself or the last admin
        if ($id) {
            $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['status' => 'success', 'message' => 'Staff deleted successfully']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Invalid ID']);
        }
    }
    else {
        echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
    }
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
