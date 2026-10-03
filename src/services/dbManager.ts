import { School, DatabaseConfig, DatabaseSourceType } from '../types';
import { parseInitialData } from '../utils/initialData';

const STORAGE_KEY = 'mhs1_db_config';

export function getDefaultDatabaseConfig(): DatabaseConfig {
  return {
    primarySource: 'local',
    hostatom: {
      apiUrl: '',
      apiKey: '',
      databaseName: 'mhs1_bigdata',
      tableName: 'schools',
      isConnected: false,
      lastSynced: undefined,
    },
    firebase: {
      projectId: 'ai-studio-mhs1bigdata-b097cba8-6fe0-43e2-ad20-e20681250b82',
      isConnected: true,
    },
  };
}

export function getDatabaseConfig(): DatabaseConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...getDefaultDatabaseConfig(),
        ...parsed,
        hostatom: {
          ...getDefaultDatabaseConfig().hostatom,
          ...(parsed.hostatom || {}),
        },
        firebase: {
          ...getDefaultDatabaseConfig().firebase,
          ...(parsed.firebase || {}),
        },
      };
    }
  } catch (e) {
    console.error('Failed to read db config', e);
  }
  return getDefaultDatabaseConfig();
}

export function saveDatabaseConfig(config: DatabaseConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save db config', e);
  }
}

/**
 * Tests connection to Hostatom API endpoint
 */
export async function testHostatomConnection(apiUrl: string, apiKey?: string): Promise<{ success: boolean; message: string; recordCount?: number }> {
  if (!apiUrl || !apiUrl.startsWith('http')) {
    return { success: false, message: 'กรุณาระบุ URL ของ Hostatom API ให้ถูกต้อง (ขึ้นต้นด้วย https:// หรือ http://)' };
  }

  try {
    const url = apiUrl.includes('?') ? `${apiUrl}&action=ping` : `${apiUrl}?action=ping`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...(apiKey ? { 'X-API-KEY': apiKey } : {}),
      },
    });

    if (!res.ok) {
      return { success: false, message: `เซิร์ฟเวอร์ Hostatom ตอบกลับด้วยรหัสข้อผิดพลาด HTTP ${res.status}` };
    }

    const data = await res.json();
    return {
      success: true,
      message: 'เชื่อมต่อไปยังเซิร์ฟเวอร์ Hostatom สำเร็จ!',
      recordCount: data.total || data.count || (Array.isArray(data) ? data.length : undefined),
    };
  } catch (err: any) {
    return {
      success: false,
      message: `ไม่สามารถเชื่อมต่อได้: ${err.message || 'โปรดตรวจสอบการเปิด CORS และการตั้งค่าไฟล์ PHP บน Hostatom'}`,
    };
  }
}

/**
 * Generates ready-to-import MySQL SQL script for Hostatom phpMyAdmin
 */
