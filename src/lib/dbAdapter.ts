import { supabase, isSupabaseConfigured } from './supabase';

const db = null as any;
const doc = (...args: any[]) => null;
const setDoc = async (...args: any[]) => null;
const updateDoc = async (...args: any[]) => null;
const deleteDoc = async (...args: any[]) => null;
const getDoc = async (...args: any[]) => ({ exists: () => false, data: () => ({}) } as any);
const getDocs = async (...args: any[]) => ({ empty: true, docs: [], forEach: () => {} } as any);
const collection = (...args: any[]) => null;
const query = (...args: any[]) => null;
const where = (...args: any[]) => null;
const orderBy = (...args: any[]) => null;
const writeBatch = (...args: any[]) => ({ set: () => {}, update: () => {}, delete: () => {}, commit: async () => {} } as any);
const addDoc = async (...args: any[]) => null;

import { School, StudentData, StudentGData, UserProfile, SystemConfig, DownloadLog, AcademicRecord } from '../types';

// Helper to sanitize object before writing to Firestore
function cleanForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cleanForFirestore);
  const cleaned: any = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      cleaned[key] = cleanForFirestore(obj[key]);
    }
  }
  return cleaned;
}

/**
 * ล้างแคชในเครื่องเมื่อมีการบันทึก/แก้ไข/ลบข้อมูล
 */
export function clearAppCache(): void {
  try {
    localStorage.removeItem('mhs_app_data_cache_v3');
    sessionStorage.removeItem('mhs_app_data_cache_v3');
  } catch (e) {
    // ignore
  }
}

// -------------------------------------------------------------
// 1. SCHOOLS
// -------------------------------------------------------------
export async function dbSaveSchool(school: School, updatedBy?: string): Promise<void> {
  const schoolId = String(school.id);
  const now = new Date().toISOString();
  clearAppCache();

  // Primary Database: Supabase
  if (supabase && isSupabaseConfigured()) {
    const supabasePayload = {
      id: schoolId,
      name: school.name || '',
      district: school.district || '',
      amphoe: school.amphoe || null,
      network_group: school.networkGroup || null,
      internet_type: school.internetType || null,
      electricity: school.electricity ?? null,
      water_system: school.waterSystem || null,
      water_system_detail: school.waterSystemDetail || null,
      solar_kw: school.solarKw || null,
      has_solar_battery: Boolean(school.hasSolarBattery),
      solar_battery_capacity: school.solarBatteryCapacity || null,
      staff_count: Number(school.staffCount) || 0,
      contract_teachers_count: Number(school.contractTeachersCount) || 0,
      admin_staff_count: Number(school.adminStaffCount) || 0,
      janitor_count: Number(school.janitorCount) || 0,
      other_staff_count: Number(school.otherStaffCount) || 0,
      major_subjects: school.majorSubjects || [],
      major_subjects_with_staff: school.majorSubjectsWithStaff || [],
      classrooms: school.classrooms || [],
      director_name: school.directorName || null,
      director_phone: school.directorPhone || null,
      vice_director_name: school.viceDirectors?.[0]?.name || school.viceDirectorName || null,
      vice_director_phone: school.viceDirectors?.[0]?.phone || school.viceDirectorPhone || null,
      vice_directors: school.viceDirectors || [],
      school_phone: school.schoolPhone || null,
      email: school.email || null,
      facebook: school.facebook || null,
      line: school.line || null,
      website: school.website || null,
      address: school.address || null,
      image_url: school.imageUrl || null,
      logo_url: school.logoUrl || null,
      director_image_url: school.directorImageUrl || null,
      latitude: Number(school.latitude) || 0,
      longitude: Number(school.longitude) || 0,
      size: school.size || 'small',
      is_expansion: Boolean(school.isExpansion),
      special_highlights: school.specialHighlights || null,
      updated_at: now,
      updated_by: updatedBy || school.updatedBy || null,
    };

    let { error } = await supabase.from('schools').upsert(supabasePayload, { onConflict: 'id' });
    
    // หากติดปัญหาสคีมาบน Supabase ยังไม่มีคอลัมน์ใหม่ (เช่น PGRST204) ให้รีไทร์โดยตัดคอลัมน์ที่ไม่พบบอกออกชั่วคราว
    if (error && (error.code === 'PGRST204' || error.message?.includes('schema cache') || error.message?.includes('director_name') || error.message?.includes('column'))) {
      console.warn('⚠️ Supabase schools table is missing new columns, retrying without new columns:', error.message);
      const legacyPayload = { ...supabasePayload };
      delete (legacyPayload as any).director_name;
      delete (legacyPayload as any).vice_director_name;
      delete (legacyPayload as any).vice_director_phone;
      delete (legacyPayload as any).vice_directors;
      delete (legacyPayload as any).contract_teachers_count;
      delete (legacyPayload as any).admin_staff_count;
      delete (legacyPayload as any).janitor_count;
      delete (legacyPayload as any).other_staff_count;

      const retryResult = await supabase.from('schools').upsert(legacyPayload, { onConflict: 'id' });
      error = retryResult.error;
    }

    if (error) {
      console.error('Supabase dbSaveSchool error:', error);
      const errMsg = error.message || error.details || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      throw new Error(`Supabase dbSaveSchool error: ${errMsg}`);
    }
    console.log(`✅ Saved school ${schoolId} (${school.name}) to Supabase successfully`);
    return;
  }

  // Fallback: Firestore (เมื่อไม่ได้เปิดใช้ Supabase)
  try {
    const schoolRef = doc(db, 'schools', schoolId);
    const cleanData = cleanForFirestore({
      ...school,
      updatedAt: now,
      updatedBy: updatedBy || school.updatedBy || 'system',
    });
    await setDoc(schoolRef, cleanData, { merge: true });
    console.log(`✅ Saved school ${schoolId} (${school.name}) to Firestore successfully`);
  } catch (err) {
    console.warn('Firestore dbSaveSchool warning:', err);
    throw err;
  }
}

