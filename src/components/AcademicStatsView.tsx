import { useState, useEffect, useMemo, useRef, ChangeEvent, FormEvent } from 'react';
import {
  School,
  UserProfile,
  SystemConfig,
  AcademicRecord,
  QualityLevel
} from '../types';
import {
  GraduationCap,
  TrendingUp,
  Award,
  UploadCloud,
  Download,
  Search,
  Filter,
  BarChart3,
  ListFilter,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
  Calculator,
  Building2,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  FileSpreadsheet,
  X,
  FileUp,
  MapPin,
  HelpCircle,
  Calendar,
  Database,
  Server
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell
} from 'recharts';
import {
  generateInitialAcademicRecords,
  parseAcademicFile,
  calculateAcademicSummary,
  exportAcademicRecordsToExcel,
  determineQualityLevel,
  matchSchoolId
} from '../utils/academicData';
import {
  dbFetchAcademicRecords,
  dbSaveAcademicRecords,
  dbSaveAcademicRecord,
  dbDeleteAcademicRecord,
  dbDeleteAcademicRecordsByYear
} from '../lib/dbAdapter';
import { isSupabaseConfigured, getSupabaseUrl } from '../lib/supabase';

interface AcademicStatsViewProps {
  schools: School[];
  userProfile?: UserProfile | null;
  academicYear: string;
  setAcademicYear: (year: string) => void;
  availableYears: string[];
  systemConfig: SystemConfig;
  onSelectSchool: (schoolId: string) => void;
  isDarkMode?: boolean;
}

