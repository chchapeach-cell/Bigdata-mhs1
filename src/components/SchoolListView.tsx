import { useState, useMemo, FormEvent, useEffect } from 'react';
import { School, StudentData, DownloadLog, UserProfile } from '../types';
import { Search, Download, Filter, FileSpreadsheet, Eye, User, FileText, AlertTriangle, HelpCircle, ArrowUpDown, ChevronUp, ChevronDown, MapPin, Zap, Globe, GraduationCap, Sparkles, Phone, Droplets } from 'lucide-react';
import * as XLSX from 'xlsx';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { generatePdfReport } from '../utils/exportPdf';
import { getAmphoeAndNetwork, getSchoolSize, getSchoolSizeLabel, SCHOOL_GROUPS_LIST } from '../utils/initialData';

interface SchoolListViewProps {
  schools: School[];
  studentData: StudentData[];
  onSelectSchool: (id: string) => void;
  userProfile: UserProfile | null;
  initialFilters?: {
    size?: string;
    type?: string;
    amphoe?: string;
    netFilter?: string;
    electricityFilter?: string;
    waterFilter?: string;
    majorSubjectFilter?: string;
  } | null;
  clearInitialFilters?: () => void;
  systemConfig?: {
    allowDataDownload?: boolean;
    restrictOneAdminPerSchool?: boolean;
    allowSchoolAdminRegistration?: boolean;
    electricityOptions?: { id: string; label: string }[];
    internetOptions?: { id: string; label: string }[];
  };
  academicYear?: string;
  setAcademicYear?: (year: string) => void;
  availableYears?: string[];
}

