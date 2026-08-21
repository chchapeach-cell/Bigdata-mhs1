import { supabase, isSupabaseConfigured } from './supabase';
import { db } from '../firebase';
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  writeBatch,
  addDoc,
  onSnapshot
} from 'firebase/firestore';

import { School, StudentData, StudentGData, UserProfile, SystemConfig, DownloadLog, AcademicRecord, UserActivityLog } from '../types';

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
      const userFields = 'uid, email, first_name, last_name, school_id, school_name, role, status, created_at';
      const { data: byUid } = await supabase.from('users').select(userFields).eq('uid', uid).maybeSingle();
      if (byUid) {
        suUser = byUid;
      } else if (email) {
        const { data: byEmail } = await supabase.from('users').select(userFields).eq('email', email).limit(1);
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
      const userFields = 'uid, email, first_name, last_name, school_id, school_name, role, status, created_at';
      let queryBuilder = supabase.from('users').select(userFields);
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
      const statsFields = 'id, total_visits, today_visits, today_date, daily_visits, monthly_visits, yearly_visits, hourly_visits, updated_at';
      const { data, error } = await supabase.from('system_stats').select(statsFields).eq('id', 'visitor_count').maybeSingle();
      if (!error && data) {
        return {
          totalVisits: Number(data.total_visits) || 0,
          todayVisits: Number(data.today_visits) || 0,
          todayDate: data.today_date || '',
          dailyVisits: data.daily_visits || {},
          monthlyVisits: data.monthly_visits || {},
          yearlyVisits: data.yearly_visits || {},
          hourlyVisits: data.hourly_visits || {},
          updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
        };
      }
    } catch (err) {
      console.warn('Supabase dbFetchSystemStats warning:', err);
    }
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

