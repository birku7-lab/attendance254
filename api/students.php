<?php
header('Content-Type: application/json');
require_once 'config.php';

$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($action === 'delete') {
        $id = $_POST['id'] ?? 0;
        try {
            // Get photo path to delete the file
            $stmt = $pdo->prepare("SELECT photo FROM students WHERE id = ?");
            $stmt->execute([$id]);
            $student = $stmt->fetch();
            if ($student && $student['photo']) {
                $photo_file = '../' . $student['photo'];
                if (file_exists($photo_file)) {
                    unlink($photo_file);
                }
            }
            // Delete student
            $stmt = $pdo->prepare("DELETE FROM students WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(["status" => "success", "message" => "Student deleted successfully."]);
        } catch (PDOException $e) {
            echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
        exit;
    } else if ($action === 'edit') {
        $id = $_POST['id'] ?? 0;
        $full_name = $_POST['full_name'] ?? '';
        $admission_number = $_POST['admission_number'] ?? '';
        $class = $_POST['class'] ?? '';
        $gender = $_POST['gender'] ?? '';

        if(empty($full_name) || empty($admission_number) || empty($class) || empty($gender) || empty($id)) {
            echo json_encode(["status" => "error", "message" => "All fields are required."]);
            exit;
        }

        // Handle optional photo upload
        $photo_query_part = "";
        $params = [$full_name, $admission_number, $class, $gender, $id];
        
        if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
            $upload_dir = '../uploads/photos/';
            if (!is_dir($upload_dir)) mkdir($upload_dir, 0777, true);
            $file_ext = strtolower(pathinfo($_FILES['photo']['name'], PATHINFO_EXTENSION));
            $allowed_exts = ['jpg', 'jpeg', 'png', 'gif'];
            if (in_array($file_ext, $allowed_exts)) {
                $filename = uniqid('stu_') . '.' . $file_ext;
                if (move_uploaded_file($_FILES['photo']['tmp_name'], $upload_dir . $filename)) {
                    $photo_path = 'uploads/photos/' . $filename;
                    $photo_query_part = ", photo = ?";
                    
                    // Delete old photo
                    $stmt = $pdo->prepare("SELECT photo FROM students WHERE id = ?");
                    $stmt->execute([$id]);
                    $old_student = $stmt->fetch();
                    if ($old_student && $old_student['photo'] && file_exists('../' . $old_student['photo'])) {
                        unlink('../' . $old_student['photo']);
                    }
                    
                    // Update params order: full_name, adm, class, gender, photo, id
                    $params = [$full_name, $admission_number, $class, $gender, $photo_path, $id];
                }
            }
        }

        try {
            $stmt = $pdo->prepare("UPDATE students SET full_name = ?, admission_number = ?, class = ?, gender = ? $photo_query_part WHERE id = ?");
            $stmt->execute($params);
            echo json_encode(["status" => "success", "message" => "Student updated successfully."]);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                echo json_encode(["status" => "error", "message" => "A student with this admission number already exists."]);
            } else {
                echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
            }
        }
        exit;
    }

    // Default to Add student
    $full_name = $_POST['full_name'] ?? '';
    $admission_number = $_POST['admission_number'] ?? '';
    $class = $_POST['class'] ?? '';
    $gender = $_POST['gender'] ?? '';
    
    if(empty($full_name) || empty($admission_number) || empty($class) || empty($gender)) {
        echo json_encode(["status" => "error", "message" => "All fields are required."]);
        exit;
    }
    
    // Generate unique QR string: QR-{ADM_NO}-{RANDOM}
    $qr_code = 'QR-' . strtoupper(preg_replace('/[^a-zA-Z0-9]/', '', $admission_number)) . '-' . bin2hex(random_bytes(4));
    
    // Handle Photo upload
    $photo_path = null;
    $upload_debug = "";
    if (isset($_FILES['photo'])) {
        if ($_FILES['photo']['error'] === UPLOAD_ERR_OK) {
            $upload_dir = '../uploads/photos/';
            if (!is_dir($upload_dir)) {
                mkdir($upload_dir, 0777, true);
            }
            $file_ext = strtolower(pathinfo($_FILES['photo']['name'], PATHINFO_EXTENSION));
            $allowed_exts = ['jpg', 'jpeg', 'png', 'gif'];
            if (in_array($file_ext, $allowed_exts)) {
                $filename = uniqid('stu_') . '.' . $file_ext;
                if (move_uploaded_file($_FILES['photo']['tmp_name'], $upload_dir . $filename)) {
                    $photo_path = 'uploads/photos/' . $filename;
                    $upload_debug = "Success";
                } else {
                    $upload_debug = "move_uploaded_file failed";
                }
            } else {
                $upload_debug = "Invalid extension: " . $file_ext;
            }
        } else {
            $upload_debug = "Upload error code: " . $_FILES['photo']['error'];
        }
    } else {
        $upload_debug = "No photo field in FILES array";
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO students (full_name, admission_number, class, gender, photo, qr_code) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$full_name, $admission_number, $class, $gender, $photo_path, $qr_code]);
        echo json_encode(["status" => "success", "message" => "Student registered successfully.", "qr_code" => $qr_code, "upload_debug" => $upload_debug]);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) { // Integrity constraint violation (Duplicate)
            echo json_encode(["status" => "error", "message" => "A student with this admission number already exists.", "upload_debug" => $upload_debug]);
        } else {
            echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage(), "upload_debug" => $upload_debug]);
        }
    }
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'list') {
        try {
            $stmt = $pdo->query("SELECT id, full_name, admission_number, class, gender, photo, qr_code, created_at FROM students ORDER BY id DESC");
            $students = $stmt->fetchAll();
            echo json_encode(["status" => "success", "data" => $students]);
        } catch (PDOException $e) {
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
    } else if ($action === 'get') {
        $id = $_GET['id'] ?? 0;
        try {
            $stmt = $pdo->prepare("SELECT * FROM students WHERE id = ?");
            $stmt->execute([$id]);
            $student = $stmt->fetch();
            
            if ($student) {
                // Fetch attendance stats
                $stats_stmt = $pdo->prepare("SELECT 
                    COUNT(*) as total_days,
                    SUM(CASE WHEN attendance_status = 'Present' THEN 1 ELSE 0 END) as present_days,
                    SUM(CASE WHEN attendance_status = 'Absent' THEN 1 ELSE 0 END) as absent_days
                    FROM attendance WHERE student_id = ?");
                $stats_stmt->execute([$id]);
                $stats = $stats_stmt->fetch();
                $student['stats'] = $stats;
                
                echo json_encode(["status" => "success", "data" => $student]);
            } else {
                echo json_encode(["status" => "error", "message" => "Student not found."]);
            }
        } catch (PDOException $e) {
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
    }
}
?>
