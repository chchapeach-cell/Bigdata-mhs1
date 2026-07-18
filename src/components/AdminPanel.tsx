import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { School, StudentData, UserProfile } from '../types';
import { Shield, Upload, Edit3, UserCheck, Save, AlertCircle, RefreshCw, Phone, Zap, Globe, Users, GraduationCap, Building, Database, Trash2, History, List, Key, User, Search, Eye } from 'lucide-react';
import { collection, query, where, getDocs, updateDoc, doc, setDoc, getDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { updatePassword, sendPasswordResetEmail } from 'firebase/auth';
import * as XLSX from 'xlsx';

interface AdminPanelProps {
  userProfile: UserProfile;
  schools: School[];
  studentData: StudentData[];
  onRefreshData: () => Promise<void>;
}

export default function AdminPanel({
  userProfile,
  schools,
  studentData,
  onRefreshData
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
  const [editElectricity, setEditElectricity] = useState(true);
  const [editStaffCount, setEditStaffCount] = useState(5);
  const [editDirectorPhone, setEditDirectorPhone] = useState('');
  const [editSchoolPhone, setEditSchoolPhone] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
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
      setEditStaffCount(targetSchool.staffCount !== undefined ? targetSchool.staffCount : 5);
      setEditDirectorPhone(targetSchool.directorPhone || '');
      setEditSchoolPhone(targetSchool.schoolPhone || '');
      setEditImageUrl(targetSchool.imageUrl || '');
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

  // State สำหรับ Super Admin
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<UserProfile[]>([]);
  const [downloadLogs, setDownloadLogs] = useState<any[]>([]);
  const [adminTab, setAdminTab] = useState<'upload' | 'users' | 'logs'>('upload');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [uploadYear, setUploadYear] = useState('2568');
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  // State สำหรับการลบข้อมูลรายปีการศึกษา
  const [deleteYear, setDeleteYear] = useState('');
  const [isDeletingYear, setIsDeletingYear] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');

  // นโยบายจำกัด 1 แอดมินต่อโรงเรียน และการเปิด-ปิดรับสมัครแอดมิน
  const [restrictOneAdminPerSchool, setRestrictOneAdminPerSchool] = useState(true);
  const [allowSchoolAdminRegistration, setAllowSchoolAdminRegistration] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');

  // โหลดข้อมูลนโยบายสิทธิ์การรับสมัครจาก Firestore (เฉพาะ Super Admin)
  const loadSystemSettings = async () => {
    if (!isSuperAdmin) return;
    try {
      const configSnap = await getDoc(doc(db, 'settings', 'system_config'));
      if (configSnap.exists()) {
        const data = configSnap.data();
        if (data.restrictOneAdminPerSchool !== undefined) {
          setRestrictOneAdminPerSchool(data.restrictOneAdminPerSchool);
        }
        if (data.allowSchoolAdminRegistration !== undefined) {
          setAllowSchoolAdminRegistration(data.allowSchoolAdminRegistration);
        }
      }
    } catch (e) {
      console.error('Failed to load system settings:', e);
    }
  };

  // บันทึกและสลับสถานะนโยบาย (เฉพาะ Super Admin)
  const handleToggleRestriction = async (field: 'restrictOneAdminPerSchool' | 'allowSchoolAdminRegistration', newValue: boolean) => {
    if (!isSuperAdmin) return;
    setIsSavingSettings(true);
    setSettingsSuccess('');
    try {
      await setDoc(doc(db, 'settings', 'system_config'), {
        [field]: newValue,
        updatedAt: new Date()
      }, { merge: true });
      
      if (field === 'restrictOneAdminPerSchool') {
        setRestrictOneAdminPerSchool(newValue);
      } else {
        setAllowSchoolAdminRegistration(newValue);
      }
      
      setSettingsSuccess('อัปเดตนโยบายระบบเรียบร้อยแล้ว!');
      setTimeout(() => setSettingsSuccess(''), 4000);
    } catch (e) {
      console.error('Failed to save settings:', e);
      alert('เกิดข้อผิดพลาดในการบันทึกนโยบายผู้สมัคร');
    } finally {
      setIsSavingSettings(false);
    }
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
      
      // ดึงรายชื่อวิชาเอกจากทั้งส่วนคั่นจุลภาคและจากลิสต์ที่มีจำนวนครู
      const textMajors = editMajorsStr.split(',').map(m => m.trim()).filter(m => m !== '');
      const listMajors = editMajorsWithStaff.map(m => m.name);
      
      // รวมวิชาเอกทั้งหมดเข้าด้วยกันแบบ Unique
      const combinedMajors = Array.from(new Set([...textMajors, ...listMajors]));
      
      // สร้างรายการ วิชาเอกพร้อมจำนวนครู
      // ตัวใดที่มีอยู่ในลิสต์ ก็ใช้จำนวนครูเดิม ตัวที่กรอกใหม่ทางข้อความแต่ยังไม่มีในลิสต์ ให้ตั้งจำนวนครูเริ่มต้นเป็น 1 คน
      const updatedMajorsWithStaff = combinedMajors.map(name => {
        const found = editMajorsWithStaff.find(m => m.name === name);
        return {
          name,
          teachersCount: found ? found.teachersCount : 1
        };
      });

      const updatedFields = {
        name: editSchoolName,
        amphoe: editAmphoe,
        networkGroup: editNetworkGroup,
        internetType: editInternet,
        electricity: editElectricity,
        staffCount: Number(editStaffCount),
        directorPhone: editDirectorPhone,
        schoolPhone: editSchoolPhone,
        imageUrl: editImageUrl,
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

    try {
      // ดึง input file
      const fileInput = document.getElementById('upload-file-input') as HTMLInputElement;
      const file = fileInput?.files?.[0];
      if (!file) {
        setUploadError('ไม่พบไฟล์ที่จะอัปโหลด');
        setIsUploading(false);
        return;
      }

      const workbook = await parseFileWithEncoding(file);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

      let processedCount = 0;

      // วนลูปบันทึกข้อมูลโรงเรียนแต่ละแห่ง
      for (let i = 1; i < rows.length; i++) {
            const parts = rows[i];
            if (parts.length < 15 || !parts[2]) continue; // ข้ามแถวที่ข้อมูลไม่ครบ

            const schoolId = String(parts[2]).trim();
            const schoolNameRaw = String(parts[3] || '').trim();

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
                schoolName: schoolNameRaw.replace(/[^\u0E00-\u0E7F0-9a-zA-Z\s]/g, '') || schoolNameRaw,
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
            let size: School['size'] = 'small';
            if (totalStudents >= 1500) size = 'special_large';
            else if (totalStudents >= 300) size = 'large';
            else if (totalStudents >= 120) size = 'medium';

            // บันทึกเฉพาะข้อมูลพื้นฐานโครงสร้างแบบเบื้องต้น
            try {
              await setDoc(schoolDocRef, {
                id: schoolId,
                name: schoolNameRaw.replace(/[^\u0E00-\u0E7F0-9a-zA-Z\s]/g, '') || schoolNameRaw,
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
          }

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

      {/* แก้ไขข้อมูลส่วนตัวสำหรับผู้ใช้งานทุกคน (เจ้าตัวแก้ไขข้อมูลตัวเอง) */}
      <div className="card p-6 border-l-4 border-l-[#A0E7E5]">
        <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5 mb-4 border-b-2 border-[#33272A] pb-3 dark:border-[#FFD3B6]">
          <User className="h-4.5 w-4.5 text-[#A0E7E5]" /> แก้ไขข้อมูลโปรไฟล์ส่วนตัวของคุณ ({userProfile.email})
        </h3>
        
        <form onSubmit={handleSaveSelfProfile} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">ชื่อจริง</label>
              <input
                type="text"
                required
                value={selfFirstName}
                onChange={(e) => setSelfFirstName(e.target.value)}
                className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">นามสกุล</label>
              <input
                type="text"
                required
                value={selfLastName}
                onChange={(e) => setSelfLastName(e.target.value)}
                className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1">
                <Key className="h-3.5 w-3.5 text-[#FF8BA7]" /> เปลี่ยนรหัสผ่านใหม่ (หากไม่เปลี่ยนให้เว้นว่างไว้)
              </label>
              <input
                type="password"
                placeholder="ป้อนอย่างน้อย 6 อักขระเพื่อเปลี่ยนรหัสผ่าน"
                value={selfPassword}
                onChange={(e) => setSelfPassword(e.target.value)}
                className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
              />
            </div>
          </div>

          {selfSuccess && (
            <div className="rounded-xl bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 p-3 text-xs font-bold border border-teal-200">
              {selfSuccess}
            </div>
          )}
          
          {selfError && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-3 text-xs font-bold border border-rose-200">
              {selfError}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSavingSelf}
              className="button bg-[#A0E7E5] text-[#33272A] hover:bg-[#A0E7E5]/80 py-2 px-5 text-xs font-black disabled:opacity-50 cursor-pointer"
            >
              {isSavingSelf ? 'กำลังบันทึกข้อมูล...' : 'บันทึกข้อมูลโปรไฟล์ส่วนตัว'}
            </button>
          </div>
        </form>
      </div>

      {/* แผงแก้ไขข้อมูลสถานศึกษาสำหรับ แอดมินโรงเรียน และ Super Admin (แก้ไขได้ทุกโรงเรียน) */}
      <div className="card p-6">
        <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5 mb-4 border-b-2 border-[#33272A] pb-3 dark:border-[#FFD3B6]">
          <Edit3 className="h-4.5 w-4.5 text-[#FF8BA7]" /> 
          {isSuperAdmin ? 'แก้ไขข้อมูลพื้นฐานสถานศึกษาในระบบ (สิทธิ์ Super Admin)' : 'แก้ไขข้อมูลพื้นฐานของสถานศึกษาตนเอง'}
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
              {/* ชื่อโรงเรียน */}
              <div className="space-y-1">
                <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">ชื่อสถานศึกษา</label>
                <input
                  type="text"
                  required
                  value={editSchoolName}
                  onChange={(e) => setEditSchoolName(e.target.value)}
                  className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                />
              </div>

              {/* รูปภาพโรงเรียน */}
              <div className="space-y-1">
                <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">URL รูปภาพโรงเรียน</label>
                <input
                  type="text"
                  required
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  placeholder="เช่น https://images.unsplash.com/..."
                  className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                />
              </div>

              {/* อำเภอ */}
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

              {/* กลุ่มเครือข่าย */}
              <div className="space-y-1">
                <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">กลุ่มพัฒนาคุณภาพการศึกษา (เครือข่าย)</label>
                <input
                  type="text"
                  value={editNetworkGroup}
                  onChange={(e) => setEditNetworkGroup(e.target.value)}
                  placeholder="เช่น เครือข่ายปายสามัคคี, เครือข่ายคีรีราษฎร์"
                  className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                />
              </div>

              {/* ระบบเน็ต */}
              <div className="space-y-1">
                <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">ระบบอินเทอร์เน็ตที่ใช้งาน</label>
                <select
                  value={editInternet}
                  onChange={(e) => setEditInternet(e.target.value as School['internetType'])}
                  className="w-full rounded-xl border-2 border-[#33272A] bg-white p-2 text-xs font-bold text-[#33272A] dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                >
                  <option value="fiber">อินเทอร์เน็ตความเร็วสูง (Fiber Optic)</option>
                  <option value="satellite">จานดาวเทียม (เช่น DLTV/IPStar/Starlink)</option>
                  <option value="sim">ใช้ระบบซิมมือถือ (SIM 4G/5G)</option>
                  <option value="none">ไม่ได้ใช้ระบบอินเทอร์เน็ต</option>
                </select>
              </div>

              {/* กระแสไฟฟ้า */}
              <div className="space-y-1">
                <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">กระแสไฟฟ้า</label>
                <select
                  value={editElectricity ? 'true' : 'false'}
                  onChange={(e) => setEditElectricity(e.target.value === 'true')}
                  className="w-full rounded-xl border-2 border-[#33272A] bg-white p-2 text-xs font-bold text-[#33272A] dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                >
                  <option value="true">มีไฟฟ้าใช้งานสมบูรณ์</option>
                  <option value="false">ไม่มีกระแสไฟฟ้า/ใช้พลังงานทดแทน</option>
                </select>
              </div>

              {/* จำนวนครู */}
              <div className="space-y-1">
                <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">จำนวนครูและบุคลากรในโรงเรียน (คน)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={editStaffCount}
                  onChange={(e) => setEditStaffCount(Number(e.target.value))}
                  className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                />
              </div>

              {/* วิชาเอกหลัก (คั่นด้วย Comma) */}
              <div className="space-y-1">
                <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">วิชาเอกที่มีความพร้อม (คั่นด้วยจุลภาค ",")</label>
                <input
                  type="text"
                  value={editMajorsStr}
                  onChange={(e) => setEditMajorsStr(e.target.value)}
                  placeholder="เช่น ปฐมวัย, คณิตศาสตร์, ภาษาอังกฤษ"
                  className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                />
              </div>

              {/* วิชาเอกแยกสถิติจำนวนครู (Interactive) */}
              <div className="sm:col-span-2 bg-[#FFF9F5] dark:bg-[#150e10] p-4 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6]/20 space-y-3">
                <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1">
                  <GraduationCap className="h-4 w-4 text-[#FF8BA7]" /> ระบุวิชาเอกพร้อมจำนวนครูผู้เชี่ยวชาญ
                </label>
                
                {/* เพิ่มวิชาเอกใหม่ */}
                <div className="flex flex-wrap gap-2 items-end bg-white dark:bg-slate-800 p-2.5 rounded-xl border-2 border-[#33272A]/20">
                  <div className="flex-1 min-w-[120px] space-y-1">
                    <span className="text-[10px] font-bold text-slate-500">ชื่อวิชาเอก</span>
                    <input 
                      type="text"
                      placeholder="เช่น ภาษาไทย, คอมพิวเตอร์"
                      value={newMajorName}
                      onChange={(e) => setNewMajorName(e.target.value)}
                      className="w-full rounded-lg border border-[#33272A]/40 bg-white p-1 text-xs font-bold outline-none focus:ring-1 focus:ring-[#FF8BA7]"
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500">จำนวนครู (คน)</span>
                    <input 
                      type="number"
                      min="0"
                      value={newMajorCount}
                      onChange={(e) => setNewMajorCount(Number(e.target.value))}
                      className="w-full rounded-lg border border-[#33272A]/40 bg-white p-1 text-xs font-bold outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newMajorName.trim()) return;
                      // เช็คซ้ำ
                      if (editMajorsWithStaff.some(m => m.name.toLowerCase() === newMajorName.trim().toLowerCase())) {
                        alert('วิชาเอกนี้มีอยู่ในรายการแล้ว');
                        return;
                      }
                      setEditMajorsWithStaff(prev => [...prev, { name: newMajorName.trim(), teachersCount: newMajorCount }]);
                      setNewMajorName('');
                      setNewMajorCount(1);
                    }}
                    className="btn-cute bg-[#A0E7E5] text-[#33272A] text-xs font-black px-4 py-1.5 cursor-pointer shrink-0"
                  >
                    + เพิ่มวิชาเอก
                  </button>
                </div>

                {/* รายการวิชาเอกปัจจุบัน */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {editMajorsWithStaff.length > 0 ? (
                    editMajorsWithStaff.map((m, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white dark:bg-[#1e1518] p-2 rounded-xl border border-[#33272A]/20 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5]">
                        <span>{m.name}</span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-500 font-semibold">จำนวนครู:</span>
                            <input
                              type="number"
                              min="0"
                              value={m.teachersCount}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setEditMajorsWithStaff(prev => prev.map((item, i) => i === idx ? { ...item, teachersCount: val } : item));
                              }}
                              className="w-12 rounded border border-[#33272A]/30 bg-white p-0.5 text-center text-xs font-bold text-[#33272A]"
                            />
                            <span>คน</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditMajorsWithStaff(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="text-rose-500 hover:text-rose-700 font-black cursor-pointer text-sm px-1"
                            title="ลบ"
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-slate-400 text-xs font-bold">ยังไม่มีข้อมูลวิชาเอกและจำนวนครู กรุณาเพิ่มข้อมูลด้านบน</div>
                  )}
                </div>
              </div>

              {/* เบอร์ติดต่อโรงเรียน */}
              <div className="space-y-1">
                <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">เบอร์โทรศัพท์ติดต่อโรงเรียน</label>
                <input
                  type="text"
                  required
                  value={editSchoolPhone}
                  onChange={(e) => setEditSchoolPhone(e.target.value)}
                  className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                />
              </div>

              {/* เบอร์โทรศัพท์ผู้บริหาร */}
              <div className="space-y-1">
                <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">เบอร์โทรศัพท์ส่วนตัวผู้บริหาร</label>
                <input
                  type="text"
                  required
                  value={editDirectorPhone}
                  onChange={(e) => setEditDirectorPhone(e.target.value)}
                  className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                />
              </div>

              {/* ข้อความแจ้งเตือน */}
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
                  className="btn-cute bg-[#FF8BA7] text-[#33272A] px-5 py-2.5 text-xs font-black flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="h-4.5 w-4.5" />
                  {isSavingSchool ? 'กำลังบันทึกข้อมูล...' : 'บันทึกข้อมูลสถานศึกษา'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* แผงเมนู (เฉพาะ Super Admin) */}
      {isSuperAdmin && (
        <div className="space-y-4">
          {/* ข้อมูลการเชื่อมต่อฐานข้อมูล MHS1-DMC */}
          <div className="bg-[#A0E7E5]/25 p-3 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] flex flex-wrap gap-2 items-center justify-between text-[11px] font-black text-[#33272A] dark:text-[#FFF9F5]">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span>ระบบเชื่อมต่อสำเร็จ: <span className="text-emerald-600 dark:text-emerald-400">ฐานข้อมูลพร้อมใช้งานในเครือข่าย MHS1-DMC</span></span>
            </div>
            <div className="font-bold text-[10px] text-[#33272A]/80 dark:text-[#FFF9F5]/80">
              Project ID: <span className="font-mono bg-white/60 dark:bg-black/30 px-1.5 py-0.5 rounded border border-[#33272A]/20">mhs1-dmc</span> | Database: <span className="font-mono bg-white/60 dark:bg-black/30 px-1.5 py-0.5 rounded border border-[#33272A]/20">ai-studio-mhs1bigdata-b097cba8...</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setAdminTab('upload')}
              className={`px-4 py-2 rounded-xl text-xs font-black border-2 border-[#33272A] transition-all ${
                adminTab === 'upload' 
                  ? 'bg-[#FF8BA7] text-[#33272A] shadow-[2px_2px_0px_#33272A]' 
                  : 'bg-white text-[#33272A]/70 hover:bg-[#FFD3B6]/30 dark:bg-slate-800 dark:text-[#FFF9F5]/70'
              }`}
            >
              <Upload className="h-4 w-4 inline-block mr-1.5" /> จัดการข้อมูล BIGDATA
            </button>
            <button
              onClick={() => setAdminTab('users')}
              className={`px-4 py-2 rounded-xl text-xs font-black border-2 border-[#33272A] transition-all ${
                adminTab === 'users' 
                  ? 'bg-[#A0E7E5] text-[#33272A] shadow-[2px_2px_0px_#33272A]' 
                  : 'bg-white text-[#33272A]/70 hover:bg-[#FFD3B6]/30 dark:bg-slate-800 dark:text-[#FFF9F5]/70'
              }`}
            >
              <Users className="h-4 w-4 inline-block mr-1.5" /> ทะเบียนผู้ใช้งาน
              {pendingUsers.length > 0 && (
                <span className="ml-1.5 bg-rose-500 text-white rounded-full px-2 py-0.5 text-[10px] animate-pulse">
                  {pendingUsers.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setAdminTab('logs')}
              className={`px-4 py-2 rounded-xl text-xs font-black border-2 border-[#33272A] transition-all ${
                adminTab === 'logs' 
                  ? 'bg-[#FFD3B6] text-[#33272A] shadow-[2px_2px_0px_#33272A]' 
                  : 'bg-white text-[#33272A]/70 hover:bg-[#FFD3B6]/30 dark:bg-slate-800 dark:text-[#FFF9F5]/70'
              }`}
            >
              <History className="h-4 w-4 inline-block mr-1.5" /> ประวัติการดาวน์โหลด
            </button>
          </div>

          {adminTab === 'upload' && (
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-1 flex flex-col gap-6">
                {/* นโยบายระบบ */}
                <div className="card p-6">
                  <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5 mb-4 border-b-2 border-[#33272A] pb-3 dark:border-[#FFD3B6]">
                    <Shield className="h-4.5 w-4.5 text-[#FF8BA7]" /> นโยบายระบบ
                  </h3>
                  <p className="text-[10px] text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-bold leading-relaxed mb-4">
                    จัดการสิทธิ์การสมัครสมาชิกและการเข้าถึงของแอดมินระดับโรงเรียน
                  </p>
                  <div className="space-y-3">
                    <div className="p-2.5 bg-[#FFF9F5] dark:bg-slate-900 rounded-xl border border-[#33272A] dark:border-[#FFD3B6] flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black text-[#33272A] dark:text-[#FFF9F5]">ระบบเปิดรับสมัครแอดมิน</span>
                      <button
                        type="button"
                        onClick={() => handleToggleRestriction('allowSchoolAdminRegistration', !allowSchoolAdminRegistration)}
                        disabled={isSavingSettings}
                        className={`px-3 py-1.5 text-[10px] font-black rounded-lg border border-[#33272A] transition-all cursor-pointer ${
                          allowSchoolAdminRegistration 
                            ? 'bg-emerald-300 text-[#33272A] shadow-[2px_2px_0px_0px_#33272A]' 
                            : 'bg-slate-200 text-slate-500 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {isSavingSettings ? 'บันทึก...' : allowSchoolAdminRegistration ? 'เปิดรับสมัคร' : 'ปิดรับสมัคร'}
                      </button>
                    </div>
                    <div className="p-2.5 bg-[#FFF9F5] dark:bg-slate-900 rounded-xl border border-[#33272A] dark:border-[#FFD3B6] flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black text-[#33272A] dark:text-[#FFF9F5]">จำกัด 1 คนต่อโรงเรียน</span>
                      <button
                        type="button"
                        onClick={() => handleToggleRestriction('restrictOneAdminPerSchool', !restrictOneAdminPerSchool)}
                        disabled={isSavingSettings}
                        className={`px-3 py-1.5 text-[10px] font-black rounded-lg border border-[#33272A] transition-all cursor-pointer ${
                          restrictOneAdminPerSchool 
                            ? 'bg-[#FF8BA7] text-[#33272A] shadow-[2px_2px_0px_0px_#33272A]' 
                            : 'bg-slate-200 text-slate-500 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {isSavingSettings ? 'บันทึก...' : restrictOneAdminPerSchool ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                      </button>
                    </div>
                  </div>
                  {settingsSuccess && (
                    <p className="mt-3 text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 p-2 rounded-lg border border-emerald-500 text-center animate-fade-in">
                      {settingsSuccess}
                    </p>
                  )}
                </div>

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
                  ระบบนี้รองรับไฟล์ Excel (.xlsx) และ CSV ที่มีโครงสร้างเหมือนหัวข้อไฟล์ที่ได้รับ (รวมอนุบาล ประถม ม.1 - ม.3) ข้อมูลจะบันทึกประสานลงในระบบ dmc-mhs1 และแบ่งปันสถิติตลอดทั้งเขตพื้นที่ สพป.แม่ฮ่องสอน เขต 1
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
                      // Format timestamp
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
        </div>
      )}

      {/* Modal แก้ไขข้อมูลผู้ใช้งานโดย Super Admin */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-[#1e1518] rounded-3xl border-4 border-[#33272A] dark:border-[#FFD3B6] p-6 max-w-md w-full shadow-[6px_6px_0px_#33272A] dark:shadow-[6px_6px_0px_#FFD3B6] space-y-4">
            <div className="flex justify-between items-center border-b-2 border-[#33272A] pb-3 dark:border-[#FFD3B6]">
              <h3 className="font-black text-sm text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                <Edit3 className="h-5 w-5 text-[#FF8BA7]" /> แก้ไขข้อมูลและรีเซ็ตรหัสผ่านแอดมิน
              </h3>
              <button 
                onClick={() => setEditingUser(null)} 
                className="text-gray-500 hover:text-gray-700 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-4">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
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
                <p className="text-[11px] text-[#33272A]/80 dark:text-[#FFF9F5]/80 font-black flex items-center gap-1">
                  <Key className="h-4 w-4 text-[#FF8BA7]" /> รีเซ็ตรหัสผ่านสำหรับแอดมินท่านนี้
                </p>
                <p className="text-[10px] text-gray-500 font-semibold leading-relaxed">
                  ระบบจะส่งอีเมลลิงก์สำหรับกำหนดรหัสผ่านใหม่ไปยังที่อยู่อีเมลของผู้ใช้ท่านนี้โดยตรง เพื่อความปลอดภัยและเป็นความลับ
                </p>
                <button
                  type="button"
                  disabled={isResettingPassword}
                  onClick={handleSendPasswordReset}
                  className="w-full py-1.5 bg-[#FF8BA7]/20 border-2 border-[#33272A] text-[#33272A] hover:bg-[#FF8BA7]/30 rounded-xl text-xs font-black transition-colors cursor-pointer"
                >
                  {isResettingPassword ? 'กำลังดำเนินการส่งอีเมล...' : 'ส่งอีเมลลิงก์รีเซ็ตรหัสผ่าน'}
                </button>
                <div className="bg-amber-50/60 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 p-2.5 rounded-xl border border-amber-200/50 text-[10px] font-semibold space-y-1">
                  <p className="font-bold">💡 ทำไมผู้ใช้ไม่ได้รับอีเมลรีเซ็ตรหัสผ่าน?</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li><span className="font-bold text-rose-500">ตรวจสอบโฟลเดอร์ "อีเมลขยะ" (Spam / Junk Mail):</span> อีเมลเริ่มต้นของระบบ Firebase มักจะถูกกรองเป็นสแปม</li>
                    <li><span className="font-bold text-[#FF8BA7]">เข้าสู่ระบบด้วย Google:</span> หากผู้ใช้รายนี้สมัครเข้าใช้งานด้วยการกดปุ่ม "Gmail (Google)" เขาจะไม่มีรหัสผ่านในระบบ (ให้ล็อกอินผ่านปุ่ม Gmail ตามเดิมได้เลยโดยไม่ต้องรีเซ็ตรหัสผ่าน)</li>
                    <li><span className="font-bold">การเปิดใช้งานใน Firebase Console:</span> ตรวจสอบให้แน่ใจว่าได้เปิดใช้งาน Email Template ในส่วนของ "Password reset" ในหน้า Firebase Console &gt; Authentication &gt; Templates แล้ว</li>
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
      )}
    </div>
  );
}
