<?php
header('Content-Type: application/json');
require_once 'config.php';

try {
    $date = date('Y-m-d');
    
    // Total students
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM students");
    $total_students = $stmt->fetch()['total'];
    
    // Present today
    $stmt = $pdo->prepare("SELECT COUNT(*) as present FROM attendance WHERE attendance_date = ? AND attendance_status = 'Present'");
    $stmt->execute([$date]);
    $present_today = $stmt->fetch()['present'];
    
    // Absent today (Simplistic calculation: Total - Present)
    $absent_today = $total_students - $present_today;
    
    // Attendance Percentage
    $percentage = $total_students > 0 ? round(($present_today / $total_students) * 100, 1) : 0;
    
    // Recent scans
    $stmt = $pdo->prepare("SELECT a.arrival_time, s.full_name, s.class, s.photo 
                           FROM attendance a 
                           JOIN students s ON a.student_id = s.id 
                           WHERE a.attendance_date = ? 
                           ORDER BY a.arrival_time DESC LIMIT 10");
    $stmt->execute([$date]);
    $recent_scans = $stmt->fetchAll();
    
    echo json_encode([
        "status" => "success",
        "data" => [
            "total_students" => $total_students,
            "present_today" => $present_today,
            "absent_today" => $absent_today,
            "attendance_percentage" => $percentage,
            "recent_scans" => $recent_scans
        ]
    ]);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
