import React, { useState, useRef, useEffect } from 'react';
import { Bell, UserCheck, X, Check, Clock, School, Mail, Phone, ExternalLink, RefreshCw, AlertCircle, Sparkles, ShieldCheck, Volume2, Monitor } from 'lucide-react';
import { UserProfile } from '../types';
import { playNotificationChime, playApproveChime } from '../lib/soundEffects';
import {
  isBrowserNotificationSupported,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  sendBrowserNotification
} from '../lib/browserNotification';

interface SuperAdminNotificationBellProps {
  pendingUsers: UserProfile[];
  isLoading?: boolean;
  onRefresh: () => Promise<void>;
  onApprove: (user: UserProfile) => Promise<void>;
  onReject: (user: UserProfile) => Promise<void>;
  onOpenAdminUserManagement: () => void;
}

export default function SuperAdminNotificationBell({
  pendingUsers,
  isLoading = false,
  onRefresh,
  onApprove,
  onReject,
  onOpenAdminUserManagement
}: SuperAdminNotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [processingUid, setProcessingUid] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(
    getBrowserNotificationPermission()
  );
  const popoverRef = useRef<HTMLDivElement>(null);

  // Update permission status on mount
  useEffect(() => {
    setNotificationPermission(getBrowserNotificationPermission());
  }, []);

  const handleRequestNotificationPermission = async () => {
    const perm = await requestBrowserNotificationPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      sendBrowserNotification('✅ เปิดการแจ้งเตือนสำเร็จ', {
        body: 'ระบบจะแจ้งเตือนเมื่อมีผู้สมัครสมาชิกใหม่เข้ามาทันที แม้พับหน้าจออยู่',
        icon: '/icon-192.png',
        tag: 'mhs1-perm-test'
      });
      playNotificationChime();
      setActionSuccessMessage('เปิดการแจ้งเตือนบนเบราว์เซอร์เรียบร้อยแล้ว');
      setTimeout(() => setActionSuccessMessage(null), 3500);
    } else if (perm === 'denied') {
      alert('เบราว์เซอร์ถูกปฏิเสธสิทธิ์การแจ้งเตือน กรุณาคลิกที่รูปกุญแจ 🔒 บนแถบ URL ของเบราว์เซอร์เพื่ออนุญาตการแจ้งเตือน (Notifications)');
    }
  };

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleApproveClick = async (user: UserProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setProcessingUid(user.uid);
      await onApprove(user);
      playApproveChime();
      setActionSuccessMessage(`อนุมัติสิทธิ์ให้ "${user.firstName} ${user.lastName}" เรียบร้อยแล้ว`);
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาดในการอนุมัติ: ${err?.message || err}`);
    } finally {
      setProcessingUid(null);
    }
  };

  const handleRejectClick = async (user: UserProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`ยืนยันการปฏิเสธคำขอสมัครของ "${user.firstName} ${user.lastName}" (${user.schoolName || user.email}) หรือไม่?`)) {
      return;
    }
    try {
      setProcessingUid(user.uid);
      await onReject(user);
      setActionSuccessMessage(`ปฏิเสธคำขอของ "${user.firstName} ${user.lastName}" แล้ว`);
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาดในการปฏิเสธ: ${err?.message || err}`);
    } finally {
      setProcessingUid(null);
    }
  };

  const pendingCount = pendingUsers.length;

  const formatDate = (dateVal: any) => {
    if (!dateVal) return 'เมื่อสักครู่';
    try {
      let d: Date;
      if (dateVal.toDate && typeof dateVal.toDate === 'function') {
        d = dateVal.toDate();
      } else if (dateVal instanceof Date) {
        d = dateVal;
      } else {
        d = new Date(dateVal);
      }
      return d.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'เมื่อสักครู่';
    }
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* 🔔 Notification Bell Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && pendingCount > 0) {
            playNotificationChime();
          }
        }}
        className={`relative flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-xl border-2 transition-all cursor-pointer shadow-[2px_2px_0px_#33272A] dark:shadow-[2px_2px_0px_#FFD3B6] shrink-0 ${
          pendingCount > 0
            ? 'bg-rose-50 border-rose-500 text-rose-600 dark:bg-rose-950/80 dark:border-rose-400 dark:text-rose-300 animate-pulse hover:bg-rose-100'
            : 'bg-[#FFF9F5] border-[#33272A] text-[#33272A] dark:bg-[#1e1518] dark:border-[#FFD3B6] dark:text-[#FFF9F5] hover:bg-[#FFD3B6]/40'
        }`}
        title={
          pendingCount > 0
            ? `📢 มี ${pendingCount} คำขอสมัครสมาชิกรอ Super Admin พิจารณาอนุมัติ`
            : 'การแจ้งเตือนคำขอสมัครใช้งานใหม่ (Super Admin)'
        }
      >
        <Bell className={`h-4 w-4 sm:h-4.5 sm:w-4.5 ${pendingCount > 0 ? 'text-rose-500 animate-bounce' : ''}`} />

        {/* Live Badge Counter */}
        {pendingCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white shadow-md border-2 border-white dark:border-[#1e1518] animate-pulse">
            {pendingCount > 99 ? '99+' : pendingCount}
          </span>
        )}
      </button>

      {/* 📋 Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[340px] sm:w-[400px] max-w-[92vw] rounded-2xl border-2 border-[#33272A] bg-white dark:border-[#FFD3B6] dark:bg-[#1e1518] shadow-[6px_6px_0px_0px_#33272A] dark:shadow-[6px_6px_0px_0px_#FFD3B6] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-rose-50 via-amber-50 to-[#FFF9F5] dark:from-rose-950/40 dark:via-amber-950/30 dark:to-[#150e10] border-b-2 border-[#33272A]/15 dark:border-[#FFD3B6]/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-rose-500 text-white rounded-lg shadow-sm">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                  คำขอสมัครสมาชิกใหม่
                  {pendingCount > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                      {pendingCount}
                    </span>
                  )}
                </h3>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  ระบบแจ้งเตือนเฉพาะ Super Admin
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-rose-500' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Success Flash Banner */}
          {actionSuccessMessage && (
            <div className="bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-300 dark:border-emerald-700/50 px-3 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">{actionSuccessMessage}</span>
            </div>
          )}

          {/* Notification API Status / Toggle Banner */}
          <div className="px-3 py-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <Monitor className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
              <span className="font-bold text-slate-700 dark:text-slate-300 truncate">
                {notificationPermission === 'granted'
                  ? 'การแจ้งเตือนหน้าจอ: เปิดใช้งานแล้ว'
                  : notificationPermission === 'denied'
                  ? 'การแจ้งเตือนหน้าจอ: ถูกบล็อก'
                  : 'แจ้งเตือนผ่านเบราว์เซอร์ (Desktop)'}
              </span>
            </div>

            {notificationPermission === 'granted' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-black shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                เปิดอยู่
              </span>
            ) : (
              <button
                type="button"
                onClick={handleRequestNotificationPermission}
                className="px-2 py-0.5 rounded-md bg-sky-500 hover:bg-sky-600 text-white text-[10px] font-black shadow-xs transition-transform active:scale-95 cursor-pointer shrink-0"
              >
                เปิดใช้งาน
              </button>
            )}
          </div>

          {/* Body List */}
          <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 p-2 space-y-2">
            {pendingUsers.length === 0 ? (
              <div className="p-6 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <p className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">
                  ไม่มีคำขอสมัครสมาชิกรออนุมัติ
                </p>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                  เมื่อมีผู้บริหารหรือครูสมัครเข้ามาใหม่ ระบบจะแจ้งเตือนให้ทันที
                </p>
              </div>
            ) : (
              pendingUsers.map((user) => {
                const isProcessing = processingUid === user.uid;
                return (
                  <div
                    key={user.uid || user.email}
                    className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-[#FFF9F5]/40 dark:bg-[#150e10]/60 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-all flex flex-col gap-2"
                  >
                    {/* User Profile Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#FF8BA7] text-[#33272A] font-black flex items-center justify-center text-xs shrink-0 border border-[#33272A]/20 shadow-xs">
                          {user.firstName ? user.firstName.charAt(0) : 'U'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] truncate">
                            {user.firstName} {user.lastName}
                          </h4>
                          <p className="text-[10px] font-bold text-rose-500 flex items-center gap-1 truncate">
                            <School className="h-3 w-3 shrink-0" />
                            {user.schoolName || `รหัส: ${user.schoolId}`}
                          </p>
                        </div>
                      </div>

                      <span className="text-[9px] font-mono text-slate-600 dark:text-slate-300 flex items-center gap-0.5 shrink-0">
                        <Clock className="h-2.5 w-2.5" />
                        {formatDate(user.createdAt)}
                      </span>
                    </div>

                    {/* Email Details */}
                    <div className="text-[10px] text-slate-600 dark:text-slate-300 font-medium space-y-0.5 px-0.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={(e) => handleRejectClick(user, e)}
                        className="px-2 py-1 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-[10px] font-black flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        title="ปฏิเสธคำขอ"
                      >
                        <X className="h-3 w-3" />
                        <span>ปฏิเสธ</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={(e) => handleApproveClick(user, e)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black flex items-center gap-1 shadow-xs transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                        title="อนุมัติให้ใช้งานระบบได้ทันที"
                      >
                        {isProcessing ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                        <span>อนุมัติทันที</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 dark:bg-[#150e10] border-t-2 border-[#33272A]/10 dark:border-[#FFD3B6]/15 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              สถานะ: {pendingCount} รายการรอการตรวจสอบ
            </span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenAdminUserManagement();
              }}
              className="text-[11px] font-black text-[#33272A] dark:text-[#FFD3B6] hover:text-[#FF8BA7] dark:hover:text-[#FF8BA7] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>จัดการสิทธิ์ทั้งหมด</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
