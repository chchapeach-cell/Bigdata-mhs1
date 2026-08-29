import React from 'react';
import { Building2, Users, GraduationCap, Award, Sparkles, Zap, Wifi, Droplets, Lightbulb } from 'lucide-react';
import { getDefaultAvailableYears } from '../utils/initialData';

interface DashboardSkeletonProps {
  isDarkMode?: boolean;
}

export default function DashboardSkeleton({ isDarkMode = false }: DashboardSkeletonProps) {
  return (
    <div className="space-y-6 animate-fade-in select-none" id="dashboard-skeleton-view">
      {/* 1. HEADER SKELETON */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-64 sm:w-80 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse skeleton-shimmer" />
            <Sparkles className="h-5 w-5 text-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div className="h-4 w-48 sm:w-96 rounded-xl bg-slate-200/70 dark:bg-slate-800/70 animate-pulse skeleton-shimmer" />
        </div>

        {/* Academic Year Selector Pill Placeholder */}
        <div className="flex items-center gap-2 bg-[#FFD3B6]/60 dark:bg-[#33272A] p-2 rounded-2xl border-2 border-[#33272A]/30 dark:border-[#FFD3B6]/30 w-fit">
          <div className="h-4 w-16 rounded-md bg-slate-300 dark:bg-slate-700 animate-pulse" />
          <div className="h-8 w-24 rounded-xl bg-white dark:bg-[#1e1518] border-2 border-[#33272A]/20 dark:border-[#FFD3B6]/30 animate-pulse skeleton-shimmer" />
        </div>
      </div>

      {/* 2. LOADING STATE STATUS BANNER (Smooth Perceived Performance) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-50 via-[#FFF9F5] to-amber-50 dark:from-slate-900 dark:via-[#1e1518] dark:to-rose-950/30 p-3.5 sm:p-4 border-2 border-[#33272A] dark:border-[#FFD3B6]/40 shadow-[3px_3px_0px_#33272A] dark:shadow-[3px_3px_0px_rgba(255,211,182,0.2)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-extrabold text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                กำลังเชื่อมต่อและจัดโครงสร้างสถิติสารสนเทศนักเรียนรายบุคคล...
              </p>
              <p className="text-[11px] font-bold text-[#33272A]/60 dark:text-[#FFF9F5]/60 hidden sm:block">
                ระบบกำลังดึงข้อมูลเรียลไทม์จากฐานข้อมูล สพป.แม่ฮ่องสอน เขต 1 พร้อมคำนวณสถิติอัตโนมัติ
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-1.5">
            <div className="h-2 w-16 sm:w-28 bg-rose-200 dark:bg-rose-950 rounded-full overflow-hidden">
              <div className="h-full bg-rose-500 rounded-full animate-pulse" style={{ width: '70%' }}></div>
            </div>
            <span className="text-[10px] font-black text-rose-500 font-mono">LOADING</span>
          </div>
        </div>
      </div>

      {/* 3. 4 KPI METRIC CARDS SKELETON */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: สถานศึกษาทั้งหมด */}
        <div className="relative overflow-hidden card p-6 bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6]/50 shadow-[4px_4px_0px_#33272A] dark:shadow-[4px_4px_0px_#FFD3B6]/40 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="h-3.5 w-24 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse skeleton-shimmer" />
            <div className="rounded-2xl bg-[#FF8BA7]/30 border-2 border-[#33272A] dark:border-[#FFD3B6] p-3 text-[#33272A] dark:text-[#FF8BA7]">
              <Building2 className="h-6 w-6 opacity-60" />
            </div>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div className="space-y-1.5">
              <div className="h-8 w-20 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse skeleton-shimmer" />
              <div className="h-3 w-14 rounded-md bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
            </div>
            <div className="h-4 w-16 rounded-md bg-rose-100 dark:bg-rose-950/50 animate-pulse" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#FF8BA7]"></div>
        </div>

        {/* Metric 2: นักเรียนทั้งหมด */}
        <div className="relative overflow-hidden card p-6 bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6]/50 shadow-[4px_4px_0px_#33272A] dark:shadow-[4px_4px_0px_#FFD3B6]/40 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="h-3.5 w-24 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse skeleton-shimmer" />
            <div className="rounded-2xl bg-[#FFD3B6]/40 border-2 border-[#33272A] dark:border-[#FFD3B6] p-3 text-[#33272A] dark:text-[#FFD3B6]">
              <Users className="h-6 w-6 opacity-60" />
            </div>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div className="space-y-1.5">
              <div className="h-8 w-28 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse skeleton-shimmer" />
              <div className="h-3 w-36 rounded-md bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
            </div>
            <div className="h-4 w-16 rounded-md bg-amber-100 dark:bg-amber-950/50 animate-pulse" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#FFD3B6]"></div>
        </div>

        {/* Metric 3: ครูและบุคลากร */}
        <div className="relative overflow-hidden card p-6 bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6]/50 shadow-[4px_4px_0px_#33272A] dark:shadow-[4px_4px_0px_#FFD3B6]/40 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="h-3.5 w-24 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse skeleton-shimmer" />
            <div className="rounded-2xl bg-[#A0E7E5]/30 border-2 border-[#33272A] dark:border-[#FFD3B6] p-3 text-[#33272A] dark:text-[#A0E7E5]">
              <GraduationCap className="h-6 w-6 opacity-60" />
            </div>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div className="space-y-1.5">
              <div className="h-8 w-20 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse skeleton-shimmer" />
              <div className="h-3 w-12 rounded-md bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
            </div>
            <div className="h-4 w-16 rounded-md bg-teal-100 dark:bg-teal-950/50 animate-pulse" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#A0E7E5]"></div>
        </div>

        {/* Metric 4: ขยายโอกาสทางการศึกษา */}
        <div className="relative overflow-hidden card p-6 bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6]/50 shadow-[4px_4px_0px_#33272A] dark:shadow-[4px_4px_0px_#FFD3B6]/40 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="h-3.5 w-28 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse skeleton-shimmer" />
            <div className="rounded-2xl bg-[#FFD3B6]/30 border-2 border-[#33272A] dark:border-[#FFD3B6] p-3 text-[#33272A] dark:text-[#FFD3B6]">
              <Award className="h-6 w-6 opacity-60" />
            </div>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div className="space-y-1.5">
              <div className="h-8 w-16 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse skeleton-shimmer" />
              <div className="h-3 w-12 rounded-md bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
            </div>
            <div className="h-4 w-16 rounded-md bg-rose-100 dark:bg-rose-950/50 animate-pulse" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#FFD3B6]"></div>
        </div>
      </div>

      {/* 4. PRIMARY CHARTS SKELETON (Grade Bar Chart & School Sizes Pie Chart) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Grade Level Bar Chart Skeleton (2 cols) */}
        <div className="lg:col-span-2 card p-4 md:p-6 min-w-0 bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6]/50 shadow-[4px_4px_0px_#33272A] rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-1.5">
              <div className="h-5 w-60 sm:w-80 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse skeleton-shimmer" />
              <div className="h-3.5 w-40 rounded-md bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
            </div>
            <div className="h-7 w-20 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 animate-pulse" />
          </div>

          {/* Simulated Bar Chart Grid & Bars */}
          <div className="h-80 w-full flex flex-col justify-end pt-6 pb-2 px-2 border-b-2 border-l-2 border-[#33272A]/20 dark:border-[#FFD3B6]/20 relative">
            {/* Background Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none py-2 px-1 opacity-40">
              <div className="border-b border-dashed border-slate-300 dark:border-slate-700 w-full" />
              <div className="border-b border-dashed border-slate-300 dark:border-slate-700 w-full" />
              <div className="border-b border-dashed border-slate-300 dark:border-slate-700 w-full" />
              <div className="border-b border-dashed border-slate-300 dark:border-slate-700 w-full" />
            </div>

            {/* 12 Bar Pairs (อ.1 - ม.3) */}
            <div className="flex items-end justify-between gap-1 sm:gap-2 h-full z-10">
              {[
                { male: '45%', female: '40%', label: 'อ.1' },
                { male: '50%', female: '48%', label: 'อ.2' },
                { male: '55%', female: '52%', label: 'อ.3' },
                { male: '70%', female: '65%', label: 'ป.1' },
                { male: '75%', female: '72%', label: 'ป.2' },
                { male: '80%', female: '78%', label: 'ป.3' },
                { male: '85%', female: '82%', label: 'ป.4' },
                { male: '82%', female: '80%', label: 'ป.5' },
                { male: '78%', female: '75%', label: 'ป.6' },
                { male: '60%', female: '58%', label: 'ม.1' },
                { male: '55%', female: '52%', label: 'ม.2' },
                { male: '50%', female: '48%', label: 'ม.3' },
              ].map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div className="flex items-end gap-0.5 sm:gap-1 w-full justify-center h-full">
                    {/* Male Bar (Mint) */}
                    <div 
                      className="w-2 sm:w-3.5 rounded-t-md bg-[#A0E7E5]/50 dark:bg-[#A0E7E5]/30 border border-[#33272A]/30 animate-pulse skeleton-shimmer"
                      style={{ height: item.male }}
                    />
                    {/* Female Bar (Pink) */}
                    <div 
                      className="w-2 sm:w-3.5 rounded-t-md bg-[#FF8BA7]/50 dark:bg-[#FF8BA7]/30 border border-[#33272A]/30 animate-pulse skeleton-shimmer"
                      style={{ height: item.female }}
                    />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart Legend Skeleton */}
          <div className="flex items-center justify-center gap-6 mt-4 pt-2">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#A0E7E5] border border-[#33272A]" />
              <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#FF8BA7] border border-[#33272A]" />
              <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Right: School Size Proportion Donut Chart Skeleton (1 col) */}
        <div className="card p-6 flex flex-col justify-between bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6]/50 shadow-[4px_4px_0px_#33272A] rounded-2xl">
          <div>
            <div className="h-5 w-44 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse skeleton-shimmer mb-2" />
            <div className="h-3.5 w-56 rounded-md bg-slate-200/60 dark:bg-slate-800/60 animate-pulse mb-4" />
          </div>

          {/* Simulated Donut Ring */}
          <div className="h-52 w-full relative flex items-center justify-center my-2">
            <div className="h-44 w-44 rounded-full border-[18px] border-slate-200 dark:border-slate-800 relative flex items-center justify-center animate-pulse">
              <div className="absolute top-0 right-0 h-44 w-44 rounded-full border-[18px] border-transparent border-t-[#FF8BA7]/60 border-r-[#FFD3B6]/60 pointer-events-none" />
              <div className="flex flex-col items-center justify-center text-center space-y-1">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">รวมทั้งหมด</span>
                <div className="h-6 w-12 rounded bg-slate-300 dark:bg-slate-700 animate-pulse" />
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500">แห่ง</span>
              </div>
            </div>
          </div>

          {/* Donut Legend Items */}
          <div className="mt-4 space-y-2">
            {[
              { color: '#FF8BA7', width: '65%' },
              { color: '#FFD3B6', width: '45%' },
              { color: '#A0E7E5', width: '30%' },
              { color: '#FFAAA5', width: '15%' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-1.5 rounded-xl border border-transparent">
                <div className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full border border-[#33272A]" style={{ backgroundColor: item.color }} />
                  <div className="h-3.5 rounded bg-slate-200 dark:bg-slate-800 animate-pulse skeleton-shimmer" style={{ width: item.width }} />
                </div>
                <div className="h-3.5 w-12 rounded bg-slate-200/80 dark:bg-slate-800/80 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. SECONDARY CHARTS SKELETON (Amphoe Breakdown & Yearly Trend) */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Card 1: School Distribution by District (Amphoe) */}
        <div className="card p-6 flex flex-col justify-between bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6]/50 shadow-[4px_4px_0px_#33272A] rounded-2xl">
          <div>
            <div className="h-5 w-52 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse skeleton-shimmer mb-2" />
            <div className="h-3.5 w-64 rounded-md bg-slate-200/60 dark:bg-slate-800/60 animate-pulse mb-4" />
          </div>

          <div className="grid grid-cols-2 gap-4 items-center py-2">
            <div className="h-36 w-full flex items-center justify-center">
              <div className="h-32 w-32 rounded-full border-[14px] border-slate-200 dark:border-slate-800 flex items-center justify-center animate-pulse">
                <div className="h-4 w-10 bg-slate-300 dark:bg-slate-700 rounded" />
              </div>
            </div>
            <div className="space-y-2.5">
              {['อ.เมืองแม่ฮ่องสอน', 'อ.ขุนยวม', 'อ.ปาย', 'อ.ปางมะผ้า'].map((name, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[11px] font-bold text-slate-400">{name}</span>
                    <div className="h-3 w-8 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-300 dark:bg-rose-700 rounded-full animate-pulse"
                      style={{ width: `${60 - i * 12}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Student Enrollment Trend Across Years */}
        <div className="card p-6 flex flex-col justify-between bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6]/50 shadow-[4px_4px_0px_#33272A] rounded-2xl">
          <div>
            <div className="h-5 w-52 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse skeleton-shimmer mb-2" />
            <div className="h-3.5 w-60 rounded-md bg-slate-200/60 dark:bg-slate-800/60 animate-pulse mb-4" />
          </div>

          {/* Area spline simulation */}
          <div className="h-44 w-full flex flex-col justify-end pt-4 pb-2 border-b-2 border-l-2 border-[#33272A]/20 dark:border-[#FFD3B6]/20 relative">
            <svg className="w-full h-28 overflow-visible opacity-50" preserveAspectRatio="none" viewBox="0 0 100 50">
              <path
                d="M0,40 Q25,25 50,30 T100,15 L100,50 L0,50 Z"
                fill="currentColor"
                className="text-rose-200/60 dark:text-rose-950/60 animate-pulse"
              />
              <path
                d="M0,40 Q25,25 50,30 T100,15"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-rose-400 dark:text-rose-500 animate-pulse"
              />
            </svg>
            <div className="flex justify-between pt-2 px-1">
              {getDefaultAvailableYears().slice(0, 4).reverse().map(yr => (
                <span key={yr} className="text-[10px] font-bold text-slate-400">ปี {yr}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 6. INFRASTRUCTURE SUMMARY SKELETON */}
      <div className="card p-4 sm:p-6 bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6]/50 shadow-[4px_4px_0px_#33272A] rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b-2 border-[#33272A]/10 dark:border-[#FFD3B6]/20 pb-3">
          <div className="space-y-1">
            <div className="h-5 w-60 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse skeleton-shimmer" />
            <div className="h-3.5 w-72 rounded-md bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
          </div>
          <div className="h-7 w-28 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 animate-pulse" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Electricity Box */}
          <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-800/50 space-y-2.5">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              <div className="h-4 w-28 bg-amber-200 dark:bg-amber-900/60 rounded animate-pulse skeleton-shimmer" />
            </div>
            <div className="space-y-1.5">
              <div className="h-2 w-full bg-amber-100 dark:bg-amber-950 rounded-full" />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>ระบบสายส่งหลัก</span>
                <div className="h-3 w-10 bg-amber-200/70 dark:bg-amber-900/60 rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Internet Box */}
          <div className="p-3.5 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border-2 border-sky-200 dark:border-sky-800/50 space-y-2.5">
            <div className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-sky-500" />
              <div className="h-4 w-28 bg-sky-200 dark:bg-sky-900/60 rounded animate-pulse skeleton-shimmer" />
            </div>
            <div className="space-y-1.5">
              <div className="h-2 w-full bg-sky-100 dark:bg-sky-950 rounded-full" />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Fiber Optic</span>
                <div className="h-3 w-10 bg-sky-200/70 dark:bg-sky-900/60 rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Water Box */}
          <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800/50 space-y-2.5 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-blue-500" />
              <div className="h-4 w-28 bg-blue-200 dark:bg-blue-900/60 rounded animate-pulse skeleton-shimmer" />
            </div>
            <div className="space-y-1.5">
              <div className="h-2 w-full bg-blue-100 dark:bg-blue-950 rounded-full" />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>ประปาภูเขา / ประปารัฐ</span>
                <div className="h-3 w-10 bg-blue-200/70 dark:bg-blue-900/60 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 7. INSIGHTS & SUMMARY SKELETON */}
      <div className="card p-5 sm:p-6 bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6]/50 shadow-[4px_4px_0px_#33272A] rounded-2xl space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          <div className="h-5 w-56 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse skeleton-shimmer" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800 animate-pulse skeleton-shimmer" />
              <div className="space-y-1">
                <div className="h-3 w-full rounded bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
                <div className="h-3 w-4/5 rounded bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
