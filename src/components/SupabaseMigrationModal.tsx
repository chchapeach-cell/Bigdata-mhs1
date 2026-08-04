import React, { useState } from 'react';
import { Database, Copy, Check, ExternalLink, Download, Upload, Shield, AlertTriangle, Key, Server } from 'lucide-react';
import { isSupabaseConfigured, SUPABASE_SCHEMA_SQL } from '../lib/supabase';

interface SupabaseMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: any[];
  studentData: any[];
  studentGData: any[];
  systemConfig: any;
}

export const SupabaseMigrationModal: React.FC<SupabaseMigrationModalProps> = ({
  isOpen,
  onClose,
  schools,
  studentData,
  studentGData,
  systemConfig
}) => {
  const [copied, setCopied] = useState(false);
  const env = (import.meta as any).env || {};
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('override_supabase_url') || env.VITE_SUPABASE_URL || '');
  const [supabaseKey, setSupabaseKey] = useState(localStorage.getItem('override_supabase_anon_key') || env.VITE_SUPABASE_ANON_KEY || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSaveCredentials = () => {
    if (supabaseUrl.trim()) {
      localStorage.setItem('override_supabase_url', supabaseUrl.trim());
    } else {
      localStorage.removeItem('override_supabase_url');
    }

    if (supabaseKey.trim()) {
      localStorage.setItem('override_supabase_anon_key', supabaseKey.trim());
    } else {
      localStorage.removeItem('override_supabase_anon_key');
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      window.location.reload();
    }, 1500);
  };

  const handleExportJSONData = () => {
    const backupObj = {
      exportDate: new Date().toISOString(),
      schoolsCount: schools.length,
      studentsCount: studentData.length,
      studentsGCount: studentGData.length,
      systemConfig,
      schools,
      studentData,
      studentGData
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `mhs_database_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold p-2"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              คู่มือและเครื่องมือเตรียมพร้อมย้ายไป Supabase
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              ลดโควตาอ่านเขียนและประหยัดค่าใช้จ่ายด้วยระบบ PostgreSQL บน Supabase
            </p>
          </div>
        </div>

        <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300">
          {/* Status Badge */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            isSupabaseConfigured()
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
          }`}>
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 shrink-0" />
              <div>
                <div className="font-semibold">
                  สถานะการเชื่อมต่อปัจจุบัน: {isSupabaseConfigured() ? 'เชื่อมต่อ Supabase แล้ว' : 'ใช้ Firebase Firestore (ยังไม่ได้ตั้งค่า Supabase)'}
                </div>
                <div className="text-xs opacity-80 mt-0.5">
                  {isSupabaseConfigured() ? 'ระบบประมวลผลผ่าน Supabase Database' : 'สามารถใช้งาน Firebase หรือสลับมา Supabase ได้ตลอดเวลา'}
                </div>
              </div>
            </div>
          </div>

          {/* Step 1 */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">1</span>
              สร้างโครงการบน Supabase (ฟรี 500 MB / 50,000 อ่านต่อวัน)
            </h3>
            <p className="mb-3 text-slate-500 dark:text-slate-400">
              ไปที่ <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline font-medium inline-flex items-center gap-1">supabase.com <ExternalLink className="w-3 h-3" /></a> แล้วกดสมัครใช้งานสร้าง Project ใหม่ฟรี
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">2</span>
                สร้างตารางฐานข้อมูลอัตโนมัติ (SQL Schema Script)
              </h3>
              <button
                onClick={handleCopySQL}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'คัดลอก SQL แล้ว!' : 'คัดลอกคำสั่ง SQL'}
              </button>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-2">
              นำคำสั่ง SQL ไปวางที่ Supabase Dashboard &rarr; <b>SQL Editor</b> แล้วกด <b>Run</b> เพื่อสร้างตารางทั้งหมดทันที
            </p>
            <div className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-xs font-mono max-h-32 overflow-y-auto border border-slate-800">
              <pre>{SUPABASE_SCHEMA_SQL}</pre>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">3</span>
              ส่งออกสำรองข้อมูลจาก Firebase ทั้งหมด (JSON Backup)
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-3">
              ดาวน์โหลดข้อมูลโรงเรียน ({schools.length} แห่ง) และข้อมูลนักเรียนทั้งหมดในระบบเก็บไว้เป็นไฟล์สำรอง
            </p>
            <button
              onClick={handleExportJSONData}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
            >
              <Download className="w-4 h-4" />
              ดาวน์โหลดไฟล์สำรองข้อมูลระบบ (JSON)
            </button>
          </div>

          {/* Step 4 */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">4</span>
              ใส่ Supabase Credentials เพื่อเชื่อมต่อระบบ
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-3">
              คัดลอก Project URL และ anon public key จาก Supabase (Project Settings &rarr; API) มาวางที่นี่:
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  placeholder="https://xyzxyz.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Supabase Anon Public Key
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleSaveCredentials}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  บันทึกการตั้งค่าการเชื่อมต่อ
                </button>
                {saveSuccess && (
                  <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1">
                    <Check className="w-4 h-4" /> บันทึกเรียบร้อย กำลังรีโหลด...
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
