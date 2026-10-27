import csv
import json
import urllib.request
import urllib.parse
import os
import sys

# 1. Load CSV
csv_path = 'public/assets/aistudio/map_d696c01c.csv'
csv_data = {}
branch_classrooms = []

with open(csv_path, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        sid = (row.get('รหัสโรงเรียน') or row.get('\ufeffรหัสโรงเรียน') or '').strip()
        sname = (row.get('ชื่อโรงเรียน') or '').strip()
        lat_str = (row.get('ละติจูด') or '').strip()
        lng_str = (row.get('ลองจิจูด') or '').strip()
        
        if not sid:
            continue
        try:
            lat = float(lat_str)
            lng = float(lng_str)
        except ValueError:
            print(f"Skipping {sid} due to invalid coords: {lat_str}, {lng_str}")
            continue
            
        csv_data[sid] = {
            'id': sid,
            'name': sname,
            'latitude': lat,
            'longitude': lng
        }
        if '-' in sid:
            branch_classrooms.append(csv_data[sid])

print(f"Loaded {len(csv_data)} rows from CSV ({len(branch_classrooms)} branch classrooms)")

# 2. Update src/utils/schoolsData.json
schools_json_path = 'src/utils/schoolsData.json'
with open(schools_json_path, 'r', encoding='utf-8') as f:
    schools = json.load(f)

updated_schools = 0
name_fixes = 0

for s in schools:
    sid = s['id']
    if sid in csv_data:
        c = csv_data[sid]
        old_name = s['name']
        new_name = c['name']
        if old_name != new_name:
            print(f"Fixing name for {sid}: '{old_name}' -> '{new_name}'")
            s['name'] = new_name
            name_fixes += 1
            
        s['latitude'] = c['latitude']
        s['longitude'] = c['longitude']
        updated_schools += 1

# Associate branch classrooms to parent schools in classrooms array
for b in branch_classrooms:
    parent_id = b['id'].split('-')[0]
    for s in schools:
        if s['id'] == parent_id:
            if 'classrooms' not in s or not isinstance(s['classrooms'], list):
                s['classrooms'] = []
            existing = next((c for c in s['classrooms'] if c.get('id') == b['id'] or c.get('grade') == b['name']), None)
            if existing:
                existing['latitude'] = b['latitude']
                existing['longitude'] = b['longitude']
                existing['isRemoteBranch'] = True
                existing['grade'] = b['name']
            else:
                s['classrooms'].append({
                    'id': b['id'],
                    'grade': b['name'],
                    'latitude': b['latitude'],
                    'longitude': b['longitude'],
                    'isRemoteBranch': True
                })

with open(schools_json_path, 'w', encoding='utf-8') as f:
    json.dump(schools, f, ensure_ascii=False, indent=2)

print(f"Updated {updated_schools} schools ({name_fixes} name fixes) in {schools_json_path}")

# 3. Update Supabase
supabase_url = 'https://frpjtkltipmwpevngdrp.supabase.co'
supabase_key = 'sb_publishable_5wJwoIwcwvyjKBJsP1uMdg_x0xhwOB9'

print("Updating Supabase schools table with exact names and coordinates...")
supabase_success = 0
supabase_failed = 0

for s in schools:
    sid = s['id']
    if sid not in csv_data:
        continue
        
    c = csv_data[sid]
    url = f"{supabase_url}/rest/v1/schools?id=eq.{sid}"
    payload = json.dumps({
        'name': c['name'],
        'latitude': c['latitude'],
        'longitude': c['longitude'],
        'classrooms': s.get('classrooms', [])
    }).encode('utf-8')
    
    req = urllib.request.Request(url, data=payload, headers={
        'apikey': supabase_key,
        'Authorization': f'Bearer {supabase_key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }, method='PATCH')
    
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            supabase_success += 1
    except Exception as e:
        print(f"Supabase update error for {sid}: {e}")
        supabase_failed += 1

print(f"Supabase update: {supabase_success} success, {supabase_failed} failed")

# 4. Generate Hostatom MySQL Update SQL Files
sql_lines = [
    '-- ============================================================================',
    '-- MHS1 BIGDATA - SQL UPDATE ละติจูด ลองจิจูด และชื่อสถานศึกษา จาก CSV ล่าสุด',
    '-- อัปเดตตรงตามชื่อโรงเรียนและพิกัดแผนที่ 100%',
    '-- ============================================================================',
    'START TRANSACTION;',
    ''
]

for s in schools:
    sid = s['id']
    c = csv_data.get(sid)
    if c:
        safe_name = c['name'].replace("'", "''")
        lat = c['latitude']
        lng = c['longitude']
        sql_lines.append(f"UPDATE `schools` SET `name` = '{safe_name}', `latitude` = {lat}, `longitude` = {lng} WHERE `id` = '{sid}';")

sql_lines.append('')
sql_lines.append('COMMIT;')

sql_content = '\n'.join(sql_lines)

os.makedirs('public/downloads', exist_ok=True)
os.makedirs('dist/downloads', exist_ok=True)

with open('public/downloads/03_update_coordinates.sql', 'w', encoding='utf-8') as f:
    f.write(sql_content)
with open('dist/downloads/03_update_coordinates.sql', 'w', encoding='utf-8') as f:
    f.write(sql_content)
with open('public/downloads/04_update_coordinates_from_csv.sql', 'w', encoding='utf-8') as f:
    f.write(sql_content)
with open('dist/downloads/04_update_coordinates_from_csv.sql', 'w', encoding='utf-8') as f:
    f.write(sql_content)

print("Generated Hostatom SQL update scripts successfully")
