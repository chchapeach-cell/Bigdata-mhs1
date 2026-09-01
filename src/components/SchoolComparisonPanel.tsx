import React, { useState, useMemo } from 'react';
import { School, StudentData } from '../types';
import { 
  Users, 
  Building2, 
  Zap, 
  ZapOff, 
  Wifi, 
  WifiOff, 
  Globe, 
  Radio, 
  Smartphone, 
  Droplets, 
  Sparkles, 
  Search, 
  X, 
  Plus, 
  SlidersHorizontal, 
  RotateCcw, 
  ArrowRight, 
  MapPin, 
  Scale, 
  Phone, 
  BookOpen, 
  Layers, 
  Award, 
  HelpCircle,
  Eye,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { getAmphoeAndNetwork, getSchoolSize, getSchoolSizeLabel } from '../utils/initialData';

interface SchoolComparisonPanelProps {
  schools: School[];
  studentData?: StudentData[];
  academicYear: string;
  onSelectSchool?: (id: string) => void;
  isDarkMode?: boolean;
}

export default function SchoolComparisonPanel({
  schools,
  studentData = [],
  academicYear,
  onSelectSchool,
  isDarkMode = false
}: SchoolComparisonPanelProps) {
  // รหัสโรงเรียนที่เลือกสำหรับเปรียบเทียบ (ค่าเริ่มต้นเลือก 2-3 โรงเรียนตัวอย่างที่มีลักษณะแตกต่างกัน)
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>(() => {
    if (schools.length >= 3) {
      // พยายามเลือกโรงเรียนขนาดใหญ่ 1 แห่ง, ขนาดเล็ก 1 แห่ง, และขยายโอกาส 1 แห่ง
      const large = schools.find(s => s.size === 'large' || s.size === 'medium');
      const small = schools.find(s => s.size === 'small' && s.id !== large?.id);
      const solarOrRemote = schools.find(s => (s.electricity === 'solar' || s.internetType === 'satellite') && s.id !== large?.id && s.id !== small?.id);
      
      const defaults = [large, small, solarOrRemote].filter(Boolean).map(s => s!.id);
      if (defaults.length >= 2) return defaults.slice(0, 3);
      return schools.slice(0, 3).map(s => s.id);
    }
    return schools.slice(0, 2).map(s => s.id);
  });

  // สถานะค้นหาและตัวกรอง
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [amphoeFilter, setAmphoeFilter] = useState<string>('all');
  const [highlightDiff, setHighlightDiff] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<'all' | 'students_staff' | 'utilities' | 'management'>('all');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // รายชื่ออำเภอทั้งหมด
  const amphoeList = useMemo(() => {
    const set = new Set<string>();
    schools.forEach(s => {
      const amp = s.amphoe || getAmphoeAndNetwork(s.id, s.name).amphoe;
      if (amp) set.add(amp);
    });
    return Array.from(set).sort();
  }, [schools]);

  // ค้นหาโรงเรียนที่สามารถเพิ่มได้
  const searchableSchools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return schools.filter(s => {
      const isAlreadySelected = selectedSchoolIds.includes(s.id);
      if (isAlreadySelected) return false;

      const amp = s.amphoe || getAmphoeAndNetwork(s.id, s.name).amphoe;
      if (amphoeFilter !== 'all' && amp !== amphoeFilter) return false;

      if (!q) return true;
      const net = s.networkGroup || getAmphoeAndNetwork(s.id, s.name).networkGroup;
      return (
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        amp.toLowerCase().includes(q) ||
        net.toLowerCase().includes(q) ||
        (s.directorName && s.directorName.toLowerCase().includes(q))
      );
    });
  }, [schools, selectedSchoolIds, searchQuery, amphoeFilter]);

  // โรงเรียนที่ถูกเลือกมาเปรียบเทียบ
  const compareSchools = useMemo(() => {
    return selectedSchoolIds
      .map(id => schools.find(s => s.id === id))
      .filter((s): s is School => Boolean(s));
  }, [schools, selectedSchoolIds]);

  // ฟังก์ชันเพิ่มโรงเรียนเข้าตารางเปรียบเทียบ (สูงสุด 4 แห่ง)
  const addSchool = (id: string) => {
    if (selectedSchoolIds.includes(id)) return;
    if (selectedSchoolIds.length >= 4) {
      alert('คุณสามารถเปรียบเทียบโรงเรียนพร้อมกันได้สูงสุด 4 แห่ง เพื่อความสะดวกในการอ่านข้อมูล');
      return;
    }
    setSelectedSchoolIds(prev => [...prev, id]);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  // ฟังก์ชันลบโรงเรียนออก
  const removeSchool = (id: string) => {
    setSelectedSchoolIds(prev => prev.filter(item => item !== id));
  };

  // พรีเซ็ตการเลือกด่วน
  const applyPreset = (type: 'sizes' | 'remote' | 'solar' | 'fiber' | 'random' | 'amphoe_mueang' | 'amphoe_pai' | 'amphoe_khunyuam' | 'amphoe_pangmapha') => {
    if (type === 'sizes') {
      const small = schools.find(s => s.size === 'small');
      const med = schools.find(s => s.size === 'medium');
      const large = schools.find(s => s.size === 'large');
      const chosen = [small, med, large].filter(Boolean).map(s => s!.id);
      if (chosen.length > 0) setSelectedSchoolIds(chosen);
    } else if (type === 'remote') {
      const remote = schools.filter(s => s.electricity === 'solar' || s.internetType === 'satellite' || (s.classrooms && s.classrooms.length > 0)).slice(0, 3);
      if (remote.length > 0) setSelectedSchoolIds(remote.map(s => s.id));
    } else if (type === 'solar') {
      const solarSchools = schools.filter(s => s.electricity === 'solar' || String(s.electricity).includes('solar')).slice(0, 3);
      if (solarSchools.length > 0) setSelectedSchoolIds(solarSchools.map(s => s.id));
    } else if (type === 'fiber') {
      const fiberSchools = schools.filter(s => s.internetType === 'fiber').slice(0, 3);
      if (fiberSchools.length > 0) setSelectedSchoolIds(fiberSchools.map(s => s.id));
    } else if (type === 'amphoe_mueang') {
      const list = schools.filter(s => (s.amphoe || getAmphoeAndNetwork(s.id, s.name).amphoe).includes('เมือง')).slice(0, 3);
      if (list.length > 0) setSelectedSchoolIds(list.map(s => s.id));
    } else if (type === 'amphoe_pai') {
      const list = schools.filter(s => (s.amphoe || getAmphoeAndNetwork(s.id, s.name).amphoe).includes('ปาย')).slice(0, 3);
      if (list.length > 0) setSelectedSchoolIds(list.map(s => s.id));
    } else if (type === 'amphoe_khunyuam') {
      const list = schools.filter(s => (s.amphoe || getAmphoeAndNetwork(s.id, s.name).amphoe).includes('ขุนยวม')).slice(0, 3);
      if (list.length > 0) setSelectedSchoolIds(list.map(s => s.id));
    } else if (type === 'amphoe_pangmapha') {
      const list = schools.filter(s => (s.amphoe || getAmphoeAndNetwork(s.id, s.name).amphoe).includes('ปางมะผ้า')).slice(0, 3);
      if (list.length > 0) setSelectedSchoolIds(list.map(s => s.id));
    } else if (type === 'random') {
      const shuffled = [...schools].sort(() => 0.5 - Math.random());
      setSelectedSchoolIds(shuffled.slice(0, 3).map(s => s.id));
    }
  };

  // Helper คำนวณความแตกต่างเพื่อทำ Diff Highlight
  const isDiff = (values: any[]) => {
    if (values.length <= 1) return false;
    const strVals = values.map(v => String(v ?? '').trim().toLowerCase());
    return new Set(strVals).size > 1;
  };

  // สถิติและค่าสูงสุดสำหรับทำ Relative Bar Comparison
  const maxStudents = useMemo(() => {
    if (compareSchools.length === 0) return 100;
    return Math.max(...compareSchools.map(s => s.studentCount || 0), 10);
  }, [compareSchools]);

  const maxStaff = useMemo(() => {
    if (compareSchools.length === 0) return 20;
    return Math.max(...compareSchools.map(s => s.staffCount || 0), 5);
  }, [compareSchools]);

  // ฟังก์ชันช่วยเหลือจัดรูปแบบสไตล์ตารางตาม Diff
  const getRowClass = (diff: boolean) => {
    if (highlightDiff && diff && compareSchools.length > 1) {
      return 'bg-amber-50/70 dark:bg-amber-950/30 transition-colors border-l-4 border-l-amber-500';
    }
    return 'hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors';
  };

  const getHeaderCellClass = (diff: boolean) => {
    if (highlightDiff && diff && compareSchools.length > 1) {
      return 'bg-amber-100/80 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 font-bold';
    }
    return 'bg-[#FFF9F5] dark:bg-[#1a1215] text-[#33272A] dark:text-[#FFF9F5] font-bold';
  };

  return (
    <div className="card p-5 sm:p-7 space-y-6 border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[4px_4px_0px_#33272A] dark:shadow-none bg-[#FFFFFE] dark:bg-[#1e1518] rounded-3xl animate-fadeIn">
      {/* 1. Header & Title Panel */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b-2 border-[#33272A]/10 dark:border-[#FFD3B6]/10 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-[#A0E7E5] text-[#33272A] border-2 border-[#33272A] flex items-center gap-1 shadow-2xs">
              <Scale className="h-3.5 w-3.5" />
              School Comparison Panel
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              ประจำปีการศึกษา {academicYear}
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-500" />
            เปรียบเทียบข้อมูลสถานศึกษาแบบเคียงข้างกัน (Side-by-Side)
          </h3>
          <p className="text-xs text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-semibold max-w-3xl">
            เลือกโรงเรียน 2 - 4 แห่งเพื่อเปรียบเทียบข้อมูลสาธารณูปโภค (ไฟฟ้า, เน็ต, น้ำ), จำนวนนักเรียน, ครูผู้สอน และอัตราส่วนบุคลากรอย่างแม่นยำ
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Highlight Diff Toggle */}
          <button
            onClick={() => setHighlightDiff(!highlightDiff)}
            className={`px-3 py-2 rounded-xl text-xs font-black border-2 border-[#33272A] dark:border-[#FFD3B6] flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
              highlightDiff
                ? 'bg-amber-300 text-amber-950 dark:bg-amber-500 dark:text-slate-950'
                : 'bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
            title="ไฮไลต์แถวที่มีข้อมูลแตกต่างกันอย่างชัดเจน"
          >
            <Sparkles className="h-4 w-4 text-amber-700 dark:text-slate-950" />
            <span>{highlightDiff ? 'ไฮไลต์จุดต่าง (เปิด)' : 'ไฮไลต์จุดต่าง (ปิด)'}</span>
          </button>

          {/* Clear All */}
          {selectedSchoolIds.length > 0 && (
            <button
              onClick={() => setSelectedSchoolIds([])}
              className="px-3 py-2 rounded-xl text-xs font-black border-2 border-[#33272A] dark:border-[#FFD3B6] bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-800 dark:text-rose-200 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>ล้างการเลือก ({selectedSchoolIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. School Search & Quick Selection Row */}
      <div className="space-y-3 bg-[#FFF9F5]/70 dark:bg-slate-900/50 p-4 rounded-2xl border-2 border-[#33272A]/10 dark:border-slate-800">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Box with Autocomplete Dropdown */}
          <div className="relative flex-1">
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อโรงเรียน, รหัส 8 หลัก, อำเภอ เพื่อเพิ่มในตารางเปรียบเทียบ..."
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border-2 border-[#33272A] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-bold text-[#33272A] dark:text-[#FFF9F5] outline-none shadow-2xs focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Dropdown Suggestions */}
            {isSearchOpen && (
              <>
                <div 
                  className="fixed inset-0 z-20" 
                  onClick={() => setIsSearchOpen(false)} 
                />
                <div className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-72 overflow-y-auto bg-white dark:bg-slate-900 border-2 border-[#33272A] dark:border-slate-700 rounded-2xl shadow-xl divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold text-slate-500 flex items-center justify-between px-3">
                    <span>เลือกโรงเรียนเพื่อเพิ่มในตาราง (สามารถเลือกได้สูงสุด 4 แห่ง)</span>
                    <span>พบ {searchableSchools.length} แห่ง</span>
                  </div>
                  {searchableSchools.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 font-bold">
                      ไม่พบโรงเรียนที่ตรงกับคำค้นหา หรือถูกเลือกครบแล้ว
                    </div>
                  ) : (
                    searchableSchools.slice(0, 15).map(s => {
                      const amp = s.amphoe || getAmphoeAndNetwork(s.id, s.name).amphoe;
                      return (
                        <div
                          key={s.id}
                          onClick={() => addSchool(s.id)}
                          className="p-3 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer flex items-center justify-between gap-2 transition-colors group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-7 w-7 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-200 flex items-center justify-center font-mono text-[10px] font-black shrink-0">
                              {s.id.slice(-3)}
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] group-hover:text-indigo-600 truncate">
                                {s.name}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <span>อ.{amp}</span>
                                <span>•</span>
                                <span>นร. {s.studentCount} คน</span>
                                <span>•</span>
                                <span>ครู {s.staffCount} คน</span>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="px-2.5 py-1 rounded-lg bg-[#33272A] text-[#FFF9F5] dark:bg-[#FFD3B6] dark:text-[#33272A] text-[10px] font-black flex items-center gap-1 shrink-0 group-hover:scale-105 transition-transform"
                          >
                            <Plus className="h-3 w-3" />
                            <span>เพิ่ม</span>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>

          {/* Filter by Amphoe */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-rose-500" />
              อำเภอ:
            </span>
            <select
              value={amphoeFilter}
              onChange={(e) => setAmphoeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border-2 border-[#33272A] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5] outline-none cursor-pointer"
            >
              <option value="all">ทุกอำเภอ ({schools.length})</option>
              {amphoeList.map(amp => {
                const count = schools.filter(s => (s.amphoe || getAmphoeAndNetwork(s.id, s.name).amphoe) === amp).length;
                return (
                  <option key={amp} value={amp}>อ. {amp} ({count})</option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Quick Presets Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <SlidersHorizontal className="h-3 w-3" /> พรีเซ็ตด่วน:
          </span>
          <button
            onClick={() => applyPreset('sizes')}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 text-[#33272A] dark:text-[#FFF9F5] transition-all cursor-pointer"
          >
            📏 ขนาด เล็ก - กลาง - ใหญ่
          </button>
          <button
            onClick={() => applyPreset('solar')}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-slate-700 text-[#33272A] dark:text-[#FFF9F5] transition-all cursor-pointer"
          >
            ☀️ ใช้ระบบโซลาร์เซลล์
          </button>
          <button
            onClick={() => applyPreset('fiber')}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-700 text-[#33272A] dark:text-[#FFF9F5] transition-all cursor-pointer"
          >
            🌐 อินเทอร์เน็ตไฟเบอร์
          </button>
          <button
            onClick={() => applyPreset('remote')}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-slate-700 text-[#33272A] dark:text-[#FFF9F5] transition-all cursor-pointer"
          >
            ⛰️ พื้นที่สูง / มีห้องเรียนสาขา
          </button>
          <button
            onClick={() => applyPreset('random')}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-slate-700 text-[#33272A] dark:text-[#FFF9F5] transition-all cursor-pointer"
          >
            🎲 สุ่ม 3 โรงเรียน
          </button>
        </div>

        {/* Selected School Badges / Pills */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-black text-[#33272A] dark:text-[#FFF9F5]">
            โรงเรียนที่เลือก ({compareSchools.length}/4 แห่ง):
          </span>
          {compareSchools.length === 0 ? (
            <span className="text-xs text-rose-500 font-bold italic">
              ยังไม่ได้เลือกโรงเรียน กรุณากดเลือกจากกล่องค้นหาหรือคลิกปุ่มพรีเซ็ตด้านบน
            </span>
          ) : (
            compareSchools.map(sch => {
              const amp = sch.amphoe || getAmphoeAndNetwork(sch.id, sch.name).amphoe;
              return (
                <div
                  key={sch.id}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-[#33272A] dark:border-slate-700 text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-2 shadow-2xs animate-fadeIn"
                >
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span>{sch.name}</span>
                  <span className="text-[10px] text-slate-400 font-normal">(อ.{amp})</span>
                  <button
                    onClick={() => removeSchool(sch.id)}
                    className="h-4 w-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-rose-500 hover:text-white flex items-center justify-center text-[10px] transition-colors"
                    title="ลบออกจากการเปรียบเทียบ"
                  >
                    ✕
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Category Switcher Tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-[#33272A] text-white dark:bg-[#FFD3B6] dark:text-[#33272A] shadow-2xs'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            📋 ข้อมูลทุกหมวดหมู่ (All)
          </button>
          <button
            onClick={() => setActiveCategory('students_staff')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
              activeCategory === 'students_staff'
                ? 'bg-purple-600 text-white dark:bg-purple-400 dark:text-slate-950 shadow-2xs'
                : 'bg-purple-50 text-purple-900 dark:bg-purple-950/40 dark:text-purple-300 hover:bg-purple-100'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>นักเรียน & อัตราส่วนครู</span>
          </button>
          <button
            onClick={() => setActiveCategory('utilities')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
              activeCategory === 'utilities'
                ? 'bg-amber-600 text-white dark:bg-amber-400 dark:text-slate-950 shadow-2xs'
                : 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>สาธารณูปโภค & พื้นที่</span>
          </button>
          <button
            onClick={() => setActiveCategory('management')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
              activeCategory === 'management'
                ? 'bg-sky-600 text-white dark:bg-sky-400 dark:text-slate-950 shadow-2xs'
                : 'bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-300 hover:bg-sky-100'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>ผู้บริหาร & ติดต่อ</span>
          </button>
        </div>

        <div className="text-[11px] font-bold text-slate-400">
          แสดงข้อมูล {compareSchools.length} โรงเรียน
        </div>
      </div>

      {/* 4. Visual KPI Cards Comparison (Side-by-side Top Cards) */}
      {compareSchools.length >= 2 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {compareSchools.map((school, idx) => {
            const amp = school.amphoe || getAmphoeAndNetwork(school.id, school.name).amphoe;
            const net = school.networkGroup || getAmphoeAndNetwork(school.id, school.name).networkGroup;
            const ratio = school.staffCount > 0 ? (school.studentCount / school.staffCount).toFixed(1) : '-';
            const studentBarWidth = Math.min(100, Math.max(8, (school.studentCount / maxStudents) * 100));

            return (
              <div
                key={school.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#33272A] dark:border-slate-700 shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      #{school.id}
                    </span>
                    <h4 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] truncate group-hover:text-indigo-600">
                      {school.name}
                    </h4>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      อ.{amp} • {net}
                    </div>
                  </div>
                  <button
                    onClick={() => removeSchool(school.id)}
                    className="text-slate-400 hover:text-rose-500 text-xs p-1"
                    title="ลบออก"
                  >
                    ✕
                  </button>
                </div>

                {/* Progress Bar นักเรียน */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-extrabold">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-blue-500" /> นักเรียน:
                    </span>
                    <span className="text-[#33272A] dark:text-[#FFF9F5] font-black">
                      {school.studentCount} คน
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                      style={{ width: `${studentBarWidth}%` }}
                    />
                  </div>
                </div>

                {/* Mini Metric Pills */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50">
                    <span className="text-[10px] text-purple-700 dark:text-purple-300 block">ครู/บุคลากร</span>
                    <span className="text-sm font-black text-purple-950 dark:text-purple-100">{school.staffCount} คน</span>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50">
                    <span className="text-[10px] text-amber-700 dark:text-amber-300 block">สัดส่วนครู:นร.</span>
                    <span className="text-sm font-black text-amber-950 dark:text-amber-100">1 : {ratio}</span>
                  </div>
                </div>

                {/* สาธารณูปโภคสรุปย่อ */}
                <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-amber-500" />
                    {school.electricity === 'has_electric' || school.electricity === true ? 'ไฟฟ้าถาวร' :
                     school.electricity === 'solar' ? 'โซลาร์เซลล์' : 'ผสมผสาน/อื่นๆ'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3 text-sky-500" />
                    {school.internetType === 'fiber' ? 'Fiber' :
                     school.internetType === 'satellite' ? 'ดาวเทียม' :
                     school.internetType === 'sim' ? 'SIM 4G' : 'ไม่มีเน็ต'}
                  </span>
                </div>

                {/* Button View Full Details */}
                {onSelectSchool && (
                  <button
                    onClick={() => onSelectSchool(school.id)}
                    className="w-full mt-1 py-1.5 rounded-xl bg-[#33272A] hover:bg-black text-[#FFF9F5] dark:bg-[#FFD3B6] dark:text-[#33272A] dark:hover:bg-white text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>ดูรายละเอียดโรงเรียนนี้</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Main Comparison Table (Side-by-Side Structured Matrix) */}
      {compareSchools.length === 0 ? (
        <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/40 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 mx-auto flex items-center justify-center">
            <Scale className="h-6 w-6" />
          </div>
          <h4 className="text-base font-black text-[#33272A] dark:text-[#FFF9F5]">
            ยังไม่มีสถานศึกษาในตารางเปรียบเทียบ
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            กรุณาใช้กล่องค้นหาด้านบน หรือคลิกปุ่มพรีเซ็ตด่วน เช่น &quot;ขนาด เล็ก - กลาง - ใหญ่&quot; เพื่อเริ่มต้นการเปรียบเทียบข้อมูลทันที
          </p>
          <button
            onClick={() => applyPreset('sizes')}
            className="btn-cute bg-[#A0E7E5] text-[#33272A] text-xs font-black px-4 py-2"
          >
            🎯 เริ่มต้นเปรียบเทียบโรงเรียนตามขนาด
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto overflow-y-visible rounded-2xl border-2 border-[#33272A] dark:border-slate-700 shadow-sm">
          <table className="w-full text-left border-collapse text-xs md:text-sm min-w-[650px]">
            {/* Table Header with School Names */}
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-[#33272A] dark:text-[#FFF9F5] border-b-2 border-[#33272A] dark:border-slate-700">
                <th className="p-3.5 w-48 md:w-60 sticky left-0 z-20 bg-slate-200 dark:bg-slate-800 border-r-2 border-[#33272A]/20 dark:border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.06)] font-black text-xs uppercase tracking-wider">
                  หัวข้อการเปรียบเทียบ
                </th>
                {compareSchools.map(s => {
                  const amp = s.amphoe || getAmphoeAndNetwork(s.id, s.name).amphoe;
                  return (
                    <th
                      key={s.id}
                      className="p-3.5 min-w-[200px] md:min-w-[240px] text-center border-r border-[#33272A]/10 dark:border-slate-700 last:border-none align-top"
                    >
                      <div className="flex flex-col items-center justify-between gap-1.5 h-full">
                        <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                          รหัส {s.id}
                        </span>
                        <div className="font-black text-sm text-[#33272A] dark:text-[#FFF9F5] line-clamp-2">
                          {s.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-semibold">
                          อ.{amp}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {onSelectSchool && (
                            <button
                              onClick={() => onSelectSchool(s.id)}
                              className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-extrabold flex items-center gap-0.5 cursor-pointer"
                            >
                              <Eye className="h-3 w-3" /> ดูโรงเรียน
                            </button>
                          )}
                          <span className="text-slate-300">•</span>
                          <button
                            onClick={() => removeSchool(s.id)}
                            className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline font-extrabold flex items-center gap-0.5 cursor-pointer"
                          >
                            <X className="h-3 w-3" /> นำออก
                          </button>
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#33272A]/10 dark:divide-slate-800 font-medium">
              {/* ========================================================================= */}
              {/* หมวดที่ 1: ข้อมูลนักเรียน และ อัตราส่วนบุคลากรทางการศึกษา */}
              {/* ========================================================================= */}
              {(activeCategory === 'all' || activeCategory === 'students_staff') && (
                <>
                  <tr className="bg-purple-100/90 dark:bg-purple-950/80 text-purple-950 dark:text-purple-200 font-black">
                    <td colSpan={compareSchools.length + 1} className="p-2.5 px-3.5 text-xs uppercase tracking-wider border-y border-purple-300 dark:border-purple-800">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <span>หมวดที่ 1: จำนวนนักเรียน และ อัตราส่วนบุคลากรทางการศึกษา</span>
                      </div>
                    </td>
                  </tr>

                  {/* 1.1 จำนวนนักเรียนรวม */}
                  {(() => {
                    const diff = isDiff(compareSchools.map(s => s.studentCount));
                    return (
                      <tr className={getRowClass(diff)}>
                        <td className={`p-3 sticky left-0 z-10 border-r-2 border-[#33272A]/20 dark:border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.06)] ${getHeaderCellClass(diff)}`}>
                          <div className="flex items-center justify-between gap-1">
                            <span>👨‍🎓 จำนวนนักเรียนรวม</span>
                            {highlightDiff && diff && compareSchools.length > 1 && (
                              <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-amber-500 text-white shrink-0">ต่างกัน</span>
                            )}
                          </div>
                        </td>
                        {compareSchools.map(s => (
                          <td key={s.id} className="p-3 text-center border-r border-[#33272A]/10 dark:border-slate-800 last:border-none">
                            <div className="text-base font-black text-indigo-700 dark:text-indigo-300">
                              {(s.studentCount || 0).toLocaleString()} คน
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              ชาย {s.maleCount || 0} / หญิง {s.femaleCount || 0} คน
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })()}

                  {/* 1.2 ขนาดสถานศึกษา */}
                  {(() => {
                    const diff = isDiff(compareSchools.map(s => s.size));
                    return (
                      <tr className={getRowClass(diff)}>
                        <td className={`p-3 sticky left-0 z-10 border-r-2 border-[#33272A]/20 dark:border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.06)] ${getHeaderCellClass(diff)}`}>
                          <div className="flex items-center justify-between gap-1">
                            <span>📏 ขนาดสถานศึกษา</span>
                            {highlightDiff && diff && compareSchools.length > 1 && (
                              <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-amber-500 text-white shrink-0">ต่างกัน</span>
                            )}
                          </div>
                        </td>
                        {compareSchools.map(s => (
                          <td key={s.id} className="p-3 text-center border-r border-[#33272A]/10 dark:border-slate-800 last:border-none">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-black border inline-block ${
                              s.size === 'small' ? 'bg-[#FF8BA7] text-[#33272A] border-[#33272A]' :
                              s.size === 'medium' ? 'bg-[#FFD3B6] text-[#33272A] border-[#33272A]' :
                              s.size === 'large' ? 'bg-[#A0E7E5] text-[#33272A] border-[#33272A]' : 'bg-[#FFAAA5] text-[#33272A] border-[#33272A]'
                            }`}>
                              {getSchoolSizeLabel(s.size)}
                            </span>
                          </td>
                        ))}
                      </tr>
                    );
                  })()}

                  {/* 1.3 จำนวนครูและบุคลากรทั้งหมด */}
                  {(() => {
                    const diff = isDiff(compareSchools.map(s => s.staffCount));
                    return (
                      <tr className={getRowClass(diff)}>
                        <td className={`p-3 sticky left-0 z-10 border-r-2 border-[#33272A]/20 dark:border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.06)] ${getHeaderCellClass(diff)}`}>
                          <div className="flex items-center justify-between gap-1">
                            <span>👩‍🏫 ครูและบุคลากร</span>
                            {highlightDiff && diff && compareSchools.length > 1 && (
                              <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-amber-500 text-white shrink-0">ต่างกัน</span>
                            )}
                          </div>
                        </td>
                        {compareSchools.map(s => (
                          <td key={s.id} className="p-3 text-center border-r border-[#33272A]/10 dark:border-slate-800 last:border-none">
                            <div className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5]">
                              {s.staffCount} คน
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              (รวมผู้บริหารและลูกจ้าง)
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })()}

                  {/* 1.4 อัตราส่วนครูต่อนักเรียน (Teacher-Student Ratio) */}
                  {(() => {
                    const ratios = compareSchools.map(s => s.staffCount > 0 ? Number((s.studentCount / s.staffCount).toFixed(1)) : 0);
                    const diff = isDiff(ratios);
                    return (
                      <tr className={getRowClass(diff)}>
                        <td className={`p-3 sticky left-0 z-10 border-r-2 border-[#33272A]/20 dark:border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.06)] ${getHeaderCellClass(diff)}`}>
                          <div className="flex items-center justify-between gap-1">
                            <span>⚖️ อัตราส่วน ครู 1 คน : นร.</span>
                            {highlightDiff && diff && compareSchools.length > 1 && (
                              <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-amber-500 text-white shrink-0">ต่างกัน</span>
                            )}
                          </div>
                        </td>
                        {compareSchools.map(s => {
                          const r = s.staffCount > 0 ? (s.studentCount / s.staffCount).toFixed(1) : '-';
                          const rNum = s.staffCount > 0 ? s.studentCount / s.staffCount : 0;
                          return (
                            <td key={s.id} className="p-3 text-center border-r border-[#33272A]/10 dark:border-slate-800 last:border-none">
                              <div className="text-sm font-black text-purple-700 dark:text-purple-300">
                                1 : {r} คน
                              </div>
                              <div className="mt-1">
                                {rNum > 25 ? (
                                  <span className="px-2 py-0.5 text-[9px] font-black rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                                    ภาระครูสูง (&gt; 25)
                                  </span>
                                ) : rNum < 8 && rNum > 0 ? (
                                  <span className="px-2 py-0.5 text-[9px] font-black rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300">
                                    ดูแลใกล้ชิด (&lt; 8)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 text-[9px] font-black rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                                    ตามเกณฑ์เฉลี่ย
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })()}

                  {/* 1.5 บุคลากรประเภทอื่นๆ (ถ้ามีข้อมูล) */}
                  {(() => {
                    const diff = isDiff(compareSchools.map(s => (s.contractTeachersCount || 0) + (s.janitorCount || 0)));
                    return (
                      <tr className={getRowClass(diff)}>
                        <td className={`p-3 sticky left-0 z-10 border-r-2 border-[#33272A]/20 dark:border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.06)] ${getHeaderCellClass(diff)}`}>
                          <div className="flex items-center justify-between gap-1">
                            <span>👥 ครูอัตราจ้าง / ภารโรง</span>
                            {highlightDiff && diff && compareSchools.length > 1 && (
                              <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-amber-500 text-white shrink-0">ต่างกัน</span>
                            )}
                          </div>
                        </td>
                        {compareSchools.map(s => (
                          <td key={s.id} className="p-3 text-center border-r border-[#33272A]/10 dark:border-slate-800 last:border-none text-xs">
                            <div>ครูจ้าง: <span className="font-bold">{s.contractTeachersCount ?? '-'}</span> คน</div>
                            <div className="text-[11px] text-slate-500">ภารโรง: {s.janitorCount ?? '-'} คน</div>
                          </td>
                        ))}
                      </tr>
                    );
                  })()}

                  {/* 1.6 สาขาวิชาเอกครู */}
                  {(() => {
                    const diff = isDiff(compareSchools.map(s => (s.majorSubjects || []).join(',')));
                    return (
                      <tr className={getRowClass(diff)}>
                        <td className={`p-3 sticky left-0 z-10 border-r-2 border-[#33272A]/20 dark:border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.06)] ${getHeaderCellClass(diff)}`}>
                          <div className="flex items-center justify-between gap-1">
                            <span>📚 วิชาเอกครูที่มีในรร.</span>
                            {highlightDiff && diff && compareSchools.length > 1 && (
                              <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-amber-500 text-white shrink-0">ต่างกัน</span>
                            )}
                          </div>
                        </td>
                        {compareSchools.map(s => {
                          const majors = s.majorSubjects || s.majorSubjectsWithStaff?.map(m => m.name) || [];
                          return (
                            <td key={s.id} className="p-3 text-center border-r border-[#33272A]/10 dark:border-slate-800 last:border-none">
                              {majors.length === 0 ? (
                                <span className="text-xs text-slate-400 italic">-</span>
                              ) : (
                                <div className="flex flex-wrap gap-1 justify-center max-w-[220px] mx-auto">
                                  {majors.slice(0, 4).map((m, mIdx) => (
                                    <span
                                      key={mIdx}
                                      className="px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 text-[10px] font-bold border border-purple-200 dark:border-purple-800"
                                    >
                                      {m}
                                    </span>
                                  ))}
                                  {majors.length > 4 && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold">
                                      +{majors.length - 4} สาขา
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })()}
                </>
              )}

              {/* ========================================================================= */}
              {/* หมวดที่ 2: สาธารณูปโภค และ โครงสร้างพื้นฐาน */}
              {/* ========================================================================= */}
              {(activeCategory === 'all' || activeCategory === 'utilities') && (
                <>
                  <tr className="bg-amber-100/90 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 font-black">
                    <td colSpan={compareSchools.length + 1} className="p-2.5 px-3.5 text-xs uppercase tracking-wider border-y border-amber-300 dark:border-amber-800">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <span>หมวดที่ 2: ระบบสาธารณูปโภค โครงสร้างพื้นฐาน และสภาพพื้นที่</span>
                      </div>
                    </td>
                  </tr>

                  {/* 2.1 ระบบไฟฟ้า */}
                  {(() => {
                    const diff = isDiff(compareSchools.map(s => s.electricity));
                    return (
                      <tr className={getRowClass(diff)}>
                        <td className={`p-3 sticky left-0 z-10 border-r-2 border-[#33272A]/20 dark:border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.06)] ${getHeaderCellClass(diff)}`}>
                          <div className="flex items-center justify-between gap-1">
                            <span>⚡ ระบบไฟฟ้า</span>
                            {highlightDiff && diff && compareSchools.length > 1 && (
                              <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-amber-500 text-white shrink-0">ต่างกัน</span>
                            )}
                          </div>
                        </td>
                        {compareSchools.map(s => {
                          const elec = s.electricity;
                          const isGrid = elec === 'has_electric' || elec === 'grid' || elec === true;
                          const isSolar = elec === 'solar' || String(elec).includes('solar');
                          const isHybrid = elec === 'hybrid' || String(elec).includes('hybrid');
                          return (
                            <td key={s.id} className="p-3 text-center border-r border-[#33272A]/10 dark:border-slate-800 last:border-none">
                              <span className={`px-2.5 py-1 rounded-xl text-xs font-black inline-flex items-center gap-1 border ${
                                isGrid ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200' :
                                isSolar ? 'bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-950/80 dark:text-yellow-200' :
                                isHybrid ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200' :
                                'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200'
                              }`}>
                                <Zap className="h-3.5 w-3.5 fill-current" />
                                {isGrid ? 'ไฟฟ้าถาวร (กฟภ.)' :
                                 isSolar ? `โซลาร์เซลล์ ${s.solarKw ? `(${s.solarKw} kW)` : ''}` :
                                 isHybrid ? 'ไฟฟ้าผสมผสาน' : 'ไม่มีระบบไฟฟ้า'}
                              </span>
                              {s.hasSolarBattery && (
                                <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold mt-1">
                                  🔋 มีแบตเตอรี่สำรอง
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })()}

                  {/* 2.2 ระบบอินเทอร์เน็ต */}
                  {(() => {
                    const diff = isDiff(compareSchools.map(s => s.internetType));
                    return (
                      <tr className={getRowClass(diff)}>
                        <td className={`p-3 sticky left-0 z-10 border-r-2 border-[#33272A]/20 dark:border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.06)] ${getHeaderCellClass(diff)}`}>
                          <div className="flex items-center justify-between gap-1">
                            <span>🌐 ระบบอินเทอร์เน็ต</span>
                            {highlightDiff && diff && compareSchools.length > 1 && (
                              <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-amber-500 text-white shrink-0">ต่างกัน</span>
                            )}
                          </div>
                        </td>
                        {compareSchools.map(s => {
                          const net = s.internetType;
                          return (
                            <td key={s.id} className="p-3 text-center border-r border-[#33272A]/10 dark:border-slate-800 last:border-none">
                              <span className={`px-2.5 py-1 rounded-xl text-xs font-black inline-flex items-center gap-1 border ${
                                net === 'fiber' ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200' :
                                net === 'satellite' ? 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/80 dark:text-sky-200' :
                                net === 'sim' ? 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/80 dark:text-orange-200' :
                                'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200'
                              }`}>
                                {net === 'fiber' ? <Globe className="h-3.5 w-3.5" /> :
                                 net === 'satellite' ? <Radio className="h-3.5 w-3.5" /> :
                                 net === 'sim' ? <Smartphone className="h-3.5 w-3.5" /> :
                                 <WifiOff className="h-3.5 w-3.5" />}
                                {net === 'fiber' ? 'สายไฟเบอร์ (Fiber)' :
                                 net === 'satellite' ? 'ดาวเทียม (Satellite)' :
                                 net === 'sim' ? 'ซิมมือถือ (SIM 4G)' : 'ไม่มีสัญญาณอินเทอร์เน็ต'}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })()}

                  {/* 2.3 ระบบน้ำประปา */}
                  {(() => {
                    const diff = isDiff(compareSchools.map(s => s.waterSystem));
                    return (
                      <tr className={getRowClass(diff)}>
                        <td className={`p-3 sticky left-0 z-10 border-r-2 border-[#33272A]/20 dark:border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.06)] ${getHeaderCellClass(diff)}`}>
                          <div className="flex items-center justify-between gap-1">
                            <span>💧 ระบบน้ำประปา / แหล่งน้ำ</span>
                            {highlightDiff && diff && compareSchools.length > 1 && (
                              <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-amber-500 text-white shrink-0">ต่างกัน</span>
                            )}
                          </div>
                        </td>
                        {compareSchools.map(s => {
                          const w = s.waterSystem;
                          return (
                            <td key={s.id} className="p-3 text-center border-r border-[#33272A]/10 dark:border-slate-800 last:border-none">
                              <span className={`px-2.5 py-1 rounded-xl text-xs font-black inline-flex items-center gap-1 border ${
                                w === 'mountain' ? 'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/80 dark:text-cyan-200' :
                                w === 'gov' ? 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-200' :
                                w === 'other' ? 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/80 dark:text-purple-200' :
                                'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                              }`}>
                                <Droplets className="h-3.5 w-3.5" />
                                {w === 'mountain' ? 'ประปาภูเขา' :
                                 w === 'gov' ? 'ประปาภาครัฐ' :
                                 w === 'other' ? 'บ่อน้ำ/อื่นๆ' :
                                 w === 'none' ? 'ไม่มีน้ำใช้' : 'ประปาหมู่บ้าน/บาดาล'}
                              </span>
                              {s.waterSystemDetail && (
                                <div className="text-[10px] text-slate-500 mt-0.5 italic">
                                  {s.waterSystemDetail}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })()}

                  {/* 2.4 ห้องเรียนสาขา / สาขาโรงเรียนย่อย */}
                  {(() => {
                    const diff = isDiff(compareSchools.map(s => (s.classrooms || []).length));
                    return (
                      <tr className={getRowClass(diff)}>
                        <td className={`p-3 sticky left-0 z-10 border-r-2 border-[#33272A]/20 dark:border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.06)] ${getHeaderCellClass(diff)}`}>
                          <div className="flex items-center justify-between gap-1">
                            <span>🏘️ ห้องเรียนสาขา / สาขาย่อย</span>
                            {highlightDiff && diff && compareSchools.length > 1 && (
                              <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-amber-500 text-white shrink-0">ต่างกัน</span>
                            )}
                          </div>
                        </td>
                        {compareSchools.map(s => {
                          const branches = s.classrooms || [];
                          return (
                            <td key={s.id} className="p-3 text-center border-r border-[#33272A]/10 dark:border-slate-800 last:border-none">
                              {branches.length === 0 ? (
                                <span className="text-xs text-slate-400 font-bold">ไม่มีสาขาย่อย (รร.เดี่ยว)</span>
                              ) : (
                                <div className="space-y-1">
                                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 text-xs font-black border border-amber-300">
                                    มี {branches.length} ห้องเรียนสาขา
                                  </span>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate max-w-[200px] mx-auto">
                                    {branches.map(b => b.name).join(', ')}
                                  </div>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })()}
                </>
              )}

              {/* ========================================================================= */}
              {/* หมวดที่ 3: ผู้บริหาร การติดต่อ และพิกัดภูมิศาสตร์ */}
              {/* ========================================================================= */}
              {(activeCategory === 'all' || activeCategory === 'management') && (
                <>
                  <tr className="bg-sky-100/90 dark:bg-sky-950/80 text-sky-950 dark:text-sky-200 font-black">
                    <td colSpan={compareSchools.length + 1} className="p-2.5 px-3.5 text-xs uppercase tracking-wider border-y border-sky-300 dark:border-sky-800">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                        <span>หมวดที่ 3: ผู้บริหาร การติดต่อ และตำแหน่งที่ตั้ง</span>
                      </div>
                    </td>
                  </tr>

                  {/* 3.1 ผู้อำนวยการโรงเรียน */}
                  {(() => {
                    const diff = isDiff(compareSchools.map(s => s.directorName));
                    return (
                      <tr className={getRowClass(diff)}>
                        <td className={`p-3 sticky left-0 z-10 border-r-2 border-[#33272A]/20 dark:border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.06)] ${getHeaderCellClass(diff)}`}>
                          <div className="flex items-center justify-between gap-1">
                            <span>👔 ผู้บริหารสถานศึกษา</span>
                            {highlightDiff && diff && compareSchools.length > 1 && (
                              <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-amber-500 text-white shrink-0">ต่างกัน</span>
                            )}
                          </div>
                        </td>
                        {compareSchools.map(s => (
                          <td key={s.id} className="p-3 text-center border-r border-[#33272A]/10 dark:border-slate-800 last:border-none">
                            <div className="font-black text-xs text-[#33272A] dark:text-[#FFF9F5]">
                              {s.directorName || 'ไม่ระบุ'}
                            </div>
                            {s.directorPhone && s.directorPhone !== '-' && (
                              <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                                📞 {s.directorPhone}
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })()}

                  {/* 3.2 เบอร์โทรศัพท์โรงเรียน */}
                  {(() => {
                    const diff = isDiff(compareSchools.map(s => s.schoolPhone));
                    return (
                      <tr className={getRowClass(diff)}>
                        <td className={`p-3 sticky left-0 z-10 border-r-2 border-[#33272A]/20 dark:border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.06)] ${getHeaderCellClass(diff)}`}>
                          <div className="flex items-center justify-between gap-1">
                            <span>📞 เบอร์โทรศัพท์สถานศึกษา</span>
                            {highlightDiff && diff && compareSchools.length > 1 && (
                              <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-amber-500 text-white shrink-0">ต่างกัน</span>
                            )}
                          </div>
                        </td>
                        {compareSchools.map(s => (
                          <td key={s.id} className="p-3 text-center border-r border-[#33272A]/10 dark:border-slate-800 last:border-none font-mono text-xs">
                            {s.schoolPhone || s.directorPhone || '-'}
                          </td>
                        ))}
                      </tr>
                    );
                  })()}

                  {/* 3.3 พิกัดทางภูมิศาสตร์ GIS */}
                  {(() => {
                    const diff = isDiff(compareSchools.map(s => `${s.latitude},${s.longitude}`));
                    return (
                      <tr className={getRowClass(diff)}>
                        <td className={`p-3 sticky left-0 z-10 border-r-2 border-[#33272A]/20 dark:border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.06)] ${getHeaderCellClass(diff)}`}>
                          <div className="flex items-center justify-between gap-1">
                            <span>🗺️ พิกัด GIS (Lat, Lng)</span>
                            {highlightDiff && diff && compareSchools.length > 1 && (
                              <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-amber-500 text-white shrink-0">ต่างกัน</span>
                            )}
                          </div>
                        </td>
                        {compareSchools.map(s => (
                          <td key={s.id} className="p-3 text-center border-r border-[#33272A]/10 dark:border-slate-800 last:border-none text-[11px] font-mono text-slate-600 dark:text-slate-300">
                            {s.latitude && s.longitude ? (
                              <span>{s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}</span>
                            ) : '-'}
                          </td>
                        ))}
                      </tr>
                    );
                  })()}
                </>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 6. Panel Footer / Helpful Summary Note */}
      {compareSchools.length >= 2 && (
        <div className="p-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-indigo-950 dark:text-indigo-200 font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
              ตารางเปรียบเทียบแสดงข้อมูลสถิติที่ประมวลผลตามปีการศึกษา {academicYear} เพื่อให้ฝ่ายบริหารและผู้ใช้งานสามารถเปรียบเทียบศักยภาพและจัดสรรทรัพยากรได้อย่างตรงจุด
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">แถบสีส้ม = แถวที่มีค่าแตกต่างกัน</span>
          </div>
        </div>
      )}
    </div>
  );
}
