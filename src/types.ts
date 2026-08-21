export interface MajorSubject {
  name: string;
  teachersCount: number; // จำนวนครูรวมในวิชาเอกนี้
  civilServantsCount?: number; // จำนวนข้าราชการครู
  contractTeachersCount?: number; // จำนวนครูอัตราจ้าง
}

export interface ViceDirectorItem {
  id: string;
  name: string;
  phone?: string;
  imageUrl?: string;
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
  contractTeachersCount?: number; // จำนวนครูอัตราจ้าง (คน)
  adminStaffCount?: number; // จำนวนเจ้าหน้าที่ธุรการ (คน)
  janitorCount?: number; // จำนวนนักการภารโรง (คน)
  otherStaffCount?: number; // จำนวนบุคลากรอื่นๆ (คน)
  majorSubjects: string[]; // วิชาเอกที่มีในโรงเรียน (คั่นหรือเก็บแบบ string)
  majorSubjectsWithStaff?: MajorSubject[]; // วิชาเอกพร้อมจำนวนครูผู้เชี่ยวชาญ
  classrooms?: ClassroomItem[]; // รายชื่อห้องเรียน/ชั้นเรียนในโรงเรียน
  directorName?: string; // ชื่อผู้อำนวยการโรงเรียน
  directorPhone: string; // เบอร์โทรศัพท์ผู้บริหาร
  viceDirectorName?: string; // ชื่อรองผู้อำนวยการโรงเรียน ( legacy / คนแรก )
  viceDirectorPhone?: string; // เบอร์โทรศัพท์รองผู้อำนวยการ ( legacy / คนแรก )
  viceDirectors?: ViceDirectorItem[]; // รายชื่อรองผู้อำนวยการโรงเรียน (กรณีมีหลายคน พร้อมรูปภาพ)
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
  id?: string; // record id
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
  id?: string; // record id e.g. `${schoolId}_${academicYear}`
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

export interface UserActivityLog {
  id?: string;
  userId?: string;
  userName: string;
  userEmail: string;
  userRole?: string; // 'super_admin' | 'school_admin' | 'guest'
  schoolId?: string;
  schoolName?: string;
  actionType: 'update_school' | 'update_student' | 'update_student_g' | 'upload_file' | 'delete_data' | 'user_management' | 'system_settings' | 'academic_assessment' | 'other' | string;
  actionTitle: string; // e.g. "แก้ไขข้อมูลโรงเรียน"
  details?: string; // e.g. "ปรับปรุงข้อมูลระบบไฟฟ้า, บุคลากร 12 คน"
  targetName?: string; // e.g. "โรงเรียนบ้านผาบ่อง"
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

export type QualityLevel = 'ดีมาก' | 'ดี' | 'พอใช้' | 'ปรับปรุง' | string;

export interface AcademicRecord {
  id: string; // เช่น `${schoolId || order}_${academicYear}_${testType}`
  order?: number; // ลำดับ 1, 2, 3...
  schoolId: string; // รหัสโรงเรียน
  schoolName: string; // ชื่อโรงเรียน
  amphoe: string; // อำเภอ/เขต เช่น "ขุนยวม", "ปาย", "เมืองแม่ฮ่องสอน", "ปางมะผ้า"
  mathScore: number; // คะแนนด้านคณิตศาสตร์
  mathPercentage: number; // ร้อยละด้านคณิตศาสตร์
  thaiScore: number; // คะแนนด้านภาษาไทย
  thaiPercentage: number; // ร้อยละด้านภาษาไทย
  totalScore: number; // คะแนนรวม 2 ด้าน
  totalPercentage: number; // ร้อยละรวม 2 ด้าน
  mathQuality: QualityLevel; // ระดับคุณภาพคณิตศาสตร์ (ดีมาก / ดี / พอใช้ / ปรับปรุง)
  thaiQuality: QualityLevel; // ระดับคุณภาพภาษาไทย (ดีมาก / ดี / พอใช้ / ปรับปรุง)
  totalQuality: QualityLevel; // ระดับคุณภาพรวม 2 ด้าน (ดีมาก / ดี / พอใช้ / ปรับปรุง)
  academicYear: string; // ปีการศึกษา เช่น "2567", "2568"
  testType: string; // เช่น 'NT' (การประเมินคุณภาพผู้เรียน ป.3) หรือ 'RT' (ป.1) หรือ 'ONET'
  testTitle?: string; // เช่น "การประเมินคุณภาพผู้เรียน (NT) ชั้นประถมศึกษาปีที่ 3"
  notes?: string;
  updatedAt?: any;
  updatedBy?: string;
}

// Alias for backwards compatibility
export type AcademicAssessment = AcademicRecord;


