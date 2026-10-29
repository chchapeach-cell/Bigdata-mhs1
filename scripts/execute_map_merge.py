import re

# 1. Update InfrastructureView.tsx
infra_path = 'src/components/InfrastructureView.tsx'
with open(infra_path, 'r', encoding='utf-8') as f:
    infra_text = f.read()

map_start = infra_text.find('{/* 🗺️ ส่วนแผนที่ฮีตแมปเสถียรภาพระบบไฟฟ้า')
filter_start = infra_text.find('{/* Control Filter Bar (กรองเอาข้อมูลไหน หรือ ไม่เอาข้อมูลไหน) */}')

if map_start != -1 and filter_start != -1:
    banner = """{/* 💡 แบนเนอร์แจ้งการรวมแผนที่ GIS Heatmap Visualization ไว้ที่หน้าภาพรวมระบบ */}
      <div className="card p-4 sm:p-5 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 dark:from-[#251a1d] dark:via-[#1e1518] dark:to-[#251a1d] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[4px_4px_0px_#33272A] dark:shadow-none flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center border-2 border-[#33272A] shadow-xs shrink-0 text-lg">
            🗺️
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
              <span>แผนที่สารสนเทศ GIS Heatmap Visualization รวมอยู่ในหน้า "ภาพรวมระบบ" แล้ว</span>
            </h3>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-0.5">
              สามารถเปิดดูการกระจายตัวของสถานศึกษา สลับดูฮีตแมป ⚡ ไฟฟ้า, 🌐 อินเทอร์เน็ต, 🚰 น้ำประปา ได้ครบวงจรในหน้าแรก
            </p>
          </div>
        </div>
      </div>\n\n      """
    infra_text = infra_text[:map_start] + banner + infra_text[filter_start:]
    with open(infra_path, 'w', encoding='utf-8') as f:
        f.write(infra_text)
    print('✅ Cleaned up InfrastructureView.tsx (removed map block)')
else:
    print('⚠️ map_start or filter_start not found in InfrastructureView.tsx')


# 2. Update DashboardView.tsx
dash_path = 'src/components/DashboardView.tsx'
with open(dash_path, 'r', encoding='utf-8') as f:
    dash_text = f.read()

# Make sure imports are present
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

# Check and add states in DashboardView
state_marker = "const [mapInfraFilter, setMapInfraFilter]"
if 'const [heatmapSystem, setHeatmapSystem]' not in dash_text:
    new_states = """const [heatmapSystem, setHeatmapSystem] = useState<HeatmapSystemType>('electricity');
  const [isHeatmapActive, setIsHeatmapActive] = useState<boolean>(true);
  const [stabilityFilter, setStabilityFilter] = useState<'all' | InfrastructureQualityLevel>('all');
  const [isMobileMapInteractive, setIsMobileMapInteractive] = useState<boolean>(false);
  """
    dash_text = dash_text.replace(state_marker, new_states + state_marker, 1)

# Check and add stabilityStats and heatmapSchools logic
if 'const stabilityStats = useMemo(' not in dash_text:
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
    dash_text = dash_text.replace("return (\n    <div className=", stats_logic + "\n  return (\n    <div className=", 1)

# Now replace map block in DashboardView
idx1 = dash_text.find('แผนที่ตั้งและพิกัดภูมิศาสตร์')
if idx1 != -1:
    card_start = dash_text.rfind('<div className="card', 0, idx1)
    next_section = dash_text.find('{/* 2. กรอบสารสนเทศโครงสร้างพื้นฐานสถานศึกษา', idx1)

    with open('scripts/merge_heatmap_dashboard.py', 'r') as mf:
        content_mf = mf.read()
        s_marker = 'new_heatmap_markup = """'
        e_marker = '"""\n\ndash_text ='
        h_start = content_mf.find(s_marker) + len(s_marker)
        h_end = content_mf.find(e_marker)
        heatmap_markup = content_mf[h_start:h_end]

    dash_text = dash_text[:card_start] + heatmap_markup + dash_text[next_section:]
    with open(dash_path, 'w', encoding='utf-8') as f:
        f.write(dash_text)
    print('✅ Successfully integrated GIS Heatmap into DashboardView.tsx!')
else:
    print('⚠️ แผนที่ตั้งและพิกัดภูมิศาสตร์ not found in DashboardView.tsx')
