import { auth } from '../firebase';
import React, { useState, useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { UserProfile } from '../types';
import { ShieldAlert, Clock, LogOut, RefreshCw, Lock } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface InactivityLogoutHandlerProps {
  userProfile: UserProfile | null;
  onLoggedOut?: () => void;
}

export default function InactivityLogoutHandler({
  userProfile,
  onLoggedOut,
}: InactivityLogoutHandlerProps) {
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showLoggedOutNoticeModal, setShowLoggedOutNoticeModal] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(120); // 2 นาทีสุดท้ายของการเตือน
  
  const lastActivityRef = useRef<number>(Date.now());
  const warningModalOpenRef = useRef<boolean>(false);

  // ระยะเวลา 30 นาที = 1800 วินาที
  const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 นาที
  const WARNING_THRESHOLD_MS = 28 * 60 * 1000;  // เตือนที่นาทีที่ 28 (เหลือ 2 นาที)

  // ฟังก์ชันอัปเดตเวลาการเคลื่อนไหวล่าสุด
  const handleUserActivity = () => {
    // ถ้าแสดง Modal เตือนอยู่ ไม่อัปเดตอัตโนมัติจนกว่าจะกดปุ่มต่อเซสชัน
    if (!warningModalOpenRef.current) {
      lastActivityRef.current = Date.now();
    }
  };

  // รีเซ็ตการต่อเซสชัน
  const handleExtendSession = () => {
    lastActivityRef.current = Date.now();
    setShowWarningModal(false);
    warningModalOpenRef.current = false;
  };

  // ออกจากระบบด้วยตนเอง
  const handleManualLogout = async () => {
    setShowWarningModal(false);
    warningModalOpenRef.current = false;
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut().catch(() => {});
      }
      await signOut(auth).catch(() => {});
      if (onLoggedOut) onLoggedOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  // เมื่อผู้ใช้ล็อกอินเข้ามาใหม่ หรือโปรไฟล์เปลี่ยน ให้รีเซ็ตเวลากิจกรรมล่าสุดทันที
  useEffect(() => {
    if (userProfile) {
      lastActivityRef.current = Date.now();
      setShowWarningModal(false);
      warningModalOpenRef.current = false;
      setShowLoggedOutNoticeModal(false);
    } else {
      setShowWarningModal(false);
      warningModalOpenRef.current = false;
    }
  }, [userProfile?.uid]);

  useEffect(() => {
    if (!userProfile) {
      setShowWarningModal(false);
      warningModalOpenRef.current = false;
      return;
    }

    // รีเซ็ตเวลาเริ่มต้นเซสชัน ณ ตอนที่ component เริ่มทำงานกับ userProfile นี้
    lastActivityRef.current = Date.now();

    // ติดตั้ง Event Listeners ดักจับการเคลื่อนไหวของผู้ใช้งาน
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    // Throttle การอัปเดตเวลากิจกรรม
    let lastThrottledTime = 0;
    const throttledActivityHandler = () => {
      const now = Date.now();
      if (now - lastThrottledTime > 3000) { // อัปเดตไม่เกินทุกๆ 3 วินาที
        lastThrottledTime = now;
        handleUserActivity();
      }
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, throttledActivityHandler, { passive: true });
    });

    // ตั้งเวลาตรวจสอบ Inactivity ทุก 1 วินาที
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;

      // 1. ครบ 30 นาที (1,800,000 ms) -> Logout อัตโนมัติทันที
      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        setShowWarningModal(false);
        warningModalOpenRef.current = false;
        
        if (isSupabaseConfigured()) {
          supabase.auth.signOut().catch(() => {});
        }
        signOut(auth).then(() => {
          if (onLoggedOut) onLoggedOut();
          setShowLoggedOutNoticeModal(true);
        }).catch((err) => {
          console.error('Auto logout error:', err);
        });
      }
      // 2. ครบ 28 นาที -> แสดงแจ้งเตือนนับถอยหลัง
      else if (elapsed >= WARNING_THRESHOLD_MS) {
        const leftSecs = Math.max(0, Math.ceil((INACTIVITY_TIMEOUT_MS - elapsed) / 1000));
        setRemainingSeconds(leftSecs);
        if (!warningModalOpenRef.current) {
          setShowWarningModal(true);
          warningModalOpenRef.current = true;
        }
      } else {
        if (warningModalOpenRef.current) {
          setShowWarningModal(false);
          warningModalOpenRef.current = false;
        }
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, throttledActivityHandler);
      });
    };
  }, [userProfile, onLoggedOut]);

  if (!userProfile && !showLoggedOutNoticeModal) return null;

  return (
    <>
      {/* 1. Modal เตือนความปลอดภัยก่อนหมดเวลา 2 นาทีสุดท้าย */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-[#1e1518] border-4 border-[#33272A] dark:border-[#FFD3B6] shadow-[6px_6px_0px_#33272A] dark:shadow-[6px_6px_0px_#FFD3B6] space-y-4">
            <div className="flex items-center gap-3 border-b-2 border-[#33272A]/20 dark:border-[#FFD3B6]/20 pb-3">
              <div className="p-3 bg-amber-100 text-amber-900 border-2 border-amber-400 rounded-2xl animate-bounce">
                <ShieldAlert className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#33272A] dark:text-[#FFF9F5]">
                  แจ้งเตือนความปลอดภัยเซสชัน
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                  ระบบไม่พบการใช้งานของคุณเป็นเวลา 28 นาที
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-rose-600 dark:text-rose-400 font-mono text-2xl font-black">
                <Clock className="h-6 w-6 animate-spin" />
                <span>{Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, '0')} นาที</span>
              </div>
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                ระบบจะทำการออกจากระบบอัตโนมัติเพื่อป้องกันบุคคลอื่นสวมสิทธิ์การเข้าถึงข้อมูล
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleManualLogout}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-2 border-[#33272A] text-xs font-black hover:bg-slate-200 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <LogOut className="h-4 w-4" />
                <span>ออกจากระบบ</span>
              </button>
              <button
                type="button"
                onClick={handleExtendSession}
                className="px-5 py-2.5 rounded-2xl bg-[#FF8BA7] text-[#33272A] border-2 border-[#33272A] text-xs font-black hover:bg-rose-300 transition-all shadow-[2px_2px_0px_#33272A] cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="h-4 w-4 text-[#33272A]" />
                <span>คลิกเพื่อใช้งานต่อ (ต่อเซสชัน)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal แจ้งเตือนเมื่อถูกออกจากระบบอัตโนมัติครบ 30 นาทีเรียบร้อยแล้ว */}
      {showLoggedOutNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-[#1e1518] border-4 border-[#33272A] dark:border-[#FFD3B6] shadow-[6px_6px_0px_#33272A] dark:shadow-[6px_6px_0px_#FFD3B6] space-y-4 text-center">
            <div className="w-14 h-14 mx-auto bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300 rounded-full border-2 border-rose-400 flex items-center justify-center">
              <Lock className="h-7 w-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-[#33272A] dark:text-[#FFF9F5]">
                🔒 ออกจากระบบอัตโนมัติแล้ว
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-bold leading-relaxed">
                คุณถูกออกจากระบบอัตโนมัติเนื่องจากไม่มีการเคลื่อนไหวบนระบบเป็นเวลา <span className="text-rose-600 dark:text-rose-400 font-black">30 นาที</span> ตามมาตรฐานมาตรการความปลอดภัย
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowLoggedOutNoticeModal(false)}
                className="w-full py-3 rounded-2xl bg-[#A0E7E5] text-[#33272A] border-2 border-[#33272A] text-xs font-black hover:bg-teal-300 transition-all shadow-[3px_3px_0px_#33272A] cursor-pointer"
              >
                รับทราบและตกลง
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
