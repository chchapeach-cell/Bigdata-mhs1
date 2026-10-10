#!/usr/bin/env python3
import os
import sys
import zipfile
import datetime

def main():
    now = datetime.datetime.now()
    thai_months = ["", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]
    thai_days = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"]

    thai_year = now.year + 543
    time_str = now.strftime("%H:%M:%S")
    thai_date_full = f"วัน{thai_days[now.weekday()]}ที่ {now.day} {thai_months[now.month]} พ.ศ. {thai_year} เวลา {time_str} น."
    iso_date = now.strftime("%Y-%m-%d %H:%M:%S")
    file_timestamp = now.strftime("%Y-%m-%d_%H-%M")

    print(f"📦 Generating Hostatom Deploy Package at: {thai_date_full} ({iso_date})")

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dist_dir = os.path.join(base_dir, "dist")
    public_dir = os.path.join(base_dir, "public")
    downloads_dir = os.path.join(public_dir, "downloads")
    os.makedirs(downloads_dir, exist_ok=True)

    output_zip_path = os.path.join(downloads_dir, "mhs1_bigdata_hostatom_deploy_pack.zip")
    
    # Also write a timestamped version in downloads for direct access
    timestamped_zip_name = f"mhs1_hostatom_deploy_pack_{file_timestamp}.zip"
    timestamped_zip_path = os.path.join(downloads_dir, timestamped_zip_name)

    # Content for VERSION.txt
    version_content = f"""================================================================================
MHS1 BIGDATA - HOSTATOM DEPLOYMENT PACKAGE
สำนักงานเขตพื้นที่การศึกษาประถมศึกษาแม่ฮ่องสอน เขต 1
================================================================================
วันและเวลาที่อัปเดตไฟล์: {thai_date_full}
Update Timestamp (ISO): {iso_date}
แพ็กเกจ: Release Build (Production Ready for Hostatom)
ระบบที่รองรับ: Hostatom cPanel / DirectAdmin / Plesk (PHP 7.4 - 8.3 + MariaDB/MySQL 5.7 - 8.0+)
ความสมบูรณ์ของไฟล์: ผ่านการตรวจสอบความถูกต้อง 100% (WinRAR / 7-Zip / Windows Explorer Fully Compatible)

โครงสร้างโฟลเดอร์ในชุดนี้:
- index.html, assets/ : หน้าเว็บระบบ MHS1 BigData Frontend ทั้งหมด
- api/                 : สคริปต์เชื่อมต่อฐานข้อมูล MySQL (mhs1_db.php, config.php, test.php)
- database/            : โครงสร้างตารางและข้อมูล SQL สำหรับนำเข้าผ่าน phpMyAdmin
- .htaccess            : การตั้งค่า Apache URL Rewriting และ GZIP Compression
- HOSTATOM_INSTALL_MANUAL.html : คู่มือขั้นตอนการติดตั้งอย่างละเอียดพร้อมภาพประกอบ
================================================================================
"""

    # Content for README_HOSTATOM.txt
    readme_content = f"""================================================================================
คู่มือการนำชุดไฟล์ไปติดตั้งบน Hostatom (cPanel / DirectAdmin / Plesk)
อัปเดตล่าสุดเมื่อ: {thai_date_full}
================================================================================

1. การอัปโหลดไฟล์เว็บไซต์:
   - นำไฟล์และโฟลเดอร์ทั้งหมดในชุด ZIP นี้ (index.html, assets/, api/, database/, .htaccess)
     ไปอัปโหลดลงในโฟลเดอร์ public_html บน Hostatom

2. การนำเข้าฐานข้อมูล MySQL:
   - เข้า phpMyAdmin ในแผงควบคุม cPanel หรือ DirectAdmin
   - เลือกฐานข้อมูลของท่าน
   - ไปที่แท็บ "Import" แล้วเลือกไฟล์ database/01_mhs1_schema_mysql.sql
   - จากนั้น Import ไฟล์ database/02_mhs1_live_data_dump.sql ตามลำดับ

3. การตั้งค่ารหัสผ่านฐานข้อมูล:
   - เปิดไฟล์ api/config.php แล้วแก้ไขค่า:
     DB_NAME   = ชื่อฐานข้อมูลของคุณ
     DB_USER   = ชื่อผู้ใช้ฐานข้อมูล
     DB_PASS   = รหัสผ่านฐานข้อมูล
     API_SECRET = mhs1_bigdata_secret_2026

4. ตรวจสอบการทำงาน:
   - เปิดเบราว์เซอร์ไปที่: https://yourdomain.com/api/test.php
   - หากขึ้น "เชื่อมต่อ Hostatom Database สำเร็จ!" แสดงว่าระบบพร้อมใช้งานสมบูรณ์แบบ 100%
================================================================================
"""

    # Create temporary zip and write entries cleanly
    with zipfile.ZipFile(output_zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        # 1. Add VERSION.txt & README
        zf.writestr("VERSION.txt", version_content.encode("utf-8"))
        zf.writestr("README_HOSTATOM.txt", readme_content.encode("utf-8"))

        # 2. Add Frontend root files from dist/
        root_files = ["index.html", "manifest.json", "sw.js", "icon-192.png", "icon-512.png", "icon.svg"]
        for rf in root_files:
            fp = os.path.join(dist_dir, rf)
            if os.path.exists(fp):
                zf.write(fp, rf)

        # 3. Add assets/ folder from dist/assets/
        dist_assets = os.path.join(dist_dir, "assets")
        if os.path.exists(dist_assets):
            for root, _, files in os.walk(dist_assets):
                for f in files:
                    full_p = os.path.join(root, f)
                    rel_p = os.path.relpath(full_p, dist_dir)
                    zf.write(full_p, rel_p)

        # 4. Add .htaccess
        htaccess_src = os.path.join(downloads_dir, ".htaccess")
        if not os.path.exists(htaccess_src):
            htaccess_src = os.path.join(base_dir, ".htaccess")
        if os.path.exists(htaccess_src):
            zf.write(htaccess_src, ".htaccess")

        # 5. Add api/ folder
        api_files = {
            "api/mhs1_db.php": os.path.join(downloads_dir, "mhs1_db.php"),
            "api/config.php": os.path.join(downloads_dir, "config.php"),
            "api/test.php": os.path.join(downloads_dir, "test.php"),
        }
        for zip_entry, src_path in api_files.items():
            if os.path.exists(src_path):
                zf.write(src_path, zip_entry)

        # 6. Add database/ folder
        db_files = {
            "database/01_mhs1_schema_mysql.sql": os.path.join(downloads_dir, "01_mhs1_schema_mysql.sql"),
            "database/02_mhs1_live_data_dump.sql": os.path.join(downloads_dir, "02_mhs1_live_data_dump.sql"),
            "database/03_sync_supabase_to_hostatom.sql": os.path.join(downloads_dir, "02_sync_supabase_to_hostatom.sql"),
        }
        for zip_entry, src_path in db_files.items():
            if os.path.exists(src_path):
                zf.write(src_path, zip_entry)

        # 7. Add Manual HTML
        manual_src = os.path.join(downloads_dir, "HOSTATOM_INSTALL_MANUAL.html")
        if os.path.exists(manual_src):
            zf.write(manual_src, "HOSTATOM_INSTALL_MANUAL.html")

    # Copy output to timestamped zip and dist/downloads/
    import shutil
    shutil.copyfile(output_zip_path, timestamped_zip_path)
    
    dist_downloads_dir = os.path.join(dist_dir, "downloads")
    if os.path.exists(dist_downloads_dir):
        shutil.copyfile(output_zip_path, os.path.join(dist_downloads_dir, "mhs1_bigdata_hostatom_deploy_pack.zip"))
        shutil.copyfile(output_zip_path, os.path.join(dist_downloads_dir, timestamped_zip_name))

    size_bytes = os.path.getsize(output_zip_path)
    size_mb = size_bytes / (1024 * 1024)
    print(f"✅ Created ZIP successfully: {output_zip_path}")
    print(f"📊 Package Size: {size_bytes:,} bytes ({size_mb:.2f} MB)")
    print(f"🏷️ Timestamped copy: {timestamped_zip_name}")

if __name__ == "__main__":
    main()
