-- ============================================================================
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
  \`electricity\` TEXT DEFAULT NULL,
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
  \`major_subjects\` TEXT DEFAULT NULL,
  \`major_subjects_with_staff\` TEXT DEFAULT NULL,
  \`classrooms\` TEXT DEFAULT NULL,
  \`director_name\` VARCHAR(255) DEFAULT NULL,
  \`director_phone\` VARCHAR(64) DEFAULT NULL,
  \`vice_director_name\` VARCHAR(255) DEFAULT NULL,
  \`vice_director_phone\` VARCHAR(64) DEFAULT NULL,
  \`vice_directors\` TEXT DEFAULT NULL,
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
  \`grades\` LONGTEXT NOT NULL,
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
  \`config\` LONGTEXT NOT NULL,
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
  \`daily_visits\` LONGTEXT DEFAULT NULL,
  \`monthly_visits\` LONGTEXT DEFAULT NULL,
  \`yearly_visits\` LONGTEXT DEFAULT NULL,
  \`hourly_visits\` LONGTEXT DEFAULT NULL,
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