export async function dbDeleteSchool(schoolId: string): Promise<void> {
  clearAppCache();
  const cleanId = String(schoolId);

  if (supabase && isSupabaseConfigured()) {
    const { error } = await supabase.from('schools').delete().eq('id', cleanId);
    if (error) {
      console.error('Supabase dbDeleteSchool error:', error);
      throw error;
    }
    console.log(`✅ Deleted school ${cleanId} from Supabase`);
    return;
  }

  try {
    await deleteDoc(doc(db, 'schools', cleanId));
  } catch (err) {
    console.warn('Firestore dbDeleteSchool warning:', err);
    throw err;
  }
}

// -------------------------------------------------------------
// 2. STUDENTS (General Grade-by-Grade)
// -------------------------------------------------------------
export async function dbSaveStudent(student: StudentData): Promise<void> {
  clearAppCache();
  const docId = student.id || `${student.schoolId}_${student.academicYear}`;
  const now = new Date().toISOString();

  if (supabase && isSupabaseConfigured()) {
    const payload = {
      id: docId,
      school_id: student.schoolId,
      school_name: student.schoolName,
      academic_year: student.academicYear,
      grades: student.grades || {},
      total_male: Number(student.totalMale) || 0,
      total_female: Number(student.totalFemale) || 0,
      total_students: Number(student.totalStudents) || 0,
      updated_at: now,
    };

    const { error } = await supabase.from('students').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error('Supabase dbSaveStudent error:', error);
      throw error;
    }
    console.log(`✅ Saved student data ${docId} to Supabase`);
    return;
  }

  try {
    const studentDocRef = doc(db, 'students', docId);
    await setDoc(studentDocRef, cleanForFirestore({ ...student, id: docId, updatedAt: new Date() }), { merge: true });
  } catch (err) {
    console.warn('Firestore dbSaveStudent warning:', err);
    throw err;
  }
}

// -------------------------------------------------------------
// 2.1 USERS & AUTH PROFILE
// -------------------------------------------------------------
export async function dbSaveUser(userProfile: UserProfile): Promise<void> {
  clearAppCache();
  if (supabase && isSupabaseConfigured()) {
    const payload = {
      uid: String(userProfile.uid),
      email: userProfile.email,
      first_name: userProfile.firstName || '',
      last_name: userProfile.lastName || '',
      school_id: userProfile.schoolId || null,
      school_name: userProfile.schoolName || null,
      role: userProfile.role || 'public',
      status: userProfile.status || 'pending',
      created_at: safeToISOString(userProfile.createdAt),
    };

    const { error } = await supabase.from('users').upsert(payload, { onConflict: 'uid', ignoreDuplicates: false });
    if (error) {
      if (error.code === '23505' && userProfile.email) {
        const { error: updateErr } = await supabase
          .from('users')
          .update(payload)
          .eq('email', userProfile.email);
        if (updateErr) {
          console.warn('Supabase dbSaveUser update by email warning (RLS):', updateErr);
        }
      } else {
        console.warn('Supabase dbSaveUser error (RLS):', error);
      }
    }
    console.log(`✅ Saved user ${userProfile.email} to Supabase users table`);
    return;
  }

  try {
    const userDocRef = doc(db, 'users', userProfile.uid);
    await setDoc(userDocRef, cleanForFirestore(userProfile), { merge: true });
  } catch (err) {
    console.warn('Firestore dbSaveUser warning:', err);
    throw err;
  }
}

export async function dbUpdateUserStatus(uid: string, status: string, email?: string): Promise<void> {
  if (supabase && isSupabaseConfigured()) {
    const { error } = await supabase.from('users').update({ status }).eq('uid', uid);
    if (error && email) {
      await supabase.from('users').update({ status }).eq('email', email);
    }
    console.log(`✅ Updated user status to ${status} on Supabase (uid: ${uid}, email: ${email || 'n/a'})`);
    return;
  }

  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { status });
    if (email) {
      try {
        const q = query(collection(db, 'users'), where('email', '==', email));
        const qSnap = await getDocs(q);
        qSnap.forEach(async (docSnap) => {
          await updateDoc(docSnap.ref, { status });
        });
      } catch (e) {}
    }
  } catch (err) {
    console.warn('Firestore dbUpdateUserStatus warning:', err);
    throw err;
  }
}

export async function dbDeleteUser(uid: string, email?: string): Promise<void> {
  if (supabase && isSupabaseConfigured()) {
    const { error } = await supabase.from('users').delete().eq('uid', uid);
    if (error && email) {
      await supabase.from('users').delete().eq('email', email);
    }
    console.log(`✅ Deleted user ${uid} / ${email || ''} from Supabase`);
    return;
  }

  try {
    await deleteDoc(doc(db, 'users', uid));
    if (email) {
      try {
        const q = query(collection(db, 'users'), where('email', '==', email));
        const qSnap = await getDocs(q);
        qSnap.forEach(async (docSnap) => {
          await deleteDoc(docSnap.ref);
        });
      } catch (e) {}
    }
  } catch (err) {
    console.warn('Firestore dbDeleteUser warning:', err);
    throw err;
  }
}

export async function dbFetchUserProfile(uid: string, email?: string): Promise<UserProfile | null> {
  if (supabase && isSupabaseConfigured()) {
    try {
      let suUser: any = null;
      const { data: byUid } = await supabase.from('users').select('*').eq('uid', uid).maybeSingle();
      if (byUid) {
        suUser = byUid;
      } else if (email) {
        const { data: byEmail } = await supabase.from('users').select('*').eq('email', email).limit(1);
        if (byEmail && byEmail.length > 0) {
          suUser = byEmail[0];
        }
      }

      if (suUser) {
        return {
          uid: suUser.uid,
          email: suUser.email,
          firstName: suUser.first_name || '',
          lastName: suUser.last_name || '',
          schoolId: suUser.school_id || '',
          schoolName: suUser.school_name || '',
          role: suUser.role || 'public',
          status: suUser.status || 'pending',
          createdAt: safeToDate(suUser.created_at),
        };
      }
    } catch (err) {
      console.warn('Supabase dbFetchUserProfile warning:', err);
    }
    return null;
  }

  try {
    const userDocSnap = await getDoc(doc(db, 'users', uid));
    if (userDocSnap.exists()) {
      return { ...userDocSnap.data(), uid: userDocSnap.id } as UserProfile;
    }
    if (email) {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        const docSnap = qSnap.docs[0];
        return { ...docSnap.data(), uid: docSnap.id } as UserProfile;
      }
    }
  } catch (err) {
    console.warn('Firestore dbFetchUserProfile warning:', err);
  }

  return null;
}

