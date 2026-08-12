import { doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, collection, addDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { supabase, isSupabaseConfigured } from './supabase';
import { School, StudentData, StudentGData, UserProfile, SystemConfig, DownloadLog } from '../types';

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

// -------------------------------------------------------------
// 1. SCHOOLS
// -------------------------------------------------------------
export async function dbSaveSchool(school: School, updatedBy?: string): Promise<void> {
  const schoolId = String(school.id);
  const now = new Date().toISOString();

  // A. Save to Supabase (Priority)
  if (supabase && isSupabaseConfigured()) {
    try {
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
        major_subjects: school.majorSubjects || [],
        major_subjects_with_staff: school.majorSubjectsWithStaff || [],
        classrooms: school.classrooms || [],
        director_phone: school.directorPhone || null,
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

      const { error } = await supabase.from('schools').upsert(supabasePayload, { onConflict: 'id' });
      if (error) {
        console.error('Supabase dbSaveSchool error:', error);
      } else {
        console.log(`✅ Saved school ${schoolId} (${school.name}) to Supabase successfully`);
      }
    } catch (err) {
      console.error('Supabase dbSaveSchool exception:', err);
    }
    return; // Don't write to Firestore if Supabase is configured
  }

  // B. Fallback to Firestore when Supabase is NOT configured
  try {
    const schoolRef = doc(db, 'schools', schoolId);
    const cleanData = cleanForFirestore({
      ...school,
      updatedAt: now,
      updatedBy: updatedBy || school.updatedBy || 'system',
    });
    await setDoc(schoolRef, cleanData, { merge: true });
  } catch (err) {
    console.warn('Firestore dbSaveSchool warning:', err);
  }
}

export async function dbDeleteSchool(schoolId: string): Promise<void> {
  const cleanId = String(schoolId);

  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('schools').delete().eq('id', cleanId);
      console.log(`✅ Deleted school ${cleanId} from Supabase`);
    } catch (err) {
      console.error('Supabase dbDeleteSchool error:', err);
    }
    return;
  }

  try {
    await deleteDoc(doc(db, 'schools', cleanId));
  } catch (err) {
    console.warn('Firestore dbDeleteSchool warning:', err);
  }
}

// -------------------------------------------------------------
// 2. STUDENTS (General Grade-by-Grade)
// -------------------------------------------------------------
export async function dbSaveStudent(student: StudentData): Promise<void> {
  const docId = student.id || `${student.schoolId}_${student.academicYear}`;
  const now = new Date().toISOString();

  if (supabase && isSupabaseConfigured()) {
    try {
      const payload = {
        id: String(docId),
        school_id: String(student.schoolId),
        school_name: student.schoolName || '',
        academic_year: String(student.academicYear || '2568'),
        grades: student.grades || {},
        total_male: Number(student.totalMale) || 0,
        total_female: Number(student.totalFemale) || 0,
        total_students: Number(student.totalStudents) || 0,
        updated_at: now,
      };

      const { error } = await supabase.from('students').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.error('Supabase dbSaveStudent error:', error);
      } else {
        console.log(`✅ Saved student record ${docId} for ${student.schoolName} to Supabase`);
      }
    } catch (err) {
      console.error('Supabase dbSaveStudent exception:', err);
    }
    return;
  }

  try {
    const studentDocRef = doc(db, 'students', docId);
    const cleanData = cleanForFirestore({
      ...student,
      id: docId,
      updatedAt: now,
    });
    await setDoc(studentDocRef, cleanData, { merge: true });
  } catch (err) {
    console.warn('Firestore dbSaveStudent warning:', err);
  }
}

export async function dbBatchSaveStudents(students: StudentData[]): Promise<void> {
  if (students.length === 0) return;
  const now = new Date().toISOString();

  if (supabase && isSupabaseConfigured()) {
    try {
      const mapped = students.map((st) => ({
        id: String(st.id || `${st.schoolId}_${st.academicYear}`),
        school_id: String(st.schoolId),
        school_name: st.schoolName || '',
        academic_year: String(st.academicYear || '2568'),
        grades: st.grades || {},
        total_male: Number(st.totalMale) || 0,
        total_female: Number(st.totalFemale) || 0,
        total_students: Number(st.totalStudents) || 0,
        updated_at: now,
      }));

      const BATCH_SIZE = 50;
      for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
        const batch = mapped.slice(i, i + BATCH_SIZE);
        await supabase.from('students').upsert(batch, { onConflict: 'id' });
      }
      console.log(`✅ Batch saved ${students.length} student records to Supabase`);
    } catch (err) {
      console.error('Supabase dbBatchSaveStudents error:', err);
    }
    return;
  }

  // Backup to Firestore
  for (const st of students) {
    try {
      const docId = st.id || `${st.schoolId}_${st.academicYear}`;
      await setDoc(doc(db, 'students', docId), cleanForFirestore({ ...st, id: docId, updatedAt: now }), { merge: true });
    } catch (err) {
      // ignore individual batch warnings
    }
  }
}

