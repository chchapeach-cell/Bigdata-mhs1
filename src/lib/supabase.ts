import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read Supabase environment variables or localStorage overrides
const env = (import.meta as any).env || {};
let rawSupabaseUrl = env.VITE_SUPABASE_URL || localStorage.getItem('override_supabase_url') || '';
if (rawSupabaseUrl && !rawSupabaseUrl.startsWith('http')) {
  rawSupabaseUrl = 'https://' + rawSupabaseUrl;
}
const supabaseUrl = rawSupabaseUrl;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('override_supabase_anon_key') || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const SUPABASE_FIX_RLS_SQL = `-- -------------------------------------------------------------
-- คำสั่งปลดล็อก RLS (Row Level Security) สำหรับ Supabase SQL Editor
-- เพื่อให้ระบบสามารถบันทึกและย้ายข้อมูลเข้า Supabase ได้ทันที
-- -------------------------------------------------------------

ALTER TABLE public.schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students_g DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_logs DISABLE ROW LEVEL SECURITY;

-- สิทธิ์การเข้าถึงข้อมูลแบบสาธารณะสำหรับทุกตาราง
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, postgres, service_role;
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

-- ปิดใช้งาน RLS ชั่วคราวเพื่อให้สามารถนำเข้าข้อมูลผ่าน API และ Client ได้ทันทีโดยไม่ติดขัดเรื่อง permissions
ALTER TABLE public.schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students_g DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_logs DISABLE ROW LEVEL SECURITY;

-- สิทธิ์การเข้าถึงข้อมูลแบบสาธารณะ
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, postgres, service_role;
`;

