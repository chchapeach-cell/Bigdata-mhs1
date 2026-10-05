<?php
/**
 * ============================================================================
 * MHS1 BIGDATA - HOSTATOM DATABASE CONNECTION TEST
 * สพป.แม่ฮ่องสอน เขต 1
 * ============================================================================
 * ไฟล์นี้ใช้สำหรับตรวจสอบว่าเว็บไซต์บน Hostatom เชื่อมต่อฐานข้อมูล MySQL สำเร็จหรือไม่
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/html; charset=utf-8');

$configFile = __DIR__ . '/config.php';
$hasConfig = file_exists($configFile);

$dbConnected = false;
$errorMessage = '';
$dbDetails = [];

if ($hasConfig) {
    require_once $configFile;
    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        ]);
        $dbConnected = true;

        // Query check tables
        $tablesStmt = $pdo->query("SHOW TABLES");
        $tables = $tablesStmt->fetchAll(PDO::FETCH_COLUMN);

        $schoolCount = 0;
        if (in_array('schools', $tables)) {
            $cStmt = $pdo->query("SELECT COUNT(*) FROM schools");
            $schoolCount = $cStmt->fetchColumn();
        }

        $studentCount = 0;
        if (in_array('students', $tables)) {
            $sStmt = $pdo->query("SELECT COUNT(*) FROM students");
            $studentCount = $sStmt->fetchColumn();
        }

        $userCount = 0;
        if (in_array('users', $tables)) {
            $uStmt = $pdo->query("SELECT COUNT(*) FROM users");
            $userCount = $uStmt->fetchColumn();
        }

        $versionStmt = $pdo->query("SELECT VERSION()");
        $mysqlVersion = $versionStmt->fetchColumn();

        $dbDetails = [
            'version' => $mysqlVersion,
            'tables' => $tables,
            'school_count' => $schoolCount,
            'student_count' => $studentCount,
            'user_count' => $userCount
        ];
    } catch (Throwable $e) {
        $dbConnected = false;
        $errorMessage = $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ทดสอบการเชื่อมต่อ Hostatom Database - MHS1 BIGDATA</title>
  <style>
    body { font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #FFF9F5; color: #33272A; margin: 0; padding: 20px; line-height: 1.6; }
    .card { max-width: 680px; margin: 30px auto; background: white; border-radius: 20px; border: 3px solid #33272A; box-shadow: 6px 6px 0 #33272A; padding: 30px; }
    .status-badge { display: inline-block; padding: 6px 16px; border-radius: 999px; font-weight: bold; font-size: 14px; margin-bottom: 15px; }
    .success { background: #dcfce7; color: #166534; border: 2px solid #22c55e; }
    .error { background: #fee2e2; color: #991b1b; border: 2px solid #ef4444; }
    h1 { margin-top: 0; font-size: 22px; }
    .info-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    .info-table td { padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .info-table td:first-child { font-weight: bold; width: 35%; color: #64748b; }
    .btn { display: inline-block; background: #FF8BA7; color: #33272A; text-decoration: none; padding: 10px 22px; border-radius: 12px; font-weight: bold; border: 2px solid #33272A; box-shadow: 3px 3px 0 #33272A; margin-top: 20px; }
    .btn:hover { background: #ff7597; }
    pre { background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="card">
    <?php if ($dbConnected): ?>
      <span class="status-badge success">✅ เชื่อมต่อฐานข้อมูลสำเร็จสมบูรณ์! (Database Connected)</span>
      <h1>ระบบฐานข้อมูล Hostatom พร้อมใช้งานแล้ว</h1>
      <p>ระบบ Big Data สพป.แม่ฮ่องสอน เขต 1 สามารถติดต่อกับ MySQL Database บน Hostatom ได้อย่างถูกต้องสมบูรณ์แบบ</p>
      
      <table class="info-table">
        <tr>
          <td>MySQL Version</td>
          <td><strong><?php echo htmlspecialchars($dbDetails['version']); ?></strong></td>
        </tr>
        <tr>
          <td>ฐานข้อมูลที่เชื่อมต่อ</td>
          <td><code><?php echo htmlspecialchars(DB_NAME); ?></code></td>
        </tr>
        <tr>
          <td>จำนวนตารางที่พบ</td>
          <td><strong><?php echo count($dbDetails['tables']); ?></strong> ตาราง</td>
        </tr>
        <tr>
          <td>ข้อมูลโรงเรียน (Schools)</td>
          <td><strong><?php echo $dbDetails['school_count']; ?></strong> โรงเรียน</td>
        </tr>
        <tr>
          <td>ข้อมูลสถิตินักเรียน</td>
          <td><strong><?php echo $dbDetails['student_count']; ?></strong> รายการ</td>
        </tr>
        <tr>
          <td>ผู้ใช้งานในระบบ (Users)</td>
          <td><strong><?php echo $dbDetails['user_count']; ?></strong> คน</td>
        </tr>
      </table>

      <div style="margin-top: 25px; text-align: center;">
        <a href="/" class="btn">🚀 เข้าสู่หน้าหลักของระบบ (Open App)</a>
      </div>

    <?php else: ?>
      <span class="status-badge error">❌ ยังไม่สามารถเชื่อมต่อฐานข้อมูลได้</span>
      <h1>พบข้อผิดพลาดในการเชื่อมต่อ MySQL</h1>
      <p>กรุณาตรวจสอบว่าคุณได้สร้าง Database ใน cPanel และนำค่ามากรอกในไฟล์ <code>api/config.php</code> ถูกต้องครบถ้วนหรือไม่</p>
      
      <pre><?php echo htmlspecialchars($errorMessage ?: 'ไม่พบไฟล์ api/config.php'); ?></pre>

      <h3>สิ่งที่ต้องตรวจสอบใน cPanel ของ Hostatom:</h3>
      <ol style="font-size: 14px; line-height: 1.8;">
        <li>คุณสร้าง MySQL Database และ MySQL User ใน cPanel แล้วหรือยัง</li>
        <li>คุณได้กด <strong>Add User to Database</strong> และเลือก <strong>ALL PRIVILEGES</strong> แล้วหรือยัง</li>
        <li>ชื่อ DB_NAME, DB_USER, DB_PASS ใน <code>api/config.php</code> ตรงกับใน cPanel หรือไม่ (อย่าลืมคำนำหน้า cpanel เช่น <code>user_mhs1db</code>)</li>
        <li>คุณได้ Import ไฟล์ <code>database/01_mhs1_schema_mysql.sql</code> ใน phpMyAdmin แล้วหรือยัง</li>
      </ol>
    <?php endif; ?>
  </div>
</body>
</html>
