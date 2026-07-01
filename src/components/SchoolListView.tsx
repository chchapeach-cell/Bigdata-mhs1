import { useState, useMemo, FormEvent } from 'react';
import { School, StudentData, DownloadLog, UserProfile } from '../types';
import { Search, Download, Filter, FileSpreadsheet, Eye, User, FileText, AlertTriangle, HelpCircle, ArrowUpDown, ChevronUp, ChevronDown, MapPin } from 'lucide-react';
import * as XLSX from 'xlsx';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { getAmphoeAndNetwork } from '../utils/initialData';

interface SchoolListViewProps {
  schools: School[];
  studentData: StudentData[];
  onSelectSchool: (id: string) => void;
  userProfile: UserProfile | null;
}

export default function SchoolListView({
  schools,
  studentData,
  onSelectSchool,
  userProfile
}: SchoolListViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all'); // all, expansion, basic
  const [netFilter, setNetFilter] = useState<string>('all');
  const [amphoeFilter, setAmphoeFilter] = useState<string>('all'); // เพิ่มตัวกรองอำเภอ
  
  // สถานะการจัดเรียงข้อมูล
  const [sortField, setSortField] = useState<'id' | 'name' | 'staffCount' | 'studentCount' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // สำหรับการดาวน์โหลดรายงาน
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadTarget, setDownloadTarget] = useState<{ id: string; name: string } | null>(null); // null means "all schools"
  const [downloadName, setDownloadName] = useState(userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : '');
  const [downloadEmail, setDownloadEmail] = useState(userProfile ? userProfile.email : '');
  const [downloadPurpose, setDownloadPurpose] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  // คำนวณจำนวนนักเรียนรวมของแต่ละโรงเรียนเพื่อให้แสดงในตาราง
  const schoolsWithCounts = useMemo(() => {
    return schools.map(school => {
      const matchData = studentData.find(s => s.schoolId === school.id);
      return {
        ...school,
        studentCount: matchData ? matchData.totalStudents : 0,
        maleCount: matchData ? matchData.totalMale : 0,
        femaleCount: matchData ? matchData.totalFemale : 0
      };
    });
  }, [schools, studentData]);

  // คัดกรองข้อมูลโรงเรียน
  const filteredSchools = useMemo(() => {
    return schoolsWithCounts.filter(school => {
      const matchesSearch = school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            school.id.includes(searchTerm);
      const matchesSize = sizeFilter === 'all' || school.size === sizeFilter;
      const matchesType = typeFilter === 'all' || 
                          (typeFilter === 'expansion' && school.isExpansion) ||
                          (typeFilter === 'basic' && !school.isExpansion);
      const matchesNet = netFilter === 'all' || school.internetType === netFilter;
      
      const schoolAmphoe = school.amphoe || getAmphoeAndNetwork(school.id, school.name).amphoe;
      const matchesAmphoe = amphoeFilter === 'all' || schoolAmphoe === amphoeFilter;

      return matchesSearch && matchesSize && matchesType && matchesNet && matchesAmphoe;
    });
  }, [schoolsWithCounts, searchTerm, sizeFilter, typeFilter, netFilter, amphoeFilter]);

  // จัดเรียงข้อมูลที่คัดกรองแล้ว
  const sortedSchools = useMemo(() => {
    if (!sortField) return filteredSchools;
    
    return [...filteredSchools].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'name') {
        return sortDirection === 'asc'
          ? valA.localeCompare(valB, 'th')
          : valB.localeCompare(valA, 'th');
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredSchools, sortField, sortDirection]);

  // ฟังก์ชันสลับการจัดเรียง
  const handleSort = (field: 'id' | 'name' | 'staffCount' | 'studentCount') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ฟังก์ชันสําหรับสร้าง Excel และบันทึกลง Firestore สำหรับประวัติ
  const handleOpenDownload = (id: string, name: string) => {
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

      if (downloadTarget) {
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
          "ขนาดสถานศึกษา": s.size === 'small' ? 'เล็ก' : s.size === 'medium' ? 'กลาง' : s.size === 'large' ? 'ใหญ่' : 'ใหญ่พิเศษ',
          "โรงเรียนขยายโอกาส": s.isExpansion ? 'ใช่' : 'ไม่ใช่',
          "ครูและบุคลากร (คน)": s.staffCount,
          "นักเรียนชาย (คน)": s.maleCount,
          "นักเรียนหญิง (คน)": s.femaleCount,
          "นักเรียนรวมทั้งหมด (คน)": s.studentCount,
          "ระบบอินเทอร์เน็ต": s.internetType === 'fiber' ? 'Fiber' : s.internetType === 'satellite' ? 'ดาวเทียม' : s.internetType === 'sim' ? 'SIM 4G/5G' : 'ไม่ได้ใช้',
          "มีไฟฟ้าใช้งาน": s.electricity ? 'ใช่' : 'ไม่ใช่',
          "เบอร์โทรผู้บริหาร": s.directorPhone
        }));
      }

      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "รายงานนักเรียน MHS1");

      const filename = downloadTarget 
        ? `MHS1_StudentData_${downloadTarget.id}_${downloadTarget.name.replace(/\s+/g, '')}.xlsx`
        : `MHS1_StudentData_AllSchools.xlsx`;

      XLSX.writeFile(wb, filename);

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

          {/* Export All button */}
          <button
            onClick={() => handleOpenDownload('', 'โรงเรียนทั้งหมดในเขตพื้นที่')}
            className="btn-cute bg-[#A0E7E5] px-5 py-2.5 text-sm font-black text-[#33272A] flex items-center gap-1.5 transition-all"
          >
            <FileSpreadsheet className="h-5 w-5" />
            ดาวน์โหลดข้อมูลทั้งหมด
          </button>
        </div>

        {/* Filters */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-4 border-t-2 border-[#33272A]/10 dark:border-[#FFD3B6]/20">
          {/* อำเภอ */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-[#FF8BA7]" /> อำเภอ (พื้นที่)
            </label>
            <select
              value={amphoeFilter}
              onChange={(e) => setAmphoeFilter(e.target.value)}
              className="w-full rounded-xl border-2 border-[#33272A] bg-white dark:border-[#FFD3B6] dark:bg-[#1e1518] p-2 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5]"
            >
              <option value="all">ทั้งหมด ทุกอำเภอ</option>
              <option value="เมืองแม่ฮ่องสอน">เมืองแม่ฮ่องสอน</option>
              <option value="ขุนยวม">ขุนยวม</option>
              <option value="ปาย">ปาย</option>
              <option value="ปางมะผ้า">ปางมะผ้า</option>
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
              <option value="all">ทั้งหมด ทุกขนาด</option>
              <option value="small">ขนาดเล็ก (&lt; 120 คน)</option>
              <option value="medium">ขนาดกลาง (120-299 คน)</option>
              <option value="large">ขนาดใหญ่ (300-1499 คน)</option>
              <option value="special_large">ขนาดใหญ่พิเศษ (&gt;= 1500 คน)</option>
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

          {/* อินเทอร์เน็ต */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-[#FF8BA7]" /> ระบบอินเทอร์เน็ต
            </label>
            <select
              value={netFilter}
              onChange={(e) => setNetFilter(e.target.value)}
              className="w-full rounded-xl border-2 border-[#33272A] bg-white dark:border-[#FFD3B6] dark:bg-[#1e1518] p-2 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5]"
            >
              <option value="all">ทั้งหมด ทุกประเภท</option>
              <option value="fiber">ไฟเบอร์ออพติก (Fiber)</option>
              <option value="satellite">ดาวเทียม (Satellite)</option>
              <option value="sim">อินเทอร์เน็ตซิม (SIM 4G/5G)</option>
              <option value="none">ไม่ได้ใช้/ไม่มีอินเทอร์เน็ต</option>
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

        {/* ตารางแสดงข้อมูลแบบ Responsive */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FFD3B6]/50 dark:bg-[#33272A] text-[#33272A] dark:text-[#FFF9F5] font-black border-b-2 border-[#33272A] dark:border-[#FFD3B6] uppercase tracking-wider select-none text-[11px]">
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
                <th className="p-3">อำเภอ / กลุ่มเครือข่าย</th>
                <th className="p-3 text-center">ขนาด</th>
                <th className="p-3 text-center">ประเภท</th>
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
                <th className="p-3 text-center">ระบบเน็ต</th>
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
                      <td className="p-3 font-mono font-bold text-[#33272A] dark:text-[#FFD3B6]">{school.id}</td>
                      <td className="p-3 font-black text-[#33272A] dark:text-[#FFF9F5]">
                        <button 
                          onClick={() => onSelectSchool(school.id)}
                          className="hover:text-[#FF8BA7] text-left outline-none transition-colors cursor-pointer text-[13px]"
                        >
                          {school.name}
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="text-[11px] font-black text-[#33272A] dark:text-[#FFF9F5]">{amp}</div>
                        <div className="text-[10px] text-slate-500 dark:text-rose-200/50 font-medium">{net}</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border border-[#33272A] dark:border-[#FFD3B6] ${
                          school.size === 'small' ? 'bg-[#FF8BA7] text-[#33272A]' :
                          school.size === 'medium' ? 'bg-[#FFD3B6] text-[#33272A]' :
                          school.size === 'large' ? 'bg-[#A0E7E5] text-[#33272A]' :
                          'bg-[#FFAAA5] text-[#33272A]'
                        }`}>
                          {school.size === 'small' ? 'เล็ก' : school.size === 'medium' ? 'กลาง' : school.size === 'large' ? 'ใหญ่' : 'ใหญ่พิเศษ'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black border border-[#33272A] dark:border-[#FFD3B6] ${
                          school.isExpansion ? 'bg-[#A0E7E5] text-[#33272A]' : 'bg-[#FFF9F5] text-slate-500'
                        }`}>
                          {school.isExpansion ? 'ขยายโอกาส' : 'ทั่วไป'}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold">{school.staffCount}</td>
                      <td className="p-3 text-center font-black text-[#FF8BA7]">{school.studentCount}</td>
                      <td className="p-3 text-center">
                        <span className="font-bold text-[#33272A] dark:text-[#FFF9F5]">
                          {school.internetType === 'fiber' ? 'Fiber' :
                           school.internetType === 'satellite' ? 'ดาวเทียม' :
                           school.internetType === 'sim' ? 'SIM 4G' : 'ไม่ได้ใช้'}
                        </span>
                      </td>
                      <td className="p-3 text-right flex justify-end gap-2.5">
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
