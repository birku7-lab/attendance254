<?php
header('Content-Type: application/json');
require_once 'config.php';

$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($action === 'scan') {
        $qr_code = $_POST['qr_code'] ?? '';
        $date = date('Y-m-d');
        $time = date('H:i:s');
        
        if(empty($qr_code)) {
            echo json_encode(["status" => "error", "message" => "No QR code provided."]);
            exit;
        }

        try {
            // Find student
            $stmt = $pdo->prepare("SELECT id, full_name, admission_number, class, gender, photo FROM students WHERE qr_code = ?");
            $stmt->execute([$qr_code]);
            $student = $stmt->fetch();
            
            if (!$student) {
                echo json_encode(["status" => "error", "message" => "Invalid QR Code. Student not found."]);
                exit;
            }
            
            // Check for duplicate scan
            $check_stmt = $pdo->prepare("SELECT arrival_time FROM attendance WHERE student_id = ? AND attendance_date = ?");
            $check_stmt->execute([$student['id'], $date]);
            $existing = $check_stmt->fetch();
            
            if ($existing) {
                echo json_encode([
                    "status" => "duplicate", 
                    "message" => "Already Checked In Today", 
                    "data" => $student,
                    "first_scan_time" => $existing['arrival_time']
                ]);
            } else {
                // Insert attendance
                $insert_stmt = $pdo->prepare("INSERT INTO attendance (student_id, attendance_date, arrival_time, attendance_status) VALUES (?, ?, ?, 'Present')");
                $insert_stmt->execute([$student['id'], $date, $time]);
                
                $student['arrival_time'] = $time;
                echo json_encode([
                    "status" => "success", 
                    "message" => "Attendance Recorded Successfully", 
                    "data" => $student
                ]);
            }
        } catch (PDOException $e) {
            echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
        }
    }
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'records') {
        // Advanced filters
        $date = $_GET['date'] ?? '';
        $start_date = $_GET['start_date'] ?? '';
        $end_date = $_GET['end_date'] ?? '';
        $student_name = $_GET['student_name'] ?? '';
        $admission_number = $_GET['admission_number'] ?? '';
        $class = $_GET['class'] ?? '';
        $gender = $_GET['gender'] ?? '';
        $status = $_GET['status'] ?? '';
        
        $query = "SELECT a.id, a.attendance_date, a.arrival_time, a.attendance_status, s.full_name, s.admission_number, s.class, s.gender 
                  FROM attendance a 
                  JOIN students s ON a.student_id = s.id 
                  WHERE 1=1";
        $params = [];
        
        if (!empty($date)) {
            $query .= " AND a.attendance_date = ?";
            $params[] = $date;
        }
        if (!empty($start_date) && !empty($end_date)) {
            $query .= " AND a.attendance_date BETWEEN ? AND ?";
            $params[] = $start_date;
            $params[] = $end_date;
        }
        if (!empty($student_name)) {
            $query .= " AND s.full_name LIKE ?";
            $params[] = "%$student_name%";
        }
        if (!empty($admission_number)) {
            $query .= " AND s.admission_number = ?";
            $params[] = $admission_number;
        }
        if (!empty($class)) {
            $query .= " AND s.class = ?";
            $params[] = $class;
        }
        if (!empty($gender)) {
            $query .= " AND s.gender = ?";
            $params[] = $gender;
        }
        if (!empty($status)) {
            $query .= " AND a.attendance_status = ?";
            $params[] = $status;
        }
        
        $query .= " ORDER BY a.attendance_date DESC, a.arrival_time DESC";
        
        try {
            $stmt = $pdo->prepare($query);
            $stmt->execute($params);
            $records = $stmt->fetchAll();
            echo json_encode(["status" => "success", "data" => $records]);
        } catch (PDOException $e) {
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
    } else if ($action === 'history') {
        $student_id = $_GET['student_id'] ?? 0;
        try {
            $stmt = $pdo->prepare("SELECT attendance_date, arrival_time, attendance_status FROM attendance WHERE student_id = ? ORDER BY attendance_date DESC");
            $stmt->execute([$student_id]);
            echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
    }
}
?>
