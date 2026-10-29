import React from 'react';
import { Sparkles } from 'lucide-react';

interface LoadingProps {
  isDarkMode?: boolean;
  message?: string;
  subMessage?: string;
}

export default function DashboardSkeleton({
  isDarkMode = false,
  message = 'กำลังโหลดข้อมูลระบบ BigData...',
  subMessage = 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษาแม่ฮ่องสอน เขต 1'
}: LoadingProps) {
  return (
    <div
      className="min-h-[55vh] sm:min-h-[65vh] flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in"
      id="page-loading-view"
    >
      <div className="relative flex items-center justify-center">
        {/* Outer ambient glow */}
        <div className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-tr from-[#FF8BA7]/25 via-[#A0E7E5]/25 to-[#FFD3B6]/30 blur-2xl animate-pulse pointer-events-none" />

        {/* Outer decorative spinning dashed ring */}
        <div
          className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-dashed border-[#FF8BA7] dark:border-[#FF8BA7]/70 animate-[spin_6s_linear_infinite]"
          style={{ animationDirection: 'reverse' }}
        />

        {/* Inner fast-spinning accent ring */}
        <div className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-transparent border-t-[#FF8BA7] border-r-[#A0E7E5] border-b-[#FFD3B6] dark:border-t-[#FF8BA7] dark:border-r-[#A0E7E5] animate-[spin_1.8s_linear_infinite]" />

        {/* Central Icon Container with smooth continuous 360 spin */}
        <div className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white dark:bg-[#1e1518] p-2.5 shadow-[4px_4px_0px_#33272A] dark:shadow-[4px_4px_0px_#FFD3B6] border-2 border-[#33272A] dark:border-[#FFD3B6] flex items-center justify-center overflow-hidden animate-[spin_3s_ease-in-out_infinite]">
          <img
            src="/hamburger.png"
            alt="MHS1 BigData Hamburger Loader"
            className="w-full h-full object-contain filter drop-shadow-sm select-none pointer-events-none"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              if (target.src !== window.location.origin + '/hamburger.svg') {
                target.src = '/hamburger.svg';
              }
            }}
          />
        </div>

        {/* Floating Sparkle indicator */}
        <div className="absolute -top-1 -right-1 z-20 animate-bounce">
          <Sparkles className="w-5 h-5 text-amber-400 drop-shadow-sm" />
        </div>
      </div>

      {/* Loading Text and Animated Progress indicator */}
      <div className="mt-6 sm:mt-7 space-y-2 max-w-sm">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[2px_2px_0px_#33272A] dark:shadow-[2px_2px_0px_#FFD3B6]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF8BA7] animate-ping" />
          <h3 className="text-xs sm:text-sm font-black text-[#33272A] dark:text-[#FFF9F5] tracking-wide">
            {message}
          </h3>
        </div>

        <p className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
          {subMessage}
        </p>

        {/* Modern mini progress dots */}
        <div className="flex items-center justify-center gap-1.5 pt-1.5">
          <span className="w-2 h-2 rounded-full bg-[#FF8BA7] animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-[#FFD3B6] animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-[#A0E7E5] animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

// Named alias export for convenience
export { DashboardSkeleton as LoadingSpinner };