export async function dbFetchUsersByStatus(status: 'pending' | 'approved' | 'all'): Promise<UserProfile[]> {
  if (supabase && isSupabaseConfigured()) {
    try {
      let queryBuilder = supabase.from('users').select('*');
      if (status !== 'all') {
        queryBuilder = queryBuilder.eq('status', status);
      }
      const { data, error } = await queryBuilder;
      if (!error && data) {
        return data.map((u: any) => ({
          uid: u.uid,
          email: u.email,
          firstName: u.first_name || '',
          lastName: u.last_name || '',
          schoolId: u.school_id || '',
          schoolName: u.school_name || '',
          role: u.role || 'public',
          status: u.status || 'pending',
          createdAt: safeToDate(u.created_at),
        }));
      }
    } catch (err) {
      console.warn('Supabase dbFetchUsersByStatus warning:', err);
    }
    return [];
  }

  try {
    let q;
    if (status === 'all') {
      q = collection(db, 'users');
    } else {
      q = query(collection(db, 'users'), where('status', '==', status));
    }
    const querySnapshot = await getDocs(q);
    const list: UserProfile[] = [];
    querySnapshot.forEach(docSnap => {
      const data = docSnap.data() as Record<string, any>;
      list.push({ ...data, uid: docSnap.id } as UserProfile);
    });
    return list;
  } catch (err) {
    console.warn('Firestore dbFetchUsersByStatus warning:', err);
    return [];
  }
}

export function normalizeUserSchoolInfo(user: UserProfile, schools: School[]): { updatedUser: UserProfile; isModified: boolean; reason?: string } {
  if (!user) {
    return { updatedUser: user, isModified: false };
  }

  // ป้องกันการแตะต้องบัญชี Super Admin
  if (user.role === 'super_admin' || user.email === 'tamrri@gmail.com' || user.email === 'ch.chapeach@gmail.com') {
    return { updatedUser: user, isModified: false };
  }

  // หน่วยงานเขตพื้นที่ / ศูนย์การศึกษา / บัญชีเฉพาะทาง (เช่น เขตพื้นที่การศึกษาอำเภอขุนยวม 58010160) ต้องคงเดิมเสมอ ห้ามเปลี่ยน
  const sNameLower = (user.schoolName || '').trim();
  const sId = (user.schoolId || '').trim();
  const isSpecialAgency =
    user.email === 'kpy.mhs1@gmail.com' ||
    sId === '58010160' ||
    sNameLower.includes('เขตพื้นที่') ||
    sNameLower.includes('สำนักงาน') ||
    sNameLower.includes('สพป') ||
    sNameLower.includes('กลุ่มโรงเรียน') ||
    sNameLower.includes('ศูนย์เครือข่าย');

  if (isSpecialAgency) {
    return { updatedUser: user, isModified: false };
  }

  if (!schools || schools.length === 0) {
    return { updatedUser: user, isModified: false };
  }

  // 1. จับคู่ด้วยรหัสโรงเรียน (schoolId) เป็นหลัก
  if (user.schoolId && user.schoolId !== 'all') {
    const schoolById = schools.find(s => s.id === user.schoolId);
    if (schoolById) {
      if (user.schoolName !== schoolById.name) {
        return {
          updatedUser: {
            ...user,
            schoolName: schoolById.name
          },
          isModified: true,
          reason: `ปรับปรุงชื่อสถานศึกษาให้ตรงกับรหัส ${schoolById.id} เป็น "${schoolById.name}"`
        };
      }
      return { updatedUser: user, isModified: false };
    }
  }

  // 2. ถ้าไม่มี schoolId หรือ schoolId ว่าง ให้ตรวจชื่อที่ตรงกันเพื่อใส่รหัสโรงเรียนให้ถูกต้อง
  if (user.schoolName && user.schoolName.trim()) {
    const rawName = user.schoolName.trim();
    const cleanName = rawName.replace(/^โรงเรียน/, '').trim();

    const schoolByName = schools.find(s => {
      const sName = s.name ? s.name.trim() : '';
      const sClean = sName.replace(/^โรงเรียน/, '').trim();
      return sName === rawName || (cleanName.length > 4 && sClean === cleanName);
    });

    if (schoolByName && (user.schoolId !== schoolByName.id || user.schoolName !== schoolByName.name)) {
      return {
        updatedUser: {
          ...user,
          schoolId: schoolByName.id,
          schoolName: schoolByName.name
        },
        isModified: true,
        reason: `จับคู่รหัสโรงเรียนให้ตรงกับ "${schoolByName.name}" (รหัส: ${schoolByName.id})`
      };
    }
  }

  return { updatedUser: user, isModified: false };
}

export async function dbRestoreKpyUser(): Promise<void> {
  try {
    if (supabase && isSupabaseConfigured()) {
      await supabase
        .from('users')
        .update({
          school_id: '58010160',
          school_name: 'เขตพื้นที่การศึกษาอำเภอขุนยวม'
        })
        .eq('email', 'kpy.mhs1@gmail.com');
    }

    const q = query(collection(db, 'users'), where('email', '==', 'kpy.mhs1@gmail.com'));
    const snap = await getDocs(q);
    snap.forEach(async (docSnap) => {
      await setDoc(doc(db, 'users', docSnap.id), {
        schoolId: '58010160',
        schoolName: 'เขตพื้นที่การศึกษาอำเภอขุนยวม'
      }, { merge: true });
    });
    console.log('✅ Restored kpy.mhs1@gmail.com to เขตพื้นที่การศึกษาอำเภอขุนยวม (58010160)');
  } catch (e) {
    console.warn('Error restoring kpy user:', e);
  }
}

