import React, { useState, useMemo } from 'react';
import { 
  Building, Users, ShieldAlert, CheckCircle2, AlertTriangle, AlertCircle, 
  Search, RefreshCw, Download, Copy, Check, ExternalLink, Filter, ArrowUpDown, 
  ChevronUp, ChevronDown, Phone, Mail, Clock, Sparkles, Shield, UserCheck, 
  FileSpreadsheet, ArrowRight, UserPlus, Eye, Layers, BarChart3
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { School, UserProfile } from '../types';

interface SchoolSummaryDashboardProps {
  schools: School[];
  approvedUsers: UserProfile[];
  pendingUsers: UserProfile[];
  onSelectSchool?: (schoolId: string) => void;
  onNavigateToSchoolEdit: (schoolId: string) => void;
  onNavigateToUserManagement: () => void;
  onRefreshData?: () => Promise<void>;
  isSuperAdmin: boolean;
}

export const SchoolSummaryDashboard: React.FC<SchoolSummaryDashboardProps> = ({
  schools,
  approvedUsers,
  pendingUsers,
  onSelectSchool,
  onNavigateToSchoolEdit,
  onNavigateToUserManagement,
  onRefreshData,
  isSuperAdmin
}) => {
  // Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'no_admin' | 'all_admins'>('overview');
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAmphoe, setSelectedAmphoe] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'green' | 'yellow' | 'red'>('all');
  const [adminStatusFilter, setAdminStatusFilter] = useState<'all' | 'has_admin' | 'no_admin'>('all');
  
  // Sorting state
  const [sortField, setSortField] = useState<'id' | 'name' | 'amphoe' | 'updatedAt' | 'adminCount'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Copy feedback
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Helper: Parse updatedAt timestamp to Date and Days Difference
  const getSchoolUpdateInfo = (updatedAt: any) => {
    if (!updatedAt) {
      return {
        status: 'red' as const,
        label: 'ยังไม่เคยอัปเดต / > 7 เดือน',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800',
        dotClass: 'bg-rose-500',
        timeText: 'ยังไม่มีบันทึกเวลา',
        relativeText: 'ยังไม่มีบันทึกเวลา',
        diffDays: 9999,
        timestamp: 0
      };
    }

    try {
      let dateObj: Date;
      if (typeof updatedAt === 'string' || typeof updatedAt === 'number') {
        dateObj = new Date(updatedAt);
      } else if (updatedAt && typeof updatedAt.toDate === 'function') {
        dateObj = updatedAt.toDate();
      } else if (updatedAt && typeof updatedAt.seconds === 'number') {
        dateObj = new Date(updatedAt.seconds * 1000);
      } else {
        dateObj = new Date(updatedAt);
      }

      if (isNaN(dateObj.getTime())) {
        return {
          status: 'red' as const,
          label: 'ยังไม่เคยอัปเดต / > 7 เดือน',
          badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800',
          dotClass: 'bg-rose-500',
          timeText: 'ยังไม่มีบันทึกเวลา',
          relativeText: 'ยังไม่มีบันทึกเวลา',
          diffDays: 9999,
          timestamp: 0
        };
      }

      const now = new Date();
      const diffMs = now.getTime() - dateObj.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      const formattedDate = dateObj.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: '2-digit'
      });

      let relativeText = '';
      if (diffDays === 0) {
        relativeText = 'วันนี้';
      } else if (diffDays === 1) {
        relativeText = 'เมื่อวานนี้';
      } else if (diffDays < 30) {
        relativeText = `${diffDays} วันที่แล้ว`;
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        relativeText = `${months} เดือนที่แล้ว`;
      } else {
        const years = (diffDays / 365).toFixed(1);
        relativeText = `${years} ปีที่แล้ว`;
      }

      if (diffDays <= 90) {
        return {
          status: 'green' as const,
          label: 'อัปเดต < 3 เดือน',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800',
          dotClass: 'bg-emerald-500 animate-pulse',
          timeText: formattedDate,
          relativeText,
          diffDays,
          timestamp: dateObj.getTime()
        };
      } else if (diffDays <= 210) {
        return {
          status: 'yellow' as const,
          label: 'ไม่ได้อัปเดต 3-6 เดือน',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800',
          dotClass: 'bg-amber-500',
          timeText: formattedDate,
          relativeText,
          diffDays,
          timestamp: dateObj.getTime()
        };
      } else {
        return {
          status: 'red' as const,
          label: 'ไม่ได้อัปเดต > 7 เดือน',
          badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800',
          dotClass: 'bg-rose-500',
          timeText: formattedDate,
          relativeText,
          diffDays,
          timestamp: dateObj.getTime()
        };
      }
    } catch {
      return {
        status: 'red' as const,
        label: 'ยังไม่เคยอัปเดต / > 7 เดือน',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800',
        dotClass: 'bg-rose-500',
        timeText: 'ยังไม่มีบันทึกเวลา',
        relativeText: 'ยังไม่มีบันทึกเวลา',
        diffDays: 9999,
        timestamp: 0
      };
    }
  };

  // Build a Map of School ID -> Approved Admins
  const schoolAdminsMap = useMemo(() => {
    const map = new Map<string, UserProfile[]>();
    approvedUsers.forEach(user => {
      if (user.schoolId && user.schoolId !== 'all') {
        const list = map.get(user.schoolId) || [];
        list.push(user);
        map.set(user.schoolId, list);
      }
    });
    return map;
  }, [approvedUsers]);

  // Build a Map of School ID -> Pending Requests
  const schoolPendingMap = useMemo(() => {
    const map = new Map<string, UserProfile[]>();
    pendingUsers.forEach(user => {
      if (user.schoolId && user.schoolId !== 'all') {
        const list = map.get(user.schoolId) || [];
        list.push(user);
        map.set(user.schoolId, list);
      }
    });
    return map;
  }, [pendingUsers]);

  // Available Amphoes
  const availableAmphoes = useMemo(() => {
    const set = new Set<string>();
    schools.forEach(s => {
      if (s.amphoe) set.add(s.amphoe.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'));
  }, [schools]);

  // Enriched School Items
  const enrichedSchools = useMemo(() => {
    return schools.map(school => {
      const updateInfo = getSchoolUpdateInfo(school.updatedAt);
      const admins = schoolAdminsMap.get(school.id) || [];
      const pending = schoolPendingMap.get(school.id) || [];
      const hasAdmin = admins.length > 0;
      return {
        ...school,
        updateInfo,
        admins,
        pending,
        hasAdmin,
        adminCount: admins.length
      };
    });
  }, [schools, schoolAdminsMap, schoolPendingMap]);

  // Overall Statistics
  const stats = useMemo(() => {
    const total = enrichedSchools.length;
    let greenCount = 0;
    let yellowCount = 0;
    let redCount = 0;
    let hasAdminCount = 0;
    let noAdminCount = 0;

    const amphoeNoAdminCounts: Record<string, number> = {};

    enrichedSchools.forEach(s => {
      if (s.updateInfo.status === 'green') greenCount++;
      else if (s.updateInfo.status === 'yellow') yellowCount++;
      else redCount++;

      if (s.hasAdmin) {
        hasAdminCount++;
      } else {
        noAdminCount++;
        const amp = s.amphoe || 'ไม่ระบุอำเภอ';
        amphoeNoAdminCounts[amp] = (amphoeNoAdminCounts[amp] || 0) + 1;
      }
    });

    return {
      total,
      greenCount,
      yellowCount,
      redCount,
      hasAdminCount,
      noAdminCount,
      greenPercent: total > 0 ? Math.round((greenCount / total) * 100) : 0,
      yellowPercent: total > 0 ? Math.round((yellowCount / total) * 100) : 0,
      redPercent: total > 0 ? Math.round((redCount / total) * 100) : 0,
      hasAdminPercent: total > 0 ? Math.round((hasAdminCount / total) * 100) : 0,
      noAdminPercent: total > 0 ? Math.round((noAdminCount / total) * 100) : 0,
      amphoeNoAdminCounts
    };
  }, [enrichedSchools]);

  // Schools Without Admin List
  const schoolsWithoutAdmin = useMemo(() => {
    return enrichedSchools.filter(s => !s.hasAdmin);
  }, [enrichedSchools]);

  // Filtered and Sorted Schools according to active view and filters
  const filteredSchools = useMemo(() => {
    let result = [...enrichedSchools];

    // Filter by Sub-tab constraint
    if (activeSubTab === 'no_admin') {
      result = result.filter(s => !s.hasAdmin);
    }

    // Filter by Admin Status (in overview or all_admins subtab)
    if (activeSubTab !== 'no_admin' && adminStatusFilter !== 'all') {
      if (adminStatusFilter === 'has_admin') {
        result = result.filter(s => s.hasAdmin);
      } else if (adminStatusFilter === 'no_admin') {
        result = result.filter(s => !s.hasAdmin);
      }
    }

    // Filter by Status (Green, Yellow, Red)
    if (selectedStatusFilter !== 'all') {
      result = result.filter(s => s.updateInfo.status === selectedStatusFilter);
    }

    // Filter by Amphoe
    if (selectedAmphoe !== 'all') {
      result = result.filter(s => s.amphoe === selectedAmphoe);
    }

    // Filter by Search Query
    const query = searchTerm.trim().toLowerCase();
    if (query) {
      result = result.filter(s => 
        (s.name || '').toLowerCase().includes(query) ||
        (s.id || '').toLowerCase().includes(query) ||
        (s.amphoe || '').toLowerCase().includes(query) ||
        (s.networkGroup || '').toLowerCase().includes(query) ||
        (s.updatedBy || '').toLowerCase().includes(query) ||
        (s.directorName || '').toLowerCase().includes(query) ||
        s.admins.some(a => 
          `${a.firstName} ${a.lastName}`.toLowerCase().includes(query) ||
          (a.email || '').toLowerCase().includes(query)
        )
      );
    }

    // Sorting
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'updatedAt') {
        cmp = (a.updateInfo.timestamp || 0) - (b.updateInfo.timestamp || 0);
      } else if (sortField === 'id') {
        cmp = (a.id || '').localeCompare(b.id || '', undefined, { numeric: true });
      } else if (sortField === 'name') {
        cmp = (a.name || '').localeCompare(b.name || '', 'th');
      } else if (sortField === 'amphoe') {
        const textA = `${a.amphoe || ''} ${a.networkGroup || ''}`;
        const textB = `${b.amphoe || ''} ${b.networkGroup || ''}`;
        cmp = textA.localeCompare(textB, 'th');
      } else if (sortField === 'adminCount') {
        cmp = a.adminCount - b.adminCount;
      }

      return sortOrder === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [enrichedSchools, activeSubTab, adminStatusFilter, selectedStatusFilter, selectedAmphoe, searchTerm, sortField, sortOrder]);

  // Toggle Sort handler
  const handleToggleSort = (field: 'id' | 'name' | 'amphoe' | 'updatedAt' | 'adminCount') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder(field === 'updatedAt' ? 'desc' : 'asc');
    }
  };

  // Copy List of Schools Without Admins to Clipboard
  const handleCopyNoAdminList = () => {
    const items = schoolsWithoutAdmin.map((s, idx) => 
      `${idx + 1}. [รหัส ${s.id}] ${s.name} (อ.${s.amphoe || '-'} / ${s.networkGroup || '-'}) เบอร์ติดต่อ: ${s.schoolPhone || s.directorPhone || 'ไม่มีข้อมูล'}`
    );
    const text = `📋 รายชื่อโรงเรียนที่ยังไม่มีผู้ดูแลระบบ (School Admin) - สพป.แม่ฮ่องสอน เขต 1\n` +
      `จำนวนทั้งหมด: ${schoolsWithoutAdmin.length} แห่ง (จากทั้งหมด ${schools.length} แห่ง)\n` +
      `ข้อมูล ณ วันที่: ${new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n` +
      items.join('\n');

    navigator.clipboard.writeText(text);
    setCopiedType('no_admin_text');
    setTimeout(() => setCopiedType(null), 3000);
  };

  // Copy Freshness Summary Report to Clipboard
  const handleCopyFreshnessSummary = () => {
    const text = `📊 รายงานสรุปสถานะการอัปเดตข้อมูลสถานศึกษา สพป.แม่ฮ่องสอน เขต 1\n` +
      `🏫 สถานศึกษาทั้งหมด: ${stats.total} แห่ง\n` +
      `🟢 อัปเดตข้อมูล < 3 เดือน (ข้อมูลล่าสุด): ${stats.greenCount} แห่ง (${stats.greenPercent}%)\n` +
      `🟡 ไม่ได้อัปเดต 3-6 เดือน (เริ่มค้าง): ${stats.yellowCount} แห่ง (${stats.yellowPercent}%)\n` +
      `🔴 ไม่ได้อัปเดต > 7 เดือน (ต้องติดตาม): ${stats.redCount} แห่ง (${stats.redPercent}%)\n` +
      `👤 สถานะผู้ดูแลระบบ:\n` +
      `  - มีผู้ดูแลแล้ว: ${stats.hasAdminCount} แห่ง (${stats.hasAdminPercent}%)\n` +
      `  - ยังไม่มีผู้ดูแล: ${stats.noAdminCount} แห่ง (${stats.noAdminPercent}%)\n` +
      `ข้อมูล ณ วันที่: ${new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}`;

    navigator.clipboard.writeText(text);
    setCopiedType('summary_text');
    setTimeout(() => setCopiedType(null), 3000);
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = (mode: 'all' | 'no_admin') => {
    const exportList = mode === 'no_admin' ? schoolsWithoutAdmin : filteredSchools;
    
    const rows = exportList.map((s, idx) => {
      const adminNames = s.admins.map(a => `${a.firstName} ${a.lastName} (${a.email})`).join(', ');
      return {
        'ลำดับ': idx + 1,
        'รหัสโรงเรียน': s.id,
        'ชื่อสถานศึกษา': s.name,
        'อำเภอ': s.amphoe || '',
        'กลุ่มเครือข่าย': s.networkGroup || '',
        'สถานะการอัปเดต': s.updateInfo.label,
        'วันที่อัปเดตล่าสุด': s.updateInfo.timeText,
        'เวลาที่ผ่านมา': s.updateInfo.relativeText,
        'ผู้แก้ไขล่าสุด': s.updatedBy || '',
        'สถานะผู้ดูแล': s.hasAdmin ? 'มีผู้ดูแลแล้ว' : 'ยังไม่มีผู้ดูแล',
        'จำนวนผู้ดูแล': s.adminCount,
        'รายชื่อผู้ดูแลระบบ': adminNames || 'ยังไม่มีผู้ดูแล',
        'เบอร์โทรโรงเรียน': s.schoolPhone || '',
        'ชื่อผู้บริหาร': s.directorName || '',
        'เบอร์โทรผู้บริหาร': s.directorPhone || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    const sheetName = mode === 'no_admin' ? 'โรงเรียนที่ยังไม่มีผู้ดูแล' : 'สรุปสถานะสถานศึกษา';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    const fileName = mode === 'no_admin' 
      ? `รายงานโรงเรียนยังไม่มีผู้ดูแล_สพปมส1_${new Date().toISOString().slice(0, 10)}.xlsx`
      : `รายงานสรุปสถานะการอัปเดตสถานศึกษา_สพปมส1_${new Date().toISOString().slice(0, 10)}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  const handleTriggerRefresh = async () => {
    if (onRefreshData) {
      setIsRefreshing(true);
      try {
        await onRefreshData();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in min-w-0 max-w-full">
      {/* 1. Header Banner */}
      <div className="card p-5 sm:p-6 bg-gradient-to-r from-amber-50 via-rose-50 to-teal-50 dark:from-[#24171d] dark:via-[#1e1518] dark:to-[#172322] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[4px_4px_0px_#33272A] dark:shadow-[4px_4px_0px_#FFD3B6]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-[2px_2px_0px_#33272A] shrink-0">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h2 className="text-base sm:text-lg font-black text-[#33272A] dark:text-[#FFF9F5]">
                ศูนย์สรุปข้อมูลการอัปเดตล่าสุด & สถานะผู้ดูแลระบบ (Executive Summary)
              </h2>
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-200 text-amber-950 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-400">
                👑 Super Admin Dashboard
              </span>
            </div>
            <p className="text-xs text-[#33272A]/75 dark:text-[#FFF9F5]/75 font-semibold max-w-3xl leading-relaxed">
              ติดตามความสดใหม่ของข้อมูลสถานศึกษาทั้ง 119 แห่ง และตรวจสอบโรงเรียนที่ยังไม่มีผู้ดูแลระบบประจำโรงเรียน (School Admin) เพื่ออำนวยความสะดวกในการบริหารจัดการและกำกับดูแลข้อมูลอย่างมีประสิทธิภาพ
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onRefreshData && (
              <button
                type="button"
                disabled={isRefreshing}
                onClick={handleTriggerRefresh}
                className="px-3.5 py-2 rounded-xl text-xs font-black bg-white dark:bg-slate-800 text-[#33272A] dark:text-[#FFF9F5] border-2 border-[#33272A] dark:border-[#FFD3B6] hover:bg-[#FFD3B6]/30 shadow-[2px_2px_0px_#33272A] cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
                <span>{isRefreshing ? 'กำลังโหลด...' : 'รีเฟรช'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyFreshnessSummary}
              className="px-3.5 py-2 rounded-xl text-xs font-black bg-white dark:bg-slate-800 text-[#33272A] dark:text-[#FFF9F5] border-2 border-[#33272A] dark:border-[#FFD3B6] hover:bg-[#FFD3B6]/30 shadow-[2px_2px_0px_#33272A] cursor-pointer transition-all flex items-center gap-1.5"
              title="คัดลอกข้อความสรุปภาพรวมสำหรับส่งหนังสือ/รายงาน"
            >
              {copiedType === 'summary_text' ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600 font-black" />
                  <span className="text-emerald-700 dark:text-emerald-300">คัดลอกสำเร็จ!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-[#FF8BA7]" />
                  <span>คัดลอกสรุป</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleExportExcel(activeSubTab === 'no_admin' ? 'no_admin' : 'all')}
              className="btn-cute bg-[#A0E7E5] hover:bg-[#83dfdc] text-[#33272A] px-3.5 py-2 text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_#33272A] cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>ส่งออก Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Executive KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Schools */}
        <div 
          onClick={() => { setActiveSubTab('overview'); setSelectedStatusFilter('all'); setAdminStatusFilter('all'); }}
          className="card p-3.5 sm:p-4 bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] hover:border-teal-500 cursor-pointer transition-all shadow-[2px_2px_0px_#33272A]"
        >
          <div className="flex items-center justify-between text-[11px] font-black text-[#33272A]/70 dark:text-[#FFF9F5]/70">
            <span>สถานศึกษาทั้งหมด</span>
            <Building className="h-4 w-4 text-slate-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#33272A] dark:text-[#FFF9F5] mt-1.5">
            {stats.total} <span className="text-xs font-bold text-slate-500">แห่ง</span>
          </div>
          <div className="mt-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
            สพป.แม่ฮ่องสอน เขต 1
          </div>
        </div>

        {/* Fresh Updates (< 3 Months) */}
        <div 
          onClick={() => { setActiveSubTab('overview'); setSelectedStatusFilter('green'); }}
          className={`card p-3.5 sm:p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border-2 transition-all cursor-pointer shadow-[2px_2px_0px_#33272A] ${
            selectedStatusFilter === 'green' && activeSubTab === 'overview'
              ? 'border-emerald-600 bg-emerald-100/70 dark:bg-emerald-950/50'
              : 'border-emerald-400/80 hover:border-emerald-600'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-black text-emerald-800 dark:text-emerald-300">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>อัปเดต &lt; 3 เดือน</span>
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1.5">
            {stats.greenCount} <span className="text-xs font-bold text-emerald-600">({stats.greenPercent}%)</span>
          </div>
          <div className="w-full bg-emerald-200 dark:bg-emerald-900/40 rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${stats.greenPercent}%` }}></div>
          </div>
        </div>

        {/* Warning Updates (3-6 Months) */}
        <div 
          onClick={() => { setActiveSubTab('overview'); setSelectedStatusFilter('yellow'); }}
          className={`card p-3.5 sm:p-4 bg-amber-50/50 dark:bg-amber-950/20 border-2 transition-all cursor-pointer shadow-[2px_2px_0px_#33272A] ${
            selectedStatusFilter === 'yellow' && activeSubTab === 'overview'
              ? 'border-amber-600 bg-amber-100/70 dark:bg-amber-950/50'
              : 'border-amber-400/80 hover:border-amber-600'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-black text-amber-800 dark:text-amber-300">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              <span>ค้าง 3-6 เดือน</span>
            </span>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-400 mt-1.5">
            {stats.yellowCount} <span className="text-xs font-bold text-amber-600">({stats.yellowPercent}%)</span>
          </div>
          <div className="w-full bg-amber-200 dark:bg-amber-900/40 rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${stats.yellowPercent}%` }}></div>
          </div>
        </div>

        {/* Stale Updates (> 7 Months) */}
        <div 
          onClick={() => { setActiveSubTab('overview'); setSelectedStatusFilter('red'); }}
          className={`card p-3.5 sm:p-4 bg-rose-50/50 dark:bg-rose-950/20 border-2 transition-all cursor-pointer shadow-[2px_2px_0px_#33272A] ${
            selectedStatusFilter === 'red' && activeSubTab === 'overview'
              ? 'border-rose-600 bg-rose-100/70 dark:bg-rose-950/50'
              : 'border-rose-400/80 hover:border-rose-600'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-black text-rose-800 dark:text-rose-300">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500"></span>
              <span>ไม่อัปเดต &gt; 7 ด.</span>
            </span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400 mt-1.5">
            {stats.redCount} <span className="text-xs font-bold text-rose-600">({stats.redPercent}%)</span>
          </div>
          <div className="w-full bg-rose-200 dark:bg-rose-900/40 rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-rose-500 h-full rounded-full" style={{ width: `${stats.redPercent}%` }}></div>
          </div>
        </div>

        {/* Has Admin */}
        <div 
          onClick={() => { setActiveSubTab('all_admins'); setAdminStatusFilter('has_admin'); }}
          className={`card p-3.5 sm:p-4 bg-sky-50/50 dark:bg-sky-950/20 border-2 transition-all cursor-pointer shadow-[2px_2px_0px_#33272A] ${
            adminStatusFilter === 'has_admin' && activeSubTab === 'all_admins'
              ? 'border-sky-600 bg-sky-100/70 dark:bg-sky-950/50'
              : 'border-sky-400/80 hover:border-sky-600'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-black text-sky-800 dark:text-sky-300">
            <span>มีผู้ดูแลแล้ว</span>
            <Shield className="h-4 w-4 text-sky-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-sky-700 dark:text-sky-400 mt-1.5">
            {stats.hasAdminCount} <span className="text-xs font-bold text-sky-600">({stats.hasAdminPercent}%)</span>
          </div>
          <div className="mt-2 text-[10px] font-bold text-sky-600 dark:text-sky-400 truncate">
            {approvedUsers.length} บัญชีในระบบ
          </div>
        </div>

        {/* No Admin Assigned - HIGHLIGHTED */}
        <div 
          onClick={() => { setActiveSubTab('no_admin'); }}
          className={`card p-3.5 sm:p-4 bg-gradient-to-br from-rose-100/80 to-amber-100/80 dark:from-rose-950/40 dark:to-amber-950/40 border-2 transition-all cursor-pointer shadow-[3px_3px_0px_#e11d48] ${
            activeSubTab === 'no_admin'
              ? 'border-rose-600 ring-2 ring-rose-500 scale-[1.02]'
              : 'border-rose-500 hover:border-rose-700'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-black text-rose-900 dark:text-rose-200">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping"></span>
              <span>⚠️ ยังไม่มีผู้ดูแล</span>
            </span>
            <ShieldAlert className="h-4 w-4 text-rose-600 animate-bounce" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400 mt-1.5">
            {stats.noAdminCount} <span className="text-xs font-bold text-rose-600">({stats.noAdminPercent}%)</span>
          </div>
          <div className="mt-2 text-[10px] font-black text-rose-700 dark:text-rose-300 underline flex items-center gap-1">
            <span>คลิกดูรายชื่อ ({stats.noAdminCount})</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        </div>
      </div>

      {/* 3. Sub-Navigation Tabs */}
      <div className="flex items-center justify-between gap-2 border-b-2 border-[#33272A] dark:border-[#FFD3B6] pb-2 flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar min-w-0">
          <button
            type="button"
            onClick={() => { setActiveSubTab('overview'); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black border-2 border-[#33272A] transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'overview'
                ? 'bg-[#FF8BA7] text-[#33272A] shadow-[2px_2px_0px_#33272A]'
                : 'bg-white text-[#33272A]/70 hover:bg-[#FFD3B6]/30 dark:bg-slate-800 dark:text-[#FFF9F5]/70'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>1. ภาพรวมและสรุปการอัปเดต ({schools.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveSubTab('no_admin'); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black border-2 border-[#33272A] transition-all cursor-pointer flex items-center gap-1.5 shrink-0 relative ${
              activeSubTab === 'no_admin'
                ? 'bg-rose-500 text-white shadow-[2px_2px_0px_#33272A]'
                : 'bg-white text-rose-700 hover:bg-rose-50 dark:bg-slate-800 dark:text-rose-300'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span>2. โรงเรียนที่ยังไม่มีผู้ดูแล</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeSubTab === 'no_admin' ? 'bg-white text-rose-600' : 'bg-rose-500 text-white animate-pulse'
            }`}>
              {stats.noAdminCount} แห่ง
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveSubTab('all_admins'); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black border-2 border-[#33272A] transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'all_admins'
                ? 'bg-[#A0E7E5] text-[#33272A] shadow-[2px_2px_0px_#33272A]'
                : 'bg-white text-[#33272A]/70 hover:bg-[#FFD3B6]/30 dark:bg-slate-800 dark:text-[#FFF9F5]/70'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>3. ทะเบียนผู้ดูแลรายโรงเรียน</span>
          </button>
        </div>

        {/* Quick Navigate to Users Management */}
        <button
          type="button"
          onClick={onNavigateToUserManagement}
          className="text-xs font-black text-teal-700 dark:text-teal-300 hover:underline flex items-center gap-1 cursor-pointer py-1 px-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-300 dark:border-teal-700 shrink-0"
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>ไปที่ทะเบียนผู้ใช้งาน</span>
          {pendingUsers.length > 0 && (
            <span className="bg-rose-500 text-white rounded-full px-1.5 py-0.2 text-[9px] font-black">
              +{pendingUsers.length} รออนุมัติ
            </span>
          )}
        </button>
      </div>

      {/* 4. Subtab Specific Content */}

      {/* SUBTAB 2: Schools Without Admin Alert & Summary */}
      {activeSubTab === 'no_admin' && (
        <div className="space-y-4 animate-fade-in">
          {/* Prominent Alert Box */}
          <div className="bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-rose-500/10 border-2 border-rose-500 rounded-2xl p-4 sm:p-5 shadow-[3px_3px_0px_#e11d48]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-rose-500 text-white shrink-0 mt-0.5">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-rose-950 dark:text-rose-100 flex items-center gap-2">
                    <span>⚠️ พบสถานศึกษาที่ยังไม่มีผู้ดูแลระบบ (School Admin) ทั้งหมด {schoolsWithoutAdmin.length} แห่ง ({stats.noAdminPercent}%)</span>
                  </h3>
                  <p className="text-xs text-rose-800 dark:text-rose-300 font-semibold leading-relaxed">
                    สถานศึกษาเหล่านี้ยังไม่มีครูหรือบุคลากรสมัครเป็นแอดมินประจำโรงเรียนในระบบ dmc-mhs1 ท่านสามารถคัดลอกรายชื่อส่งแจ้งเตือน หรือกดเข้าไปช่วยแก้ไขข้อมูลให้โรงเรียนได้ทันที
                  </p>
                </div>
              </div>

              {/* Action Buttons for No Admin List */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={handleCopyNoAdminList}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border-2 border-rose-500 text-rose-700 dark:text-rose-300 text-xs font-black hover:bg-rose-50 cursor-pointer shadow-[2px_2px_0px_#e11d48] flex items-center gap-1.5 transition-all"
                >
                  {copiedType === 'no_admin_text' ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-600 font-black" />
                      <span className="text-emerald-700">คัดลอกสำเร็จ!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>คัดลอกรายชื่อ {schoolsWithoutAdmin.length} โรงเรียน</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleExportExcel('no_admin')}
                  className="px-3.5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black border-2 border-[#33272A] cursor-pointer shadow-[2px_2px_0px_#33272A] flex items-center gap-1.5 transition-all"
                >
                  <Download className="h-4 w-4" />
                  <span>ส่งออก Excel</span>
                </button>
              </div>
            </div>

            {/* Amphoe Breakdown Chips */}
            <div className="mt-4 pt-3 border-t border-rose-300 dark:border-rose-800 flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="text-rose-900 dark:text-rose-200 font-black">จำแนกตามอำเภอ:</span>
              {Object.entries(stats.amphoeNoAdminCounts).map(([amp, cnt]) => (
                <button
                  key={amp}
                  type="button"
                  onClick={() => setSelectedAmphoe(selectedAmphoe === amp ? 'all' : amp)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                    selectedAmphoe === amp
                      ? 'bg-rose-600 text-white border-rose-700 shadow-[1px_1px_0px_#33272A]'
                      : 'bg-white/80 dark:bg-slate-800 text-rose-900 dark:text-rose-200 border-rose-300 hover:bg-rose-100'
                  }`}
                >
                  <span>{amp}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-200 text-rose-950 dark:bg-rose-900 dark:text-rose-100 text-[10px] font-black">
                    {cnt} แห่ง
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Filter Controls Bar */}
      <div className="card p-4 bg-white dark:bg-[#1e1518] space-y-3 border-2 border-[#33272A] dark:border-[#FFD3B6]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-[#33272A]/50 dark:text-[#FFF9F5]/50" />
            </span>
            <input
              type="text"
              placeholder="ค้นหาชื่อ รหัส อำเภอ ผู้แก้ไข..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-[#FF8BA7] dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Amphoe Filter */}
          <div className="space-y-1">
            <select
              value={selectedAmphoe}
              onChange={(e) => setSelectedAmphoe(e.target.value)}
              className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
            >
              <option value="all">📍 ทุกอำเภอ ({schools.length} แห่ง)</option>
              {availableAmphoes.map(amp => (
                <option key={amp} value={amp}>
                  {amp} ({schools.filter(s => s.amphoe === amp).length} แห่ง)
                </option>
              ))}
            </select>
          </div>

          {/* Update Status Filter (Green/Yellow/Red) */}
          <div className="space-y-1">
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
              className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
            >
              <option value="all">⚡ ทุกสถานะการอัปเดต</option>
              <option value="green">🟢 อัปเดต &lt; 3 เดือน ({stats.greenCount})</option>
              <option value="yellow">🟡 ไม่ได้อัปเดต 3-6 เดือน ({stats.yellowCount})</option>
              <option value="red">🔴 ไม่ได้อัปเดต &gt; 7 เดือน ({stats.redCount})</option>
            </select>
          </div>

          {/* Admin Coverage Filter (if not in no_admin subtab) */}
          {activeSubTab !== 'no_admin' && (
            <div className="space-y-1">
              <select
                value={adminStatusFilter}
                onChange={(e) => setAdminStatusFilter(e.target.value as any)}
                className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
              >
                <option value="all">👥 ผู้ดูแลทุกสถานะ</option>
                <option value="has_admin">👤 มีผู้ดูแลแล้ว ({stats.hasAdminCount} แห่ง)</option>
                <option value="no_admin">⚠️ ยังไม่มีผู้ดูแล ({stats.noAdminCount} แห่ง)</option>
              </select>
            </div>
          )}
        </div>

        {/* Active Filter Badges */}
        {(searchTerm || selectedAmphoe !== 'all' || selectedStatusFilter !== 'all' || (activeSubTab !== 'no_admin' && adminStatusFilter !== 'all')) && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#33272A]/10 dark:border-[#FFD3B6]/10 text-xs">
            <span className="text-[11px] font-black text-slate-500">ผลการกรอง: พบ {filteredSchools.length} แห่ง</span>
            {selectedAmphoe !== 'all' && (
              <span className="bg-teal-100 text-teal-900 border border-teal-300 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                อำเภอ: {selectedAmphoe}
                <button type="button" onClick={() => setSelectedAmphoe('all')}>✕</button>
              </span>
            )}
            {selectedStatusFilter !== 'all' && (
              <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                สถานะ: {selectedStatusFilter === 'green' ? 'เขียว (<3ด.)' : selectedStatusFilter === 'yellow' ? 'เหลือง (3-6ด.)' : 'แดง (>7ด.)'}
                <button type="button" onClick={() => setSelectedStatusFilter('all')}>✕</button>
              </span>
            )}
            {adminStatusFilter !== 'all' && activeSubTab !== 'no_admin' && (
              <span className="bg-rose-100 text-rose-900 border border-rose-300 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                ผู้ดูแล: {adminStatusFilter === 'has_admin' ? 'มีผู้ดูแล' : 'ยังไม่มีผู้ดูแล'}
                <button type="button" onClick={() => setAdminStatusFilter('all')}>✕</button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedAmphoe('all');
                setSelectedStatusFilter('all');
                setAdminStatusFilter('all');
              }}
              className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer ml-auto"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        )}
      </div>

      {/* 6. Main Data Table */}
      <div className="card p-4 sm:p-5 bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] space-y-4">
        <div className="flex items-center justify-between gap-3 border-b-2 border-[#33272A] pb-3 dark:border-[#FFD3B6] flex-wrap">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-[#FF8BA7]" />
            <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5]">
              {activeSubTab === 'no_admin' 
                ? `รายชื่อสถานศึกษาที่ยังไม่มีผู้ดูแล (${filteredSchools.length} แห่ง)`
                : activeSubTab === 'all_admins'
                ? `ทำเนียบผู้ดูแลระบบและสถานศึกษาทั้งหมด (${filteredSchools.length} แห่ง)`
                : `ตารางสรุปสถานะการอัปเดตข้อมูลสถานศึกษา (${filteredSchools.length} แห่ง)`
              }
            </h3>
          </div>

          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
            แสดง {filteredSchools.length} จากทั้งหมด {schools.length} แห่ง
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead>
              <tr className="border-b-2 border-[#33272A] dark:border-[#FFD3B6] text-[#33272A] dark:text-[#FFF9F5] font-black bg-slate-50 dark:bg-slate-800/60">
                <th className="p-2.5 text-center w-12">ลำดับ</th>
                
                <th 
                  onClick={() => handleToggleSort('id')}
                  className="p-2.5 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>รหัสโรงเรียน</span>
                    {sortField === 'id' ? (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                  </div>
                </th>

                <th 
                  onClick={() => handleToggleSort('name')}
                  className="p-2.5 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>ชื่อสถานศึกษา</span>
                    {sortField === 'name' ? (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                  </div>
                </th>

                <th 
                  onClick={() => handleToggleSort('amphoe')}
                  className="p-2.5 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>อำเภอ / กลุ่มเครือข่าย</span>
                    {sortField === 'amphoe' ? (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                  </div>
                </th>

                <th 
                  onClick={() => handleToggleSort('updatedAt')}
                  className="p-2.5 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>สถานะการอัปเดตล่าสุด</span>
                    {sortField === 'updatedAt' ? (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                  </div>
                </th>

                <th 
                  onClick={() => handleToggleSort('adminCount')}
                  className="p-2.5 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>ผู้ดูแลระบบประจำโรงเรียน (Admin)</span>
                    {sortField === 'adminCount' ? (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                  </div>
                </th>

                <th className="p-2.5 text-center w-28">ดำเนินการ</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#33272A]/10 dark:divide-[#FFD3B6]/10 font-bold">
              {filteredSchools.map((s, idx) => (
                <tr 
                  key={s.id} 
                  className={`hover:bg-[#FFF9F5] dark:hover:bg-slate-800/50 transition-colors ${
                    !s.hasAdmin ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                  }`}
                >
                  <td className="p-2.5 text-center text-slate-500 dark:text-slate-400 font-black">
                    {idx + 1}
                  </td>

                  <td className="p-2.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                    {s.id}
                  </td>

                  <td className="p-2.5">
                    <div className="font-black text-[#33272A] dark:text-[#FFF9F5] text-xs">
                      {s.name}
                    </div>
                    {s.schoolPhone && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="h-2.5 w-2.5" />
                        <span>{s.schoolPhone}</span>
                      </div>
                    )}
                  </td>

                  <td className="p-2.5 text-slate-700 dark:text-slate-300">
                    <div className="font-bold">{s.amphoe || '-'}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{s.networkGroup || '-'}</div>
                  </td>

                  <td className="p-2.5">
                    <div className="space-y-1">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${s.updateInfo.badgeClass}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${s.updateInfo.dotClass}`}></span>
                        <span>{s.updateInfo.label}</span>
                      </span>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        <span>{s.updateInfo.timeText}</span>
                        {s.updateInfo.relativeText !== s.updateInfo.timeText && (
                          <span className="opacity-75">({s.updateInfo.relativeText})</span>
                        )}
                      </div>
                      {s.updatedBy && (
                        <div className="text-[9px] text-slate-500 truncate max-w-[150px]">
                          โดย: {s.updatedBy}
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="p-2.5">
                    {s.hasAdmin ? (
                      <div className="space-y-1">
                        {s.admins.map(admin => (
                          <div key={admin.uid} className="flex items-center gap-1.5">
                            <span className="p-1 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 shrink-0">
                              <Shield className="h-3 w-3" />
                            </span>
                            <div className="min-w-0">
                              <div className="font-black text-[#33272A] dark:text-[#FFF9F5] text-[11px] truncate">
                                {admin.firstName} {admin.lastName}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {admin.email}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-[10px] font-black">
                          <ShieldAlert className="h-3 w-3 text-rose-500" />
                          <span>ยังไม่มีผู้ดูแล</span>
                        </span>

                        {/* Pending users alert for this school */}
                        {s.pending.length > 0 && (
                          <button
                            type="button"
                            onClick={onNavigateToUserManagement}
                            className="block text-[9px] font-black text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-300 hover:underline cursor-pointer"
                          >
                            🔔 มีคำร้องรออนุมัติ ({s.pending.length})
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => onNavigateToSchoolEdit(s.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#FFD3B6]/40 hover:bg-[#FFD3B6] dark:bg-slate-800 text-[#33272A] dark:text-[#FFF9F5] border border-[#33272A]/40 text-[10px] font-black cursor-pointer transition-colors flex items-center gap-1 shadow-[1px_1px_0px_#33272A]"
                        title="คลิกเพื่อแก้ไขข้อมูลสถานศึกษานี้"
                      >
                        <span>แก้ไขข้อมูล</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredSchools.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500 dark:text-slate-400 font-bold space-y-2">
                    <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
                    <p className="text-sm">ไม่พบสถานศึกษาตามเงื่อนไขการค้นหาหรือตัวกรองที่เลือก</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedAmphoe('all');
                        setSelectedStatusFilter('all');
                        setAdminStatusFilter('all');
                      }}
                      className="text-xs text-rose-600 font-black underline cursor-pointer"
                    >
                      ล้างการค้นหาทั้งหมด
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