export async function dbDeleteStudent(docId: string, schoolId?: string, academicYear?: string): Promise<void> {
  const cleanId = String(docId);

  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('students').delete().eq('id', cleanId);
      if (schoolId && academicYear) {
        await supabase
          .from('students')
          .delete()
          .eq('school_id', String(schoolId))
          .eq('academic_year', String(academicYear));
      }
      console.log(`✅ Deleted student record ${cleanId} from Supabase`);
    } catch (err) {
      console.error('Supabase dbDeleteStudent error:', err);
    }
    return;
  }

  try {
    await deleteDoc(doc(db, 'students', cleanId));
  } catch (err) {
    console.warn('Firestore dbDeleteStudent warning:', err);
  }
}

export async function dbDeleteStudentsByYear(year: string): Promise<number> {
  const cleanYear = String(year).trim();
  let deletedCount = 0;

  // 1. Delete from Supabase directly
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data: suDocs } = await supabase
        .from('students')
        .select('id')
        .or(`academic_year.eq.${cleanYear},id.like.%_${cleanYear},id.eq.${cleanYear}`);

      if (suDocs && suDocs.length > 0) {
        deletedCount = Math.max(deletedCount, suDocs.length);
      }

      const { error: err1 } = await supabase.from('students').delete().eq('academic_year', cleanYear);
      if (err1) console.error('Supabase delete students by academic_year error:', err1);

      await supabase.from('students').delete().like('id', `%_${cleanYear}`);
      await supabase.from('students').delete().eq('id', cleanYear);

      console.log(`✅ Deleted student records for year ${cleanYear} directly from Supabase`);
    } catch (err) {
      console.error('Supabase dbDeleteStudentsByYear error:', err);
    }
    return deletedCount;
  }

  // 2. Delete from Firestore
  try {
    let fsCount = 0;
    const allSnapshot = await getDocs(collection(db, 'students'));
    for (const docSnap of allSnapshot.docs) {
      const dData = docSnap.data();
      const dYear = String(dData.academicYear || '').trim();
      const docId = docSnap.id;
      if (dYear === cleanYear || docId.endsWith(`_${cleanYear}`) || docId === cleanYear) {
        await deleteDoc(doc(db, 'students', docId)).catch(() => {});
        fsCount++;
      }
    }
    deletedCount = Math.max(deletedCount, fsCount);
  } catch (err) {
    console.warn('Firestore dbDeleteStudentsByYear warning:', err);
  }

  return deletedCount;
}

// -------------------------------------------------------------
// 3. STUDENTS G
// -------------------------------------------------------------
export async function dbSaveStudentG(studentG: StudentGData): Promise<void> {
  const docId = studentG.id || `${studentG.schoolId}_g_${studentG.academicYear}`;
  const now = new Date().toISOString();

  if (supabase && isSupabaseConfigured()) {
    try {
      const payload = {
        id: String(docId),
        school_id: String(studentG.schoolId),
        school_name: studentG.schoolName || '',
        academic_year: String(studentG.academicYear || '2568'),
        total_g_students: Number(studentG.totalGStudents) || 0,
        male_g_count: Number(studentG.maleGCount) || 0,
        female_g_count: Number(studentG.femaleGCount) || 0,
        notes: studentG.notes || null,
        updated_at: now,
      };

      const { error } = await supabase.from('students_g').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.error('Supabase dbSaveStudentG error:', error);
      } else {
        console.log(`✅ Saved Student G record ${docId} for ${studentG.schoolName} to Supabase`);
      }
    } catch (err) {
      console.error('Supabase dbSaveStudentG exception:', err);
    }
    return;
  }

  try {
    const gDocRef = doc(db, 'students_g', docId);
    const cleanData = cleanForFirestore({
      ...studentG,
      id: docId,
      updatedAt: now,
    });
    await setDoc(gDocRef, cleanData, { merge: true });
  } catch (err) {
    console.warn('Firestore dbSaveStudentG warning:', err);
  }
}

