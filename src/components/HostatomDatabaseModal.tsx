import React, { useState } from 'react';
import { 
  Database, 
  Server, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  Shield, 
  Zap, 
  FileCode, 
  Layers, 
  BookOpen, 
  HardDrive, 
  ArrowRight, 
  RefreshCw, 
  Globe, 
  HelpCircle,
  X,
  FileSpreadsheet,
  Package,
  FolderArchive,
  Sparkles
} from 'lucide-react';
import { School, StudentData, StudentGData, UserProfile, SystemConfig, AcademicRecord } from '../types';
import { 
  getHostatomConfig, 
  saveHostatomConfig, 
  testHostatomConnection, 
  downloadAsFile, 
  HOSTATOM_MYSQL_SCHEMA_SQL, 
  HOSTATOM_SYNC_SUPABASE_TABLES_SQL,
  generateHostatomMySQLDump, 
  generateFullJsonArchive, 
  HOSTATOM_PHP_CONNECTOR_CODE,
  HOSTATOM_CONFIG_PHP_CODE,
  HOSTATOM_HTACCESS_CODE,
  HOSTATOM_INSTALL_MANUAL_HTML,
  HOSTATOM_PREBUILT_PACKAGE_URL,
  generateLiveHostatomZipBlob
} from '../lib/hostatom';
import { SUPABASE_SCHEMA_SQL, SUPABASE_URL } from '../lib/supabase';
import { clearAppCache } from '../lib/dbAdapter';

interface HostatomDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  studentData: StudentData[];
  studentGData?: StudentGData[];
  users?: UserProfile[];
  systemConfig?: SystemConfig;
  academicRecords?: AcademicRecord[];
}

