import re

file_path = 'src/components/InfrastructureView.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the Header Title & Description & Switcher Buttons
old_header_pat = re.compile(
    r'<h2 className="text-base sm:text-xl font-black text-\[#33272A\] dark:text-\[#FFF9F5\] flex items-center gap-2">[\s\S]*?</h2>\s*<p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-0\.5">[\s\S]*?</p>',
    re.MULTILINE
)

new_header_code = '''<h2 className="text-base sm:text-xl font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-2">
                {heatmapSystem === 'electricity' && <Zap className="h-5 w-5 text-amber-500 fill-amber-400" />}
                {heatmapSystem === 'internet' && <Globe className="h-5 w-5 text-emerald-500" />}
                {heatmapSystem === 'water' && <Droplets className="h-5 w-5 text-sky-500" />}
                <span>
                  {heatmapSystem === 'electricity' && 'แผนที่เสถียรภาพระบบไฟฟ้า (Electricity Stability Heatmap)'}
                  {heatmapSystem === 'internet' && 'แผนที่คุณภาพเครือข่ายอินเทอร์เน็ต (Internet Quality Heatmap)'}
                  {heatmapSystem === 'water' && 'แผนที่ความมั่นคงระบบน้ำประปา (Water Supply Heatmap)'}
                </span>
              </h2>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                {heatmapSystem === 'electricity' && 'วิเคราะห์ความมั่นคงของโครงข่ายพลังงานไฟฟ้าสถานศึกษาและห้องเรียนสาขาแบบ Color-Coding แสดงจุดเสี่ยงและพื้นที่เฝ้าระวัง'}
                {heatmapSystem === 'internet' && 'วิเคราะห์ความเร็วและความเสถียรของระบบอินเทอร์เน็ต Fiber, ดาวเทียม Satellite และ Cellular SIM 4G/5G'}
                {heatmapSystem === 'water' && 'วิเคราะห์ความสะอาดและความมั่นคงของแหล่งน้ำอุปโภคบริโภค ประปาภาครัฐ ประปาภูเขา และจุดเสี่ยงขาดแคลน'}
              </p>'''

content = old_header_pat.sub(new_header_code, content, count=1)

# 2. Add the 3-system switcher right before the Heatmap On/Off button
old_btn_start = '{/* ปุ่มเปิด-ปิดระบบ Heatmap และปุ่มลัดพิกัดอำเภอ */}\n            <div className="flex flex-wrap items-center gap-2">\n              {/* ปุ่มเปิด/ปิด โหมด Heatmap Color-Coding (ตามคำขอ) */}'

new_btn_start = '''{/* ปุ่มเปิด-ปิดระบบ Heatmap และปุ่มลัดพิกัดอำเภอ */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* แถบสลับระบบ Heatmap (ไฟฟ้า / อินเทอร์เน็ต / น้ำประปา) */}
              <div className="inline-flex p-1 rounded-xl bg-white dark:bg-slate-900 border-2 border-[#33272A] dark:border-[#FFD3B6]/30 shadow-[2px_2px_0px_#33272A] gap-1">
                <button
                  type="button"
                  onClick={() => { setHeatmapSystem('electricity'); setStabilityFilter('all'); }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                    heatmapSystem === 'electricity'
                      ? 'bg-amber-400 text-slate-950 shadow-xs ring-1 ring-amber-500'
                      : 'text-slate-600 hover:text-slate-950 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="สลับดูฮีตแมปเสถียรภาพระบบไฟฟ้า"
                >
                  <Zap className="h-3.5 w-3.5 fill-current" />
                  <span>⚡ ไฟฟ้า</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setHeatmapSystem('internet'); setStabilityFilter('all'); }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                    heatmapSystem === 'internet'
                      ? 'bg-emerald-500 text-white shadow-xs ring-1 ring-emerald-600'
                      : 'text-slate-600 hover:text-slate-950 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="สลับดูฮีตแมปคุณภาพอินเทอร์เน็ต"
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>🌐 อินเทอร์เน็ต</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setHeatmapSystem('water'); setStabilityFilter('all'); }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                    heatmapSystem === 'water'
                      ? 'bg-sky-500 text-white shadow-xs ring-1 ring-sky-600'
                      : 'text-slate-600 hover:text-slate-950 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="สลับดูฮีตแมประบบน้ำประปา"
                >
                  <Droplets className="h-3.5 w-3.5 fill-current" />
                  <span>🚰 น้ำประปา</span>
                </button>
              </div>

              {/* ปุ่มเปิด/ปิด โหมด Heatmap Color-Coding (ตามคำขอ) */}'''