export async function dbBatchSaveStudentsG(studentsG: StudentGData[]): Promise<void> {
  if (studentsG.length === 0) return;
  const now = new Date().toISOString();

  if (supabase && isSupabaseConfigured()) {
    try {
      const mapped = studentsG.map((sg) => ({
        id: String(sg.id || `${sg.schoolId}_g_${sg.academicYear}`),
        school_id: String(sg.schoolId),
        school_name: sg.schoolName || '',
        academic_year: String(sg.academicYear || '2568'),
        total_g_students: Number(sg.totalGStudents) || 0,
        male_g_count: Number(sg.maleGCount) || 0,
        female_g_count: Number(sg.femaleGCount) || 0,
        notes: sg.notes || null,
        updated_at: now,
      }));

      const BATCH_SIZE = 50;
      for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
        const batch = mapped.slice(i, i + BATCH_SIZE);
        await supabase.from('students_g').upsert(batch, { onConflict: 'id' });
      }
      console.log(`✅ Batch saved ${studentsG.length} Student G records to Supabase`);
    } catch (err) {
      console.error('Supabase dbBatchSaveStudentsG error:', err);
    }
    return;
  }

  for (const sg of studentsG) {
    try {
      const docId = sg.id || `${sg.schoolId}_g_${sg.academicYear}`;
      await setDoc(doc(db, 'students_g', docId), cleanForFirestore({ ...sg, id: docId, updatedAt: now }), { merge: true });
    } catch (err) {
      // ignore
    }
  }
}

export async function dbDeleteStudentG(docId: string, schoolId?: string, academicYear?: string): Promise<void> {
  const cleanId = String(docId);

  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('students_g').delete().eq('id', cleanId);
      if (schoolId && academicYear) {
        await supabase
          .from('students_g')
          .delete()
          .eq('school_id', String(schoolId))
          .eq('academic_year', String(academicYear));
      }
      console.log(`✅ Deleted student_g record ${cleanId} from Supabase`);
    } catch (err) {
      console.error('Supabase dbDeleteStudentG error:', err);
    }
    return;
  }

  try {
    await deleteDoc(doc(db, 'students_g', cleanId));
  } catch (err) {
    console.warn('Firestore dbDeleteStudentG warning:', err);
  }
}

export async function dbDeleteStudentsGByYear(year: string): Promise<number> {
  const cleanYear = String(year).trim();
  let deletedCount = 0;

  // 1. Delete from Supabase directly
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data: suDocs } = await supabase
        .from('students_g')
        .select('id')
        .or(`academic_year.eq.${cleanYear},id.like.%_${cleanYear},id.eq.${cleanYear}`);

      if (suDocs && suDocs.length > 0) {
        deletedCount = Math.max(deletedCount, suDocs.length);
      }

      const { error: err1 } = await supabase.from('students_g').delete().eq('academic_year', cleanYear);
      if (err1) console.error('Supabase delete students_g by academic_year error:', err1);

      await supabase.from('students_g').delete().like('id', `%_${cleanYear}`);
      await supabase.from('students_g').delete().eq('id', cleanYear);

      console.log(`✅ Deleted student_g records for year ${cleanYear} directly from Supabase`);
    } catch (err) {
      console.error('Supabase dbDeleteStudentsGByYear error:', err);
    }
    return deletedCount;
  }

  // 2. Delete from Firestore
  try {
    let fsCount = 0;
    const querySnapshot = await getDocs(collection(db, 'students_g'));
    for (const docSnap of querySnapshot.docs) {
      const dData = docSnap.data();
      const dYear = String(dData.academicYear || '').trim();
      const docId = docSnap.id;

      if (dYear === cleanYear || docId.endsWith(`_${cleanYear}`) || docId === cleanYear) {
        await deleteDoc(doc(db, 'students_g', docId)).catch(() => {});
        fsCount++;
      }
    }
    deletedCount = Math.max(deletedCount, fsCount);
  } catch (err) {
    console.warn('Firestore dbDeleteStudentsGByYear warning:', err);
  }

  return deletedCount;
}

