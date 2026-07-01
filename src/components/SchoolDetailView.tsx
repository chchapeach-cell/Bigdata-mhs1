import { useState, useMemo, useEffect, ChangeEvent } from 'react';
import { School, StudentData, UserProfile } from '../types';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { 
  ArrowLeft, Phone, MapPin, Building, Globe, Zap, 
  Users, GraduationCap, Grid, Edit2, Save, X, Upload, Image, AlertCircle, CheckCircle2, Loader2 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SchoolDetailViewProps {
  school: School;
  studentData: StudentData | null;
  onBack: () => void;
  userProfile: UserProfile | null;
  onRefreshData: () => Promise<void>;
  isDarkMode?: boolean;
}

export default function SchoolDetailView({
  school,
  studentData,
  onBack,
  userProfile,
  onRefreshData,
  isDarkMode = false
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

  // ตรวจสอบสิทธิ์การเข้าถึงข้อมูลเฉพาะ (เบอร์โทรศัพท์ผู้บริหาร)
  const hasAdminAccess = useMemo(() => {
    if (!userProfile) return false;
    if (userProfile.role === 'super_admin') return true;
    if (userProfile.role === 'school_admin' && userProfile.schoolId === school.id) return true;
    return false;
  }, [userProfile, school.id]);

  // ฟอร์มข้อมูลแก้ไข
  const [editName, setEditName] = useState(school.name);
  const [editDirectorPhone, setEditDirectorPhone] = useState(school.directorPhone || '');
  const [editSchoolPhone, setEditSchoolPhone] = useState(school.schoolPhone || '');
  const [editInternetType, setEditInternetType] = useState<School['internetType']>(school.internetType || 'none');
  const [editElectricity, setEditElectricity] = useState(school.electricity);
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
  const [adminViewType, setAdminViewType] = useState<'logo' | 'director'>('logo');
  const [activeImageTab, setActiveImageTab] = useState<'cover' | 'logo' | 'director'>('cover');

  // อัปเดตฟอร์มเมื่อเปลี่ยนโรงเรียน (เช่น ได้ข้อมูลใหม่จากการ Refresh)
  useEffect(() => {
    setEditName(school.name);
    setEditDirectorPhone(school.directorPhone || '');
    setEditSchoolPhone(school.schoolPhone || '');
    setEditInternetType(school.internetType || 'none');
    setEditElectricity(school.electricity);
    setEditStaffCount(school.staffCount);
    setEditMajorsStr(school.majorSubjects ? school.majorSubjects.join(', ') : '');
    setEditImageUrl(school.imageUrl || '');
    setEditLogoUrl(school.logoUrl || '');
    setEditDirectorImageUrl(school.directorImageUrl || '');
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
  }, [school]);

  const handleLocalImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      if (result) {
        setEditImageUrl(result);
        setSuccessMsg('อัปโหลดรูปภาพสำเร็จ (กดปุ่มบันทึกด้านบนเพื่อบันทึกการเปลี่ยนแปลง)');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLocalLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      if (result) {
        setEditLogoUrl(result);
        setSuccessMsg('อัปโหลดรูปตราโรงเรียนสำเร็จ (กดปุ่มบันทึกด้านบนเพื่อบันทึกการเปลี่ยนแปลง)');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLocalDirectorImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      if (result) {
        setEditDirectorImageUrl(result);
        setSuccessMsg('อัปโหลดรูปภาพผู้บริหารสำเร็จ (กดปุ่มบันทึกด้านบนเพื่อบันทึกการเปลี่ยนแปลง)');
        setTimeout(() => setSuccessMsg(''), 4000);
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
        name: editName,
        directorPhone: editDirectorPhone,
        schoolPhone: editSchoolPhone,
        internetType: editInternetType,
        electricity: editElectricity,
        staffCount: Number(editStaffCount) || 0,
        majorSubjects: combinedMajors,
        majorSubjectsWithStaff: updatedMajorsWithStaff,
        imageUrl: editImageUrl,
        logoUrl: editLogoUrl,
        directorImageUrl: editDirectorImageUrl,
        latitude: Number(editLatitude) || 19.3,
        longitude: Number(editLongitude) || 97.9,
        size: editSize,
        isExpansion: editIsExpansion
      };

      try {
        await setDoc(schoolRef, updatedData, { merge: true });
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

  // จัดหมวดหมู่กราฟนักเรียนแยกชาย-หญิง เรียงลำดับจากอนุบาล -> ประถม -> มัธยม
  const chartData = useMemo(() => {
    if (!studentData || !studentData.grades) return [];
    
    const GRADE_ORDER = [
      "อ.1", "อ.2", "อ.3",
      "ป.1", "ป.2", "ป.3", "ป.4", "ป.5", "ป.6",
      "ม.1", "ม.2", "ม.3"
    ];

    return GRADE_ORDER
      .filter(grade => studentData.grades[grade] !== undefined)
      .map(grade => ({
        name: grade,
        ชาย: studentData.grades[grade].male,
        หญิง: studentData.grades[grade].female,
        รวม: studentData.grades[grade].total
      }));
  }, [studentData]);

  // คำนวณประเภทช่วงชั้นเรียน
  const schoolLevelsText = useMemo(() => {
    let levels = [];
    if (studentData) {
      const g = studentData.grades;
      if (g["อ.1"]?.total > 0 || g["อ.2"]?.total > 0 || g["อ.3"]?.total > 0) levels.push("ระดับปฐมวัย (อนุบาล)");
      if (g["ป.1"]?.total > 0 || g["ป.2"]?.total > 0 || g["ป.3"]?.total > 0 || g["ป.4"]?.total > 0 || g["ป.5"]?.total > 0 || g["ป.6"]?.total > 0) levels.push("ระดับประถมศึกษา (ป.1 - ป.6)");
      if (school.isExpansion) levels.push("ระดับมัธยมศึกษาตอนต้น (ม.1 - ม.3)");
    }
    return levels.join(", ");
  }, [school, studentData]);

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

        {canEdit && (
          <div className="flex items-center gap-2">
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
          {/* ตราโรงเรียนหรือรูปผู้บริหารด้านบนภาพ */}
          <div className="absolute bottom-4 left-6 flex items-center gap-3.5 z-20">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white border-2 border-[#33272A] p-1 dark:border-[#FFD3B6] dark:bg-[#1e1518] shadow-lg overflow-hidden">
                {hasAdminAccess && adminViewType === 'director' ? (
                  (isEditing ? editDirectorImageUrl : school.directorImageUrl) ? (
                    <img
                      src={isEditing ? editDirectorImageUrl : school.directorImageUrl}
                      alt="รูปผู้บริหาร"
                      className="h-full w-full object-cover rounded-xl"
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
                      className="h-full w-full object-cover rounded-xl"
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
                    className="block w-full rounded-xl border-2 border-[#33272A] bg-white p-1.5 px-3 text-xs font-bold text-[#33272A] outline-none focus:ring-2 focus:ring-[#FF8BA7]"
                  />
                </div>
              ) : (
                <>
                  <span className="text-[9px] font-black uppercase bg-[#A0E7E5] text-[#33272A] border border-[#33272A] px-2 py-0.5 rounded-full tracking-wider">
                    {school.isExpansion ? "โรงเรียนขยายโอกาส" : "โรงเรียนพื้นฐาน"}
                  </span>
                  <h1 className="text-xl md:text-2xl font-black mt-1 text-white">{school.name}</h1>
                </>
              )}
              <p className="text-xs font-bold text-slate-100 flex items-center gap-1 mt-1">
                <MapPin className="h-3.5 w-3.5 text-[#FF8BA7]" />
                สังกัด {school.district} (รหัส {school.id})
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
                <span className="text-[#33272A]/60 dark:text-[#FFF9F5]/60 w-20">ผู้บริหาร:</span>
                <span className="text-[#33272A] dark:text-[#FFF9F5]">ผู้อำนวยการโรงเรียน</span>
              </div>
              {hasAdminAccess && (isEditing ? editDirectorImageUrl : school.directorImageUrl) && (
                <div className="flex items-start gap-2.5 mt-2 p-2 rounded-xl bg-[#FFF9F5] dark:bg-rose-950/20 border-2 border-dashed border-[#33272A]/20 dark:border-[#FFD3B6]/20 max-w-[240px]">
                  <img
                    src={isEditing ? editDirectorImageUrl : school.directorImageUrl}
                    alt="รูปผู้บริหาร"
                    className="h-14 w-14 rounded-lg object-cover border border-[#33272A] dark:border-[#FFD3B6] shrink-0"
                  />
                  <div>
                    <div className="font-black text-[11px] text-[#33272A] dark:text-[#FFF9F5] leading-tight">รูปภาพผู้บริหาร</div>
                    <div className="text-[9px] text-[#FF8BA7] dark:text-[#A0E7E5] mt-1 font-extrabold">เห็นเฉพาะผู้ดูแลระบบ</div>
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
                  <span className="text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1 font-bold">
                    <Phone className="h-3.5 w-3.5 text-[#FF8BA7] shrink-0" /> {hasAdminAccess ? (school.directorPhone || "-") : "ซ่อนข้อมูลสำหรับบุคคลทั่วไป"}
                  </span>
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
                  <span className="text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-[#FF8BA7] shrink-0" /> {school.schoolPhone || "-"}
                  </span>
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
              <div className="flex items-center gap-2">
                <span className="text-[#33272A]/60 dark:text-[#FFF9F5]/60 w-24">ระบบไฟฟ้า:</span>
                {isEditing ? (
                  <label className="flex items-center gap-1.5 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5] select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editElectricity}
                      onChange={(e) => setEditElectricity(e.target.checked)}
                      className="rounded border-[#33272A] text-[#FF8BA7] focus:ring-0"
                    />
                    <span>มีกระแสไฟฟ้าพร้อมใช้</span>
                  </label>
                ) : (
                  <span className="flex items-center gap-1 text-[#33272A] dark:text-[#FFF9F5]">
                    <Zap className={`h-4 w-4 ${school.electricity ? 'text-amber-400 fill-amber-300' : 'text-slate-300'}`} />
                    {school.electricity ? 'มีกระแสไฟฟ้าพร้อมใช้' : 'ใช้ระบบโซล่าเซลล์หลัก'}
                  </span>
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
                    <option value="small">โรงเรียนขนาดเล็ก (&lt; 120 คน)</option>
                    <option value="medium">โรงเรียนขนาดกลาง (120-299 คน)</option>
                    <option value="large">โรงเรียนขนาดใหญ่</option>
                    <option value="special_large">โรงเรียนขนาดใหญ่พิเศษ</option>
                  </select>
                ) : (
                  <span className="font-black text-[#FF8BA7]">
                    โรงเรียน{school.size === 'small' ? 'ขนาดเล็ก (< 120 คน)' : school.size === 'medium' ? 'ขนาดกลาง (120-299 คน)' : school.size === 'large' ? 'ขนาดใหญ่' : 'ขนาดใหญ่พิเศษ'}
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
          <div>
            <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
              <Grid className="h-4 w-4 text-[#FF8BA7]" /> จำนวนนักเรียนแต่ละระดับชั้นเรียน
            </h3>
            <p className="text-[10px] text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-semibold mt-1">
              ปีการศึกษา {studentData?.academicYear || "-"} | ครอบคลุม: {schoolLevelsText}
            </p>
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
                ไม่พบข้อมูลนักเรียน
              </div>
            )}
          </div>

          {/* สถิติรวดเร็ว */}
          <div className="mt-4 pt-4 border-t-2 border-[#33272A]/10 dark:border-[#FFD3B6]/20 grid grid-cols-3 gap-2 text-center text-xs font-black">
            <div className="bg-[#A0E7E5]/30 border-2 border-[#33272A] dark:border-[#FFD3B6] p-2 rounded-2xl text-[#33272A] dark:text-[#FFF9F5]">
              <span className="block text-[10px] text-[#33272A]/60 dark:text-[#FFF9F5]/70">ชายทั้งหมด</span>
              <span className="text-sm font-black">{studentData?.totalMale || 0} คน</span>
            </div>
            <div className="bg-[#FF8BA7]/30 border-2 border-[#33272A] dark:border-[#FFD3B6] p-2 rounded-2xl text-[#33272A] dark:text-[#FFF9F5]">
              <span className="block text-[10px] text-[#33272A]/60 dark:text-[#FFF9F5]/70">หญิงทั้งหมด</span>
              <span className="text-sm font-black">{studentData?.totalFemale || 0} คน</span>
            </div>
            <div className="bg-[#FFD3B6]/30 border-2 border-[#33272A] dark:border-[#FFD3B6] p-2 rounded-2xl text-[#33272A] dark:text-[#FFF9F5]">
              <span className="block text-[10px] text-[#33272A]/60 dark:text-[#FFF9F5]/70">นักเรียนรวม</span>
              <span className="text-sm font-black">{studentData?.totalStudents || 0} คน</span>
            </div>
          </div>
        </div>
      </div>

      {/* ตารางข้อมูลนักเรียนแบบละเอียด */}
      <div className="card overflow-hidden">
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
  );
}
