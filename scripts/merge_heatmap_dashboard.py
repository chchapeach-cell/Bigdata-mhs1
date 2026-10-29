import re

# 1. Update DashboardView.tsx
dashboard_path = 'src/components/DashboardView.tsx'
with open(dashboard_path, 'r', encoding='utf-8') as f:
    dash_text = f.read()

# Add imports to DashboardView
if 'getInfrastructureQuality' not in dash_text:
    import_stmt = """import { 
  getInfrastructureQuality, 
  getElectricityStability, 
  getInternetQuality, 
  getWaterQuality, 
  HeatmapSystemType, 
  InfrastructureQualityLevel 
} from './InfrastructureView';
"""
    dash_text = import_stmt + dash_text

# Add states in DashboardView
state_marker = "const [mapInfraFilter, setMapInfraFilter]"
if 'const [heatmapSystem, setHeatmapSystem]' not in dash_text:
    new_states = """const [heatmapSystem, setHeatmapSystem] = useState<HeatmapSystemType>('electricity');
  const [isHeatmapActive, setIsHeatmapActive] = useState<boolean>(true);
  const [stabilityFilter, setStabilityFilter] = useState<'all' | InfrastructureQualityLevel>('all');
  const [isMobileMapInteractive, setIsMobileMapInteractive] = useState<boolean>(false);
  """
    dash_text = dash_text.replace(state_marker, new_states + state_marker, 1)

# Add stabilityStats and mapSchools logic before return in DashboardView
stats_logic = """  // สถิติคุณภาพระบบสำหรับระบบ GIS Heatmap Visualization ในหน้าภาพรวม
  const stabilityStats = useMemo(() => {
    let optimal = 0;
    let moderate = 0;
    let low = 0;
    let critical = 0;

    schools.forEach(s => {
      const info = getInfrastructureQuality(s, heatmapSystem);
      if (info.level === 'optimal') optimal++;
      else if (info.level === 'moderate') moderate++;
      else if (info.level === 'low') low++;
      else if (info.level === 'critical') critical++;
    });

    const total = schools.length || 1;
    return {
      total: schools.length,
      optimal,
      moderate,
      low,
      critical,
      optimalPercent: ((optimal / total) * 100).toFixed(1),
      moderatePercent: ((moderate / total) * 100).toFixed(1),
      lowPercent: ((low / total) * 100).toFixed(1),
      criticalPercent: ((critical / total) * 100).toFixed(1),
    };
  }, [schools, heatmapSystem]);

  // กรองโรงเรียนที่จะแสดงบนแผนที่ GIS Heatmap
  const heatmapSchools = useMemo(() => {
    return schools.filter(school => {
      // 1. กรองตามอำเภอ
      if (mapAmphoeFilter !== 'all') {
        const schAmp = school.amphoe || '';
        const isMatch = schAmp === mapAmphoeFilter ||
          (mapAmphoeFilter.includes('เมือง') && schAmp.includes('เมือง'));
        if (!isMatch) return false;
      }
      // 2. กรองตามระดับเสถียรภาพ
      if (stabilityFilter !== 'all') {
        const info = getInfrastructureQuality(school, heatmapSystem);
        if (info.level !== stabilityFilter) return false;
      }
      return true;
    });
  }, [schools, mapAmphoeFilter, stabilityFilter, heatmapSystem]);

  // ข้อมูลโรงเรียนที่ถูกเลือกในแผนที่
  const selectedHeatmapSchool = useMemo(() => {
    if (!selectedMapSchoolId) return null;
    return schools.find(s => s.id === selectedMapSchoolId) || null;
  }, [schools, selectedMapSchoolId]);
"""

if 'const stabilityStats = useMemo(' not in dash_text:
    dash_text = dash_text.replace("return (\n    <div className=", stats_logic + "\n  return (\n    <div className=", 1)

# Replace the entire old map card in DashboardView with the comprehensive GIS Heatmap
old_map_start = re.search(r'\{/\* 🗺️ ส่วนแผนที่แบบโต้ตอบ \(Interactive GIS Map\) \*/\}[\s\S]*?<h3 className="text-lg font-bold text-\[#33272A\]', dash_text)
old_map_card_start_idx = dash_text.find('{/* 🗺️ ส่วนแผนที่แบบโต้ตอบ (Interactive GIS Map) */}')
if old_map_card_start_idx == -1:
    old_map_card_start_idx = dash_text.find('<div className="card p-4 sm:p-6 space-y-4">\n          <div className="flex')

# Find the end of this map card
old_map_end_idx = dash_text.find('{/* สรุปสถานการณ์พิเศษและการแจ้งเตือน (Alerts) */}')

print('Old map start:', old_map_card_start_idx, 'Old map end:', old_map_end_idx)