export async function dbSyncAndFixAllUsers(schools: School[]): Promise<{
  totalChecked: number;
  totalFixed: number;
  fixedList: Array<{ email: string; name: string; oldSchool: string; newSchool: string; reason: string }>;
}> {
  const users = await dbFetchUsersByStatus('all');
  let fixedCount = 0;
  const fixedList: Array<{ email: string; name: string; oldSchool: string; newSchool: string; reason: string }> = [];

  for (const user of users) {
    const { updatedUser, isModified, reason } = normalizeUserSchoolInfo(user, schools);
    if (isModified) {
      try {
        await dbSaveUser(updatedUser);
        fixedCount++;
        fixedList.push({
          email: user.email || '',
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || user.uid,
          oldSchool: `${user.schoolName || 'ไม่ระบุ'} (${user.schoolId || 'ไม่มีรหัส'})`,
          newSchool: `${updatedUser.schoolName} (${updatedUser.schoolId})`,
          reason: reason || 'ปรับปรุงข้อมูลให้ตรงกับฐานข้อมูลสถานศึกษา'
        });
      } catch (err) {
        console.error(`Failed to auto-fix user ${user.email}:`, err);
      }
    }
  }

  return {
    totalChecked: users.length,
    totalFixed: fixedCount,
    fixedList
  };
}

export async function dbMigrateUsersToSupabase(client?: any): Promise<number> {
  const activeClient = client || supabase;
  if (!activeClient) return 0;

  try {
    const snap = await getDocs(collection(db, 'users'));
    if (snap.empty) return 0;

    const rawUsers = snap.docs.map(docSnap => {
      const u = docSnap.data() as any;
      return {
        uid: String(docSnap.id),
        email: u.email ? String(u.email).trim() : '',
        first_name: u.firstName || '',
        last_name: u.lastName || '',
        school_id: u.schoolId || null,
        school_name: u.schoolName || null,
        role: u.role || 'public',
        status: u.status || 'pending',
        created_at: safeToISOString(u.createdAt)
      };
    });

    const userMapByEmail = new Map<string, any>();
    const usersWithoutEmail: any[] = [];

    for (const u of rawUsers) {
      if (!u.email) {
        usersWithoutEmail.push(u);
      } else {
        const lowerEmail = u.email.toLowerCase();
        if (!userMapByEmail.has(lowerEmail)) {
          userMapByEmail.set(lowerEmail, u);
        } else {
          const existing = userMapByEmail.get(lowerEmail);
          if (u.status === 'approved' && existing.status !== 'approved') {
            userMapByEmail.set(lowerEmail, u);
          }
        }
      }
    }

    const usersToUpsert = [...Array.from(userMapByEmail.values()), ...usersWithoutEmail];

    const { error } = await activeClient.from('users').upsert(usersToUpsert, { onConflict: 'uid' });
    if (!error) {
      console.log(`✅ Migrated ${usersToUpsert.length} users to Supabase`);
      return usersToUpsert.length;
    }

    let successCount = 0;
    for (const u of usersToUpsert) {
      const { error: singleErr } = await activeClient.from('users').upsert(u, { onConflict: 'uid' });
      if (!singleErr) {
        successCount++;
      } else {
        if (singleErr.code === '23505' && u.email) {
          const { error: updateErr } = await activeClient
            .from('users')
            .update(u)
            .eq('email', u.email);
          if (!updateErr) {
            successCount++;
          }
        }
      }
    }

    console.log(`✅ Migrated ${successCount} users to Supabase (individual processing)`);
    return successCount;
  } catch (err) {
    console.error('dbMigrateUsersToSupabase exception:', err);
    throw err;
  }
}

// -------------------------------------------------------------
// 6. SYSTEM STATS / VISITOR COUNTER
// -------------------------------------------------------------
export async function dbFetchSystemStats(): Promise<any | null> {
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('system_stats').select('*').eq('id', 'visitor_count').maybeSingle();
      if (!error && data) {
        return {
          totalVisits: Number(data.total_visits) || 0,
          todayVisits: Number(data.today_visits) || 0,
          todayDate: data.today_date || '',
          dailyVisits: data.daily_visits || {},
          updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
        };
      }
    } catch (err) {
      console.warn('Supabase dbFetchSystemStats warning:', err);
    }
    return null;
  }

  try {
    const docRef = doc(db, 'system_stats', 'visitor_count');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (err) {
    console.warn('Firestore dbFetchSystemStats warning:', err);
  }

  return null;
}

export async function dbSaveSystemStats(statsData: any): Promise<void> {
  const now = new Date().toISOString();

  if (supabase && isSupabaseConfigured()) {
    const payload = {
      id: 'visitor_count',
      total_visits: Number(statsData.totalVisits) || 0,
      today_visits: Number(statsData.todayVisits) || 0,
      today_date: statsData.todayDate || new Date().toISOString().split('T')[0],
      daily_visits: statsData.dailyVisits || {},
      updated_at: now,
    };

    const { error } = await supabase.from('system_stats').upsert(payload, { onConflict: 'id' });
    if (error) {
      if (error.code === '42501' || error.code === '42P01') {
        console.warn('Supabase system_stats warning: Please run the SQL migration in Supabase to create the table and RLS policies.');
      } else {
        console.warn('Supabase dbSaveSystemStats warning:', error.message || error);
      }
      return;
    }
    return;
  }

  try {
    const docRef = doc(db, 'system_stats', 'visitor_count');
    await setDoc(docRef, cleanForFirestore({ ...statsData, updatedAt: now }), { merge: true });
  } catch (err) {
    console.warn('Firestore dbSaveSystemStats warning:', err);
    throw err;
  }
}

export async function dbMigrateSystemStatsToSupabase(client?: any): Promise<boolean> {
  const activeClient = client || supabase;
  if (!activeClient) return false;

  try {
    const docRef = doc(db, 'system_stats', 'visitor_count');
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return false;

    const data = docSnap.data();
    const payload = {
      id: 'visitor_count',
      total_visits: Number(data.totalVisits) || 0,
      today_visits: Number(data.todayVisits) || 0,
      today_date: data.todayDate || new Date().toISOString().split('T')[0],
      daily_visits: data.dailyVisits || {},
      updated_at: new Date().toISOString(),
    };

    const { error } = await activeClient.from('system_stats').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('dbMigrateSystemStatsToSupabase exception:', err);
    return false;
  }
}

