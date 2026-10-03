import React, { useState, useEffect, useMemo } from 'react';
import { School, User, DatabaseConfig } from './types';
import { parseInitialData } from './utils/initialData';
import { getDatabaseConfig } from './services/dbManager';
import { SummaryTable } from './components/SummaryTable';
import { SchoolCard } from './components/SchoolCard';
import { SchoolDetailModal } from './components/SchoolDetailModal';
import { AuthModal } from './components/AuthModal';
import { DatabaseSettingsModal } from './components/DatabaseSettingsModal';
import { 
  Building2, 
  Search, 
  UserCircle, 
  LogOut, 
  Zap, 
  Wifi, 
  Droplets,
  Layers,
  ShieldCheck,
  RotateCcw,
  Database,
  Server
} from 'lucide-react';

export function App() {
  const [schools, setSchools] = useState<School[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAmphoe, setSelectedAmphoe] = useState('all');
  const [selectedElectric, setSelectedElectric] = useState('all');
  const [selectedInternet, setSelectedInternet] = useState('all');
  const [selectedWater, setSelectedWater] = useState('all');
  
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>(getDatabaseConfig());

  // Function to load schools based on primary database configuration
  const loadSchoolData = async (cfg: DatabaseConfig) => {
    // If Hostatom is selected and has API URL configured, attempt fetch
    if (cfg.primarySource === 'hostatom' && cfg.hostatom.apiUrl) {
      try {
        const url = cfg.hostatom.apiUrl.includes('?') 
          ? `${cfg.hostatom.apiUrl}&action=get_schools` 
          : `${cfg.hostatom.apiUrl}?action=get_schools`;
        
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            ...(cfg.hostatom.apiKey ? { 'X-API-KEY': cfg.hostatom.apiKey } : {}),
          },
        });

        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.data) && json.data.length > 0) {
            setSchools(json.data);
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to load from Hostatom, falling back to local data', err);
      }
    }

    // Default: local verified 131 schools dataset
    const loaded = parseInitialData();
    setSchools(loaded);
  };

  // Initialize data on mount
  useEffect(() => {
    const currentCfg = getDatabaseConfig();
    setDbConfig(currentCfg);
    loadSchoolData(currentCfg);

    // Check saved user session
    try {
      const savedUser = localStorage.getItem('mhs1_current_user');
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
    } catch {}
  }, []);

  const handleConfigChange = (newConfig: DatabaseConfig) => {
    setDbConfig(newConfig);
    loadSchoolData(newConfig);
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('mhs1_current_user', JSON.stringify(user));
    } catch {}
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('mhs1_current_user');
    } catch {}
  };

  // Unique list of Amphoes
  const amphoes = useMemo(() => {
    const set = new Set(schools.map((s) => s.amphoe).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [schools]);

  // Overall statistics for Quick Metric Cards
  const metrics = useMemo(() => {
    const totalSchools = schools.length;
    const totalTeachers = schools.reduce((sum, s) => sum + (s.staff_count || 0), 0);
    
    let normalElectric = 0;
    let solarElectric = 0;
    let noElectric = 0;
    let fiberInternet = 0;
    let govWater = 0;
    let mountainWater = 0;

    schools.forEach((s) => {
      // Electric
      if (s.electricity === true || s.electricity === 'has_electric' || s.electricity === 'normal') {
        normalElectric++;
      } else if (s.electricity === 'solar' || (s.solar_kw && Number(s.solar_kw) > 0)) {
        solarElectric++;
      } else {
        noElectric++;
      }

      // Internet
      const net = (s.internet_type || '').toLowerCase();
      if (net.includes('fiber') || net.includes('ใยแก้ว')) {
        fiberInternet++;
      }

      // Water
      const w = (s.water_system || '').toLowerCase();
      if (w.includes('gov') || w.includes('ประปาเทศบาล') || w.includes('ประปาหมู่บ้าน') || w.includes('รัฐ')) {
        govWater++;
      } else if (w.includes('mountain') || w.includes('ภูเขา')) {
        mountainWater++;
      }
    });

    return {
      totalSchools,
      totalTeachers,
      normalElectric,
      solarElectric,
      noElectric,
      fiberInternet,
      govWater,
      mountainWater,
    };
  }, [schools]);

  // Filtered schools
  const filteredSchools = useMemo(() => {
    return schools.filter((school) => {
      // Search by query (ID or Name or Network)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = school.id.includes(q);
        const matchesName = school.name.toLowerCase().includes(q);
        const matchesNetwork = school.network_group.toLowerCase().includes(q);
        if (!matchesId && !matchesName && !matchesNetwork) return false;
      }

      // Filter Amphoe
      if (selectedAmphoe !== 'all' && school.amphoe !== selectedAmphoe) {
        return false;
      }

      // Filter Electricity
      if (selectedElectric !== 'all') {
        const isSolar = school.electricity === 'solar' || (school.solar_kw && Number(school.solar_kw) > 0);
        const isNormal = school.electricity === true || school.electricity === 'has_electric' || school.electricity === 'normal';
        if (selectedElectric === 'normal' && !isNormal) return false;
        if (selectedElectric === 'solar' && !isSolar) return false;
        if (selectedElectric === 'none' && (isNormal || isSolar)) return false;
      }

      // Filter Internet
      if (selectedInternet !== 'all') {
        const net = (school.internet_type || '').toLowerCase();
        if (selectedInternet === 'fiber' && !net.includes('fiber') && !net.includes('ใยแก้ว')) return false;
        if (selectedInternet === 'satellite' && !net.includes('satellite') && !net.includes('ดาวเทียม') && !net.includes('starlink') && !net.includes('sim') && !net.includes('mobile')) return false;
        if (selectedInternet === 'none' && net && net !== 'none' && net !== 'ไม่มี') return false;
      }

      // Filter Water
      if (selectedWater !== 'all') {
        const w = (school.water_system || '').toLowerCase();
        if (selectedWater === 'gov' && !w.includes('gov') && !w.includes('ประปาเทศบาล') && !w.includes('ประปาหมู่บ้าน') && !w.includes('รัฐ')) return false;
        if (selectedWater === 'mountain' && !w.includes('mountain') && !w.includes('ภูเขา')) return false;
      }

      return true;
    });
  }, [schools, searchQuery, selectedAmphoe, selectedElectric, selectedInternet, selectedWater]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Sarabun',sans-serif]">
      {/* Top Navigation */}
      <header className="bg-white border-b-2 border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-700 to-blue-900 flex items-center justify-center text-white shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-slate-900 text-base sm:text-lg leading-tight flex items-center gap-1.5">
                <span>สพป.แม่ฮ่องสอน เขต 1 Big Data</span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-bold bg-blue-100 text-blue-900 rounded-md">
                  มส.1
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                ระบบฐานข้อมูลและสารสนเทศทางการศึกษา สำนักงานเขตพื้นที่การศึกษาประถมศึกษาแม่ฮ่องสอน เขต 1
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Database Selector & Migration Button */}
            <button
              onClick={() => setIsDbModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-2xs ${
                dbConfig.primarySource === 'hostatom'
                  ? 'bg-blue-50 border-blue-400 text-blue-800 hover:bg-blue-100'
                  : dbConfig.primarySource === 'firebase'
                  ? 'bg-amber-50 border-amber-400 text-amber-900 hover:bg-amber-100'
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
              title="คลิกเพื่อจัดการและเลือกฐานข้อมูลหลัก (Hostatom / Firebase / Local)"
            >
              <Database className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="hidden md:inline">ฐานข้อมูลหลัก:</span>
              <span className="font-black text-blue-700">
                {dbConfig.primarySource === 'hostatom'
                  ? 'Hostatom MySQL'
                  : dbConfig.primarySource === 'firebase'
                  ? 'Firebase'
                  : 'Local Data'}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 ml-0.5"></span>
            </button>

            {currentUser ? (
              <div className="flex items-center gap-3 bg-slate-100 pl-3 pr-2 py-1.5 rounded-full border border-slate-300">
                <div className="text-right text-xs">
                  <div className="font-bold text-slate-800 leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-blue-700 font-semibold truncate max-w-[140px]">
                    {currentUser.school_name}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="ออกจากระบบ"
                  className="p-1.5 text-slate-500 hover:text-rose-600 rounded-full hover:bg-slate-200 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                <UserCircle className="w-4 h-4" />
                <span>ลงทะเบียน / เข้าสู่ระบบ</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* Verification banner for requested schools */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50 border-2 border-blue-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-slate-900 text-sm sm:text-base">
                  ตรวจสอบและแยกข้อมูลสถานศึกษาถูกต้องตามฐานข้อมูลทางการ
                </h2>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full border border-emerald-300">
                  Verified
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-1">
                รหัส <strong>58010045</strong> คือ โรงเรียนบ้านห้วยช่างคำ • รหัส <strong>58010021</strong> คือ โรงเรียนบ้านห้วยช่างคำ สาขาบ้านห้วยช่างเหล็ก (ข้อมูลไม่ซ้ำซ้อน)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-stretch md:self-auto">
            <button
              onClick={() => setSearchQuery('58010045')}
              className="flex-1 md:flex-none px-3.5 py-1.5 bg-white border-2 border-blue-400 hover:border-blue-600 rounded-xl text-xs font-bold text-blue-900 shadow-xs hover:bg-blue-50 transition"
            >
              ดู 58010045 (ห้วยช่างคำ)
            </button>
            <button
              onClick={() => setSearchQuery('58010021')}
              className="flex-1 md:flex-none px-3.5 py-1.5 bg-white border-2 border-indigo-400 hover:border-indigo-600 rounded-xl text-xs font-bold text-indigo-900 shadow-xs hover:bg-indigo-50 transition"
            >
              ดู 58010021 (สาขาห้วยช่างเหล็ก)
            </button>
          </div>
        </div>

        {/* Distinct Categorized Metric Cards at the Top */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Card 1: Schools (Slate) */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-300 font-bold mb-1">
              <span>สถานศึกษา</span>
              <Building2 className="w-4 h-4 text-slate-300" />
            </div>
            <div className="text-2xl font-black text-white">{metrics.totalSchools}</div>
            <span className="text-[11px] text-slate-400">แห่งในสังกัด</span>
          </div>

          {/* Card 2: Staff (Violet) */}
          <div className="bg-violet-900 text-white rounded-2xl p-4 shadow-sm border border-violet-800">
            <div className="flex items-center justify-between text-xs text-violet-200 font-bold mb-1">
              <span>ครู/บุคลากร</span>
              <Building2 className="w-4 h-4 text-violet-300" />
            </div>
            <div className="text-2xl font-black text-white">{metrics.totalTeachers.toLocaleString()}</div>
            <span className="text-[11px] text-violet-300">คนทั้งหมด</span>
          </div>

          {/* Card 3: Electricity (Amber) */}
          <div className="bg-amber-500 text-white rounded-2xl p-4 shadow-sm border border-amber-600">
            <div className="flex items-center justify-between text-xs text-amber-100 font-bold mb-1">
              <span>ระบบไฟฟ้า</span>
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <div className="text-2xl font-black text-white">{metrics.normalElectric + metrics.solarElectric}</div>
            <span className="text-[11px] text-amber-100">
              กฟภ. {metrics.normalElectric} | โซลาร์ {metrics.solarElectric}
            </span>
          </div>

          {/* Card 4: Internet (Blue) */}
          <div className="bg-blue-600 text-white rounded-2xl p-4 shadow-sm border border-blue-700">
            <div className="flex items-center justify-between text-xs text-blue-100 font-bold mb-1">
              <span>อินเทอร์เน็ต</span>
              <Wifi className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-white">{metrics.fiberInternet}</div>
            <span className="text-[11px] text-blue-100">Fiber ความเร็วสูง</span>
          </div>

          {/* Card 5: Water (Teal) */}
          <div className="bg-teal-600 text-white rounded-2xl p-4 shadow-sm border border-teal-700 col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-xs text-teal-100 font-bold mb-1">
              <span>ระบบน้ำประปา</span>
              <Droplets className="w-4 h-4 fill-white" />
            </div>
            <div className="text-2xl font-black text-white">{metrics.govWater + metrics.mountainWater}</div>
            <span className="text-[11px] text-teal-100">
              รัฐ {metrics.govWater} | ภูเขา {metrics.mountainWater}
            </span>
          </div>
        </div>

        {/* Search & Distinct Color-Coded Filter Bar */}
        <div className="bg-white rounded-2xl p-5 border-2 border-slate-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                ค้นหาสถานศึกษา
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="พิมพ์รหัส หรือชื่อโรงเรียน..."
                  className="w-full pl-9 pr-7 py-2 bg-slate-50 border-2 border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Amphoe Filter (Slate/Blue) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                สังกัดอำเภอ
              </label>
              <select
                value={selectedAmphoe}
                onChange={(e) => setSelectedAmphoe(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              >
                <option value="all">ทุกอำเภอ ({schools.length} แห่ง)</option>
                {amphoes.filter((a) => a !== 'all').map((amphoe) => (
                  <option key={amphoe} value={amphoe}>
                    อำเภอ{amphoe}
                  </option>
                ))}
              </select>
            </div>

            {/* Electricity Filter (Amber Accent) */}
            <div>
              <label className="block text-[11px] font-bold text-amber-900 mb-1 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                <span>หมวดระบบไฟฟ้า</span>
              </label>
              <select
                value={selectedElectric}
                onChange={(e) => setSelectedElectric(e.target.value)}
                className="w-full px-3 py-2 bg-amber-50/50 border-2 border-amber-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 text-amber-950"
              >
                <option value="all">⚡ ไฟฟ้า: ทั้งหมด</option>
                <option value="normal">⚡ ไฟฟ้าปกติ กฟภ.</option>
                <option value="solar">☀️ โซลาร์เซลล์ (Solar)</option>
                <option value="none">⚠️ ไม่มีไฟฟ้า</option>
              </select>
            </div>

            {/* Internet Filter (Blue Accent) */}
            <div>
              <label className="block text-[11px] font-bold text-blue-900 mb-1 flex items-center gap-1">
                <Wifi className="w-3.5 h-3.5 text-blue-600" />
                <span>หมวดอินเทอร์เน็ต</span>
              </label>
              <select
                value={selectedInternet}
                onChange={(e) => setSelectedInternet(e.target.value)}
                className="w-full px-3 py-2 bg-blue-50/50 border-2 border-blue-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-950"
              >
                <option value="all">📶 อินเทอร์เน็ต: ทั้งหมด</option>
                <option value="fiber">🌐 ใยแก้วนำแสง (Fiber)</option>
                <option value="satellite">📡 ดาวเทียม/ซิม</option>
                <option value="none">🚫 ไม่มีอินเทอร์เน็ต</option>
              </select>
            </div>

            {/* Water Filter (Teal Accent) */}
            <div>
              <label className="block text-[11px] font-bold text-teal-900 mb-1 flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-teal-600 fill-teal-500" />
                <span>หมวดระบบน้ำประปา</span>
              </label>
              <select
                value={selectedWater}
                onChange={(e) => setSelectedWater(e.target.value)}
                className="w-full px-3 py-2 bg-teal-50/50 border-2 border-teal-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 text-teal-950"
              >
                <option value="all">💧 ประปา: ทั้งหมด</option>
                <option value="gov">🚰 ประปารัฐ/หมู่บ้าน</option>
                <option value="mountain">🏔️ ประปาภูเขา</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs font-medium text-slate-600">
            <span>
              แสดงข้อมูล <strong>{filteredSchools.length}</strong> จากทั้งหมด <strong>{schools.length}</strong> แห่ง
            </span>
            {(searchQuery || selectedAmphoe !== 'all' || selectedElectric !== 'all' || selectedInternet !== 'all' || selectedWater !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedAmphoe('all');
                  setSelectedElectric('all');
                  setSelectedInternet('all');
                  setSelectedWater('all');
                }}
                className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ล้างตัวกรองทั้งหมด</span>
              </button>
            )}
          </div>
        </div>

        {/* School Cards Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>รายชื่อสถานศึกษาและสาขาในสังกัด สพป.แม่ฮ่องสอน เขต 1 ({filteredSchools.length} แห่ง)</span>
            </h3>
          </div>

          {filteredSchools.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border-2 border-slate-200">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-800 text-base font-bold">ไม่พบข้อมูลสถานศึกษาตามเงื่อนไขที่เลือก</p>
              <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหาหรือกดล้างตัวกรอง</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredSchools.map((school) => (
                <SchoolCard
                  key={school.id}
                  school={school}
                  onClick={() => setSelectedSchool(school)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom Section: Single Consolidated Summary Table requested by user */}
        <div className="pt-6 border-t-2 border-slate-300">
          <SummaryTable schools={schools} />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 mt-12">
        <p className="font-bold text-slate-700">สำนักงานเขตพื้นที่การศึกษาประถมศึกษาแม่ฮ่องสอน เขต 1 (สพป.มส.1)</p>
        <p className="mt-1 text-[11px] text-slate-400">ระบบบริหารจัดการฐานข้อมูลสารสนเทศทางการศึกษา (Big Data Platform)</p>
      </footer>

      {/* Modals */}
      <SchoolDetailModal
        school={selectedSchool}
        onClose={() => setSelectedSchool(null)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        schools={schools}
        onLoginSuccess={handleLoginSuccess}
      />

      <DatabaseSettingsModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        schools={schools}
        onConfigChange={handleConfigChange}
      />
    </div>
  );
}
