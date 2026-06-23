<?php
header('Content-Type: application/json');
require_once 'config.php';

$action = $_GET['action'] ?? '';

try {
    if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $username = $_POST['username'] ?? '';
        $password = $_POST['password'] ?? '';

        if (!$username || !$password) {
            echo json_encode(['status' => 'error', 'message' => 'Username and password are required']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT id, name, username, password_hash, role, permissions FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['password_hash'])) {
            // Generate simple token
            $token = bin2hex(random_bytes(32));
            
            // Save token
            $update = $pdo->prepare("UPDATE users SET token = ? WHERE id = ?");
            $update->execute([$token, $user['id']]);

            unset($user['password_hash']);
            
            echo json_encode([
                'status' => 'success', 
                'message' => 'Login successful', 
                'token' => $token,
                'user' => $user
            ]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Invalid email or password']);
        }
    } 
    elseif ($action === 'verify' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $token = $_POST['token'] ?? '';
        if (!$token) {
            echo json_encode(['status' => 'error', 'message' => 'No token provided']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT id, name, username, role, permissions FROM users WHERE token = ?");
        $stmt->execute([$token]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            echo json_encode(['status' => 'success', 'user' => $user]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Invalid or expired token']);
        }
    }
    elseif ($action === 'logout' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $token = $_POST['token'] ?? '';
        if ($token) {
            $stmt = $pdo->prepare("UPDATE users SET token = NULL WHERE token = ?");
            $stmt->execute([$token]);
        }
        echo json_encode(['status' => 'success', 'message' => 'Logged out']);
    }
    else {
        echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
    }
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