// -------------------------------------------------------------
// 7. DOWNLOAD LOGS
// -------------------------------------------------------------
export async function dbFetchDownloadLogs(): Promise<DownloadLog[]> {
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('download_logs').select('*').order('timestamp', { ascending: false }).limit(200);
      if (!error && data) {
        return data.map((d: any) => ({
          id: d.id,
          name: d.name || '',
          email: d.email || '',
          schoolId: d.school_id || '',
          schoolName: d.school_name || '',
          purpose: d.purpose || '',
          timestamp: d.timestamp ? new Date(d.timestamp) : new Date(),
        }));
      }
    } catch (err) {
      console.warn('Supabase dbFetchDownloadLogs warning:', err);
    }
    return [];
  }

  try {
    const q = query(collection(db, 'download_logs'), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    const logs: DownloadLog[] = [];
    querySnapshot.forEach(docSnap => {
      const data = docSnap.data() as Record<string, any>;
      logs.push({
        id: docSnap.id,
        name: data.name || '',
        email: data.email || '',
        schoolId: data.schoolId || '',
        schoolName: data.schoolName || '',
        purpose: data.purpose || '',
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp || Date.now()),
      });
    });
    return logs;
  } catch (err) {
    console.warn('Firestore dbFetchDownloadLogs warning:', err);
    return [];
  }
}

export async function dbAddDownloadLog(logData: DownloadLog): Promise<void> {
  if (supabase && isSupabaseConfigured()) {
    const payload = {
      name: logData.name || '',
      email: logData.email || '',
      school_id: logData.schoolId || '',
      school_name: logData.schoolName || '',
      purpose: logData.purpose || '',
      timestamp: new Date().toISOString(),
    };

    const { error } = await supabase.from('download_logs').insert([payload]);
    if (error) {
      console.error('Supabase dbAddDownloadLog error:', error);
      throw error;
    }
    console.log('✅ Added download log to Supabase');
    return;
  }

  try {
    await addDoc(collection(db, 'download_logs'), cleanForFirestore(logData));
  } catch (err) {
    console.warn('Firestore dbAddDownloadLog warning:', err);
    throw err;
  }
}

export async function dbMigrateDownloadLogsToSupabase(client?: any): Promise<number> {
  const activeClient = client || supabase;
  if (!activeClient) return 0;

  try {
    const q = query(collection(db, 'download_logs'));
    const snap = await getDocs(q);
    if (snap.empty) return 0;

    const logsToInsert = snap.docs.map(docSnap => {
      const data = docSnap.data() as Record<string, any>;
      return {
        name: data.name || '',
        email: data.email || '',
        school_id: data.schoolId || '',
        school_name: data.schoolName || '',
        purpose: data.purpose || '',
        timestamp: safeToISOString(data.timestamp),
      };
    });

    const { error } = await activeClient.from('download_logs').insert(logsToInsert);
    if (error) throw error;
    return logsToInsert.length;
  } catch (err) {
    console.error('dbMigrateDownloadLogsToSupabase exception:', err);
    return 0;
  }
}

// -------------------------------------------------------------
// 8. CHECK EXISTING SCHOOL ADMIN (DUPLICATE CHECK)
// -------------------------------------------------------------
export async function dbCheckExistingSchoolAdmin(schoolId: string, excludeEmail: string): Promise<UserProfile | null> {
  const cleanEmail = excludeEmail.trim().toLowerCase();

  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('school_id', schoolId);
      if (!error && data && data.length > 0) {
        const dup = data.find((u: any) => 
          u.role === 'school_admin' && 
          (u.status === 'approved' || u.status === 'pending') && 
          u.email?.toLowerCase() !== cleanEmail
        );
        if (dup) {
          return {
            uid: dup.uid,
            email: dup.email,
            firstName: dup.first_name || '',
            lastName: dup.last_name || '',
            schoolId: dup.school_id || '',
            schoolName: dup.school_name || '',
            role: dup.role || 'school_admin',
            status: dup.status || 'pending',
            createdAt: safeToDate(dup.created_at)
          };
        }
      }
    } catch (err) {
      console.warn('Supabase dbCheckExistingSchoolAdmin warning:', err);
    }
    return null;
  }

  try {
    const qAdmins = query(collection(db, 'users'), where('schoolId', '==', schoolId));
    const existingAdminsSnap = await getDocs(qAdmins);
    if (!existingAdminsSnap.empty) {
      const duplicateAdmin = existingAdminsSnap.docs
        .map(d => ({ ...d.data(), uid: d.id } as UserProfile))
        .find(u => u.role === 'school_admin' && (u.status === 'approved' || u.status === 'pending') && u.email?.toLowerCase() !== cleanEmail);

      if (duplicateAdmin) {
        return duplicateAdmin;
      }
    }
  } catch (err) {
    console.warn('Firestore dbCheckExistingSchoolAdmin warning:', err);
  }

  return null;
}