export function dbSubscribeSystemStats(callback: (stats: any) => void): () => void {
  if (supabase && isSupabaseConfigured()) {
    try {
      const channel = supabase
        .channel('public:system_stats')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'system_stats' },
          (payload: any) => {
            if (payload && payload.new) {
              const data = payload.new;
              callback({
                id: data.id || 'visitor_count',
                totalVisits: Number(data.total_visits) || 0,
                todayVisits: Number(data.today_visits) || 0,
                todayDate: data.today_date || '',
                dailyVisits: data.daily_visits || {},
                monthlyVisits: data.monthly_visits || {},
                yearlyVisits: data.yearly_visits || {},
                hourlyVisits: data.hourly_visits || {},
                updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Supabase dbSubscribeSystemStats realtime warning:', err);
    }
  }

  try {
    const docRef = doc(db, 'system_stats', 'visitor_count');
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data());
      }
    }, (err) => {
      console.warn('Firestore dbSubscribeSystemStats onSnapshot warning:', err);
    });
  } catch (err) {
    console.warn('dbSubscribeSystemStats setup warning:', err);
    return () => {};
  }
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
      monthly_visits: statsData.monthlyVisits || {},
      yearly_visits: statsData.yearlyVisits || {},
      hourly_visits: statsData.hourlyVisits || {},
      updated_at: now,
    };

    try {
      const { error } = await supabase.from('system_stats').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('Supabase dbSaveSystemStats warning:', error.message || error);
      }
    } catch (e) {
      console.warn('Supabase dbSaveSystemStats exception:', e);
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
      monthly_visits: data.monthlyVisits || {},
      yearly_visits: data.yearlyVisits || {},
      hourly_visits: data.hourlyVisits || {},
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
      const logFields = 'id, name, email, school_id, school_name, purpose, timestamp';
      const { data, error } = await supabase.from('download_logs').select(logFields).order('timestamp', { ascending: false }).limit(200);
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
      const userFields = 'uid, email, first_name, last_name, school_id, school_name, role, status, created_at';
      const { data, error } = await supabase.from('users').select(userFields).eq('school_id', schoolId);
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
// 9. ACADEMIC ASSESSMENTS (ผลสัมฤทธิ์ทางการเรียน NT / RT แยกตารางเฉพาะ)
//    - academic_nt_assessments (ผลการประเมิน NT ชั้น ป.3)
//    - academic_rt_assessments (ผลการประเมิน RT ชั้น ป.1)
// -------------------------------------------------------------
export function getAcademicTableName(testType?: string): 'academic_nt_assessments' | 'academic_rt_assessments' {
  return String(testType).toUpperCase() === 'RT' ? 'academic_rt_assessments' : 'academic_nt_assessments';
}

// Helper to upsert to Supabase with fallback to alternative table names
async function supaUpsertWithFallback(candidateTables: string[] | string, payload: any, onConflict = 'id') {
  if (!supabase || !isSupabaseConfigured()) return;
  
  const tables = Array.isArray(candidateTables) ? candidateTables : [candidateTables];
  let lastError: any = null;

  for (const tbl of tables) {
    try {
      const { error } = await supabase.from(tbl).upsert(payload, { onConflict });
      if (!error) {
        return;
      }
      lastError = error;
      console.warn(`Supabase upsert attempt on "${tbl}" notice:`, error.message, error.code);
    } catch (e: any) {
      lastError = e;
    }
  }

  if (lastError) {
    console.error(`Supabase upsert failed across candidate tables [${tables.join(', ')}]:`, lastError);
    if (lastError.code === '42501' || lastError.message?.includes('row-level security')) {
      throw new Error(`ติดขัดสิทธิ์ Row-Level Security (RLS) บน Supabase กรุณารันคำสั่ง SQL ปลดล็อกสิทธิ์ในระบบ Supabase Dashboard`);
    }
    if (lastError.code === 'PGRST205' || lastError.code === '42P01' || lastError.message?.includes('schema cache') || lastError.message?.includes('does not exist')) {
      throw new Error(`ไม่พบตาราง ${tables[0]} บน Supabase (รหัส PGRST205) กรุณารันคำสั่ง SQL สร้างตารางใน Supabase Dashboard`);
    }
    throw new Error(`บันทึกลง Supabase ไม่สำเร็จ (${tables[0]}): ${lastError.message || 'Unknown error'}`);
  }
}

// ==========================================
// 9.1 NT ASSESSMENTS (ผลการประเมิน NT ชั้น ป.3)
// ==========================================

export async function dbSaveNTRecord(record: AcademicRecord, updatedBy?: string): Promise<void> {
  const docId = record.id || `${record.schoolId || record.order}_${record.academicYear}_NT`;
  const now = new Date().toISOString();
  clearAppCache();

  // Supabase direct save
  if (supabase && isSupabaseConfigured()) {
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
      math_quality: record.mathQuality || 'พอใช้',
      thai_quality: record.thaiQuality || 'พอใช้',
      total_quality: record.totalQuality || 'พอใช้',
      academic_year: record.academicYear || '2567',
      test_type: 'NT',
      test_title: record.testTitle || 'การประเมินคุณภาพผู้เรียน (NT) ชั้นประถมศึกษาปีที่ 3',
      notes: record.notes || '',
      updated_at: now,
      updated_by: updatedBy || record.updatedBy || 'Admin'
    };

    await supaUpsertWithFallback(['nt_assessments', 'academic_nt_assessments', 'academic_assessments'], supaPayload);
    return;
  }

  throw new Error('กรุณาตั้งค่าเชื่อมต่อกับฐานข้อมูล Supabase ก่อนบันทึกข้อมูล');
}

export async function dbSaveNTRecords(
  records: AcademicRecord[],
  updatedBy?: string,
  onProgress?: (percent: number, message: string) => void
): Promise<void> {
  if (!records || records.length === 0) return;
  clearAppCache();
  onProgress?.(10, `กำลังเตรียมข้อมูล NT จำนวน ${records.length} รายการ...`);

  // Supabase direct batch save (chunks of 50)
  if (supabase && isSupabaseConfigured()) {
    const supaRows = records.map(r => ({
      id: r.id || `${r.schoolId || r.order}_${r.academicYear}_NT`,
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
      math_quality: r.mathQuality || 'พอใช้',
      thai_quality: r.thaiQuality || 'พอใช้',
      total_quality: r.totalQuality || 'พอใช้',
      academic_year: r.academicYear || '2567',
      test_type: 'NT',
      test_title: r.testTitle || 'การประเมินคุณภาพผู้เรียน (NT) ชั้นประถมศึกษาปีที่ 3',
      notes: r.notes || '',
      updated_at: new Date().toISOString(),
      updated_by: updatedBy || 'Admin'
    }));

    const CHUNK_SIZE = 50;
    for (let i = 0; i < supaRows.length; i += CHUNK_SIZE) {
      const chunk = supaRows.slice(i, i + CHUNK_SIZE);
      const chunkPct = 10 + Math.round(((i + chunk.length) / supaRows.length) * 85);
      onProgress?.(chunkPct, `กำลังบันทึกลง Supabase (${Math.min(i + chunk.length, supaRows.length)}/${supaRows.length} รายการ)...`);
      await supaUpsertWithFallback(['nt_assessments', 'academic_nt_assessments', 'academic_assessments'], chunk);
    }

    onProgress?.(100, `บันทึกข้อมูล NT ${records.length} รายการลง Supabase สำเร็จเรียบร้อย`);
    return;
  }

  throw new Error('กรุณาตั้งค่าเชื่อมต่อกับฐานข้อมูล Supabase ก่อนบันทึกข้อมูล');
}

