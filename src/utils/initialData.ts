import rawSchools from './schoolsData.json';
import { School } from '../types';

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
    
    // Calculate total students if available in classrooms
    const totalStudentsFromClassrooms = classrooms.reduce((acc: number, c: any) => {
      const cnt = Number(c.studentCount) || ((Number(c.maleCount) || 0) + (Number(c.femaleCount) || 0));
      return acc + cnt;
    }, 0);

    const school: School = {
      id,
      name,
      district: item.district || 'สพป.แม่ฮ่องสอน เขต 1',
      amphoe: item.amphoe || 'ไม่ระบุอำเภอ',
      network_group: item.network_group || 'กลุ่มทั่วไป',
      internet_type: item.internet_type || null,
      electricity: item.electricity ?? null,
      water_system: item.water_system || null,
      water_system_detail: item.water_system_detail || null,
      solar_kw: item.solar_kw ?? null,
      has_solar_battery: Boolean(item.has_solar_battery),
      solar_battery_capacity: item.solar_battery_capacity ?? null,
      staff_count: Number(item.staff_count) || 0,
      other_staff_count: Number(item.other_staff_count) || 0,
      major_subjects: Array.isArray(item.major_subjects) ? item.major_subjects : [],
      major_subjects_with_staff: Array.isArray(item.major_subjects_with_staff)
        ? item.major_subjects_with_staff.map((m: any) => ({
            name: m.name || '',
            teachersCount: Number(m.teachersCount) || 0,
          }))
        : [],
      classrooms,
      director_phone: item.director_phone || '',
      school_phone: item.school_phone || '',
    };

    // Store in Map to prevent duplicate school IDs
    schoolMap.set(id, school);
  });

  // Sort schools by ID
  return Array.from(schoolMap.values()).sort((a, b) => a.id.localeCompare(b.id));
}
