import json
import re

with open('src/utils/schoolsData.json', 'r', encoding='utf-8') as f:
    schools = json.load(f)

school_map = {s['id']: s for s in schools}

target_files = [
    'public/downloads/02_mhs1_live_data_dump.sql',
    'public/downloads/02_mhs1_full_data_dump.sql'
]

for file_path in target_files:
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    cleaned_lines = []
    fixed_count = 0
    for line in lines:
        if line.startswith("INSERT INTO `schools`"):
            # Clean double commas if any
            if ', ,' in line:
                line = re.sub(r',\s*,\s*', ', ', line)
                fixed_count += 1
            # Check 58010113 name
            if "'58010113'" in line:
                line = line.replace("'58010113', 'บ้านแกงหอม สาขาบ้านม้ง'", "'58010113', 'บ้านแกงหอม'")
        cleaned_lines.append(line)
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(cleaned_lines)
        
    print(f"Cleaned {fixed_count} lines in {file_path}")

print("Cleaned dumps successfully!")