export async function dbFetchNTRecords(): Promise<AcademicRecord[]> {
  const mapNTRow = (d: any): AcademicRecord => ({
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
    testType: 'NT',
    testTitle: d.test_title || 'การประเมินคุณภาพผู้เรียน (NT) ชั้นประถมศึกษาปีที่ 3',
    notes: d.notes || '',
    updatedAt: d.updated_at,
    updatedBy: d.updated_by
  });

  // Supabase direct fetch
  if (supabase && isSupabaseConfigured()) {
    const candidateTables = ['nt_assessments', 'academic_nt_assessments', 'academic_assessments'];
    const ntFields = 'id, order_num, school_id, school_name, amphoe, math_score, math_percentage, thai_score, thai_percentage, total_score, total_percentage, math_quality, thai_quality, total_quality, academic_year, test_type, test_title, notes, updated_at, updated_by';
    for (const tbl of candidateTables) {
      try {
        let query = supabase.from(tbl).select(ntFields);
        if (tbl === 'academic_assessments') {
          query = query.eq('test_type', 'NT');
        }
        
        let res = await query.order('order_num', { ascending: true });
        if (res.error && (res.error.code === '42703' || res.error.message?.includes('order_num'))) {
          // If order_num column doesn't exist, query raw
          res = await supabase.from(tbl).select(ntFields);
          if (tbl === 'academic_assessments') {
            res = await supabase.from(tbl).select(ntFields).eq('test_type', 'NT');
          }
        }

        if (!res.error && res.data && res.data.length > 0) {
          const mapped = res.data.map(mapNTRow);
          return mapped.sort((a, b) => (a.order || 0) - (b.order || 0));
        }
      } catch (supaErr) {
        console.warn(`Supabase dbFetchNTRecords from ${tbl} notice:`, supaErr);
      }
    }
  }

  return [];
}

export async function dbDeleteNTRecord(id: string): Promise<void> {
  clearAppCache();
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('academic_nt_assessments').delete().eq('id', id);
      await supabase.from('nt_assessments').delete().eq('id', id);
      await supabase.from('academic_assessments').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase dbDeleteNTRecord error:', e);
    }
  }
}

export async function dbDeleteNTRecordsByYear(academicYear: string): Promise<number> {
  const cleanYear = String(academicYear || '').trim();
  clearAppCache();
  let count = 0;

  if (supabase && isSupabaseConfigured()) {
    try {
      if (cleanYear) {
        const { error, count: deletedCount } = await supabase
          .from('nt_assessments')
          .delete({ count: 'exact' })
          .eq('academic_year', cleanYear);
        if (!error && typeof deletedCount === 'number') count = deletedCount;
        
        await Promise.allSettled([
          supabase.from('academic_nt_assessments').delete().eq('academic_year', cleanYear),
          supabase.from('academic_assessments').delete().eq('academic_year', cleanYear).eq('test_type', 'NT')
        ]);
      } else {
        const { error, count: deletedCount } = await supabase
          .from('nt_assessments')
          .delete({ count: 'exact' })
          .neq('id', '');
        if (!error && typeof deletedCount === 'number') count = deletedCount;

        await Promise.allSettled([
          supabase.from('academic_nt_assessments').delete().neq('id', ''),
          supabase.from('academic_assessments').delete().eq('test_type', 'NT')
        ]);
      }
    } catch (e) {
      console.warn('Supabase dbDeleteNTRecordsByYear error:', e);
    }
  }

  return count;
}

