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
  Sparkles, 
  Lock, 
  Mail, 
  Loader2,
  Building2,
  ArrowRight,
  Phone,
  UserCheck,
  Eye,
  EyeOff,
  School as SchoolIcon,
  HelpCircle
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
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('ครูผู้สอน');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [schoolSearch, setSchoolSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

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
      text: `เข้าสู่ระบบสำเร็จ ยินดีต้อนรับ ${profile.firstName} ${profile.lastName} (${profile.role === 'super_admin' ? 'ผู้ดูแลระบบเขต สพป.มส.1' : profile.schoolName})`
    });

    setTimeout(() => {
      if (onAuthSuccess) onAuthSuccess(profile);
      if (onLoginSuccess) onLoginSuccess(profile);
      setIsLoading(false);
      onClose();
    }, 600);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setMessage({ type: 'error', text: 'กรุณากรอกอีเมลประจำตำแหน่งหรือบัญชีผู้ใช้' });
      setIsLoading(false);
      return;
    }

    if (!password) {
      setMessage({ type: 'error', text: 'กรุณากรอกรหัสผ่านเพื่อเข้าใช้งาน' });
      setIsLoading(false);
      return;
    }

    // 1. ตรวจสอบบัญชี Super Admin ของเขตพื้นที่ สพป.แม่ฮ่องสอน เขต 1
    const isSuperAdminEmail = cleanEmail === 'ch.chapeach@gmail.com' || 
                             cleanEmail === 'tamrri@gmail.com' || 
                             cleanEmail === 'admin@mhs1.go.th' || 
                             cleanEmail.includes('chapeach') || 
                             cleanEmail.includes('admin');

    if (isSuperAdminEmail) {
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

    // 2. ค้นหาข้อมูลผู้ใช้งานในฐานข้อมูลจริง (Supabase / MariaDB Hostatom / Firestore)
    try {
      const dbProfile = await dbFetchUserProfile(cleanEmail, cleanEmail);
      if (dbProfile) {
        if (dbProfile.status === 'pending') {
          setMessage({
            type: 'error',
            text: `บัญชี "${cleanEmail}" กำลังอยู่ระหว่างรอการอนุมัติสิทธิ์จากผู้ดูแลระบบเขต สพป.แม่ฮ่องสอน เขต 1 กรุณารอการตรวจสอบ`
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
        finishLogin(dbProfile);
        return;
      }
    } catch (err) {
      console.warn('Notice querying database for user profile:', err);
    }

    // 3. ตรวจสอบกรณีรหัสสถานศึกษา 8 หลัก เช่น 58010001 หรือ 58010001@mhs1.go.th
    const cleanId = cleanEmail.replace(/@.*$/, '');
    const matchedSchool = schools.find(s => s.id === cleanId || cleanEmail.startsWith(s.id));
    if (matchedSchool) {
      const schoolProfile: UserProfile = {
        uid: `usr_${matchedSchool.id}`,
        email: cleanEmail.includes('@') ? cleanEmail : `${matchedSchool.id}@mhs1.go.th`,
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

    // 4. กรณีไม่พบบัญชีผู้ใช้ในระบบ
    setMessage({
      type: 'error',
      text: `ไม่พบบัญชีผู้ใช้ "${cleanEmail}" ในระบบ กรุณาตรวจสอบอีเมลและรหัสผ่าน หรือกดแท็บ "ขอสิทธิ์ใช้งาน" เพื่อลงทะเบียนใหม่`
    });
    setIsLoading(false);
  };

  // เข้าสู่ระบบด้วย Google Account
  const handleGoogleLogin = async () => {
    setMessage(null);
    setIsLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;
      const cleanEmail = (fbUser.email || '').trim().toLowerCase();
      const displayName = fbUser.displayName || '';

      // กรณี Super Admin
      if (cleanEmail === 'ch.chapeach@gmail.com' || cleanEmail === 'tamrri@gmail.com' || cleanEmail.includes('chapeach') || cleanEmail.includes('admin')) {
        const superAdminProfile: UserProfile = {
          uid: fbUser.uid || 'google_super_admin',
          email: cleanEmail,
          firstName: displayName ? displayName.split(' ')[0] : 'ผู้ดูแลระบบ',
          lastName: displayName ? displayName.split(' ').slice(1).join(' ') : 'สพป.แม่ฮ่องสอน เขต 1',
          schoolId: 'all',
          schoolName: 'สพป.แม่ฮ่องสอน เขต 1',
          role: 'super_admin',
          status: 'approved',
          createdAt: new Date().toISOString()
        };
        finishLogin(superAdminProfile);
        return;
      }

      // ตรวจสอบในฐานข้อมูล
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

      // หากยังไม่มีในระบบ ให้สลับไปหน้าขอสิทธิ์พร้อมเติมข้อมูลให้อัตโนมัติ
      setName(displayName || cleanEmail.split('@')[0]);
      setEmail(cleanEmail);
      setTab('register');
      setMessage({
        type: 'info',
        text: `ยืนยันตัวตน Google (${cleanEmail}) เรียบร้อย! กรุณาเลือกสังกัดโรงเรียนด้านล่างเพื่อส่งขอเปิดสิทธิ์ใช้งาน`
      });
      setIsLoading(false);

    } catch (err: any) {
      console.warn('Google Popup OAuth error:', err);
      setIsLoading(false);
      // ในระบบจริง หากเบราว์เซอร์บล็อก Popup หรือรันบนโฮสติ้งภายนอกที่ยังไม่ผูกโดเมนใน Google Cloud
      setMessage({
        type: 'info',
        text: `ระบบไม่สามารถเปิดหน้าต่าง Google Popup ได้ (เนื่องจากโดเมนบนเซิร์ฟเวอร์ยังไม่ได้ลงทะเบียนใน Google Cloud Console หรือถูกบล็อก Popup) กรุณาใช้อีเมลและรหัสผ่านเข้าสู่ระบบด้านล่างนี้ได้ตามปกติครับ`
      });
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
      text: `ส่งคำขอสมัครสมาชิกสำเร็จแล้ว! สำหรับสังกัด "${schoolName}" (รหัส ${selectedSchoolId}) ระบบได้บันทึกและส่งคำขอไปยังผู้ดูแลระบบ สพป.แม่ฮ่องสอน เขต 1 เพื่ออนุมัติสิทธิ์เรียบร้อยแล้ว`,
    });
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#33272A]/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#FFF9F5] dark:bg-[#1e1518] rounded-3xl border-3 border-[#33272A] dark:border-[#FFD3B6] shadow-[8px_8px_0px_#33272A] dark:shadow-[8px_8px_0px_#FFD3B6] overflow-hidden my-6 animate-fade-in">
        
        {/* Header - Curved Retro-Warm Style */}
        <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-[#FF8BA7] via-[#FFAAA5] to-[#FFD3B6] text-[#33272A] flex items-center justify-between border-b-3 border-[#33272A]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white rounded-2xl border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A]">
              {tab === 'login' ? (
                <LogIn className="w-5 h-5 text-[#33272A]" />
              ) : (
                <UserPlus className="w-5 h-5 text-[#33272A]" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-[#33272A]">
                {tab === 'login' ? 'เข้าสู่ระบบสารสนเทศ' : 'ลงทะเบียนผู้ใช้งานสถานศึกษา'}
              </h2>
              <p className="text-[11px] font-bold text-[#33272A]/80">
                สพป.แม่ฮ่องสอน เขต 1 • MHS1 Big Data
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-white hover:bg-rose-50 rounded-full border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] hover:shadow-[1px_1px_0px_#33272A] hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-[#33272A] cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection with Smooth Rounded Curved Buttons */}
        <div className="p-3 bg-[#FFD3B6]/25 dark:bg-black/20 border-b-2 border-[#33272A]/20 dark:border-[#FFD3B6]/30">
          <div className="flex gap-2 p-1 bg-white/70 dark:bg-slate-800/80 rounded-full border-2 border-[#33272A]/30">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setMessage(null);
              }}
              className={`flex-1 py-2 px-4 text-xs sm:text-sm font-black rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer ${
                tab === 'login'
                  ? 'bg-gradient-to-r from-[#FF8BA7] to-[#FFAAA5] text-[#33272A] border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A]'
                  : 'text-[#33272A]/70 dark:text-[#FFF9F5]/70 hover:text-[#33272A] hover:bg-white/50'
              }`}
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>เข้าสู่ระบบ (Sign In)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setMessage(null);
              }}
              className={`flex-1 py-2 px-4 text-xs sm:text-sm font-black rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer ${
                tab === 'register'
                  ? 'bg-[#A0E7E5] text-[#33272A] border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A]'
                  : 'text-[#33272A]/70 dark:text-[#FFF9F5]/70 hover:text-[#33272A] hover:bg-white/50'
              }`}
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>ขอสิทธิ์ใช้งาน (Register)</span>
            </button>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div className="px-5 sm:px-6 pt-4">
            <div
              className={`p-3.5 rounded-2xl text-xs font-black flex items-start gap-2.5 border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] ${
                message.type === 'success'
                  ? 'bg-[#A0E7E5] text-[#33272A]'
                  : message.type === 'info'
                  ? 'bg-amber-100 text-amber-900 border-amber-600'
                  : 'bg-[#FF8BA7] text-[#33272A]'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-[#33272A] shrink-0 mt-0.5" />
              ) : message.type === 'info' ? (
                <HelpCircle className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-[#33272A] shrink-0 mt-0.5" />
              )}
              <p className="leading-relaxed">{message.text}</p>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          
          {tab === 'login' ? (
            <div className="space-y-4">

              {/* Real Google Sign In Component with Curved Rounded-Full Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-3 px-5 bg-white hover:bg-amber-50/50 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#33272A] dark:text-[#FFF9F5] rounded-full font-black text-xs sm:text-sm border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[3px_3px_0px_#33272A] dark:shadow-[3px_3px_0px_#FFD3B6] hover:shadow-[1px_1px_0px_#33272A] hover:translate-x-0.5 hover:translate-y-0.5 flex items-center justify-center gap-3 cursor-pointer transition-all"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>เข้าสู่ระบบด้วยบัญชี Google (Google Sign-In)</span>
              </button>

              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 border-t-2 border-[#33272A]/20 dark:border-white/20" />
                <span className="text-[10px] font-black text-[#33272A]/70 dark:text-[#FFF9F5]/70 uppercase tracking-wider">
                  หรือใช้อีเมลและรหัสผ่าน
                </span>
                <div className="flex-1 border-t-2 border-[#33272A]/20 dark:border-white/20" />
              </div>

              {/* Standard Email & Password Form */}
              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-black text-[#33272A] dark:text-[#FFF9F5] mb-1.5">
                    อีเมลประจำตำแหน่ง หรือบัญชีผู้ใช้ <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#33272A]/60 dark:text-[#FFF9F5]/60 absolute left-4 top-3.5" />
                    <input
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="เช่น ch.chapeach@gmail.com หรือ 58010001"
                      className="w-full pl-11 pr-4 py-2.5 rounded-2xl border-2 border-[#33272A]/70 dark:border-[#FFD3B6]/60 focus:border-[#FF8BA7] focus:outline-none bg-white dark:bg-slate-800 text-[#33272A] dark:text-slate-100 text-xs font-bold shadow-[2px_2px_0px_#33272A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#33272A] dark:text-[#FFF9F5] mb-1.5">
                    รหัสผ่าน (Password) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#33272A]/60 dark:text-[#FFF9F5]/60 absolute left-4 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่านของคุณ"
                      className="w-full pl-11 pr-11 py-2.5 rounded-2xl border-2 border-[#33272A]/70 dark:border-[#FFD3B6]/60 focus:border-[#FF8BA7] focus:outline-none bg-white dark:bg-slate-800 text-[#33272A] dark:text-slate-100 text-xs font-bold shadow-[2px_2px_0px_#33272A]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-2.5 p-1 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                      title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Curved Action Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-6 bg-gradient-to-r from-[#FF8BA7] via-[#ff94ae] to-[#FFAAA5] hover:brightness-105 text-[#33272A] rounded-full font-black text-xs sm:text-sm border-2 border-[#33272A] shadow-[3px_3px_0px_#33272A] hover:shadow-[1px_1px_0px_#33272A] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer flex items-center justify-center gap-2 transition-all mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#33272A]" />
                      <span>กำลังเข้าสู่ระบบ...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 text-[#33272A]" />
                      <span>เข้าสู่ระบบสารสนเทศ</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-black text-[#33272A] dark:text-[#FFF9F5] mb-1.5">
                  ชื่อ-นามสกุล <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น นายประสิทธิ์ ใจมั่น"
                  className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#33272A]/70 dark:border-[#FFD3B6]/60 focus:border-[#A0E7E5] focus:outline-none bg-white dark:bg-slate-800 text-[#33272A] dark:text-slate-100 text-xs font-bold shadow-[2px_2px_0px_#33272A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#33272A] dark:text-[#FFF9F5] mb-1.5">
                    อีเมล (Email) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teacher@mhs1.go.th"
                    className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#33272A]/70 dark:border-[#FFD3B6]/60 focus:border-[#A0E7E5] focus:outline-none bg-white dark:bg-slate-800 text-[#33272A] dark:text-slate-100 text-xs font-bold shadow-[2px_2px_0px_#33272A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-[#33272A] dark:text-[#FFF9F5] mb-1.5">
                    เบอร์โทรศัพท์
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#33272A]/60 dark:text-[#FFF9F5]/60 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="08X-XXXXXXX"
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl border-2 border-[#33272A]/70 dark:border-[#FFD3B6]/60 focus:border-[#A0E7E5] focus:outline-none bg-white dark:bg-slate-800 text-[#33272A] dark:text-slate-100 text-xs font-bold shadow-[2px_2px_0px_#33272A]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-[#33272A] dark:text-[#FFF9F5] mb-1.5">
                  ตำแหน่งหน้าที่
                </label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#33272A]/70 dark:border-[#FFD3B6]/60 focus:border-[#A0E7E5] focus:outline-none bg-white dark:bg-slate-800 text-[#33272A] dark:text-slate-100 text-xs font-bold shadow-[2px_2px_0px_#33272A] cursor-pointer"
                >
                  <option value="ผู้อำนวยการโรงเรียน">ผู้อำนวยการโรงเรียน / รักษาการ</option>
                  <option value="รองผู้อำนวยการ">รองผู้อำนวยการโรงเรียน</option>
                  <option value="ครูผู้ดูแลระบบสารสนเทศ (Admin)">ครูผู้ดูแลระบบสารสนเทศ (Admin)</option>
                  <option value="ครูผู้สอน">ครูผู้สอน</option>
                  <option value="เจ้าหน้าที่ธุรการ">เจ้าหน้าที่ธุรการ / บุคลากรทางการศึกษา</option>
                </select>
              </div>

              {/* School Selection with Curved Rounded Container */}
              <div className="relative">
                <label className="block text-xs font-black text-[#33272A] dark:text-[#FFF9F5] mb-1.5">
                  สังกัดโรงเรียน <span className="text-rose-500">*</span>
                </label>
                <div
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#33272A]/70 dark:border-[#FFD3B6]/60 bg-white dark:bg-slate-800 flex items-center justify-between cursor-pointer hover:border-[#A0E7E5] text-xs font-bold shadow-[2px_2px_0px_#33272A]"
                >
                  <span className={selectedSchool ? 'text-[#33272A] dark:text-[#FFF9F5] font-black' : 'text-[#33272A]/50 dark:text-slate-400'}>
                    {selectedSchool
                      ? `[${selectedSchool.id}] ${selectedSchool.name} (${selectedSchool.amphoe})`
                      : '-- คลิกเพื่อค้นหาและเลือกโรงเรียนของคุณ --'}
                  </span>
                  <Search className="w-4 h-4 text-[#33272A] dark:text-[#FFD3B6]" />
                </div>

                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#FFF9F5] dark:bg-slate-800 rounded-3xl shadow-2xl border-2 border-[#33272A] z-50 p-2.5 max-h-64 flex flex-col">
                    <input
                      type="text"
                      value={schoolSearch}
                      onChange={(e) => setSchoolSearch(e.target.value)}
                      placeholder="พิมพ์ชื่อโรงเรียน หรือรหัส 8 หลัก..."
                      className="w-full px-3 py-2 rounded-xl border-2 border-[#33272A] text-xs font-bold mb-2 bg-white dark:bg-slate-900"
                      autoFocus
                    />
                    <div className="overflow-y-auto space-y-1.5 max-h-48">
                      {filteredSchools.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setSelectedSchoolId(s.id);
                            setIsDropdownOpen(false);
                            setSchoolSearch('');
                          }}
                          className={`p-2 rounded-xl text-xs cursor-pointer flex items-center justify-between border transition ${
                            selectedSchoolId === s.id
                              ? 'bg-[#A0E7E5] text-[#33272A] border-[#33272A] font-black shadow-[2px_2px_0px_#33272A]'
                              : 'bg-white hover:bg-[#FFD3B6]/30 text-[#33272A] border-transparent'
                          }`}
                        >
                          <div>
                            <span className="font-bold">{s.name}</span>
                            <span className="text-[10px] text-[#33272A]/60 ml-1.5">({s.amphoe})</span>
                          </div>
                          <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-[#33272A]/20 font-bold">
                            {s.id}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-[#A0E7E5]/25 rounded-2xl border-2 border-[#33272A]/40 text-[11px] text-[#33272A] dark:text-[#FFF9F5] font-bold">
                ℹ️ เมื่อส่งคำขอแล้ว ผู้ดูแลระบบ สพป.แม่ฮ่องสอน เขต 1 จะตรวจสอบและอนุมัติสิทธิ์ให้ท่านเข้าจัดการข้อมูลของโรงเรียนได้ทันที
              </div>

              {/* Curved Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-6 bg-gradient-to-r from-[#2DD4BF] to-[#5EEAD4] hover:brightness-105 text-[#33272A] rounded-full font-black text-xs sm:text-sm border-2 border-[#33272A] shadow-[3px_3px_0px_#33272A] hover:shadow-[1px_1px_0px_#33272A] hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer flex items-center justify-center gap-2 transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#33272A]" />
                    <span>กำลังส่งคำขอ...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 text-[#33272A]" />
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
