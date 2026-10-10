import rawSchools from './schoolsData.json';
import { School } from '../types';
import { getAmphoeAndNetwork } from './geoHelper';

export { getAmphoeAndNetwork };

export const MAP_CENTER: [number, number] = [19.3021, 97.9654];

export const MAJOR_SUBJECTS_LIST = [
  'ภาษาไทย',
  'คณิตศาสตร์',
  'วิทยาศาสตร์',
  'สังคมศึกษา',
  'ภาษาอังกฤษ',
  'ศิลปะ/ดนตรี',
  'สุขศึกษา/พลศึกษา',
  'การงานอาชีพ',
  'ปฐมวัย',
  'คอมพิวเตอร์',
  'แนะแนว'
];

export const SCHOOL_METADATA_PRESETS: Record<string, any> = {};
export const RAW_CSV_DATA: any[] = [];

export const SCHOOL_GROUPS_LIST = [
  { name: "กลุ่มโรงเรียนสิงหนาทราชาลัย", amphoe: "เมืองแม่ฮ่องสอน" },
  { name: "กลุ่มโรงเรียนไตรมิตร", amphoe: "เมืองแม่ฮ่องสอน" },
  { name: "กลุ่มโรงเรียนภูผาลีลาวดี", amphoe: "เมืองแม่ฮ่องสอน" },
  { name: "กลุ่มโรงเรียนห้วยโป่ง", amphoe: "เมืองแม่ฮ่องสอน" },
  { name: "กลุ่มโรงเรียนขุนยวม - แม่เงา", amphoe: "ขุนยวม" },
  { name: "กลุ่มโรงเรียนแม่อูคอ - แม่ยวมน้อย", amphoe: "ขุนยวม" },
  { name: "กลุ่มโรงเรียนเมืองปอน - แม่กิ๊", amphoe: "ขุนยวม" },
  { name: "กลุ่มโรงเรียนปายมัชฌิมา", amphoe: "ปาย" },
  { name: "กลุ่มโรงเรียนสายเหนือสัมพันธ์", amphoe: "ปาย" },
  { name: "กลุ่มโรงเรียนสายใต้", amphoe: "ปาย" },
  { name: "กลุ่มโรงเรียนโป่งสา", amphoe: "ปาย" },
  { name: "กลุ่มโรงเรียนลุ่มน้ำลาง", amphoe: "ปางมะผ้า" },
  { name: "กลุ่มโรงเรียนลุ่มน้ำของ", amphoe: "ปางมะผ้า" },
  { name: "กลุ่มโรงเรียนเขตพื้นที่การศึกษา", amphoe: "สพป.แม่ฮ่องสอน เขต 1" }
];

export function getCurrentBEYear(): string {
  const currentYear = new Date().getFullYear();
  return String(currentYear + 543);
}

export function getDefaultAvailableYears(currentBE?: string, count: number = 6): string[] {
  const current = currentBE ? parseInt(currentBE, 10) : new Date().getFullYear() + 543;
  const years: string[] = [];
  for (let i = 0; i < count; i++) {
    years.push(String(current - i));
  }
  return years;
}

export function getSchoolSize(totalStudents: number): 'small' | 'medium' | 'large' | 'special_large' {
  if (totalStudents >= 1680) return 'special_large';
  if (totalStudents >= 700) return 'large';
  if (totalStudents >= 120) return 'medium';
  return 'small';
}

export function getSchoolSizeLabel(size?: string): string {
  switch (size) {
    case 'small':
      return 'ขนาดเล็ก (119 คนลงมา)';
    case 'medium':
      return 'ขนาดกลาง (120 - 699 คน)';
    case 'large':
      return 'ขนาดใหญ่ (700 - 1,679 คน)';
    case 'special_large':
      return 'ขนาดใหญ่พิเศษ (1,680 คนขึ้นไป)';
    default:
      return 'ไม่ระบุ';
  }
}

export interface SchoolUpdateBadgeInfo {
  status: 'recent' | 'moderate' | 'outdated' | 'none';
  isRecent: boolean;
  label: string;
  shortLabel: string;
  timeText: string;
  fullDateText: string;
  badgeClass: string;
  dotClass: string;
  iconType: 'check' | 'clock' | 'alert';
  updatedByText?: string;
  diffDays?: number;
}

