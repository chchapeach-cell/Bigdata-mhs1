import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Permanent Supabase configuration
const env = (import.meta as any).env || {};

export const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://frpjtkltipmwpevngdrp.supabase.co';
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_5wJwoIwcwvyjKBJsP1uMdg_x0xhwOB9';

// Clean up any legacy localStorage keys to avoid any stale data/confusion
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('override_supabase_url');
    window.localStorage.removeItem('override_supabase_anon_key');
  }
} catch {
  // ignore
}

export const getSupabaseUrl = (): string => {
  let url = SUPABASE_URL.trim();
  if (url && !url.startsWith('http')) {
    url = 'https://' + url;
  }
  return url;
};

export const getSupabaseKey = (): string => {
  return SUPABASE_ANON_KEY.trim();
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
    director_name TEXT,
    director_phone TEXT,
    vice_director_name TEXT,
    vice_director_phone TEXT,
    vice_directors JSONB DEFAULT '[]'::jsonb,
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

-- เพิ่มคอลัมน์ใหม่สำหรับโครงสร้างข้อมูลผู้อำนวยการ รองผู้อำนวยการ และประเภทบุคลากร (กรณีมีตารางเดิมอยู่แล้ว)
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS director_name TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS director_phone TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS vice_director_name TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS vice_director_phone TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS vice_directors JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS contract_teachers_count INT DEFAULT 0;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS admin_staff_count INT DEFAULT 0;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS janitor_count INT DEFAULT 0;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS other_staff_count INT DEFAULT 0;

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
    email TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS public.active_sessions (
    uid TEXT PRIMARY KEY,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    school_name TEXT,
    role TEXT,
    login_time BIGINT,
    last_active_time BIGINT,
    kicked BOOLEAN DEFAULT false,
    kicked_at BIGINT,
    kicked_by TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ลบตารางเดิม academic_assessments ที่รวมกันออก
DROP TABLE IF EXISTS public.academic_assessments CASCADE;

-- 9. ตารางผลการประเมิน NT (ป.3) : academic_nt_assessments
CREATE TABLE IF NOT EXISTS public.academic_nt_assessments (
    id TEXT PRIMARY KEY,
    order_num INT DEFAULT 0,
    school_id TEXT NOT NULL,
    school_name TEXT NOT NULL,
    amphoe TEXT,
    math_score DOUBLE PRECISION DEFAULT 0,
    math_percentage DOUBLE PRECISION DEFAULT 0,
    thai_score DOUBLE PRECISION DEFAULT 0,
    thai_percentage DOUBLE PRECISION DEFAULT 0,
    total_score DOUBLE PRECISION DEFAULT 0,
    total_percentage DOUBLE PRECISION DEFAULT 0,
    math_quality TEXT DEFAULT 'พอใช้',
    thai_quality TEXT DEFAULT 'พอใช้',
    total_quality TEXT DEFAULT 'พอใช้',
    academic_year TEXT NOT NULL DEFAULT '2567',
    test_type TEXT NOT NULL DEFAULT 'NT',
    test_title TEXT DEFAULT 'การประเมินคุณภาพผู้เรียน (NT) ชั้นประถมศึกษาปีที่ 3',
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

-- ตาราง nt_assessments (Alias / Compatibility)
CREATE TABLE IF NOT EXISTS public.nt_assessments (
    id TEXT PRIMARY KEY,
    order_num INT DEFAULT 0,
    school_id TEXT NOT NULL,
    school_name TEXT NOT NULL,
    amphoe TEXT,
    math_score DOUBLE PRECISION DEFAULT 0,
    math_percentage DOUBLE PRECISION DEFAULT 0,
    thai_score DOUBLE PRECISION DEFAULT 0,
    thai_percentage DOUBLE PRECISION DEFAULT 0,
    total_score DOUBLE PRECISION DEFAULT 0,
    total_percentage DOUBLE PRECISION DEFAULT 0,
    math_quality TEXT DEFAULT 'พอใช้',
    thai_quality TEXT DEFAULT 'พอใช้',
    total_quality TEXT DEFAULT 'พอใช้',
    academic_year TEXT NOT NULL DEFAULT '2567',
    test_type TEXT NOT NULL DEFAULT 'NT',
    test_title TEXT DEFAULT 'การประเมินคุณภาพผู้เรียน (NT) ชั้นประถมศึกษาปีที่ 3',
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

-- 10. ตารางผลการประเมิน RT (ป.1) : academic_rt_assessments
CREATE TABLE IF NOT EXISTS public.academic_rt_assessments (
    id TEXT PRIMARY KEY,
    order_num INT DEFAULT 0,
    school_id TEXT NOT NULL,
    school_name TEXT NOT NULL,
    amphoe TEXT,
    reading_aloud_score DOUBLE PRECISION DEFAULT 0,
    reading_aloud_percentage DOUBLE PRECISION DEFAULT 0,
    reading_comprehension_score DOUBLE PRECISION DEFAULT 0,
    reading_comprehension_percentage DOUBLE PRECISION DEFAULT 0,
    math_score DOUBLE PRECISION DEFAULT 0,
    math_percentage DOUBLE PRECISION DEFAULT 0,
    thai_score DOUBLE PRECISION DEFAULT 0,
    thai_percentage DOUBLE PRECISION DEFAULT 0,
    total_score DOUBLE PRECISION DEFAULT 0,
    total_percentage DOUBLE PRECISION DEFAULT 0,
    reading_aloud_quality TEXT DEFAULT 'พอใช้',
    reading_comprehension_quality TEXT DEFAULT 'พอใช้',
    math_quality TEXT DEFAULT 'พอใช้',
    thai_quality TEXT DEFAULT 'พอใช้',
    total_quality TEXT DEFAULT 'พอใช้',
    academic_year TEXT NOT NULL DEFAULT '2567',
    test_type TEXT NOT NULL DEFAULT 'RT',
    test_title TEXT DEFAULT 'การประเมินความสามารถด้านการอ่านของผู้เรียน (RT) ชั้นประถมศึกษาปีที่ 1',
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

-- ตาราง rt_assessments (Alias / Compatibility)
CREATE TABLE IF NOT EXISTS public.rt_assessments (
    id TEXT PRIMARY KEY,
    order_num INT DEFAULT 0,
    school_id TEXT NOT NULL,
    school_name TEXT NOT NULL,
    amphoe TEXT,
    reading_aloud_score DOUBLE PRECISION DEFAULT 0,
    reading_aloud_percentage DOUBLE PRECISION DEFAULT 0,
    reading_comprehension_score DOUBLE PRECISION DEFAULT 0,
    reading_comprehension_percentage DOUBLE PRECISION DEFAULT 0,
    math_score DOUBLE PRECISION DEFAULT 0,
    math_percentage DOUBLE PRECISION DEFAULT 0,
    thai_score DOUBLE PRECISION DEFAULT 0,
    thai_percentage DOUBLE PRECISION DEFAULT 0,
    total_score DOUBLE PRECISION DEFAULT 0,
    total_percentage DOUBLE PRECISION DEFAULT 0,
    reading_aloud_quality TEXT DEFAULT 'พอใช้',
    reading_comprehension_quality TEXT DEFAULT 'พอใช้',
    math_quality TEXT DEFAULT 'พอใช้',
    thai_quality TEXT DEFAULT 'พอใช้',
    total_quality TEXT DEFAULT 'พอใช้',
    academic_year TEXT NOT NULL DEFAULT '2567',
    test_type TEXT NOT NULL DEFAULT 'RT',
    test_title TEXT DEFAULT 'การประเมินความสามารถด้านการอ่านของผู้เรียน (RT) ชั้นประถมศึกษาปีที่ 1',
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

-- 2. ปิดใช้งาน RLS บนทุกตารางก่อน
ALTER TABLE public.schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students_g DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_nt_assessments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_rt_assessments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.nt_assessments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rt_assessments DISABLE ROW LEVEL SECURITY;

-- 3. เปิดใช้งาน RLS และสร้าง Policy แบบ Permissive อนุญาต อ่าน-เขียน แบบไร้ข้อจำกัด
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students_g ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_nt_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_rt_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nt_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rt_assessments ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Public All Access" ON public.active_sessions;
DROP POLICY IF EXISTS "Public All ActiveSessions" ON public.active_sessions;
CREATE POLICY "Public All Access" ON public.active_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public All Access" ON public.academic_nt_assessments;
DROP POLICY IF EXISTS "Public All AcademicNTAssessments" ON public.academic_nt_assessments;
CREATE POLICY "Public All Access" ON public.academic_nt_assessments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public All Access" ON public.academic_rt_assessments;
DROP POLICY IF EXISTS "Public All AcademicRTAssessments" ON public.academic_rt_assessments;
CREATE POLICY "Public All Access" ON public.academic_rt_assessments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public All Access" ON public.nt_assessments;
DROP POLICY IF EXISTS "Public All NTAssessments" ON public.nt_assessments;
CREATE POLICY "Public All Access" ON public.nt_assessments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public All Access" ON public.rt_assessments;
DROP POLICY IF EXISTS "Public All RTAssessments" ON public.rt_assessments;
CREATE POLICY "Public All Access" ON public.rt_assessments FOR ALL USING (true) WITH CHECK (true);

-- 4. ให้สิทธิ์การใช้งาน DB แก่ anon และ authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, postgres, service_role;

-- 5. ปลดล็อกข้อจำกัด Email ซ้ำสะสม (Email Key constraint) ในตาราง users หากมีอยู่
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;

-- 6. สั่งรีโหลด PostgREST Schema Cache ทันที
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
    director_name TEXT,
    director_phone TEXT,
    vice_director_name TEXT,
    vice_director_phone TEXT,
    vice_directors JSONB DEFAULT '[]'::jsonb,
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
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    school_id TEXT,
    school_name TEXT,
    role TEXT DEFAULT 'public',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;

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

-- 8. สร้างตาราง active_sessions (การเข้าใช้งานปัจจุบัน)
CREATE TABLE IF NOT EXISTS public.active_sessions (
    uid TEXT PRIMARY KEY,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    school_name TEXT,
    role TEXT,
    login_time BIGINT,
    last_active_time BIGINT,
    kicked BOOLEAN DEFAULT false,
    kicked_at BIGINT,
    kicked_by TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ลบตารางเดิม academic_assessments ที่รวมกันออก
DROP TABLE IF EXISTS public.academic_assessments CASCADE;

-- 9. สร้างตาราง academic_nt_assessments (ข้อมูลผลการประเมิน NT ชั้น ป.3)
CREATE TABLE IF NOT EXISTS public.academic_nt_assessments (
    id TEXT PRIMARY KEY,
    order_num INT DEFAULT 0,
    school_id TEXT NOT NULL,
    school_name TEXT NOT NULL,
    amphoe TEXT,
    math_score DOUBLE PRECISION DEFAULT 0,
    math_percentage DOUBLE PRECISION DEFAULT 0,
    thai_score DOUBLE PRECISION DEFAULT 0,
    thai_percentage DOUBLE PRECISION DEFAULT 0,
    total_score DOUBLE PRECISION DEFAULT 0,
    total_percentage DOUBLE PRECISION DEFAULT 0,
    math_quality TEXT DEFAULT 'พอใช้',
    thai_quality TEXT DEFAULT 'พอใช้',
    total_quality TEXT DEFAULT 'พอใช้',
    academic_year TEXT NOT NULL DEFAULT '2567',
    test_type TEXT NOT NULL DEFAULT 'NT',
    test_title TEXT DEFAULT 'การประเมินคุณภาพผู้เรียน (NT) ชั้นประถมศึกษาปีที่ 3',
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

-- ตาราง nt_assessments (Alias / Compatibility)
CREATE TABLE IF NOT EXISTS public.nt_assessments (
    id TEXT PRIMARY KEY,
    order_num INT DEFAULT 0,
    school_id TEXT NOT NULL,
    school_name TEXT NOT NULL,
    amphoe TEXT,
    math_score DOUBLE PRECISION DEFAULT 0,
    math_percentage DOUBLE PRECISION DEFAULT 0,
    thai_score DOUBLE PRECISION DEFAULT 0,
    thai_percentage DOUBLE PRECISION DEFAULT 0,
    total_score DOUBLE PRECISION DEFAULT 0,
    total_percentage DOUBLE PRECISION DEFAULT 0,
    math_quality TEXT DEFAULT 'พอใช้',
    thai_quality TEXT DEFAULT 'พอใช้',
    total_quality TEXT DEFAULT 'พอใช้',
    academic_year TEXT NOT NULL DEFAULT '2567',
    test_type TEXT NOT NULL DEFAULT 'NT',
    test_title TEXT DEFAULT 'การประเมินคุณภาพผู้เรียน (NT) ชั้นประถมศึกษาปีที่ 3',
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

-- 10. สร้างตาราง academic_rt_assessments (ข้อมูลผลการประเมิน RT ชั้น ป.1)
CREATE TABLE IF NOT EXISTS public.academic_rt_assessments (
    id TEXT PRIMARY KEY,
    order_num INT DEFAULT 0,
    school_id TEXT NOT NULL,
    school_name TEXT NOT NULL,
    amphoe TEXT,
    reading_aloud_score DOUBLE PRECISION DEFAULT 0,
    reading_aloud_percentage DOUBLE PRECISION DEFAULT 0,
    reading_comprehension_score DOUBLE PRECISION DEFAULT 0,
    reading_comprehension_percentage DOUBLE PRECISION DEFAULT 0,
    math_score DOUBLE PRECISION DEFAULT 0,
    math_percentage DOUBLE PRECISION DEFAULT 0,
    thai_score DOUBLE PRECISION DEFAULT 0,
    thai_percentage DOUBLE PRECISION DEFAULT 0,
    total_score DOUBLE PRECISION DEFAULT 0,
    total_percentage DOUBLE PRECISION DEFAULT 0,
    reading_aloud_quality TEXT DEFAULT 'พอใช้',
    reading_comprehension_quality TEXT DEFAULT 'พอใช้',
    math_quality TEXT DEFAULT 'พอใช้',
    thai_quality TEXT DEFAULT 'พอใช้',
    total_quality TEXT DEFAULT 'พอใช้',
    academic_year TEXT NOT NULL DEFAULT '2567',
    test_type TEXT NOT NULL DEFAULT 'RT',
    test_title TEXT DEFAULT 'การประเมินความสามารถด้านการอ่านของผู้เรียน (RT) ชั้นประถมศึกษาปีที่ 1',
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

-- ตาราง rt_assessments (Alias / Compatibility)
CREATE TABLE IF NOT EXISTS public.rt_assessments (
    id TEXT PRIMARY KEY,
    order_num INT DEFAULT 0,
    school_id TEXT NOT NULL,
    school_name TEXT NOT NULL,
    amphoe TEXT,
    reading_aloud_score DOUBLE PRECISION DEFAULT 0,
    reading_aloud_percentage DOUBLE PRECISION DEFAULT 0,
    reading_comprehension_score DOUBLE PRECISION DEFAULT 0,
    reading_comprehension_percentage DOUBLE PRECISION DEFAULT 0,
    math_score DOUBLE PRECISION DEFAULT 0,
    math_percentage DOUBLE PRECISION DEFAULT 0,
    thai_score DOUBLE PRECISION DEFAULT 0,
    thai_percentage DOUBLE PRECISION DEFAULT 0,
    total_score DOUBLE PRECISION DEFAULT 0,
    total_percentage DOUBLE PRECISION DEFAULT 0,
    reading_aloud_quality TEXT DEFAULT 'พอใช้',
    reading_comprehension_quality TEXT DEFAULT 'พอใช้',
    math_quality TEXT DEFAULT 'พอใช้',
    thai_quality TEXT DEFAULT 'พอใช้',
    total_quality TEXT DEFAULT 'พอใช้',
    academic_year TEXT NOT NULL DEFAULT '2567',
    test_type TEXT NOT NULL DEFAULT 'RT',
    test_title TEXT DEFAULT 'การประเมินความสามารถด้านการอ่านของผู้เรียน (RT) ชั้นประถมศึกษาปีที่ 1',
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

-- 11. ตั้งค่านโยบายการเข้าถึงข้อมูลแบบสาธารณะ (Public Access Policies)
ALTER TABLE public.schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students_g DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_nt_assessments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_rt_assessments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.nt_assessments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rt_assessments DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students_g ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_nt_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_rt_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nt_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rt_assessments ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Public All Access" ON public.active_sessions;
DROP POLICY IF EXISTS "Public All ActiveSessions" ON public.active_sessions;
CREATE POLICY "Public All Access" ON public.active_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public All Access" ON public.academic_nt_assessments;
DROP POLICY IF EXISTS "Public All AcademicNTAssessments" ON public.academic_nt_assessments;
CREATE POLICY "Public All Access" ON public.academic_nt_assessments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public All Access" ON public.academic_rt_assessments;
DROP POLICY IF EXISTS "Public All AcademicRTAssessments" ON public.academic_rt_assessments;
CREATE POLICY "Public All Access" ON public.academic_rt_assessments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public All Access" ON public.nt_assessments;
DROP POLICY IF EXISTS "Public All NTAssessments" ON public.nt_assessments;
CREATE POLICY "Public All Access" ON public.nt_assessments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public All Access" ON public.rt_assessments;
DROP POLICY IF EXISTS "Public All RTAssessments" ON public.rt_assessments;
CREATE POLICY "Public All Access" ON public.rt_assessments FOR ALL USING (true) WITH CHECK (true);

-- สิทธิ์การเข้าถึงข้อมูลแบบสาธารณะ
GRANT USAGE ON SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, postgres, service_role;

NOTIFY pgrst, 'reload schema';
`;

