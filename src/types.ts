export interface MajorSubjectStaff {
  name: string;
  teachersCount: number;
}

export interface Classroom {
  id: string;
  name: string;
  gradeLevel?: string;
  teacherName?: string;
  maleCount?: number;
  femaleCount?: number;
  studentCount?: number;
  staffCount?: number;
  electricity?: string | boolean;
  internetType?: string;
  isRemoteBranch?: boolean;
  latitude?: number;
  longitude?: number;
  solarKw?: string | number;
  phone?: string;
  notes?: string;
}

export interface School {
  id: string;
  name: string;
  district?: string;
  amphoe: string;
  network_group: string;
  internet_type: string | null;
  electricity: boolean | string | null;
  water_system: string | null;
  water_system_detail: string | null;
  solar_kw: number | string | null;
  has_solar_battery: boolean | null;
  solar_battery_capacity: string | number | null;
  staff_count: number;
  other_staff_count?: number;
  major_subjects: string[];
  major_subjects_with_staff: MajorSubjectStaff[];
  classrooms?: Classroom[];
  director_phone?: string;
  school_phone?: string;
  address?: string;
  subdistrict?: string;
  image_url?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  position?: string;
  role: 'super_admin' | 'school_admin' | 'teacher' | 'viewer';
  school_id: string;
  school_name: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export type DatabaseSourceType = 'local' | 'hostatom' | 'firebase';

export interface DatabaseConfig {
  primarySource: DatabaseSourceType;
  hostatom: {
    apiUrl: string;
    apiKey?: string;
    databaseName: string;
    tableName: string;
    isConnected: boolean;
    lastSynced?: string;
  };
  firebase: {
    projectId: string;
    isConnected: boolean;
  };
}

