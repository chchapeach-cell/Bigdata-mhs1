import { School, StudentData, StudentGData, UserProfile, SystemConfig, AcademicRecord } from '../types';

export interface HostatomConfig {
  enabled: boolean;
  apiUrl: string;
  apiKey: string;
  primaryDb: 'hostatom' | 'supabase' | 'firestore';
  autoBackupToSupabase: boolean;
  lastTestedAt?: string;
  lastTestStatus?: 'success' | 'failed' | 'idle';
}

export const DEFAULT_HOSTATOM_CONFIG: HostatomConfig = {
  enabled: false,
  apiUrl: '',
  apiKey: 'mhs1_bigdata_secret_2026',
  primaryDb: 'supabase', // ค่าเริ่มต้นคือ Supabase (หรือสลับเป็น Hostatom เมื่อตั้งค่าพร้อม)
  autoBackupToSupabase: true
};

const STORAGE_KEY = 'mhs1_hostatom_config';

export function getHostatomConfig(): HostatomConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_HOSTATOM_CONFIG;
    return { ...DEFAULT_HOSTATOM_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_HOSTATOM_CONFIG;
  }
}

export function saveHostatomConfig(config: Partial<HostatomConfig>): HostatomConfig {
  try {
    const current = getHostatomConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save Hostatom config to localStorage:', e);
    return DEFAULT_HOSTATOM_CONFIG;
  }
}

export function isHostatomConfigured(): boolean {
  const config = getHostatomConfig();
  return Boolean(config.enabled && config.apiUrl && config.apiUrl.startsWith('http'));
}

/**
 * ทดสอบการเชื่อมต่อ API ของ Hostatom (Ping Test)
 */
export async function testHostatomConnection(apiUrl: string, apiKey: string): Promise<{ success: boolean; message: string; latencyMs: number }> {
  const startTime = Date.now();
  let cleanUrl = apiUrl.trim();
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = 'https://' + cleanUrl;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 วินาที timeout

    const testUrl = new URL(cleanUrl);
    testUrl.searchParams.set('action', 'ping');
    testUrl.searchParams.set('key', apiKey.trim());

    const response = await fetch(testUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Api-Key': apiKey.trim()
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      return {
        success: false,
        message: `เซิร์ฟเวอร์ Hostatom ตอบกลับด้วยสถานะ HTTP ${response.status} (${response.statusText})`,
        latencyMs
      };
    }

    const data = await response.json();
    if (data.status === 'ok' || data.success) {
      return {
        success: true,
        message: data.message || `เชื่อมต่อ Hostatom Database สำเร็จ! (MySQL เวอร์ชั่น: ${data.mysql_version || 'พร้อมใช้งาน'})`,
        latencyMs
      };
    } else {
      return {
        success: false,
        message: data.error || data.message || 'API ตอบกลับไม่สำเร็จ แต่เชื่อมต่อเซิร์ฟเวอร์ได้',
        latencyMs
      };
    }
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    if (err.name === 'AbortError') {
      return {
        success: false,
        message: 'หมดเวลาเชื่อมต่อ (Connection Timeout) เซิร์ฟเวอร์ไม่ตอบกลับภายใน 12 วินาที',
        latencyMs
      };
    }
    return {
      success: false,
      message: `ไม่สามารถเชื่อมต่อได้: ${err.message || 'CORS Error หรือไม่พบไฟล์ API บนโฮสต์'}`,
      latencyMs
    };
  }
}

/**
 * ดาวน์โหลดข้อมูลเป็นไฟล์ text/sql/json
 */
