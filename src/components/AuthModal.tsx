import { useState, FormEvent } from 'react';
import { School, UserProfile } from '../types';
import { CheckCircle, AlertTriangle, Mail, Shield } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, googleProvider, db, OperationType, handleFirestoreError } from '../firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  onAuthSuccess: (profile: UserProfile) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  schools,
  onAuthSuccess
}: AuthModalProps) {
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [email, setEmail] = useState('');
  
  // ฟิลด์ลงทะเบียนสมัครสิทธิ์
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  // ค้นหาชื่อโรงเรียนตามรหัสที่เลือก
  const selectedSchoolName = schools.find(s => s.id === selectedSchoolId)?.name || '';

  // 1. เข้าสู่ระบบด้วย Google (Gmail)
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (!user.email) {
        setErrorMsg('ไม่สามารถดึงอีเมลจากบัญชี Google ได้');
        setIsLoading(false);
        return;
      }

      // ดึงโปรไฟล์ผู้ใช้จาก Firestore dmc-mhs1
      const userDocRef = doc(db, 'users', user.uid);
      let userDocSnap;
      try {
        userDocSnap = await getDoc(userDocRef);
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, `users/${user.uid}`);
      }

      // กรณีพิเศษ: อีเมลที่ได้รับอนุมัติเป็น Super Admin อัตโนมัติทันที
      const isHardcodedSuperAdmin = user.email === 'tamrri@gmail.com' || user.email === 'ch.chapeach@gmail.com';
      if (isHardcodedSuperAdmin) {
        const superAdminProfile: UserProfile = {
          uid: user.uid,
          email: user.email,
          firstName: 'Super',
          lastName: 'Admin',
          schoolId: 'all',
          schoolName: 'สพป.แม่ฮ่องสอน เขต 1',
          role: 'super_admin',
          status: 'approved',
          createdAt: serverTimestamp()
        };
        try {
          await setDoc(userDocRef, superAdminProfile, { merge: true });
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`);
        }
        onAuthSuccess(superAdminProfile);
        setIsLoading(false);
        onClose();
        return;
      }

      let profile: UserProfile | null = null;
      if (userDocSnap.exists()) {
        profile = userDocSnap.data() as UserProfile;
      } else {
        // ค้นหาตาม email ในกรณีที่สมัครผ่านฟอร์มด้วย email-sanitized ID
        const q = query(collection(db, 'users'), where('email', '==', user.email));
        let qSnap;
        try {
          qSnap = await getDocs(q);
        } catch (e) {
          handleFirestoreError(e, OperationType.LIST, 'users');
        }
        if (!qSnap.empty) {
          const matchedDoc = qSnap.docs[0];
          profile = { ...matchedDoc.data(), uid: matchedDoc.id } as UserProfile;
          
          // เพื่อความสะดวกในอนาคต อัปเดต uid ของสิทธิ์นี้ให้เชื่อมโยงกับ UID จริงของ Google Authentication
          try {
            await setDoc(doc(db, 'users', user.uid), { ...profile, uid: user.uid }, { merge: true });
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
          }
        }
      }

      if (profile) {
        if (profile.status === 'pending') {
          setErrorMsg('บัญชีผู้ใช้นี้อยู่ระหว่างรออนุมัติสิทธิ์การเข้าถึงจาก Super Admin (tamrri@gmail.com)');
          setIsLoading(false);
          return;
        }
        if (profile.status === 'rejected') {
          setErrorMsg('คำร้องขอเข้าถึงของคุณถูกปฏิเสธสิทธิ์ กรุณาติดต่อ Super Admin เพื่อตรวจสอบ');
          setIsLoading(false);
          return;
        }

        // สำเร็จ
        onAuthSuccess(profile);
        setIsLoading(false);
        onClose();
      } else {
        // ไม่มีข้อมูลผู้ใช้ในระบบ (เมลยังไม่ได้สมัคร/ไม่ตรงกับฐานข้อมูลสิทธิ์)
        setErrorMsg('ไม่พบบัญชีอีเมลนี้ในฐานข้อมูลสิทธิ์การเป็นแอดมิน กรุณาสมัครคำขอสิทธิ์ลงทะเบียนด้านล่างก่อน');
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error(error);
      setIsLoading(false);
      if (error.code === 'auth/popup-blocked') {
        setErrorMsg('ป๊อปอัปเข้าสู่ระบบถูกบล็อกโดยเบราว์เซอร์ของคุณ กรุณาอนุญาตหน้าต่างป๊อปอัปหรือเปลี่ยนเบราว์เซอร์');
      } else if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        setErrorMsg('หน้าต่างลงชื่อเข้าใช้ถูกยกเลิกหรือถูกปิดก่อนที่จะทำรายการเสร็จสิ้น กรุณาลองใหม่อีกครั้ง');
      } else {
        setErrorMsg('เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google');
      }
    }
  };

  // 2. ส่งคำสมัครสิทธิ์ลงทะเบียน (Sign Up Form)
  const handleSignUpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    if (!selectedSchoolId) {
      setErrorMsg('กรุณาเลือกโรงเรียนสังกัดที่ต้องการสมัครสิทธิ์');
      setIsLoading(false);
      return;
    }

    try {
      const userId = email.replace(/[^a-zA-Z0-9]/g, '_'); // สร้าง ID จำลองสำหรับ document
      const tempUserRef = doc(db, 'users', userId);
      let qSnap;
      try {
        qSnap = await getDoc(tempUserRef); // ตรวจสอบเอกสารผู้สมัครเดิม
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, `users/${userId}`);
      }
      
      if (qSnap.exists()) {
        setErrorMsg('บัญชีอีเมลนี้เคยส่งคำร้องขอสมัครสิทธิ์หรือลงทะเบียนในระบบเรียบร้อยแล้ว');
        setIsLoading(false);
        return;
      }

      // ดึงนโยบายระบบเรื่องการจำกัด 1 โรงเรียนต่อ 1 แอดมิน
      let restrictOneAdminPerSchool = true; // ค่าตั้งต้นเป็นจำกัด
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'system_config'));
        if (settingsSnap.exists()) {
          const settingsData = settingsSnap.data();
          if (settingsData.restrictOneAdminPerSchool !== undefined) {
            restrictOneAdminPerSchool = settingsData.restrictOneAdminPerSchool;
          }
        }
      } catch (e) {
        console.warn('Failed to fetch system_config settings, defaulting to true:', e);
      }

      // ตรวจสอบถ้าเปิดใช้งานนโยบายจำกัด 1 แอดมินต่อโรงเรียน
      if (restrictOneAdminPerSchool) {
        let existingAdminsSnap;
        try {
          const qAdmins = query(collection(db, 'users'), where('schoolId', '==', selectedSchoolId));
          existingAdminsSnap = await getDocs(qAdmins);
        } catch (e) {
          handleFirestoreError(e, OperationType.LIST, 'users');
        }

        if (existingAdminsSnap && !existingAdminsSnap.empty) {
          // กรองหาเฉพาะคนที่เป็นแอดมินโรงเรียนที่สถานะเป็นอนุมัติหรือรออนุมัติ (และไม่ใช่อีเมลนี้)
          const duplicateAdmin = existingAdminsSnap.docs
            .map(d => d.data())
            .find(u => u.role === 'school_admin' && (u.status === 'approved' || u.status === 'pending') && u.email !== email);

          if (duplicateAdmin) {
            setErrorMsg(`โรงเรียนนี้มีผู้ดูแลระบบ (แอดมิน) อยู่ในระบบเรียบร้อยแล้ว หรืออยู่ระหว่างรออนุมัติสิทธิ์ (บัญชี: ${duplicateAdmin.email}) ระบบจำกัดสิทธิ์ให้สมัครได้เพียงโรงเรียนละ 1 ท่านเท่านั้น หากต้องการเปลี่ยนแปลงข้อมูลกรุณาติดต่อแอดมินเดิมหรือแจ้ง Super Admin (tamrri@gmail.com)`);
            setIsLoading(false);
            return;
          }
        }
      }

      // กรณีพิเศษ: tamrri@gmail.com เป็น Super Admin สมัครแล้วผ่านทันที
      const isSuper = email === 'tamrri@gmail.com';

      const newUserProfile: UserProfile = {
        uid: userId,
        email: email,
        firstName,
        lastName,
        schoolId: selectedSchoolId,
        schoolName: selectedSchoolName,
        role: isSuper ? 'super_admin' : 'school_admin',
        status: isSuper ? 'approved' : 'pending',
        createdAt: new Date()
      };

      try {
        await setDoc(tempUserRef, newUserProfile);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `users/${userId}`);
      }

      if (isSuper) {
        setSuccessMsg('ลงทะเบียน Super Admin สำเร็จ! เข้าสู่ระบบได้ทันที');
        onAuthSuccess(newUserProfile);
        setTimeout(() => onClose(), 1500);
      } else {
        setSuccessMsg(`ส่งคำสมัครสิทธิ์แอดมินโรงเรียนเรียบร้อยแล้ว! กรุณารอ Super Admin (${'tamrri@gmail.com'}) อนุมัติสิทธิ์ก่อนเข้าสู่ระบบ`);
        setIsSignUpMode(false);
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg('เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#33272A]/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md card p-6 animate-zoom-in">
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b-2 border-[#33272A] dark:border-[#FFD3B6]">
          <h3 className="text-base font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
            <Shield className="h-4.5 w-4.5 text-[#FF8BA7] animate-pulse" />
            {isSignUpMode ? 'สมัครสิทธิ์แอดมินโรงเรียน' : 'เข้าสู่ระบบแอดมินโรงเรียน'}
          </h3>
          <button
            onClick={onClose}
            className="text-[#33272A]/70 dark:text-[#FFF9F5]/70 hover:text-[#FF8BA7] rounded-xl px-2.5 py-1 text-xs font-black cursor-pointer bg-[#FFF9F5] dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-sm transition-colors"
          >
            ปิด
          </button>
        </div>

        {/* ฟอร์มสลับ โหมด */}
        <div className="space-y-4">
          {/* ข้อมูลช่วยเหลือ */}
          <div className="bg-[#FFD3B6]/35 p-3 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] text-[11px] text-[#33272A] dark:text-[#FFF9F5] leading-relaxed font-bold">
            {isSignUpMode 
              ? 'กรอกข้อมูลจริงเพื่อขอสิทธิ์เป็นแอดมินประจำโรงเรียนของคุณ โดยต้องรอการกดยืนยันอนุมัติจาก Super Admin ก่อนเข้าสู่ระบบแก้ไขข้อมูลได้'
              : 'สำหรับบุคคลทั่วไป สามารถเข้าดูข้อมูลและดาวน์โหลดข้อมูลนักเรียนได้ทันทีโดยไม่ต้องเข้าสู่ระบบ แต่หากต้องการแก้ไขข้อมูลโรงเรียน ต้องมีบัญชีแอดมินที่ผ่านการอนุมัติ'}
          </div>

          {/* Error & Success Messages */}
          {errorMsg && (
            <div className="rounded-2xl bg-rose-50 border-2 border-[#33272A] p-3 text-xs font-black text-rose-700 flex gap-1.5 items-start">
              <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="rounded-2xl bg-[#A0E7E5]/30 border-2 border-[#33272A] p-3 text-xs font-black text-[#33272A] flex gap-1.5 items-start">
              <CheckCircle className="h-4.5 w-4.5 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* เข้าสู่ระบบแบบธรรมดา */}
          {!isSignUpMode ? (
            <div className="space-y-4 pt-1">
              {/* ปุ่ม Google Auth - Gmail */}
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2.5 rounded-2xl border-2 border-[#33272A] bg-white hover:bg-[#FFD3B6]/20 p-3 text-xs font-black text-[#33272A] dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5] cursor-pointer shadow-[4px_4px_0px_#33272A] dark:shadow-[4px_4px_0px_#FFD3B6] hover:translate-y-0.5 active:translate-y-1 transition-all outline-none"
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  className="h-4.5 w-4.5"
                />
                <span>ลงชื่อเข้าใช้งานด้วยบัญชี Gmail (Google)</span>
              </button>

              <div className="relative flex py-2 items-center text-slate-300 dark:text-slate-700">
                <div className="flex-grow border-t-2 border-[#33272A]/10 dark:border-[#FFD3B6]/20"></div>
                <span className="flex-shrink mx-3 text-[10px] font-black text-[#33272A]/50 dark:text-[#FFF9F5]/50">หรือสมัครสมาชิกขอสิทธิ์</span>
                <div className="flex-grow border-t-2 border-[#33272A]/10 dark:border-[#FFD3B6]/20"></div>
              </div>

              {/* สลับไปหน้าสมัครสมาชิก */}
              <button
                onClick={() => {
                  setIsSignUpMode(true);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="w-full text-center text-xs font-black text-[#FF8BA7] hover:underline cursor-pointer outline-none"
              >
                ยังไม่มีสิทธิ์เข้าถึงระบบ? คลิกเพื่อสมัครสิทธิ์แอดมินโรงเรียน &rarr;
              </button>
            </div>
          ) : (
            /* แบบฟอร์มลงทะเบียนส่งคำร้องสิทธิ์ */
            <form onSubmit={handleSignUpSubmit} className="space-y-3">
              {/* ชื่อ-นามสกุล */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-[#33272A] dark:text-[#FFF9F5]">ชื่อจริง</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="เช่น สมศักดิ์"
                    className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-[#33272A] dark:text-[#FFF9F5]">นามสกุล</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="เช่น เรียนเก่ง"
                    className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                  />
                </div>
              </div>

              {/* อีเมลสำหรับติดต่อ */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#33272A] dark:text-[#FFF9F5]">อีเมล Gmail ของผู้สมัคร</label>
                <div className="relative">
                  <Mail className="absolute top-2.5 left-3 h-4 w-4 text-[#33272A]/60" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full rounded-xl border-2 border-[#33272A] bg-white pl-10 pr-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                  />
                </div>
                <p className="text-[9px] text-[#33272A]/60 dark:text-[#FFF9F5]/60 font-semibold">ต้องเป็นอีเมลเดียวกับบัญชี Google ที่จะใช้ล็อกอิน</p>
              </div>

              {/* เลือกโรงเรียนในสังกัด */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#33272A] dark:text-[#FFF9F5]">เลือกโรงเรียนสังกัดที่ต้องการแก้ไขข้อมูล</label>
                <select
                  required
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  className="w-full rounded-xl border-2 border-[#33272A] bg-white p-2 text-xs font-bold text-[#33272A] dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5] outline-none focus:ring-2 focus:ring-[#FF8BA7]"
                >
                  <option value="">-- กรุณาเลือกสถานศึกษาของคุณ --</option>
                  {schools.map(school => (
                    <option key={school.id} value={school.id}>{school.name}</option>
                  ))}
                </select>
              </div>

              {/* ปุ่มควบคุมสมัครสมาชิก */}
              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsSignUpMode(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-[#33272A]/70 dark:text-[#FFF9F5]/70 hover:bg-[#FFD3B6]/30 cursor-pointer"
                >
                  กลับไปเข้าสู่ระบบ
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-cute bg-[#FF8BA7] text-[#33272A] px-5 py-2 text-xs font-black disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? 'กำลังประมวลผลคำขอ...' : 'ส่งข้อมูลเพื่อขออนุมัติ'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
