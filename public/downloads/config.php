<?php
/**
 * ============================================================================
 * ไฟล์ตั้งค่าฐานข้อมูล MySQL บน Hostatom (api/config.php)
 * ============================================================================
 * ให้แก้ไขข้อมูลด้านล่างให้ตรงกับฐานข้อมูลที่คุณสร้างใน cPanel / DirectAdmin
 */

// 1. โฮสต์ฐานข้อมูล (บน Hostatom ปกติจะเป็น 'localhost')
define('DB_HOST', 'localhost');

// 2. ชื่อฐานข้อมูล MySQL ที่สร้างใน cPanel/Plesk
define('DB_NAME', 'mhs1_bigdata');

// 3. ชื่อผู้ใช้งานฐานข้อมูล (MySQL User)
define('DB_USER', 'mhs1_admin');

// 4. รหัสผ่านของผู้ใช้งานฐานข้อมูล
define('DB_PASS', 'm96?25aGr');

// 5. รหัสลับสำหรับ API (Security Secret Key) ป้องกันบุคคลภายนอกเรียกใช้งาน
define('API_SECRET', 'mhs1_bigdata_secret_2026');

// 6. ตั้งค่าการรายงาน Error (ในระหว่างติดตั้งแนะนำให้เปิด E_ALL พอใช้งานจริงค่อยปิด)
error_reporting(E_ALL);
ini_set('display_errors', 0);
?>