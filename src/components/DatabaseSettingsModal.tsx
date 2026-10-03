import React, { useState, useMemo } from 'react';
import { School, DatabaseConfig, DatabaseSourceType } from '../types';
import { 
  getDatabaseConfig, 
  saveDatabaseConfig, 
  testHostatomConnection, 
  generateHostatomMySQLScript, 
  generateHostatomPhpApiScript 
} from '../services/dbManager';
import { 
  X, 
  Database, 
  Server, 
  Flame, 
  HardDrive, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  Code2, 
  FileCode,
  ShieldCheck
} from 'lucide-react';

interface DatabaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  onConfigChange: (newConfig: DatabaseConfig) => void;
}

export const DatabaseSettingsModal: React.FC<DatabaseSettingsModalProps> = ({
  isOpen,
  onClose,
  schools,
  onConfigChange,
}) => {
  const [activeTab, setActiveTab] = useState<'source' | 'export_sql' | 'php_api' | 'guide'>('source');
  const [config, setConfig] = useState<DatabaseConfig>(getDatabaseConfig());
  
  // Hostatom test state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; recordCount?: number } | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const mysqlScript = useMemo(() => {
    return generateHostatomMySQLScript(schools);
  }, [schools]);

  const phpApiScript = useMemo(() => {
    return generateHostatomPhpApiScript();
  }, []);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testHostatomConnection(config.hostatom.apiUrl, config.hostatom.apiKey);
      setTestResult(res);
      if (res.success) {
        const updated = {
          ...config,
          hostatom: {
            ...config.hostatom,
            isConnected: true,
            lastSynced: new Date().toISOString(),
          },
        };
        setConfig(updated);
        saveDatabaseConfig(updated);
        onConfigChange(updated);
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleSelectPrimarySource = (source: DatabaseSourceType) => {
    const updated: DatabaseConfig = {
      ...config,
      primarySource: source,
    };
    setConfig(updated);
    saveDatabaseConfig(updated);
    onConfigChange(updated);
  };

  const handleSaveHostatomSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveDatabaseConfig(config);
    onConfigChange(config);
    setTestResult({
      success: true,
      message: 'บันทึกการตั้งค่าฐานข้อมูลเรียบร้อยแล้ว',
    });
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border-2 border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-xs font-bold border border-blue-400">
                Database Manager & Migration
              </span>
              <span className="text-xs text-slate-300">
                ปัจจุบัน: <strong>{config.primarySource === 'hostatom' ? 'Hostatom MySQL' : config.primarySource === 'firebase' ? 'Firebase Firestore' : 'Local Data'}</strong>
              </span>
            </div>
            <h2 className="text-xl font-extrabold mt-1.5 flex items-center gap-2.5">
              <Database className="w-5 h-5 text-blue-400" />
              <span>ระบบจัดการและเลือกฐานข้อมูลหลัก (เชื่อมต่อ Hostatom)</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-100 px-6 gap-2 shrink-0 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('source')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'source'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>เลือกฐานข้อมูลหลัก & ตั้งค่า Hostatom</span>
          </button>

          <button
            onClick={() => setActiveTab('export_sql')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'export_sql'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>สคริปต์ MySQL Dump ({schools.length} แห่ง)</span>
          </button>

          <button
            onClick={() => setActiveTab('php_api')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'php_api'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>ไฟล์ API Connector (PHP)</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'guide'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>ขั้นตอนการย้ายข้อมูลไป Hostatom</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: Source & Hostatom Settings */}
          {activeTab === 'source' && (
            <div className="space-y-6">
              {/* Database Source Selector Cards */}
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 mb-3">
                  เลือกฐานข้อมูลที่ต้องการใช้งานเป็น "ฐานข้อมูลหลัก" ของระบบ:
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* Option 1: Hostatom */}
                  <div
                    onClick={() => handleSelectPrimarySource('hostatom')}
                    className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                      config.primarySource === 'hostatom'
                        ? 'border-blue-600 bg-blue-50/70 shadow-md ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                          <Server className="w-5 h-5" />
                        </span>
                        {config.primarySource === 'hostatom' && (
                          <span className="px-2.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                            ฐานข้อมูลหลัก
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm">
                        Hostatom MySQL
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        เว็บโฮสติ้ง Hostatom ผ่าน REST API Connector (PHP/PDO)
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-[11px]">
                      <span className={config.hostatom.isConnected ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                        {config.hostatom.isConnected ? '● เชื่อมต่อสำเร็จ' : '○ รอการตั้งค่า'}
                      </span>
                      <span className="font-bold text-blue-700">คลิกเลือก</span>
                    </div>
                  </div>

                  {/* Option 2: Firebase Firestore */}
                  <div
                    onClick={() => handleSelectPrimarySource('firebase')}
                    className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                      config.primarySource === 'firebase'
                        ? 'border-amber-600 bg-amber-50/70 shadow-md ring-2 ring-amber-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="p-2 rounded-xl bg-amber-600 text-white shadow-xs">
                          <Flame className="w-5 h-5" />
                        </span>
                        {config.primarySource === 'firebase' && (
                          <span className="px-2.5 py-0.5 bg-amber-600 text-white text-[10px] font-bold rounded-full">
                            ฐานข้อมูลหลัก
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm">
                        Firebase Cloud DB
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Google Cloud Firestore Database จัดเก็บข้อมูลอัตโนมัติ
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-[11px]">
                      <span className="text-emerald-700 font-bold">● พร้อมใช้งาน</span>
                      <span className="font-bold text-amber-700">คลิกเลือก</span>
                    </div>
                  </div>

                  {/* Option 3: Local Storage / Built-in Data */}
                  <div
                    onClick={() => handleSelectPrimarySource('local')}
                    className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                      config.primarySource === 'local'
                        ? 'border-slate-800 bg-slate-100 shadow-md ring-2 ring-slate-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="p-2 rounded-xl bg-slate-800 text-white shadow-xs">
                          <HardDrive className="w-5 h-5" />
                        </span>
                        {config.primarySource === 'local' && (
                          <span className="px-2.5 py-0.5 bg-slate-800 text-white text-[10px] font-bold rounded-full">
                            ฐานข้อมูลหลัก
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm">
                        Local Database (ออฟไลน์)
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        ชุดข้อมูลเริ่มต้น 131 สถานศึกษา + แคชหน่วยความจำในเครื่อง
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-[11px]">
                      <span className="text-emerald-700 font-bold">● ข้อมูลครบ 131 แห่ง</span>
                      <span className="font-bold text-slate-800">คลิกเลือก</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hostatom Settings Form */}
              <div className="bg-slate-50 rounded-2xl p-5 border-2 border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <Server className="w-4 h-4 text-blue-600" />
                    <span>การตั้งค่าเชื่อมต่อ Hostatom REST API (โฮสต์ของคุณ)</span>
                  </h4>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md">
                    Hostatom Hosting
                  </span>
                </div>

                <form onSubmit={handleSaveHostatomSettings} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      API Endpoint URL บน Hostatom <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={config.hostatom.apiUrl}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          hostatom: { ...config.hostatom, apiUrl: e.target.value },
                        })
                      }
                      placeholder="เช่น https://yourdomain.com/api.php หรือ https://mhs1.yourdomain.com/api.php"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      URL ของไฟล์ PHP API ที่คุณอัปโหลดไปไว้ที่ Hostatom (ดูโค้ดไฟล์ที่แท็บ "ไฟล์ API Connector")
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        API Key (ถ้ามีการตั้งค่าป้องกัน)
                      </label>
                      <input
                        type="text"
                        value={config.hostatom.apiKey || ''}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            hostatom: { ...config.hostatom, apiKey: e.target.value },
                          })
                        }
                        placeholder="ไม่บังคับใส่ (เว้นว่างได้)"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ชื่อฐานข้อมูลบน Hostatom
                      </label>
                      <input
                        type="text"
                        value={config.hostatom.databaseName}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            hostatom: { ...config.hostatom, databaseName: e.target.value },
                          })
                        }
                        placeholder="mhs1_bigdata"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Test Feedback */}
                  {testResult && (
                    <div
                      className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 border ${
                        testResult.success
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                          : 'bg-rose-50 text-rose-900 border-rose-300'
                      }`}
                    >
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-bold">{testResult.message}</p>
                        {testResult.recordCount !== undefined && (
                          <p className="mt-0.5 text-emerald-800">
                            ตรวจพบข้อมูลสถานศึกษาในฐานข้อมูล Hostatom ทั้งหมด: <strong>{testResult.recordCount}</strong> แห่ง
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isTesting || !config.hostatom.apiUrl}
                      onClick={handleTestConnection}
                      className="px-4 py-2 bg-white border-2 border-blue-600 hover:bg-blue-50 text-blue-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                      <span>{isTesting ? 'กำลังทดสอบการเชื่อมต่อ...' : 'ทดสอบการเชื่อมต่อ (Ping)'}</span>
                    </button>

                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                    >
                      บันทึกการตั้งค่า Hostatom
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: MySQL Export Dump */}
          {activeTab === 'export_sql' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-50 p-4 rounded-2xl border border-blue-200">
                <div>
                  <h4 className="font-extrabold text-blue-900 text-sm">
                    ชุดคำสั่ง SQL (MySQL Dump) พร้อมข้อมูล 131 สถานศึกษา
                  </h4>
                  <p className="text-xs text-blue-700 mt-0.5">
                    สามารถนำไฟล์นี้ไปกด Import ผ่าน phpMyAdmin บนระบบของ Hostatom ได้ทันที
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(mysqlScript, 'sql')}
                    className="px-3.5 py-1.5 bg-white border border-blue-300 text-blue-800 hover:bg-blue-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedType === 'sql' ? 'คัดลอกแล้ว!' : 'คัดลอก SQL'}</span>
                  </button>

                  <button
                    onClick={() => downloadFile(mysqlScript, 'mhs1_hostatom_dump.sql', 'application/sql')}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ดาวน์โหลดไฟล์ .sql</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <textarea
                  readOnly
                  value={mysqlScript}
                  rows={14}
                  className="w-full p-4 bg-slate-900 text-slate-100 rounded-2xl font-mono text-xs border border-slate-700 focus:outline-none leading-relaxed select-all"
                />
              </div>
            </div>
          )}

          {/* TAB 3: PHP API Script */}
          {activeTab === 'php_api' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50 p-4 rounded-2xl border border-indigo-200">
                <div>
                  <h4 className="font-extrabold text-indigo-900 text-sm">
                    ไฟล์ PHP Connector (api.php) สำหรับวางบน Hostatom
                  </h4>
                  <p className="text-xs text-indigo-700 mt-0.5">
                    นำไฟล์นี้ไปวางในไดเรกทอรี public_html ของ Hostatom เพื่อให้เว็บแอปพลิเคชันเชื่อมต่อไปยัง MySQL ได้
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(phpApiScript, 'php')}
                    className="px-3.5 py-1.5 bg-white border border-indigo-300 text-indigo-800 hover:bg-indigo-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedType === 'php' ? 'คัดลอกแล้ว!' : 'คัดลอกโค้ด PHP'}</span>
                  </button>

                  <button
                    onClick={() => downloadFile(phpApiScript, 'api.php', 'application/x-php')}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ดาวน์โหลด api.php</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <textarea
                  readOnly
                  value={phpApiScript}
                  rows={14}
                  className="w-full p-4 bg-slate-900 text-slate-100 rounded-2xl font-mono text-xs border border-slate-700 focus:outline-none leading-relaxed select-all"
                />
              </div>
            </div>
          )}

          {/* TAB 4: Step-by-Step Guide */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-slate-700">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900">
                <h4 className="font-extrabold text-sm mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>คู่มือแนะนำขั้นตอนการย้ายฐานข้อมูลไปยัง Hostatom ทีละขั้นตอน</span>
                </h4>
                <p>ทำตาม 5 ขั้นตอนด้านล่างนี้เพื่อเชื่อมโยงระบบเข้ากับโฮสติ้ง Hostatom อย่างสมบูรณ์</p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-white border-2 border-slate-200 rounded-xl flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900">เข้าสู่ระบบ Hostatom (cPanel หรือ DirectAdmin)</h5>
                    <p className="text-slate-500 mt-0.5">
                      ล็อกอินเข้าจัดการโฮสต์ของคุณที่ Hostatom ไปที่เมนู <strong>MySQL Management / Databases</strong> แล้วสร้างฐานข้อมูลใหม่ เช่น <code>mhs1_bigdata</code> พร้อมสร้าง User และรหัสผ่าน
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-white border-2 border-slate-200 rounded-xl flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900">นำเข้าโครงสร้างและข้อมูลสถานศึกษา (phpMyAdmin)</h5>
                    <p className="text-slate-500 mt-0.5">
                      เปิด phpMyAdmin เลือกฐานข้อมูลที่เพิ่งสร้าง แล้วกดปุ่ม <strong>Import</strong> เลือกไฟล์ <code>mhs1_hostatom_dump.sql</code> ที่ดาวน์โหลดจากแท็บ "สคริปต์ MySQL Dump" เพื่อนำเข้าตารางและข้อมูลสถานศึกษา 131 แห่ง
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-white border-2 border-slate-200 rounded-xl flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900">อัปโหลดไฟล์ api.php ขึ้นสู่ Hostatom</h5>
                    <p className="text-slate-500 mt-0.5">
                      ดาวน์โหลดไฟล์ <code>api.php</code> จากแท็บ "ไฟล์ API Connector" แก้ไขชื่อฐานข้อมูล, ผู้ใช้, และรหัสผ่านให้ตรงกับ Hostatom แล้วอัปโหลดไปไว้ที่โฟลเดอร์ <code>public_html/</code> ผ่าน File Manager หรือ FTP
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-white border-2 border-slate-200 rounded-xl flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    4
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900">เชื่อมต่อและทดสอบบนแอปพลิเคชันนี้</h5>
                    <p className="text-slate-500 mt-0.5">
                      กลับมาที่หน้านี้ กรอก URL เช่น <code>https://yourdomain.com/api.php</code> แล้วกดปุ่ม <strong>"ทดสอบการเชื่อมต่อ (Ping)"</strong> เมื่อระบบรายงานสถานะเชื่อมต่อสำเร็จ ให้เลือก <strong>"Hostatom MySQL"</strong> เป็นฐานข้อมูลหลัก
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            สถานะปัจจุบัน: ฐานข้อมูลหลักคือ <strong className="text-slate-800">{config.primarySource === 'hostatom' ? 'Hostatom' : config.primarySource === 'firebase' ? 'Firebase' : 'Local'}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-xs"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