export function getSchoolUpdateBadgeInfo(dateValue: any, updatedBy?: string): SchoolUpdateBadgeInfo {
  if (!dateValue) {
    return {
      status: 'none',
      isRecent: false,
      label: 'ยังไม่ยืนยันข้อมูล',
      shortLabel: 'ยังไม่อัปเดต',
      timeText: 'ไม่มีบันทึกเวลา',
      fullDateText: 'ยังไม่มีการบันทึกเวลาอัปเดตข้อมูล',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
      dotClass: 'bg-slate-400',
      iconType: 'alert',
      updatedByText: updatedBy ? `ผู้แก้ไข: ${updatedBy}` : undefined
    };
  }

  try {
    let date: Date;
    if (typeof dateValue === 'string' || typeof dateValue === 'number') {
      date = new Date(dateValue);
    } else if (dateValue && typeof dateValue.toDate === 'function') {
      date = dateValue.toDate();
    } else if (dateValue && typeof dateValue.seconds === 'number') {
      date = new Date(dateValue.seconds * 1000);
    } else {
      date = new Date(dateValue);
    }

    if (isNaN(date.getTime())) {
      return {
        status: 'none',
        isRecent: false,
        label: 'ยังไม่ยืนยันข้อมูล',
        shortLabel: 'ยังไม่อัปเดต',
        timeText: 'ไม่มีบันทึกเวลา',
        fullDateText: 'ยังไม่มีการบันทึกเวลาอัปเดตข้อมูล',
        badgeClass: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
        dotClass: 'bg-slate-400',
        iconType: 'alert',
        updatedByText: updatedBy ? `ผู้แก้ไข: ${updatedBy}` : undefined
      };
    }

    const diffMs = new Date().getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const day = date.getDate();
    const shortMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const fullMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const shortMonth = shortMonths[date.getMonth()];
    const fullMonth = fullMonths[date.getMonth()];
    const beYear = date.getFullYear() + 543;
    const shortYear = String(beYear).slice(-2);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const timeText = `${day} ${shortMonth} ${shortYear}`;
    const fullDateText = `${day} ${fullMonth} ${beYear} เวลา ${hours}:${minutes} น.`;

    if (diffDays <= 90) {
      return {
        status: 'recent',
        isRecent: true,
        label: `อัปเดตล่าสุด: ${timeText}`,
        shortLabel: `ล่าสุด ${timeText}`,
        timeText,
        fullDateText,
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/80',
        dotClass: 'bg-emerald-500 animate-pulse',
        iconType: 'check',
        updatedByText: updatedBy ? `อัปเดตโดย: ${updatedBy}` : undefined,
        diffDays
      };
    } else if (diffDays <= 210) {
      return {
        status: 'moderate',
        isRecent: false,
        label: `อัปเดตเมื่อ: ${timeText}`,
        shortLabel: `${timeText}`,
        timeText,
        fullDateText,
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/80',
        dotClass: 'bg-amber-500',
        iconType: 'clock',
        updatedByText: updatedBy ? `อัปเดตโดย: ${updatedBy}` : undefined,
        diffDays
      };
    } else {
      return {
        status: 'outdated',
        isRecent: false,
        label: `อัปเดตนานแล้ว: ${timeText}`,
        shortLabel: `ข้อมูลเก่า ${timeText}`,
        timeText,
        fullDateText,
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700/80',
        dotClass: 'bg-rose-500',
        iconType: 'alert',
        updatedByText: updatedBy ? `อัปเดตโดย: ${updatedBy}` : undefined,
        diffDays
      };
    }
  } catch {
    return {
      status: 'none',
      isRecent: false,
      label: 'ยังไม่ยืนยันข้อมูล',
      shortLabel: 'ยังไม่อัปเดต',
      timeText: 'ไม่มีบันทึกเวลา',
      fullDateText: 'ยังไม่มีการบันทึกเวลาอัปเดตข้อมูล',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
      dotClass: 'bg-slate-400',
      iconType: 'alert',
      updatedByText: updatedBy ? `ผู้แก้ไข: ${updatedBy}` : undefined
    };
  }
}

export function generateDefaultSchool(id: string, name: string): School {
  return {
    id,
    name,
    district: 'สพป.แม่ฮ่องสอน เขต 1',
    amphoe: 'ไม่ระบุอำเภอ',
    network_group: 'กลุ่มทั่วไป',
    staff_count: 0,
    classrooms: []
  };
}

export function generateInitialStudentGData(): any[] {
  return [];
}

