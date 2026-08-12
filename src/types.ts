export interface MajorSubject {
  name: string;
  teachersCount: number;
}

export interface BranchGradeData {
  male: number;
  female: number;
  total: number;
}

export interface ClassroomItem {
  id: string; // รหัสห้องเรียน/สาขา
  name: string; // ชื่อห้องเรียนย่อย/สาขาโรงเรียนเล็ก เช่น "ห้องเรียนย่อยสาขาบ้านห้วยฮี้"
  gradeLevel?: string; // ระดับชั้นที่เปิดสอน เช่น "อ.1 - ป.6"
  studentCount?: number; // จำนวนนักเรียนในห้องนี้/สาขานี้
  maleCount?: number; // จำนวนนักเรียนชาย
  femaleCount?: number; // จำนวนนักเรียนหญิง
  staffCount?: number; // จำนวนครู/บุคลากรประจำสาขา
  teacherName?: string; // ครูประจำชั้น/ครูผู้ดูแลสาขา
  phone?: string; // เบอร์โทรศัพท์ติดต่อ
  electricity?: 'has_electric' | 'solar' | 'hybrid' | 'none' | boolean; // ระบบไฟฟ้า
  solarKw?: string; // กำลังผลิตโซลาร์เซลล์ (kW)
  hasSolarBattery?: boolean; // มีแบตเตอรี่สำรองหรือไม่
  solarBatteryCapacity?: string; // รายละเอียด/ความจุแบตเตอรี่
  internetType?: 'satellite' | 'fiber' | 'sim' | 'none'; // ระบบอินเทอร์เน็ต
  waterSystem?: string; // ระบบน้ำประปา/แหล่งน้ำ
  waterSystemDetail?: string; // รายละเอียดน้ำประปาเพิ่มเติม
  distanceFromMainSchool?: string; // ระยะทางจากโรงเรียนหลัก (กม. / ลักษณะเส้นทาง)
  latitude?: number; // ละติจูด
  longitude?: number; // ลองจิจูด
  gradesBreakdown?: {
    [gradeKey: string]: BranchGradeData;
  };
  notes?: string; // หมายเหตุเพิ่มเติม/สภาพพื้นที่ห่างไกล
  isRemoteBranch?: boolean; // เป็นโรงเรียนสาขา/ห้องเรียนย่อยในพื้นที่ห่างไกลหรือไม่
}

