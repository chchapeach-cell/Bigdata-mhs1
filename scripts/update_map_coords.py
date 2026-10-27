import csv
import json
import urllib.request
import urllib.parse
import time
import sys

# 1. Read CSV
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
            print(f"Skipping invalid lat/lng for {sid} {sname}: {lat_str}, {lng_str}")
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

updated_count_json = 0
for s in schools:
    sid = s['id']
    if sid in csv_data:
        s['latitude'] = csv_data[sid]['latitude']
        s['longitude'] = csv_data[sid]['longitude']
        updated_count_json += 1

# Also associate branch classrooms to parent schools in classrooms array
for b in branch_classrooms:
    parent_id = b['id'].split('-')[0]
    for s in schools:
        if s['id'] == parent_id:
            if 'classrooms' not in s or not isinstance(s['classrooms'], list):
                s['classrooms'] = []
            # Check if already exists in classrooms
            existing = next((c for c in s['classrooms'] if c.get('id') == b['id'] or c.get('grade') == b['name']), None)
            if existing:
                existing['latitude'] = b['latitude']
                existing['longitude'] = b['longitude']
                existing['isRemoteBranch'] = True
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

print(f"Updated {updated_count_json} schools in src/utils/schoolsData.json")

# 3. Update Supabase
supabase_url = 'https://frpjtkltipmwpevngdrp.supabase.co'
supabase_key = 'sb_publishable_5wJwoIwcwvyjKBJsP1uMdg_x0xhwOB9'

print("Updating Supabase schools table...")
supabase_success = 0
supabase_failed = 0

for s in schools:
    sid = s['id']
    if sid not in csv_data:
        continue
    
    url = f"{supabase_url}/rest/v1/schools?id=eq.{sid}"
    payload = json.dumps({
        'latitude': csv_data[sid]['latitude'],
        'longitude': csv_data[sid]['longitude'],
        'classrooms': s.get('classrooms', [])
    }).encode('utf-8')
    
    req = urllib.request.Request(url, data=payload, headers={
        'apikey': supabase_key,
        'Authorization': f'Bearer {supabase_key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }, method='PATCH')
    
    try:
        with urllib.request.urlopen(req) as resp:
            supabase_success += 1
    except Exception as e:
        print(f"Supabase update failed for {sid}: {e}")
        supabase_failed += 1

print(f"Supabase update complete: {supabase_success} success, {supabase_failed} failed")

# 4. Update Hostatom MariaDB
hostatom_api = 'https://naughty-moore.27-254-143-11.plesk.page/api/mhs1_db.php'
hostatom_key = 'mhs1_bigdata_secret_2026'

print("Updating Hostatom schools table...")
hostatom_success = 0
hostatom_failed = 0

for s in schools:
    sid = s['id']
    if sid not in csv_data:
        continue
    
    # Update s with new coords
    s['latitude'] = csv_data[sid]['latitude']
    s['longitude'] = csv_data[sid]['longitude']
    
    url = f"{hostatom_api}?action=save_school&key={hostatom_key}"
    payload = json.dumps(s, ensure_ascii=False).encode('utf-8')
    
    req = urllib.request.Request(url, data=payload, headers={
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
    }, method='POST')
    
    try:
        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode())
            if res.get('status') == 'ok':
                hostatom_success += 1
            else:
                print(f"Hostatom update returned non-ok for {sid}: {res}")
                hostatom_failed += 1
    except Exception as e:
        print(f"Hostatom update failed for {sid}: {e}")
        hostatom_failed += 1

print(f"Hostatom update complete: {hostatom_success} success, {hostatom_failed} failed")