export function downloadAsFile(filename: string, content: string, mimeType: string = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// 1. MySQL / MariaDB Schema สำหรับ Hostatom phpMyAdmin
// ============================================================================
export const HOSTATOM_MYSQL_SCHEMA_SQL = `-- ============================================================================
-- ฐานข้อมูล MHS1 BIGDATA (สพป.แม่ฮ่องสอน เขต 1)
-- สคริปต์โครงสร้างตารางสำหรับ Hostatom (MySQL 5.7+ / 8.0+ / MariaDB 10.3+)
-- รองรับการ Import ผ่าน phpMyAdmin ใน cPanel / DirectAdmin
-- Charset: utf8mb4 / Collation: utf8mb4_unicode_ci
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+07:00";

-- -------------------------------------------------------------
-- 1. ตารางข้อมูลสถานศึกษา (schools)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`schools\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`name\` VARCHAR(255) NOT NULL,
  \`district\` VARCHAR(255) NOT NULL DEFAULT 'สพป.แม่ฮ่องสอน เขต 1',
  \`amphoe\` VARCHAR(128) DEFAULT NULL,
  \`network_group\` VARCHAR(128) DEFAULT NULL,
  \`internet_type\` VARCHAR(64) DEFAULT 'fiber',
  \`electricity\` JSON DEFAULT NULL,
  \`water_system\` VARCHAR(64) DEFAULT 'government',
  \`water_system_detail\` TEXT DEFAULT NULL,
  \`solar_kw\` VARCHAR(64) DEFAULT NULL,
  \`has_solar_battery\` TINYINT(1) DEFAULT 0,
  \`solar_battery_capacity\` VARCHAR(128) DEFAULT NULL,
  \`staff_count\` INT(11) DEFAULT 0,
  \`contract_teachers_count\` INT(11) DEFAULT 0,
  \`admin_staff_count\` INT(11) DEFAULT 0,
  \`janitor_count\` INT(11) DEFAULT 0,
  \`other_staff_count\` INT(11) DEFAULT 0,
  \`major_subjects\` JSON DEFAULT NULL,
  \`major_subjects_with_staff\` JSON DEFAULT NULL,
  \`classrooms\` JSON DEFAULT NULL,
  \`director_name\` VARCHAR(255) DEFAULT NULL,
  \`director_phone\` VARCHAR(64) DEFAULT NULL,
  \`vice_director_name\` VARCHAR(255) DEFAULT NULL,
  \`vice_director_phone\` VARCHAR(64) DEFAULT NULL,
  \`vice_directors\` JSON DEFAULT NULL,
  \`school_phone\` VARCHAR(64) DEFAULT NULL,
  \`email\` VARCHAR(128) DEFAULT NULL,
  \`facebook\` VARCHAR(255) DEFAULT NULL,
  \`line\` VARCHAR(128) DEFAULT NULL,
  \`website\` VARCHAR(255) DEFAULT NULL,
  \`address\` TEXT DEFAULT NULL,
  \`image_url\` TEXT DEFAULT NULL,
  \`logo_url\` TEXT DEFAULT NULL,
  \`director_image_url\` TEXT DEFAULT NULL,
  \`latitude\` DOUBLE DEFAULT 0,
  \`longitude\` DOUBLE DEFAULT 0,
  \`size\` VARCHAR(32) DEFAULT 'small',
  \`is_expansion\` TINYINT(1) DEFAULT 0,
  \`special_highlights\` TEXT DEFAULT NULL,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`updated_by\` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_amphoe\` (\`amphoe\`),
  KEY \`idx_network_group\` (\`network_group\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 2. ตารางสถิตินักเรียน Big Data (students)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`students\` (
  \`id\` VARCHAR(128) NOT NULL,
  \`school_id\` VARCHAR(64) NOT NULL,
  \`school_name\` VARCHAR(255) NOT NULL,
  \`academic_year\` VARCHAR(16) NOT NULL,
  \`grades\` JSON NOT NULL,
  \`total_male\` INT(11) DEFAULT 0,
  \`total_female\` INT(11) DEFAULT 0,
  \`total_students\` INT(11) DEFAULT 0,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_school_year\` (\`school_id\`, \`academic_year\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 3. ตารางข้อมูลนักเรียนตัว G (students_g)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`students_g\` (
  \`id\` VARCHAR(128) NOT NULL,
  \`school_id\` VARCHAR(64) NOT NULL,
  \`school_name\` VARCHAR(255) NOT NULL,
  \`academic_year\` VARCHAR(16) NOT NULL,
  \`total_g_students\` INT(11) DEFAULT 0,
  \`male_g_count\` INT(11) DEFAULT 0,
  \`female_g_count\` INT(11) DEFAULT 0,
  \`notes\` TEXT DEFAULT NULL,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_g_school_year\` (\`school_id\`, \`academic_year\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 4. ตารางทะเบียนผู้ใช้งาน (users)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`users\` (
  \`uid\` VARCHAR(128) NOT NULL,
  \`email\` VARCHAR(255) NOT NULL,
  \`first_name\` VARCHAR(128) DEFAULT NULL,
  \`last_name\` VARCHAR(128) DEFAULT NULL,
  \`school_id\` VARCHAR(64) DEFAULT NULL,
  \`school_name\` VARCHAR(255) DEFAULT NULL,
  \`role\` VARCHAR(64) DEFAULT 'school_admin',
  \`status\` VARCHAR(64) DEFAULT 'pending',
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`uid\`),
  KEY \`idx_email\` (\`email\`),
  KEY \`idx_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 5. ตารางตั้งค่าระบบ (settings)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`settings\` (
  \`id\` VARCHAR(64) NOT NULL DEFAULT 'system_config',
  \`config\` JSON NOT NULL,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 6. ตารางสถิติผู้เข้าชมเว็บไซต์ (system_stats)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`system_stats\` (
  \`id\` VARCHAR(64) NOT NULL DEFAULT 'visitor_count',
  \`total_visits\` INT(11) DEFAULT 0,
  \`today_visits\` INT(11) DEFAULT 0,
  \`today_date\` VARCHAR(32) DEFAULT NULL,
  \`daily_visits\` JSON DEFAULT NULL,
  \`monthly_visits\` JSON DEFAULT NULL,
  \`yearly_visits\` JSON DEFAULT NULL,
  \`hourly_visits\` JSON DEFAULT NULL,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 7. ตารางประวัติดาวน์โหลดข้อมูล (download_logs)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`download_logs\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`name\` VARCHAR(255) NOT NULL,
  \`email\` VARCHAR(255) NOT NULL,
  \`school_id\` VARCHAR(64) NOT NULL,
  \`school_name\` VARCHAR(255) NOT NULL,
  \`purpose\` TEXT NOT NULL,
  \`timestamp\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_log_timestamp\` (\`timestamp\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 8. ตารางบันทึกกิจกรรมการใช้งาน (user_activity_logs)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`user_activity_logs\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`user_id\` VARCHAR(128) DEFAULT NULL,
  \`user_name\` VARCHAR(255) NOT NULL,
  \`user_email\` VARCHAR(255) NOT NULL,
  \`user_role\` VARCHAR(64) DEFAULT 'school_admin',
  \`school_id\` VARCHAR(64) DEFAULT NULL,
  \`school_name\` VARCHAR(255) DEFAULT NULL,
  \`action_type\` VARCHAR(64) NOT NULL,
  \`action_title\` VARCHAR(255) NOT NULL,
  \`details\` TEXT DEFAULT NULL,
  \`target_name\` VARCHAR(255) DEFAULT NULL,
  \`timestamp\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_act_timestamp\` (\`timestamp\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 9. ตารางผลการประเมิน NT ชั้น ป.3 (nt_assessments)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`nt_assessments\` (
  \`id\` VARCHAR(128) NOT NULL,
  \`order_num\` INT(11) DEFAULT 0,
  \`school_id\` VARCHAR(64) NOT NULL,
  \`school_name\` VARCHAR(255) NOT NULL,
  \`amphoe\` VARCHAR(128) DEFAULT NULL,
  \`math_score\` DOUBLE DEFAULT 0,
  \`math_percentage\` DOUBLE DEFAULT 0,
  \`thai_score\` DOUBLE DEFAULT 0,
  \`thai_percentage\` DOUBLE DEFAULT 0,
  \`total_score\` DOUBLE DEFAULT 0,
  \`total_percentage\` DOUBLE DEFAULT 0,
  \`math_quality\` VARCHAR(64) DEFAULT 'พอใช้',
  \`thai_quality\` VARCHAR(64) DEFAULT 'พอใช้',
  \`total_quality\` VARCHAR(64) DEFAULT 'พอใช้',
  \`academic_year\` VARCHAR(16) NOT NULL DEFAULT '2567',
  \`test_type\` VARCHAR(32) NOT NULL DEFAULT 'NT',
  \`test_title\` VARCHAR(255) DEFAULT 'การประเมินคุณภาพผู้เรียน (NT) ชั้นประถมศึกษาปีที่ 3',
  \`notes\` TEXT DEFAULT NULL,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`updated_by\` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_nt_year\` (\`academic_year\`),
  KEY \`idx_nt_school\` (\`school_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 10. ตารางผลการประเมิน RT ชั้น ป.1 (rt_assessments)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`rt_assessments\` (
  \`id\` VARCHAR(128) NOT NULL,
  \`order_num\` INT(11) DEFAULT 0,
  \`school_id\` VARCHAR(64) NOT NULL,
  \`school_name\` VARCHAR(255) NOT NULL,
  \`amphoe\` VARCHAR(128) DEFAULT NULL,
  \`reading_aloud_score\` DOUBLE DEFAULT 0,
  \`reading_aloud_percentage\` DOUBLE DEFAULT 0,
  \`reading_comprehension_score\` DOUBLE DEFAULT 0,
  \`reading_comprehension_percentage\` DOUBLE DEFAULT 0,
  \`math_score\` DOUBLE DEFAULT 0,
  \`math_percentage\` DOUBLE DEFAULT 0,
  \`thai_score\` DOUBLE DEFAULT 0,
  \`thai_percentage\` DOUBLE DEFAULT 0,
  \`total_score\` DOUBLE DEFAULT 0,
  \`total_percentage\` DOUBLE DEFAULT 0,
  \`reading_aloud_quality\` VARCHAR(64) DEFAULT 'พอใช้',
  \`reading_comprehension_quality\` VARCHAR(64) DEFAULT 'พอใช้',
  \`math_quality\` VARCHAR(64) DEFAULT 'พอใช้',
  \`thai_quality\` VARCHAR(64) DEFAULT 'พอใช้',
  \`total_quality\` VARCHAR(64) DEFAULT 'พอใช้',
  \`academic_year\` VARCHAR(16) NOT NULL DEFAULT '2567',
  \`test_type\` VARCHAR(32) NOT NULL DEFAULT 'RT',
  \`test_title\` VARCHAR(255) DEFAULT 'การประเมินความสามารถด้านการอ่านของผู้เรียน (RT) ชั้นประถมศึกษาปีที่ 1',
  \`notes\` TEXT DEFAULT NULL,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`updated_by\` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_rt_year\` (\`academic_year\`),
  KEY \`idx_rt_school\` (\`school_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 11. ตารางผลสัมฤทธิ์ทางการศึกษา (academic_records) - ตารางรวมเพื่อความเข้ากันได้
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`academic_records\` (
  \`id\` VARCHAR(128) NOT NULL,
  \`order_num\` INT(11) DEFAULT 0,
  \`school_id\` VARCHAR(64) NOT NULL,
  \`school_name\` VARCHAR(255) NOT NULL,
  \`amphoe\` VARCHAR(128) DEFAULT NULL,
  \`math_score\` DOUBLE DEFAULT 0,
  \`math_percentage\` DOUBLE DEFAULT 0,
  \`thai_score\` DOUBLE DEFAULT 0,
  \`thai_percentage\` DOUBLE DEFAULT 0,
  \`total_score\` DOUBLE DEFAULT 0,
  \`total_percentage\` DOUBLE DEFAULT 0,
  \`math_quality\` VARCHAR(64) DEFAULT 'ดี',
  \`thai_quality\` VARCHAR(64) DEFAULT 'ดี',
  \`total_quality\` VARCHAR(64) DEFAULT 'ดี',
  \`academic_year\` VARCHAR(16) NOT NULL,
  \`test_type\` VARCHAR(32) NOT NULL,
  \`test_title\` VARCHAR(255) DEFAULT NULL,
  \`notes\` TEXT DEFAULT NULL,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`updated_by\` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_acad_year_type\` (\`academic_year\`, \`test_type\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
`;

export const HOSTATOM_SYNC_SUPABASE_TABLES_SQL = `-- ============================================================================
-- คำสั่ง SQL ปรับปรุง phpMyAdmin บน Hostatom ให้มีตารางตรงกับ Supabase 100%
-- คัดลอกคำสั่งทั้งหมดนี้ไปวางในแท็บ "SQL" บน phpMyAdmin ของ Hostatom แล้วกด Go
-- คำสั่งนี้จะไม่ทำให้ข้อมูลเดิมสูญหาย แต่จะสร้างตาราง nt_assessments และ rt_assessments
-- และคัดลอกข้อมูลจาก academic_records เข้าไปให้โดยอัตโนมัติ
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. สร้างตารางผลสอบ NT (nt_assessments) ให้ตรงตาม Supabase
CREATE TABLE IF NOT EXISTS \`nt_assessments\` (
  \`id\` VARCHAR(128) NOT NULL,
  \`order_num\` INT(11) DEFAULT 0,
  \`school_id\` VARCHAR(64) NOT NULL,
  \`school_name\` VARCHAR(255) NOT NULL,
  \`amphoe\` VARCHAR(128) DEFAULT NULL,
  \`math_score\` DOUBLE DEFAULT 0,
  \`math_percentage\` DOUBLE DEFAULT 0,
  \`thai_score\` DOUBLE DEFAULT 0,
  \`thai_percentage\` DOUBLE DEFAULT 0,
  \`total_score\` DOUBLE DEFAULT 0,
  \`total_percentage\` DOUBLE DEFAULT 0,
  \`math_quality\` VARCHAR(64) DEFAULT 'พอใช้',
  \`thai_quality\` VARCHAR(64) DEFAULT 'พอใช้',
  \`total_quality\` VARCHAR(64) DEFAULT 'พอใช้',
  \`academic_year\` VARCHAR(16) NOT NULL DEFAULT '2567',
  \`test_type\` VARCHAR(32) NOT NULL DEFAULT 'NT',
  \`test_title\` VARCHAR(255) DEFAULT 'การประเมินคุณภาพผู้เรียน (NT) ชั้นประถมศึกษาปีที่ 3',
  \`notes\` TEXT DEFAULT NULL,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`updated_by\` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_nt_year\` (\`academic_year\`),
  KEY \`idx_nt_school\` (\`school_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. สร้างตารางผลสอบ RT (rt_assessments) ให้ตรงตาม Supabase
CREATE TABLE IF NOT EXISTS \`rt_assessments\` (
  \`id\` VARCHAR(128) NOT NULL,
  \`order_num\` INT(11) DEFAULT 0,
  \`school_id\` VARCHAR(64) NOT NULL,
  \`school_name\` VARCHAR(255) NOT NULL,
  \`amphoe\` VARCHAR(128) DEFAULT NULL,
  \`reading_aloud_score\` DOUBLE DEFAULT 0,
  \`reading_aloud_percentage\` DOUBLE DEFAULT 0,
  \`reading_comprehension_score\` DOUBLE DEFAULT 0,
  \`reading_comprehension_percentage\` DOUBLE DEFAULT 0,
  \`math_score\` DOUBLE DEFAULT 0,
  \`math_percentage\` DOUBLE DEFAULT 0,
  \`thai_score\` DOUBLE DEFAULT 0,
  \`thai_percentage\` DOUBLE DEFAULT 0,
  \`total_score\` DOUBLE DEFAULT 0,
  \`total_percentage\` DOUBLE DEFAULT 0,
  \`reading_aloud_quality\` VARCHAR(64) DEFAULT 'พอใช้',
  \`reading_comprehension_quality\` VARCHAR(64) DEFAULT 'พอใช้',
  \`math_quality\` VARCHAR(64) DEFAULT 'พอใช้',
  \`thai_quality\` VARCHAR(64) DEFAULT 'พอใช้',
  \`total_quality\` VARCHAR(64) DEFAULT 'พอใช้',
  \`academic_year\` VARCHAR(16) NOT NULL DEFAULT '2567',
  \`test_type\` VARCHAR(32) NOT NULL DEFAULT 'RT',
  \`test_title\` VARCHAR(255) DEFAULT 'การประเมินความสามารถด้านการอ่านของผู้เรียน (RT) ชั้นประถมศึกษาปีที่ 1',
  \`notes\` TEXT DEFAULT NULL,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`updated_by\` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_rt_year\` (\`academic_year\`),
  KEY \`idx_rt_school\` (\`school_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. คัดลอกข้อมูลจากตาราง academic_records เดิม เข้า nt_assessments และ rt_assessments โดยอัตโนมัติ (ถ้ามีข้อมูลอยู่)
INSERT IGNORE INTO \`nt_assessments\` (\`id\`, \`order_num\`, \`school_id\`, \`school_name\`, \`amphoe\`, \`math_score\`, \`math_percentage\`, \`thai_score\`, \`thai_percentage\`, \`total_score\`, \`total_percentage\`, \`math_quality\`, \`thai_quality\`, \`total_quality\`, \`academic_year\`, \`test_type\`, \`test_title\`, \`notes\`)
SELECT \`id\`, \`order_num\`, \`school_id\`, \`school_name\`, \`amphoe\`, \`math_score\`, \`math_percentage\`, \`thai_score\`, \`thai_percentage\`, \`total_score\`, \`total_percentage\`, \`math_quality\`, \`thai_quality\`, \`total_quality\`, \`academic_year\`, 'NT', IFNULL(\`test_title\`, 'การประเมินคุณภาพผู้เรียน (NT) ชั้นประถมศึกษาปีที่ 3'), \`notes\`
FROM \`academic_records\` WHERE \`test_type\` = 'NT' OR \`test_type\` IS NULL OR \`test_type\` = '';

INSERT IGNORE INTO \`rt_assessments\` (\`id\`, \`order_num\`, \`school_id\`, \`school_name\`, \`amphoe\`, \`reading_aloud_score\`, \`reading_aloud_percentage\`, \`reading_comprehension_score\`, \`reading_comprehension_percentage\`, \`math_score\`, \`math_percentage\`, \`thai_score\`, \`thai_percentage\`, \`total_score\`, \`total_percentage\`, \`reading_aloud_quality\`, \`reading_comprehension_quality\`, \`math_quality\`, \`thai_quality\`, \`total_quality\`, \`academic_year\`, \`test_type\`, \`test_title\`, \`notes\`)
SELECT \`id\`, \`order_num\`, \`school_id\`, \`school_name\`, \`amphoe\`, \`math_score\`, \`math_percentage\`, \`thai_score\`, \`thai_percentage\`, \`math_score\`, \`math_percentage\`, \`thai_score\`, \`thai_percentage\`, \`total_score\`, \`total_percentage\`, \`math_quality\`, \`thai_quality\`, \`math_quality\`, \`thai_quality\`, \`total_quality\`, \`academic_year\`, 'RT', IFNULL(\`test_title\`, 'การประเมินความสามารถด้านการอ่านของผู้เรียน (RT) ชั้นประถมศึกษาปีที่ 1'), \`notes\`
FROM \`academic_records\` WHERE \`test_type\` = 'RT';

SET FOREIGN_KEY_CHECKS = 1;
`;

// Helper escape string สำหรับ SQL
function escapeSql(str: any): string {
  if (str === null || str === undefined) return 'NULL';
  if (typeof str === 'number') return String(str);
  if (typeof str === 'boolean') return str ? '1' : '0';
  if (typeof str === 'object') {
    return "'" + JSON.stringify(str).replace(/'/g, "''").replace(/\\/g, '\\\\') + "'";
  }
  return "'" + String(str).replace(/'/g, "''").replace(/\\/g, '\\\\') + "'";
}

/**
 * สร้างไฟล์ SQL Dump เต็มรูปแบบสำหรับ MySQL บน Hostatom phpMyAdmin
 * มีทั้ง CREATE TABLE และ INSERT INTO ข้อมูลจริงทั้งหมดที่มีอยู่ในระบบ
 */
export function generateHostatomMySQLDump(
  schools: School[],
  studentData: StudentData[],
  studentGData: StudentGData[] = [],
  users: UserProfile[] = [],
  systemConfig?: SystemConfig,
  academicRecords: AcademicRecord[] = []
): string {
  const parts: string[] = [];
  const exportDate = new Date().toISOString();

  parts.push(`-- ============================================================================`);
  parts.push(`-- MHS1 BIGDATA - FULL DATABASE BACKUP DUMP (MySQL / Hostatom phpMyAdmin)`);
  parts.push(`-- วันที่ส่งออก: ${exportDate}`);
  parts.push(`-- รวมข้อมูล: ${schools.length} โรงเรียน, ${studentData.length} ข้อมูลสถิตินักเรียน, ${studentGData.length} นักเรียนตัว G, ${users.length} ผู้ใช้`);
  parts.push(`-- ============================================================================\n`);

  parts.push(HOSTATOM_MYSQL_SCHEMA_SQL);
  parts.push('\n-- ============================================================================');
  parts.push('-- เริ่มต้นนำเข้าข้อมูลจริง (DATA INSERTS)');
  parts.push('-- ============================================================================\n');

  // 1. Schools
  if (schools && schools.length > 0) {
    parts.push(`-- 1. ข้อมูลโรงเรียน (${schools.length} รายการ)`);
    for (const s of schools) {
      const sql = `INSERT INTO \`schools\` (\`id\`, \`name\`, \`district\`, \`amphoe\`, \`network_group\`, \`internet_type\`, \`electricity\`, \`water_system\`, \`water_system_detail\`, \`solar_kw\`, \`has_solar_battery\`, \`solar_battery_capacity\`, \`staff_count\`, \`contract_teachers_count\`, \`admin_staff_count\`, \`janitor_count\`, \`other_staff_count\`, \`major_subjects\`, \`major_subjects_with_staff\`, \`classrooms\`, \`director_name\`, \`director_phone\`, \`vice_director_name\`, \`vice_director_phone\`, \`vice_directors\`, \`school_phone\`, \`email\`, \`facebook\`, \`line\`, \`website\`, \`address\`, \`image_url\`, \`logo_url\`, \`director_image_url\`, \`latitude\`, \`longitude\`, \`size\`, \`is_expansion\`, \`special_highlights\`, \`updated_by\`) VALUES (${escapeSql(s.id)}, ${escapeSql(s.name)}, ${escapeSql(s.district || 'สพป.แม่ฮ่องสอน เขต 1')}, ${escapeSql(s.amphoe)}, ${escapeSql(s.networkGroup)}, ${escapeSql(s.internetType || 'fiber')}, ${escapeSql(s.electricity)}, ${escapeSql(s.waterSystem || 'government')}, ${escapeSql(s.waterSystemDetail)}, ${escapeSql(s.solarKw)}, ${s.hasSolarBattery ? 1 : 0}, ${escapeSql(s.solarBatteryCapacity)}, ${Number(s.staffCount) || 0}, ${Number(s.contractTeachersCount) || 0}, ${Number(s.adminStaffCount) || 0}, ${Number(s.janitorCount) || 0}, ${Number(s.otherStaffCount) || 0}, ${escapeSql(s.majorSubjects || [])}, ${escapeSql(s.majorSubjectsWithStaff || [])}, ${escapeSql(s.classrooms || [])}, ${escapeSql(s.directorName)}, ${escapeSql(s.directorPhone)}, ${escapeSql(s.viceDirectors?.[0]?.name || s.viceDirectorName)}, ${escapeSql(s.viceDirectors?.[0]?.phone || s.viceDirectorPhone)}, ${escapeSql(s.viceDirectors || [])}, ${escapeSql(s.schoolPhone)}, ${escapeSql(s.email)}, ${escapeSql(s.facebook)}, ${escapeSql(s.line)}, ${escapeSql(s.website)}, ${escapeSql(s.address)}, ${escapeSql(s.imageUrl)}, ${escapeSql(s.logoUrl)}, ${escapeSql(s.directorImageUrl)}, ${Number(s.latitude) || 0}, ${Number(s.longitude) || 0}, ${escapeSql(s.size || 'small')}, ${s.isExpansion ? 1 : 0}, ${escapeSql(s.specialHighlights)}, ${escapeSql(s.updatedBy || 'Migration')}) ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`), \`staff_count\`=VALUES(\`staff_count\`), \`updated_at\`=NOW();`;
      parts.push(sql);
    }
    parts.push('\n');
  }

  // 2. Students
  if (studentData && studentData.length > 0) {
    parts.push(`-- 2. สถิตินักเรียน (${studentData.length} รายการ)`);
    for (const st of studentData) {
      const docId = st.id || `${st.schoolId}_${st.academicYear}`;
      const sql = `INSERT INTO \`students\` (\`id\`, \`school_id\`, \`school_name\`, \`academic_year\`, \`grades\`, \`total_male\`, \`total_female\`, \`total_students\`) VALUES (${escapeSql(docId)}, ${escapeSql(st.schoolId)}, ${escapeSql(st.schoolName)}, ${escapeSql(st.academicYear)}, ${escapeSql(st.grades || {})}, ${Number(st.totalMale) || 0}, ${Number(st.totalFemale) || 0}, ${Number(st.totalStudents) || 0}) ON DUPLICATE KEY UPDATE \`total_students\`=VALUES(\`total_students\`), \`grades\`=VALUES(\`grades\`), \`updated_at\`=NOW();`;
      parts.push(sql);
    }
    parts.push('\n');
  }

  // 3. Students G
  if (studentGData && studentGData.length > 0) {
    parts.push(`-- 3. นักเรียนตัว G (${studentGData.length} รายการ)`);
    for (const g of studentGData) {
      const docId = g.id || `${g.schoolId}_g_${g.academicYear}`;
      const sql = `INSERT INTO \`students_g\` (\`id\`, \`school_id\`, \`school_name\`, \`academic_year\`, \`total_g_students\`, \`male_g_count\`, \`female_g_count\`, \`notes\`) VALUES (${escapeSql(docId)}, ${escapeSql(g.schoolId)}, ${escapeSql(g.schoolName)}, ${escapeSql(g.academicYear)}, ${Number(g.totalGStudents) || 0}, ${Number(g.maleGCount) || 0}, ${Number(g.femaleGCount) || 0}, ${escapeSql(g.notes)}) ON DUPLICATE KEY UPDATE \`total_g_students\`=VALUES(\`total_g_students\`), \`updated_at\`=NOW();`;
      parts.push(sql);
    }
    parts.push('\n');
  }

  // 4. Users
  if (users && users.length > 0) {
    parts.push(`-- 4. ทะเบียนผู้ใช้งาน (${users.length} รายการ)`);
    for (const u of users) {
      const sql = `INSERT INTO \`users\` (\`uid\`, \`email\`, \`first_name\`, \`last_name\`, \`school_id\`, \`school_name\`, \`role\`, \`status\`) VALUES (${escapeSql(u.uid)}, ${escapeSql(u.email)}, ${escapeSql(u.firstName)}, ${escapeSql(u.lastName)}, ${escapeSql(u.schoolId)}, ${escapeSql(u.schoolName)}, ${escapeSql(u.role || 'school_admin')}, ${escapeSql(u.status || 'pending')}) ON DUPLICATE KEY UPDATE \`role\`=VALUES(\`role\`), \`status\`=VALUES(\`status\`);`;
      parts.push(sql);
    }
    parts.push('\n');
  }

  // 5. Settings
  if (systemConfig) {
    parts.push(`-- 5. ตั้งค่าระบบ (Settings)`);
    parts.push(`INSERT INTO \`settings\` (\`id\`, \`config\`) VALUES ('system_config', ${escapeSql(systemConfig)}) ON DUPLICATE KEY UPDATE \`config\`=VALUES(\`config\`), \`updated_at\`=NOW();\n`);
  }

  // 6. NT Assessments (ผลการประเมิน NT ป.3 - ตรงตามตาราง Supabase)
  const ntRecords = academicRecords ? academicRecords.filter(r => String(r.testType).toUpperCase() !== 'RT') : [];
  if (ntRecords.length > 0) {
    parts.push(`-- 6. ผลการประเมิน NT ชั้น ป.3 (\`nt_assessments\`) (${ntRecords.length} รายการ)`);
    for (const ac of ntRecords) {
      const sql = `INSERT INTO \`nt_assessments\` (\`id\`, \`order_num\`, \`school_id\`, \`school_name\`, \`amphoe\`, \`math_score\`, \`math_percentage\`, \`thai_score\`, \`thai_percentage\`, \`total_score\`, \`total_percentage\`, \`math_quality\`, \`thai_quality\`, \`total_quality\`, \`academic_year\`, \`test_type\`, \`test_title\`, \`notes\`, \`updated_by\`) VALUES (${escapeSql(ac.id)}, ${Number(ac.order) || 0}, ${escapeSql(ac.schoolId)}, ${escapeSql(ac.schoolName)}, ${escapeSql(ac.amphoe)}, ${Number(ac.mathScore) || 0}, ${Number(ac.mathPercentage) || 0}, ${Number(ac.thaiScore) || 0}, ${Number(ac.thaiPercentage) || 0}, ${Number(ac.totalScore) || 0}, ${Number(ac.totalPercentage) || 0}, ${escapeSql(ac.mathQuality || 'พอใช้')}, ${escapeSql(ac.thaiQuality || 'พอใช้')}, ${escapeSql(ac.totalQuality || 'พอใช้')}, ${escapeSql(ac.academicYear || '2567')}, 'NT', ${escapeSql(ac.testTitle || 'การประเมินคุณภาพผู้เรียน (NT) ชั้นประถมศึกษาปีที่ 3')}, ${escapeSql(ac.notes)}, ${escapeSql(ac.updatedBy || 'Migration')}) ON DUPLICATE KEY UPDATE \`total_score\`=VALUES(\`total_score\`), \`updated_at\`=NOW();`;
      parts.push(sql);
    }
    parts.push('\n');
  }

  // 7. RT Assessments (ผลการประเมิน RT ป.1 - ตรงตามตาราง Supabase)
  const rtRecords = academicRecords ? academicRecords.filter(r => String(r.testType).toUpperCase() === 'RT') : [];
  if (rtRecords.length > 0) {
    parts.push(`-- 7. ผลการประเมิน RT ชั้น ป.1 (\`rt_assessments\`) (${rtRecords.length} รายการ)`);
    for (const ac of rtRecords) {
      const sql = `INSERT INTO \`rt_assessments\` (\`id\`, \`order_num\`, \`school_id\`, \`school_name\`, \`amphoe\`, \`reading_aloud_score\`, \`reading_aloud_percentage\`, \`reading_comprehension_score\`, \`reading_comprehension_percentage\`, \`math_score\`, \`math_percentage\`, \`thai_score\`, \`thai_percentage\`, \`total_score\`, \`total_percentage\`, \`reading_aloud_quality\`, \`reading_comprehension_quality\`, \`math_quality\`, \`thai_quality\`, \`total_quality\`, \`academic_year\`, \`test_type\`, \`test_title\`, \`notes\`, \`updated_by\`) VALUES (${escapeSql(ac.id)}, ${Number(ac.order) || 0}, ${escapeSql(ac.schoolId)}, ${escapeSql(ac.schoolName)}, ${escapeSql(ac.amphoe)}, ${Number(ac.mathScore) || 0}, ${Number(ac.mathPercentage) || 0}, ${Number(ac.thaiScore) || 0}, ${Number(ac.thaiPercentage) || 0}, ${Number(ac.mathScore) || 0}, ${Number(ac.mathPercentage) || 0}, ${Number(ac.thaiScore) || 0}, ${Number(ac.thaiPercentage) || 0}, ${Number(ac.totalScore) || 0}, ${Number(ac.totalPercentage) || 0}, ${escapeSql(ac.mathQuality || 'พอใช้')}, ${escapeSql(ac.thaiQuality || 'พอใช้')}, ${escapeSql(ac.mathQuality || 'พอใช้')}, ${escapeSql(ac.thaiQuality || 'พอใช้')}, ${escapeSql(ac.totalQuality || 'พอใช้')}, ${escapeSql(ac.academicYear || '2567')}, 'RT', ${escapeSql(ac.testTitle || 'การประเมินความสามารถด้านการอ่านของผู้เรียน (RT) ชั้นประถมศึกษาปีที่ 1')}, ${escapeSql(ac.notes)}, ${escapeSql(ac.updatedBy || 'Migration')}) ON DUPLICATE KEY UPDATE \`total_score\`=VALUES(\`total_score\`), \`updated_at\`=NOW();`;
      parts.push(sql);
    }
    parts.push('\n');
  }

  // 8. Academic Records (ตารางรวมเดิม - เพื่อความเข้ากันได้ 100%)
  if (academicRecords && academicRecords.length > 0) {
    parts.push(`-- 8. ผลสัมฤทธิ์ทางการศึกษาแบบรวม (\`academic_records\`) (${academicRecords.length} รายการ)`);
    for (const ac of academicRecords) {
      const sql = `INSERT INTO \`academic_records\` (\`id\`, \`order_num\`, \`school_id\`, \`school_name\`, \`amphoe\`, \`math_score\`, \`math_percentage\`, \`thai_score\`, \`thai_percentage\`, \`total_score\`, \`total_percentage\`, \`math_quality\`, \`thai_quality\`, \`total_quality\`, \`academic_year\`, \`test_type\`, \`test_title\`, \`notes\`) VALUES (${escapeSql(ac.id)}, ${Number(ac.order) || 0}, ${escapeSql(ac.schoolId)}, ${escapeSql(ac.schoolName)}, ${escapeSql(ac.amphoe)}, ${Number(ac.mathScore) || 0}, ${Number(ac.mathPercentage) || 0}, ${Number(ac.thaiScore) || 0}, ${Number(ac.thaiPercentage) || 0}, ${Number(ac.totalScore) || 0}, ${Number(ac.totalPercentage) || 0}, ${escapeSql(ac.mathQuality || 'ดี')}, ${escapeSql(ac.thaiQuality || 'ดี')}, ${escapeSql(ac.totalQuality || 'ดี')}, ${escapeSql(ac.academicYear)}, ${escapeSql(ac.testType || 'NT')}, ${escapeSql(ac.testTitle)}, ${escapeSql(ac.notes)}) ON DUPLICATE KEY UPDATE \`total_score\`=VALUES(\`total_score\`), \`updated_at\`=NOW();`;
      parts.push(sql);
    }
    parts.push('\n');
  }

  parts.push(`-- สิ้นสุดการส่งออกข้อมูลสำเร็จสมบูรณ์`);
  return parts.join('\n');
}

/**
 * สร้างไฟล์ JSON Archive รวมข้อมูลทั้งหมดในระบบ
 */
export function generateFullJsonArchive(
  schools: School[],
  studentData: StudentData[],
  studentGData: StudentGData[] = [],
  users: UserProfile[] = [],
  systemConfig?: SystemConfig,
  academicRecords: AcademicRecord[] = []
): string {
  const archive = {
    exportedAt: new Date().toISOString(),
    system: 'MHS1 BIGDATA',
    version: '3.0.0',
    stats: {
      schoolsCount: schools.length,
      studentsCount: studentData.length,
      studentsGCount: studentGData.length,
      usersCount: users.length,
      academicRecordsCount: academicRecords.length
    },
    data: {
      schools,
      studentData,
      studentGData,
      users,
      systemConfig,
      academicRecords
    }
  };
  return JSON.stringify(archive, null, 2);
}

// ============================================================================
// 2. ไฟล์ PHP Connector API Script สำหรับติดตั้งบน Hostatom (cPanel / Apache)
// ============================================================================
export const HOSTATOM_PHP_CONNECTOR_CODE = `<?php
/**
 * ============================================================================
 * MHS1 BIGDATA - REST API Database Connector สำหรับ Hostatom
 * นำไฟล์นี้ไปวางในโฟลเดอร์ public_html/api/mhs1_db.php หรือตามที่ต้องการบน Hostatom
 * ============================================================================
 */

// 1. ตั้งค่าการเชื่อมต่อฐานข้อมูล MySQL ของคุณบน Hostatom cPanel
$db_host = 'localhost';             // บน Hostatom มักเป็น 'localhost' เสมอ
$db_name = 'your_cpanel_mhs1db';    // ชื่อฐานข้อมูลที่คุณสร้างใน cPanel
$db_user = 'your_cpanel_dbuser';    // ชื่อ Database User ใน cPanel
$db_pass = 'your_database_password';// รหัสผ่าน Database User
$api_secret = 'mhs1_bigdata_secret_2026'; // ตั้งรหัสลับตรงกับที่กรอกในหน้าเว็บ MHS1

// 2. ตั้งค่า CORS Headers เพื่อให้เว็บแอพสามารถยิง Request มาได้ปลอดภัย
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Api-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 3. ตรวจสอบ API Key
$received_key = $_REQUEST['key'] ?? $_SERVER['HTTP_X_API_KEY'] ?? '';
if ($received_key !== $api_secret) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized: Invalid API Key']);
    exit;
}

// 4. เชื่อมต่อฐานข้อมูล PDO
try {
    $pdo = new PDO(
        "mysql:host={$db_host};dbname={$db_name};charset=utf8mb4",
        $db_user,
        $db_pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true) ?? [];

switch ($action) {
    // -------------------------------------------------------------
    // PING / HEALTH CHECK
    // -------------------------------------------------------------
    case 'ping':
        $ver = $pdo->query('select version()')->fetchColumn();
        echo json_encode([
            'status' => 'ok',
            'success' => true,
            'message' => 'เชื่อมต่อฐานข้อมูล Hostatom สำเร็จ!',
            'mysql_version' => $ver,
            'server_time' => date('Y-m-d H:i:s')
        ]);
        break;

    // -------------------------------------------------------------
    // SCHOOLS
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
    // STUDENTS
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

    // -------------------------------------------------------------
    // DEFAULT 404
    // -------------------------------------------------------------
    default:
        http_response_code(400);
        echo json_encode([
            'status' => 'error', 
            'message' => "Unknown action '{$action}'. Supported: ping, get_schools, save_school, get_students, save_student"
        ]);
        break;
}
?>`;

export const HOSTATOM_CONFIG_PHP_CODE = `<?php
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

export const HOSTATOM_HTACCESS_CODE = `# ==============================================================================
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

export const HOSTATOM_INSTALL_MANUAL_HTML = `<!DOCTYPE html>
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

export const HOSTATOM_PREBUILT_PACKAGE_URL = '/downloads/mhs1_bigdata_hostatom_deploy_pack.zip';

/**
 * สร้างไฟล์ ZIP สดที่มีข้อมูล MySQL ปัจจุบันและไฟล์ตั้งค่าทั้งหมด
 */
export async function generateLiveHostatomZipBlob(
  schools: School[],
  studentData: StudentData[],
  studentGData: StudentGData[] = [],
  users: UserProfile[] = [],
  systemConfig?: SystemConfig,
  academicRecords: AcademicRecord[] = []
): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  // 1. Database folder
  const dbFolder = zip.folder('database');
  dbFolder?.file('01_mhs1_schema_mysql.sql', HOSTATOM_MYSQL_SCHEMA_SQL);
  const liveDataSql = generateHostatomMySQLDump(schools, studentData, studentGData, users, systemConfig, academicRecords);
  dbFolder?.file('02_mhs1_live_data_dump.sql', liveDataSql);
  dbFolder?.file('03_sync_supabase_to_hostatom.sql', HOSTATOM_SYNC_SUPABASE_TABLES_SQL);

  // 2. API folder
  const apiFolder = zip.folder('api');
  apiFolder?.file('config.php', HOSTATOM_CONFIG_PHP_CODE);
  apiFolder?.file('mhs1_db.php', HOSTATOM_PHP_CONNECTOR_CODE);

  // 3. Web server .htaccess
  zip.file('.htaccess', HOSTATOM_HTACCESS_CODE);

  // 4. Instructions
  zip.file('คู่มือการติดตั้ง_บน_HOSTATOM.html', HOSTATOM_INSTALL_MANUAL_HTML);
  zip.file('README_HOSTATOM.txt', `================================================================================
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
`);

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
}