export function parseInitialData(): School[] {
  const schoolMap = new Map<string, School>();

  (rawSchools as any[]).forEach((item) => {
    if (!item || !item.id) return;

    const id = String(item.id).trim();
    let name = item.name ? String(item.name).trim() : `โรงเรียนรหัส ${id}`;

    // Verify and ensure exact standard naming for Huay Chang Kham schools
    if (id === '58010045') {
      name = 'บ้านห้วยช่างคำ';
    } else if (id === '58010021') {
      name = 'บ้านห้วยช่างคำ สาขาบ้านห้วยช่างเหล็ก';
    }

    const classrooms = Array.isArray(item.classrooms) ? item.classrooms : [];

    const school: any = {
      id,
      name,
      district: item.district || 'สพป.แม่ฮ่องสอน เขต 1',
      amphoe: item.amphoe || 'ไม่ระบุอำเภอ',
      networkGroup: item.network_group || item.networkGroup || 'กลุ่มทั่วไป',
      network_group: item.network_group || item.networkGroup || 'กลุ่มทั่วไป',
      internetType: item.internet_type || item.internetType || 'fiber',
      internet_type: item.internet_type || item.internetType || 'fiber',
      electricity: item.electricity ?? true,
      waterSystem: item.water_system || item.waterSystem || 'government',
      water_system: item.water_system || item.waterSystem || 'government',
      waterSystemDetail: item.water_system_detail || item.waterSystemDetail || null,
      water_system_detail: item.water_system_detail || item.waterSystemDetail || null,
      solarKw: item.solar_kw ?? item.solarKw ?? null,
      solar_kw: item.solar_kw ?? item.solarKw ?? null,
      hasSolarBattery: Boolean(item.has_solar_battery ?? item.hasSolarBattery),
      has_solar_battery: Boolean(item.has_solar_battery ?? item.hasSolarBattery),
      solarBatteryCapacity: item.solar_battery_capacity ?? item.solarBatteryCapacity ?? null,
      solar_battery_capacity: item.solar_battery_capacity ?? item.solarBatteryCapacity ?? null,
      staffCount: Number(item.staff_count ?? item.staffCount) || 0,
      staff_count: Number(item.staff_count ?? item.staffCount) || 0,
      contractTeachersCount: Number(item.contract_teachers_count ?? item.contractTeachersCount) || 0,
      contract_teachers_count: Number(item.contract_teachers_count ?? item.contractTeachersCount) || 0,
      adminStaffCount: Number(item.admin_staff_count ?? item.adminStaffCount) || 0,
      admin_staff_count: Number(item.admin_staff_count ?? item.adminStaffCount) || 0,
      janitorCount: Number(item.janitor_count ?? item.janitorCount) || 0,
      janitor_count: Number(item.janitor_count ?? item.janitorCount) || 0,
      otherStaffCount: Number(item.other_staff_count ?? item.otherStaffCount) || 0,
      other_staff_count: Number(item.other_staff_count ?? item.otherStaffCount) || 0,
      majorSubjects: Array.isArray(item.major_subjects ?? item.majorSubjects) ? (item.major_subjects ?? item.majorSubjects) : [],
      major_subjects: Array.isArray(item.major_subjects ?? item.majorSubjects) ? (item.major_subjects ?? item.majorSubjects) : [],
      majorSubjectsWithStaff: Array.isArray(item.major_subjects_with_staff ?? item.majorSubjectsWithStaff)
        ? (item.major_subjects_with_staff ?? item.majorSubjectsWithStaff).map((m: any) => ({
            name: m.name || '',
            teachersCount: Number(m.teachersCount) || 0,
          }))
        : [],
      major_subjects_with_staff: Array.isArray(item.major_subjects_with_staff ?? item.majorSubjectsWithStaff)
        ? (item.major_subjects_with_staff ?? item.majorSubjectsWithStaff).map((m: any) => ({
            name: m.name || '',
            teachersCount: Number(m.teachersCount) || 0,
          }))
        : [],
      classrooms,
      directorName: item.director_name || item.directorName || '',
      director_name: item.director_name || item.directorName || '',
      directorPhone: item.director_phone || item.directorPhone || '',
      director_phone: item.director_phone || item.directorPhone || '',
      viceDirectorName: item.vice_director_name || item.viceDirectorName || '',
      vice_director_name: item.vice_director_name || item.viceDirectorName || '',
      viceDirectorPhone: item.vice_director_phone || item.viceDirectorPhone || '',
      vice_director_phone: item.vice_director_phone || item.viceDirectorPhone || '',
      schoolPhone: item.school_phone || item.schoolPhone || '',
      school_phone: item.school_phone || item.schoolPhone || '',
      imageUrl: item.image_url || item.imageUrl || '',
      logoUrl: item.logo_url || item.logoUrl || '',
      directorImageUrl: item.director_image_url || item.directorImageUrl || '',
      size: item.size || 'small',
      isExpansion: Boolean(item.is_expansion ?? item.isExpansion ?? false),
      is_expansion: Boolean(item.is_expansion ?? item.isExpansion ?? false),
      latitude: Number(item.latitude) || 0,
      longitude: Number(item.longitude) || 0,
    };

    // Store in Map to prevent duplicate school IDs
    schoolMap.set(id, school);
  });

  // Sort schools by ID
  return Array.from(schoolMap.values()).sort((a, b) => a.id.localeCompare(b.id));
}