// ==========================================
// 9.2 RT ASSESSMENTS (ผลการประเมิน RT ชั้น ป.1)
// ==========================================

export async function dbSaveRTRecord(record: AcademicRecord, updatedBy?: string): Promise<void> {
  const docId = record.id || `${record.schoolId || record.order}_${record.academicYear}_RT`;
  const now = new Date().toISOString();
  clearAppCache();

  // Supabase direct save
  if (supabase && isSupabaseConfigured()) {
    const supaPayload = {
      id: docId,
      order_num: record.order || 0,
      school_id: record.schoolId || '',
      school_name: record.schoolName || '',
      amphoe: record.amphoe || '',
      reading_aloud_score: Number(record.mathScore) || 0,
      reading_aloud_percentage: Number(record.mathPercentage) || 0,
      reading_comprehension_score: Number(record.thaiScore) || 0,
      reading_comprehension_percentage: Number(record.thaiPercentage) || 0,
      math_score: Number(record.mathScore) || 0,
      math_percentage: Number(record.mathPercentage) || 0,
      thai_score: Number(record.thaiScore) || 0,
      thai_percentage: Number(record.thaiPercentage) || 0,
      total_score: Number(record.totalScore) || 0,
      total_percentage: Number(record.totalPercentage) || 0,
      reading_aloud_quality: record.mathQuality || 'พอใช้',
      reading_comprehension_quality: record.thaiQuality || 'พอใช้',
      math_quality: record.mathQuality || 'พอใช้',
      thai_quality: record.thaiQuality || 'พอใช้',
      total_quality: record.totalQuality || 'พอใช้',
      academic_year: record.academicYear || '2567',
      test_type: 'RT',
      test_title: record.testTitle || 'การประเมินความสามารถด้านการอ่านของผู้เรียน (RT) ชั้นประถมศึกษาปีที่ 1',
      notes: record.notes || '',
      updated_at: now,
      updated_by: updatedBy || record.updatedBy || 'Admin'
    };

    await supaUpsertWithFallback(['rt_assessments', 'academic_rt_assessments', 'academic_assessments'], supaPayload);
    return;
  }

  throw new Error('กรุณาตั้งค่าเชื่อมต่อกับฐานข้อมูล Supabase ก่อนบันทึกข้อมูล');
}

export async function dbSaveRTRecords(
  records: AcademicRecord[],
  updatedBy?: string,
  onProgress?: (percent: number, message: string) => void
): Promise<void> {
  if (!records || records.length === 0) return;
  clearAppCache();
  onProgress?.(10, `กำลังเตรียมข้อมูล RT จำนวน ${records.length} รายการ...`);

  // Supabase direct batch save (chunks of 50)
  if (supabase && isSupabaseConfigured()) {
    const supaRows = records.map(r => ({
      id: r.id || `${r.schoolId || r.order}_${r.academicYear}_RT`,
      order_num: r.order || 0,
      school_id: r.schoolId || '',
      school_name: r.schoolName || '',
      amphoe: r.amphoe || '',
      reading_aloud_score: Number(r.mathScore) || 0,
      reading_aloud_percentage: Number(r.mathPercentage) || 0,
      reading_comprehension_score: Number(r.thaiScore) || 0,
      reading_comprehension_percentage: Number(r.thaiPercentage) || 0,
      math_score: Number(r.mathScore) || 0,
      math_percentage: Number(r.mathPercentage) || 0,
      thai_score: Number(r.thaiScore) || 0,
      thai_percentage: Number(r.thaiPercentage) || 0,
      total_score: Number(r.totalScore) || 0,
      total_percentage: Number(r.totalPercentage) || 0,
      reading_aloud_quality: r.mathQuality || 'พอใช้',
      reading_comprehension_quality: r.thaiQuality || 'พอใช้',
      math_quality: r.mathQuality || 'พอใช้',
      thai_quality: r.thaiQuality || 'พอใช้',
      total_quality: r.totalQuality || 'พอใช้',
      academic_year: r.academicYear || '2567',
      test_type: 'RT',
      test_title: r.testTitle || 'การประเมินความสามารถด้านการอ่านของผู้เรียน (RT) ชั้นประถมศึกษาปีที่ 1',
      notes: r.notes || '',
      updated_at: new Date().toISOString(),
      updated_by: updatedBy || 'Admin'
    }));

    const CHUNK_SIZE = 50;
    for (let i = 0; i < supaRows.length; i += CHUNK_SIZE) {
      const chunk = supaRows.slice(i, i + CHUNK_SIZE);
      const chunkPct = 10 + Math.round(((i + chunk.length) / supaRows.length) * 85);
      onProgress?.(chunkPct, `กำลังบันทึกลง Supabase (${Math.min(i + chunk.length, supaRows.length)}/${supaRows.length} รายการ)...`);
      await supaUpsertWithFallback(['rt_assessments', 'academic_rt_assessments', 'academic_assessments'], chunk);
    }

    onProgress?.(100, `บันทึกข้อมูล RT ${records.length} รายการลง Supabase สำเร็จเรียบร้อย`);
    return;
  }

  throw new Error('กรุณาตั้งค่าเชื่อมต่อกับฐานข้อมูล Supabase ก่อนบันทึกข้อมูล');
}

