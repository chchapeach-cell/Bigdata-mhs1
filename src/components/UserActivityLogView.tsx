import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, Search, Filter, RefreshCw, Download, Trash2, User, School as SchoolIcon, 
  Calendar, CheckCircle, AlertCircle, FileText, ShieldAlert, Sparkles, Database, Layers,
  ChevronRight, ArrowUpDown, ChevronDown, ChevronUp, Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { UserActivityLog, School, UserProfile } from '../types';
import { dbFetchUserActivityLogs, dbPurgeOldUserActivityLogs } from '../lib/dbAdapter';

interface UserActivityLogViewProps {
  currentUser: UserProfile | null;
  schools: School[];
  isSuperAdmin: boolean;
}

export const UserActivityLogView: React.FC<UserActivityLogViewProps> = ({
  currentUser,
  schools,
  isSuperAdmin
}) => {
  if (!isSuperAdmin) {
    return (
      <div className="card p-8 text-center space-y-3 border-2 border-rose-400 bg-rose-50/50 dark:bg-rose-950/20">
        <ShieldAlert className="h-10 w-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-black text-[#33272A] dark:text-[#FFF9F5]">เฉพาะผู้ดูแลระบบระดับสูง (Super Admin) เท่านั้น</h3>
        <p className="text-xs text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-semibold">เมนูประวัติกิจกรรมและ LOG การแก้ไขข้อมูลสงวนสิทธิ์สำหรับ Super Admin ในการตรวจสอบและกำกับดูแลเท่านั้น</p>
      </div>
    );
  }

  const [logs, setLogs] = useState<UserActivityLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('all');
  const [selectedActionType, setSelectedActionType] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [purging, setPurging] = useState<boolean>(false);
  const [purgeSuccessMessage, setPurgeSuccessMessage] = useState<string | null>(null);
  const [selectedLogForDetail, setSelectedLogForDetail] = useState<UserActivityLog | null>(null);

  // Initial fetch
  const fetchLogs = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    else setLoading(true);

    try {
      // If not super admin, restrict to their school only
      const schoolFilter = isSuperAdmin 
        ? (selectedSchoolId !== 'all' ? selectedSchoolId : undefined)
        : (currentUser?.schoolId || undefined);

      const data = await dbFetchUserActivityLogs({
        schoolId: schoolFilter,
        actionType: selectedActionType !== 'all' ? selectedActionType : undefined,
        limitCount: 500
      });
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedSchoolId, selectedActionType]);

  // Action type formatting helper
  const getActionBadge = (type: string) => {
    switch (type) {
      case 'update_school':
        return {
          label: 'แก้ไขข้อมูลโรงเรียน',
          bg: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
          dot: 'bg-sky-500'
        };
      case 'update_student':
        return {
          label: 'ปรับปรุงสถิตินักเรียน',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
          dot: 'bg-emerald-500'
        };
      case 'update_student_g':
        return {
          label: 'ข้อมูลนักเรียนตัว G',
          bg: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
          dot: 'bg-teal-500'
        };
      case 'upload_file':
        return {
          label: 'นำเข้าไฟล์ข้อมูล / BigData',
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
          dot: 'bg-indigo-500'
        };
      case 'delete_data':
        return {
          label: 'ลบข้อมูล',
          bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
          dot: 'bg-rose-500'
        };
      case 'user_management':
        return {
          label: 'จัดการผู้ใช้และสิทธิ์',
          bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
          dot: 'bg-amber-500'
        };
      case 'system_settings':
        return {
          label: 'ตั้งค่าระบบ',
          bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
          dot: 'bg-purple-500'
        };
      case 'academic_assessment':
        return {
          label: 'คะแนน NT / RT',
          bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
          dot: 'bg-blue-500'
        };
      default:
        return {
          label: 'กิจกรรมทั่วไป',
          bg: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800',
          dot: 'bg-slate-500'
        };
    }
  };

  // Date formatted helper
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

    const timeStr = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';

    if (isToday) {
      return { relative: 'วันนี้', time: timeStr, fullDate: date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }), isRecent: true };
    }
    if (isYesterday) {
      return { relative: 'เมื่อวาน', time: timeStr, fullDate: date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }), isRecent: true };
    }

    return {
      relative: date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }),
      time: timeStr,
      fullDate: date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }),
      isRecent: false
    };
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
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

      // 2. Date filter
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
  }, [logs, searchTerm, dateFilter]);

  // Statistics calculation
  const stats = useMemo(() => {
    const now = new Date();
    const todayLogs = logs.filter(l => {
      const d = l.timestamp instanceof Date ? l.timestamp : new Date(l.timestamp);
      return d.toDateString() === now.toDateString();
    });

    const uniqueUsers = new Set(logs.map(l => l.userEmail).filter(Boolean)).size;
    const uniqueSchools = new Set(logs.map(l => l.schoolId || l.schoolName).filter(Boolean)).size;

    return {
      total: logs.length,
      todayCount: todayLogs.length,
      activeUsers: uniqueUsers,
      activeSchools: uniqueSchools
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
      const badge = getActionBadge(log.actionType);

      return {
        'ลำดับ': index + 1,
        'วัน-เวลา': `${dt.fullDate} ${dt.time}`,
        'ผู้ดำเนินการ': log.userName || '-',
        'อีเมล': log.userEmail || '-',
        'บทบาท': log.userRole === 'super_admin' ? 'Super Admin' : (log.userRole === 'school_admin' ? 'แอดมินโรงเรียน' : 'ผู้ใช้งาน'),
        'สถานศึกษา/หน่วยงาน': log.schoolName || '-',
        'ประเภทกิจกรรม': badge.label,
        'หัวข้อกิจกรรม': log.actionTitle || '-',
        'เป้าหมาย/หัวข้อที่แก้ไข': log.targetName || '-',
        'รายละเอียดการแก้ไข': log.details || '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'User_Activity_Logs');

    // Auto column width
    const colWidths = [
      { wch: 6 },  // ลำดับ
      { wch: 22 }, // วัน-เวลา
      { wch: 22 }, // ผู้ดำเนินการ
      { wch: 26 }, // อีเมล
      { wch: 16 }, // บทบาท
      { wch: 28 }, // สถานศึกษา
      { wch: 24 }, // ประเภทกิจกรรม
      { wch: 26 }, // หัวข้อกิจกรรม
      { wch: 26 }, // เป้าหมาย
      { wch: 50 }, // รายละเอียด
    ];
    worksheet['!cols'] = colWidths;

    const fileName = `User_Audit_Logs_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Purge old logs handler (Super Admin only)
  const handlePurgeOldLogs = async () => {
    if (!isSuperAdmin) return;
    const confirm = window.confirm('คุณต้องการล้างข้อมูลประวัติกิจกรรมที่เก่ากว่า 90 วัน ใช่หรือไม่?\n(ข้อมูลสถิติโรงเรียนและผู้ใช้จะไม่ถูกลบ ลบเฉพาะ Log กิจกรรมเก่าเพื่อประหยัดพื้นที่)');
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

  return (
    <div className="space-y-6" id="user-activity-log-view-container">
      {/* Header & Overview Stats */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <History className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                บันทึกประวัติการแก้ไขข้อมูล (User Audit Logs)
              </h2>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              ติดตามและตรวจสอบกิจกรรมของแอดมินและผู้ใช้งานแต่ละท่านแบบเรียลไทม์ {isSuperAdmin ? '(แสดงทุกสถานศึกษา)' : `(เฉพาะ ${currentUser?.schoolName || 'สถานศึกษาของท่าน'})`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => fetchLogs(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50 shadow-sm"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>รีเฟรช</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={filteredLogs.length === 0}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>ส่งออก Excel</span>
            </button>

            {isSuperAdmin && (
              <button
                onClick={handlePurgeOldLogs}
                disabled={purging}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors disabled:opacity-50 shadow-sm"
                title="ล้างข้อมูลประวัติที่เก่ากว่า 90 วันเพื่อประหยัดพื้นที่"
              >
                <Trash2 className="w-4 h-4" />
                <span>{purging ? 'กำลังล้าง...' : 'ล้าง Log >90 วัน'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Purge Notification */}
        {purgeSuccessMessage && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm rounded-xl flex items-center gap-2 animate-fadeIn">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{purgeSuccessMessage}</span>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4 mt-5">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>กิจกรรมทั้งหมด</span>
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {stats.total.toLocaleString()}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-medium mb-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>กิจกรรมวันนี้</span>
            </div>
            <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
              {stats.todayCount.toLocaleString()}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-1">
              <User className="w-3.5 h-3.5 text-emerald-500" />
              <span>ผู้ใช้งานที่มีการแก้ไข</span>
            </div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {stats.activeUsers.toLocaleString()} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">ท่าน</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40">
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 text-xs font-medium mb-1">
              <SchoolIcon className="w-3.5 h-3.5 text-sky-500" />
              <span>โรงเรียนที่ปรับปรุง</span>
            </div>
            <div className="text-2xl font-bold text-sky-700 dark:text-sky-300">
              {stats.activeSchools.toLocaleString()} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">แห่ง</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search box */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อ, อีเมล, โรงเรียน, หรือรายละเอียด..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ล้าง
              </button>
            )}
          </div>

          {/* School filter (Super Admin only) */}
          {isSuperAdmin && (
            <div className="md:col-span-3">
              <select
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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

          {/* Action type filter */}
          <div className={isSuperAdmin ? "md:col-span-3" : "md:col-span-4"}>
            <select
              value={selectedActionType}
              onChange={(e) => setSelectedActionType(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">🏷️ ทุกประเภทกิจกรรม</option>
              <option value="update_school">🏫 แก้ไขข้อมูลโรงเรียน</option>
              <option value="update_student">📊 ปรับปรุงสถิตินักเรียน</option>
              <option value="update_student_g">🪪 ข้อมูลนักเรียนตัว G</option>
              <option value="upload_file">📁 นำเข้าไฟล์ Excel / BigData</option>
              <option value="delete_data">🗑️ ลบข้อมูล</option>
              <option value="user_management">👤 จัดการผู้ใช้และสิทธิ์</option>
              <option value="system_settings">⚙️ ตั้งค่าระบบ</option>
              <option value="academic_assessment">📈 คะแนน NT / RT</option>
              <option value="other">📌 กิจกรรมทั่วไป</option>
            </select>
          </div>

          {/* Date range filter */}
          <div className={isSuperAdmin ? "md:col-span-2" : "md:col-span-4"}>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">📅 ทุกช่วงเวลา</option>
              <option value="today">⚡ วันนี้เท่านั้น</option>
              <option value="7days">🗓️ 7 วันล่าสุด</option>
              <option value="30days">📆 30 วันล่าสุด</option>
            </select>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
          <div>
            พบข้อมูลกิจกรรม <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredLogs.length}</span> รายการ 
            {filteredLogs.length !== logs.length && ` (จากทั้งหมด ${logs.length} รายการ)`}
          </div>
          {(searchTerm || selectedSchoolId !== 'all' || selectedActionType !== 'all' || dateFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedSchoolId('all');
                setSelectedActionType('all');
                setDateFilter('all');
              }}
              className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium hover:underline"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>
      </div>

      {/* Log List / Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 dark:text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-500" />
            <p className="text-sm font-medium">กำลังโหลดประวัติกิจกรรม...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-20 text-center text-slate-400 dark:text-slate-500">
            <History className="w-12 h-12 mx-auto mb-3 stroke-1 text-slate-300 dark:text-slate-600" />
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">ไม่พบประวัติกิจกรรม</p>
            <p className="text-sm mt-1">ยังไม่มีการบันทึกการแก้ไขข้อมูลตามเงื่อนไขที่เลือก</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">วัน-เวลา</th>
                  <th className="py-3.5 px-4">ผู้ดำเนินการ</th>
                  <th className="py-3.5 px-4">สถานศึกษา</th>
                  <th className="py-3.5 px-4">ประเภทกิจกรรม</th>
                  <th className="py-3.5 px-4 sm:px-6">รายละเอียดการแก้ไข</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.map((log) => {
                  const dt = formatDateTime(log.timestamp);
                  const badge = getActionBadge(log.actionType);

                  return (
                    <tr
                      key={log.id || `${log.timestamp}_${log.userEmail}`}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Date & Time */}
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-2 h-2 rounded-full ${dt.isRecent ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                          <div>
                            <div className="font-medium text-slate-800 dark:text-slate-200">
                              {dt.relative}
                            </div>
                            <div className="text-xs text-slate-400 dark:text-slate-500">
                              {dt.time}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* User Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 flex-shrink-0 text-xs font-bold border border-slate-200 dark:border-slate-700">
                            {log.userName ? log.userName.charAt(0) : 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-800 dark:text-slate-100 truncate max-w-[160px] sm:max-w-[200px]">
                              {log.userName || 'ผู้ใช้งาน'}
                            </div>
                            <div className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[160px] sm:max-w-[200px]">
                              {log.userEmail}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* School Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <SchoolIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-[180px]">
                            {log.schoolName || '-'}
                          </span>
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${badge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Details & Target */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <span>{log.actionTitle}</span>
                            {log.targetName && (
                              <span className="text-xs font-normal text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/50">
                                {log.targetName}
                              </span>
                            )}
                          </div>
                          {log.details && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed break-words line-clamp-2 max-w-xl">
                              {log.details}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