export default function SchoolListView({
  schools,
  studentData,
  onSelectSchool,
  userProfile,
  initialFilters,
  clearInitialFilters,
  systemConfig,
  academicYear,
  setAcademicYear,
  availableYears
}: SchoolListViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all'); // all, expansion, basic
  const [netFilter, setNetFilter] = useState<string>('all');
  const [electricityFilter, setElectricityFilter] = useState<string>('all'); // all, has_electric, solar, hybrid, none
  const [waterFilter, setWaterFilter] = useState<string>('all'); // all, government, mountain, none, other
  const [majorSubjectFilter, setMajorSubjectFilter] = useState<string>('all'); // ตัวกรองครูวิชาเอก
  const [amphoeFilter, setAmphoeFilter] = useState<string>('all'); // เพิ่มตัวกรองอำเภอ
  const [networkGroupFilter, setNetworkGroupFilter] = useState<string>('all'); // ตัวกรองกลุ่มโรงเรียน
  
  // ใช้ตัวกรองเริ่มต้นที่ส่งมาจากหน้าแดชบอร์ด
  useEffect(() => {
    if (initialFilters) {
      if (initialFilters.type) setTypeFilter(initialFilters.type);
      if (initialFilters.size) setSizeFilter(initialFilters.size);
      if (initialFilters.amphoe) setAmphoeFilter(initialFilters.amphoe);
      if (initialFilters.netFilter) setNetFilter(initialFilters.netFilter);
      if (initialFilters.electricityFilter) setElectricityFilter(initialFilters.electricityFilter);
      if (initialFilters.waterFilter) setWaterFilter(initialFilters.waterFilter);
      if (initialFilters.majorSubjectFilter) setMajorSubjectFilter(initialFilters.majorSubjectFilter);
      
      // ล้างข้อมูลการพิมพ์ค้นหา
      setSearchTerm('');
      
      if (clearInitialFilters) {
        clearInitialFilters();
      }
    }
  }, [initialFilters, clearInitialFilters]);

  // ดึงวิชาเอกทั้งหมดที่มีจากทุกโรงเรียน
  const allAvailableMajors = useMemo(() => {
    const majorsSet = new Set<string>();
    const defaultList = [
      'ภาษาไทย', 'คณิตศาสตร์', 'ภาษาอังกฤษ', 'วิทยาศาสตร์', 'คอมพิวเตอร์',
      'ปฐมวัย', 'สังคมศึกษา', 'พลศึกษา', 'ศิลปะ', 'การงานอาชีพ'
    ];
    defaultList.forEach(m => majorsSet.add(m));

    schools.forEach(s => {
      if (s.majorSubjects) {
        s.majorSubjects.forEach(m => {
          if (m && m.trim()) majorsSet.add(m.trim());
        });
      }
      if (s.majorSubjectsWithStaff) {
        s.majorSubjectsWithStaff.forEach(ms => {
          if (ms.name && ms.name.trim()) majorsSet.add(ms.name.trim());
        });
      }
    });

    return Array.from(majorsSet);
  }, [schools]);
  
  // สถานะการจัดเรียงข้อมูล
  const [sortField, setSortField] = useState<'id' | 'name' | 'amphoe' | 'size' | 'isExpansion' | 'staffCount' | 'studentCount' | 'internetType' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // สำหรับการดาวน์โหลดรายงาน
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadTarget, setDownloadTarget] = useState<{ id: string; name: string } | null>(null); // null means "all schools"
  const [downloadName, setDownloadName] = useState(userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : '');
  const [downloadEmail, setDownloadEmail] = useState(userProfile ? userProfile.email : '');
  const [downloadPurpose, setDownloadPurpose] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');

  // คำนวณจำนวนนักเรียนรวมและวิเคราะห์ขนาดโรงเรียนตามเกณฑ์ ก.ค.ศ. ตามปีการศึกษาที่เลือก
  const schoolsWithCounts = useMemo(() => {
    return schools.map(school => {
      const matchData = studentData.find(s => 
        s.schoolId === school.id && 
        (academicYear ? String(s.academicYear).trim() === String(academicYear).trim() : true)
      );
      const studentCount = matchData ? matchData.totalStudents : 0;
      const effectiveSize = matchData ? getSchoolSize(studentCount) : school.size;
      return {
        ...school,
        size: effectiveSize,
        studentCount,
        maleCount: matchData ? matchData.totalMale : 0,
        femaleCount: matchData ? matchData.totalFemale : 0
      };
    });
  }, [schools, studentData, academicYear]);

  // คัดกรองข้อมูลโรงเรียน
  const filteredSchools = useMemo(() => {
    return schoolsWithCounts.filter(school => {
      const q = searchTerm.toLowerCase();
      const matchesClassroom = school.classrooms && school.classrooms.some(c => 
        c.name.toLowerCase().includes(q) ||
        (c.teacherName && c.teacherName.toLowerCase().includes(q)) ||
        (c.gradeLevel && c.gradeLevel.toLowerCase().includes(q))
      );
      const matchesMajorQuery = (school.majorSubjects && school.majorSubjects.some(m => m.toLowerCase().includes(q))) ||
                                (school.majorSubjectsWithStaff && school.majorSubjectsWithStaff.some(ms => ms.name.toLowerCase().includes(q)));

      const matchesSearch = school.name.toLowerCase().includes(q) ||
                            school.id.includes(searchTerm) ||
                            matchesClassroom ||
                            matchesMajorQuery;
      const matchesSize = sizeFilter === 'all' || school.size === sizeFilter;
      const matchesType = typeFilter === 'all' || 
                          (typeFilter === 'expansion' && school.isExpansion) ||
                          (typeFilter === 'basic' && !school.isExpansion);
      const matchesNet = netFilter === 'all' || school.internetType === netFilter;
      
      // กรองตามไฟฟ้า
      let matchesElectricity = true;
      if (electricityFilter !== 'all') {
        if (electricityFilter === 'has_electric' || electricityFilter === 'yes') {
          matchesElectricity = school.electricity === 'has_electric' || school.electricity === true;
        } else if (electricityFilter === 'solar') {
          matchesElectricity = school.electricity === 'solar';
        } else if (electricityFilter === 'hybrid') {
          matchesElectricity = school.electricity === 'hybrid';
        } else if (electricityFilter === 'none' || electricityFilter === 'no') {
          matchesElectricity = school.electricity === 'none' || school.electricity === false;
        }
      }

      // กรองตามระบบน้ำประปา
      let matchesWater = true;
      if (waterFilter !== 'all') {
        const wSystem = String(school.waterSystem ?? '').toLowerCase();
        if (waterFilter === 'mountain') {
          matchesWater = wSystem.includes('mountain') || wSystem.includes('ภูเขา');
        } else if (waterFilter === 'none') {
          matchesWater = wSystem.includes('none') || wSystem.includes('ไม่มี');
        } else if (waterFilter === 'other') {
          matchesWater = wSystem.includes('other') || wSystem.includes('อื่นๆ');
        } else if (waterFilter === 'government' || waterFilter === 'gov') {
          matchesWater = wSystem.includes('government') || wSystem.includes('รัฐ') || !school.waterSystem;
        }
      }

      // กรองตามครูวิชาเอก
      let matchesMajorSubject = true;
      if (majorSubjectFilter !== 'all') {
        const hasMajorStr = school.majorSubjects && school.majorSubjects.some(m => m.includes(majorSubjectFilter));
        const hasMajorObj = school.majorSubjectsWithStaff && school.majorSubjectsWithStaff.some(ms => ms.name.includes(majorSubjectFilter) && ms.teachersCount > 0);
        matchesMajorSubject = !!(hasMajorStr || hasMajorObj);
      }
      
      const schoolAmphoe = school.amphoe || getAmphoeAndNetwork(school.id, school.name).amphoe;
      const matchesAmphoe = amphoeFilter === 'all' || schoolAmphoe === amphoeFilter;

      const validGroupNames = new Set(SCHOOL_GROUPS_LIST.map(g => g.name));
      let schoolNetwork = school.networkGroup;
      if (!schoolNetwork || !validGroupNames.has(schoolNetwork)) {
        schoolNetwork = getAmphoeAndNetwork(school.id, school.name).networkGroup;
      }
      const matchesNetworkGroup = networkGroupFilter === 'all' || schoolNetwork === networkGroupFilter;

      return matchesSearch && matchesSize && matchesType && matchesNet && matchesAmphoe && matchesElectricity && matchesWater && matchesNetworkGroup && matchesMajorSubject;
    });
  }, [schoolsWithCounts, searchTerm, sizeFilter, typeFilter, netFilter, amphoeFilter, electricityFilter, waterFilter, networkGroupFilter, majorSubjectFilter]);

  // จัดเรียงข้อมูลที่คัดกรองแล้ว
  const sortedSchools = useMemo(() => {
    if (!sortField) return filteredSchools;
    
    const sizeOrder: Record<string, number> = {
      small: 1,
      medium: 2,
      large: 3,
      special_large: 4
    };

    const netOrder: Record<string, number> = {
      fiber: 1,
      satellite: 2,
      sim: 3,
      none: 4
    };

    return [...filteredSchools].sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortField === 'amphoe') {
        valA = a.amphoe || getAmphoeAndNetwork(a.id, a.name).amphoe;
        valB = b.amphoe || getAmphoeAndNetwork(b.id, b.name).amphoe;
      } else if (sortField === 'size') {
        valA = sizeOrder[a.size || ''] || 0;
        valB = sizeOrder[b.size || ''] || 0;
      } else if (sortField === 'internetType') {
        valA = netOrder[a.internetType || ''] || 5;
        valB = netOrder[b.internetType || ''] || 5;
      } else {
        valA = a[sortField];
        valB = b[sortField];
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc'
          ? valA.localeCompare(valB, 'th')
          : valB.localeCompare(valA, 'th');
      }

      if (typeof valA === 'boolean' && typeof valB === 'boolean') {
        const numA = valA ? 1 : 0;
        const numB = valB ? 1 : 0;
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredSchools, sortField, sortDirection]);

  // ฟังก์ชันสลับการจัดเรียง
  const handleSort = (field: 'id' | 'name' | 'amphoe' | 'size' | 'isExpansion' | 'staffCount' | 'studentCount' | 'internetType') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const canDownload = systemConfig?.allowDataDownload !== false;

  // ฟังก์ชันสําหรับสร้าง Excel และบันทึกลง Firestore สำหรับประวัติ
  const handleOpenDownload = (id: string, name: string) => {
    if (!canDownload) {
      alert('การดาวน์โหลดข้อมูลถูกปิดใช้งานชั่วคราวโดย Super Admin');
      return;
    }
    setDownloadTarget({ id, name });
    setDownloadError('');
    setIsDownloadModalOpen(true);
  };

  const handleConfirmDownload = async (e: FormEvent) => {
    e.preventDefault();
    if (!downloadName.trim()) {
      setDownloadError('กรุณากรอกชื่อ-นามสกุล');
      return;
    }
    if (!downloadEmail.trim()) {
      setDownloadError('กรุณากรอกอีเมลติดต่อ');
      return;
    }
    if (downloadPurpose.trim().length < 8) {
      setDownloadError('กรุณาระบุวัตถุประสงค์โดยละเอียดอย่างน้อย 8 ตัวอักษร');
      return;
    }

    setIsDownloading(true);
    setDownloadError('');

    try {
      // 1. บันทึกข้อมูลลงใน Firebase สำหรับความปลอดภัยและความโปร่งใส dmc-mhs1
      const logData: DownloadLog = {
        name: downloadName,
        email: downloadEmail,
        schoolId: downloadTarget ? downloadTarget.id : 'all',
        schoolName: downloadTarget ? downloadTarget.name : 'โรงเรียนทั้งหมดในเขตพื้นที่',
        purpose: downloadPurpose,
        timestamp: serverTimestamp()
      };

      try {
        await addDoc(collection(db, 'download_logs'), logData);
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, 'download_logs');
      }

      // 2. ดำเนินการสร้างไฟล์ Excel ด้วย xlsx
      let exportRows = [];

      if (downloadTarget && downloadTarget.id === 'filtered') {
        // ดาวน์โหลดเฉพาะโรงเรียนที่ผ่านการคัดกรองอยู่ปัจจุบัน
        exportRows = filteredSchools.map(s => ({
          "รหัสโรงเรียน": s.id,
          "ชื่อโรงเรียน": s.name,
          "ขนาดสถานศึกษา": s.size === 'small' ? 'เล็ก' : s.size === 'medium' ? 'กลาง' : s.size === 'large' ? 'ใหญ่' : 'ใหญ่พิเศษ',
          "โรงเรียนขยายโอกาส": s.isExpansion ? 'ใช่' : 'ไม่ใช่',
          "ครูและบุคลากร (คน)": s.staffCount,
          "นักเรียนชาย (คน)": s.maleCount,
          "นักเรียนหญิง (คน)": s.femaleCount,
          "นักเรียนรวมทั้งหมด (คน)": s.studentCount,
          "ระบบอินเทอร์เน็ต": s.internetType === 'fiber' ? 'Fiber' : s.internetType === 'satellite' ? 'ดาวเทียม' : s.internetType === 'sim' ? 'SIM 4G/5G' : 'ไม่ได้ใช้',
          "มีไฟฟ้าใช้งาน": s.electricity ? 'ใช่' : 'ไม่ใช่',
          "ระบบน้ำประปา": s.waterSystem === 'mountain' ? 'ประปาภูเขา' : s.waterSystem === 'none' ? 'ไม่มีน้ำประปา' : s.waterSystem === 'other' ? `อื่นๆ (${s.waterSystemDetail || ''})` : 'ประปาภาครัฐ/ท้องถิ่น',
          "เบอร์โทรผู้บริหาร": s.directorPhone
        }));
      } else if (downloadTarget && downloadTarget.id !== '') {
        // ดาวน์โหลดรายโรงเรียนเดียว
        const schoolObj = schoolsWithCounts.find(s => s.id === downloadTarget.id);
        const studentObj = studentData.find(s => s.schoolId === downloadTarget.id);

        if (schoolObj && studentObj) {
          const GRADE_ORDER = [
            "อ.1", "อ.2", "อ.3",
            "ป.1", "ป.2", "ป.3", "ป.4", "ป.5", "ป.6",
            "ม.1", "ม.2", "ม.3"
          ];
          exportRows = GRADE_ORDER
            .filter(grade => studentObj.grades[grade] !== undefined)
            .map(grade => ({
              "รหัสโรงเรียน": schoolObj.id,
              "ชื่อโรงเรียน": schoolObj.name,
              "ชั้นเรียน": grade,
              "เพศชาย (คน)": studentObj.grades[grade].male,
              "เพศหญิง (คน)": studentObj.grades[grade].female,
              "รวมทั้งหมด (คน)": studentObj.grades[grade].total,
              "จำนวนห้องเรียน": studentObj.grades[grade].rooms
            }));
        }
      } else {
        // ดาวน์โหลดภาพรวมทั้งหมด
        exportRows = schoolsWithCounts.map(s => ({
          "รหัสโรงเรียน": s.id,
          "ชื่อโรงเรียน": s.name,
          "อำเภอ": s.amphoe || getAmphoeAndNetwork(s.id, s.name).amphoe,
          "กลุ่มโรงเรียน": s.networkGroup || getAmphoeAndNetwork(s.id, s.name).networkGroup,
          "ขนาดสถานศึกษา": s.size === 'small' ? 'เล็ก' : s.size === 'medium' ? 'กลาง' : s.size === 'large' ? 'ใหญ่' : 'ใหญ่พิเศษ',
          "โรงเรียนขยายโอกาส": s.isExpansion ? 'ใช่' : 'ไม่ใช่',
          "ครูและบุคลากร (คน)": s.staffCount,
          "นักเรียนชาย (คน)": s.maleCount,
          "นักเรียนหญิง (คน)": s.femaleCount,
          "นักเรียนรวมทั้งหมด (คน)": s.studentCount,
          "ระบบอินเทอร์เน็ต": s.internetType === 'fiber' ? 'Fiber' : s.internetType === 'satellite' ? 'ดาวเทียม' : s.internetType === 'sim' ? 'SIM 4G/5G' : 'ไม่ได้ใช้',
          "มีไฟฟ้าใช้งาน": s.electricity ? 'ใช่' : 'ไม่ใช่',
          "ระบบน้ำประปา": s.waterSystem === 'mountain' ? 'ประปาภูเขา' : s.waterSystem === 'none' ? 'ไม่มีน้ำประปา' : s.waterSystem === 'other' ? `อื่นๆ (${s.waterSystemDetail || ''})` : 'ประปาภาครัฐ/ท้องถิ่น',
          "เบอร์โทรผู้บริหาร": s.directorPhone
        }));
      }

      if (exportFormat === 'pdf') {
        const title = downloadTarget && downloadTarget.id === 'filtered'
          ? 'รายงานสารสนเทศสถานศึกษา (คัดกรองตามเงื่อนไข)'
          : downloadTarget && downloadTarget.id !== ''
          ? `รายงานสารสนเทศโรงเรียน ${downloadTarget.name}`
          : 'รายงานสารสนเทศสถานศึกษาทั้งหมด สพป.แม่ฮ่องสอน เขต 1';
        
        const headers = exportRows.length > 0 ? Object.keys(exportRows[0]) : [];
        const rows: (string | number)[][] = exportRows.map(r => 
          Object.values(r).map(val => (typeof val === 'number' || typeof val === 'string' ? val : String(val ?? '')))
        );
        const baseFilename = downloadTarget && downloadTarget.id === 'filtered'
          ? `MHS1_StudentData_Filtered_${new Date().toISOString().slice(0, 10)}`
          : downloadTarget && downloadTarget.id !== ''
          ? `MHS1_StudentData_${downloadTarget.id}_${downloadTarget.name.replace(/\s+/g, '')}`
          : `MHS1_StudentData_AllSchools`;

        await generatePdfReport({
          title,
          subtitle: `ปีการศึกษา ${academicYear || '2568'}`,
          requesterInfo: {
            name: downloadName,
            email: downloadEmail,
            purpose: downloadPurpose
          },
          headers,
          rows,
          filename: `${baseFilename}.pdf`
        });
      } else {
        const ws = XLSX.utils.json_to_sheet(exportRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "รายงานนักเรียน MHS1");

        const filename = downloadTarget && downloadTarget.id === 'filtered'
          ? `MHS1_StudentData_Filtered_${new Date().toISOString().slice(0, 10)}.xlsx`
          : (downloadTarget && downloadTarget.id !== '')
          ? `MHS1_StudentData_${downloadTarget.id}_${downloadTarget.name.replace(/\s+/g, '')}.xlsx`
          : `MHS1_StudentData_AllSchools.xlsx`;

        XLSX.writeFile(wb, filename);
      }

      // สำเร็จ
      setIsDownloadModalOpen(false);
      setDownloadPurpose('');
    } catch (error) {
      console.error(error);
      setDownloadError('เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Section */}
      <div className="card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Search */}
          <div className="flex-1 max-w-lg flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute top-3.5 left-4.5 h-4 w-4 text-[#33272A]/60 dark:text-[#FFF9F5]/60" />
              <input
                type="text"
                placeholder="ค้นหาชื่อโรงเรียน หรือรหัสโรงเรียน..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border-2 border-[#33272A] bg-white dark:border-[#FFD3B6] dark:bg-[#1e1518] pl-11 pr-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-[#FF8BA7] text-[#33272A] dark:text-[#FFF9F5]"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                // ตัวกรองค้นหาทำงานเรียลไทม์อยู่แล้ว แต่ปุ่มนี้ช่วยให้ผู้ใช้งานมั่นใจในการกดและสามารถโฟกัสช่องค้นหาได้
                const inputEl = document.querySelector('input[placeholder*="ค้นหาชื่อโรงเรียน"]') as HTMLInputElement;
                if (inputEl) inputEl.focus();
              }}
              className="btn-cute bg-[#FF8BA7] hover:bg-opacity-90 text-[#33272A] px-6 py-2.5 text-sm font-black flex items-center gap-1 shrink-0"
            >
              <Search className="h-4 w-4" />
              ค้นหา
            </button>
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap gap-2">
            {filteredSchools.length < schools.length && (
              <button
                onClick={() => handleOpenDownload('filtered', `ผลลัพธ์ที่กรอง (${filteredSchools.length} โรงเรียน)`)}
                className="btn-cute bg-[#FFD3B6] hover:bg-opacity-90 px-4 py-2.5 text-xs font-black text-[#33272A] flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_#33272A]"
              >
                <Download className="h-4 w-4" />
                ดาวน์โหลดผลลัพธ์ที่กรองอยู่ ({filteredSchools.length} โรงเรียน)
              </button>
            )}
            <button
              onClick={() => handleOpenDownload('', 'โรงเรียนทั้งหมดในเขตพื้นที่')}
              className="btn-cute bg-[#A0E7E5] px-4 py-2.5 text-xs font-black text-[#33272A] flex items-center gap-1.5 transition-all"
            >
              <FileSpreadsheet className="h-4 w-4" />
              ดาวน์โหลดข้อมูลทั้งหมด
            </button>
          </div>
        </div>

        {/* Dropdown Filters Grid - ออกแบบให้พอดีขอบจอมือถือและเดสก์ท็อป ไม่ยืดล้น */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 pt-4 border-t-2 border-[#33272A]/10 dark:border-[#FFD3B6]/20">
          {/* ปีการศึกษา */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1">
              <GraduationCap className="h-3.5 w-3.5 text-amber-500" /> ปีการศึกษา
            </label>
            <select
              value={academicYear || '2568'}
              onChange={(e) => setAcademicYear && setAcademicYear(e.target.value)}
              className="w-full rounded-xl border-2 border-[#33272A] bg-white dark:border-[#FFD3B6] dark:bg-[#1e1518] p-2 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5] focus:ring-2 focus:ring-[#FF8BA7] cursor-pointer"
            >
              {(availableYears && availableYears.length > 0 ? availableYears : ['2568', '2567', '2566', '2565']).map(yr => (
                <option key={yr} value={yr}>ปีการศึกษา {yr}</option>
              ))}
            </select>
          </div>

          {/* อำเภอ */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-[#FF8BA7]" /> อำเภอ (พื้นที่)
            </label>
            <select
              value={amphoeFilter}
              onChange={(e) => {
                setAmphoeFilter(e.target.value);
                setNetworkGroupFilter('all');
              }}
              className="w-full rounded-xl border-2 border-[#33272A] bg-white dark:border-[#FFD3B6] dark:bg-[#1e1518] p-2 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5]"
            >
              <option value="all">ทั้งหมด ทุกอำเภอ</option>
              <option value="เมืองแม่ฮ่องสอน">เมืองแม่ฮ่องสอน</option>
              <option value="ขุนยวม">ขุนยวม</option>
              <option value="ปาย">ปาย</option>
              <option value="ปางมะผ้า">ปางมะผ้า</option>
            </select>
          </div>

          {/* กลุ่มเครือข่าย */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-purple-500" /> กลุ่มเครือข่าย
            </label>
            <select
              value={networkGroupFilter}
              onChange={(e) => setNetworkGroupFilter(e.target.value)}
              className="w-full rounded-xl border-2 border-[#33272A] bg-white dark:border-[#FFD3B6] dark:bg-[#1e1518] p-2 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5]"
            >
              <option value="all">ทั้งหมด ทุกกลุ่มเครือข่าย</option>
              {SCHOOL_GROUPS_LIST
                .filter(g => amphoeFilter === 'all' || g.amphoe === amphoeFilter || g.amphoe === 'สพป.แม่ฮ่องสอน เขต 1')
                .map(group => (
                  <option key={group.name} value={group.name}>
                    {group.name}
                  </option>
                ))}
            </select>
          </div>

          {/* ขนาด */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-[#FF8BA7]" /> ขนาดโรงเรียน
            </label>
            <select
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
              className="w-full rounded-xl border-2 border-[#33272A] bg-white dark:border-[#FFD3B6] dark:bg-[#1e1518] p-2 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5]"
            >
              <option value="all">ทั้งหมด ทุกขนาด (ตามเกณฑ์ ก.ค.ศ.)</option>
              <option value="small">ขนาดเล็ก (119 คนลงมา)</option>
              <option value="medium">ขนาดกลาง (120 - 719 คน)</option>
              <option value="large">ขนาดใหญ่ (720 - 1,679 คน)</option>
              <option value="special_large">ขนาดใหญ่พิเศษ (1,680 คนขึ้นไป)</option>
            </select>
          </div>

          {/* ขยายโอกาส */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-[#FF8BA7]" /> ประเภทสถานศึกษา
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full rounded-xl border-2 border-[#33272A] bg-white dark:border-[#FFD3B6] dark:bg-[#1e1518] p-2 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5]"
            >
              <option value="all">ทั้งหมด ทุกระดับ</option>
              <option value="expansion">เฉพาะโรงเรียนขยายโอกาส (มี ม.1-ม.3)</option>
              <option value="basic">เฉพาะโรงเรียนประถม/อนุบาลทั่วไป</option>
            </select>
          </div>

          {/* ระบบไฟฟ้า */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-400 shrink-0" /> ระบบไฟฟ้า
            </label>
            <select
              value={electricityFilter}
              onChange={(e) => setElectricityFilter(e.target.value)}
              className="w-full rounded-xl border-2 border-[#33272A] bg-white dark:border-[#FFD3B6] dark:bg-[#1e1518] p-2 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5]"
            >
              <option value="all">ทั้งหมด (ทุกประเภทไฟฟ้า)</option>
              <option value="has_electric">🔌 มีไฟฟ้าถาวร</option>
              <option value="solar">☀️ ระบบโซลาร์เซลล์</option>
              <option value="hybrid">⚡☀️ ระบบผสมผสาน</option>
              <option value="none">❌ ไม่มีระบบไฟฟ้า</option>
            </select>
          </div>

          {/* อินเทอร์เน็ต */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1">
              <Globe className="h-3.5 w-3.5 text-sky-500 shrink-0" /> ระบบอินเทอร์เน็ต
            </label>
            <select
              value={netFilter}
              onChange={(e) => setNetFilter(e.target.value)}
              className="w-full rounded-xl border-2 border-[#33272A] bg-white dark:border-[#FFD3B6] dark:bg-[#1e1518] p-2 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5]"
            >
              <option value="all">ทั้งหมด ทุกประเภทเน็ต</option>
              <option value="fiber">🌐 ไฟเบอร์ออพติก (Fiber)</option>
              <option value="satellite">🛰️ ดาวเทียม (Satellite)</option>
              <option value="sim">📱 อินเทอร์เน็ตซิม (SIM 4G/5G)</option>
              <option value="none">❌ ไม่ได้ใช้/ไม่มีอินเทอร์เน็ต</option>
            </select>
          </div>

          {/* น้ำประปา */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1">
              <Droplets className="h-3.5 w-3.5 text-blue-500 shrink-0" /> ระบบน้ำประปา
            </label>
            <select
              value={waterFilter}
              onChange={(e) => setWaterFilter(e.target.value)}
              className="w-full rounded-xl border-2 border-[#33272A] bg-white dark:border-[#FFD3B6] dark:bg-[#1e1518] p-2 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5]"
            >
              <option value="all">ทั้งหมด ทุกประเภทน้ำประปา</option>
              <option value="government">🚰 ประปาภาครัฐ / ท้องถิ่น</option>
              <option value="mountain">🏔️ ประปาภูเขา</option>
              <option value="other">📌 ประปาอื่นๆ / บ่อบาดาล</option>
              <option value="none">❌ ไม่มีน้ำประปา / ขาดแคลน</option>
            </select>
          </div>

          {/* ครูวิชาเอก */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1">
              <GraduationCap className="h-3.5 w-3.5 text-purple-500 shrink-0" /> ครูวิชาเอกที่มี
            </label>
            <select
              value={majorSubjectFilter}
              onChange={(e) => setMajorSubjectFilter(e.target.value)}
              className="w-full rounded-xl border-2 border-[#33272A] bg-white dark:border-[#FFD3B6] dark:bg-[#1e1518] p-2 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5]"
            >
              <option value="all">ทั้งหมด ทุกวิชาเอก</option>
              {allAvailableMajors.map(m => (
                <option key={m} value={m}>เอก{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Schools Table / Grid */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b-2 border-[#33272A] dark:border-[#FFD3B6] flex justify-between items-center bg-[#FFF9F5] dark:bg-[#1e1518]">
          <div>
            <h3 className="text-lg font-black text-[#33272A] dark:text-[#FFF9F5]">รายชื่อโรงเรียนในสังกัด ({sortedSchools.length} แห่ง)</h3>
            <p className="text-xs text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-semibold">คลิกพาดหัวตารางเพื่อเรียงข้อมูล หรือคลิกที่โรงเรียนเพื่อดูรายละเอียดข้อมูลเชิงลึก</p>
          </div>
        </div>

        {/* ตารางแสดงข้อมูลแบบ Desktop */}
        <div className="hidden lg:block overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#FFD3B6]/50 dark:bg-[#33272A] text-[#33272A] dark:text-[#FFF9F5] font-black border-b-2 border-[#33272A] dark:border-[#FFD3B6] uppercase tracking-wider select-none text-xs">
                <th 
                  className="p-3 cursor-pointer hover:bg-[#FFD3B6]/70 dark:hover:bg-slate-700/60 transition-colors"
                  onClick={() => handleSort('id')}
                >
                  <div className="flex items-center gap-1">
                    รหัส
                    {sortField === 'id' ? (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 text-[#FF8BA7]" /> : <ChevronDown className="h-4 w-4 text-[#FF8BA7]" />
                    ) : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                  </div>
                </th>
                <th 
                  className="p-3 cursor-pointer hover:bg-[#FFD3B6]/70 dark:hover:bg-slate-700/60 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    ชื่อสถานศึกษา
                    {sortField === 'name' ? (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 text-[#FF8BA7]" /> : <ChevronDown className="h-4 w-4 text-[#FF8BA7]" />
                    ) : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                  </div>
                </th>
                <th 
                  className="p-3 cursor-pointer hover:bg-[#FFD3B6]/70 dark:hover:bg-slate-700/60 transition-colors"
                  onClick={() => handleSort('amphoe')}
                >
                  <div className="flex items-center gap-1">
                    อำเภอ / กลุ่มเครือข่าย
                    {sortField === 'amphoe' ? (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 text-[#FF8BA7]" /> : <ChevronDown className="h-4 w-4 text-[#FF8BA7]" />
                    ) : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                  </div>
                </th>
                <th 
                  className="p-3 text-center cursor-pointer hover:bg-[#FFD3B6]/70 dark:hover:bg-slate-700/60 transition-colors"
                  onClick={() => handleSort('size')}
                >
                  <div className="flex items-center justify-center gap-1">
                    ขนาด
                    {sortField === 'size' ? (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 text-[#FF8BA7]" /> : <ChevronDown className="h-4 w-4 text-[#FF8BA7]" />
                    ) : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                  </div>
                </th>
                <th 
                  className="p-3 text-center cursor-pointer hover:bg-[#FFD3B6]/70 dark:hover:bg-slate-700/60 transition-colors"
                  onClick={() => handleSort('isExpansion')}
                >
                  <div className="flex items-center justify-center gap-1">
                    ประเภท
                    {sortField === 'isExpansion' ? (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 text-[#FF8BA7]" /> : <ChevronDown className="h-4 w-4 text-[#FF8BA7]" />
                    ) : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                  </div>
                </th>
                <th 
                  className="p-3 text-center cursor-pointer hover:bg-[#FFD3B6]/70 dark:hover:bg-slate-700/60 transition-colors"
                  onClick={() => handleSort('staffCount')}
                >
                  <div className="flex items-center justify-center gap-1">
                    ครู
                    {sortField === 'staffCount' ? (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 text-[#FF8BA7]" /> : <ChevronDown className="h-4 w-4 text-[#FF8BA7]" />
                    ) : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                  </div>
                </th>
                <th 
                  className="p-3 text-center cursor-pointer hover:bg-[#FFD3B6]/70 dark:hover:bg-slate-700/60 transition-colors"
                  onClick={() => handleSort('studentCount')}
                >
                  <div className="flex items-center justify-center gap-1">
                    นร.รวม
                    {sortField === 'studentCount' ? (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 text-[#FF8BA7]" /> : <ChevronDown className="h-4 w-4 text-[#FF8BA7]" />
                    ) : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                  </div>
                </th>
                <th 
                  className="p-3 text-center cursor-pointer hover:bg-[#FFD3B6]/70 dark:hover:bg-slate-700/60 transition-colors"
                  onClick={() => handleSort('internetType')}
                >
                  <div className="flex items-center justify-center gap-1">
                    ระบบเน็ต
                    {sortField === 'internetType' ? (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 text-[#FF8BA7]" /> : <ChevronDown className="h-4 w-4 text-[#FF8BA7]" />
                    ) : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                  </div>
                </th>
                <th className="p-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#33272A]/10 dark:divide-[#FFD3B6]/20 text-[#33272A] dark:text-[#FFF9F5] font-semibold">
              {sortedSchools.length > 0 ? (
                sortedSchools.map((school) => {
                  const amp = school.amphoe || getAmphoeAndNetwork(school.id, school.name).amphoe;
                  const net = school.networkGroup || getAmphoeAndNetwork(school.id, school.name).networkGroup;
                  return (
                    <tr key={school.id} className="hover:bg-[#FFD3B6]/10 dark:hover:bg-slate-800/40 transition-colors border-b border-[#33272A]/10 dark:border-[#FFD3B6]/10">
                      <td className="p-3 font-mono font-bold text-[#33272A] dark:text-[#FFD3B6] text-[13px]">{school.id}</td>
                      <td className="p-3 font-black text-[#33272A] dark:text-[#FFF9F5]">
                        <div className="flex flex-col gap-1">
                          <button 
                            onClick={() => onSelectSchool(school.id)}
                            className="hover:text-[#FF8BA7] text-left outline-none transition-colors cursor-pointer text-sm md:text-[15px]"
                          >
                            {school.name}
                          </button>

                          {/* แสดงป้ายไฟฟ้า / วิชาเอกย่อ */}
                          <div className="flex flex-wrap items-center gap-1">
                            {/* ป้ายไฟฟ้า */}
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-0.5 ${
                              school.electricity === 'has_electric' || school.electricity === true
                                ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700'
                                : school.electricity === 'solar'
                                ? 'bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-950/80 dark:text-yellow-200 dark:border-yellow-700'
                                : school.electricity === 'hybrid'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700'
                                : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                            }`}>
                              <Zap className="h-2.5 w-2.5 text-amber-500 fill-amber-400" />
                              {school.electricity === 'has_electric' || school.electricity === true ? 'ไฟฟ้าถาวร' :
                               school.electricity === 'solar' ? 'โซลาร์เซลล์' :
                               school.electricity === 'hybrid' ? 'ผสมผสาน' : 'ไม่มีไฟฟ้า'}
                            </span>

                            {/* ป้ายประปา */}
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-0.5 ${
                              school.waterSystem === 'mountain'
                                ? 'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/80 dark:text-cyan-200 dark:border-cyan-700'
                                : school.waterSystem === 'none'
                                ? 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-700'
                                : school.waterSystem === 'other'
                                ? 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/80 dark:text-purple-200 dark:border-purple-700'
                                : 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-700'
                            }`}>
                              <Droplets className="h-2.5 w-2.5 text-blue-500" />
                              {school.waterSystem === 'mountain' ? 'ประปาภูเขา' :
                               school.waterSystem === 'none' ? 'ไม่มีน้ำประปา' :
                               school.waterSystem === 'other' ? 'น้ำอื่นๆ' : 'ประปารัฐ'}
                            </span>

                            {/* ห้องเรียนย่อย */}
                            {school.classrooms && school.classrooms.length > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-200 border border-purple-300 dark:border-purple-700">
                                📚 {school.classrooms.length} ห้อง
                              </span>
                            )}

                            {/* ครูวิชาเอก */}
                            {((school.majorSubjects && school.majorSubjects.length > 0) || (school.majorSubjectsWithStaff && school.majorSubjectsWithStaff.length > 0)) && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-200 border border-sky-300 dark:border-sky-700 flex items-center gap-0.5" title={(school.majorSubjects || school.majorSubjectsWithStaff?.map(m=>m.name))?.join(', ')}>
                                <GraduationCap className="h-2.5 w-2.5 text-sky-600" />
                                {school.majorSubjects ? school.majorSubjects.slice(0, 2).join(', ') : school.majorSubjectsWithStaff?.slice(0, 2).map(m=>m.name).join(', ')}
                                {((school.majorSubjects?.length || 0) > 2 || (school.majorSubjectsWithStaff?.length || 0) > 2) && '...'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-[13px] font-black text-[#33272A] dark:text-[#FFF9F5]">{amp}</div>
                        <div className="text-[11px] text-slate-500 dark:text-rose-200/50 font-medium">{net}</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black border border-[#33272A] dark:border-[#FFD3B6] ${
                          school.size === 'small' ? 'bg-[#FF8BA7] text-[#33272A]' :
                          school.size === 'medium' ? 'bg-[#FFD3B6] text-[#33272A]' :
                          school.size === 'large' ? 'bg-[#A0E7E5] text-[#33272A]' :
                          'bg-[#FFAAA5] text-[#33272A]'
                        }`}>
                          {school.size === 'small' ? 'เล็ก' : school.size === 'medium' ? 'กลาง' : school.size === 'large' ? 'ใหญ่' : 'ใหญ่พิเศษ'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-black border border-[#33272A] dark:border-[#FFD3B6] ${
                          school.isExpansion ? 'bg-[#A0E7E5] text-[#33272A]' : 'bg-[#FFF9F5] text-slate-500'
                        }`}>
                          {school.isExpansion ? 'ขยายโอกาส' : 'ทั่วไป'}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-sm">{school.staffCount}</td>
                      <td className="p-3 text-center font-black text-[#FF8BA7] text-sm">{school.studentCount}</td>
                      <td className="p-3 text-center">
                        <span className="font-bold text-[#33272A] dark:text-[#FFF9F5] text-[13px]">
                          {school.internetType === 'fiber' ? 'Fiber' :
                           school.internetType === 'satellite' ? 'ดาวเทียม' :
                           school.internetType === 'sim' ? 'SIM 4G' : 'ไม่ได้ใช้'}
                        </span>
                      </td>
                      <td className="p-3 text-right flex justify-end gap-1.5 items-center">
                        {(school.schoolPhone || school.directorPhone) && (
                          <a
                            href={`tel:${(school.schoolPhone || school.directorPhone).replace(/[^0-9+]/g, '')}`}
                            className="rounded-xl p-1.5 border-2 border-[#33272A] bg-emerald-100 hover:bg-emerald-200 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950 dark:text-emerald-200 transition-colors cursor-pointer"
                            title={`โทรติดต่อ ${school.schoolPhone ? 'โรงเรียน (' + school.schoolPhone + ')' : 'ผู้บริหาร (' + school.directorPhone + ')'}`}
                          >
                            <Phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          </a>
                        )}
                        <button
                          onClick={() => onSelectSchool(school.id)}
                          className="rounded-xl p-1.5 border-2 border-[#33272A] bg-white hover:bg-[#FFD3B6]/30 text-[#33272A] dark:border-[#FFD3B6] dark:bg-[#33272A] dark:text-[#FFF9F5] transition-colors cursor-pointer"
                          title="ดูรายละเอียดเจาะลึก"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDownload(school.id, school.name)}
                          className="rounded-xl p-1.5 border-2 border-[#33272A] bg-[#A0E7E5] hover:opacity-90 text-[#33272A] dark:border-[#FFD3B6] dark:bg-[#A0E7E5] transition-colors cursor-pointer"
                          title="ดาวน์โหลดไฟล์ข้อมูลนักเรียน"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertTriangle className="h-8 w-8 text-[#FF8BA7] animate-bounce" />
                      <span className="font-bold">ไม่พบข้อมูลโรงเรียนที่ตรงกับเงื่อนไขการค้นหา</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ตารางแสดงข้อมูลแบบ Mobile & Tablet Card Layout */}
        <div className="lg:hidden p-4 space-y-4 bg-[#FFF9F5]/30 dark:bg-[#1e1518]/30 border-t border-[#33272A]/10 dark:border-[#FFD3B6]/10">
          {sortedSchools.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {sortedSchools.map((school) => {
                const amp = school.amphoe || getAmphoeAndNetwork(school.id, school.name).amphoe;
                const net = school.networkGroup || getAmphoeAndNetwork(school.id, school.name).networkGroup;
                return (
                  <div 
                    key={school.id} 
                    className="card p-4 flex flex-col justify-between hover:border-[#FF8BA7] transition-all bg-white dark:bg-[#1e1518] relative"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-mono font-black text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-[#33272A]/10 dark:border-[#FFD3B6]/10">
                          รหัส: {school.id}
                        </span>
                        <div className="flex flex-wrap gap-1 justify-end">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border border-[#33272A] dark:border-[#FFD3B6] ${
                            school.size === 'small' ? 'bg-[#FF8BA7] text-[#33272A]' :
                            school.size === 'medium' ? 'bg-[#FFD3B6] text-[#33272A]' :
                            school.size === 'large' ? 'bg-[#A0E7E5] text-[#33272A]' :
                            'bg-[#FFAAA5] text-[#33272A]'
                          }`}>
                            {school.size === 'small' ? 'เล็ก' : school.size === 'medium' ? 'กลาง' : school.size === 'large' ? 'ใหญ่' : 'ใหญ่พิเศษ'}
                          </span>
                          {school.isExpansion && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black border border-[#33272A] dark:border-[#FFD3B6] bg-[#A0E7E5] text-[#33272A]">
                              ขยายโอกาส
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <button 
                          onClick={() => onSelectSchool(school.id)}
                          className="text-base font-black text-[#33272A] dark:text-[#FFF9F5] hover:text-[#FF8BA7] text-left transition-colors cursor-pointer block"
                        >
                          {school.name}
                        </button>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-[#FF8BA7] shrink-0" /> อ.{amp} • {net}
                        </p>

                        {/* Badges ข้อมูลไฟฟ้า และ ครูวิชาเอก สำหรับมือถือ */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                            school.electricity === 'has_electric' || school.electricity === true
                              ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200'
                              : school.electricity === 'solar'
                              ? 'bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-950/80 dark:text-yellow-200'
                              : school.electricity === 'hybrid'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200'
                              : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            <Zap className="h-2.5 w-2.5 text-amber-500 fill-amber-400" />
                            {school.electricity === 'has_electric' || school.electricity === true ? 'ไฟฟ้าถาวร' :
                             school.electricity === 'solar' ? 'โซลาร์เซลล์' :
                             school.electricity === 'hybrid' ? 'ไฟฟ้าผสมผสาน' : 'ไม่มีไฟฟ้า'}
                          </span>

                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-950/80 dark:text-sky-200 flex items-center gap-1">
                            <Globe className="h-2.5 w-2.5 text-sky-600" />
                            {school.internetType === 'fiber' ? 'เน็ต Fiber' :
                             school.internetType === 'satellite' ? 'เน็ต ดาวเทียม' :
                             school.internetType === 'sim' ? 'เน็ต SIM 4G' : 'ไม่มีเน็ต'}
                          </span>

                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300 dark:bg-blue-950/80 dark:text-blue-200 flex items-center gap-1">
                            <Droplets className="h-2.5 w-2.5 text-blue-600" />
                            {school.waterSystem === 'mountain' ? 'ประปาภูเขา' :
                             school.waterSystem === 'none' ? 'ไม่มีน้ำ' :
                             school.waterSystem === 'other' ? 'น้ำอื่นๆ' : 'ประปารัฐ'}
                          </span>

                          {((school.majorSubjects && school.majorSubjects.length > 0) || (school.majorSubjectsWithStaff && school.majorSubjectsWithStaff.length > 0)) && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-950/80 dark:text-purple-200 flex items-center gap-1">
                              <GraduationCap className="h-2.5 w-2.5 text-purple-600" />
                              เอก{school.majorSubjects ? school.majorSubjects[0] : school.majorSubjectsWithStaff?.[0]?.name}
                              {((school.majorSubjects?.length || 0) > 1 || (school.majorSubjectsWithStaff?.length || 0) > 1) && ` +${(school.majorSubjects?.length || school.majorSubjectsWithStaff?.length || 1) - 1}`}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 py-2 border-y border-[#33272A]/10 dark:border-[#FFD3B6]/10 text-center text-xs">
                        <div>
                          <div className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">ครู/บุคลากร</div>
                          <div className="font-black text-[#33272A] dark:text-[#FFF9F5] mt-0.5">{school.staffCount} คน</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">นักเรียนรวม</div>
                          <div className="font-black text-[#FF8BA7] mt-0.5">{school.studentCount} คน</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">ระบบอินเทอร์เน็ต</div>
                          <div className="font-black text-[#33272A] dark:text-[#FFF9F5] truncate mt-0.5" title={school.internetType}>
                            {school.internetType === 'fiber' ? 'Fiber' :
                             school.internetType === 'satellite' ? 'ดาวเทียม' :
                             school.internetType === 'sim' ? 'SIM 4G' : 'ไม่ได้ใช้'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      {(school.schoolPhone || school.directorPhone) && (
                        <a
                          href={`tel:${(school.schoolPhone || school.directorPhone).replace(/[^0-9+]/g, '')}`}
                          className="btn-cute bg-emerald-100 hover:bg-emerald-200 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100 px-3 py-2 border-2 border-[#33272A] dark:border-emerald-400 text-xs font-black flex items-center justify-center gap-1 cursor-pointer"
                          title="โทรติดต่อ"
                        >
                          <Phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> โทร
                        </a>
                      )}
                      <button
                        onClick={() => onSelectSchool(school.id)}
                        className="flex-1 btn-cute bg-white hover:bg-[#FFD3B6]/30 text-[#33272A] text-xs font-black py-2 border-2 border-[#33272A] dark:border-[#FFD3B6] dark:bg-[#33272A] dark:text-[#FFF9F5] flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <Eye className="h-4 w-4" /> รายละเอียด
                      </button>
                      <button
                        onClick={() => handleOpenDownload(school.id, school.name)}
                        className="flex-1 btn-cute bg-[#A0E7E5] hover:opacity-90 text-[#33272A] text-xs font-black py-2 border-2 border-[#33272A] dark:border-[#FFD3B6] flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <Download className="h-4 w-4" /> โหลด
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 card bg-white dark:bg-[#1e1518]">
              <div className="flex flex-col items-center justify-center gap-2">
                <AlertTriangle className="h-8 w-8 text-[#FF8BA7] animate-bounce" />
                <span className="font-bold">ไม่พบข้อมูลโรงเรียนที่ตรงกับเงื่อนไขการค้นหา</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Download Purpose Modal (ตามมาตรการความปลอดภัยระบุใน Prompt) */}
      {isDownloadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#33272A]/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md card p-6 animate-zoom-in">
            <div className="flex items-center gap-3 text-[#33272A] dark:text-[#FFF9F5] mb-4">
              <div className="rounded-2xl bg-[#A0E7E5] border-2 border-[#33272A] dark:border-[#FFD3B6] p-2.5 text-[#33272A]">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black">บันทึกวัตถุประสงค์การเข้าถึงข้อมูล</h3>
                <p className="text-[10px] text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-semibold">ตามมาตรการรักษาความปลอดภัยข้อมูล พรบ.คุ้มครองข้อมูลส่วนบุคคล</p>
              </div>
            </div>

            <p className="text-xs text-[#33272A] dark:text-[#FFF9F5] mb-4 font-bold leading-relaxed bg-[#FFD3B6]/40 p-3 rounded-2xl border border-[#33272A] dark:border-[#FFD3B6]">
              คุณกำลังจะดาวน์โหลดข้อมูลนักเรียนของ <span className="font-black text-[#33272A] dark:text-[#FFF9F5] underline decoration-[#FF8BA7] decoration-2">
                {downloadTarget ? downloadTarget.name : 'โรงเรียนทั้งหมดในสพป.แม่ฮ่องสอน เขต 1'}
              </span> เพื่อนำไปประมวลผลภายนอก
            </p>

            <form onSubmit={handleConfirmDownload} className="space-y-4">
              {/* เลือกรูปแบบไฟล์ */}
              <div className="space-y-1">
                <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">รูปแบบไฟล์สำหรับดาวน์โหลด</label>
                <div className="flex gap-2">
                  <label className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer font-bold text-xs transition-all ${
                    exportFormat === 'excel'
                      ? 'bg-[#A0E7E5] border-[#33272A] text-[#33272A] shadow-sm'
                      : 'bg-white dark:bg-[#1e1518] border-slate-300 dark:border-slate-700 text-[#33272A] dark:text-[#FFF9F5]'
                  }`}>
                    <input
                      type="radio"
                      name="exportFormat"
                      value="excel"
                      checked={exportFormat === 'excel'}
                      onChange={() => setExportFormat('excel')}
                      className="hidden"
                    />
                    <span>📊 ไฟล์ Excel (.xlsx)</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer font-bold text-xs transition-all ${
                    exportFormat === 'pdf'
                      ? 'bg-[#FF8BA7] border-[#33272A] text-[#33272A] shadow-sm'
                      : 'bg-white dark:bg-[#1e1518] border-slate-300 dark:border-slate-700 text-[#33272A] dark:text-[#FFF9F5]'
                  }`}>
                    <input
                      type="radio"
                      name="exportFormat"
                      value="pdf"
                      checked={exportFormat === 'pdf'}
                      onChange={() => setExportFormat('pdf')}
                      className="hidden"
                    />
                    <span>📄 ไฟล์ PDF (.pdf)</span>
                  </label>
                </div>
              </div>

              {/* ชื่อ */}
              <div className="space-y-1">
                <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">ชื่อ-นามสกุลผู้ขอเข้าถึงข้อมูล</label>
                <input
                  type="text"
                  required
                  value={downloadName}
                  onChange={(e) => setDownloadName(e.target.value)}
                  placeholder="เช่น นายเอกชัย รักเรียน"
                  className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                />
              </div>

              {/* อีเมล */}
              <div className="space-y-1">
                <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">อีเมลติดต่อ</label>
                <input
                  type="email"
                  required
                  value={downloadEmail}
                  onChange={(e) => setDownloadEmail(e.target.value)}
                  placeholder="เช่น example@gmail.com"
                  className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                />
              </div>

              {/* หมายเหตุระบุวัตถุประสงค์ */}
              <div className="space-y-1">
                <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">ระบุหมายเหตุ / วัตถุประสงค์ในการนำข้อมูลไปใช้</label>
                <textarea
                  required
                  value={downloadPurpose}
                  onChange={(e) => setDownloadPurpose(e.target.value)}
                  rows={3}
                  placeholder="เช่น นำไปใช้ในงานศึกษาค้นคว้าวิจัยวิชาการ หรือใช้วางแผนการจัดสรรอาหารกลางวันแก่นักเรียนขยายโอกาส..."
                  className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                />
              </div>

              {/* Error box */}
              {downloadError && (
                <div className="flex gap-1.5 text-xs text-rose-600 font-black bg-rose-50 p-2 rounded-xl border-2 border-[#33272A]">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{downloadError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsDownloadModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-[#33272A]/70 dark:text-[#FFF9F5]/70 hover:bg-[#FFD3B6]/30 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isDownloading}
                  className="btn-cute bg-[#FF8BA7] text-[#33272A] px-4 py-2 text-xs font-black disabled:opacity-50"
                >
                  {isDownloading ? 'กำลังตรวจสอบ...' : 'ตกลงดาวน์โหลด'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