export async function dbFetchRTRecords(): Promise<AcademicRecord[]> {
  const mapRTRow = (d: any): AcademicRecord => ({
    id: d.id,
    order: Number(d.order_num) || 0,
    schoolId: d.school_id || '',
    schoolName: d.school_name || '',
    amphoe: d.amphoe || '',
    mathScore: Number(d.reading_aloud_score ?? d.math_score) || 0,
    mathPercentage: Number(d.reading_aloud_percentage ?? d.math_percentage) || 0,
    thaiScore: Number(d.reading_comprehension_score ?? d.thai_score) || 0,
    thaiPercentage: Number(d.reading_comprehension_percentage ?? d.thai_percentage) || 0,
    totalScore: Number(d.total_score) || 0,
    totalPercentage: Number(d.total_percentage) || 0,
    mathQuality: d.reading_aloud_quality || d.math_quality || 'พอใช้',
    thaiQuality: d.reading_comprehension_quality || d.thai_quality || 'พอใช้',
    totalQuality: d.total_quality || 'พอใช้',
    academicYear: d.academic_year || '2567',
    testType: 'RT',
    testTitle: d.test_title || 'การประเมินความสามารถด้านการอ่านของผู้เรียน (RT) ชั้นประถมศึกษาปีที่ 1',
    notes: d.notes || '',
    updatedAt: d.updated_at,
    updatedBy: d.updated_by
  });

  // Supabase direct fetch
  if (supabase && isSupabaseConfigured()) {
    const candidateTables = ['rt_assessments', 'academic_rt_assessments', 'academic_assessments'];
    const rtFields = 'id, order_num, school_id, school_name, amphoe, reading_aloud_score, reading_aloud_percentage, reading_comprehension_score, reading_comprehension_percentage, math_score, math_percentage, thai_score, thai_percentage, total_score, total_percentage, reading_aloud_quality, reading_comprehension_quality, math_quality, thai_quality, total_quality, academic_year, test_type, test_title, notes, updated_at, updated_by';
    for (const tbl of candidateTables) {
      try {
        let query = supabase.from(tbl).select(rtFields);
        if (tbl === 'academic_assessments') {
          query = query.eq('test_type', 'RT');
        }
        
        let res = await query.order('order_num', { ascending: true });
        if (res.error && (res.error.code === '42703' || res.error.message?.includes('order_num'))) {
          // If order_num column doesn't exist, query raw
          res = await supabase.from(tbl).select(rtFields);
          if (tbl === 'academic_assessments') {
            res = await supabase.from(tbl).select(rtFields).eq('test_type', 'RT');
          }
        }

        if (!res.error && res.data && res.data.length > 0) {
          const mapped = res.data.map(mapRTRow);
          return mapped.sort((a, b) => (a.order || 0) - (b.order || 0));
        }
      } catch (supaErr) {
        console.warn(`Supabase dbFetchRTRecords from ${tbl} notice:`, supaErr);
      }
    }
  }

  return [];
}

