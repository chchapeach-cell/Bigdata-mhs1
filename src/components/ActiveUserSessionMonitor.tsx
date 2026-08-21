import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { Users, UserX, Clock, Shield, AlertTriangle, CheckCircle, RefreshCw, LogOut, Radio, UserCheck } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface ActiveSessionData {
  uid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  schoolName?: string;
  role?: string;
  loginTime: number; // timestamp in ms
  lastActiveTime: number; // timestamp in ms
  kicked?: boolean;
  kickedAt?: number;
  kickedBy?: string;
  ipAddress?: string;
}

interface ActiveUserSessionMonitorProps {
  currentUserProfile: UserProfile;
}

export default function ActiveUserSessionMonitor({ currentUserProfile }: ActiveUserSessionMonitorProps) {
  const [activeSessions, setActiveSessions] = useState<ActiveSessionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nowTime, setNowTime] = useState<number>(Date.now());
  const [kickingUid, setKickingUid] = useState<string | null>(null);
  const [confirmKickSession, setConfirmKickSession] = useState<ActiveSessionData | null>(null);
  const [toastMsg, setToastMsg] = useState<string>('');

  const MAX_CONCURRENT_LIMIT = 10000;

  // อัปเดตเวลาปัจจุบันทุกๆ 10 วินาที เพื่อคำนวณจำนวนนาทีที่ใช้งาน
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Listen real-time on `active_sessions` collection (or poll Supabase)
  useEffect(() => {
    setIsLoading(true);
    const THREE_MINUTES = 3 * 60 * 1000;

    let intervalId: any = null;

    const fetchSessions = async () => {
      const now = Date.now();
      const minActiveTime = now - THREE_MINUTES;

      if (supabase && isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('active_sessions')
            .select('uid, email, first_name, last_name, school_name, role, login_time, last_active_time, kicked')
            .gt('last_active_time', minActiveTime)
            .eq('kicked', false);

          if (!error && data) {
            const loadedSessions: ActiveSessionData[] = data.map((d: any) => ({
              uid: d.uid,
              email: d.email || '',
              firstName: d.first_name || '',
              lastName: d.last_name || '',
              schoolName: d.school_name || '',
              role: d.role || '',
              loginTime: Number(d.login_time) || now,
              lastActiveTime: Number(d.last_active_time) || now,
              kicked: d.kicked || false,
            }));

            loadedSessions.sort((a, b) => (b.lastActiveTime || 0) - (a.lastActiveTime || 0));
            setActiveSessions(loadedSessions);
            setIsLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Supabase fetch active sessions error:', err);
        }
      }
    };

    if (supabase && isSupabaseConfigured()) {
      fetchSessions();
      intervalId = setInterval(fetchSessions, 10000);
    } else {
      setIsLoading(false);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  // ฟังก์ชันสำหรับเตะผู้ใช้เป้าหมายออกจากระบบ
  const handleKickUser = async (sessionToKick: ActiveSessionData) => {
    setKickingUid(sessionToKick.uid);
    try {
      const now = Date.now();

      if (supabase && isSupabaseConfigured()) {
        await supabase.from('active_sessions').update({
          kicked: true,
          kicked_at: now,
          kicked_by: currentUserProfile.email,
          updated_at: new Date().toISOString()
        }).eq('uid', sessionToKick.uid);
      }

      setToastMsg(`เตะผู้ใช้ ${sessionToKick.firstName || ''} (${sessionToKick.email}) ออกจากระบบเรียบร้อยแล้ว`);
      setTimeout(() => setToastMsg(''), 4000);
    } catch (e: any) {
      console.error('Error kicking user:', e);
      alert('เกิดข้อผิดพลาดในการเตะผู้ใช้ออกจากระบบ: ' + (e as Error).message);
    } finally {
      setKickingUid(null);
      setConfirmKickSession(null);
    }
  };

  // ล้างเซสชันเก่าค้าง
  const handleCleanStaleSessions = async () => {
    try {
      const now = Date.now();
      const TEN_MINUTES = 10 * 60 * 1000;
      let cleanedCount = 0;

      for (const session of activeSessions) {
        if (now - session.lastActiveTime > TEN_MINUTES || session.kicked) {
          await supabase.from('active_sessions').delete().eq('uid', session.uid);
          cleanedCount++;
        }
      }
      setToastMsg(`ล้างข้อมูลเซสชันเก่าสำเร็จ (${cleanedCount} รายการ)`);
      setTimeout(() => setToastMsg(''), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  const activeCount = activeSessions.length;
  const activePercentage = Math.min(100, parseFloat(((activeCount / MAX_CONCURRENT_LIMIT) * 100).toFixed(1)));

  return (
    <div className="card p-5 space-y-5 bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[3px_3px_0px_#33272A] dark:shadow-[3px_3px_0px_#FFD3B6]">
      {/* Notifications Toast */}
      {toastMsg && (
        <div className="p-3 rounded-2xl bg-[#A0E7E5] text-[#33272A] border-2 border-[#33272A] text-xs font-black flex items-center justify-between shadow-md animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-700" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg('')} className="text-xs font-bold underline cursor-pointer">ปิด</button>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#33272A]/20 dark:border-[#FFD3B6]/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-[#FF8BA7] text-[#33272A] rounded-2xl border-2 border-[#33272A] shadow-sm">
            <Users className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-2">
              <span>ระบบตรวจสอบและจัดการผู้ใช้งานออนไลน์ขณะนี้ (Active Online Users)</span>
              <span className="flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-400 font-bold">
                <Radio className="h-3 w-3 text-emerald-600 animate-ping" /> Real-time Live
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
              แสดงรายชื่อผู้ที่กำลังล็อกอินในระบบ ระยะเวลาที่ใช้งาน (นาที) และฟังก์ชัน Super Admin เตะออกจากระบบ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCleanStaleSessions}
            className="p-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border-2 border-[#33272A] dark:border-[#FFD3B6] text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5 cursor-pointer"
            title="ล้างเซสชันที่ไม่แอ็กทีฟ"
          >
            <RefreshCw className="h-3.5 w-3.5 text-sky-500" />
            <span>เคลียร์เซสชันเก่า</span>
          </button>
        </div>
      </div>

      {/* Overview Cards & Concurrency Meter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Metric 1: Current Online Counter */}
        <div className="p-4 rounded-2xl bg-[#FFF9F5] dark:bg-[#261b1f] border-2 border-[#33272A] dark:border-[#FFD3B6]/50 space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">
            <span className="flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-emerald-600" /> ผู้ใช้งานออนไลน์ขณะนี้
            </span>
            <span className="font-mono text-lg text-emerald-600 dark:text-emerald-400">{activeCount} คน</span>
          </div>
          <p className="text-[10px] text-slate-500 font-bold">กำลังเชื่อมต่อใช้งานในระบบในขณะนี้</p>
        </div>

        {/* Metric 2: Concurrency Cap Meter */}
        <div className="p-4 rounded-2xl bg-[#FFF9F5] dark:bg-[#261b1f] border-2 border-[#33272A] dark:border-[#FFD3B6]/50 space-y-2 md:col-span-2">
          <div className="flex items-center justify-between text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">
            <span className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-emerald-500" /> อัตราการใช้งานเทียบขีดจำกัด (Max {MAX_CONCURRENT_LIMIT} คน)
            </span>
            <span className={`font-mono text-sm px-2.5 py-0.5 rounded-lg border font-black ${
              activeCount >= 9000 ? 'bg-rose-100 text-rose-700 border-rose-400' :
              activeCount >= 5000 ? 'bg-amber-100 text-amber-700 border-amber-400' :
              'bg-emerald-100 text-emerald-700 border-emerald-400'
            }`}>
              {activeCount} / {MAX_CONCURRENT_LIMIT} คน ({activePercentage}%)
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden border border-[#33272A]/30">
            <div
              className={`h-full transition-all duration-500 ${
                activeCount >= 9000 ? 'bg-rose-600' : activeCount >= 5000 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.max(4, activePercentage)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-bold">
            <span>{activeCount >= 10000 ? '⚠️ ระบบล็อกผู้ใช้งานเต็มจำนวนแล้ว' : 'รองรับเพิ่มเติมได้อีก ' + (MAX_CONCURRENT_LIMIT - activeCount) + ' คน'}</span>
            <span>ขีดจำกัดสูงสุด: {MAX_CONCURRENT_LIMIT} คน</span>
          </div>
        </div>
      </div>

      {/* User Session List Table */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-[#FF8BA7]" /> ตารางรายชื่อผู้ใช้งานที่กำลังออนไลน์ ({activeSessions.length} รายการ)
          </span>
          <span className="text-[10px] text-slate-400 font-normal">
            อัปเดตสถานะอัตโนมัติทุกครั้งที่มีการเปลี่ยนกิจกรรม
          </span>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-xs font-bold text-slate-400 flex justify-center items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-rose-500" />
            <span>กำลังโหลดข้อมูลผู้ใช้งานออนไลน์...</span>
          </div>
        ) : activeSessions.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800">
            <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">ไม่มีผู้ใช้งานอื่นออนไลน์ในขณะนี้</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6]/50">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FFD3B6]/40 dark:bg-[#2b1f24] text-[#33272A] dark:text-[#FFF9F5] border-b-2 border-[#33272A] dark:border-[#FFD3B6]/50 font-black">
                  <th className="p-3">#</th>
                  <th className="p-3">ผู้ใช้งาน</th>
                  <th className="p-3">โรงเรียน / สังกัด</th>
                  <th className="p-3">สิทธิ์</th>
                  <th className="p-3">เวลาที่ใช้งานมาแล้ว</th>
                  <th className="p-3">สถานะล่าสุด</th>
                  <th className="p-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-[#1e1518]">
                {activeSessions.map((session, idx) => {
                  const isMe = session.uid === currentUserProfile.uid;
                  // คำนวณจำนวนนาทีที่ใช้งานนับตั้งแต่ล็อกอิน
                  const elapsedMs = Math.max(0, nowTime - (session.loginTime || session.lastActiveTime || nowTime));
                  const activeMinutes = Math.floor(elapsedMs / 60000);
                  const activeSeconds = Math.floor((elapsedMs % 60000) / 1000);

                  // เวลาที่อัปเดตล่าสุด
                  const secondsSinceLastSeen = Math.floor((nowTime - (session.lastActiveTime || nowTime)) / 1000);

                  return (
                    <tr key={session.uid} className={`hover:bg-[#FFF9F5] dark:hover:bg-[#281c20] transition-colors ${isMe ? 'bg-[#A0E7E5]/15 dark:bg-[#A0E7E5]/5' : ''}`}>
                      <td className="p-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-bold text-[#33272A] dark:text-[#FFF9F5]">
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1.5 font-black text-sm">
                            {session.firstName || session.lastName ? `${session.firstName || ''} ${session.lastName || ''}` : session.email}
                            {isMe && (
                              <span className="text-[9px] bg-[#A0E7E5] text-[#33272A] px-2 py-0.5 rounded-full border border-[#33272A] font-black">
                                ตัวคุณ
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{session.email}</span>
                        </div>
                      </td>
                      <td className="p-3 font-bold text-slate-700 dark:text-slate-300">
                        {session.schoolName || 'สพป.แม่ฮ่องสอน เขต 1'}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black border ${
                          session.role === 'super_admin'
                            ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200'
                            : 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-200'
                        }`}>
                          {session.role === 'super_admin' ? '🛡️ Super Admin' : '🏫 แอดมินโรงเรียน'}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-black text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-amber-500" />
                          <span>
                            {activeMinutes > 0 ? `${activeMinutes} นาที ${activeSeconds} วินาที` : `${activeSeconds} วินาที`}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-[11px]">
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>{secondsSinceLastSeen < 10 ? 'แอ็กทีฟ' : `${secondsSinceLastSeen}s ที่แล้ว`}</span>
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {isMe ? (
                          <span className="text-[10px] text-slate-400 font-bold italic">ไม่สามารถเตะตัวเอง</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmKickSession(session)}
                            disabled={kickingUid === session.uid}
                            className="px-3 py-1.5 rounded-xl bg-rose-500 text-white font-black hover:bg-rose-600 border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] text-xs cursor-pointer flex items-center gap-1 mx-auto disabled:opacity-50 transition-transform active:translate-y-0.5"
                          >
                            <UserX className="h-3.5 w-3.5" />
                            <span>เตะออกจากระบบ</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal ยืนยันการเตะออกจากระบบ */}
      {confirmKickSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#33272A]/70 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md card p-6 space-y-4 bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[5px_5px_0px_#33272A]">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-950 border-2 border-rose-500">
                <AlertTriangle className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#33272A] dark:text-[#FFF9F5]">
                  ยืนยันเตะผู้ใช้ออกจากระบบ
                </h3>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  เซสชันของผู้ใช้จะถูกยกเลิกทันที
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 space-y-1.5 text-xs font-bold">
              <div className="text-slate-500">ข้อมูลผู้ใช้งาน:</div>
              <div className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5]">
                {confirmKickSession.firstName || confirmKickSession.lastName
                  ? `${confirmKickSession.firstName || ''} ${confirmKickSession.lastName || ''}`
                  : confirmKickSession.email}
              </div>
              <div className="text-slate-600 dark:text-slate-300 font-mono">{confirmKickSession.email}</div>
              <div className="text-slate-500 text-[11px]">สังกัด: {confirmKickSession.schoolName || 'ไม่ระบุ'}</div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 text-[11px] font-bold">
              ⚠️ ผู้ใช้จะถูกส่งออกจากระบบกลับไปหน้าหลักทันที และต้องลงชื่อเข้าใช้ใหม่อีกครั้ง
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmKickSession(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#33272A] border-2 border-[#33272A] text-xs font-black cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleKickUser(confirmKickSession)}
                disabled={kickingUid === confirmKickSession.uid}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white border-2 border-[#33272A] text-xs font-black cursor-pointer shadow-[3px_3px_0px_#33272A] flex items-center gap-1.5"
              >
                <LogOut className="h-4 w-4" />
                <span>{kickingUid === confirmKickSession.uid ? 'กำลังดำเนินการ...' : 'เตะออกจากระบบทันที'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
