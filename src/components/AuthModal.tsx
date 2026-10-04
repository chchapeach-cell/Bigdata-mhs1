import React, { useState, useMemo } from 'react';
import { School, User } from '../types';
import { X, Search, CheckCircle2, UserPlus, LogIn, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  onLoginSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  schools,
  onLoginSuccess,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('ครูผู้สอน');
  const [role, setRole] = useState<'teacher' | 'school_admin' | 'viewer'>('teacher');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [schoolSearch, setSchoolSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
      (s) => s.id.includes(q) || s.name.toLowerCase().includes(q) || s.amphoe.toLowerCase().includes(q)
    );
  }, [uniqueSchools, schoolSearch]);

  const selectedSchool = useMemo(() => {
    return uniqueSchools.find((s) => s.id === selectedSchoolId);
  }, [uniqueSchools, selectedSchoolId]);

  if (!isOpen) return null;

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!name.trim()) {
      setMessage({ type: 'error', text: 'กรุณากรอกชื่อ-นามสกุล' });
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setMessage({ type: 'error', text: 'กรุณากรอกอีเมลที่ถูกต้อง' });
      return;
    }
    if (!selectedSchoolId) {
      setMessage({ type: 'error', text: 'กรุณาเลือกสังกัดโรงเรียน' });
      return;
    }

    const targetSchool = uniqueSchools.find((s) => s.id === selectedSchoolId);
    const schoolName = targetSchool ? targetSchool.name : 'ไม่ระบุ';

    const newUser: User = {
      id: 'usr_' + Date.now(),
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      position,
      role,
      school_id: selectedSchoolId,
      school_name: schoolName,
      status: 'pending', // Pending approval by District Super Admin
      created_at: new Date().toISOString(),
    };

    // Save into localStorage
    try {
      const existingUsersRaw = localStorage.getItem('mhs1_users');
      const existingUsers: User[] = existingUsersRaw ? JSON.parse(existingUsersRaw) : [];
      existingUsers.push(newUser);
      localStorage.setItem('mhs1_users', JSON.stringify(existingUsers));
    } catch {
      // LocalStorage fallback
    }

    setMessage({
      type: 'success',
      text: `ส่งคำขอสมัครสมาชิกสำเร็จแล้ว! สำหรับสังกัด "${schoolName}" (รหัส ${selectedSchoolId}) ระบบได้ส่งคำขอไปยังผู้ดูแลระบบ สพป.แม่ฮ่องสอน เขต 1 เพื่ออนุมัติสิทธิ์การเข้าใช้งาน`,
    });

    setTimeout(() => {
      onLoginSuccess(newUser);
      onClose();
    }, 2000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!email.trim()) {
      setMessage({ type: 'error', text: 'กรุณากรอกอีเมล' });
      return;
    }

    // Check existing or demo admin
    if (email.toLowerCase().includes('admin') || email.toLowerCase().includes('chapeach')) {
      const adminUser: User = {
        id: 'admin_1',
        name: 'ผู้ดูแลระบบ สพป.แม่ฮ่องสอน เขต 1',
        email: email.trim(),
        role: 'super_admin',
        school_id: '58010000',
        school_name: 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษาแม่ฮ่องสอน เขต 1',
        status: 'approved',
        created_at: new Date().toISOString(),
      };
      onLoginSuccess(adminUser);
      onClose();
      return;
    }

    // Look up user from localStorage
    try {
      const existingUsersRaw = localStorage.getItem('mhs1_users');
      const existingUsers: User[] = existingUsersRaw ? JSON.parse(existingUsersRaw) : [];
      const found = existingUsers.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (found) {
        onLoginSuccess(found);
        onClose();
        return;
      }
    } catch {}

    // Fallback regular login
    const generalUser: User = {
      id: 'usr_' + Date.now(),
      name: email.split('@')[0],
      email: email.trim(),
      role: 'teacher',
      school_id: selectedSchoolId || '58010045',
      school_name: selectedSchool ? selectedSchool.name : 'บ้านห้วยช่างคำ',
      status: 'approved',
      created_at: new Date().toISOString(),
    };
    onLoginSuccess(generalUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              <span>ระบบเข้าใช้งานสารสนเทศ สพป.มส.1</span>
            </h2>
            <p className="text-xs text-blue-100 mt-1">
              ระบบรับรองข้อมูลสถานศึกษา บุคลากร และสาธารณูปโภค
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 transition text-white/90 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            onClick={() => {
              setTab('register');
              setMessage(null);
            }}
            className={`flex-1 py-3 text-sm font-semibold text-center transition border-b-2 flex items-center justify-center gap-2 ${
              tab === 'register'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            ลงทะเบียนผู้ใช้งานสถานศึกษา
          </button>
          <button
            onClick={() => {
              setTab('login');
              setMessage(null);
            }}
            className={`flex-1 py-3 text-sm font-semibold text-center transition border-b-2 flex items-center justify-center gap-2 ${
              tab === 'login'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <LogIn className="w-4 h-4" />
            เข้าสู่ระบบ
          </button>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`mx-6 mt-4 p-3.5 rounded-xl text-sm flex items-start gap-2.5 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <p className="leading-snug">{message.text}</p>
          </div>
        )}

        {/* Form Content */}
        <div className="p-6">
          {tab === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อ-นามสกุล <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น นายสมคิด มีจิตต์"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    อีเมล (Email) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@moe.go.th"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เบอร์โทรศัพท์ติดต่อ
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08X-XXXXXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* School Selection with strict verified IDs */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลือกสถานศึกษาที่สังกัด <span className="text-rose-500">*</span>
                </label>
                <div
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white flex items-center justify-between cursor-pointer hover:border-blue-400 text-sm"
                >
                  <span className={selectedSchool ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                    {selectedSchool
                      ? `[${selectedSchool.id}] ${selectedSchool.name} (${selectedSchool.amphoe})`
                      : '-- ค้นหาและเลือกโรงเรียน / สาขา --'}
                  </span>
                  <Search className="w-4 h-4 text-slate-400" />
                </div>

                {/* Dropdown popup */}
                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2 max-h-64 flex flex-col">
                    <div className="relative mb-2">
                      <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={schoolSearch}
                        onChange={(e) => setSchoolSearch(e.target.value)}
                        placeholder="พิมพ์ชื่อโรงเรียน หรือรหัส เช่น 58010045, ห้วยช่างคำ..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    </div>

                    <div className="overflow-y-auto space-y-1 flex-1">
                      {filteredSchools.length === 0 ? (
                        <div className="p-3 text-xs text-center text-slate-400">
                          ไม่พบข้อมูลสถานศึกษาที่ค้นหา
                        </div>
                      ) : (
                        filteredSchools.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setSelectedSchoolId(s.id);
                              setIsDropdownOpen(false);
                            }}
                            className={`p-2 rounded-lg text-xs cursor-pointer transition flex items-center justify-between ${
                              selectedSchoolId === s.id
                                ? 'bg-blue-50 text-blue-800 font-semibold'
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <span className="truncate">
                              <span className="font-mono text-blue-600 font-semibold mr-1.5">
                                [{s.id}]
                              </span>
                              {s.name}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                              {s.amphoe}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Special verification helper badge */}
              <div className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-100 text-[11px] text-blue-800 flex items-center justify-between">
                <span>ตัวอย่างสถานศึกษาที่ตรวจสอบ:</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedSchoolId('58010045')}
                    className="px-2 py-0.5 bg-white border border-blue-200 rounded text-blue-700 font-medium hover:bg-blue-100"
                  >
                    58010045 ห้วยช่างคำ
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSchoolId('58010021')}
                    className="px-2 py-0.5 bg-white border border-blue-200 rounded text-blue-700 font-medium hover:bg-blue-100"
                  >
                    58010021 สาขาห้วยช่างเหล็ก
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ตำแหน่งในโรงเรียน
                  </label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="ผู้อำนวยการโรงเรียน">ผู้อำนวยการโรงเรียน</option>
                    <option value="รองผู้อำนวยการโรงเรียน">รองผู้อำนวยการโรงเรียน</option>
                    <option value="ครูผู้สอน">ครูผู้สอน</option>
                    <option value="ครูธุรการ/เจ้าหน้าที่">ครูธุรการ/เจ้าหน้าที่</option>
                    <option value="เจ้าหน้าที่สารสนเทศ ICT">เจ้าหน้าที่สารสนเทศ ICT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ระดับสิทธิ์ที่ขออนุมัติ
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="teacher">ครู/ผู้รายงานข้อมูลโรงเรียน</option>
                    <option value="school_admin">ผู้ดูแลระบบประจำโรงเรียน (Admin)</option>
                    <option value="viewer">ผู้ตรวจสอบ/เยี่ยมชมทั่วไป</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-md transition"
              >
                ยืนยันลงทะเบียนส่งขออนุมัติสิทธิ์
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  อีเมล (Email)
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="กรอกอีเมลของคุณ หรือ admin@mhs1.go.th"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสผ่าน
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่าน"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200">
                <span className="font-semibold text-slate-800">โหมดทดสอบด่วน:</span> สามารถกรอก{' '}
                <code className="bg-slate-200 px-1 py-0.5 rounded text-blue-700 font-mono">
                  admin@mhs1.go.th
                </code>{' '}
                เพื่อเข้าสู่ระบบในฐานะผู้ดูแลระบบเขต สพป.แม่ฮ่องสอน เขต 1 ได้ทันที
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-md transition"
              >
                เข้าสู่ระบบ
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
