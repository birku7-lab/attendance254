<?php
header('Content-Type: application/json');
require_once 'config.php';

$action = $_GET['action'] ?? 'list';

try {
    if ($action === 'list') {
        $stmt = $pdo->query("SELECT * FROM holidays ORDER BY start_date ASC");
        $holidays = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['status' => 'success', 'data' => $holidays]);
    } 
    elseif ($action === 'add' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $name = $_POST['name'] ?? '';
        $start_date = $_POST['start_date'] ?? '';
        $end_date = $_POST['end_date'] ?? '';
        $description = $_POST['description'] ?? '';

        if (!$name || !$start_date || !$end_date) {
            echo json_encode(['status' => 'error', 'message' => 'Name and dates are required']);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO holidays (name, start_date, end_date, description) VALUES (?, ?, ?, ?)");
        $stmt->execute([$name, $start_date, $end_date, $description]);
        
        echo json_encode(['status' => 'success', 'message' => 'Holiday added successfully', 'id' => $pdo->lastInsertId()]);
    }
    elseif ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $id = $_POST['id'] ?? 0;
        if (!$id) {
            echo json_encode(['status' => 'error', 'message' => 'ID is required']);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM holidays WHERE id = ?");
        $stmt->execute([$id]);
        
        echo json_encode(['status' => 'success', 'message' => 'Holiday deleted successfully']);
    }
    else {
        echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
    }
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