export async function dbCleanCorruptStudentsG(): Promise<number> {
  let deletedCount = 0;

  // 1. Supabase
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data: allG } = await supabase.from('students_g').select('id, academic_year');
      if (allG) {
        const corruptIds = allG
          .filter((item) => !item.academic_year || !/^\d{4}$/.test(String(item.academic_year).trim()))
          .map((item) => item.id);

        if (corruptIds.length > 0) {
          await supabase.from('students_g').delete().in('id', corruptIds);
          deletedCount = Math.max(deletedCount, corruptIds.length);
          console.log(`✅ Cleaned ${corruptIds.length} corrupt student_g records from Supabase`);
        }
      }
    } catch (err) {
      console.error('Supabase dbCleanCorruptStudentsG error:', err);
    }
    return deletedCount;
  }

  // 2. Firestore
  try {
    const querySnapshot = await getDocs(collection(db, 'students_g'));
    let fsCount = 0;
    for (const docSnap of querySnapshot.docs) {
      const dData = docSnap.data();
      const dYear = String(dData.academicYear || '').trim();
      if (!dYear || !/^\d{4}$/.test(dYear)) {
        await deleteDoc(doc(db, 'students_g', docSnap.id)).catch(() => {});
        fsCount++;
      }
    }
    deletedCount = Math.max(deletedCount, fsCount);
  } catch (err) {
    console.warn('Firestore dbCleanCorruptStudentsG warning:', err);
  }

  return deletedCount;
}

// -------------------------------------------------------------
// 4. SETTINGS / CONFIG
// -------------------------------------------------------------
export async function dbFetchSystemConfig(): Promise<SystemConfig | null> {
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('settings').select('config').eq('id', 'system_config').maybeSingle();
      if (!error && data && data.config) {
        return data.config as SystemConfig;
      }
    } catch (err) {
      console.warn('Supabase dbFetchSystemConfig warning:', err);
    }
  }

  // Firestore Fallback
  try {
    const configSnap = await getDoc(doc(db, 'settings', 'system_config'));
    if (configSnap.exists()) {
      return configSnap.data() as SystemConfig;
    }
  } catch (err) {
    console.warn('Firestore dbFetchSystemConfig warning:', err);
  }

  return null;
}

export async function dbSaveSystemConfig(config: Partial<SystemConfig>): Promise<void> {
  const now = new Date().toISOString();

  if (supabase && isSupabaseConfigured()) {
    try {
      // First get current config to merge
      const { data } = await supabase.from('settings').select('config').eq('id', 'system_config').single();
      const currentConfig = data?.config || {};
      const newConfig = { ...currentConfig, ...config };

      const { error } = await supabase.from('settings').upsert(
        [
          {
            id: 'system_config',
            config: newConfig,
            updated_at: now,
          },
        ],
        { onConflict: 'id' }
      );

      if (error) {
        console.error('Supabase dbSaveSystemConfig error:', error);
      } else {
        console.log('✅ System Config saved to Supabase settings table');
      }
    } catch (err) {
      console.error('Supabase dbSaveSystemConfig exception:', err);
    }
    return;
  }

  try {
    const cleanData = cleanForFirestore(config);
    await setDoc(doc(db, 'settings', 'system_config'), cleanData, { merge: true });
  } catch (err) {
    console.warn('Firestore dbSaveSystemConfig warning:', err);
  }
}

// -------------------------------------------------------------
// 5. USERS
// -------------------------------------------------------------
function safeToISOString(val: any): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  if (typeof val === 'number') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? new Date().toISOString() : val.toISOString();
  }
  if (typeof val === 'object') {
    if (typeof val.toDate === 'function') {
      try {
        const d = val.toDate();
        if (d instanceof Date && !isNaN(d.getTime())) return d.toISOString();
      } catch (e) {}
    }
    if (typeof val.seconds === 'number') {
      const d = new Date(val.seconds * 1000);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
    if (typeof val.seconds === 'string' && !isNaN(Number(val.seconds))) {
      const d = new Date(Number(val.seconds) * 1000);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }
  return new Date().toISOString();
}

function safeToDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : val;
  if (typeof val === 'object') {
    if (typeof val.toDate === 'function') {
      try {
        const d = val.toDate();
        if (d instanceof Date && !isNaN(d.getTime())) return d;
      } catch (e) {}
    }
    if (typeof val.seconds === 'number') {
      const d = new Date(val.seconds * 1000);
      if (!isNaN(d.getTime())) return d;
    }
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
}

export async function dbSaveUser(userProfile: UserProfile): Promise<void> {
  const now = new Date().toISOString();

  if (supabase && isSupabaseConfigured()) {
    try {
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

      const { error } = await supabase.from('users').upsert(payload, { onConflict: 'uid' });
      if (error) {
        if (error.code === '23505' && userProfile.email) {
          const { error: updateErr } = await supabase
            .from('users')
            .update(payload)
            .eq('email', userProfile.email);
          if (updateErr) {
            console.error('Supabase dbSaveUser update by email error:', updateErr);
          } else {
            console.log(`✅ Updated user ${userProfile.email} in Supabase users table by email fallback`);
          }
        } else {
          console.error('Supabase dbSaveUser error:', error);
        }
      } else {
        console.log(`✅ Saved user ${userProfile.email} to Supabase users table`);
      }
    } catch (err) {
      console.error('Supabase dbSaveUser exception:', err);
    }
    return;
  }

  try {
    const userDocRef = doc(db, 'users', userProfile.uid);
    await setDoc(userDocRef, cleanForFirestore(userProfile), { merge: true });
  } catch (err) {
    console.warn('Firestore dbSaveUser warning:', err);
  }
}

export async function dbUpdateUserStatus(uid: string, status: string, email?: string): Promise<void> {
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('users').update({ status }).eq('uid', uid).select();
      if (error) {
        console.error('Supabase dbUpdateUserStatus error by uid:', error);
      }
      if (email) {
        const { error: errEmail } = await supabase.from('users').update({ status }).eq('email', email);
        if (errEmail) {
          console.error('Supabase dbUpdateUserStatus error by email:', errEmail);
        }
      }
      console.log(`✅ Updated user status to ${status} on Supabase (uid: ${uid}, email: ${email || 'n/a'})`);
    } catch (err) {
      console.error('Supabase dbUpdateUserStatus error:', err);
    }
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
  }
}

