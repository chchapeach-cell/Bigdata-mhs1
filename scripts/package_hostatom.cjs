const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function buildPackage() {
  console.log('🚀 เริ่มต้นสร้างชุดไฟล์สำหรับ Hostatom (Hostatom Deployment Package)...');

  const zip = new JSZip();

  const distDir = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distDir)) {
    console.error('❌ ไม่พบโฟลเดอร์ /dist กรุณารัน vite build ก่อน');
    process.exit(1);
  }

  // 1. เพิ่มไฟล์จาก /dist เข้าไปใน root ของ ZIP
  function addDirectoryToZip(dirPath, zipFolder, isRoot = false) {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        const subFolder = zipFolder.folder(file);
        addDirectoryToZip(fullPath, subFolder, false);
      } else {
        let content = fs.readFileSync(fullPath);
        // ถ้าเป็น index.html ปรับให้รองรับ relative paths ./assets/ เผื่อวางในโฟลเดอร์ย่อย
        if (file === 'index.html') {
          let html = content.toString('utf-8');
          html = html.replace(/src="\/assets\//g, 'src="./assets/');
          html = html.replace(/href="\/assets\//g, 'href="./assets/');
          html = html.replace(/href="\/manifest\.json"/g, 'href="./manifest.json"');
          html = html.replace(/href="\/icon-/g, 'href="./icon-');
          content = Buffer.from(html, 'utf-8');
        }
        zipFolder.file(file, content);
      }
    }
  }

  console.log('📦 กำลังรวมไฟล์ Frontend Web Application (HTML / JS / CSS)...');
  addDirectoryToZip(distDir, zip, true);

  // 2. สร้างไฟล์ .htaccess สำหรับ Apache บน Hostatom
  const htaccessContent = `# ==============================================================================
# MHS1 BIGDATA - Apache Configuration (.htaccess) สำหรับ Hostatom
# รองรับ React Single Page Application (SPA), REST API, และความปลอดภัย
# ==============================================================================

Options -Indexes
RewriteEngine On

# 1. อนุญาตให้โฟลเดอร์ api และไฟล์จริงทำงานได้ปกติ
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# 2. ส่ง Request อื่นๆ ทั้งหมดไปยัง index.html เพื่อรองรับ SPA Client Routing
RewriteRule ^ index.html [L]

# 3. เปิดใช้งาน GZIP Compression เพื่อลดขนาดและเพิ่มความเร็วในการโหลด
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css application/javascript application/json application/xml image/svg+xml
</IfModule>

# 4. แคชไฟล์ Assets (JS/CSS/รูปภาพ) 1 เดือน เพื่อประหยัด Bandwidth
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresDefault "access plus 1 day"
    ExpiresByType text/html "access plus 0 seconds"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType image/jpeg "access plus 1 month"
    ExpiresByType image/svg+xml "access plus 1 month"
</IfModule>

# 5. ความปลอดภัย HTTP Headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-XSS-Protection "1; mode=block"
    Header set X-Frame-Options "SAMEORIGIN"
</IfModule>
`;
  zip.file('.htaccess', htaccessContent);

  // 3. สร้างโฟลเดอร์ api/ พร้อม config.php, mhs1_db.php, และ test.php
  const apiFolder = zip.folder('api');

  const configPhp = `<?php
/**
 * ============================================================================
 * ไฟล์ตั้งค่าฐานข้อมูล MySQL บน Hostatom (api/config.php)
 * ============================================================================
 * ให้แก้ไขข้อมูลด้านล่างให้ตรงกับฐานข้อมูลที่คุณสร้างใน cPanel / DirectAdmin
 */

// 1. โฮสต์ฐานข้อมูล (บน Hostatom ปกติจะเป็น 'localhost')
define('DB_HOST', 'localhost');

// 2. ชื่อฐานข้อมูล MySQL ที่สร้างใน cPanel เช่น cpaneluser_mhs1db
define('DB_NAME', 'your_cpanel_mhs1db');

// 3. ชื่อผู้ใช้งานฐานข้อมูล (MySQL User) เช่น cpaneluser_dbuser
define('DB_USER', 'your_cpanel_dbuser');

// 4. รหัสผ่านของผู้ใช้งานฐานข้อมูล
define('DB_PASS', 'your_database_password');

// 5. รหัสลับสำหรับ API (Security Secret Key) ป้องกันบุคคลภายนอกเรียกใช้งาน
define('API_SECRET', 'mhs1_bigdata_secret_2026');

// 6. ตั้งค่าการรายงาน Error (ในระหว่างติดตั้งแนะนำให้เปิด E_ALL พอใช้งานจริงค่อยปิด)
error_reporting(E_ALL);
ini_set('display_errors', 0);
?>`;
  apiFolder.file('config.php', configPhp);

  const mhs1DbPhp = `<?php
/**
 * ============================================================================
 * MHS1 BIGDATA - REST API Backend Database Connector สำหรับ Hostatom
 * รองรับการทำงานร่วมกับ MySQL 5.7+ / 8.0+ / MariaDB 10.3+
 * ============================================================================
 */

require_once __DIR__ . '/config.php';

// ตั้งค่า CORS เพื่อความปลอดภัยและรองรับการเรียกจากแอพ
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Api-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ตรวจสอบ API Secret Key
$received_key = $_REQUEST['key'] ?? $_SERVER['HTTP_X_API_KEY'] ?? '';
if ($received_key !== API_SECRET) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized: รหัส API Key ไม่ถูกต้อง กรุณาตรวจสอบใน api/config.php']);
    exit;
}

// เชื่อมต่อ MySQL ด้วย PDO
try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error', 
        'message' => 'ไม่สามารถเชื่อมต่อฐานข้อมูล MySQL ได้: ' . $e->getMessage(),
        'tip' => 'กรุณาตรวจสอบชื่อฐานข้อมูล ชื่อผู้ใช้ และรหัสผ่านในไฟล์ api/config.php'
    ]);
    exit;
}

$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true) ?? [];

switch ($action) {
    // -------------------------------------------------------------
    // 1. PING & CONNECTION CHECK
    // -------------------------------------------------------------
    case 'ping':
        $ver = $pdo->query('select version()')->fetchColumn();
        echo json_encode([
            'status' => 'ok',
            'success' => true,
            'message' => 'เชื่อมต่อฐานข้อมูล Hostatom MySQL สำเร็จสมบูรณ์!',
            'mysql_version' => $ver,
            'server_time' => date('Y-m-d H:i:s'),
            'database' => DB_NAME
        ]);
        break;

    // -------------------------------------------------------------
    // 2. SCHOOLS
    // -------------------------------------------------------------
    case 'get_schools':
        $stmt = $pdo->query("SELECT * FROM \`schools\` ORDER BY \`id\` ASC");
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['major_subjects'] = json_decode($r['major_subjects'] ?? '[]', true);
            $r['major_subjects_with_staff'] = json_decode($r['major_subjects_with_staff'] ?? '[]', true);
            $r['classrooms'] = json_decode($r['classrooms'] ?? '[]', true);
            $r['vice_directors'] = json_decode($r['vice_directors'] ?? '[]', true);
            $r['has_solar_battery'] = (bool)$r['has_solar_battery'];
            $r['is_expansion'] = (bool)$r['is_expansion'];
        }
        echo json_encode(['status' => 'ok', 'data' => $rows]);
        break;

    case 'save_school':
        $data = $input;
        $id = $data['id'] ?? '';
        if (!$id) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Missing school id']);
            exit;
        }

        $sql = "INSERT INTO \`schools\` (
            \`id\`, \`name\`, \`district\`, \`amphoe\`, \`network_group\`, \`internet_type\`, 
            \`electricity\`, \`water_system\`, \`water_system_detail\`, \`solar_kw\`, 
            \`has_solar_battery\`, \`solar_battery_capacity\`, \`staff_count\`, 
            \`contract_teachers_count\`, \`admin_staff_count\`, \`janitor_count\`, \`other_staff_count\`,
            \`major_subjects\`, \`major_subjects_with_staff\`, \`classrooms\`, 
            \`director_name\`, \`director_phone\`, \`vice_director_name\`, \`vice_director_phone\`, \`vice_directors\`,
            \`school_phone\`, \`email\`, \`facebook\`, \`line\`, \`website\`, \`address\`, 
            \`image_url\`, \`logo_url\`, \`director_image_url\`, \`latitude\`, \`longitude\`, 
            \`size\`, \`is_expansion\`, \`special_highlights\`, \`updated_by\`
        ) VALUES (
            :id, :name, :district, :amphoe, :network_group, :internet_type, 
            :electricity, :water_system, :water_system_detail, :solar_kw, 
            :has_solar_battery, :solar_battery_capacity, :staff_count, 
            :contract_teachers_count, :admin_staff_count, :janitor_count, :other_staff_count,
            :major_subjects, :major_subjects_with_staff, :classrooms, 
            :director_name, :director_phone, :vice_director_name, :vice_director_phone, :vice_directors,
            :school_phone, :email, :facebook, :line, :website, :address, 
            :image_url, :logo_url, :director_image_url, :latitude, :longitude, 
            :size, :is_expansion, :special_highlights, :updated_by
        ) ON DUPLICATE KEY UPDATE 
            \`name\` = VALUES(\`name\`),
            \`amphoe\` = VALUES(\`amphoe\`),
            \`network_group\` = VALUES(\`network_group\`),
            \`internet_type\` = VALUES(\`internet_type\`),
            \`electricity\` = VALUES(\`electricity\`),
            \`water_system\` = VALUES(\`water_system\`),
            \`water_system_detail\` = VALUES(\`water_system_detail\`),
            \`solar_kw\` = VALUES(\`solar_kw\`),
            \`has_solar_battery\` = VALUES(\`has_solar_battery\`),
            \`solar_battery_capacity\` = VALUES(\`solar_battery_capacity\`),
            \`staff_count\` = VALUES(\`staff_count\`),
            \`contract_teachers_count\` = VALUES(\`contract_teachers_count\`),
            \`admin_staff_count\` = VALUES(\`admin_staff_count\`),
            \`janitor_count\` = VALUES(\`janitor_count\`),
            \`other_staff_count\` = VALUES(\`other_staff_count\`),
            \`major_subjects\` = VALUES(\`major_subjects\`),
            \`major_subjects_with_staff\` = VALUES(\`major_subjects_with_staff\`),
            \`classrooms\` = VALUES(\`classrooms\`),
            \`director_name\` = VALUES(\`director_name\`),
            \`director_phone\` = VALUES(\`director_phone\`),
            \`vice_director_name\` = VALUES(\`vice_director_name\`),
            \`vice_director_phone\` = VALUES(\`vice_director_phone\`),
            \`vice_directors\` = VALUES(\`vice_directors\`),
            \`school_phone\` = VALUES(\`school_phone\`),
            \`email\` = VALUES(\`email\`),
            \`facebook\` = VALUES(\`facebook\`),
            \`line\` = VALUES(\`line\`),
            \`website\` = VALUES(\`website\`),
            \`address\` = VALUES(\`address\`),
            \`image_url\` = VALUES(\`image_url\`),
            \`logo_url\` = VALUES(\`logo_url\`),
            \`director_image_url\` = VALUES(\`director_image_url\`),
            \`latitude\` = VALUES(\`latitude\`),
            \`longitude\` = VALUES(\`longitude\`),
            \`size\` = VALUES(\`size\`),
            \`is_expansion\` = VALUES(\`is_expansion\`),
            \`special_highlights\` = VALUES(\`special_highlights\`),
            \`updated_by\` = VALUES(\`updated_by\`),
            \`updated_at\` = NOW()";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':id' => $id,
            ':name' => $data['name'] ?? '',
            ':district' => $data['district'] ?? 'สพป.แม่ฮ่องสอน เขต 1',
            ':amphoe' => $data['amphoe'] ?? null,
            ':network_group' => $data['network_group'] ?? null,
            ':internet_type' => $data['internet_type'] ?? 'fiber',
            ':electricity' => is_string($data['electricity'] ?? null) ? $data['electricity'] : json_encode($data['electricity'] ?? null),
            ':water_system' => $data['water_system'] ?? 'government',
            ':water_system_detail' => $data['water_system_detail'] ?? null,
            ':solar_kw' => $data['solar_kw'] ?? null,
            ':has_solar_battery' => !empty($data['has_solar_battery']) ? 1 : 0,
            ':solar_battery_capacity' => $data['solar_battery_capacity'] ?? null,
            ':staff_count' => (int)($data['staff_count'] ?? 0),
            ':contract_teachers_count' => (int)($data['contract_teachers_count'] ?? 0),
            ':admin_staff_count' => (int)($data['admin_staff_count'] ?? 0),
            ':janitor_count' => (int)($data['janitor_count'] ?? 0),
            ':other_staff_count' => (int)($data['other_staff_count'] ?? 0),
            ':major_subjects' => json_encode($data['major_subjects'] ?? []),
            ':major_subjects_with_staff' => json_encode($data['major_subjects_with_staff'] ?? []),
            ':classrooms' => json_encode($data['classrooms'] ?? []),
            ':director_name' => $data['director_name'] ?? null,
            ':director_phone' => $data['director_phone'] ?? null,
            ':vice_director_name' => $data['vice_director_name'] ?? null,
            ':vice_director_phone' => $data['vice_director_phone'] ?? null,
            ':vice_directors' => json_encode($data['vice_directors'] ?? []),
            ':school_phone' => $data['school_phone'] ?? null,
            ':email' => $data['email'] ?? null,
            ':facebook' => $data['facebook'] ?? null,
            ':line' => $data['line'] ?? null,
            ':website' => $data['website'] ?? null,
            ':address' => $data['address'] ?? null,
            ':image_url' => $data['image_url'] ?? null,
            ':logo_url' => $data['logo_url'] ?? null,
            ':director_image_url' => $data['director_image_url'] ?? null,
            ':latitude' => (float)($data['latitude'] ?? 0),
            ':longitude' => (float)($data['longitude'] ?? 0),
            ':size' => $data['size'] ?? 'small',
            ':is_expansion' => !empty($data['is_expansion']) ? 1 : 0,
            ':special_highlights' => $data['special_highlights'] ?? null,
            ':updated_by' => $data['updated_by'] ?? 'Hostatom API'
        ]);

        echo json_encode(['status' => 'ok', 'message' => 'Saved school successfully', 'id' => $id]);
        break;

    // -------------------------------------------------------------
    // 3. STUDENTS & STUDENTS G
    // -------------------------------------------------------------
    case 'get_students':
        $stmt = $pdo->query("SELECT * FROM \`students\`");
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['grades'] = json_decode($r['grades'] ?? '{}', true);
        }
        echo json_encode(['status' => 'ok', 'data' => $rows]);
        break;

    case 'save_student':
        $data = $input;
        $id = $data['id'] ?? '';
        if (!$id) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Missing student id']);
            exit;
        }

        $sql = "INSERT INTO \`students\` (
            \`id\`, \`school_id\`, \`school_name\`, \`academic_year\`, 
            \`grades\`, \`total_male\`, \`total_female\`, \`total_students\`
        ) VALUES (
            :id, :school_id, :school_name, :academic_year, 
            :grades, :total_male, :total_female, :total_students
        ) ON DUPLICATE KEY UPDATE 
            \`school_name\` = VALUES(\`school_name\`),
            \`grades\` = VALUES(\`grades\`),
            \`total_male\` = VALUES(\`total_male\`),
            \`total_female\` = VALUES(\`total_female\`),
            \`total_students\` = VALUES(\`total_students\`),
            \`updated_at\` = NOW()";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':id' => $id,
            ':school_id' => $data['school_id'] ?? '',
            ':school_name' => $data['school_name'] ?? '',
            ':academic_year' => $data['academic_year'] ?? '',
            ':grades' => json_encode($data['grades'] ?? []),
            ':total_male' => (int)($data['total_male'] ?? 0),
            ':total_female' => (int)($data['total_female'] ?? 0),
            ':total_students' => (int)($data['total_students'] ?? 0)
        ]);

        echo json_encode(['status' => 'ok', 'message' => 'Saved student data successfully', 'id' => $id]);
        break;

    case 'get_students_g':
        $stmt = $pdo->query("SELECT * FROM \`students_g\`");
        echo json_encode(['status' => 'ok', 'data' => $stmt->fetchAll()]);
        break;

    case 'save_student_g':
        $data = $input;
        $id = $data['id'] ?? '';
        if (!$id) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Missing student_g id']);
            exit;
        }

        $sql = "INSERT INTO \`students_g\` (
            \`id\`, \`school_id\`, \`school_name\`, \`academic_year\`, 
            \`total_g_students\`, \`male_g_count\`, \`female_g_count\`, \`notes\`
        ) VALUES (
            :id, :school_id, :school_name, :academic_year, 
            :total_g_students, :male_g_count, :female_g_count, :notes
        ) ON DUPLICATE KEY UPDATE 
            \`total_g_students\` = VALUES(\`total_g_students\`),
            \`male_g_count\` = VALUES(\`male_g_count\`),
            \`female_g_count\` = VALUES(\`female_g_count\`),
            \`notes\` = VALUES(\`notes\`),
            \`updated_at\` = NOW()";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':id' => $id,
            ':school_id' => $data['school_id'] ?? '',
            ':school_name' => $data['school_name'] ?? '',
            ':academic_year' => $data['academic_year'] ?? '',
            ':total_g_students' => (int)($data['total_g_students'] ?? 0),
            ':male_g_count' => (int)($data['male_g_count'] ?? 0),
            ':female_g_count' => (int)($data['female_g_count'] ?? 0),
            ':notes' => $data['notes'] ?? null
        ]);

        echo json_encode(['status' => 'ok', 'message' => 'Saved student G data successfully', 'id' => $id]);
        break;

    // -------------------------------------------------------------
    // 4. NT & RT ASSESSMENTS
    // -------------------------------------------------------------
    case 'get_nt_assessments':
        $year = $_REQUEST['year'] ?? '';
        $sql = "SELECT * FROM \`nt_assessments\`" . ($year ? " WHERE \`academic_year\` = :year" : "") . " ORDER BY \`order_num\` ASC";
        $stmt = $pdo->prepare($sql);
        if ($year) $stmt->execute([':year' => $year]);
        else $stmt->execute();
        echo json_encode(['status' => 'ok', 'data' => $stmt->fetchAll()]);
        break;

    case 'get_rt_assessments':
        $year = $_REQUEST['year'] ?? '';
        $sql = "SELECT * FROM \`rt_assessments\`" . ($year ? " WHERE \`academic_year\` = :year" : "") . " ORDER BY \`order_num\` ASC";
        $stmt = $pdo->prepare($sql);
        if ($year) $stmt->execute([':year' => $year]);
        else $stmt->execute();
        echo json_encode(['status' => 'ok', 'data' => $stmt->fetchAll()]);
        break;

    // -------------------------------------------------------------
    // 5. USERS & SETTINGS
    // -------------------------------------------------------------
    case 'get_users':
        $stmt = $pdo->query("SELECT * FROM \`users\` ORDER BY \`created_at\` DESC");
        echo json_encode(['status' => 'ok', 'data' => $stmt->fetchAll()]);
        break;

    case 'get_settings':
        $stmt = $pdo->query("SELECT \`config\` FROM \`settings\` WHERE \`id\` = 'system_config' LIMIT 1");
        $row = $stmt->fetch();
        if ($row && !empty($row['config'])) {
            echo json_encode(['status' => 'ok', 'data' => json_decode($row['config'], true)]);
        } else {
            echo json_encode(['status' => 'ok', 'data' => null]);
        }
        break;

    default:
        http_response_code(400);
        echo json_encode([
            'status' => 'error', 
            'message' => "Unknown action '{$action}'"
        ]);
        break;
}
?>`;
  apiFolder.file('mhs1_db.php', mhs1DbPhp);

  const testPhp = `<?php
/**
 * หน้าตรวจสอบความพร้อมระบบ API บน Hostatom (api/test.php)
 */
require_once __DIR__ . '/config.php';
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>MHS1 Database Connection Test</title>
  <style>
    body { font-family: sans-serif; max-width: 600px; margin: 40px auto; line-height: 1.6; padding: 20px; }
    .card { background: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #ddd; }
    .success { color: #15803d; font-weight: bold; }
    .error { color: #b91c1c; font-weight: bold; }
  </style>
</head>
<body>
  <h2>🔍 ทดสอบการเชื่อมต่อฐานข้อมูล Hostatom MySQL</h2>
  <div class="card">
    <?php
    try {
        $pdo = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
            DB_USER,
            DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        $ver = $pdo->query('select version()')->fetchColumn();
        echo "<p class='success'>✅ เชื่อมต่อฐานข้อมูลสำเร็จสมบูรณ์!</p>";
        echo "<ul>";
        echo "<li><strong>Database Name:</strong> " . htmlspecialchars(DB_NAME) . "</li>";
        echo "<li><strong>MySQL Version:</strong> " . htmlspecialchars($ver) . "</li>";
        echo "<li><strong>Server Time:</strong> " . date('Y-m-d H:i:s') . "</li>";
        echo "</ul>";
        echo "<p>ระบบพร้อมให้บริการ REST API แล้ว คุณสามารถใช้งานเว็บไซต์ได้ตามปกติ</p>";
    } catch (PDOException $e) {
        echo "<p class='error'>❌ เชื่อมต่อไม่สำเร็จ: " . htmlspecialchars($e->getMessage()) . "</p>";
        echo "<p>กรุณาตรวจสอบว่า:</p>";
        echo "<ol>";
        echo "<li>สร้าง Database และ User ใน cPanel เรียบร้อยแล้วหรือไม่</li>";
        echo "<li>ได้กด <strong>'Add User to Database'</strong> และให้สิทธิ์ <strong>ALL PRIVILEGES</strong> หรือยัง</li>";
        echo "<li>กรอกชื่อ DB_NAME, DB_USER, DB_PASS ใน <code>api/config.php</code> ถูกต้องครบถ้วน</li>";
        echo "</ol>";
    }
    ?>
  </div>
</body>
</html>`;
  apiFolder.file('test.php', testPhp);

  // 4. โฟลเดอร์ database/
  const dbFolder = zip.folder('database');

  // อ่าน Schema SQL
  const hostatomTsPath = path.join(__dirname, '..', 'src', 'lib', 'hostatom.ts');
  let hostatomTs = '';
  if (fs.existsSync(hostatomTsPath)) {
    hostatomTs = fs.readFileSync(hostatomTsPath, 'utf-8');
  }

  // ดึง schema MySQL
  const schemaMatch = hostatomTs.match(/export const HOSTATOM_MYSQL_SCHEMA_SQL = `([\s\S]*?)`;/);
  const mysqlSchemaSql = schemaMatch ? schemaMatch[1] : '-- MHS1 MySQL Schema';

  const syncSqlMatch = hostatomTs.match(/export const HOSTATOM_SYNC_SUPABASE_TABLES_SQL = `([\s\S]*?)`;/);
  const syncSql = syncSqlMatch ? syncSqlMatch[1] : '-- MHS1 Sync SQL';

  dbFolder.file('01_mhs1_schema_mysql.sql', mysqlSchemaSql);
  dbFolder.file('02_sync_supabase_to_hostatom.sql', syncSql);

  // 5. คู่มือติดตั้งแบบ Interactive HTML สวยงาม
  const manualHtml = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>คู่มือการติดตั้ง MHS1 BIGDATA บน Hostatom (cPanel / DirectAdmin)</title>
  <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Prompt', sans-serif; background: #FFF9F5; color: #33272A; margin: 0; padding: 20px; line-height: 1.6; }
    .container { max-width: 900px; margin: 0 auto; background: #ffffff; border: 3px solid #33272A; border-radius: 20px; padding: 30px; box-shadow: 6px 6px 0px #33272A; }
    h1 { font-size: 26px; color: #1e1b4b; border-bottom: 2px dashed #33272A; padding-bottom: 12px; margin-top: 0; }
    .badge { display: inline-block; background: #A0E7E5; border: 2px solid #33272A; padding: 4px 12px; border-radius: 999px; font-weight: 700; font-size: 13px; margin-bottom: 15px; }
    .step-box { background: #F8FAFC; border: 2px solid #33272A; border-radius: 14px; padding: 20px; margin-bottom: 20px; box-shadow: 4px 4px 0px rgba(0,0,0,0.06); }
    .step-num { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: #FF8BA7; color: #33272A; font-weight: 900; border-radius: 50%; border: 2px solid #33272A; margin-right: 10px; }
    .step-title { font-size: 18px; font-weight: 700; display: inline-flex; align-items: center; }
    code, pre { background: #1e293b; color: #38bdf8; padding: 3px 8px; border-radius: 6px; font-family: monospace; font-size: 14px; }
    pre { padding: 15px; overflow-x: auto; border: 2px solid #33272A; border-radius: 10px; }
    .tip-box { background: #FEF3C7; border: 2px solid #D97706; border-radius: 10px; padding: 15px; margin: 15px 0; font-size: 14px; }
    .success-box { background: #DCFCE7; border: 2px solid #15803d; border-radius: 10px; padding: 15px; margin: 15px 0; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <span class="badge">🚀 ชุดไฟล์สำหรับติดตั้งบน Hostatom (Standalone Web & MySQL)</span>
    <h1>คู่มือการติดตั้งระบบ MHS1 BIGDATA บน Hostatom</h1>
    <p>ชุดไฟล์นี้เป็นชุดที่แยกออกมาโดยเฉพาะสำหรับติดตั้งบน Web Hosting ของ Hostatom โดยที่ระบบเดิมบนคลาวด์ยังคงอยู่ครบถ้วน 100%</p>

    <div class="step-box">
      <div class="step-title"><span class="step-num">1</span> อัปโหลดไฟล์ทั้งหมดขึ้น Hostatom ผ่าน File Manager</div>
      <p>1. เข้าสู่ <strong>cPanel</strong> ของ Hostatom แล้วคลิกที่เมนู <strong>File Manager</strong></p>
      <p>2. ดับเบิ้ลคลิกเข้าโฟลเดอร์ <code>public_html</code> (หรือโฟลเดอร์ของ Subdomain)</p>
      <p>3. คลิกปุ่ม <strong>Upload</strong> ด้านบน แล้วเลือกไฟล์ ZIP ชุดนี้อัปโหลดขึ้นไป</p>
      <p>4. เมื่ออัปโหลดเสร็จ ให้คลิกขวาที่ไฟล์ ZIP แล้วเลือก <strong>Extract (แตกไฟล์)</strong> ลงใน <code>public_html</code></p>
    </div>

    <div class="step-box">
      <div class="step-title"><span class="step-num">2</span> สร้างฐานข้อมูล MySQL และ User ใน cPanel</div>
      <p>1. ใน cPanel คลิกเมนู <strong>MySQL Databases</strong> (หรือ MySQL Database Wizard)</p>
      <p>2. สร้างชื่อฐานข้อมูลใหม่ เช่น <code>mhs1db</code></p>
      <p>3. สร้างผู้ใช้ (Create New User) และตั้งรหัสผ่านที่ปลอดภัย</p>
      <p>4. <strong>สำคัญมาก:</strong> เลื่อนลงมาที่หัวข้อ <em>Add User To Database</em> เลือก User และ Database ที่เพิ่งสร้าง แล้วกด Add จากนั้นติ๊กเลือก <strong>ALL PRIVILEGES</strong> แล้วกด Make Changes</p>
    </div>

    <div class="step-box">
      <div class="step-title"><span class="step-num">3</span> นำเข้าโครงสร้างตารางผ่าน phpMyAdmin</div>
      <p>1. กลับมาที่หน้าหลักของ cPanel คลิกเปิด <strong>phpMyAdmin</strong></p>
      <p>2. คลิกเลือกชื่อฐานข้อมูลของคุณที่แถบเมนูด้านซ้าย</p>
      <p>3. คลิกแท็บ <strong>Import (นำเข้า)</strong> ด้านบน</p>
      <p>4. กด Choose File แล้วเลือกไฟล์ <code>database/01_mhs1_schema_mysql.sql</code> จากในเครื่องของคุณ แล้วกด <strong>Import (หรือ Go)</strong> ด้านล่าง</p>
    </div>

    <div class="step-box">
      <div class="step-title"><span class="step-num">4</span> ตั้งค่ารหัสผ่านฐานข้อมูลใน api/config.php</div>
      <p>1. ใน File Manager บน cPanel เข้าไปที่โฟลเดอร์ <code>public_html/api/</code></p>
      <p>2. คลิกขวาที่ไฟล์ <code>config.php</code> แล้วเลือก <strong>Edit</strong></p>
      <p>3. กรอกชื่อฐานข้อมูล, ชื่อผู้ใช้, และรหัสผ่าน MySQL ที่สร้างไว้ในข้อ 2:</p>
      <pre>
define('DB_HOST', 'localhost');
define('DB_NAME', 'ชื่อ_cpanel_mhs1db');  // เปลี่ยนเป็นของคุณ
define('DB_USER', 'ชื่อ_cpanel_dbuser');  // เปลี่ยนเป็นของคุณ
define('DB_PASS', 'รหัสผ่านของคุณ');      // เปลี่ยนเป็นของคุณ
define('API_SECRET', 'mhs1_bigdata_secret_2026');
      </pre>
      <p>4. กด <strong>Save Changes</strong></p>
    </div>

    <div class="success-box">
      <strong>🎉 เสร็จสมบูรณ์!</strong> เปิดเบราว์เซอร์ไปที่ <code>https://โดเมนของคุณ.com/api/test.php</code> เพื่อตรวจสอบสถานะ หากขึ้นสีเขียวว่าเชื่อมต่อสำเร็จ เว็บไซต์ของคุณก็พร้อมใช้งานได้อย่างสมบูรณ์แบบ 100%
    </div>
  </div>
</body>
</html>`;
  zip.file('คู่มือการติดตั้ง_บน_HOSTATOM.html', manualHtml);

  // 6. Text Readme
  const readmeText = `================================================================================
MHS1 BIGDATA - HOSTATOM DEPLOYMENT PACKAGE
สพป.แม่ฮ่องสอน เขต 1
================================================================================

ชุดไฟล์นี้เป็น "ชุดที่ 2" สำหรับนำไปติดตั้งบนโฮสติ้ง Hostatom (cPanel / DirectAdmin)
โดยระบบเดิมบน Cloud AI Studio ยังคงทำงานได้ตามปกติ 100%

ขั้นตอนการติดตั้งอย่างย่อ:
1. นำไฟล์ทั้งหมดในชุดนี้ไปวางไว้ในโฟลเดอร์ public_html บน Hostatom
2. สร้างฐานข้อมูล MySQL และ Database User ใน cPanel พร้อมให้สิทธิ์ ALL PRIVILEGES
3. เปิด phpMyAdmin แล้ว Import ไฟล์ในโฟลเดอร์ database/01_mhs1_schema_mysql.sql
4. แก้ไขชื่อฐานข้อมูลและรหัสผ่านในไฟล์ api/config.php
5. ทดสอบเปิดเว็บไซต์ของคุณหรือเปิด https://yourdomain.com/api/test.php

ดูคู่มือฉบับเต็มพร้อมภาพประกอบได้ที่ไฟล์: คู่มือการติดตั้ง_บน_HOSTATOM.html
`;
  zip.file('README_HOSTATOM.txt', readmeText);

  // 7. บันทึกไฟล์ ZIP ลงโฟลเดอร์ public/downloads/
  const downloadsDir = path.join(__dirname, '..', 'public', 'downloads');
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  const zipPath = path.join(downloadsDir, 'mhs1_bigdata_hostatom_deploy_pack.zip');
  fs.writeFileSync(zipPath, zipBuffer);

  // บันทึกไฟล์แยกสำหรับดาวน์โหลดเดี่ยวๆ ด้วย
  fs.writeFileSync(path.join(downloadsDir, '01_mhs1_schema_mysql.sql'), mysqlSchemaSql);
  fs.writeFileSync(path.join(downloadsDir, '02_sync_supabase_to_hostatom.sql'), syncSql);
  fs.writeFileSync(path.join(downloadsDir, 'mhs1_db.php'), mhs1DbPhp);
  fs.writeFileSync(path.join(downloadsDir, 'config.php'), configPhp);
  fs.writeFileSync(path.join(downloadsDir, '.htaccess'), htaccessContent);
  fs.writeFileSync(path.join(downloadsDir, 'คู่มือการติดตั้ง_บน_HOSTATOM.html'), manualHtml);

  const sizeMb = (zipBuffer.length / (1024 * 1024)).toFixed(2);
  console.log(`✅ สร้างไฟล์สำเร็จสมบูรณ์!`);
  console.log(`📁 ตำแหน่งไฟล์: ${zipPath} (${sizeMb} MB)`);
  console.log(`🌐 เข้าถึงได้ผ่าน URL: /downloads/mhs1_bigdata_hostatom_deploy_pack.zip`);
}

buildPackage().catch(err => {
  console.error('❌ เกิดข้อผิดพลาด:', err);
  process.exit(1);
});