// -------------------------------------------------------------
// 9. ACADEMIC ASSESSMENTS (ผลสัมฤทธิ์ทางการเรียน NT / RT / ONET)
// -------------------------------------------------------------
export async function dbSaveAcademicRecord(record: AcademicRecord, updatedBy?: string): Promise<void> {
  const docId = record.id || `${record.schoolId || record.order}_${record.academicYear}_${record.testType || 'NT'}`;
  const now = new Date().toISOString();
  clearAppCache();

  const payload: AcademicRecord = {
    ...record,
    id: docId,
    updatedAt: now,
    updatedBy: updatedBy || record.updatedBy || 'Super Admin'
  };

  // 1. Supabase (if available)
  if (supabase && isSupabaseConfigured()) {
    try {
      const supaPayload = {
        id: docId,
        order_num: record.order || 0,
        school_id: record.schoolId || '',
        school_name: record.schoolName || '',
        amphoe: record.amphoe || '',
        math_score: Number(record.mathScore) || 0,
        math_percentage: Number(record.mathPercentage) || 0,
        thai_score: Number(record.thaiScore) || 0,
        thai_percentage: Number(record.thaiPercentage) || 0,
        total_score: Number(record.totalScore) || 0,
        total_percentage: Number(record.totalPercentage) || 0,
        math_quality: record.mathQuality || '',
        thai_quality: record.thaiQuality || '',
        total_quality: record.totalQuality || '',
        academic_year: record.academicYear || '2567',
        test_type: record.testType || 'NT',
        test_title: record.testTitle || '',
        notes: record.notes || '',
        updated_at: now,
        updated_by: updatedBy || record.updatedBy || 'Admin'
      };
      const { error } = await supabase.from('academic_assessments').upsert(supaPayload, { onConflict: 'id' });
      if (error) {
        console.error('Supabase academic_assessments upsert error:', error);
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          throw new Error('ไม่พบตาราง "academic_assessments" บน Supabase กรุณารันคำสั่ง SQL สร้างตารางใน SQL Editor ก่อน');
        }
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          throw new Error('ติดขัดสิทธิ์ Row-Level Security (RLS) บนตาราง academic_assessments ใน Supabase กรุณารันคำสั่ง SQL ปลดล็อกสิทธิ์ก่อน');
        }
        throw new Error(`บันทึกลง Supabase ไม่สำเร็จ: ${error.message}`);
      }
    } catch (supaErr: any) {
      console.error('Supabase academic_assessments exception:', supaErr);
      throw supaErr;
    }
  }

  // 2. Firestore fallback
  try {
    const docRef = doc(db, 'academic_assessments', docId);
    await setDoc(docRef, cleanForFirestore(payload), { merge: true });
  } catch (fsErr) {
    console.warn('Firestore academic_assessments fallback warning:', fsErr);
  }
}

export async function dbSaveAcademicRecords(records: AcademicRecord[], updatedBy?: string): Promise<void> {
  if (!records || records.length === 0) return;
  clearAppCache();

  // 1. Sync to Supabase if configured (in batches of 50)
  if (supabase && isSupabaseConfigured()) {
    try {
      const supaRows = records.map(r => ({
        id: r.id || `${r.schoolId || r.order}_${r.academicYear}_${r.testType || 'NT'}`,
        order_num: r.order || 0,
        school_id: r.schoolId || '',
        school_name: r.schoolName || '',
        amphoe: r.amphoe || '',
        math_score: Number(r.mathScore) || 0,
        math_percentage: Number(r.mathPercentage) || 0,
        thai_score: Number(r.thaiScore) || 0,
        thai_percentage: Number(r.thaiPercentage) || 0,
        total_score: Number(r.totalScore) || 0,
        total_percentage: Number(r.totalPercentage) || 0,
        math_quality: r.mathQuality || '',
        thai_quality: r.thaiQuality || '',
        total_quality: r.totalQuality || '',
        academic_year: r.academicYear || '2567',
        test_type: r.testType || 'NT',
        test_title: r.testTitle || '',
        notes: r.notes || '',
        updated_at: new Date().toISOString(),
        updated_by: updatedBy || 'Admin'
      }));

      const CHUNK_SIZE = 50;
      for (let i = 0; i < supaRows.length; i += CHUNK_SIZE) {
        const chunk = supaRows.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase.from('academic_assessments').upsert(chunk, { onConflict: 'id' });
        if (error) {
          console.error(`Supabase academic_assessments batch ${i} error:`, error);
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            throw new Error('ไม่พบตาราง "academic_assessments" บน Supabase (กรุณารันคำสั่ง SQL สร้างตารางใน SQL Editor บน Supabase Dashboard ก่อน)');
          }
          if (error.code === '42501' || error.message?.includes('row-level security')) {
            throw new Error('ติดขัดสิทธิ์ Row-Level Security (RLS) บนตาราง academic_assessments ใน Supabase (กรุณารันคำสั่ง SQL ปลดล็อก RLS ก่อน)');
          }
          throw new Error(`บันทึกลง Supabase ไม่สำเร็จ: ${error.message}`);
        }
      }
    } catch (e: any) {
      console.error('Supabase batch upsert exception:', e);
      throw e;
    }
  }

  // 2. Firestore Batch Commit (limit 400 per batch)
  try {
    const batchSize = 400;
    for (let i = 0; i < records.length; i += batchSize) {
      const chunk = records.slice(i, i + batchSize);
      const batch = writeBatch(db);

      for (const record of chunk) {
        const docId = record.id || `${record.schoolId || record.order}_${record.academicYear}_${record.testType || 'NT'}`;
        const now = new Date().toISOString();
        const payload: AcademicRecord = {
          ...record,
          id: docId,
          updatedAt: now,
          updatedBy: updatedBy || record.updatedBy || 'Super Admin'
        };
        const docRef = doc(db, 'academic_assessments', docId);
        batch.set(docRef, cleanForFirestore(payload), { merge: true });
      }

      await batch.commit();
    }
  } catch (fsErr) {
    console.warn('Firestore batch write notice:', fsErr);
  }
}

export async function dbFetchAcademicRecords(): Promise<AcademicRecord[]> {
  // 1. Try Supabase
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('academic_assessments').select('*').order('order_num', { ascending: true });
      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          order: Number(d.order_num) || 0,
          schoolId: d.school_id || '',
          schoolName: d.school_name || '',
          amphoe: d.amphoe || '',
          mathScore: Number(d.math_score) || 0,
          mathPercentage: Number(d.math_percentage) || 0,
          thaiScore: Number(d.thai_score) || 0,
          thaiPercentage: Number(d.thai_percentage) || 0,
          totalScore: Number(d.total_score) || 0,
          totalPercentage: Number(d.total_percentage) || 0,
          mathQuality: d.math_quality || 'พอใช้',
          thaiQuality: d.thai_quality || 'พอใช้',
          totalQuality: d.total_quality || 'พอใช้',
          academicYear: d.academic_year || '2567',
          testType: d.test_type || 'NT',
          testTitle: d.test_title || '',
          notes: d.notes || '',
          updatedAt: d.updated_at,
          updatedBy: d.updated_by
        }));
      }
    } catch (supaErr) {
      console.warn('Supabase dbFetchAcademicRecords warning:', supaErr);
    }
  }

  // 2. Firestore
  try {
    const snap = await getDocs(collection(db, 'academic_assessments'));
    if (!snap.empty) {
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as AcademicRecord));
      return list.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
  } catch (err) {
    console.warn('Firestore dbFetchAcademicRecords warning:', err);
  }

  return [];
}