export interface School {
  id: string; // รหัสโรงเรียน 8 หลัก เช่น 58010001
  name: string;
  district: string; // เช่น สพป.แม่ฮ่องสอน เขต 1
  amphoe?: string; // เพิ่มอำเภอ
  networkGroup?: string; // เพิ่มกลุ่มเครือข่าย
  internetType: string; // ระบบเน็ต: ดาวเทียม, ไฟเบอร์, ซิม, ไม่ได้ใช้ หรือประเภทอื่นๆ
  electricity: string | boolean; // ระบบไฟฟ้า
  waterSystem?: string; // ระบบน้ำประปา/แหล่งน้ำ: น้ำประปาภาครัฐ, น้ำประปาภูเขา, ไม่มีน้ำใช้, อื่นๆ
  waterSystemDetail?: string; // รายละเอียดเพิ่มเติมระบบน้ำประปา
  solarKw?: string; // กำลังผลิตโซลาร์เซลล์ (kW)
  hasSolarBattery?: boolean; // มีแบตเตอรี่สำรองหรือไม่
  solarBatteryCapacity?: string; // รายละเอียด/ความจุแบตเตอรี่
  staffCount: number; // จำนวนครู/บุคลากร
  majorSubjects: string[]; // วิชาเอกที่มีในโรงเรียน (คั่นหรือเก็บแบบ string)
  majorSubjectsWithStaff?: MajorSubject[]; // วิชาเอกพร้อมจำนวนครูผู้เชี่ยวชาญ
  classrooms?: ClassroomItem[]; // รายชื่อห้องเรียน/ชั้นเรียนในโรงเรียน
  directorPhone: string; // เบอร์โทรศัพท์ผู้บริหาร
  schoolPhone: string; // เบอร์โรงเรียน
  email?: string; // อีเมลติดต่อสถานศึกษา
  facebook?: string; // Facebook Page / ลิงก์ Facebook
  line?: string; // LINE ID / ลิงก์ LINE
  website?: string; // เว็บไซต์สถานศึกษา
  address?: string; // ที่อยู่สถานศึกษา
  imageUrl: string; // รูปภาพโรงเรียน
  logoUrl?: string; // รูปภาพตราโรงเรียน
  directorImageUrl?: string; // รูปภาพผู้บริหารโรงเรียน (เห็นเฉพาะแอดมิน)
  latitude: number;
  longitude: number;
  size: 'small' | 'medium' | 'large' | 'special_large'; // ขนาดโรงเรียน (วิเคราะห์จากจำนวนนักเรียน)
  isExpansion: boolean; // โรงเรียนขยายโอกาส (มีนักเรียน ม.1 - ม.3)
  specialHighlights?: string; // ความพิเศษ / จุดเด่นของโรงเรียน
  updatedAt?: string | any; // เวลาอัปเดตข้อมูลล่าสุด
  updatedBy?: string; // ผู้ทำการแก้ไขข้อมูลล่าสุด
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

export interface StudentGData {
  id?: string; // firebase doc id e.g. `${schoolId}_${academicYear}`
  schoolId: string;
  schoolName: string;
  academicYear: string; // ปีการศึกษา เช่น "2568"
  totalGStudents: number; // จำนวนนักเรียนตัว G รวม
  maleGCount: number; // จำนวนนักเรียนชายตัว G
  femaleGCount: number; // จำนวนนักเรียนหญิงตัว G
  notes?: string;
  updatedAt?: any;
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

export interface InfrastructureOption {
  id: string;
  label: string;
}

export type ThemeStyle = 'pastel' | 'modern' | 'darktech' | 'minimal-slate' | 'warm-nature' | 'emerald-mint' | 'cyan-futuristic' | 'royal-gold' | 'green' | 'clean-mobile' | 'nordic-breeze' | 'ultra-modern' | 'luxury-violet' | 'sunset-ember' | 'gundam-mecha' | 'naruto-ninja' | 'lector-purple';
export type DesignStyle = 'classic' | 'glass-float' | 'compact-grid';

export interface ContactChannel {
  id: string;
  name: string;
  type: 'phone' | 'email' | 'line' | 'facebook' | 'tiktok' | 'address' | 'qr_code' | 'other';
  value: string;
  description?: string;
  qrImageUrl?: string;
  enabled: boolean;
  icon?: string;
}

export interface SystemConfig {
  allowDataDownload: boolean; // เปิด-ปิดระบบดาวน์โหลดข้อมูล
  restrictOneAdminPerSchool: boolean;
  allowSchoolAdminRegistration: boolean;
  highTrafficAlertEnabled?: boolean; // เปิด-ปิดระบบแจ้งเตือนผู้ใช้งานหนาแน่น Pop-up
  highTrafficAlertMessage?: string; // ข้อความแจ้งเตือนผู้ใช้งานหนาแน่น
  simulateRedServerStatus?: boolean; // จำลองสถานะเซิร์ฟเวอร์เป็นสีแดง (เพื่อทดสอบ Pop-up ผู้ใช้หนาแน่น)
  electricityOptions: InfrastructureOption[];
  internetOptions: InfrastructureOption[];
  waterSystemOptions?: InfrastructureOption[];
  headerBannerUrl?: string; // URL หรือ Base64 รูปภาพ Banner บน Header
  headerBannerHeight?: number; // ความสูงของ Banner (px)
  headerBannerFit?: 'cover' | 'contain' | 'fill' | 'auto'; // รูปแบบการจัดวางรูปภาพ
  headerBannerEnabled?: boolean; // เปิด/ปิดการแสดงรูปภาพ Banner
  contactChannels?: ContactChannel[]; // รายการช่องทางติดต่อสื่อสาร
  contactTitle?: string; // หัวข้อหน้าติดต่อ
  contactSubtitle?: string; // คำอธิบายหน้าติดต่อ
  contactEnabled?: boolean; // เปิด-ปิดการแสดงผลเมนูติดต่อสำหรับทุกคน (Super Admin เป็นผู้กำหนด)
  updatedAt?: any;
}

