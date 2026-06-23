<?php
header('Content-Type: application/json');
require_once 'config.php';

$action = $_GET['action'] ?? 'get';

try {
    if ($action === 'get') {
        $stmt = $pdo->query("SELECT setting_key, setting_value FROM settings");
        $settings = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
        echo json_encode(['status' => 'success', 'data' => $settings]);
    } 
    elseif ($action === 'update' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $stmt = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?");
        
        $updated_count = 0;
        foreach ($_POST as $key => $value) {
            // Handle file uploads separately if any (e.g. school logo)
            $stmt->execute([$key, $value, $value]);
            $updated_count++;
        }

        // Handle logo upload
        if (isset($_FILES['school_logo']) && $_FILES['school_logo']['error'] === UPLOAD_ERR_OK) {
            $upload_dir = '../uploads/';
            if (!is_dir($upload_dir)) mkdir($upload_dir, 0777, true);
            $ext = strtolower(pathinfo($_FILES['school_logo']['name'], PATHINFO_EXTENSION));
            $allowed = ['jpg', 'jpeg', 'png', 'gif', 'svg'];
            
            if (in_array($ext, $allowed)) {
                $file_name = 'logo_' . time() . '.' . $ext;
                $target_path = $upload_dir . $file_name;
                
                if (move_uploaded_file($_FILES['school_logo']['tmp_name'], $target_path)) {
                    $logo_url = 'uploads/' . $file_name;
                    $stmt->execute(['school_logo', $logo_url, $logo_url]);
                }
            }
        }

        echo json_encode(['status' => 'success', 'message' => 'Settings updated successfully']);
    } 
    else {
        echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
    }
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
