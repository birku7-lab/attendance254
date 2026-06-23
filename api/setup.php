<?php
// Set content type to text for setup response
header('Content-Type: text/plain');
require_once 'config.php';

try {
    // Create Students Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        admission_number VARCHAR(100) NOT NULL UNIQUE,
        class VARCHAR(100) NOT NULL,
        gender VARCHAR(20) NOT NULL,
        photo VARCHAR(255) DEFAULT NULL,
        qr_code VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    // Create Attendance Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        attendance_date DATE NOT NULL,
        arrival_time TIME NOT NULL,
        attendance_status ENUM('Present', 'Absent') DEFAULT 'Present',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        UNIQUE KEY unique_daily_attendance (student_id, attendance_date)
    )");

    echo "Database and tables initialized successfully.";
} catch (PDOException $e) {
    echo "Setup failed: " . $e->getMessage();
}
?>
