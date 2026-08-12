import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read Supabase environment variables or localStorage overrides dynamically
const env = (import.meta as any).env || {};

export const getSupabaseUrl = (): string => {
  let url = localStorage.getItem('override_supabase_url') || env.VITE_SUPABASE_URL || '';
  url = url.trim();
  if (url && !url.startsWith('http')) {
    url = 'https://' + url;
  }
  return url;
};

export const getSupabaseKey = (): string => {
  return (localStorage.getItem('override_supabase_anon_key') || env.VITE_SUPABASE_ANON_KEY || '').trim();
};

export const isSupabaseConfigured = (): boolean => {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  return Boolean(url && key && url.startsWith('http'));
};

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

export const getSupabaseClient = (): SupabaseClient | null => {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();

  if (!url || !key || !url.startsWith('http')) {
    return null;
  }

  if (cachedClient && cachedUrl === url && cachedKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key);
    cachedUrl = url;
    cachedKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
};

// Export Proxy for 'supabase' export so calls dynamically use the active client
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    if (!client) return undefined;
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

export const SUPABASE_FIX_RLS_SQL = `-- =============================================================
-- คำสั่งปลดล็อกสิทธิ์ RLS (Row Level Security) สำหรับ Supabase SQL Editor
-- คัดลอกคำสั่งทั้งหมดนี้ไปวางใน SQL Editor บน Supabase Dashboard แล้วกด Run
-- =============================================================

-- 1. สร้างตารางทั้งหมด (หากยังไม่ได้สร้าง)
CREATE TABLE IF NOT EXISTS public.schools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    district TEXT NOT NULL,
    amphoe TEXT,
    network_group TEXT,
    internet_type TEXT,
    electricity JSONB,
    water_system TEXT,
    water_system_detail TEXT,
    solar_kw TEXT,
    has_solar_battery BOOLEAN,
    solar_battery_capacity TEXT,
    staff_count INT DEFAULT 0,
    major_subjects JSONB DEFAULT '[]'::jsonb,
    major_subjects_with_staff JSONB DEFAULT '[]'::jsonb,
    classrooms JSONB DEFAULT '[]'::jsonb,
    director_phone TEXT,
    school_phone TEXT,
    email TEXT,
    facebook TEXT,
    line TEXT,
    website TEXT,
    address TEXT,
    image_url TEXT,
    logo_url TEXT,
    director_image_url TEXT,
    latitude DOUBLE PRECISION DEFAULT 0,
    longitude DOUBLE PRECISION DEFAULT 0,
    size TEXT DEFAULT 'small',
    is_expansion BOOLEAN DEFAULT false,
    special_highlights TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    school_name TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    grades JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_male INT DEFAULT 0,
    total_female INT DEFAULT 0,
    total_students INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.students_g (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    school_name TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    total_g_students INT DEFAULT 0,
    male_g_count INT DEFAULT 0,
    female_g_count INT DEFAULT 0,
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.users (
    uid TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    school_id TEXT,
    school_name TEXT,
    role TEXT DEFAULT 'public',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY DEFAULT 'system_config',
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.system_stats (
    id TEXT PRIMARY KEY DEFAULT 'visitor_count',
    total_visits INT DEFAULT 0,
    today_visits INT DEFAULT 0,
    today_date TEXT,
    daily_visits JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.download_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    school_id TEXT NOT NULL,
    school_name TEXT NOT NULL,
    purpose TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ปิดใช้งาน RLS บนทุกตารางก่อน
ALTER TABLE public.schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students_g DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_logs DISABLE ROW LEVEL SECURITY;

-- 3. เปิดใช้งาน RLS และสร้าง Policy แบบ Permissive อนุญาต อ่าน-เขียน แบบไร้ข้อจำกัด
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students_g ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public All Access" ON public.schools;
DROP POLICY IF EXISTS "Public All Schools" ON public.schools;
CREATE POLICY "Public All Access" ON public.schools FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public All Access" ON public.students;
DROP POLICY IF EXISTS "Public All Students" ON public.students;
CREATE POLICY "Public All Access" ON public.students FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public All Access" ON public.students_g;
DROP POLICY IF EXISTS "Public All StudentsG" ON public.students_g;
CREATE POLICY "Public All Access" ON public.students_g FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public All Access" ON public.users;
DROP POLICY IF EXISTS "Public All Users" ON public.users;
CREATE POLICY "Public All Access" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public All Access" ON public.settings;
DROP POLICY IF EXISTS "Public All Settings" ON public.settings;
CREATE POLICY "Public All Access" ON public.settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public All Access" ON public.system_stats;
DROP POLICY IF EXISTS "Public All SystemStats" ON public.system_stats;
CREATE POLICY "Public All Access" ON public.system_stats FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public All Access" ON public.download_logs;
DROP POLICY IF EXISTS "Public All DownloadLogs" ON public.download_logs;
CREATE POLICY "Public All Access" ON public.download_logs FOR ALL USING (true) WITH CHECK (true);

-- 4. ให้สิทธิ์การใช้งาน DB แก่ anon และ authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, postgres, service_role;

-- 5. สั่งรีโหลด PostgREST Schema Cache ทันที
NOTIFY pgrst, 'reload schema';
`;