export function generateHostatomMySQLScript(schools: School[]): string {
  const header = `-- ============================================================
-- สำนักงานเขตพื้นที่การศึกษาประถมศึกษาแม่ฮ่องสอน เขต 1 (สพป.มส.1)
-- สคริปต์โครงสร้างและข้อมูลนำเข้า MySQL สำหรับ Hostatom / DirectAdmin / cPanel
-- สร้างเมื่อ: ${new Date().toLocaleString('th-TH')}
-- จำนวนสถานศึกษา: ${schools.length} แห่ง
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. สร้างตาราง schools สำหรับจัดเก็บสถานศึกษา
CREATE TABLE IF NOT EXISTS \`schools\` (
  \`id\` VARCHAR(20) NOT NULL PRIMARY KEY COMMENT 'รหัสสถานศึกษา 8 หลัก',
  \`name\` VARCHAR(255) NOT NULL COMMENT 'ชื่อสถานศึกษา / สาขา',
  \`district\` VARCHAR(255) DEFAULT 'สพป.แม่ฮ่องสอน เขต 1' COMMENT 'เขตพื้นที่การศึกษา',
  \`amphoe\` VARCHAR(100) NOT NULL COMMENT 'อำเภอ',
  \`network_group\` VARCHAR(255) DEFAULT '' COMMENT 'กลุ่มเครือข่ายโรงเรียน',
  \`internet_type\` VARCHAR(100) DEFAULT NULL COMMENT 'ประเภทอินเทอร์เน็ต (fiber, satellite, etc.)',
  \`electricity\` VARCHAR(50) DEFAULT NULL COMMENT 'สถานะไฟฟ้า (normal, solar, none)',
  \`water_system\` VARCHAR(100) DEFAULT NULL COMMENT 'ระบบน้ำประปา (government, mountain, etc.)',
  \`water_system_detail\` TEXT DEFAULT NULL COMMENT 'รายละเอียดระบบน้ำ',
  \`solar_kw\` DECIMAL(10,2) DEFAULT NULL COMMENT 'กำลังผลิตโซลาร์เซลล์ (kW)',
  \`has_solar_battery\` TINYINT(1) DEFAULT 0 COMMENT 'มีแบตเตอรี่สำรองหรือไม่ (1=มี, 0=ไม่มี)',
  \`staff_count\` INT DEFAULT 0 COMMENT 'จำนวนครูและบุคลากร',
  \`other_staff_count\` INT DEFAULT 0 COMMENT 'จำนวนบุคลากรอื่น',
  \`major_subjects\` TEXT DEFAULT NULL COMMENT 'วิชาเอกที่เปิดสอน (JSON หรือ Comma-separated)',
  \`director_phone\` VARCHAR(50) DEFAULT NULL COMMENT 'เบอร์โทรผู้บริหาร',
  \`school_phone\` VARCHAR(50) DEFAULT NULL COMMENT 'เบอร์โทรสถานศึกษา',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. สร้างตาราง users สำหรับจัดเก็บผู้ใช้งานและคำขอสิทธิ์
CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` VARCHAR(50) NOT NULL PRIMARY KEY,
  \`email\` VARCHAR(255) NOT NULL UNIQUE,
  \`name\` VARCHAR(255) NOT NULL,
  \`phone\` VARCHAR(50) DEFAULT NULL,
  \`position\` VARCHAR(100) DEFAULT NULL,
  \`role\` ENUM('super_admin', 'school_admin', 'teacher', 'viewer') DEFAULT 'teacher',
  \`school_id\` VARCHAR(20) NOT NULL,
  \`school_name\` VARCHAR(255) NOT NULL,
  \`status\` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. นำเข้าข้อมูลสถานศึกษาทั้ง 131 แห่ง (พร้อมตรวจสอบ 58010045 และ 58010021)
`;

  const escapeStr = (val: any) => {
    if (val === null || val === undefined) return 'NULL';
    const s = String(val).replace(/'/g, "''").replace(/\\/g, '\\\\');
    return `'${s}'`;
  };

  const insertStatements = schools.map((s) => {
    const electricVal = s.electricity === true || s.electricity === 'has_electric' || s.electricity === 'normal'
      ? 'normal'
      : s.electricity === 'solar' || (s.solar_kw && Number(s.solar_kw) > 0)
      ? 'solar'
      : 'none';

    const solarKwVal = s.solar_kw ? Number(s.solar_kw) : 'NULL';
    const hasBatteryVal = s.has_solar_battery ? 1 : 0;
    const majorSubjectsJson = JSON.stringify(s.major_subjects || []);

    return `INSERT INTO \`schools\` (\`id\`, \`name\`, \`district\`, \`amphoe\`, \`network_group\`, \`internet_type\`, \`electricity\`, \`water_system\`, \`water_system_detail\`, \`solar_kw\`, \`has_solar_battery\`, \`staff_count\`, \`other_staff_count\`, \`major_subjects\`, \`director_phone\`, \`school_phone\`) VALUES (${escapeStr(s.id)}, ${escapeStr(s.name)}, ${escapeStr(s.district)}, ${escapeStr(s.amphoe)}, ${escapeStr(s.network_group)}, ${escapeStr(s.internet_type)}, ${escapeStr(electricVal)}, ${escapeStr(s.water_system)}, ${escapeStr(s.water_system_detail)}, ${solarKwVal}, ${hasBatteryVal}, ${s.staff_count || 0}, ${s.other_staff_count || 0}, ${escapeStr(majorSubjectsJson)}, ${escapeStr(s.director_phone)}, ${escapeStr(s.school_phone)}) ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`), \`network_group\`=VALUES(\`network_group\`), \`staff_count\`=VALUES(\`staff_count\`), \`updated_at\`=NOW();`;
  }).join('\n');

  return header + insertStatements + '\n\nSET FOREIGN_KEY_CHECKS = 1;\n-- เสร็จสิ้นการสร้างฐานข้อมูล Hostatom';
}

/**
 * Generates sample PHP API file for uploading to Hostatom web hosting (public_html/api.php)
 */