export async function dbDeleteRTRecord(id: string): Promise<void> {
  clearAppCache();
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('academic_rt_assessments').delete().eq('id', id);
      await supabase.from('rt_assessments').delete().eq('id', id);
      await supabase.from('academic_assessments').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase dbDeleteRTRecord error:', e);
    }
  }
}

export async function dbDeleteRTRecordsByYear(academicYear: string): Promise<number> {
  const cleanYear = String(academicYear || '').trim();
  clearAppCache();
  let count = 0;

  if (supabase && isSupabaseConfigured()) {
    try {
      if (cleanYear) {
        const { error, count: deletedCount } = await supabase
          .from('rt_assessments')
          .delete({ count: 'exact' })
          .eq('academic_year', cleanYear);
        if (!error && typeof deletedCount === 'number') count = deletedCount;

        await Promise.allSettled([
          supabase.from('academic_rt_assessments').delete().eq('academic_year', cleanYear),
          supabase.from('academic_assessments').delete().eq('academic_year', cleanYear).eq('test_type', 'RT')
        ]);
      } else {
        const { error, count: deletedCount } = await supabase
          .from('rt_assessments')
          .delete({ count: 'exact' })
          .neq('id', '');
        if (!error && typeof deletedCount === 'number') count = deletedCount;

        await Promise.allSettled([
          supabase.from('academic_rt_assessments').delete().neq('id', ''),
          supabase.from('academic_assessments').delete().eq('test_type', 'RT')
        ]);
      }
    } catch (e) {
      console.warn('Supabase dbDeleteRTRecordsByYear error:', e);
    }
  }

  return count;
}

// ==========================================
// 9.3 UNIVERSAL / UNIFIED ACADEMIC HANDLERS
// ==========================================

export async function dbSaveAcademicRecord(record: AcademicRecord, updatedBy?: string): Promise<void> {
  if (String(record.testType).toUpperCase() === 'RT') {
    return dbSaveRTRecord(record, updatedBy);
  }
  return dbSaveNTRecord(record, updatedBy);
}

export async function dbSaveAcademicRecords(
  records: AcademicRecord[],
  updatedBy?: string,
  onProgress?: (percent: number, message: string) => void
): Promise<void> {
  if (!records || records.length === 0) return;
  const ntRecords = records.filter(r => String(r.testType).toUpperCase() !== 'RT');
  const rtRecords = records.filter(r => String(r.testType).toUpperCase() === 'RT');

  if (ntRecords.length > 0 && rtRecords.length > 0) {
    await dbSaveNTRecords(ntRecords, updatedBy, (p, m) => onProgress?.(Math.round(p * 0.5), `[NT] ${m}`));
    await dbSaveRTRecords(rtRecords, updatedBy, (p, m) => onProgress?.(50 + Math.round(p * 0.5), `[RT] ${m}`));
  } else if (ntRecords.length > 0) {
    await dbSaveNTRecords(ntRecords, updatedBy, onProgress);
  } else if (rtRecords.length > 0) {
    await dbSaveRTRecords(rtRecords, updatedBy, onProgress);
  }
}

export async function dbFetchAcademicRecords(): Promise<AcademicRecord[]> {
  const [ntList, rtList] = await Promise.all([
    dbFetchNTRecords(),
    dbFetchRTRecords()
  ]);
  return [...ntList, ...rtList].sort((a, b) => (a.order || 0) - (b.order || 0));
}

export async function dbDeleteAcademicRecord(id: string): Promise<void> {
  clearAppCache();
  // Delete from both NT and RT tables to guarantee complete deletion
  await Promise.allSettled([
    dbDeleteNTRecord(id),
    dbDeleteRTRecord(id)
  ]);
}

export async function dbDeleteAcademicRecordsByYear(academicYear: string, testType?: string): Promise<number> {
  const isRT = testType === 'RT';
  const isNT = testType === 'NT';

  let total = 0;
  if (!isRT) {
    total += await dbDeleteNTRecordsByYear(academicYear);
  }
  if (!isNT) {
    total += await dbDeleteRTRecordsByYear(academicYear);
  }
  return total;
}

