file_path = 'src/components/SchoolDetailView.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

target = '''              <div className="mt-2 space-y-1.5 border-2 border-dashed border-[#33272A] dark:border-[#FFD3B6]/30 p-2 rounded-xl bg-white dark:bg-[#1e1518]">
                <div className="text-[10px] font-black text-[#33272A] dark:text-[#FFF9F5]">แก้ไขตำแหน่งพิกัด:</div>'''

replacement = '''              <div className="mt-2 space-y-1.5 border-2 border-dashed border-[#33272A] dark:border-[#FFD3B6]/30 p-2 rounded-xl bg-white dark:bg-[#1e1518]">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-black text-[#33272A] dark:text-[#FFF9F5]">แก้ไขตำแหน่งพิกัด:</div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!navigator.geolocation) {
                        alert('อุปกรณ์นี้ไม่รองรับการดึงพิกัด GPS');
                        return;
                      }
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          setEditLatitude(Number(pos.coords.latitude.toFixed(6)));
                          setEditLongitude(Number(pos.coords.longitude.toFixed(6)));
                          alert(`✅ ดึงพิกัดจาก GPS สำเร็จ!\\nละติจูด: ${pos.coords.latitude.toFixed(6)}\\nลองจิจูด: ${pos.coords.longitude.toFixed(6)}\\nความแม่นยำ: ±${Math.round(pos.coords.accuracy)} เมตร`);
                        },
                        (err) => {
                          alert('ไม่สามารถดึงพิกัด GPS ได้: ' + (err.message || 'กรุณาเปิด GPS และอนุญาตการเข้าถึงตำแหน่ง'));
                        },
                        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
                      );
                    }}
                    className="px-2 py-0.5 rounded-lg border border-[#33272A] dark:border-[#FFD3B6] bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-900 dark:text-emerald-200 text-[10px] font-black flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                    title="ดึงพิกัดปัจจุบันจาก GPS ของมือถือหรือคอมพิวเตอร์"
                  >
                    <span>📍 ดึงพิกัด GPS ปัจจุบัน</span>
                  </button>
                </div>'''

if target in text:
    text = text.replace(target, replacement, 1)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(text)
    print('✅ Successfully added GPS location detection to SchoolDetailView.tsx!')
else:
    print('⚠️ Target not found in SchoolDetailView.tsx')