export async function dbDeleteAcademicRecord(id: string): Promise<void> {
  clearAppCache();
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('academic_assessments').delete().eq('id', id);
    } catch (e) {
      // ignore
    }
  }
  const docRef = doc(db, 'academic_assessments', id);
  await deleteDoc(docRef);
}

export async function dbDeleteAcademicRecordsByYear(academicYear: string, testType?: string): Promise<number> {
  const cleanYear = String(academicYear).trim();
  clearAppCache();
  let count = 0;

  // Supabase deletion
  if (supabase && isSupabaseConfigured()) {
    try {
      let query = supabase.from('academic_assessments').delete().eq('academic_year', cleanYear);
      if (testType && testType !== 'all') {
        query = query.eq('test_type', testType);
      }
      const { error } = await query;
      if (error) {
        console.warn('Supabase delete academic by year error:', error);
      }
    } catch (e) {
      console.warn('Supabase delete academic by year error:', e);
    }
  }

  // Firestore deletion
  try {
    const snap = await getDocs(collection(db, 'academic_assessments'));
    const toDeleteDocs: string[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      const dYear = String(d.academicYear || '').trim();
      const dType = d.testType || 'NT';
      if (!cleanYear || dYear === cleanYear) {
        if (!testType || testType === 'all' || dType === testType) {
          toDeleteDocs.push(docSnap.id);
        }
      }
    });

    // Delete in batches of 400
    const batchSize = 400;
    for (let i = 0; i < toDeleteDocs.length; i += batchSize) {
      const chunk = toDeleteDocs.slice(i, i + batchSize);
      const batch = writeBatch(db);
      for (const id of chunk) {
        batch.delete(doc(db, 'academic_assessments', id));
      }
      await batch.commit();
      count += chunk.length;
    }
  } catch (err) {
    console.warn('Firestore dbDeleteAcademicRecordsByYear warning:', err);
  }

  return count;
}

export async function dbMigrateAcademicAssessmentsToSupabase(client?: any): Promise<number> {
  const activeClient = client || supabase;
  if (!activeClient) return 0;

  try {
    const snap = await getDocs(collection(db, 'academic_assessments'));
    if (snap.empty) return 0;

    const rows = snap.docs.map(docSnap => {
      const r = docSnap.data() as any;
      return {
        id: docSnap.id,
        order_num: Number(r.order) || 0,
        school_id: r.schoolId || '',
        school_name: r.schoolName || '',
        amphoe: r.amphoe || '',
        math_score: Number(r.mathScore) || 0,
        math_percentage: Number(r.mathPercentage) || 0,
        thai_score: Number(r.thaiScore) || 0,
        thai_percentage: Number(r.thaiPercentage) || 0,
        total_score: Number(r.totalScore) || 0,
        total_percentage: Number(r.totalPercentage) || 0,
        math_quality: r.mathQuality || 'พอใช้',
        thai_quality: r.thaiQuality || 'พอใช้',
        total_quality: r.totalQuality || 'พอใช้',
        academic_year: r.academicYear || '2567',
        test_type: r.testType || 'NT',
        test_title: r.testTitle || '',
        notes: r.notes || '',
        updated_at: safeToISOString(r.updatedAt),
        updated_by: r.updatedBy || 'Super Admin'
      };
    });

    const batchSize = 50;
    let successCount = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await activeClient.from('academic_assessments').upsert(batch, { onConflict: 'id' });
      if (!error) {
        successCount += batch.length;
      } else {
        console.warn('academic_assessments upsert notice:', error.message);
      }
    }

    console.log(`✅ Migrated ${successCount} academic assessment records to Supabase`);
    return successCount;
  } catch (err) {
    console.error('dbMigrateAcademicAssessmentsToSupabase exception:', err);
    return 0;
  }
}


export function safeToDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (val && typeof val === 'object' && 'toDate' in val && typeof val.toDate === 'function') {
    return val.toDate();
  }
  const str = String(val);
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) return new Date(parsed);
  return new Date();
}

export function safeToISOString(val: any): string {
  try {
    return safeToDate(val).toISOString();
  } catch (e) {
    return new Date().toISOString();
  }
}


// -------------------------------------------------------------
// 3. STUDENT OPERATIONS (General & G)
// -------------------------------------------------------------
export async function dbSaveStudentG(student: StudentGData): Promise<void> {
  clearAppCache();
  const docId = student.id || `${student.schoolId}_g_${student.academicYear}`;
  const now = new Date().toISOString();

  if (supabase && isSupabaseConfigured()) {
    const payload = {
      id: docId,
      school_id: student.schoolId,
      school_name: student.schoolName,
      academic_year: student.academicYear,
      total_g_students: Number(student.totalGStudents) || 0,
      male_g_count: Number(student.maleGCount) || 0,
      female_g_count: Number(student.femaleGCount) || 0,
      notes: student.notes || '',
      updated_at: now,
    };

    const { error } = await supabase.from('students_g').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error('Supabase dbSaveStudentG error:', error);
      throw error;
    }
    console.log(`✅ Saved student G data ${docId} to Supabase`);
    return;
  }

  try {
    const studentDocRef = doc(db, 'students_g', docId);
    await setDoc(studentDocRef, cleanForFirestore({ ...student, id: docId, updatedAt: new Date() }), { merge: true });
  } catch (err) {
    console.warn('Firestore dbSaveStudentG warning:', err);
    throw err;
  }
}

