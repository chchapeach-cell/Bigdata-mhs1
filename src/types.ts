export interface MajorSubject {
  name: string;
  teachersCount: number;
}

export interface School {
  id: string; // รหัสโรงเรียน 8 หลัก เช่น 58010001
  name: string;
  district: string; // เช่น สพป.แม่ฮ่องสอน เขต 1
  amphoe?: string; // เพิ่มอำเภอ
  networkGroup?: string; // เพิ่มกลุ่มเครือข่าย
  internetType: 'satellite' | 'fiber' | 'sim' | 'none'; // ระบบเน็ต: ดาวเทียม, ไฟเบอร์, ซิม, ไม่ได้ใช้
  electricity: boolean; // มีไฟฟ้าใช้งานหรือไม่
  staffCount: number; // จำนวนครู/บุคลากร
  majorSubjects: string[]; // วิชาเอกที่มีในโรงเรียน (คั่นหรือเก็บแบบ string)
  majorSubjectsWithStaff?: MajorSubject[]; // วิชาเอกพร้อมจำนวนครูผู้เชี่ยวชาญ
  directorPhone: string; // เบอร์โทรศัพท์ผู้บริหาร
  schoolPhone: string; // เบอร์โรงเรียน
  imageUrl: string; // รูปภาพโรงเรียน
  latitude: number;
  longitude: number;
  size: 'small' | 'medium' | 'large' | 'special_large'; // ขนาดโรงเรียน (วิเคราะห์จากจำนวนนักเรียน)
  isExpansion: boolean; // โรงเรียนขยายโอกาส (มีนักเรียน ม.1 - ม.3)
}

export interface GradeData {
  male: number;
  female: number;
  total: number;
  rooms: number;
}

export interface StudentData {
  id?: string; // firebase doc id
  schoolId: string;
  schoolName: string;
  academicYear: string; // ปีการศึกษา เช่น "2568"
  // เก็บรายชั้น: อ.1, อ.2, อ.3, ป.1 - ป.6, ม.1 - ม.3
  grades: {
    [key: string]: GradeData;
  };
  totalMale: number;
  totalFemale: number;
  totalStudents: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  schoolId: string; // ถ้าเป็น School Admin
  schoolName: string;
  role: 'super_admin' | 'school_admin' | 'public';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

export interface DownloadLog {
  id?: string;
  name: string;
  email: string;
  schoolId: string; // "all" หรือ รหัสโรงเรียน
  schoolName: string; // "ทั้งหมด" หรือ ชื่อโรงเรียน
  purpose: string;
  timestamp: any;
}
