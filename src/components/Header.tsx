import { useState } from 'react';
import { Sun, Moon, LogIn, LogOut, Shield, Award, User, RefreshCw, Globe, LayoutDashboard, Building2 } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  userProfile: UserProfile | null;
  onLoginClick: () => void;
  onLogout: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  setFontSize: (size: 'small' | 'medium' | 'large' | 'xlarge') => void;
}

export default function Header({
  userProfile,
  onLoginClick,
  onLogout,
  isDarkMode,
  toggleDarkMode,
  activeTab,
  setActiveTab,
  fontSize,
  setFontSize
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b-2 border-[#33272A] bg-white dark:border-[#FFD3B6] dark:bg-[#1e1518] backdrop-blur-md transition-colors duration-300">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* LOGO */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF9F5] dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[2px_2px_0px_0px_#33272A] dark:shadow-[2px_2px_0px_0px_#FFD3B6] overflow-hidden group cursor-pointer transition-transform duration-200 hover:scale-105">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-8 w-8">
              {/* Stacked Database disks */}
              <g transform="translate(8, 12) scale(0.72)">
                {/* Bottom Disk */}
                <path d="M10,65 C10,55 90,55 90,65 C90,75 10,75 10,65 Z" fill="#FF8BA7" stroke="#33272A" strokeWidth="8" strokeLinejoin="round"/>
                <path d="M10,65 L10,75 C10,85 90,85 90,75 L90,65" fill="#FF8BA7" stroke="#33272A" strokeWidth="8" strokeLinejoin="round"/>
                
                {/* Middle Disk */}
                <path d="M10,40 C10,30 90,30 90,40 C90,50 10,50 10,40 Z" fill="#FFD3B6" stroke="#33272A" strokeWidth="8" strokeLinejoin="round"/>
                <path d="M10,40 L10,50 C10,60 90,60 90,50 L90,40" fill="#FFD3B6" stroke="#33272A" strokeWidth="8" strokeLinejoin="round"/>
                
                {/* Top Disk */}
                <path d="M10,15 C10,5 90,5 90,15 C90,25 10,25 10,15 Z" fill="#A0E7E5" stroke="#33272A" strokeWidth="8" strokeLinejoin="round"/>
                <path d="M10,15 L10,25 C10,35 90,35 90,25 L90,15" fill="#A0E7E5" stroke="#33272A" strokeWidth="8" strokeLinejoin="round"/>
              </g>
              
              {/* Data nodes connecting to the Database with hover animations */}
              <path d="M 60 40 L 78 40 M 60 60 L 78 60 M 60 40 L 60 60" stroke="#33272A" strokeWidth="6" strokeLinecap="round" />
              <circle cx="78" cy="40" r="8" fill="#FF8BA7" stroke="#33272A" strokeWidth="5" />
              <circle cx="78" cy="60" r="8" fill="#A0E7E5" stroke="#33272A" strokeWidth="5" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
              BigData <span className="text-[#FF8BA7]">Mhs1</span>
            </h1>
            <p className="text-[9px] text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-bold">สพป.แม่ฮ่องสอน เขต 1</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-2 rounded-2xl bg-[#FFF9F5] p-1 border-2 border-[#33272A] dark:bg-[#33272A] dark:border-[#FFD3B6]">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`rounded-xl px-4 py-1 text-xs font-bold transition-all duration-200 ${
              activeTab === 'dashboard'
                ? 'bg-[#FF8BA7] text-[#33272A] border-2 border-[#33272A] shadow-sm dark:border-[#FFD3B6] dark:text-[#33272A]'
                : 'text-[#33272A] hover:bg-[#FFD3B6]/50 dark:text-[#FFF9F5] dark:hover:bg-slate-700'
            }`}
          >
            ภาพรวมระบบ
          </button>
          <button
            onClick={() => setActiveTab('schools')}
            className={`rounded-xl px-4 py-1 text-xs font-bold transition-all duration-200 ${
              activeTab === 'schools'
                ? 'bg-[#FF8BA7] text-[#33272A] border-2 border-[#33272A] shadow-sm dark:border-[#FFD3B6] dark:text-[#33272A]'
                : 'text-[#33272A] hover:bg-[#FFD3B6]/50 dark:text-[#FFF9F5] dark:hover:bg-slate-700'
            }`}
          >
            รายชื่อโรงเรียน
          </button>
          {userProfile && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`rounded-xl px-4 py-1 text-xs font-bold transition-all duration-200 flex items-center gap-1 ${
                activeTab === 'admin'
                  ? 'bg-[#FF8BA7] text-[#33272A] border-2 border-[#33272A] shadow-sm dark:border-[#FFD3B6] dark:text-[#33272A]'
                  : 'text-[#33272A] hover:bg-[#FFD3B6]/50 dark:text-[#FFF9F5] dark:hover:bg-slate-700'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              ระบบจัดการ
              {userProfile.status === 'pending' && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping"></span>
              )}
            </button>
          )}
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Font size adjuster */}
          <div className="hidden sm:flex items-center gap-1 bg-[#FFF9F5] p-1 rounded-xl border-2 border-[#33272A] dark:bg-[#1e1518] dark:border-[#FFD3B6]">
            <button
              onClick={() => setFontSize('small')}
              className={`px-2 py-0.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                fontSize === 'small'
                  ? 'bg-[#FF8BA7] text-[#33272A] border border-[#33272A]'
                  : 'text-[#33272A] dark:text-[#FFF9F5] hover:bg-[#FFD3B6]/30'
              }`}
              title="ตัวอักษรขนาดเล็ก"
            >
              ก
            </button>
            <button
              onClick={() => setFontSize('medium')}
              className={`px-2 py-0.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                fontSize === 'medium'
                  ? 'bg-[#FF8BA7] text-[#33272A] border border-[#33272A]'
                  : 'text-[#33272A] dark:text-[#FFF9F5] hover:bg-[#FFD3B6]/30'
              }`}
              title="ตัวอักษรขนาดปกติ"
            >
              ก
            </button>
            <button
              onClick={() => setFontSize('large')}
              className={`px-2 py-0.5 text-sm font-black rounded-lg transition-all cursor-pointer ${
                fontSize === 'large'
                  ? 'bg-[#FF8BA7] text-[#33272A] border border-[#33272A]'
                  : 'text-[#33272A] dark:text-[#FFF9F5] hover:bg-[#FFD3B6]/30'
              }`}
              title="ตัวอักษรขนาดใหญ่"
            >
              ก
            </button>
            <button
              onClick={() => setFontSize('xlarge')}
              className={`px-2 py-0.5 text-base font-black rounded-lg transition-all cursor-pointer ${
                fontSize === 'xlarge'
                  ? 'bg-[#FF8BA7] text-[#33272A] border border-[#33272A]'
                  : 'text-[#33272A] dark:text-[#FFF9F5] hover:bg-[#FFD3B6]/30'
              }`}
              title="ตัวอักษรขนาดใหญ่พิเศษ"
            >
              ก
            </button>
          </div>

          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className="rounded-xl p-2 border-2 border-[#33272A] bg-white hover:bg-[#FFD3B6]/30 text-[#33272A] dark:border-[#FFD3B6] dark:bg-[#33272A] dark:text-amber-300 transition-colors duration-200"
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* User Section */}
          {userProfile ? (
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-end text-right">
                <span className="text-[10px] sm:text-xs font-black text-[#33272A] dark:text-[#FFF9F5] max-w-[100px] sm:max-w-[180px] truncate">
                  {userProfile.firstName} {userProfile.lastName}
                </span>
                <span className="text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-md bg-[#A0E7E5] font-bold text-[#33272A] border border-[#33272A] dark:border-[#FFD3B6] max-w-[100px] sm:max-w-[180px] truncate mt-0.5">
                  {userProfile.role === 'super_admin' ? 'Super Admin' : `แอดมิน: ${userProfile.schoolName || 'โรงเรียน'}`}
                  {userProfile.status === 'pending' && ' (รออนุมัติ)'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 border-l-2 border-[#33272A] pl-2 dark:border-[#FFD3B6]">
                <button
                  onClick={() => setActiveTab('admin')}
                  className="rounded-full bg-[#A0E7E5] border border-[#33272A] p-1 text-[#33272A] hover:bg-opacity-90 dark:border-[#FFD3B6] sm:hidden"
                  title="แผงควบคุม"
                >
                  <Shield className="h-4 w-4" />
                </button>
                <button
                  onClick={onLogout}
                  className="btn-cute bg-[#FF8BA7] px-2 py-1 sm:px-3 sm:py-1.5 text-[9px] sm:text-[10px] font-black transition-all flex items-center gap-0.5"
                >
                  <LogOut className="h-3 w-3 shrink-0" />
                  <span className="hidden sm:inline">ออกระบบ</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="btn-cute bg-[#FF8BA7] px-4 py-2 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <LogIn className="h-4 w-4" />
              <span>เข้าสู่ระบบ / สมัครสิทธิ์</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Bottom Tab Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#1e1518]/95 backdrop-blur-md border-t-2 border-[#33272A] dark:border-[#FFD3B6] px-2 py-2 flex justify-around items-center shadow-[0_-4px_12px_rgba(51,39,42,0.1)] pb-safe transition-colors duration-300">
        {/* Tab 1: ภาพรวม */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center gap-1.5 flex-1 py-1 transition-all ${
            activeTab === 'dashboard'
              ? 'text-[#FF8BA7] scale-105 font-black'
              : 'text-[#33272A]/60 dark:text-[#FFF9F5]/60 hover:text-[#33272A] dark:hover:text-[#FFF9F5]'
          }`}
        >
          <LayoutDashboard className={`h-5 w-5 ${activeTab === 'dashboard' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
          <span className="text-[10px] font-black">ภาพรวมระบบ</span>
        </button>

        {/* Tab 2: รายชื่อโรงเรียน */}
        <button
          onClick={() => setActiveTab('schools')}
          className={`flex flex-col items-center justify-center gap-1.5 flex-1 py-1 transition-all ${
            activeTab === 'schools'
              ? 'text-[#FF8BA7] scale-105 font-black'
              : 'text-[#33272A]/60 dark:text-[#FFF9F5]/60 hover:text-[#33272A] dark:hover:text-[#FFF9F5]'
          }`}
        >
          <Building2 className={`h-5 w-5 ${activeTab === 'schools' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
          <span className="text-[10px] font-black">รายชื่อโรงเรียน</span>
        </button>

        {/* Tab 3: จัดการ หรือ เข้าสู่ระบบ */}
        {userProfile ? (
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex flex-col items-center justify-center gap-1.5 flex-1 py-1 transition-all relative ${
              activeTab === 'admin'
                ? 'text-[#FF8BA7] scale-105 font-black'
                : 'text-[#33272A]/60 dark:text-[#FFF9F5]/60 hover:text-[#33272A] dark:hover:text-[#FFF9F5]'
            }`}
          >
            <Shield className={`h-5 w-5 ${activeTab === 'admin' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span className="text-[10px] font-black">ระบบจัดการ</span>
            {userProfile.status === 'pending' && (
              <span className="absolute top-1 right-[25%] h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
            )}
          </button>
        ) : (
          <button
            onClick={onLoginClick}
            className="flex flex-col items-center justify-center gap-1.5 flex-1 py-1 text-[#33272A]/60 dark:text-[#FFF9F5]/60 hover:text-[#FF8BA7] transition-all"
          >
            <LogIn className="h-5 w-5 stroke-2" />
            <span className="text-[10px] font-black">เข้าสู่ระบบ</span>
          </button>
        )}
      </div>
    </header>
  );
}