export async function dbDeleteStudent(docId: string, schoolId?: string, academicYear?: string): Promise<void> {
  clearAppCache();
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('students').delete().eq('id', docId);
      if (schoolId && academicYear) {
        await supabase.from('students').delete().match({ school_id: schoolId, academic_year: academicYear });
      }
    } catch (e) {
      console.warn('Supabase dbDeleteStudent error:', e);
    }
  }

  try {
    await deleteDoc(doc(db, 'students', docId));
    if (schoolId && academicYear) {
      try {
        const altId = `${schoolId}_${academicYear}`;
        if (altId !== docId) {
          await deleteDoc(doc(db, 'students', altId));
        }
      } catch (e) {}
    }
  } catch (err) {
    console.warn('Firestore dbDeleteStudent warning:', err);
    throw err;
  }
}

export async function dbDeleteStudentG(docId: string, schoolId?: string, academicYear?: string): Promise<void> {
  clearAppCache();
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('students_g').delete().eq('id', docId);
      if (schoolId && academicYear) {
        await supabase.from('students_g').delete().match({ school_id: schoolId, academic_year: academicYear });
      }
    } catch (e) {
      console.warn('Supabase dbDeleteStudentG error:', e);
    }
  }

  try {
    await deleteDoc(doc(db, 'students_g', docId));
    if (schoolId && academicYear) {
      try {
        const altId1 = `${schoolId}_g_${academicYear}`;
        const altId2 = `${schoolId}_${academicYear}`;
        if (altId1 !== docId) await deleteDoc(doc(db, 'students_g', altId1));
        if (altId2 !== docId) await deleteDoc(doc(db, 'students_g', altId2));
      } catch (e) {}
    }
  } catch (err) {
    console.warn('Firestore dbDeleteStudentG warning:', err);
    throw err;
  }
}

export async function dbDeleteStudentsByYear(academicYear: string): Promise<number> {
  clearAppCache();
  const cleanYear = String(academicYear).trim();
  let count = 0;

  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('students').delete().eq('academic_year', cleanYear);
    } catch (e) {
      console.warn('Supabase dbDeleteStudentsByYear warning:', e);
    }
  }

  try {
    const snap = await getDocs(collection(db, 'students'));
    const toDelete: string[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (String(data.academicYear || '').trim() === cleanYear) {
        toDelete.push(d.id);
      }
    });

    const batchSize = 400;
    for (let i = 0; i < toDelete.length; i += batchSize) {
      const chunk = toDelete.slice(i, i + batchSize);
      const batch = writeBatch(db);
      for (const id of chunk) {
        batch.delete(doc(db, 'students', id));
      }
      await batch.commit();
      count += chunk.length;
    }
  } catch (err) {
    console.warn('Firestore dbDeleteStudentsByYear warning:', err);
  }

  return count;
}

export async function dbDeleteStudentsGByYear(academicYear: string): Promise<number> {
  clearAppCache();
  const cleanYear = String(academicYear).trim();
  let count = 0;

  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('students_g').delete().eq('academic_year', cleanYear);
    } catch (e) {
      console.warn('Supabase dbDeleteStudentsGByYear warning:', e);
    }
  }

  try {
    const snap = await getDocs(collection(db, 'students_g'));
    const toDelete: string[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (String(data.academicYear || '').trim() === cleanYear) {
        toDelete.push(d.id);
      }
    });

    const batchSize = 400;
    for (let i = 0; i < toDelete.length; i += batchSize) {
      const chunk = toDelete.slice(i, i + batchSize);
      const batch = writeBatch(db);
      for (const id of chunk) {
        batch.delete(doc(db, 'students_g', id));
      }
      await batch.commit();
      count += chunk.length;
    }
  } catch (err) {
    console.warn('Firestore dbDeleteStudentsGByYear warning:', err);
  }

  return count;
}

export async function dbCleanCorruptStudentsG(): Promise<number> {
  clearAppCache();
  let cleaned = 0;

  if (supabase && isSupabaseConfigured()) {
    try {
      const { data } = await supabase.from('students_g').select('*');
      if (data) {
        for (const item of data) {
          if (!item.school_id || !item.school_name || item.school_name.includes('undefined')) {
            await supabase.from('students_g').delete().eq('id', item.id);
            cleaned++;
          }
        }
      }
    } catch (e) {
      console.warn('Supabase dbCleanCorruptStudentsG warning:', e);
    }
  }

  try {
    const snap = await getDocs(collection(db, 'students_g'));
    const toDelete: string[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (!data.schoolId || !data.schoolName || String(data.schoolName).includes('undefined')) {
        toDelete.push(d.id);
      }
    });

    for (const id of toDelete) {
      await deleteDoc(doc(db, 'students_g', id));
      cleaned++;
    }
  } catch (err) {
    console.warn('Firestore dbCleanCorruptStudentsG warning:', err);
  }

  return cleaned;
}

export async function dbSaveSystemConfig(config: Partial<SystemConfig> | any): Promise<void> {
  clearAppCache();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data: existing } = await supabase.from('settings').select('config').eq('id', 'system_config').maybeSingle();
      const mergedConfig = existing?.config ? { ...existing.config, ...config } : config;
      await supabase.from('settings').upsert({ id: 'system_config', config: mergedConfig, updated_at: new Date().toISOString() });
    } catch (e) {
      console.warn('Supabase dbSaveSystemConfig warning:', e);
    }
  }

  try {
    await setDoc(doc(db, 'settings', 'system_config'), cleanForFirestore(config), { merge: true });
  } catch (err) {
    console.warn('Firestore dbSaveSystemConfig warning:', err);
    throw err;
  }
}

export async function dbFetchSystemConfig(): Promise<SystemConfig | null> {
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('settings').select('config').eq('id', 'system_config').maybeSingle();
      if (!error && data?.config) {
        return data.config as SystemConfig;
      }
    } catch (e) {
      console.warn('Supabase dbFetchSystemConfig warning:', e);
    }
  }

  try {
    const snap = await getDoc(doc(db, 'settings', 'system_config'));
    if (snap.exists()) {
      return snap.data() as SystemConfig;
    }
  } catch (err) {
    console.warn('Firestore dbFetchSystemConfig warning:', err);
  }

  return null;
}