export default function AcademicStatsView({
  schools,
  userProfile,
  academicYear,
  setAcademicYear,
  availableYears,
  onSelectSchool
}: AcademicStatsViewProps) {
  const isSuperAdmin = userProfile?.role === 'super_admin' || userProfile?.email === 'tamrri@gmail.com' || userProfile?.email === 'ch.chapeach@gmail.com';

  // Data States
  const [records, setRecords] = useState<AcademicRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAmphoe, setSelectedAmphoe] = useState<string>('all');
  const [selectedQuality, setSelectedQuality] = useState<string>('all');
  const [selectedTestType, setSelectedTestType] = useState<string>('NT');
  const [sortField, setSortField] = useState<'order' | 'total' | 'math' | 'thai' | 'name'>('order');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'table' | 'ranking'>('overview');

  // Modals & User Input State
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<AcademicRecord | null>(null);
  const [detailModalRecord, setDetailModalRecord] = useState<AcademicRecord | null>(null);
  const [showAddYearModal, setShowAddYearModal] = useState<boolean>(false);
  const [newYearInput, setNewYearInput] = useState<string>('');

  // Delete Year State
  const [showDeleteYearModal, setShowDeleteYearModal] = useState<boolean>(false);
  const [deleteTargetYear, setDeleteTargetYear] = useState<string>(academicYear || '2567');
  const [deleteScope, setDeleteScope] = useState<'test_type' | 'all_assessments' | 'full_year'>('all_assessments');
  const [isDeletingYear, setIsDeletingYear] = useState<boolean>(false);

  // Upload Modal State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadYear, setUploadYear] = useState<string>(academicYear || '2567');
  const [isCustomUploadYear, setIsCustomUploadYear] = useState<boolean>(false);
  const [customUploadYearInput, setCustomUploadYearInput] = useState<string>('');
  const [uploadTestType, setUploadTestType] = useState<string>('NT');
  const [uploadTestTitle, setUploadTestTitle] = useState<string>('การประเมินคุณภาพผู้เรียน (NT) ชั้นประถมศึกษาปีที่ 3');
  const [parsedUploadResults, setParsedUploadResults] = useState<AcademicRecord[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [isParsingFile, setIsParsingFile] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadProgressStage, setUploadProgressStage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom Years State & Year Management
  const [customYears, setCustomYears] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('academic_custom_years');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Dynamic Available Years computed from all data sources
  const allAvailableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    if (academicYear) yearsSet.add(academicYear);
    if (uploadYear) yearsSet.add(uploadYear);
    (availableYears || []).forEach(y => y && yearsSet.add(y));
    records.forEach(r => r.academicYear && yearsSet.add(r.academicYear));
    customYears.forEach(y => y && yearsSet.add(y));
    ['2569', '2568', '2567', '2566', '2565'].forEach(y => yearsSet.add(y));
    return Array.from(yearsSet).filter(Boolean).sort((a, b) => b.localeCompare(a));
  }, [academicYear, uploadYear, availableYears, records, customYears]);

  const handleAddNewAcademicYear = (yearStr: string, autoSwitch = true) => {
    const cleanYear = yearStr.trim();
    if (!cleanYear || !/^\d{4}$/.test(cleanYear)) {
      setStatusMessage({ type: 'error', text: 'กรุณาระบุปีการศึกษาเป็นตัวเลข พ.ศ. 4 หลัก เช่น 2568, 2569' });
      return false;
    }
    if (!customYears.includes(cleanYear)) {
      const updated = [...customYears, cleanYear];
      setCustomYears(updated);
      try {
        localStorage.setItem('academic_custom_years', JSON.stringify(updated));
      } catch {}
    }
    if (autoSwitch) {
      setAcademicYear(cleanYear);
      setUploadYear(cleanYear);
      setStatusMessage({ type: 'success', text: `เพิ่มและสลับไปยังปีการศึกษา ${cleanYear} เรียบร้อยแล้ว` });
    }
    return true;
  };

  // Handler to Delete Academic Year Data
  const handleConfirmDeleteYear = async () => {
    if (!deleteTargetYear) return;
    setIsDeletingYear(true);
    try {
      const isCurrentTestOnly = deleteScope === 'test_type';
      const targetTest = isCurrentTestOnly ? selectedTestType : 'all';

      // 1. Delete in database (Firestore + Supabase)
      const deletedCount = await dbDeleteAcademicRecordsByYear(deleteTargetYear, targetTest);

      // 2. If deleting full year or all assessments, and it's in customYears, remove it
      if (deleteScope === 'full_year' || deleteScope === 'all_assessments') {
        if (customYears.includes(deleteTargetYear)) {
          const updatedCustom = customYears.filter(y => y !== deleteTargetYear);
          setCustomYears(updatedCustom);
          try {
            localStorage.setItem('academic_custom_years', JSON.stringify(updatedCustom));
          } catch {}
        }
      }

      // 3. Update in-memory records
      setRecords(prev => prev.filter(r => {
        if (r.academicYear === deleteTargetYear) {
          if (isCurrentTestOnly) {
            return r.testType !== selectedTestType;
          }
          return false; // remove all for this year
        }
        return true;
      }));

      // 4. If current active academicYear was deleted (all assessments or full year), switch to another year
      if (academicYear === deleteTargetYear && deleteScope !== 'test_type') {
        const remainingYears = allAvailableYears.filter(y => y !== deleteTargetYear);
        const nextYear = remainingYears[0] || '2567';
        setAcademicYear(nextYear);
        setUploadYear(nextYear);
      }

      const scopeLabel = isCurrentTestOnly
        ? `ข้อมูลผลคะแนน ${selectedTestType} ของปีการศึกษา ${deleteTargetYear}`
        : deleteScope === 'full_year'
        ? `ข้อมูลทั้งหมดและปีการศึกษา ${deleteTargetYear}`
        : `ข้อมูลผลการประเมินทั้งหมด (NT และ RT) ของปีการศึกษา ${deleteTargetYear}`;

      setStatusMessage({
        type: 'success',
        text: `ลบ${scopeLabel} สำเร็จเรียบร้อย (${deletedCount || 0} รายการ)`
      });
      setShowDeleteYearModal(false);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: 'เกิดข้อผิดพลาดในการลบข้อมูลปีการศึกษา: ' + (err.message || String(err))
      });
    } finally {
      setIsDeletingYear(false);
    }
  };

  // Dynamic Subject & Test labels based on selectedTestType
  const isRT = selectedTestType === 'RT';
  const subject1Title = isRT ? 'ด้านการอ่านออกเสียง' : 'ด้านคณิตศาสตร์';
  const subject1Short = isRT ? 'การอ่านออกเสียง' : 'คณิตศาสตร์';
  const subject1Badge = isRT ? 'อ่านออกเสียง' : 'คณิต';
  const subject2Title = isRT ? 'ด้านการอ่านรู้เรื่อง' : 'ด้านภาษาไทย';
  const subject2Short = isRT ? 'การอ่านรู้เรื่อง' : 'ภาษาไทย';
  const subject2Badge = isRT ? 'อ่านรู้เรื่อง' : 'ไทย';
  const currentTestTitle = isRT
    ? 'การประเมินความสามารถด้านการอ่านของผู้เรียน (RT) ชั้นประถมศึกษาปีที่ 1'
    : 'การประเมินคุณภาพผู้เรียน (NT) ชั้นประถมศึกษาปีที่ 3';

  // Counts of NT and RT datasets
  const countNT = useMemo(() => records.filter(r => r.testType === 'NT' && (!academicYear || r.academicYear === academicYear)).length, [records, academicYear]);
  const countRT = useMemo(() => records.filter(r => r.testType === 'RT' && (!academicYear || r.academicYear === academicYear)).length, [records, academicYear]);

  // 1. Fetch Records on Mount & Year change
  useEffect(() => {
    loadAcademicData();
  }, [academicYear]);

  const loadAcademicData = async () => {
    setIsLoading(true);
    try {
      const dbRecords = await dbFetchAcademicRecords();
      if (dbRecords && dbRecords.length > 0) {
        // Repair any records missing valid 8-digit school IDs
        const repaired = dbRecords.map(r => {
          if (!r.schoolId || r.schoolId.startsWith('NT_') || r.schoolId.startsWith('RT_') || r.schoolId.startsWith('SCH_') || !/^\d{6,10}/.test(r.schoolId)) {
            const matchedId = matchSchoolId('', r.schoolName, r.amphoe, schools);
            if (matchedId) {
              return { ...r, schoolId: matchedId };
            }
          }
          return r;
        });
        localStorage.setItem('academic_records_initialized_flag', 'true');
        setRecords(repaired);
      } else {
        // Only initialize default demo records if the user has NEVER loaded the system before
        const isFirstEverVisit = !localStorage.getItem('academic_records_initialized_flag');
        if (isFirstEverVisit) {
          const initial = generateInitialAcademicRecords(schools, academicYear || '2567');
          await dbSaveAcademicRecords(initial, userProfile?.email || 'Super Admin');
          localStorage.setItem('academic_records_initialized_flag', 'true');
          setRecords(initial);
        } else {
          // If already initialized before, empty means records were deleted by user
          setRecords([]);
        }
      }
    } catch (err) {
      console.error('Error loading academic records:', err);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and Sort records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Filter by academic year
      if (rec.academicYear && academicYear && rec.academicYear !== academicYear) {
        return false;
      }
      // Filter by test type
      if (rec.testType && selectedTestType && rec.testType !== selectedTestType) {
        return false;
      }
      // Filter by amphoe
      if (selectedAmphoe !== 'all' && rec.amphoe !== selectedAmphoe) {
        return false;
      }
      // Filter by quality
      if (selectedQuality !== 'all') {
        const q = rec.totalQuality || determineQualityLevel(rec.totalPercentage || rec.totalScore);
        if (q !== selectedQuality) return false;
      }
      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const sName = (rec.schoolName || '').toLowerCase();
        const sId = (rec.schoolId || '').toLowerCase();
        const amp = (rec.amphoe || '').toLowerCase();
        if (!sName.includes(q) && !sId.includes(q) && !amp.includes(q)) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortField === 'order') {
        valA = a.order || 0;
        valB = b.order || 0;
      } else if (sortField === 'total') {
        valA = a.totalPercentage || a.totalScore || 0;
        valB = b.totalPercentage || b.totalScore || 0;
      } else if (sortField === 'math') {
        valA = a.mathPercentage || a.mathScore || 0;
        valB = b.mathPercentage || b.mathScore || 0;
      } else if (sortField === 'thai') {
        valA = a.thaiPercentage || a.thaiScore || 0;
        valB = b.thaiPercentage || b.thaiScore || 0;
      } else if (sortField === 'name') {
        valA = a.schoolName || '';
        valB = b.schoolName || '';
        return sortAsc ? valA.localeCompare(valB, 'th') : valB.localeCompare(valA, 'th');
      }

      return sortAsc ? valA - valB : valB - valA;
    });
  }, [records, academicYear, selectedTestType, selectedAmphoe, selectedQuality, searchQuery, sortField, sortAsc]);

  // Summary Metrics
  const summary = useMemo(() => {
    return calculateAcademicSummary(filteredRecords);
  }, [filteredRecords]);

  // Top and Bottom Schools
  const rankingSchools = useMemo(() => {
    const schoolOnly = filteredRecords.filter(r => !r.schoolName.includes('เขตพื้นที่การศึกษา'));
    const sorted = [...schoolOnly].sort((a, b) => (b.totalPercentage || b.totalScore || 0) - (a.totalPercentage || a.totalScore || 0));
    return {
      top10: sorted.slice(0, 10),
      bottom10: [...sorted].reverse().slice(0, 10)
    };
  }, [filteredRecords]);

  // Handle File Upload Parsing
  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    setIsParsingFile(true);
    setUploadProgress(20);
    setUploadProgressStage(`กำลังอ่านไฟล์ ${file.name}...`);
    setUploadErrors([]);
    setParsedUploadResults([]);

    try {
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      let parsed;

      setUploadProgress(50);
      setUploadProgressStage('กำลังแปลงข้อมูลและวิเคราะห์คอลัมน์...');

      if (isExcel) {
        const buffer = await file.arrayBuffer();
        parsed = parseAcademicFile(buffer, file.name, uploadYear, uploadTestType, uploadTestTitle, schools);
      } else {
        const text = await file.text();
        parsed = parseAcademicFile(text, file.name, uploadYear, uploadTestType, uploadTestTitle, schools);
      }

      setUploadProgress(90);
      setUploadProgressStage('กำลังจับคู่รหัสโรงเรียนและตรวจสอบความถูกต้อง...');

      if (parsed.detectedType && parsed.detectedType !== uploadTestType) {
        setUploadTestType(parsed.detectedType);
        if (parsed.detectedTitle) setUploadTestTitle(parsed.detectedTitle);
      }

      if (parsed.errors.length > 0) {
        setUploadErrors(parsed.errors);
      }
      setParsedUploadResults(parsed.records);
      setUploadProgress(100);
      setUploadProgressStage(`ตรวจสอบเรียบร้อย พบข้อมูล ${parsed.records.length} สถานศึกษา`);
    } catch (err: any) {
      setUploadErrors(['ไม่สามารถอ่านไฟล์ได้: ' + (err.message || String(err))]);
    } finally {
      setIsParsingFile(false);
    }
  };

  // Reparse currently selected file when year/type changes
  const reparseCurrentFile = async (targetYear: string, targetType: string, targetTitle: string) => {
    if (!uploadFile) return;
    setIsParsingFile(true);
    setUploadProgress(30);
    setUploadProgressStage('กำลังประมวลผลไฟล์ใหม่...');
    try {
      const isExcel = uploadFile.name.endsWith('.xlsx') || uploadFile.name.endsWith('.xls');
      let parsed;
      if (isExcel) {
        const buffer = await uploadFile.arrayBuffer();
        parsed = parseAcademicFile(buffer, uploadFile.name, targetYear, targetType, targetTitle, schools);
      } else {
        const text = await uploadFile.text();
        parsed = parseAcademicFile(text, uploadFile.name, targetYear, targetType, targetTitle, schools);
      }
      if (parsed.errors.length > 0) {
        setUploadErrors(parsed.errors);
      } else {
        setUploadErrors([]);
      }
      setParsedUploadResults(parsed.records);
      setUploadProgress(100);
      setUploadProgressStage(`พบข้อมูล ${parsed.records.length} สถานศึกษา`);
    } catch (err: any) {
      setUploadErrors(['ไม่สามารถอ่านไฟล์ได้: ' + (err.message || String(err))]);
    } finally {
      setIsParsingFile(false);
    }
  };

  // Confirm and Save Uploaded Records
  const handleConfirmUpload = async () => {
    if (parsedUploadResults.length === 0) return;
    setIsSaving(true);
    setUploadProgress(5);
    setUploadProgressStage('กำลังเตรียมความพร้อมของข้อมูล...');
    try {
      const targetYear = uploadYear || academicYear || '2567';
      const targetType = uploadTestType || selectedTestType || 'NT';
      const isRT = targetType === 'RT';

      const finalRecordsToSave: AcademicRecord[] = parsedUploadResults.map(r => ({
        ...r,
        academicYear: targetYear,
        testType: targetType,
        testTitle: isRT
          ? 'การประเมินความสามารถด้านการอ่านของผู้เรียน (RT) ชั้นประถมศึกษาปีที่ 1'
          : 'การประเมินคุณภาพผู้เรียน (NT) ชั้นประถมศึกษาปีที่ 3',
        id: `${r.schoolId || r.order}_${targetYear}_${targetType}`,
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.email || 'Super Admin'
      }));

      // Save all parsed records to database (Supabase & Firestore) with progress tracking
      await dbSaveAcademicRecords(
        finalRecordsToSave,
        userProfile?.email || 'Super Admin',
        (percent, stage) => {
          setUploadProgress(percent);
          setUploadProgressStage(stage);
        }
      );

      // Update local state by merging or replacing for that year/type
      const otherRecords = records.filter(
        r => !(r.academicYear === targetYear && r.testType === targetType)
      );
      const updated = [...otherRecords, ...finalRecordsToSave];
      setRecords(updated);

      // Register new custom year if not in list
      if (!customYears.includes(targetYear)) {
        const updatedCustom = [...customYears, targetYear];
        setCustomYears(updatedCustom);
        try {
          localStorage.setItem('academic_custom_years', JSON.stringify(updatedCustom));
        } catch {}
      }

      // Switch view to match uploaded test type and academic year
      setSelectedTestType(targetType);
      setAcademicYear(targetYear);

      setUploadProgress(100);
      setUploadProgressStage('บันทึกข้อมูลเรียบร้อยแล้ว!');

      setTimeout(() => {
        setStatusMessage({
          type: 'success',
          text: `นำเข้าข้อมูลผลสัมฤทธิ์ (${targetType}) ปีการศึกษา ${targetYear} สำเร็จเรียบร้อย (${finalRecordsToSave.length} สถานศึกษา)`
        });
        setShowUploadModal(false);
        setUploadFile(null);
        setParsedUploadResults([]);
        setUploadProgress(0);
        setUploadProgressStage('');
        setIsSaving(false);
      }, 700);
    } catch (err: any) {
      setIsSaving(false);
      setStatusMessage({
        type: 'error',
        text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + (err.message || String(err))
      });
    }
  };

  // Restore Default Dataset (NT 128 + RT 130)
  const handleRestoreDefault = async () => {
    if (!window.confirm('คุณต้องการโหลดข้อมูลผลการประเมิน NT (ป.3 128 รายการ) และ RT (ป.1 130 รายการ) สพป.แม่ฮ่องสอน เขต 1 ต้นฉบับกลับมาใช้งานใช่หรือไม่?')) {
      return;
    }
    setIsSaving(true);
    try {
      const initial = generateInitialAcademicRecords(schools, academicYear || '2567');
      await dbSaveAcademicRecords(initial, userProfile?.email || 'Super Admin');
      setRecords(initial);
      setStatusMessage({
        type: 'success',
        text: 'กู้คืนข้อมูลผลการประเมินเริ่มต้น NT และ RT รวม 258 รายการเรียบร้อยแล้ว'
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: 'เกิดข้อผิดพลาดในการกู้คืนข้อมูล: ' + (err.message || String(err))
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Save Single Record
  const handleSaveSingleRecord = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setIsSaving(true);
    try {
      const mathP = Number(editingRecord.mathPercentage || editingRecord.mathScore || 0);
      const thaiP = Number(editingRecord.thaiPercentage || editingRecord.thaiScore || 0);
      const totalS = Number(((mathP + thaiP) / 2).toFixed(2));

      const mathQuality = determineQualityLevel(mathP);
      const thaiQuality = determineQualityLevel(thaiP);
      const totalQuality = determineQualityLevel(totalS);

      const targetTestType = editingRecord.testType || selectedTestType || 'NT';
      const isTargetRT = targetTestType === 'RT';

      const completeRecord: AcademicRecord = {
        ...editingRecord,
        mathScore: Number(editingRecord.mathScore || 0),
        mathPercentage: mathP,
        thaiScore: Number(editingRecord.thaiScore || 0),
        thaiPercentage: thaiP,
        totalScore: totalS,
        totalPercentage: totalS,
        mathQuality,
        thaiQuality,
        totalQuality,
        academicYear: editingRecord.academicYear || academicYear || '2567',
        testType: targetTestType,
        testTitle: isTargetRT
          ? 'การประเมินความสามารถด้านการอ่านของผู้เรียน (RT) ชั้นประถมศึกษาปีที่ 1'
          : 'การประเมินคุณภาพผู้เรียน (NT) ชั้นประถมศึกษาปีที่ 3'
      };

      await dbSaveAcademicRecord(completeRecord, userProfile?.email || 'Admin');

      setRecords(prev => {
        const idx = prev.findIndex(r => r.id === completeRecord.id);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = completeRecord;
          return clone;
        }
        return [completeRecord, ...prev];
      });

      setStatusMessage({ type: 'success', text: `บันทึกข้อมูล ${completeRecord.schoolName} (${targetTestType}) เรียบร้อยแล้ว` });
      setShowEditModal(false);
      setEditingRecord(null);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึก: ' + (err.message || String(err)) });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Single Record
  const handleDeleteRecord = async (id: string, name: string) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลผลสัมฤทธิ์ของ "${name}"?`)) return;
    try {
      await dbDeleteAcademicRecord(id);
      setRecords(prev => prev.filter(r => r.id !== id));
      setStatusMessage({ type: 'info', text: `ลบข้อมูลผลสัมฤทธิ์ของ ${name} เรียบร้อยแล้ว` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการลบ: ' + (err.message || String(err)) });
    }
  };

  // Export to Excel
  const handleExport = () => {
    exportAcademicRecordsToExcel(filteredRecords, academicYear, selectedTestType);
    setStatusMessage({ type: 'success', text: 'ส่งออกไฟล์ Excel เรียบร้อยแล้ว' });
  };

  // Quality Badge Helper
  const renderQualityBadge = (quality: QualityLevel) => {
    switch (quality) {
      case 'ดีมาก':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ดีมาก
          </span>
        );
      case 'ดี':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            ดี
          </span>
        );
      case 'พอใช้':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            พอใช้
          </span>
        );
      case 'ปรับปรุง':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            ปรับปรุง
          </span>
        );
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 50) return 'text-blue-600 dark:text-blue-400';
    if (score >= 30) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  return (
    <div id="academic-stats-view-root" className="space-y-6 pb-12">
      {/* Toast Notification */}
      {statusMessage && (
        <div
          id="academic-status-banner"
          className={`flex items-center justify-between gap-3 p-4 rounded-2xl border-2 transition-all shadow-sm ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-700'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-700'
              : 'bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-700'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-bold">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : statusMessage.type === 'error' ? (
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            ) : (
              <Sparkles className="h-5 w-5 text-blue-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Banner & Action Bar */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-[#33272A] dark:border-slate-700 bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-indigo-500/15 p-6 md:p-8 backdrop-blur-sm shadow-[4px_4px_0px_#33272A] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500 text-white text-xs font-black tracking-wide shadow-sm">
              <GraduationCap className="h-4 w-4" />
              <span>ระบบรายงานผลสัมฤทธิ์ทางการเรียน</span>
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              ผลการประเมินคุณภาพผู้เรียน (NT / RT)
            </h1>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 font-medium">
              สำนักงานเขตพื้นที่การศึกษาประถมศึกษาแม่ฮ่องสอน เขต 1
            </p>

            {/* Academic Year Selector & Add/Delete Year Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="flex items-center gap-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border-2 border-[#33272A] dark:border-slate-600 shadow-[2px_2px_0px_#33272A]">
                <Calendar className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span className="text-xs font-black text-slate-700 dark:text-slate-200">ปีการศึกษา:</span>
                <select
                  id="select-main-academic-year"
                  value={academicYear || '2567'}
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      setShowAddYearModal(true);
                    } else if (e.target.value === '__delete_year__') {
                      setDeleteTargetYear(academicYear || '2567');
                      setShowDeleteYearModal(true);
                    } else {
                      setAcademicYear(e.target.value);
                      setUploadYear(e.target.value);
                    }
                  }}
                  className="bg-transparent text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400 outline-none cursor-pointer"
                >
                  {allAvailableYears.map((y) => (
                    <option key={y} value={y} className="text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 font-bold">
                      ปีการศึกษา {y}
                    </option>
                  ))}
                  {isSuperAdmin && (
                    <>
                      <option value="__add_new__" className="text-rose-600 font-black bg-rose-50 dark:bg-rose-950">
                        ➕ เพิ่มปีการศึกษาใหม่...
                      </option>
                      <option value="__delete_year__" className="text-red-600 font-black bg-red-50 dark:bg-red-950">
                        🗑️ ลบข้อมูลปีการศึกษา...
                      </option>
                    </>
                  )}
                </select>
              </div>

              {/* Quick Button: เพิ่มปีการศึกษา */}
              {isSuperAdmin && (
                <button
                  id="btn-add-academic-year-quick"
                  type="button"
                  onClick={() => setShowAddYearModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-2 border-[#33272A] dark:border-slate-600 text-xs font-black text-slate-800 dark:text-slate-200 shadow-[2px_2px_0px_#33272A] active:translate-y-0.5 transition-all cursor-pointer"
                  title="เพิ่มปีการศึกษาใหม่ลงในระบบ"
                >
                  <Plus className="h-3.5 w-3.5 text-rose-600" />
                  <span>เพิ่มปีการศึกษา</span>
                </button>
              )}

              {/* Quick Button: ลบข้อมูลปีการศึกษา */}
              {isSuperAdmin && (
                <button
                  id="btn-delete-academic-year-quick"
                  type="button"
                  onClick={() => {
                    setDeleteTargetYear(academicYear || '2567');
                    setShowDeleteYearModal(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800/60 text-xs font-black text-rose-700 dark:text-rose-300 shadow-[2px_2px_0px_#33272A] active:translate-y-0.5 transition-all cursor-pointer"
                  title="ลบข้อมูลคะแนนหรือลบปีการศึกษาออกจากระบบ"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                  <span>ลบข้อมูลปีนี้</span>
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons (Super Admin Only) */}
          {isSuperAdmin && (
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Upload Button */}
              <button
                id="btn-upload-academic-file"
                type="button"
                onClick={() => {
                  setUploadYear(academicYear || '2567');
                  setShowUploadModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs md:text-sm font-black shadow-[2px_2px_0px_#33272A] active:translate-y-0.5 transition-all cursor-pointer"
              >
                <UploadCloud className="h-4 w-4" />
                <span>นำเข้าไฟล์คะแนน (.csv / .xlsx)</span>
              </button>

              {/* Add Single Record */}
              <button
                id="btn-add-academic-record"
                type="button"
                onClick={() => {
                  setEditingRecord({
                    id: '',
                    schoolId: '',
                    schoolName: '',
                    amphoe: 'เมืองแม่ฮ่องสอน',
                    mathScore: 0,
                    mathPercentage: 0,
                    thaiScore: 0,
                    thaiPercentage: 0,
                    totalScore: 0,
                    totalPercentage: 0,
                    mathQuality: 'พอใช้',
                    thaiQuality: 'พอใช้',
                    totalQuality: 'พอใช้',
                    academicYear: academicYear || '2567',
                    testType: selectedTestType || 'NT'
                  });
                  setShowEditModal(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-[#33272A] dark:border-slate-600 text-xs md:text-sm font-black text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-[2px_2px_0px_#33272A] active:translate-y-0.5 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4 text-emerald-600" />
                <span>เพิ่มรายโรงเรียน</span>
              </button>

              {/* Export Excel Button */}
              <button
                id="btn-export-academic-excel"
                type="button"
                onClick={handleExport}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-[#33272A] dark:border-slate-600 text-xs md:text-sm font-black text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-[2px_2px_0px_#33272A] active:translate-y-0.5 transition-all cursor-pointer"
              >
                <Download className="h-4 w-4 text-indigo-600" />
                <span>ดาวน์โหลด Excel</span>
              </button>

              {/* Restore Default Button */}
              <button
                id="btn-restore-default-academic"
                type="button"
                onClick={handleRestoreDefault}
                title="กู้คืนข้อมูลเริ่มต้นตามไฟล์ 128 สถานศึกษา"
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>รีเซ็ตค่าเดิม</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-menu Tabs: NT (ป.3) vs RT (ป.1) */}
      <div id="academic-test-type-submenu" className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 rounded-3xl border-2 border-[#33272A] dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[3px_3px_0px_#33272A] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl flex-1">
          {/* NT Tab */}
          <button
            id="tab-select-nt"
            type="button"
            onClick={() => setSelectedTestType('NT')}
            className={`flex-1 flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs md:text-sm font-black transition-all cursor-pointer ${
              selectedTestType === 'NT'
                ? 'bg-rose-600 text-white shadow-[2px_2px_0px_#33272A] dark:shadow-[2px_2px_0px_rgba(0,0,0,0.5)] scale-[1.01]'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700/60'
            }`}
          >
            <Calculator className="h-4 w-4 shrink-0" />
            <div className="flex items-center gap-1.5 truncate">
              <span>NT (ประเมินคุณภาพ ป.3)</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                selectedTestType === 'NT' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {countNT} แห่ง
              </span>
            </div>
          </button>

          {/* RT Tab */}
          <button
            id="tab-select-rt"
            type="button"
            onClick={() => setSelectedTestType('RT')}
            className={`flex-1 flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs md:text-sm font-black transition-all cursor-pointer ${
              selectedTestType === 'RT'
                ? 'bg-indigo-600 text-white shadow-[2px_2px_0px_#33272A] dark:shadow-[2px_2px_0px_rgba(0,0,0,0.5)] scale-[1.01]'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700/60'
            }`}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            <div className="flex items-center gap-1.5 truncate">
              <span>RT (ประเมินการอ่าน ป.1)</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                selectedTestType === 'RT' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {countRT} แห่ง
              </span>
            </div>
          </button>
        </div>

        {/* Info Indicator */}
        <div className="hidden lg:flex items-center gap-2 px-3 text-xs font-bold text-slate-500 dark:text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{currentTestTitle}</span>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: คะแนนรวมเฉลี่ย 2 ด้าน */}
        <div className="rounded-3xl border-2 border-[#33272A] dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-[3px_3px_0px_#33272A] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">คะแนนเฉลี่ยรวม 2 ด้าน ({selectedTestType})</span>
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-black ${getScoreColor(summary.avgTotal)}`}>
              {summary.avgTotal.toFixed(2)}
            </span>
            <span className="text-xs font-bold text-slate-400">/ 100 คะแนน</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 font-medium">ระดับคุณภาพเขต:</span>
            {renderQualityBadge(determineQualityLevel(summary.avgTotal))}
          </div>
        </div>

        {/* Card 2: Subject 1 (ด้านคณิตศาสตร์ หรือ ด้านการอ่านออกเสียง) */}
        <div className="rounded-3xl border-2 border-[#33272A] dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-[3px_3px_0px_#33272A] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">{subject1Title}</span>
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600">
              {isRT ? <BookOpen className="h-5 w-5" /> : <Calculator className="h-5 w-5" />}
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-black ${getScoreColor(summary.avgMath)}`}>
              {summary.avgMath.toFixed(2)}
            </span>
            <span className="text-xs font-bold text-slate-400">/ 100 คะแนน</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 font-medium">ระดับคุณภาพ:</span>
            {renderQualityBadge(determineQualityLevel(summary.avgMath))}
          </div>
        </div>

        {/* Card 3: Subject 2 (ด้านภาษาไทย หรือ ด้านการอ่านรู้เรื่อง) */}
        <div className="rounded-3xl border-2 border-[#33272A] dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-[3px_3px_0px_#33272A] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">{subject2Title}</span>
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-black ${getScoreColor(summary.avgThai)}`}>
              {summary.avgThai.toFixed(2)}
            </span>
            <span className="text-xs font-bold text-slate-400">/ 100 คะแนน</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 font-medium">ระดับคุณภาพ:</span>
            {renderQualityBadge(determineQualityLevel(summary.avgThai))}
          </div>
        </div>

        {/* Card 4: จำนวนสถานศึกษาที่รับการประเมิน */}
        <div className="rounded-3xl border-2 border-[#33272A] dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-[3px_3px_0px_#33272A] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">สถานศึกษาที่ประเมิน ({selectedTestType})</span>
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {summary.totalSchools}
            </span>
            <span className="text-xs font-bold text-slate-400">แห่ง</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 font-medium">คะแนนสูงสุด/ต่ำสุด:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {summary.maxTotal.toFixed(1)} / {summary.minTotal.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Quality Level Distribution Bar */}
      <div className="rounded-3xl border-2 border-[#33272A] dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-[3px_3px_0px_#33272A] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-rose-500" />
              <span>สัดส่วนระดับคุณภาพสถานศึกษา (รวม 2 ด้าน)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              ตามเกณฑ์ สพฐ.: ดีมาก (70+), ดี (50-69.99), พอใช้ (30-49.99), ปรับปรุง (&lt;30)
            </p>
          </div>
        </div>

        {/* Progress Bars Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* ดีมาก */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300">ระดับดีมาก</span>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                {summary.totalSchools > 0 ? ((summary.qualityDistribution['ดีมาก'] / summary.totalSchools) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-200">
              {summary.qualityDistribution['ดีมาก']} <span className="text-xs font-bold text-emerald-600">แห่ง</span>
            </div>
          </div>

          {/* ดี */}
          <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-blue-800 dark:text-blue-300">ระดับดี</span>
              <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                {summary.totalSchools > 0 ? ((summary.qualityDistribution['ดี'] / summary.totalSchools) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="mt-1 text-2xl font-black text-blue-700 dark:text-blue-200">
              {summary.qualityDistribution['ดี']} <span className="text-xs font-bold text-blue-600">แห่ง</span>
            </div>
          </div>

          {/* พอใช้ */}
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-800 dark:text-amber-300">ระดับพอใช้</span>
              <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                {summary.totalSchools > 0 ? ((summary.qualityDistribution['พอใช้'] / summary.totalSchools) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="mt-1 text-2xl font-black text-amber-700 dark:text-amber-200">
              {summary.qualityDistribution['พอใช้']} <span className="text-xs font-bold text-amber-600">แห่ง</span>
            </div>
          </div>

          {/* ปรับปรุง */}
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-rose-800 dark:text-rose-300">ระดับปรับปรุง</span>
              <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                {summary.totalSchools > 0 ? ((summary.qualityDistribution['ปรับปรุง'] / summary.totalSchools) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="mt-1 text-2xl font-black text-rose-700 dark:text-rose-200">
              {summary.qualityDistribution['ปรับปรุง']} <span className="text-xs font-bold text-rose-600">แห่ง</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation View Tabs */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs md:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>กราฟวิเคราะห์รายอำเภอ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('table')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs md:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'table'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>ตารางผลคะแนนรายโรงเรียน ({filteredRecords.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ranking')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs md:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'ranking'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Award className="h-4 w-4" />
            <span>อันดับคะแนนสูงสุด (Top 10)</span>
          </button>
        </div>

        {/* Global Year Select & Delete Button */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 hidden sm:inline">ปีการศึกษา:</span>
          <select
            id="select-academic-year"
            value={academicYear || '2567'}
            onChange={(e) => {
              if (e.target.value === '__add_new__') {
                setShowAddYearModal(true);
              } else if (e.target.value === '__delete_year__') {
                setDeleteTargetYear(academicYear || '2567');
                setShowDeleteYearModal(true);
              } else {
                setAcademicYear(e.target.value);
                setUploadYear(e.target.value);
              }
            }}
            className="px-3 py-1.5 rounded-xl border-2 border-[#33272A] dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-black text-slate-800 dark:text-slate-100 shadow-sm outline-none cursor-pointer"
          >
            {allAvailableYears.map(y => (
              <option key={y} value={y}>พ.ศ. {y}</option>
            ))}
            <option value="__add_new__" className="text-rose-600 font-bold">
              ➕ เพิ่มปีการศึกษา...
            </option>
            {isSuperAdmin && (
              <option value="__delete_year__" className="text-red-600 font-bold">
                🗑️ ลบข้อมูลปีการศึกษา...
              </option>
            )}
          </select>
        </div>
      </div>

      {/* Empty State Banner when no records exist for this year */}
      {filteredRecords.length === 0 && !isLoading && (
        <div className="rounded-3xl border-2 border-dashed border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/20 p-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-3xl bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-300">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
              ยังไม่มีข้อมูลผลการประเมิน {selectedTestType} สำหรับปีการศึกษา {academicYear || '2567'}
            </h3>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              ท่านสามารถนำเข้าไฟล์คะแนน (.xlsx / .csv) หรือเพิ่มข้อมูลรายโรงเรียนเพื่อเริ่มการวิเคราะห์สถิติของปีการศึกษานี้ได้ทันที
            </p>
          </div>
          {isSuperAdmin && (
            <div className="flex flex-wrap justify-center items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setUploadYear(academicYear || '2567');
                  setUploadTestType(selectedTestType);
                  setShowUploadModal(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-[2px_2px_0px_#33272A] cursor-pointer"
              >
                <UploadCloud className="h-4 w-4" />
                <span>นำเข้าไฟล์คะแนนปี {academicYear}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingRecord({
                    id: '',
                    schoolId: '',
                    schoolName: '',
                    amphoe: 'เมืองแม่ฮ่องสอน',
                    mathScore: 0,
                    mathPercentage: 0,
                    thaiScore: 0,
                    thaiPercentage: 0,
                    totalScore: 0,
                    totalPercentage: 0,
                    mathQuality: 'พอใช้',
                    thaiQuality: 'พอใช้',
                    totalQuality: 'พอใช้',
                    academicYear: academicYear || '2567',
                    testType: selectedTestType || 'NT'
                  });
                  setShowEditModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-[#33272A] dark:border-slate-600 text-xs font-black text-slate-800 dark:text-slate-100 shadow-[2px_2px_0px_#33272A] cursor-pointer"
              >
                <Plus className="h-4 w-4 text-emerald-600" />
                <span>เพิ่มข้อมูลรายโรงเรียน</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteTargetYear(academicYear || '2567');
                  setShowDeleteYearModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-rose-300 dark:border-rose-800 text-xs font-black text-rose-700 dark:text-rose-300 shadow-[2px_2px_0px_#33272A] cursor-pointer"
              >
                <Trash2 className="h-4 w-4 text-rose-600" />
                <span>ลบหรือจัดการปีการศึกษานี้</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: OVERVIEW & CHARTS */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Chart 1: Bar Chart comparing 4 Amphoes */}
          <div className="lg:col-span-8 rounded-3xl border-2 border-[#33272A] dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-[3px_3px_0px_#33272A] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  เปรียบเทียบคะแนนเฉลี่ยแยกตามอำเภอ (4 อำเภอ) • {selectedTestType}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  คะแนนเฉลี่ย{subject1Short}, {subject2Short} และรวม 2 ด้าน
                </p>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.amphoeBreakdown} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="amphoe" tick={{ fontSize: 12, fontWeight: 700 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '16px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: 'bold' }} />
                  <Bar dataKey="avgMath" name={subject1Short} fill="#3B82F6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="avgThai" name={subject2Short} fill="#10B981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="avgTotal" name="รวม 2 ด้าน" fill="#F43F5E" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2 / Breakdown by District Table */}
          <div className="lg:col-span-4 rounded-3xl border-2 border-[#33272A] dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-[3px_3px_0px_#33272A] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]">
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-4">
              สรุปคะแนนเฉลี่ยรายอำเภอ ({selectedTestType})
            </h3>

            <div className="space-y-3">
              {summary.amphoeBreakdown.map((amp) => (
                <div
                  key={amp.amphoe}
                  onClick={() => {
                    setSelectedAmphoe(amp.amphoe);
                    setActiveTab('table');
                  }}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-500 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-rose-50/30 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-rose-500" />
                      {amp.amphoe}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {amp.count} สถานศึกษา
                    </span>
                  </div>

                  <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white dark:bg-slate-900 p-1.5 rounded-xl">
                      <div className="text-[10px] font-bold text-blue-600 truncate">{subject1Badge}</div>
                      <div className="text-xs font-black text-slate-800 dark:text-slate-200">{amp.avgMath}</div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-1.5 rounded-xl">
                      <div className="text-[10px] font-bold text-emerald-600 truncate">{subject2Badge}</div>
                      <div className="text-xs font-black text-slate-800 dark:text-slate-200">{amp.avgThai}</div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-rose-200 dark:border-rose-900">
                      <div className="text-[10px] font-bold text-rose-600">รวม</div>
                      <div className="text-xs font-black text-rose-600 dark:text-rose-400">{amp.avgTotal}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DATA TABLE VIEW */}
      {activeTab === 'table' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="rounded-3xl border-2 border-[#33272A] dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-[3px_3px_0px_#33272A] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              {/* Search Box */}
              <div className="lg:col-span-5 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อโรงเรียน, รหัสโรงเรียน หรืออำเภอ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-2xl border-2 border-[#33272A] dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white outline-none"
                />
              </div>

              {/* Amphoe Filter */}
              <div className="lg:col-span-3">
                <select
                  value={selectedAmphoe}
                  onChange={(e) => setSelectedAmphoe(e.target.value)}
                  className="w-full px-3 py-2 rounded-2xl border-2 border-[#33272A] dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                >
                  <option value="all">📍 ทุกอำเภอ (4 อำเภอ)</option>
                  <option value="เมืองแม่ฮ่องสอน">อำเภอเมืองแม่ฮ่องสอน</option>
                  <option value="ขุนยวม">อำเภอขุนยวม</option>
                  <option value="ปาย">อำเภอปาย</option>
                  <option value="ปางมะผ้า">อำเภอปางมะผ้า</option>
                </select>
              </div>

              {/* Quality Filter */}
              <div className="lg:col-span-2">
                <select
                  value={selectedQuality}
                  onChange={(e) => setSelectedQuality(e.target.value)}
                  className="w-full px-3 py-2 rounded-2xl border-2 border-[#33272A] dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                >
                  <option value="all">⭐ ทุกระดับคุณภาพ</option>
                  <option value="ดีมาก">ดีมาก</option>
                  <option value="ดี">ดี</option>
                  <option value="พอใช้">พอใช้</option>
                  <option value="ปรับปรุง">ปรับปรุง</option>
                </select>
              </div>

              {/* Sort Order */}
              <div className="lg:col-span-2">
                <select
                  value={`${sortField}_${sortAsc ? 'asc' : 'desc'}`}
                  onChange={(e) => {
                    const [field, dir] = e.target.value.split('_');
                    setSortField(field as any);
                    setSortAsc(dir === 'asc');
                  }}
                  className="w-full px-3 py-2 rounded-2xl border-2 border-[#33272A] dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                >
                  <option value="order_asc">ลำดับต้นฉบับ (1 - {records.length})</option>
                  <option value="total_desc">คะแนนรวม (มากไปน้อย)</option>
                  <option value="total_asc">คะแนนรวม (น้อยไปมาก)</option>
                  <option value="math_desc">{subject1Short} (มากไปน้อย)</option>
                  <option value="thai_desc">{subject2Short} (มากไปน้อย)</option>
                  <option value="name_asc">ชื่อสถานศึกษา (ก-ฮ)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-3xl border-2 border-[#33272A] dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-[4px_4px_0px_#33272A] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  {/* Row 1: Group Headers */}
                  <tr className="bg-slate-100 dark:bg-slate-800 text-[11px] font-black text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <th rowSpan={2} className="py-3 px-3 text-center border-r border-slate-200 dark:border-slate-700 w-12">ลำดับ</th>
                    <th rowSpan={2} className="py-3 px-3 text-center border-r border-slate-200 dark:border-slate-700 w-28">รหัสโรงเรียน</th>
                    <th rowSpan={2} className="py-3 px-4 border-r border-slate-200 dark:border-slate-700 min-w-[200px]">ชื่อสถานศึกษา</th>
                    <th rowSpan={2} className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 w-28">อำเภอ/เขต</th>
                    <th colSpan={2} className="py-2 px-3 text-center border-r border-slate-200 dark:border-slate-700 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-300">
                      {subject1Title}
                    </th>
                    <th colSpan={2} className="py-2 px-3 text-center border-r border-slate-200 dark:border-slate-700 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300">
                      {subject2Title}
                    </th>
                    <th colSpan={2} className="py-2 px-3 text-center border-r border-slate-200 dark:border-slate-700 bg-rose-50/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-300">
                      รวม 2 ด้าน
                    </th>
                    <th colSpan={3} className="py-2 px-3 text-center border-r border-slate-200 dark:border-slate-700 bg-purple-50/50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-300">
                      ระดับคุณภาพของแต่ละด้าน
                    </th>
                    {isSuperAdmin && <th rowSpan={2} className="py-3 px-3 text-center w-20">จัดการ</th>}
                  </tr>
                  {/* Row 2: Sub Headers */}
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-extrabold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-700">คะแนน</th>
                    <th className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-700">ร้อยละ</th>
                    <th className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-700">คะแนน</th>
                    <th className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-700">ร้อยละ</th>
                    <th className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-700 font-black text-rose-600">คะแนน</th>
                    <th className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-700 font-black text-rose-600">ร้อยละ</th>
                    <th className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-700">{subject1Short}</th>
                    <th className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-700">{subject2Short}</th>
                    <th className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-700 font-black">รวม 2 ด้าน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {isLoading ? (
                    <tr>
                      <td colSpan={14} className="py-12 text-center text-slate-400 font-bold">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-rose-500 mb-2" />
                        กำลังโหลดข้อมูลผลสัมฤทธิ์ทางการเรียน...
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="py-12 text-center text-slate-400 font-bold">
                        ไม่พบข้อมูลผลสัมฤทธิ์ {selectedTestType} ตามเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((item, idx) => (
                      <tr
                        key={item.id || idx}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                          item.schoolName.includes('เขตพื้นที่การศึกษา')
                            ? 'bg-amber-50/60 dark:bg-amber-950/20 font-black'
                            : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px] border-r border-slate-100 dark:border-slate-800">
                          {item.order || idx + 1}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                          {item.schoolId && !item.schoolId.startsWith('NT_') && !item.schoolId.startsWith('RT_') && !item.schoolId.startsWith('SCH_') ? (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold">{item.schoolId}</span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => {
                              if (item.schoolId && item.schoolId.length === 8) {
                                onSelectSchool(item.schoolId);
                              } else {
                                setDetailModalRecord(item);
                              }
                            }}
                            className="text-left hover:text-rose-600 dark:hover:text-rose-400 hover:underline cursor-pointer flex items-center gap-2"
                          >
                            {item.schoolId && !item.schoolId.startsWith('NT_') && !item.schoolId.startsWith('RT_') && (
                              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold shrink-0">
                                {item.schoolId}
                              </span>
                            )}
                            <span>{item.schoolName}</span>
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                          {item.amphoe}
                        </td>

                        {/* Subject 1 */}
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                          {item.mathScore.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-black text-blue-600 dark:text-blue-400 border-r border-slate-100 dark:border-slate-800">
                          {item.mathPercentage.toFixed(2)}
                        </td>

                        {/* Subject 2 */}
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                          {item.thaiScore.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-black text-emerald-600 dark:text-emerald-400 border-r border-slate-100 dark:border-slate-800">
                          {item.thaiPercentage.toFixed(2)}
                        </td>

                        {/* รวม 2 ด้าน */}
                        <td className="py-2.5 px-2 text-center font-mono font-black text-rose-600 dark:text-rose-400 border-r border-slate-100 dark:border-slate-800 bg-rose-50/20">
                          {item.totalScore.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-black text-rose-600 dark:text-rose-400 border-r border-slate-100 dark:border-slate-800 bg-rose-50/20">
                          {item.totalPercentage.toFixed(2)}
                        </td>

                        {/* ระดับคุณภาพ */}
                        <td className="py-2.5 px-2 text-center border-r border-slate-100 dark:border-slate-800">
                          {renderQualityBadge(item.mathQuality || determineQualityLevel(item.mathPercentage))}
                        </td>
                        <td className="py-2.5 px-2 text-center border-r border-slate-100 dark:border-slate-800">
                          {renderQualityBadge(item.thaiQuality || determineQualityLevel(item.thaiPercentage))}
                        </td>
                        <td className="py-2.5 px-2 text-center border-r border-slate-100 dark:border-slate-800 font-bold">
                          {renderQualityBadge(item.totalQuality || determineQualityLevel(item.totalPercentage))}
                        </td>

                        {/* Admin Action */}
                        {isSuperAdmin && (
                          <td className="py-2.5 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRecord(item);
                                  setShowEditModal(true);
                                }}
                                className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="แก้ไข"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRecord(item.id, item.schoolName)}
                                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="ลบ"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-bold gap-2">
              <span>แสดงทั้งหมด {filteredRecords.length} สถานศึกษา ({selectedTestType})</span>
              <div className="flex items-center gap-3">
                <span>เฉลี่ย{subject1Badge}: <strong className="text-blue-600">{summary.avgMath.toFixed(2)}</strong></span>
                <span>•</span>
                <span>เฉลี่ย{subject2Badge}: <strong className="text-emerald-600">{summary.avgThai.toFixed(2)}</strong></span>
                <span>•</span>
                <span>เฉลี่ยรวม: <strong className="text-rose-600">{summary.avgTotal.toFixed(2)}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RANKING & LEADERBOARD */}
      {activeTab === 'ranking' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top 10 High Achievers */}
          <div className="rounded-3xl border-2 border-[#33272A] dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-[3px_3px_0px_#33272A] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  อันดับ 1 - 10 ผลสัมฤทธิ์สูงสุด (Top 10)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">สถานศึกษาที่มีคะแนนรวมเฉลี่ย 2 ด้านสูงสุด</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {rankingSchools.top10.map((school, idx) => (
                <div
                  key={school.id || idx}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-amber-400 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-7 w-7 rounded-xl flex items-center justify-center font-black text-xs ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-900 shadow-sm'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-800 shadow-sm'
                          : idx === 2
                          ? 'bg-amber-700/80 text-white shadow-sm'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        {school.schoolId && (
                          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 font-bold shrink-0">
                            {school.schoolId}
                          </span>
                        )}
                        <span>{school.schoolName}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">{school.amphoe}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                      {school.totalPercentage.toFixed(2)}%
                    </div>
                    {renderQualityBadge(school.totalQuality)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom 10 Schools needing Focus/Support */}
          <div className="rounded-3xl border-2 border-[#33272A] dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-[3px_3px_0px_#33272A] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  สถานศึกษาที่ควรได้รับการส่งเสริมเร่งด่วน
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">สำหรับศึกษานิเทศก์และผู้บริหารใช้วางแผนยกระดับคุณภาพ</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {rankingSchools.bottom10.map((school, idx) => (
                <div
                  key={school.id || idx}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-rose-400 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-7 w-7 rounded-xl flex items-center justify-center font-bold text-xs bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        {school.schoolId && (
                          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 font-bold shrink-0">
                            {school.schoolId}
                          </span>
                        )}
                        <span>{school.schoolName}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">{school.amphoe}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-black text-sm text-rose-600 dark:text-rose-400">
                      {school.totalPercentage.toFixed(2)}%
                    </div>
                    {renderQualityBadge(school.totalQuality)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: UPLOAD FILE */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl border-2 border-[#33272A] bg-white dark:bg-slate-900 p-6 md:p-8 shadow-[6px_6px_0px_#33272A] space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600">
                  <FileUp className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    นำเข้าไฟล์ผลสัมฤทธิ์ทางการเรียน
                  </h3>
                  <p className="text-xs text-slate-500">รองรับไฟล์ Excel (.xlsx, .xls) และ CSV ที่มีหัวตาราง สพฐ.</p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Target Database Info Banner */}
            <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-2 ${
              isSupabaseConfigured()
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
            }`}>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 shrink-0" />
                <span>
                  <strong className="font-black">เป้าหมายฐานข้อมูล: </strong>
                  {isSupabaseConfigured() ? (
                    <span>Supabase PostgreSQL (แยกตารางตรงประเภท: <code className="bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded font-mono font-bold">{uploadTestType === 'RT' ? 'rt_assessments' : 'nt_assessments'}</code>)</span>
                  ) : (
                    <span>Firebase Firestore (ยังไม่ได้ตั้งค่าเชื่อมต่อ Supabase)</span>
                  )}
                </span>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/80 dark:bg-slate-800/80 border border-current">
                {isSupabaseConfigured() ? 'SUPABASE ACTIVE' : 'FIRESTORE ACTIVE'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">ปีการศึกษา</label>
                  {!isCustomUploadYear && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomUploadYear(true);
                        setCustomUploadYearInput('');
                      }}
                      className="text-[11px] font-black text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      <span>เพิ่มปีการศึกษา</span>
                    </button>
                  )}
                </div>

                {isCustomUploadYear ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="ระบุปี พ.ศ. เช่น 2569"
                      maxLength={4}
                      autoFocus
                      value={customUploadYearInput}
                      onChange={(e) => setCustomUploadYearInput(e.target.value.replace(/\D/g, ''))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (handleAddNewAcademicYear(customUploadYearInput, false)) {
                            setUploadYear(customUploadYearInput);
                            setIsCustomUploadYear(false);
                            reparseCurrentFile(customUploadYearInput, uploadTestType, uploadTestTitle);
                          }
                        }
                      }}
                      className="flex-1 px-3 py-2 rounded-xl border-2 border-rose-500 bg-white dark:bg-slate-800 text-xs font-bold font-mono outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (handleAddNewAcademicYear(customUploadYearInput, false)) {
                          setUploadYear(customUploadYearInput);
                          setIsCustomUploadYear(false);
                          reparseCurrentFile(customUploadYearInput, uploadTestType, uploadTestTitle);
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-[1px_1px_0px_#33272A] cursor-pointer"
                    >
                      ตกลง
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCustomUploadYear(false)}
                      className="p-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <select
                    value={uploadYear}
                    onChange={(e) => {
                      if (e.target.value === '__add_new__') {
                        setIsCustomUploadYear(true);
                        setCustomUploadYearInput('');
                      } else {
                        setUploadYear(e.target.value);
                        reparseCurrentFile(e.target.value, uploadTestType, uploadTestTitle);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#33272A] dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-xs font-bold cursor-pointer"
                  >
                    {allAvailableYears.map((y) => (
                      <option key={y} value={y}>
                        ปีการศึกษา {y}
                      </option>
                    ))}
                    <option value="__add_new__" className="text-rose-600 font-bold">
                      ➕ เพิ่มปีการศึกษาอื่น...
                    </option>
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ประเภทการประเมิน</label>
                <select
                  value={uploadTestType}
                  onChange={(e) => {
                    setUploadTestType(e.target.value);
                    if (e.target.value === 'NT') setUploadTestTitle('การประเมินคุณภาพผู้เรียน (NT) ชั้นประถมศึกษาปีที่ 3');
                    else if (e.target.value === 'RT') setUploadTestTitle('การประเมินความสามารถด้านการอ่าน (RT) ชั้นประถมศึกษาปีที่ 1');
                    else if (e.target.value === 'ONET') setUploadTestTitle('การทดสอบทางการศึกษาระดับชาติขั้นพื้นฐาน (O-NET)');
                  }}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#33272A] dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                >
                  <option value="NT">NT (ประเมินคุณภาพผู้เรียน ป.3)</option>
                  <option value="RT">RT (ประเมินการอ่าน ป.1)</option>
                  <option value="ONET">O-NET (ป.6 / ม.3)</option>
                </select>
              </div>
            </div>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-rose-300 dark:border-rose-700 rounded-3xl p-8 text-center bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/80 transition-all cursor-pointer"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <UploadCloud className="h-10 w-10 text-rose-500 mx-auto mb-2 animate-bounce" />
              <div className="text-sm font-black text-slate-800 dark:text-slate-100">
                {uploadFile ? uploadFile.name : 'คลิกเพื่อเลือกไฟล์ผลคะแนน (.csv หรือ .xlsx)'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                ระบบจะตรวจสอบและจับคู่รหัสโรงเรียน 4 อำเภอใน สพป.แม่ฮ่องสอน เขต 1 ให้อัตโนมัติ
              </p>
            </div>

            {/* Parsing / Upload Progress Bar */}
            {(isParsingFile || isSaving || (uploadProgress > 0 && uploadProgress < 100)) && (
              <div className="p-4 rounded-2xl border-2 border-[#33272A] bg-rose-50/70 dark:bg-slate-800/80 space-y-2.5 shadow-[2px_2px_0px_#33272A]">
                <div className="flex items-center justify-between text-xs font-black text-slate-800 dark:text-slate-100">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-rose-600" />
                    <span>{uploadProgressStage || (isParsingFile ? 'กำลังอ่านและตรวจสอบไฟล์...' : 'กำลังบันทึกข้อมูล...')}</span>
                  </span>
                  <span className="font-mono text-sm font-black text-rose-600">{uploadProgress}%</span>
                </div>

                {/* Progress track */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-slate-600">
                  <div
                    className="bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.max(6, Math.min(100, uploadProgress))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>{isSaving ? 'กำลังบันทึก Supabase & Firestore' : 'การประมวลผลไฟล์'}</span>
                  <span>{uploadFile?.name || ''}</span>
                </div>
              </div>
            )}

            {uploadErrors.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-rose-100 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold space-y-1">
                {uploadErrors.map((err, i) => (
                  <div key={i}>• {err}</div>
                ))}
              </div>
            )}

            {parsedUploadResults.length > 0 && !isSaving && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-700 dark:text-emerald-400">
                    ✓ พบข้อมูลพร้อมนำเข้า {parsedUploadResults.length} สถานศึกษา ({uploadTestType} ปีการศึกษา {uploadYear})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    ตาราง: academic_{uploadTestType.toLowerCase()}_assessments
                  </span>
                </div>
                <div className="max-h-44 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 text-[11px] p-2 bg-slate-50 dark:bg-slate-800">
                  {parsedUploadResults.slice(0, 10).map((r, i) => (
                    <div key={i} className="py-1.5 px-1 flex items-center justify-between">
                      <span className="font-bold truncate max-w-[240px]">
                        {r.order}. {r.schoolId && <span className="font-mono text-slate-500 font-bold mr-1">{r.schoolId}</span>}{r.schoolName} ({r.amphoe})
                      </span>
                      <span className="font-mono text-rose-600 font-bold whitespace-nowrap">
                        {uploadTestType === 'RT' ? `อ่าน: ${r.mathPercentage}% / รู้เรื่อง: ${r.thaiPercentage}%` : `คณิต: ${r.mathPercentage}% / ไทย: ${r.thaiPercentage}%`} | รวม: {r.totalScore}%
                      </span>
                    </div>
                  ))}
                  {parsedUploadResults.length > 10 && (
                    <div className="text-center text-slate-400 py-1 font-bold">
                      ... และอีก {parsedUploadResults.length - 10} รายการ
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modal Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2.5 rounded-2xl border-2 border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={parsedUploadResults.length === 0 || isSaving}
                onClick={handleConfirmUpload}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-[2px_2px_0px_#33272A] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>กำลังบันทึกลงระบบ...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>บันทึกข้อมูล {parsedUploadResults.length} รายการ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT / ADD RECORD */}
      {showEditModal && editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <form onSubmit={handleSaveSingleRecord} className="w-full max-w-lg rounded-3xl border-2 border-[#33272A] bg-white dark:bg-slate-900 p-6 md:p-8 shadow-[6px_6px_0px_#33272A] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {editingRecord.id ? `แก้ไขข้อมูลผลสัมฤทธิ์ (${editingRecord.testType || selectedTestType})` : 'เพิ่มข้อมูลผลสัมฤทธิ์รายโรงเรียน'}
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ประเภทการประเมิน</label>
                <select
                  value={editingRecord.testType || selectedTestType || 'NT'}
                  onChange={(e) => setEditingRecord({ ...editingRecord, testType: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#33272A] dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                >
                  <option value="NT">NT (ประเมินคุณภาพ ป.3)</option>
                  <option value="RT">RT (ประเมินการอ่าน ป.1)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ปีการศึกษา</label>
                <input
                  type="text"
                  value={editingRecord.academicYear || academicYear || '2567'}
                  onChange={(e) => setEditingRecord({ ...editingRecord, academicYear: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#33272A] dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-xs font-bold font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ชื่อโรงเรียน</label>
              <input
                type="text"
                required
                value={editingRecord.schoolName}
                onChange={(e) => setEditingRecord({ ...editingRecord, schoolName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border-2 border-[#33272A] dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                placeholder="เช่น โรงเรียนบ้านขุนยวม"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">รหัสโรงเรียน (8 หลัก)</label>
                <input
                  type="text"
                  value={editingRecord.schoolId}
                  onChange={(e) => setEditingRecord({ ...editingRecord, schoolId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#33272A] dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-xs font-bold font-mono"
                  placeholder="เช่น 58010057"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">อำเภอ</label>
                <select
                  value={editingRecord.amphoe}
                  onChange={(e) => setEditingRecord({ ...editingRecord, amphoe: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#33272A] dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                >
                  <option value="เมืองแม่ฮ่องสอน">เมืองแม่ฮ่องสอน</option>
                  <option value="ขุนยวม">ขุนยวม</option>
                  <option value="ปาย">ปาย</option>
                  <option value="ปางมะผ้า">ปางมะผ้า</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {editingRecord.testType === 'RT' ? 'คะแนนการอ่านออกเสียง (%)' : 'คะแนนคณิตศาสตร์ (%)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  value={editingRecord.mathScore}
                  onChange={(e) => setEditingRecord({ ...editingRecord, mathScore: parseFloat(e.target.value) || 0, mathPercentage: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#33272A] dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-xs font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {editingRecord.testType === 'RT' ? 'คะแนนการอ่านรู้เรื่อง (%)' : 'คะแนนภาษาไทย (%)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  value={editingRecord.thaiScore}
                  onChange={(e) => setEditingRecord({ ...editingRecord, thaiScore: parseFloat(e.target.value) || 0, thaiPercentage: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#33272A] dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-xs font-bold font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-xl border-2 border-slate-300 dark:border-slate-600 text-xs font-bold"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-[2px_2px_0px_#33272A]"
              >
                {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: DETAIL POPUP */}
      {detailModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl border-2 border-[#33272A] bg-white dark:bg-slate-900 p-6 md:p-8 shadow-[6px_6px_0px_#33272A] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  {detailModalRecord.schoolId && !detailModalRecord.schoolId.startsWith('NT_') && !detailModalRecord.schoolId.startsWith('RT_') && (
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold">
                      {detailModalRecord.schoolId}
                    </span>
                  )}
                  <span>{detailModalRecord.schoolName}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {detailModalRecord.testType || selectedTestType} • อำเภอ{detailModalRecord.amphoe} • ปีการศึกษา {detailModalRecord.academicYear}
                </p>
              </div>
              <button
                onClick={() => setDetailModalRecord(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 pt-2">
              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-blue-900 dark:text-blue-300">
                    {detailModalRecord.testType === 'RT' ? 'ด้านการอ่านออกเสียง' : 'ด้านคณิตศาสตร์'}
                  </div>
                  <div className="text-xs text-blue-700">ระดับ: {detailModalRecord.mathQuality}</div>
                </div>
                <div className="text-xl font-black text-blue-700 dark:text-blue-300">{detailModalRecord.mathPercentage.toFixed(2)}%</div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                    {detailModalRecord.testType === 'RT' ? 'ด้านการอ่านรู้เรื่อง' : 'ด้านภาษาไทย'}
                  </div>
                  <div className="text-xs text-emerald-700">ระดับ: {detailModalRecord.thaiQuality}</div>
                </div>
                <div className="text-xl font-black text-emerald-700 dark:text-emerald-300">{detailModalRecord.thaiPercentage.toFixed(2)}%</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-rose-900 dark:text-rose-300">รวม 2 ด้าน</div>
                  <div className="text-xs text-rose-700">ระดับ: {detailModalRecord.totalQuality}</div>
                </div>
                <div className="text-2xl font-black text-rose-700 dark:text-rose-300">{detailModalRecord.totalPercentage.toFixed(2)}%</div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setDetailModalRecord(null)}
                className="w-full py-2.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW ACADEMIC YEAR */}
      {showAddYearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border-2 border-[#33272A] bg-white dark:bg-slate-900 p-6 md:p-7 shadow-[6px_6px_0px_#33272A] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">เพิ่มปีการศึกษาใหม่</h3>
                  <p className="text-xs text-slate-500">กำหนดปีการศึกษาสำหรับระบบรายงานผลสัมฤทธิ์</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddYearModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  ระบุปีการศึกษา (พ.ศ. 4 หลัก)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  autoFocus
                  placeholder="เช่น 2568 หรือ 2569"
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (handleAddNewAcademicYear(newYearInput, true)) {
                        setShowAddYearModal(false);
                        setNewYearInput('');
                      }
                    }
                  }}
                  className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#33272A] dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm font-black font-mono text-slate-900 dark:text-white outline-none focus:border-rose-500"
                />
              </div>

              {/* Quick Select Buttons for Common Upcoming/Past Years */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1.5">ปีการศึกษาที่แนะนำ:</label>
                <div className="flex flex-wrap gap-2">
                  {['2569', '2568', '2567', '2566', '2565'].map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setNewYearInput(yr)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        newYearInput === yr
                          ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      พ.ศ. {yr}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddYearModal(false)}
                className="px-4 py-2.5 rounded-2xl border-2 border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (handleAddNewAcademicYear(newYearInput, true)) {
                    setShowAddYearModal(false);
                    setNewYearInput('');
                  }
                }}
                disabled={!newYearInput || newYearInput.length !== 4}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-[2px_2px_0px_#33272A] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>บันทึกและเลือกใช้นี้</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE ACADEMIC YEAR DATA */}
      {showDeleteYearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border-2 border-[#33272A] dark:border-rose-900 bg-white dark:bg-slate-900 p-6 md:p-7 shadow-[6px_6px_0px_#33272A] space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 border border-rose-200 dark:border-rose-800 shrink-0">
                  <Trash2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    ลบข้อมูลปีการศึกษา
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    เลือกลบข้อมูลผลคะแนนหรือนำปีการศึกษาออกจากระบบ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteYearModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Target Year Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                เลือกปีการศึกษาที่ต้องการลบ:
              </label>
              <select
                value={deleteTargetYear}
                onChange={(e) => setDeleteTargetYear(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#33272A] dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm font-black text-slate-900 dark:text-white outline-none focus:border-rose-500 cursor-pointer"
              >
                {allAvailableYears.map((y) => (
                  <option key={y} value={y}>
                    ปีการศึกษา {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Dataset Statistics Card */}
            {(() => {
              const targetRecords = records.filter(r => r.academicYear === deleteTargetYear);
              const targetNT = targetRecords.filter(r => r.testType === 'NT').length;
              const targetRT = targetRecords.filter(r => r.testType === 'RT').length;
              const totalCount = targetRecords.length;

              return (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>ข้อมูลที่มีอยู่ในปี {deleteTargetYear}:</span>
                    <span className="font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[11px]">
                      รวมทั้งหมด {totalCount} รายการ
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">NT (ป.3):</span>
                      <span className="font-black text-rose-600">{targetNT} โรงเรียน</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">RT (ป.1):</span>
                      <span className="font-black text-indigo-600">{targetRT} โรงเรียน</span>
                    </div>
                  </div>

                  {/* Delete Scope Selection */}
                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                      ขอบเขตการลบข้อมูล:
                    </label>

                    <label className={`flex items-start gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                      deleteScope === 'test_type'
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}>
                      <input
                        type="radio"
                        name="deleteScope"
                        checked={deleteScope === 'test_type'}
                        onChange={() => setDeleteScope('test_type')}
                        className="mt-0.5 text-rose-600 focus:ring-rose-500"
                      />
                      <div className="text-xs">
                        <div className="font-black text-slate-800 dark:text-slate-100">
                          ลบเฉพาะคะแนน <span className="text-rose-600">{selectedTestType}</span> ในปี {deleteTargetYear}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                          ลบข้อมูลเฉพาะแบบทดสอบ {selectedTestType} ({selectedTestType === 'RT' ? targetRT : targetNT} รายการ) โดยคงข้อมูลแบบทดสอบอื่นไว้
                        </div>
                      </div>
                    </label>

                    <label className={`flex items-start gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                      deleteScope === 'all_assessments'
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}>
                      <input
                        type="radio"
                        name="deleteScope"
                        checked={deleteScope === 'all_assessments'}
                        onChange={() => setDeleteScope('all_assessments')}
                        className="mt-0.5 text-rose-600 focus:ring-rose-500"
                      />
                      <div className="text-xs">
                        <div className="font-black text-slate-800 dark:text-slate-100">
                          ลบข้อมูลผลคะแนนทั้งหมด (ทั้ง NT และ RT) ในปี {deleteTargetYear}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                          ลบผลคะแนนสถานศึกษาทั้งหมดของปี {deleteTargetYear} รวม {totalCount} รายการ
                        </div>
                      </div>
                    </label>

                    <label className={`flex items-start gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                      deleteScope === 'full_year'
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}>
                      <input
                        type="radio"
                        name="deleteScope"
                        checked={deleteScope === 'full_year'}
                        onChange={() => setDeleteScope('full_year')}
                        className="mt-0.5 text-rose-600 focus:ring-rose-500"
                      />
                      <div className="text-xs">
                        <div className="font-black text-slate-800 dark:text-slate-100">
                          ลบข้อมูลทั้งหมด และลบปีการศึกษา {deleteTargetYear} ออกจากระบบ
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                          ลบผลคะแนนทั้งหมด พร้อมนำปีการศึกษานี้ออกจากรายการปีที่เลือกได้
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              );
            })()}

            {/* Warning Text */}
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>คำเตือน:</strong> การลบนี้จะมีผลโดยตรงต่อฐานข้อมูลหลัก และไม่สามารถกู้คืนได้ กรุณาตรวจสอบให้แน่ใจก่อนกดยืนยัน
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteYearModal(false)}
                disabled={isDeletingYear}
                className="px-4 py-2.5 rounded-2xl border-2 border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteYear}
                disabled={isDeletingYear}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-[2px_2px_0px_#33272A] disabled:opacity-50 cursor-pointer"
              >
                {isDeletingYear ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>กำลังลบข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>ยืนยันการลบข้อมูลปี {deleteTargetYear}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