new_heatmap_markup = """{/* 🗺️ ส่วนแผนที่ระบบสารสนเทศภูมิศาสตร์ GIS Heatmap Visualization (ครบทั้ง 3 ระบบ) */}
        <div className="card p-4 sm:p-6 space-y-4 bg-gradient-to-br from-white via-amber-50/20 to-orange-50/30 dark:from-[#1e1518] dark:via-[#261c1f] dark:to-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[4px_4px_0px_#33272A] dark:shadow-none animate-fade-in">
          {/* Header แผนที่และปุ่มสลับโหมดฮีตแมป */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b-2 border-[#33272A]/10 dark:border-[#FFD3B6]/20 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-950 border border-amber-400 shadow-xs">
                  <Flame className="h-3 w-3 text-orange-600 animate-pulse" />
                  <span>GIS Heatmap Visualization</span>
                </span>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  สพป.แม่ฮ่องสอน เขต 1
                </span>
              </div>
              <h2 className="text-base sm:text-xl font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-2">
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
              </p>
            </div>

            {/* แถบเครื่องมือ: สลับระบบ (ไฟฟ้า / เน็ต / ประปา) + ปุ่มเปิดปิด Heatmap + ปุ่มซูมอำเภอ */}
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

              {/* ปุ่มเปิด/ปิด โหมด Heatmap Color-Coding (ตามคำขอ) */}
              <button
                type="button"
                onClick={() => setIsHeatmapActive(!isHeatmapActive)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] ${
                  isHeatmapActive
                    ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 text-slate-950 ring-2 ring-amber-300'
                    : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200'
                }`}
                title="คลิกเพื่อเปิดหรือปิดระบบสี Heatmap บนหมุดแผนที่"
              >
                <Flame className={`h-4 w-4 shrink-0 ${isHeatmapActive ? 'text-rose-950 animate-bounce' : 'text-slate-400'}`} />
                <span>{isHeatmapActive ? '🔥 ระบบ Heatmap: เปิดอยู่' : '📍 ระบบ Heatmap: ปิด (สีอำเภอ)'}</span>
              </button>

              {/* ปุ่มลัดซูมพิกัดตามอำเภอ */}
              <div className="flex items-center gap-1 bg-[#FFF9F5] dark:bg-[#251b1e] p-1 rounded-xl border border-[#33272A]/20 dark:border-[#FFD3B6]/20 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setMapCenter([19.3021, 97.9654]);
                    setMapZoom(9);
                    setMapAmphoeFilter('all');
                  }}
                  className="px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
                  title="ภาพรวมทั้งเขต"
                >
                  🗺️ ทั้งเขต
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMapCenter([19.3021, 97.9654]);
                    setMapZoom(11);
                    setMapAmphoeFilter('เมืองแม่ฮ่องสอน');
                  }}
                  className="px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  อ.เมือง
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMapCenter([18.8400, 97.9400]);
                    setMapZoom(11);
                    setMapAmphoeFilter('ขุนยวม');
                  }}
                  className="px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  อ.ขุนยวม
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMapCenter([19.3600, 98.4400]);
                    setMapZoom(11);
                    setMapAmphoeFilter('ปาย');
                  }}
                  className="px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  อ.ปาย
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMapCenter([19.5200, 98.2400]);
                    setMapZoom(11);
                    setMapAmphoeFilter('ปางมะผ้า');
                  }}
                  className="px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  อ.ปางมะผ้า
                </button>
              </div>
            </div>
          </div>

          {/* การ์ดสถิติ 4 ระดับ (คลิกที่การ์ดเพื่อกรองหมุดบนแผนที่ได้ทันที) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* ระดับ 1: เสถียรสูงมาก */}
            <div
              onClick={() => setStabilityFilter(stabilityFilter === 'optimal' ? 'all' : 'optimal')}
              className={`p-3 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                stabilityFilter === 'optimal'
                  ? 'bg-emerald-100 border-emerald-600 ring-2 ring-emerald-500 shadow-md dark:bg-emerald-950/60'
                  : 'bg-emerald-50/80 hover:bg-emerald-100/70 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  เสถียรภาพสูง
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-white dark:bg-emerald-900 px-1.5 py-0.5 rounded-md">
                  {stabilityStats.optimalPercent}%
                </span>
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black text-emerald-950 dark:text-emerald-100">
                  {stabilityStats.optimal} <span className="text-xs font-bold">แห่ง</span>
                </div>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium truncate mt-0.5">
                  {heatmapSystem === 'electricity' && 'สายส่ง PEA / Hybrid มีสำรอง'}
                  {heatmapSystem === 'internet' && 'สายใยแก้ว Fiber Optic เสถียรสูง'}
                  {heatmapSystem === 'water' && 'ประปาภาครัฐ / กปภ. / ท้องถิ่น'}
                </p>
              </div>
            </div>

            {/* ระดับ 2: เสถียรปานกลาง */}
            <div
              onClick={() => setStabilityFilter(stabilityFilter === 'moderate' ? 'all' : 'moderate')}
              className={`p-3 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                stabilityFilter === 'moderate'
                  ? 'bg-amber-100 border-amber-600 ring-2 ring-amber-500 shadow-md dark:bg-amber-950/60'
                  : 'bg-amber-50/80 hover:bg-amber-100/70 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  เสถียรปานกลาง
                </span>
                <span className="text-[10px] font-bold text-amber-700 bg-white dark:bg-amber-900 px-1.5 py-0.5 rounded-md">
                  {stabilityStats.moderatePercent}%
                </span>
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black text-amber-950 dark:text-amber-100">
                  {stabilityStats.moderate} <span className="text-xs font-bold">แห่ง</span>
                </div>
                <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium truncate mt-0.5">
                  {heatmapSystem === 'electricity' && 'โซลาร์เซลล์ + แบตเตอรี่สำรอง'}
                  {heatmapSystem === 'internet' && 'ดาวเทียม Satellite / IPSTAR'}
                  {heatmapSystem === 'water' && 'ระบบประปาภูเขา / ตาน้ำธรรมชาติ'}
                </p>
              </div>
            </div>

            {/* ระดับ 3: เสถียรต่ำ (เฝ้าระวัง) */}
            <div
              onClick={() => setStabilityFilter(stabilityFilter === 'low' ? 'all' : 'low')}
              className={`p-3 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                stabilityFilter === 'low'
                  ? 'bg-orange-100 border-orange-600 ring-2 ring-orange-500 shadow-md dark:bg-orange-950/60'
                  : 'bg-orange-50/80 hover:bg-orange-100/70 border-orange-300 dark:bg-orange-950/30 dark:border-orange-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-orange-800 dark:text-orange-300 flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                  เสถียรต่ำ
                </span>
                <span className="text-[10px] font-bold text-orange-700 bg-white dark:bg-orange-900 px-1.5 py-0.5 rounded-md">
                  {stabilityStats.lowPercent}%
                </span>
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black text-orange-950 dark:text-orange-100">
                  {stabilityStats.low} <span className="text-xs font-bold">แห่ง</span>
                </div>
                <p className="text-[10px] text-orange-700 dark:text-orange-300 font-medium truncate mt-0.5">
                  {heatmapSystem === 'electricity' && 'โซลาร์เซลล์ไม่มีแบตเตอรี่สำรอง'}
                  {heatmapSystem === 'internet' && 'เครือข่าย Cellular SIM 4G/5G'}
                  {heatmapSystem === 'water' && 'บ่อบาดาล / น้ำฝน / อื่นๆ เสี่ยงแล้ง'}
                </p>
              </div>
            </div>

            {/* ระดับ 4: วิกฤต */}
            <div
              onClick={() => setStabilityFilter(stabilityFilter === 'critical' ? 'all' : 'critical')}
              className={`p-3 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                stabilityFilter === 'critical'
                  ? 'bg-rose-100 border-rose-600 ring-2 ring-rose-500 shadow-md dark:bg-rose-950/60'
                  : 'bg-rose-50/80 hover:bg-rose-100/70 border-rose-300 dark:bg-rose-950/30 dark:border-rose-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-rose-800 dark:text-rose-300 flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  วิกฤต/ไม่มี
                </span>
                <span className="text-[10px] font-bold text-rose-700 bg-white dark:bg-rose-900 px-1.5 py-0.5 rounded-md">
                  {stabilityStats.criticalPercent}%
                </span>
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black text-rose-950 dark:text-rose-100">
                  {stabilityStats.critical} <span className="text-xs font-bold">แห่ง</span>
                </div>
                <p className="text-[10px] text-rose-700 dark:text-rose-300 font-medium truncate mt-0.5">
                  {heatmapSystem === 'electricity' && 'ไม่มีระบบไฟฟ้าถาวร'}
                  {heatmapSystem === 'internet' && 'ไม่มีสัญญาณอินเทอร์เน็ต'}
                  {heatmapSystem === 'water' && 'ไม่มีแหล่งน้ำประปาประจำ'}
                </p>
              </div>
            </div>
          </div>

          {/* ผังการทำงานหลัก: ฝั่งซ้าย Legend & Insights / ฝั่งขวา แผนที่ PigeonMap */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            {/* ซีกซ้าย: คำอธิบาย Heatmap & รายละเอียดโรงเรียนที่เลือก */}
            <div className="space-y-3.5">
              {/* แผงคำอธิบายสี Heatmap */}
              <div className="p-3.5 rounded-2xl bg-[#FFF9F5] dark:bg-[#1e1518] border-2 border-[#33272A]/20 dark:border-[#FFD3B6]/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-rose-500" />
                    <span>
                      {heatmapSystem === 'electricity' && 'เกณฑ์สี Heatmap เสถียรภาพไฟฟ้า'}
                      {heatmapSystem === 'internet' && 'เกณฑ์สี Heatmap คุณภาพเน็ต'}
                      {heatmapSystem === 'water' && 'เกณฑ์สี Heatmap ระบบน้ำประปา'}
                    </span>
                  </span>
                  {stabilityFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setStabilityFilter('all')}
                      className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      ล้างตัวกรอง
                    </button>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  {/* เขียว: เสถียรสูง */}
                  <div
                    onClick={() => setStabilityFilter(stabilityFilter === 'optimal' ? 'all' : 'optimal')}
                    className={`p-2 rounded-xl border transition cursor-pointer flex items-start gap-2.5 ${
                      stabilityFilter === 'optimal' ? 'bg-emerald-100 border-emerald-500 font-black' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-[#059669] text-white flex items-center justify-center shrink-0 shadow-xs text-[11px]">
                      ⚡
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-900 dark:text-emerald-200">🟢 สีเขียว: คุณภาพสูงมาก</span>
                        <span className="text-[10px] font-bold text-slate-500">90-100%</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {heatmapSystem === 'electricity' && 'ไฟฟ้าสายส่งถาวร (PEA) หรือระบบ Hybrid มีไฟสำรองฉุกเฉิน'}
                        {heatmapSystem === 'internet' && 'สายใยแก้วนำแสง Fiber Optic ความเร็วสูง เสถียร ไม่สะดุด'}
                        {heatmapSystem === 'water' && 'ประปาภาครัฐ / กปภ. / ท้องถิ่น มีการบำบัดน้ำได้มาตรฐาน'}
                      </p>
                    </div>
                  </div>

                  {/* เหลือง: ปานกลาง */}
                  <div
                    onClick={() => setStabilityFilter(stabilityFilter === 'moderate' ? 'all' : 'moderate')}
                    className={`p-2 rounded-xl border transition cursor-pointer flex items-start gap-2.5 ${
                      stabilityFilter === 'moderate' ? 'bg-amber-100 border-amber-500 font-black' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-[#eab308] text-slate-950 flex items-center justify-center shrink-0 shadow-xs text-[11px]">
                      ☀️
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-900 dark:text-amber-200">🟡 สีเหลือง: ปานกลาง</span>
                        <span className="text-[10px] font-bold text-slate-500">65%</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {heatmapSystem === 'electricity' && 'ระบบโซลาร์เซลล์พร้อมแบตเตอรี่สะสมพลังงาน ใช้งานกลางคืนได้'}
                        {heatmapSystem === 'internet' && 'สัญญาณจานดาวเทียม Satellite/IPSTAR เข้าถึงยอดดอยได้'}
                        {heatmapSystem === 'water' && 'ระบบประปาภูเขา / ตาน้ำธรรมชาติ มีน้ำใช้ตามฤดูกาล'}
                      </p>
                    </div>
                  </div>

                  {/* ส้ม: เสถียรต่ำ */}
                  <div
                    onClick={() => setStabilityFilter(stabilityFilter === 'low' ? 'all' : 'low')}
                    className={`p-2 rounded-xl border transition cursor-pointer flex items-start gap-2.5 ${
                      stabilityFilter === 'low' ? 'bg-orange-100 border-orange-500 font-black' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-[#f97316] text-white flex items-center justify-center shrink-0 shadow-xs text-[11px]">
                      ⚠️
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-orange-900 dark:text-orange-200">🟠 สีส้ม: ต่ำ / เฝ้าระวัง</span>
                        <span className="text-[10px] font-bold text-slate-500">40%</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {heatmapSystem === 'electricity' && 'โซลาร์เซลล์ไม่มีแบตเตอรี่สำรอง ไฟดับช่วงฟ้าปิดหรือหมอกหนา'}
                        {heatmapSystem === 'internet' && 'เครือข่ายมือถือ Cellular SIM 4G/5G ขอบสัญญาณจำกัด'}
                        {heatmapSystem === 'water' && 'บ่อขุด / บ่อบาดาล / น้ำฝน เสี่ยงขาดแคลนช่วงหน้าแล้ง'}
                      </p>
                    </div>
                  </div>

                  {/* แดง: วิกฤต */}
                  <div
                    onClick={() => setStabilityFilter(stabilityFilter === 'critical' ? 'all' : 'critical')}
                    className={`p-2 rounded-xl border transition cursor-pointer flex items-start gap-2.5 ${
                      stabilityFilter === 'critical' ? 'bg-rose-100 border-rose-500 font-black' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-[#ef4444] text-white flex items-center justify-center shrink-0 shadow-xs text-[11px]">
                      ❌
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-900 dark:text-rose-200">🔴 สีแดง: วิกฤต / ไม่มีใช้</span>
                        <span className="text-[10px] font-bold text-slate-500">15%</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {heatmapSystem === 'electricity' && 'ไม่มีระบบไฟฟ้าถาวร ต้องการการสนับสนุนแผงโซลาร์เร่งด่วน'}
                        {heatmapSystem === 'internet' && 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต ขาดแคลนสื่อการเรียนรู้'}
                        {heatmapSystem === 'water' && 'ไม่มีระบบน้ำประปาประจำ ต้องพึ่งพาน้ำแจกจ่าย'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* การ์ดแสดงข้อมูลโรงเรียนที่ถูกคลิกเลือกในแผนที่ (Selected School Details) */}
              {selectedHeatmapSchool ? (
                (() => {
                  const sInfo = getInfrastructureQuality(selectedHeatmapSchool, heatmapSystem);
                  const elecInfo = getElectricityStability(selectedHeatmapSchool);
                  const netInfo = getInternetQuality(selectedHeatmapSchool);
                  const waterInfo = getWaterQuality(selectedHeatmapSchool);
                  const ampName = selectedHeatmapSchool.amphoe || getAmphoeAndNetwork(selectedHeatmapSchool.id, selectedHeatmapSchool.name).amphoe;
                  return (
                    <div className="p-4 rounded-2xl bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[3px_3px_0px_#33272A] space-y-3 animate-fade-in">
                      <div className="flex items-start justify-between gap-2 border-b border-[#33272A]/10 dark:border-[#FFD3B6]/20 pb-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500">รหัส {selectedHeatmapSchool.id}</span>
                          <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] leading-tight">
                            {selectedHeatmapSchool.name}
                          </h3>
                          <span className="text-[11px] text-slate-600 dark:text-slate-300 font-bold">
                            อำเภอ{ampName}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedMapSchoolId('')}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>

                      {/* สถานะระบบตาม Layer ที่เลือก */}
                      <div className={`p-2.5 rounded-xl border ${sInfo.bgClass} space-y-1`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black flex items-center gap-1.5">
                            <span className="text-sm">{sInfo.icon}</span>
                            <span>{sInfo.title}</span>
                          </span>
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-white/70 dark:bg-black/30">
                            คะแนน {sInfo.score}%
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          {sInfo.description}
                        </p>
                      </div>

                      {/* สรุปย่อ 3 โครงสร้างพื้นฐานหลัก */}
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-wide">ภาพรวมสาธารณูปโภค 3 ระบบ:</div>
                        <div className="grid grid-cols-1 gap-1 text-[11px]">
                          <div className={`px-2 py-1 rounded-lg flex items-center justify-between border ${elecInfo.bgClass}`}>
                            <span className="font-bold flex items-center gap-1">⚡ ไฟฟ้า:</span>
                            <span className="font-black">{elecInfo.shortLabel}</span>
                          </div>
                          <div className={`px-2 py-1 rounded-lg flex items-center justify-between border ${netInfo.bgClass}`}>
                            <span className="font-bold flex items-center gap-1">🌐 เน็ต:</span>
                            <span className="font-black">{netInfo.shortLabel}</span>
                          </div>
                          <div className={`px-2 py-1 rounded-lg flex items-center justify-between border ${waterInfo.bgClass}`}>
                            <span className="font-bold flex items-center gap-1">🚰 น้ำประปา:</span>
                            <span className="font-black">{waterInfo.shortLabel}</span>
                          </div>
                        </div>
                      </div>

                      {/* ปุ่มกดดูรายละเอียดโรงเรียน */}
                      {onSelectSchool && (
                        <button
                          type="button"
                          onClick={() => onSelectSchool(selectedHeatmapSchool.id)}
                          className="w-full mt-2 py-2 px-3 rounded-xl bg-gradient-to-r from-[#FF8BA7] to-[#FFAAA5] text-[#33272A] border-2 border-[#33272A] font-black text-xs flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#33272A] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>ดูข้อมูลและสถิติเชิงลึกของโรงเรียนนี้</span>
                        </button>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="p-3.5 rounded-2xl bg-[#FFF9F5]/70 dark:bg-[#1e1518]/70 border-2 border-dashed border-[#33272A]/30 dark:border-[#FFD3B6]/30 text-center text-xs text-slate-500 dark:text-slate-400">
                  <MapPin className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                  <p className="font-bold text-[#33272A] dark:text-[#FFF9F5]">คลิกที่หมุดใดๆ ในแผนที่</p>
                  <p className="text-[11px]">เพื่อดูสเปกความเสถียรไฟฟ้า แหล่งจ่าย และรายละเอียดโครงสร้างพื้นฐาน</p>
                </div>
              )}

              {/* คำอธิบายสัญลักษณ์หมุดโหมดปกติ (Updated Pin Icons: เสาธงชาติ = โรงเรียนทั่วไป, โรงเรียนเล็ก = สาขา) */}
              <div className="bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] p-3 rounded-2xl space-y-2 text-[#33272A] dark:text-[#FFF9F5] text-xs">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  📍 สัญลักษณ์หมุด (เมื่อปิด Heatmap):
                </span>
                <div className="grid grid-cols-1 gap-2 text-[11px] font-bold">
                  {/* เสาธงชาติ: โรงเรียนทั่วไป */}
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 32 32" className="w-5 h-5 shrink-0 filter drop-shadow">
                      <ellipse cx="8" cy="29" rx="5" ry="2" fill="#0284c7" stroke="#0f172a" strokeWidth="0.8" />
                      <line x1="8" y1="3" x2="8" y2="29" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="8" cy="3" r="1.8" fill="#fbbf24" stroke="#d97706" strokeWidth="0.6" />
                      <g transform="translate(9, 4)">
                        <path d="M 0 0 C 6 2, 12 -1, 19 1 L 19 13 C 12 11, 6 14, 0 12 Z" fill="#ED1C24" />
                        <path d="M 0 2 C 6 4, 12 1, 19 3 L 19 11 C 12 9, 6 12, 0 10 Z" fill="#FFFFFF" />
                        <path d="M 0 4 C 6 6, 12 3, 19 5 L 19 9 C 12 7, 6 10, 0 8 Z" fill="#241D4F" />
                      </g>
                    </svg>
                    <span><strong>รูปเสาธงชาติ:</strong> โรงเรียนทั่วไป (ฐานสีตามอำเภอ)</span>
                  </div>

                  {/* โรงเรียนเล็ก: สาขา */}
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 32 32" className="w-5 h-5 shrink-0 filter drop-shadow">
                      <rect x="4" y="27" width="24" height="2.5" rx="1" fill="#475569" />
                      <rect x="6" y="14" width="20" height="13" rx="1" fill="#f43f5e" stroke="#1e293b" strokeWidth="1" />
                      <polygon points="16,5 4,14 28,14" fill="#e11d48" stroke="#9f1239" strokeWidth="1" />
                      <rect x="14" y="5" width="4" height="4" fill="#fef08a" stroke="#1e293b" strokeWidth="0.6" />
                      <polygon points="16,1 16,5 19,3" fill="#ef4444" />
                    </svg>
                    <span><strong>รูปโรงเรียนหลังเล็ก:</strong> ห้องเรียนสาขา (สาขา)</span>
                  </div>

                  {/* รูปดาว: เขตพื้นที่ */}
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 32 32" className="w-5 h-5 shrink-0 filter drop-shadow">
                      <polygon
                        points="16,1 19.8,10.6 30.1,11.5 22.4,18.3 24.7,28.3 16,23.1 7.3,28.3 9.6,18.3 1.9,11.5 12.2,10.6"
                        fill="#fbbf24"
                        stroke="#b45309"
                        strokeWidth="1.2"
                      />
                    </svg>
                    <span><strong>รูปดาวทอง:</strong> สำนักงานเขตพื้นที่การศึกษา</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ซีกขวา: แผนที่ PigeonMap แสดงหมุดแบบ Heatmap Color-Coding */}
            <div className="lg:col-span-2 min-w-0">
              <div className="relative overflow-hidden rounded-2xl border-2 border-[#33272A] bg-slate-100 dark:bg-[#150e10] shadow-[4px_4px_0px_#33272A] dark:border-[#FFD3B6] dark:shadow-none h-[420px] sm:h-[480px]">
                {/* ปุ่มควบคุมการซูมแบบแตะครั้งเดียว (Single-tap Zoom Controls) */}
                <div className="absolute top-3 right-3 z-30 flex flex-col gap-1.5 shadow-md">
                  <button
                    type="button"
                    onClick={() => setMapZoom(prev => Math.min(prev + 1, 18))}
                    className="w-8 h-8 rounded-lg bg-white/95 dark:bg-slate-800/95 border-2 border-[#33272A] dark:border-[#FFD3B6] text-slate-800 dark:text-slate-100 font-black text-base flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
                    title="ซูมเข้า (+)"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapZoom(prev => Math.max(prev - 1, 6))}
                    className="w-8 h-8 rounded-lg bg-white/95 dark:bg-slate-800/95 border-2 border-[#33272A] dark:border-[#FFD3B6] text-slate-800 dark:text-slate-100 font-black text-base flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
                    title="ซูมออก (-)"
                  >
                    -
                  </button>
                </div>

                {/* แถบปลดล็อกแผนที่บนมือถือ ป้องกันปัญหานิ้วติดแผนที่เลื่อนหน้าจอไม่ได้ */}
                <div className="sm:hidden absolute top-3 left-3 z-30">
                  <button
                    type="button"
                    onClick={() => setIsMobileMapInteractive(!isMobileMapInteractive)}
                    className={`px-2.5 py-1.5 rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] text-[10px] font-black shadow-xs flex items-center gap-1.5 transition-all ${
                      isMobileMapInteractive
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-white/95 dark:bg-slate-800/95 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {isMobileMapInteractive ? '🔒 ล็อก (เพื่อเลื่อนหน้าจอต่อ)' : '👆 แตะเพื่อเลื่อนแผนที่'}
                  </button>
                </div>

                {/* Container for PigeonMap with mobile touch protection */}
                <div className={`w-full h-full ${!isMobileMapInteractive ? 'sm:pointer-events-auto pointer-events-none' : ''}`}>
                  <PigeonMap
                    center={mapCenter}
                    zoom={mapZoom}
                    onBoundsChanged={({ center, zoom }) => {
                      setMapCenter(center);
                      setMapZoom(zoom);
                    }}
                  >
                    {/* วาดหมุดสถานศึกษาตามโหมด Heatmap หรือ โหมดปกติ */}
                    {heatmapSchools.map(school => {
                      const lat = Number(school.latitude) || 19.3021;
                      const lng = Number(school.longitude) || 97.9654;
                      const isSelected = selectedMapSchoolId === school.id;
                      const stabInfo = getInfrastructureQuality(school, heatmapSystem);

                      const ampName = school.amphoe || getAmphoeAndNetwork(school.id, school.name).amphoe || '';
                      let standardPinColor = '#0284c7';
                      if (ampName.includes('เมือง')) standardPinColor = '#0284c7';
                      else if (ampName.includes('ขุนยวม')) standardPinColor = '#f43f5e';
                      else if (ampName.includes('ปาย')) standardPinColor = '#f59e0b';
                      else if (ampName.includes('ปางมะผ้า')) standardPinColor = '#8b5cf6';

                      const isKhet = school.name.includes('เขตพื้นที่');
                      const isBranch = school.name.includes('สาขา') || (school as any).isRemoteBranch;

                      return (
                        <PigeonOverlay
                          key={school.id}
                          anchor={[lat, lng]}
                          offset={[isSelected ? 16 : 14, isSelected ? 32 : 28]}
                        >
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMapSchoolId(school.id);
                            }}
                            className={`relative cursor-pointer flex flex-col items-center select-none transition-transform duration-150 ${
                              isSelected ? 'z-50 scale-125' : 'z-20 hover:scale-125 hover:z-40'
                            }`}
                            title={`${school.name}: ${stabInfo.title} (อำเภอ${ampName})`}
                          >
                            {isHeatmapActive ? (
                              /* โหมด Heatmap Color-Coding: หมุดสีตามความเสถียรพร้อมรัศมีออร่า */
                              <div className="relative flex flex-col items-center">
                                {/* Heatmap Radiating Aura Halo */}
                                <div
                                  className={`absolute rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2 ${
                                    stabInfo.level === 'critical' || stabInfo.level === 'low'
                                      ? 'animate-pulse'
                                      : ''
                                  }`}
                                  style={{
                                    width: isSelected ? '56px' : '40px',
                                    height: isSelected ? '56px' : '40px',
                                    left: '50%',
                                    top: '40%',
                                    background: `radial-gradient(circle, ${stabInfo.glowColor} 0%, ${stabInfo.glowColor.replace('0.65', '0.15')} 55%, transparent 75%)`,
                                    filter: 'blur(2px)',
                                  }}
                                />

                                {/* Borderless Heatmap Pin Body */}
                                <div
                                  className="relative flex items-center justify-center rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-all"
                                  style={{
                                    width: isSelected ? '28px' : '23px',
                                    height: isSelected ? '28px' : '23px',
                                    backgroundColor: stabInfo.color,
                                    border: isSelected ? '2px solid #ffffff' : '1.5px solid rgba(255,255,255,0.7)',
                                  }}
                                >
                                  <span className="text-[11px] leading-none select-none text-white font-black drop-shadow-sm">
                                    {stabInfo.icon}
                                  </span>
                                </div>

                                {/* Heatmap Pin Pointer Tip */}
                                <div
                                  className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] -mt-[1px]"
                                  style={{ borderTopColor: stabInfo.color }}
                                />

                                {/* Selected ping ring */}
                                {isSelected && (
                                  <div className="w-3.5 h-1 bg-[#FF8BA7] rounded-full blur-[1px] animate-ping -mt-0.5" />
                                )}
                              </div>
                            ) : (
                              /* โหมดปกติ: หมุดตามอำเภอและสัญลักษณ์สถานศึกษาแบบไร้กรอบ */
                              isKhet ? (
                                /* สำนักงานเขตพื้นที่: รูปดาวทอง */
                                <svg
                                  viewBox="0 0 32 32"
                                  className="w-7 h-7 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                                >
                                  <polygon
                                    points="16,1 19.8,10.6 30.1,11.5 22.4,18.3 24.7,28.3 16,23.1 7.3,28.3 9.6,18.3 1.9,11.5 12.2,10.6"
                                    fill="#fbbf24"
                                    stroke="#b45309"
                                    strokeWidth="1.2"
                                  />
                                  <polygon
                                    points="16,4 18.7,11.4 26,12.1 20.5,16.8 22.1,23.9 16,20.2 9.9,23.9 11.5,16.8 6,12.1 13.3,11.4"
                                    fill="#fef08a"
                                  />
                                </svg>
                              ) : isBranch ? (
                                /* ห้องเรียนสาขา: รูปโรงเรียนเล็กๆ (ตามคำขอ) */
                                <svg
                                  viewBox="0 0 32 32"
                                  className="w-7 h-7 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                                >
                                  <rect x="4" y="27" width="24" height="2.5" rx="1" fill="#475569" />
                                  <rect x="6" y="14" width="20" height="13" rx="1" fill={standardPinColor} stroke="#1e293b" strokeWidth="1" />
                                  <polygon points="16,5 4,14 28,14" fill="#e11d48" stroke="#9f1239" strokeWidth="1" />
                                  <rect x="14" y="5" width="4" height="4" fill="#fef08a" stroke="#1e293b" strokeWidth="0.6" />
                                  <polygon points="16,1 16,5 19,3" fill="#ef4444" />
                                  <rect x="8.5" y="16.5" width="3" height="3.5" rx="0.5" fill="#ffffff" stroke="#1e293b" strokeWidth="0.6" />
                                  <rect x="20.5" y="16.5" width="3" height="3.5" rx="0.5" fill="#ffffff" stroke="#1e293b" strokeWidth="0.6" />
                                  <rect x="13.5" y="18" width="5" height="9" rx="0.6" fill="#1e293b" />
                                </svg>
                              ) : (
                                /* โรงเรียนทั่วไป: รูปเสาธงชาติไทย (ตามคำขอ) */
                                <svg
                                  viewBox="0 0 32 32"
                                  className="w-7 h-7 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                                >
                                  <ellipse cx="8" cy="29" rx="5" ry="2" fill={standardPinColor} stroke="#0f172a" strokeWidth="0.8" />
                                  <line x1="8" y1="3" x2="8" y2="29" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                                  <line x1="7.5" y1="3" x2="7.5" y2="29" stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" />
                                  <circle cx="8" cy="3" r="1.8" fill="#fbbf24" stroke="#d97706" strokeWidth="0.6" />
                                  <g transform="translate(9, 4)">
                                    <path d="M 0 0 C 6 2, 12 -1, 19 1 L 19 13 C 12 11, 6 14, 0 12 Z" fill="#ED1C24" />
                                    <path d="M 0 2 C 6 4, 12 1, 19 3 L 19 11 C 12 9, 6 12, 0 10 Z" fill="#FFFFFF" />
                                    <path d="M 0 4 C 6 6, 12 3, 19 5 L 19 9 C 12 7, 6 10, 0 8 Z" fill="#241D4F" />
                                  </g>
                                </svg>
                              )
                            )}
                          </div>
                        </PigeonOverlay>
                      );
                    })}

                    {/* ป้ายชื่อและสถานะลอยบนหัวหมุดที่ถูกเลือก */}
                    {selectedHeatmapSchool && (
                      <PigeonOverlay
                        anchor={[Number(selectedHeatmapSchool.latitude) || 19.3021, Number(selectedHeatmapSchool.longitude) || 97.9654]}
                        offset={[0, -38]}
                      >
                        <div className="bg-[#FFF9F5] border-2 border-[#33272A] px-2.5 py-1.5 rounded-xl text-[10px] font-black text-[#33272A] shadow-[2px_2px_0px_#33272A] dark:bg-[#1e1518] dark:text-[#FFF9F5] whitespace-nowrap z-50 flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span>📍 {selectedHeatmapSchool.name}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${getInfrastructureQuality(selectedHeatmapSchool, heatmapSystem).badgeClass}`}>
                              {getInfrastructureQuality(selectedHeatmapSchool, heatmapSystem).shortLabel}
                            </span>
                          </div>
                          <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
                            อำเภอ{selectedHeatmapSchool.amphoe || getAmphoeAndNetwork(selectedHeatmapSchool.id, selectedHeatmapSchool.name).amphoe} • คลิกดูข้อมูลด้านซ้าย
                          </div>
                        </div>
                      </PigeonOverlay>
                    )}
                  </PigeonMap>
                </div>

                {/* แถบคำแนะนำการใช้งานแผนที่ */}
                <div className="absolute bottom-2 left-2 right-2 bg-white/90 dark:bg-black/80 backdrop-blur-xs px-2.5 py-1 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center justify-between pointer-events-none">
                  <span>💡 ใช้ลูกกลิ้งเมาส์เพื่อซูมเข้า-ออก หรือลากแผนที่เพื่อเลื่อนดูตำแหน่งสถานศึกษา</span>
                  <span className="text-amber-700 dark:text-amber-300">
                    แสดงหมุด {heatmapSchools.length} แห่ง
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        """

dash_text = dash_text[:old_map_card_start_idx] + new_heatmap_markup + dash_text[old_map_end_idx:]

with open(dashboard_path, 'w', encoding='utf-8') as f:
    f.write(dash_text)
print('✅ Finished replacing map in DashboardView.tsx!')
