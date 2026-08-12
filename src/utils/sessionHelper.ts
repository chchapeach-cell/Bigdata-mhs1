import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const MAX_CONCURRENT_USERS = 10000;
export const CONCURRENCY_BLOCKED_MESSAGE = "ขออภัยในความไม่สะดวก อีก 30 นาที เข้ามาใช้ใหม่ ตอนนี้มีคนเข้าระบบเป็นจำนวนมาก ทางระบบ บล็อกไว้ไม่ให้เข้าเพิ่ม หรือแจ้งเหตุมาที่กลุ่ม DLICT";

/**
 * ตรวจสอบจำนวนผู้ใช้งานที่ออนไลน์พร้อมกันในระบบ
 */
export async function checkActiveUsersConcurrency(profile: UserProfile): Promise<{ allowed: boolean; message?: string }> {
  const isSuperAdmin = profile.role === 'super_admin' || profile.email === 'tamrri@gmail.com' || profile.email === 'ch.chapeach@gmail.com';
  if (isSuperAdmin) {
    return { allowed: true };
  }

  const THREE_MINUTES = 3 * 60 * 1000;
  const now = Date.now();

  // 1. Supabase Check
  if (supabase && isSupabaseConfigured()) {
    try {
      const minActiveTime = now - THREE_MINUTES;
      const { data, error } = await supabase
        .from('active_sessions')
        .select('*')
        .gt('last_active_time', minActiveTime)
        .eq('kicked', false);

      if (!error && data) {
        let activeCount = data.length;
        let isAlreadyActive = data.some((s: any) => s.uid === profile.uid);

        if (activeCount >= MAX_CONCURRENT_USERS && !isAlreadyActive) {
          return {
            allowed: false,
            message: CONCURRENCY_BLOCKED_MESSAGE
          };
        }
        return { allowed: true };
      }
    } catch (e) {
      console.warn('Supabase checkActiveUsersConcurrency warning:', e);
    }
  }

  // 2. Firestore Fallback
  try {
    const sessionsRef = collection(db, 'active_sessions');
    const snap = await getDocs(sessionsRef);

    let activeCount = 0;
    let isAlreadyActive = false;

    snap.forEach((d) => {
      const data = d.data();
      if (data && data.lastActiveTime && (now - data.lastActiveTime < THREE_MINUTES) && !data.kicked) {
        activeCount++;
        if (d.id === profile.uid) {
          isAlreadyActive = true;
        }
      }
    });

    if (activeCount >= MAX_CONCURRENT_USERS && !isAlreadyActive) {
      return {
        allowed: false,
        message: CONCURRENCY_BLOCKED_MESSAGE
      };
    }
  } catch (e) {
    console.error('Error checking active users limit:', e);
  }

  return { allowed: true };
}

/**
 * ลงทะเบียน/อัปเดตเซสชันผู้ใช้งาน
 */
export async function registerActiveSession(profile: UserProfile): Promise<void> {
  const now = Date.now();

  if (supabase && isSupabaseConfigured()) {
    try {
      const payload = {
        uid: profile.uid,
        email: profile.email || '',
        first_name: profile.firstName || '',
        last_name: profile.lastName || '',
        school_name: profile.schoolName || '',
        role: profile.role || 'school_admin',
        login_time: now,
        last_active_time: now,
        kicked: false,
        updated_at: new Date().toISOString()
      };
      await supabase.from('active_sessions').upsert(payload, { onConflict: 'uid' });
    } catch (e) {
      console.warn('Supabase registerActiveSession error:', e);
    }
  }

  try {
    const sessionRef = doc(db, 'active_sessions', profile.uid);
    await setDoc(sessionRef, {
      uid: profile.uid,
      email: profile.email || '',
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      schoolName: profile.schoolName || '',
      role: profile.role || 'school_admin',
      loginTime: now,
      lastActiveTime: now,
      kicked: false
    }, { merge: true });
  } catch (e) {
    console.error('Failed to register active session:', e);
  }
}

/**
 * ส่ง Heartbeat อัปเดตสถานะ Active
 */
export async function sendSessionHeartbeat(uid: string): Promise<void> {
  const now = Date.now();

  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('active_sessions').update({
        last_active_time: now,
        updated_at: new Date().toISOString()
      }).eq('uid', uid);
    } catch (e) {
      console.warn('Supabase sendSessionHeartbeat error:', e);
    }
  }

  try {
    const sessionRef = doc(db, 'active_sessions', uid);
    await setDoc(sessionRef, {
      lastActiveTime: now
    }, { merge: true });
  } catch (e) {
    console.error('Failed to send heartbeat:', e);
  }
}

/**
 * ลบเซสชันเมื่อออกจากระบบ
 */
export async function removeActiveSession(uid: string): Promise<void> {
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('active_sessions').delete().eq('uid', uid);
    } catch (e) {
      console.warn('Supabase removeActiveSession error:', e);
    }
  }

  try {
    const sessionRef = doc(db, 'active_sessions', uid);
    await deleteDoc(sessionRef).catch(() => {});
  } catch (e) {
    console.error('Failed to remove active session:', e);
  }
}
