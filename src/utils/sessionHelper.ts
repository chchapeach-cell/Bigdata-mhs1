import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { UserProfile } from '../types';

export const MAX_CONCURRENT_USERS = 70;
export const CONCURRENCY_BLOCKED_MESSAGE = "ขออภัยในความไม่สะดวก อีก 30 นาที เข้ามาใช้ใหม่ ตอนนี้มีคนเข้าระบบเป็นจำนวนมาก ทางระบบ บล็อกไว้ไม่ให้เข้าเพิ่ม หรือแจ้งเหตุมาที่กลุ่ม DLICT";

/**
 * ตรวจสอบจำนวนผู้ใช้งานที่ออนไลน์พร้อมกันในระบบ
 * หากเกิน 70 คน และผู้ใช้ไม่ใช่ Super Admin จะบล็อกการเข้าใช้
 */
export async function checkActiveUsersConcurrency(profile: UserProfile): Promise<{ allowed: boolean; message?: string }> {
  const isSuperAdmin = profile.role === 'super_admin' || profile.email === 'tamrri@gmail.com' || profile.email === 'ch.chapeach@gmail.com';
  if (isSuperAdmin) {
    return { allowed: true };
  }

  try {
    const THREE_MINUTES = 3 * 60 * 1000;
    const now = Date.now();
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
  try {
    const now = Date.now();
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
  try {
    const sessionRef = doc(db, 'active_sessions', uid);
    await setDoc(sessionRef, {
      lastActiveTime: Date.now()
    }, { merge: true });
  } catch (e) {
    console.error('Failed to send heartbeat:', e);
  }
}

/**
 * ลบเซสชันเมื่อออกจากระบบ
 */
export async function removeActiveSession(uid: string): Promise<void> {
  try {
    const sessionRef = doc(db, 'active_sessions', uid);
    await deleteDoc(sessionRef).catch(() => {});
  } catch (e) {
    console.error('Failed to remove active session:', e);
  }
}