content = content.replace(old_btn_start, new_btn_start, 1)

# 3. Update the 4 KPI cards descriptions
old_card_descriptions = '''              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black text-emerald-950 dark:text-emerald-100">
                  {stabilityStats.optimal} <span className="text-xs font-bold">แห่ง</span>
                </div>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium truncate mt-0.5">
                  สายส่ง PEA / ระบบ Hybrid สำรอง
                </p>
              </div>'''

new_card_descriptions = '''              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black text-emerald-950 dark:text-emerald-100">
                  {stabilityStats.optimal} <span className="text-xs font-bold">แห่ง</span>
                </div>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium truncate mt-0.5">
                  {heatmapSystem === 'electricity' && 'สายส่ง PEA / Hybrid มีสำรอง'}
                  {heatmapSystem === 'internet' && 'สายใยแก้ว Fiber Optic เสถียรสูง'}
                  {heatmapSystem === 'water' && 'ประปาภาครัฐ / กปภ. / ท้องถิ่น'}
                </p>
              </div>'''
content = content.replace(old_card_descriptions, new_card_descriptions, 1)

old_card2 = '''              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black text-amber-950 dark:text-amber-100">
                  {stabilityStats.moderate} <span className="text-xs font-bold">แห่ง</span>
                </div>
                <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium truncate mt-0.5">
                  โซลาร์เซลล์ + แบตเตอรี่สำรอง
                </p>
              </div>'''

new_card2 = '''              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black text-amber-950 dark:text-amber-100">
                  {stabilityStats.moderate} <span className="text-xs font-bold">แห่ง</span>
                </div>
                <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium truncate mt-0.5">
                  {heatmapSystem === 'electricity' && 'โซลาร์เซลล์ + แบตเตอรี่สำรอง'}
                  {heatmapSystem === 'internet' && 'ดาวเทียม Satellite / IPSTAR'}
                  {heatmapSystem === 'water' && 'ระบบประปาภูเขา / ตาน้ำธรรมชาติ'}
                </p>
              </div>'''
content = content.replace(old_card2, new_card2, 1)

old_card3 = '''              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black text-orange-950 dark:text-orange-100">
                  {stabilityStats.low} <span className="text-xs font-bold">แห่ง</span>
                </div>
                <p className="text-[10px] text-orange-700 dark:text-orange-300 font-medium truncate mt-0.5">
                  โซลาร์เซลล์ไม่มีแบตเตอรี่สำรอง
                </p>
              </div>'''

new_card3 = '''              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black text-orange-950 dark:text-orange-100">
                  {stabilityStats.low} <span className="text-xs font-bold">แห่ง</span>
                </div>
                <p className="text-[10px] text-orange-700 dark:text-orange-300 font-medium truncate mt-0.5">
                  {heatmapSystem === 'electricity' && 'โซลาร์เซลล์ไม่มีแบตเตอรี่สำรอง'}
                  {heatmapSystem === 'internet' && 'เครือข่าย Cellular SIM 4G/5G'}
                  {heatmapSystem === 'water' && 'บ่อบาดาล / น้ำฝน / อื่นๆ เสี่ยงแล้ง'}
                </p>
              </div>'''
content = content.replace(old_card3, new_card3, 1)

old_card4 = '''              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black text-rose-950 dark:text-rose-100">
                  {stabilityStats.critical} <span className="text-xs font-bold">แห่ง</span>
                </div>
                <p className="text-[10px] text-rose-700 dark:text-rose-300 font-medium truncate mt-0.5">
                  ไม่มีระบบไฟฟ้าถาวร
                </p>
              </div>'''

new_card4 = '''              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black text-rose-950 dark:text-rose-100">
                  {stabilityStats.critical} <span className="text-xs font-bold">แห่ง</span>
                </div>
                <p className="text-[10px] text-rose-700 dark:text-rose-300 font-medium truncate mt-0.5">
                  {heatmapSystem === 'electricity' && 'ไม่มีระบบไฟฟ้าถาวร'}
                  {heatmapSystem === 'internet' && 'ไม่มีสัญญาณอินเทอร์เน็ต'}
                  {heatmapSystem === 'water' && 'ไม่มีแหล่งน้ำประปาประจำ'}
                </p>
              </div>'''
