import { useState, useEffect, FormEvent } from 'react';
import { School, UserProfile } from '../types';
import { CheckCircle, AlertTriangle, Mail, Shield, UserPlus, LogIn } from 'lucide-react';
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, googleProvider, db, OperationType, handleFirestoreError } from '../firebase';
import { checkActiveUsersConcurrency } from '../utils/sessionHelper';
import { signOut } from 'firebase/auth';

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
  const [password, setPassword] = useState('');
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
  
  // ฟิลด์ลงทะเบียนสมัครสิทธิ์
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const checkConfig = async () => {
        try {
          const snap = await getDoc(doc(db, 'settings', 'system_config'));
          if (snap.exists() && snap.data().allowSchoolAdminRegistration !== undefined) {
            setIsRegistrationOpen(snap.data().allowSchoolAdminRegistration);
          }
        } catch(e) {
           console.error(e);
        }
      };
      checkConfig();
    }
  }, [isOpen]);

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
        const existingData = (userDocSnap && userDocSnap.exists()) ? userDocSnap.data() : null;
        const superAdminProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          firstName: existingData?.firstName || 'ผู้ดูแลระบบ',
          lastName: existingData?.lastName || 'ส่วนกลาง',
          schoolId: 'all',
          schoolName: 'สพป.แม่ฮ่องสอน เขต 1',
          role: 'super_admin',
          status: 'approved',
          createdAt: existingData?.createdAt || serverTimestamp()
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
          setErrorMsg('คำร้องขอสมัครสิทธิ์อยู่ระหว่างรออนุมัติ ห้ามเข้าระบบเด็ดขาดจนกว่า Super Admin (tamrri@gmail.com) จะกดอนุมัติสิทธิ์');
          await signOut(auth).catch(() => {});
          setIsLoading(false);
          return;
        }
        if (profile.status === 'rejected') {
          setErrorMsg('คำร้องขอเข้าถึงของคุณถูกปฏิเสธสิทธิ์ กรุณาติดต่อ Super Admin เพื่อตรวจสอบ');
          await signOut(auth).catch(() => {});
          setIsLoading(false);
          return;
        }

        // ตรวจสอบโควตาการเข้าใช้งานพร้อมกัน 70 คน
        const concurrencyCheck = await checkActiveUsersConcurrency(profile);
        if (!concurrencyCheck.allowed) {
          setErrorMsg(concurrencyCheck.message || 'ขออภัยในความไม่สะดวก มีผู้ใช้งานเข้าระบบเต็มจำนวนแล้ว');
          await signOut(auth).catch(() => {});
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
        await signOut(auth).catch(() => {});
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error(error);
      setIsLoading(false);
      if (error.code === 'auth/popup-blocked') {
        setErrorMsg('ป๊อปอัปเข้าสู่ระบบถูกบล็อกโดยเบราว์เซอร์ของคุณ กรุณาอนุญาตหน้าต่างป๊อปอัปหรือเปลี่ยนเบราว์เซอร์');
      } else if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        setErrorMsg('หน้าต่างลงชื่อเข้าใช้ถูกยกเลิกหรือถูกปิดก่อนที่จะทำรายการเสร็จสิ้น กรุณาลองใหม่อีกครั้ง');
      } else if (error.code === 'auth/operation-not-allowed') {
        setErrorMsg('⚠️ บริการล็อกอินด้วย Google (Google Auth Provider) ยังไม่ถูกเปิดใช้งานในระบบ Firebase Console ของคุณ กรุณาเข้าไปเปิดใช้งานที่ Authentication > Sign-in method');
      } else if (error.code === 'auth/unauthorized-domain') {
        setErrorMsg('⚠️ โดเมนปัจจุบันยังไม่ได้ถูกตั้งค่าเป็น Authorized Domain ในระบบ Firebase Console ของคุณ กรุณาตั้งค่าโดเมนในหน้า Authentication');
      } else {
        setErrorMsg(`เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google: ${error.message || error.code || 'Unknown Error'}`);
      }
    }
  };

  // เข้าสู่ระบบด้วย Email/Password
  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      let userDocSnap;
      try {
        userDocSnap = await getDoc(userDocRef);
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, `users/${user.uid}`);
      }

      const isHardcodedSuperAdmin = user.email === 'tamrri@gmail.com' || user.email === 'ch.chapeach@gmail.com';
      if (isHardcodedSuperAdmin) {
        const existingData = (userDocSnap && userDocSnap.exists()) ? userDocSnap.data() : null;
        const superAdminProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          firstName: existingData?.firstName || 'ผู้ดูแลระบบ',
          lastName: existingData?.lastName || 'ส่วนกลาง',
          schoolId: 'all',
          schoolName: 'สพป.แม่ฮ่องสอน เขต 1',
          role: 'super_admin',
          status: 'approved',
          createdAt: existingData?.createdAt || serverTimestamp()
        };
        try {
          await setDoc(userDocRef, superAdminProfile, { merge: true });
        } catch (e) {}
        onAuthSuccess(superAdminProfile);
        setIsLoading(false);
        onClose();
        return;
      }

      if (userDocSnap && userDocSnap.exists()) {
        const profile = userDocSnap.data() as UserProfile;
        if (profile.status === 'pending') {
          setErrorMsg('คำร้องขอสมัครสิทธิ์อยู่ระหว่างรออนุมัติ ห้ามเข้าระบบเด็ดขาดจนกว่า Super Admin จะกดอนุมัติสิทธิ์');
          await signOut(auth).catch(() => {});
          setIsLoading(false);
          return;
        }
        if (profile.status === 'rejected') {
          setErrorMsg('คำร้องขอเข้าถึงของคุณถูกปฏิเสธสิทธิ์ กรุณาติดต่อ Super Admin เพื่อตรวจสอบ');
          await signOut(auth).catch(() => {});
          setIsLoading(false);
          return;
        }

        // ตรวจสอบโควตาการเข้าใช้งานพร้อมกัน 70 คน
        const concurrencyCheck = await checkActiveUsersConcurrency(profile);
        if (!concurrencyCheck.allowed) {
          setErrorMsg(concurrencyCheck.message || 'ขออภัยในความไม่สะดวก มีผู้ใช้งานเข้าระบบเต็มจำนวนแล้ว');
          await signOut(auth).catch(() => {});
          setIsLoading(false);
          return;
        }
        
        onAuthSuccess(profile);
        setIsLoading(false);
        onClose();
      } else {
        setErrorMsg('ไม่พบบัญชีแอดมิน กรุณาสมัครสมาชิกก่อน');
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error(error);
      setIsLoading(false);
      if (error.code === 'auth/operation-not-allowed') {
        setErrorMsg('⚠️ วิธีการล็อกอินด้วยอีเมลและรหัสผ่าน (Email/Password) ยังไม่ถูกเปิดใช้งานใน Firebase Console ของคุณ กรุณาเปิดใช้งานที่ Authentication > Sign-in method');
      } else {
        setErrorMsg(`เข้าสู่ระบบไม่สำเร็จ: ${error.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'}`);
      }
    }
  };

  // 2. ส่งคำสมัครสิทธิ์ลงทะเบียน (Sign Up Form)
  const handleSignUpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();

    if (!cleanFirstName || !cleanLastName) {
      setErrorMsg('กรุณากรอกชื่อและนามสกุลให้ครบถ้วน');
      return;
    }

    if (!cleanEmail) {
      setErrorMsg('กรุณากรอกอีเมล');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    if (!selectedSchoolId) {
      setErrorMsg('กรุณาเลือกโรงเรียนสังกัดที่ต้องการสมัครสิทธิ์');
      return;
    }

    if (!isRegistrationOpen && cleanEmail !== 'tamrri@gmail.com') {
      setErrorMsg('ระบบปิดรับสมัครแอดมินโรงเรียนชั่วคราว');
      return;
    }

    setIsLoading(true);

    try {
      // 1. ตรวจสอบนโยบายระบบเรื่องการจำกัด 1 โรงเรียนต่อ 1 แอดมิน (ถ้ามี)
      let restrictOneAdminPerSchool = true;
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'system_config'));
        if (settingsSnap.exists()) {
          const settingsData = settingsSnap.data();
          if (settingsData.restrictOneAdminPerSchool !== undefined) {
            restrictOneAdminPerSchool = settingsData.restrictOneAdminPerSchool;
          }
        }
      } catch (e) {
        console.warn('Failed to fetch system_config settings:', e);
      }

      if (restrictOneAdminPerSchool) {
        try {
          const qAdmins = query(collection(db, 'users'), where('schoolId', '==', selectedSchoolId));
          const existingAdminsSnap = await getDocs(qAdmins);
          if (!existingAdminsSnap.empty) {
            const duplicateAdmin = existingAdminsSnap.docs
              .map(d => d.data())
              .find(u => u.role === 'school_admin' && (u.status === 'approved' || u.status === 'pending') && u.email?.toLowerCase() !== cleanEmail);

            if (duplicateAdmin) {
              setErrorMsg(`โรงเรียนนี้มีผู้ดูแลระบบอยู่ในระบบแล้ว หรืออยู่ระหว่างรออนุมัติสิทธิ์ (บัญชี: ${duplicateAdmin.email}) ระบบจำกัดสิทธิ์ 1 โรงเรียนต่อ 1 ท่าน หากต้องการเปลี่ยนแอดมินกรุณาแจ้ง Super Admin (tamrri@gmail.com)`);
              setIsLoading(false);
              return;
            }
          }
        } catch (e) {
          console.warn('Check duplicate admin query failed:', e);
        }
      }

      // 2. สร้างบัญชีใน Firebase Auth (หรือใช้บัญชีเดิมหากมีอยู่แล้ว)
      let userId = '';
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        userId = userCredential.user.uid;
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-in-use') {
          // ถ้าอีเมลนี้เคยถูกสร้างใน Auth แล้ว ลองล็อกอินเพื่อดึง UID มาสร้าง/อัปเดตคำขอใน Firestore
          try {
            const signInRes = await signInWithEmailAndPassword(auth, cleanEmail, password);
            userId = signInRes.user.uid;
          } catch (signInErr: any) {
            setErrorMsg('อีเมลนี้เคยลงทะเบียนในระบบแล้ว แต่รหัสผ่านไม่ถูกต้อง หากลืมรหัสผ่านกรุณาติดต่อ Super Admin (tamrri@gmail.com)');
            setIsLoading(false);
            return;
          }
        } else if (authErr.code === 'auth/operation-not-allowed') {
          setErrorMsg('⚠️ บริการสมัครสมาชิกด้วย Email/Password ยังไม่ถูกเปิดใช้งานใน Firebase Console');
          setIsLoading(false);
          return;
        } else {
          throw authErr;
        }
      }

      if (!userId) {
        setErrorMsg('ไม่สามารถยืนยันตัวตนบัญชีได้ กรุณาลองใหม่อีกครั้ง');
        setIsLoading(false);
        return;
      }

      // 3. บันทึกคำขอสิทธิ์ลงใน Firestore คอลเลกชัน 'users' ให้ Super Admin มองเห็นทันที
      const isSuper = cleanEmail === 'tamrri@gmail.com' || cleanEmail === 'ch.chapeach@gmail.com';
      const targetSchool = schools.find(s => s.id === selectedSchoolId);
      const schoolNameVal = targetSchool?.name || '';

      const newUserProfile: UserProfile = {
        uid: userId,
        email: cleanEmail,
        firstName: cleanFirstName,
        lastName: cleanLastName,
        schoolId: selectedSchoolId,
        schoolName: schoolNameVal,
        role: isSuper ? 'super_admin' : 'school_admin',
        status: isSuper ? 'approved' : 'pending',
        createdAt: new Date()
      };

      const userDocRef = doc(db, 'users', userId);
      await setDoc(userDocRef, newUserProfile, { merge: true });

      // 4. สรุปผล
      if (isSuper) {
        setSuccessMsg('ลงทะเบียน Super Admin สำเร็จ! เข้าสู่ระบบได้ทันที');
        onAuthSuccess(newUserProfile);
        setTimeout(() => onClose(), 1500);
      } else {
        // ลงชื่อออกจาก Firebase Auth ทันที ป้องกันการเข้าใช้งานระบบในขณะที่สถานะยังเป็น 'pending'
        await signOut(auth).catch(() => {});
        setSuccessMsg(`ส่งคำขอสมัครสิทธิ์แอดมินเรียบร้อยแล้ว! (สถานะ: รออนุมัติสิทธิ์) คำขอถูกส่งไปยัง Super Admin (tamrri@gmail.com) เรียบร้อยแล้ว ห้ามเข้าระบบจนกว่าจะได้รับการอนุมัติ`);
        setIsSignUpMode(false);
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      setErrorMsg(`เกิดข้อผิดพลาดในการลงทะเบียน: ${error.message || 'กรุณาลองใหม่อีกครั้ง'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#33272A]/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md card p-6 animate-zoom-in">
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-3 pb-3 border-b-2 border-[#33272A] dark:border-[#FFD3B6]">
          <h3 className="text-base font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
            <Shield className="h-5 w-5 text-[#FF8BA7] animate-pulse" />
            <span>ระบบแอดมินโรงเรียน</span>
          </h3>
          <button
            onClick={onClose}
            className="text-[#33272A]/70 dark:text-[#FFF9F5]/70 hover:text-[#FF8BA7] rounded-xl px-2.5 py-1 text-xs font-black cursor-pointer bg-[#FFF9F5] dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-sm transition-colors"
          >
            ปิด
          </button>
        </div>

        {/* ปุ่มสลับโหมดชัดเจน (Tab Switcher) */}
        <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-[#FFF9F5] dark:bg-[#1e1518] rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6]">
          <button
            type="button"
            onClick={() => {
              setIsSignUpMode(false);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            style={{ backgroundColor: !isSignUpMode ? '#FF8BA7' : 'transparent', color: '#33272A' }}
            className={`py-2 px-3 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              !isSignUpMode
                ? 'border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] dark:border-[#FFD3B6]'
                : 'dark:text-[#FFF9F5]/70 hover:bg-[#FFD3B6]/30'
            }`}
          >
            <LogIn className="h-4 w-4" />
            <span>เข้าสู่ระบบ</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUpMode(true);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            style={{ backgroundColor: isSignUpMode ? '#A0E7E5' : 'rgba(160, 231, 229, 0.25)', color: '#33272A' }}
            className={`py-2 px-3 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              isSignUpMode
                ? 'border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] dark:border-[#FFD3B6]'
                : 'border-2 border-dashed border-[#33272A]/40 dark:border-[#FFD3B6]/40 dark:text-[#FFF9F5] hover:opacity-80'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            <span>ลงทะเบียนสมัครสิทธิ์</span>
          </button>
        </div>

        {/* ฟอร์มสลับ โหมด */}
        <div className="space-y-4">
          {/* ข้อมูลช่วยเหลือ */}
          <div className="bg-[#FFD3B6]/35 p-3 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] text-[11px] text-[#33272A] dark:text-[#FFF9F5] leading-relaxed font-bold">
            {isSignUpMode 
              ? '📝 ฟอร์มลงทะเบียน: กรอกข้อมูลจริงเพื่อขอสิทธิ์เป็นแอดมินประจำโรงเรียน โดยคำร้องจะส่งไปยัง Super Admin เพื่ออนุมัติสิทธิ์'
              : '🔑 เข้าสู่ระบบ: สำหรับแอดมินโรงเรียนที่ได้รับอนุมัติสิทธิ์แล้ว หรือใช้บัญชี Gmail ที่ได้รับสิทธิ์'}
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
              {/* แบบฟอร์ม Login ด้วย Email */}
              <form onSubmit={handleEmailLogin} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-[#33272A] dark:text-[#FFF9F5]">อีเมลแอดมิน</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@school.com"
                    className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-[#33272A] dark:text-[#FFF9F5]">รหัสผ่าน</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="รหัสผ่าน 6 ตัวอักษรขึ้นไป"
                    className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-cute bg-[#FF8BA7] text-[#33272A] px-5 py-2.5 text-xs font-black disabled:opacity-50 cursor-pointer shadow-[4px_4px_0px_#33272A] dark:shadow-[4px_4px_0px_#FFD3B6] hover:translate-y-0.5 active:translate-y-1 transition-all outline-none flex items-center justify-center gap-1.5"
                >
                  <LogIn className="h-4 w-4" />
                  <span>{isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วยอีเมล'}</span>
                </button>
              </form>

              <div className="relative flex py-1 items-center text-slate-300 dark:text-slate-700">
                <div className="flex-grow border-t-2 border-[#33272A]/10 dark:border-[#FFD3B6]/20"></div>
                <span className="flex-shrink mx-3 text-[10px] font-black text-[#33272A]/50 dark:text-[#FFF9F5]/50">หรือล็อกอินด้วย</span>
                <div className="flex-grow border-t-2 border-[#33272A]/10 dark:border-[#FFD3B6]/20"></div>
              </div>

              {/* ปุ่ม Google Auth - Gmail */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2.5 rounded-2xl border-2 border-[#33272A] bg-white hover:bg-[#FFD3B6]/20 p-2 text-xs font-black text-[#33272A] dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5] cursor-pointer shadow-[2px_2px_0px_#33272A] dark:shadow-[2px_2px_0px_#FFD3B6] hover:translate-y-0.5 active:translate-y-1 transition-all outline-none"
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  className="h-4 w-4"
                />
                <span>เข้าสู่ระบบด้วย Gmail (Google)</span>
              </button>

              {/* การ์ดและปุ่มลงทะเบียนโดดเด่นชัดเจน */}
              <div className="mt-4 p-4 rounded-2xl bg-[#A0E7E5]/25 dark:bg-[#A0E7E5]/10 border-2 border-[#33272A] dark:border-[#FFD3B6] space-y-2.5 text-center shadow-sm">
                <p className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">
                  ✨ ยังไม่มีบัญชีแอดมินประจำโรงเรียน?
                </p>
                {isRegistrationOpen ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUpMode(true);
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    style={{ backgroundColor: '#A0E7E5', color: '#33272A' }}
                    className="w-full btn-cute border-2 border-[#33272A] dark:border-[#FFD3B6] px-4 py-3 text-xs font-black cursor-pointer shadow-[4px_4px_0px_#33272A] dark:shadow-[4px_4px_0px_#FFD3B6] hover:opacity-90 hover:translate-y-0.5 transition-all outline-none flex items-center justify-center gap-2"
                  >
                    <UserPlus className="h-4.5 w-4.5" />
                    <span>คลิกเพื่อลงทะเบียนสมัครสิทธิ์แอดมินโรงเรียน</span>
                  </button>
                ) : (
                  <div className="w-full text-center text-xs font-black text-rose-500 py-1">
                    🚫 ขณะนี้ระบบปิดรับสมัครแอดมินโรงเรียนชั่วคราว
                  </div>
                )}
              </div>
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
                <p className="text-[9px] text-[#33272A]/60 dark:text-[#FFF9F5]/60 font-semibold">โปรดใช้อีเมลที่ติดต่อได้จริง</p>
              </div>

              {/* รหัสผ่านสำหรับลงทะเบียน */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#33272A] dark:text-[#FFF9F5]">รหัสผ่าน (6 ตัวอักษรขึ้นไป)</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="รหัสผ่าน"
                  minLength={6}
                  className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                />
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
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{ backgroundColor: '#A0E7E5', color: '#33272A' }}
                  className="w-full btn-cute border-2 border-[#33272A] dark:border-[#FFD3B6] px-5 py-3 text-xs font-black disabled:opacity-50 cursor-pointer shadow-[4px_4px_0px_#33272A] dark:shadow-[4px_4px_0px_#FFD3B6] hover:opacity-90 hover:translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                  <UserPlus className="h-4.5 w-4.5" />
                  <span>{isLoading ? 'กำลังประมวลผลคำขอ...' : 'ส่งข้อมูลลงทะเบียนเพื่อขออนุมัติสิทธิ์'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSignUpMode(false)}
                  className="w-full text-center py-1.5 text-xs font-bold text-[#33272A]/70 dark:text-[#FFF9F5]/70 hover:underline cursor-pointer"
                >
                  &larr; มีบัญชีอยู่แล้ว? กลับไปเข้าสู่ระบบ
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
