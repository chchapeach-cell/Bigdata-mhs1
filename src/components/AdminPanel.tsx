import { useState, useEffect, useMemo, ChangeEvent, FormEvent } from 'react';
import { School, StudentData, UserProfile, StudentGData, SystemConfig, InfrastructureOption, ThemeStyle, DesignStyle } from '../types';
import { Shield, Upload, Edit3, UserCheck, Save, AlertCircle, RefreshCw, Phone, Zap, Globe, Droplets, Users, GraduationCap, Building, Database, Trash2, History, List, Key, User, Search, Eye, Layers, FileSpreadsheet, Sparkles, Settings, Plus, ToggleLeft, ToggleRight, Download, CheckCircle2, Activity, Server, Palette, Sun, Moon, Clock, Image as ImageIcon, Lock, Layout, Smartphone, Monitor, Info, AlertTriangle } from 'lucide-react';
import { collection, query, where, getDocs, updateDoc, doc, setDoc, getDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { updatePassword, sendPasswordResetEmail } from 'firebase/auth';
import * as XLSX from 'xlsx';
import { getSchoolSize, SCHOOL_GROUPS_LIST, getAmphoeAndNetwork } from '../utils/initialData';
import DatabaseQuotaMonitor from './DatabaseQuotaMonitor';
import ActiveUserSessionMonitor from './ActiveUserSessionMonitor';
import InfrastructureView from './InfrastructureView';

interface AdminPanelProps {
  userProfile: UserProfile;
  schools: School[];
  studentData: StudentData[];
  studentGData?: StudentGData[];
  onRefreshData: () => Promise<void>;
  systemConfig?: SystemConfig;
  serverStatus?: 'green' | 'yellow' | 'red';
  themeStyle?: ThemeStyle;
  setThemeStyle?: (theme: ThemeStyle) => void;
  designStyle?: DesignStyle;
  setDesignStyle?: (design: DesignStyle) => void;
  isDarkMode?: boolean;
  setIsDarkMode?: (dark: boolean) => void;
}

export default function AdminPanel({
  userProfile,
  schools,
  studentData,
  studentGData = [],
  onRefreshData,
  systemConfig,
  serverStatus = 'green',
  themeStyle = 'pastel',
  setThemeStyle,
  designStyle = 'classic',
  setDesignStyle,
  isDarkMode = false,
  setIsDarkMode
}: AdminPanelProps) {
  const isSuperAdmin = userProfile.role === 'super_admin';

  // เลือกโรงเรียนที่ต้องการแก้ไข (สำหรับ Super Admin สามารถเลือกได้ทั้งหมด ส่วน School Admin จะถูกล็อกไว้ที่โรงเรียนตนเอง)
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(
    isSuperAdmin ? (schools[0]?.id || '') : (userProfile.schoolId || '')
  );

  // State สำหรับการแก้ไขข้อมูลโรงเรียน (School Admin / Super Admin)
  const mySchool = schools.find(s => s.id === selectedSchoolId);
  const [editSchoolName, setEditSchoolName] = useState('');
  const [editAmphoe, setEditAmphoe] = useState('');
  const [editNetworkGroup, setEditNetworkGroup] = useState('');
  const [editInternet, setEditInternet] = useState<School['internetType']>('none');
  const [editElectricity, setEditElectricity] = useState<any>(true);
  const [editWaterSystem, setEditWaterSystem] = useState<string>('government');
  const [editWaterSystemDetail, setEditWaterSystemDetail] = useState<string>('');
  const [editStaffCount, setEditStaffCount] = useState(5);
  const [editDirectorPhone, setEditDirectorPhone] = useState('');
  const [editSchoolPhone, setEditSchoolPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editFacebook, setEditFacebook] = useState('');
  const [editLine, setEditLine] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editDirectorImageUrl, setEditDirectorImageUrl] = useState('');
  const [editSpecialHighlights, setEditSpecialHighlights] = useState('');
  const [editMajorsStr, setEditMajorsStr] = useState('');
  const [editMajorsWithStaff, setEditMajorsWithStaff] = useState<{ name: string; teachersCount: number }[]>([]);
  const [newMajorName, setNewMajorName] = useState('');
  const [newMajorCount, setNewMajorCount] = useState<number>(1);
  const [editSuccess, setEditSuccess] = useState('');
  const [editError, setEditError] = useState('');
  const [isSavingSchool, setIsSavingSchool] = useState(false);

  // --- พาร์ทใหม่: จัดการข้อมูลโปรไฟล์ส่วนตัวของคุณ (Self Profile Editing) ---
  const [selfFirstName, setSelfFirstName] = useState(userProfile.firstName || '');
  const [selfLastName, setSelfLastName] = useState(userProfile.lastName || '');
  const [selfPassword, setSelfPassword] = useState('');
  const [isSavingSelf, setIsSavingSelf] = useState(false);
  const [selfSuccess, setSelfSuccess] = useState('');
  const [selfError, setSelfError] = useState('');

  useEffect(() => {
    if (userProfile) {
      setSelfFirstName(userProfile.firstName || '');
      setSelfLastName(userProfile.lastName || '');
    }
  }, [userProfile]);

  const handleSaveSelfProfile = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingSelf(true);
    setSelfSuccess('');
    setSelfError('');
    try {
      // 1. อัปเดตข้อมูลใน Firestore
      const userRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userRef, {
        firstName: selfFirstName.trim(),
        lastName: selfLastName.trim()
      });

      // 2. อัปเดตรหัสผ่าน (หากกรอกข้อมูล)
      if (selfPassword.trim()) {
        if (selfPassword.trim().length < 6) {
          throw new Error('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
        }
        if (auth.currentUser) {
          await updatePassword(auth.currentUser, selfPassword.trim());
        } else {
          throw new Error('ไม่พบข้อมูลบัญชีผู้ใช้ปัจจุบัน');
        }
      }

      setSelfSuccess('แก้ไขข้อมูลส่วนตัวสำเร็จแล้ว!');
      setSelfPassword('');
      await onRefreshData();
    } catch (err: any) {
      console.error('Failed to update self profile:', err);
      if (err.code === 'auth/requires-recent-login') {
        setSelfError('เนื่องจากการเปลี่ยนรหัสผ่านเป็นเรื่องความปลอดภัยสูง กรุณาออกจากระบบแล้วล็อกอินเข้าใช้งานใหม่อีกครั้งเพื่อเปลี่ยนรหัสผ่าน');
      } else {
        setSelfError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } finally {
      setIsSavingSelf(false);
    }
  };

  // --- พาร์ทใหม่: จัดการสิทธิ์แอดมินและการแก้ไขโดย Super Admin (User Management & Search) ---
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editUserFirstName, setEditUserFirstName] = useState('');
  const [editUserLastName, setEditUserLastName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserSchoolId, setEditUserSchoolId] = useState('');
  const [editUserRole, setEditUserRole] = useState<'super_admin' | 'school_admin'>('school_admin');
  const [isSavingUserEdit, setIsSavingUserEdit] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [userEditError, setUserEditError] = useState('');
  const [userEditSuccess, setUserEditSuccess] = useState('');

  const handleOpenEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setEditUserFirstName(user.firstName || '');
    setEditUserLastName(user.lastName || '');
    setEditUserEmail(user.email || '');
    setEditUserSchoolId(user.schoolId || '');
    setEditUserRole((user.role as 'super_admin' | 'school_admin') || 'school_admin');
    setUserEditError('');
    setUserEditSuccess('');
  };

  const handleSaveUserEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSavingUserEdit(true);
    setUserEditError('');
    setUserEditSuccess('');
    try {
      const userRef = doc(db, 'users', editingUser.uid);
      const matchedSchool = schools.find(s => s.id === editUserSchoolId);
      const updatedData = {
        firstName: editUserFirstName.trim(),
        lastName: editUserLastName.trim(),
        email: editUserEmail.trim(),
        schoolId: editUserSchoolId,
        schoolName: editUserSchoolId === 'all' ? 'สพป.แม่ฮ่องสอน เขต 1' : (matchedSchool ? matchedSchool.name : ''),
        role: editUserRole,
      };
      await updateDoc(userRef, updatedData);
      setUserEditSuccess('อัปเดตข้อมูลผู้ใช้งานเรียบร้อยแล้ว!');
      
      await loadApprovedUsers();
      await loadPendingUsers();
      
      setTimeout(() => {
        setEditingUser(null);
      }, 1500);
    } catch (err: any) {
      console.error('Failed to update user profile:', err);
      setUserEditError('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + err.message);
    } finally {
      setIsSavingUserEdit(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!editingUser || !editingUser.email) return;
    setIsResettingPassword(true);
    setUserEditError('');
    setUserEditSuccess('');
    try {
      await sendPasswordResetEmail(auth, editingUser.email);
      setUserEditSuccess('ส่งอีเมลลิงก์เพื่อรีเซ็ตรหัสผ่านไปยัง ' + editingUser.email + ' เรียบร้อยแล้ว!');
    } catch (err: any) {
      console.error('Failed to send reset password email:', err);
      setUserEditError('เกิดข้อผิดพลาดในการส่งอีเมลรีเซ็ตรหัสผ่าน: ' + err.message);
    } finally {
      setIsResettingPassword(false);
    }
  };

  // เอฟเฟ็กต์สำหรับอัปเดตค่าฟอร์มเมื่อเปลี่ยนโรงเรียนที่ต้องการแก้ไข
  useEffect(() => {
    const targetSchool = schools.find(s => s.id === selectedSchoolId);
    if (targetSchool) {
      setEditSchoolName(targetSchool.name || '');
      setEditAmphoe(targetSchool.amphoe || '');
      setEditNetworkGroup(targetSchool.networkGroup || '');
      setEditInternet(targetSchool.internetType || 'none');
      setEditElectricity(targetSchool.electricity !== undefined ? targetSchool.electricity : true);
      setEditWaterSystem(targetSchool.waterSystem || 'government');
      setEditWaterSystemDetail(targetSchool.waterSystemDetail || '');
      setEditStaffCount(targetSchool.staffCount !== undefined ? targetSchool.staffCount : 5);
      setEditDirectorPhone(targetSchool.directorPhone || '');
      setEditSchoolPhone(targetSchool.schoolPhone || '');
      setEditEmail(targetSchool.email || '');
      setEditFacebook(targetSchool.facebook || '');
      setEditLine(targetSchool.line || '');
      setEditWebsite(targetSchool.website || '');
      setEditAddress(targetSchool.address || '');
      setEditImageUrl(targetSchool.imageUrl || '');
      setEditLogoUrl(targetSchool.logoUrl || '');
      setEditDirectorImageUrl(targetSchool.directorImageUrl || '');
      setEditSpecialHighlights(targetSchool.specialHighlights || '');
      setEditMajorsStr(targetSchool.majorSubjects ? targetSchool.majorSubjects.join(', ') : '');
      
      // อัปเดตวิชาเอกพร้อมจำนวนครู
      if (targetSchool.majorSubjectsWithStaff && targetSchool.majorSubjectsWithStaff.length > 0) {
        setEditMajorsWithStaff(targetSchool.majorSubjectsWithStaff);
      } else if (targetSchool.majorSubjects && targetSchool.majorSubjects.length > 0) {
        setEditMajorsWithStaff(targetSchool.majorSubjects.map(m => ({ name: m, teachersCount: 1 })));
      } else {
        setEditMajorsWithStaff([]);
      }
    }
  }, [selectedSchoolId, schools]);

  // เอฟเฟ็กต์สำหรับกรณีที่โรงเรียนโหลดมาทีหลัง และเลือกโรงเรียนแรกเริ่มต้น (สำหรับ Super Admin)
  useEffect(() => {
    if (isSuperAdmin && !selectedSchoolId && schools.length > 0) {
      setSelectedSchoolId(schools[0].id);
    }
  }, [isSuperAdmin, schools, selectedSchoolId]);

  // เอฟเฟ็กต์สำหรับกรณีเป็น School Admin ให้เลือกโรงเรียนของตนเองเสมอ
  useEffect(() => {
    if (!isSuperAdmin) {
      if (userProfile?.schoolId) {
        setSelectedSchoolId(userProfile.schoolId);
      } else if (userProfile?.schoolName) {
        const matched = schools.find(s => s.name?.trim() === userProfile.schoolName?.trim());
        if (matched) {
          setSelectedSchoolId(matched.id);
        }
      }
    }
  }, [isSuperAdmin, userProfile?.schoolId, userProfile?.schoolName, schools]);

  // คำนวณรายชื่อโรงเรียนที่ผู้ใช้มีสิทธิ์แสดงและจัดการในแผงผู้ดูแลระบบ
  const manageableSchools = useMemo(() => {
    if (isSuperAdmin) {
      return schools;
    }
    if (userProfile?.schoolId) {
      const matched = schools.filter(s => s.id === userProfile.schoolId);
      if (matched.length > 0) return matched;
    }
    if (userProfile?.schoolName) {
      const matchedByName = schools.filter(s => s.name?.trim() === userProfile.schoolName?.trim());
      if (matchedByName.length > 0) return matchedByName;
    }
    return [];
  }, [isSuperAdmin, userProfile, schools]);

  // State สำหรับ Super Admin
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<UserProfile[]>([]);
  const [downloadLogs, setDownloadLogs] = useState<any[]>([]);
  const [adminTab, setAdminTab] = useState<'students_center' | 'schools' | 'users' | 'logs' | 'settings' | 'theme'>(
    isSuperAdmin ? 'students_center' : 'schools'
  );
  const [studentSubTab, setStudentSubTab] = useState<'bigdata' | 'g_students'>('bigdata');
  const [isQuotaDrawerOpen, setIsQuotaDrawerOpen] = useState<boolean>(false);

  // ป้องกันกรณีแอดมินโรงเรียนเข้าถึงเมนูศูนย์ข้อมูลนักเรียน
  useEffect(() => {
    if (!isSuperAdmin && adminTab === 'students_center') {
      setAdminTab('schools');
    }
  }, [isSuperAdmin, adminTab]);

  // State สำหรับจัดการข้อมูลนักเรียนตัว G
  const [gYear, setGYear] = useState<string>('2568');
  const [gSchoolId, setGSchoolId] = useState<string>(selectedSchoolId || '');
  const [gTotalCount, setGTotalCount] = useState<number>(0);
  const [gMaleCount, setGMaleCount] = useState<number>(0);
  const [gFemaleCount, setGFemaleCount] = useState<number>(0);
  const [gNotes, setGNotes] = useState<string>('');
  const [isSavingG, setIsSavingG] = useState<boolean>(false);
  const [gSuccess, setGSuccess] = useState<string>('');
  const [gError, setGError] = useState<string>('');
  const [gSearchQuery, setGSearchQuery] = useState<string>('');

  // State สำหรับการอัปโหลดไฟล์นักเรียนตัว G
  const [gUploadYear, setGUploadYear] = useState<string>('2568');
  const [isUploadingGFile, setIsUploadingGFile] = useState<boolean>(false);
  const [gUploadProgress, setGUploadProgress] = useState<number>(0);
  const [gUploadStatusText, setGUploadStatusText] = useState<string>('');
  const [gProcessedRowsCount, setGProcessedRowsCount] = useState<number>(0);
  const [gTotalRowsCount, setGTotalRowsCount] = useState<number>(0);
  const [gPreviewData, setGPreviewData] = useState<any[]>([]);
  const [gRawRows, setGRawRows] = useState<any[][]>([]);

  // State สำหรับการลบข้อมูลนักเรียนตัว G ตามปีการศึกษา
  const [deleteGYear, setDeleteGYear] = useState<string>('');
  const [isDeletingGYear, setIsDeletingGYear] = useState<boolean>(false);
  const [deleteGError, setDeleteGError] = useState<string>('');
  const [deleteGSuccess, setDeleteGSuccess] = useState<string>('');

  // State สำหรับจัดการและแก้ไขข้อมูลสถิตินักเรียน BIGDATA
  const [bigdataYear, setBigdataYear] = useState<string>('2568');
  const [bigdataSearchQuery, setBigdataSearchQuery] = useState<string>('');
  const [editingStudentDataRecord, setEditingStudentDataRecord] = useState<StudentData | null>(null);
  const [editStudentMale, setEditStudentMale] = useState<number>(0);
  const [editStudentFemale, setEditStudentFemale] = useState<number>(0);
  const [editStudentTotal, setEditStudentTotal] = useState<number>(0);
  const [editStudentClasses, setEditStudentClasses] = useState<number>(0);
  const [isSavingStudentEdit, setIsSavingStudentEdit] = useState<boolean>(false);

  // State สำหรับแก้ไขข้อมูลนักเรียนตัว G (รายโรงเรียน)
  const [editingGRecord, setEditingGRecord] = useState<StudentGData | null>(null);
  const [editGMale, setEditGMale] = useState<number>(0);
  const [editGFemale, setEditGFemale] = useState<number>(0);
  const [editGTotal, setEditGTotal] = useState<number>(0);
  const [editGNotes, setEditGNotes] = useState<string>('');
  const [isSavingGEdit, setIsSavingGEdit] = useState<boolean>(false);

  // คำนวณปีการศึกษาที่มีข้อมูลนักเรียน BIGDATA
  const bigdataAvailableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    if (studentData && studentData.length > 0) {
      studentData.forEach(s => {
        if (s.academicYear && /^\d{4}$/.test(s.academicYear)) {
          yearsSet.add(s.academicYear.trim());
        }
      });
    }
    ['2568', '2567', '2566', '2565', '2564'].forEach(y => yearsSet.add(y));
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [studentData]);

  // ฟังก์ชันสำหรับการแก้ไข/ลบข้อมูลนักเรียน BIGDATA
  const handleOpenEditStudentData = (record: StudentData) => {
    setEditingStudentDataRecord(record);
    setEditStudentMale(record.totalMale || 0);
    setEditStudentFemale(record.totalFemale || 0);
    setEditStudentTotal(record.totalStudents || ((record.totalMale || 0) + (record.totalFemale || 0)));
    const totalRooms = record.grades ? Object.values(record.grades).reduce((acc: number, g: any) => acc + (g?.rooms || 0), 0) : 0;
    setEditStudentClasses(totalRooms);
  };

  const handleSaveStudentDataEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingStudentDataRecord) return;
    setIsSavingStudentEdit(true);
    try {
      const docId = editingStudentDataRecord.id || `${editingStudentDataRecord.schoolId}_${editingStudentDataRecord.academicYear}`;
      const studentDocRef = doc(db, 'students', docId);
      await setDoc(studentDocRef, {
        totalMale: Number(editStudentMale),
        totalFemale: Number(editStudentFemale),
        totalStudents: Number(editStudentTotal),
        updatedAt: new Date()
      }, { merge: true });

      setEditingStudentDataRecord(null);
      await onRefreshData();
    } catch (err: any) {
      console.error('Failed to save student record edit:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + (err.message || 'Permission denied'));
    } finally {
      setIsSavingStudentEdit(false);
    }
  };

  const handleDeleteSingleStudentData = async (record: StudentData) => {
    const docId = record.id || `${record.schoolId}_${record.academicYear}`;
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลสถิตินักเรียนของ "${record.schoolName}" ประจำปีการศึกษา ${record.academicYear}?`)) {
      return;
    }
    try {
      const studentDocRef = doc(db, 'students', docId);
      await deleteDoc(studentDocRef);
      await onRefreshData();
    } catch (err: any) {
      console.error('Failed to delete student record:', err);
      alert('เกิดข้อผิดพลาดในการลบข้อมูล: ' + (err.message || 'Permission denied'));
    }
  };

  // ฟังก์ชันสำหรับการแก้ไขข้อมูลนักเรียนตัว G
  const handleOpenEditGRecord = (g: StudentGData) => {
    setEditingGRecord(g);
    setEditGMale(g.maleGCount || 0);
    setEditGFemale(g.femaleGCount || 0);
    setEditGTotal(g.totalGStudents || ((g.maleGCount || 0) + (g.femaleGCount || 0)));
    setEditGNotes(g.notes || '');
  };

  const handleSaveGRecordEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingGRecord) return;
    setIsSavingGEdit(true);
    try {
      const docId = editingGRecord.id || `${editingGRecord.schoolId}_${editingGRecord.academicYear}`;
      const gDocRef = doc(db, 'students_g', docId);
      await setDoc(gDocRef, {
        maleGCount: Number(editGMale),
        femaleGCount: Number(editGFemale),
        totalGStudents: Number(editGTotal),
        notes: editGNotes.trim(),
        updatedAt: new Date()
      }, { merge: true });

      setEditingGRecord(null);
      await onRefreshData();
    } catch (err: any) {
      console.error('Failed to save G record edit:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + (err.message || 'Permission denied'));
    } finally {
      setIsSavingGEdit(false);
    }
  };

  // คำนวณปีการศึกษาที่มีข้อมูลนักเรียนตัว G (และปีการศึกษาทั่วไป) สำหรับตัวเลือก Dropdown
  const gAvailableYears = useMemo(() => {
    const yearsSet = new Set<string>();

    if (studentGData && studentGData.length > 0) {
      studentGData.forEach(g => {
        if (g.academicYear && /^\d{4}$/.test(g.academicYear)) {
          yearsSet.add(g.academicYear.trim());
        }
      });
    }

    if (studentData && studentData.length > 0) {
      studentData.forEach(s => {
        if (s.academicYear && /^\d{4}$/.test(s.academicYear)) {
          yearsSet.add(s.academicYear.trim());
        }
      });
    }

    ['2568', '2567', '2566', '2565', '2564'].forEach(y => yearsSet.add(y));

    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [studentGData, studentData]);

  // อัปเดตข้อมูลนักเรียนตัว G เมื่อเปลี่ยนโรงเรียนหรือปีการศึกษา
  useEffect(() => {
    const targetId = isSuperAdmin ? gSchoolId : userProfile.schoolId;
    if (!targetId) return;
    const existing = studentGData.find(g => g.schoolId === targetId && g.academicYear === gYear);
    if (existing) {
      setGTotalCount(existing.totalGStudents || 0);
      setGMaleCount(existing.maleGCount || 0);
      setGFemaleCount(existing.femaleGCount || 0);
      setGNotes(existing.notes || '');
    } else {
      setGTotalCount(0);
      setGMaleCount(0);
      setGFemaleCount(0);
      setGNotes('');
    }
  }, [gSchoolId, gYear, studentGData, isSuperAdmin, userProfile]);

  // ฟังก์ชันบันทึกข้อมูลนักเรียนตัว G (รายโรงเรียน)
  const handleSaveStudentG = async (e: FormEvent) => {
    e.preventDefault();
    const targetId = isSuperAdmin ? gSchoolId : userProfile.schoolId;
    if (!targetId) {
      setGError('กรุณาเลือกโรงเรียนที่ต้องการบันทึก');
      return;
    }

    setIsSavingG(true);
    setGError('');
    setGSuccess('');

    try {
      const sch = schools.find(s => s.id === targetId);
      const docId = `${targetId}_${gYear}`;
      const docRef = doc(db, 'students_g', docId);

      await setDoc(docRef, {
        schoolId: targetId,
        schoolName: sch?.name || 'ไม่ระบุ',
        academicYear: gYear,
        totalGStudents: Number(gTotalCount) || 0,
        maleGCount: Number(gMaleCount) || 0,
        femaleGCount: Number(gFemaleCount) || 0,
        notes: gNotes.trim(),
        updatedAt: new Date()
      }, { merge: true });

      setGSuccess(`บันทึกข้อมูลนักเรียนรหัส G ของโรงเรียน "${sch?.name || targetId}" ปีการศึกษา ${gYear} สำเร็จแล้ว!`);
      await onRefreshData();
    } catch (err: any) {
      console.error(err);
      setGError('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + err.message);
    } finally {
      setIsSavingG(false);
    }
  };

  // ฟังก์ชันดาวน์โหลดแบบฟอร์มตัวอย่าง (Template Excel) สำหรับนักเรียนตัว G
  const handleDownloadGTemplate = () => {
    const templateData = [
      {
        'รหัสโรงเรียน': '1058000001',
        'ชื่อสถานศึกษา': 'โรงเรียนอนุบาลแม่ฮ่องสอน',
        'ปีการศึกษา': '2568',
        'จำนวนรวมนักเรียนรหัส G': 22,
        'จำนวนชาย': 12,
        'จำนวนหญิง': 10,
        'หมายเหตุ': 'กลุ่มไม่มีหลักฐานทางทะเบียนราษฎร'
      },
      {
        'รหัสโรงเรียน': '1058000002',
        'ชื่อสถานศึกษา': 'โรงเรียนบ้านปางหมู',
        'ปีการศึกษา': '2568',
        'จำนวนรวมนักเรียนรหัส G': 15,
        'จำนวนชาย': 8,
        'จำนวนหญิง': 7,
        'หมายเหตุ': 'สัญชาติเมียนมา/พื้นที่ชายแดน'
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'นักเรียนตัวG');
    XLSX.writeFile(workbook, 'แบบฟอร์มนำเข้า_นักเรียนรหัสG_สพป_แม่ฮ่องสอน_เขต1.xlsx');
  };

  // ฟังก์ชันพาร์สข้อมูลนักเรียนตัว G จากไฟล์ Excel/CSV หลากหลายรูปแบบ
  const parseGStudentRows = (rows: any[][], defaultYear: string): any[] => {
    if (!rows || rows.length === 0) return [];

    const effectiveYear = (/^\d{4}$/.test(defaultYear) ? defaultYear : '2568').trim();

    // 1. ค้นหาแถวหัวตาราง (Header Row)
    let headerRowIndex = -1;
    let schIdCol = -1;
    let schNameCol = -1;
    let yearCol = -1;
    let maleCol = -1;
    let femaleCol = -1;
    let totalCol = -1;
    let notesCol = -1;

    for (let i = 0; i < Math.min(15, rows.length); i++) {
      const r = rows[i];
      if (!r || !Array.isArray(r)) continue;

      const rowStr = r.map(c => String(c || '').trim()).join(' ');
      if (
        (rowStr.includes('รหัส') || rowStr.includes('โรงเรียน') || rowStr.includes('สถานศึกษา')) &&
        (rowStr.includes('ชื่อ') || rowStr.includes('ชาย') || rowStr.includes('หญิง') || rowStr.includes('รวม') || rowStr.includes('ปี'))
      ) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex !== -1) {
      const hRow = rows[headerRowIndex].map(c => String(c || '').trim());

      // คอลัมน์รหัสโรงเรียน
      schIdCol = hRow.findIndex(c => c.includes('รหัสโรงเรียน') || c.includes('รหัสสถานศึกษา') || c.toLowerCase() === 'school_id' || c.toLowerCase() === 'schoolid');
      if (schIdCol === -1) {
        schIdCol = hRow.findIndex(c => c.includes('รหัส') && !c.includes('เขต') && !c.includes('กลุ่ม') && !c.includes('ไปรษณีย์'));
      }

      // คอลัมน์ชื่อโรงเรียน
      schNameCol = hRow.findIndex(c => c.includes('ชื่อโรงเรียน') || c.includes('ชื่อสถานศึกษา') || c.toLowerCase() === 'school_name' || c.toLowerCase() === 'schoolname');
      if (schNameCol === -1) {
        schNameCol = hRow.findIndex(c => c.includes('ชื่อ') && !c.includes('เขต') && !c.includes('กลุ่ม') && !c.includes('ผู้บันทึก'));
      }

      // คอลัมน์ปีการศึกษา
      yearCol = hRow.findIndex(c => c.includes('ปีการศึกษา') || c === 'ปี');

      // คอลัมน์หมายเหตุ
      notesCol = hRow.findIndex(c => c.includes('หมายเหตุ') || c.includes('note'));

      // คอลัมน์รวมชาย / หญิง / รวมทั้งหมด (วนลูปจากท้ายแถวสำหรับ DMC report)
      for (let c = hRow.length - 1; c >= 0; c--) {
        const text = hRow[c];
        if (!text) continue;

        if (totalCol === -1 && (text.includes('รวมทั้งสิ้น') || text.includes('รวมทั้งหมด') || text.includes('รวม (คน)') || text === 'รวม' || text.includes('รวมจำนวน') || text.includes('รวมนักเรียน'))) {
          totalCol = c;
        }
        if (femaleCol === -1 && (text.includes('หญิง') || text.includes('รวมหญิง')) && (text.includes('รวม') || text.includes('ทั้งหมด') || c >= hRow.length - 5)) {
          femaleCol = c;
        }
        if (maleCol === -1 && (text.includes('ชาย') || text.includes('รวมชาย')) && (text.includes('รวม') || text.includes('ทั้งหมด') || c >= hRow.length - 5)) {
          maleCol = c;
        }
      }
    }

    const results: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      if (i === headerRowIndex) continue;
      const r = rows[i];
      if (!r || !Array.isArray(r) || r.length < 2) continue;

      const strRow = r.map(c => String(c || '').trim());
      const fullText = strRow.join(' ');

      // ข้ามแถวที่ไม่ใช่ข้อมูลโรงเรียน
      if (
        fullText.includes('ตารางแสดง') ||
        fullText.includes('ข้อมูล ณ วันที่') ||
        fullText.includes('รายงานจำนวน') ||
        fullText.includes('รวมทั้งสิ้น') ||
        fullText.includes('รวมทั้งเขต') ||
        fullText.includes('รวมทุกโรงเรียน') ||
        fullText.includes('สังกัด สพป')
      ) {
        continue;
      }

      let rawSchId = '';
      let rawSchName = '';
      let isDmcPattern = false;

      // เช็คแพตเทิร์น DMC Report (ภาพที่ 2):
      // r[0] = รหัสเขต (เช่น 58010000), r[1] = ชื่อเขต (เช่น สพป.แม่ฮ่องสอน เขต 1), r[2] = รหัสโรงเรียน (เช่น 58010001), r[3] = ชื่อโรงเรียน
      const c0 = strRow[0] || '';
      const c1 = strRow[1] || '';
      const c2 = strRow[2] || '';
      const c3 = strRow[3] || '';

      if (c1.includes('สพป.') || c1.includes('เขต') || c1.includes('สพม.') || (/^580\d{5}$/.test(c0) && /^\d{8,10}$/.test(c2))) {
        rawSchId = c2;
        rawSchName = c3;
        isDmcPattern = true;
      } else {
        const targetIdIdx = schIdCol >= 0 ? schIdCol : 0;
        const targetNameIdx = schNameCol >= 0 ? schNameCol : 1;

        rawSchId = strRow[targetIdIdx] || '';
        rawSchName = strRow[targetNameIdx] || '';

        if (/^580\d{5}$/.test(rawSchId) && /^\d{8,10}$/.test(c2)) {
          rawSchId = c2;
          rawSchName = c3 || c1;
          isDmcPattern = true;
        }
      }

      const schId = rawSchId.replace(/\D/g, '');
      let schName = rawSchName.trim();

      if (!schId || schId.length < 4 || rawSchId.includes('รหัส') || rawSchName.includes('ชื่อสถานศึกษา') || rawSchName.includes('ชื่อโรงเรียน')) {
        continue;
      }

      // ค้นหาชื่อโรงเรียนจากรายการหลักในระบบถ้าในไฟล์ไม่มีชื่อ
      if (!schName || /^[\d\s]+$/.test(schName)) {
        const matchedSchool = schools.find(s => s.id === schId || s.id.endsWith(schId) || schId.endsWith(s.id));
        if (matchedSchool) {
          schName = matchedSchool.name;
        }
      }

      // ปีการศึกษา
      let yr = effectiveYear;
      if (yearCol >= 0 && strRow[yearCol] && /^(20|25)\d{2}$/.test(strRow[yearCol])) {
        yr = strRow[yearCol].trim();
      } else if (!isDmcPattern && strRow[2] && /^(20|25)\d{2}$/.test(strRow[2])) {
        yr = strRow[2].trim();
      }

      // ดึงจำนวน ชาย, หญิง, รวม
      let mCount = 0;
      let fCount = 0;
      let tCount = 0;
      let notes = notesCol >= 0 ? (strRow[notesCol] || '') : '';

      if (isDmcPattern) {
        if (totalCol >= 0 && r[totalCol] !== undefined) {
          tCount = Number(r[totalCol]) || 0;
        }
        if (maleCol >= 0 && r[maleCol] !== undefined) {
          mCount = Number(r[maleCol]) || 0;
        }
        if (femaleCol >= 0 && r[femaleCol] !== undefined) {
          fCount = Number(r[femaleCol]) || 0;
        }

        if (tCount === 0 && mCount === 0 && fCount === 0) {
          const numCells = strRow.slice(4).map(v => Number(v)).filter(v => !isNaN(v));
          if (numCells.length >= 3) {
            mCount = numCells[numCells.length - 3] || 0;
            fCount = numCells[numCells.length - 2] || 0;
            tCount = numCells[numCells.length - 1] || 0;
          } else if (numCells.length > 0) {
            tCount = numCells[numCells.length - 1] || 0;
          }
        }
      } else {
        if (totalCol >= 0) tCount = Number(r[totalCol]) || 0;
        if (maleCol >= 0) mCount = Number(r[maleCol]) || 0;
        if (femaleCol >= 0) fCount = Number(r[femaleCol]) || 0;

        if (tCount === 0 && mCount === 0 && fCount === 0) {
          if (strRow[2] && /^(20|25)\d{2}$/.test(strRow[2])) {
            tCount = Number(r[3]) || 0;
            mCount = Number(r[4]) || 0;
            fCount = Number(r[5]) || 0;
            if (!notes) notes = strRow[6] || '';
          } else {
            tCount = Number(r[2]) || 0;
            mCount = Number(r[3]) || 0;
            fCount = Number(r[4]) || 0;
            if (!notes) notes = strRow[5] || '';
          }
        }
      }

      if (tCount === 0 && (mCount > 0 || fCount > 0)) {
        tCount = mCount + fCount;
      }

      results.push({
        schoolId: schId,
        schoolName: schName || `โรงเรียนรหัส ${schId}`,
        academicYear: yr,
        totalGStudents: tCount,
        maleGCount: mCount,
        femaleGCount: fCount,
        notes: notes
      });
    }

    return results;
  };

  // ฟังก์ชันเลือกไฟล์และพาร์สข้อมูลตัวอย่าง (Preview) สำหรับนักเรียนตัว G
  const handleGFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setGPreviewData([]);
      setGRawRows([]);
      return;
    }

    setGError('');
    setGSuccess('');
    setGPreviewData([]);
    setGRawRows([]);

    try {
      const workbook = await parseFileWithEncoding(file);
      const sheetName = workbook.SheetNames?.[0];
      if (!sheetName || !workbook.Sheets?.[sheetName]) {
        throw new Error('ไม่พบข้อมูลในไฟล์ที่เลือก');
      }
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

      if (!rows || rows.length < 1) {
        throw new Error('ไฟล์ไม่มีข้อมูล หรือรูปแบบไม่ถูกต้อง');
      }

      setGRawRows(rows);
      const parsed = parseGStudentRows(rows, gUploadYear);

      if (parsed.length === 0) {
        throw new Error('ไม่พบแถวข้อมูลโรงเรียนที่ถูกต้องในไฟล์ กรุณาตรวจสอบรูปแบบไฟล์');
      }

      setGPreviewData(parsed);
    } catch (err: any) {
      console.error(err);
      setGError('เกิดข้อผิดพลาดในการอ่านไฟล์: ' + err.message);
    }
  };

  // บันทึกการอัพโหลดข้อมูลนักเรียนตัว G จากไฟล์ พร้อม Progress Bar
  const handleGUploadSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (gPreviewData.length === 0) {
      setGError('กรุณาเลือกไฟล์และตรวจสอบตัวอย่างข้อมูลก่อนอัปโหลด');
      return;
    }

    setIsUploadingGFile(true);
    setGError('');
    setGSuccess('');
    setGUploadProgress(0);
    setGProcessedRowsCount(0);
    setGUploadStatusText('กำลังเตรียมข้อมูลนำเข้า...');

    try {
      const total = gPreviewData.length;
      setGTotalRowsCount(total);
      let count = 0;

      for (let i = 0; i < total; i++) {
        const item = gPreviewData[i];
        if (!item.schoolId) continue;

        const yr = item.academicYear || gUploadYear || '2568';

        setGUploadStatusText(`กำลังบันทึก: ${item.schoolName} (ปี ${yr}) [${i + 1}/${total}]`);

        const docId = `${item.schoolId}_${yr}`;
        await setDoc(doc(db, 'students_g', docId), {
          schoolId: item.schoolId,
          schoolName: item.schoolName,
          academicYear: yr,
          totalGStudents: item.totalGStudents || 0,
          maleGCount: item.maleGCount || 0,
          femaleGCount: item.femaleGCount || 0,
          notes: item.notes || '',
          updatedAt: new Date()
        }, { merge: true });

        count++;
        setGProcessedRowsCount(count);
        setGUploadProgress(Math.round((count / total) * 100));

        if (i % 2 === 0 || i === total - 1) {
          await new Promise(r => setTimeout(r, 15));
        }
      }

      setGUploadProgress(100);
      setGUploadStatusText(`นำเข้าข้อมูลนักเรียนตัว G สำเร็จสมบูรณ์ ทั้งหมด ${count} รายการ!`);
      setGSuccess(`นำเข้าข้อมูลนักเรียนตัว G เรียบร้อยแล้ว จำนวน ${count} โรงเรียน ประจำปีการศึกษา ${gUploadYear}`);
      setGPreviewData([]);
      setGRawRows([]);

      const fileInput = document.getElementById('g-upload-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      await onRefreshData();
    } catch (err: any) {
      console.error(err);
      setGError('เกิดข้อผิดพลาดในการนำเข้าข้อมูล: ' + err.message);
    } finally {
      setIsUploadingGFile(false);
    }
  };

  // ฟังก์ชันลบข้อมูลนักเรียนตัว G ตามปีการศึกษา
  const handleDeleteGYear = async (year: string) => {
    if (!isSuperAdmin) {
      setDeleteGError('เฉพาะ Super Admin เท่านั้นที่มีสิทธิ์ลบข้อมูลนักเรียนตัว G รายปีการศึกษา');
      return;
    }

    if (!year) {
      setDeleteGError('กรุณาระบุหรือเลือกปีการศึกษาที่ต้องการลบ');
      return;
    }

    if (!window.confirm(`⚠️ คุณแน่ใจหรือไม่ที่จะลบข้อมูลนักเรียนตัว G ทั้งหมดของปีการศึกษา "${year}"? การดำเนินการนี้ไม่สามารถย้อนกลับได้!`)) {
      return;
    }

    setIsDeletingGYear(true);
    setDeleteGError('');
    setDeleteGSuccess('');

    try {
      const querySnapshot = await getDocs(collection(db, 'students_g'));

      let deletedCount = 0;
      for (const docSnap of querySnapshot.docs) {
        const dData = docSnap.data();
        const dYear = String(dData.academicYear || '').trim();
        const docId = docSnap.id;

        // ลบถ้าตรงกับปีการศึกษา หรือ docId ลงท้ายด้วย _year หรือ docId เท่ากับ year
        if (dYear === year || docId.endsWith(`_${year}`) || docId === year) {
          await deleteDoc(doc(db, 'students_g', docId));
          deletedCount++;
        }
      }

      if (deletedCount === 0) {
        setDeleteGError(`ไม่พบข้อมูลนักเรียนตัว G ของปีการศึกษา ${year} ในฐานข้อมูล`);
      } else {
        setDeleteGSuccess(`ลบข้อมูลนักเรียนตัว G ปีการศึกษา ${year} สำเร็จแล้ว (จำนวน ${deletedCount} รายการ)`);
        setDeleteGYear('');
        await onRefreshData();
      }
    } catch (err: any) {
      console.error(err);
      setDeleteGError('เกิดข้อผิดพลาดในการลบข้อมูลนักเรียนตัว G: ' + err.message);
    } finally {
      setIsDeletingGYear(false);
    }
  };

  // ฟังก์ชันล้างข้อมูลปีการศึกษาที่ไม่ถูกต้อง (เช่น รหัสโรงเรียนที่ถูกบันทึกเป็นปีการศึกษา)
  const handleCleanCorruptGData = async () => {
    if (!isSuperAdmin) return;
    if (!window.confirm('⚠️ คุณต้องการลบข้อมูลนักเรียนตัว G ที่มีปีการศึกษาไม่ถูกต้อง (เช่น รหัสโรงเรียน 58010162) ทั้งหมดออกจากฐานข้อมูลใช่หรือไม่?')) {
      return;
    }

    setIsDeletingGYear(true);
    setDeleteGError('');
    setDeleteGSuccess('');

    try {
      const querySnapshot = await getDocs(collection(db, 'students_g'));
      let deletedCount = 0;

      for (const docSnap of querySnapshot.docs) {
        const dData = docSnap.data();
        const dYear = String(dData.academicYear || '').trim();

        // ถ้าปีการศึกษาไม่ได้มี 4 หลัก (เช่น เป็นรหัสโรงเรียน 8 หลัก)
        if (!dYear || !/^\d{4}$/.test(dYear)) {
          await deleteDoc(doc(db, 'students_g', docSnap.id));
          deletedCount++;
        }
      }

      setDeleteGSuccess(`ล้างข้อมูลปีการศึกษาที่ไม่ถูกต้องสำเร็จแล้ว ทั้งหมด ${deletedCount} รายการ`);
      await onRefreshData();
    } catch (err: any) {
      console.error(err);
      setDeleteGError('เกิดข้อผิดพลาดในการล้างข้อมูล: ' + err.message);
    } finally {
      setIsDeletingGYear(false);
    }
  };

  // ฟังก์ชันลบรายการนักเรียนตัว G แบบรายโรงเรียน
  const handleDeleteSingleGRecord = async (schoolId: string, schoolName: string, academicYear: string) => {
    if (!isSuperAdmin) {
      setGError('เฉพาะ Super Admin เท่านั้นที่มีสิทธิ์ลบข้อมูลนักเรียนตัว G');
      return;
    }

    if (!window.confirm(`⚠️ ยืนยันการลบข้อมูลนักเรียนตัว G ของโรงเรียน "${schoolName}" ปีการศึกษา ${academicYear}?`)) {
      return;
    }
    try {
      const docId = `${schoolId}_${academicYear}`;
      await deleteDoc(doc(db, 'students_g', docId));
      setGSuccess(`ลบข้อมูลนักเรียนตัว G ของ "${schoolName}" เรียบร้อยแล้ว`);
      await onRefreshData();
    } catch (e: any) {
      console.error(e);
      setGError('เกิดข้อผิดพลาดในการลบข้อมูล: ' + e.message);
    }
  };

  // รายชื่อกลุ่มเครือข่ายทั้งหมดในระบบ สำหรับแสดงใน Dropdown (เฉพาะ 14 กลุ่มมาตรฐาน)
  const availableNetworkGroups = useMemo(() => {
    return SCHOOL_GROUPS_LIST.map(g => g.name).sort();
  }, []);

  // สรุปข้อมูลกลุ่มเครือข่ายทั้งหมดสำหรับ Super Admin แก้ไขชื่อกลุ่ม (จำกัดเฉพาะ 14 กลุ่มมาตรฐาน)
  const allNetworkGroupList = useMemo(() => {
    const validGroupNames = new Set(SCHOOL_GROUPS_LIST.map(g => g.name));
    const groupMap: Record<string, { name: string; amphoe: string; schoolCount: number }> = {};

    SCHOOL_GROUPS_LIST.forEach(g => {
      groupMap[g.name] = { name: g.name, amphoe: g.amphoe, schoolCount: 0 };
    });

    schools.forEach(s => {
      let net = s.networkGroup;
      if (!net || !validGroupNames.has(net)) {
        net = getAmphoeAndNetwork(s.id, s.name).networkGroup;
      }
      if (groupMap[net]) {
        groupMap[net].schoolCount++;
      }
    });

    return Object.values(groupMap).sort((a, b) => b.schoolCount - a.schoolCount);
  }, [schools]);

  // State สำหรับ Super Admin แก้ไขชื่อกลุ่มเครือข่าย
  const [editingGroupOldName, setEditingGroupOldName] = useState<string | null>(null);
  const [editingGroupNewName, setEditingGroupNewName] = useState<string>('');
  const [isRenamingGroup, setIsRenamingGroup] = useState<boolean>(false);
  const [renameGroupSuccess, setRenameGroupSuccess] = useState<string>('');
  const [renameGroupError, setRenameGroupError] = useState<string>('');

  const handleRenameNetworkGroup = async (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName.trim()) {
      setEditingGroupOldName(null);
      return;
    }

    const cleanNewName = newName.trim();
    setIsRenamingGroup(true);
    setRenameGroupError('');
    setRenameGroupSuccess('');

    try {
      // ดึงโรงเรียนทั้งหมดที่อยู่ในกลุ่มเดิม
      const affectedSchools = schools.filter(s => {
        const net = s.networkGroup || getAmphoeAndNetwork(s.id, s.name).networkGroup;
        return net === oldName;
      });

      if (affectedSchools.length === 0) {
        setRenameGroupError(`ไม่พบโรงเรียนที่อยู่ในกลุ่ม "${oldName}"`);
        setIsRenamingGroup(false);
        return;
      }

      // อัปเดตข้อมูลทุกโรงเรียนใน Firestore
      for (const school of affectedSchools) {
        const schoolRef = doc(db, 'schools', school.id);
        await updateDoc(schoolRef, {
          networkGroup: cleanNewName
        });
      }

      setRenameGroupSuccess(`เปลี่ยนชื่อกลุ่มเครือข่ายจาก "${oldName}" เป็น "${cleanNewName}" เรียบร้อยแล้ว (อัปเดตโรงเรียน ${affectedSchools.length} แห่ง)`);
      setEditingGroupOldName(null);
      await onRefreshData();
    } catch (err: any) {
      console.error('Failed to rename network group:', err);
      setRenameGroupError('เกิดข้อผิดพลาดในการเปลี่ยนชื่อกลุ่มเครือข่าย: ' + err.message);
    } finally {
      setIsRenamingGroup(false);
    }
  };

  // State สำหรับ Super Admin เพิ่มโรงเรียนใหม่
  const [newSchoolId, setNewSchoolId] = useState('');
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolAmphoe, setNewSchoolAmphoe] = useState('เมืองแม่ฮ่องสอน');
  const [newSchoolNetworkGroup, setNewSchoolNetworkGroup] = useState('');
  const [newSchoolSize, setNewSchoolSize] = useState<School['size']>('small');
  const [newSchoolIsExpansion, setNewSchoolIsExpansion] = useState(false);
  const [newSchoolElectricity, setNewSchoolElectricity] = useState(true);
  const [newSchoolInternet, setNewSchoolInternet] = useState<School['internetType']>('fiber');
  const [newSchoolWaterSystem, setNewSchoolWaterSystem] = useState<string>('government');
  const [newSchoolWaterSystemDetail, setNewSchoolWaterSystemDetail] = useState<string>('');
  const [newSchoolStaffCount, setNewSchoolStaffCount] = useState(5);
  const [newSchoolDirectorPhone, setNewSchoolDirectorPhone] = useState('');
  const [newSchoolPhone, setNewSchoolPhone] = useState('');
  const [newSchoolEmail, setNewSchoolEmail] = useState('');
  const [newSchoolFacebook, setNewSchoolFacebook] = useState('');
  const [newSchoolLine, setNewSchoolLine] = useState('');
  const [newSchoolWebsite, setNewSchoolWebsite] = useState('');
  const [newSchoolAddress, setNewSchoolAddress] = useState('');
  const [newSchoolImageUrl, setNewSchoolImageUrl] = useState('');
  const [newSchoolLat, setNewSchoolLat] = useState('19.3000');
  const [newSchoolLng, setNewSchoolLng] = useState('97.9000');
  const [isAddingSchool, setIsAddingSchool] = useState(false);
  const [addSchoolError, setAddSchoolError] = useState('');
  const [addSchoolSuccess, setAddSchoolSuccess] = useState('');

  const [isResettingData, setIsResettingData] = useState(false);
  const handleResetAllSchoolData = async () => {
    if (!window.confirm('คุณยืนยันที่จะล้างข้อมูลครู บุคลากร ข้อมูลทั่วไป และโครงสร้างพื้นฐานของ "ทุกโรงเรียน" ให้เป็นค่าว่าง (0) ใช่หรือไม่?\n\nการกระทำนี้เพื่อให้เจ้าหน้าที่สามารถเริ่มต้นกรอกข้อมูลของโรงเรียนได้ง่ายขึ้น')) return;
    setIsResettingData(true);
    try {
      let updatedCount = 0;
      for (const school of schools) {
        const schoolRef = doc(db, 'schools', school.id);
        await updateDoc(schoolRef, {
          director: "-",
          phone: "-",
          managerPhone: "-",
          directorPhone: "-",
          schoolPhone: "-",
          imageUrl: "",
          internetType: "none",
          electricity: false,
          staffCount: 0,
          majorSubjects: [],
          majorSubjectsWithStaff: []
        });
        updatedCount++;
      }
      alert(`ล้างข้อมูลสำเร็จแล้วจำนวน ${updatedCount} โรงเรียน\nขณะนี้ข้อมูลต่างๆ เป็น 0 และค่าว่างเพื่อให้เจ้าหน้าที่กรอกข้อมูลใหม่แล้ว`);
      await onRefreshData();
    } catch (err: any) {
      console.error('Failed to reset school data:', err);
      alert('เกิดข้อผิดพลาดในการล้างข้อมูล: ' + err.message);
    } finally {
      setIsResettingData(false);
    }
  };

  // ฟังก์ชันเพิ่มโรงเรียนใหม่
  const handleAddSchoolSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSchoolId.trim() || !newSchoolName.trim()) {
      setAddSchoolError('กรุณาระบุรหัสสถานศึกษาและชื่อสถานศึกษา');
      return;
    }

    setIsAddingSchool(true);
    setAddSchoolError('');
    setAddSchoolSuccess('');

    try {
      const cleanId = newSchoolId.trim();
      const schoolRef = doc(db, 'schools', cleanId);
      
      const newSchoolObj: School = {
        id: cleanId,
        name: newSchoolName.trim(),
        district: 'สพป.แม่ฮ่องสอน เขต 1',
        amphoe: newSchoolAmphoe,
        networkGroup: newSchoolNetworkGroup.trim() || `เครือข่าย ${newSchoolAmphoe}`,
        size: newSchoolSize === 'extra_large' ? 'special_large' : newSchoolSize,
        isExpansion: newSchoolIsExpansion,
        electricity: newSchoolElectricity,
        internetType: newSchoolInternet,
        waterSystem: newSchoolWaterSystem,
        waterSystemDetail: newSchoolWaterSystemDetail.trim(),
        staffCount: Number(newSchoolStaffCount) || 0,
        majorSubjects: [],
        directorPhone: newSchoolDirectorPhone.trim(),
        schoolPhone: newSchoolPhone.trim(),
        email: newSchoolEmail.trim(),
        facebook: newSchoolFacebook.trim(),
        line: newSchoolLine.trim(),
        website: newSchoolWebsite.trim(),
        address: newSchoolAddress.trim(),
        imageUrl: newSchoolImageUrl.trim() || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&auto=format&fit=crop&q=80',
        latitude: parseFloat(newSchoolLat) || 19.3,
        longitude: parseFloat(newSchoolLng) || 97.9,
        classrooms: []
      };

      await setDoc(schoolRef, newSchoolObj, { merge: true });

      setAddSchoolSuccess(`เพิ่มโรงเรียน "${newSchoolName}" (รหัส ${cleanId}) เข้าสู่ระบบเรียบร้อยแล้ว!`);
      setNewSchoolId('');
      setNewSchoolName('');
      setNewSchoolNetworkGroup('');
      setNewSchoolDirectorPhone('');
      setNewSchoolPhone('');
      setNewSchoolImageUrl('');

      await onRefreshData();
    } catch (err: any) {
      console.error(err);
      setAddSchoolError('เกิดข้อผิดพลาดในการเพิ่มโรงเรียน: ' + err.message);
    } finally {
      setIsAddingSchool(false);
    }
  };

  // ฟังก์ชันลบโรงเรียน
  const handleDeleteSchoolAdmin = async (schoolId: string, schoolName: string) => {
    if (!window.confirm(`⚠️ ยืนยันการลบโรงเรียน "${schoolName}" (รหัส ${schoolId}) ออกจากระบบ?\n\nการลบนี้จะมีผลถาวรและไม่สามารถเรียกคืนได้`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'schools', schoolId));
      alert(`ลบโรงเรียน "${schoolName}" เรียบร้อยแล้ว`);
      await onRefreshData();
    } catch (e: any) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการลบโรงเรียน: ' + e.message);
    }
  };
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [uploadYear, setUploadYear] = useState('2568');
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [processedRowsCount, setProcessedRowsCount] = useState(0);
  const [totalRowsCount, setTotalRowsCount] = useState(0);
  const [previewData, setPreviewData] = useState<any[]>([]);

  // State สำหรับการลบข้อมูลรายปีการศึกษา
  const [deleteYear, setDeleteYear] = useState('');
  const [isDeletingYear, setIsDeletingYear] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');

  // นโยบายระบบ และ ตัวเลือกโครงสร้างพื้นฐาน (Super Admin)
  const [contactEnabled, setContactEnabled] = useState<boolean>(
    systemConfig?.contactEnabled ?? true
  );
  const [restrictOneAdminPerSchool, setRestrictOneAdminPerSchool] = useState<boolean>(
    systemConfig?.restrictOneAdminPerSchool ?? true
  );
  const [allowSchoolAdminRegistration, setAllowSchoolAdminRegistration] = useState<boolean>(
    systemConfig?.allowSchoolAdminRegistration ?? true
  );
  const [allowDataDownload, setAllowDataDownload] = useState<boolean>(
    systemConfig?.allowDataDownload ?? true
  );
  const [highTrafficAlertEnabled, setHighTrafficAlertEnabled] = useState<boolean>(
    systemConfig?.highTrafficAlertEnabled ?? true
  );
  const [highTrafficAlertMessage, setHighTrafficAlertMessage] = useState<string>(
    systemConfig?.highTrafficAlertMessage || 'ตอนนี้ระบบ Bigdata มีผู้ใช้งานในระบบจำนวนมาก ให้เข้ามาใหม่ภายหลัง ประมาณ 10 นาที'
  );
  const [simulateRedServerStatus, setSimulateRedServerStatus] = useState<boolean>(
    systemConfig?.simulateRedServerStatus ?? false
  );
  const [electricityOptions, setElectricityOptions] = useState<InfrastructureOption[]>(
    systemConfig?.electricityOptions || [
      { id: 'has_electric', label: '🔌 มีไฟฟ้าถาวร' },
      { id: 'solar', label: '☀️ โซลาร์เซลล์' },
      { id: 'hybrid', label: '⚡☀️ ไฟฟ้าผสมผสาน' },
      { id: 'none', label: '❌ ไม่มีไฟฟ้า' },
    ]
  );
  const [internetOptions, setInternetOptions] = useState<InfrastructureOption[]>(
    systemConfig?.internetOptions || [
      { id: 'fiber', label: '🌐 Fiber Optic' },
      { id: 'satellite', label: '🛰️ จานดาวเทียม' },
      { id: 'sim', label: '📱 SIM 4G/5G' },
      { id: 'none', label: '❌ ไม่มีเน็ต' },
    ]
  );
  const [waterSystemOptions, setWaterSystemOptions] = useState<InfrastructureOption[]>(
    systemConfig?.waterSystemOptions || [
      { id: 'government', label: '🚰 น้ำประปาภาครัฐ' },
      { id: 'mountain', label: '🏔️ น้ำประปาภูเขา' },
      { id: 'none', label: '❌ ไม่มีน้ำใช้' },
      { id: 'other', label: '📌 อื่นๆ' },
    ]
  );

  // --- ตั้งค่ารูปภาพ Header Banner หัวเว็บไซต์ ---
  const [headerBannerUrl, setHeaderBannerUrl] = useState<string>(systemConfig?.headerBannerUrl || '');
  const [headerBannerHeight, setHeaderBannerHeight] = useState<number>(systemConfig?.headerBannerHeight ?? 100);
  const [headerBannerFit, setHeaderBannerFit] = useState<'cover' | 'contain' | 'fill' | 'auto'>(systemConfig?.headerBannerFit || 'contain');
  const [headerBannerEnabled, setHeaderBannerEnabled] = useState<boolean>(systemConfig?.headerBannerEnabled ?? true);

  const handleHeaderBannerUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (!isSuperAdmin) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('ขนาดไฟล์ภาพต้องไม่เกิน 5 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      if (result) {
        setHeaderBannerUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const [newElecId, setNewElecId] = useState('');
  const [newElecLabel, setNewElecLabel] = useState('');
  const [newNetId, setNewNetId] = useState('');
  const [newNetLabel, setNewNetLabel] = useState('');
  const [newWaterId, setNewWaterId] = useState('');
  const [newWaterLabel, setNewWaterLabel] = useState('');

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');

  // Sync states when systemConfig prop updates
  useEffect(() => {
    if (systemConfig) {
      if (systemConfig.contactEnabled !== undefined) setContactEnabled(systemConfig.contactEnabled);
      if (systemConfig.restrictOneAdminPerSchool !== undefined) setRestrictOneAdminPerSchool(systemConfig.restrictOneAdminPerSchool);
      if (systemConfig.allowSchoolAdminRegistration !== undefined) setAllowSchoolAdminRegistration(systemConfig.allowSchoolAdminRegistration);
      if (systemConfig.allowDataDownload !== undefined) setAllowDataDownload(systemConfig.allowDataDownload);
      if (systemConfig.highTrafficAlertEnabled !== undefined) setHighTrafficAlertEnabled(systemConfig.highTrafficAlertEnabled);
      if (systemConfig.highTrafficAlertMessage) setHighTrafficAlertMessage(systemConfig.highTrafficAlertMessage);
      if (systemConfig.simulateRedServerStatus !== undefined) setSimulateRedServerStatus(systemConfig.simulateRedServerStatus);
      if (systemConfig.electricityOptions) setElectricityOptions(systemConfig.electricityOptions);
      if (systemConfig.internetOptions) setInternetOptions(systemConfig.internetOptions);
      if (systemConfig.waterSystemOptions) setWaterSystemOptions(systemConfig.waterSystemOptions);
      if (systemConfig.headerBannerUrl !== undefined) setHeaderBannerUrl(systemConfig.headerBannerUrl);
      if (systemConfig.headerBannerHeight !== undefined) setHeaderBannerHeight(systemConfig.headerBannerHeight);
      if (systemConfig.headerBannerFit !== undefined) setHeaderBannerFit(systemConfig.headerBannerFit);
      if (systemConfig.headerBannerEnabled !== undefined) setHeaderBannerEnabled(systemConfig.headerBannerEnabled);
    }
  }, [systemConfig]);

  // โหลดข้อมูลนโยบายสิทธิ์การรับสมัครจาก Firestore (เฉพาะ Super Admin)
  const loadSystemSettings = async () => {
    if (!isSuperAdmin) return;
    try {
      const configSnap = await getDoc(doc(db, 'settings', 'system_config'));
      if (configSnap.exists()) {
        const data = configSnap.data() as SystemConfig;
        if (data.contactEnabled !== undefined) setContactEnabled(data.contactEnabled);
        if (data.restrictOneAdminPerSchool !== undefined) setRestrictOneAdminPerSchool(data.restrictOneAdminPerSchool);
        if (data.allowSchoolAdminRegistration !== undefined) setAllowSchoolAdminRegistration(data.allowSchoolAdminRegistration);
        if (data.allowDataDownload !== undefined) setAllowDataDownload(data.allowDataDownload);
        if (data.highTrafficAlertEnabled !== undefined) setHighTrafficAlertEnabled(data.highTrafficAlertEnabled);
        if (data.highTrafficAlertMessage) setHighTrafficAlertMessage(data.highTrafficAlertMessage);
        if (data.simulateRedServerStatus !== undefined) setSimulateRedServerStatus(data.simulateRedServerStatus);
        if (data.electricityOptions) setElectricityOptions(data.electricityOptions);
        if (data.internetOptions) setInternetOptions(data.internetOptions);
        if (data.waterSystemOptions) setWaterSystemOptions(data.waterSystemOptions);
        if (data.headerBannerUrl !== undefined) setHeaderBannerUrl(data.headerBannerUrl);
        if (data.headerBannerHeight !== undefined) setHeaderBannerHeight(data.headerBannerHeight);
        if (data.headerBannerFit !== undefined) setHeaderBannerFit(data.headerBannerFit);
        if (data.headerBannerEnabled !== undefined) setHeaderBannerEnabled(data.headerBannerEnabled);
      }
    } catch (e) {
      console.error('Failed to load system settings:', e);
    }
  };

  // บันทึกการตั้งค่าระบบทั้งหมดไปยัง Firestore
  const handleSaveAllSystemConfig = async () => {
    if (!isSuperAdmin) return;
    setIsSavingSettings(true);
    setSettingsSuccess('');
    try {
      const configData = {
        contactEnabled,
        restrictOneAdminPerSchool,
        allowSchoolAdminRegistration,
        allowDataDownload,
        highTrafficAlertEnabled,
        highTrafficAlertMessage,
        simulateRedServerStatus,
        electricityOptions,
        internetOptions,
        waterSystemOptions,
        headerBannerUrl,
        headerBannerHeight,
        headerBannerFit,
        headerBannerEnabled,
        updatedAt: new Date()
      };
      await setDoc(doc(db, 'settings', 'system_config'), configData, { merge: true });
      setSettingsSuccess('บันทึกนโยบายระบบ โครงสร้างพื้นฐาน และแบนเนอร์หัวเว็บสำเร็จ!');
      await onRefreshData();
      setTimeout(() => setSettingsSuccess(''), 4000);
    } catch (e: any) {
      console.error('Failed to save settings:', e);
      alert('เกิดข้อผิดพลาดในการบันทึกนโยบายระบบ: ' + (e.message || ''));
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleToggleSetting = async (key: string, value: boolean) => {
    if (!isSuperAdmin) return;
    setIsSavingSettings(true);
    setSettingsSuccess('');
    try {
      if (key === 'contactEnabled') setContactEnabled(value);
      if (key === 'allowSchoolAdminRegistration') setAllowSchoolAdminRegistration(value);
      if (key === 'restrictOneAdminPerSchool') setRestrictOneAdminPerSchool(value);
      if (key === 'allowDataDownload') setAllowDataDownload(value);
      if (key === 'highTrafficAlertEnabled') setHighTrafficAlertEnabled(value);
      if (key === 'simulateRedServerStatus') setSimulateRedServerStatus(value);
      if (key === 'headerBannerEnabled') setHeaderBannerEnabled(value);

      await setDoc(doc(db, 'settings', 'system_config'), { [key]: value }, { merge: true });
      setSettingsSuccess('อัปเดตนโยบายระบบสำเร็จ!');
      setTimeout(() => setSettingsSuccess(''), 3000);
    } catch (e: any) {
      console.error('Failed to update setting:', e);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // เพิ่มตัวเลือกไฟฟ้า
  const handleAddElectricityOption = () => {
    if (!isSuperAdmin) return;
    if (!newElecLabel.trim()) return;
    const id = newElecId.trim() || `elec_${Date.now()}`;
    if (electricityOptions.some(o => o.id === id)) {
      alert('มีรหัสประเภทไฟฟ้านี้ในระบบแล้ว');
      return;
    }
    const updated = [...electricityOptions, { id, label: newElecLabel.trim() }];
    setElectricityOptions(updated);
    setNewElecId('');
    setNewElecLabel('');
  };

  const handleRemoveElectricityOption = (id: string) => {
    if (!isSuperAdmin) return;
    if (electricityOptions.length <= 1) {
      alert('ต้องมีประเภทไฟฟ้าอย่างน้อย 1 รายการ');
      return;
    }
    setElectricityOptions(prev => prev.filter(o => o.id !== id));
  };

  // เพิ่มตัวเลือกอินเทอร์เน็ต
  const handleAddInternetOption = () => {
    if (!isSuperAdmin) return;
    if (!newNetLabel.trim()) return;
    const id = newNetId.trim() || `net_${Date.now()}`;
    if (internetOptions.some(o => o.id === id)) {
      alert('มีรหัสประเภทอินเทอร์เน็ตนี้ในระบบแล้ว');
      return;
    }
    const updated = [...internetOptions, { id, label: newNetLabel.trim() }];
    setInternetOptions(updated);
    setNewNetId('');
    setNewNetLabel('');
  };

  const handleRemoveInternetOption = (id: string) => {
    if (!isSuperAdmin) return;
    if (internetOptions.length <= 1) {
      alert('ต้องมีประเภทอินเทอร์เน็ตอย่างน้อย 1 รายการ');
      return;
    }
    setInternetOptions(prev => prev.filter(o => o.id !== id));
  };

  // เพิ่มตัวเลือกน้ำประปา
  const handleAddWaterOption = () => {
    if (!isSuperAdmin) return;
    if (!newWaterLabel.trim()) return;
    const id = newWaterId.trim() || `water_${Date.now()}`;
    if (waterSystemOptions.some(o => o.id === id)) {
      alert('มีรหัสประเภทน้ำประปานี้ในระบบแล้ว');
      return;
    }
    const updated = [...waterSystemOptions, { id, label: newWaterLabel.trim() }];
    setWaterSystemOptions(updated);
    setNewWaterId('');
    setNewWaterLabel('');
  };

  const handleRemoveWaterOption = (id: string) => {
    if (!isSuperAdmin) return;
    if (waterSystemOptions.length <= 1) {
      alert('ต้องมีประเภทระบบน้ำประปาอย่างน้อย 1 รายการ');
      return;
    }
    setWaterSystemOptions(prev => prev.filter(o => o.id !== id));
  };

  // ลบข้อมูลรายปีการศึกษา
  const handleDeleteYear = async (year: string) => {
    if (!year || !/^[0-9]{4}$/.test(year)) {
      setDeleteError('กรุณาระบุปีการศึกษาเป็นตัวเลข 4 หลัก เช่น 2567');
      return;
    }

    if (!window.confirm(`⚠️ คุณแน่ใจหรือไม่ที่จะลบข้อมูลสถิตินักเรียนทั้งหมดของปีการศึกษา ${year}? การดำเนินการนี้ไม่สามารถย้อนกลับได้!`)) {
      return;
    }

    setIsDeletingYear(true);
    setDeleteError('');
    setDeleteSuccess('');

    try {
      const q = query(collection(db, 'students'), where('academicYear', '==', year));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setDeleteError(`ไม่พบข้อมูลสถิตินักเรียนของปีการศึกษา ${year} ในฐานข้อมูล`);
        setIsDeletingYear(false);
        return;
      }

      let deletedCount = 0;
      for (const docSnap of querySnapshot.docs) {
        await deleteDoc(doc(db, 'students', docSnap.id));
        deletedCount++;
      }

      setDeleteSuccess(`ลบข้อมูลปีการศึกษา ${year} สำเร็จแล้ว (จำนวน ${deletedCount} โรงเรียน)`);
      setDeleteYear('');
      await onRefreshData(); // รีเฟรชข้อมูลในแอป
    } catch (err: any) {
      console.error(err);
      setDeleteError('เกิดข้อผิดพลาดในการลบข้อมูล: ' + err.message);
    } finally {
      setIsDeletingYear(false);
    }
  };

  // โหลดรายชื่อผู้รออนุมัติสิทธิ์ (เฉพาะ Super Admin)
  const loadPendingUsers = async () => {
    if (!isSuperAdmin) return;
    setIsLoadingUsers(true);
    try {
      const q = query(collection(db, 'users'), where('status', '==', 'pending'));
      let querySnapshot;
      try {
        querySnapshot = await getDocs(q);
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, 'users');
        throw e;
      }
      const list: UserProfile[] = [];
      querySnapshot.forEach(doc => {
        list.push({ ...doc.data(), uid: doc.id } as UserProfile);
      });
      setPendingUsers(list);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadApprovedUsers = async () => {
    if (!isSuperAdmin) return;
    try {
      const q = query(collection(db, 'users'), where('status', '==', 'approved'));
      const querySnapshot = await getDocs(q);
      const list: UserProfile[] = [];
      querySnapshot.forEach(doc => {
        list.push({ ...doc.data(), uid: doc.id } as UserProfile);
      });
      setApprovedUsers(list);
    } catch (e) {
      console.error(e);
    }
  };

  const loadDownloadLogs = async () => {
    if (!isSuperAdmin) return;
    try {
      const q = query(collection(db, 'download_logs'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      const list: any[] = [];
      querySnapshot.forEach(doc => {
        list.push({ ...doc.data(), id: doc.id });
      });
      setDownloadLogs(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadPendingUsers();
      loadApprovedUsers();
      loadDownloadLogs();
      loadSystemSettings();
    }
  }, [isSuperAdmin]);

  // ฟังก์ชันอนุมัติสิทธิ์ / ปฏิเสธสิทธิ์ผู้สมัครแอดมินโรงเรียน
  const handleUserStatusUpdate = async (uid: string, status: 'approved' | 'rejected') => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { status });
      setPendingUsers(prev => prev.filter(u => u.uid !== uid));
      if (status === 'approved') {
        loadApprovedUsers();
      }
      alert(`อัปเดตสถานะของผู้สมัครเรียบร้อยแล้วเป็น: ${status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}`);
    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาดในการอัปเดตสิทธิ์ผู้ใช้');
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งานนี้?')) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      setApprovedUsers(prev => prev.filter(u => u.uid !== uid));
      setPendingUsers(prev => prev.filter(u => u.uid !== uid));
      alert('ลบผู้ใช้งานเรียบร้อยแล้ว');
    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาดในการลบผู้ใช้งาน');
    }
  };

  // บันทึกการแก้ไขข้อมูลสถานศึกษาของ School Admin หรือ Super Admin
  const handleSaveSchoolInfo = async (e: FormEvent) => {
    e.preventDefault();
    const targetId = isSuperAdmin ? selectedSchoolId : userProfile.schoolId;
    if (!targetId) {
      setEditError('ไม่พบรหัสโรงเรียนที่ต้องการแก้ไข');
      return;
    }

    setIsSavingSchool(true);
    setEditSuccess('');
    setEditError('');

    try {
      const schoolRef = doc(db, 'schools', targetId);
      
      // ดึงรายชื่อวิชาเอกจากลิสต์วิชาเอกพร้อมจำนวนครู
      const combinedMajors = editMajorsWithStaff.map(m => m.name);
      const updatedMajorsWithStaff = editMajorsWithStaff;

      const updatedFields = {
        name: editSchoolName,
        amphoe: editAmphoe,
        networkGroup: editNetworkGroup,
        internetType: editInternet,
        electricity: editElectricity,
        waterSystem: editWaterSystem,
        waterSystemDetail: editWaterSystemDetail.trim(),
        staffCount: Number(editStaffCount),
        directorPhone: editDirectorPhone,
        schoolPhone: editSchoolPhone,
        email: editEmail.trim(),
        facebook: editFacebook.trim(),
        line: editLine.trim(),
        website: editWebsite.trim(),
        address: editAddress.trim(),
        imageUrl: editImageUrl,
        logoUrl: editLogoUrl,
        directorImageUrl: editDirectorImageUrl,
        specialHighlights: editSpecialHighlights.trim(),
        majorSubjects: combinedMajors,
        majorSubjectsWithStaff: updatedMajorsWithStaff
      };

      try {
        await updateDoc(schoolRef, updatedFields);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `schools/${targetId}`);
        throw e;
      }
      setEditSuccess('บันทึกข้อมูลพื้นฐานโรงเรียน อำเภอ เครือข่าย และวิชาเอกพร้อมจำนวนครูเรียบร้อยแล้ว!');
      await onRefreshData();
    } catch (error) {
      console.error(error);
      setEditError('ไม่สามารถอัปเดตข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSavingSchool(false);
    }
  };

  // ฟังก์ชันช่วยอ่านไฟล์และตรวจจับการเข้ารหัสอักขระ (UTF-8 และ TIS-620 / Windows-874 สำหรับภาษาไทย)
  const parseFileWithEncoding = (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const arrayBuffer = evt.target?.result as ArrayBuffer;
          const isCsv = file.name.toLowerCase().endsWith('.csv');
          
          let workbook;
          if (isCsv) {
            // ลองดีโค้ดแบบ UTF-8 ก่อน (จะโยนความผิดพลาดหากพบบล็อกไบต์ที่ไม่ถูกต้อง)
            let decodedText = '';
            try {
              const decoderUtf8 = new TextDecoder('utf-8', { fatal: true });
              decodedText = decoderUtf8.decode(arrayBuffer);
            } catch (e) {
              // หากเกิดความผิดพลาด แสดงว่าเป็น TIS-620 / Windows-874
              const decoderTis620 = new TextDecoder('windows-874');
              decodedText = decoderTis620.decode(arrayBuffer);
            }
            workbook = XLSX.read(decodedText, { type: 'string' });
          } else {
            // สำหรับไฟล์ Excel (.xlsx / .xls) อ่านด้วย binary array ปกติ
            workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
          }
          resolve(workbook);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  };

  // พาร์สไฟล์ CSV / Excel สำหรับอัพโหลดข้อมูลนักเรียน
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setUploadSuccess('');
    setPreviewData([]);

    try {
      const workbook = await parseFileWithEncoding(file);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

      // แสดงตัวอย่าง 5 แถวแรก
      if (data.length > 1) {
        setPreviewData(data.slice(0, 6));
      } else {
        setUploadError('ไฟล์ไม่มีข้อมูลหรือรูปแบบไม่ถูกต้อง');
      }
    } catch (err) {
      console.error(err);
      setUploadError('ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบว่าเป็นไฟล์ CSV หรือ Excel (.xlsx) ที่ถูกต้อง');
    }
  };

  // บันทึกการอัพโหลดข้อมูลนักเรียนจากไฟล์ และคํานวณบันทึกลง Firestore dmc-mhs1
  const handleUploadSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (previewData.length === 0) {
      setUploadError('กรุณาเลือกไฟล์และตรวจสอบตัวอย่างข้อมูลก่อนอัปโหลด');
      return;
    }

    setIsUploading(true);
    setUploadError('');
    setUploadSuccess('');
    setUploadProgress(0);
    setProcessedRowsCount(0);
    setUploadStatusText('กำลังเตรียมข้อมูลไฟล์...');

    try {
      // ดึง input file
      const fileInput = document.getElementById('upload-file-input') as HTMLInputElement;
      const file = fileInput?.files?.[0];
      if (!file) {
        setUploadError('ไม่พบไฟล์ที่จะอัปโหลด');
        setIsUploading(false);
        return;
      }

      setUploadStatusText('กำลังเปิดและอ่านโครงสร้างไฟล์...');
      const workbook = await parseFileWithEncoding(file);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

      // กรองเฉพาะแถวที่มีข้อมูลสมบูรณ์
      const validRows = rows.slice(1).filter(r => r && r.length >= 15 && r[2]);
      const totalValid = validRows.length;
      setTotalRowsCount(totalValid);

      if (totalValid === 0) {
        setUploadError('ไม่พบข้อมูลโรงเรียนที่สมบูรณ์ในไฟล์ หรือรูปแบบคอลัมน์ไม่ถูกต้อง');
        setIsUploading(false);
        return;
      }

      let processedCount = 0;

      // วนลูปบันทึกข้อมูลโรงเรียนแต่ละแห่ง
      for (let i = 0; i < validRows.length; i++) {
            const parts = validRows[i];
            const schoolId = String(parts[2]).trim();
            const schoolNameRaw = String(parts[3] || '').trim();
            const cleanSchoolName = schoolNameRaw.replace(/[^\u0E00-\u0E7F0-9a-zA-Z\s]/g, '') || schoolNameRaw;

            setUploadStatusText(`กำลังบันทึก: ${cleanSchoolName} (${i + 1}/${totalValid})`);

            // พาร์สข้อมูลรายชั้น (ตามดัชนีคอลัมน์)
            const k1_male = Number(parts[4]) || 0;
            const k1_female = Number(parts[5]) || 0;
            const k1_total = Number(parts[6]) || 0;
            const k1_rooms = Number(parts[7]) || 0;

            const k2_male = Number(parts[8]) || 0;
            const k2_female = Number(parts[9]) || 0;
            const k2_total = Number(parts[10]) || 0;
            const k2_rooms = Number(parts[11]) || 0;

            const k3_male = Number(parts[12]) || 0;
            const k3_female = Number(parts[13]) || 0;
            const k3_total = Number(parts[14]) || 0;
            const k3_rooms = Number(parts[15]) || 0;

            const p1_male = Number(parts[20]) || 0;
            const p1_female = Number(parts[21]) || 0;
            const p1_total = Number(parts[22]) || 0;
            const p1_rooms = Number(parts[23]) || 0;

            const p2_male = Number(parts[24]) || 0;
            const p2_female = Number(parts[25]) || 0;
            const p2_total = Number(parts[26]) || 0;
            const p2_rooms = Number(parts[27]) || 0;

            const p3_male = Number(parts[28]) || 0;
            const p3_female = Number(parts[29]) || 0;
            const p3_total = Number(parts[30]) || 0;
            const p3_rooms = Number(parts[31]) || 0;

            const p4_male = Number(parts[32]) || 0;
            const p4_female = Number(parts[33]) || 0;
            const p4_total = Number(parts[34]) || 0;
            const p4_rooms = Number(parts[35]) || 0;

            const p5_male = Number(parts[36]) || 0;
            const p5_female = Number(parts[37]) || 0;
            const p5_total = Number(parts[38]) || 0;
            const p5_rooms = Number(parts[39]) || 0;

            const p6_male = Number(parts[40]) || 0;
            const p6_female = Number(parts[41]) || 0;
            const p6_total = Number(parts[42]) || 0;
            const p6_rooms = Number(parts[43]) || 0;

            const m1_male = Number(parts[48]) || 0;
            const m1_female = Number(parts[49]) || 0;
            const m1_total = Number(parts[50]) || 0;
            const m1_rooms = Number(parts[51]) || 0;

            const m2_male = Number(parts[52]) || 0;
            const m2_female = Number(parts[53]) || 0;
            const m2_total = Number(parts[54]) || 0;
            const m2_rooms = Number(parts[55]) || 0;

            const m3_male = Number(parts[56]) || 0;
            const m3_female = Number(parts[57]) || 0;
            const m3_total = Number(parts[58]) || 0;
            const m3_rooms = Number(parts[59]) || 0;

            const totalMale = k1_male + k2_male + k3_male + p1_male + p2_male + p3_male + p4_male + p5_male + p6_male + m1_male + m2_male + m3_male;
            const totalFemale = k1_female + k2_female + k3_female + p1_female + p2_female + p3_female + p4_female + p5_female + p6_female + m1_female + m2_female + m3_female;
            const totalStudents = totalMale + totalFemale;

            const isExpansion = (m1_total + m2_total + m3_total) > 0;

            // บันทึก / อัปเดตข้อมูลสถิตินักเรียนรายโรงเรียนลง Firestore
            const studentDocRef = doc(db, 'students', `${schoolId}_${uploadYear}`);
            try {
              await setDoc(studentDocRef, {
                schoolId,
                schoolName: cleanSchoolName,
                academicYear: uploadYear,
                grades: {
                  "อ.1": { male: k1_male, female: k1_female, total: k1_total, rooms: k1_rooms },
                  "อ.2": { male: k2_male, female: k2_female, total: k2_total, rooms: k2_rooms },
                  "อ.3": { male: k3_male, female: k3_female, total: k3_total, rooms: k3_rooms },
                  "ป.1": { male: p1_male, female: p1_female, total: p1_total, rooms: p1_rooms },
                  "ป.2": { male: p2_male, female: p2_female, total: p2_total, rooms: p2_rooms },
                  "ป.3": { male: p3_male, female: p3_female, total: p3_total, rooms: p3_rooms },
                  "ป.4": { male: p4_male, female: p4_female, total: p4_total, rooms: p4_rooms },
                  "ป.5": { male: p5_male, female: p5_female, total: p5_total, rooms: p5_rooms },
                  "ป.6": { male: p6_male, female: p6_female, total: p6_total, rooms: p6_rooms },
                  "ม.1": { male: m1_male, female: m1_female, total: m1_total, rooms: m1_rooms },
                  "ม.2": { male: m2_male, female: m2_female, total: m2_total, rooms: m2_rooms },
                  "ม.3": { male: m3_male, female: m3_female, total: m3_total, rooms: m3_rooms }
                },
                totalMale,
                totalFemale,
                totalStudents
              });
            } catch (e) {
              handleFirestoreError(e, OperationType.WRITE, `students/${schoolId}_${uploadYear}`);
              throw e;
            }

            // ตรวจสอบข้อมูลโรงเรียนพื้นฐาน ถ้ายังไม่มีให้สร้างขึ้นใหม่
            const schoolDocRef = doc(db, 'schools', schoolId);
            const size: School['size'] = getSchoolSize(totalStudents);

            // บันทึกเฉพาะข้อมูลพื้นฐานโครงสร้างแบบเบื้องต้น
            try {
              await setDoc(schoolDocRef, {
                id: schoolId,
                name: cleanSchoolName,
                district: "สพป.แม่ฮ่องสอน เขต 1",
                size,
                isExpansion,
                latitude: 19.3021 + (Math.random() - 0.5) * 0.4,
                longitude: 97.9654 + (Math.random() - 0.5) * 0.4,
                internetType: 'fiber',
                electricity: true,
                staffCount: Math.max(3, Math.round(totalStudents / 15)),
                directorPhone: "081-2345678",
                schoolPhone: "053-611000",
                imageUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&auto=format&fit=crop&q=60",
                majorSubjects: ["คอมพิวเตอร์/เทคโนโลยี", "คณิตศาสตร์", "ภาษาไทย", "ภาษาอังกฤษ"]
              }, { merge: true });
            } catch (e) {
              handleFirestoreError(e, OperationType.WRITE, `schools/${schoolId}`);
              throw e;
            }

            processedCount++;
            const pct = Math.round((processedCount / totalValid) * 100);
            setProcessedRowsCount(processedCount);
            setUploadProgress(pct);

            // หน่วงเวลาเล็กน้อยเพื่อให้ React อัปเดต UI Progress Bar ได้อย่างสมูท
            if (i % 2 === 0 || i === validRows.length - 1) {
              await new Promise(r => setTimeout(r, 15));
            }
          }

          setUploadProgress(100);
          setUploadStatusText(`นำเข้าสถิตินักเรียนสำเร็จสมบูรณ์ ทั้งหมด ${processedCount} โรงเรียน!`);
          setUploadSuccess(`นำเข้าสถิตินักเรียนเรียบร้อยแล้ว จำนวน ${processedCount} โรงเรียน ประจำปีการศึกษา ${uploadYear}`);
          setPreviewData([]);
          await onRefreshData();
        } catch (err) {
          console.error(err);
          setUploadError('เกิดข้อผิดพลาดในการนำเข้าข้อมูลโรงเรียน กรุณาตรวจสอบรูปแบบคอลัมน์ของไฟล์');
        } finally {
          setIsUploading(false);
        }
      };

  const filteredApprovedUsers = approvedUsers.filter(u => {
    const term = userSearchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      (u.firstName || '').toLowerCase().includes(term) ||
      (u.lastName || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term) ||
      (u.schoolName || '').toLowerCase().includes(term) ||
      (u.schoolId || '').toLowerCase().includes(term)
    );
  });

  const filteredPendingUsers = pendingUsers.filter(u => {
    const term = userSearchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      (u.firstName || '').toLowerCase().includes(term) ||
      (u.lastName || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term) ||
      (u.schoolName || '').toLowerCase().includes(term) ||
      (u.schoolId || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-[#FF8BA7] border-2 border-[#33272A] p-3 text-[#33272A] dark:border-[#FFD3B6]">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#33272A] dark:text-[#FFF9F5]">
              {isSuperAdmin ? 'ระบบจัดการระดับเขตพื้นที่ (Super Admin)' : `ระบบจัดการสถานศึกษา: ${userProfile.schoolName}`}
            </h2>
            <p className="text-xs text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-semibold">แผงควบคุมหลักสำหรับจัดการข้อมูล สิทธิ์ผู้สมัคร และไฟล์นำเข้า BIGDATA</p>
          </div>
        </div>
        {isSuperAdmin && (
          <button
            onClick={handleResetAllSchoolData}
            disabled={isResettingData}
            className="button bg-rose-500 text-white hover:bg-rose-600 border-2 border-[#33272A] dark:border-[#FFD3B6] py-2 px-4 text-xs font-black disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-[2px_2px_0px_0px_#33272A] dark:shadow-[2px_2px_0px_0px_#FFD3B6]"
          >
            <RefreshCw className={`h-4 w-4 ${isResettingData ? 'animate-spin' : ''}`} />
            {isResettingData ? 'กำลังล้างข้อมูล...' : 'ล้างข้อมูลเป็น 0 ทุกโรงเรียน'}
          </button>
        )}
      </div>

      {/* แผงเมนูหลักสำหรับเลือกหน้าการทำงาน (วางบนสุด) */}
      <div className="space-y-4">
        {/* ข้อมูลการเชื่อมต่อฐานข้อมูล MHS1-DMC & Status Badge ขนาดเล็ก */}
        <div className="bg-[#A0E7E5]/25 p-3 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] flex flex-wrap gap-2 items-center justify-between text-[11px] font-black text-[#33272A] dark:text-[#FFF9F5]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${serverStatus === 'red' ? 'bg-rose-400' : serverStatus === 'yellow' ? 'bg-amber-400' : 'bg-emerald-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${serverStatus === 'red' ? 'bg-rose-500' : serverStatus === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
            </span>
            <span>สถานะระบบ: <span className={`font-extrabold ${serverStatus === 'red' ? 'text-rose-600 dark:text-rose-400' : serverStatus === 'yellow' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {serverStatus === 'red' ? '🔴 วิกฤต! ผู้ใช้งานหนาแน่น (High Traffic)' : serverStatus === 'yellow' ? '🟡 เฝ้าระวัง (ภาระการใช้งานสูง)' : '🟢 พร้อมใช้งาน (MHS1-DMC)'}
            </span></span>
            
            {/* Status Badge ขนาดเล็กสำหรับโควตาฐานข้อมูล */}
            <div className="inline-flex items-center gap-1.5 bg-white/80 dark:bg-black/40 px-2.5 py-1 rounded-xl border border-[#33272A]/30 text-[10px] font-bold">
              <Activity className="h-3 w-3 text-emerald-500" />
              <span>โควตาฐานข้อมูล: <strong className="text-emerald-700 dark:text-emerald-300">1.2% Safe</strong></span>
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => setIsQuotaDrawerOpen(true)}
                  className="text-rose-600 dark:text-rose-400 hover:underline font-black cursor-pointer ml-1 text-[10px] bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-300"
                >
                  ดูรายละเอียด ➔
                </button>
              )}
            </div>
          </div>

          <div className="font-bold text-[10px] text-[#33272A]/80 dark:text-[#FFF9F5]/80">
            Project ID: <span className="font-mono bg-white/60 dark:bg-black/30 px-1.5 py-0.5 rounded border border-[#33272A]/20">mhs1-dmc</span>
          </div>
        </div>

        {/* แถบนำทางเมนูหลัก - ปรับปรุงการแสดงผลบนมือถือให้เลื่อนซ้าย-ขวาได้ สะดวก ไม่ล้นจอ */}
        <div className="flex overflow-x-auto pb-1.5 gap-2 no-scrollbar min-w-0 max-w-full touch-pan-x">
          {isSuperAdmin && (
            <button
              onClick={() => setAdminTab('students_center')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-black border-2 border-[#33272A] transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                adminTab === 'students_center' 
                  ? 'bg-[#FF8BA7] text-[#33272A] shadow-[2px_2px_0px_#33272A]' 
                  : 'bg-white text-[#33272A]/70 hover:bg-[#FFD3B6]/30 dark:bg-slate-800 dark:text-[#FFF9F5]/70'
              }`}
            >
              <GraduationCap className="h-4 w-4 text-rose-700 dark:text-rose-300" />
              <span>ศูนย์ข้อมูลนักเรียน</span>
            </button>
          )}

          <button
            onClick={() => {
              setAdminTab('schools');
              if (!isSuperAdmin && userProfile?.schoolId) {
                setSelectedSchoolId(userProfile.schoolId);
              }
            }}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-black border-2 border-[#33272A] transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              adminTab === 'schools' 
                ? 'bg-[#FFAAA5] text-[#33272A] shadow-[2px_2px_0px_#33272A]' 
                : 'bg-white text-[#33272A]/70 hover:bg-[#FFD3B6]/30 dark:bg-slate-800 dark:text-[#FFF9F5]/70'
            }`}
          >
            <Building className="h-4 w-4" />
            <span>{isSuperAdmin ? `รายชื่อโรงเรียน (${schools.length})` : '🏫 โรงเรียนของฉัน'}</span>
          </button>

          {isSuperAdmin && (
            <>
              <button
                onClick={() => setAdminTab('users')}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-black border-2 border-[#33272A] transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  adminTab === 'users' 
                    ? 'bg-[#A0E7E5] text-[#33272A] shadow-[2px_2px_0px_#33272A]' 
                    : 'bg-white text-[#33272A]/70 hover:bg-[#FFD3B6]/30 dark:bg-slate-800 dark:text-[#FFF9F5]/70'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>ทะเบียนผู้ใช้</span>
                {pendingUsers.length > 0 && (
                  <span className="ml-1 bg-rose-500 text-white rounded-full px-2 py-0.5 text-[10px] animate-pulse font-black">
                    {pendingUsers.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setAdminTab('logs')}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-black border-2 border-[#33272A] transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  adminTab === 'logs' 
                    ? 'bg-[#FFD3B6] text-[#33272A] shadow-[2px_2px_0px_#33272A]' 
                    : 'bg-white text-[#33272A]/70 hover:bg-[#FFD3B6]/30 dark:bg-slate-800 dark:text-[#FFF9F5]/70'
                }`}
              >
                <History className="h-4 w-4" />
                <span>ประวัติดาวน์โหลด</span>
              </button>
            </>
          )}

          <button
            onClick={() => setAdminTab('theme')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-black border-2 border-[#33272A] transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              adminTab === 'theme' 
                ? 'bg-[#FF8BA7] text-[#33272A] shadow-[2px_2px_0px_#33272A]' 
                : 'bg-white text-[#33272A]/70 hover:bg-[#FFD3B6]/30 dark:bg-slate-800 dark:text-[#FFF9F5]/70'
            }`}
          >
            <Palette className="h-4 w-4" />
            <span>ธีม/ดีไซน์</span>
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => setAdminTab('settings')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-black border-2 border-[#33272A] transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                adminTab === 'settings' 
                  ? 'bg-[#A0E7E5] text-[#33272A] shadow-[2px_2px_0px_#33272A]' 
                  : 'bg-white text-[#33272A]/70 hover:bg-[#FFD3B6]/30 dark:bg-slate-800 dark:text-[#FFF9F5]/70'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>ตั้งค่าระบบ</span>
            </button>
          )}
        </div>
      </div>

          {adminTab === 'students_center' && (
            isSuperAdmin ? (
              <div className="space-y-6 animate-fade-in min-w-0 max-w-full">
              {/* แถบเมนูกลุ่มย่อยภายในศูนย์ข้อมูลนักเรียน */}
              <div className="card p-3 bg-white dark:bg-[#1e1518] flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between border-2 border-[#33272A] dark:border-[#FFD3B6]">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 min-w-0">
                  <button
                    type="button"
                    onClick={() => setStudentSubTab('bigdata')}
                    className={`px-3 py-2 rounded-xl text-xs font-black border-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      studentSubTab === 'bigdata'
                        ? 'bg-[#FF8BA7] text-[#33272A] border-[#33272A] shadow-[2px_2px_0px_#33272A]'
                        : 'bg-[#FFF9F5] text-[#33272A]/70 border-[#33272A]/30 dark:bg-slate-800 dark:text-[#FFF9F5]/70 dark:border-[#FFD3B6]/30'
                    }`}
                  >
                    <Upload className="h-4 w-4" />
                    <span>1. สถิตินักเรียน BIGDATA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStudentSubTab('g_students')}
                    className={`px-3 py-2 rounded-xl text-xs font-black border-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      studentSubTab === 'g_students'
                        ? 'bg-[#A0E7E5] text-[#33272A] border-[#33272A] shadow-[2px_2px_0px_#33272A]'
                        : 'bg-[#FFF9F5] text-[#33272A]/70 border-[#33272A]/30 dark:bg-slate-800 dark:text-[#FFF9F5]/70 dark:border-[#FFD3B6]/30'
                    }`}
                  >
                    <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                    <span>2. นักเรียนกลุ่มตัว G</span>
                  </button>
                </div>

                <div className="text-[11px] font-black text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 px-3 py-1 rounded-xl border border-rose-200 text-center sm:text-right shrink-0">
                  📍 ศูนย์ข้อมูลนักเรียน สพป.แม่ฮ่องสอน เขต 1
                </div>
              </div>

              {studentSubTab === 'bigdata' && (
                <div className="grid gap-6 md:grid-cols-3 animate-fade-in min-w-0">
                  <div className="md:col-span-1 flex flex-col gap-6">
                    {/* ลบข้อมูลสถิตินักเรียนรายปีการศึกษา */}
                    <div className="card p-6 border-2 border-rose-500/30 bg-[#FFF9F5] dark:bg-rose-950/10">
                      <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5 mb-4 border-b-2 border-[#33272A] pb-3 dark:border-[#FFD3B6]">
                        <Trash2 className="h-4.5 w-4.5 text-rose-500" /> ลบข้อมูลตามปีการศึกษา
                      </h3>
                      <p className="text-[10px] text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-bold leading-relaxed mb-4">
                        เลือกหรือระบุปีการศึกษาเพื่อลบข้อมูลสถิตินักเรียนของทุกโรงเรียนออกทั้งหมด
                      </p>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-[#33272A] dark:text-[#FFF9F5] block">ระบุปีการศึกษา (4 หลัก)</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={deleteYear}
                              onChange={(e) => setDeleteYear(e.target.value)}
                              pattern="[0-9]{4}"
                              placeholder="เช่น 2567"
                              maxLength={4}
                              className="flex-1 rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#1e1518] p-2 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5] outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleDeleteYear(deleteYear)}
                              disabled={isDeletingYear || !deleteYear}
                              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 disabled:text-slate-500 text-white font-black text-xs rounded-xl border-2 border-[#33272A] shadow-[2px_2px_0px_0px_#33272A] cursor-pointer transition-all disabled:shadow-none shrink-0"
                            >
                              {isDeletingYear ? 'กำลังลบ...' : 'ลบข้อมูล'}
                            </button>
                          </div>
                        </div>

                        {/* แสดงรายการปีการศึกษาที่มีอยู่ในฐานข้อมูลเพื่อให้คลิกลบได้สะดวก */}
                        {studentData && studentData.length > 0 && (() => {
                          const yearsInDb = Array.from(new Set(studentData.map(d => d.academicYear))).sort().reverse();
                          if (yearsInDb.length > 0) {
                            return (
                              <div className="pt-2 border-t border-[#33272A]/10 dark:border-[#FFD3B6]/10">
                                <span className="text-[9px] font-black text-[#33272A]/60 dark:text-[#FFF9F5]/60 block mb-1.5">ปีการศึกษาในระบบ (คลิกเพื่อลบ):</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {yearsInDb.map(yr => (
                                    <button
                                      key={yr}
                                      type="button"
                                      onClick={() => {
                                        setDeleteYear(yr);
                                        handleDeleteYear(yr);
                                      }}
                                      className="px-2 py-1 rounded bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/40 border border-rose-300 text-[10px] font-bold text-rose-700 dark:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      {yr}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      {deleteError && (
                        <p className="mt-3 text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-500 text-center animate-fade-in">
                          {deleteError}
                        </p>
                      )}

                      {deleteSuccess && (
                        <p className="mt-3 text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 p-2 rounded-lg border border-emerald-500 text-center animate-fade-in">
                          {deleteSuccess}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* อัปโหลดไฟล์ CSV / Excel */}
                  <div className="card p-6 md:col-span-2">
                    <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5 mb-2 border-b-2 border-[#33272A] pb-3 dark:border-[#FFD3B6]">
                      <Upload className="h-4.5 w-4.5 text-[#FF8BA7]" /> อัปโหลดข้อมูลจำนวนนักเรียน BIGDATA ของทั้งจังหวัด
                    </h3>
                    <p className="text-[11px] text-[#33272A] dark:text-[#FFF9F5] font-bold mb-4 leading-relaxed bg-[#FFD3B6]/20 p-3 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6]">
                      ระบบนี้รองรับไฟล์ Excel (.xlsx) และ CSV ที่มีโครงสร้างเหมือนหัวข้อไฟล์ที่ได้รับ (รวมอนุบาล ประถม ม.1 - ม.3) ข้อมูลจะบันทึกประสานลงในระบบ dmc-mhs1 และแบ่งปันสถิติตตลอดทั้งเขตพื้นที่ สพป.แม่ฮ่องสอน เขต 1
                    </p>
                    <form onSubmit={handleUploadSubmit} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">ระบุปีการศึกษาของไฟล์ที่จะนำเข้า</label>
                          <input
                            type="text"
                            value={uploadYear}
                            onChange={(e) => setUploadYear(e.target.value)}
                            pattern="[0-9]{4}"
                            placeholder="เช่น 2568"
                            required
                            className="w-full rounded-xl border-2 border-[#33272A] bg-white p-2 text-xs font-bold text-[#33272A] dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">เลือกไฟล์ข้อมูล (.xlsx, .csv)</label>
                          <input
                            type="file"
                            id="upload-file-input"
                            accept=".xlsx, .xls, .csv"
                            onChange={handleFileChange}
                            className="w-full rounded-xl border-2 border-[#33272A] bg-white px-2 py-1.5 text-xs text-[#33272A] dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5] font-bold"
                          />
                        </div>
                      </div>
                      {uploadError && (
                        <div className="rounded-2xl bg-rose-50 text-rose-800 border-2 border-[#33272A] p-3 text-xs font-bold flex items-center gap-1.5">
                          <AlertCircle className="h-4.5 w-4.5 text-rose-600" />
                          <span>{uploadError}</span>
                        </div>
                      )}
                      {uploadSuccess && (
                        <div className="rounded-2xl bg-emerald-50 text-emerald-800 border-2 border-[#33272A] p-3 text-xs font-bold">
                          {uploadSuccess}
                        </div>
                      )}
                      {/* แถบอัปโหลด Progress Bar */}
                      {(isUploading || uploadProgress > 0) && (
                        <div className="space-y-2.5 rounded-2xl border-2 border-[#33272A] p-4 bg-[#FFF9F5] dark:bg-[#1e1518] shadow-[3px_3px_0px_#33272A] dark:border-[#FFD3B6] dark:shadow-[3px_3px_0px_#FFD3B6] animate-fade-in">
                          <div className="flex items-center justify-between text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">
                            <div className="flex items-center gap-2">
                              <RefreshCw className={`h-4 w-4 text-[#FF8BA7] ${isUploading ? 'animate-spin' : ''}`} />
                              <span className="truncate max-w-[280px] sm:max-w-md">{uploadStatusText || 'กำลังประมวลผลการอัปโหลด...'}</span>
                            </div>
                            <span className="text-xs font-black text-[#33272A] bg-[#A0E7E5] px-2.5 py-0.5 rounded-lg border-2 border-[#33272A] dark:border-[#FFD3B6]">
                              {uploadProgress}%
                            </span>
                          </div>

                          {/* แถบ Progress Bar สไตล์ Cute Neo-brutalism */}
                          <div className="w-full h-5 rounded-xl border-2 border-[#33272A] bg-white dark:bg-[#150e10] overflow-hidden p-0.5 shadow-inner dark:border-[#FFD3B6]">
                            <div
                              className="h-full rounded-lg bg-gradient-to-r from-[#FF8BA7] via-[#FFD3B6] to-[#A0E7E5] transition-all duration-300 ease-out flex items-center justify-end pr-1"
                              style={{ width: `${Math.max(3, uploadProgress)}%` }}
                            >
                              {uploadProgress > 15 && (
                                <span className="text-[9px] font-black text-[#33272A] drop-shadow-sm select-none">
                                  {uploadProgress}%
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-[10px] font-bold text-[#33272A]/70 dark:text-[#FFF9F5]/70 pt-0.5">
                            <span>รายการที่ประมวลผลแล้ว: {processedRowsCount} / {totalRowsCount} โรงเรียน</span>
                            <span>สถิตินักเรียน ปีการศึกษา {uploadYear}</span>
                          </div>
                        </div>
                      )}

                      {previewData.length > 0 && (
                        <div className="space-y-2 rounded-2xl border-2 border-[#33272A] p-3 bg-[#FFF9F5] dark:bg-slate-800 text-[10px]">
                          <h4 className="font-black text-[#FF8BA7]">ตัวอย่างข้อมูลแถวเริ่มต้นที่จะบันทึก ({previewData.length - 1} แถวตัวอย่าง):</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="border-b border-[#33272A] text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-bold">
                                  {previewData[0]?.slice(0, 6).map((h: any, i: number) => (
                                    <th key={i} className="p-1">{String(h || '').substring(0, 10)}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#33272A]/10 font-bold">
                                {previewData.slice(1, 5).map((row: any, i: number) => (
                                   <tr key={i}>
                                     {row?.slice(0, 6).map((cell: any, ci: number) => (
                                       <td key={ci} className="p-1 text-[#33272A]/80 dark:text-slate-300">{String(cell || '')}</td>
                                     ))}
                                   </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={isUploading || previewData.length === 0}
                          className="btn-cute bg-[#FF8BA7] text-[#33272A] px-5 py-2.5 text-xs font-black flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Upload className="h-4.5 w-4.5" />
                          {isUploading ? 'กำลังประมวลผลและนำเข้า...' : 'นำเข้าไฟล์ข้อมูลสถิติลงระบบหลัก'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* ตารางข้อมูลนักเรียน BIGDATA ในระบบ (แสดง แก้ไข ลบ) - แสดงแบบเต็มหน้าจอ */}
                  <div className="card p-6 space-y-4 col-span-full">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#33272A] pb-3 dark:border-[#FFD3B6]">
                      <div>
                        <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                          <FileSpreadsheet className="h-4.5 w-4.5 text-[#FF8BA7]" />
                          ตารางข้อมูลนักเรียน BIGDATA ({studentData.filter(d => d.academicYear === (bigdataYear || bigdataAvailableYears[0])).length} สถานศึกษา)
                        </h3>
                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                          ตารางแสดงเต็มหน้าจอ - สามารถดู แก้ไขจำนวนนักเรียนรายโรงเรียน หรือลบข้อมูลที่ไม่ถูกต้องได้
                        </p>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="flex items-center gap-1 shrink-0">
                          <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">ปีการศึกษา:</label>
                          <select
                            value={bigdataYear || bigdataAvailableYears[0]}
                            onChange={(e) => setBigdataYear(e.target.value)}
                            className="rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#1e1518] px-2 py-1.5 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5]"
                          >
                            {bigdataAvailableYears.map(yr => (
                              <option key={yr} value={yr}>{yr}</option>
                            ))}
                          </select>
                        </div>

                        <div className="relative w-full sm:w-64">
                          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="ค้นหาชื่อโรงเรียน หรือรหัส..."
                            value={bigdataSearchQuery}
                            onChange={(e) => setBigdataSearchQuery(e.target.value)}
                            className="w-full input-cute pl-8 p-1.5 text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-[#FFF9F5] dark:bg-slate-800 text-[#33272A] dark:text-[#FFF9F5] font-black border-b-2 border-[#33272A] sticky top-0">
                          <tr>
                            <th className="p-2.5">รหัส</th>
                            <th className="p-2.5">ชื่อสถานศึกษา</th>
                            <th className="p-2.5 text-center">ชาย (คน)</th>
                            <th className="p-2.5 text-center">หญิง (คน)</th>
                            <th className="p-2.5 text-center">รวมทั้งหมด (คน)</th>
                            <th className="p-2.5 text-center">จำนวนห้องเรียน</th>
                            <th className="p-2.5 text-center">การจัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 font-bold">
                          {studentData
                            .filter(d => d.academicYear === (bigdataYear || bigdataAvailableYears[0]))
                            .filter(d => !bigdataSearchQuery || (d.schoolName || '').includes(bigdataSearchQuery) || (d.schoolId || '').includes(bigdataSearchQuery))
                            .map((d) => {
                              const totalRooms = d.grades ? Object.values(d.grades).reduce((acc: number, g: any) => acc + (g?.rooms || 0), 0) : 0;
                              return (
                                <tr key={`${d.schoolId}_${d.academicYear}`} className="hover:bg-rose-50/50 dark:hover:bg-slate-800/50">
                                  <td className="p-2.5 font-mono text-[11px]">{d.schoolId}</td>
                                  <td className="p-2.5 font-black text-[#33272A] dark:text-[#FFF9F5]">{d.schoolName}</td>
                                  <td className="p-2.5 text-center text-blue-600 dark:text-blue-400">{d.totalMale || 0}</td>
                                  <td className="p-2.5 text-center text-pink-600 dark:text-pink-400">{d.totalFemale || 0}</td>
                                  <td className="p-2.5 text-center font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 rounded-lg">
                                    {d.totalStudents || 0}
                                  </td>
                                  <td className="p-2.5 text-center text-slate-600 dark:text-slate-300">{totalRooms}</td>
                                  <td className="p-2.5 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditStudentData(d)}
                                        className="p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 rounded-lg border border-teal-300 font-bold flex items-center gap-1 transition-colors cursor-pointer text-[11px]"
                                        title="แก้ไขข้อมูล (Slide-over)"
                                      >
                                        <Edit3 className="h-3.5 w-3.5" /> แก้ไข
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteSingleStudentData(d)}
                                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg border border-rose-300 transition-colors cursor-pointer"
                                        title="ลบรายการสถิตินี้"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          {studentData.filter(d => d.academicYear === (bigdataYear || bigdataAvailableYears[0])).length === 0 && (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                                ยังไม่มีข้อมูลนักเรียน BIGDATA ในปีการศึกษา {bigdataYear || bigdataAvailableYears[0]}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {studentSubTab === 'g_students' && (
                <div className="space-y-6 animate-fade-in">
              {/* ส่วนบน: การลบข้อมูลตามปีการศึกษา & ฟอร์มอัปโหลดไฟล์ใหญ่ */}
              <div className="grid gap-6 md:grid-cols-3">
                {/* ลบข้อมูลนักเรียนตัว G รายปีการศึกษา (เฉพาะ Super Admin) */}
                {isSuperAdmin ? (
                  <div className="card p-6 border-2 border-rose-500/30 bg-[#FFF9F5] dark:bg-rose-950/10 md:col-span-1">
                    <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5 mb-3 border-b-2 border-[#33272A] pb-3 dark:border-[#FFD3B6]">
                      <Trash2 className="h-4.5 w-4.5 text-rose-500" /> ลบข้อมูลนักเรียนตัว G ตามปีการศึกษา
                    </h3>
                    <p className="text-[10px] text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-bold leading-relaxed mb-4">
                      เลือกหรือระบุปีการศึกษาเพื่อลบข้อมูลนักเรียนตัว G (กลุ่มไม่มีหลักฐานทางทะเบียนราษฎร) ของทุกโรงเรียนออกทั้งหมด (สิทธิ์ Super Admin)
                    </p>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-[#33272A] dark:text-[#FFF9F5] block">ระบุปีการศึกษา (4 หลัก)</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={deleteGYear}
                            onChange={(e) => setDeleteGYear(e.target.value)}
                            pattern="[0-9]{4}"
                            placeholder="เช่น 2568"
                            maxLength={4}
                            className="flex-1 rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#1e1518] p-2 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5] outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteGYear(deleteGYear)}
                            disabled={isDeletingGYear || !deleteGYear}
                            className="px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 disabled:text-slate-500 text-white font-black text-xs rounded-xl border-2 border-[#33272A] shadow-[2px_2px_0px_0px_#33272A] cursor-pointer transition-all disabled:shadow-none shrink-0"
                          >
                            {isDeletingGYear ? 'กำลังลบ...' : 'ลบข้อมูล'}
                          </button>
                        </div>
                      </div>

                      {/* แสดงรายการปีการศึกษาของนักเรียนตัว G ที่มีอยู่ในฐานข้อมูล */}
                      {studentGData && studentGData.length > 0 && (() => {
                        const validYearsInGDb = Array.from(new Set(studentGData.map(d => d.academicYear)))
                          .filter(yr => yr && /^\d{4}$/.test(yr))
                          .sort()
                          .reverse();
                        const invalidYearsInGDb = Array.from(new Set(studentGData.map(d => d.academicYear)))
                          .filter(yr => yr && !/^\d{4}$/.test(yr));

                        return (
                          <div className="pt-2 border-t border-[#33272A]/10 dark:border-[#FFD3B6]/10 space-y-2">
                            {validYearsInGDb.length > 0 && (
                              <div>
                                <span className="text-[9px] font-black text-[#33272A]/60 dark:text-[#FFF9F5]/60 block mb-1.5">
                                  ปีการศึกษาที่มีข้อมูลตัว G (คลิกเพื่อลบ):
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {validYearsInGDb.map(yr => (
                                    <button
                                      key={yr}
                                      type="button"
                                      onClick={() => {
                                        setDeleteGYear(yr);
                                        handleDeleteGYear(yr);
                                      }}
                                      className="px-2 py-1 rounded bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/40 border border-rose-300 text-[10px] font-bold text-rose-700 dark:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      ปี {yr}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {invalidYearsInGDb.length > 0 && (
                              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 space-y-1.5">
                                <div className="flex items-center justify-between text-[10px] font-bold text-amber-800 dark:text-amber-300">
                                  <span>⚠️ พบข้อมูลปีการศึกษาผิดพลาด {invalidYearsInGDb.length} รายการ</span>
                                  <button
                                    type="button"
                                    onClick={handleCleanCorruptGData}
                                    disabled={isDeletingGYear}
                                    className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[9px] font-black cursor-pointer transition-colors"
                                  >
                                    ล้างข้อมูลที่ไม่ถูกต้องทั้งหมด
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {invalidYearsInGDb.map(invYr => (
                                    <span key={invYr} className="px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-[9px] font-mono text-amber-900 dark:text-amber-100">
                                      {invYr}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {deleteGError && (
                      <p className="mt-3 text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-500 text-center animate-fade-in">
                        {deleteGError}
                      </p>
                    )}

                    {deleteGSuccess && (
                      <p className="mt-3 text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 p-2 rounded-lg border border-emerald-500 text-center animate-fade-in">
                        {deleteGSuccess}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="card p-6 border-2 border-slate-200 bg-slate-50 dark:bg-slate-900/30 dark:border-slate-800 md:col-span-1 flex flex-col justify-center items-center text-center">
                    <Trash2 className="h-8 w-8 text-slate-400 mb-2" />
                    <h3 className="text-xs font-black text-slate-600 dark:text-slate-300 mb-1">ลบข้อมูลนักเรียนตัว G</h3>
                    <p className="text-[10px] text-slate-400 font-bold">สิทธิ์ในการลบข้อมูลนักเรียนตัว G เป็นของ Super Admin เท่านั้น</p>
                  </div>
                )}

                {/* อัปโหลดไฟล์ Excel / CSV รวมทุกโรงเรียนสำหรับนักเรียนตัว G */}
                <div className="card p-6 md:col-span-2 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#33272A] pb-3 dark:border-[#FFD3B6]">
                    <div>
                      <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                        <Upload className="h-4.5 w-4.5 text-blue-500" /> อัปโหลดข้อมูลนักเรียนตัว G (ไฟล์ Excel/CSV)
                      </h3>
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                        ระบบรองรับไฟล์ Excel (.xlsx) และ CSV ของทั้งจังหวัด ประจำปีการศึกษาที่ระบุ
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadGTemplate}
                      className="px-3 py-1.5 text-[11px] font-black bg-[#A0E7E5] text-[#33272A] hover:bg-[#88d9d7] rounded-xl border-2 border-[#33272A] shadow-[2px_2px_0px_0px_#33272A] flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" /> ดาวน์โหลดแบบฟอร์มตัวอย่าง (Excel)
                    </button>
                  </div>

                  <form onSubmit={handleGUploadSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">ระบุปีการศึกษาที่จะนำเข้า</label>
                        <input
                          type="text"
                          value={gUploadYear}
                          onChange={(e) => {
                            const newYear = e.target.value;
                            setGUploadYear(newYear);
                            if (gRawRows.length > 0) {
                              const reParsed = parseGStudentRows(gRawRows, newYear);
                              setGPreviewData(reParsed);
                            }
                          }}
                          pattern="[0-9]{4}"
                          placeholder="เช่น 2568"
                          required
                          className="w-full rounded-xl border-2 border-[#33272A] bg-white p-2 text-xs font-bold text-[#33272A] dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">เลือกไฟล์ข้อมูล (.xlsx, .csv)</label>
                        <input
                          type="file"
                          id="g-upload-file-input"
                          accept=".xlsx, .xls, .csv"
                          onChange={handleGFileSelect}
                          className="w-full rounded-xl border-2 border-[#33272A] bg-white px-2 py-1.5 text-xs text-[#33272A] dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5] font-bold"
                        />
                      </div>
                    </div>

                    {gError && (
                      <div className="rounded-2xl bg-rose-50 text-rose-800 border-2 border-[#33272A] p-3 text-xs font-bold flex items-center gap-1.5">
                        <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
                        <span>{gError}</span>
                      </div>
                    )}
                    {gSuccess && (
                      <div className="rounded-2xl bg-emerald-50 text-emerald-800 border-2 border-[#33272A] p-3 text-xs font-bold">
                        {gSuccess}
                      </div>
                    )}

                    {/* แถบอัปโหลด Progress Bar */}
                    {(isUploadingGFile || gUploadProgress > 0) && (
                      <div className="space-y-2.5 rounded-2xl border-2 border-[#33272A] p-4 bg-[#FFF9F5] dark:bg-[#1e1518] shadow-[3px_3px_0px_#33272A] dark:border-[#FFD3B6] dark:shadow-[3px_3px_0px_#FFD3B6] animate-fade-in">
                        <div className="flex items-center justify-between text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">
                          <div className="flex items-center gap-2">
                            <RefreshCw className={`h-4 w-4 text-blue-500 ${isUploadingGFile ? 'animate-spin' : ''}`} />
                            <span className="truncate max-w-[280px] sm:max-w-md">{gUploadStatusText || 'กำลังประมวลผลข้อมูล...'}</span>
                          </div>
                          <span className="text-xs font-black text-[#33272A] bg-[#A0E7E5] px-2.5 py-0.5 rounded-lg border-2 border-[#33272A] dark:border-[#FFD3B6]">
                            {gUploadProgress}%
                          </span>
                        </div>

                        {/* แถบ Progress Bar */}
                        <div className="w-full h-5 rounded-xl border-2 border-[#33272A] bg-white dark:bg-[#150e10] overflow-hidden p-0.5 shadow-inner dark:border-[#FFD3B6]">
                          <div
                            className="h-full rounded-lg bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 transition-all duration-300 ease-out flex items-center justify-end pr-1"
                            style={{ width: `${Math.max(3, gUploadProgress)}%` }}
                          >
                            {gUploadProgress > 15 && (
                              <span className="text-[9px] font-black text-[#33272A] drop-shadow-sm select-none">
                                {gUploadProgress}%
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[10px] font-bold text-[#33272A]/70 dark:text-[#FFF9F5]/70 pt-0.5">
                          <span>รายการที่ประมวลผลแล้ว: {gProcessedRowsCount} / {gTotalRowsCount} โรงเรียน</span>
                          <span>ข้อมูลนักเรียนตัว G ปีการศึกษา {gUploadYear}</span>
                        </div>
                      </div>
                    )}

                    {/* แสดงตัวอย่างข้อมูล (Preview Table) */}
                    {gPreviewData.length > 0 && (
                      <div className="space-y-2 rounded-2xl border-2 border-[#33272A] p-3 bg-[#FFF9F5] dark:bg-slate-800 text-[10px]">
                        <div className="flex justify-between items-center">
                          <h4 className="font-black text-blue-600 dark:text-blue-400">
                            ตัวอย่างข้อมูลที่จะนำเข้า (พบบันทึกทั้งหมด {gPreviewData.length} โรงเรียน):
                          </h4>
                          <span className="text-[9px] bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded font-black">
                            {gPreviewData.length} แถว
                          </span>
                        </div>
                        <div className="overflow-x-auto max-h-[220px]">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b-2 border-[#33272A] text-[#33272A] dark:text-[#FFF9F5] font-black bg-blue-50/50 dark:bg-slate-700">
                                <th className="p-1.5">รหัสโรงเรียน</th>
                                <th className="p-1.5">ชื่อสถานศึกษา</th>
                                <th className="p-1.5 text-center">ปีการศึกษา</th>
                                <th className="p-1.5 text-center">รวม (คน)</th>
                                <th className="p-1.5 text-center">ชาย</th>
                                <th className="p-1.5 text-center">หญิง</th>
                                <th className="p-1.5">หมายเหตุ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#33272A]/10 font-bold">
                              {gPreviewData.slice(0, 10).map((row: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-100 dark:hover:bg-slate-700/50">
                                  <td className="p-1 font-mono text-blue-600 font-bold">{row.schoolId}</td>
                                  <td className="p-1 font-bold">{row.schoolName}</td>
                                  <td className="p-1 text-center font-bold text-amber-600 dark:text-amber-400">{row.academicYear}</td>
                                  <td className="p-1 text-center font-black text-blue-600">{row.totalGStudents}</td>
                                  <td className="p-1 text-center">{row.maleGCount}</td>
                                  <td className="p-1 text-center">{row.femaleGCount}</td>
                                  <td className="p-1 text-slate-500">{row.notes || '-'}</td>
                                </tr>
                              ))}
                              {gPreviewData.length > 10 && (
                                <tr>
                                  <td colSpan={7} className="p-1.5 text-center text-slate-500 font-semibold italic bg-slate-50 dark:bg-slate-800">
                                    ... และอีก {gPreviewData.length - 10} รายการ ...
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={isUploadingGFile || gPreviewData.length === 0}
                        className="btn-cute bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 text-xs font-black flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <Upload className="h-4.5 w-4.5" />
                        {isUploadingGFile ? 'กำลังบันทึกลงระบบ...' : 'ยืนยันนำเข้าข้อมูลนักเรียนตัว G ลงฐานข้อมูล'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* ตารางแสดงรายการข้อมูลนักเรียนรหัส G ที่อยู่ในระบบ */}
              <div className="card p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#33272A] pb-3 dark:border-[#FFD3B6]">
                  <div>
                    <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                      <Users className="h-4.5 w-4.5 text-blue-500" />
                      ตารางข้อมูลนักเรียนตัว G ({studentGData.filter(g => g.academicYear === gYear).length} โรงเรียนในปี {gYear})
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                      สถิตินักเรียนไม่มีหลักฐานทางทะเบียนราษฎร (แยกส่วนจาก DMC)
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-1 shrink-0">
                      <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">ปีการศึกษา:</label>
                      <select
                        value={gYear}
                        onChange={(e) => setGYear(e.target.value)}
                        className="rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#1e1518] px-2 py-1.5 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5]"
                      >
                        {gAvailableYears.map(yr => (
                          <option key={yr} value={yr}>{yr}</option>
                        ))}
                      </select>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="ค้นหาชื่อโรงเรียน หรือรหัส..."
                        value={gSearchQuery}
                        onChange={(e) => setGSearchQuery(e.target.value)}
                        className="w-full input-cute pl-8 p-1.5 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FFF9F5] dark:bg-slate-800 text-[#33272A] dark:text-[#FFF9F5] font-black border-b-2 border-[#33272A] sticky top-0">
                        <tr>
                          <th className="p-2">รหัส</th>
                          <th className="p-2">ชื่อสถานศึกษา</th>
                          <th className="p-2 text-center">ชาย</th>
                          <th className="p-2 text-center">หญิง</th>
                          <th className="p-2 text-center">รวม (คน)</th>
                          <th className="p-2">หมายเหตุ</th>
                          <th className="p-2 text-center">การจัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700 font-bold">
                        {studentGData
                          .filter(g => g.academicYear === gYear)
                          .filter(g => !gSearchQuery || (g.schoolName || '').includes(gSearchQuery) || (g.schoolId || '').includes(gSearchQuery))
                          .map((g) => (
                            <tr key={`${g.schoolId}_${g.academicYear}`} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50">
                              <td className="p-2 font-mono text-[11px]">{g.schoolId}</td>
                              <td className="p-2 font-black text-[#33272A] dark:text-[#FFF9F5]">{g.schoolName}</td>
                              <td className="p-2 text-center text-blue-600 dark:text-blue-400">{g.maleGCount || 0}</td>
                              <td className="p-2 text-center text-pink-600 dark:text-pink-400">{g.femaleGCount || 0}</td>
                              <td className="p-2 text-center font-black text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                {g.totalGStudents || 0}
                              </td>
                              <td className="p-2 text-[10px] text-slate-500">{g.notes || '-'}</td>
                              <td className="p-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditGRecord(g)}
                                    className="p-1 text-teal-600 hover:text-teal-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded transition-colors cursor-pointer"
                                    title="แก้ไขจำนวนนักเรียนตัว G"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSingleGRecord(g.schoolId, g.schoolName, g.academicYear)}
                                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                                    title="ลบรายการโรงเรียนนี้"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        {studentGData.filter(g => g.academicYear === gYear).length === 0 && (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                              ยังไม่มีข้อมูลนักเรียนตัว G ในปีการศึกษา {gYear}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card p-6 bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-300 text-rose-900 dark:text-rose-200 space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
              <h3 className="font-black text-sm">จำกัดสิทธิ์การเข้าถึง</h3>
            </div>
            <p className="text-xs font-bold">
              เมนูศูนย์ข้อมูลนักเรียน (Student Data Center) อนุญาตให้เฉพาะผู้ใช้งานระดับ Super Admin จัดการและเข้าถึงได้เท่านั้น
            </p>
          </div>
        )
      )}

          {adminTab === 'system_status' && (
            <div className="space-y-6 animate-fade-in">
              {/* 1. ผู้ใช้งานออนไลน์ขณะนี้ (Active Online Users - Live) */}
              <ActiveUserSessionMonitor currentUserProfile={userProfile} />

              {/* 2. สถานะทรัพยากรและโควตาฐานข้อมูล (Database Quota & Storage) */}
              <DatabaseQuotaMonitor 
                studentData={studentData} 
                studentGData={studentGData} 
                userProfiles={approvedUsers} 
                schools={schools} 
              />

              {/* 3. สถานะ Server และโครงสร้างพื้นฐานสถานศึกษา (Server & School Infrastructure Status) */}
              <InfrastructureView 
                schools={schools} 
                onSelectSchool={(schoolId) => {
                  setAdminTab('schools');
                }}
                systemConfig={{
                  allowDataDownload,
                  electricityOptions,
                  internetOptions
                }}
                userProfile={userProfile}
              />
            </div>
          )}

          {adminTab === 'users' && (
            <div className="space-y-6 animate-fade-in">
              {/* แถบค้นหาข้อมูลผู้ใช้งาน */}
              <div className="card p-4">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-4 w-4 text-[#33272A]/50 dark:text-[#FFF9F5]/50" />
                  </span>
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อผู้ใช้งาน อีเมล รหัสโรงเรียน หรือชื่อโรงเรียนสังกัด..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full pl-10 rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {/* คำร้องรออนุมัติ */}
                <div className="card p-6 md:col-span-1">
                  <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5 mb-4 border-b-2 border-[#33272A] pb-3 dark:border-[#FFD3B6]">
                    <UserCheck className="h-4.5 w-4.5 text-[#FF8BA7]" /> คำร้องสมัครสิทธิ์ ({filteredPendingUsers.length})
                  </h3>
                  {isLoadingUsers ? (
                    <div className="flex justify-center p-8 text-[#33272A] dark:text-[#FFF9F5] text-xs font-black gap-1.5 items-center">
                      <RefreshCw className="h-4 w-4 animate-spin" /> กำลังโหลดคำร้อง...
                    </div>
                  ) : filteredPendingUsers.length > 0 ? (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                      {filteredPendingUsers.map(user => (
                        <div key={user.uid} className="p-3 bg-[#FFF9F5] dark:bg-slate-800 rounded-2xl border-2 border-[#33272A] text-xs space-y-2 font-bold shadow-[2px_2px_0px_#33272A] dark:shadow-[2px_2px_0px_#FFD3B6]">
                          <div>
                            <p className="font-black text-[#33272A] dark:text-[#FFF9F5]">{user.firstName} {user.lastName}</p>
                            <p className="text-[10px] text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-semibold">{user.email}</p>
                          </div>
                          <div className="bg-[#FFD3B6]/40 dark:bg-slate-900/60 p-2 rounded-xl border border-[#33272A]">
                            <p className="text-[10px] text-[#FF8BA7] font-black">สังกัดสมัครเป็นแอดมิน:</p>
                            <p className="font-black text-slate-700 dark:text-slate-200 text-[11px]">{user.schoolName} ({user.schoolId})</p>
                          </div>
                          <div className="flex gap-1.5 pt-1.5 justify-end">
                            <button
                              onClick={() => handleUserStatusUpdate(user.uid, 'rejected')}
                              className="rounded-lg bg-rose-50 hover:bg-rose-100 text-[#33272A] border border-[#33272A] px-2.5 py-1 text-[10px] font-bold cursor-pointer transition-colors"
                            >
                              ปฏิเสธ
                            </button>
                            <button
                              onClick={() => handleUserStatusUpdate(user.uid, 'approved')}
                              className="btn-cute bg-[#A0E7E5] text-[#33272A] px-2.5 py-1 text-[10px] font-black cursor-pointer shadow-[2px_2px_0px_#33272A]"
                            >
                              อนุมัติสิทธิ์
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-[#33272A]/60 dark:text-[#FFF9F5]/60 text-xs font-bold bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-[#33272A]/30">
                      ไม่มีคำร้องรออนุมัติในระบบ
                    </div>
                  )}
                </div>

                {/* ทะเบียนผู้ใช้งานทั้งหมด */}
                <div className="card p-6 md:col-span-2">
                  <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5 mb-4 border-b-2 border-[#33272A] pb-3 dark:border-[#FFD3B6]">
                    <Users className="h-4.5 w-4.5 text-[#A0E7E5]" /> ทะเบียนผู้ใช้งานในระบบ ({filteredApprovedUsers.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b-2 border-[#33272A] dark:border-[#FFD3B6] text-[#33272A] dark:text-[#FFF9F5] font-black">
                          <th className="p-2">ชื่อ-นามสกุล</th>
                          <th className="p-2">อีเมล</th>
                          <th className="p-2">โรงเรียน (รหัส)</th>
                          <th className="p-2">บทบาท</th>
                          <th className="p-2 text-center">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#33272A]/10 dark:divide-[#FFD3B6]/10 font-bold">
                        {filteredApprovedUsers.map((u, i) => (
                          <tr key={u.uid} className="hover:bg-[#FFF9F5] dark:hover:bg-slate-800/50 transition-colors">
                            <td className="p-2 text-[#33272A] dark:text-slate-200">{u.firstName} {u.lastName}</td>
                            <td className="p-2 text-[#33272A]/70 dark:text-slate-400">{u.email}</td>
                            <td className="p-2 text-[#33272A] dark:text-slate-200">
                              {u.role === 'super_admin' ? (
                                <span className="text-[#FF8BA7] font-black">ส่วนกลาง (เขตพื้นที่)</span>
                              ) : (
                                `${u.schoolName || ''} (${u.schoolId || ''})`
                              )}
                            </td>
                            <td className="p-2">
                              {u.role === 'super_admin' ? (
                                <span className="bg-[#FF8BA7]/20 text-[#FF8BA7] px-2 py-0.5 rounded-full text-[10px] font-black border border-[#FF8BA7]/30">Super Admin</span>
                              ) : (
                                <span className="bg-[#A0E7E5]/30 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full text-[10px] font-black border border-[#A0E7E5]/50">School Admin</span>
                              )}
                            </td>
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleOpenEditUser(u)}
                                  className="text-teal-600 hover:text-teal-850 p-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-colors cursor-pointer"
                                  title="แก้ไขข้อมูลผู้ใช้และส่งรีเซ็ตรหัสผ่าน"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                
                                {u.role !== 'super_admin' && (
                                  <button
                                    onClick={() => handleDeleteUser(u.uid)}
                                    className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                    title="ลบผู้ใช้งาน"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredApprovedUsers.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-[#33272A]/50 dark:text-[#FFF9F5]/50 font-bold">ไม่พบผู้ใช้งานตามคำค้นหา</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {adminTab === 'logs' && (
            <div className="card p-6">
              <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5 mb-4 border-b-2 border-[#33272A] pb-3 dark:border-[#FFD3B6]">
                <History className="h-4.5 w-4.5 text-[#FFD3B6]" /> ประวัติการดาวน์โหลดข้อมูล (Download Logs)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b-2 border-[#33272A] dark:border-[#FFD3B6] text-[#33272A] dark:text-[#FFF9F5] font-black">
                      <th className="p-2 w-32">วัน-เวลา</th>
                      <th className="p-2">ผู้ดาวน์โหลด</th>
                      <th className="p-2">ข้อมูลโรงเรียน</th>
                      <th className="p-2">วัตถุประสงค์</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#33272A]/10 dark:divide-[#FFD3B6]/10 font-bold">
                    {downloadLogs.map((log) => {
                      let timeStr = '-';
                      if (log.timestamp) {
                        try {
                          const date = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                          timeStr = date.toLocaleString('th-TH', { 
                            year: 'numeric', month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          });
                        } catch(e) {}
                      }
                      
                      return (
                        <tr key={log.id} className="hover:bg-[#FFF9F5] dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-2 text-[#33272A]/70 dark:text-slate-400 whitespace-nowrap">{timeStr}</td>
                          <td className="p-2 text-[#33272A] dark:text-slate-200">
                            <div>{log.name}</div>
                            <div className="text-[10px] text-[#33272A]/60 dark:text-slate-500">{log.email}</div>
                          </td>
                          <td className="p-2 text-[#33272A] dark:text-slate-200">
                            {log.schoolId === 'all' ? (
                              <span className="text-[#FF8BA7] font-black">ดาวน์โหลดทั้งหมด</span>
                            ) : (
                              <span>{log.schoolName} ({log.schoolId})</span>
                            )}
                          </td>
                          <td className="p-2 text-[#33272A] dark:text-slate-300">
                            {log.purpose}
                          </td>
                        </tr>
                      );
                    })}
                    {downloadLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-[#33272A]/50 dark:text-[#FFF9F5]/50 font-bold">ไม่มีประวัติการดาวน์โหลด</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {adminTab === 'schools' && (
            <div className="space-y-6">
              {/* แผงแก้ไขข้อมูลสถานศึกษาสำหรับ แอดมินโรงเรียน และ Super Admin */}
              <div className="card p-6 border-l-4 border-l-[#FF8BA7]">
                <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5 mb-4 border-b-2 border-[#33272A] pb-3 dark:border-[#FFD3B6]">
                  <Edit3 className="h-4.5 w-4.5 text-[#FF8BA7]" /> 
                  {isSuperAdmin ? 'แก้ไขข้อมูลพื้นฐานสถานศึกษาในระบบ (สิทธิ์ Super Admin)' : `แก้ไขข้อมูลพื้นฐานของสถานศึกษาตนเอง (${mySchool ? mySchool.name : userProfile.schoolName || ''})`}
                </h3>

                {!isSuperAdmin && userProfile.status === 'pending' ? (
                  <div className="rounded-2xl bg-[#FFD3B6] p-4 text-xs font-bold text-[#33272A] border-2 border-[#33272A] flex gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-[#FF8BA7]" />
                    <span>บัญชีของคุณยังไม่ได้รับการอนุมัติจาก Super Admin (tamrri@gmail.com) จึงยังไม่สามารถบันทึกข้อมูลแก้ไขได้ในขณะนี้</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {isSuperAdmin && (
                      <div className="space-y-1.5 bg-[#FFD3B6]/20 p-4 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6]/20">
                        <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1">
                          <Building className="h-4 w-4 text-[#FF8BA7]" /> เลือกโรงเรียนที่จะทำการแก้ไขข้อมูลทั้งหมด
                        </label>
                        <select
                          value={selectedSchoolId}
                          onChange={(e) => setSelectedSchoolId(e.target.value)}
                          className="w-full rounded-xl border-2 border-[#33272A] bg-white p-2.5 text-xs font-bold text-[#33272A] dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                        >
                          <option value="">-- กรุณาเลือกสถานศึกษา --</option>
                          {schools.map(s => (
                            <option key={s.id} value={s.id}>{s.id} - {s.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <form onSubmit={handleSaveSchoolInfo} className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">ชื่อสถานศึกษา</label>
                        <input
                          type="text"
                          required
                          value={editSchoolName}
                          onChange={(e) => setEditSchoolName(e.target.value)}
                          disabled={!isSuperAdmin}
                          title={!isSuperAdmin ? 'เฉพาะ Super Admin เท่านั้นที่สามารถเปลี่ยนชื่อโรงเรียนได้' : ''}
                          className={`w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5] ${!isSuperAdmin ? 'opacity-70 bg-gray-100 cursor-not-allowed dark:bg-gray-800' : ''}`}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">อำเภอ (พื้นที่ตั้ง)</label>
                        <select
                          value={editAmphoe}
                          onChange={(e) => setEditAmphoe(e.target.value)}
                          className="w-full rounded-xl border-2 border-[#33272A] bg-white p-2 text-xs font-bold text-[#33272A] dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                        >
                          <option value="">-- กรุณาเลือกอำเภอ --</option>
                          <option value="เมืองแม่ฮ่องสอน">เมืองแม่ฮ่องสอน</option>
                          <option value="ขุนยวม">ขุนยวม</option>
                          <option value="ปาย">ปาย</option>
                          <option value="ปางมะผ้า">ปางมะผ้า</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">กลุ่มพัฒนาคุณภาพการศึกษา (เครือข่าย)</label>
                        <select
                          value={editNetworkGroup}
                          onChange={(e) => setEditNetworkGroup(e.target.value)}
                          className="w-full rounded-xl border-2 border-[#33272A] bg-white p-2 text-xs font-bold text-[#33272A] focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                        >
                          <option value="">-- เลือกกลุ่มเครือข่าย --</option>
                          {availableNetworkGroups.map(group => (
                            <option key={group} value={group}>{group}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">ระบบอินเทอร์เน็ตที่ใช้งาน</label>
                        <select
                          value={String(editInternet)}
                          onChange={(e) => setEditInternet(e.target.value as any)}
                          className="w-full rounded-xl border-2 border-[#33272A] bg-white p-2 text-xs font-bold text-[#33272A] dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                        >
                          {internetOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">กระแสไฟฟ้า / พลังงานที่ใช้</label>
                        <select
                          value={typeof editElectricity === 'boolean' ? (editElectricity ? 'has_electric' : 'none') : String(editElectricity)}
                          onChange={(e) => setEditElectricity(e.target.value)}
                          className="w-full rounded-xl border-2 border-[#33272A] bg-white p-2 text-xs font-bold text-[#33272A] dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                        >
                          {electricityOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1">
                          <Droplets className="h-3.5 w-3.5 text-blue-500" />
                          ระบบน้ำประปา / แหล่งน้ำในโรงเรียน
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <select
                            value={editWaterSystem}
                            onChange={(e) => setEditWaterSystem(e.target.value)}
                            className="w-full rounded-xl border-2 border-[#33272A] bg-white p-2 text-xs font-bold text-[#33272A] dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                          >
                            {waterSystemOptions.map(opt => (
                              <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={editWaterSystemDetail}
                            onChange={(e) => setEditWaterSystemDetail(e.target.value)}
                            placeholder="รายละเอียดระบบน้ำเพิ่มเติม (เช่น มีแท็งก์น้ำ/บ่อบาดาล)"
                            className="w-full rounded-xl border-2 border-[#33272A] bg-white p-2 text-xs font-bold text-[#33272A] outline-none focus:ring-2 focus:ring-[#FF8BA7] dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                          />
                        </div>
                      </div>

                      {/* ช่องทางและข้อมูลติดต่อสถานศึกษา */}
                      <div className="space-y-3 sm:col-span-2 bg-[#FFF9F5] dark:bg-[#150e10] p-4 rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6]">
                        <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5 border-b border-[#33272A]/20 pb-2">
                          <Phone className="h-4 w-4 text-[#FF8BA7]" />
                          📞 ข้อมูลและช่องทางติดต่อสถานศึกษา (Contact Information)
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-extrabold text-[#33272A]/80 dark:text-[#FFF9F5]/80">เบอร์โทรศัพท์โรงเรียน</label>
                            <input
                              type="text"
                              value={editSchoolPhone}
                              onChange={(e) => setEditSchoolPhone(e.target.value)}
                              placeholder="เช่น 053-123456"
                              className="w-full rounded-xl border-2 border-[#33272A] bg-white p-2 text-xs font-bold text-[#33272A] outline-none focus:ring-2 focus:ring-[#FF8BA7] dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-extrabold text-[#33272A]/80 dark:text-[#FFF9F5]/80">เบอร์โทรศัพท์ผู้บริหาร</label>
                            <input
                              type="text"
                              value={editDirectorPhone}
                              onChange={(e) => setEditDirectorPhone(e.target.value)}
                              placeholder="เช่น 081-9998888"
                              className="w-full rounded-xl border-2 border-[#33272A] bg-white p-2 text-xs font-bold text-[#33272A] outline-none focus:ring-2 focus:ring-[#FF8BA7] dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-extrabold text-[#33272A]/80 dark:text-[#FFF9F5]/80">อีเมลสถานศึกษา (Email)</label>
                            <input
                              type="email"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              placeholder="เช่น school@mhs1.go.th"
                              className="w-full rounded-xl border-2 border-[#33272A] bg-white p-2 text-xs font-bold text-[#33272A] outline-none focus:ring-2 focus:ring-[#FF8BA7] dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-extrabold text-[#33272A]/80 dark:text-[#FFF9F5]/80">Facebook Page / ลิงก์</label>
                            <input
                              type="text"
                              value={editFacebook}
                              onChange={(e) => setEditFacebook(e.target.value)}
                              placeholder="https://facebook.com/yourschool"
                              className="w-full rounded-xl border-2 border-[#33272A] bg-white p-2 text-xs font-bold text-[#33272A] outline-none focus:ring-2 focus:ring-[#FF8BA7] dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-extrabold text-[#33272A]/80 dark:text-[#FFF9F5]/80">LINE ID / ลิงก์ LINE</label>
                            <input
                              type="text"
                              value={editLine}
                              onChange={(e) => setEditLine(e.target.value)}
                              placeholder="เช่น @schoolline หรือ https://line.me/ti/p/..."
                              className="w-full rounded-xl border-2 border-[#33272A] bg-white p-2 text-xs font-bold text-[#33272A] outline-none focus:ring-2 focus:ring-[#FF8BA7] dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-extrabold text-[#33272A]/80 dark:text-[#FFF9F5]/80">เว็บไซต์สถานศึกษา (Website)</label>
                            <input
                              type="url"
                              value={editWebsite}
                              onChange={(e) => setEditWebsite(e.target.value)}
                              placeholder="https://www.yourschool.ac.th"
                              className="w-full rounded-xl border-2 border-[#33272A] bg-white p-2 text-xs font-bold text-[#33272A] outline-none focus:ring-2 focus:ring-[#FF8BA7] dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                            <label className="text-[11px] font-extrabold text-[#33272A]/80 dark:text-[#FFF9F5]/80">ที่อยู่สถานศึกษา (Address)</label>
                            <input
                              type="text"
                              value={editAddress}
                              onChange={(e) => setEditAddress(e.target.value)}
                              placeholder="ระบุที่อยู่สถานศึกษา เช่น หมู่ 1 ต.ปางหมู อ.เมือง จ.แม่ฮ่องสอน 58000"
                              className="w-full rounded-xl border-2 border-[#33272A] bg-white p-2 text-xs font-bold text-[#33272A] outline-none focus:ring-2 focus:ring-[#FF8BA7] dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] block mb-1">
                          🖼️ รูปภาพและโลโก้สถานศึกษา (School Branding & Media)
                        </label>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* 1. ตราโรงเรียน (Logo) */}
                          <div className="p-3 bg-white dark:bg-[#1e1518] rounded-xl border border-[#33272A]/30 dark:border-[#FFD3B6]/30 space-y-2">
                            <span className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] block">
                              🏫 ตราสัญลักษณ์โรงเรียน (Logo)
                            </span>
                            <div className="flex flex-col items-center gap-2">
                              {editLogoUrl ? (
                                <img src={editLogoUrl} alt="Logo" className="w-20 h-20 object-contain rounded-lg border border-slate-300 bg-slate-50 p-1" />
                              ) : (
                                <div className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 font-bold text-xs">
                                  ไม่มีรูปตรา
                                </div>
                              )}
                              <label className="btn-cute bg-[#FF8BA7] text-[#33272A] px-3 py-1.5 text-[11px] font-black flex items-center gap-1 border border-[#33272A] cursor-pointer hover:bg-rose-300">
                                <Upload className="h-3.5 w-3.5" /> อัปโหลดตราโรงเรียน
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                      if (ev.target?.result) setEditLogoUrl(ev.target.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }}
                                  className="hidden"
                                />
                              </label>
                              <input
                                type="url"
                                placeholder="หรือใส่ URL ตราโรงเรียน"
                                value={editLogoUrl}
                                onChange={(e) => setEditLogoUrl(e.target.value)}
                                className="w-full text-[10px] font-bold px-2 py-1 rounded border border-slate-300 dark:bg-[#150e10] dark:text-[#FFF9F5]"
                              />
                            </div>
                          </div>

                          {/* 2. รูปภาพโรงเรียน / อาคารสถานที่ */}
                          <div className="p-3 bg-white dark:bg-[#1e1518] rounded-xl border border-[#33272A]/30 dark:border-[#FFD3B6]/30 space-y-2">
                            <span className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] block">
                              📷 รูปภาพโรงเรียน / อาคารสถานที่
                            </span>
                            <div className="flex flex-col items-center gap-2">
                              {editImageUrl ? (
                                <img src={editImageUrl} alt="School" className="w-28 h-20 object-cover rounded-lg border border-slate-300" />
                              ) : (
                                <div className="w-28 h-20 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 font-bold text-xs">
                                  ไม่มีรูปโรงเรียน
                                </div>
                              )}
                              <label className="btn-cute bg-[#A0E7E5] text-[#33272A] px-3 py-1.5 text-[11px] font-black flex items-center gap-1 border border-[#33272A] cursor-pointer hover:bg-teal-300">
                                <Upload className="h-3.5 w-3.5" /> อัปโหลดรูปโรงเรียน
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                      if (ev.target?.result) setEditImageUrl(ev.target.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }}
                                  className="hidden"
                                />
                              </label>
                              <input
                                type="url"
                                placeholder="หรือใส่ URL รูปภาพโรงเรียน"
                                value={editImageUrl}
                                onChange={(e) => setEditImageUrl(e.target.value)}
                                className="w-full text-[10px] font-bold px-2 py-1 rounded border border-slate-300 dark:bg-[#150e10] dark:text-[#FFF9F5]"
                              />
                            </div>
                          </div>

                          {/* 3. รูปภาพ ผอ. / ผู้บริหารโรงเรียน */}
                          <div className="p-3 bg-white dark:bg-[#1e1518] rounded-xl border border-[#33272A]/30 dark:border-[#FFD3B6]/30 space-y-2">
                            <span className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] block">
                              👤 รูปภาพ ผอ. / ผู้บริหารโรงเรียน
                            </span>
                            <div className="flex flex-col items-center gap-2">
                              {editDirectorImageUrl ? (
                                <img src={editDirectorImageUrl} alt="Director" className="w-20 h-20 object-cover rounded-full border-2 border-[#FF8BA7]" />
                              ) : (
                                <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 font-bold text-xs">
                                  ไม่มีรูป ผอ.
                                </div>
                              )}
                              <label className="btn-cute bg-amber-200 text-[#33272A] px-3 py-1.5 text-[11px] font-black flex items-center gap-1 border border-[#33272A] cursor-pointer hover:bg-amber-300">
                                <Upload className="h-3.5 w-3.5" /> อัปโหลดรูปภาพ ผอ.
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                      if (ev.target?.result) setEditDirectorImageUrl(ev.target.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }}
                                  className="hidden"
                                />
                              </label>
                              <input
                                type="url"
                                placeholder="หรือใส่ URL รูปภาพ ผอ."
                                value={editDirectorImageUrl}
                                onChange={(e) => setEditDirectorImageUrl(e.target.value)}
                                className="w-full text-[10px] font-bold px-2 py-1 rounded border border-slate-300 dark:bg-[#150e10] dark:text-[#FFF9F5]"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="sm:col-span-2 space-y-2">
                        {editSuccess && (
                          <div className="rounded-2xl bg-emerald-50 text-emerald-800 border-2 border-[#33272A] p-3 text-xs font-bold">
                            {editSuccess}
                          </div>
                        )}
                        {editError && (
                          <div className="rounded-2xl bg-rose-50 text-rose-800 border-2 border-[#33272A] p-3 text-xs font-bold">
                            {editError}
                          </div>
                        )}
                      </div>

                      <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                        <button
                          type="submit"
                          disabled={isSavingSchool || (isSuperAdmin && !selectedSchoolId)}
                          className="btn-cute bg-[#FF8BA7] text-[#33272A] px-5 py-2.5 text-xs font-black flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          <Save className="h-4.5 w-4.5" />
                          {isSavingSchool ? 'กำลังบันทึกข้อมูล...' : 'บันทึกข้อมูลสถานศึกษา'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* ตารางแสดงรายชื่อโรงเรียนที่สามารถจัดการข้อมูลได้ (แสดงเฉพาะ Super Admin เพื่อเลือกโรงเรียนที่ต้องการแก้ไขหรือลบ) */}
              {isSuperAdmin && (
                <div className="card p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#33272A] pb-3 dark:border-[#FFD3B6]">
                    <div>
                      <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5]">
                        รายชื่อสถานศึกษาในสังกัด ({manageableSchools.length} โรงเรียน)
                      </h3>
                      <p className="text-xs text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-semibold">
                        คลิกปุ่ม "แก้ไขข้อมูล" เพื่อดึงข้อมูลโรงเรียนขึ้นมาแก้ไขด้านบน
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6]">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-[#FFF9F5] dark:bg-[#1a1214] text-[#33272A] dark:text-[#FFF9F5] font-black border-b-2 border-[#33272A] dark:border-[#FFD3B6]">
                          <th className="p-3">รหัสโรงเรียน</th>
                          <th className="p-3">ชื่อสถานศึกษา</th>
                          <th className="p-3">อำเภอ</th>
                          <th className="p-3 text-center">ครู (คน)</th>
                          <th className="p-3 text-center">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#33272A]/10 dark:divide-[#FFD3B6]/20 font-bold">
                        {manageableSchools.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-[#33272A]/60 dark:text-[#FFF9F5]/60 font-bold">
                              ไม่พบข้อมูลสถานศึกษาในระบบ
                            </td>
                          </tr>
                        ) : (
                          manageableSchools.map((s) => (
                            <tr key={s.id} className="hover:bg-[#FFD3B6]/10 dark:hover:bg-slate-800/40">
                              <td className="p-3 font-mono font-bold text-[#33272A] dark:text-[#FFD3B6]">{s.id}</td>
                              <td className="p-3 font-black text-[#33272A] dark:text-[#FFF9F5]">{s.name}</td>
                              <td className="p-3 text-[#33272A]/80 dark:text-[#FFF9F5]/80">{s.amphoe}</td>
                              <td className="p-3 text-center">{s.staffCount}</td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedSchoolId(s.id);
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="btn-cute bg-amber-400 text-[#33272A] px-2.5 py-1 text-[11px] font-black cursor-pointer hover:bg-amber-500 inline-flex items-center gap-1"
                                    title="แก้ไขข้อมูลพื้นฐานโรงเรียนนี้"
                                  >
                                    <Edit3 className="h-3 w-3" /> แก้ไขข้อมูล
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSchoolAdmin(s.id, s.name)}
                                    className="btn-cute bg-rose-500 text-white px-2.5 py-1 text-[11px] font-black cursor-pointer hover:bg-rose-600 inline-flex items-center gap-1"
                                  >
                                    <Trash2 className="h-3 w-3" /> ลบโรงเรียน
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {adminTab === 'theme' && (
            <div className="space-y-6 animate-fade-in">
              {/* ส่วนที่ 1: ธีมสีระบบ (System Color Themes) */}
              <div className="card p-6 space-y-6 bg-white dark:bg-[#1e1518]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#33272A] pb-4 dark:border-[#FFD3B6]">
                  <div className="flex items-center gap-2">
                    <Palette className="h-6 w-6 text-[#FF8BA7]" />
                    <h3 className="text-base font-black text-[#33272A] dark:text-[#FFF9F5]">
                      1. เลือกธีมสีของระบบ (System Color Themes)
                    </h3>
                  </div>
                  <span className="text-xs bg-[#FF8BA7]/20 text-[#FF8BA7] px-2.5 py-0.5 rounded-full font-black border border-[#FF8BA7]/30">
                    ธีมปัจจุบัน: {
                      themeStyle === 'pastel' ? '🌸 พาสเทล' :
                      themeStyle === 'modern' ? '🎨 โมเดิร์น' :
                      themeStyle === 'darktech' ? '⚡ ดาร์กเทค' :
                      themeStyle === 'minimal-slate' ? '📱 มินิมอล สเลต' :
                      themeStyle === 'warm-nature' ? '🌱 วอร์ม เนเชอร์' :
                      themeStyle === 'emerald-mint' ? '🍃 เอ็มเมอรัลด์ มินต์' :
                      themeStyle === 'cyan-futuristic' ? '🔮 ไซเบอร์ ไซแอน' :
                      themeStyle === 'royal-gold' ? '👑 รอยัล โกลด์' :
                      themeStyle === 'clean-mobile' ? '📱 คลีน โมบาย (Clean Mobile)' :
                      themeStyle === 'nordic-breeze' ? '❄️ นอร์ดิก บรีซ (Nordic Breeze)' : '🌱 กรีน (Green Leaf)'
                    }
                  </span>
                </div>

                <p className="text-xs text-[#33272A]/80 dark:text-[#FFF9F5]/80 font-bold">
                  เลือกสไตล์ธีมสีการแสดงผลเพื่อปรับประสบการณ์การใช้งานตามความชอบ รองรับการใช้งานทั้งโหมดสว่างและโหมดมืด
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                  {/* 1. ธีมพาสเทล */}
                  <button
                    type="button"
                    onClick={() => setThemeStyle && setThemeStyle('pastel')}
                    className={`p-4 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer ${
                      themeStyle === 'pastel'
                        ? 'bg-[#FF8BA7] text-[#33272A] shadow-[4px_4px_0px_#33272A] scale-[1.02] font-black'
                        : 'bg-white dark:bg-[#1a1214] text-[#33272A] dark:text-[#FFF9F5] hover:bg-[#FFD3B6]/30'
                    }`}
                  >
                    <Sparkles className="h-6 w-6 text-rose-600" />
                    <span className="text-xs font-black">🌸 ธีมพาสเทล (Pastel Cute)</span>
                    <span className="text-[10px] opacity-80 leading-relaxed">สดใสน่ารัก ซิกเนเจอร์ สพป.แม่ฮ่องสอน เขต 1</span>
                  </button>

                  {/* 2. ธีมโมเดิร์น */}
                  <button
                    type="button"
                    onClick={() => setThemeStyle && setThemeStyle('modern')}
                    className={`p-4 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer ${
                      themeStyle === 'modern'
                        ? 'bg-indigo-600 text-white shadow-[4px_4px_0px_#33272A] scale-[1.02] font-black'
                        : 'bg-white dark:bg-[#1a1214] text-[#33272A] dark:text-[#FFF9F5] hover:bg-[#FFD3B6]/30'
                    }`}
                  >
                    <Palette className="h-6 w-6 text-indigo-400" />
                    <span className="text-xs font-black">🎨 ธีมโมเดิร์น (Modern Clean)</span>
                    <span className="text-[10px] opacity-80 leading-relaxed">เรียบหรู ดูสบายตา สไตล์ทางการ</span>
                  </button>

                  {/* 3. ธีมดาร์กเทค */}
                  <button
                    type="button"
                    onClick={() => setThemeStyle && setThemeStyle('darktech')}
                    className={`p-4 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer ${
                      themeStyle === 'darktech'
                        ? 'bg-slate-900 text-cyan-400 border-cyan-400 shadow-[4px_4px_0px_#00F5D4] scale-[1.02] font-black'
                        : 'bg-white dark:bg-[#1a1214] text-[#33272A] dark:text-[#FFF9F5] hover:bg-[#FFD3B6]/30'
                    }`}
                  >
                    <Zap className="h-6 w-6 text-cyan-400" />
                    <span className="text-xs font-black">⚡ ธีมดาร์กเทค (Dark Tech)</span>
                    <span className="text-[10px] opacity-80 leading-relaxed">โหมดมืดล้ำสมัย ถนอมสายตา</span>
                  </button>

                  {/* 4. ธีมมินิมอล สเลต */}
                  <button
                    type="button"
                    onClick={() => setThemeStyle && setThemeStyle('minimal-slate')}
                    className={`p-4 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer ${
                      themeStyle === 'minimal-slate'
                        ? 'bg-slate-700 text-white shadow-[4px_4px_0px_#33272A] scale-[1.02] font-black'
                        : 'bg-white dark:bg-[#1a1214] text-[#33272A] dark:text-[#FFF9F5] hover:bg-[#FFD3B6]/30'
                    }`}
                  >
                    <Server className="h-6 w-6 text-slate-300" />
                    <span className="text-xs font-black">📱 มินิมอล สเลต (Slate)</span>
                    <span className="text-[10px] opacity-80 leading-relaxed">สะอาด คลีน เรียบง่ายสไตล์ มินิมอล</span>
                  </button>

                  {/* 5. ธีมวอร์ม เนเชอร์ */}
                  <button
                    type="button"
                    onClick={() => setThemeStyle && setThemeStyle('warm-nature')}
                    className={`p-4 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer ${
                      themeStyle === 'warm-nature'
                        ? 'bg-amber-700 text-amber-100 shadow-[4px_4px_0px_#33272A] scale-[1.02] font-black'
                        : 'bg-white dark:bg-[#1a1214] text-[#33272A] dark:text-[#FFF9F5] hover:bg-[#FFD3B6]/30'
                    }`}
                  >
                    <Sun className="h-6 w-6 text-amber-300" />
                    <span className="text-xs font-black">🌱 วอร์ม เนเชอร์ (Warm Nature)</span>
                    <span className="text-[10px] opacity-80 leading-relaxed">อบอุ่น ผ่อนคลาย โทนธรรมชาตินุ่มนวล</span>
                  </button>

                  {/* 6. ธีมเอ็มเมอรัลด์ มินต์ */}
                  <button
                    type="button"
                    onClick={() => setThemeStyle && setThemeStyle('emerald-mint')}
                    className={`p-4 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer ${
                      themeStyle === 'emerald-mint'
                        ? 'bg-emerald-600 text-white shadow-[4px_4px_0px_#33272A] scale-[1.02] font-black'
                        : 'bg-white dark:bg-[#1a1214] text-[#33272A] dark:text-[#FFF9F5] hover:bg-[#FFD3B6]/30'
                    }`}
                  >
                    <Activity className="h-6 w-6 text-emerald-300" />
                    <span className="text-xs font-black">🍃 เอ็มเมอรัลด์ มินต์ (Mint iOS)</span>
                    <span className="text-[10px] opacity-80 leading-relaxed">สดชื่น ทันสมัย สไตล์แอปเปิลมินต์</span>
                  </button>

                  {/* 7. ธีมไซเบอร์ ไซแอน */}
                  <button
                    type="button"
                    onClick={() => setThemeStyle && setThemeStyle('cyan-futuristic')}
                    className={`p-4 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer ${
                      themeStyle === 'cyan-futuristic'
                        ? 'bg-[#0B132B] text-[#00F5D4] border-[#00F5D4] shadow-[0_0_15px_rgba(0,245,212,0.4)] scale-[1.02] font-black'
                        : 'bg-white dark:bg-[#1a1214] text-[#33272A] dark:text-[#FFF9F5] hover:bg-[#FFD3B6]/30'
                    }`}
                  >
                    <Sparkles className="h-6 w-6 text-[#00F5D4]" />
                    <span className="text-xs font-black">🔮 ไซเบอร์ ไซแอน (Neon Cyan)</span>
                    <span className="text-[10px] opacity-80 leading-relaxed">ลุคนีออนโกลว์ อนาคต ดุดัน ไฮเทค</span>
                  </button>

                  {/* 8. ธีมรอยัล โกลด์ */}
                  <button
                    type="button"
                    onClick={() => setThemeStyle && setThemeStyle('royal-gold')}
                    className={`p-4 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer ${
                      themeStyle === 'royal-gold'
                        ? 'bg-[#291528] text-[#FDF0D5] border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.4)] scale-[1.02] font-black'
                        : 'bg-white dark:bg-[#1a1214] text-[#33272A] dark:text-[#FFF9F5] hover:bg-[#FFD3B6]/30'
                    }`}
                  >
                    <Shield className="h-6 w-6 text-[#D4AF37]" />
                    <span className="text-xs font-black">👑 รอยัล โกลด์ (Royal Violet)</span>
                    <span className="text-[10px] opacity-80 leading-relaxed">สง่างาม โทนม่วงเข้มตัดทองคำ พรีเมียม</span>
                  </button>

                  {/* 9. ธีมกรีน */}
                  <button
                    type="button"
                    onClick={() => setThemeStyle && setThemeStyle('green')}
                    className={`p-4 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer ${
                      themeStyle === 'green'
                        ? 'bg-[#22C55E] text-white border-[#16A34A] shadow-[0_0_15px_rgba(34,197,94,0.4)] scale-[1.02] font-black'
                        : 'bg-white dark:bg-[#1a1214] text-[#33272A] dark:text-[#FFF9F5] hover:bg-[#FFD3B6]/30'
                    }`}
                  >
                    <Activity className="h-6 w-6 text-green-300" />
                    <span className="text-xs font-black">🌱 ธีมกรีน (Green Leaf)</span>
                    <span className="text-[10px] opacity-80 leading-relaxed">สดใส โทนเขียวสไตล์ Eco Mobile App</span>
                  </button>

                  {/* 10. ธีมคลีน โมบาย (ธีมใหม่สำหรับมือถือ) */}
                  <button
                    type="button"
                    onClick={() => setThemeStyle && setThemeStyle('clean-mobile')}
                    className={`p-4 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer relative overflow-hidden ${
                      themeStyle === 'clean-mobile'
                        ? 'bg-sky-600 text-white border-sky-400 shadow-[0_0_15px_rgba(2,132,199,0.4)] scale-[1.02] font-black'
                        : 'bg-white dark:bg-[#1a1214] text-[#33272A] dark:text-[#FFF9F5] hover:bg-[#FFD3B6]/30'
                    }`}
                  >
                    <span className="absolute top-2 right-2 text-[9px] bg-sky-200 text-sky-900 px-1.5 py-0.5 rounded-md font-black">
                      Mobile Clean
                    </span>
                    <Smartphone className="h-6 w-6 text-sky-300" />
                    <span className="text-xs font-black">📱 คลีน โมบาย (Mobile Clean)</span>
                    <span className="text-[10px] opacity-80 leading-relaxed">คลีน สะอาดตา คอนทราสต์สูง ปุ่มใหญ่สำหรับสัมผัสบนมือถือ</span>
                  </button>

                  {/* 11. ธีมนอร์ดิก บรีซ (ธีมใหม่นอร์ดิก) */}
                  <button
                    type="button"
                    onClick={() => setThemeStyle && setThemeStyle('nordic-breeze')}
                    className={`p-4 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer relative overflow-hidden ${
                      themeStyle === 'nordic-breeze'
                        ? 'bg-teal-700 text-teal-50 border-teal-400 shadow-[0_0_15px_rgba(13,148,136,0.4)] scale-[1.02] font-black'
                        : 'bg-white dark:bg-[#1a1214] text-[#33272A] dark:text-[#FFF9F5] hover:bg-[#FFD3B6]/30'
                    }`}
                  >
                    <span className="absolute top-2 right-2 text-[9px] bg-teal-200 text-teal-900 px-1.5 py-0.5 rounded-md font-black">
                      Nordic Mint
                    </span>
                    <Globe className="h-6 w-6 text-teal-200" />
                    <span className="text-xs font-black">❄️ นอร์ดิก บรีซ (Nordic Breeze)</span>
                    <span className="text-[10px] opacity-80 leading-relaxed">สไตล์นอร์ดิกมินต์ คลีน เรียบหรู ถนอมสายตาบนสมาร์ตโฟน</span>
                  </button>
                </div>
              </div>

              {/* ส่วนที่ 2: เลือกดีไซน์การแสดงผลของระบบ (Visual Layout Design Presets) */}
              <div className="card p-6 space-y-6 bg-white dark:bg-[#1e1518]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#33272A] pb-4 dark:border-[#FFD3B6]">
                  <div className="flex items-center gap-2">
                    <Layout className="h-6 w-6 text-[#FF8BA7]" />
                    <h3 className="text-base font-black text-[#33272A] dark:text-[#FFF9F5]">
                      2. เลือกดีไซน์การแสดงผลของระบบ (Visual Layout Design Presets)
                    </h3>
                  </div>
                  <span className="text-xs bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 px-2.5 py-0.5 rounded-full font-black border border-indigo-500/30">
                    ดีไซน์ปัจจุบัน: {
                      designStyle === 'glass-float' ? '✨ มินิมอล กลาส & ซอฟต์ ฟโลต' :
                      designStyle === 'compact-grid' ? '⚡ กริดกะทัดรัด & ข้อมูลหนาแน่น' :
                      '🎨 คลาสสิกการ์ด (Classic Neo-Brutalist)'
                    }
                  </span>
                </div>

                <p className="text-xs text-[#33272A]/80 dark:text-[#FFF9F5]/80 font-bold">
                  เลือกดีไซน์เลย์เอาต์เพื่อปรับเปลี่ยนรูปแบบการแสดงผลของการ์ด ขอบ เงา และความหนาแน่นของข้อมูลให้ตรงกับสไตล์การใช้งานของคุณ
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Design Preset 1: Classic Neo-Brutalist */}
                  <button
                    type="button"
                    onClick={() => setDesignStyle && setDesignStyle('classic')}
                    className={`p-5 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] flex flex-col items-start text-left gap-3 transition-all cursor-pointer relative overflow-hidden ${
                      designStyle === 'classic'
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-600 dark:border-indigo-400 shadow-[4px_4px_0px_#33272A] dark:shadow-[4px_4px_0px_#FFD3B6]'
                        : 'bg-white dark:bg-[#1a1214] text-[#33272A] dark:text-[#FFF9F5] hover:border-indigo-400'
                    }`}
                  >
                    {designStyle === 'classic' && (
                      <span className="absolute top-3 right-3 text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> ใช้งานอยู่
                      </span>
                    )}
                    <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                      <Layers className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5]">
                        🎨 ดีไซน์คลาสสิก (Classic Neo-Brutalist)
                      </h4>
                      <p className="text-xs opacity-75 mt-1 leading-relaxed">
                        ขอบเส้นหนาคมชัด ชัดเจน โดดเด่น สไตล์เนโอ-บรูทาลิสต์ (ดั้งเดิม)
                      </p>
                    </div>
                    <div className="w-full mt-2 pt-2 border-t border-[#33272A]/10 dark:border-[#FFF9F5]/10 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                      เหมาะสำหรับ: ทุกอุปกรณ์ อ่านง่าย สะดุดตา
                    </div>
                  </button>

                  {/* Design Preset 2: Glassmorphism & Soft Float (ดีไซน์ใหม่ 1) */}
                  <button
                    type="button"
                    onClick={() => setDesignStyle && setDesignStyle('glass-float')}
                    className={`p-5 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] flex flex-col items-start text-left gap-3 transition-all cursor-pointer relative overflow-hidden ${
                      designStyle === 'glass-float'
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 dark:border-rose-400 shadow-[4px_4px_0px_#FF8BA7]'
                        : 'bg-white dark:bg-[#1a1214] text-[#33272A] dark:text-[#FFF9F5] hover:border-rose-400'
                    }`}
                  >
                    {designStyle === 'glass-float' && (
                      <span className="absolute top-3 right-3 text-xs bg-rose-500 text-white px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> ใช้งานอยู่
                      </span>
                    )}
                    <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-300">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5]">
                        ✨ มินิมอล กลาส & ซอฟต์ ฟโลต (Modern Glass)
                      </h4>
                      <p className="text-xs opacity-75 mt-1 leading-relaxed">
                        ขอบบางเรียบหรู เงานุ่มนวล เอฟเฟกต์กระจกเบลอ ละมุนตา สไตล์โมเดิร์น
                      </p>
                    </div>
                    <div className="w-full mt-2 pt-2 border-t border-[#33272A]/10 dark:border-[#FFF9F5]/10 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                      เหมาะสำหรับ: ผู้ต้องการความสบายตา ดีไซน์ล้ำสมัย
                    </div>
                  </button>

                  {/* Design Preset 3: Compact High-Density Grid (ดีไซน์ใหม่ 2) */}
                  <button
                    type="button"
                    onClick={() => setDesignStyle && setDesignStyle('compact-grid')}
                    className={`p-5 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] flex flex-col items-start text-left gap-3 transition-all cursor-pointer relative overflow-hidden ${
                      designStyle === 'compact-grid'
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-600 dark:border-amber-400 shadow-[4px_4px_0px_#33272A] dark:shadow-[4px_4px_0px_#FFD3B6]'
                        : 'bg-white dark:bg-[#1a1214] text-[#33272A] dark:text-[#FFF9F5] hover:border-amber-400'
                    }`}
                  >
                    {designStyle === 'compact-grid' && (
                      <span className="absolute top-3 right-3 text-xs bg-amber-600 text-white px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> ใช้งานอยู่
                      </span>
                    )}
                    <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                      <Monitor className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5]">
                        ⚡ กริดกะทัดรัด & ข้อมูลหนาแน่น (High Density)
                      </h4>
                      <p className="text-xs opacity-75 mt-1 leading-relaxed">
                        ระยะห่างกระชับ แสดงตารางและข้อมูลได้ปริมาณมากในหน้าเดียว รวดเร็ว
                      </p>
                    </div>
                    <div className="w-full mt-2 pt-2 border-t border-[#33272A]/10 dark:border-[#FFF9F5]/10 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      เหมาะสำหรับ: หน้าจอคอมพิวเตอร์/แท็บเล็ต ตรวจสอบสถิติ
                    </div>
                  </button>
                </div>
              </div>

              {/* รายงานผลกระทบต่อระบบ & คำแนะนำ (System Impact Analysis & Recommendations) */}
              <div className="space-y-4">
                {/* ใบเตือน 1: ข้อมูลความปลอดภัยระบบ (0% Impact) */}
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 rounded-2xl p-4 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                      🟢 การันตีผลกระทบต่อระบบฐานข้อมูล (Database Safety Assurance)
                    </h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed font-bold">
                      การเปลี่ยนสลับธีมสีและดีไซน์เลย์เอาต์ทำงานที่ฝั่งเบราว์เซอร์ (Client-side Visual State) <strong>ไม่มีผลกระทบต่อข้อมูลนักเรียน ฐานข้อมูล Firestore สิทธิ์การเข้าถึง หรือความเร็วของเซิร์ฟเวอร์ใดๆ ทั้งสิ้น 100%</strong>
                    </p>
                  </div>
                </div>

                {/* ใบเตือน 2: คำแนะนำการใช้งานตามอุปกรณ์ */}
                <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 rounded-2xl p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-amber-900 dark:text-amber-200">
                      ⚠️ คำแนะนำการใช้งาน (Advisory Recommendation)
                    </h4>
                    <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-bold">
                      • <strong>ดีไซน์ Glass & Soft Float</strong> เหมาะสมกับทุกอุปกรณ์ ช่วยให้ใช้งานสบายตา ลุคทันสมัย<br />
                      • <strong>ดีไซน์ Compact High-Density Grid</strong> จะกระชับขนาดตารางลง เหมาะกับจอคอมพิวเตอร์ใหญ่ หากใช้งานบนมือถือสมาร์ตโฟน แนะนำให้ใช้ดีไซน์ คลาสสิก หรือ Glass Float เพื่อความสะดวกในการสัมผัสและอ่านข้อมูล
                    </p>
                  </div>
                </div>
              </div>

              {/* จัดการป้ายแบนเนอร์ส่วนหัว (Header Banner) - แสดงเฉพาะ Super Admin */}
              {isSuperAdmin && (
              <div className="bg-[#FFF9F5] dark:bg-[#251b1e] p-5 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#33272A]/20 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-[#FF8BA7]" />
                      ป้ายแบนเนอร์ประชาสัมพันธ์ส่วนหัว (Header Banner)
                    </h4>
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-400 dark:bg-amber-950 dark:text-amber-200 flex items-center gap-1">
                      <Shield className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      สิทธิ์เฉพาะ Super Admin เท่านั้น
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                          headerBannerEnabled
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-200'
                            : 'bg-rose-100 text-rose-900 border-rose-400 dark:bg-rose-950 dark:text-rose-200'
                        }`}>
                          {headerBannerEnabled ? '🟢 กำลังเปิดแสดงผลแบนเนอร์' : '🔴 กำลังปิดการแสดงผลแบนเนอร์'}
                        </span>
                        <label className="switch" title={!isSuperAdmin ? 'สิทธิ์เฉพาะ Super Admin เท่านั้น' : 'สวิตช์ เปิด-ปิด แบนเนอร์บนส่วนหัวเว็บไซต์'}>
                          <input
                            type="checkbox"
                            checked={headerBannerEnabled}
                            disabled={!isSuperAdmin}
                            onChange={(e) => {
                              const val = e.target.checked;
                              handleToggleSetting('headerBannerEnabled', val);
                            }}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </div>

                    {!isSuperAdmin && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 rounded-xl text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-2">
                        <Shield className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>การจัดการป้ายแบนเนอร์ส่วนหัวของเว็บไซต์ ได้รับการสงวนสิทธิ์ไว้สำหรับ <strong>Super Admin เท่านั้น</strong> คุณไม่สามารถเปลี่ยนแปลงการตั้งค่าส่วนนี้ได้</span>
                      </div>
                    )}

                    <p className="text-xs text-[#33272A]/80 dark:text-[#FFF9F5]/80 font-bold">
                      อัปโหลดรูปภาพป้ายแบนเนอร์ หรือใส่ลิงก์ URL เพื่อแสดงบนส่วนหัวของเว็บไซต์ (Header) พร้อมปรับขนาดความสูง และรูปแบบการจัดวางรูปภาพได้อย่างอิสระ
                    </p>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                      {/* ฝั่งซ้าย: อัปโหลด & ปุ่มตั้งค่า */}
                      <div className="space-y-4">
                        {/* อัปโหลดไฟล์ภาพ */}
                        <div>
                          <label className="block text-xs font-black text-[#33272A] dark:text-[#FFF9F5] mb-1.5 flex items-center gap-1">
                            <Upload className="h-4 w-4 text-rose-500" />
                            อัปโหลดรูปภาพแบนเนอร์ใหม่ (ไฟล์ภาพ .jpg, .png, .webp)
                          </label>
                          <div className="flex items-center gap-2">
                            <label className={`btn-cute bg-[#FF8BA7] text-[#33272A] px-4 py-2 text-xs font-black flex items-center gap-2 border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] ${!isSuperAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-rose-300'} shrink-0`}>
                              <Upload className="h-4 w-4" /> เลือกรูปภาพจากเครื่อง
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleHeaderBannerUpload}
                                disabled={!isSuperAdmin}
                                className="hidden"
                              />
                            </label>
                            {headerBannerUrl && (
                              <button
                                type="button"
                                onClick={() => setHeaderBannerUrl('')}
                                disabled={!isSuperAdmin}
                                className="btn-cute bg-rose-500 text-white px-3 py-2 text-xs font-black flex items-center gap-1 border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] cursor-pointer hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> ลบรูปภาพ
                              </button>
                            )}
                          </div>
                        </div>

                        {/* หรือวาง URL ตรง */}
                        <div>
                          <label className="block text-xs font-black text-[#33272A] dark:text-[#FFF9F5] mb-1">
                            หรือใส่ลิงก์รูปภาพ (Image URL)
                          </label>
                          <input
                            type="url"
                            value={headerBannerUrl}
                            onChange={(e) => setHeaderBannerUrl(e.target.value)}
                            disabled={!isSuperAdmin}
                            placeholder="https://example.com/banner.jpg"
                            className="w-full text-xs font-bold px-3 py-2 rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] dark:bg-[#150e10] dark:text-[#FFF9F5] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>

                        {/* ปรับความสูง Banner */}
                        <div className="p-3 bg-white dark:bg-[#150e10] rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] space-y-2">
                          <div className="flex items-center justify-between text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">
                            <span>📏 ปรับขนาดความสูงรูปภาพ (Banner Height)</span>
                            <span className="bg-[#FFD3B6] dark:bg-amber-950 text-[#33272A] dark:text-amber-200 px-2 py-0.5 rounded-lg border border-[#33272A]/30 font-black">
                              {headerBannerHeight} px
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="40"
                              max="350"
                              step="5"
                              value={headerBannerHeight}
                              onChange={(e) => setHeaderBannerHeight(Number(e.target.value))}
                              disabled={!isSuperAdmin}
                              className="w-full h-2 bg-rose-200 rounded-lg appearance-none cursor-pointer dark:bg-rose-950 accent-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <input
                              type="number"
                              min="30"
                              max="500"
                              value={headerBannerHeight}
                              onChange={(e) => setHeaderBannerHeight(Number(e.target.value) || 100)}
                              disabled={!isSuperAdmin}
                              className="w-20 text-xs font-black p-1.5 rounded-lg border-2 border-[#33272A] dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5] text-center disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </div>
                          {/* ปุ่มขนาดสำเร็จรูป */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] font-extrabold text-[#33272A]/70 dark:text-[#FFF9F5]/70">ขนาดสำเร็จรูป:</span>
                            {[
                              { label: 'เล็ก (60px)', val: 60 },
                              { label: 'มาตรฐาน (100px)', val: 100 },
                              { label: 'ใหญ่ (150px)', val: 150 },
                              { label: 'ใหญ่พิเศษ (200px)', val: 200 }
                            ].map((preset) => (
                              <button
                                key={preset.val}
                                type="button"
                                onClick={() => setHeaderBannerHeight(preset.val)}
                                disabled={!isSuperAdmin}
                                className={`px-2 py-0.5 text-[10px] font-black rounded-md border border-[#33272A] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                  headerBannerHeight === preset.val
                                    ? 'bg-[#FF8BA7] text-[#33272A]'
                                    : 'bg-[#FFF9F5] dark:bg-[#251b1e] text-[#33272A] dark:text-[#FFF9F5] hover:bg-rose-100'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* รูปแบบการแสดงผล Object Fit */}
                        <div className="p-3 bg-white dark:bg-[#150e10] rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] space-y-2">
                          <label className="block text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">
                            🎯 รูปแบบการสเกลรูปภาพ (Object Fit Mode)
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {[
                              { id: 'contain', label: 'Contain (ครบทั้งภาพ)', desc: 'ย่อตามสัดส่วน ไม่ตัดภาพ' },
                              { id: 'cover', label: 'Cover (เต็มพื้นที่)', desc: 'ครอบตัดภาพให้เต็มขอบ' },
                              { id: 'fill', label: 'Fill (ยืดรูป)', desc: 'ยืดรูปภาพให้เต็มพอดี' },
                              { id: 'auto', label: 'Auto (ตามจริง)', desc: 'ปรับขนาดตามต้นฉบับ' }
                            ].map((mode) => (
                              <button
                                key={mode.id}
                                type="button"
                                onClick={() => setHeaderBannerFit(mode.id as any)}
                                disabled={!isSuperAdmin}
                                className={`p-2 text-left rounded-lg border-2 border-[#33272A] dark:border-[#FFD3B6] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                  headerBannerFit === mode.id
                                    ? 'bg-[#A0E7E5] text-[#33272A] font-black shadow-[2px_2px_0px_#33272A]'
                                    : 'bg-[#FFF9F5] dark:bg-[#1e1518] text-[#33272A] dark:text-[#FFF9F5] hover:bg-teal-50 dark:hover:bg-teal-950/30'
                                }`}
                              >
                                <div className="text-[11px] font-black">{mode.label}</div>
                                <div className="text-[9px] opacity-75">{mode.desc}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* ฝั่งขวา: พรีวิวการแสดงผล Real-time */}
                      <div className="space-y-2">
                        <label className="block text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1">
                          <Eye className="h-4 w-4 text-emerald-500" />
                          ตัวอย่างการแสดงผลบน Header Real-time (Live Header Preview)
                        </label>
                        <div className="p-3 bg-slate-900/10 dark:bg-black/50 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] space-y-2">
                          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center">
                            {headerBannerEnabled ? '🟢 สถานะ: เปิดใช้งานแบนเนอร์' : '🔴 สถานะ: ปิดการแสดงผลแบนเนอร์'}
                          </div>
                          
                          {/* จำลอง Header Real time */}
                          <div className="border-2 border-[#33272A] dark:border-[#FFD3B6] rounded-xl overflow-hidden bg-white dark:bg-[#1e1518] shadow-sm">
                            {headerBannerUrl && headerBannerEnabled ? (
                              <div className="w-full bg-[#FFF9F5] dark:bg-[#150e10] border-b border-[#33272A]/20 flex items-center justify-center overflow-hidden">
                                <img
                                  src={headerBannerUrl}
                                  alt="Banner Preview"
                                  style={{
                                    height: `${headerBannerHeight}px`,
                                    maxHeight: `${headerBannerHeight}px`,
                                    objectFit: headerBannerFit,
                                    width: headerBannerFit === 'fill' || headerBannerFit === 'cover' ? '100%' : 'auto'
                                  }}
                                  className="max-w-full block"
                                />
                              </div>
                            ) : (
                              <div className="p-4 text-center text-xs text-slate-400 font-bold border-b border-[#33272A]/10">
                                (ยังไม่ได้ตั้งค่ารูปภาพ หรือ ปิดการแสดงผลอยู่)
                              </div>
                            )}

                            {/* แถบเมนูจำลอง */}
                            <div className="p-2 flex items-center justify-between bg-white dark:bg-[#1e1518]">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded bg-[#FF8BA7] border border-[#33272A]" />
                                <span className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">BigData Mhs1</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-black">เมนู 1</span>
                                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-black">เมนู 2</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          )}

          {adminTab === 'settings' && (
            <div className="space-y-6 animate-fade-in">
              {/* Grid 2 คอลัมน์: สวิตช์นโยบายระบบ & โครงสร้างพื้นฐาน */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* คอลัมน์ 1: นโยบายและสิทธิ์ระบบ */}
                <div className="space-y-4 bg-[#FFF9F5] dark:bg-[#251b1e] p-5 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6]">
                  <h4 className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-2 border-b border-[#33272A]/20 pb-2">
                    <Shield className="h-4 w-4 text-[#FF8BA7]" />
                    สิทธิ์การเข้าถึงและนโยบายผู้ใช้งาน
                  </h4>

                  {!isSuperAdmin && (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-2">
                      <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>🔒 เฉพาะ Super Admin เท่านั้นที่สามารถแก้ไขนโยบายผู้ใช้งานได้</span>
                    </div>
                  )}

                  {/* 1. ระบบ Pop-up แจ้งเตือนผู้ใช้งานหนาแน่น */}
                  <div className="p-4 bg-white dark:bg-[#1a1214] rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] space-y-3 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                          <Activity className="h-4 w-4 text-rose-500" />
                          Pop-up แจ้งเตือนผู้ใช้งานหนาแน่น (High Traffic Notice)
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-bold mt-1 leading-relaxed">
                          {highTrafficAlertEnabled
                            ? 'แจ้งเตือนอัตโนมัติทันทีเมื่อสถานะเซิร์ฟเวอร์เป็นสีแดง (🔴 ผู้ใช้หนาแน่น)'
                            : 'ปิดใช้งานระบบแจ้งเตือน Pop-up'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                          highTrafficAlertEnabled
                            ? 'bg-rose-100 text-rose-900 border-rose-400 dark:bg-rose-950 dark:text-rose-200'
                            : 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {highTrafficAlertEnabled ? '🟢 กำลังเปิดใช้งานสิทธิ์' : '🔴 กำลังปิดใช้งาน'}
                        </span>
                        <label className="switch" title="สวิตช์ เปิด-ปิด ระบบแจ้งเตือน Pop-up ผู้ใช้งานหนาแน่น">
                          <input
                            type="checkbox"
                            checked={highTrafficAlertEnabled}
                            disabled={isSavingSettings || !isSuperAdmin}
                            onChange={(e) => handleToggleSetting('highTrafficAlertEnabled', e.target.checked)}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </div>

                    {highTrafficAlertEnabled && (
                      <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                        {/* Status Badge & Auto Trigger Note */}
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs font-bold">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600 dark:text-slate-400">สถานะระบบ Server ปัจจุบัน:</span>
                            <span className={`px-2 py-0.5 rounded-lg font-black text-[11px] ${
                              serverStatus === 'red' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300' :
                              serverStatus === 'yellow' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-300' :
                              'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                            }`}>
                              {serverStatus === 'red' ? '🔴 สีแดง (High Traffic / Pop-up ทำงาน)' :
                               serverStatus === 'yellow' ? '🟡 สีเหลือง (เฝ้าระวัง)' :
                               '🟢 สีเขียว (ปกติ)'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                            💡 ระบบจะเฝ้าระวังภาระคำขอ/ผู้ใช้แบบ Real-time เมื่อสถานะเซิร์ฟเวอร์เปลี่ยนเป็น <strong className="text-rose-600 dark:text-rose-400 font-extrabold">สีแดง (🔴)</strong> Pop-up จะเด้งแจ้งเตือนอัตโนมัติบนหน้าจอของผู้ใช้ทุกคน
                          </p>
                        </div>

                        {/* Simulation Toggle Button for Admin Testing */}
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 flex items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <span className="text-xs font-black text-amber-950 dark:text-amber-200 flex items-center gap-1">
                              <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                              ทดสอบ / บังคับสถานะเซิร์ฟเวอร์สีแดง
                            </span>
                            <p className="text-[10px] text-amber-800 dark:text-amber-300 font-bold">
                              {simulateRedServerStatus ? '🔴 เปิดโหมดจำลองสถานะสีแดงอยู่ (Pop-up ทำงานแสดงผล)' : 'ปกติ (คำนวณตามภาระเซิร์ฟเวอร์จริง)'}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                              simulateRedServerStatus
                                ? 'bg-rose-100 text-rose-900 border-rose-400 dark:bg-rose-950 dark:text-rose-200'
                                : 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {simulateRedServerStatus ? '🔴 บังคับสีแดง' : '🟢 ภาระจริง'}
                            </span>
                            <label className="switch" title="สวิตช์ เปิด-ปิด บังคับสถานะเซิร์ฟเวอร์สีแดง">
                              <input
                                type="checkbox"
                                checked={simulateRedServerStatus}
                                disabled={isSavingSettings || !isSuperAdmin}
                                onChange={(e) => handleToggleSetting('simulateRedServerStatus', e.target.checked)}
                              />
                              <span className="slider"></span>
                            </label>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">
                            ข้อความแจ้งเตือน Pop-up (Message Text)
                          </label>
                          <input
                            type="text"
                            value={highTrafficAlertMessage}
                            onChange={(e) => setHighTrafficAlertMessage(e.target.value)}
                            disabled={!isSuperAdmin}
                            className="w-full rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-[#FFF9F5] dark:bg-[#251b1e] p-2 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5] outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. เปิด/ปิด การดาวน์โหลดข้อมูล */}
                  <div className="p-4 bg-white dark:bg-[#1a1214] rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] flex items-center justify-between gap-3 shadow-sm">
                    <div>
                      <p className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5]">
                        เปิด/ปิด การดาวน์โหลดข้อมูลระบบทั้งหมด (Export Data)
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-bold mt-1 leading-relaxed">
                        {allowDataDownload
                          ? 'ผู้ใช้งานทุกคนสามารถดาวน์โหลดไฟล์ Excel/CSV ได้'
                          : 'ปิดการดาวน์โหลดข้อมูลระบบทั้งหมด (ไม่อนุญาตให้ดาวน์โหลด)'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                        allowDataDownload
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-200'
                          : 'bg-rose-100 text-rose-900 border-rose-400 dark:bg-rose-950 dark:text-rose-200'
                      }`}>
                        {allowDataDownload ? '🟢 กำลังเปิดสิทธิ์ให้ดาวน์โหลด' : '🔴 กำลังปิดสิทธิ์ดาวน์โหลด'}
                      </span>
                      <label className="switch" title="สวิตช์ เปิด-ปิด สิทธิ์การดาวน์โหลดข้อมูลระบบ">
                        <input
                          type="checkbox"
                          checked={allowDataDownload}
                          disabled={isSavingSettings || !isSuperAdmin}
                          onChange={(e) => handleToggleSetting('allowDataDownload', e.target.checked)}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>

                  {/* 3. จำกัด 1 แอดมินต่อโรงเรียน */}
                  <div className="p-4 bg-white dark:bg-[#1a1214] rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] flex items-center justify-between gap-3 shadow-sm">
                    <div>
                      <p className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5]">
                        นโยบายจำกัด 1 แอดมินต่อ 1 โรงเรียน
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-bold mt-1 leading-relaxed">
                        {restrictOneAdminPerSchool
                          ? 'โรงเรียนที่มีแอดมินแล้ว จะปิดไม่ให้ผู้อื่นสมัครซ้ำ'
                          : 'อนุญาตให้มีแอดมินหลายคนต่อหนึ่งโรงเรียนได้'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                        restrictOneAdminPerSchool
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-200'
                          : 'bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-950 dark:text-amber-200'
                      }`}>
                        {restrictOneAdminPerSchool ? '🟢 กำลังเปิดจำกัด 1 คน/โรงเรียน' : '🔴 กำลังปิดจำกัด (หลายคนได้)'}
                      </span>
                      <label className="switch" title="สวิตช์ เปิด-ปิด นโยบายจำกัด 1 แอดมินต่อ 1 โรงเรียน">
                        <input
                          type="checkbox"
                          checked={restrictOneAdminPerSchool}
                          disabled={isSavingSettings || !isSuperAdmin}
                          onChange={(e) => handleToggleSetting('restrictOneAdminPerSchool', e.target.checked)}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>

                  {/* 4. เปิด/ปิด การรับสมัครแอดมินโรงเรียน */}
                  <div className="p-4 bg-white dark:bg-[#1a1214] rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] flex items-center justify-between gap-3 shadow-sm">
                    <div>
                      <p className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5]">
                        ระบบเปิดรับสมัครแอดมินโรงเรียนใหม่
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-bold mt-1 leading-relaxed">
                        {allowSchoolAdminRegistration
                          ? 'เปิดรับสมัคร: สมาชิกใหม่ลงทะเบียนขอสิทธิ์ School Admin ได้'
                          : 'ปิดรับสมัคร: ปิดรับการลงทะเบียนแอดมินโรงเรียนชั่วคราว'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                        allowSchoolAdminRegistration
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-200'
                          : 'bg-rose-100 text-rose-900 border-rose-400 dark:bg-rose-950 dark:text-rose-200'
                      }`}>
                        {allowSchoolAdminRegistration ? '🟢 กำลังเปิดรับสมัครแอดมิน' : '🔴 กำลังปิดรับสมัครแอดมิน'}
                      </span>
                      <label className="switch" title="สวิตช์ เปิด-ปิด ระบบรับสมัครแอดมินโรงเรียน">
                        <input
                          type="checkbox"
                          checked={allowSchoolAdminRegistration}
                          disabled={isSavingSettings || !isSuperAdmin}
                          onChange={(e) => handleToggleSetting('allowSchoolAdminRegistration', e.target.checked)}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>

                  {/* 5. เปิด/ปิด การแสดงผลเมนูติดต่อสื่อสาร */}
                  <div className="p-4 bg-white dark:bg-[#1a1214] rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] flex items-center justify-between gap-3 shadow-sm">
                    <div>
                      <p className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                        <Phone className="h-4 w-4 text-emerald-500" />
                        การแสดงผลเมนู "ติดต่อ" สำหรับทุกคน
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-bold mt-1 leading-relaxed">
                        {contactEnabled
                          ? 'เปิดการแสดงผล: ทุกคนสามารถมองเห็นและเข้าใช้งานเมนูติดต่อได้'
                          : 'ปิดการแสดงผล: ซ่อนเมนูติดต่อไว้ให้เห็นเฉพาะ Super Admin เท่านั้น'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                        contactEnabled
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-200'
                          : 'bg-rose-100 text-rose-900 border-rose-400 dark:bg-rose-950 dark:text-rose-200'
                      }`}>
                        {contactEnabled ? '🟢 กำลังเปิดแสดงผลเมนูติดต่อ' : '🔴 กำลังปิดซ่อนเมนูติดต่อ'}
                      </span>
                      <label className="switch" title="สวิตช์ เปิด-ปิด แสดงผลเมนูติดต่อ">
                        <input
                          type="checkbox"
                          checked={contactEnabled}
                          disabled={isSavingSettings || !isSuperAdmin}
                          onChange={(e) => handleToggleSetting('contactEnabled', e.target.checked)}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* คอลัมน์ 2: จัดการประเภทโครงสร้างพื้นฐาน (ไฟฟ้า & อินเทอร์เน็ต) */}
                <div className="space-y-4 bg-[#FFF9F5] dark:bg-[#251b1e] p-5 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6]">
                  <h4 className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-2 border-b border-[#33272A]/20 pb-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    จัดการตัวเลือกโครงสร้างพื้นฐาน (เพิ่ม/ลด รายละเอียด)
                  </h4>

                  {!isSuperAdmin && (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-2">
                      <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>🔒 เฉพาะ Super Admin เท่านั้นที่สามารถจัดการตัวเลือกโครงสร้างพื้นฐานได้</span>
                    </div>
                  )}

                  {/* ข้อมูลไฟฟ้า */}
                  <div className="space-y-2">
                    <p className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
                      ประเภทไฟฟ้าในระบบ:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {electricityOptions.map(opt => (
                        <div key={opt.id} className="bg-white dark:bg-[#1a1214] border-2 border-[#33272A] dark:border-[#FFD3B6] px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 dark:text-white">
                          <span>{opt.label}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({opt.id})</span>
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => handleRemoveElectricityOption(opt.id)}
                              className="text-rose-500 hover:text-rose-700 font-black cursor-pointer text-xs ml-1"
                              title="ลบตัวเลือกนี้"
                            >
                              &times;
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="รหัส (เช่น nuclear)"
                        value={newElecId}
                        onChange={(e) => setNewElecId(e.target.value)}
                        disabled={!isSuperAdmin}
                        className="w-full sm:w-1/3 rounded-xl border border-[#33272A] bg-white dark:bg-[#1a1214] dark:text-white px-2 py-1 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <input
                        type="text"
                        placeholder="ชื่อแสดง (เช่น ⚡ พลังงานนิวเคลียร์)"
                        value={newElecLabel}
                        onChange={(e) => setNewElecLabel(e.target.value)}
                        disabled={!isSuperAdmin}
                        className="w-full sm:w-2/3 rounded-xl border border-[#33272A] bg-white dark:bg-[#1a1214] dark:text-white px-2 py-1 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={handleAddElectricityOption}
                        disabled={!isSuperAdmin}
                        className="btn-cute bg-amber-300 text-amber-950 text-xs font-black px-3 py-1 rounded-xl border border-[#33272A] shrink-0 cursor-pointer w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        + เพิ่มไฟฟ้า
                      </button>
                    </div>
                  </div>

                  {/* ข้อมูลอินเทอร์เน็ต */}
                  <div className="space-y-2 pt-2 border-t border-[#33272A]/10">
                    <p className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5 text-sky-500" />
                      ประเภทอินเทอร์เน็ตในระบบ:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {internetOptions.map(opt => (
                        <div key={opt.id} className="bg-white dark:bg-[#1a1214] border-2 border-[#33272A] dark:border-[#FFD3B6] px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 dark:text-white">
                          <span>{opt.label}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({opt.id})</span>
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => handleRemoveInternetOption(opt.id)}
                              className="text-rose-500 hover:text-rose-700 font-black cursor-pointer text-xs ml-1"
                              title="ลบตัวเลือกนี้"
                            >
                              &times;
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="รหัส (เช่น starlink)"
                        value={newNetId}
                        onChange={(e) => setNewNetId(e.target.value)}
                        disabled={!isSuperAdmin}
                        className="w-full sm:w-1/3 rounded-xl border border-[#33272A] bg-white dark:bg-[#1a1214] dark:text-white px-2 py-1 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <input
                        type="text"
                        placeholder="ชื่อแสดง (เช่น 📡 Starlink)"
                        value={newNetLabel}
                        onChange={(e) => setNewNetLabel(e.target.value)}
                        disabled={!isSuperAdmin}
                        className="w-full sm:w-2/3 rounded-xl border border-[#33272A] bg-white dark:bg-[#1a1214] dark:text-white px-2 py-1 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={handleAddInternetOption}
                        disabled={!isSuperAdmin}
                        className="btn-cute bg-sky-300 text-sky-950 text-xs font-black px-3 py-1 rounded-xl border border-[#33272A] shrink-0 cursor-pointer w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        + เพิ่มเน็ต
                      </button>
                    </div>
                  </div>

                  {/* ข้อมูลระบบน้ำประปา */}
                  <div className="space-y-2 pt-2 border-t border-[#33272A]/10">
                    <p className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1">
                      <Droplets className="h-3.5 w-3.5 text-blue-500" />
                      ประเภทประปา/แหล่งน้ำในระบบ:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {waterSystemOptions.map(opt => (
                        <div key={opt.id} className="bg-white dark:bg-[#1a1214] border-2 border-[#33272A] dark:border-[#FFD3B6] px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 dark:text-white">
                          <span>{opt.label}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({opt.id})</span>
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => handleRemoveWaterOption(opt.id)}
                              className="text-rose-500 hover:text-rose-700 font-black cursor-pointer text-xs ml-1"
                              title="ลบตัวเลือกนี้"
                            >
                              &times;
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="รหัส (เช่น groundwater)"
                        value={newWaterId}
                        onChange={(e) => setNewWaterId(e.target.value)}
                        disabled={!isSuperAdmin}
                        className="w-full sm:w-1/3 rounded-xl border border-[#33272A] bg-white dark:bg-[#1a1214] dark:text-white px-2 py-1 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <input
                        type="text"
                        placeholder="ชื่อแสดง (เช่น 🚰 น้ำบาดาล)"
                        value={newWaterLabel}
                        onChange={(e) => setNewWaterLabel(e.target.value)}
                        disabled={!isSuperAdmin}
                        className="w-full sm:w-2/3 rounded-xl border border-[#33272A] bg-white dark:bg-[#1a1214] dark:text-white px-2 py-1 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={handleAddWaterOption}
                        disabled={!isSuperAdmin}
                        className="btn-cute bg-blue-300 text-blue-950 text-xs font-black px-3 py-1 rounded-xl border border-[#33272A] shrink-0 cursor-pointer w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        + เพิ่มระบบน้ำ
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

      {/* Modal Dialog: สถานะระบบและโควตาฐานข้อมูล */}
      {isQuotaDrawerOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div
            className="fixed inset-0"
            onClick={() => setIsQuotaDrawerOpen(false)}
          />
          <div className="relative z-10 w-full max-w-3xl max-h-[90vh] bg-white dark:bg-[#1e1518] border-2 sm:border-4 border-[#33272A] dark:border-[#FFD3B6] rounded-3xl p-4 sm:p-6 overflow-y-auto flex flex-col justify-between shadow-2xl my-auto space-y-4">
            <div>
              <div className="flex justify-between items-center border-b-2 border-[#33272A] pb-4 mb-4 dark:border-[#FFD3B6]">
                <h3 className="font-black text-base text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-500 animate-pulse" />
                  สถานะการทำงานระบบ &amp; โควตาฐานข้อมูล MHS1-DMC
                </h3>
                <button
                  onClick={() => setIsQuotaDrawerOpen(false)}
                  className="btn-cute bg-rose-100 hover:bg-rose-200 text-rose-800 px-3 py-1 rounded-xl text-xs font-black cursor-pointer"
                >
                  ปิด ✕
                </button>
              </div>

              <DatabaseQuotaMonitor
                schools={schools}
                studentData={studentData}
                studentGData={studentGData}
                userProfiles={[...pendingUsers, ...approvedUsers]}
                onRefreshData={onRefreshData}
              />
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-right">
              <button
                onClick={() => setIsQuotaDrawerOpen(false)}
                className="btn-cute bg-[#FF8BA7] text-[#33272A] px-5 py-2 text-xs font-black cursor-pointer"
              >
                เรียบร้อย
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog: แก้ไขข้อมูลผู้ใช้งานโดย Super Admin */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div
            className="fixed inset-0"
            onClick={() => setEditingUser(null)}
          />
          <div className="relative z-10 w-full max-w-lg max-h-[90vh] bg-white dark:bg-[#1e1518] border-2 sm:border-4 border-[#33272A] dark:border-[#FFD3B6] rounded-3xl p-4 sm:p-6 overflow-y-auto shadow-2xl space-y-4 my-auto">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b-2 border-[#33272A] pb-3 dark:border-[#FFD3B6]">
                <h3 className="font-black text-sm sm:text-base text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                  <Edit3 className="h-5 w-5 text-[#FF8BA7]" /> แก้ไขข้อมูลและรีเซ็ตรหัสผ่านแอดมิน
                </h3>
                <button 
                  onClick={() => setEditingUser(null)} 
                  className="text-gray-500 hover:text-gray-700 font-bold text-xl cursor-pointer p-1"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSaveUserEdit} className="space-y-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">ชื่อจริง</label>
                      <input
                        type="text"
                        required
                        value={editUserFirstName}
                        onChange={(e) => setEditUserFirstName(e.target.value)}
                        className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">นามสกุล</label>
                      <input
                        type="text"
                        required
                        value={editUserLastName}
                        onChange={(e) => setEditUserLastName(e.target.value)}
                        className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">อีเมล</label>
                    <input
                      type="email"
                      required
                      value={editUserEmail}
                      onChange={(e) => setEditUserEmail(e.target.value)}
                      className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">บทบาทผู้ใช้งาน</label>
                    <select
                      value={editUserRole}
                      onChange={(e) => setEditUserRole(e.target.value as 'super_admin' | 'school_admin')}
                      className="w-full rounded-xl border-2 border-[#33272A] bg-white p-2.5 text-xs font-bold text-[#33272A] dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                    >
                      <option value="school_admin">School Admin (แอดมินโรงเรียน)</option>
                      <option value="super_admin">Super Admin (แอดมินเขตพื้นที่)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">โรงเรียนสังกัด</label>
                    <select
                      value={editUserSchoolId}
                      onChange={(e) => setEditUserSchoolId(e.target.value)}
                      className="w-full rounded-xl border-2 border-[#33272A] bg-white p-2.5 text-xs font-bold text-[#33272A] dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                    >
                      <option value="all">สพป.แม่ฮ่องสอน เขต 1 (ส่วนกลาง/เขตพื้นที่)</option>
                      {schools.map(s => (
                        <option key={s.id} value={s.id}>{s.id} - {s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ส่วนรีเซ็ตรหัสผ่านด่วน */}
                <div className="bg-[#FFD3B6]/20 p-3.5 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6]/20 space-y-2">
                  <p className="text-[11px] sm:text-xs text-[#33272A]/80 dark:text-[#FFF9F5]/80 font-black flex items-center gap-1">
                    <Key className="h-4 w-4 text-[#FF8BA7]" /> รีเซ็ตรหัสผ่านสำหรับแอดมินท่านนี้
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-gray-500 font-semibold leading-relaxed">
                    ระบบจะส่งอีเมลลิงก์สำหรับกำหนดรหัสผ่านใหม่ไปยังที่อยู่อีเมลของผู้ใช้ท่านนี้โดยตรง เพื่อความปลอดภัยและเป็นความลับ
                  </p>
                  <button
                    type="button"
                    disabled={isResettingPassword}
                    onClick={handleSendPasswordReset}
                    className="w-full py-2 bg-[#FF8BA7]/20 border-2 border-[#33272A] text-[#33272A] hover:bg-[#FF8BA7]/30 rounded-xl text-xs font-black transition-colors cursor-pointer leading-normal break-words"
                  >
                    {isResettingPassword ? 'กำลังดำเนินการส่งอีเมล...' : 'ส่งอีเมลลิงก์รีเซ็ตรหัสผ่าน'}
                  </button>
                  <div className="bg-amber-50/60 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 p-2.5 rounded-xl border border-amber-200/50 text-[10px] sm:text-[11px] font-semibold space-y-1">
                    <p className="font-bold">💡 ทำไมผู้ใช้ไม่ได้รับอีเมลรีเซ็ตรหัสผ่าน?</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><span className="font-bold text-rose-500">ตรวจสอบโฟลเดอร์ "อีเมลขยะ" (Spam / Junk Mail):</span> อีเมลเริ่มต้นของระบบ Firebase มักจะถูกกรองเป็นสแปม</li>
                      <li><span className="font-bold text-[#FF8BA7]">เข้าสู่ระบบด้วย Google:</span> หากผู้ใช้รายนี้สมัครเข้าใช้งานด้วยการกดปุ่ม "Gmail (Google)" เขาจะไม่มีรหัสผ่านในระบบ</li>
                    </ul>
                  </div>
                </div>

                {userEditSuccess && (
                  <div className="rounded-xl bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 p-3 text-xs font-bold border border-teal-200">
                    {userEditSuccess}
                  </div>
                )}

                {userEditError && (
                  <div className="rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-3 text-xs font-bold border border-rose-200">
                    {userEditError}
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-2 border-t-2 border-[#33272A] dark:border-[#FFD3B6]">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 px-4 py-2 text-xs font-black cursor-pointer hover:bg-gray-200 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingUserEdit}
                    className="rounded-xl bg-[#A0E7E5] text-[#33272A] border-2 border-[#33272A] px-5 py-2 text-xs font-black cursor-pointer hover:bg-[#A0E7E5]/80 transition-colors disabled:opacity-50"
                  >
                    {isSavingUserEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog: แก้ไขข้อมูลนักเรียน BIGDATA */}
      {editingStudentDataRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div
            className="fixed inset-0"
            onClick={() => setEditingStudentDataRecord(null)}
          />
          <div className="relative z-10 w-full max-w-lg max-h-[90vh] bg-white dark:bg-[#1e1518] border-2 sm:border-4 border-[#33272A] dark:border-[#FFD3B6] rounded-3xl p-4 sm:p-6 overflow-y-auto shadow-2xl space-y-4 my-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b-2 border-[#33272A] pb-3 dark:border-[#FFD3B6]">
                <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                  <Edit3 className="h-4.5 w-4.5 text-[#FF8BA7]" />
                  แก้ไขจำนวนนักเรียน BIGDATA: {editingStudentDataRecord.schoolName}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingStudentDataRecord(null)}
                  className="text-slate-400 hover:text-slate-600 font-black text-xl p-1 cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-3 text-xs font-bold">
                <div className="p-2.5 bg-[#FFD3B6]/30 rounded-xl border border-[#33272A]/20">
                  <span>ปีการศึกษา: </span>
                  <span className="font-mono text-rose-600">{editingStudentDataRecord.academicYear}</span>
                  <span className="ml-4">รหัสโรงเรียน: </span>
                  <span className="font-mono text-blue-600">{editingStudentDataRecord.schoolId}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-600 dark:text-slate-300">จำนวนนักเรียนชาย (คน)</label>
                    <input
                      type="number"
                      min={0}
                      value={editStudentMale}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setEditStudentMale(val);
                        setEditStudentTotal(val + editStudentFemale);
                      }}
                      className="w-full input-cute p-2 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-600 dark:text-slate-300">จำนวนนักเรียนหญิง (คน)</label>
                    <input
                      type="number"
                      min={0}
                      value={editStudentFemale}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setEditStudentFemale(val);
                        setEditStudentTotal(editStudentMale + val);
                      }}
                      className="w-full input-cute p-2 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-600 dark:text-slate-300">รวมทั้งหมด (คน)</label>
                    <input
                      type="number"
                      min={0}
                      value={editStudentTotal}
                      onChange={(e) => setEditStudentTotal(Number(e.target.value))}
                      className="w-full input-cute p-2 font-mono bg-rose-50 dark:bg-rose-950/20 text-rose-600 font-black"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-600 dark:text-slate-300">จำนวนห้องเรียน</label>
                    <input
                      type="number"
                      min={0}
                      value={editStudentClasses}
                      onChange={(e) => setEditStudentClasses(Number(e.target.value))}
                      className="w-full input-cute p-2 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setEditingStudentDataRecord(null)}
                className="btn-cute bg-gray-200 text-gray-800 px-4 py-2 text-xs font-bold hover:bg-gray-300 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveStudentDataEdit}
                className="btn-cute bg-[#FF8BA7] text-[#33272A] px-5 py-2 text-xs font-black cursor-pointer hover:bg-[#FF8BA7]/80"
              >
                บันทึกข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog: แก้ไขจำนวนนักเรียนตัว G */}
      {editingGRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div
            className="fixed inset-0"
            onClick={() => setEditingGRecord(null)}
          />
          <div className="relative z-10 w-full max-w-lg max-h-[90vh] bg-white dark:bg-[#1e1518] border-2 sm:border-4 border-[#33272A] dark:border-[#FFD3B6] rounded-3xl p-4 sm:p-6 overflow-y-auto shadow-2xl space-y-4 my-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b-2 border-[#33272A] pb-3 dark:border-[#FFD3B6]">
                <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                  <Edit3 className="h-4.5 w-4.5 text-[#FF8BA7]" />
                  แก้ไขจำนวนนักเรียนตัว G: {editingGRecord.schoolName}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingGRecord(null)}
                  className="text-slate-400 hover:text-slate-600 font-black text-xl p-1 cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-3 text-xs font-bold">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200">
                  <span>ปีการศึกษา: </span>
                  <span className="font-mono text-blue-600">{editingGRecord.academicYear}</span>
                  <span className="ml-4">รหัสโรงเรียน: </span>
                  <span className="font-mono text-slate-700 dark:text-slate-200">{editingGRecord.schoolId}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-600 dark:text-slate-300">จำนวนนักเรียนชายตัว G (คน)</label>
                    <input
                      type="number"
                      min={0}
                      value={editGMale}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setEditGMale(val);
                        setEditGTotal(val + editGFemale);
                      }}
                      className="w-full input-cute p-2 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-600 dark:text-slate-300">จำนวนนักเรียนหญิงตัว G (คน)</label>
                    <input
                      type="number"
                      min={0}
                      value={editGFemale}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setEditGFemale(val);
                        setEditGTotal(editGMale + val);
                      }}
                      className="w-full input-cute p-2 font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-slate-600 dark:text-slate-300">รวมจำนวนนักเรียนตัว G ทั้งหมด (คน)</label>
                    <input
                      type="number"
                      min={0}
                      value={editGTotal}
                      onChange={(e) => setEditGTotal(Number(e.target.value))}
                      className="w-full input-cute p-2 font-mono bg-blue-50 dark:bg-blue-950/20 text-blue-600 font-black text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-slate-600 dark:text-slate-300">หมายเหตุ</label>
                    <input
                      type="text"
                      value={editGNotes}
                      onChange={(e) => setEditGNotes(e.target.value)}
                      placeholder="เช่น ข้อมูลปรับปรุงล่าสุด..."
                      className="w-full input-cute p-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setEditingGRecord(null)}
                className="btn-cute bg-gray-200 text-gray-800 px-4 py-2 text-xs font-bold hover:bg-gray-300 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveGRecordEdit}
                className="btn-cute bg-[#FF8BA7] text-[#33272A] px-5 py-2 text-xs font-black cursor-pointer hover:bg-[#FF8BA7]/80"
              >
                บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