content = content.replace(old_card4, new_card4, 1)

# 4. Update the Legend Title
old_legend_title = '<span>เกณฑ์สี Heatmap ความเสถียรไฟฟ้า</span>'
new_legend_title = '''<span>
                    {heatmapSystem === 'electricity' && 'เกณฑ์สี Heatmap เสถียรภาพไฟฟ้า'}
                    {heatmapSystem === 'internet' && 'เกณฑ์สี Heatmap คุณภาพเน็ต'}
                    {heatmapSystem === 'water' && 'เกณฑ์สี Heatmap ระบบน้ำประปา'}
                  </span>'''
content = content.replace(old_legend_title, new_legend_title, 1)

# 5. Update the Legend 4 Items description
old_legend_green = '''                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        ไฟฟ้าสายส่งถาวร (PEA) หรือระบบ Hybrid มีไฟสำรองฉุกเฉิน
                      </p>'''
new_legend_green = '''                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {heatmapSystem === 'electricity' && 'ไฟฟ้าสายส่งถาวร (PEA) หรือระบบ Hybrid มีไฟสำรองฉุกเฉิน'}
                        {heatmapSystem === 'internet' && 'สายใยแก้วนำแสง Fiber Optic ความเร็วสูง เสถียร ไม่สะดุด'}
                        {heatmapSystem === 'water' && 'ประปาภาครัฐ / กปภ. / ท้องถิ่น มีการบำบัดน้ำได้มาตรฐาน'}
                      </p>'''
content = content.replace(old_legend_green, new_legend_green, 1)

old_legend_yellow = '''                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        ระบบโซลาร์เซลล์พร้อมแบตเตอรี่สะสมพลังงาน ใช้งานกลางคืนได้
                      </p>'''
new_legend_yellow = '''                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {heatmapSystem === 'electricity' && 'ระบบโซลาร์เซลล์พร้อมแบตเตอรี่สะสมพลังงาน ใช้งานกลางคืนได้'}
                        {heatmapSystem === 'internet' && 'สัญญาณจานดาวเทียม Satellite/IPSTAR เข้าถึงยอดดอยได้'}
                        {heatmapSystem === 'water' && 'ระบบประปาภูเขา / ตาน้ำธรรมชาติ มีน้ำใช้ตามฤดูกาล'}
                      </p>'''
content = content.replace(old_legend_yellow, new_legend_yellow, 1)

old_legend_orange = '''                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        โซลาร์เซลล์ไม่มีแบตเตอรี่สำรอง ไฟดับช่วงฟ้าปิดหรือหมอกหนา
                      </p>'''
new_legend_orange = '''                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {heatmapSystem === 'electricity' && 'โซลาร์เซลล์ไม่มีแบตเตอรี่สำรอง ไฟดับช่วงฟ้าปิดหรือหมอกหนา'}
                        {heatmapSystem === 'internet' && 'เครือข่ายมือถือ Cellular SIM 4G/5G ขอบสัญญาณจำกัด'}
                        {heatmapSystem === 'water' && 'บ่อขุด / บ่อบาดาล / น้ำฝน เสี่ยงขาดแคลนช่วงหน้าแล้ง'}
                      </p>'''
content = content.replace(old_legend_orange, new_legend_orange, 1)

old_legend_red = '''                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        ไม่มีระบบไฟฟ้าถาวร ต้องการการสนับสนุนแผงโซลาร์เร่งด่วน
                      </p>'''
new_legend_red = '''                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {heatmapSystem === 'electricity' && 'ไม่มีระบบไฟฟ้าถาวร ต้องการการสนับสนุนแผงโซลาร์เร่งด่วน'}
                        {heatmapSystem === 'internet' && 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต ขาดแคลนสื่อการเรียนรู้'}
                        {heatmapSystem === 'water' && 'ไม่มีระบบน้ำประปาประจำ ต้องพึ่งพาน้ำแจกจ่าย'}
                      </p>'''
content = content.replace(old_legend_red, new_legend_red, 1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('✅ Finished enhancing InfrastructureView.tsx!')
