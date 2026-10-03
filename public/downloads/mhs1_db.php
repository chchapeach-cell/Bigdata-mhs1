<?php
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
        $stmt = $pdo->query("SELECT * FROM `schools` ORDER BY `id` ASC");
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

        $sql = "INSERT INTO `schools` (
            `id`, `name`, `district`, `amphoe`, `network_group`, `internet_type`, 
            `electricity`, `water_system`, `water_system_detail`, `solar_kw`, 
            `has_solar_battery`, `solar_battery_capacity`, `staff_count`, 
            `contract_teachers_count`, `admin_staff_count`, `janitor_count`, `other_staff_count`,
            `major_subjects`, `major_subjects_with_staff`, `classrooms`, 
            `director_name`, `director_phone`, `vice_director_name`, `vice_director_phone`, `vice_directors`,
            `school_phone`, `email`, `facebook`, `line`, `website`, `address`, 
            `image_url`, `logo_url`, `director_image_url`, `latitude`, `longitude`, 
            `size`, `is_expansion`, `special_highlights`, `updated_by`
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
            `name` = VALUES(`name`),
            `amphoe` = VALUES(`amphoe`),
            `network_group` = VALUES(`network_group`),
            `internet_type` = VALUES(`internet_type`),
            `electricity` = VALUES(`electricity`),
            `water_system` = VALUES(`water_system`),
            `water_system_detail` = VALUES(`water_system_detail`),
            `solar_kw` = VALUES(`solar_kw`),
            `has_solar_battery` = VALUES(`has_solar_battery`),
            `solar_battery_capacity` = VALUES(`solar_battery_capacity`),
            `staff_count` = VALUES(`staff_count`),
            `contract_teachers_count` = VALUES(`contract_teachers_count`),
            `admin_staff_count` = VALUES(`admin_staff_count`),
            `janitor_count` = VALUES(`janitor_count`),
            `other_staff_count` = VALUES(`other_staff_count`),
            `major_subjects` = VALUES(`major_subjects`),
            `major_subjects_with_staff` = VALUES(`major_subjects_with_staff`),
            `classrooms` = VALUES(`classrooms`),
            `director_name` = VALUES(`director_name`),
            `director_phone` = VALUES(`director_phone`),
            `vice_director_name` = VALUES(`vice_director_name`),
            `vice_director_phone` = VALUES(`vice_director_phone`),
            `vice_directors` = VALUES(`vice_directors`),
            `school_phone` = VALUES(`school_phone`),
            `email` = VALUES(`email`),
            `facebook` = VALUES(`facebook`),
            `line` = VALUES(`line`),
            `website` = VALUES(`website`),
            `address` = VALUES(`address`),
            `image_url` = VALUES(`image_url`),
            `logo_url` = VALUES(`logo_url`),
            `director_image_url` = VALUES(`director_image_url`),
            `latitude` = VALUES(`latitude`),
            `longitude` = VALUES(`longitude`),
            `size` = VALUES(`size`),
            `is_expansion` = VALUES(`is_expansion`),
            `special_highlights` = VALUES(`special_highlights`),
            `updated_by` = VALUES(`updated_by`),
            `updated_at` = NOW()";

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
        $stmt = $pdo->query("SELECT * FROM `students`");
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

        $sql = "INSERT INTO `students` (
            `id`, `school_id`, `school_name`, `academic_year`, 
            `grades`, `total_male`, `total_female`, `total_students`
        ) VALUES (
            :id, :school_id, :school_name, :academic_year, 
            :grades, :total_male, :total_female, :total_students
        ) ON DUPLICATE KEY UPDATE 
            `school_name` = VALUES(`school_name`),
            `grades` = VALUES(`grades`),
            `total_male` = VALUES(`total_male`),
            `total_female` = VALUES(`total_female`),
            `total_students` = VALUES(`total_students`),
            `updated_at` = NOW()";

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
        $stmt = $pdo->query("SELECT * FROM `students_g`");
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

        $sql = "INSERT INTO `students_g` (
            `id`, `school_id`, `school_name`, `academic_year`, 
            `total_g_students`, `male_g_count`, `female_g_count`, `notes`
        ) VALUES (
            :id, :school_id, :school_name, :academic_year, 
            :total_g_students, :male_g_count, :female_g_count, :notes
        ) ON DUPLICATE KEY UPDATE 
            `total_g_students` = VALUES(`total_g_students`),
            `male_g_count` = VALUES(`male_g_count`),
            `female_g_count` = VALUES(`female_g_count`),
            `notes` = VALUES(`notes`),
            `updated_at` = NOW()";

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
        $sql = "SELECT * FROM `nt_assessments`" . ($year ? " WHERE `academic_year` = :year" : "") . " ORDER BY `order_num` ASC";
        $stmt = $pdo->prepare($sql);
        if ($year) $stmt->execute([':year' => $year]);
        else $stmt->execute();
        echo json_encode(['status' => 'ok', 'data' => $stmt->fetchAll()]);
        break;

    case 'get_rt_assessments':
        $year = $_REQUEST['year'] ?? '';
        $sql = "SELECT * FROM `rt_assessments`" . ($year ? " WHERE `academic_year` = :year" : "") . " ORDER BY `order_num` ASC";
        $stmt = $pdo->prepare($sql);
        if ($year) $stmt->execute([':year' => $year]);
        else $stmt->execute();
        echo json_encode(['status' => 'ok', 'data' => $stmt->fetchAll()]);
        break;

    // -------------------------------------------------------------
    // 5. USERS & SETTINGS
    // -------------------------------------------------------------
    case 'get_users':
        $stmt = $pdo->query("SELECT * FROM `users` ORDER BY `created_at` DESC");
        echo json_encode(['status' => 'ok', 'data' => $stmt->fetchAll()]);
        break;

    case 'get_settings':
        $stmt = $pdo->query("SELECT `config` FROM `settings` WHERE `id` = 'system_config' LIMIT 1");
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
?>