export async function dbDeleteUser(uid: string, email?: string): Promise<void> {
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('users').delete().eq('uid', uid);
      if (email) {
        await supabase.from('users').delete().eq('email', email);
      }
      console.log(`✅ Deleted user ${uid} / ${email || ''} from Supabase`);
    } catch (err) {
      console.error('Supabase dbDeleteUser error:', err);
    }
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
  }

  // Firestore Fallback
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
  }

  // Firestore Fallback
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

    // Deduplicate in memory by email (case-insensitive) to avoid internal duplicate conflicts
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

    // Try batch upsert first
    const { error } = await activeClient.from('users').upsert(usersToUpsert, { onConflict: 'uid' });
    if (!error) {
      console.log(`✅ Migrated ${usersToUpsert.length} users to Supabase`);
      return usersToUpsert.length;
    }

    console.warn('Batch upsert users failed, processing individually:', error.message || error);

    // Fallback: process user by user to handle duplicate email or constraint conflicts gracefully
    let successCount = 0;
    for (const u of usersToUpsert) {
      const { error: singleErr } = await activeClient.from('users').upsert(u, { onConflict: 'uid' });
      if (!singleErr) {
        successCount++;
      } else {
        if (singleErr.code === '23505' && u.email) {
          // If duplicate key error on email constraint, update existing user row by email
          const { error: updateErr } = await activeClient
            .from('users')
            .update(u)
            .eq('email', u.email);
          if (!updateErr) {
            successCount++;
          } else {
            console.warn(`Could not update user by email (${u.email}):`, updateErr);
          }
        } else {
          console.warn(`Could not migrate user (${u.email || u.uid}):`, singleErr);
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
  }

  // Firestore Fallback
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
    try {
      const payload = {
        id: 'visitor_count',
        total_visits: Number(statsData.totalVisits) || 0,
        today_visits: Number(statsData.todayVisits) || 0,
        today_date: statsData.todayDate || new Date().toISOString().split('T')[0],
        daily_visits: statsData.dailyVisits || {},
        updated_at: now,
      };

      await supabase.from('system_stats').upsert(payload, { onConflict: 'id' });
    } catch (err) {
      console.error('Supabase dbSaveSystemStats error:', err);
    }
    return;
  }

  try {
    const docRef = doc(db, 'system_stats', 'visitor_count');
    await setDoc(docRef, cleanForFirestore({ ...statsData, updatedAt: now }), { merge: true });
  } catch (err) {
    console.warn('Firestore dbSaveSystemStats warning:', err);
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
  }

  // Firestore Fallback
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
    try {
      const payload = {
        name: logData.name || '',
        email: logData.email || '',
        school_id: logData.schoolId || '',
        school_name: logData.schoolName || '',
        purpose: logData.purpose || '',
        timestamp: new Date().toISOString(),
      };

      await supabase.from('download_logs').insert([payload]);
      console.log('✅ Added download log to Supabase');
    } catch (err) {
      console.error('Supabase dbAddDownloadLog error:', err);
    }
    return;
  }

  try {
    await addDoc(collection(db, 'download_logs'), cleanForFirestore(logData));
  } catch (err) {
    console.warn('Firestore dbAddDownloadLog warning:', err);
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

  // Firestore Fallback
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