export const SUPABASE_SCHEMA_SQL = `-- 1. สร้างตาราง schools (ข้อมูลสถานศึกษา)
CREATE TABLE IF NOT EXISTS public.schools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    district TEXT NOT NULL,
    amphoe TEXT,
    network_group TEXT,
    internet_type TEXT,
    electricity JSONB,
    water_system TEXT,
    water_system_detail TEXT,
    solar_kw TEXT,
    has_solar_battery BOOLEAN,
    solar_battery_capacity TEXT,
    staff_count INT DEFAULT 0,
    major_subjects JSONB DEFAULT '[]'::jsonb,
    major_subjects_with_staff JSONB DEFAULT '[]'::jsonb,
    classrooms JSONB DEFAULT '[]'::jsonb,
    director_phone TEXT,
    school_phone TEXT,
    email TEXT,
    facebook TEXT,
    line TEXT,
    website TEXT,
    address TEXT,
    image_url TEXT,
    logo_url TEXT,
    director_image_url TEXT,
    latitude DOUBLE PRECISION DEFAULT 0,
    longitude DOUBLE PRECISION DEFAULT 0,
    size TEXT DEFAULT 'small',
    is_expansion BOOLEAN DEFAULT false,
    special_highlights TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

-- 2. สร้างตาราง students (ข้อมูลนักเรียนทั่วไปแยกตามชั้น)
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    school_name TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    grades JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_male INT DEFAULT 0,
    total_female INT DEFAULT 0,
    total_students INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. สร้างตาราง students_g (ข้อมูลนักเรียนรหัส G)
CREATE TABLE IF NOT EXISTS public.students_g (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    school_name TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    total_g_students INT DEFAULT 0,
    male_g_count INT DEFAULT 0,
    female_g_count INT DEFAULT 0,
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. สร้างตาราง users (ข้อมูลผู้ใช้งานและผู้ดูแลระบบ)
CREATE TABLE IF NOT EXISTS public.users (
    uid TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    school_id TEXT,
    school_name TEXT,
    role TEXT DEFAULT 'public',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. สร้างตาราง settings (ค่าตั้งค่าระบบ)
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY DEFAULT 'system_config',
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. สร้างตาราง system_stats (สถิติผู้เข้าชม)
CREATE TABLE IF NOT EXISTS public.system_stats (
    id TEXT PRIMARY KEY DEFAULT 'visitor_count',
    total_visits INT DEFAULT 0,
    today_visits INT DEFAULT 0,
    today_date TEXT,
    daily_visits JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. สร้างตาราง download_logs (ประวัติการดาวน์โหลดเอกสาร)
CREATE TABLE IF NOT EXISTS public.download_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    school_id TEXT NOT NULL,
    school_name TEXT NOT NULL,
    purpose TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ตั้งค่านโยบายการเข้าถึงข้อมูลแบบสาธารณะ (Public Access Policies)
ALTER TABLE public.schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students_g DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_logs DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students_g ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public All Access" ON public.schools;
DROP POLICY IF EXISTS "Public All Schools" ON public.schools;
CREATE POLICY "Public All Access" ON public.schools FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public All Access" ON public.students;
DROP POLICY IF EXISTS "Public All Students" ON public.students;
CREATE POLICY "Public All Access" ON public.students FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public All Access" ON public.students_g;
DROP POLICY IF EXISTS "Public All StudentsG" ON public.students_g;
CREATE POLICY "Public All Access" ON public.students_g FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public All Access" ON public.users;
DROP POLICY IF EXISTS "Public All Users" ON public.users;
CREATE POLICY "Public All Access" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public All Access" ON public.settings;
DROP POLICY IF EXISTS "Public All Settings" ON public.settings;
CREATE POLICY "Public All Access" ON public.settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public All Access" ON public.system_stats;
DROP POLICY IF EXISTS "Public All SystemStats" ON public.system_stats;
CREATE POLICY "Public All Access" ON public.system_stats FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public All Access" ON public.download_logs;
DROP POLICY IF EXISTS "Public All DownloadLogs" ON public.download_logs;
CREATE POLICY "Public All Access" ON public.download_logs FOR ALL USING (true) WITH CHECK (true);

-- สิทธิ์การเข้าถึงข้อมูลแบบสาธารณะ
GRANT USAGE ON SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, postgres, service_role;

NOTIFY pgrst, 'reload schema';
`;

