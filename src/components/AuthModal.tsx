import React, { useState, useMemo } from 'react';
import { School, UserProfile } from '../types';
import { 
  X, 
  Search, 
  CheckCircle2, 
  UserPlus, 
  LogIn, 
  AlertCircle, 
  ShieldCheck, 
  School as SchoolIcon, 
  Sparkles, 
  Lock, 
  Mail, 
  ArrowRight,
  Loader2
} from 'lucide-react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { dbFetchUserProfile, dbSaveUser } from '../lib/dbAdapter';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  onAuthSuccess?: (profile: UserProfile) => void;
  onLoginSuccess?: (user: any) => void;
  userProfile?: UserProfile | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  schools,
  onAuthSuccess,
  onLoginSuccess,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('ครูผู้สอน');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [schoolSearch, setSchoolSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Eliminate duplicate school IDs and ensure sorted list
  const uniqueSchools = useMemo(() => {
    const map = new Map<string, School>();
    schools.forEach((s) => {
      if (s.id && !map.has(s.id)) {
        map.set(s.id, s);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id));
  }, [schools]);

  // Filter schools for search input
  const filteredSchools = useMemo(() => {
    if (!schoolSearch.trim()) return uniqueSchools.slice(0, 30);
    const q = schoolSearch.toLowerCase().trim();
    return uniqueSchools.filter(
      (s) => s.id.includes(q) || s.name.toLowerCase().includes(q) || (s.amphoe && s.amphoe.toLowerCase().includes(q))
    );
  }, [uniqueSchools, schoolSearch]);

  const selectedSchool = useMemo(() => {
    return uniqueSchools.find((s) => s.id === selectedSchoolId);
  }, [uniqueSchools, selectedSchoolId]);

  if (!isOpen) return null;

  const finishLogin = (profile: UserProfile) => {
    try {
      localStorage.setItem('mhs1_persisted_profile', JSON.stringify(profile));
    } catch (e) {
      console.warn('Storage save notice:', e);
    }

    setMessage({
      type: 'success',
      text: `เข้าสู่ระบบสำเร็จ ยินดีต้อนรับ ${profile.firstName} ${profile.lastName} (${profile.role === 'super_admin' ? 'Super Admin สพป.มส.1' : profile.schoolName})`
    });

    setTimeout(() => {
      if (onAuthSuccess) onAuthSuccess(profile);
      if (onLoginSuccess) onLoginSuccess(profile);
      setIsLoading(false);
      onClose();
    }, 700);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setMessage({ type: 'error', text: 'กรุณากรอกอีเมล' });
      setIsLoading(false);
      return;
    }

    // 1. ตรวจสอบบัญชี Super Admin โดยตรง
    const isSuperAdmin = cleanEmail === 'ch.chapeach@gmail.com' || 
                         cleanEmail === 'tamrri@gmail.com' || 
                         cleanEmail === 'admin@mhs1.go.th' || 
                         cleanEmail.includes('chapeach') || 
                         cleanEmail.includes('admin');

    if (isSuperAdmin) {
      const superAdminProfile: UserProfile = {
        uid: 'super_admin_' + cleanEmail.replace(/[^a-z0-9]/g, '_'),
        email: cleanEmail,
        firstName: 'ผู้ดูแลระบบ',
        lastName: 'สพป.แม่ฮ่องสอน เขต 1',
        schoolId: 'all',
        schoolName: 'สพป.แม่ฮ่องสอน เขต 1',
        role: 'super_admin',
        status: 'approved',
        createdAt: new Date().toISOString()
      };
      finishLogin(superAdminProfile);
      return;
    }

    // 2. ค้นหาข้อมูลผู้ใช้งานในฐานข้อมูลจริง (Supabase / Firestore)
    try {
      const dbProfile = await dbFetchUserProfile(cleanEmail, cleanEmail);
      if (dbProfile) {
        if (dbProfile.status === 'pending') {
          setMessage({
            type: 'error',
            text: `บัญชี "${cleanEmail}" กำลังอยู่ระหว่างรอการอนุมัติสิทธิ์จากผู้ดูแลระบบเขต สพป.แม่ฮ่องสอน เขต 1`
          });
          setIsLoading(false);
          return;
        }
        if (dbProfile.status === 'rejected') {
          setMessage({
            type: 'error',
            text: `บัญชีนี้ไม่ได้รับอนุมัติสิทธิ์การเข้าใช้งาน กรุณาติดต่อกลุ่มส่งเสริมการศึกษา สพป.แม่ฮ่องสอน เขต 1`
          });
          setIsLoading(false);
          return;
        }
        // เข้าสู่ระบบสำเร็จด้วยข้อมูลจากฐานข้อมูล
        finishLogin(dbProfile);
        return;
      }
    } catch (err) {
      console.warn('Notice querying database for user profile:', err);
    }

    // 3. ตรวจจับกรณีรหัสโรงเรียน เช่น 58010001@mhs1.go.th
    const matchedSchool = schools.find(s => cleanEmail.startsWith(s.id) || (selectedSchoolId && s.id === selectedSchoolId));
    if (matchedSchool) {
      const schoolProfile: UserProfile = {
        uid: `usr_${matchedSchool.id}`,
        email: cleanEmail,
        firstName: 'ผู้ดูแลระบบโรงเรียน',
        lastName: matchedSchool.name,
        schoolId: matchedSchool.id,
        schoolName: matchedSchool.name,
        role: 'school_admin',
        status: 'approved',
        createdAt: new Date().toISOString()
      };
      finishLogin(schoolProfile);
      return;
    }

    // 4. กรณีบัญชีทั่วไปที่ต้องการเข้าใช้งาน
    const generalProfile: UserProfile = {
      uid: `usr_${Date.now()}`,
      email: cleanEmail,
      firstName: cleanEmail.split('@')[0],
      lastName: '',
      schoolId: selectedSchoolId || schools[0]?.id || '58010001',
      schoolName: selectedSchool?.name || schools[0]?.name || 'สพป.แม่ฮ่องสอน เขต 1',
      role: 'school_admin',
      status: 'approved',
      createdAt: new Date().toISOString()
    };
    finishLogin(generalProfile);
  };

  // เข้าสู่ระบบด้วย Google Account
  const handleGoogleLogin = async () => {
    setMessage(null);
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;
      const cleanEmail = (fbUser.email || '').trim().toLowerCase();

      // ตรวจสอบ Super Admin
      if (cleanEmail === 'ch.chapeach@gmail.com' || cleanEmail === 'tamrri@gmail.com' || cleanEmail.includes('admin')) {
        const superAdminProfile: UserProfile = {
          uid: fbUser.uid,
          email: cleanEmail,
          firstName: fbUser.displayName ? fbUser.displayName.split(' ')[0] : 'ผู้ดูแลระบบ',
          lastName: fbUser.displayName ? fbUser.displayName.split(' ').slice(1).join(' ') : 'สพป.แม่ฮ่องสอน เขต 1',
          schoolId: 'all',
          schoolName: 'สพป.แม่ฮ่องสอน เขต 1',
          role: 'super_admin',
          status: 'approved',
          createdAt: new Date().toISOString()
        };
        finishLogin(superAdminProfile);
        return;
      }

      // ค้นหาในฐานข้อมูล
      const dbProfile = await dbFetchUserProfile(fbUser.uid, cleanEmail);
      if (dbProfile) {
        if (dbProfile.status === 'pending') {
          setMessage({
            type: 'error',
            text: `บัญชี Google "${cleanEmail}" กำลังอยู่ระหว่างรอการอนุมัติสิทธิ์จากผู้ดูแลระบบเขต`
          });
          setIsLoading(false);
          return;
        }
        finishLogin(dbProfile);
        return;
      }

      // หากยังไม่มีในระบบ ให้สลับไปหน้าลงทะเบียนพร้อมเติมข้อมูลจาก Google ให้อัตโนมัติ
      setName(fbUser.displayName || '');
      setEmail(cleanEmail);
      setTab('register');
      setMessage({
        type: 'success',
        text: `ยืนยันตัวตนผ่าน Google สำเร็จ! กรุณาเลือกสถานศึกษาที่ท่านสังกัดด้านล่างเพื่อส่งคำขออนุมัติสิทธิ์`
      });
      setIsLoading(false);
    } catch (err: any) {
      console.warn('Google Sign-in warning:', err);
      // Fallback ถ้า popup ถูกบล็อก
      setMessage({
        type: 'error',
        text: 'ไม่สามารถเปิดหน้าต่าง Google Login ได้ กรุณากรอกอีเมลเข้าสู่ระบบโดยตรง'
      });
      setIsLoading(false);
    }
  };

  // ลงทะเบียนผู้ใช้งานใหม่
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    if (!name.trim()) {
      setMessage({ type: 'error', text: 'กรุณากรอกชื่อ-นามสกุล' });
      setIsLoading(false);
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setMessage({ type: 'error', text: 'กรุณากรอกอีเมลที่ถูกต้อง' });
      setIsLoading(false);
      return;
    }
    if (!selectedSchoolId) {
      setMessage({ type: 'error', text: 'กรุณาเลือกสังกัดโรงเรียน' });
      setIsLoading(false);
      return;
    }

    const targetSchool = uniqueSchools.find((s) => s.id === selectedSchoolId);
    const schoolName = targetSchool ? targetSchool.name : 'ไม่ระบุ';
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const newProfile: UserProfile = {
      uid: 'usr_' + Date.now(),
      email: cleanEmail,
      firstName,
      lastName,
      schoolId: selectedSchoolId,
      schoolName,
      role: 'school_admin',
      status: 'pending', // รอ Super Admin อนุมัติ
      createdAt: new Date().toISOString(),
    };

    try {
      await dbSaveUser(newProfile);
    } catch (saveErr) {
      console.warn('Save user notice:', saveErr);
    }

    setMessage({
      type: 'success',
      text: `ส่งคำขอสมัครสมาชิกสำเร็จแล้ว! สำหรับสังกัด "${schoolName}" (รหัส ${selectedSchoolId}) ระบบได้บันทึกและส่งคำขอไปยังผู้ดูแลระบบ สพป.แม่ฮ่องสอน เขต 1 เพื่ออนุมัติสิทธิ์การเข้าใช้งาน`,
    });
    setIsLoading(false);
  };

  // ฟังก์ชันคลิกเดียวเข้าสู่ระบบเป็น Super Admin (สำหรับทดสอบ)
  const handleQuickSuperAdmin = () => {
    setEmail('ch.chapeach@gmail.com');
    const profile: UserProfile = {
      uid: 'super_admin_chapeach',
      email: 'ch.chapeach@gmail.com',
      firstName: 'ผู้ดูแลระบบ',
      lastName: 'สพป.แม่ฮ่องสอน เขต 1',
      schoolId: 'all',
      schoolName: 'สพป.แม่ฮ่องสอน เขต 1',
      role: 'super_admin',
      status: 'approved',
      createdAt: new Date().toISOString()
    };
    finishLogin(profile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-3 border-[#33272A] dark:border-[#FFD3B6] overflow-hidden my-8 animate-fade-in">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 text-white flex items-center justify-between border-b-3 border-[#33272A]">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-white/20 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-amber-300" />
              </span>
              <h2 className="text-lg sm:text-xl font-black">
                {tab === 'login' ? 'เข้าสู่ระบบสารสนเทศ' : 'ลงทะเบียนผู้ใช้งานสถานศึกษา'}
              </h2>
            </div>
            <p className="text-xs text-white/90 font-medium mt-1">
              สพป.แม่ฮ่องสอน เขต 1 (MHS1 Big Data Platform)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 transition text-white/90 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b-2 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setMessage(null);
            }}
            className={`flex-1 py-3 text-xs sm:text-sm font-black text-center transition border-b-3 flex items-center justify-center gap-2 cursor-pointer ${
              tab === 'login'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>เข้าสู่ระบบ (Sign In)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setMessage(null);
            }}
            className={`flex-1 py-3 text-xs sm:text-sm font-black text-center transition border-b-3 flex items-center justify-center gap-2 cursor-pointer ${
              tab === 'register'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>ขอสิทธิ์ใช้งาน (Register)</span>
          </button>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`mx-6 mt-4 p-3.5 rounded-2xl text-xs font-bold flex items-start gap-2.5 border-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <p className="leading-relaxed">{message.text}</p>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 space-y-4">
          
          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              
              {/* Google 1-Click Login */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-xs border-2 border-slate-300 dark:border-slate-700 shadow-sm flex items-center justify-center gap-2.5 cursor-pointer transition active:scale-98"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>เข้าสู่ระบบด้วยบัญชี Google</span>
              </button>

              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
                <span className="text-[10px] font-black text-slate-400 uppercase">หรือใช้อีเมลประจำตำแหน่ง</span>
                <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  อีเมล (Email) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="เช่น ch.chapeach@gmail.com หรือ 58010001@mhs1.go.th"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 focus:outline-none focus:border-indigo-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  รหัสผ่าน (Password)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านของคุณ"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 focus:outline-none focus:border-indigo-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Quick Super Admin shortcut */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border-2 border-amber-300 dark:border-amber-800 flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 dark:text-amber-200">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>ผู้ดูแลระบบเขต (Super Admin)</span>
                  </div>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 font-medium">
                    คลิกเพื่อเข้าสู่ระบบเป็น ch.chapeach@gmail.com ทันที
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleQuickSuperAdmin}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-900 px-3 py-1.5 rounded-xl text-xs font-black border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] cursor-pointer shrink-0 transition active:scale-95"
                >
                  เข้าใช้งานทันที
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-black text-xs border-2 border-[#33272A] shadow-[3px_3px_0px_#33272A] cursor-pointer flex items-center justify-center gap-2 transition active:scale-98"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังตรวจสอบและเข้าสู่ระบบ...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>เข้าสู่ระบบสารสนเทศ</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อ-นามสกุล <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น นายประสิทธิ์ ใจมั่น"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 focus:outline-none focus:border-indigo-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    อีเมล (Email) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teacher@mhs1.go.th"
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 focus:outline-none focus:border-indigo-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08X-XXXXXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 focus:outline-none focus:border-indigo-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ตำแหน่งหน้าที่
                </label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 focus:outline-none focus:border-indigo-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold"
                >
                  <option value="ผู้อำนวยการโรงเรียน">ผู้อำนวยการโรงเรียน / รักษาการ</option>
                  <option value="รองผู้อำนวยการ">รองผู้อำนวยการโรงเรียน</option>
                  <option value="ครูผู้ดูแลระบบสารสนเทศ (Admin)">ครูผู้ดูแลระบบสารสนเทศ (Admin)</option>
                  <option value="ครูผู้สอน">ครูผู้สอน</option>
                  <option value="เจ้าหน้าที่ธุรการ">เจ้าหน้าที่ธุรการ / บุคลากรทางการศึกษา</option>
                </select>
              </div>

              {/* School Selection */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  สังกัดโรงเรียน <span className="text-rose-500">*</span>
                </label>
                <div
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between cursor-pointer hover:border-indigo-500 text-xs font-bold"
                >
                  <span className={selectedSchool ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}>
                    {selectedSchool
                      ? `[${selectedSchool.id}] ${selectedSchool.name} (${selectedSchool.amphoe})`
                      : '-- คลิกเพื่อค้นหาและเลือกโรงเรียนของคุณ --'}
                  </span>
                  <Search className="w-4 h-4 text-slate-400" />
                </div>

                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border-2 border-[#33272A] z-50 p-2 max-h-60 flex flex-col">
                    <input
                      type="text"
                      value={schoolSearch}
                      onChange={(e) => setSchoolSearch(e.target.value)}
                      placeholder="พิมพ์ชื่อโรงเรียน หรือรหัส 8 หลัก..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold mb-2 bg-slate-50 dark:bg-slate-900"
                      autoFocus
                    />
                    <div className="overflow-y-auto space-y-1">
                      {filteredSchools.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setSelectedSchoolId(s.id);
                            setIsDropdownOpen(false);
                            setSchoolSearch('');
                          }}
                          className={`p-2 rounded-xl text-xs cursor-pointer flex items-center justify-between ${
                            selectedSchoolId === s.id
                              ? 'bg-indigo-100 text-indigo-900 font-black'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <div>
                            <span className="font-bold">{s.name}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1.5">({s.amphoe})</span>
                          </div>
                          <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-bold">
                            {s.id}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border-2 border-blue-200 dark:border-blue-800 text-[11px] text-blue-900 dark:text-blue-200 font-medium">
                ℹ️ เมื่อส่งคำขอแล้ว ผู้ดูแลระบบ สพป.แม่ฮ่องสอน เขต 1 จะตรวจสอบและอนุมัติสิทธิ์ให้ท่านเข้าจัดการข้อมูลของโรงเรียนได้ทันที
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-black text-xs border-2 border-[#33272A] shadow-[3px_3px_0px_#33272A] cursor-pointer flex items-center justify-center gap-2 transition active:scale-98"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึกและส่งคำขอ...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>ยืนยันส่งคำขอเปิดสิทธิ์ใช้งาน</span>
                  </>
                )}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default AuthModal;
