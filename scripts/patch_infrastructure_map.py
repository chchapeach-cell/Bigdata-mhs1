file_path = 'src/components/InfrastructureView.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add state isMobileMapInteractive
old_state = "const [isHeatmapActive, setIsHeatmapActive] = useState<boolean>(true); // ปุ่มเปิด/ปิดระบบ Heatmap Color-Coding"
new_state = """const [isHeatmapActive, setIsHeatmapActive] = useState<boolean>(true); // ปุ่มเปิด/ปิดระบบ Heatmap Color-Coding
  const [isMobileMapInteractive, setIsMobileMapInteractive] = useState<boolean>(false); // ป้องกัน Map Scroll Trap บนมือถือ"""
text = text.replace(old_state, new_state, 1)

# 2. Add Touch controls & Zoom in/out overlay in PigeonMap container
old_map_container = '''              {/* กรอบแผนที่และคอนโทรลเลอร์ */}
              <div className="relative overflow-hidden rounded-2xl border-2 border-[#33272A] bg-slate-100 dark:bg-[#150e10] shadow-[4px_4px_0px_#33272A] dark:border-[#FFD3B6] dark:shadow-none h-[420px] sm:h-[480px]">
                <PigeonMap'''

new_map_container = '''              {/* กรอบแผนที่และคอนโทรลเลอร์ (รองรับ Mobile Scroll Protection & Single-tap Zoom) */}
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

                {/* Overlay บล็อกการสัมผัสแผนที่บนมือถือหากยังไม่ปลดล็อก */}
                <div className={`w-full h-full ${!isMobileMapInteractive ? 'sm:pointer-events-auto pointer-events-none' : ''}`}>
                <PigeonMap'''

text = text.replace(old_map_container, new_map_container, 1)

# Close the wrapper div right after PigeonMap
old_map_close = '</PigeonMap>'
new_map_close = '</PigeonMap>\n                </div>'
text = text.replace(old_map_close, new_map_close, 1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print('✅ Successfully added mobile touch protection and single-tap zoom to PigeonMap!')
