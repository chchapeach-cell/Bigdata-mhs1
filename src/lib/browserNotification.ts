/**
 * Helper สำหรับ Browser Notification API
 * สำหรับส่งการแจ้งเตือนผ่าน Desktop/Browser ให้กับ Super Admin
 */

export interface BrowserNotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  renotify?: boolean;
  requireInteraction?: boolean;
  silent?: boolean;
  onClick?: () => void;
}

/**
 * ตรวจสอบว่าเบราว์เซอร์รองรับ Notification API หรือไม่
 */
export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * ตรวจสอบสถานะสิทธิ์การแจ้งเตือนปัจจุบัน
 */
export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * ขอสิทธิ์ส่งการแจ้งเตือนจากผู้ใช้
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isBrowserNotificationSupported()) return 'unsupported';

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.warn('Error requesting notification permission:', error);
    return Notification.permission;
  }
}

/**
 * ส่งการแจ้งเตือนผ่าน Browser Notification API
 */
export async function sendBrowserNotification(
  title: string,
  options?: BrowserNotificationOptions
): Promise<boolean> {
  if (!isBrowserNotificationSupported()) return false;

  // หากยังไม่ได้รับอนุญาต ให้ขอก่อน
  let currentPermission: NotificationPermission | 'unsupported' = Notification.permission;
  if (currentPermission === 'default') {
    currentPermission = await requestBrowserNotificationPermission();
  }

  if (currentPermission !== 'granted') {
    return false;
  }

  try {
    const notificationOptions: any = {
      body: options?.body || 'มีข้อมูลใหม่ในระบบ MHS1 Big Data',
      icon: options?.icon || '/icon-192.png',
      badge: options?.badge || '/icon.svg',
      tag: options?.tag || 'mhs1-general-notification',
      renotify: options?.renotify !== undefined ? options?.renotify : true,
      requireInteraction: options?.requireInteraction || false,
      silent: options?.silent || false,
      data: options?.data
    };

    // ตรวจสอบว่ามี Service Worker ที่พร้อมใช้งานหรือไม่
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title, notificationOptions);
          return true;
        }
      } catch (swErr) {
        console.warn('SW notification fallback to new Notification:', swErr);
      }
    }

    // มาตรฐาน Notification API
    const notification = new Notification(title, notificationOptions);

    if (options?.onClick) {
      notification.onclick = (event) => {
        event.preventDefault();
        try {
          window.focus();
        } catch (e) {}
        options.onClick?.();
        notification.close();
      };
    }

    // Auto close after 10 seconds if not clicked
    setTimeout(() => {
      try {
        notification.close();
      } catch (e) {}
    }, 10000);

    return true;
  } catch (err) {
    console.warn('Failed to send browser notification:', err);
    return false;
  }
}

/**
 * ส่งการแจ้งเตือนสำหรับผู้สมัครสมาชิกใหม่โดยเฉพาะ
 */
export async function notifyNewUserRegistration(
  newUsers: Array<{
    firstName?: string;
    lastName?: string;
    email?: string;
    schoolName?: string;
    schoolId?: string;
  }>,
  totalPendingCount: number,
  onOpenUserManagement?: () => void
): Promise<boolean> {
  if (!newUsers || newUsers.length === 0) return false;

  const latestUser = newUsers[0];
  const userName = `${latestUser.firstName || ''} ${latestUser.lastName || ''}`.trim() || 'ผู้สมัครใหม่';
  const school = latestUser.schoolName || latestUser.schoolId || 'สถานศึกษา';
  
  let title = `🔔 สพป.มส.1: มีผู้สมัครสมาชิกใหม่ (${totalPendingCount} คน)`;
  let body = `${userName} (${school}) รอการอนุมัติสิทธิ์เข้าใช้งานระบบ`;

  if (newUsers.length > 1) {
    body = `${userName} และผู้สมัครอื่นรวม ${newUsers.length} ท่าน รอการอนุมัติสิทธิ์`;
  }

  return sendBrowserNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon.svg',
    tag: 'mhs1-pending-user-alert',
    renotify: true,
    requireInteraction: true,
    onClick: () => {
      if (onOpenUserManagement) {
        onOpenUserManagement();
      }
    }
  });
}
