import React, { useState, useMemo } from 'react';
import { School, UserProfile } from '../types';
import { Zap, Globe, GraduationCap, Building2, MapPin, Search, ChevronRight, CheckCircle2, AlertCircle, Sparkles, Filter, Users, Eye, Download, FileSpreadsheet, XCircle, CheckSquare, Square, PieChart as PieChartIcon, BarChart3, RotateCcw, Lock } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface InfrastructureViewProps {
  schools: School[];
  onSelectSchool: (schoolId: string) => void;
  systemConfig?: {
    allowDataDownload?: boolean;
    restrictOneAdminPerSchool?: boolean;
    allowSchoolAdminRegistration?: boolean;
    electricityOptions?: { id: string; label: string }[];
    internetOptions?: { id: string; label: string }[];
  };
  userProfile?: UserProfile | null;
}

export default function InfrastructureView({
  schools,
  onSelectSchool,
  systemConfig,
  userProfile
}: InfrastructureViewProps) {
  // เมนูย่อยในหน้าโครงสร้างพื้นฐาน
  const [activeTab, setActiveTab] = useState<'filter' | 'charts'>('filter');

  // รายการตัวเลือกไฟฟ้าและอินเทอร์เน็ต dynamic จาก systemConfig
  const electricityTypeList = useMemo(() => {
    if (systemConfig?.electricityOptions && systemConfig.electricityOptions.length > 0) {
      return systemConfig.electricityOptions;
    }
    return [
      { id: 'has_electric', label: '🔌 ไฟฟ้าถาวร' },
      { id: 'solar', label: '☀️ โซลาร์เซลล์' },
      { id: 'hybrid', label: '⚡☀️ ผสมผสาน' },
      { id: 'none', label: '❌ ไม่มีไฟฟ้า' },
    ];
  }, [systemConfig?.electricityOptions]);

  const internetTypeList = useMemo(() => {
    if (systemConfig?.internetOptions && systemConfig.internetOptions.length > 0) {
      return systemConfig.internetOptions;
    }
    return [
      { id: 'fiber', label: '🌐 Fiber' },
      { id: 'satellite', label: '🛰️ ดาวเทียม' },
      { id: 'sim', label: '📱 SIM 4G' },
      { id: 'none', label: '❌ ไม่มีเน็ต' },
    ];
  }, [systemConfig?.internetOptions]);

  // สิทธิ์ในการดาวน์โหลดข้อมูล
  const canDownload = systemConfig?.allowDataDownload !== false || userProfile?.role === 'super_admin';

  // ตัวกรองระบบไฟฟ้า: include = เอาเฉพาะประเภทที่เลือก, exclude = ไม่เอา / ยกเว้นประเภทที่เลือก
  const [electricMode, setElectricMode] = useState<'include' | 'exclude'>('include');
  const [electricSelected, setElectricSelected] = useState<string[]>(['has_electric', 'solar', 'hybrid', 'none']);

  // ตัวกรองอินเทอร์เน็ต: include = เอาเฉพาะ, exclude = ไม่เอา
  const [internetMode, setInternetMode] = useState<'include' | 'exclude'>('include');
  const [internetSelected, setInternetSelected] = useState<string[]>(['fiber', 'satellite', 'sim', 'none']);

  // ตัวกรองครูวิชาเอก: has = มีวิชาเอกนี้, lacks = ไม่มี/ขาดวิชาเอกนี้
  const [majorMode, setMajorMode] = useState<'has' | 'lacks'>('has');
  const [selectedMajor, setSelectedMajor] = useState<string>('all');

  // ตัวกรองอำเภอ
  const [amphoeFilter, setAmphoeFilter] = useState<string>('all');

  // ตัวกรองขนาดโรงเรียน
  const [sizeFilter, setSizeFilter] = useState<string>('all');

  // คำค้นหา
  const [searchTerm, setSearchTerm] = useState('');

  // รวมอำเภอทั้งหมดที่มีในข้อมูล
  const availableAmphoes = useMemo(() => {
    const amphoes = new Set<string>();
    schools.forEach(s => {
      if (s.amphoe) amphoes.add(s.amphoe);
    });
    return Array.from(amphoes).sort();
  }, [schools]);

  // รวมครูวิชาเอกที่มีในระบบ
  const availableMajors = useMemo(() => {
    const setMajors = new Set<string>([
      'ภาษาไทย', 'คณิตศาสตร์', 'ภาษาอังกฤษ', 'วิทยาศาสตร์', 'คอมพิวเตอร์',
      'ปฐมวัย', 'สังคมศึกษา', 'พลศึกษา', 'ศิลปะ', 'การงานอาชีพ'
    ]);
    schools.forEach(s => {
      s.majorSubjects?.forEach(m => m && setMajors.add(m.trim()));
      s.majorSubjectsWithStaff?.forEach(ms => ms.name && setMajors.add(ms.name.trim()));
    });
    return Array.from(setMajors);
  }, [schools]);

  // สลับการเลือก Checkbox ในไฟฟ้า
  const toggleElectricType = (typeKey: string) => {
    setElectricSelected(prev => {
      if (prev.includes(typeKey)) {
        if (prev.length === 1) return prev; // อย่างน้อย 1 รายการ
        return prev.filter(k => k !== typeKey);
      } else {
        return [...prev, typeKey];
      }
    });
  };

  // สลับการเลือก Checkbox ในเน็ต
  const toggleInternetType = (typeKey: string) => {
    setInternetSelected(prev => {
      if (prev.includes(typeKey)) {
        if (prev.length === 1) return prev;
        return prev.filter(k => k !== typeKey);
      } else {
        return [...prev, typeKey];
      }
    });
  };

  // ล้างตัวกรองทั้งหมด
  const handleResetFilters = () => {
    setElectricMode('include');
    setElectricSelected(['has_electric', 'solar', 'hybrid', 'none']);
    setInternetMode('include');
    setInternetSelected(['fiber', 'satellite', 'sim', 'none']);
    setMajorMode('has');
    setSelectedMajor('all');
    setAmphoeFilter('all');
    setSizeFilter('all');
    setSearchTerm('');
  };

  // กรองโรงเรียนตามเงื่อนไขทั้งหมด (รองรับ เลือกเอา / ไม่เอา)
  const filteredSchools = useMemo(() => {
    return schools.filter(school => {
      // 1. ค้นหาด้วยชื่อหรือรหัส
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = school.name.toLowerCase().includes(term);
        const matchesId = school.id.includes(term);
        if (!matchesName && !matchesId) return false;
      }

      // 2. อำเภอ
      if (amphoeFilter !== 'all' && school.amphoe !== amphoeFilter) {
        return false;
      }

      // 3. ขนาดโรงเรียน
      if (sizeFilter !== 'all' && school.size !== sizeFilter) {
        return false;
      }

      // 4. ไฟฟ้า (รองรับ Include / Exclude)
      let schoolElecKey = 'has_electric';
      if (school.electricity === 'solar') schoolElecKey = 'solar';
      else if (school.electricity === 'hybrid') schoolElecKey = 'hybrid';
      else if (school.electricity === 'none' || school.electricity === false) schoolElecKey = 'none';
      else if (school.electricity === 'has_electric' || school.electricity === true) schoolElecKey = 'has_electric';

      if (electricMode === 'include') {
        // เอาเฉพาะประเภทที่เลือก
        if (!electricSelected.includes(schoolElecKey)) return false;
      } else {
        // ไม่เอา / ยกเว้นประเภทที่เลือก
        if (electricSelected.includes(schoolElecKey)) return false;
      }

      // 5. อินเทอร์เน็ต (รองรับ Include / Exclude)
      let schoolNetKey = school.internetType || 'fiber';
      if (internetMode === 'include') {
        if (!internetSelected.includes(schoolNetKey)) return false;
      } else {
        if (internetSelected.includes(schoolNetKey)) return false;
      }

      // 6. ครูวิชาเอก (รองรับ มีวิชาเอกนี้ vs ขาด/ไม่มีวิชาเอกนี้)
      if (selectedMajor !== 'all') {
        const hasStr = school.majorSubjects && school.majorSubjects.some(m => m.includes(selectedMajor));
        const hasObj = school.majorSubjectsWithStaff && school.majorSubjectsWithStaff.some(ms => ms.name.includes(selectedMajor) && ms.teachersCount > 0);
        const hasMajor = hasStr || hasObj;

        if (majorMode === 'has') {
          if (!hasMajor) return false;
        } else {
          // lacks (ไม่มี/ขาดครูวิชาเอกนี้)
          if (hasMajor) return false;
        }
      }

      return true;
    });
  }, [schools, searchTerm, amphoeFilter, sizeFilter, electricMode, electricSelected, internetMode, internetSelected, selectedMajor, majorMode]);

  // คำนวณสถิติสำหรับสร้างกราฟ visualizer ตามข้อมูลที่กรองแล้ว
  const chartData = useMemo(() => {
    // 1. ระบบไฟฟ้า
    let elecHas = 0, elecSolar = 0, elecHybrid = 0, elecNone = 0;
    // 2. ระบบเน็ต
    let netFiber = 0, netSat = 0, netSim = 0, netNone = 0;
    // 3. สถิติอำเภอ
    const amphoeMap: { [key: string]: number } = {};

    filteredSchools.forEach(s => {
      // Elec
      if (s.electricity === 'solar') elecSolar++;
      else if (s.electricity === 'hybrid') elecHybrid++;
      else if (s.electricity === 'none' || s.electricity === false) elecNone++;
      else elecHas++;

      // Net
      if (s.internetType === 'satellite') netSat++;
      else if (s.internetType === 'sim') netSim++;
      else if (s.internetType === 'none') netNone++;
      else netFiber++;

      // Amphoe
      const amp = s.amphoe || 'เมืองแม่ฮ่องสอน';
      amphoeMap[amp] = (amphoeMap[amp] || 0) + 1;
    });

    const elecPie = [
      { name: '🔌 ไฟฟ้าถาวร', value: elecHas, color: '#F59E0B' },
      { name: '☀️ โซลาร์เซลล์', value: elecSolar, color: '#EAB308' },
      { name: '⚡☀️ ผสมผสาน', value: elecHybrid, color: '#10B981' },
      { name: '❌ ไม่มีไฟฟ้า', value: elecNone, color: '#EF4444' },
    ].filter(d => d.value > 0);

    const netPie = [
      { name: '🌐 Fiber Optic', value: netFiber, color: '#0EA5E9' },
      { name: '🛰️ ดาวเทียม', value: netSat, color: '#6366F1' },
      { name: '📱 SIM 4G/5G', value: netSim, color: '#A855F7' },
      { name: '❌ ไม่มีเน็ต', value: netNone, color: '#F43F5E' },
    ].filter(d => d.value > 0);

    const amphoeBar = Object.keys(amphoeMap).map(amp => ({
      name: amp.replace('อำเภอ', 'อ.'),
      จำนวนโรงเรียน: amphoeMap[amp]
    })).sort((a, b) => b.จำนวนโรงเรียน - a.จำนวนโรงเรียน);

    return { elecPie, netPie, amphoeBar };
  }, [filteredSchools]);

  // ฟังก์ชันส่งออกเป็นไฟล์ Excel
  const handleExportExcel = () => {
    if (!canDownload) {
      alert('การดาวน์โหลดข้อมูลถูกปิดใช้งานชั่วคราวโดย Super Admin');
      return;
    }
    if (filteredSchools.length === 0) {
      alert('ไม่มีข้อมูลโรงเรียนสำหรับดาวน์โหลด');
      return;
    }

    const excelData = filteredSchools.map((s, idx) => {
      let elecText = 'มีไฟฟ้าถาวร';
      if (s.electricity === 'solar') elecText = 'ใช้โซลาร์เซลล์';
      else if (s.electricity === 'hybrid') elecText = 'ระบบผสมผสาน (สายส่ง+โซลาร์)';
      else if (s.electricity === 'none' || s.electricity === false) elecText = 'ไม่มีไฟฟ้าใช้งาน';

      let netText = 'ไฟเบอร์ออพติก (Fiber)';
      if (s.internetType === 'satellite') netText = 'อินเทอร์เน็ตดาวเทียม';
      else if (s.internetType === 'sim') netText = 'ซิมการ์ด 4G/5G';
      else if (s.internetType === 'none') netText = 'ไม่มีอินเทอร์เน็ต';

      const majorsText = s.majorSubjects?.length 
        ? s.majorSubjects.join(', ')
        : s.majorSubjectsWithStaff?.map(m => `เอก${m.name}(${m.teachersCount}คน)`).join(', ') || 'ไม่ระบุ';

      let sizeText = 'โรงเรียนขนาดเล็ก';
      if (s.size === 'medium') sizeText = 'โรงเรียนขนาดกลาง';
      else if (s.size === 'large' || s.size === 'special_large') sizeText = 'โรงเรียนขนาดใหญ่';

      return {
        'ลำดับ': idx + 1,
        'รหัสโรงเรียน': s.id,
        'ชื่อโรงเรียน': s.name,
        'อำเภอ': s.amphoe || 'เมืองแม่ฮ่องสอน',
        'กลุ่มเครือข่าย': s.networkGroup || '-',
        'ขนาดโรงเรียน': sizeText,
        'ขยายโอกาส': s.isExpansion ? 'ใช่ (ม.1-ม.3)' : 'ไม่ขยายโอกาส',
        'ระบบไฟฟ้า': elecText,
        'ระบบอินเทอร์เน็ต': netText,
        'ครูวิชาเอกที่มี': majorsText,
        'จำนวนครู/บุคลากร': s.staffCount || 0,
        'เบอร์ติดต่อผู้บริหาร': s.directorPhone || '-',
        'เบอร์โรงเรียน': s.schoolPhone || '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'โครงสร้างพื้นฐาน');
    
    // Auto fit column widths
    const maxWidths = [6, 12, 28, 16, 20, 16, 14, 25, 25, 30, 16, 18, 18];
    worksheet['!cols'] = maxWidths.map(w => ({ wch: w }));

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Infrastructure_MHS1_${dateStr}.xlsx`);
  };

  // ฟังก์ชันดาวน์โหลด CSV
  const handleExportCSV = () => {
    if (!canDownload) {
      alert('การดาวน์โหลดข้อมูลถูกปิดใช้งานชั่วคราวโดย Super Admin');
      return;
    }
    if (filteredSchools.length === 0) {
      alert('ไม่มีข้อมูลโรงเรียนสำหรับดาวน์โหลด');
      return;
    }

    const headers = ['ลำดับ', 'รหัสโรงเรียน', 'ชื่อโรงเรียน', 'อำเภอ', 'ระบบไฟฟ้า', 'ระบบอินเทอร์เน็ต', 'ครูวิชาเอก', 'บุคลากร'];
    const rows = filteredSchools.map((s, idx) => [
      idx + 1,
      s.id,
      `"${s.name}"`,
      `"${s.amphoe || ''}"`,
      `"${s.electricity === 'solar' ? 'โซลาร์เซลล์' : s.electricity === 'hybrid' ? 'ผสมผสาน' : s.electricity === 'none' ? 'ไม่มีไฟฟ้า' : 'ไฟฟ้าถาวร'}"`,
      `"${s.internetType === 'satellite' ? 'ดาวเทียม' : s.internetType === 'sim' ? 'SIM 4G' : s.internetType === 'none' ? 'ไม่มีเน็ต' : 'Fiber'}"`,
      `"${s.majorSubjects?.join(' ') || ''}"`,
      s.staffCount || 0
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Infrastructure_MHS1_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* Header Banner & Mode Switcher */}
      <div className="card p-4 sm:p-6 bg-gradient-to-br from-[#FFF9F5] via-[#FFF0E6] to-[#FFE3D6] dark:from-[#1e1518] dark:via-[#2b1c20] dark:to-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[4px_4px_0px_#33272A] dark:shadow-[4px_4px_0px_#FFD3B6]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#FF8BA7] text-[#33272A] text-xs font-black border border-[#33272A] mb-1.5 shadow-[2px_2px_0px_#33272A]">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>ศูนย์กรองข้อมูลโครงสร้างพื้นฐาน</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-[#33272A] dark:text-[#FFF9F5]">
              โครงสร้างพื้นฐาน & ครูวิชาเอก
            </h1>
            <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 mt-1">
              เลือกกรองเฉพาะข้อมูลที่ต้องการ หรือยกเว้นข้อมูลที่ไม่ต้องการ แล้วส่งออกเป็นไฟล์ Excel หรือดูภาพรวมกราฟสถิติได้ทันที
            </p>
          </div>

          {/* Action Buttons: Export Excel & View Switcher */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportExcel}
              className="btn-cute bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-black text-xs px-3.5 py-2 flex items-center gap-1.5 border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 shrink-0" />
              <span>โหลด Excel ({filteredSchools.length})</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="btn-cute bg-sky-300 hover:bg-sky-200 text-sky-950 font-black text-xs px-3 py-2 flex items-center gap-1.5 border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] cursor-pointer"
            >
              <Download className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            {/* Switch view mode tab */}
            <div className="flex items-center p-1 bg-white dark:bg-[#150e10] rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6]">
              <button
                type="button"
                onClick={() => setActiveTab('filter')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer transition-all ${
                  activeTab === 'filter'
                    ? 'bg-[#FF8BA7] text-[#33272A] border border-[#33272A]'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                <span>ตัวกรองละเอียด</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('charts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer transition-all ${
                  activeTab === 'charts'
                    ? 'bg-[#A0E7E5] text-[#33272A] border border-[#33272A]'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <PieChartIcon className="h-3.5 w-3.5" />
                <span>กราฟภาพรวม</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Control Filter Bar (กรองเอาข้อมูลไหน หรือ ไม่เอาข้อมูลไหน) */}
      <div className="card p-4 sm:p-5 space-y-4 border-l-8 border-l-[#FF8BA7] bg-white dark:bg-[#1e1518]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#33272A]/10 dark:border-[#FFD3B6]/20 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#FF8BA7] shrink-0" />
            <h2 className="text-xs sm:text-sm font-black text-[#33272A] dark:text-[#FFF9F5]">
              🎯 กำหนดเงื่อนไขตัวกรอง (เลือกประเภทข้อมูลที่จะเอา / ไม่เอา)
            </h2>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#A0E7E5] text-[#33272A] border border-[#33272A]">
              ตรงเงื่อนไข {filteredSchools.length} แห่ง
            </span>
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs font-black text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-xl border border-rose-300 dark:border-rose-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>ล้างเงื่อนไขทั้งหมด</span>
          </button>
        </div>

        {/* Grid Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. กรองระบบไฟฟ้า */}
          <div className="p-3.5 rounded-2xl bg-[#FFF9F5] dark:bg-[#251b1e] border-2 border-[#33272A]/30 dark:border-[#FFD3B6]/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-amber-500 fill-amber-400 shrink-0" />
                ข้อมูลไฟฟ้า:
              </span>

              {/* Mode Toggle: เอาเฉพาะ vs ไม่เอา */}
              <div className="flex items-center bg-white dark:bg-[#150e10] p-0.5 rounded-lg border border-[#33272A]/20">
                <button
                  type="button"
                  onClick={() => setElectricMode('include')}
                  className={`px-2 py-0.5 text-[10px] font-black rounded cursor-pointer ${
                    electricMode === 'include'
                      ? 'bg-emerald-400 text-[#33272A]'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  เอาเฉพาะ
                </button>
                <button
                  type="button"
                  onClick={() => setElectricMode('exclude')}
                  className={`px-2 py-0.5 text-[10px] font-black rounded cursor-pointer ${
                    electricMode === 'exclude'
                      ? 'bg-rose-500 text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  ไม่เอา ❌
                </button>
              </div>
            </div>

            {/* Type selections */}
            <div className="grid grid-cols-2 gap-2">
              {electricityTypeList.map(item => {
                const isSelected = electricSelected.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleElectricType(item.id)}
                    className={`px-2.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all border cursor-pointer ${
                      isSelected
                        ? electricMode === 'include'
                          ? 'bg-amber-300 text-amber-950 border-[#33272A]'
                          : 'bg-rose-100 text-rose-950 border-rose-400 line-through'
                        : 'bg-white dark:bg-[#1a1214] text-slate-500 border-slate-300 dark:border-slate-700 opacity-60'
                    }`}
                  >
                    {isSelected ? <CheckSquare className="h-4 w-4 shrink-0 text-[#33272A]" /> : <Square className="h-4 w-4 shrink-0 text-slate-400" />}
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              {electricMode === 'include' ? '✓ แสดงโรงเรียนที่อยู่ในประเภทที่เลือก' : '❌ ไม่แสดงโรงเรียนในประเภทที่เลือก'}
            </p>
          </div>

          {/* 2. กรองระบบอินเทอร์เน็ต */}
          <div className="p-3.5 rounded-2xl bg-[#FFF9F5] dark:bg-[#251b1e] border-2 border-[#33272A]/30 dark:border-[#FFD3B6]/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-sky-500 shrink-0" />
                ข้อมูลอินเทอร์เน็ต:
              </span>

              {/* Mode Toggle: เอาเฉพาะ vs ไม่เอา */}
              <div className="flex items-center bg-white dark:bg-[#150e10] p-0.5 rounded-lg border border-[#33272A]/20">
                <button
                  type="button"
                  onClick={() => setInternetMode('include')}
                  className={`px-2 py-0.5 text-[10px] font-black rounded cursor-pointer ${
                    internetMode === 'include'
                      ? 'bg-sky-400 text-[#33272A]'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  เอาเฉพาะ
                </button>
                <button
                  type="button"
                  onClick={() => setInternetMode('exclude')}
                  className={`px-2 py-0.5 text-[10px] font-black rounded cursor-pointer ${
                    internetMode === 'exclude'
                      ? 'bg-rose-500 text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  ไม่เอา ❌
                </button>
              </div>
            </div>

            {/* Type selections */}
            <div className="grid grid-cols-2 gap-2">
              {internetTypeList.map(item => {
                const isSelected = internetSelected.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleInternetType(item.id)}
                    className={`px-2.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all border cursor-pointer ${
                      isSelected
                        ? internetMode === 'include'
                          ? 'bg-sky-200 text-sky-950 border-[#33272A]'
                          : 'bg-rose-100 text-rose-950 border-rose-400 line-through'
                        : 'bg-white dark:bg-[#1a1214] text-slate-500 border-slate-300 dark:border-slate-700 opacity-60'
                    }`}
                  >
                    {isSelected ? <CheckSquare className="h-4 w-4 shrink-0 text-[#33272A]" /> : <Square className="h-4 w-4 shrink-0 text-slate-400" />}
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              {internetMode === 'include' ? '✓ แสดงโรงเรียนที่มีเน็ตตามประเภทที่เลือก' : '❌ ไม่แสดงโรงเรียนในประเภทที่เลือก'}
            </p>
          </div>

          {/* 3. กรองครูวิชาเอก & อำเภอ */}
          <div className="p-3.5 rounded-2xl bg-[#FFF9F5] dark:bg-[#251b1e] border-2 border-[#33272A]/30 dark:border-[#FFD3B6]/30 space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-purple-500 shrink-0" />
                  ครูวิชาเอก:
                </span>
                <div className="flex items-center bg-white dark:bg-[#150e10] p-0.5 rounded-lg border border-[#33272A]/20">
                  <button
                    type="button"
                    onClick={() => setMajorMode('has')}
                    className={`px-2 py-0.5 text-[10px] font-black rounded cursor-pointer ${
                      majorMode === 'has'
                        ? 'bg-purple-300 text-purple-950'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    มีวิชาเอก
                  </button>
                  <button
                    type="button"
                    onClick={() => setMajorMode('lacks')}
                    className={`px-2 py-0.5 text-[10px] font-black rounded cursor-pointer ${
                      majorMode === 'lacks'
                        ? 'bg-rose-500 text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    ไม่มี/ขาด
                  </button>
                </div>
              </div>

              <select
                value={selectedMajor}
                onChange={(e) => setSelectedMajor(e.target.value)}
                className="w-full rounded-xl border border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#150e10] dark:text-white px-2.5 py-1.5 text-xs font-bold cursor-pointer"
              >
                <option value="all">🎓 ทุกวิชาเอก</option>
                {availableMajors.map(m => (
                  <option key={m} value={m}>เอก{m}</option>
                ))}
              </select>
            </div>

            {/* อำเภอ */}
            <div className="space-y-1 pt-1 border-t border-[#33272A]/10 dark:border-[#FFD3B6]/10">
              <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                อำเภอ:
              </label>
              <select
                value={amphoeFilter}
                onChange={(e) => setAmphoeFilter(e.target.value)}
                className="w-full rounded-xl border border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#150e10] dark:text-white px-2.5 py-1.5 text-xs font-bold cursor-pointer"
              >
                <option value="all">📍 ทุกอำเภอ (แม่ฮ่องสอน เขต 1)</option>
                {availableAmphoes.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* กราฟภาพรวมสถิติ (แสดงเมื่อสลับไปหน้ากราฟ หรือโชว์สรุปย่อ) */}
      {activeTab === 'charts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {/* กราฟ 1: ระบบไฟฟ้า */}
          <div className="card p-4 space-y-3">
            <h3 className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-500 fill-amber-400" />
              สัดส่วนระบบไฟฟ้า ({filteredSchools.length} แห่ง)
            </h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.elecPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name.split(' ')[0]} ${value}`}
                  >
                    {chartData.elecPie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value} แห่ง`, 'จำนวน']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* กราฟ 2: อินเทอร์เน็ต */}
          <div className="card p-4 space-y-3">
            <h3 className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-sky-500" />
              สัดส่วนอินเทอร์เน็ต ({filteredSchools.length} แห่ง)
            </h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.netPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name.split(' ')[0]} ${value}`}
                  >
                    {chartData.netPie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value} แห่ง`, 'จำนวน']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* กราฟ 3: แยกตามอำเภอ */}
          <div className="card p-4 space-y-3 md:col-span-2 lg:col-span-1">
            <h3 className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-rose-500" />
              จำนวนโรงเรียนตรงเงื่อนไข รายอำเภอ
            </h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.amphoeBar} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip formatter={(value: any) => [`${value} แห่ง`, 'จำนวน']} />
                  <Bar dataKey="จำนวนโรงเรียน" fill="#FF8BA7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* รายการผลลัพธ์โรงเรียน */}
      <div className="card p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#33272A]/10 dark:border-[#FFD3B6]/20 pb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#FF8BA7]" />
            <h2 className="text-sm sm:text-base font-black text-[#33272A] dark:text-[#FFF9F5]">
              รายชื่อโรงเรียนตามเงื่อนไข ({filteredSchools.length} แห่ง)
            </h2>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ หรือรหัสโรงเรียน..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#1e1518] pl-9 pr-3 py-1.5 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5] outline-none"
            />
          </div>
        </div>

        {/* List Grid Cards */}
        {filteredSchools.length === 0 ? (
          <div className="p-8 text-center bg-[#FFF9F5] dark:bg-[#1e1518] rounded-2xl border-2 border-dashed border-[#33272A]/20 dark:border-[#FFD3B6]/20 space-y-3">
            <AlertCircle className="h-10 w-10 text-rose-400 mx-auto" />
            <div>
              <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                ไม่พบโรงเรียนที่ตรงตามเงื่อนไขตัวกรองที่คุณกำหนด
              </p>
              <p className="text-xs font-bold text-slate-400 mt-1">
                ลองปรับเปลี่ยนเงื่อนไขการเลือกเอา / ไม่เอา หรือกดปุ่มล้างตัวกรอง
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn-cute bg-rose-500 text-white text-xs font-black px-4 py-2 rounded-xl border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] cursor-pointer inline-flex items-center gap-1.5"
            >
              <RotateCcw className="h-4 w-4" />
              <span>ล้างเงื่อนไขการกรองทั้งหมด</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredSchools.map(school => (
              <div
                key={school.id}
                onClick={() => onSelectSchool(school.id)}
                className="group p-4 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#1e1518] hover:bg-[#FFF9F5] dark:hover:bg-[#261b1f] transition-all cursor-pointer shadow-[3px_3px_0px_#33272A] dark:shadow-[3px_3px_0px_#FFD3B6] flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#A0E7E5] text-[#33272A] border border-[#33272A]">
                      {school.id}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      {school.amphoe || 'อ.เมืองแม่ฮ่องสอน'}
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] group-hover:text-[#FF8BA7] transition-colors mt-2">
                    {school.name}
                  </h3>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {/* ระบบไฟฟ้า */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                      school.electricity === 'has_electric' || school.electricity === true
                        ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200'
                        : school.electricity === 'solar'
                        ? 'bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-950/80 dark:text-yellow-200'
                        : school.electricity === 'hybrid'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200'
                        : 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200'
                    }`}>
                      <Zap className="h-2.5 w-2.5 text-amber-500 fill-amber-400" />
                      {school.electricity === 'has_electric' || school.electricity === true ? 'ไฟฟ้าถาวร' :
                       school.electricity === 'solar' ? 'โซลาร์เซลล์' :
                       school.electricity === 'hybrid' ? 'ไฟฟ้าผสมผสาน' : 'ไม่มีไฟฟ้า'}
                    </span>

                    {/* เน็ต */}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-950/80 dark:text-sky-200 flex items-center gap-1">
                      <Globe className="h-2.5 w-2.5 text-sky-600" />
                      {school.internetType === 'fiber' ? 'เน็ต Fiber' :
                       school.internetType === 'satellite' ? 'ดาวเทียม' :
                       school.internetType === 'sim' ? 'SIM 4G' : 'ไม่มีเน็ต'}
                    </span>

                    {/* ครูวิชาเอก */}
                    {((school.majorSubjects && school.majorSubjects.length > 0) || (school.majorSubjectsWithStaff && school.majorSubjectsWithStaff.length > 0)) && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-950/80 dark:text-purple-200 flex items-center gap-1">
                        <GraduationCap className="h-2.5 w-2.5 text-purple-600" />
                        {school.majorSubjects ? school.majorSubjects.slice(0, 2).join(', ') : school.majorSubjectsWithStaff?.slice(0, 2).map(m=>m.name).join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#33272A]/10 dark:border-[#FFD3B6]/10 text-xs">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    บุคลากร {school.staffCount || 0} คน
                  </span>
                  <span className="text-xs font-black text-[#FF8BA7] group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                    รายละเอียด <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
