import { useState, useMemo, useEffect } from 'react';
import { School, StudentData } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Users, GraduationCap, Building2, Eye, Award, CheckCircle, Info, Sparkles, AlertCircle, MapPin, Map as MapIcon, Calendar, TrendingUp, Database, Layers, BookOpen, Search, Smartphone, Download, Share2, HelpCircle } from 'lucide-react';
import { getAmphoeAndNetwork } from '../utils/initialData';
import { Map as PigeonMap, Marker as PigeonMarker, Overlay as PigeonOverlay } from 'pigeon-maps';

interface DashboardViewProps {
  schools: School[];
  studentData: StudentData[];
  academicYear: string;
  setAcademicYear: (year: string) => void;
  availableYears: string[];
  onSelectSchool?: (id: string) => void;
  isDarkMode?: boolean;
  onFilterNavigate?: (filters: { size?: string; type?: string; amphoe?: string }) => void;
}

const COLORS = ['#A0E7E5', '#FF8BA7', '#FFD3B6', '#FFAAA5', '#60A5FA', '#A78BFA'];

export default function DashboardView({
  schools,
  studentData,
  academicYear,
  setAcademicYear,
  availableYears,
  onSelectSchool,
  isDarkMode = false,
  onFilterNavigate
}: DashboardViewProps) {
  // รหัสโรงเรียนสำหรับแผนที่แบบโต้ตอบ
  const [selectedMapSchoolId, setSelectedMapSchoolId] = useState<string>('');
  
  // สถานะค้นหาวิชาเอกภาพรวม
  const [majorSearchQuery, setMajorSearchQuery] = useState<string>('');

  // จัดการ PWA Installation (ความสามารถในการติดตั้งบนมือถือ)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // เช็คสถานะโหมด Standalone / ติดตั้งแล้ว
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  // กำหนดสไตล์กราฟตามโหมดมืด/สว่าง เพื่อความคมชัดในการอ่าน
  const chartStroke = isDarkMode ? '#FFF9F5' : '#33272A';
  const tooltipBg = isDarkMode ? '#1e1518' : '#FFF9F5';
  const tooltipBorder = isDarkMode ? '#FFD3B6' : '#33272A';
  const tooltipText = isDarkMode ? '#FFF9F5' : '#33272A';
  const tooltipShadow = isDarkMode ? '4px 4px 0px #FFD3B6' : '4px 4px 0px #33272A';

  // สถานะพิกัดและการซูมของแผนที่ PigeonMap
  const [mapCenter, setMapCenter] = useState<[number, number]>([19.3021, 97.9654]);
  const [mapZoom, setMapZoom] = useState<number>(10);

  // คัดเลือกโรงเรียนสำหรับส่องพิกัดแผนที่ภาพรวม
  const mapSchool = useMemo(() => {
    return schools.find(s => s.id === selectedMapSchoolId) || null;
  }, [schools, selectedMapSchoolId]);

  // ตัวจัดการการเลือกโรงเรียนจาก Dropdown
  const handleSelectMapSchool = (id: string) => {
    setSelectedMapSchoolId(id);
    if (!id) {
      setMapCenter([19.3021, 97.9654]);
      setMapZoom(10);
    } else {
      const target = schools.find(s => s.id === id);
      if (target) {
        setMapCenter([Number(target.latitude) || 19.3021, Number(target.longitude) || 97.9654]);
        setMapZoom(13);
      }
    }
  };

  // ตัวจัดการเมื่อคลิกที่ปักหมุดในแผนที่
  const handleMarkerClick = (school: School) => {
    setSelectedMapSchoolId(school.id);
    setMapCenter([Number(school.latitude) || 19.3021, Number(school.longitude) || 97.9654]);
    setMapZoom(13);
  };

  // สถิติจำนวนโรงเรียนจำแนกตามอำเภอ
  const amphoeStats = useMemo(() => {
    const counts: Record<string, number> = {
      "เมืองแม่ฮ่องสอน": 0,
      "ขุนยวม": 0,
      "ปาย": 0,
      "ปางมะผ้า": 0,
      "อื่นๆ/ไม่ระบุ": 0
    };
    
    schools.forEach(s => {
      const amp = s.amphoe || getAmphoeAndNetwork(s.id, s.name).amphoe || "อื่นๆ/ไม่ระบุ";
      if (counts[amp] !== undefined) {
        counts[amp]++;
      } else {
        counts["อื่นๆ/ไม่ระบุ"]++;
      }
    });
    
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0);
  }, [schools]);

  // สถิติเปรียบเทียบจำนวนนักเรียนทั้งหมดในแต่ละปีการศึกษา (ข้อ 3.2)
  const yearlyStudentsData = useMemo(() => {
    const yearlyCounts: Record<string, number> = {};
    
    studentData.forEach(s => {
      if (!s.academicYear) return;
      yearlyCounts[s.academicYear] = (yearlyCounts[s.academicYear] || 0) + s.totalStudents;
    });
    
    return Object.entries(yearlyCounts)
      .map(([year, total]) => ({ year: `ปีการศึกษา ${year}`, "นักเรียนรวม": total }))
      .sort((a, b) => a.year.localeCompare(b.year));
  }, [studentData]);

  // กรองข้อมูลตามปีการศึกษาที่เลือก
  const filteredStudents = useMemo(() => {
    return studentData.filter(s => s.academicYear === academicYear);
  }, [studentData, academicYear]);

  // คํานวณสถิติภาพรวม
  const stats = useMemo(() => {
    let totalSchools = schools.length;
    let totalStudents = 0;
    let totalMale = 0;
    let totalFemale = 0;
    let totalTeachers = 0;
    let expansionSchools = 0;

    filteredStudents.forEach(item => {
      totalStudents += item.totalStudents;
      totalMale += item.totalMale;
      totalFemale += item.totalFemale;
    });

    schools.forEach(school => {
      totalTeachers += (school.staffCount || 0);
      if (school.isExpansion) {
        expansionSchools++;
      }
    });

    // วิเคราะห์ขนาดโรงเรียน
    let small = 0, medium = 0, large = 0, extraLarge = 0;
    schools.forEach(s => {
      if (s.size === 'small') small++;
      else if (s.size === 'medium') medium++;
      else if (s.size === 'large') large++;
      else if (s.size === 'special_large') extraLarge++;
    });

    return {
      totalSchools,
      totalStudents,
      totalMale,
      totalFemale,
      totalTeachers,
      expansionSchools,
      sizeStats: [
        { name: 'ขนาดเล็ก (< 120 คน)', value: small, color: '#FF8BA7' },
        { name: 'ขนาดกลาง (120-299 คน)', value: medium, color: '#FFD3B6' },
        { name: 'ขนาดใหญ่ (300-1499 คน)', value: large, color: '#A0E7E5' },
        { name: 'ขนาดใหญ่พิเศษ (>= 1500 คน)', value: extraLarge, color: '#FFAAA5' }
      ]
    };
  }, [schools, filteredStudents]);

  // คํานวณจํานวนนักเรียนชายหญิงรวมแยกตามชั้น (อนุบาล 1 - ม.3)
  const gradeChartData = useMemo(() => {
    const gradesList = ["อ.1", "อ.2", "อ.3", "ป.1", "ป.2", "ป.3", "ป.4", "ป.5", "ป.6", "ม.1", "ม.2", "ม.3"];
    const result = gradesList.map(g => ({
      name: g,
      ชาย: 0,
      หญิง: 0,
      รวม: 0
    }));

    filteredStudents.forEach(item => {
      if (!item.grades) return;
      gradesList.forEach((grade, idx) => {
        const gradeObj = item.grades[grade];
        if (gradeObj) {
          result[idx].ชาย += gradeObj.male || 0;
          result[idx].หญิง += gradeObj.female || 0;
          result[idx].รวม += gradeObj.total || 0;
        }
      });
    });

    return result;
  }, [filteredStudents]);

  // แผนกการวิเคราะห์ข้อมูลเชิงลึก (Analytical Insights)
  const insights = useMemo(() => {
    if (stats.totalStudents === 0) return [];

    const teacherToStudentRatio = (stats.totalStudents / (stats.totalTeachers || 1)).toFixed(1);
    const avgStudentsPerSchool = (stats.totalStudents / (stats.totalSchools || 1)).toFixed(0);
    const maleRatio = ((stats.totalMale / stats.totalStudents) * 100).toFixed(1);
    const femaleRatio = ((stats.totalFemale / stats.totalStudents) * 100).toFixed(1);

    const expansionPercent = ((stats.expansionSchools / stats.totalSchools) * 100).toFixed(1);

    // หาโรงเรียนที่มีนักเรียนมากที่สุด
    let topSchool = { name: '-', count: 0 };
    filteredStudents.forEach(item => {
      if (item.totalStudents > topSchool.count) {
        topSchool = { name: item.schoolName, count: item.totalStudents };
      }
    });

    return [
      {
        title: "สัดส่วนครูต่อนักเรียน",
        desc: `เฉลี่ยครู 1 คนดูแลนักเรียน ${teacherToStudentRatio} คน ซึ่งถือเป็นอัตราส่วนที่เหมาะสมตามเกณฑ์มาตรฐาน สพฐ.`,
        type: "info"
      },
      {
        title: "ขนาดเฉลี่ยของสถานศึกษา",
        desc: `นักเรียนเฉลี่ย ${avgStudentsPerSchool} คนต่อโรงเรียน สะท้อนถึงพื้นที่ที่มีลักษณะเป็นสังคมชนบทและชุมชนบนดอยสูงในแม่ฮ่องสอน`,
        type: "success"
      },
      {
        title: "ความเท่าเทียมทางเพศ (Gender Equality)",
        desc: `สัดส่วนนักเรียนชายคิดเป็นร้อยละ ${maleRatio}% และเพศหญิงร้อยละ ${femaleRatio}% ซึ่งมีจำนวนที่ใกล้เคียงกัน`,
        type: "success"
      },
      {
        title: "โรงเรียนขยายโอกาสทางการศึกษา",
        desc: `มีโรงเรียนขยายโอกาสที่เปิดสอนถึงระดับ ม.3 จำนวน ${stats.expansionSchools} แห่ง (คิดเป็น ${expansionPercent}% ของทั้งหมด) ช่วยขยายโอกาสทางการเรียนรู้แก่เยาวชนในพื้นที่ห่างไกล`,
        type: "warning"
      }
    ];
  }, [stats, filteredStudents]);

  // คำนวณสถิติวิชาเอกทั้งหมดรวมในระดับเขตพื้นที่ (จากทุกโรงเรียน)
  const aggregatedMajors = useMemo(() => {
    const majorsMap: Record<string, { teachersCount: number; schoolCount: number }> = {};
    
    schools.forEach(school => {
      let schoolMajors: { name: string; teachersCount: number }[] = [];
      if (school.majorSubjectsWithStaff && school.majorSubjectsWithStaff.length > 0) {
        schoolMajors = school.majorSubjectsWithStaff;
      } else if (school.majorSubjects && school.majorSubjects.length > 0) {
        schoolMajors = school.majorSubjects.map(m => ({ name: m, teachersCount: 1 }));
      }
      
      const seenInSchool = new Set<string>();
      schoolMajors.forEach(m => {
        const name = m.name?.trim();
        if (!name) return;
        
        if (!majorsMap[name]) {
          majorsMap[name] = { teachersCount: 0, schoolCount: 0 };
        }
        majorsMap[name].teachersCount += (m.teachersCount || 0);
        if (!seenInSchool.has(name)) {
          majorsMap[name].schoolCount += 1;
          seenInSchool.add(name);
        }
      });
    });
    
    return Object.entries(majorsMap)
      .map(([name, data]) => ({
        name,
        teachersCount: data.teachersCount,
        schoolCount: data.schoolCount
      }))
      .sort((a, b) => b.teachersCount - a.teachersCount);
  }, [schools]);

  return (
    <div className="space-y-6">
      {/* Header และปีการศึกษา */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
            แดชบอร์ดสรุปสถิติข้อมูลนักเรียน <Sparkles className="h-5 w-5 text-amber-500 animate-bounce" />
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            วิเคราะห์และรายงานผลการศึกษา สพป.แม่ฮ่องสอน เขต 1 ถึงระดับชั้น ม.3 ประจำปีการศึกษา {academicYear}
          </p>
        </div>

        {/* ปีการศึกษา */}
        <div className="flex items-center gap-2 bg-[#FFD3B6] p-2 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] dark:bg-[#33272A] w-fit">
          <span className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] px-1">ปีการศึกษา:</span>
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="rounded-xl border-2 border-[#33272A] bg-white dark:bg-[#1e1518] px-3 py-1 text-sm font-bold text-[#33272A] dark:text-[#FFF9F5] dark:border-[#FFD3B6] outline-none"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* โรงเรียนทั้งหมด */}
        <div 
          onClick={() => onFilterNavigate?.({ type: 'all' })}
          className="relative overflow-hidden card p-6 cursor-pointer hover:scale-[1.02] hover:shadow-md hover:border-[#FF8BA7] transition-all duration-300 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#33272A]/70 dark:text-[#FFF9F5]/70 uppercase tracking-wider">สถานศึกษาทั้งหมด</span>
            <div className="rounded-2xl bg-[#FF8BA7] border-2 border-[#33272A] dark:border-[#FFD3B6] p-3 text-[#33272A] group-hover:bg-[#FFD3B6] transition-colors">
              <Building2 className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex justify-between items-end">
            <div>
              <span className="text-3xl font-black text-[#33272A] dark:text-[#FFF9F5]">{stats.totalSchools}</span>
              <span className="ml-2 text-xs font-bold text-[#33272A]/60 dark:text-[#FFF9F5]/60">โรงเรียน</span>
            </div>
            <span className="text-[10px] font-black text-[#FF8BA7] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
              ดูรายชื่อ ➡️
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#FF8BA7]"></div>
        </div>

        {/* นักเรียนทั้งหมด */}
        <div 
          onClick={() => onFilterNavigate?.({ type: 'all' })}
          className="relative overflow-hidden card p-6 cursor-pointer hover:scale-[1.02] hover:shadow-md hover:border-[#FFD3B6] transition-all duration-300 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#33272A]/70 dark:text-[#FFF9F5]/70 uppercase tracking-wider">นักเรียนทั้งหมด</span>
            <div className="rounded-2xl bg-[#FFD3B6] border-2 border-[#33272A] dark:border-[#FFD3B6] p-3 text-[#33272A] group-hover:bg-[#FF8BA7] transition-colors">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex justify-between items-end">
            <div>
              <span className="text-3xl font-black text-[#33272A] dark:text-[#FFF9F5]">{stats.totalStudents.toLocaleString()}</span>
              <span className="ml-2 text-xs font-bold text-[#33272A]/60 dark:text-[#FFF9F5]/60">คน (ชาย: {stats.totalMale} / หญิง: {stats.totalFemale})</span>
            </div>
            <span className="text-[10px] font-black text-[#FF8BA7] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
              ดูรายชื่อ ➡️
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#FFD3B6]"></div>
        </div>

        {/* ครู/บุคลากร */}
        <div 
          onClick={() => onFilterNavigate?.({ type: 'all' })}
          className="relative overflow-hidden card p-6 cursor-pointer hover:scale-[1.02] hover:shadow-md hover:border-[#A0E7E5] transition-all duration-300 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#33272A]/70 dark:text-[#FFF9F5]/70 uppercase tracking-wider">ครูและบุคลากร</span>
            <div className="rounded-2xl bg-[#A0E7E5] border-2 border-[#33272A] dark:border-[#FFD3B6] p-3 text-[#33272A] group-hover:bg-[#FFD3B6] transition-colors">
              <GraduationCap className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex justify-between items-end">
            <div>
              <span className="text-3xl font-black text-[#33272A] dark:text-[#FFF9F5]">{stats.totalTeachers}</span>
              <span className="ml-2 text-xs font-bold text-[#33272A]/60 dark:text-[#FFF9F5]/60">คน</span>
            </div>
            <span className="text-[10px] font-black text-[#A0E7E5] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
              ดูรายชื่อ ➡️
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#A0E7E5]"></div>
        </div>

        {/* โรงเรียนขยายโอกาส */}
        <div 
          onClick={() => onFilterNavigate?.({ type: 'expansion' })}
          className="relative overflow-hidden card p-6 cursor-pointer hover:scale-[1.02] hover:shadow-md hover:border-[#FF8BA7] transition-all duration-300 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#33272A]/70 dark:text-[#FFF9F5]/70 uppercase tracking-wider">ขยายโอกาส (ม.1-ม.3)</span>
            <div className="rounded-2xl bg-[#FFD3B6]/80 border-2 border-[#33272A] dark:border-[#FFD3B6] p-3 text-[#33272A] group-hover:bg-[#FF8BA7] transition-colors">
              <Award className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex justify-between items-end">
            <div>
              <span className="text-3xl font-black text-[#33272A] dark:text-[#FFF9F5]">{stats.expansionSchools}</span>
              <span className="ml-2 text-xs font-bold text-[#33272A]/60 dark:text-[#FFF9F5]/60">แห่ง</span>
            </div>
            <span className="text-[10px] font-black text-[#FF8BA7] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
              ดูรายชื่อ ➡️
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#FFD3B6]"></div>
        </div>
      </div>

      {/* แผนภูมินักเรียนแยกชาย-หญิง ตามชั้นเรียน */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* แผนภูมิแท่งเปรียบเทียบ */}
        <div className="lg:col-span-2 card p-6">
          <h3 className="text-md font-bold text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5 mb-4">
            จำนวนนักเรียนชาย-หญิง แยกรายระดับชั้นเรียน (ไม่เกิน ม.3)
          </h3>
          <div className="h-80 w-full text-xs font-bold">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeChartData} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0d9d5" className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" stroke="#4a3e42" className="hidden dark:block" />
                <XAxis dataKey="name" stroke={chartStroke} />
                <YAxis stroke={chartStroke} type="number" domain={[0, 'auto']} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '16px',
                    border: `2px solid ${tooltipBorder}`,
                    backgroundColor: tooltipBg,
                    color: tooltipText,
                    boxShadow: tooltipShadow,
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: tooltipText }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px', fontWeight: 'bold' }} />
                <Bar dataKey="ชาย" fill="#A0E7E5" stroke={chartStroke} strokeWidth={2} radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="หญิง" fill="#FF8BA7" stroke={chartStroke} strokeWidth={2} radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* แผนภูมิวงกลมสัดส่วนขนาดโรงเรียน */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-md font-bold text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5 mb-2">
              สัดส่วนขนาดสถานศึกษา (สพฐ.)
            </h3>
            <p className="text-xs text-[#33272A]/70 dark:text-[#FFF9F5]/70 mb-4 font-semibold">วิเคราะห์ขนาดสถานศึกษาจากจำนวนนักเรียนในสังกัด</p>
          </div>
          <div className="h-56 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.sizeStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.sizeStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#33272A" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {/* ตรงกลางวงกลม */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
              <span className="text-[10px] font-black text-[#33272A]/60 dark:text-[#FFF9F5]/60 uppercase">รวมทั้งหมด</span>
              <span className="text-2xl font-black text-[#33272A] dark:text-[#FFF9F5]">{stats.totalSchools}</span>
              <span className="text-[10px] font-black text-[#33272A]/60 dark:text-[#FFF9F5]/60">แห่ง</span>
            </div>
          </div>
          {/* ข้อมูลคำอธิบายวงกลม */}
          <div className="mt-4 space-y-1.5 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5]">
            {stats.sizeStats.map((entry, index) => {
              const sizeCode = entry.name.includes('เล็ก') ? 'small' : entry.name.includes('กลาง') ? 'medium' : entry.name.includes('พิเศษ') ? 'special_large' : 'large';
              return (
                <div 
                  key={index}
                  onClick={() => onFilterNavigate?.({ size: sizeCode })}
                  className="flex items-center justify-between p-1.5 rounded-xl cursor-pointer hover:bg-[#FFD3B6]/25 dark:hover:bg-slate-800/40 transition-all group"
                  title="คลิกเพื่อคัดกรองตามขนาดสถานศึกษานี้"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border border-[#33272A]" style={{ backgroundColor: entry.color }}></span>
                    <span className="text-[#33272A] dark:text-[#FFF9F5] group-hover:text-[#FF8BA7] transition-colors">{entry.name}</span>
                  </div>
                  <div className="flex items-center gap-1 font-black">
                    <span>{entry.value} แห่ง ({((entry.value / (stats.totalSchools || 1)) * 100).toFixed(0)}%)</span>
                    <span className="text-[10px] text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">➡️</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* แถวใหม่: สถิติจำนวนโรงเรียนตามอำเภอ และแนวโน้มจำนวนนักเรียนแต่ละปีการศึกษา (ข้อ 3) */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* จำนวนโรงเรียนตามอำเภอ */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-md font-bold text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5 mb-2">
              <Building2 className="h-4 w-4 text-[#FF8BA7]" /> จำนวนโรงเรียนจำแนกแต่ละอำเภอ
            </h3>
            <p className="text-xs text-[#33272A]/70 dark:text-[#FFF9F5]/70 mb-4 font-semibold">
              สัดส่วนจำนวนสถานศึกษาในเขตพื้นที่การศึกษา สพป.แม่ฮ่องสอน เขต 1
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 items-center">
            {/* แผนภูมิวงกลม */}
            <div className="h-40 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={amphoeStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={60}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {amphoeStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#33272A" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[18px] font-black text-[#33272A] dark:text-[#FFF9F5]">
                  {schools.length}
                </span>
                <span className="text-[8px] font-bold text-gray-400">แห่ง</span>
              </div>
            </div>

            {/* รายละเอียด */}
            <div className="space-y-2 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5]">
              {amphoeStats.map((entry, index) => (
                <div 
                  key={index}
                  onClick={() => onFilterNavigate?.({ amphoe: entry.name })}
                  className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-1.5 cursor-pointer p-1 rounded-lg hover:bg-[#FFD3B6]/25 dark:hover:bg-slate-800/40 transition-all group"
                  title={`คลิกเพื่อดูโรงเรียนในอำเภอ ${entry.name}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                    <span className="group-hover:text-[#FF8BA7] transition-colors">{entry.name}</span>
                  </div>
                  <div className="flex items-center gap-1 font-black">
                    <span className="text-[#FF8BA7]">{entry.value} โรงเรียน</span>
                    <span className="text-[10px] text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">➡️</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* สถิตินักเรียนทั้งหมดในแต่ละปีการศึกษา */}
        <div className="card p-6">
          <h3 className="text-md font-bold text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5 mb-2">
            <TrendingUp className="h-4 w-4 text-[#FF8BA7]" /> แนวโน้มจำนวนนักเรียนทั้งหมดแต่ละปีการศึกษา
          </h3>
          <p className="text-xs text-[#33272A]/70 dark:text-[#FFF9F5]/70 mb-4 font-semibold">
            สถิติจำนวนนักเรียนรวมทุกชั้นเรียน (ปฐมวัย - มัธยมศึกษา) เปรียบเทียบรายปีการศึกษา
          </p>
          <div className="h-44 w-full text-xs font-bold">
            {yearlyStudentsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={yearlyStudentsData} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0d9d5" className="dark:hidden" />
                  <CartesianGrid strokeDasharray="3 3" stroke="#4a3e42" className="hidden dark:block" />
                  <XAxis dataKey="year" stroke={chartStroke} />
                  <YAxis stroke={chartStroke} type="number" domain={[0, 'auto']} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '16px',
                      border: `2px solid ${tooltipBorder}`,
                      backgroundColor: tooltipBg,
                      color: tooltipText,
                      boxShadow: tooltipShadow,
                    }}
                    itemStyle={{ color: tooltipText }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="นักเรียนรวม" 
                    stroke="#FF8BA7" 
                    strokeWidth={4} 
                    dot={{ stroke: chartStroke, strokeWidth: 2, r: 6, fill: '#A0E7E5' }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">
                ไม่มีข้อมูลเปรียบเทียบปีการศึกษา
              </div>
            )}
          </div>
        </div>
      </div>

      {/* สถิติข้อมูลวิชาเอกและอัตรากำลังครูแยกตามวิชาเอกภาพรวม (Big Data Majors) */}
      <div className="card p-6 space-y-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-md font-bold text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#FF8BA7]" /> 
            ข้อมูลสารสนเทศวิชาเอกและอัตรากำลังครูแยกตามวิชาเอกภาพรวมทั้งเขตพื้นที่
          </h3>
          <p className="text-xs text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-semibold">
            รายงานวิเคราะห์ข้อมูล Big Data ด้านงานบุคคลจำแนกตามวิชาเอกและจำนวนบุคลากรครูผู้สอนในสังกัด
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* ซีกซ้าย/กลาง: แผนภูมิแท่งแสดง 10 วิชาเอกที่มีจำนวนครูมากที่สุด */}
          <div className="lg:col-span-2 bg-[#FFF9F5]/50 dark:bg-slate-900/40 p-4 rounded-2xl border-2 border-[#33272A] dark:border-slate-800">
            <h4 className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] mb-4 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-[#FF8BA7]" /> แผนภูมิแสดง 10 อันดับวิชาเอกที่มีสัดส่วนครูผู้สอนสูงสุด
            </h4>
            <div className="h-72 w-full text-xs font-bold">
              {aggregatedMajors.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={aggregatedMajors.slice(0, 10)}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0d9d5" className="dark:hidden" />
                    <CartesianGrid strokeDasharray="3 3" stroke="#4a3e42" className="hidden dark:block" />
                    <XAxis type="number" stroke={chartStroke} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" stroke={chartStroke} width={80} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '16px',
                        border: `2px solid ${tooltipBorder}`,
                        backgroundColor: tooltipBg,
                        color: tooltipText,
                        boxShadow: tooltipShadow,
                      }}
                      itemStyle={{ color: tooltipText }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                    <Bar 
                      dataKey="teachersCount" 
                      name="จำนวนครูผู้สอน (คน)" 
                      fill="#FFD3B6" 
                      stroke={chartStroke} 
                      strokeWidth={2} 
                      radius={[0, 4, 4, 0]}
                    >
                      {aggregatedMajors.slice(0, 10).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400 font-bold">
                  ไม่มีข้อมูลสถิติมหภาคของวิชาเอกในระบบ
                </div>
              )}
            </div>
          </div>

          {/* ซีกขวา: รายชื่อวิชาเอกทั้งหมด พร้อมฟังก์ชันค้นหา */}
          <div className="lg:col-span-1 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#33272A]/60 dark:text-[#FFF9F5]/60 uppercase flex items-center gap-1">
                  <Search className="h-3 w-3" /> ค้นหา/กรองวิชาเอกในเขตพื้นที่
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={majorSearchQuery}
                    onChange={(e) => setMajorSearchQuery(e.target.value)}
                    placeholder="พิมพ์ค้นหา เช่น ภาษาไทย, ภาษาอังกฤษ..."
                    className="w-full rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#1e1518] pl-8 pr-3 py-2 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5] outline-none shadow-sm"
                  />
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#33272A]/40 dark:text-[#FFF9F5]/40" />
                  {majorSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setMajorSearchQuery('')}
                      className="absolute right-2.5 top-2 text-xs font-black text-rose-400 hover:text-rose-500 cursor-pointer"
                    >
                      ล้าง
                    </button>
                  )}
                </div>
              </div>

              {/* รายการวิชาเอก */}
              <div className="bg-[#FFF9F5] dark:bg-slate-900 border-2 border-[#33272A] dark:border-slate-800 rounded-2xl p-4 shadow-md h-[180px] overflow-y-auto space-y-2 custom-scrollbar">
                {(() => {
                  const filtered = aggregatedMajors.filter(m => 
                    m.name.toLowerCase().includes(majorSearchQuery.toLowerCase())
                  );

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-8 text-xs font-bold text-slate-400">
                        ไม่พบวิชาเอกที่ค้นหา
                      </div>
                    );
                  }

                  return filtered.map((major, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#1e1518] border border-[#33272A]/10 dark:border-[#FFD3B6]/10 hover:border-[#FF8BA7] hover:scale-[1.01] transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-lg bg-[#FF8BA7]/20 border border-[#FF8BA7]/50 flex items-center justify-center text-[9px] font-black text-[#FF8BA7]">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">
                          {major.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-[#FF8BA7] block">
                          ครู {major.teachersCount} คน
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 block">
                          พบใน {major.schoolCount} โรงเรียน
                        </span>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* KPI ย่อย */}
            <div className="bg-[#A0E7E5]/20 dark:bg-slate-900/50 border border-[#33272A]/20 p-3 rounded-2xl space-y-1.5 shadow-sm mt-3 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">วิชาเอกทั้งหมดในระบบ</span>
                <span className="text-lg font-black text-[#33272A] dark:text-[#FFF9F5]">
                  {aggregatedMajors.length} สาขาวิชาเอก
                </span>
              </div>
              <div className="h-10 w-10 bg-[#A0E7E5] rounded-xl border border-[#33272A] flex items-center justify-center shadow-[1px_1px_0px_0px_#33272A]">
                <Layers className="h-5 w-5 text-[#33272A]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* แถวแผนที่ภาพรวมของแต่ละโรงเรียน (ข้อ 3.1) */}
      <div className="card p-6 space-y-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-md font-bold text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-2">
            <MapIcon className="h-5 w-5 text-[#FF8BA7]" /> 
            แผนที่ตั้งและพิกัดภูมิศาสตร์ของทุกโรงเรียนแบบโต้ตอบ (GIS)
          </h3>
          <p className="text-xs text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-semibold">
            แสดงสถานศึกษาทั้งหมด {schools.length} แห่งในเขตพื้นที่ สพป.แม่ฮ่องสอน เขต 1 บนแผนที่เดียว คลิกที่ปักหมุดเพื่อดูข้อมูลด่วนและนำทางไปยังข้อมูลเชิงลึก
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* ซีกซ้าย: รายชื่อโรงเรียนให้เลือกด่วน และแสดงข้อมูลสถานศึกษา */}
          <div className="md:col-span-1 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#33272A]/60 dark:text-[#FFF9F5]/60 uppercase">
                  ค้นหา/เลือกสถานศึกษาบนแผนที่
                </label>
                <select
                  value={selectedMapSchoolId}
                  onChange={(e) => handleSelectMapSchool(e.target.value)}
                  className="w-full rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#1e1518] px-3 py-2 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5] outline-none shadow-md"
                >
                  <option value="">-- แสดงทั้งหมด (สำนักงานเขต สพป.มส.1) --</option>
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.amphoe || getAmphoeAndNetwork(s.id, s.name).amphoe})
                    </option>
                  ))}
                </select>
              </div>

              {/* การแสดงการ์ดข้อมูลโรงเรียนย่อของแผนที่ */}
              <div className="bg-[#FFF9F5] dark:bg-slate-900 border-2 border-[#33272A] dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block">
                  {mapSchool ? "ข้อมูลสถานศึกษาที่คลิกเลือก" : "สำนักงานเขตพื้นที่การศึกษา"}
                </span>
                <div className="space-y-1.5 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5]">
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-[#FF8BA7] shrink-0 animate-bounce" /> 
                    {mapSchool ? mapSchool.name : "สพป.แม่ฮ่องสอน เขต 1"}
                  </h4>
                  {mapSchool ? (
                    <div className="space-y-1 mt-2">
                      <p className="text-[#33272A]/70 dark:text-[#FFF9F5]/70 text-[11px]">
                        อำเภอ: <span className="text-[#33272A] dark:text-[#FFF9F5]">{mapSchool.amphoe || getAmphoeAndNetwork(mapSchool.id, mapSchool.name).amphoe}</span>
                      </p>
                      <p className="text-[#33272A]/70 dark:text-[#FFF9F5]/70 text-[11px]">
                        กลุ่มเครือข่าย: <span className="text-[#33272A] dark:text-[#FFF9F5]">{mapSchool.networkGroup || getAmphoeAndNetwork(mapSchool.id, mapSchool.name).networkGroup || "ไม่ระบุ"}</span>
                      </p>
                      <p className="text-[#33272A]/70 dark:text-[#FFF9F5]/70 text-[11px]">
                        ขนาดโรงเรียน: <span className="text-[#33272A] dark:text-[#FFF9F5]">โรงเรียน{mapSchool.size === 'small' ? 'ขนาดเล็ก' : mapSchool.size === 'medium' ? 'ขนาดกลาง' : 'ขนาดใหญ่'}</span>
                      </p>
                      <p className="text-[#33272A]/70 dark:text-[#FFF9F5]/70 text-[11px]">
                        จำนวนครูและบุคลากร: <span className="text-[#33272A] dark:text-[#FFF9F5]">{mapSchool.staffCount || 0} คน</span>
                      </p>
                      <p className="text-[#33272A]/70 dark:text-[#FFF9F5]/70 text-[11px]">
                        พิกัดภูมิศาสตร์ (GIS): <span className="text-[#33272A] dark:text-[#FFF9F5] font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{mapSchool.latitude}, {mapSchool.longitude}</span>
                      </p>

                      {onSelectSchool && (
                        <button
                          onClick={() => onSelectSchool(mapSchool.id)}
                          className="w-full mt-3 btn-cute bg-[#A0E7E5] text-[#33272A] text-xs font-black py-2 shadow-[2px_2px_0px_#33272A] flex items-center justify-center gap-1.5 hover:opacity-90 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" /> ดูข้อมูลและสถิติเชิงลึกของโรงเรียนนี้
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 mt-2">
                      <p className="text-[11px] leading-relaxed text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-semibold">
                        สำนักงานเขตพื้นที่การศึกษาประถมศึกษาแม่ฮ่องสอน เขต 1 อำเภอเมืองแม่ฮ่องสอน จังหวัดแม่ฮ่องสอน 58000
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold bg-[#FFF9F5] dark:bg-slate-900 border border-dashed border-[#33272A]/20 p-2 rounded-xl text-center">
                        💡 คลิกเลือกหมุดสีต่างๆ บนแผนที่ด้านขวา เพื่อแสดงข้อมูลสถานศึกษาด่วนรายแห่ง
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* คำอธิบายสัญลักษณ์สี (Map Legend) */}
            <div className="bg-white dark:bg-[#1e1518] border border-[#33272A]/20 p-3 rounded-2xl space-y-1.5 shadow-sm mt-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">สัญลักษณ์พินสถานศึกษาตามขนาด</span>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-[#33272A] dark:text-[#FFF9F5]">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FFD3B6] border border-[#33272A]"></span>
                  <span>ขนาดเล็ก</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FFAAA5] border border-[#33272A]"></span>
                  <span>ขนาดกลาง</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#60A5FA] border border-[#33272A]"></span>
                  <span>ขนาดใหญ่ / พิเศษ</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FF8BA7] border border-[#33272A] animate-pulse"></span>
                  <span className="text-[#FF8BA7]">โรงเรียนที่เลือก</span>
                </div>
              </div>
            </div>
          </div>

          {/* ซีกขวา: แผนที่แบบโต้ตอบ PigeonMap */}
          <div className="md:col-span-2">
            <div className="relative overflow-hidden rounded-2xl border-2 border-[#33272A] bg-white shadow-[4px_4px_0px_#33272A] dark:border-[#FFD3B6] dark:shadow-none h-[320px] md:h-[380px]">
              <PigeonMap
                center={mapCenter}
                zoom={mapZoom}
                onBoundsChanged={({ center, zoom }) => {
                  setMapCenter(center);
                  setMapZoom(zoom);
                }}
              >
                {/* วาดหมุดของโรงเรียนทั้งหมด */}
                {schools.map(school => {
                  const lat = Number(school.latitude) || 19.3021;
                  const lng = Number(school.longitude) || 97.9654;
                  const isSelected = selectedMapSchoolId === school.id;
                  
                  let markerColor = '#60A5FA'; // ขนาดใหญ่ / ขนาดพิเศษ (สีฟ้า)
                  if (school.size === 'small') {
                    markerColor = '#FFD3B6'; // ขนาดเล็ก (สีส้มพาสเทล)
                  } else if (school.size === 'medium') {
                    markerColor = '#FFAAA5'; // ขนาดกลาง (สีส้มแดงพาสเทล)
                  }
                  
                  if (isSelected) {
                    markerColor = '#FF8BA7'; // หมุดที่เลือก (สีชมพูเด่น)
                  }

                  const MarkerComponent = PigeonMarker as any;
                  return (
                    <MarkerComponent
                      key={school.id}
                      width={isSelected ? 38 : 24}
                      anchor={[lat, lng]}
                      color={markerColor}
                      onClick={() => handleMarkerClick(school)}
                    />
                  );
                })}

                {/* สัญลักษณ์โอเวอร์เลย์แสดงชื่อโรงเรียนที่ถูกเลือกลอยขึ้นมาบนหัวหมุด */}
                {mapSchool && (
                  <PigeonOverlay
                    anchor={[Number(mapSchool.latitude) || 19.3021, Number(mapSchool.longitude) || 97.9654]}
                    offset={[0, -32]}
                  >
                    <div className="bg-[#FFF9F5] border-2 border-[#33272A] px-2 py-1 rounded-xl text-[10px] font-black text-[#33272A] shadow-[2px_2px_0px_#33272A] dark:bg-[#1e1518] dark:text-[#FFF9F5] whitespace-nowrap z-50">
                      📍 {mapSchool.name}
                    </div>
                  </PigeonOverlay>
                )}
              </PigeonMap>

              {/* Floating GIS HUD on Map */}
              <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10 pointer-events-none">
                <div className="backdrop-blur-md bg-[#33272A]/85 border border-[#FFD3B6]/30 px-2 py-1 rounded-lg text-[9px] font-mono text-white flex items-center gap-1.5 shadow-[2px_2px_0px_rgba(0,0,0,0.3)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[#A0E7E5] font-black uppercase tracking-wider text-[8px]">GIS SERVER</span>
                  <span className="opacity-50">|</span>
                  <span className="font-bold">ACTIVE</span>
                </div>
                <div className="backdrop-blur-md bg-emerald-950/80 border border-emerald-500/30 px-2 py-1 rounded-lg text-[9px] font-mono text-emerald-300 flex items-center gap-1.5 shadow-[2px_2px_0px_rgba(0,0,0,0.3)]">
                  <Database className="h-3 w-3 text-emerald-400 animate-bounce" style={{ animationDuration: '3s' }} />
                  <span className="font-black text-[8px] uppercase tracking-wider">SYNC</span>
                  <span className="opacity-50">|</span>
                  <span className="text-white font-bold text-[8px]">FIREBASE LIVE</span>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center mt-1.5 px-1">
              <span className="text-[10px] text-gray-400 font-bold">💡 ใช้ปุ่มกลิ้งเม้าส์เพื่อซูมแผนที่ และลากเมาส์เพื่อเลื่อนตำแหน่งดูภาพรวมเขต สพป.มส.1</span>
              {selectedMapSchoolId && (
                <button
                  onClick={() => handleSelectMapSchool('')}
                  className="text-[10px] text-[#FF8BA7] hover:underline font-black cursor-pointer"
                >
                  🔄 ล้างการเลือก / กลับสู่จุดศูนย์กลางระดับเขต
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* แถบการวิเคราะห์ข้อมูลเชิงลึก (AI-Data Insights) */}
      <div className="card bg-[#FFEEE2] dark:bg-[#2c2023] p-6">
        <h3 className="text-lg font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-[#FF8BA7]" />
          บทสรุปและผลการวิเคราะห์ข้อมูลระดับเขตพื้นที่
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className="flex gap-3 rounded-2xl bg-white border-2 border-[#33272A] p-4 dark:border-[#FFD3B6] dark:bg-[#150e10] shadow-sm hover:translate-y-[-2px] transition-all duration-200"
            >
              <div className="mt-0.5 text-[#FF8BA7] dark:text-[#FF8BA7] shrink-0">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5]">{insight.title}</h4>
                <p className="mt-1 text-xs leading-relaxed text-[#33272A]/80 dark:text-[#FFF9F5]/80 font-bold">
                  {insight.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ติดตั้งบนมือถือ (PWA Mobile Installation Widget) */}
      <div className="card border-2 border-[#33272A] bg-[#FFF9F5] dark:bg-[#1e1518] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#33272A]/10 pb-4 dark:border-[#FFD3B6]/10">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#A0E7E5] border-2 border-[#33272A] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#33272A]">
              <Smartphone className="h-5 w-5 text-[#33272A]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                ติดตั้งแอปพลิเคชัน MHS1 BIGDATA บนมือถือของคุณ
              </h3>
              <p className="text-[10px] sm:text-xs text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-bold mt-0.5">
                ใช้งานได้เสมือนแอปพลิเคชันจริง รวดเร็ว ไม่กินพื้นที่เครื่อง และเข้าถึงข้อมูลสถานศึกษาได้จากหน้าจอโฮมทันที
              </p>
            </div>
          </div>

          {/* ปุ่มสำหรับการติดตั้งด่วนเมื่อบราวเซอร์รองรับ */}
          {isInstallable && !isInstalled ? (
            <button
              onClick={handleInstallClick}
              className="btn-cute bg-[#A0E7E5] text-[#33272A] px-4 py-2.5 text-xs font-black flex items-center gap-1.5 shrink-0"
            >
              <Download className="h-4 w-4 animate-bounce" />
              <span>ติดตั้งแอปบนมือถือ</span>
            </button>
          ) : isInstalled ? (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-100 border border-emerald-400 text-emerald-800 text-[10px] font-black dark:bg-emerald-950/20 dark:text-emerald-400 flex items-center gap-1 shrink-0">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              เปิดใช้งานในรูปแบบแอปพลิเคชันแล้ว
            </div>
          ) : (
            <span className="text-[10px] font-bold text-slate-400 italic bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 shrink-0">
              พร้อมรองรับการติดตั้งแบบ PWA
            </span>
          )}
        </div>

        {/* คู่มือคำแนะนำการติดตั้งสำหรับระบบปฏิบัติการต่าง ๆ */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* iOS Safari */}
          <div className="p-4 bg-white dark:bg-slate-900 border-2 border-[#33272A] dark:border-slate-800 rounded-2xl space-y-2.5 shadow-sm hover:translate-y-[-2px] transition-transform">
            <div className="flex items-center gap-2 border-b border-[#33272A]/10 pb-2 dark:border-slate-800">
              <span className="px-2 py-0.5 text-[9px] font-black bg-[#FF8BA7] text-[#33272A] border border-[#33272A] rounded-md">iOS</span>
              <h4 className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">สำหรับ iPhone / iPad (Safari)</h4>
            </div>
            <ol className="text-[11px] font-bold text-[#33272A]/80 dark:text-[#FFF9F5]/80 space-y-2 list-decimal list-inside pl-1 leading-relaxed">
              <li>เปิดบราวเซอร์ <span className="text-[#FF8BA7]">Safari</span> เข้าสู่หน้าระบบนี้</li>
              <li>แตะที่ปุ่ม <span className="inline-flex items-center gap-0.5 bg-slate-100 px-1 py-0.5 rounded border text-[10px]"><Share2 className="h-3 w-3 inline" /> แชร์ (Share)</span> ที่แถบเมนูด้านล่าง</li>
              <li>เลื่อนลงมาและเลือก <span className="text-[#FF8BA7]">"เพิ่มไปยังหน้าจอโฮม"</span> (Add to Home Screen)</li>
              <li>แตะ <span className="font-extrabold text-[#33272A] dark:text-[#FFF9F5]">"เพิ่ม"</span> (Add) ที่มุมขวาบน เป็นอันเสร็จสิ้น!</li>
            </ol>
          </div>

          {/* Android Chrome */}
          <div className="p-4 bg-white dark:bg-slate-900 border-2 border-[#33272A] dark:border-slate-800 rounded-2xl space-y-2.5 shadow-sm hover:translate-y-[-2px] transition-transform">
            <div className="flex items-center gap-2 border-b border-[#33272A]/10 pb-2 dark:border-slate-800">
              <span className="px-2 py-0.5 text-[9px] font-black bg-[#A0E7E5] text-[#33272A] border border-[#33272A] rounded-md">Android</span>
              <h4 className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">สำหรับมือถือ Android (Chrome)</h4>
            </div>
            <ol className="text-[11px] font-bold text-[#33272A]/80 dark:text-[#FFF9F5]/80 space-y-2 list-decimal list-inside pl-1 leading-relaxed">
              <li>เปิดบราวเซอร์ <span className="text-[#A0E7E5] font-black">Google Chrome</span> เข้าสู่นี้</li>
              <li>กดปุ่มเมนู <span className="font-black text-[#33272A] dark:text-[#FFF9F5]">"จุดสามจุด (⋮)"</span> ที่มุมบนขวา</li>
              <li>เลือกเมนู <span className="text-[#A0E7E5] font-black">"ติดตั้งแอป"</span> (Install App) หรือ <span className="text-[#A0E7E5] font-black">"เพิ่มลงในหน้าจอหลัก"</span></li>
              <li>กดยืนยัน <span className="font-black">"ติดตั้ง"</span> ระบบจะดาวน์โหลดลงหน้าจอโฮมทันที</li>
            </ol>
          </div>

          {/* Desktop/PC/Mac */}
          <div className="p-4 bg-white dark:bg-slate-900 border-2 border-[#33272A] dark:border-slate-800 rounded-2xl space-y-2.5 shadow-sm hover:translate-y-[-2px] transition-transform">
            <div className="flex items-center gap-2 border-b border-[#33272A]/10 pb-2 dark:border-slate-800">
              <span className="px-2 py-0.5 text-[9px] font-black bg-[#FFD3B6] text-[#33272A] border border-[#33272A] rounded-md">Desktop</span>
              <h4 className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">สำหรับคอมพิวเตอร์ PC / Mac</h4>
            </div>
            <ol className="text-[11px] font-bold text-[#33272A]/80 dark:text-[#FFF9F5]/80 space-y-2 list-decimal list-inside pl-1 leading-relaxed">
              <li>ใช้เบราว์เซอร์ <span className="text-amber-500 font-bold">Chrome / Edge / Opera</span></li>
              <li>มองหาไอคอน <span className="inline-flex items-center gap-0.5 bg-slate-100 px-1 py-0.5 rounded border text-[10px]"><Download className="h-3 w-3 inline" /> ติดตั้งแอป (Install)</span> ที่ด้านขวาบนของแถบที่อยู่เว็บ (Address bar)</li>
              <li>คลิกไอคอนดังกล่าวแล้วกดยืนยันการติดตั้ง</li>
              <li>ระบบจะทำการสร้าง Shortcut รวดเร็วทันใจบน Desktop</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
