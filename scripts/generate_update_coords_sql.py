import json
import os
import datetime

with open('src/utils/schoolsData.json', 'r', encoding='utf-8') as f:
    schools = json.load(f)

now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

sql_lines = [
    '-- ============================================================================',
    '-- MHS1 BIGDATA - SQL UPDATE ละติจูด ลองจิจูด จาก CSV (map_d696c01c.csv)',
    f'-- วันที่อัปเดต: {now}',
    '-- ============================================================================',
    'START TRANSACTION;',
    ''
]

for s in schools:
    sid = s['id']
    lat = s.get('latitude', 0)
    lng = s.get('longitude', 0)
    sql_lines.append(f"UPDATE `schools` SET `latitude` = {lat}, `longitude` = {lng} WHERE `id` = '{sid}';")

sql_lines.append('')
sql_lines.append('COMMIT;')

sql_content = '\n'.join(sql_lines)

os.makedirs('public/downloads', exist_ok=True)
with open('public/downloads/03_update_coordinates.sql', 'w', encoding='utf-8') as f:
    f.write(sql_content)

os.makedirs('dist/downloads', exist_ok=True)
with open('dist/downloads/03_update_coordinates.sql', 'w', encoding='utf-8') as f:
    f.write(sql_content)

print(f"Generated clean SQL update for {len(schools)} schools")
