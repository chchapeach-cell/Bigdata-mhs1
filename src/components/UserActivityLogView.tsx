import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, Search, Filter, RefreshCw, Download, Trash2, User, School as SchoolIcon, 
  Calendar, CheckCircle, AlertCircle, FileText, ShieldAlert, Sparkles, Database, Layers,
  ChevronRight, ArrowUpDown, ChevronDown, ChevronUp, Clock, Zap, Wifi, Droplets,
  GraduationCap, Eye, X, BookOpen, ShieldCheck, FileSpreadsheet, Server
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { UserActivityLog, School, UserProfile } from '../types';
import { dbFetchUserActivityLogs, dbPurgeOldUserActivityLogs } from '../lib/dbAdapter';
import { isSupabaseConfigured } from '../lib/supabase';

interface ActivityLogProps {
  currentUser: UserProfile | null;
  schools: School[];
  isSuperAdmin: boolean;
}

export const UserActivityLogView: React.FC<ActivityLogProps> = ({
  currentUser,
  schools,
  isSuperAdmin
}) => {
  const [logs, setLogs] = useState<UserActivityLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(
    isSuperAdmin ? 'all' : (currentUser?.schoolId || 'all')
  );
  const [selectedActionCategory, setSelectedActionCategory] = useState<'all' | 'students' | 'infrastructure' | 'school_profile' | 'import' | 'users'>('all');
  const [selectedActionType, setSelectedActionType] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [limitCount, setLimitCount] = useState<number>(50);
  const [purging, setPurging] = useState<boolean>(false);
  const [purgeSuccessMessage, setPurgeSuccessMessage] = useState<string | null>(null);
  const [selectedLogForDetail, setSelectedLogForDetail] = useState<UserActivityLog | null>(null);

  // Sorting state for Activity Logs
  const [sortField, setSortField] = useState<'timestamp' | 'userName' | 'schoolName' | 'actionType'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleToggleSort = (field: 'timestamp' | 'userName' | 'schoolName' | 'actionType') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder(field === 'timestamp' ? 'desc' : 'asc');
    }
  };

  // Fetch activity logs from Supabase
  const fetchLogs = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    else setLoading(true);

    try {
      // If not super admin, restrict query strictly to their school
      const schoolFilter = isSuperAdmin 
        ? (selectedSchoolId !== 'all' ? selectedSchoolId : undefined)
        : (currentUser?.schoolId || undefined);

      const data = await dbFetchUserActivityLogs({
        schoolId: schoolFilter,
        actionType: selectedActionType !== 'all' ? selectedActionType : undefined,
        limitCount: limitCount
      });
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to fetch activity logs from Supabase audit logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedSchoolId, selectedActionType, limitCount]);

  // Action type helper with icon, badge, and category mapping
  const getActionBadge = (type: string, title?: string, details?: string) => {
    const isInfra = type === 'update_infrastructure' || 
      (type === 'update_school' && (details?.includes('ไฟฟ้า') || details?.includes('เน็ต') || details?.includes('โครงสร้าง') || details?.includes('บุคลากร') || details?.includes('น้ำ')));
    
    if (isInfra) {
      return {
        category: 'infrastructure',
        label: 'ปรับปรุงโครงสร้างพื้นฐาน',
        badgeColor: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700',
        dot: 'bg-amber-500',
        icon: Zap
      };
    }

    switch (type) {
      case 'update_student':
        return {
          category: 'students',
          label: 'ปรับปรุงสถิตินักเรียน',
          badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700',
          dot: 'bg-emerald-500',
          icon: GraduationCap
        };
      case 'update_student_g':
        return {
          category: 'students',
          label: 'ข้อมูลนักเรียนตัว G',
          badgeColor: 'bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-700',
          dot: 'bg-teal-500',
          icon: BookOpen
        };
      case 'upload_file':
      case 'import_data':
        return {
          category: 'import',
          label: 'นำเข้าข้อมูล BigData/Excel',
          badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-700',
          dot: 'bg-indigo-500',
          icon: FileSpreadsheet
        };
      case 'update_school':
        return {
          category: 'school_profile',
          label: 'แก้ไขข้อมูลโรงเรียน/ผู้บริหาร',
          badgeColor: 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-700',
          dot: 'bg-sky-500',
          icon: SchoolIcon
        };
      case 'delete_data':
        return {
          category: 'other',
          label: 'ลบข้อมูล',
          badgeColor: 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700',
          dot: 'bg-rose-500',
          icon: Trash2
        };
      case 'user_management':
        return {
          category: 'users',
          label: 'จัดการผู้ใช้และสิทธิ์',
          badgeColor: 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-700',
          dot: 'bg-purple-500',
          icon: User
        };
      case 'system_settings':
        return {
          category: 'other',
          label: 'ตั้งค่าระบบ',
          badgeColor: 'bg-violet-50 text-violet-800 border-violet-300 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-700',
          dot: 'bg-violet-500',
          icon: Layers
        };
      case 'academic_assessment':
        return {
          category: 'students',
          label: 'คะแนน NT / RT',
          badgeColor: 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-700',
          dot: 'bg-blue-500',
          icon: BookOpen
        };
      default:
        return {
          category: 'other',
          label: 'กิจกรรมทั่วไป',
          badgeColor: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
          dot: 'bg-slate-500',
          icon: FileText
        };
    }
  };

  // Date formatting helper
  const formatDateTime = (timestamp: any): { relative: string; time: string; fullDate: string; isRecent: boolean } => {
    const fallback = { relative: '-', time: '-', fullDate: '-', isRecent: false };
    if (!timestamp) return fallback;
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (isNaN(date.getTime())) return fallback;

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' น.';

    if (isToday) {
      return { relative: 'วันนี้', time: timeStr, fullDate: date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }), isRecent: true };
    }
    if (isYesterday) {
      return { relative: 'เมื่อวานนี้', time: timeStr, fullDate: date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }), isRecent: true };
    }

    return {
      relative: date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }),
      time: timeStr,
      fullDate: date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }),
      isRecent: false
    };
  };

  // Filtered and sorted logs
  const filteredLogs = useMemo(() => {
    const result = logs.filter(log => {
      // 1. Search term match
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = log.userName?.toLowerCase().includes(term);
        const matchEmail = log.userEmail?.toLowerCase().includes(term);
        const matchSchool = log.schoolName?.toLowerCase().includes(term);
        const matchTarget = log.targetName?.toLowerCase().includes(term);
        const matchTitle = log.actionTitle?.toLowerCase().includes(term);
        const matchDetails = log.details?.toLowerCase().includes(term);

        if (!matchName && !matchEmail && !matchSchool && !matchTarget && !matchTitle && !matchDetails) {
          return false;
        }
      }

      // 2. Category Quick Filter
      if (selectedActionCategory !== 'all') {
        const badge = getActionBadge(log.actionType, log.actionTitle, log.details);
        if (badge.category !== selectedActionCategory) {
          return false;
        }
      }

      // 3. Date filter
      if (dateFilter !== 'all') {
        const logDate = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp);
        const now = new Date();
        if (dateFilter === 'today') {
          if (logDate.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === '7days') {
          const limit = new Date();
          limit.setDate(now.getDate() - 7);
          if (logDate < limit) return false;
        } else if (dateFilter === '30days') {
          const limit = new Date();
          limit.setDate(now.getDate() - 30);
          if (logDate < limit) return false;
        }
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'timestamp') {
        const tA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp || 0).getTime();
        const tB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp || 0).getTime();
        cmp = (isNaN(tA) ? 0 : tA) - (isNaN(tB) ? 0 : tB);
      } else if (sortField === 'userName') {
        cmp = (a.userName || '').localeCompare(b.userName || '', 'th');
      } else if (sortField === 'schoolName') {
        cmp = (a.schoolName || '').localeCompare(b.schoolName || '', 'th');
      } else if (sortField === 'actionType') {
        cmp = (a.actionType || '').localeCompare(b.actionType || '');
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [logs, searchTerm, selectedActionCategory, dateFilter, sortField, sortOrder]);

  // Statistics calculation
  const stats = useMemo(() => {
    const now = new Date();
    const todayLogs = logs.filter(l => {
      const d = l.timestamp instanceof Date ? l.timestamp : new Date(l.timestamp);
      return d.toDateString() === now.toDateString();
    });

    let studentUpdates = 0;
    let infraUpdates = 0;
    let schoolUpdates = 0;

    logs.forEach(l => {
      const badge = getActionBadge(l.actionType, l.actionTitle, l.details);
      if (badge.category === 'students') studentUpdates++;
      else if (badge.category === 'infrastructure') infraUpdates++;
      else if (badge.category === 'school_profile') schoolUpdates++;
    });

    const uniqueUsers = new Set(logs.map(l => l.userEmail).filter(Boolean)).size;
    const uniqueSchools = new Set(logs.map(l => l.schoolId || l.schoolName).filter(Boolean)).size;

    return {
      total: logs.length,
      todayCount: todayLogs.length,
      activeUsers: uniqueUsers,
      activeSchools: uniqueSchools,
      studentUpdates,
      infraUpdates,
      schoolUpdates
    };
  }, [logs]);

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredLogs.length === 0) {
      alert('ไม่มีข้อมูลประวัติกิจกรรมสำหรับส่งออก');
      return;
    }

    const dataToExport = filteredLogs.map((log, index) => {
      const dt = formatDateTime(log.timestamp);
      const badge = getActionBadge(log.actionType, log.actionTitle, log.details);

      return {
        'ลำดับ': index + 1,
        'วัน-เวลา': `${dt.fullDate} ${dt.time}`,
        'ผู้ดำเนินการ': log.userName || '-',
        'อีเมล': log.userEmail || '-',
        'บทบาท': log.userRole === 'super_admin' ? 'Super Admin' : (log.userRole === 'school_admin' ? 'แอดมินสถานศึกษา' : 'ผู้ใช้งาน'),
        'สถานศึกษา/หน่วยงาน': log.schoolName || '-',
        'หมวดหมู่': badge.label,
        'หัวข้อกิจกรรม': log.actionTitle || '-',
        'เป้าหมาย/หัวข้อที่แก้ไข': log.targetName || '-',
        'รายละเอียดการแก้ไข': log.details || '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Supabase_Audit_Logs');

    const colWidths = [
      { wch: 6 },  // ลำดับ
      { wch: 24 }, // วัน-เวลา
      { wch: 22 }, // ผู้ดำเนินการ
      { wch: 26 }, // อีเมล
      { wch: 18 }, // บทบาท
      { wch: 30 }, // สถานศึกษา
      { wch: 24 }, // หมวดหมู่
      { wch: 28 }, // หัวข้อกิจกรรม
      { wch: 26 }, // เป้าหมาย
      { wch: 60 }, // รายละเอียด
    ];
    worksheet['!cols'] = colWidths;

    const fileName = `Supabase_Activity_Audit_Logs_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Purge old logs handler (Super Admin only)
  const handlePurgeOldLogs = async () => {
    if (!isSuperAdmin) return;
    const confirm = window.confirm('คุณต้องการล้างข้อมูลบันทึกกิจกรรมที่เก่ากว่า 90 วัน บน Supabase ใช่หรือไม่?\n(ข้อมูลสถิติโรงเรียนและผู้ใช้จะไม่ถูกลบ ลบเฉพาะ Log กิจกรรมเก่าเพื่อประหยัดพื้นที่)');
    if (!confirm) return;

    setPurging(true);
    setPurgeSuccessMessage(null);
    try {
      const deleted = await dbPurgeOldUserActivityLogs(90);
      setPurgeSuccessMessage(`✅ ทำความสะอาดสำเร็จ! ลบประวัติเก่าไปแล้ว ${deleted} รายการ`);
      await fetchLogs();
      setTimeout(() => setPurgeSuccessMessage(null), 5000);
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการล้างประวัติเก่า');
    } finally {
      setPurging(false);
    }
  };

  const isConnectedToSupabase = isSupabaseConfigured();

  if (!isSuperAdmin) {
    return (
      <div className="card p-8 text-center bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[4px_4px_0px_#33272A]">
        <div className="mx-auto w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-3">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h3 className="text-base font-black text-[#33272A] dark:text-[#FFF9F5]">
          จำกัดสิทธิ์เฉพาะผู้ดูแลระบบระดับสูง (Super Admin)
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-bold">
          เมนูบันทึกประวัติกิจกรรมและการแก้ไขข้อมูล (Audit Logs) สามารถเข้าถึงและตรวจสอบได้เฉพาะ Super Admin เท่านั้น
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" id="user-activity-log-view-container">
      {/* Header & Overview Stats */}
      <div className="card p-5 sm:p-6 bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[6px_6px_0px_#33272A] dark:shadow-[6px_6px_0px_#FFD3B6]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b-2 border-[#33272A]/15 dark:border-[#FFD3B6]/20">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
              <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-700">
                <History className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-[#33272A] dark:text-[#FFF9F5]">
                บันทึกประวัติกิจกรรม &amp; การแก้ไขข้อมูล (Activity Audit Logs)
              </h2>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                <Server className="w-3 h-3 text-emerald-600" />
                <span>Supabase Audit Logs {isConnectedToSupabase ? '• เชื่อมต่อแล้ว' : ''}</span>
              </div>
            </div>
            <p className="text-xs text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-bold">
              แสดงประวัติการแก้ไขข้อมูล {limitCount} รายการล่าสุด โดยผู้ดูแลระบบสถานศึกษา เช่น การปรับปรุงสถิตินักเรียน, การเปลี่ยนแปลงโครงสร้างพื้นฐาน, และข้อมูลทั่วไป
              {isSuperAdmin ? ' (แสดงทุกสถานศึกษา)' : ` (เฉพาะ ${currentUser?.schoolName || 'สถานศึกษาของท่าน'})`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Limit Selector */}
            <div className="flex items-center gap-1 bg-[#FFF9F5] dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border-2 border-[#33272A]/30 dark:border-[#FFD3B6]/30 text-xs font-black">
              <span className="text-[#33272A]/60 dark:text-[#FFF9F5]/60 text-[11px]">ดึงข้อมูล:</span>
              <select
                value={limitCount}
                onChange={(e) => setLimitCount(Number(e.target.value))}
                className="bg-transparent font-black text-[#33272A] dark:text-[#FFF9F5] outline-none cursor-pointer"
              >
                <option value={50}>50 รายการล่าสุด</option>
                <option value={100}>100 รายการ</option>
                <option value={200}>200 รายการ</option>
                <option value={500}>500 รายการ</option>
              </select>
            </div>

            <button
              onClick={() => fetchLogs(true)}
              disabled={refreshing || loading}
              className="btn-cute bg-white hover:bg-slate-100 text-[#33272A] px-3.5 py-2 text-xs font-black border-2 border-[#33272A] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="รีเฟรชประวัติกิจกรรมล่าสุด"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>รีเฟรช</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={filteredLogs.length === 0}
              className="btn-cute bg-emerald-400 hover:bg-emerald-500 text-emerald-950 px-3.5 py-2 text-xs font-black border-2 border-[#33272A] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="ส่งออกรายงานประวัติกิจกรรมเป็น Excel"
            >
              <Download className="w-4 h-4" />
              <span>ส่งออก Excel</span>
            </button>

            {isSuperAdmin && (
              <button
                onClick={handlePurgeOldLogs}
                disabled={purging}
                className="btn-cute bg-rose-100 hover:bg-rose-200 text-rose-900 px-3 py-2 text-xs font-black border-2 border-[#33272A] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="ล้างข้อมูลประวัติที่เก่ากว่า 90 วันเพื่อประหยัดพื้นที่บน Supabase"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{purging ? 'กำลังล้าง...' : 'ล้าง Log >90 วัน'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Purge Notification */}
        {purgeSuccessMessage && (
          <div className="mt-4 p-3 bg-emerald-100 text-emerald-900 border-2 border-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-700" />
            <span>{purgeSuccessMessage}</span>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="p-3.5 rounded-xl bg-[#FFF9F5] dark:bg-slate-800/60 border-2 border-[#33272A]/20 dark:border-[#FFD3B6]/20">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-black mb-1">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>กิจกรรมที่ดึงมา ({limitCount} ล่าสุด)</span>
            </div>
            <div className="text-2xl font-black text-[#33272A] dark:text-[#FFF9F5]">
              {stats.total.toLocaleString()} <span className="text-xs font-normal text-slate-400">รายการ</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-900/40">
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-[11px] font-black mb-1">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
              <span>ปรับปรุงสถิตินักเรียน</span>
            </div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
              {stats.studentUpdates.toLocaleString()} <span className="text-xs font-normal text-slate-400">ครั้ง</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-900/40">
            <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 text-[11px] font-black mb-1">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>โครงสร้างพื้นฐาน</span>
            </div>
            <div className="text-2xl font-black text-amber-800 dark:text-amber-300">
              {stats.infraUpdates.toLocaleString()} <span className="text-xs font-normal text-slate-400">ครั้ง</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border-2 border-sky-200 dark:border-sky-900/40">
            <div className="flex items-center gap-1.5 text-sky-700 dark:text-sky-300 text-[11px] font-black mb-1">
              <User className="w-3.5 h-3.5 text-sky-600" />
              <span>แอดมินที่มีการแก้ไข</span>
            </div>
            <div className="text-2xl font-black text-sky-700 dark:text-sky-300">
              {stats.activeUsers.toLocaleString()} <span className="text-xs font-normal text-slate-400">ท่าน ({stats.activeSchools} ร.ร.)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Quick Category Bar */}
      <div className="card p-4 sm:p-5 bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[4px_4px_0px_#33272A] space-y-3.5">
        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar min-w-0">
          <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 mr-1 shrink-0">หมวดหมู่ด่วน:</span>
          
          <button
            type="button"
            onClick={() => setSelectedActionCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              selectedActionCategory === 'all'
                ? 'bg-[#33272A] text-white border-[#33272A] shadow-xs'
                : 'bg-slate-100 text-[#33272A]/70 hover:bg-slate-200 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
            }`}
          >
            <span>🌟 ทั้งหมด ({logs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedActionCategory(selectedActionCategory === 'students' ? 'all' : 'students')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              selectedActionCategory === 'students'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>สถิตินักเรียน &amp; ตัว G ({stats.studentUpdates})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedActionCategory(selectedActionCategory === 'infrastructure' ? 'all' : 'infrastructure')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              selectedActionCategory === 'infrastructure'
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>โครงสร้างพื้นฐาน ({stats.infraUpdates})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedActionCategory(selectedActionCategory === 'school_profile' ? 'all' : 'school_profile')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              selectedActionCategory === 'school_profile'
                ? 'bg-sky-600 text-white border-sky-700 shadow-xs'
                : 'bg-sky-50 text-sky-800 hover:bg-sky-100 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800'
            }`}
          >
            <SchoolIcon className="w-3.5 h-3.5" />
            <span>ข้อมูลโรงเรียน &amp; ผู้บริหาร ({stats.schoolUpdates})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedActionCategory(selectedActionCategory === 'import' ? 'all' : 'import')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              selectedActionCategory === 'import'
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>นำเข้าไฟล์ BigData</span>
          </button>
        </div>

        {/* Search and Secondary Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-1 border-t border-slate-200 dark:border-slate-800">
          {/* Search box */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อผู้ดำเนินการ, โรงเรียน, หรือรายละเอียด..."
              className="w-full pl-9 pr-7 py-2 text-xs font-bold rounded-xl border-2 border-[#33272A]/30 bg-slate-50 dark:bg-slate-800 text-[#33272A] dark:text-[#FFF9F5] focus:outline-none focus:border-[#33272A] dark:focus:border-[#FFD3B6]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* School filter (Super Admin only) */}
          {isSuperAdmin && (
            <div className="md:col-span-3">
              <select
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
                className="w-full px-2.5 py-2 text-xs font-bold rounded-xl border-2 border-[#33272A]/30 bg-slate-50 dark:bg-slate-800 text-[#33272A] dark:text-[#FFF9F5] focus:outline-none focus:border-[#33272A]"
              >
                <option value="all">🏢 ทุกสถานศึกษา ({schools.length})</option>
                {schools.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action type specific filter */}
          <div className={isSuperAdmin ? "md:col-span-3" : "md:col-span-5"}>
            <select
              value={selectedActionType}
              onChange={(e) => setSelectedActionType(e.target.value)}
              className="w-full px-2.5 py-2 text-xs font-bold rounded-xl border-2 border-[#33272A]/30 bg-slate-50 dark:bg-slate-800 text-[#33272A] dark:text-[#FFF9F5] focus:outline-none focus:border-[#33272A]"
            >
              <option value="all">🏷️ ทุกประเภทกิจกรรมย่อย</option>
              <option value="update_school">🏫 แก้ไขข้อมูลโรงเรียน/โครงสร้าง</option>
              <option value="update_student">📊 ปรับปรุงสถิตินักเรียน</option>
              <option value="update_student_g">🪪 ข้อมูลนักเรียนตัว G</option>
              <option value="upload_file">📁 นำเข้าไฟล์ Excel / BigData</option>
              <option value="delete_data">🗑️ ลบข้อมูล</option>
              <option value="user_management">👤 จัดการผู้ใช้และสิทธิ์</option>
              <option value="academic_assessment">📈 คะแนน NT / RT</option>
            </select>
          </div>

          {/* Date range filter */}
          <div className={isSuperAdmin ? "md:col-span-2" : "md:col-span-3"}>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full px-2.5 py-2 text-xs font-bold rounded-xl border-2 border-[#33272A]/30 bg-slate-50 dark:bg-slate-800 text-[#33272A] dark:text-[#FFF9F5] focus:outline-none focus:border-[#33272A]"
            >
              <option value="all">📅 ทุกช่วงเวลา</option>
              <option value="today">⚡ วันนี้</option>
              <option value="7days">🗓️ 7 วันล่าสุด</option>
              <option value="30days">📆 30 วันล่าสุด</option>
            </select>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-0.5">
          <div className="font-bold">
            แสดงผล <span className="text-[#33272A] dark:text-[#FFF9F5] font-black">{filteredLogs.length}</span> จาก {logs.length} รายการ
            {selectedActionCategory !== 'all' && ` (หมวดหมู่: ${selectedActionCategory})`}
          </div>
          {(searchTerm || selectedSchoolId !== 'all' || selectedActionCategory !== 'all' || selectedActionType !== 'all' || dateFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedSchoolId(isSuperAdmin ? 'all' : (currentUser?.schoolId || 'all'));
                setSelectedActionCategory('all');
                setSelectedActionType('all');
                setDateFilter('all');
              }}
              className="text-rose-600 hover:text-rose-700 font-black cursor-pointer hover:underline"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>
      </div>

      {/* Log List / Table */}
      <div className="card bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[6px_6px_0px_#33272A] dark:shadow-[6px_6px_0px_#FFD3B6] overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 dark:text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" />
            <p className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5]">กำลังดึงข้อมูล Audit Logs จาก Supabase...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 dark:text-slate-500">
            <History className="w-12 h-12 mx-auto mb-3 stroke-1 text-slate-300 dark:text-slate-600" />
            <p className="text-base font-black text-[#33272A] dark:text-[#FFF9F5]">ไม่พบประวัติกิจกรรมตามเงื่อนไขที่เลือก</p>
            <p className="text-xs font-bold mt-1">สามารถเลือกหมวดหมู่อื่น หรือกดปุ่ม "รีเฟรช" เพื่อตรวจสอบข้อมูลล่าสุด</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FFF9F5] dark:bg-slate-800/80 border-b-2 border-[#33272A] dark:border-[#FFD3B6] text-[#33272A] dark:text-[#FFF9F5] font-black">
                  <th className="py-3 px-3 sm:px-4 w-32 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleToggleSort('timestamp')}
                      className="flex items-center gap-1 hover:text-[#FF8BA7] transition-colors cursor-pointer font-black"
                      title="คลิกเพื่อเรียงลำดับตามวัน-เวลา"
                    >
                      <span>วัน-เวลา</span>
                      {sortField === 'timestamp' ? (
                        sortOrder === 'desc' ? <ChevronDown className="w-3.5 h-3.5 text-rose-500" /> : <ChevronUp className="w-3.5 h-3.5 text-rose-500" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3 sm:px-4 w-44">
                    <button
                      type="button"
                      onClick={() => handleToggleSort('userName')}
                      className="flex items-center gap-1 hover:text-[#FF8BA7] transition-colors cursor-pointer font-black"
                      title="คลิกเพื่อเรียงลำดับตามผู้ดำเนินการ"
                    >
                      <span>ผู้ดำเนินการ / แอดมิน</span>
                      {sortField === 'userName' ? (
                        sortOrder === 'desc' ? <ChevronDown className="w-3.5 h-3.5 text-rose-500" /> : <ChevronUp className="w-3.5 h-3.5 text-rose-500" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3 sm:px-4 w-48">
                    <button
                      type="button"
                      onClick={() => handleToggleSort('schoolName')}
                      className="flex items-center gap-1 hover:text-[#FF8BA7] transition-colors cursor-pointer font-black"
                      title="คลิกเพื่อเรียงลำดับตามสถานศึกษา"
                    >
                      <span>สถานศึกษา</span>
                      {sortField === 'schoolName' ? (
                        sortOrder === 'desc' ? <ChevronDown className="w-3.5 h-3.5 text-rose-500" /> : <ChevronUp className="w-3.5 h-3.5 text-rose-500" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3 sm:px-4 w-44">
                    <button
                      type="button"
                      onClick={() => handleToggleSort('actionType')}
                      className="flex items-center gap-1 hover:text-[#FF8BA7] transition-colors cursor-pointer font-black"
                      title="คลิกเพื่อเรียงลำดับตามประเภทกิจกรรม"
                    >
                      <span>ประเภทกิจกรรม</span>
                      {sortField === 'actionType' ? (
                        sortOrder === 'desc' ? <ChevronDown className="w-3.5 h-3.5 text-rose-500" /> : <ChevronUp className="w-3.5 h-3.5 text-rose-500" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3 sm:px-4">รายละเอียดการแก้ไข</th>
                  <th className="py-3 px-2 text-center w-16">ดู</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#33272A]/10 dark:divide-[#FFD3B6]/10 font-bold">
                {filteredLogs.map((log) => {
                  const dt = formatDateTime(log.timestamp);
                  const badge = getActionBadge(log.actionType, log.actionTitle, log.details);
                  const IconComp = badge.icon;

                  return (
                    <tr
                      key={log.id || `${log.timestamp}_${log.userEmail}`}
                      className="hover:bg-[#FFF9F5] dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Date & Time */}
                      <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-2 h-2 rounded-full ${dt.isRecent ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                          <div>
                            <div className="font-black text-[#33272A] dark:text-[#FFF9F5]">
                              {dt.relative}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                              {dt.time}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* User Info */}
                      <td className="py-3 px-3 sm:px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 flex-shrink-0 text-xs font-black border border-slate-300">
                            {log.userName ? log.userName.charAt(0) : 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-black text-[#33272A] dark:text-[#FFF9F5] truncate max-w-[140px]">
                              {log.userName || 'ผู้ดูแลระบบ'}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[140px]">
                              {log.userEmail}
                            </div>
                            <div className="text-[9px]">
                              {log.userRole === 'super_admin' ? (
                                <span className="text-purple-600 font-black">Super Admin</span>
                              ) : (
                                <span className="text-teal-600 font-black">แอดมินสถานศึกษา</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* School Name */}
                      <td className="py-3 px-3 sm:px-4">
                        <div className="flex items-center gap-1.5 text-[#33272A] dark:text-[#FFF9F5]">
                          <SchoolIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-[160px] font-bold">
                            {log.schoolName || '-'}
                          </span>
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-black border ${badge.badgeColor}`}>
                          <IconComp className="w-3.5 h-3.5" />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Details & Target */}
                      <td className="py-3 px-3 sm:px-4">
                        <div className="space-y-0.5">
                          <div className="font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5 flex-wrap">
                            <span>{log.actionTitle}</span>
                            {log.targetName && (
                              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.2 rounded border border-indigo-200 dark:border-indigo-800">
                                {log.targetName}
                              </span>
                            )}
                          </div>
                          {log.details && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed break-words line-clamp-2 max-w-lg font-medium">
                              {log.details}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Action View Detail */}
                      <td className="py-3 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedLogForDetail(log)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 hover:text-[#FF8BA7] transition-colors cursor-pointer"
                          title="ดูรายละเอียดการแก้ไขทั้งหมด"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLogForDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1e1518] rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[8px_8px_0px_#33272A] max-w-xl w-full p-5 sm:p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#33272A]/20 dark:border-[#FFD3B6]/20">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-black text-[#33272A] dark:text-[#FFF9F5]">
                  รายละเอียดบันทึกกิจกรรม (Audit Log Detail)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogForDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5]">
              <div className="grid grid-cols-2 gap-2 bg-[#FFF9F5] dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">วัน-เวลาที่ดำเนินการ:</span>
                  <span>{formatDateTime(selectedLogForDetail.timestamp).fullDate} {formatDateTime(selectedLogForDetail.timestamp).time}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">ผู้ดำเนินการ:</span>
                  <span>{selectedLogForDetail.userName || '-'} ({selectedLogForDetail.userRole === 'super_admin' ? 'Super Admin' : 'แอดมินสถานศึกษา'})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">อีเมล:</span>
                  <span className="font-mono text-[11px]">{selectedLogForDetail.userEmail || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">สถานศึกษา:</span>
                  <span>{selectedLogForDetail.schoolName || '-'} ({selectedLogForDetail.schoolId || '-'})</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block font-semibold mb-1">หัวข้อกิจกรรม / การดำเนินการ:</span>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="font-black text-sm text-[#33272A] dark:text-[#FFF9F5]">{selectedLogForDetail.actionTitle}</span>
                  {selectedLogForDetail.targetName && (
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 text-xs font-black border border-indigo-300">
                      {selectedLogForDetail.targetName}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block font-semibold mb-1">รายละเอียดการบันทึก / ข้อมูลที่เปลี่ยนแปลง:</span>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
                  {selectedLogForDetail.details || 'ไม่มีรายละเอียดเพิ่มเติม'}
                </div>
              </div>

              <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                <span>Log ID: <span className="font-mono">{selectedLogForDetail.id}</span></span>
                <span>ฐานข้อมูล: Supabase audit logs</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLogForDetail(null)}
                className="btn-cute bg-[#33272A] text-white px-4 py-2 text-xs font-black cursor-pointer hover:bg-slate-800"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Aliases for compatibility
export const ActivityLog = UserActivityLogView;
export default UserActivityLogView;
