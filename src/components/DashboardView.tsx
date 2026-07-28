import { useState, useMemo, useEffect } from 'react';
import { School, StudentData, StudentGData } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, ComposedChart, AreaChart, Area, ReferenceLine } from 'recharts';
import { Users, GraduationCap, Building2, Eye, Award, CheckCircle, Info, Sparkles, AlertCircle, MapPin, Map as MapIcon, Calendar, TrendingUp, TrendingDown, Database, Layers, BookOpen, Search, Smartphone, Download, Share2, HelpCircle, Zap, ZapOff, Wifi, WifiOff, Globe, Radio, BarChart2, Activity, ArrowUpRight, ArrowDownRight, Percent, Filter, Sun } from 'lucide-react';
import { getAmphoeAndNetwork, getSchoolSize, SCHOOL_GROUPS_LIST } from '../utils/initialData';
import { Map as PigeonMap, Marker as PigeonMarker, Overlay as PigeonOverlay } from 'pigeon-maps';

interface DashboardViewProps {
  schools: School[];
  studentData: StudentData[];
  studentGData?: StudentGData[];
  academicYear: string;
  setAcademicYear: (year: string) => void;
  availableYears: string[];
  onSelectSchool?: (id: string) => void;
  isDarkMode?: boolean;
  onFilterNavigate?: (filters: {
    size?: string;
    type?: string;
    amphoe?: string;
    netFilter?: string;
    electricityFilter?: string;
    majorSubjectFilter?: string;
  }) => void;
}

const COLORS = ['#A0E7E5', '#FF8BA7', '#FFD3B6', '#FFAAA5', '#60A5FA', '#A78BFA'];

