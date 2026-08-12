import React, { useState } from 'react';
import { Database, Copy, Check, ExternalLink, Download, Key, Server, RefreshCw, Send, CheckCircle, AlertTriangle, ShieldOff } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, SUPABASE_SCHEMA_SQL, SUPABASE_FIX_RLS_SQL } from '../lib/supabase';

interface SupabaseMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: any[];
  studentData: any[];
  studentGData?: any[];
  systemConfig?: any;
}

export const SupabaseMigrationModal: React.FC<SupabaseMigrationModalProps> = ({
  isOpen,
  onClose,
  schools,
  studentData,
  studentGData = [],
  systemConfig
}) => {
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [copiedRls, setCopiedRls] = useState(false);
  const env = (import.meta as any).env || {};
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('override_supabase_url') || env.VITE_SUPABASE_URL || '');
  const [supabaseKey, setSupabaseKey] = useState(localStorage.getItem('override_supabase_anon_key') || env.VITE_SUPABASE_ANON_KEY || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Migration states
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string>('');
  const [migrationProgress, setMigrationProgress] = useState<number>(0);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [isRlsError, setIsRlsError] = useState<boolean>(false);
  const [migrationSuccess, setMigrationSuccess] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 3000);
  };

  const handleCopyRls = () => {
    navigator.clipboard.writeText(SUPABASE_FIX_RLS_SQL);
    setCopiedRls(true);
    setTimeout(() => setCopiedRls(false), 3000);
  };

  const handleDownloadRlsSql = () => {
    const blob = new Blob([SUPABASE_FIX_RLS_SQL], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supabase_unlock_rls_${new Date().getTime()}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSchemaSql = () => {
    const blob = new Blob([SUPABASE_SCHEMA_SQL], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supabase_create_schema_${new Date().getTime()}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveCredentials = () => {
    let cleanUrl = supabaseUrl.trim();
    if (cleanUrl && !cleanUrl.startsWith('http')) {
      cleanUrl = 'https://' + cleanUrl;
      setSupabaseUrl(cleanUrl);
    }
    if (cleanUrl) {
      localStorage.setItem('override_supabase_url', cleanUrl);
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
    }, 1200);
  };

  const handleTestConnection = async () => {
    setTestStatus('กำลังทดสอบการเชื่อมต่อกับ Supabase Server...');

    let cleanUrl = supabaseUrl.trim();
    if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    const cleanKey = supabaseKey.trim();

    if (!cleanUrl || !cleanKey) {
      setTestStatus('❌ กรุณากรอก Supabase Project URL และ Anon Public Key ให้ครบถ้วนก่อนทดสอบ');
      return;
    }

    try {
      new URL(cleanUrl);
    } catch {
      setTestStatus('❌ รูปแบบ Supabase Project URL ไม่ถูกต้อง (ตัวอย่าง: https://xyz.supabase.co)');
      return;
    }

    try {
      const testClient = createClient(cleanUrl, cleanKey);
      const { data, error } = await testClient.from('schools').select('id').limit(1);

      if (error) {
        if (error.message?.includes('row-level security') || error.code === '42501') {
          setTestStatus('⚠️ เชื่อมต่อกับ Supabase Server ได้สำเร็จ! แต่ติดขัดสิทธิ์ Row-Level Security (RLS) บนตาราง schools - กรุณารันคำสั่ง SQL ปลดล็อก RLS ในขั้นตอนที่ 2');
        } else if (error.code === 'PGRST301' || error.message?.includes('JWSError') || error.message?.includes('invalid API key') || error.message?.includes('Invalid API key') || (error as any).status === 401) {
          setTestStatus('❌ การเชื่อมต่อล้มเหลว: Anon Public Key ไม่ถูกต้อง (Unauthorized / Invalid Key)');
        } else if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setTestStatus('❌ เชื่อมต่อ Server ได้ แต่ไม่พบตาราง "schools" (กรุณารันคำสั่ง SQL ในขั้นตอนที่ 2 เพื่อสร้างตารางก่อน)');
        } else {
          setTestStatus(`❌ การเชื่อมต่อล้มเหลว: ${error.message}`);
        }
      } else {
        setTestStatus('✅ เชื่อมต่อ Supabase สำเร็จแล้ว! (URL และ Key ถูกต้อง ดึงข้อมูลตาราง schools ได้เรียบร้อย)');
      }
    } catch (err: any) {
      console.error('Supabase connection test failed:', err);
      if (err.message?.includes('Failed to fetch') || err.name === 'TypeError') {
        setTestStatus('❌ ไม่สามารถติดต่อ Server ตาม URL ที่ระบุได้ (กรุณาตรวจสอบว่า Project URL ถูกต้องหรือไม่)');
      } else {
        setTestStatus(`❌ เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message || 'ไม่สามารถเชื่อมต่อได้'}`);
      }
    }
  };

  const handleDownloadDataSql = () => {
    let sql = `-- =============================================================\n`;
    sql += `-- ข้อมูลสำหรับนำเข้า Supabase แบบ Manual\n`;
    sql += `-- วันที่สร้าง: ${new Date().toLocaleString('th-TH')}\n`;
    sql += `-- คำแนะนำ: นำโค้ดนี้ไปวางใน SQL Editor บน Supabase แล้วกด Run\n`;
    sql += `-- =============================================================\n\n`;

    const escapeString = (str: string | null | undefined) => {
      if (str === null || str === undefined || str === '') return 'NULL';
      return `'${String(str).replace(/'/g, "''")}'`;
    };

    const escapeNumber = (num: number | null | undefined) => {
      if (num === null || num === undefined || isNaN(Number(num))) return 'NULL';
      return Number(num);
    };

    const escapeBoolean = (bool: boolean | null | undefined) => {
      if (bool === null || bool === undefined) return 'false';
      return bool ? 'true' : 'false';
    };

    const escapeJson = (obj: any) => {
      if (!obj) return 'NULL';
      return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
    };

    // 1. Schools
    sql += `-- ข้อมูลสถานศึกษา (${schools.length} แห่ง)\n`;
    schools.forEach(s => {
      const id = escapeString(s.id);
      const name = escapeString(s.name);
      const district = escapeString(s.district);
      const amphoe = escapeString(s.amphoe);
      const network = escapeString(s.networkGroup || (s as any).network_group);
      const internet = escapeString(s.internetType || (s as any).internet_type);
      const electricity = escapeJson(s.electricity || null);
      const water = escapeString(s.waterSystem || (s as any).water_system);
      const waterDetail = escapeString(s.waterSystemDetail || (s as any).water_system_detail);
      const solarKw = escapeString(s.solarKw || (s as any).solar_kw);
      const hasBattery = escapeBoolean(s.hasSolarBattery);
      const batteryCap = escapeString(s.solarBatteryCapacity || (s as any).solar_battery_capacity);
      const staff = escapeNumber(s.staffCount);
      const majorSubj = escapeJson(s.majorSubjects || []);
      const majorSubjStaff = escapeJson(s.majorSubjectsWithStaff || []);
      const classrooms = escapeJson(s.classrooms || []);
      const dPhone = escapeString(s.directorPhone || (s as any).director_phone);
      const sPhone = escapeString(s.schoolPhone || (s as any).school_phone);
      const email = escapeString(s.email);
      const facebook = escapeString(s.facebook);
      const line = escapeString(s.line);
      const website = escapeString(s.website);
      const address = escapeString(s.address);
      const img = escapeString(s.imageUrl || (s as any).image_url);
      const logo = escapeString(s.logoUrl || (s as any).logo_url);
      const dImg = escapeString(s.directorImageUrl || (s as any).director_image_url);
      const lat = escapeNumber(s.latitude);
      const lng = escapeNumber(s.longitude);
      const size = escapeString(s.size || 'small');
      const isExp = escapeBoolean(s.isExpansion);
      const highlights = escapeString(s.specialHighlights || (s as any).special_highlights);

      sql += `INSERT INTO public.schools (id, name, district, amphoe, network_group, internet_type, electricity, water_system, water_system_detail, solar_kw, has_solar_battery, solar_battery_capacity, staff_count, major_subjects, major_subjects_with_staff, classrooms, director_phone, school_phone, email, facebook, line, website, address, image_url, logo_url, director_image_url, latitude, longitude, size, is_expansion, special_highlights) VALUES (${id}, ${name}, ${district}, ${amphoe}, ${network}, ${internet}, ${electricity}, ${water}, ${waterDetail}, ${solarKw}, ${hasBattery}, ${batteryCap}, ${staff}, ${majorSubj}, ${majorSubjStaff}, ${classrooms}, ${dPhone}, ${sPhone}, ${email}, ${facebook}, ${line}, ${website}, ${address}, ${img}, ${logo}, ${dImg}, ${lat}, ${lng}, ${size}, ${isExp}, ${highlights}) ON CONFLICT (id) DO UPDATE SET updated_at = NOW();\n`;
    });
    sql += `\n`;

    // 2. Students
    sql += `-- ข้อมูลนักเรียน (${studentData.length} รายการ)\n`;
    studentData.forEach(st => {
      const id = escapeString(st.id || `${st.schoolId}_${st.academicYear}`);
      const sId = escapeString(st.schoolId || (st as any).school_id);
      const sName = escapeString(st.schoolName || (st as any).school_name);
      const year = escapeString(st.academicYear || (st as any).academic_year || '2567');
      const grades = escapeJson(st.grades || {});
      const tm = escapeNumber(st.totalMale ?? (st as any).total_male);
      const tf = escapeNumber(st.totalFemale ?? (st as any).total_female);
      const ts = escapeNumber(st.totalStudents ?? (st as any).total_students);

      sql += `INSERT INTO public.students (id, school_id, school_name, academic_year, grades, total_male, total_female, total_students) VALUES (${id}, ${sId}, ${sName}, ${year}, ${grades}, ${tm}, ${tf}, ${ts}) ON CONFLICT (id) DO UPDATE SET updated_at = NOW();\n`;
    });
    sql += `\n`;

    // 3. Students G
    sql += `-- ข้อมูลนักเรียนรหัส G (${studentGData.length} รายการ)\n`;
    (studentGData || []).forEach(sg => {
      const id = escapeString(sg.id || `${sg.schoolId}_g_${sg.academicYear}`);
      const sId = escapeString(sg.schoolId || (sg as any).school_id);
      const sName = escapeString(sg.schoolName || (sg as any).school_name);
      const year = escapeString(sg.academicYear || (sg as any).academic_year || '2567');
      const ts = escapeNumber(sg.totalGStudents ?? (sg as any).total_g_students);
      const m = escapeNumber(sg.maleGCount ?? (sg as any).male_g_count);
      const f = escapeNumber(sg.femaleGCount ?? (sg as any).female_g_count);
      const notes = escapeString(sg.notes);

      sql += `INSERT INTO public.students_g (id, school_id, school_name, academic_year, total_g_students, male_g_count, female_g_count, notes) VALUES (${id}, ${sId}, ${sName}, ${year}, ${ts}, ${m}, ${f}, ${notes}) ON CONFLICT (id) DO UPDATE SET updated_at = NOW();\n`;
    });
    sql += `\n`;

    // 4. Settings
    if (systemConfig) {
      sql += `-- ข้อมูลตั้งค่าระบบ\n`;
      const sysConf = escapeJson(systemConfig);
      sql += `INSERT INTO public.settings (id, config) VALUES ('system_config', ${sysConf}) ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW();\n`;
    }
    sql += `\n`;

    const blob = new Blob([sql], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mhs1_supabase_data_${new Date().getTime()}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  const handleStartMigration = async () => {
    let cleanUrl = supabaseUrl.trim();
    if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    const cleanKey = supabaseKey.trim();

    if (!cleanUrl || !cleanKey) {
      setMigrationError('ยังไม่ได้ตั้งค่า Supabase Credentials กรุณากรอก URL และ Key ในขั้นตอนที่ 3 แล้วกดบันทึกก่อน');
      return;
    }

    let activeClient: any = null;
    try {
      activeClient = createClient(cleanUrl, cleanKey);
    } catch (err: any) {
      setMigrationError(`ไม่สามารถสร้าง Supabase Client ได้: ${err.message}`);
      return;
    }

    setIsMigrating(true);
    setMigrationError(null);
    setIsRlsError(false);
    setMigrationSuccess(false);
    setMigrationProgress(5);
    setMigrationStatus('กำลังเริ่มต้นกระบวนการย้ายข้อมูลไปยัง Supabase...');

    try {
      // 1. Sync Schools
      setMigrationStatus(`กำลังย้ายข้อมูลสถานศึกษา (Schools) ทั้งหมด ${schools.length} แห่ง...`);
      setMigrationProgress(15);

      const mappedSchools = schools.map((s) => ({
        id: String(s.id),
        name: s.name || '',
        district: s.district || '',
        amphoe: s.amphoe || null,
        network_group: s.networkGroup || s.network_group || null,
        internet_type: s.internetType || s.internet_type || null,
        electricity: s.electricity || null,
        water_system: s.waterSystem || s.water_system || null,
        water_system_detail: s.waterSystemDetail || s.water_system_detail || null,
        solar_kw: s.solarKw || s.solar_kw || null,
        has_solar_battery: Boolean(s.hasSolarBattery),
        solar_battery_capacity: s.solarBatteryCapacity || s.solar_battery_capacity || null,
        staff_count: Number(s.staffCount) || 0,
        major_subjects: s.majorSubjects || [],
        major_subjects_with_staff: s.majorSubjectsWithStaff || [],
        classrooms: s.classrooms || [],
        director_phone: s.directorPhone || s.director_phone || null,
        school_phone: s.schoolPhone || s.school_phone || null,
        email: s.email || null,
        facebook: s.facebook || null,
        line: s.line || null,
        website: s.website || null,
        address: s.address || null,
        image_url: s.imageUrl || s.image_url || null,
        logo_url: s.logoUrl || s.logo_url || null,
        director_image_url: s.directorImageUrl || s.director_image_url || null,
        latitude: Number(s.latitude) || 0,
        longitude: Number(s.longitude) || 0,
        size: s.size || 'small',
        is_expansion: Boolean(s.isExpansion),
        special_highlights: s.specialHighlights || s.special_highlights || null
      }));

      // Batch insert schools
      const BATCH_SIZE = 50;
      for (let i = 0; i < mappedSchools.length; i += BATCH_SIZE) {
        const batch = mappedSchools.slice(i, i + BATCH_SIZE);
        const { error } = await activeClient.from('schools').upsert(batch, { onConflict: 'id' });
        if (error) {
          if (error.message?.includes('row-level security') || error.code === '42501') {
            setIsRlsError(true);
            throw new Error(`ติดขัดเรื่องสิทธิ์ Row-Level Security (RLS) บนตาราง schools: ${error.message}`);
          }
          throw new Error(`ล้มเหลวในการบันทึก Schools: ${error.message}`);
        }
      }

      setMigrationProgress(45);

      // 2. Sync Student Data
      setMigrationStatus(`กำลังย้ายข้อมูลนักเรียน (Students) ทั้งหมด ${studentData.length} รายการ...`);
      const mappedStudents = studentData.map((st) => ({
        id: String(st.id || `${st.schoolId}_${st.academicYear}`),
        school_id: String(st.schoolId || st.school_id),
        school_name: st.schoolName || st.school_name || '',
        academic_year: String(st.academicYear || st.academic_year || '2567'),
        grades: st.grades || {},
        total_male: Number(st.totalMale ?? st.total_male) || 0,
        total_female: Number(st.totalFemale ?? st.total_female) || 0,
        total_students: Number(st.totalStudents ?? st.total_students) || 0
      }));

      for (let i = 0; i < mappedStudents.length; i += BATCH_SIZE) {
        const batch = mappedStudents.slice(i, i + BATCH_SIZE);
        const { error } = await activeClient.from('students').upsert(batch, { onConflict: 'id' });
        if (error) {
          if (error.message?.includes('row-level security') || error.code === '42501') {
            setIsRlsError(true);
            throw new Error(`ติดขัดเรื่องสิทธิ์ Row-Level Security (RLS) บนตาราง students: ${error.message}`);
          }
          throw new Error(`ล้มเหลวในการบันทึก Students: ${error.message}`);
        }
      }

      setMigrationProgress(75);

      // 3. Sync Student G Data
      setMigrationStatus(`กำลังย้ายข้อมูลนักเรียนรหัส G (Students G) ทั้งหมด ${studentGData.length} รายการ...`);
      const mappedStudentsG = (studentGData || []).map((sg) => ({
        id: String(sg.id || `${sg.schoolId}_g_${sg.academicYear}`),
        school_id: String(sg.schoolId || sg.school_id),
        school_name: sg.schoolName || sg.school_name || '',
        academic_year: String(sg.academicYear || sg.academic_year || '2567'),
        total_g_students: Number(sg.totalGStudents ?? sg.total_g_students) || 0,
        male_g_count: Number(sg.maleGCount ?? sg.male_g_count) || 0,
        female_g_count: Number(sg.femaleGCount ?? sg.female_g_count) || 0,
        notes: sg.notes || null
      }));

      if (mappedStudentsG.length > 0) {
        for (let i = 0; i < mappedStudentsG.length; i += BATCH_SIZE) {
          const batch = mappedStudentsG.slice(i, i + BATCH_SIZE);
          const { error } = await activeClient.from('students_g').upsert(batch, { onConflict: 'id' });
          if (error) {
            if (error.message?.includes('row-level security') || error.code === '42501') {
              setIsRlsError(true);
              throw new Error(`ติดขัดเรื่องสิทธิ์ Row-Level Security (RLS) บนตาราง students_g: ${error.message}`);
            }
            throw new Error(`ล้มเหลวในการบันทึก Students G: ${error.message}`);
          }
        }
      }

      // 4. Sync System Config
      if (systemConfig) {
        await activeClient.from('settings').upsert([
          {
            id: 'system_config',
            config: systemConfig
          }
        ], { onConflict: 'id' });
      }

      setMigrationProgress(100);
      setMigrationStatus(`✅ ย้ายข้อมูลเข้า Supabase สำเร็จเรียบร้อยแล้ว! (โรงเรียน ${schools.length} แห่ง, นักเรียน ${studentData.length} รายการ)`);
      setMigrationSuccess(true);
    } catch (err: any) {
      console.error('Migration error:', err);
      setMigrationError(err.message || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุในการย้ายข้อมูล');
    } finally {
      setIsMigrating(false);
    }
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
              เครื่องมือย้ายข้อมูลเข้า Supabase (PostgreSQL Migration)
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              นำเข้าข้อมูลสถานศึกษาและนักเรียนจากระบบเข้าสู่ Supabase Database
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
                  {isSupabaseConfigured() ? 'พร้อมส่งข้อมูลและประมวลผลผ่าน Supabase Database' : 'สามารถสลับไปใช้ Supabase ได้ตลอดเวลา'}
                </div>
              </div>
            </div>
            {isSupabaseConfigured() && (
              <button
                onClick={handleTestConnection}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                ทดสอบการเชื่อมต่อ
              </button>
            )}
          </div>

          {testStatus && (
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700">
              {testStatus}
            </div>
          )}

          {/* Step 1 */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">1</span>
              สร้างโครงการบน Supabase
            </h3>
            <p className="mb-3 text-slate-500 dark:text-slate-400 text-xs">
              ไปที่ <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline font-medium inline-flex items-center gap-1">supabase.com <ExternalLink className="w-3 h-3" /></a> แล้วกดสร้าง Project ใหม่ฟรี
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">2</span>
                สร้างโครงสร้างตารางและปลดล็อกสิทธิ์ RLS
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleCopySchema}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSchema ? 'คัดลอก SQL แล้ว!' : 'คัดลอก SQL สร้างตาราง'}
                </button>
                <button
                  onClick={handleCopyRls}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  {copiedRls ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <ShieldOff className="w-3.5 h-3.5" />}
                  {copiedRls ? 'คัดลอกคำสั่งปลดล็อก RLS แล้ว!' : 'คัดลอก SQL ปลดล็อก RLS'}
                </button>
                <button
                  onClick={handleDownloadRlsSql}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  โหลดไฟล์ SQL ปลดล็อก RLS
                </button>
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-2">
              นำคำสั่ง SQL ทั้งหมดไปวางที่ Supabase Dashboard &rarr; <b>SQL Editor</b> แล้วกด <b>Run</b> เพื่อสร้างตารางและเปิดสิทธิ์การบันทึกข้อมูล
            </p>
            <div className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-xs font-mono max-h-32 overflow-y-auto border border-slate-800">
              <pre>{SUPABASE_SCHEMA_SQL}</pre>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">3</span>
              ใส่ Supabase Credentials
            </h3>
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

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-lg text-xs space-y-1 text-slate-700 dark:text-slate-300">
                <div className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1">
                  💡 วิธีหา Project URL และ Anon Public Key บน Supabase:
                </div>
                <ol className="list-decimal pl-4 space-y-0.5 text-[11px]">
                  <li>เข้า **Supabase Dashboard** (<a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 underline font-semibold">supabase.com/dashboard</a>) &rarr; เลือกโปรเจกต์ของคุณ</li>
                  <li>คลิกเมนูรูปฟันเฟือง <b>Project Settings</b> (ซ้ายล่าง) &rarr; เลือก <b>API</b></li>
                  <li>ช่อง <b>Project URL</b>: คัดลอกลิงก์ (ระบบจะใส่ <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">https://</code> ให้อัตโนมัติหากไม่ได้ใส่)</li>
                  <li>ช่อง <b>Project API keys</b>: คัดลอกรหัสในแถบ <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">anon</code> <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">public</code></li>
                </ol>
              </div>

              <div className="flex items-center gap-2 flex-wrap pt-1">
                <button
                  onClick={handleSaveCredentials}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Key className="w-4 h-4" />
                  บันทึกการตั้งค่า
                </button>
                <button
                  onClick={handleTestConnection}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  ทดสอบการเชื่อมต่อ
                </button>
                {saveSuccess && (
                  <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1">
                    <Check className="w-4 h-4" /> บันทึกเรียบร้อย กำลังรีโหลด...
                  </span>
                )}
              </div>

              {testStatus && (
                <div className={`p-3 rounded-lg text-xs font-medium border ${
                  testStatus.startsWith('✅') 
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' 
                    : testStatus.startsWith('⚠️')
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                    : 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                }`}>
                  {testStatus}
                </div>
              )}
            </div>
          </div>

          {/* Step 4: ACTION - MIGRATE NOW */}
          <div className="bg-emerald-950/10 dark:bg-emerald-950/30 rounded-xl p-5 border-2 border-emerald-500/40">
            <h3 className="font-extrabold text-emerald-800 dark:text-emerald-300 mb-2 text-base flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black">4</span>
              🚀 เริ่มย้ายและซิงค์ข้อมูลเข้า Supabase (Migrate Now)
            </h3>
            <p className="text-slate-600 dark:text-slate-300 text-xs mb-4">
              กดปุ่มด้านล่างเพื่อส่งข้อมูลสถานศึกษา ({schools.length} แห่ง) ข้อมูลนักเรียน ({studentData.length} รายการ) และนักเรียนรหัส G ({studentGData.length} รายการ) เข้าตารางบน Supabase ทันที
            </p>

            {isMigrating && (
              <div className="space-y-2 mb-4">
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${migrationProgress}%` }}
                  />
                </div>
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {migrationStatus}
                </div>
              </div>
            )}

            {migrationSuccess && (
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-300 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                {migrationStatus}
              </div>
            )}

            {migrationError && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-xl text-xs font-medium mb-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300 text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
                  ย้ายข้อมูลไม่สำเร็จ: {migrationError}
                </div>
                {isRlsError ? (
                  <div className="p-3 bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 rounded-lg text-amber-900 dark:text-amber-200 space-y-2 text-xs">
                    <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                      <ShieldOff className="w-4 h-4 text-amber-600" />
                      วิธีแก้ไขปัญหาติดขัดสิทธิ์ Row-Level Security (RLS) บน Supabase:
                    </div>
                    <ol className="list-decimal pl-4 space-y-1 text-xs">
                      <li>ไปที่ Supabase Dashboard &rarr; เปิดเมนู <b>SQL Editor</b></li>
                      <li>กดปุ่ม <b>"คัดลอก SQL ปลดล็อก RLS"</b> ด้านล่างนี้</li>
                      <li>นำโค้ดไปวางใน SQL Editor แล้วกดปุ่ม <b>Run</b> 1 ครั้ง</li>
                      <li>กลับมากดปุ่ม <b>"ย้ายข้อมูลทั้งหมดเข้า Supabase ทันที"</b> อีกครั้ง</li>
                    </ol>
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <button
                        onClick={handleCopyRls}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                      >
                        {copiedRls ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                        {copiedRls ? 'คัดลอกคำสั่งปลดล็อก RLS เรียบร้อยแล้ว!' : 'คัดลอก SQL ปลดล็อก RLS ทันที'}
                      </button>
                      <button
                        onClick={handleDownloadRlsSql}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                      >
                        <Download className="w-4 h-4" />
                        ดาวน์โหลดไฟล์ SQL ปลดล็อก RLS
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] opacity-90">
                    คำแนะนำ: ตรวจสอบว่าได้กด Run คำสั่ง SQL ในขั้นตอนที่ 2 เพื่อสร้างตาราง และตั้งค่า URL/Key ถูกต้องแล้ว
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleStartMigration}
                disabled={isMigrating}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-extrabold transition-all shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <Send className={`w-4 h-4 ${isMigrating ? 'animate-bounce' : ''}`} />
                {isMigrating ? 'กำลังย้ายข้อมูลไป Supabase...' : 'ย้ายข้อมูลทั้งหมดเข้า Supabase ทันที'}
              </button>

              <button
                onClick={handleDownloadDataSql}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Download className="w-4 h-4" />
                ดาวน์โหลดไฟล์ SQL เพื่อ Insert ข้อมูลเอง
              </button>

              <button
                onClick={handleExportJSONData}
                className="px-4 py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                ดาวน์โหลดไฟล์สำรองข้อมูล (JSON)
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};

