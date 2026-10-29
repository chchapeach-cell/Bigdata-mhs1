# Update both public/downloads/mhs1_db.php and scripts/package_hostatom.cjs

import re

paths = ['public/downloads/mhs1_db.php', 'scripts/package_hostatom.cjs']

for p in paths:
    with open(p, 'r', encoding='utf-8') as f:
        text = f.read()

    # 1. Hide sensitive exception details
    old_catch = """} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error', 
        'message' => 'ไม่สามารถเชื่อมต่อฐานข้อมูล MySQL ได้: ' . $e->getMessage(),
        'tip' => 'กรุณาตรวจสอบชื่อฐานข้อมูล ชื่อผู้ใช้ และรหัสผ่านในไฟล์ api/config.php'
    ]);
    exit;
}"""

    new_catch = """} catch (PDOException $e) {
    error_log('Database connection error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error', 
        'message' => 'ไม่สามารถเชื่อมต่อฐานข้อมูล MySQL ได้ กรุณาตรวจสอบการตั้งค่าใน api/config.php',
        'tip' => 'กรุณาตรวจสอบชื่อฐานข้อมูล ชื่อผู้ใช้ และรหัสผ่านในไฟล์ api/config.php'
    ]);
    exit;
}"""

    if old_catch in text:
        text = text.replace(old_catch, new_catch)
        print(f'✅ Patched error disclosure in {p}')
    else:
        print(f'Note: old_catch not found verbatim in {p}')

    with open(p, 'w', encoding='utf-8') as f:
        f.write(text)

print('✅ Finished securing PHP connector files!')