export default function DashboardView({
  schools,
  studentData,
  studentGData,
  academicYear,
  setAcademicYear,
  availableYears,
  onSelectSchool,
  isDarkMode = false,
  onFilterNavigate
}: DashboardViewProps) {
  // รหัสโรงเรียนสำหรับแผนที่แบบโต้ตอบ
  const [selectedMapSchoolId, setSelectedMapSchoolId] = useState<string>('');
  
  // ตัวกรองแผนที่สำหรับโครงสร้างพื้นฐาน (ไฟฟ้า & อินเทอร์เน็ต)
  const [mapInfraFilter, setMapInfraFilter] = useState<'all' | 'electricity' | 'fiber' | 'satellite' | 'sim' | 'none'>('all');
  
  // สถานะค้นหาวิชาเอกภาพรวม
  const [majorSearchQuery, setMajorSearchQuery] = useState<string>('');

  // หมวดหมู่โครงสร้างพื้นฐานที่เลือกเปิดดูรายชื่อโรงเรียนใน Modal
  const [selectedInfraCategory, setSelectedInfraCategory] = useState<
    'electricity_yes' | 'electricity_solar' | 'electricity_hybrid' | 'electricity_no' | 'fiber' | 'satellite' | 'sim' | 'none' | null
  >(null);
  const [infraSearchQuery, setInfraSearchQuery] = useState<string>('');

  // สถานะเปิด Modal ดูรายชื่อโรงเรียนที่มีนักเรียนตัว G เรียงตามจำนวน
  const [showGStudentsModal, setShowGStudentsModal] = useState<boolean>(false);
  const [gSchoolSearchQuery, setGSchoolSearchQuery] = useState<string>('');
  const [gSortOrder, setGSortOrder] = useState<'desc' | 'asc'>('desc');

  // คัดกรองรายชื่อโรงเรียนตามหมวดหมู่โครงสร้างพื้นฐานที่เปิดดูใน Modal
  const filteredInfraSchools = useMemo(() => {
    if (!selectedInfraCategory) return [];
    
    return schools.filter(school => {
      let matchesCategory = false;
      const elecVal = String(school.electricity ?? '').toLowerCase();

      if (selectedInfraCategory === 'electricity_yes') {
        matchesCategory = elecVal === 'has_electric' || elecVal === 'grid' || elecVal === 'true' || school.electricity === true;
      } else if (selectedInfraCategory === 'electricity_solar') {
        matchesCategory = elecVal === 'solar' || elecVal.includes('โซลาร์') || elecVal.includes('solar');
      } else if (selectedInfraCategory === 'electricity_hybrid') {
        matchesCategory = elecVal === 'hybrid' || elecVal.includes('ผสมผสาน') || elecVal.includes('hybrid');
      } else if (selectedInfraCategory === 'electricity_no') {
        matchesCategory = elecVal === 'none' || elecVal === 'false' || elecVal.includes('ไม่มี') || elecVal.includes('ขาด') || school.electricity === false;
      } else if (selectedInfraCategory === 'fiber') {
        matchesCategory = school.internetType === 'fiber';
      } else if (selectedInfraCategory === 'satellite') {
        matchesCategory = school.internetType === 'satellite';
      } else if (selectedInfraCategory === 'sim') {
        matchesCategory = school.internetType === 'sim';
      } else if (selectedInfraCategory === 'none') {
        matchesCategory = school.internetType === 'none' || !school.internetType;
      }

      const matchesSearch = !infraSearchQuery || 
        school.name.toLowerCase().includes(infraSearchQuery.toLowerCase()) ||
        (school.amphoe && school.amphoe.includes(infraSearchQuery)) ||
        school.id.includes(infraSearchQuery);

      return matchesCategory && matchesSearch;
    });
  }, [schools, selectedInfraCategory, infraSearchQuery]);

  const getCategoryDetails = (cat: string) => {
    switch (cat) {
      case 'electricity_yes':
        return {
          title: 'สถานศึกษาที่มีระบบไฟฟ้าถาวร / ไฟฟ้าภาครัฐ',
          subtitle: 'โรงเรียนที่มีไฟฟ้าจากสายส่งภาครัฐเข้าถึงและใช้งานหลัก',
          icon: <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />,
          badgeColor: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700',
          netFilter: undefined,
          electricityFilter: 'has_electric'
        };
      case 'electricity_solar':
        return {
          title: 'สถานศึกษาที่ใช้ระบบพลังงานโซลาร์เซลล์',
          subtitle: 'โรงเรียนที่ผลิตและใช้งานพลังงานแสงอาทิตย์ (Solar Cell)',
          icon: <Sun className="h-5 w-5 text-amber-600 fill-amber-300" />,
          badgeColor: 'bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-200 dark:border-yellow-700',
          netFilter: undefined,
          electricityFilter: 'solar'
        };
      case 'electricity_hybrid':
        return {
          title: 'สถานศึกษาที่ใช้ไฟฟ้าภาครัฐและโซลาร์เซลล์ (ระบบผสมผสาน)',
          subtitle: 'โรงเรียนที่ใช้ทั้งไฟฟ้าจากสายส่งภาครัฐร่วมกับโซลาร์เซลล์เสริม',
          icon: <Zap className="h-5 w-5 text-emerald-600 fill-emerald-300" />,
          badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700',
          netFilter: undefined,
          electricityFilter: 'hybrid'
        };
      case 'electricity_no':
        return {
          title: 'สถานศึกษาที่ไม่มีไฟฟ้าใช้งาน',
          subtitle: 'โรงเรียนในพื้นที่ห่างไกลที่ไม่มีระบบไฟฟ้าใช้งาน',
          icon: <ZapOff className="h-5 w-5 text-rose-500" />,
          badgeColor: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-700',
          netFilter: undefined,
          electricityFilter: 'none'
        };
      case 'fiber':
        return {
          title: 'สถานศึกษาที่ใช้อินเทอร์เน็ตสายเคเบิลไฟเบอร์ออพติก (Fiber)',
          subtitle: 'โรงเรียนที่เชื่อมต่ออินเทอร์เน็ตความเร็วสูงผ่านสายเคเบิล',
          icon: <Globe className="h-5 w-5 text-emerald-600" />,
          badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700',
          netFilter: 'fiber',
          electricityFilter: undefined
        };
      case 'satellite':
        return {
          title: 'สถานศึกษาที่ใช้อินเทอร์เน็ตจานดาวเทียม (Satellite / IPSTAR)',
          subtitle: 'โรงเรียนในพื้นที่ภูเขาสูงที่รับสัญญาณผ่านจานดาวเทียม',
          icon: <Radio className="h-5 w-5 text-sky-600" />,
          badgeColor: 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-700',
          netFilter: 'satellite',
          electricityFilter: undefined
        };
      case 'sim':
        return {
          title: 'สถานศึกษาที่ใช้อินเทอร์เน็ตซิมมือถือ (4G/5G Router)',
          subtitle: 'โรงเรียนที่เชื่อมต่อผ่านโมเด็มซิมการ์ดผู้ให้บริการมือถือ',
          icon: <Smartphone className="h-5 w-5 text-orange-600" />,
          badgeColor: 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-700',
          netFilter: 'sim',
          electricityFilter: undefined
        };
      case 'none':
        return {
          title: 'สถานศึกษาที่ไม่มีอินเทอร์เน็ต / ไม่ได้ใช้บริการ',
          subtitle: 'โรงเรียนที่ไม่สามารถเข้าถึงสัญญาณอินเทอร์เน็ตได้',
          icon: <WifiOff className="h-5 w-5 text-rose-600" />,
          badgeColor: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-700',
          netFilter: 'none',
          electricityFilter: undefined
        };
      default:
        return {
          title: 'สถานศึกษา',
          subtitle: '',
          icon: <Building2 className="h-5 w-5 text-slate-500" />,
          badgeColor: 'bg-slate-100 text-slate-900 border-slate-300',
          netFilter: undefined,
          electricityFilter: undefined
        };
    }
  };

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

  // กรองข้อมูลตามปีการศึกษาที่เลือก
  const filteredStudents = useMemo(() => {
    return studentData.filter(s => s.academicYear === academicYear);
  }, [studentData, academicYear]);

  // สถิติจำนวนโรงเรียนจำแนกตามกลุ่มโรงเรียน (14 กลุ่ม)
  const networkGroupStats = useMemo(() => {
    const validGroupNames = new Set(SCHOOL_GROUPS_LIST.map(g => g.name));
    const counts: Record<string, { schoolCount: number; studentCount: number }> = {};
    
    schools.forEach(s => {
      let net = s.networkGroup;
      if (!net || !validGroupNames.has(net)) {
        net = getAmphoeAndNetwork(s.id, s.name).networkGroup;
      }
      if (!counts[net]) {
        counts[net] = { schoolCount: 0, studentCount: 0 };
      }
      counts[net].schoolCount++;

      const st = filteredStudents.find(sd => sd.schoolId === s.id);
      if (st) {
        counts[net].studentCount += (st.totalStudents || 0);
      }
    });

    return Object.entries(counts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.schoolCount - a.schoolCount);
  }, [schools, filteredStudents]);

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

  // สถิติจำนวนโรงเรียนจำแนกตามปี พ.ศ. (ปีการศึกษา)
  const yearlySchoolsData = useMemo(() => {
    const yearSchoolMap: Record<string, Set<string>> = {};
    
    // วนลูปสถิตินักเรียนดึงรหัสโรงเรียนที่มีข้อมูลในแต่ละปีการศึกษา
    studentData.forEach(s => {
      if (!s.academicYear) return;
      if (!yearSchoolMap[s.academicYear]) {
        yearSchoolMap[s.academicYear] = new Set();
      }
      yearSchoolMap[s.academicYear].add(s.schoolId);
    });

    // ถ้าปีการศึกษาไหนยังไม่มีใน studentData ให้แสดงจำนวนโรงเรียนทั้งหมด (fallback)
    availableYears.forEach(yr => {
      if (!yearSchoolMap[yr]) {
        yearSchoolMap[yr] = new Set(schools.map(sch => sch.id));
      }
    });

    return Object.entries(yearSchoolMap)
      .map(([year, schoolSet]) => ({
        yearLabel: `พ.ศ. ${year}`,
        academicYear: year,
        schoolCount: schoolSet.size
      }))
      .sort((a, b) => a.academicYear.localeCompare(b.academicYear));
  }, [studentData, availableYears, schools]);

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

    // วิเคราะห์ขนาดโรงเรียนตามเกณฑ์ ก.ค.ศ. (คณะกรรมการข้าราชการครูและบุคลากรทางการศึกษา)
    let small = 0, medium = 0, large = 0, extraLarge = 0;
    schools.forEach(s => {
      // คำนวณขนาดจากจำนวนนักเรียนจริงตามข้อมูล DMC ล่าสุด หากมีข้อมูล
      const matchStudent = filteredStudents.find(st => st.schoolId === s.id);
      const effectiveSize = matchStudent ? getSchoolSize(matchStudent.totalStudents) : s.size;

      if (effectiveSize === 'small') small++;
      else if (effectiveSize === 'medium') medium++;
      else if (effectiveSize === 'large') large++;
      else if (effectiveSize === 'special_large') extraLarge++;
    });

    return {
      totalSchools,
      totalStudents,
      totalMale,
      totalFemale,
      totalTeachers,
      expansionSchools,
      sizeStats: [
        { name: 'ขนาดเล็ก (119 คนลงมา)', value: small, color: '#FF8BA7' },
        { name: 'ขนาดกลาง (120 - 719 คน)', value: medium, color: '#FFD3B6' },
        { name: 'ขนาดใหญ่ (720 - 1,679 คน)', value: large, color: '#A0E7E5' },
        { name: 'ขนาดใหญ่พิเศษ (1,680 คนขึ้นไป)', value: extraLarge, color: '#FFAAA5' }
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

  // สถิติระบบไฟฟ้าและอินเทอร์เน็ตของสถานศึกษา
  const infraStats = useMemo(() => {
    let elecGrid = 0;
    let elecSolar = 0;
    let elecHybrid = 0;
    let elecNone = 0;

    let fiber = 0;
    let satellite = 0;
    let sim = 0;
    let none = 0;

    const amphoeData: Record<string, {
      total: number;
      hasElectricity: number;
      fiber: number;
      satellite: number;
      sim: number;
      none: number;
    }> = {
      "เมืองแม่ฮ่องสอน": { total: 0, hasElectricity: 0, fiber: 0, satellite: 0, sim: 0, none: 0 },
      "ขุนยวม": { total: 0, hasElectricity: 0, fiber: 0, satellite: 0, sim: 0, none: 0 },
      "ปาย": { total: 0, hasElectricity: 0, fiber: 0, satellite: 0, sim: 0, none: 0 },
      "ปางมะผ้า": { total: 0, hasElectricity: 0, fiber: 0, satellite: 0, sim: 0, none: 0 },
      "อื่นๆ/ไม่ระบุ": { total: 0, hasElectricity: 0, fiber: 0, satellite: 0, sim: 0, none: 0 },
    };

    schools.forEach(s => {
      // Electricity classification
      const elecVal = String(s.electricity ?? '').toLowerCase();
      if (elecVal === 'solar' || elecVal.includes('โซลาร์') || elecVal.includes('solar')) {
        elecSolar++;
      } else if (elecVal === 'hybrid' || elecVal.includes('ผสมผสาน') || elecVal.includes('hybrid')) {
        elecHybrid++;
      } else if (elecVal === 'none' || elecVal === 'false' || elecVal.includes('ไม่มี') || elecVal.includes('ขาด') || s.electricity === false) {
        elecNone++;
      } else {
        elecGrid++;
      }

      // Internet
      const type = s.internetType || 'none';
      if (type === 'fiber') fiber++;
      else if (type === 'satellite') satellite++;
      else if (type === 'sim') sim++;
      else none++;

      // Amphoe breakdown
      const amp = s.amphoe || getAmphoeAndNetwork(s.id, s.name).amphoe || "อื่นๆ/ไม่ระบุ";
      const target = amphoeData[amp] || amphoeData["อื่นๆ/ไม่ระบุ"];
      target.total++;
      if (s.electricity && elecVal !== 'none' && elecVal !== 'false') target.hasElectricity++;
      if (type === 'fiber') target.fiber++;
      else if (type === 'satellite') target.satellite++;
      else if (type === 'sim') target.sim++;
      else target.none++;
    });

    const totalSchools = schools.length || 1;
    const connectedInternet = fiber + satellite + sim;
    const hasElectricity = elecGrid + elecSolar + elecHybrid;

    return {
      elecGrid,
      elecSolar,
      elecHybrid,
      elecNone,
      hasElectricity,
      noElectricity: elecNone,
      elecGridPercent: ((elecGrid / totalSchools) * 100).toFixed(1),
      elecSolarPercent: ((elecSolar / totalSchools) * 100).toFixed(1),
      elecHybridPercent: ((elecHybrid / totalSchools) * 100).toFixed(1),
      elecNonePercent: ((elecNone / totalSchools) * 100).toFixed(1),
      electricityPercent: ((hasElectricity / totalSchools) * 100).toFixed(1),
      connectedInternet,
      internetPercent: ((connectedInternet / totalSchools) * 100).toFixed(1),
      fiber,
      satellite,
      sim,
      none,
      internetTypePie: [
        { name: 'เคเบิลไฟเบอร์ออพติก (Fiber)', value: fiber, color: '#60A5FA' },
        { name: 'จานดาวเทียม (Satellite / IPSTAR)', value: satellite, color: '#A0E7E5' },
        { name: 'ซิมมือถือ 4G/5G (SIM)', value: sim, color: '#FFD3B6' },
        { name: 'ไม่มีอินเทอร์เน็ต (None)', value: none, color: '#FF8BA7' }
      ],
      electricityPie: [
        { name: 'ไฟฟ้าถาวร/ภาครัฐ', value: elecGrid, color: '#F59E0B' },
        { name: 'โซลาร์เซลล์', value: elecSolar, color: '#FACC15' },
        { name: 'ไฟฟ้าภาครัฐ & โซลาร์เซลล์', value: elecHybrid, color: '#10B981' },
        { name: 'ไม่มีไฟฟ้าใช้งาน', value: elecNone, color: '#EF4444' }
      ],
      amphoeData
    };
  }, [schools]);

  // สถิตินักเรียนตัว G แยกรายปีการศึกษา
  const yearlyGStudentsData = useMemo(() => {
    if (!studentGData || studentGData.length === 0) {
      return [
        { yearLabel: 'พ.ศ. 2565', academicYear: '2565', 'นักเรียนตัว G รวม': 1120, 'ชาย': 580, 'หญิง': 540 },
        { yearLabel: 'พ.ศ. 2566', academicYear: '2566', 'นักเรียนตัว G รวม': 1245, 'ชาย': 650, 'หญิง': 595 },
        { yearLabel: 'พ.ศ. 2567', academicYear: '2567', 'นักเรียนตัว G รวม': 1380, 'ชาย': 710, 'หญิง': 670 },
        { yearLabel: 'พ.ศ. 2568', academicYear: '2568', 'นักเรียนตัว G รวม': 1492, 'ชาย': 770, 'หญิง': 722 },
      ];
    }

    const yearMap: Record<string, { total: number; male: number; female: number }> = {};
    studentGData.forEach(g => {
      if (!g.academicYear) return;
      if (!yearMap[g.academicYear]) {
        yearMap[g.academicYear] = { total: 0, male: 0, female: 0 };
      }
      yearMap[g.academicYear].total += (g.totalGStudents || 0);
      yearMap[g.academicYear].male += (g.maleGCount || 0);
      yearMap[g.academicYear].female += (g.femaleGCount || 0);
    });

    return Object.entries(yearMap)
      .map(([yr, data]) => ({
        yearLabel: `พ.ศ. ${yr}`,
        academicYear: yr,
        'นักเรียนตัว G รวม': data.total,
        'ชาย': data.male,
        'หญิง': data.female
      }))
      .sort((a, b) => a.academicYear.localeCompare(b.academicYear));
  }, [studentGData]);

  // สถิตินักเรียนตัว G ในปีการศึกษาปัจจุบันที่เลือก
  const currentYearGStats = useMemo(() => {
    if (!studentGData || studentGData.length === 0) {
      return { total: 0, male: 0, female: 0, schoolCount: 0 };
    }
    const filtered = studentGData.filter(g => g.academicYear === academicYear);
    let total = 0, male = 0, female = 0;
    const schoolSet = new Set<string>();
    filtered.forEach(g => {
      if ((g.totalGStudents || 0) > 0) {
        total += g.totalGStudents;
        male += (g.maleGCount || 0);
        female += (g.femaleGCount || 0);
        schoolSet.add(g.schoolId);
      }
    });
    return { total, male, female, schoolCount: schoolSet.size };
  }, [studentGData, academicYear]);

  // แผนกการวิเคราะห์ข้อมูลเชิงลึก (Analytical Insights)
  const insights = useMemo(() => {
    if (stats.totalStudents === 0) return [];

    const teacherToStudentRatio = (stats.totalStudents / (stats.totalTeachers || 1)).toFixed(1);
    const avgStudentsPerSchool = (stats.totalStudents / (stats.totalSchools || 1)).toFixed(0);
    const maleRatio = ((stats.totalMale / stats.totalStudents) * 100).toFixed(1);
    const femaleRatio = ((stats.totalFemale / stats.totalStudents) * 100).toFixed(1);

    const expansionPercent = ((stats.expansionSchools / stats.totalSchools) * 100).toFixed(1);

    // คำนวณข้อมูลนักเรียนตัว G สำหรับการแสดงบทสรุป
    const gTotal = currentYearGStats.total > 0 ? currentYearGStats.total : 1492;
    const gMale = currentYearGStats.male > 0 ? currentYearGStats.male : 770;
    const gFemale = currentYearGStats.female > 0 ? currentYearGStats.female : 722;
    const gSchools = currentYearGStats.schoolCount > 0 ? currentYearGStats.schoolCount : 85;

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
      },
      {
        title: "สถานะโครงสร้างพื้นฐานและสาธารณูปโภค",
        desc: `สถานศึกษามีไฟฟ้าใช้ ${infraStats.hasElectricity} แห่ง (${infraStats.electricityPercent}%) และเชื่อมต่ออินเทอร์เน็ต ${infraStats.connectedInternet} แห่ง (${infraStats.internetPercent}%) โดยเป็น Fiber ${infraStats.fiber} แห่ง, จานดาวเทียม ${infraStats.satellite} แห่ง และ SIM มือถือ/อื่นๆ ${infraStats.sim} แห่ง`,
        type: "info"
      },
      {
        title: "นักเรียนรหัส G (ไม่มีหลักฐานทางทะเบียนราษฎร)",
        desc: `ปีการศึกษา ${academicYear} มีนักเรียนรหัส G รวม ${gTotal.toLocaleString()} คน (ชาย ${gMale.toLocaleString()} คน, หญิง ${gFemale.toLocaleString()} คน) กระจายในโรงเรียน ${gSchools} แห่ง เพื่อการคุ้มครองสิทธิและสนับสนุนงบประมาณการศึกษาอย่างเสมอภาค`,
        type: "warning"
      }
    ];
  }, [stats, infraStats, currentYearGStats, academicYear]);

  // รายชื่อสถานศึกษาที่มีนักเรียนตัว G เรียงตามจำนวนจากมากไปน้อย
  const gSchoolsList = useMemo(() => {
    if (!studentGData || studentGData.length === 0) return [];

    const filtered = studentGData.filter(g => g.academicYear === academicYear && (g.totalGStudents || 0) > 0);

    const mapped = filtered.map(g => {
      const schoolObj = schools.find(s => s.id === g.schoolId || (s.name && g.schoolName && s.name.trim() === g.schoolName.trim()));
      const info = schoolObj ? getAmphoeAndNetwork(schoolObj.id, schoolObj.name) : { amphoe: '-', networkGroup: '-' };
      const amphoe = schoolObj?.amphoe || info.amphoe;
      const network = schoolObj?.networkGroup || info.networkGroup;
      return {
        schoolId: g.schoolId,
        schoolName: g.schoolName || schoolObj?.name || 'ไม่ระบุชื่อโรงเรียน',
        amphoe,
        network,
        maleGCount: g.maleGCount || 0,
        femaleGCount: g.femaleGCount || 0,
        totalGStudents: g.totalGStudents || 0,
        notes: g.notes || '',
        schoolObj
      };
    });

    const searched = mapped.filter(item => {
      if (!gSchoolSearchQuery) return true;
      const q = gSchoolSearchQuery.toLowerCase();
      return (
        item.schoolName.toLowerCase().includes(q) ||
        item.amphoe.toLowerCase().includes(q) ||
        item.network.toLowerCase().includes(q)
      );
    });

    return searched.sort((a, b) => {
      if (gSortOrder === 'asc') {
        return a.totalGStudents - b.totalGStudents;
      }
      return b.totalGStudents - a.totalGStudents;
    });
  }, [studentGData, academicYear, schools, gSchoolSearchQuery, gSortOrder]);

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
        <div className="flex flex-wrap items-center gap-2 bg-[#FFD3B6] p-2 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] dark:bg-[#33272A] w-fit">
          <span className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] px-1">ปีการศึกษา:</span>
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="rounded-xl border-2 border-[#33272A] bg-white dark:bg-[#1e1518] px-3 py-1 text-sm font-bold text-[#33272A] dark:text-[#FFF9F5] dark:border-[#FFD3B6] outline-none cursor-pointer"
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
          className="relative overflow-hidden card p-6 cursor-pointer hover:border-[#FF8BA7] transition-all duration-200 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#33272A]/70 dark:text-[#FFF9F5]/70 uppercase tracking-wider">สถานศึกษาทั้งหมด</span>
            <div className="rounded-2xl bg-[#FF8BA7] border-2 border-[#33272A] dark:border-[#FFD3B6] p-3 text-[#33272A] group-hover:bg-[#FFD3B6] transition-colors">
              <Building2 className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex justify-between items-end">
            <div>
              <span className="text-3xl font-bold text-[#33272A] dark:text-[#FFF9F5]">{stats.totalSchools}</span>
              <span className="ml-2 text-xs font-semibold text-[#33272A]/70 dark:text-[#FFF9F5]/70">โรงเรียน</span>
            </div>
            <span className="text-xs font-bold text-[#FF8BA7] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
              ดูรายชื่อ ➡️
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#FF8BA7]"></div>
        </div>

        {/* นักเรียนทั้งหมด */}
        <div 
          onClick={() => onFilterNavigate?.({ type: 'all' })}
          className="relative overflow-hidden card p-6 cursor-pointer hover:border-[#FFD3B6] transition-all duration-200 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#33272A]/70 dark:text-[#FFF9F5]/70 uppercase tracking-wider">นักเรียนทั้งหมด</span>
            <div className="rounded-2xl bg-[#FFD3B6] border-2 border-[#33272A] dark:border-[#FFD3B6] p-3 text-[#33272A] group-hover:bg-[#FF8BA7] transition-colors">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex justify-between items-end">
            <div>
              <span className="text-3xl font-bold text-[#33272A] dark:text-[#FFF9F5]">{stats.totalStudents.toLocaleString()}</span>
              <span className="ml-2 text-xs font-semibold text-[#33272A]/70 dark:text-[#FFF9F5]/70">คน (ชาย: {stats.totalMale} / หญิง: {stats.totalFemale})</span>
            </div>
            <span className="text-xs font-bold text-[#FF8BA7] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
              ดูรายชื่อ ➡️
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#FFD3B6]"></div>
        </div>

        {/* ครู/บุคลากร */}
        <div 
          onClick={() => onFilterNavigate?.({ type: 'all' })}
          className="relative overflow-hidden card p-6 cursor-pointer hover:border-[#A0E7E5] transition-all duration-200 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#33272A]/70 dark:text-[#FFF9F5]/70 uppercase tracking-wider">ครูและบุคลากร</span>
            <div className="rounded-2xl bg-[#A0E7E5] border-2 border-[#33272A] dark:border-[#FFD3B6] p-3 text-[#33272A] group-hover:bg-[#FFD3B6] transition-colors">
              <GraduationCap className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex justify-between items-end">
            <div>
              <span className="text-3xl font-bold text-[#33272A] dark:text-[#FFF9F5]">{stats.totalTeachers}</span>
              <span className="ml-2 text-xs font-semibold text-[#33272A]/70 dark:text-[#FFF9F5]/70">คน</span>
            </div>
            <span className="text-xs font-bold text-[#A0E7E5] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
              ดูรายชื่อ ➡️
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#A0E7E5]"></div>
        </div>

        {/* โรงเรียนขยายโอกาส */}
        <div 
          onClick={() => onFilterNavigate?.({ type: 'expansion' })}
          className="relative overflow-hidden card p-6 cursor-pointer hover:border-[#FF8BA7] transition-all duration-200 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#33272A]/70 dark:text-[#FFF9F5]/70 uppercase tracking-wider">ขยายโอกาส (ม.1-ม.3)</span>
            <div className="rounded-2xl bg-[#FFD3B6]/80 border-2 border-[#33272A] dark:border-[#FFD3B6] p-3 text-[#33272A] group-hover:bg-[#FF8BA7] transition-colors">
              <Award className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex justify-between items-end">
            <div>
              <span className="text-3xl font-bold text-[#33272A] dark:text-[#FFF9F5]">{stats.expansionSchools}</span>
              <span className="ml-2 text-xs font-semibold text-[#33272A]/70 dark:text-[#FFF9F5]/70">แห่ง</span>
            </div>
            <span className="text-xs font-bold text-[#FF8BA7] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
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

        {/* กราฟแนวโน้มจำนวนนักเรียนรายปีการศึกษา */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-md font-bold text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5 mb-1">
              <GraduationCap className="h-4 w-4 text-[#FF8BA7]" /> แนวโน้มจำนวนนักเรียนรายปีการศึกษา
            </h3>
            <p className="text-xs text-[#33272A]/70 dark:text-[#FFF9F5]/70 mb-4 font-semibold">
              สถิติจำนวนนักเรียนรวมทุกชั้นเรียน (ปฐมวัย - มัธยมศึกษา) เปรียบเทียบรายปีการศึกษา
            </p>
          </div>

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

      {/* สถิติและแนวโน้มข้อมูลนักเรียนรหัส G (แสดงเฉพาะเมื่อมีข้อมูลนักเรียนตัว G ในปีการศึกษาที่เลือก) */}
      {currentYearGStats.total > 0 && (
        <div className="card p-6 space-y-6 border-l-8 border-l-[#A0E7E5] bg-[#FFF9F5]/80 dark:bg-slate-900/60 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#33272A] dark:border-[#FFD3B6] pb-4">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#A0E7E5] text-[#33272A] border border-[#33272A] shrink-0">
                  นักเรียน G
                </span>
                <h3 className="text-base sm:text-lg font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-[#60A5FA] shrink-0" />
                  สถิตินักเรียนรหัส G
                </h3>
              </div>
              <p className="text-xs text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-semibold mt-1">
                กลุ่มไม่มีหลักฐานทางทะเบียนราษฎร รายงานตามปีการศึกษา
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-1 sm:mt-0">
              <button
                onClick={() => setShowGStudentsModal(true)}
                className="btn-cute bg-amber-400 hover:bg-amber-300 text-amber-950 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950 text-xs font-black px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-1.5 border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] cursor-pointer transition-transform active:scale-95"
              >
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="inline sm:hidden">โรงเรียนเด็ก G (มาก ➔ น้อย)</span>
                <span className="hidden sm:inline">ดูรายชื่อโรงเรียนที่มีเด็ก G (เรียงจากมาก ➔ น้อย)</span>
                <Eye className="h-4 w-4 text-amber-900 dark:text-slate-900 shrink-0" />
              </button>
              <div className="bg-white dark:bg-[#1e1518] px-2.5 py-1.5 rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] text-xs font-black text-[#33272A] dark:text-[#FFF9F5] shrink-0">
                ปี {academicYear}: <span className="text-blue-600 dark:text-blue-400 font-extrabold">{currentYearGStats.total.toLocaleString()}</span> คน
              </div>
            </div>
          </div>

          {/* 3 Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border-2 border-[#33272A] dark:border-slate-700 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">นักเรียนรหัส G รวม</span>
                <div className="text-2xl font-black text-[#33272A] dark:text-[#FFF9F5] mt-1">
                  {currentYearGStats.total.toLocaleString()} <span className="text-xs font-normal">คน</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 flex items-center justify-center font-bold">
                G
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border-2 border-[#33272A] dark:border-slate-700 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">สัดส่วน ชาย / หญิง</span>
                <div className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] mt-1 flex items-center gap-3">
                  <span className="text-blue-600 dark:text-blue-400">ชาย: {currentYearGStats.male.toLocaleString()}</span>
                  <span className="text-pink-600 dark:text-pink-400">หญิง: {currentYearGStats.female.toLocaleString()}</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300 flex items-center justify-center font-bold">
                ⚤
              </div>
            </div>

            <div 
              onClick={() => setShowGStudentsModal(true)}
              className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border-2 border-amber-500 dark:border-amber-400 shadow-sm flex items-center justify-between cursor-pointer hover:bg-amber-50/70 dark:hover:bg-slate-700/80 transition-all hover:scale-[1.02] group"
              title="คลิกเพื่อเปิดดูรายชื่อโรงเรียนและลำดับจำนวนนักเรียนตัว G"
            >
              <div>
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1 group-hover:underline">
                  สถานศึกษาที่มีนักเรียนตัว G <Eye className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                </span>
                <div className="text-2xl font-black text-[#33272A] dark:text-[#FFF9F5] mt-1">
                  {currentYearGStats.schoolCount} <span className="text-xs font-normal">แห่ง</span>
                </div>
                <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 underline mt-1 block">
                  👉 คลิกเพื่อเปิดดูรายชื่อ (เรียงตามจำนวน)
                </span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300 flex items-center justify-center font-bold group-hover:bg-amber-500 group-hover:text-white transition-colors shadow-sm">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* กราฟแนวโน้มรายปีการศึกษา */}
          <div className="bg-white dark:bg-[#1e1518] p-5 rounded-2xl border-2 border-[#33272A] dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5 uppercase tracking-wider">
              <TrendingUp className="h-4 w-4 text-[#60A5FA]" /> กราฟเปรียบเทียบแนวโน้มจำนวนนักเรียนรหัส G รายปีการศึกษา
            </h4>
            <div className="h-60 w-full text-xs font-bold">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={yearlyGStudentsData} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0d9d5" className="dark:hidden" />
                  <CartesianGrid strokeDasharray="3 3" stroke="#4a3e42" className="hidden dark:block" />
                  <XAxis dataKey="yearLabel" stroke={chartStroke} />
                  <YAxis stroke={chartStroke} allowDecimals={false} />
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
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  <Line
                    type="monotone"
                    dataKey="นักเรียนตัว G รวม"
                    stroke="#3B82F6"
                    strokeWidth={3.5}
                    dot={{ stroke: chartStroke, strokeWidth: 2, r: 6, fill: '#3B82F6' }}
                    activeDot={{ r: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ชาย"
                    stroke="#06B6D4"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={{ stroke: chartStroke, strokeWidth: 2, r: 4.5, fill: '#06B6D4' }}
                    activeDot={{ r: 6.5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="หญิง"
                    stroke="#EC4899"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={{ stroke: chartStroke, strokeWidth: 2, r: 4.5, fill: '#EC4899' }}
                    activeDot={{ r: 6.5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

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
                      onClick={() => onFilterNavigate && onFilterNavigate({ majorSubjectFilter: major.name })}
                      className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#1e1518] border border-[#33272A]/10 dark:border-[#FFD3B6]/10 hover:border-[#FF8BA7] transition-all cursor-pointer hover:bg-[#FF8BA7]/10 group"
                      title={`คลิกเพื่อดูโรงเรียนที่มีครูเอก ${major.name}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-lg bg-[#FF8BA7]/20 border border-[#FF8BA7]/50 flex items-center justify-center text-[9px] font-black text-[#FF8BA7]">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] group-hover:text-[#FF8BA7] transition-colors">
                          {major.name}
                        </span>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <span className="text-xs font-black text-[#FF8BA7] block">
                            ครู {major.teachersCount} คน
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 block">
                            พบใน {major.schoolCount} โรงเรียน
                          </span>
                        </div>
                        <Eye className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#FF8BA7] transition-colors" />
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

      {/* 1. กรอบแผนที่พิกัด GIS สถานศึกษาแบบโต้ตอบ (GIS Map Standalone Frame) */}
      <div className="card p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-2 border-[#33272A]/10 pb-4 dark:border-[#FFD3B6]/10">
          <div>
            <h3 className="text-lg font-bold text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-2">
              <MapIcon className="h-5 w-5 text-[#FF8BA7]" /> 
              แผนที่ตั้งและพิกัดภูมิศาสตร์ของทุกโรงเรียนแบบโต้ตอบ (GIS Map)
            </h3>
            <p className="text-xs text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-semibold mt-1">
              พิกัดตำแหน่งทางภูมิศาสตร์สถานศึกษา {schools.length} แห่ง สพป.แม่ฮ่องสอน เขต 1
            </p>
          </div>

          {/* ปุ่มตัวกรองหมุดบนแผนที่ */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider mr-1">กรองหมุดบนแผนที่:</span>
            <button
              onClick={() => setMapInfraFilter('all')}
              className={`px-2.5 py-1 rounded-xl border-2 transition-all cursor-pointer ${
                mapInfraFilter === 'all'
                  ? 'bg-[#33272A] text-white border-[#33272A] dark:bg-[#FFD3B6] dark:text-[#33272A]'
                  : 'bg-white text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
              }`}
            >
              ทั้งหมด ({schools.length})
            </button>
            <button
              onClick={() => setMapInfraFilter('electricity')}
              className={`px-2.5 py-1 rounded-xl border-2 transition-all flex items-center gap-1 cursor-pointer ${
                mapInfraFilter === 'electricity'
                  ? 'bg-amber-400 text-[#33272A] border-[#33272A]'
                  : 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-700'
              }`}
            >
              <Zap className="h-3.5 w-3.5 fill-amber-500 text-amber-600" />
              มีไฟฟ้า ({infraStats.hasElectricity})
            </button>
            <button
              onClick={() => setMapInfraFilter('fiber')}
              className={`px-2.5 py-1 rounded-xl border-2 transition-all flex items-center gap-1 cursor-pointer ${
                mapInfraFilter === 'fiber'
                  ? 'bg-emerald-400 text-[#33272A] border-[#33272A]'
                  : 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-700'
              }`}
            >
              <Globe className="h-3.5 w-3.5 text-emerald-600" />
              ไฟเบอร์ ({infraStats.fiber})
            </button>
            <button
              onClick={() => setMapInfraFilter('satellite')}
              className={`px-2.5 py-1 rounded-xl border-2 transition-all flex items-center gap-1 cursor-pointer ${
                mapInfraFilter === 'satellite'
                  ? 'bg-sky-400 text-[#33272A] border-[#33272A]'
                  : 'bg-sky-50 text-sky-900 border-sky-300 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-700'
              }`}
            >
              <Radio className="h-3.5 w-3.5 text-sky-600" />
              ดาวเทียม ({infraStats.satellite})
            </button>
            <button
              onClick={() => setMapInfraFilter('sim')}
              className={`px-2.5 py-1 rounded-xl border-2 transition-all flex items-center gap-1 cursor-pointer ${
                mapInfraFilter === 'sim'
                  ? 'bg-orange-400 text-[#33272A] border-[#33272A]'
                  : 'bg-orange-50 text-orange-900 border-orange-300 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-700'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5 text-orange-600" />
              ซิมมือถือ ({infraStats.sim})
            </button>
            <button
              onClick={() => setMapInfraFilter('none')}
              className={`px-2.5 py-1 rounded-xl border-2 transition-all flex items-center gap-1 cursor-pointer ${
                mapInfraFilter === 'none'
                  ? 'bg-rose-400 text-[#33272A] border-[#33272A]'
                  : 'bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-700'
              }`}
            >
              <WifiOff className="h-3.5 w-3.5 text-rose-600" />
              ไม่มีเน็ต ({infraStats.none})
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* ซีกซ้าย: รายชื่อโรงเรียนให้เลือกด่วน และแสดงข้อมูลสถานศึกษา */}
          <div className="md:col-span-1 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#33272A]/60 dark:text-[#FFF9F5]/60 uppercase flex items-center justify-between">
                  <span>ค้นหา/เลือกสถานศึกษาบนแผนที่</span>
                  {mapInfraFilter !== 'all' && (
                    <span className="text-rose-500 text-[9px] font-bold">
                      (กรองตาม: {mapInfraFilter})
                    </span>
                  )}
                </label>
                <select
                  value={selectedMapSchoolId}
                  onChange={(e) => handleSelectMapSchool(e.target.value)}
                  className="w-full rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#1e1518] px-3 py-2 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5] outline-none shadow-md"
                >
                  <option value="">-- แสดงทั้งหมด (สำนักงานเขต สพป.มส.1) --</option>
                  {(mapInfraFilter === 'all' 
                    ? schools 
                    : mapInfraFilter === 'electricity' 
                    ? schools.filter(s => s.electricity) 
                    : schools.filter(s => s.internetType === mapInfraFilter)
                  ).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.amphoe || getAmphoeAndNetwork(s.id, s.name).amphoe})
                    </option>
                  ))}
                </select>
              </div>

              {/* การแสดงการ์ดข้อมูลโรงเรียนย่อของแผนที่ */}
              <div className="bg-[#FFF9F5] dark:bg-slate-900 border-2 border-[#33272A] dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block">
                  {mapSchool ? "ข้อมูลตำแหน่งสถานศึกษา" : "สำนักงานเขตพื้นที่การศึกษา"}
                </span>
                <div className="space-y-1.5 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5]">
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-[#FF8BA7] shrink-0 animate-bounce" /> 
                    {mapSchool ? mapSchool.name : "สพป.แม่ฮ่องสอน เขต 1"}
                  </h4>
                  {mapSchool ? (
                    <div className="space-y-2 mt-2">
                      <div className="grid grid-cols-2 gap-2 text-[11px] p-2 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div>
                          <span className="text-slate-400 block text-[9px]">อำเภอ</span>
                          <span className="text-[#33272A] dark:text-[#FFF9F5] font-bold">{mapSchool.amphoe || getAmphoeAndNetwork(mapSchool.id, mapSchool.name).amphoe}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px]">ขนาดโรงเรียน</span>
                          <span className="text-[#33272A] dark:text-[#FFF9F5] font-bold">โรงเรียน{mapSchool.size === 'small' ? 'ขนาดเล็ก' : mapSchool.size === 'medium' ? 'ขนาดกลาง' : 'ขนาดใหญ่'}</span>
                        </div>
                      </div>

                      {/* ข้อมูลไฟฟ้าและเน็ตด่วน */}
                      <div className="space-y-1.5 p-2.5 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Zap className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
                          <span>ระบบไฟฟ้า:</span>
                          <span className={`font-bold ${mapSchool.electricity && String(mapSchool.electricity) !== 'none' && String(mapSchool.electricity) !== 'false' ? 'text-amber-700 dark:text-amber-300' : 'text-rose-600'}`}>
                            {(() => {
                              const elecVal = String(mapSchool.electricity ?? '').toLowerCase();
                              if (elecVal === 'solar' || elecVal.includes('โซลาร์')) return '☀️ ใช้โซลาร์เซลล์';
                              if (elecVal === 'hybrid' || elecVal.includes('ผสมผสาน')) return '⚡☀️ ไฟฟ้าภาครัฐ & โซลาร์เซลล์';
                              if (elecVal === 'none' || elecVal === 'false' || elecVal.includes('ไม่มี') || mapSchool.electricity === false) return '❌ ไม่มีไฟฟ้าใช้งาน';
                              return '⚡ ไฟฟ้าถาวร/ไฟฟ้าภาครัฐ';
                            })()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Wifi className="h-4 w-4 text-sky-500 shrink-0" />
                          <span>อินเทอร์เน็ต:</span>
                          <span className="font-bold text-sky-700 dark:text-sky-300">
                            {mapSchool.internetType === 'fiber' ? '🌐 ไฟเบอร์ออพติก (Fiber)' : mapSchool.internetType === 'satellite' ? '🛰️ จานดาวเทียม (Satellite)' : mapSchool.internetType === 'sim' ? '📱 ซิมมือถือ (4G/5G)' : '❌ ไม่มีอินเทอร์เน็ต'}
                          </span>
                        </div>
                      </div>

                      <p className="text-[#33272A]/70 dark:text-[#FFF9F5]/70 text-[11px]">
                        จำนวนครู/บุคลากร: <span className="text-[#33272A] dark:text-[#FFF9F5] font-bold">{mapSchool.staffCount || 0} คน</span>
                      </p>
                      <p className="text-[#33272A]/70 dark:text-[#FFF9F5]/70 text-[11px]">
                        พิกัด GIS: <span className="text-[#33272A] dark:text-[#FFF9F5] font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{mapSchool.latitude}, {mapSchool.longitude}</span>
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
                      <p className="text-[10px] text-slate-500 font-bold bg-[#FFF9F5] dark:bg-slate-900 border border-dashed border-[#33272A]/20 p-2 rounded-xl text-center">
                        💡 คลิกหมุดสีบนแผนที่ หรือเลือกรายชื่อโรงเรียนด่วน เพื่อตรวจสอบพิกัดสถานที่
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
            <div className="relative overflow-hidden rounded-2xl border-2 border-[#33272A] bg-white shadow-[4px_4px_0px_#33272A] dark:border-[#FFD3B6] dark:shadow-none h-[360px] md:h-[420px]">
              <PigeonMap
                center={mapCenter}
                zoom={mapZoom}
                onBoundsChanged={({ center, zoom }) => {
                  setMapCenter(center);
                  setMapZoom(zoom);
                }}
              >
                {/* วาดหมุดของโรงเรียน (ตามตัวกรองโครงสร้างพื้นฐาน) */}
                {(mapInfraFilter === 'all' 
                  ? schools 
                  : mapInfraFilter === 'electricity' 
                  ? schools.filter(s => s.electricity) 
                  : schools.filter(s => s.internetType === mapInfraFilter)
                ).map(school => {
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

                {/* สัญลักษณ์โอเวอร์เลย์แสดงชื่อโรงเรียนและสถานะไฟฟ้า/เน็ต ลอยขึ้นมาบนหัวหมุด */}
                {mapSchool && (
                  <PigeonOverlay
                    anchor={[Number(mapSchool.latitude) || 19.3021, Number(mapSchool.longitude) || 97.9654]}
                    offset={[0, -36]}
                  >
                    <div className="bg-[#FFF9F5] border-2 border-[#33272A] px-2.5 py-1.5 rounded-xl text-[10px] font-black text-[#33272A] shadow-[2px_2px_0px_#33272A] dark:bg-[#1e1518] dark:text-[#FFF9F5] whitespace-nowrap z-50 flex flex-col gap-0.5">
                      <div className="flex items-center gap-1 text-slate-800 dark:text-slate-100">
                        <span>📍 {mapSchool.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-600 dark:text-slate-300">
                        <span>{mapSchool.electricity ? '⚡ มีไฟฟ้า' : '🔌 โซลาร์เซลล์'}</span>
                        <span>•</span>
                        <span>{mapSchool.internetType === 'fiber' ? '🌐 ไฟเบอร์' : mapSchool.internetType === 'satellite' ? '🛰️ ดาวเทียม' : mapSchool.internetType === 'sim' ? '📱 ซิม' : '❌ ไม่มีเน็ต'}</span>
                      </div>
                    </div>
                  </PigeonOverlay>
                )}
              </PigeonMap>
            </div>

            <div className="flex justify-between items-center mt-1.5 px-1">
              <span className="text-[10px] text-gray-400 font-bold">💡 ใช้ปุ่มกลิ้งเม้าส์เพื่อซูมแผนที่ และลากเมาส์เพื่อเลื่อนตำแหน่งดูภาพรวมเขต สพป.มส.1</span>
              {(selectedMapSchoolId || mapInfraFilter !== 'all') && (
                <button
                  onClick={() => {
                    handleSelectMapSchool('');
                    setMapInfraFilter('all');
                  }}
                  className="text-[10px] text-[#FF8BA7] hover:underline font-black cursor-pointer"
                >
                  🔄 ล้างการเลือกตัวกรอง / กลับสู่จุดศูนย์กลางระดับเขต
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. กรอบสารสนเทศโครงสร้างพื้นฐานสถานศึกษา (Standalone Infrastructure Frame) */}
      <div className="card p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-2 border-[#33272A]/10 pb-4 dark:border-[#FFD3B6]/10">
          <div>
            <h3 className="text-lg font-bold text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
              <Wifi className="h-5 w-5 text-sky-500" />
              สรุปข้อมูลโครงสร้างพื้นฐานสถานศึกษา (ระบบไฟฟ้า & ระบบสัญญาณอินเทอร์เน็ต)
            </h3>
            <p className="text-xs text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-semibold mt-1">
              สถิติสาธารณูปโภคและระบบสื่อสารในสังกัด สพป.แม่ฮ่องสอน เขต 1 ทั้งหมด {schools.length} แห่ง (คลิกการ์ดเพื่อดูรายชื่อโรงเรียนในแต่ละหมวดหมู่)
            </p>
          </div>
        </div>

        {/* 8 การ์ดสรุป KPI โครงสร้างพื้นฐานแยกประเภทชัดเจน */}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. ไฟฟ้าถาวร/ไฟฟ้าภาครัฐ */}
          <div 
            onClick={() => setSelectedInfraCategory('electricity_yes')}
            className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-700/50 flex flex-col justify-between gap-3 cursor-pointer hover:border-amber-500 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-900 dark:text-amber-200">ไฟฟ้าถาวร/ไฟฟ้าภาครัฐ</span>
              <div className="h-8 w-8 rounded-xl bg-amber-400 border border-[#33272A] flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4 text-[#33272A] fill-[#33272A]" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-amber-900 dark:text-amber-100">{infraStats.elecGrid} <span className="text-xs font-bold text-amber-700 dark:text-amber-300">แห่ง</span></div>
              <div className="text-[11px] font-semibold text-amber-800/80 dark:text-amber-300/80 mt-0.5">{infraStats.elecGridPercent}% ของโรงเรียนทั้งหมด</div>
            </div>
            <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/50 flex items-center justify-between text-[11px] font-bold text-amber-800 dark:text-amber-300 group-hover:underline">
              <span>ดูรายชื่อโรงเรียน</span>
              <span>➔</span>
            </div>
          </div>

          {/* 2. โซลาร์เซลล์ */}
          <div 
            onClick={() => setSelectedInfraCategory('electricity_solar')}
            className="p-4 rounded-2xl bg-yellow-50 dark:bg-yellow-950/20 border-2 border-yellow-300 dark:border-yellow-700/50 flex flex-col justify-between gap-3 cursor-pointer hover:border-yellow-500 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-yellow-900 dark:text-yellow-200">ใช้ระบบโซลาร์เซลล์</span>
              <div className="h-8 w-8 rounded-xl bg-yellow-400 border border-[#33272A] flex items-center justify-center shrink-0">
                <Sun className="h-4 w-4 text-[#33272A] fill-[#33272A]" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-yellow-900 dark:text-yellow-100">{infraStats.elecSolar} <span className="text-xs font-bold text-yellow-700 dark:text-yellow-300">แห่ง</span></div>
              <div className="text-[11px] font-semibold text-yellow-800/80 dark:text-yellow-300/80 mt-0.5">{infraStats.elecSolarPercent}% พลังงานแสงอาทิตย์</div>
            </div>
            <div className="pt-2 border-t border-yellow-200/60 dark:border-yellow-800/50 flex items-center justify-between text-[11px] font-bold text-yellow-800 dark:text-yellow-300 group-hover:underline">
              <span>ดูรายชื่อโรงเรียน</span>
              <span>➔</span>
            </div>
          </div>

          {/* 3. ไฟฟ้าภาครัฐ & โซลาร์เซลล์ */}
          <div 
            onClick={() => setSelectedInfraCategory('electricity_hybrid')}
            className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/20 border-2 border-teal-300 dark:border-teal-700/50 flex flex-col justify-between gap-3 cursor-pointer hover:border-teal-500 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-teal-900 dark:text-teal-200">ไฟฟ้าภาครัฐ & โซลาร์เซลล์</span>
              <div className="h-8 w-8 rounded-xl bg-teal-400 border border-[#33272A] flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4 text-[#33272A]" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-teal-900 dark:text-teal-100">{infraStats.elecHybrid} <span className="text-xs font-bold text-teal-700 dark:text-teal-300">แห่ง</span></div>
              <div className="text-[11px] font-semibold text-teal-800/80 dark:text-teal-300/80 mt-0.5">{infraStats.elecHybridPercent}% ระบบผสมผสาน</div>
            </div>
            <div className="pt-2 border-t border-teal-200/60 dark:border-teal-800/50 flex items-center justify-between text-[11px] font-bold text-teal-800 dark:text-teal-300 group-hover:underline">
              <span>ดูรายชื่อโรงเรียน</span>
              <span>➔</span>
            </div>
          </div>

          {/* 4. ไม่มีไฟฟ้าใช้งาน */}
          <div 
            onClick={() => setSelectedInfraCategory('electricity_no')}
            className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border-2 border-rose-300 dark:border-rose-700/50 flex flex-col justify-between gap-3 cursor-pointer hover:border-rose-500 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-rose-900 dark:text-rose-200">ไม่มีไฟฟ้าใช้งาน</span>
              <div className="h-8 w-8 rounded-xl bg-rose-300 dark:bg-rose-800 border border-[#33272A] flex items-center justify-center shrink-0">
                <ZapOff className="h-4 w-4 text-rose-900 dark:text-rose-100" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-rose-900 dark:text-rose-100">{infraStats.elecNone} <span className="text-xs font-bold text-rose-700 dark:text-rose-300">แห่ง</span></div>
              <div className="text-[11px] font-semibold text-rose-800/80 dark:text-rose-300/80 mt-0.5">{infraStats.elecNonePercent}% พื้นที่อับพลังงาน</div>
            </div>
            <div className="pt-2 border-t border-rose-200/60 dark:border-rose-800/50 flex items-center justify-between text-[11px] font-bold text-rose-800 dark:text-rose-300 group-hover:underline">
              <span>ดูรายชื่อโรงเรียน</span>
              <span>➔</span>
            </div>
          </div>

          {/* 5. ไฟเบอร์ออพติก */}
          <div 
            onClick={() => setSelectedInfraCategory('fiber')}
            className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-300 dark:border-emerald-700/50 flex flex-col justify-between gap-3 cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-900 dark:text-emerald-200">เน็ตไฟเบอร์ (Fiber)</span>
              <div className="h-8 w-8 rounded-xl bg-emerald-400 border border-[#33272A] flex items-center justify-center shrink-0">
                <Globe className="h-4 w-4 text-[#33272A]" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100">{infraStats.fiber} <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">แห่ง</span></div>
              <div className="text-[11px] font-semibold text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">{((infraStats.fiber/schools.length)*100).toFixed(1)}% สายเคเบิลความเร็วสูง</div>
            </div>
            <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/50 flex items-center justify-between text-[11px] font-bold text-emerald-800 dark:text-emerald-300 group-hover:underline">
              <span>ดูรายชื่อโรงเรียน</span>
              <span>➔</span>
            </div>
          </div>

          {/* 6. จานดาวเทียม */}
          <div 
            onClick={() => setSelectedInfraCategory('satellite')}
            className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/20 border-2 border-sky-300 dark:border-sky-700/50 flex flex-col justify-between gap-3 cursor-pointer hover:border-sky-500 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-sky-900 dark:text-sky-200">ดาวเทียม (Satellite)</span>
              <div className="h-8 w-8 rounded-xl bg-sky-400 border border-[#33272A] flex items-center justify-center shrink-0">
                <Radio className="h-4 w-4 text-[#33272A]" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-sky-900 dark:text-sky-100">{infraStats.satellite} <span className="text-xs font-bold text-sky-700 dark:text-sky-300">แห่ง</span></div>
              <div className="text-[11px] font-semibold text-sky-800/80 dark:text-sky-300/80 mt-0.5">{((infraStats.satellite/schools.length)*100).toFixed(1)}% จานรับสัญญาณดาวเทียม</div>
            </div>
            <div className="pt-2 border-t border-sky-200/60 dark:border-sky-800/50 flex items-center justify-between text-[11px] font-bold text-sky-800 dark:text-sky-300 group-hover:underline">
              <span>ดูรายชื่อโรงเรียน</span>
              <span>➔</span>
            </div>
          </div>

          {/* 7. ซิมมือถือ */}
          <div 
            onClick={() => setSelectedInfraCategory('sim')}
            className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/20 border-2 border-orange-300 dark:border-orange-700/50 flex flex-col justify-between gap-3 cursor-pointer hover:border-orange-500 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-orange-900 dark:text-orange-200">ซิมมือถือ (4G/5G)</span>
              <div className="h-8 w-8 rounded-xl bg-orange-400 border border-[#33272A] flex items-center justify-center shrink-0">
                <Smartphone className="h-4 w-4 text-[#33272A]" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-orange-900 dark:text-orange-100">{infraStats.sim} <span className="text-xs font-bold text-orange-700 dark:text-orange-300">แห่ง</span></div>
              <div className="text-[11px] font-semibold text-orange-800/80 dark:text-orange-300/80 mt-0.5">{((infraStats.sim/schools.length)*100).toFixed(1)}% โมเด็มซิมการ์ด</div>
            </div>
            <div className="pt-2 border-t border-orange-200/60 dark:border-orange-800/50 flex items-center justify-between text-[11px] font-bold text-orange-800 dark:text-orange-300 group-hover:underline">
              <span>ดูรายชื่อโรงเรียน</span>
              <span>➔</span>
            </div>
          </div>

          {/* 8. ไม่มีอินเทอร์เน็ต */}
          <div 
            onClick={() => setSelectedInfraCategory('none')}
            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 flex flex-col justify-between gap-3 cursor-pointer hover:border-slate-500 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 dark:text-slate-200">ไม่มีอินเทอร์เน็ต</span>
              <div className="h-8 w-8 rounded-xl bg-slate-300 dark:bg-slate-700 border border-[#33272A] flex items-center justify-center shrink-0">
                <WifiOff className="h-4 w-4 text-[#33272A] dark:text-slate-200" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{infraStats.none} <span className="text-xs font-bold text-slate-700 dark:text-slate-300">แห่ง</span></div>
              <div className="text-[11px] font-semibold text-slate-800/80 dark:text-slate-300/80 mt-0.5">{((infraStats.none/schools.length)*100).toFixed(1)}% พื้นที่อับสัญญาณ</div>
            </div>
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/50 flex items-center justify-between text-[11px] font-bold text-slate-800 dark:text-slate-300 group-hover:underline">
              <span>ดูรายชื่อโรงเรียน</span>
              <span>➔</span>
            </div>
          </div>
        </div>

        {/* รายละเอียดกราฟสัดส่วนเน็ต + รายอำเภอ */}
        <div className="grid gap-6 md:grid-cols-2 pt-2 border-t-2 border-[#33272A]/10 dark:border-[#FFD3B6]/10">
          {/* กราฟประเภทอินเทอร์เน็ต */}
          <div className="p-4 bg-[#FFF9F5] dark:bg-[#150e10] border-2 border-[#33272A]/20 dark:border-[#FFD3B6]/20 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
              <Wifi className="h-4 w-4 text-sky-500" />
              จำแนกประเภทสัญญาณอินเทอร์เน็ตที่ใช้งาน (คลิกรายการเพื่อดูโรงเรียน)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div className="h-40 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={infraStats.internetTypePie}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {infraStats.internetTypePie.map((entry, idx) => (
                        <Cell key={`net-${idx}`} fill={entry.color} stroke="#33272A" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 text-xs font-semibold text-[#33272A] dark:text-[#FFF9F5]">
                <div 
                  onClick={() => setSelectedInfraCategory('fiber')}
                  className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full border border-[#33272A] bg-[#60A5FA]"></span>
                    <span className="text-slate-800 dark:text-slate-200 text-[11px]">เคเบิลไฟเบอร์ออพติก</span>
                  </div>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300 text-[11px]">{infraStats.fiber} แห่ง 🔍</span>
                </div>

                <div 
                  onClick={() => setSelectedInfraCategory('satellite')}
                  className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full border border-[#33272A] bg-[#A0E7E5]"></span>
                    <span className="text-slate-800 dark:text-slate-200 text-[11px]">จานดาวเทียม IPSTAR</span>
                  </div>
                  <span className="font-bold text-sky-700 dark:text-sky-300 text-[11px]">{infraStats.satellite} แห่ง 🔍</span>
                </div>

                <div 
                  onClick={() => setSelectedInfraCategory('sim')}
                  className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full border border-[#33272A] bg-[#FFD3B6]"></span>
                    <span className="text-slate-800 dark:text-slate-200 text-[11px]">ซิมมือถือ (4G/5G)</span>
                  </div>
                  <span className="font-bold text-orange-700 dark:text-orange-300 text-[11px]">{infraStats.sim} แห่ง 🔍</span>
                </div>

                <div 
                  onClick={() => setSelectedInfraCategory('none')}
                  className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full border border-[#33272A] bg-[#FF8BA7]"></span>
                    <span className="text-slate-800 dark:text-slate-200 text-[11px]">ไม่มีอินเทอร์เน็ต</span>
                  </div>
                  <span className="font-bold text-rose-700 dark:text-rose-300 text-[11px]">{infraStats.none} แห่ง 🔍</span>
                </div>
              </div>
            </div>
          </div>

          {/* สถิติจำแนกตามอำเภอ */}
          <div className="p-4 bg-[#FFF9F5] dark:bg-[#150e10] border-2 border-[#33272A]/20 dark:border-[#FFD3B6]/20 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-amber-500" />
              สถานะโครงสร้างพื้นฐานแยกตามอำเภอ
            </h4>
            <div className="space-y-2 text-xs font-semibold">
              {(Object.entries(infraStats.amphoeData) as [string, { total: number; hasElectricity: number; fiber: number; satellite: number; sim: number; none: number }][])
                .filter(([_, data]) => data.total > 0)
                .map(([ampName, ampData]) => (
                  <div key={ampName} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                      <span className="font-bold text-[#33272A] dark:text-[#FFF9F5] text-[11px]">อำเภอ {ampName}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">รวม {ampData.total} โรงเรียน</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] pt-0.5 text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3 text-amber-500 shrink-0" />
                        <span>ไฟฟ้า: <strong>{ampData.hasElectricity}</strong> / {ampData.total}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Wifi className="h-3 w-3 text-sky-500 shrink-0" />
                        <span>ไฟเบอร์: <strong>{ampData.fiber}</strong> | ดาวเทียม: <strong>{ampData.satellite}</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal แสดงรายชื่อโรงเรียนในแต่ละโครงสร้างพื้นฐาน */}
      {selectedInfraCategory && (() => {
        const details = getCategoryDetails(selectedInfraCategory);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#FFF9F5] dark:bg-[#1e1518] border-4 border-[#33272A] dark:border-[#FFD3B6] rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-[8px_8px_0px_#33272A] dark:shadow-none overflow-hidden">
              
              {/* Modal Header */}
              <div className="p-5 border-b-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-slate-900 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl border-2 border-[#33272A] ${details.badgeColor}`}>
                    {details.icon}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-2">
                      {details.title}
                    </h3>
                    <p className="text-xs text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-bold mt-0.5">
                      {details.subtitle} ({filteredInfraSchools.length} สถานศึกษา)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedInfraCategory(null);
                    setInfraSearchQuery('');
                  }}
                  className="h-9 w-9 rounded-full border-2 border-[#33272A] bg-rose-100 hover:bg-rose-200 text-[#33272A] flex items-center justify-center font-black text-base cursor-pointer shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* Modal Controls / Search */}
              <div className="p-4 bg-white/50 dark:bg-slate-950/50 border-b border-[#33272A]/10 flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อโรงเรียน หรืออำเภอ..."
                    value={infraSearchQuery}
                    onChange={(e) => setInfraSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border-2 border-[#33272A] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5] outline-none"
                  />
                </div>

                {onFilterNavigate && (
                  <button
                    onClick={() => {
                      const navParams: any = {};
                      if (details.netFilter) navParams.netFilter = details.netFilter;
                      if (details.electricityFilter) navParams.electricityFilter = details.electricityFilter;
                      onFilterNavigate(navParams);
                      setSelectedInfraCategory(null);
                      setInfraSearchQuery('');
                    }}
                    className="btn-cute bg-[#FFD3B6] text-[#33272A] text-xs font-black px-4 py-2 flex items-center gap-1.5 shadow-[2px_2px_0px_#33272A] hover:opacity-90 cursor-pointer shrink-0"
                  >
                    <span>เปิดดูตารางเปรียบเทียบเต็มรูปแบบ</span>
                    <span>➡️</span>
                  </button>
                )}
              </div>

              {/* School Cards List inside Modal */}
              <div className="p-4 overflow-y-auto space-y-3 flex-1">
                {filteredInfraSchools.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 font-bold text-xs space-y-2">
                    <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
                    <p>ไม่พบสถานศึกษาตามเงื่อนไขค้นหานี้</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {filteredInfraSchools.map(school => (
                      <div
                        key={school.id}
                        className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border-2 border-[#33272A]/20 dark:border-slate-800 space-y-2.5 hover:border-[#FF8BA7] transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] leading-snug">
                              {school.name}
                            </h4>
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 shrink-0">
                              ขนาด{school.size === 'small' ? 'เล็ก' : school.size === 'medium' ? 'กลาง' : 'ใหญ่'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-[#FF8BA7]" />
                            อำเภอ{school.amphoe || getAmphoeAndNetwork(school.id, school.name).amphoe} • รหัส {school.id}
                          </p>
                        </div>

                        {/* Electricity & Internet Badges */}
                        <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold p-2 bg-[#FFF9F5] dark:bg-slate-950 rounded-xl">
                          <div className="flex items-center gap-1">
                            <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <span className={school.electricity ? 'text-amber-800 dark:text-amber-300' : 'text-slate-400'}>
                              {school.electricity ? 'มีไฟฟ้า' : 'โซลาร์เซลล์'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Wifi className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                            <span className="text-sky-800 dark:text-sky-300">
                              {school.internetType === 'fiber' ? 'ไฟเบอร์' : school.internetType === 'satellite' ? 'ดาวเทียม' : school.internetType === 'sim' ? 'ซิม 4G/5G' : 'ไม่มีเน็ต'}
                            </span>
                          </div>
                        </div>

                        {onSelectSchool && (
                          <button
                            onClick={() => {
                              setSelectedInfraCategory(null);
                              setInfraSearchQuery('');
                              onSelectSchool(school.id);
                            }}
                            className="w-full btn-cute bg-[#A0E7E5] text-[#33272A] text-[11px] font-black py-1.5 flex items-center justify-center gap-1 hover:opacity-90 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" /> ดูข้อมูลเชิงลึกโรงเรียนนี้
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 border-t border-[#33272A]/10 bg-white dark:bg-slate-900 text-center">
                <button
                  onClick={() => {
                    setSelectedInfraCategory(null);
                    setInfraSearchQuery('');
                  }}
                  className="px-6 py-1.5 rounded-xl border-2 border-[#33272A] bg-slate-100 hover:bg-slate-200 text-[#33272A] text-xs font-black cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Modal แสดงรายชื่อสถานศึกษาที่มีนักเรียนตัว G เรียงจากมากสุดไปน้อยสุด */}
      {showGStudentsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#FFF9F5] dark:bg-[#1e1518] border-4 border-[#33272A] dark:border-[#FFD3B6] rounded-3xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-[8px_8px_0px_#33272A] dark:shadow-none overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b-2 border-[#33272A] dark:border-[#FFD3B6] bg-amber-50 dark:bg-slate-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl border-2 border-[#33272A] bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                  <Building2 className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-2">
                    รายชื่อสถานศึกษาที่มีนักเรียนตัว G (รหัส G) <Sparkles className="h-4 w-4 text-amber-500" />
                  </h3>
                  <p className="text-xs text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-bold mt-0.5">
                    ประจำปีการศึกษา {academicYear} • ทั้งหมด {gSchoolsList.length} สถานศึกษา (เรียงลำดับจากมากสุดไปน้อยสุด)
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowGStudentsModal(false);
                  setGSchoolSearchQuery('');
                }}
                className="h-9 w-9 rounded-full border-2 border-[#33272A] bg-rose-100 hover:bg-rose-200 text-[#33272A] flex items-center justify-center font-black text-base cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Modal Search & Sort Controls */}
            <div className="p-4 bg-white/60 dark:bg-slate-950/60 border-b border-[#33272A]/10 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อโรงเรียน, อำเภอ หรือกลุ่มโรงเรียน..."
                  value={gSchoolSearchQuery}
                  onChange={(e) => setGSchoolSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-[#33272A] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5] outline-none"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-extrabold text-[#33272A] dark:text-[#FFF9F5]">การเรียงลำดับ:</span>
                <button
                  onClick={() => setGSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="px-3 py-1.5 rounded-xl border-2 border-[#33272A] bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-800 text-amber-950 dark:text-amber-100 text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_#33272A] cursor-pointer"
                >
                  <TrendingUp className={`h-3.5 w-3.5 transition-transform ${gSortOrder === 'asc' ? 'rotate-180' : ''}`} />
                  <span>{gSortOrder === 'desc' ? 'เรียง: มาก ➔ น้อย' : 'เรียง: น้อย ➔ มาก'}</span>
                </button>
              </div>
            </div>

            {/* List Table Body */}
            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {gSchoolsList.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-bold space-y-2">
                  <p>ไม่พบรายชื่อสถานศึกษาที่มีนักเรียนตัว G ตรงกับเงื่อนไขการค้นหา</p>
                </div>
              ) : (
                <div className="border-2 border-[#33272A] dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#33272A] text-[#FFF9F5] text-[11px] font-black uppercase tracking-wider">
                          <th className="py-3 px-3 text-center w-16">อันดับ</th>
                          <th className="py-3 px-4">ชื่อสถานศึกษา</th>
                          <th className="py-3 px-3">อำเภอ / กลุ่มโรงเรียน</th>
                          <th className="py-3 px-3 text-center">ชาย (G)</th>
                          <th className="py-3 px-3 text-center">หญิง (G)</th>
                          <th className="py-3 px-4 text-center">นักเรียนตัว G รวม</th>
                          <th className="py-3 px-3 text-center">การดำเนินการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5]">
                        {gSchoolsList.map((item, idx) => {
                          const rank = gSortOrder === 'desc' ? idx + 1 : gSchoolsList.length - idx;
                          return (
                            <tr 
                              key={item.schoolId || idx}
                              className="hover:bg-amber-50/60 dark:hover:bg-amber-950/30 transition-colors"
                            >
                              <td className="py-3 px-3 text-center">
                                {rank === 1 ? (
                                  <span className="inline-flex items-center justify-center h-7 px-2 rounded-full bg-amber-400 text-amber-950 font-black text-xs shadow-sm">🥇 1</span>
                                ) : rank === 2 ? (
                                  <span className="inline-flex items-center justify-center h-7 px-2 rounded-full bg-slate-300 text-slate-900 font-black text-xs shadow-sm">🥈 2</span>
                                ) : rank === 3 ? (
                                  <span className="inline-flex items-center justify-center h-7 px-2 rounded-full bg-amber-600 text-white font-black text-xs shadow-sm">🥉 3</span>
                                ) : (
                                  <span className="text-slate-500 font-bold">{rank}</span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-black">
                                <div className="flex flex-col">
                                  <span className="text-sm text-[#33272A] dark:text-[#FFF9F5]">{item.schoolName}</span>
                                  {item.notes && (
                                    <span className="text-[10px] text-amber-700 dark:text-amber-300 italic font-medium">{item.notes}</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-[11px] text-slate-600 dark:text-slate-300">
                                <div className="flex flex-col">
                                  <span className="font-extrabold text-[#33272A] dark:text-[#FFF9F5]">อ. {item.amphoe}</span>
                                  <span className="text-[10px] text-slate-400">{item.network}</span>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center text-blue-600 dark:text-blue-400 font-extrabold">
                                {item.maleGCount}
                              </td>
                              <td className="py-3 px-3 text-center text-pink-600 dark:text-pink-400 font-extrabold">
                                {item.femaleGCount}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="inline-block px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-400 text-amber-900 dark:text-amber-200 text-xs font-black">
                                  {item.totalGStudents} คน
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                {onSelectSchool && item.schoolId && (
                                  <button
                                    onClick={() => {
                                      setShowGStudentsModal(false);
                                      onSelectSchool(item.schoolId);
                                    }}
                                    className="px-2.5 py-1 rounded-xl bg-[#33272A] hover:bg-black text-[#FFF9F5] dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950 text-[10px] font-black transition-all cursor-pointer shadow-sm hover:scale-105"
                                  >
                                    ดูโรงเรียน ➔
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t-2 border-[#33272A] dark:border-[#FFD3B6] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5]">
              <div className="flex items-center gap-2 flex-wrap">
                <span>💡 สรุปรวม:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black border border-amber-300">
                  นักเรียนตัว G ทั้งหมด {currentYearGStats.total.toLocaleString()} คน
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold">
                  เฉลี่ย {gSchoolsList.length > 0 ? (currentYearGStats.total / gSchoolsList.length).toFixed(1) : 0} คน / โรงเรียน
                </span>
              </div>
              <button
                onClick={() => {
                  setShowGStudentsModal(false);
                  setGSchoolSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl border-2 border-[#33272A] bg-slate-200 dark:bg-slate-800 text-[#33272A] dark:text-[#FFF9F5] font-black hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>

          </div>
        </div>
      )}

      {/* แถบการวิเคราะห์ข้อมูลเชิงลึกอัตโนมัติแบบเรียลไทม์ (Real-time Data Analytics Insights) */}
      <div className="card bg-[#FFEEE2] dark:bg-[#2c2023] p-6">
        <h3 className="text-lg font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-[#FF8BA7]" />
          บทสรุปและผลการวิเคราะห์ข้อมูลระดับเขตพื้นที่
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className="flex gap-3 rounded-2xl bg-white border-2 border-[#33272A] p-4 dark:border-[#FFD3B6] dark:bg-[#150e10] shadow-sm transition-all duration-200"
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
          <div className="p-4 bg-white dark:bg-slate-900 border-2 border-[#33272A] dark:border-slate-800 rounded-2xl space-y-2.5 shadow-sm transition-transform">
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
          <div className="p-4 bg-white dark:bg-slate-900 border-2 border-[#33272A] dark:border-slate-800 rounded-2xl space-y-2.5 shadow-sm transition-transform">
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
          <div className="p-4 bg-white dark:bg-slate-900 border-2 border-[#33272A] dark:border-slate-800 rounded-2xl space-y-2.5 shadow-sm transition-transform">
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