export async function dbMigrateAcademicAssessmentsToSupabase(client?: any): Promise<number> {
  const activeClient = client || supabase;
  if (!activeClient) return 0;

  try {
    const allRecords = await dbFetchAcademicRecords();
    if (!allRecords || allRecords.length === 0) return 0;

    const ntRecords = allRecords.filter(r => r.testType !== 'RT');
    const rtRecords = allRecords.filter(r => r.testType === 'RT');

    let totalMigrated = 0;

    const migrateList = async (items: AcademicRecord[], tableName: string, fallbackTable: string) => {
      const isRT = tableName.includes('rt');
      const rows = items.map(r => {
        const row: any = {
          id: r.id || `${r.schoolId || r.order}_${r.academicYear}_${isRT ? 'RT' : 'NT'}`,
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
          test_type: isRT ? 'RT' : 'NT',
          test_title: r.testTitle || (isRT ? 'การประเมินความสามารถด้านการอ่าน (RT)' : 'การประเมินคุณภาพผู้เรียน (NT)'),
          notes: r.notes || '',
          updated_at: safeToISOString(r.updatedAt),
          updated_by: r.updatedBy || 'Super Admin'
        };
        if (isRT) {
          row.reading_aloud_score = Number(r.mathScore) || 0;
          row.reading_aloud_percentage = Number(r.mathPercentage) || 0;
          row.reading_comprehension_score = Number(r.thaiScore) || 0;
          row.reading_comprehension_percentage = Number(r.thaiPercentage) || 0;
          row.reading_aloud_quality = r.mathQuality || 'พอใช้';
          row.reading_comprehension_quality = r.thaiQuality || 'พอใช้';
        }
        return row;
      });

      const batchSize = 50;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        let { error } = await activeClient.from(tableName).upsert(batch, { onConflict: 'id' });
        if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
          const res = await activeClient.from(fallbackTable).upsert(batch, { onConflict: 'id' });
          error = res.error;
        }
        if (!error) {
          totalMigrated += batch.length;
        } else {
          console.warn(`${tableName} upsert notice:`, error.message);
        }
      }
    };

    if (ntRecords.length > 0) await migrateList(ntRecords, 'academic_nt_assessments', 'nt_assessments');
    if (rtRecords.length > 0) await migrateList(rtRecords, 'academic_rt_assessments', 'rt_assessments');

    console.log(`✅ Migrated ${totalMigrated} academic assessment records to separate academic_nt_assessments / academic_rt_assessments Supabase tables`);
    return totalMigrated;
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
      const { data } = await supabase.from('students_g').select('id, school_id, school_name');
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

// -------------------------------------------------------------
// 15. USER ACTIVITY / AUDIT LOGS (ประวัติการแก้ไขข้อมูลของผู้ใช้งาน)
// -------------------------------------------------------------

/**
 * บันทึกประวัติการแก้ไข/ดำเนินกิจกรรมของผู้ใช้งานในระบบ (บันทึกลง Supabase โดยตรงแบบ Async Fire-and-Forget)
 */
export async function dbLogUserActivity(log: Omit<UserActivityLog, 'id' | 'timestamp'> & { timestamp?: any }): Promise<void> {
  const now = new Date();
  const timestampISO = now.toISOString();

  // บันทึกลง Supabase โดยตรง
  if (supabase && isSupabaseConfigured()) {
    try {
      const payload = {
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        user_id: log.userId || '',
        user_name: log.userName || 'ผู้ใช้งาน',
        user_email: (log.userEmail || '').trim().toLowerCase(),
        user_role: log.userRole || 'school_admin',
        school_id: log.schoolId || '',
        school_name: log.schoolName || '',
        action_type: log.actionType || 'other',
        action_title: log.actionTitle || 'ดำเนินกิจกรรม',
        details: log.details || '',
        target_name: log.targetName || '',
        timestamp: timestampISO,
      };

      const { error } = await supabase.from('user_activity_logs').insert([payload]);
      if (error) {
        console.warn('Supabase dbLogUserActivity warning:', error.message);
      }
    } catch (e) {
      console.warn('Supabase dbLogUserActivity exception:', e);
    }
  }
}

/**
 * ดึงรายการประวัติกิจกรรมการแก้ไขข้อมูลจากฐานข้อมูล Supabase
 */
