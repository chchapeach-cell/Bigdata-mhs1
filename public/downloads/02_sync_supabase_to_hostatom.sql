-- ============================================================================
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
