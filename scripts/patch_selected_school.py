file_path = 'src/components/InfrastructureView.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace getElectricityStability with getInfrastructureQuality for selectedMapSchool
target = '''                (() => {
                  const sInfo = getElectricityStability(selectedMapSchool);
                  const ampName = selectedMapSchool.amphoe || getAmphoeAndNetwork(selectedMapSchool.id, selectedMapSchool.name).amphoe;
                  return (
                    <div className="p-4 rounded-2xl bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[3px_3px_0px_#33272A] space-y-3 animate-fade-in">
                      <div className="flex items-start justify-between gap-2 border-b border-[#33272A]/10 dark:border-[#FFD3B6]/20 pb-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500">รหัส {selectedMapSchool.id}</span>
                          <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] leading-tight">
                            {selectedMapSchool.name}
                          </h3>
                          <span className="text-[11px] text-slate-600 dark:text-slate-300 font-bold">
                            อำเภอ{ampName}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedMapSchoolId(null)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1"
                        >
                          ✕
                        </button>
                      </div>

                      {/* สถานะความเสถียรไฟฟ้า */}
                      <div className={`p-2.5 rounded-xl border ${sInfo.bgClass} space-y-1`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black flex items-center gap-1.5">
                            <span className="text-sm">{sInfo.icon}</span>
                            <span>{sInfo.title}</span>
                          </span>
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-white/70 dark:bg-black/30">
                            ความเสถียร {sInfo.score}%
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          {sInfo.description}
                        </p>
                      </div>'''

replacement = '''                (() => {
                  const sInfo = getInfrastructureQuality(selectedMapSchool, heatmapSystem);
                  const elecInfo = getElectricityStability(selectedMapSchool);
                  const netInfo = getInternetQuality(selectedMapSchool);
                  const waterInfo = getWaterQuality(selectedMapSchool);
                  const ampName = selectedMapSchool.amphoe || getAmphoeAndNetwork(selectedMapSchool.id, selectedMapSchool.name).amphoe;
                  return (
                    <div className="p-4 rounded-2xl bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[3px_3px_0px_#33272A] space-y-3 animate-fade-in">
                      <div className="flex items-start justify-between gap-2 border-b border-[#33272A]/10 dark:border-[#FFD3B6]/20 pb-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500">รหัส {selectedMapSchool.id}</span>
                          <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] leading-tight">
                            {selectedMapSchool.name}
                          </h3>
                          <span className="text-[11px] text-slate-600 dark:text-slate-300 font-bold">
                            อำเภอ{ampName}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedMapSchoolId(null)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1"
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
                      </div>'''

if target in text:
    text = text.replace(target, replacement, 1)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(text)
    print("✅ Successfully updated selectedMapSchool inspector details!")
else:
    print("⚠️ Target not found in InfrastructureView.tsx")