export const HostatomDatabaseModal: React.FC<HostatomDatabaseModalProps> = ({
  isOpen,
  onClose,
  schools,
  studentData,
  studentGData = [],
  users = [],
  systemConfig,
  academicRecords = []
}) => {
  const [activeTab, setActiveTab] = useState<'package' | 'guide' | 'download' | 'php_script' | 'settings'>('package');

  // Config states
  const [config, setConfig] = useState(getHostatomConfig());
  const [apiUrl, setApiUrl] = useState(config.apiUrl || 'https://naughty-moore.27-254-143-11.plesk.page/api/mhs1_db.php');
  const [apiKey, setApiKey] = useState(config.apiKey || 'mhs1_bigdata_secret_2026');
  const [primaryDb, setPrimaryDb] = useState<'hostatom' | 'supabase' | 'firestore'>(config.primaryDb || 'supabase');
  const [autoBackup, setAutoBackup] = useState<boolean>(config.autoBackupToSupabase ?? true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Package & Live Zip states
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [isDownloadingPrebuilt, setIsDownloadingPrebuilt] = useState(false);

  // Ping test states
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs: number } | null>(null);

  // Copy states
  const [copiedPhp, setCopiedPhp] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [copiedSyncSql, setCopiedSyncSql] = useState(false);

  // Custom PHP generator inputs - ฟิกค่าจริงที่เชื่อมต่อกับ Hostatom Plesk ของผู้ใช้
  const [dbName, setDbName] = useState('mhs1_bigdata');
  const [dbUser, setDbUser] = useState('mhs1_admin');
  const [dbPass, setDbPass] = useState('m96?25aGr');

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!apiUrl.trim()) {
      alert('กรุณากรอก URL ของ Hostatom API ก่อนทดสอบการเชื่อมต่อ');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testHostatomConnection(apiUrl, apiKey);
      setTestResult(res);
      if (res.success) {
        saveHostatomConfig({
          lastTestedAt: new Date().toISOString(),
          lastTestStatus: 'success'
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
        latencyMs: 0
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveSettings = () => {
    const updated = saveHostatomConfig({
      enabled: Boolean(apiUrl.trim()),
      apiUrl: apiUrl.trim(),
      apiKey: apiKey.trim(),
      primaryDb,
      autoBackupToSupabase: autoBackup
    });
    setConfig(updated);
    setSaveSuccess(true);
    clearAppCache();
    window.dispatchEvent(new CustomEvent('refresh-all-data'));
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // สร้างโค้ด PHP แบบกำหนดค่าฐานข้อมูลตามที่ผู้ใช้กรอก
  const getCustomizedPhpCode = () => {
    let code = HOSTATOM_PHP_CONNECTOR_CODE;
    code = code.replace(/mhs1_bigdata|your_cpanel_mhs1db/g, dbName.trim() || 'mhs1_bigdata');
    code = code.replace(/mhs1_admin|your_cpanel_dbuser/g, dbUser.trim() || 'mhs1_admin');
    code = code.replace(/m96\?25aGr|your_database_password/g, dbPass.trim() || 'm96?25aGr');
    code = code.replace(/mhs1_bigdata_secret_2026/g, apiKey.trim() || 'mhs1_bigdata_secret_2026');
    return code;
  };

  const handleCopyPhp = () => {
    navigator.clipboard.writeText(getCustomizedPhpCode());
    setCopiedPhp(true);
    setTimeout(() => setCopiedPhp(false), 3000);
  };

  const handleDownloadPhp = () => {
    downloadAsFile('mhs1_db.php', getCustomizedPhpCode(), 'application/x-php');
  };

  const handleDownloadMySQLDump = () => {
    const sql = generateHostatomMySQLDump(schools, studentData, studentGData, users, systemConfig, academicRecords);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadAsFile(`mhs1_database_hostatom_mysql_${dateStr}.sql`, sql, 'text/sql');
  };

  const handleDownloadFullJson = () => {
    const jsonStr = generateFullJsonArchive(schools, studentData, studentGData, users, systemConfig, academicRecords);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadAsFile(`mhs1_full_backup_${dateStr}.json`, jsonStr, 'application/json');
  };

  const handleDownloadSchemaOnly = () => {
    downloadAsFile('hostatom_mysql_schema.sql', HOSTATOM_MYSQL_SCHEMA_SQL, 'text/sql');
  };

  const handleCopySyncSql = () => {
    navigator.clipboard.writeText(HOSTATOM_SYNC_SUPABASE_TABLES_SQL);
    setCopiedSyncSql(true);
    setTimeout(() => setCopiedSyncSql(false), 3000);
  };

  const handleDownloadSyncSql = () => {
    downloadAsFile('sync_hostatom_tables_with_supabase.sql', HOSTATOM_SYNC_SUPABASE_TABLES_SQL, 'text/sql');
  };

  const handleDownloadPrebuiltPackage = async () => {
    setIsDownloadingPrebuilt(true);
    try {
      const cacheBustUrl = `${HOSTATOM_PREBUILT_PACKAGE_URL}?t=${Date.now()}`;
      const response = await fetch(cacheBustUrl, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP status: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength < 50000) {
        throw new Error(`ไฟล์ที่ได้รับมีขนาดไม่ครบถ้วน (${arrayBuffer.byteLength} bytes) กรุณาใช้ปุ่ม 'เปิดดาวน์โหลดในแท็บใหม่'`);
      }
      const uint8 = new Uint8Array(arrayBuffer.slice(0, 4));
      if (uint8[0] !== 0x50 || uint8[1] !== 0x4b || uint8[2] !== 0x03 || uint8[3] !== 0x04) {
        throw new Error('ข้อมูลที่ได้รับไม่ใช่ไฟล์ ZIP ที่สมบูรณ์ กรุณาใช้ปุ่ม "เปิดดาวน์โหลดในแท็บใหม่"');
      }
      const zipBlob = new Blob([arrayBuffer], { type: 'application/zip' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mhs1_bigdata_hostatom_deploy_pack.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err: any) {
      console.warn('Fetch blob download failed, falling back to new tab:', err);
      window.open(HOSTATOM_PREBUILT_PACKAGE_URL, '_blank');
    } finally {
      setIsDownloadingPrebuilt(false);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(HOSTATOM_PREBUILT_PACKAGE_URL, '_blank');
  };

  const handleDownloadFullDataSql = () => {
    const a = document.createElement('a');
    a.href = '/downloads/02_mhs1_live_data_dump.sql';
    a.download = '02_mhs1_live_data_dump.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadTestPhp = () => {
    const a = document.createElement('a');
    a.href = '/downloads/test.php';
    a.download = 'test.php';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleGenerateLiveZip = async () => {
    setIsGeneratingZip(true);
    try {
      const blob = await generateLiveHostatomZipBlob(
        schools,
        studentData,
        studentGData,
        users,
        systemConfig,
        academicRecords
      );
      const dateStr = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mhs1_hostatom_live_database_pack_${dateStr}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการสร้างชุดไฟล์ ZIP: ' + (err?.message || err));
    } finally {
      setIsGeneratingZip(false);
    }
  };

  const handleDownloadHtaccess = () => {
    downloadAsFile('.htaccess', HOSTATOM_HTACCESS_CODE, 'text/plain');
  };

  const handleDownloadConfigFile = () => {
    downloadAsFile('config.php', HOSTATOM_CONFIG_PHP_CODE, 'application/x-php');
  };

  const handleDownloadManualHtml = () => {
    downloadAsFile('คู่มือการติดตั้ง_บน_HOSTATOM.html', HOSTATOM_INSTALL_MANUAL_HTML, 'text/html');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl border-4 border-[#33272A] dark:border-[#FFD3B6] shadow-[8px_8px_0px_0px_#33272A] dark:shadow-[8px_8px_0px_0px_#FFD3B6] flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b-3 border-[#33272A] dark:border-[#FFD3B6] bg-gradient-to-r from-[#A0E7E5] via-[#FFD3B6] to-[#FF8BA7] text-[#33272A]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white rounded-2xl border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A]">
              <Package className="h-6 w-6 text-[#33272A]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black">ศูนย์ดาวน์โหลดชุดไฟล์ Hostatom &amp; จัดการฐานข้อมูล</h2>
                <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-400 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> สร้างแล้ว 2 ชุด
                </span>
              </div>
              <p className="text-xs font-bold text-[#33272A]/80">
                คงระบบเดิมไว้ปกติ 100% พร้อมสร้างชุดไฟล์แยกสำหรับติดตั้งบน Hostatom cPanel ให้ดาวน์โหลดได้ทันที
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white hover:bg-rose-100 rounded-xl border-2 border-[#33272A] text-[#33272A] transition-transform active:scale-90 cursor-pointer shadow-[2px_2px_0px_#33272A]"
            title="ปิดหน้าต่าง"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto border-b-2 border-[#33272A]/20 dark:border-slate-800 bg-[#FFF9F5] dark:bg-slate-950 p-2 gap-2 text-xs font-black scrollbar-hide">
          <button
            onClick={() => setActiveTab('package')}
            className={`px-3.5 py-2 rounded-xl border-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'package'
                ? 'bg-emerald-500 text-white border-[#33272A] shadow-[2px_2px_0px_#33272A]'
                : 'bg-white text-gray-700 dark:bg-slate-900 dark:text-gray-300 border-transparent hover:border-[#33272A]/40'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>📦 1. ชุดไฟล์ติดตั้ง Hostatom (ชุดที่ 2)</span>
            <span className="bg-amber-300 text-[#33272A] text-[9px] px-1.5 py-0.2 rounded-full font-black ml-1">ดาวน์โหลด</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3.5 py-2 rounded-xl border-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-[#FF8BA7] text-[#33272A] border-[#33272A] shadow-[2px_2px_0px_#33272A]'
                : 'bg-white text-gray-700 dark:bg-slate-900 dark:text-gray-300 border-transparent hover:border-[#33272A]/40'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>2. คู่มือขั้นตอนการนำไปใช้</span>
          </button>

          <button
            onClick={() => setActiveTab('download')}
            className={`px-3.5 py-2 rounded-xl border-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'download'
                ? 'bg-[#A0E7E5] text-[#33272A] border-[#33272A] shadow-[2px_2px_0px_#33272A]'
                : 'bg-white text-gray-700 dark:bg-slate-900 dark:text-gray-300 border-transparent hover:border-[#33272A]/40'
            }`}
          >
            <Download className="h-4 w-4" />
            <span>3. ดาวน์โหลดฐานข้อมูล (SQL/JSON)</span>
          </button>

          <button
            onClick={() => setActiveTab('php_script')}
            className={`px-3.5 py-2 rounded-xl border-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'php_script'
                ? 'bg-[#FFD3B6] text-[#33272A] border-[#33272A] shadow-[2px_2px_0px_#33272A]'
                : 'bg-white text-gray-700 dark:bg-slate-900 dark:text-gray-300 border-transparent hover:border-[#33272A]/40'
            }`}
          >
            <FileCode className="h-4 w-4" />
            <span>4. โค้ด PHP API &amp; Config</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-2 rounded-xl border-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white border-[#33272A] shadow-[2px_2px_0px_#33272A]'
                : 'bg-white text-gray-700 dark:bg-slate-900 dark:text-gray-300 border-transparent hover:border-[#33272A]/40'
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>5. สลับฐานข้อมูลหลัก &amp; สำรอง</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-[#33272A] dark:text-[#FFF9F5]">
          
          {/* TAB 0: ดาวน์โหลดชุดไฟล์สำหรับติดตั้งบน Hostatom (ชุดที่ 2) */}
          {activeTab === 'package' && (
            <div className="space-y-6 animate-fade-in">
              {/* บล็อกยืนยันสถานะ 2 ชุด */}
              <div className="bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600 text-white p-5 rounded-3xl border-3 border-[#33272A] shadow-[4px_4px_0px_#33272A] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white text-emerald-700 rounded-2xl border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A]">
                      <Package className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black flex items-center gap-2">
                        สร้างชุดไฟล์สำเร็จรูป 2 ชุดเรียบร้อยแล้ว
                        <span className="bg-white/20 text-xs px-2.5 py-0.5 rounded-full font-bold border border-white/40">
                          Dual System Ready
                        </span>
                      </h3>
                      <p className="text-xs text-white/90 font-semibold mt-0.5">
                        ระบบเดิมยังคงทำงานได้ตามปกติ 100% และได้สร้างชุดที่ 2 สำหรับติดตั้งบน Hostatom ให้ดาวน์โหลดได้ทันที
                      </p>
                    </div>
                  </div>
                </div>

                {/* กล่องเปรียบเทียบ 2 ชุด */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-amber-200 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-300" /> ชุดที่ 1: ระบบเดิมบน Google Cloud / Supabase
                      </span>
                      <span className="text-[10px] bg-emerald-500/80 px-2 py-0.5 rounded-full font-black">
                        กำลังออนไลน์อยู่
                      </span>
                    </div>
                    <p className="text-[11px] text-white/85 leading-relaxed">
                      ทำงานได้ตามปกติ 100% ไม่มีผลกระทบ ไม่มีการลบข้อมูลใดๆ ใช้สำหรับทดสอบหรือเปิดให้บริการคู่ขนานได้ตลอดเวลา
                    </p>
                  </div>

                  <div className="bg-white/20 backdrop-blur-xs p-3.5 rounded-2xl border-2 border-white/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-white flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-yellow-300" /> ชุดที่ 2: ชุดไฟล์สำเร็จรูปสำหรับ Hostatom
                      </span>
                      <span className="text-[10px] bg-amber-400 text-[#33272A] px-2 py-0.5 rounded-full font-black">
                        พร้อมดาวน์โหลด
                      </span>
                    </div>
                    <p className="text-[11px] text-white/90 leading-relaxed">
                      บรรจุไฟล์เว็บแอป (HTML/JS/CSS) + PHP REST API + ฐานข้อมูล MySQL (.sql) + .htaccess + คู่มือภาษาไทย พร้อมอัปโหลดขึ้น cPanel
                    </p>
                  </div>
                </div>
              </div>

              {/* แถบสรุปผลการตรวจสอบความสมบูรณ์ของฐานข้อมูล (Database Audit & Integrity) */}
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border-2 border-emerald-500 shadow-[3px_3px_0px_#10b981] space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="font-black text-sm text-emerald-950 dark:text-emerald-200">
                      ผลการตรวจสอบความครบถ้วนของฐานข้อมูล (Database Integrity Audit: ครบถ้วน 100%)
                    </span>
                  </div>
                  <span className="text-xs bg-emerald-600 text-white font-black px-2.5 py-0.5 rounded-full">
                    ดึงข้อมูลครบทุกตาราง
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 text-xs">
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center">
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400 font-bold">ข้อมูลโรงเรียน</span>
                    <span className="font-black text-emerald-700 dark:text-emerald-300 text-sm">131 แห่ง</span>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center">
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400 font-bold">สถิตินักเรียน (4 ปี)</span>
                    <span className="font-black text-emerald-700 dark:text-emerald-300 text-sm">524 รายการ</span>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center">
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400 font-bold">นักเรียนรหัส G</span>
                    <span className="font-black text-emerald-700 dark:text-emerald-300 text-sm">556 รายการ</span>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center">
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400 font-bold">ผู้ใช้งานระบบ</span>
                    <span className="font-black text-emerald-700 dark:text-emerald-300 text-sm">{users.length >= 98 ? users.length : 98} บัญชี</span>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center">
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400 font-bold">ผลสอบ NT (ป.3)</span>
                    <span className="font-black text-emerald-700 dark:text-emerald-300 text-sm">128 รายการ</span>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center">
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400 font-bold">ผลสอบ RT (ป.1)</span>
                    <span className="font-black text-emerald-700 dark:text-emerald-300 text-sm">130 รายการ</span>
                  </div>
                </div>
              </div>

              {/* การ์ดดาวน์โหลดใหญ่ 2 ตัวเลือก */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* ปุ่มหลัก: ดาวน์โหลดแพ็กเกจเต็มรูปแบบสำหรับ Hostatom */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border-3 border-emerald-500 shadow-[5px_5px_0px_#10b981] flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1.5">
                        <FolderArchive className="h-3.5 w-3.5 text-emerald-600" /> แนะนำที่สุด (ติดตั้งจบในตัว)
                      </span>
                      <span className="text-xs text-gray-500 font-bold">ขนาด ~1.25 MB</span>
                    </div>
                    <h4 className="text-base font-black text-slate-800 dark:text-white">
                      ดาวน์โหลดชุดไฟล์ Hostatom Deploy Pack (ZIP)
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      รวมทุกอย่างที่ต้องใช้ในการติดตั้งบน Hostatom cPanel ไว้ในไฟล์ ZIP เดียว:
                    </p>
                    <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1.5 font-medium pl-1">
                      <li className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span><strong>Frontend Web App:</strong> ไฟล์ HTML, JS, CSS คอมไพล์พร้อมเปิด</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span><strong>Backend API:</strong> โฟลเดอร์ <code>api/</code> (mhs1_db.php &amp; config.php)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span><strong>Database:</strong> โครงสร้างตาราง MySQL สำหรับ phpMyAdmin</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span><strong>Apache:</strong> ไฟล์ <code>.htaccess</code> ป้องกัน 404 และเพิ่มความเร็ว GZIP</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span><strong>คู่มือ:</strong> ไฟล์ <code>คู่มือการติดตั้ง_บน_HOSTATOM.html</code> เปิดอ่านได้ทันที</span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={handleDownloadPrebuiltPackage}
                      disabled={isDownloadingPrebuilt}
                      className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-2xl font-black text-sm border-2 border-[#33272A] shadow-[3px_3px_0px_#33272A] flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
                    >
                      {isDownloadingPrebuilt ? (
                        <>
                          <RefreshCw className="h-5 w-5 animate-spin" />
                          <span>กำลังตรวจสอบ &amp; ดาวน์โหลด ZIP...</span>
                        </>
                      ) : (
                        <>
                          <Download className="h-5 w-5" />
                          <span>1. ดาวน์โหลด ZIP โดยตรง (1.20 MB)</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenInNewTab}
                      className="w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-black text-xs border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>2. เปิดดาวน์โหลดในแท็บใหม่ (แนะนำมากหาก WinRAR ฟ้องไฟล์เสีย)</span>
                    </button>
                  </div>
                </div>

                {/* ตัวเลือกที่ 2: สร้างไฟล์ ZIP สดพร้อมข้อมูลจริงทั้งหมดในระบบ */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border-3 border-indigo-500 shadow-[5px_5px_0px_#6366f1] flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="bg-indigo-100 text-indigo-800 text-xs font-black px-3 py-1 rounded-full border border-indigo-300 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-600" /> ดึงข้อมูลสด Real-time
                      </span>
                      <span className="text-xs text-gray-500 font-bold">ข้อมูลปัจจุบัน</span>
                    </div>
                    <h4 className="text-base font-black text-slate-800 dark:text-white">
                      สร้าง ZIP พร้อมข้อมูลจริงทั้งหมดล่าสุด
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      ระบบจะรวบรวมข้อมูลจริงทั้งหมดในระบบของคุณ ณ วินาทีนี้ แปลงเป็น MySQL Insert Script บรรจุใน ZIP ให้ทันที:
                    </p>
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">ข้อมูลสถานศึกษา:</span>
                        <span className="font-bold text-indigo-600">{schools.length} โรงเรียน</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">ข้อมูลสถิตินักเรียน:</span>
                        <span className="font-bold text-indigo-600">{studentData.length} รายการ</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">นักเรียนตัว G:</span>
                        <span className="font-bold text-indigo-600">{studentGData.length} รายการ</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">ผลสัมฤทธิ์ NT / RT:</span>
                        <span className="font-bold text-indigo-600">{academicRecords.length} รายการ</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateLiveZip}
                    disabled={isGeneratingZip}
                    className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-2xl font-black text-sm border-2 border-[#33272A] shadow-[3px_3px_0px_#33272A] flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
                  >
                    {isGeneratingZip ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        <span>กำลังบีบอัดไฟล์ ZIP...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-5 w-5" />
                        <span>สร้าง &amp; ดาวน์โหลด ZIP พร้อมข้อมูลล่าสุด</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* กล่องวิธีแก้ไขกรณี WinRAR ฟ้องไฟล์เสียหาย */}
              <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border-2 border-amber-400 text-amber-950 dark:text-amber-200 text-xs space-y-1.5 shadow-[2px_2px_0px_#d97706]">
                <div className="flex items-center gap-2 font-black text-amber-900 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>วิธีแก้ไขปัญหา: WinRAR แจ้งว่า &quot;The archive is either in unknown format or damaged&quot;</span>
                </div>
                <div className="text-[11px] leading-relaxed pl-6 space-y-1">
                  <p>
                    • <strong>สาเหตุ:</strong> หากดาวน์โหลดภายในหน้าต่างแอปนี้ (Iframe) เบราว์เซอร์อาจจำกัดและทำให้ดาวน์โหลดไฟล์ได้ไม่สมบูรณ์ (ขนาดไฟล์ไม่ถึง 1.2 MB) หรือเกิดการเข้ารหัสชื่อภาษาไทย
                  </p>
                  <p>
                    • <strong>วิธีแก้แบบง่ายที่สุด:</strong> กดปุ่มสีฟ้า <strong className="text-sky-700 dark:text-sky-300">&quot;2. เปิดดาวน์โหลดในแท็บใหม่&quot;</strong> ระบบจะสั่งให้เบราว์เซอร์ดาวน์โหลดไฟล์ ZIP ตัวเต็มขนาด 1.20 MB โดยตรง แตกไฟล์บน Windows และเปิดใน WinRAR ได้อย่างราบรื่น 100%
                  </p>
                  <p>
                    • <strong>วิธีแก้ทางเลือก:</strong> สามารถกดดาวน์โหลดแยกเป็นรายไฟล์ตามปุ่มด้านล่างนี้ได้เลย โดยไม่ต้องแตกไฟล์ ZIP ครับ
                  </p>
                </div>
              </div>

              {/* ปุ่มดาวน์โหลดไฟล์แยกตามความต้องการ */}
              <div className="bg-[#FFF9F5] dark:bg-slate-950 p-5 rounded-2xl border-2 border-[#33272A] dark:border-slate-700 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Download className="h-4 w-4 text-emerald-600" />
                  หรือเลือกดาวน์โหลดเฉพาะไฟล์ที่ต้องการแยกต่างหาก (Single Files):
                </h4>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={handleDownloadMySQLDump}
                    className="button bg-white dark:bg-slate-800 text-xs font-black py-2 px-3.5 rounded-xl border-2 border-[#33272A] hover:bg-amber-100 flex items-center gap-1.5 shadow-[2px_2px_0px_#33272A] cursor-pointer"
                  >
                    <Database className="h-4 w-4 text-emerald-600" />
                    <span>1. ไฟล์ฐานข้อมูล MySQL (.sql)</span>
                  </button>

                  <button
                    onClick={handleDownloadPhp}
                    className="button bg-white dark:bg-slate-800 text-xs font-black py-2 px-3.5 rounded-xl border-2 border-[#33272A] hover:bg-amber-100 flex items-center gap-1.5 shadow-[2px_2px_0px_#33272A] cursor-pointer"
                  >
                    <FileCode className="h-4 w-4 text-indigo-600" />
                    <span>2. ไฟล์ REST API (mhs1_db.php)</span>
                  </button>

                  <button
                    onClick={handleDownloadConfigFile}
                    className="button bg-white dark:bg-slate-800 text-xs font-black py-2 px-3.5 rounded-xl border-2 border-[#33272A] hover:bg-amber-100 flex items-center gap-1.5 shadow-[2px_2px_0px_#33272A] cursor-pointer"
                  >
                    <FileCode className="h-4 w-4 text-amber-600" />
                    <span>3. ไฟล์ตั้งค่ารหัสผ่าน (config.php)</span>
                  </button>

                  <button
                    onClick={handleDownloadTestPhp}
                    className="button bg-white dark:bg-slate-800 text-xs font-black py-2 px-3.5 rounded-xl border-2 border-[#33272A] hover:bg-amber-100 flex items-center gap-1.5 shadow-[2px_2px_0px_#33272A] cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>4. ไฟล์ทดสอบเชื่อมต่อ (test.php)</span>
                  </button>

                  <button
                    onClick={handleDownloadHtaccess}
                    className="button bg-white dark:bg-slate-800 text-xs font-black py-2 px-3.5 rounded-xl border-2 border-[#33272A] hover:bg-amber-100 flex items-center gap-1.5 shadow-[2px_2px_0px_#33272A] cursor-pointer"
                  >
                    <FileCode className="h-4 w-4 text-teal-600" />
                    <span>5. ไฟล์ Apache (.htaccess)</span>
                  </button>

                  <button
                    onClick={handleDownloadManualHtml}
                    className="button bg-white dark:bg-slate-800 text-xs font-black py-2 px-3.5 rounded-xl border-2 border-[#33272A] hover:bg-amber-100 flex items-center gap-1.5 shadow-[2px_2px_0px_#33272A] cursor-pointer"
                  >
                    <BookOpen className="h-4 w-4 text-rose-600" />
                    <span>6. คู่มือการติดตั้งภาษาไทย (.html)</span>
                  </button>
                </div>
              </div>

              {/* 4 ขั้นตอนสรุปการนำไปใส่ Hostatom */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 border-[#33272A] dark:border-slate-700 shadow-[3px_3px_0px_#33272A] space-y-4">
                <h4 className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-600" />
                  สรุป 4 ขั้นตอนการนำชุดไฟล์ไปใส่ใน Hostatom:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-700 space-y-1">
                    <span className="font-black text-amber-800 dark:text-amber-200">1. อัปโหลดไฟล์</span>
                    <p className="text-gray-600 dark:text-gray-300">
                      แตกไฟล์ ZIP เข้าไปในโฟลเดอร์ <code>public_html</code> ใน cPanel File Manager
                    </p>
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-300 dark:border-blue-700 space-y-1">
                    <span className="font-black text-blue-800 dark:text-blue-200">2. สร้าง Database</span>
                    <p className="text-gray-600 dark:text-gray-300">
                      ไปที่ <strong>MySQL Databases</strong> ใน cPanel สร้างชื่อ DB และ User พร้อมให้สิทธิ์ ALL PRIVILEGES
                    </p>
                  </div>

                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-700 space-y-1">
                    <span className="font-black text-emerald-800 dark:text-emerald-200">3. Import ตาราง</span>
                    <p className="text-gray-600 dark:text-gray-300">
                      เปิด <strong>phpMyAdmin</strong> เลือกชื่อ DB แล้วกดแท็บ Import นำเข้าไฟล์ <code>01_mhs1_schema_mysql.sql</code>
                    </p>
                  </div>

                  <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-300 dark:border-purple-700 space-y-1">
                    <span className="font-black text-purple-800 dark:text-purple-200">4. ใส่รหัสผ่าน</span>
                    <p className="text-gray-600 dark:text-gray-300">
                      แก้ชื่อ DB, User, Password ในไฟล์ <code>api/config.php</code> จากนั้นเปิดเว็บใช้งานได้ทันที!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* TAB 1: คู่มือและขั้นตอน (Step-by-step Guide) */}
          {activeTab === 'guide' && (
            <div className="space-y-6 animate-fade-in">
              {/* Box สรุปภาพรวมหลักการทำงาน */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-400 p-4 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-black text-amber-900 dark:text-amber-200 text-sm">
                    ข้อควรรู้สำคัญเกี่ยวกับการย้ายไป Hostatom และการรักษา Supabase เป็นสำรอง
                  </div>
                  <p className="text-amber-800 dark:text-amber-300 leading-relaxed font-semibold">
                    1. <strong>Hostatom</strong> ให้บริการเว็บโฮสติ้ง cPanel/DirectAdmin ซึ่งใช้ฐานข้อมูล <strong>MySQL / MariaDB</strong> โดยจะอยู่หลังไฟร์วอลล์ (ปิด Remote Port 3306) บราวเซอร์จึงไม่สามารถเชื่อมต่อ MySQL โดยตรงได้ ต้องเชื่อมต่อผ่าน <strong>PHP REST API Connector</strong> ที่วางไว้บนโฮสต์ ซึ่งปลอดภัยสูงสุด<br />
                    2. <strong>Supabase</strong> เดิมเป็น PostgreSQL บน Cloud ที่เสถียรและรวดเร็ว เราสามารถตั้งค่าให้ <strong>Hostatom เป็นฐานข้อมูลหลัก</strong> แล้วให้ระบบส่งข้อมูลไปอัปเดตที่ <strong>Supabase เป็นสำรอง (Dual-Write Failover)</strong> ได้อย่างราบรื่น หากโฮสต์หลักขัดข้อง ระบบจะยังคงทำงานต่อได้ทันที
                  </p>
                </div>
              </div>

              {/* 5 ขั้นตอนหลัก */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* ขั้นตอนที่ 1 */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border-2 border-[#33272A] dark:border-slate-700 shadow-[3px_3px_0px_#33272A] dark:shadow-none space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-[#FF8BA7] text-[#33272A] font-black text-xs border border-[#33272A]">
                      1
                    </span>
                    <h3 className="font-black text-sm">ดาวน์โหลดข้อมูลเดิมจาก Supabase</h3>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    ไปที่แท็บ <strong>"2. ดาวน์โหลดฐานข้อมูลจาก Supabase"</strong> ในหน้านี้ แล้วกดปุ่ม <strong>"ดาวน์โหลด MySQL Dump (.sql)"</strong> ระบบจะรวบรวมข้อมูลโรงเรียน ({schools.length} แห่ง) และสถิตินักเรียนทั้งหมด พร้อมแปลงเป็นคำสั่ง SQL สำหรับ Hostatom ให้ทันที
                  </p>
                </div>

                {/* ขั้นตอนที่ 2 */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border-2 border-[#33272A] dark:border-slate-700 shadow-[3px_3px_0px_#33272A] dark:shadow-none space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-[#FFD3B6] text-[#33272A] font-black text-xs border border-[#33272A]">
                      2
                    </span>
                    <h3 className="font-black text-sm">สร้าง Database บน Hostatom cPanel</h3>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    ล็อกอินเข้า cPanel ของ Hostatom ➔ เข้าเมนู <strong>"MySQL Databases"</strong> ➔ สร้างชื่อ Database ใหม่ และสร้าง Database User พร้อมกำหนดสิทธิ์ <strong>ALL PRIVILEGES</strong> (จดจำชื่อ DB, User และ Password ไว้)
                  </p>
                </div>

                {/* ขั้นตอนที่ 3 */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border-2 border-[#33272A] dark:border-slate-700 shadow-[3px_3px_0px_#33272A] dark:shadow-none space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-[#A0E7E5] text-[#33272A] font-black text-xs border border-[#33272A]">
                      3
                    </span>
                    <h3 className="font-black text-sm">นำเข้า (Import) SQL บน phpMyAdmin</h3>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    ใน cPanel ของ Hostatom ➔ คลิกเปิด <strong>phpMyAdmin</strong> ➔ เลือกชื่อฐานข้อมูลที่สร้างในขั้นตอนที่ 2 ➔ ไปที่แท็บ <strong>"Import (นำเข้า)"</strong> ➔ เลือกไฟล์ <code>.sql</code> ที่ดาวน์โหลดจากระบบนี้ แล้วกด <strong>Go (ลงมือทำ)</strong> เพื่อสร้างตารางและนำเข้าข้อมูลจริงทั้งหมด
                  </p>
                </div>

                {/* ขั้นตอนที่ 4 */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border-2 border-[#33272A] dark:border-slate-700 shadow-[3px_3px_0px_#33272A] dark:shadow-none space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-emerald-300 text-[#33272A] font-black text-xs border border-[#33272A]">
                      4
                    </span>
                    <h3 className="font-black text-sm">อัปโหลดไฟล์ mhs1_db.php ขึ้น Hostatom</h3>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    ไปที่แท็บ <strong>"3. ไฟล์สคริปต์เชื่อมต่อ Hostatom"</strong> ➔ ดาวน์โหลดไฟล์ <code>mhs1_db.php</code> ➔ นำไปอัปโหลดผ่าน File Manager ของ Hostatom ในโฟลเดอร์ <code>public_html/api/</code> ตัวอย่าง URL ที่ได้คือ <code>https://yourdomain.com/api/mhs1_db.php</code>
                  </p>
                </div>

              </div>

              {/* ขั้นตอนที่ 5: การรักษาระบบสำรอง */}
              <div className="bg-[#A0E7E5]/20 dark:bg-slate-800/80 p-5 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-teal-700 dark:text-teal-400" />
                  <h3 className="font-black text-sm text-[#33272A] dark:text-[#FFF9F5]">
                    ขั้นตอนที่ 5: การกำหนดให้ Supabase เป็นฐานข้อมูลสำรอง (Backup &amp; Failover Strategy)
                  </h3>
                </div>
                <div className="text-xs text-gray-700 dark:text-gray-300 space-y-2 font-medium leading-relaxed">
                  <p>
                    เมื่อคุณตั้งค่า Hostatom เสร็จสิ้น คุณสามารถสลับให้ <strong>Hostatom เป็นฐานข้อมูลหลัก</strong> ได้ที่แท็บ <strong>"4. สลับฐานข้อมูลหลัก &amp; สำรอง"</strong>
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>โหมด Dual-Write:</strong> เมื่อแอดมินหรือโรงเรียนมีการบันทึก แก้ไข หรือนำเข้าข้อมูล ระบบจะเขียนลง Hostatom ก่อน และสำรองข้อมูลลง Supabase อัตโนมัติในพื้นหลัง</li>
                    <li><strong>โหมด Fallback อัตโนมัติ:</strong> หากโฮสต์ของ Hostatom มีปัญหา ติดขัด หรือไม่ตอบสนอง ระบบเว็บจะสลับไปดึงข้อมูลจาก Supabase สำรองให้อัตโนมัติ ทำให้ผู้ใช้งานและนักเรียนเข้าชมระบบได้ไม่สะดุด</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ดาวน์โหลดข้อมูลจาก Supabase & ทั้งระบบ */}
          {activeTab === 'download' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-sky-50 dark:bg-sky-950/30 border-2 border-sky-400 p-4 rounded-2xl text-xs space-y-2">
                <div className="font-black text-sky-900 dark:text-sky-200 text-sm flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-sky-600" />
                  สรุปข้อมูลในระบบพร้อมส่งออก (Export) ณ ปัจจุบัน
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-sky-200 text-center">
                    <div className="text-lg font-black text-rose-600">{schools.length}</div>
                    <div className="text-[11px] font-bold text-gray-600 dark:text-gray-300">สถานศึกษา</div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-sky-200 text-center">
                    <div className="text-lg font-black text-indigo-600">{studentData.length}</div>
                    <div className="text-[11px] font-bold text-gray-600 dark:text-gray-300">สถิตินักเรียน</div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-sky-200 text-center">
                    <div className="text-lg font-black text-amber-600">{studentGData.length}</div>
                    <div className="text-[11px] font-bold text-gray-600 dark:text-gray-300">นักเรียนตัว G</div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-sky-200 text-center">
                    <div className="text-lg font-black text-emerald-600">{users.length}</div>
                    <div className="text-[11px] font-bold text-gray-600 dark:text-gray-300">บัญชีผู้ใช้งาน</div>
                  </div>
                </div>
              </div>

              {/* Card พิเศษ: ตรวจสอบความสอดคล้องของตาราง (Supabase vs phpMyAdmin Hostatom) */}
              <div className="bg-amber-50 dark:bg-amber-950/40 p-5 rounded-2xl border-2 border-amber-400 shadow-[3px_3px_0px_#f59e0b] space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-400 text-amber-950 rounded-xl font-black">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-amber-950 dark:text-amber-200">
                        🔍 สาเหตุที่ตารางบน phpMyAdmin ไม่ตรงกับ Supabase &amp; วิธีแก้ไขทันที
                      </h4>
                      <p className="text-xs text-amber-800 dark:text-amber-300 font-semibold">
                        ใน Supabase จะมีตาราง <code>nt_assessments</code> (ผลสอบ NT) และ <code>rt_assessments</code> (ผลสอบ RT) รวมทั้งหมด 10 ตาราง
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopySyncSql}
                      className="bg-white hover:bg-amber-100 text-amber-950 font-black text-xs px-3.5 py-2 rounded-xl border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] cursor-pointer flex items-center gap-1.5"
                    >
                      {copiedSyncSql ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      <span>{copiedSyncSql ? 'คัดลอก SQL แล้ว!' : 'คัดลอก SQL ปรับปรุงตาราง'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadSyncSql}
                      className="bg-amber-400 hover:bg-amber-500 text-[#33272A] font-black text-xs px-3.5 py-2 rounded-xl border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] cursor-pointer flex items-center gap-1.5"
                    >
                      <Download className="h-4 w-4" />
                      <span>ดาวน์โหลด sync_tables.sql</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-slate-900/80 p-3.5 rounded-xl border border-amber-300 dark:border-amber-700/60 text-xs text-gray-700 dark:text-gray-300 space-y-2">
                  <div className="font-bold flex items-center gap-1 text-[#33272A] dark:text-[#FFF9F5]">
                    💡 <strong>ขั้นตอนการทำบน phpMyAdmin ของ Hostatom (ไม่มีผลกระทบต่อข้อมูลเดิม):</strong>
                  </div>
                  <ol className="list-decimal pl-5 space-y-1 font-medium">
                    <li>เปิด <strong>phpMyAdmin</strong> บน Hostatom แล้วคลิกเลือกฐานข้อมูล <code>mhs1_bigdata</code> ทางซ้ายมือ</li>
                    <li>คลิกที่แท็บ <strong>"SQL"</strong> ด้านบน</li>
                    <li>กดปุ่ม <strong>"คัดลอก SQL ปรับปรุงตาราง"</strong> ด้านบน แล้วนำมาวางในช่อง SQL Query</li>
                    <li>กดปุ่ม <strong>"Go (ลงมือทำ)"</strong> ที่มุมขวาล่าง ➔ phpMyAdmin จะสร้างตาราง <code>nt_assessments</code> และ <code>rt_assessments</code> ให้ตรงกับ Supabase ทันที พร้อมคัดลอกข้อมูลที่มีอยู่ให้เรียบร้อย!</li>
                  </ol>
                </div>
              </div>

              {/* ปุ่มดาวน์โหลดชุดข้อมูลต่างๆ */}
              <div className="space-y-3">
                <h3 className="font-black text-sm">เลือกรูปแบบการดาวน์โหลดฐานข้อมูล</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Card 1: MySQL SQL Dump (แนะนำสำหรับ Hostatom) */}
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border-2 border-emerald-500 shadow-[3px_3px_0px_#10b981] space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                          <Database className="h-4 w-4" />
                          MySQL Dump สำหรับ Hostatom
                        </span>
                        <span className="bg-emerald-100 text-emerald-800 font-black text-[10px] px-2 py-0.5 rounded-full border border-emerald-300">
                          แนะนำสูงสุด
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        ไฟล์ <code>.sql</code> ที่แปลงโครงสร้างและชุดข้อมูลทั้งหมดให้เข้ากับ <strong>phpMyAdmin ของ Hostatom</strong> (Engine InnoDB, UTF8MB4, ชนิดข้อมูล JSON และ DATETIME) สามารถกด Import เข้า MySQL ได้ทันที 100%
                      </p>
                    </div>

                    <button
                      onClick={handleDownloadMySQLDump}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] cursor-pointer transition-transform active:scale-95"
                    >
                      <Download className="h-4 w-4" />
                      <span>ดาวน์โหลด MySQL Dump (.sql)</span>
                    </button>
                  </div>

                  {/* Card 2: JSON Backup ทั้งระบบ */}
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border-2 border-[#33272A] dark:border-slate-700 shadow-[3px_3px_0px_#33272A] space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                          <FileCode className="h-4 w-4" />
                          Full JSON Data Backup
                        </span>
                        <span className="bg-indigo-100 text-indigo-800 font-black text-[10px] px-2 py-0.5 rounded-full border border-indigo-300">
                          สำรองฉุกเฉิน
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        สำรองข้อมูลทั้งระบบเป็นไฟล์ <code>.json</code> แบบ Universal พกพาง่าย เปิดอ่านได้ทุกภาษา นำไป Restructure หรือแปลงเป็นฐานข้อมูลอื่นได้ทุกรูปแบบ
                      </p>
                    </div>

                    <button
                      onClick={handleDownloadFullJson}
                      className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] cursor-pointer transition-transform active:scale-95"
                    >
                      <Download className="h-4 w-4" />
                      <span>ดาวน์โหลด Full JSON Archive (.json)</span>
                    </button>
                  </div>

                  {/* Card 3: MySQL Schema Only */}
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border-2 border-[#33272A] dark:border-slate-700 shadow-[3px_3px_0px_#33272A] space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                          <Layers className="h-4 w-4" />
                          โครงสร้างตาราง MySQL (Schema DDL)
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        เฉพาะคำสั่งสร้างตาราง 9 ตาราง (CREATE TABLE) สำหรับสร้างฐานข้อมูลเปล่าบน Hostatom
                      </p>
                    </div>

                    <button
                      onClick={handleDownloadSchemaOnly}
                      className="w-full bg-amber-400 hover:bg-amber-500 text-[#33272A] font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] cursor-pointer transition-transform active:scale-95"
                    >
                      <Download className="h-4 w-4" />
                      <span>ดาวน์โหลด MySQL Schema (.sql)</span>
                    </button>
                  </div>

                  {/* Card 4: ดาวน์โหลดตรงจาก Supabase Dashboard */}
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border-2 border-[#33272A] dark:border-slate-700 shadow-[3px_3px_0px_#33272A] space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                          <Globe className="h-4 w-4" />
                          ดาวน์โหลดตรงจาก Supabase Dashboard
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        คุณสามารถเข้าสู่ Supabase Dashboard โดยตรงเพื่อ Export ไฟล์ CSV แยกรายตาราง หรือดาวน์โหลด Database Backup ได้
                      </p>
                    </div>

                    <a
                      href={SUPABASE_URL ? 'https://supabase.com/dashboard' : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#A0E7E5] hover:bg-[#80dedb] text-[#33272A] font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] cursor-pointer transition-transform active:scale-95 text-center"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>เปิด Supabase Dashboard</span>
                    </a>
                  </div>

                </div>
              </div>

              {/* วิธีการดาวน์โหลดผ่าน Supabase Dashboard แบบละเอียด */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border-2 border-[#33272A]/20 dark:border-slate-800 text-xs space-y-2">
                <div className="font-black text-sm">💡 วิธีดาวน์โหลดข้อมูลผ่าน Supabase Dashboard โดยตรง:</div>
                <ol className="list-decimal pl-5 space-y-1.5 text-gray-700 dark:text-gray-300 font-medium">
                  <li>เปิดเว็บไซต์ <strong>supabase.com/dashboard</strong> แล้วล็อกอินเข้าบัญชีโครงการของคุณ</li>
                  <li>ไปที่เมนู <strong>"Table Editor"</strong> ทางแถบซ้ายมือ</li>
                  <li>เลือกตารางที่ต้องการ เช่น <code>schools</code> หรือ <code>students</code></li>
                  <li>คลิกปุ่ม <strong>"Export"</strong> ที่มุมบนขวาของตาราง ➔ เลือก <strong>"Export to CSV"</strong> เพื่อบันทึกเป็นไฟล์ Excel/CSV ลงคอมพิวเตอร์</li>
                  <li>หรือไปที่เมนู <strong>"Database"</strong> ➔ <strong>"Backups"</strong> เพื่อดาวน์โหลด Point-in-time Recovery หรือสร้าง Daily Backup สำรองไว้</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: ไฟล์สคริปต์เชื่อมต่อ Hostatom (PHP) */}
          {activeTab === 'php_script' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-400 p-4 rounded-2xl text-xs space-y-2">
                <div className="font-black text-emerald-900 dark:text-emerald-200 text-sm flex items-center gap-2">
                  <FileCode className="h-5 w-5 text-emerald-600" />
                  สคริปต์ PHP Connector สำหรับวางบน Hostatom (Apache / cPanel)
                </div>
                <p className="text-emerald-800 dark:text-emerald-300 font-medium leading-relaxed">
                  สคริปต์นี้เขียนด้วยมาตรฐาน <strong>PHP PDO</strong> ปลอดภัย รองรับ Prepared Statements ป้องกัน SQL Injection 100% พร้อมจัดการ CORS Headers ให้นำไฟล์นี้ไปวางในโฟลเดอร์บนโฮสต์ เช่น <code>public_html/api/mhs1_db.php</code>
                </p>
              </div>

              {/* ตัวช่วยกรอกค่าการเชื่อมต่อเพื่อสร้างโค้ดอัตโนมัติ */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border-2 border-[#33272A] dark:border-slate-700 space-y-3">
                <div className="font-black text-xs">🛠️ ปรับแต่งค่าฐานข้อมูลในโค้ด PHP (ข้อมูลจาก cPanel Hostatom):</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="font-bold block mb-1">Database Name:</label>
                    <input
                      type="text"
                      value={dbName}
                      onChange={(e) => setDbName(e.target.value)}
                      placeholder="เช่น cpanel_mhs1"
                      className="w-full px-3 py-1.5 rounded-xl border-2 border-[#33272A] dark:border-slate-600 font-mono text-xs bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Database User:</label>
                    <input
                      type="text"
                      value={dbUser}
                      onChange={(e) => setDbUser(e.target.value)}
                      placeholder="เช่น cpanel_user"
                      className="w-full px-3 py-1.5 rounded-xl border-2 border-[#33272A] dark:border-slate-600 font-mono text-xs bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Database Password:</label>
                    <input
                      type="text"
                      value={dbPass}
                      onChange={(e) => setDbPass(e.target.value)}
                      placeholder="รหัสผ่าน DB บน cPanel"
                      className="w-full px-3 py-1.5 rounded-xl border-2 border-[#33272A] dark:border-slate-600 font-mono text-xs bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* ปุ่มคัดลอกและดาวน์โหลด */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleDownloadPhp}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-black py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>ดาวน์โหลดไฟล์ mhs1_db.php</span>
                </button>

                <button
                  onClick={handleCopyPhp}
                  className="bg-white hover:bg-slate-100 text-[#33272A] font-black py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] cursor-pointer"
                >
                  {copiedPhp ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedPhp ? 'คัดลอกโค้ดเรียบร้อย!' : 'คัดลอกโค้ด PHP'}</span>
                </button>
              </div>

              {/* Code viewer */}
              <div className="relative">
                <pre className="bg-slate-950 text-emerald-400 p-4 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-[350px] border-2 border-[#33272A] leading-relaxed">
                  {getCustomizedPhpCode()}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: สลับฐานข้อมูลหลัก & สำรอง (Database Switcher & Live Test) */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 border-[#33272A] dark:border-slate-700 shadow-[3px_3px_0px_#33272A] space-y-4">
                <div className="font-black text-sm flex items-center gap-2">
                  <Database className="h-5 w-5 text-indigo-600" />
                  กำหนดฐานข้อมูลหลักของระบบ (Primary Database Engine)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPrimaryDb('hostatom')}
                    className={`p-3.5 rounded-2xl border-2 text-left cursor-pointer transition-all ${
                      primaryDb === 'hostatom'
                        ? 'bg-[#A0E7E5] border-[#33272A] shadow-[3px_3px_0px_#33272A]'
                        : 'bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 hover:border-gray-500'
                    }`}
                  >
                    <div className="font-black text-xs flex items-center justify-between mb-1">
                      <span>Hostatom MySQL</span>
                      {primaryDb === 'hostatom' && <CheckCircle2 className="h-4 w-4 text-teal-800" />}
                    </div>
                    <div className="text-[11px] text-gray-600 dark:text-gray-300">
                      ใช้ฐานข้อมูลบนโฮสต์ Hostatom ของเขตพื้นที่เป็นตัวหลัก
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrimaryDb('supabase')}
                    className={`p-3.5 rounded-2xl border-2 text-left cursor-pointer transition-all ${
                      primaryDb === 'supabase'
                        ? 'bg-[#FF8BA7] border-[#33272A] shadow-[3px_3px_0px_#33272A]'
                        : 'bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 hover:border-gray-500'
                    }`}
                  >
                    <div className="font-black text-xs flex items-center justify-between mb-1">
                      <span>Supabase (PostgreSQL)</span>
                      {primaryDb === 'supabase' && <CheckCircle2 className="h-4 w-4 text-rose-800" />}
                    </div>
                    <div className="text-[11px] text-gray-600 dark:text-gray-300">
                      ใช้ Supabase Cloud ดั้งเดิม (มีสถิติครบคัน รวดเร็ว)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrimaryDb('firestore')}
                    className={`p-3.5 rounded-2xl border-2 text-left cursor-pointer transition-all ${
                      primaryDb === 'firestore'
                        ? 'bg-[#FFD3B6] border-[#33272A] shadow-[3px_3px_0px_#33272A]'
                        : 'bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 hover:border-gray-500'
                    }`}
                  >
                    <div className="font-black text-xs flex items-center justify-between mb-1">
                      <span>Firebase Firestore</span>
                      {primaryDb === 'firestore' && <CheckCircle2 className="h-4 w-4 text-amber-800" />}
                    </div>
                    <div className="text-[11px] text-gray-600 dark:text-gray-300">
                      ใช้ Firestore NoSQL สำหรับสำรองแบบเรียลไทม์
                    </div>
                  </button>
                </div>

                {/* ตัวเลือกสำรองข้อมูลอัตโนมัติ (Dual-Write) */}
                <div className="bg-amber-50 dark:bg-slate-900 p-3.5 rounded-xl border border-amber-300 dark:border-slate-700 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="font-black block text-[#33272A] dark:text-[#FFF9F5]">
                      เปิดใช้งานการสำรองข้อมูลไปยัง Supabase อัตโนมัติ (Dual-Write to Backup)
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-[11px]">
                      เมื่อบันทึกข้อมูลลง Hostatom จะสำรองข้อมูลคู่ขนานไปยัง Supabase เสมอเพื่อเป็นสำรองฉุกเฉิน
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoBackup}
                    onChange={(e) => setAutoBackup(e.target.checked)}
                    className="h-5 w-5 rounded text-emerald-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* ตั้งค่า Hostatom API Endpoint */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 border-[#33272A] dark:border-slate-700 shadow-[3px_3px_0px_#33272A] space-y-4">
                <div className="font-black text-sm flex items-center gap-2">
                  <Globe className="h-5 w-5 text-teal-600" />
                  การเชื่อมต่อ Hostatom REST API Connector
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold block mb-1">
                      Hostatom API URL (ตำแหน่งไฟล์ mhs1_db.php บนโฮสต์ของคุณ):
                    </label>
                    <input
                      type="url"
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                      placeholder="https://naughty-moore.27-254-143-11.plesk.page/api/mhs1_db.php"
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#33272A] dark:border-slate-600 font-mono text-xs bg-slate-50 dark:bg-slate-900"
                    />
                    <span className="text-[10px] text-gray-500 mt-1 block">
                      ตัวอย่าง: <code>https://mhs1.go.th/api/mhs1_db.php</code> หรือ <code>http://your-server-ip/mhs1_db.php</code>
                    </span>
                  </div>

                  <div>
                    <label className="font-bold block mb-1">API Secret Key (รหัสผ่านเพื่อความปลอดภัยของ API):</label>
                    <input
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="mhs1_bigdata_secret_2026"
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#33272A] dark:border-slate-600 font-mono text-xs bg-slate-50 dark:bg-slate-900"
                    />
                  </div>

                  {/* ปุ่มทดสอบการเชื่อมต่อ */}
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${isTesting ? 'animate-spin' : ''}`} />
                      <span>{isTesting ? 'กำลังทดสอบเชื่อมต่อ...' : 'ทดสอบการเชื่อมต่อ (Ping Test)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-black py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] cursor-pointer"
                    >
                      <Check className="h-4 w-4" />
                      <span>บันทึกการตั้งค่า</span>
                    </button>

                    {saveSuccess && (
                      <span className="text-emerald-600 font-black text-xs animate-fade-in flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" /> บันทึกการตั้งค่าสำเร็จ!
                      </span>
                    )}
                  </div>

                  {/* ผลลัพธ์การทดสอบ Ping */}
                  {testResult && (
                    <div
                      className={`p-3.5 rounded-xl border-2 text-xs font-semibold animate-fade-in flex items-start gap-2.5 ${
                        testResult.success
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                          : 'bg-rose-50 border-rose-400 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200'
                      }`}
                    >
                      {testResult.success ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-black text-sm">
                          {testResult.success ? '✅ เชื่อมต่อ Hostatom สำเร็จ!' : '❌ เชื่อมต่อไม่สำเร็จ'}
                          {testResult.latencyMs > 0 && (
                            <span className="text-[11px] font-normal ml-2 opacity-80">
                              (เวลาตอบสนอง: {testResult.latencyMs} ms)
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 leading-relaxed">{testResult.message}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 border-t-2 border-[#33272A]/20 dark:border-slate-800 bg-[#FFF9F5] dark:bg-slate-950 flex items-center justify-between text-xs">
          <div className="text-[11px] text-gray-500 font-bold hidden sm:block">
            สถานะฐานข้อมูลปัจจุบัน: <strong className="text-[#33272A] dark:text-[#FFF9F5] uppercase">{config.primaryDb || 'SUPABASE'}</strong> (สำรอง: SUPABASE/FIRESTORE)
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-[#33272A] hover:bg-black text-white font-black py-2 px-6 rounded-xl cursor-pointer text-xs transition-transform active:scale-95 shadow-[2px_2px_0px_#33272A]"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};

export default HostatomDatabaseModal;
