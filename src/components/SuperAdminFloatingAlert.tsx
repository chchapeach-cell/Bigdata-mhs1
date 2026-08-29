import React, { useState } from 'react';
import { Bell, ArrowRight, X, UserCheck, ShieldAlert } from 'lucide-react';
import { UserProfile } from '../types';

interface SuperAdminFloatingAlertProps {
  pendingUsers: UserProfile[];
  onOpenUserManagement: () => void;
}

export default function SuperAdminFloatingAlert({
  pendingUsers,
  onOpenUserManagement
}: SuperAdminFloatingAlertProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed || pendingUsers.length === 0) {
    return null;
  }

  const latestUser = pendingUsers[0];
  const totalCount = pendingUsers.length;

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-[360px] sm:max-w-[420px] w-[calc(100vw-2rem)] animate-in slide-in-from-bottom-5 duration-300">
      <div className="rounded-2xl border-2 border-[#33272A] bg-white dark:border-[#FFD3B6] dark:bg-[#1e1518] shadow-[4px_4px_0px_0px_#33272A] dark:shadow-[4px_4px_0px_0px_#FFD3B6] p-3 sm:p-3.5 flex items-start gap-3">
        {/* Animated Bell Avatar */}
        <div className="relative p-2 bg-rose-500 text-white rounded-xl shadow-sm shrink-0 mt-0.5 animate-bounce">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[#33272A] text-[9px] font-black">
            {totalCount}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h4 className="text-xs sm:text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
              <span>มีคำขอสมัครใช้งานใหม่</span>
              <span className="bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 text-[10px] px-1.5 py-0.2 rounded-md font-bold">
                {totalCount} ท่าน
              </span>
            </h4>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-lg transition-colors cursor-pointer"
              title="ปิดการแจ้งเตือนนี้"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mt-1 truncate">
            {latestUser ? (
              <span>
                <strong className="font-black text-[#33272A] dark:text-[#FFF9F5]">
                  {latestUser.firstName} {latestUser.lastName}
                </strong>{' '}
                ({latestUser.schoolName || 'โรงเรียน'})
                {totalCount > 1 && ` และอีก ${totalCount - 1} ท่าน`}
              </span>
            ) : (
              'มีผู้ใช้งานรออนุมัติสิทธิ์เข้าใช้งาน'
            )}
          </p>

          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsDismissed(true);
                onOpenUserManagement();
              }}
              className="btn-cute bg-emerald-400 hover:bg-emerald-500 text-[#33272A] text-[10px] sm:text-xs font-black px-2.5 py-1 flex items-center gap-1 cursor-pointer transition-all shadow-[2px_2px_0px_#33272A]"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>ตรวจสอบและอนุมัติ</span>
              <ArrowRight className="h-3 w-3" />
            </button>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:underline cursor-pointer px-1 py-0.5"
            >
              ไว้ภายหลัง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
