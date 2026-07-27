import { useState, useMemo, useEffect, ChangeEvent, FormEvent } from 'react';
import { School, StudentData, UserProfile, ClassroomItem, StudentGData } from '../types';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getSchoolSize, getSchoolSizeLabel, getAmphoeAndNetwork, SCHOOL_GROUPS_LIST } from '../utils/initialData';
import { generatePdfReport } from '../utils/exportPdf';
import { 
  ArrowLeft, Phone, MapPin, Building, Globe, Zap, 
  Users, GraduationCap, Grid, Edit2, Save, X, Upload, Image, AlertCircle, CheckCircle2, Loader2, TrendingUp,
  Database, Wifi, Cpu, Layers, Eye, RefreshCw, Trash2, Plus, Search, BookOpen, Sparkles, Navigation, Sun, FileText
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SchoolDetailViewProps {
  school: School;
  studentData: StudentData | null;
  allStudentData?: StudentData[];
  allStudentGData?: StudentGData[];
  onBack: () => void;
  userProfile: UserProfile | null;
  onRefreshData: () => Promise<void>;
  isDarkMode?: boolean;
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

export default function SchoolDetailView({
  school,
  studentData,
  allStudentData = [],
  allStudentGData = [],
  onBack,
  userProfile,
  onRefreshData,
  isDarkMode = false,
  academicYear,
  setAcademicYear,
  availableYears
}: SchoolDetailViewProps) {
  const isSuperAdmin = userProfile?.role === 'super_admin';
  const isSchoolAdmin = userProfile?.role === 'school_admin' && userProfile?.schoolId === school.id;
  const canEdit = isSuperAdmin || isSchoolAdmin;

  // กำหนดสไตล์กราฟตามโหมดมืด/สว่าง เพื่อความคมชัดในการอ่าน
  const chartStroke = isDarkMode ? '#FFF9F5' : '#33272A';
  const tooltipBg = isDarkMode ? '#1e1518' : '#FFF9F5';
  const tooltipBorder = isDarkMode ? '#FFD3B6' : '#33272A';
  const tooltipText = isDarkMode ? '#FFF9F5' : '#33272A';
  const tooltipShadow = isDarkMode ? '4px 4px 0px #FFD3B6' : '4px 4px 0px #33272A';

  // โหมดแก้ไข
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // สถานะความคืบหน้าการอัปโหลดรูปภาพ
  const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);
  const [imageUploadStatus, setImageUploadStatus] = useState<string>('');

  // ตรวจสอบสิทธิ์การเข้าถึงข้อมูลเฉพาะ (เบอร์โทรศัพท์ผู้บริหาร)
  const hasAdminAccess = useMemo(() => {
    if (!userProfile) return false;
    if (userProfile.role === 'super_admin') return true;
    if (userProfile.role === 'school_admin' && userProfile.schoolId === school.id) return true;
    return false;
  }, [userProfile, school.id]);

  // ฟอร์มข้อมูลแก้ไข
  const getInitialElectricity = (elec: any): 'has_electric' | 'solar' | 'hybrid' | 'none' => {
    if (typeof elec === 'boolean') {
      return elec ? 'has_electric' : 'solar';
    }
    if (elec === 'has_electric' || elec === 'solar' || elec === 'hybrid' || elec === 'none') {
      return elec;
    }
    return 'has_electric';
  };

  const [editName, setEditName] = useState(school.name);
  const [editNetworkGroup, setEditNetworkGroup] = useState(school.networkGroup || getAmphoeAndNetwork(school.id, school.name).networkGroup);
  const [editDirectorPhone, setEditDirectorPhone] = useState(school.directorPhone || '');
  const [editSchoolPhone, setEditSchoolPhone] = useState(school.schoolPhone || '');
  const [editInternetType, setEditInternetType] = useState<School['internetType']>(school.internetType || 'none');
  const [editElectricity, setEditElectricity] = useState<'has_electric' | 'solar' | 'hybrid' | 'none'>(getInitialElectricity(school.electricity));
  const [editSolarKw, setEditSolarKw] = useState<string>(school.solarKw || '');
  const [editHasSolarBattery, setEditHasSolarBattery] = useState<boolean>(!!school.hasSolarBattery);
  const [editSolarBatteryCapacity, setEditSolarBatteryCapacity] = useState<string>(school.solarBatteryCapacity || '');
  const [editStaffCount, setEditStaffCount] = useState(school.staffCount);
  const [editMajorsStr, setEditMajorsStr] = useState(school.majorSubjects ? school.majorSubjects.join(', ') : '');
  const [editMajorsWithStaff, setEditMajorsWithStaff] = useState<{ name: string; teachersCount: number }[]>([]);
  const [newMajorName, setNewMajorName] = useState('');
  const [newMajorCount, setNewMajorCount] = useState<number>(1);
  const [editImageUrl, setEditImageUrl] = useState(school.imageUrl || '');
  const [editLatitude, setEditLatitude] = useState(school.latitude || 19.3);
  const [editLongitude, setEditLongitude] = useState(school.longitude || 97.9);
  const [editSize, setEditSize] = useState<School['size']>(school.size || 'small');
  const [editIsExpansion, setEditIsExpansion] = useState(school.isExpansion);
  const [editLogoUrl, setEditLogoUrl] = useState(school.logoUrl || '');
  const [editDirectorImageUrl, setEditDirectorImageUrl] = useState(school.directorImageUrl || '');
  const [editSpecialHighlights, setEditSpecialHighlights] = useState(school.specialHighlights || '');
  const [adminViewType, setAdminViewType] = useState<'logo' | 'director'>('logo');
  const [activeImageTab, setActiveImageTab] = useState<'cover' | 'logo' | 'director'>('cover');
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);

  // อัปเดตฟอร์มเมื่อเปลี่ยนโรงเรียน (เช่น ได้ข้อมูลใหม่จากการ Refresh)
  useEffect(() => {
    setEditName(school.name);
    setEditNetworkGroup(school.networkGroup || getAmphoeAndNetwork(school.id, school.name).networkGroup);
    setEditDirectorPhone(school.directorPhone || '');
    setEditSchoolPhone(school.schoolPhone || '');
    setEditInternetType(school.internetType || 'none');
    setEditElectricity(getInitialElectricity(school.electricity));
    setEditSolarKw(school.solarKw || '');
    setEditHasSolarBattery(!!school.hasSolarBattery);
    setEditSolarBatteryCapacity(school.solarBatteryCapacity || '');
    setEditStaffCount(school.staffCount);
    setEditMajorsStr(school.majorSubjects ? school.majorSubjects.join(', ') : '');
    setEditImageUrl(school.imageUrl || '');
    setEditLogoUrl(school.logoUrl || '');
    setEditDirectorImageUrl(school.directorImageUrl || '');
    setEditSpecialHighlights(school.specialHighlights || '');
    setEditLatitude(school.latitude || 19.3);
    setEditLongitude(school.longitude || 97.9);
    setEditSize(school.size || 'small');
    setEditIsExpansion(school.isExpansion);

    // วิชาเอกพร้อมจำนวนครู
    if (school.majorSubjectsWithStaff && school.majorSubjectsWithStaff.length > 0) {
      setEditMajorsWithStaff(school.majorSubjectsWithStaff);
    } else if (school.majorSubjects && school.majorSubjects.length > 0) {
      setEditMajorsWithStaff(school.majorSubjects.map(m => ({ name: m, teachersCount: 1 })));
    } else {
      setEditMajorsWithStaff([]);
    }

    setClassrooms(school.classrooms || []);
  }, [school]);

  // สถานะข้อมูลห้องเรียน / ชั้นเรียน / โรงเรียนสาขาห่างไกล
  const [classrooms, setClassrooms] = useState<ClassroomItem[]>(school.classrooms || []);
  const [isClassroomModalOpen, setIsClassroomModalOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<ClassroomItem | null>(null);
  const [classroomSearch, setClassroomSearch] = useState('');
  const [viewingBranchDetail, setViewingBranchDetail] = useState<ClassroomItem | null>(null);

  // ฟอร์มข้อมูลห้องเรียนย่อยในพื้นที่ห่างไกล
  const [cIsRemoteBranch, setCIsRemoteBranch] = useState(false);
  const [cName, setCName] = useState('');
  const [cGradeLevel, setCGradeLevel] = useState('อ.1 - ป.6');
  const [cStudentCount, setCStudentCount] = useState('');
  const [cMaleCount, setCMaleCount] = useState('');
  const [cFemaleCount, setCFemaleCount] = useState('');
  const [cStaffCount, setCStaffCount] = useState('');
  const [cTeacherName, setCTeacherName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cElectricity, setCElectricity] = useState<'has_electric' | 'solar' | 'hybrid' | 'none'>('has_electric');
  const [cSolarKw, setCSolarKw] = useState('');
  const [cHasSolarBattery, setCHasSolarBattery] = useState(false);
  const [cSolarBatteryCapacity, setCSolarBatteryCapacity] = useState('');
  const [cInternetType, setCInternetType] = useState<'fiber' | 'satellite' | 'sim' | 'none'>('fiber');
  const [cDistanceFromMainSchool, setCDistanceFromMainSchool] = useState('');
  const [cLatitude, setCLatitude] = useState('');
  const [cLongitude, setCLongitude] = useState('');
  const [cNotes, setCNotes] = useState('');
  const [cGradesBreakdown, setCGradesBreakdown] = useState<{ [gradeKey: string]: { male: number; female: number; total: number } }>({});
  const [modalActiveTab, setModalActiveTab] = useState<'basic' | 'students'>('basic');
  const [isSavingClassroom, setIsSavingClassroom] = useState(false);

  // คำนวณสรุปสถิติแยกต่างหากระหว่าง "ข้อมูลโรงเรียนหลัก" vs "ข้อมูลห้องเรียนย่อย" vs "รวมทั้งสิ้น"
  const remoteBranchStats = useMemo(() => {
    const branches = classrooms.filter(c => c.isRemoteBranch);
    const standardRooms = classrooms.filter(c => !c.isRemoteBranch);

    const branchCount = branches.length;
    const totalBranchStudents = branches.reduce((sum, b) => sum + (b.studentCount || 0), 0);
    const totalBranchMale = branches.reduce((sum, b) => sum + (b.maleCount || 0), 0);
    const totalBranchFemale = branches.reduce((sum, b) => sum + (b.femaleCount || 0), 0);
    const totalBranchStaff = branches.reduce((sum, b) => sum + (b.staffCount || 0), 0);

    const mainSchoolStudents = studentData ? studentData.totalStudents : 0;
    const mainSchoolMale = studentData ? studentData.totalMale : 0;
    const mainSchoolFemale = studentData ? studentData.totalFemale : 0;

    return {
      branches,
      standardRooms,
      branchCount,
      totalBranchStudents,
      totalBranchMale,
      totalBranchFemale,
      totalBranchStaff,
      mainSchoolStudents,
      mainSchoolMale,
      mainSchoolFemale,
      grandTotalStudents: mainSchoolStudents + totalBranchStudents,
      grandTotalStaff: school.staffCount + totalBranchStaff
    };
  }, [classrooms, studentData, school]);

  // ฟังก์ชันสำหรับ Super Admin ลบโรงเรียน
  const handleDeleteSchool = async () => {
    if (!window.confirm(`⚠️ ยืนยันการลบโรงเรียน "${school.name}" (รหัส ${school.id}) ออกจากระบบ?\n\nการลบข้อมูลนี้จะส่งผลถาวรและไม่สามารถกู้คืนได้`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'schools', school.id));
      alert(`ลบโรงเรียน "${school.name}" เรียบร้อยแล้ว`);
      await onRefreshData();
      onBack();
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการลบโรงเรียน');
    }
  };

  // เปิดโมดอลเพิ่ม/แก้ไขห้องเรียนย่อย
  const handleOpenClassroomModal = (item?: ClassroomItem) => {
    if (item) {
      setEditingClassroom(item);
      setCIsRemoteBranch(item.isRemoteBranch ?? true);
      setCName(item.name || '');
      setCGradeLevel(item.gradeLevel || 'อ.1 - ป.6');
      setCStudentCount(item.studentCount !== undefined ? String(item.studentCount) : '');
      setCMaleCount(item.maleCount !== undefined ? String(item.maleCount) : '');
      setCFemaleCount(item.femaleCount !== undefined ? String(item.femaleCount) : '');
      setCStaffCount(item.staffCount !== undefined ? String(item.staffCount) : '');
      setCTeacherName(item.teacherName || '');
      setCPhone(item.phone || '');
      setCElectricity(
        typeof item.electricity === 'boolean'
          ? (item.electricity ? 'has_electric' : 'none')
          : (item.electricity || 'has_electric')
      );
      setCSolarKw(item.solarKw || '');
      setCHasSolarBattery(item.hasSolarBattery || false);
      setCSolarBatteryCapacity(item.solarBatteryCapacity || '');
      setCInternetType(item.internetType || 'fiber');
      setCDistanceFromMainSchool(item.distanceFromMainSchool || '');
      setCLatitude(item.latitude !== undefined ? String(item.latitude) : '');
      setCLongitude(item.longitude !== undefined ? String(item.longitude) : '');
      setCNotes(item.notes || '');
      setCGradesBreakdown(item.gradesBreakdown || {});
    } else {
      setEditingClassroom(null);
      setCIsRemoteBranch(true);
      setCName('');
      setCGradeLevel('อ.1 - ป.6');
      setCStudentCount('');
      setCMaleCount('');
      setCFemaleCount('');
      setCStaffCount('');
      setCTeacherName('');
      setCPhone('');
      setCElectricity('has_electric');
      setCSolarKw('');
      setCHasSolarBattery(false);
      setCSolarBatteryCapacity('');
      setCInternetType('fiber');
      setCDistanceFromMainSchool('');
      setCLatitude('');
      setCLongitude('');
      setCNotes('');
      setCGradesBreakdown({});
    }
    setModalActiveTab('basic');
    setIsClassroomModalOpen(true);
  };

  // บันทึกห้องเรียนย่อย
  const handleSaveClassroom = async (e: FormEvent) => {
    e.preventDefault();
    if (!cName.trim()) {
      alert('กรุณาระบุชื่อห้องเรียนย่อย');
      return;
    }

    setIsSavingClassroom(true);
    try {
      let updatedList: ClassroomItem[] = [...(school.classrooms || [])];
      
      const calcMale = cMaleCount ? Number(cMaleCount) : 0;
      const calcFemale = cFemaleCount ? Number(cFemaleCount) : 0;
      const calcTotal = cStudentCount ? Number(cStudentCount) : (calcMale + calcFemale);

      const newClassroomObj: ClassroomItem = {
        id: editingClassroom ? editingClassroom.id : `c-${Date.now()}`,
        name: cName.trim(),
        gradeLevel: cGradeLevel.trim(),
        studentCount: calcTotal,
        maleCount: calcMale,
        femaleCount: calcFemale,
        staffCount: cStaffCount ? Number(cStaffCount) : 0,
        teacherName: cTeacherName.trim(),
        phone: cPhone.trim(),
        electricity: cElectricity,
        solarKw: cSolarKw.trim(),
        hasSolarBattery: cHasSolarBattery,
        solarBatteryCapacity: cSolarBatteryCapacity.trim(),
        internetType: cInternetType,
        distanceFromMainSchool: cDistanceFromMainSchool.trim(),
        latitude: cLatitude ? Number(cLatitude) : 0,
        longitude: cLongitude ? Number(cLongitude) : 0,
        notes: cNotes.trim(),
        isRemoteBranch: cIsRemoteBranch,
        gradesBreakdown: cGradesBreakdown || {}
      };

      if (editingClassroom) {
        updatedList = updatedList.map(item => item.id === editingClassroom.id ? newClassroomObj : item);
      } else {
        updatedList.push(newClassroomObj);
      }

      const cleanClassrooms = JSON.parse(JSON.stringify(updatedList));
      const schoolRef = doc(db, 'schools', school.id);
      await setDoc(schoolRef, { classrooms: cleanClassrooms }, { merge: true });
      
      setClassrooms(updatedList);
      setIsClassroomModalOpen(false);
      setSuccessMsg('บันทึกข้อมูลเรียบร้อยแล้ว!');
      await onRefreshData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSavingClassroom(false);
    }
  };

  // ลบห้องเรียน/สาขา
  const handleDeleteClassroom = async (classroomId: string) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้ออกจากโรงเรียนของคุณ?')) return;

    try {
      const updatedList = (school.classrooms || []).filter(c => c.id !== classroomId);
      const schoolRef = doc(db, 'schools', school.id);
      await setDoc(schoolRef, { classrooms: updatedList }, { merge: true });
      
      setClassrooms(updatedList);
      setSuccessMsg('ลบรายการเรียบร้อยแล้ว!');
      await onRefreshData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการลบรายการ');
    }
  };

  // คัดกรองห้องเรียนตามการค้นหา
  const filteredClassrooms = useMemo(() => {
    if (!classroomSearch.trim()) return classrooms;
    const q = classroomSearch.toLowerCase();
    return classrooms.filter(c => 
      c.name.toLowerCase().includes(q) ||
      (c.gradeLevel && c.gradeLevel.toLowerCase().includes(q)) ||
      (c.teacherName && c.teacherName.toLowerCase().includes(q)) ||
      (c.notes && c.notes.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    );
  }, [classrooms, classroomSearch]);

  const handleLocalImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploadProgress(10);
    setImageUploadStatus('กำลังอ่านไฟล์รูปภาพ...');

    const reader = new FileReader();
    reader.onprogress = (evt) => {
      if (evt.lengthComputable) {
        const pct = Math.round((evt.loaded / evt.total) * 100);
        setImageUploadProgress(pct);
      }
    };
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      if (result) {
        setImageUploadProgress(100);
        setImageUploadStatus('อัปโหลดรูปภาพเสร็จสิ้น!');
        setEditImageUrl(result);
        setSuccessMsg('อัปโหลดรูปภาพสำเร็จ (กดปุ่มบันทึกด้านบนเพื่อบันทึกการเปลี่ยนแปลง)');
        setTimeout(() => {
          setImageUploadProgress(null);
          setImageUploadStatus('');
          setSuccessMsg('');
        }, 3500);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLocalLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploadProgress(10);
    setImageUploadStatus('กำลังอ่านไฟล์รูปตราโรงเรียน...');

    const reader = new FileReader();
    reader.onprogress = (evt) => {
      if (evt.lengthComputable) {
        const pct = Math.round((evt.loaded / evt.total) * 100);
        setImageUploadProgress(pct);
      }
    };
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      if (result) {
        setImageUploadProgress(100);
        setImageUploadStatus('อัปโหลดรูปตราโรงเรียนเสร็จสิ้น!');
        setEditLogoUrl(result);
        setSuccessMsg('อัปโหลดรูปตราโรงเรียนสำเร็จ (กดปุ่มบันทึกด้านบนเพื่อบันทึกการเปลี่ยนแปลง)');
        setTimeout(() => {
          setImageUploadProgress(null);
          setImageUploadStatus('');
          setSuccessMsg('');
        }, 3500);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLocalDirectorImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploadProgress(10);
    setImageUploadStatus('กำลังอ่านไฟล์รูปภาพผู้บริหาร...');

    const reader = new FileReader();
    reader.onprogress = (evt) => {
      if (evt.lengthComputable) {
        const pct = Math.round((evt.loaded / evt.total) * 100);
        setImageUploadProgress(pct);
      }
    };
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      if (result) {
        setImageUploadProgress(100);
        setImageUploadStatus('อัปโหลดรูปภาพผู้บริหารเสร็จสิ้น!');
        setEditDirectorImageUrl(result);
        setSuccessMsg('อัปโหลดรูปภาพผู้บริหารสำเร็จ (กดปุ่มบันทึกด้านบนเพื่อบันทึกการเปลี่ยนแปลง)');
        setTimeout(() => {
          setImageUploadProgress(null);
          setImageUploadStatus('');
          setSuccessMsg('');
        }, 3500);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const schoolRef = doc(db, 'schools', school.id);
      
      const textMajors = editMajorsStr.split(',').map(m => m.trim()).filter(m => m !== '');
      const listMajors = editMajorsWithStaff.map(m => m.name);
      const combinedMajors = Array.from(new Set([...textMajors, ...listMajors]));
      const updatedMajorsWithStaff = combinedMajors.map(name => {
        const found = editMajorsWithStaff.find(m => m.name === name);
        return {
          name,
          teachersCount: found ? found.teachersCount : 1
        };
      });

      const updatedData = {
        name: editName || '',
        networkGroup: editNetworkGroup || '',
        directorPhone: editDirectorPhone || '',
        schoolPhone: editSchoolPhone || '',
        internetType: editInternetType || 'none',
        electricity: editElectricity || 'has_electric',
        solarKw: editSolarKw || '',
        hasSolarBattery: !!editHasSolarBattery,
        solarBatteryCapacity: editSolarBatteryCapacity || '',
        staffCount: Number(editStaffCount) || 0,
        majorSubjects: combinedMajors || [],
        majorSubjectsWithStaff: updatedMajorsWithStaff || [],
        imageUrl: editImageUrl || '',
        logoUrl: editLogoUrl || '',
        directorImageUrl: editDirectorImageUrl || '',
        specialHighlights: editSpecialHighlights || '',
        latitude: Number(editLatitude) || 19.3,
        longitude: Number(editLongitude) || 97.9,
        size: editSize || 'small',
        isExpansion: !!editIsExpansion
      };

      const cleanData = JSON.parse(JSON.stringify(updatedData));

      try {
        await setDoc(schoolRef, cleanData, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `schools/${school.id}`);
      }
      await onRefreshData();
      
      setSuccessMsg('บันทึกการแก้ไขข้อมูลโรงเรียนสำเร็จเรียบร้อยแล้ว!');
      setIsEditing(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setErrorMsg('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSaving(false);
    }
  };

  // ดึงรายชื่อวิชาเอกพร้อมระบุจำนวนครู
  const displayMajors = useMemo(() => {
    if (school.majorSubjectsWithStaff && school.majorSubjectsWithStaff.length > 0) {
      return school.majorSubjectsWithStaff;
    }
    if (school.majorSubjects && school.majorSubjects.length > 0) {
      return school.majorSubjects.map(m => ({ name: m, teachersCount: 1 }));
    }
    return [];
  }, [school.majorSubjects, school.majorSubjectsWithStaff]);

  // สร้างลิงก์แผนที่ Google Maps แบบ Embed Iframe ดึงจากละติจูดและลองจิจูดจริงของโรงเรียน
  const mapIframeUrl = useMemo(() => {
    const lat = isEditing ? editLatitude : school.latitude;
    const lng = isEditing ? editLongitude : school.longitude;
    return `https://maps.google.com/maps?q=${lat},${lng}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
  }, [school.latitude, school.longitude, isEditing, editLatitude, editLongitude]);

  // สถานะปีการศึกษาที่กำลังดูในหน้ารายละเอียดโรงเรียน
  const [selectedYear, setSelectedYear] = useState<string>(
    academicYear || studentData?.academicYear || '2568'
  );

  useEffect(() => {
    if (academicYear) {
      setSelectedYear(academicYear);
    } else if (studentData?.academicYear) {
      setSelectedYear(studentData.academicYear);
    }
  }, [academicYear, studentData?.academicYear]);

  // ดึงข้อมูลนักเรียนทั่วไปของโรงเรียนนี้ตามปีการศึกษาที่เลือก
  const effectiveStudentData = useMemo(() => {
    if (allStudentData && allStudentData.length > 0) {
      const match = allStudentData.find(
        s => s.schoolId === school.id && String(s.academicYear).trim() === String(selectedYear).trim()
      );
      if (match) return match;
    }
    return studentData;
  }, [allStudentData, school.id, selectedYear, studentData]);

  // จัดหมวดหมู่กราฟนักเรียนแยกชาย-หญิง เรียงลำดับจากอนุบาล -> ประถม -> มัธยม
  const chartData = useMemo(() => {
    if (!effectiveStudentData || !effectiveStudentData.grades) return [];
    
    const GRADE_ORDER = [
      "อ.1", "อ.2", "อ.3",
      "ป.1", "ป.2", "ป.3", "ป.4", "ป.5", "ป.6",
      "ม.1", "ม.2", "ม.3"
    ];

    return GRADE_ORDER
      .filter(grade => effectiveStudentData.grades[grade] !== undefined)
      .map(grade => ({
        name: grade,
        ชาย: effectiveStudentData.grades[grade].male,
        หญิง: effectiveStudentData.grades[grade].female,
        รวม: effectiveStudentData.grades[grade].total
      }));
  }, [effectiveStudentData]);

  // คำนวณแนวโน้มจำนวนนักเรียนรายปีการศึกษาของโรงเรียนนี้
  const schoolTrendData = useMemo(() => {
    if (!allStudentData || allStudentData.length === 0) return [];
    
    // กรองประวัติข้อมูลนักเรียนของโรงเรียนนี้ในทุกปีการศึกษา
    const history = allStudentData.filter(s => s.schoolId === school.id);
    
    // เรียงลำดับจากปีการศึกษาน้อยไปมาก
    const sortedHistory = [...history].sort((a, b) => a.academicYear.localeCompare(b.academicYear));
    
    return sortedHistory.map(item => ({
      year: `ปีการศึกษา ${item.academicYear}`,
      ชาย: item.totalMale || 0,
      หญิง: item.totalFemale || 0,
      นักเรียนรวม: item.totalStudents || 0
    }));
  }, [allStudentData, school.id]);

  // คำนวณแนวโน้มจำนวนนักเรียนตัว G (ไม่มีหลักฐานทางทะเบียนราษฎร) รายปีการศึกษาเฉพาะของโรงเรียนนี้
  const schoolGTrendData = useMemo(() => {
    if (!allStudentGData || allStudentGData.length === 0) return [];
    
    // กรองประวัติข้อมูลนักเรียนตัว G ของโรงเรียนนี้โดยตรง
    const history = allStudentGData.filter(g => g.schoolId === school.id || (g.schoolName && g.schoolName === school.name));
    
    // เรียงลำดับจากปีการศึกษาน้อยไปมาก
    const sortedHistory = [...history].sort((a, b) => a.academicYear.localeCompare(b.academicYear));
    
    return sortedHistory.map(item => ({
      year: `ปีการศึกษา ${item.academicYear}`,
      academicYear: item.academicYear,
      'ชาย': item.maleGCount || 0,
      'หญิง': item.femaleGCount || 0,
      'นักเรียนตัวGรวม': item.totalGStudents || 0,
      notes: item.notes || ''
    }));
  }, [allStudentGData, school.id, school.name]);

  // ข้อมูลนักเรียนตัว G ตรงตามปีการศึกษาที่เลือก
  const effectiveGData = useMemo(() => {
    if (allStudentGData && allStudentGData.length > 0) {
      const match = allStudentGData.find(
        g => (g.schoolId === school.id || (g.schoolName && g.schoolName === school.name)) &&
             String(g.academicYear).trim() === String(selectedYear).trim()
      );
      if (match) return match;
    }
    if (schoolGTrendData.length > 0) {
      return schoolGTrendData[schoolGTrendData.length - 1];
    }
    return null;
  }, [allStudentGData, school.id, school.name, selectedYear, schoolGTrendData]);

  // คำนวณประเภทช่วงชั้นเรียน
  const schoolLevelsText = useMemo(() => {
    let levels = [];
    if (effectiveStudentData) {
      const g = effectiveStudentData.grades;
      if (g["อ.1"]?.total > 0 || g["อ.2"]?.total > 0 || g["อ.3"]?.total > 0) levels.push("ระดับปฐมวัย (อนุบาล)");
      if (g["ป.1"]?.total > 0 || g["ป.2"]?.total > 0 || g["ป.3"]?.total > 0 || g["ป.4"]?.total > 0 || g["ป.5"]?.total > 0 || g["ป.6"]?.total > 0) levels.push("ระดับประถมศึกษา (ป.1 - ป.6)");
      if (school.isExpansion) levels.push("ระดับมัธยมศึกษาตอนต้น (ม.1 - ม.3)");
    }
    return levels.length > 0 ? levels.join(", ") : "ไม่ระบุชั้นเรียน";
  }, [school, effectiveStudentData]);

  // ฟังก์ชันดาวน์โหลด PDF สรุปข้อมูลโรงเรียนนี้
  const handleExportSchoolPdf = async () => {
    const headers = ['ระดับชั้น', 'ชาย (คน)', 'หญิง (คน)', 'รวมทั้งหมด (คน)', 'จำนวนห้องเรียน'];
    let rows: (string | number)[][] = [];

    if (effectiveStudentData?.grades) {
      const GRADE_ORDER = [
        "อ.1", "อ.2", "อ.3",
        "ป.1", "ป.2", "ป.3", "ป.4", "ป.5", "ป.6",
        "ม.1", "ม.2", "ม.3"
      ];
      rows = GRADE_ORDER
        .filter(grade => effectiveStudentData.grades[grade] !== undefined)
        .map(grade => [
          grade,
          effectiveStudentData.grades[grade].male,
          effectiveStudentData.grades[grade].female,
          effectiveStudentData.grades[grade].total,
          effectiveStudentData.grades[grade].rooms || 1
        ]);
    }

    await generatePdfReport({
      title: `รายงานข้อมูลนักเรียน - โรงเรียน${school.name} (รหัส ${school.id})`,
      subtitle: `ปีการศึกษา ${selectedYear} | สพป.แม่ฮ่องสอน เขต 1`,
      requesterInfo: {
        name: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'ผู้ใช้งานระบบ',
        email: userProfile ? userProfile.email : '-',
        purpose: 'พิมพ์รายงานสรุปข้อมูลโรงเรียนรายบุคคล'
      },
      headers,
      rows,
      filename: `Report_School_${school.id}_${selectedYear}.pdf`
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ปุ่มย้อนกลับ และ ปุ่มจัดการแก้ไข */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[#33272A] dark:text-[#FFF9F5] hover:text-[#FF8BA7] font-black text-xs transition-colors bg-white border-2 border-[#33272A] px-3 py-1.5 rounded-xl shadow-sm dark:border-[#FFD3B6] dark:bg-[#1e1518] cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>ย้อนกลับไปยังรายชื่อโรงเรียน</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportSchoolPdf}
            className="btn-cute bg-[#A0E7E5] hover:bg-teal-300 text-[#33272A] px-3 py-1.5 text-xs font-black flex items-center gap-1.5 cursor-pointer border-2 border-[#33272A] shadow-sm"
            title="ดาวน์โหลดรายงานสรุปของโรงเรียนเป็นไฟล์ PDF"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>พิมพ์ / โหลด PDF</span>
          </button>

          {userProfile?.role === 'super_admin' && (
            <button
              type="button"
              onClick={handleDeleteSchool}
              className="btn-cute bg-rose-500 text-white px-3 py-1.5 text-xs font-black flex items-center gap-1.5 cursor-pointer hover:bg-rose-600 transition-colors"
              title="ลบโรงเรียนนี้ออกจากฐานข้อมูล"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>ลบโรงเรียนออก</span>
            </button>
          )}

          {canEdit && (
            <div>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-cute bg-[#FF8BA7] text-[#33272A] px-4 py-1.5 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>แก้ไขข้อมูลหน้านี้</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="btn-cute bg-[#A0E7E5] text-[#33272A] px-4 py-1.5 text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setErrorMsg('');
                    }}
                    disabled={isSaving}
                    className="btn-cute bg-slate-200 text-[#33272A] px-4 py-1.5 text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50 dark:bg-slate-700 dark:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>ยกเลิก</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ข้อความแจ้งสถานะสำเร็จ / ข้อผิดพลาด */}
      {errorMsg && (
        <div className="rounded-2xl bg-rose-100 dark:bg-rose-950/40 p-4 text-xs font-bold text-rose-700 dark:text-rose-300 border-2 border-rose-500 flex gap-2 items-center">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="rounded-2xl bg-[#A0E7E5]/20 p-4 text-xs font-bold text-[#2e6d6b] dark:text-[#A0E7E5] border-2 border-[#A0E7E5] flex gap-2 items-center">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2e6d6b]" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Hero Header Section */}
      <div className="overflow-hidden card">
        <div className="relative h-48 md:h-64 overflow-hidden">
          <img
            src={isEditing ? (editImageUrl || "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&auto=format&fit=crop&q=80") : (school.imageUrl || "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&auto=format&fit=crop&q=80")}
            alt={isEditing ? editName : school.name}
            className="h-full w-full object-cover brightness-90 filter transition-all duration-500"
          />

          {/* HUD Overlay for BIGDATA website theme */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-20 items-end">
            {/* GIS indicator */}
            <div className="backdrop-blur-md bg-[#33272A]/85 border-2 border-[#A0E7E5] px-3 py-1.5 rounded-xl text-[10px] font-mono text-white shadow-md flex items-center gap-1.5 transition-all">
              <Cpu className="h-3.5 w-3.5 text-[#A0E7E5] animate-spin" style={{ animationDuration: '6s' }} />
              <div className="flex flex-col">
                <span className="text-[#A0E7E5] font-black text-[8px] tracking-wider leading-none uppercase">GIS COORDINATES</span>
                <span className="font-bold text-[9px] mt-0.5">
                  {(isEditing ? editLatitude : (school.latitude || 19.3)).toFixed(5)}° N, {(isEditing ? editLongitude : (school.longitude || 97.9)).toFixed(5)}° E
                </span>
              </div>
            </div>

            {/* BIG DATA Sync badge */}
            <div className="backdrop-blur-md bg-emerald-950/85 border-2 border-emerald-400/60 px-3 py-1 rounded-xl text-[10px] font-bold text-[#A0E7E5] shadow-md flex items-center gap-1.5 transition-all">
              <Database className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-emerald-400 font-black text-[8px] tracking-wider leading-none uppercase">FIREBASE LINKED</span>
                <span className="text-white text-[9px] mt-0.5 font-bold">MHS1_DATASET_LIVE</span>
              </div>
            </div>

            {/* Internet connection badge */}
            <div className="backdrop-blur-md bg-blue-950/85 border-2 border-blue-400/60 px-3 py-1 rounded-xl text-[10px] font-bold text-blue-200 shadow-md flex items-center gap-1.5 transition-all">
              <Wifi className="h-3.5 w-3.5 text-blue-400" />
              <div className="flex flex-col">
                <span className="text-blue-300 font-black text-[8px] tracking-wider leading-none uppercase">NETWORK LINK</span>
                <span className="text-white text-[9px] mt-0.5 font-bold">
                  {(isEditing ? editInternetType : (school.internetType || 'none')) === 'fiber' ? 'FIBER OPTIC' :
                   (isEditing ? editInternetType : (school.internetType || 'none')) === 'satellite' ? 'SATELLITE' :
                   (isEditing ? editInternetType : (school.internetType || 'none')) === 'sim' ? 'SIM 4G/5G' : 'OFFLINE'}
                </span>
              </div>
            </div>
          </div>

          {/* ตราโรงเรียนหรือรูปผู้บริหารด้านบนภาพ */}
          <div className="absolute bottom-4 left-6 flex items-center gap-3.5 z-20">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white border-2 border-[#33272A] p-1 dark:border-[#FFD3B6] dark:bg-[#1e1518] shadow-lg overflow-hidden">
                {hasAdminAccess && adminViewType === 'director' ? (
                  (isEditing ? editDirectorImageUrl : school.directorImageUrl) ? (
                    <img
                      src={isEditing ? editDirectorImageUrl : school.directorImageUrl}
                      alt="รูปผู้บริหาร"
                      onClick={() => setExpandedImageUrl(isEditing ? editDirectorImageUrl : school.directorImageUrl || null)}
                      className="h-full w-full object-cover rounded-xl cursor-pointer hover:scale-110 transition-transform duration-300"
                      title="คลิกเพื่อดูรูปขยาย"
                    />
                  ) : (
                    <div className="h-full w-full rounded-xl bg-purple-100 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800 flex flex-col items-center justify-center text-purple-700 dark:text-purple-300 font-black text-[9px] text-center leading-none p-0.5">
                      <span>ไม่มีรูป</span>
                      <span className="mt-0.5">ผู้บริหาร</span>
                    </div>
                  )
                ) : (
                  (isEditing ? editLogoUrl : school.logoUrl) ? (
                    <img
                      src={isEditing ? editLogoUrl : school.logoUrl}
                      alt="ตราโรงเรียน"
                      onClick={() => setExpandedImageUrl(isEditing ? editLogoUrl : school.logoUrl || null)}
                      className="h-full w-full object-cover rounded-xl cursor-pointer hover:scale-110 transition-transform duration-300"
                      title="คลิกเพื่อดูรูปขยาย"
                    />
                  ) : (
                    <div className="h-full w-full rounded-xl bg-[#FF8BA7] border border-[#33272A] flex items-center justify-center text-[#33272A] font-black text-xs">
                      {(isEditing ? editName : school.name).substring(8, 11) || "มฮ."}
                    </div>
                  )
                )}
              </div>

              {/* ปุ่มสลับแสดงผล ตราโรงเรียน / ผู้บริหาร (เห็นเฉพาะแอดมิน) */}
              {hasAdminAccess && (
                <div className="absolute -top-3.5 -right-3.5 flex gap-1 bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] rounded-full p-0.5 shadow-md">
                  <button
                    type="button"
                    onClick={() => setAdminViewType('logo')}
                    className={`p-1 rounded-full text-[9px] font-black cursor-pointer transition-colors leading-none ${
                      adminViewType === 'logo'
                        ? 'bg-[#FF8BA7] text-[#33272A] border border-[#33272A]'
                        : 'text-slate-400 dark:text-slate-500 hover:text-[#33272A]'
                    }`}
                    title="แสดงตราโรงเรียน"
                  >
                    ตรา
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminViewType('director')}
                    className={`p-1 rounded-full text-[9px] font-black cursor-pointer transition-colors leading-none ${
                      adminViewType === 'director'
                        ? 'bg-[#A0E7E5] text-[#33272A] border border-[#33272A]'
                        : 'text-slate-400 dark:text-slate-500 hover:text-[#33272A]'
                    }`}
                    title="แสดงรูปผู้บริหาร"
                  >
                    ผอ.
                  </button>
                </div>
              )}
            </div>
            <div className="text-white drop-shadow-md">
              {isEditing ? (
                <div className="space-y-1.5 max-w-sm sm:max-w-md">
                  <label className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase bg-[#A0E7E5] text-[#33272A] border border-[#33272A] px-2.5 py-0.5 rounded-full cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editIsExpansion}
                      onChange={(e) => setEditIsExpansion(e.target.checked)}
                      className="rounded border-[#33272A] focus:ring-0 text-[#FF8BA7]"
                    />
                    <span>โรงเรียนขยายโอกาส</span>
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="ระบุชื่อโรงเรียน"
                    disabled={!isSuperAdmin}
                    title={!isSuperAdmin ? 'เฉพาะ Super Admin เท่านั้นที่สามารถเปลี่ยนชื่อโรงเรียนได้' : ''}
                    className={`block w-full rounded-xl border-2 border-[#33272A] bg-white p-1.5 px-3 text-xs font-bold text-[#33272A] outline-none focus:ring-2 focus:ring-[#FF8BA7] ${!isSuperAdmin ? 'opacity-70 bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[9px] font-black uppercase bg-[#A0E7E5] text-[#33272A] border border-[#33272A] px-2 py-0.5 rounded-full tracking-wider">
                      {school.isExpansion ? "โรงเรียนขยายโอกาส" : "โรงเรียนพื้นฐาน"}
                    </span>
                    <span className="text-[9px] font-black bg-purple-200 text-purple-900 border border-[#33272A] px-2 py-0.5 rounded-full tracking-wider">
                      🏫 {school.networkGroup || getAmphoeAndNetwork(school.id, school.name).networkGroup}
                    </span>
                  </div>
                  <h1 className="text-xl md:text-2xl font-black mt-1 text-white">{school.name}</h1>
                </>
              )}
              <p className="text-xs font-bold text-slate-100 flex items-center gap-1 mt-1">
                <MapPin className="h-3.5 w-3.5 text-[#FF8BA7]" />
                สังกัด {school.district} • อำเภอ{school.amphoe || getAmphoeAndNetwork(school.id, school.name).amphoe} (รหัส {school.id})
              </p>
            </div>
          </div>

          {/* ส่วนแก้ไขและอัปโหลดรูปภาพปก ตราโรงเรียน และรูปผู้บริหาร */}
          {isEditing && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 text-white z-10 space-y-4 overflow-y-auto">
              <div className="flex gap-2 bg-[#33272A] border border-[#FFD3B6]/20 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveImageTab('cover')}
                  className={`px-3 py-1 text-xs font-black rounded-lg cursor-pointer transition-colors ${
                    activeImageTab === 'cover' ? 'bg-[#FF8BA7] text-[#33272A]' : 'text-white hover:bg-slate-700'
                  }`}
                >
                  รูปภาพปก
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImageTab('logo')}
                  className={`px-3 py-1 text-xs font-black rounded-lg cursor-pointer transition-colors ${
                    activeImageTab === 'logo' ? 'bg-[#FF8BA7] text-[#33272A]' : 'text-white hover:bg-slate-700'
                  }`}
                >
                  ตราโรงเรียน
                </button>
                {hasAdminAccess && (
                  <button
                    type="button"
                    onClick={() => setActiveImageTab('director')}
                    className={`px-3 py-1 text-xs font-black rounded-lg cursor-pointer transition-colors ${
                      activeImageTab === 'director' ? 'bg-[#FF8BA7] text-[#33272A]' : 'text-white hover:bg-slate-700'
                    }`}
                  >
                    รูปผู้บริหาร (Admin)
                  </button>
                )}
              </div>

              {/* แถบ Progress Bar สำหรับการอัปโหลดรูปภาพ */}
              {imageUploadProgress !== null && (
                <div className="w-full max-w-md mx-auto p-3 rounded-xl bg-white border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] space-y-1.5 animate-fade-in text-left">
                  <div className="flex justify-between items-center text-xs font-black text-[#33272A]">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5 text-[#FF8BA7] animate-spin" />
                      {imageUploadStatus || 'กำลังอัปโหลดรูปภาพ...'}
                    </span>
                    <span className="bg-[#A0E7E5] px-2 py-0.5 rounded text-[10px] font-black border border-[#33272A]">
                      {imageUploadProgress}%
                    </span>
                  </div>
                  <div className="w-full h-3.5 rounded-lg border-2 border-[#33272A] bg-slate-100 overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-md bg-gradient-to-r from-[#FF8BA7] to-[#A0E7E5] transition-all duration-200"
                      style={{ width: `${Math.max(5, imageUploadProgress)}%` }}
                    />
                  </div>
                </div>
              )}

              {activeImageTab === 'cover' && (
                <div className="w-full max-w-md space-y-3 text-center">
                  <p className="text-xs font-black flex items-center justify-center gap-1">
                    <Image className="h-4 w-4 text-[#FF8BA7]" /> แก้ไขรูปภาพปกโรงเรียน
                  </p>
                  <input
                    type="text"
                    placeholder="วางลิงก์รูปภาพปกที่นี่ (เช่น https://...)"
                    value={editImageUrl}
                    onChange={(e) => setEditImageUrl(e.target.value)}
                    className="w-full rounded-xl border-2 border-[#33272A] bg-white p-2 text-xs font-bold text-[#33272A] outline-none focus:ring-2 focus:ring-[#FF8BA7]"
                  />
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-[10px] font-bold text-slate-300">หรือ</span>
                    <label className="bg-[#FF8BA7] text-[#33272A] hover:bg-opacity-90 px-3 py-1.5 rounded-xl text-[11px] font-black cursor-pointer flex items-center gap-1 shadow-md border-2 border-[#33272A]">
                      <Upload className="h-3.5 w-3.5" />
                      อัปโหลดรูปภาพจากอุปกรณ์
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLocalImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {activeImageTab === 'logo' && (
                <div className="w-full max-w-md space-y-3 text-center">
                  <p className="text-xs font-black flex items-center justify-center gap-1">
                    <Image className="h-4 w-4 text-[#FF8BA7]" /> แก้ไขตราสัญลักษณ์โรงเรียน
                  </p>
                  <input
                    type="text"
                    placeholder="วางลิงก์รูปภาพตราโรงเรียนที่นี่ (เช่น https://...)"
                    value={editLogoUrl}
                    onChange={(e) => setEditLogoUrl(e.target.value)}
                    className="w-full rounded-xl border-2 border-[#33272A] bg-white p-2 text-xs font-bold text-[#33272A] outline-none focus:ring-2 focus:ring-[#FF8BA7]"
                  />
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-[10px] font-bold text-slate-300">หรือ</span>
                    <label className="bg-[#A0E7E5] text-[#33272A] hover:bg-opacity-90 px-3 py-1.5 rounded-xl text-[11px] font-black cursor-pointer flex items-center gap-1 shadow-md border-2 border-[#33272A]">
                      <Upload className="h-3.5 w-3.5" />
                      อัปโหลดรูปตราสัญลักษณ์ใหม่
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLocalLogoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {editLogoUrl && (
                    <div className="flex justify-center mt-2">
                      <img src={editLogoUrl} className="h-12 w-12 object-cover rounded-xl border-2 border-white" alt="ตราตัวอย่าง" />
                    </div>
                  )}
                </div>
              )}

              {activeImageTab === 'director' && hasAdminAccess && (
                <div className="w-full max-w-md space-y-3 text-center">
                  <p className="text-xs font-black flex items-center justify-center gap-1">
                    <Image className="h-4 w-4 text-[#FF8BA7]" /> แก้ไขรูปภาพผู้บริหาร (เห็นเฉพาะแอดมิน)
                  </p>
                  <input
                    type="text"
                    placeholder="วางลิงก์รูปภาพผู้บริหารที่นี่ (เช่น https://...)"
                    value={editDirectorImageUrl}
                    onChange={(e) => setEditDirectorImageUrl(e.target.value)}
                    className="w-full rounded-xl border-2 border-[#33272A] bg-white p-2 text-xs font-bold text-[#33272A] outline-none focus:ring-2 focus:ring-[#FF8BA7]"
                  />
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-[10px] font-bold text-slate-300">หรือ</span>
                    <label className="bg-[#FFD3B6] text-[#33272A] hover:bg-opacity-90 px-3 py-1.5 rounded-xl text-[11px] font-black cursor-pointer flex items-center gap-1 shadow-md border-2 border-[#33272A]">
                      <Upload className="h-3.5 w-3.5" />
                      อัปโหลดรูปภาพผู้บริหารใหม่
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLocalDirectorImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {editDirectorImageUrl && (
                    <div className="flex justify-center mt-2">
                      <img src={editDirectorImageUrl} className="h-12 w-12 object-cover rounded-xl border-2 border-white" alt="รูปผู้บริหารตัวอย่าง" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ข้อมูลการติดต่อและสิทธิ์พื้นฐาน */}
        <div className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3 bg-white dark:bg-[#1e1518]">
          {/* ข้อมูลติดต่อ */}
          <div className="space-y-3.5">
            <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] border-b-2 border-[#33272A] pb-2 dark:border-[#FFD3B6] flex items-center gap-1.5">
              <Building className="h-4 w-4 text-[#FF8BA7]" /> ข้อมูลทั่วไปและการติดต่อ
            </h3>
            <div className="space-y-2 text-xs font-bold text-[#33272A]/80 dark:text-[#FFF9F5]/80">
              <div className="flex items-center gap-2">
                <span className="text-[#33272A]/60 dark:text-[#FFF9F5]/60 w-20">กลุ่มโรงเรียน:</span>
                {isEditing ? (
                  <select
                    value={editNetworkGroup}
                    onChange={(e) => setEditNetworkGroup(e.target.value)}
                    className="flex-grow rounded-lg border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#1e1518] p-1 px-2 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5] outline-none"
                  >
                    {SCHOOL_GROUPS_LIST.map((g) => (
                      <option key={g.name} value={g.name}>{g.name}</option>
                    ))}
                  </select>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-lg font-black text-xs bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-700 flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                    {school.networkGroup || getAmphoeAndNetwork(school.id, school.name).networkGroup}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#33272A]/60 dark:text-[#FFF9F5]/60 w-20">ผู้บริหาร:</span>
                <span className="text-[#33272A] dark:text-[#FFF9F5]">ผู้อำนวยการโรงเรียน</span>
              </div>
              {(isEditing ? editDirectorImageUrl : school.directorImageUrl) && (
                <div className="flex items-start gap-2.5 mt-2 p-2 rounded-xl bg-[#FFF9F5] dark:bg-rose-950/20 border-2 border-dashed border-[#33272A]/20 dark:border-[#FFD3B6]/20 max-w-[240px]">
                  <img
                    src={isEditing ? editDirectorImageUrl : school.directorImageUrl}
                    alt="รูปผู้บริหาร"
                    onClick={() => setExpandedImageUrl(isEditing ? editDirectorImageUrl : school.directorImageUrl || null)}
                    className="h-14 w-14 rounded-lg object-cover border border-[#33272A] dark:border-[#FFD3B6] shrink-0 cursor-pointer hover:scale-105 transition-transform duration-200"
                    title="คลิกเพื่อขยายรูป"
                  />
                  <div>
                    <div className="font-black text-[11px] text-[#33272A] dark:text-[#FFF9F5] leading-tight">รูปภาพผู้บริหาร</div>
                    <button
                      type="button"
                      onClick={() => setExpandedImageUrl(isEditing ? editDirectorImageUrl : school.directorImageUrl || null)}
                      className="text-[10px] text-[#FF8BA7] dark:text-[#A0E7E5] mt-1 font-extrabold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3 inline" /> คลิกเพื่อขยาย
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-[#33272A]/60 dark:text-[#FFF9F5]/60 w-20">เบอร์ผู้บริหาร:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editDirectorPhone}
                    onChange={(e) => setEditDirectorPhone(e.target.value)}
                    disabled={!hasAdminAccess}
                    className="flex-grow rounded-lg border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#1e1518] p-1 px-2 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5] outline-none disabled:opacity-60"
                    placeholder={hasAdminAccess ? "ระบุเบอร์โทรผู้บริหาร" : "ซ่อนข้อมูลสำหรับบุคคลทั่วไป"}
                  />
                ) : (
                  hasAdminAccess && school.directorPhone ? (
                    <a
                      href={`tel:${school.directorPhone.replace(/[^0-9+]/g, '')}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-950 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:text-emerald-100 border-2 border-emerald-500 font-black text-xs transition-transform active:scale-95 shadow-xs cursor-pointer"
                      title="กดเพื่อโทรออกหาผู้บริหาร"
                    >
                      <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{school.directorPhone}</span>
                      <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-md font-black">โทรออก</span>
                    </a>
                  ) : (
                    <span className="text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1 font-bold">
                      <Phone className="h-3.5 w-3.5 text-[#FF8BA7] shrink-0" /> {hasAdminAccess ? (school.directorPhone || "-") : "ซ่อนข้อมูลสำหรับบุคคลทั่วไป"}
                    </span>
                  )
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#33272A]/60 dark:text-[#FFF9F5]/60 w-20">เบอร์โรงเรียน:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editSchoolPhone}
                    onChange={(e) => setEditSchoolPhone(e.target.value)}
                    className="flex-grow rounded-lg border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#1e1518] p-1 px-2 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5] outline-none"
                    placeholder="ระบุเบอร์โทรโรงเรียน"
                  />
                ) : (
                  school.schoolPhone ? (
                    <a
                      href={`tel:${school.schoolPhone.replace(/[^0-9+]/g, '')}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-950 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:text-emerald-100 border-2 border-emerald-500 font-black text-xs transition-transform active:scale-95 shadow-xs cursor-pointer"
                      title="กดเพื่อโทรออกหาโรงเรียน"
                    >
                      <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{school.schoolPhone}</span>
                      <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-md font-black">โทรออก</span>
                    </a>
                  ) : (
                    <span className="text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-[#FF8BA7] shrink-0" /> -
                    </span>
                  )
                )}
              </div>
            </div>
          </div>

          {/* เครือข่ายเทคโนโลยีและไฟฟ้า */}
          <div className="space-y-3.5">
            <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] border-b-2 border-[#33272A] pb-2 dark:border-[#FFD3B6] flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-[#FF8BA7]" /> เทคโนโลยีและสาธารณูปโภค
            </h3>
            <div className="space-y-2 text-xs font-bold text-[#33272A]/80 dark:text-[#FFF9F5]/80">
              <div className="flex items-center gap-2">
                <span className="text-[#33272A]/60 dark:text-[#FFF9F5]/60 w-24">ระบบอินเทอร์เน็ต:</span>
                {isEditing ? (
                  <select
                    value={editInternetType}
                    onChange={(e) => setEditInternetType(e.target.value as School['internetType'])}
                    className="rounded-lg border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#1e1518] p-1 px-2 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5] outline-none"
                  >
                    <option value="fiber">อินเทอร์เน็ต Fiber</option>
                    <option value="satellite">จานดาวเทียม (Satellite)</option>
                    <option value="sim">อินเทอร์เน็ตผ่าน SIM</option>
                    <option value="none">ไม่มีบริการ/ไม่ได้ใช้</option>
                  </select>
                ) : (
                  <span className="px-2 py-0.5 rounded-md font-black text-[10px] bg-[#A0E7E5] border border-[#33272A] text-[#33272A]">
                    {school.internetType === 'fiber' ? 'อินเทอร์เน็ต Fiber' :
                     school.internetType === 'satellite' ? 'จานดาวเทียม (Satellite)' :
                     school.internetType === 'sim' ? 'อินเทอร์เน็ตผ่าน SIM' : 'ไม่มีบริการ/ไม่ได้ใช้'}
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[#33272A]/60 dark:text-[#FFF9F5]/60 w-24 shrink-0">ระบบไฟฟ้า:</span>
                  {isEditing ? (
                    <select
                      value={editElectricity}
                      onChange={(e) => setEditElectricity(e.target.value as any)}
                      className="flex-grow rounded-lg border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#1e1518] p-1 px-2 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5] outline-none cursor-pointer"
                    >
                      <option value="has_electric">🔌 มีไฟฟ้าถาวร</option>
                      <option value="solar">☀️ ระบบโซลาร์เซลล์</option>
                      <option value="hybrid">⚡☀️ ผสมผสาน (ไฟฟ้า + โซลาร์เซลล์)</option>
                      <option value="none">❌ ไม่มีไฟฟ้า</option>
                    </select>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-lg font-black text-xs bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
                      {school.electricity === 'has_electric' || school.electricity === true ? '🔌 มีไฟฟ้าถาวร' :
                       school.electricity === 'solar' ? '☀️ ระบบโซลาร์เซลล์' :
                       school.electricity === 'hybrid' ? '⚡☀️ ผสมผสาน (ไฟฟ้า + โซลาร์เซลล์)' : '❌ ไม่มีไฟฟ้า'}
                    </span>
                  )}
                </div>

                {isEditing && (editElectricity === 'solar' || editElectricity === 'hybrid') && (
                  <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-700 space-y-2.5 animate-fade-in text-xs font-bold">
                    <div className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Sun className="h-4 w-4 text-amber-500" /> รายละเอียดระบบโซลาร์เซลล์ / พลังงานแสงอาทิตย์
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-black text-[#33272A] dark:text-[#FFF9F5] mb-1">
                          กำลังการผลิต (kW)
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น 5 kW หรือ 10 kW"
                          value={editSolarKw}
                          onChange={(e) => setEditSolarKw(e.target.value)}
                          className="w-full rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#150e10] p-1.5 px-2.5 text-xs font-bold text-[#33272A] dark:text-white outline-none"
                        />
                      </div>
                      <div className="flex flex-col justify-center">
                        <label className="block text-[11px] font-black text-[#33272A] dark:text-[#FFF9F5] mb-1">
                          ระบบแบตเตอรี่กักเก็บพลังงาน
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer mt-0.5">
                          <input
                            type="checkbox"
                            checked={editHasSolarBattery}
                            onChange={(e) => setEditHasSolarBattery(e.target.checked)}
                            className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-[#33272A] dark:text-[#FFF9F5]">
                            {editHasSolarBattery ? '🔋 มีแบตเตอรี่กักเก็บพลังงาน' : '❌ ไม่มีแบตเตอรี่'}
                          </span>
                        </label>
                      </div>
                    </div>

                    {editHasSolarBattery && (
                      <div>
                        <label className="block text-[11px] font-black text-[#33272A] dark:text-[#FFF9F5] mb-1">
                          รายละเอียด / ความจุแบตเตอรี่
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น 200Ah 48V หรือ แบตเตอรี่ Lithium 10kWh"
                          value={editSolarBatteryCapacity}
                          onChange={(e) => setEditSolarBatteryCapacity(e.target.value)}
                          className="w-full rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#150e10] p-1.5 px-2.5 text-xs font-bold text-[#33272A] dark:text-white outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}

                {!isEditing && (school.electricity === 'solar' || school.electricity === 'hybrid') && (school.solarKw || school.hasSolarBattery) && (
                  <div className="p-2.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] space-y-1 text-amber-900 dark:text-amber-200 font-bold ml-0 sm:ml-26">
                    {school.solarKw && (
                      <div className="flex items-center gap-1.5">
                        <Sun className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span>กำลังการผลิต: <strong className="font-black text-amber-800 dark:text-amber-200">{school.solarKw}</strong></span>
                      </div>
                    )}
                    {school.hasSolarBattery && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">🔋</span>
                        <span>แบตเตอรี่กักเก็บพลังงาน: {school.solarBatteryCapacity ? <strong className="font-black text-amber-800 dark:text-amber-200">{school.solarBatteryCapacity}</strong> : 'มีแบตเตอรี่กักเก็บพลังงาน'}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#33272A]/60 dark:text-[#FFF9F5]/60 w-24">ขนาดโรงเรียน:</span>
                {isEditing ? (
                  <select
                    value={editSize}
                    onChange={(e) => setEditSize(e.target.value as School['size'])}
                    className="rounded-lg border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#1e1518] p-1 px-2 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5] outline-none"
                  >
                    <option value="small">โรงเรียนขนาดเล็ก (119 คนลงมา)</option>
                    <option value="medium">โรงเรียนขนาดกลาง (120 - 719 คน)</option>
                    <option value="large">โรงเรียนขนาดใหญ่ (720 - 1,679 คน)</option>
                    <option value="special_large">โรงเรียนขนาดใหญ่พิเศษ (1,680 คนขึ้นไป)</option>
                  </select>
                ) : (
                  <span className="font-black text-[#FF8BA7]">
                    โรงเรียน{getSchoolSizeLabel(studentData ? getSchoolSize(studentData.totalStudents) : school.size)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ข้อมูลบุคลากร */}
          <div className="space-y-3.5">
            <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] border-b-2 border-[#33272A] pb-2 dark:border-[#FFD3B6] flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-[#FF8BA7]" /> บุคลากรและวิชาเอกหลัก
            </h3>
            <div className="space-y-2 text-xs font-bold text-[#33272A]/80 dark:text-[#FFF9F5]/80">
              <div className="flex items-center gap-2">
                <span className="text-[#33272A]/60 dark:text-[#FFF9F5]/60 w-24">ครู/บุคลากร:</span>
                {isEditing ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={editStaffCount}
                      onChange={(e) => setEditStaffCount(Number(e.target.value))}
                      className="w-20 rounded-lg border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#1e1518] p-1 px-2 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5] outline-none"
                      min="0"
                    />
                    <span>คน</span>
                  </div>
                ) : (
                  <span className="text-[#33272A] dark:text-[#FFF9F5] font-black flex items-center gap-1">
                    <Users className="h-4 w-4 text-[#FF8BA7]" /> {school.staffCount} คน
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[#33272A]/60 dark:text-[#FFF9F5]/60 text-xs">วิชาเอกที่มีผู้เชี่ยวชาญ:</span>
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editMajorsStr}
                      onChange={(e) => setEditMajorsStr(e.target.value)}
                      placeholder="คอมพิวเตอร์, คณิตศาสตร์, ภาษาไทย (แยกด้วยจุลภาค)"
                      className="w-full rounded-lg border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#1e1518] p-1 px-2 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5] outline-none"
                    />
                    
                    {/* ส่วน Interactive สำหรับจัดการวิชาเอกพร้อมจำนวนครู */}
                    <div className="bg-[#FFF9F5] dark:bg-slate-900 p-3 rounded-xl border border-[#33272A]/30 space-y-2.5">
                      <span className="text-[10px] font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1">
                        <GraduationCap className="h-3.5 w-3.5 text-[#FF8BA7]" /> ตั้งค่าจำนวนครูรายวิชาเอก
                      </span>

                      {/* ช่องกรอกด่วน */}
                      <div className="flex gap-1.5 items-end bg-white dark:bg-slate-800 p-2 rounded-lg border border-[#33272A]/20">
                        <div className="flex-grow space-y-0.5">
                          <span className="text-[9px] text-gray-400 block">ชื่อวิชา</span>
                          <input 
                            type="text"
                            placeholder="เช่น ศิลปะ, พละ"
                            value={newMajorName}
                            onChange={(e) => setNewMajorName(e.target.value)}
                            className="w-full rounded border border-[#33272A]/40 bg-white p-0.5 text-xs font-bold outline-none"
                          />
                        </div>
                        <div className="w-16 space-y-0.5">
                          <span className="text-[9px] text-gray-400 block">ครู (คน)</span>
                          <input 
                            type="number"
                            min="0"
                            value={newMajorCount}
                            onChange={(e) => setNewMajorCount(Number(e.target.value))}
                            className="w-full rounded border border-[#33272A]/40 bg-white p-0.5 text-xs font-bold outline-none text-center"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!newMajorName.trim()) return;
                            if (editMajorsWithStaff.some(m => m.name.toLowerCase() === newMajorName.trim().toLowerCase())) {
                              alert('วิชาเอกนี้มีอยู่แล้ว');
                              return;
                            }
                            setEditMajorsWithStaff(prev => [...prev, { name: newMajorName.trim(), teachersCount: newMajorCount }]);
                            setNewMajorName('');
                            setNewMajorCount(1);
                          }}
                          className="bg-[#A0E7E5] hover:opacity-90 border border-[#33272A] text-[#33272A] text-[10px] font-black px-2.5 py-1 rounded-md cursor-pointer shrink-0"
                        >
                          + เพิ่ม
                        </button>
                      </div>

                      {/* รายการวิชาเอกพร้อมช่องแก้จำนวน */}
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {editMajorsWithStaff.map((m, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white dark:bg-[#1e1518] p-1.5 rounded-lg border border-[#33272A]/10 text-[11px] font-bold text-[#33272A] dark:text-[#FFF9F5]">
                            <span>{m.name}</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                value={m.teachersCount}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setEditMajorsWithStaff(prev => prev.map((item, i) => i === idx ? { ...item, teachersCount: val } : item));
                                }}
                                className="w-10 rounded border border-[#33272A]/20 bg-white dark:bg-[#1e1518] p-0.5 text-center text-[10px] font-bold text-[#33272A] dark:text-[#FFF9F5]"
                              />
                              <span className="text-[10px]">คน</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditMajorsWithStaff(prev => prev.filter((_, i) => i !== idx));
                                }}
                                className="text-rose-500 hover:text-rose-700 font-bold text-xs"
                              >
                                &times;
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {displayMajors.length > 0 ? (
                      displayMajors.map((m, idx) => (
                        <span key={idx} className="rounded bg-[#FFF9F5] border-2 border-[#33272A] dark:border-[#FFD3B6] px-1.5 py-0.5 text-[9px] font-bold text-[#33272A] dark:bg-slate-800 dark:text-[#FFF9F5] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FF8BA7]"></span>
                          {m.name} ({m.teachersCount} คน)
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 text-[10px]">ไม่พบข้อมูลวิชาเอก</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* แสดงความพิเศษของโรงเรียน / จุดเด่น (Special Highlights) */}
        {(school.specialHighlights || editSpecialHighlights || isEditing) && (
          <div className="p-5 border-t-2 border-[#33272A] dark:border-[#FFD3B6] bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-amber-900 dark:text-amber-200">
              <Sparkles className="h-4 w-4 text-amber-500 fill-amber-400 shrink-0" />
              <span>ความพิเศษของโรงเรียน / จุดเด่น (Special Highlights)</span>
            </div>
            {isEditing ? (
              <textarea
                rows={2}
                value={editSpecialHighlights}
                onChange={(e) => setEditSpecialHighlights(e.target.value)}
                placeholder="ระบุความพิเศษของโรงเรียน เช่น โรงเรียนในโครงการพระราชดำริ, มีอัตลักษณ์ด้านกีฬาและดนตรีพื้นเมือง, โรงเรียนคุณธรรม 5 ดาว..."
                className="w-full rounded-xl border-2 border-[#33272A] bg-white p-2.5 text-xs font-bold text-[#33272A] outline-none focus:ring-2 focus:ring-[#FF8BA7]"
              />
            ) : (
              <p className="text-xs font-bold text-amber-950 dark:text-amber-100 leading-relaxed whitespace-pre-line pl-6">
                {school.specialHighlights || 'ยังไม่มีข้อมูลความพิเศษของโรงเรียน'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* รายละเอียดจำนวนนักเรียน + แผนที่ Google Maps */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* แผนที่พิกัดที่ตั้ง (Google Maps Embed) */}
        <div className="card overflow-hidden flex flex-col justify-between">
          <div className="p-6 border-b-2 border-[#33272A] dark:border-[#FFD3B6] bg-[#FFF9F5] dark:bg-[#1e1518]">
            <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-[#FF8BA7]" /> แผนที่ตั้งของโรงเรียน (Google Maps)
            </h3>
            {isEditing ? (
              <div className="mt-2 space-y-1.5 border-2 border-dashed border-[#33272A] dark:border-[#FFD3B6]/30 p-2 rounded-xl bg-white dark:bg-[#1e1518]">
                <div className="text-[10px] font-black text-[#33272A] dark:text-[#FFF9F5]">แก้ไขตำแหน่งพิกัด:</div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                  <div>
                    <span className="text-gray-500 block mb-0.5">ละติจูด (Lat)</span>
                    <input
                      type="number"
                      step="0.000001"
                      value={editLatitude}
                      onChange={(e) => setEditLatitude(Number(e.target.value))}
                      className="w-full rounded-lg border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#1e1518] p-1 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5] outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-0.5">ลองจิจูด (Lng)</span>
                    <input
                      type="number"
                      step="0.000001"
                      value={editLongitude}
                      onChange={(e) => setEditLongitude(Number(e.target.value))}
                      className="w-full rounded-lg border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#1e1518] p-1 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5] outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-semibold mt-1">แผนที่แสดงพิกัด ละติจูด: {school.latitude}, ลองจิจูด: {school.longitude}</p>
            )}
          </div>
          <div className="h-64 w-full bg-white relative dark:bg-[#1e1518]">
            <iframe
              title="school-map"
              src={mapIframeUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={false}
              loading="lazy"
            ></iframe>
          </div>
          <div className="p-4 bg-[#FFD3B6]/20 dark:bg-[#33272A] border-t-2 border-[#33272A] dark:border-[#FFD3B6] flex justify-between items-center text-xs font-bold text-[#33272A] dark:text-[#FFF9F5]">
            <span className="text-[#33272A]/70 dark:text-[#FFF9F5]/70">นำทางโดย Google Maps</span>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${isEditing ? editLatitude : school.latitude},${isEditing ? editLongitude : school.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="text-[#FF8BA7] hover:underline flex items-center gap-1 font-black"
            >
              เปิดแอปภายนอก &rarr;
            </a>
          </div>
        </div>

        {/* แผนภูมิแสดงนักเรียน */}
        <div className="lg:col-span-2 card p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-[#33272A]/10 dark:border-[#FFD3B6]/20 pb-3">
            <div>
              <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                <Grid className="h-4 w-4 text-[#FF8BA7]" /> จำนวนนักเรียนแต่ละระดับชั้นเรียน
              </h3>
              <p className="text-[10px] text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-semibold mt-0.5">
                ข้อมูลครอบคลุม: {schoolLevelsText}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5 text-amber-500" /> ปีการศึกษา:
              </span>
              <select
                value={selectedYear}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedYear(val);
                  if (setAcademicYear) setAcademicYear(val);
                }}
                className="bg-[#FFF9F5] dark:bg-[#1e1518] text-[#33272A] dark:text-[#FFF9F5] border-2 border-[#33272A] dark:border-[#FFD3B6] rounded-xl px-2.5 py-1 text-xs font-black cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#FF8BA7]"
              >
                {(availableYears && availableYears.length > 0 ? availableYears : ['2568', '2567', '2566', '2565']).map(yr => (
                  <option key={yr} value={yr}>ปีการศึกษา {yr}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="h-64 w-full text-[10px] font-bold mt-4">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0d9d5" className="dark:hidden" />
                  <CartesianGrid strokeDasharray="3 3" stroke="#4a3e42" className="hidden dark:block" />
                  <XAxis dataKey="name" stroke={chartStroke} />
                  <YAxis stroke={chartStroke} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '16px',
                      border: `2px solid ${tooltipBorder}`,
                      backgroundColor: tooltipBg,
                      color: tooltipText,
                      boxShadow: tooltipShadow,
                    }}
                    itemStyle={{ fontSize: '11px', fontWeight: 'bold', color: tooltipText }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '5px', fontWeight: 'bold' }} />
                  <Bar dataKey="ชาย" fill="#A0E7E5" stackId="a" stroke={chartStroke} strokeWidth={2} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="หญิง" fill="#FF8BA7" stackId="a" stroke={chartStroke} strokeWidth={2} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold">
                ไม่พบข้อมูลนักเรียนปีการศึกษา {selectedYear}
              </div>
            )}
          </div>

          {/* สถิติรวดเร็ว */}
          <div className="mt-4 pt-4 border-t-2 border-[#33272A]/10 dark:border-[#FFD3B6]/20 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-black">
            <div className="bg-[#A0E7E5]/30 border-2 border-[#33272A] dark:border-[#FFD3B6] p-2 rounded-2xl text-[#33272A] dark:text-[#FFF9F5]">
              <span className="block text-[10px] text-[#33272A]/60 dark:text-[#FFF9F5]/70">ชายทั้งหมด ({selectedYear})</span>
              <span className="text-sm font-black">{effectiveStudentData?.totalMale || 0} คน</span>
            </div>
            <div className="bg-[#FF8BA7]/30 border-2 border-[#33272A] dark:border-[#FFD3B6] p-2 rounded-2xl text-[#33272A] dark:text-[#FFF9F5]">
              <span className="block text-[10px] text-[#33272A]/60 dark:text-[#FFF9F5]/70">หญิงทั้งหมด ({selectedYear})</span>
              <span className="text-sm font-black">{effectiveStudentData?.totalFemale || 0} คน</span>
            </div>
            <div className="bg-[#FFD3B6]/30 border-2 border-[#33272A] dark:border-[#FFD3B6] p-2 rounded-2xl text-[#33272A] dark:text-[#FFF9F5]">
              <span className="block text-[10px] text-[#33272A]/60 dark:text-[#FFF9F5]/70">นักเรียนรวม ({selectedYear})</span>
              <span className="text-sm font-black">{effectiveStudentData?.totalStudents || 0} คน</span>
            </div>
            <div className="bg-amber-100 dark:bg-amber-950/60 border-2 border-[#33272A] dark:border-[#FFD3B6] p-2 rounded-2xl text-[#33272A] dark:text-[#FFF9F5]">
              <span className="block text-[10px] text-amber-800 dark:text-amber-200 font-extrabold flex items-center justify-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-600 dark:text-amber-400" /> นักเรียนตัว G ({selectedYear})
              </span>
              <span className="text-sm font-black text-amber-900 dark:text-amber-100">
                {effectiveGData ? (effectiveGData.totalGStudents || effectiveGData.นักเรียนตัวGรวม || 0) : 0} คน
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ส่วนวิเคราะห์แนวโน้มประชากรนักเรียนรายปีการศึกษา (นักเรียนทั่วไป และ นักเรียนตัว G) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b-2 border-[#33272A] dark:border-[#FFD3B6] pb-2">
          <h2 className="text-base font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#FF8BA7]" /> กราฟเส้นแสดงแนวโน้มสถิตินักเรียนรายปีการศึกษา ({school.name})
          </h2>
          <span className="text-[11px] font-bold text-[#33272A]/60 dark:text-[#FFF9F5]/60 bg-[#FFF9F5] dark:bg-slate-800 px-3 py-1 rounded-full border border-[#33272A]/20">
            ข้อมูลเปรียบเทียบตามปีการศึกษา
          </span>
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* กราฟเส้นแนวโน้มจำนวนนักเรียนทั่วไป */}
          <div className="card p-6 flex flex-col justify-between shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-[#33272A] dark:border-[#FFD3B6] pb-3 mb-3">
              <div>
                <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-[#FF8BA7]" /> แนวโน้มจำนวนนักเรียนทั่วไป
                </h3>
                <p className="text-[10px] text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-semibold mt-0.5">
                  สถิตินักเรียนชาย หญิง และนักเรียนรวมของ {school.name}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF9F5] dark:bg-slate-800 border border-[#33272A]/20 text-[9px] font-black text-[#33272A] dark:text-rose-100">
                  <span className="h-2 w-2 rounded-full bg-[#FF8BA7]"></span>
                  หญิง
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF9F5] dark:bg-slate-800 border border-[#33272A]/20 text-[9px] font-black text-[#33272A] dark:text-rose-100">
                  <span className="h-2 w-2 rounded-full bg-[#A0E7E5]"></span>
                  ชาย
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF9F5] dark:bg-slate-800 border border-[#33272A]/20 text-[9px] font-black text-[#33272A] dark:text-rose-100">
                  <span className="h-2 w-2 rounded-full bg-[#FFD3B6]"></span>
                  รวม
                </span>
              </div>
            </div>

            <div className="h-64 w-full text-[10px] font-bold mt-2">
              {schoolTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={schoolTrendData} margin={{ top: 15, right: 20, left: -25, bottom: 5 }}>
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
                      itemStyle={{ fontSize: '11px', fontWeight: 'bold', color: tooltipText }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px', fontWeight: 'bold' }} />
                    <Line 
                      type="monotone" 
                      dataKey="ชาย" 
                      stroke="#A0E7E5" 
                      strokeWidth={3} 
                      dot={{ stroke: chartStroke, strokeWidth: 1.5, r: 4, fill: '#A0E7E5' }}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="หญิง" 
                      stroke="#FF8BA7" 
                      strokeWidth={3} 
                      dot={{ stroke: chartStroke, strokeWidth: 1.5, r: 4, fill: '#FF8BA7' }}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="นักเรียนรวม" 
                      stroke={isDarkMode ? '#FFD3B6' : '#33272A'} 
                      strokeWidth={4} 
                      dot={{ stroke: chartStroke, strokeWidth: 2, r: 5, fill: isDarkMode ? '#FFD3B6' : '#33272A' }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 gap-2">
                  <span>ไม่พบข้อมูลประวัติสถิติจำนวนนักเรียนในระบบสำหรับคำนวณแนวโน้ม</span>
                  <span className="text-[9px] font-medium opacity-75">กรุณาเพิ่มข้อมูลสถิตินักเรียนปีการศึกษาอื่นเพิ่มเติมในหน้า แอดมิน</span>
                </div>
              )}
            </div>

            {schoolTrendData.length > 0 && (
              <div className="mt-4 p-3 bg-[#FFF9F5] dark:bg-[#1e1518]/60 border border-[#33272A]/10 dark:border-[#FFD3B6]/10 rounded-xl text-[11px] text-[#33272A]/80 dark:text-[#FFF9F5]/80 font-bold leading-relaxed flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span>💡 <b>นักเรียนรวมล่าสุด:</b> <b>{schoolTrendData[schoolTrendData.length - 1]?.นักเรียนรวม} คน</b> </span>
                  {schoolTrendData.length > 1 && (() => {
                    const prev = schoolTrendData[schoolTrendData.length - 2];
                    const curr = schoolTrendData[schoolTrendData.length - 1];
                    const diff = curr.นักเรียนรวม - prev.นักเรียนรวม;
                    if (diff > 0) {
                      return <span className="text-emerald-500 font-extrabold">(+{diff} คน)</span>;
                    } else if (diff < 0) {
                      return <span className="text-rose-500 font-extrabold">({diff} คน)</span>;
                    } else {
                      return <span className="text-slate-500 font-extrabold">(คงที่)</span>;
                    }
                  })()}
                </div>
                <div className="text-[10px] text-[#33272A]/50 dark:text-[#FFF9F5]/50 italic shrink-0">
                  *ข้อมูลรวมของ {school.name}
                </div>
              </div>
            )}
          </div>

          {/* กราฟเส้นแนวโน้มจำนวนนักเรียนตัว G (ข้อมูลตรงกับโรงเรียนนี้) */}
          <div className="card p-6 flex flex-col justify-between shadow-md border-2 border-amber-500/40 dark:border-amber-400/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-[#33272A] dark:border-[#FFD3B6] pb-3 mb-3">
              <div>
                <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" /> แนวโน้มจำนวนนักเรียนตัว G (รหัส G)
                </h3>
                <p className="text-[10px] text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-semibold mt-0.5">
                  สถิตินักเรียนกลุ่มไม่มีหลักฐานทางทะเบียนราษฎร (รหัส G) ของ {school.name}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF9F5] dark:bg-slate-800 border border-[#33272A]/20 text-[9px] font-black text-[#33272A] dark:text-rose-100">
                  <span className="h-2 w-2 rounded-full bg-[#FF8BA7]"></span>
                  หญิง (G)
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF9F5] dark:bg-slate-800 border border-[#33272A]/20 text-[9px] font-black text-[#33272A] dark:text-rose-100">
                  <span className="h-2 w-2 rounded-full bg-[#A0E7E5]"></span>
                  ชาย (G)
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF9F5] dark:bg-slate-800 border border-[#33272A]/20 text-[9px] font-black text-[#33272A] dark:text-rose-100">
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                  ตัว G รวม
                </span>
              </div>
            </div>

            <div className="h-64 w-full text-[10px] font-bold mt-2">
              {schoolGTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={schoolGTrendData} margin={{ top: 15, right: 20, left: -25, bottom: 5 }}>
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
                      itemStyle={{ fontSize: '11px', fontWeight: 'bold', color: tooltipText }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px', fontWeight: 'bold' }} />
                    <Line 
                      type="monotone" 
                      dataKey="ชาย" 
                      name="ชาย (ตัว G)"
                      stroke="#A0E7E5" 
                      strokeWidth={3} 
                      dot={{ stroke: chartStroke, strokeWidth: 1.5, r: 4, fill: '#A0E7E5' }}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="หญิง" 
                      name="หญิง (ตัว G)"
                      stroke="#FF8BA7" 
                      strokeWidth={3} 
                      dot={{ stroke: chartStroke, strokeWidth: 1.5, r: 4, fill: '#FF8BA7' }}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="นักเรียนตัวGรวม" 
                      name="นักเรียนตัว G รวม"
                      stroke="#F59E0B" 
                      strokeWidth={4} 
                      dot={{ stroke: chartStroke, strokeWidth: 2, r: 5, fill: '#F59E0B' }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 gap-2">
                  <span>ไม่พบข้อมูลประวัติสถิตินักเรียนตัว G ของโรงเรียนนี้ในระบบ</span>
                  <span className="text-[9px] font-medium opacity-75">สามารถเพิ่มข้อมูลสถิตินักเรียนตัว G ได้ในหน้า แอดมิน</span>
                </div>
              )}
            </div>

            {schoolGTrendData.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-[11px] text-[#33272A]/80 dark:text-[#FFF9F5]/80 font-bold leading-relaxed flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span>🎓 <b>นักเรียนตัว G ล่าสุด ({school.name}):</b> <b>{schoolGTrendData[schoolGTrendData.length - 1]?.นักเรียนตัวGรวม} คน</b> </span>
                  {schoolGTrendData.length > 1 && (() => {
                    const prev = schoolGTrendData[schoolGTrendData.length - 2];
                    const curr = schoolGTrendData[schoolGTrendData.length - 1];
                    const diff = curr.นักเรียนตัวGรวม - prev.นักเรียนตัวGรวม;
                    if (diff > 0) {
                      return <span className="text-emerald-500 font-extrabold">(+{diff} คนจากปีก่อน)</span>;
                    } else if (diff < 0) {
                      return <span className="text-rose-500 font-extrabold">({diff} คนจากปีก่อน)</span>;
                    } else {
                      return <span className="text-slate-500 font-extrabold">(คงที่)</span>;
                    }
                  })()}
                </div>
                <div className="text-[10px] text-amber-800/60 dark:text-amber-200/60 italic shrink-0">
                  *ข้อมูลตรงตามโรงเรียน {school.name}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ตารางวิเคราะห์สถิติจำนวนนักเรียนและครูวิชาเอก */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* แผนภูมิแสดงจำนวนครูจำแนกตามวิชาเอก */}
        <div className="card p-6 flex flex-col justify-between shadow-md">
          <div>
            <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5 border-b-2 border-[#33272A] dark:border-[#FFD3B6] pb-4 mb-4">
              <Layers className="h-4 w-4 text-[#FF8BA7]" /> อัตรากำลังครูแยกตามวิชาเอก
            </h3>
            <p className="text-[10px] text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-semibold mt-1">
              สถิติจำนวนครูผู้เชี่ยวชาญแยกตามวิชาเอกในโรงเรียน
            </p>
          </div>

          <div className="h-72 w-full text-[10px] font-bold mt-4">
            {displayMajors.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayMajors} layout="vertical" margin={{ top: 10, right: 15, left: 15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0d9d5" className="dark:hidden" />
                  <CartesianGrid strokeDasharray="3 3" stroke="#4a3e42" className="hidden dark:block" />
                  <XAxis type="number" stroke={chartStroke} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke={chartStroke} width={75} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '16px',
                      border: `2px solid ${tooltipBorder}`,
                      backgroundColor: tooltipBg,
                      color: tooltipText,
                      boxShadow: tooltipShadow,
                    }}
                    itemStyle={{ fontSize: '11px', fontWeight: 'bold', color: tooltipText }}
                  />
                  <Bar dataKey="teachersCount" name="จำนวนครู (คน)" fill="#A0E7E5" stroke={chartStroke} strokeWidth={2} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold">
                ไม่พบข้อมูลวิชาเอกของโรงเรียนนี้
              </div>
            )}
          </div>

          {displayMajors.length > 0 && (
            <div className="mt-4 p-2 bg-[#FFF9F5] dark:bg-[#1e1518]/60 border border-[#33272A]/10 dark:border-[#FFD3B6]/10 rounded-xl text-[10px] text-center font-bold text-[#33272A]/80 dark:text-[#FFF9F5]/80">
              วิชาเอกหลักในระบบที่มีครูผู้เชี่ยวชาญเฉพาะทาง
            </div>
          )}
        </div>

        {/* ตารางข้อมูลนักเรียนแบบละเอียด */}
        <div className="lg:col-span-2 card overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-6 border-b-2 border-[#33272A] dark:border-[#FFD3B6] bg-[#FFF9F5] dark:bg-[#1e1518]">
              <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5]">ตารางวิเคราะห์สถิติจำนวนนักเรียนและห้องเรียนรายระดับชั้น</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FFD3B6]/50 dark:bg-[#33272A] text-[#33272A] dark:text-[#FFF9F5] font-black border-b-2 border-[#33272A] dark:border-[#FFD3B6]">
                    <th className="p-4">ชั้นเรียน</th>
                    <th className="p-4 text-center">เพศชาย (คน)</th>
                    <th className="p-4 text-center">เพศหญิง (คน)</th>
                    <th className="p-4 text-center">รวม (คน)</th>
                    <th className="p-4 text-center">จำนวนห้องเรียน</th>
                    <th className="p-4 text-center">เฉลี่ยต่อห้อง (คน)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#33272A]/10 dark:divide-[#FFD3B6]/20 text-[#33272A] dark:text-[#FFF9F5] font-bold">
                  {studentData && studentData.grades && (() => {
                    const GRADE_ORDER = [
                      "อ.1", "อ.2", "อ.3",
                      "ป.1", "ป.2", "ป.3", "ป.4", "ป.5", "ป.6",
                      "ม.1", "ม.2", "ม.3"
                    ];
                    return GRADE_ORDER
                      .filter(grade => studentData.grades[grade] !== undefined)
                      .map(grade => {
                        const gradeInfo = studentData.grades[grade];
                        const avgPerRoom = gradeInfo.rooms > 0 ? (gradeInfo.total / gradeInfo.rooms).toFixed(1) : "-";
                        if (gradeInfo.total === 0) return null; // ไม่แสดงแถวที่มีนักเรียนเป็น 0
                        return (
                          <tr key={grade} className="hover:bg-[#FFD3B6]/10 dark:hover:bg-slate-800/20">
                            <td className="p-4 font-black text-[#33272A] dark:text-[#FFF9F5]">{grade}</td>
                            <td className="p-4 text-center text-[#33272A] dark:text-[#A0E7E5]">{gradeInfo.male}</td>
                            <td className="p-4 text-center text-[#FF8BA7]">{gradeInfo.female}</td>
                            <td className="p-4 text-center font-black text-[#33272A] dark:text-[#FFF9F5]">{gradeInfo.total}</td>
                            <td className="p-4 text-center">{gradeInfo.rooms}</td>
                            <td className="p-4 text-center text-[#33272A]/70 dark:text-[#FFF9F5]/70">{avgPerRoom}</td>
                          </tr>
                        );
                      });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ส่วนจัดการข้อมูลห้องเรียนย่อยในพื้นที่ห่างไกล (อยู่ล่างสุด) */}
        <div className="card p-6 space-y-6 border-2 border-[#33272A] dark:border-[#FFD3B6]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#33272A] dark:border-[#FFD3B6] pb-4">
            <div>
              <h3 className="text-md font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-2">
                <Navigation className="h-5 w-5 text-amber-500" /> ข้อมูลห้องเรียนย่อยในพื้นที่ห่างไกล ({remoteBranchStats.branchCount} แห่ง)
              </h3>
              <p className="text-xs text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-semibold mt-0.5">
                การจัดการข้อมูลห้องเรียนย่อยในพื้นที่ห่างไกลของ {school.name}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* ค้นหาห้องเรียน */}
              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อห้องเรียนย่อย/ครูผู้ดูแล/เบอร์โทร..."
                  value={classroomSearch}
                  onChange={(e) => setClassroomSearch(e.target.value)}
                  className="w-full rounded-xl border-2 border-[#33272A] bg-white dark:bg-[#1e1518] dark:border-[#FFD3B6] dark:text-white pl-8 pr-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#FF8BA7]"
                />
                {classroomSearch && (
                  <button 
                    onClick={() => setClassroomSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* ปุ่มเพิ่มห้องเรียนย่อย */}
              {(userProfile?.role === 'super_admin' || (userProfile?.role === 'school_admin' && userProfile?.schoolId === school.id)) && (
                <button
                  type="button"
                  onClick={() => handleOpenClassroomModal()}
                  className="btn-cute bg-[#A0E7E5] text-[#33272A] px-3.5 py-1.5 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm hover:bg-[#86d8d6] transition-all"
                >
                  <Plus className="h-4 w-4" />
                  <span>เพิ่มข้อมูลห้องเรียนย่อยใหม่</span>
                </button>
              )}
            </div>
          </div>

          {/* แผงสรุปเปรียบเทียบข้อมูลแยกต่างหาก (โรงเรียนหลัก VS ห้องเรียนย่อยห่างไกล) */}
          <div className="p-4 rounded-2xl bg-[#FFF9F5] dark:bg-rose-950/20 border-2 border-[#33272A] dark:border-[#FFD3B6] space-y-3">
            <div className="flex items-center justify-between border-b border-[#33272A]/20 dark:border-[#FFD3B6]/20 pb-2">
              <h4 className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-[#FF8BA7]" />
                สรุปภาพรวมแยกตามประเภท (โรงเรียนหลัก VS ห้องเรียนย่อยห่างไกล)
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                ข้อมูลแยกกันตามบริบท
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* สถิติโรงเรียนหลัก */}
              <div className="p-3 rounded-xl bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6]/40 shadow-xs">
                <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Building className="h-3.5 w-3.5 text-purple-500" /> โรงเรียนหลัก ({school.name})
                </div>
                <div className="mt-1.5 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-bold">นักเรียนรวม:</span>
                    <span className="font-black text-[#33272A] dark:text-[#FFF9F5]">{remoteBranchStats.mainSchoolStudents} คน</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>(ชาย {remoteBranchStats.mainSchoolMale} / หญิง {remoteBranchStats.mainSchoolFemale})</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-300 font-bold">ครูและบุคลากร:</span>
                    <span className="font-black text-purple-600 dark:text-purple-300">{school.staffCount} คน</span>
                  </div>
                </div>
              </div>

              {/* สถิติห้องเรียนย่อยในพื้นที่ห่างไกล */}
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-400 dark:border-amber-700 shadow-xs">
                <div className="text-[10px] font-black text-amber-900 dark:text-amber-300 flex items-center gap-1">
                  <Navigation className="h-3.5 w-3.5 text-amber-600" /> ห้องเรียนย่อยพื้นที่ห่างไกล ({remoteBranchStats.branchCount} แห่ง)
                </div>
                <div className="mt-1.5 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-amber-900 dark:text-amber-200 font-bold">นักเรียนรวมห้องเรียนย่อย:</span>
                    <span className="font-black text-amber-900 dark:text-amber-100">{remoteBranchStats.totalBranchStudents} คน</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-amber-700/80 dark:text-amber-300/80">
                    <span>(ชาย {remoteBranchStats.totalBranchMale} / หญิง {remoteBranchStats.totalBranchFemale})</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-amber-200 dark:border-amber-800">
                    <span className="text-amber-900 dark:text-amber-200 font-bold">ครูประจำห้องเรียนย่อย:</span>
                    <span className="font-black text-amber-800 dark:text-amber-200">{remoteBranchStats.totalBranchStaff} คน</span>
                  </div>
                </div>
              </div>

              {/* ยอดรวมทั้งสิ้น */}
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-500 dark:border-emerald-700 shadow-xs">
                <div className="text-[10px] font-black text-emerald-900 dark:text-emerald-300 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-emerald-600" /> ยอดรวมสุทธิ (โรงเรียนหลัก + ห้องเรียนย่อย)
                </div>
                <div className="mt-1.5 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-900 dark:text-emerald-200 font-bold">นักเรียนรวมสุทธิ:</span>
                    <span className="font-black text-emerald-950 dark:text-emerald-100 text-sm">{remoteBranchStats.grandTotalStudents} คน</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-emerald-200 dark:border-emerald-800">
                    <span className="text-emerald-900 dark:text-emerald-200 font-bold">บุคลากรรวมสุทธิ:</span>
                    <span className="font-black text-emerald-900 dark:text-emerald-100">{remoteBranchStats.grandTotalStaff} คน</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* รายชื่อห้องเรียนย่อยในพื้นที่ห่างไกล */}
          <div className="space-y-3">
            {classrooms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredClassrooms.map((branch) => (
                  <div
                    key={branch.id}
                    className="p-4 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-amber-50/60 dark:bg-amber-950/20 shadow-[3px_3px_0px_#33272A] dark:shadow-[3px_3px_0px_#FFD3B6] flex flex-col justify-between space-y-3"
                  >
                    <div>
                      {/* ส่วนหัวของห้องเรียนย่อย */}
                      <div className="flex items-start justify-between gap-2 border-b border-amber-200 dark:border-amber-900/60 pb-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 border border-[#33272A]">
                              🏔️ ห้องเรียนย่อยพื้นที่ห่างไกล
                            </span>
                            {branch.distanceFromMainSchool && (
                              <span className="text-[10px] font-bold text-amber-900 dark:text-amber-200 flex items-center gap-0.5">
                                🚗 ระยะห่าง: {branch.distanceFromMainSchool}
                              </span>
                            )}
                          </div>
                          <h5 className="text-base font-black text-[#33272A] dark:text-[#FFF9F5] mt-1">
                            {branch.name}
                          </h5>
                        </div>

                        {/* เบอร์โทรติดต่อห้องเรียนย่อย (กดโทรออกได้) */}
                        {branch.phone && (
                          <a
                            href={`tel:${branch.phone.replace(/[^0-9+]/g, '')}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500 text-white font-black text-xs shadow-xs hover:bg-emerald-600 transition-transform active:scale-95 cursor-pointer shrink-0"
                            title="โทรออกหาห้องเรียนย่อยนี้"
                          >
                            <Phone className="h-3 w-3" />
                            <span>{branch.phone}</span>
                          </a>
                        )}
                      </div>

                      {/* รายละเอียดสถิตินักเรียนและครูประจำห้องเรียนย่อย */}
                      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                        <div className="p-2 rounded-xl bg-white dark:bg-[#1e1518] border border-amber-200 dark:border-amber-900">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">ครู/ผู้ดูแลประจำห้องเรียนย่อย:</span>
                          <span className="font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1 mt-0.5">
                            <Users className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            {branch.teacherName || "ไม่ระบุ"} ({branch.staffCount || 0} คน)
                          </span>
                        </div>

                        <div className="p-2 rounded-xl bg-white dark:bg-[#1e1518] border border-amber-200 dark:border-amber-900">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">จำนวนนักเรียนห้องเรียนย่อย:</span>
                          <span className="font-black text-[#FF8BA7] flex items-center gap-1 mt-0.5">
                            <GraduationCap className="h-3.5 w-3.5 text-[#FF8BA7] shrink-0" />
                            {branch.studentCount || 0} คน (ชาย {branch.maleCount || 0} / หญิง {branch.femaleCount || 0})
                          </span>
                        </div>
                      </div>

                      {/* ข้อมูลสาธารณูปโภคของห้องเรียนย่อย */}
                      <div className="flex items-center gap-2 flex-wrap mt-2.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                          ⚡ ไฟฟ้า: {branch.electricity === 'hybrid' ? '⚡☀️ ผสมผสาน (ไฟฟ้า + โซลาร์เซลล์)' : branch.electricity === 'solar' ? '☀️ โซลาร์เซลล์' : branch.electricity === 'has_electric' || branch.electricity === true ? '🔌 มีไฟฟ้าถาวร' : '❌ ไม่มีไฟฟ้า'}
                        </span>
                        {(branch.electricity === 'solar' || branch.electricity === 'hybrid' || branch.solarKw || branch.hasSolarBattery) && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                            ☀️ โซลาร์: {branch.solarKw ? `${branch.solarKw} kW` : ''} {branch.hasSolarBattery ? `(มีแบต ${branch.solarBatteryCapacity ? `: ${branch.solarBatteryCapacity}` : ''})` : '(ไม่มีแบต)'}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                          🌐 เน็ต: {branch.internetType === 'satellite' ? '📡 ดาวเทียม' : branch.internetType === 'sim' ? '📱 SIM 4G' : branch.internetType === 'fiber' ? '🌐 Fiber' : '❌ ไม่ได้ใช้'}
                        </span>
                      </div>

                      {branch.notes && (
                        <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80 mt-2 bg-amber-100/60 dark:bg-amber-950/50 p-2 rounded-xl border border-amber-200/50 italic">
                          "{branch.notes}"
                        </p>
                      )}
                    </div>

                    {/* ปุ่มจัดการห้องเรียนย่อย */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-amber-200 dark:border-amber-900/60">
                      <button
                        type="button"
                        onClick={() => setViewingBranchDetail(branch)}
                        className="p-1.5 px-3 text-xs font-black bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200 border border-purple-400 rounded-xl hover:bg-purple-200 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>ดูข้อมูลนักเรียนแยกรายชั้น</span>
                      </button>

                      {(userProfile?.role === 'super_admin' || (userProfile?.role === 'school_admin' && userProfile?.schoolId === school.id)) && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenClassroomModal(branch)}
                            className="p-1 px-2 text-xs font-black bg-amber-100 text-amber-900 border border-amber-400 rounded-lg hover:bg-amber-200 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Edit2 className="h-3 w-3" /> แก้ไข
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClassroom(branch.id)}
                            className="p-1 px-2 text-xs font-black bg-rose-100 text-rose-900 border border-rose-400 rounded-lg hover:bg-rose-200 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="h-3 w-3" /> ลบ
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 border-2 border-dashed border-amber-300 dark:border-amber-800 rounded-2xl bg-amber-50/30 dark:bg-amber-950/10">
                <Navigation className="h-8 w-8 mx-auto mb-2 opacity-50 text-amber-500" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {classroomSearch ? `ไม่พบข้อมูลห้องเรียนย่อยที่ตรงกับ "${classroomSearch}"` : 'ยังไม่มีการเพิ่มข้อมูลห้องเรียนย่อยในพื้นที่ห่างไกล'}
                </p>
                {(userProfile?.role === 'super_admin' || (userProfile?.role === 'school_admin' && userProfile?.schoolId === school.id)) && !classroomSearch && (
                  <button
                    type="button"
                    onClick={() => handleOpenClassroomModal()}
                    className="mt-3 btn-cute bg-[#A0E7E5] text-[#33272A] px-4 py-1.5 text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>เพิ่มข้อมูลห้องเรียนย่อยแรก</span>
                  </button>
                )}
              </div>
            )}
          </div>

        {/* Modal เพิ่ม/แก้ไขข้อมูลห้องเรียนย่อยในพื้นที่ห่างไกล */}
        {isClassroomModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
            <div className="relative max-w-2xl w-full bg-[#FFF9F5] dark:bg-[#1e1518] border-4 border-[#33272A] dark:border-[#FFD3B6] rounded-3xl p-6 shadow-2xl space-y-4 my-8 animate-scale-up">
              <div className="flex items-center justify-between border-b-2 border-[#33272A] dark:border-[#FFD3B6] pb-3">
                <h3 className="text-base font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-[#FF8BA7]" />
                  {editingClassroom ? 'แก้ไขข้อมูลห้องเรียนย่อย' : 'เพิ่มข้อมูลห้องเรียนย่อยในพื้นที่ห่างไกล'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsClassroomModalOpen(false)}
                  className="p-1 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* สวิตช์เลือกว่าเป็นห้องเรียนย่อยในพื้นที่ห่างไกลหรือไม่ */}
              <div className="p-3 rounded-2xl bg-amber-100/70 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <div className="text-xs font-black text-amber-950 dark:text-amber-100">
                      เป็นห้องเรียนย่อยในพื้นที่ห่างไกล
                    </div>
                    <div className="text-[10px] text-amber-800 dark:text-amber-300 font-bold">
                      หากเปิด ตัวเลือกนี้จะสามารถกรอกข้อมูลพื้นฐาน ยอดนักเรียน และครูแยกต่างหากจากโรงเรียนหลักได้
                    </div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={cIsRemoteBranch}
                    onChange={(e) => setCIsRemoteBranch(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:peer-focus:ring-amber-800 peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {/* แท็บบาร์สลับระหว่าง ข้อมูลพื้นฐาน VS ข้อมูลนักเรียน */}
              <div className="flex gap-2 border-b-2 border-[#33272A]/10 dark:border-[#FFD3B6]/10 pb-2">
                <button
                  type="button"
                  onClick={() => setModalActiveTab('basic')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    modalActiveTab === 'basic'
                      ? 'bg-[#33272A] text-white dark:bg-[#FFD3B6] dark:text-[#33272A] shadow-sm'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <Building className="h-4 w-4" />
                  <span>1. ข้อมูลพื้นฐานห้องเรียนย่อย</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalActiveTab('students')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    modalActiveTab === 'students'
                      ? 'bg-[#33272A] text-white dark:bg-[#FFD3B6] dark:text-[#33272A] shadow-sm'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <GraduationCap className="h-4 w-4" />
                  <span>2. ข้อมูลนักเรียน & รายชั้น</span>
                </button>
              </div>

              <form onSubmit={handleSaveClassroom} className="space-y-4">
                {modalActiveTab === 'basic' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-black text-[#33272A] dark:text-[#FFF9F5] mb-1">
                        ชื่อห้องเรียนย่อย <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น ห้องเรียนย่อยบ้านห้วยฮี้, ห้องเรียนย่อยแม่สลี"
                        value={cName}
                        onChange={(e) => setCName(e.target.value)}
                        className="w-full rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#150e10] p-2 px-3 text-xs font-bold text-[#33272A] dark:text-white outline-none focus:ring-2 focus:ring-[#FF8BA7]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-black text-[#33272A] dark:text-[#FFF9F5] mb-1">
                          ครูผู้ดูแลประจำห้องเรียนย่อย
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น ครูสมชาย ใจดี"
                          value={cTeacherName}
                          onChange={(e) => setCTeacherName(e.target.value)}
                          className="w-full rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#150e10] p-2 px-3 text-xs font-bold text-[#33272A] dark:text-white outline-none focus:ring-2 focus:ring-[#FF8BA7]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black text-[#33272A] dark:text-[#FFF9F5] mb-1">
                          เบอร์โทรศัพท์ติดต่อห้องเรียนย่อย (กดโทรออกได้)
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น 081-234-5678"
                          value={cPhone}
                          onChange={(e) => setCPhone(e.target.value)}
                          className="w-full rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#150e10] p-2 px-3 text-xs font-bold text-[#33272A] dark:text-white outline-none focus:ring-2 focus:ring-[#FF8BA7]"
                        />
                      </div>
                    </div>

                    {cIsRemoteBranch && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-black text-[#33272A] dark:text-[#FFF9F5] mb-1">
                              จำนวนครู/บุคลากรประจำห้องเรียนย่อย (คน)
                            </label>
                            <input
                              type="number"
                              min="0"
                              placeholder="เช่น 2"
                              value={cStaffCount}
                              onChange={(e) => setCStaffCount(e.target.value)}
                              className="w-full rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#150e10] p-2 px-3 text-xs font-bold text-[#33272A] dark:text-white outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-black text-[#33272A] dark:text-[#FFF9F5] mb-1">
                              ระบบไฟฟ้า
                            </label>
                            <select
                              value={cElectricity}
                              onChange={(e) => setCElectricity(e.target.value as any)}
                              className="w-full rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#150e10] p-2 px-3 text-xs font-bold text-[#33272A] dark:text-white outline-none cursor-pointer"
                            >
                              <option value="has_electric">🔌 มีไฟฟ้าถาวร</option>
                              <option value="solar">☀️ ระบบโซลาร์เซลล์</option>
                              <option value="hybrid">⚡☀️ ผสมผสาน (ไฟฟ้า + โซลาร์เซลล์)</option>
                              <option value="none">❌ ไม่มีไฟฟ้า</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-black text-[#33272A] dark:text-[#FFF9F5] mb-1">
                              ระบบอินเทอร์เน็ต
                            </label>
                            <select
                              value={cInternetType}
                              onChange={(e) => setCInternetType(e.target.value as any)}
                              className="w-full rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#150e10] p-2 px-3 text-xs font-bold text-[#33272A] dark:text-white outline-none cursor-pointer"
                            >
                              <option value="fiber">🌐 สาย Fiber Optic</option>
                              <option value="satellite">📡 อินเทอร์เน็ตดาวเทียม</option>
                              <option value="sim">📱 ซิม 4G/5G Router</option>
                              <option value="none">❌ ไม่ได้ใช้บริการ</option>
                            </select>
                          </div>
                        </div>

                        {/* รายละเอียดเพิ่มเติมกรณีเลือกโซลาร์เซลล์ หรือ Hybrid */}
                        {(cElectricity === 'solar' || cElectricity === 'hybrid') && (
                          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-700 space-y-3 animate-fade-in">
                            <div className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                              ☀️ รายละเอียดระบบโซลาร์เซลล์ / พลังงานแสงอาทิตย์
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-black text-[#33272A] dark:text-[#FFF9F5] mb-1">
                                  กำลังการผลิต (kW)
                                </label>
                                <input
                                  type="text"
                                  placeholder="เช่น 5 kW หรือ 10 kW"
                                  value={cSolarKw}
                                  onChange={(e) => setCSolarKw(e.target.value)}
                                  className="w-full rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#150e10] p-2 px-3 text-xs font-bold text-[#33272A] dark:text-white outline-none"
                                />
                              </div>
                              <div className="flex flex-col justify-center">
                                <label className="block text-xs font-black text-[#33272A] dark:text-[#FFF9F5] mb-1">
                                  ระบบแบตเตอรี่กักเก็บพลังงาน
                                </label>
                                <label className="inline-flex items-center gap-2 cursor-pointer mt-1">
                                  <input
                                    type="checkbox"
                                    checked={cHasSolarBattery}
                                    onChange={(e) => setCHasSolarBattery(e.target.checked)}
                                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                                  />
                                  <span className="text-xs font-bold text-[#33272A] dark:text-[#FFF9F5]">
                                    {cHasSolarBattery ? '🔋 มีแบตเตอรี่กักเก็บพลังงาน' : '❌ ไม่มีแบตเตอรี่'}
                                  </span>
                                </label>
                              </div>
                            </div>

                            {cHasSolarBattery && (
                              <div>
                                <label className="block text-xs font-black text-[#33272A] dark:text-[#FFF9F5] mb-1">
                                  รายละเอียด / ความจุแบตเตอรี่
                                </label>
                                <input
                                  type="text"
                                  placeholder="เช่น 200Ah 48V หรือ แบตเตอรี่ Lithium 10kWh"
                                  value={cSolarBatteryCapacity}
                                  onChange={(e) => setCSolarBatteryCapacity(e.target.value)}
                                  className="w-full rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#150e10] p-2 px-3 text-xs font-bold text-[#33272A] dark:text-white outline-none"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-black text-[#33272A] dark:text-[#FFF9F5] mb-1">
                              ระยะทางจากโรงเรียนหลัก (กม. / สภาพเส้นทาง)
                            </label>
                            <input
                              type="text"
                              placeholder="เช่น 12 กม. (ทางลูกรัง/วิบาก)"
                              value={cDistanceFromMainSchool}
                              onChange={(e) => setCDistanceFromMainSchool(e.target.value)}
                              className="w-full rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#150e10] p-2 px-3 text-xs font-bold text-[#33272A] dark:text-white outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] font-black text-[#33272A] dark:text-[#FFF9F5] mb-1">
                                ละติจูด (Lat)
                              </label>
                              <input
                                type="text"
                                placeholder="19.xxx"
                                value={cLatitude}
                                onChange={(e) => setCLatitude(e.target.value)}
                                className="w-full rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#150e10] p-2 px-2 text-xs font-bold text-[#33272A] dark:text-white outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-black text-[#33272A] dark:text-[#FFF9F5] mb-1">
                                ลองจิจูด (Lng)
                              </label>
                              <input
                                type="text"
                                placeholder="97.xxx"
                                value={cLongitude}
                                onChange={(e) => setCLongitude(e.target.value)}
                                className="w-full rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#150e10] p-2 px-2 text-xs font-bold text-[#33272A] dark:text-white outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-xs font-black text-[#33272A] dark:text-[#FFF9F5] mb-1">
                        หมายเหตุ / คำอธิบายบริบทพื้นที่
                      </label>
                      <textarea
                        rows={2}
                        placeholder="เช่น พื้นที่ห่างไกลเดินทางลำบากช่วงฤดูฝน"
                        value={cNotes}
                        onChange={(e) => setCNotes(e.target.value)}
                        className="w-full rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#150e10] p-2 px-3 text-xs font-bold text-[#33272A] dark:text-white outline-none focus:ring-2 focus:ring-[#FF8BA7]"
                      />
                    </div>
                  </div>
                ) : (
                  /* แท็บ 2: ข้อมูลนักเรียนและจำแนกรายชั้น (อ.1 - ป.6) */
                  <div className="space-y-4">
                    {/* สรุปยอดอัตโนมัติจากการกรอกในตาราง */}
                    <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-[#FF8BA7]" />
                        <span>ยอดรวมนักเรียนห้องเรียนย่อย (คำนวณอัตโนมัติ):</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-600 font-black">ชาย: {cMaleCount || 0} คน</span>
                        <span className="text-rose-500 font-black">หญิง: {cFemaleCount || 0} คน</span>
                        <span className="text-[#33272A] dark:text-white font-black bg-[#A0E7E5] px-2.5 py-0.5 rounded-lg border border-[#33272A]">
                          รวม: {cStudentCount || 0} คน
                        </span>
                      </div>
                    </div>

                    {/* กรอกจำนวนนักเรียนแยกรายชั้นเรียนเฉพาะ อ.1 - ป.6 */}
                    <div>
                      <h5 className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] mb-2 flex items-center gap-1.5">
                        <Grid className="h-4 w-4 text-[#FF8BA7]" /> ตารางระบุจำนวนนักเรียน (อ.1 - ป.6)
                      </h5>
                      <div className="border-2 border-[#33272A] dark:border-[#FFD3B6] rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-[#33272A] text-white dark:bg-[#FFD3B6] dark:text-[#33272A] font-black">
                            <tr>
                              <th className="p-2.5 pl-4">ระดับชั้น</th>
                              <th className="p-2.5 text-center">ชาย (คน)</th>
                              <th className="p-2.5 text-center">หญิง (คน)</th>
                              <th className="p-2.5 text-center">รวม (คน)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-[#150e10]">
                            {['อ.1', 'อ.2', 'อ.3', 'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'].map((grade) => {
                              const currGrade = cGradesBreakdown[grade] || { male: 0, female: 0, total: 0 };
                              return (
                                <tr key={grade}>
                                  <td className="p-2 pl-4 font-black text-[#33272A] dark:text-[#FFF9F5]">{grade}</td>
                                  <td className="p-1.5 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      value={currGrade.male || ''}
                                      onChange={(e) => {
                                        const val = Number(e.target.value) || 0;
                                        const updated = {
                                          ...cGradesBreakdown,
                                          [grade]: {
                                            ...currGrade,
                                            male: val,
                                            total: val + (currGrade.female || 0)
                                          }
                                        };
                                        setCGradesBreakdown(updated);

                                        // Auto sum total male/female/student count
                                        let sumM = 0, sumF = 0;
                                        Object.values(updated).forEach((g: any) => {
                                          sumM += g.male || 0;
                                          sumF += g.female || 0;
                                        });
                                        setCMaleCount(String(sumM));
                                        setCFemaleCount(String(sumF));
                                        setCStudentCount(String(sumM + sumF));
                                      }}
                                      className="w-20 text-center border-2 border-slate-300 dark:border-slate-700 rounded-lg p-1 text-xs font-bold focus:border-[#FF8BA7] outline-none"
                                      placeholder="0"
                                    />
                                  </td>
                                  <td className="p-1.5 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      value={currGrade.female || ''}
                                      onChange={(e) => {
                                        const val = Number(e.target.value) || 0;
                                        const updated = {
                                          ...cGradesBreakdown,
                                          [grade]: {
                                            ...currGrade,
                                            female: val,
                                            total: (currGrade.male || 0) + val
                                          }
                                        };
                                        setCGradesBreakdown(updated);

                                        let sumM = 0, sumF = 0;
                                        Object.values(updated).forEach((g: any) => {
                                          sumM += g.male || 0;
                                          sumF += g.female || 0;
                                        });
                                        setCMaleCount(String(sumM));
                                        setCFemaleCount(String(sumF));
                                        setCStudentCount(String(sumM + sumF));
                                      }}
                                      className="w-20 text-center border-2 border-slate-300 dark:border-slate-700 rounded-lg p-1 text-xs font-bold focus:border-[#FF8BA7] outline-none"
                                      placeholder="0"
                                    />
                                  </td>
                                  <td className="p-2 text-center font-black text-[#FF8BA7] text-sm">
                                    {(currGrade.male || 0) + (currGrade.female || 0)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsClassroomModalOpen(false)}
                    disabled={isSavingClassroom}
                    className="px-4 py-2 text-xs font-black text-slate-600 bg-slate-200 rounded-xl hover:bg-slate-300 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingClassroom}
                    className="btn-cute bg-[#FF8BA7] text-[#33272A] px-5 py-2 text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingClassroom ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>{isSavingClassroom ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal ดูข้อมูลรายละเอียดเฉพาะห้องเรียนย่อย (Detail Viewer Modal) */}
        {viewingBranchDetail && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
            <div className="relative max-w-2xl w-full bg-[#FFF9F5] dark:bg-[#1e1518] border-4 border-[#33272A] dark:border-[#FFD3B6] rounded-3xl p-6 shadow-2xl space-y-4 my-8 animate-scale-up">
              <div className="flex items-center justify-between border-b-2 border-[#33272A] dark:border-[#FFD3B6] pb-3">
                <div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 border border-[#33272A]">
                    🏔️ ข้อมูลห้องเรียนย่อยในพื้นที่ห่างไกล
                  </span>
                  <h3 className="text-lg font-black text-[#33272A] dark:text-[#FFF9F5] mt-1 flex items-center gap-2">
                    {viewingBranchDetail.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-bold">
                    สังกัด: {school.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingBranchDetail(null)}
                  className="p-1 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* สรุปข้อมูลพื้นฐานห้องเรียนย่อย */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-2xl bg-white dark:bg-[#150e10] border-2 border-[#33272A] dark:border-[#FFD3B6]">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">ครูผู้ดูแล:</span>
                  <span className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">
                    {viewingBranchDetail.teacherName || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">บุคลากร:</span>
                  <span className="text-xs font-black text-purple-600 dark:text-purple-300">
                    {viewingBranchDetail.staffCount || 0} คน
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">นักเรียนรวม:</span>
                  <span className="text-xs font-black text-[#FF8BA7]">
                    {viewingBranchDetail.studentCount || 0} คน
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">เบอร์โทรติดต่อ:</span>
                  {viewingBranchDetail.phone ? (
                    <a
                      href={`tel:${viewingBranchDetail.phone.replace(/[^0-9+]/g, '')}`}
                      className="text-xs font-black text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Phone className="h-3 w-3" /> โทรออก ({viewingBranchDetail.phone})
                    </a>
                  ) : (
                    <span className="text-xs font-bold text-slate-400">-</span>
                  )}
                </div>
              </div>

              {/* ข้อมูลระยะทาง พิกัด และสาธารณูปโภค */}
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 text-xs font-bold space-y-1.5">
                <div className="flex items-center justify-between">
                  <span>🚗 ระยะทางจากโรงเรียนหลัก:</span>
                  <span className="font-black text-amber-950 dark:text-amber-100">{viewingBranchDetail.distanceFromMainSchool || "ไม่ระบุ"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>⚡ ระบบไฟฟ้า:</span>
                  <span className="font-black">
                    {viewingBranchDetail.electricity === 'hybrid' ? '⚡☀️ ผสมผสาน (ไฟฟ้า + โซลาร์เซลล์)' : viewingBranchDetail.electricity === 'solar' ? '☀️ โซลาร์เซลล์' : viewingBranchDetail.electricity === 'has_electric' || viewingBranchDetail.electricity === true ? '🔌 มีไฟฟ้าถาวร' : '❌ ไม่มีไฟฟ้า'}
                  </span>
                </div>
                {(viewingBranchDetail.electricity === 'solar' || viewingBranchDetail.electricity === 'hybrid' || viewingBranchDetail.solarKw || viewingBranchDetail.hasSolarBattery) && (
                  <div className="flex items-center justify-between text-amber-900 dark:text-amber-200 pt-1 border-t border-amber-200/60">
                    <span>☀️ ข้อมูลโซลาร์เซลล์:</span>
                    <span className="font-black">
                      {viewingBranchDetail.solarKw ? `${viewingBranchDetail.solarKw} kW` : ''}{' '}
                      {viewingBranchDetail.hasSolarBattery ? `(มีแบต ${viewingBranchDetail.solarBatteryCapacity ? `: ${viewingBranchDetail.solarBatteryCapacity}` : ''})` : '(ไม่มีแบต)'}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span>🌐 ระบบอินเทอร์เน็ต:</span>
                  <span className="font-black">
                    {viewingBranchDetail.internetType === 'satellite' ? '📡 ดาวเทียม' : viewingBranchDetail.internetType === 'sim' ? '📱 SIM 4G' : viewingBranchDetail.internetType === 'fiber' ? '🌐 Fiber' : '❌ ไม่ได้ใช้'}
                  </span>
                </div>
                {viewingBranchDetail.latitude && viewingBranchDetail.longitude && (
                  <div className="flex items-center justify-between pt-1 border-t border-amber-200/60">
                    <span>📍 พิกัด GPS:</span>
                    <span className="font-mono font-black text-slate-700 dark:text-slate-200">
                      {viewingBranchDetail.latitude}, {viewingBranchDetail.longitude}
                    </span>
                  </div>
                )}
              </div>

              {/* ตารางแสดงจำนวนนักเรียนแยกรายชั้นของห้องเรียนย่อย */}
              <div>
                <h5 className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] mb-2 flex items-center gap-1.5">
                  <Grid className="h-4 w-4 text-[#FF8BA7]" /> ตารางนักเรียนแยกรายชั้นเรียนของ {viewingBranchDetail.name}
                </h5>

                {viewingBranchDetail.gradesBreakdown && Object.keys(viewingBranchDetail.gradesBreakdown).length > 0 ? (
                  <div className="border-2 border-[#33272A] dark:border-[#FFD3B6] rounded-2xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#33272A] text-white dark:bg-[#FFD3B6] dark:text-[#33272A] font-black">
                        <tr>
                          <th className="p-2.5 pl-4">ระดับชั้น</th>
                          <th className="p-2.5 text-center">นักเรียนชาย</th>
                          <th className="p-2.5 text-center">นักเรียนหญิง</th>
                          <th className="p-2.5 text-center">รวมทั้งหมด</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-[#150e10]">
                        {Object.entries(viewingBranchDetail.gradesBreakdown).map(([grade, data]: [string, any]) => {
                          if (!data || (data.male === 0 && data.female === 0 && data.total === 0)) return null;
                          return (
                            <tr key={grade} className="hover:bg-amber-50/50">
                              <td className="p-2.5 pl-4 font-black text-[#33272A] dark:text-[#FFF9F5]">{grade}</td>
                              <td className="p-2.5 text-center text-emerald-600 font-bold">{data.male} คน</td>
                              <td className="p-2.5 text-center text-rose-500 font-bold">{data.female} คน</td>
                              <td className="p-2.5 text-center font-black text-[#FF8BA7]">{data.total || (data.male + data.female)} คน</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed">
                    ยังไม่มีข้อมูลตัวเลขแยกรายชั้นเรียนแบบละเอียดสำหรับห้องเรียนย่อยนี้ (ยอดรวม: {viewingBranchDetail.studentCount || 0} คน)
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewingBranchDetail(null)}
                  className="btn-cute bg-[#33272A] text-white dark:bg-[#FFD3B6] dark:text-[#33272A] px-5 py-2 text-xs font-black cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal for Expanded Photo */}
      {expandedImageUrl && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in cursor-zoom-out" 
          onClick={() => setExpandedImageUrl(null)}
        >
          <div 
            className="relative max-w-2xl w-full bg-[#FFF9F5] dark:bg-[#1e1518] border-4 border-[#33272A] dark:border-[#FFD3B6] rounded-3xl p-4 shadow-2xl overflow-hidden animate-scale-up cursor-default" 
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setExpandedImageUrl(null)}
              className="absolute top-4 right-4 bg-[#FF8BA7] text-[#33272A] hover:bg-[#ff7b9c] border-2 border-[#33272A] p-1.5 rounded-full cursor-pointer transition-colors shadow-[2px_2px_0px_0px_#33272A]"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex flex-col items-center gap-4">
              <div className="w-full rounded-2xl overflow-hidden border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-rose-950/20 max-h-[70vh] flex items-center justify-center">
                <img
                  src={expandedImageUrl}
                  alt="รูปขยาย"
                  className="max-h-[65vh] w-auto max-w-full object-contain"
                />
              </div>
              <div className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5 bg-white dark:bg-rose-950/40 border-2 border-[#33272A] dark:border-[#FFD3B6] px-4 py-2 rounded-full shadow-[2px_2px_0px_0px_#33272A] dark:shadow-[2px_2px_0px_0px_#FFD3B6]">
                🏫 {school.name}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
