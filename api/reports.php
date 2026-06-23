<?php
header('Content-Type: application/json');
require_once 'config.php';

$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'report_data') {
        $type = $_GET['type'] ?? 'complete';
        $date = $_GET['date'] ?? date('Y-m-d');
        $class = $_GET['class'] ?? '';
        
        try {
            if ($type === 'present') {
                $query = "SELECT s.admission_number, s.full_name, s.class, a.arrival_time, 'Present' as status
                          FROM students s
                          JOIN attendance a ON s.id = a.student_id AND a.attendance_date = ?
                          WHERE 1=1";
                $params = [$date];
                if (!empty($class)) {
                    $query .= " AND s.class = ?";
                    $params[] = $class;
                }
                $query .= " ORDER BY a.arrival_time ASC";
                
                $stmt = $pdo->prepare($query);
                $stmt->execute($params);
                echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);
                
            } else if ($type === 'absent') {
                $query = "SELECT s.admission_number, s.full_name, s.class, '-' as arrival_time, 'Absent' as status
                          FROM students s
                          WHERE s.id NOT IN (SELECT student_id FROM attendance WHERE attendance_date = ?)
                          AND 1=1";
                $params = [$date];
                if (!empty($class)) {
                    $query .= " AND s.class = ?";
                    $params[] = $class;
                }
                $query .= " ORDER BY s.full_name ASC";
                
                $stmt = $pdo->prepare($query);
                $stmt->execute($params);
                echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);
                
            } else if ($type === 'complete' || $type === 'class') {
                // Combine present and absent
                $query = "SELECT s.admission_number, s.full_name, s.class, 
                                 COALESCE(a.arrival_time, '-') as arrival_time,
                                 IF(a.id IS NULL, 'Absent', 'Present') as status
                          FROM students s
                          LEFT JOIN attendance a ON s.id = a.student_id AND a.attendance_date = ?
                          WHERE 1=1";
                $params = [$date];
                if (!empty($class)) {
                    $query .= " AND s.class = ?";
                    $params[] = $class;
                }
                $query .= " ORDER BY s.class ASC, s.full_name ASC";
                
                $stmt = $pdo->prepare($query);
                $stmt->execute($params);
                echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);
            }
            
        } catch (PDOException $e) {
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
    }
}
?>