export function generateHostatomPhpApiScript(): string {
  return `<?php
/**
 * ============================================================
 * สพป.แม่ฮ่องสอน เขต 1 (MHS1 Big Data) - Hostatom API Connector
 * นำไฟล์นี้ไปวางในโฮสติ้ง Hostatom ที่โฟลเดอร์ public_html/ หรือ sub-folder
 * เช่น https://your-domain.com/api.php
 * ============================================================
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-KEY');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 1. ตั้งค่าการเชื่อมต่อฐานข้อมูล MySQL บน Hostatom (Plesk)
$db_host = 'localhost';          // ปกติบน Hostatom Plesk คือ localhost
$db_name = 'mhs1_bigdata';       // ชื่อฐานข้อมูลที่คุณสร้าง (เช่น mhs1_bigdata)
$db_user = 'mhs1_admin';         // ชื่อผู้ใช้ฐานข้อมูล (เช่น mhs1_admin)
$db_pass = 'ใส่รหัสผ่านที่คุณกด_Generate'; // รหัสผ่านฐานข้อมูลที่กดคัดลอกมา

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'ไม่สามารถเชื่อมต่อฐานข้อมูล MySQL บน Hostatom: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$action = $_GET['action'] ?? 'get_schools';

// 2. ตรวจสอบการเชื่อมต่อ (Ping)
if ($action === 'ping') {
    $stmt = $pdo->query("SELECT COUNT(*) AS total FROM schools");
    $row = $stmt->fetch();
    echo json_encode([
        'status' => 'success',
        'message' => 'เชื่อมต่อฐานข้อมูล Hostatom MySQL สำเร็จสมบูรณ์',
        'total' => (int)$row['total'],
        'server_time' => date('Y-m-d H:i:s'),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// 3. ดึงข้อมูลสถานศึกษาทั้งหมด (Get Schools)
if ($action === 'get_schools') {
    $stmt = $pdo->query("SELECT * FROM schools ORDER BY id ASC");
    $schools = $stmt->fetchAll();
    
    // แปลงข้อมูลให้อยู่ในฟอร์แมต JSON ที่ระบบรองรับ
    foreach ($schools as &$s) {
        $s['staff_count'] = (int)$s['staff_count'];
        $s['other_staff_count'] = (int)$s['other_staff_count'];
        $s['solar_kw'] = $s['solar_kw'] ? (float)$s['solar_kw'] : null;
        $s['has_solar_battery'] = (bool)$s['has_solar_battery'];
        if (!empty($s['major_subjects'])) {
            $decoded = json_decode($s['major_subjects'], true);
            $s['major_subjects'] = is_array($decoded) ? $decoded : [];
        } else {
            $s['major_subjects'] = [];
        }
    }
    
    echo json_encode([
        'status' => 'success',
        'count' => count($schools),
        'data' => $schools,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// 4. บันทึก/อัปเดตข้อมูลสถานศึกษา (Save School)
if ($action === 'save_school' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || empty($input['id'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'ข้อมูลไม่ถูกต้อง'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $sql = "INSERT INTO schools (id, name, district, amphoe, network_group, internet_type, electricity, water_system, water_system_detail, solar_kw, has_solar_battery, staff_count, school_phone, director_phone) 
            VALUES (:id, :name, :district, :amphoe, :network_group, :internet_type, :electricity, :water_system, :water_system_detail, :solar_kw, :has_solar_battery, :staff_count, :school_phone, :director_phone)
            ON DUPLICATE KEY UPDATE 
            name = VALUES(name),
            network_group = VALUES(network_group),
            internet_type = VALUES(internet_type),
            electricity = VALUES(electricity),
            water_system = VALUES(water_system),
            staff_count = VALUES(staff_count),
            updated_at = NOW()";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':id' => $input['id'],
        ':name' => $input['name'],
        ':district' => $input['district'] ?? 'สพป.แม่ฮ่องสอน เขต 1',
        ':amphoe' => $input['amphoe'] ?? '',
        ':network_group' => $input['network_group'] ?? '',
        ':internet_type' => $input['internet_type'] ?? null,
        ':electricity' => $input['electricity'] ?? null,
        ':water_system' => $input['water_system'] ?? null,
        ':water_system_detail' => $input['water_system_detail'] ?? null,
        ':solar_kw' => $input['solar_kw'] ?? null,
        ':has_solar_battery' => !empty($input['has_solar_battery']) ? 1 : 0,
        ':staff_count' => (int)($input['staff_count'] ?? 0),
        ':school_phone' => $input['school_phone'] ?? null,
        ':director_phone' => $input['director_phone'] ?? null,
    ]);

    echo json_encode(['status' => 'success', 'message' => 'บันทึกข้อมูลเรียบร้อย'], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(404);
echo json_encode(['status' => 'error', 'message' => 'ไม่พบคำสั่งที่ระบุ'], JSON_UNESCAPED_UNICODE);
?>`;
}