export async function dbFetchUserActivityLogs(options?: {
  schoolId?: string;
  userEmail?: string;
  actionType?: string;
  limitCount?: number;
}): Promise<UserActivityLog[]> {
  const limitCount = options?.limitCount || 300;

  // ดึงจาก Supabase โดยตรง
  if (supabase && isSupabaseConfigured()) {
    try {
      let queryBuilder = supabase
        .from('user_activity_logs')
        .select('id, user_id, user_name, user_email, user_role, school_id, school_name, action_type, action_title, details, target_name, timestamp')
        .order('timestamp', { ascending: false })
        .limit(limitCount);

      if (options?.schoolId && options.schoolId !== 'all') {
        queryBuilder = queryBuilder.eq('school_id', options.schoolId);
      }
      if (options?.userEmail) {
        queryBuilder = queryBuilder.ilike('user_email', `%${options.userEmail.trim()}%`);
      }
      if (options?.actionType && options.actionType !== 'all') {
        queryBuilder = queryBuilder.eq('action_type', options.actionType);
      }

      const { data, error } = await queryBuilder;
      if (!error && data) {
        return data.map((d: any) => ({
          id: d.id,
          userId: d.user_id || '',
          userName: d.user_name || '',
          userEmail: d.user_email || '',
          userRole: d.user_role || 'school_admin',
          schoolId: d.school_id || '',
          schoolName: d.school_name || '',
          actionType: d.action_type || 'other',
          actionTitle: d.action_title || '',
          details: d.details || '',
          targetName: d.target_name || '',
          timestamp: d.timestamp ? new Date(d.timestamp) : new Date(),
        }));
      }
      if (error) {
        console.warn('Supabase dbFetchUserActivityLogs notice:', error.message);
      }
    } catch (err) {
      console.warn('Supabase dbFetchUserActivityLogs warning:', err);
    }
  }

  return [];
}

/**
 * ล้างข้อมูลบันทึกกิจกรรมเก่าที่เกินกว่า X วัน บนฐานข้อมูล Supabase (สำหรับ Super Admin จัดการพื้นที่)
 */
export async function dbPurgeOldUserActivityLogs(olderThanDays: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  const cutoffISO = cutoffDate.toISOString();
  let deletedCount = 0;

  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('user_activity_logs')
        .delete()
        .lt('timestamp', cutoffISO)
        .select('id');
      
      if (!error && data) {
        deletedCount = data.length;
        console.log(`✅ Purged ${deletedCount} old user activity logs from Supabase`);
        return deletedCount;
      }
      if (error) {
        console.warn('Supabase dbPurgeOldUserActivityLogs notice:', error.message);
      }
    } catch (e) {
      console.warn('Supabase dbPurgeOldUserActivityLogs warning:', e);
    }
  }

  return deletedCount;
}

/**
 * ย้ายข้อมูลประวัติกิจกรรมผู้ใช้งาน (User Activity Logs) จาก Firestore เข้าสู่ Supabase
 */
export async function dbMigrateUserActivityLogsToSupabase(client?: any): Promise<number> {
  const activeClient = client || supabase;
  if (!activeClient) return 0;

  try {
    const snap = await getDocs(collection(db, 'user_activity_logs'));
    if (snap.empty) return 0;

    const rows = snap.docs.map(docSnap => {
      const d = docSnap.data() as any;
      return {
        id: docSnap.id,
        user_id: d.userId || '',
        user_name: d.userName || 'ผู้ใช้งาน',
        user_email: (d.userEmail || '').trim().toLowerCase(),
        user_role: d.userRole || 'school_admin',
        school_id: d.schoolId || '',
        school_name: d.schoolName || '',
        action_type: d.actionType || 'other',
        action_title: d.actionTitle || 'ดำเนินกิจกรรม',
        details: d.details || '',
        target_name: d.targetName || '',
        timestamp: safeToISOString(d.timestamp),
      };
    });

    const batchSize = 50;
    let totalMigrated = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await activeClient.from('user_activity_logs').upsert(batch, { onConflict: 'id' });
      if (!error) {
        totalMigrated += batch.length;
      } else {
        console.warn('Supabase dbMigrateUserActivityLogsToSupabase batch notice:', error.message);
      }
    }

    console.log(`✅ Migrated ${totalMigrated} user activity logs to Supabase`);
    return totalMigrated;
  } catch (err) {
    console.error('dbMigrateUserActivityLogsToSupabase exception:', err);
    return 0;
  }
}
