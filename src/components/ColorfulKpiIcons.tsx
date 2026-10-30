import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

/**
 * 🏫 ไอคอนสถานศึกษา (โรงเรียนทั้งหมด):
 * อาคารเรียนสีสันสดใส หลังคาสีส้มแดง หอนาฬิกาโดมทอง หน้าต่างกระจกสีฟ้า ประตูไม้ และพุ่มไม้เขียว
 */
export function ColorfulSchoolIcon({ className = 'w-7 h-7', size = 32 }: IconProps) {
  return (
    <svg
      viewBox="0 0 36 36"
      width={size}
      height={size}
      className={`${className} shrink-0 drop-shadow-xs`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ฐานพื้นดินสีเขียว */}
      <rect x="2" y="31" width="32" height="3" rx="1.5" fill="#10B981" />
      
      {/* ตัวอาคารหลัก สีครีมพาสเทล */}
      <rect x="5" y="14" width="26" height="17" rx="1.5" fill="#FFFBEB" stroke="#D97706" strokeWidth="1" />
      
      {/* ปีกหลังคาข้าง สีแดงส้มเทอราคอตตา */}
      <polygon points="5,14 1,17 35,17 31,14" fill="#EA580C" />
      <polygon points="4,17 18,7 32,17" fill="#F97316" stroke="#C2410C" strokeWidth="0.8" />
      
      {/* หอคอยนาฬิกา / ยอดโดมทองตรงกลาง */}
      <rect x="14" y="6" width="8" height="8" rx="1" fill="#FEF3C7" stroke="#D97706" strokeWidth="0.8" />
      <polygon points="18,1 13,6 23,6" fill="#F59E0B" stroke="#B45309" strokeWidth="0.8" />
      <circle cx="18" cy="1" r="1.2" fill="#FDE047" />

      {/* หน้าปัดนาฬิกา */}
      <circle cx="18" cy="10" r="2.5" fill="#FFFFFF" stroke="#D97706" strokeWidth="0.6" />
      <line x1="18" y1="10" x2="18" y2="8.6" stroke="#B45309" strokeWidth="0.7" strokeLinecap="round" />
      <line x1="18" y1="10" x2="19.3" y2="10" stroke="#B45309" strokeWidth="0.7" strokeLinecap="round" />

      {/* บานหน้าต่างกระจกสะท้อนแสงสีฟ้าสดใส */}
      <rect x="8" y="19" width="4" height="4" rx="0.5" fill="#38BDF8" stroke="#0284C7" strokeWidth="0.6" />
      <line x1="10" y1="19" x2="10" y2="23" stroke="#BAE6FD" strokeWidth="0.5" />
      <line x1="8" y1="21" x2="12" y2="21" stroke="#BAE6FD" strokeWidth="0.5" />

      <rect x="24" y="19" width="4" height="4" rx="0.5" fill="#38BDF8" stroke="#0284C7" strokeWidth="0.6" />
      <line x1="26" y1="19" x2="26" y2="23" stroke="#BAE6FD" strokeWidth="0.5" />
      <line x1="24" y1="21" x2="28" y2="21" stroke="#BAE6FD" strokeWidth="0.5" />

      {/* ประตูซุ้มโค้งสีไม้โอ๊คอบอุ่น */}
      <path d="M15 31 V24 C15 22.5 21 22.5 21 24 V31 Z" fill="#92400E" stroke="#78350F" strokeWidth="0.8" />
      <line x1="18" y1="24" x2="18" y2="31" stroke="#FDE68A" strokeWidth="0.5" />
      <circle cx="16.5" cy="27.5" r="0.4" fill="#FDE68A" />
      <circle cx="19.5" cy="27.5" r="0.4" fill="#FDE68A" />

      {/* พุ่มไม้ประดับด้านข้าง */}
      <circle cx="4" cy="30.5" r="2" fill="#22C55E" />
      <circle cx="32" cy="30.5" r="2" fill="#22C55E" />
    </svg>
  );
}

/**
 * 🧑‍🤝‍🧑 ไอคอนนักเรียนทั้งหมด (คู่หูนักเรียนชาย-หญิงสดใส):
 * ใบหน้ายิ้มแย้ม แก้มอมชมพู ชุดนักเรียนพร้อมปกคอสีสดใส และประกายดาวแห่งการเรียนรู้
 */
export function ColorfulStudentsIcon({ className = 'w-7 h-7', size = 32 }: IconProps) {
  return (
    <svg
      viewBox="0 0 36 36"
      width={size}
      height={size}
      className={`${className} shrink-0 drop-shadow-xs`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* รัศมีแสงด้านหลัง */}
      <circle cx="18" cy="18" r="16" fill="#FEF3C7" opacity="0.4" />

      {/* --- นักเรียนชาย (ฝั่งซ้าย) --- */}
      {/* เสื้อนักเรียนชายสีขาวพร้อมคอปกสีน้ำเงิน */}
      <path d="M4 33 C4 27 8 24 13 24 C18 24 22 27 22 33 Z" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="0.8" />
      <polygon points="13,24 11,29 13,27 15,29" fill="#FFFFFF" />
      <line x1="13" y1="27" x2="13" y2="33" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" />

      {/* ศีรษะและใบหน้า */}
      <circle cx="13" cy="17" r="5.5" fill="#FED7AA" stroke="#F97316" strokeWidth="0.7" />
      {/* แก้มอมชมพู */}
      <circle cx="10.5" cy="18.5" r="1" fill="#FB7185" opacity="0.6" />
      <circle cx="15.5" cy="18.5" r="1" fill="#FB7185" opacity="0.6" />
      {/* ตาและรอยยิ้ม */}
      <circle cx="11.2" cy="16.5" r="0.7" fill="#1E293B" />
      <circle cx="14.8" cy="16.5" r="0.7" fill="#1E293B" />
      <path d="M11.8 19 Q13 20.3 14.2 19" stroke="#9A3412" strokeWidth="0.7" strokeLinecap="round" fill="none" />
      {/* ทรงผมสีน้ำตาลเข้ม */}
      <path d="M7.8 16 C7.5 13 9 11 13 11 C17 11 18.5 13 18.2 16 C16.5 14 14.5 14 13 13 C11 14 9 14.5 7.8 16 Z" fill="#78350F" />

      {/* --- นักเรียนหญิง (ฝั่งขวา) --- */}
      {/* เสื้อนักเรียนหญิงสีชมพูบานเย็นพร้อมโบว์ */}
      <path d="M15 33 C15 27 19 23.5 24 23.5 C29 23.5 33 27 33 33 Z" fill="#EC4899" stroke="#BE185D" strokeWidth="0.8" />
      <polygon points="24,23.5 22.5,28 24,26.5 25.5,28" fill="#FDF2F8" />
      {/* โบว์คอปกสีเหลืองสด */}
      <circle cx="24" cy="27" r="1" fill="#FACC15" />

      {/* ศีรษะและใบหน้า */}
      <circle cx="24" cy="16" r="5.5" fill="#FED7AA" stroke="#F97316" strokeWidth="0.7" />
      {/* แก้มอมชมพู */}
      <circle cx="21.5" cy="17.5" r="1" fill="#F43F5E" opacity="0.6" />
      <circle cx="26.5" cy="17.5" r="1" fill="#F43F5E" opacity="0.6" />
      {/* ตาและรอยยิ้ม */}
      <circle cx="22.2" cy="15.5" r="0.7" fill="#1E293B" />
      <circle cx="25.8" cy="15.5" r="0.7" fill="#1E293B" />
      <path d="M22.8 18 Q24 19.3 25.2 18" stroke="#9A3412" strokeWidth="0.7" strokeLinecap="round" fill="none" />
      {/* ทรงผมและโบว์ผูกผมสีส้มแดง */}
      <path d="M18.8 15 C18.5 11.5 20.5 9.5 24 9.5 C27.5 9.5 29.5 11.5 29.2 15 C27 13.5 25.5 13 24 12 C22 13 20 13.5 18.8 15 Z" fill="#92400E" />
      {/* โบว์ติดผมคู่ */}
      <circle cx="28.5" cy="11.5" r="1.5" fill="#F43F5E" stroke="#BE185D" strokeWidth="0.5" />

      {/* ประกายดาววิบวับ */}
      <path d="M30 4 L31 7 L34 8 L31 9 L30 12 L29 9 L26 8 L29 7 Z" fill="#FBBF24" />
      <circle cx="5" cy="8" r="1" fill="#F59E0B" />
    </svg>
  );
}

/**
 * 🎓 ไอคอนครูและบุคลากร:
 * หมวกปริญญาสีน้ำเงินเข้ม พู่ทองพลิ้วไหว ประกาศนียบัตรผูกริบบิ้นแดง และกองหนังสือหลากสี
 */
export function ColorfulTeacherIcon({ className = 'w-7 h-7', size = 32 }: IconProps) {
  return (
    <svg
      viewBox="0 0 36 36"
      width={size}
      height={size}
      className={`${className} shrink-0 drop-shadow-xs`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* หนังสือเล่มล่าง สีแดงทับทิม */}
      <rect x="5" y="27" width="26" height="5" rx="1.5" fill="#EF4444" stroke="#B91C1C" strokeWidth="0.8" />
      <line x1="8" y1="29.5" x2="28" y2="29.5" stroke="#FEE2E2" strokeWidth="0.7" />
      {/* ขอบกระดาษสีทอง */}
      <rect x="29" y="28" width="2" height="3" fill="#FEF08A" />

      {/* หนังสือเล่มกลาง สีเขียวมรกต */}
      <rect x="7" y="22" width="22" height="5" rx="1.5" fill="#10B981" stroke="#047857" strokeWidth="0.8" />
      <line x1="10" y1="24.5" x2="26" y2="24.5" stroke="#D1FAE5" strokeWidth="0.7" />
      {/* ริบบิ้นคั่นหน้าหนังสือสีเหลืองทอง */}
      <path d="M21 22 V27 L22.5 25.5 L24 27 V22 Z" fill="#FBBF24" />

      {/* ม้วนใบประกาศนียบัตรผูกโบว์สีแดง */}
      <rect x="18" y="15" width="15" height="5" rx="2" fill="#FFFBEB" stroke="#D97706" strokeWidth="0.8" />
      <rect x="24" y="14.5" width="3" height="6" rx="0.5" fill="#DC2626" />

      {/* หมวกบัณฑิต / มอร์ทาร์บอร์ด สีน้ำเงินอมม่วงหรูหรา */}
      <polygon points="14,4 27,9 14,14 1,9" fill="#3B82F6" stroke="#1E40AF" strokeWidth="0.9" />
      <polygon points="14,6 24,9.5 14,13 4,9.5" fill="#1D4ED8" />

      {/* ฐานรองหมวก */}
      <path d="M6 10.5 V14.5 C6 17.5 22 17.5 22 14.5 V10.5" fill="#1E3A8A" stroke="#172554" strokeWidth="0.8" />

      {/* พู่ห้อยสีทองพร้อมกระดุมตรงกลาง */}
      <circle cx="14" cy="9" r="1.3" fill="#FBBF24" stroke="#B45309" strokeWidth="0.6" />
      <path d="M14 9 Q9 11 8 16 Q8 19 7 21" stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <ellipse cx="6.8" cy="21.5" rx="1.5" ry="2" fill="#FBBF24" stroke="#D97706" strokeWidth="0.6" />

      {/* ประกายดาวสีทองปัญญา */}
      <path d="M30 4 L31 6.5 L33.5 7.5 L31 8.5 L30 11 L29 8.5 L26.5 7.5 L29 6.5 Z" fill="#F59E0B" />
    </svg>
  );
}

/**
 * 🏆 ไอคอนขยายโอกาส ม.1-ม.3 (ถ้วยรางวัลทองคำแห่งโอกาสทางการศึกษา):
 * ถ้วยรางวัลสีทองเงางาม ล้อมช่อมะกอกเขียว ริบบิ้นสีน้ำเงิน-แดง และประกายแสงเจิดจรัส
 */
export function ColorfulOpportunityIcon({ className = 'w-7 h-7', size = 32 }: IconProps) {
  return (
    <svg
      viewBox="0 0 36 36"
      width={size}
      height={size}
      className={`${className} shrink-0 drop-shadow-xs`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ช่อมะกอกเกียรติยศ สีเขียวสดใสสองข้าง */}
      {/* ฝั่งซ้าย */}
      <path d="M8 24 C4 20 4 14 8 9" stroke="#16A34A" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <ellipse cx="6" cy="11" rx="2" ry="1.2" transform="rotate(-30 6 11)" fill="#22C55E" />
      <ellipse cx="5" cy="16" rx="2" ry="1.2" transform="rotate(-15 5 16)" fill="#22C55E" />
      <ellipse cx="6.5" cy="21" rx="2" ry="1.2" transform="rotate(10 6.5 21)" fill="#22C55E" />

      {/* ฝั่งขวา */}
      <path d="M28 24 C32 20 32 14 28 9" stroke="#16A34A" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <ellipse cx="30" cy="11" rx="2" ry="1.2" transform="rotate(30 30 11)" fill="#22C55E" />
      <ellipse cx="31" cy="16" rx="2" ry="1.2" transform="rotate(15 31 16)" fill="#22C55E" />
      <ellipse cx="29.5" cy="21" rx="2" ry="1.2" transform="rotate(-10 29.5 21)" fill="#22C55E" />

      {/* ฐานถ้วยรางวัลไม้โอ๊คสีเข้มและขอบทอง */}
      <rect x="12" y="29" width="12" height="4" rx="1" fill="#1E293B" stroke="#0F172A" strokeWidth="0.8" />
      <rect x="14" y="27" width="8" height="2" fill="#F59E0B" />
      <rect x="13.5" y="30" width="9" height="2" rx="0.5" fill="#FDE047" />

      {/* ก้านถ้วยรางวัล */}
      <rect x="16.5" y="22" width="3" height="5" fill="#F59E0B" stroke="#B45309" strokeWidth="0.6" />

      {/* หูจับถ้วยสองข้าง สีทองเงา */}
      <path d="M12 9 C8 9 8 16 12 17" stroke="#D97706" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M12 9 C8 9 8 16 12 17" stroke="#FDE047" strokeWidth="1.2" strokeLinecap="round" fill="none" />

      <path d="M24 9 C28 9 28 16 24 17" stroke="#D97706" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M24 9 C28 9 28 16 24 17" stroke="#FDE047" strokeWidth="1.2" strokeLinecap="round" fill="none" />

      {/* ถ้วยรางวัลสีทอง มีมิติและการไล่เฉด */}
      <path d="M11 7 H25 V14 C25 18.5 21.5 22 18 22 C14.5 22 11 18.5 11 14 Z" fill="#FBBF24" stroke="#B45309" strokeWidth="0.9" />
      {/* เงาสะท้อนไฮไลต์สีทองสว่าง */}
      <path d="M13 8 H23 V13 C23 16.5 20.5 19.5 18 19.5 C15.5 19.5 13 16.5 13 13 Z" fill="#FDE047" opacity="0.7" />

      {/* ดาวเกียรติยศนูนตรงกลางถ้วย */}
      <polygon points="18,10 19.2,13 22.5,13.2 20,15.2 20.8,18.5 18,16.8 15.2,18.5 16,15.2 13.5,13.2 16.8,13" fill="#D97706" />
      <polygon points="18,10.5 19,13 21.5,13.2 19.5,14.8 20.2,17.5 18,16 15.8,17.5 16.5,14.8 14.5,13.2 17,13" fill="#FFFFFF" />

      {/* ประกายแสงส่องสว่าง */}
      <path d="M18 1 L19 4 L22 5 L19 6 L18 9 L17 6 L14 5 L17 4 Z" fill="#F59E0B" />
      <circle cx="28" cy="5" r="1.2" fill="#FACC15" />
    </svg>
  );
}

/**
 * 🪪 ไอคอนนักเรียนรหัส G:
 * การ์ดตราสัญลักษณ์นักเรียนสีน้ำเงิน-ทอง พร้อมตัวอักษร G สีเหลืองทองระยิบระยับ
 */
export function ColorfulGStudentBadgeIcon({ className = 'w-7 h-7', size = 32 }: IconProps) {
  return (
    <svg
      viewBox="0 0 36 36"
      width={size}
      height={size}
      className={`${className} shrink-0 drop-shadow-xs`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* การ์ดประจำตัวสีน้ำเงินประกายมุก */}
      <rect x="4" y="4" width="28" height="28" rx="8" fill="#1D4ED8" stroke="#3B82F6" strokeWidth="1" />
      <rect x="6" y="6" width="24" height="24" rx="6" fill="#2563EB" />
      
      {/* ตราวงกลมทองคำ */}
      <circle cx="18" cy="18" r="9.5" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.2" />
      <circle cx="18" cy="18" r="8" fill="#FDE047" />

      {/* ตัวอักษร G สีน้ำเงินคลาสสิก คมชัด */}
      <path
        d="M21.5 13.5 C20.5 12.3 19 11.5 17.5 11.5 C14.5 11.5 12.2 14.2 12.2 18 C12.2 21.8 14.5 24.5 17.5 24.5 C20.2 24.5 21.8 22.8 22.2 20.2 H17.5 V17.8 H24.5 V20.6 C24 24 21.5 26.5 17.5 26.5 C13 26.5 9.8 22.8 9.8 18 C9.8 13.2 13 9.5 17.5 9.5 C19.8 9.5 22 10.8 23.2 12.5 Z"
        fill="#1E3A8A"
      />

      {/* มงกุฎประกายดาวบนมุมการ์ด */}
      <polygon points="28,4 29,6.5 31.5,7.5 29,8.5 28,11 27,8.5 24.5,7.5 27,6.5" fill="#FBBF24" />
      <circle cx="8" cy="8" r="1.2" fill="#60A5FA" />
    </svg>
  );
}

/**
 * ⚤ ไอคอนสัดส่วนเพศ ชาย/หญิง สีฟ้า-ชมพู มีมิติสดใส
 */
export function ColorfulGenderRatioIcon({ className = 'w-7 h-7', size = 32 }: IconProps) {
  return (
    <svg
      viewBox="0 0 36 36"
      width={size}
      height={size}
      className={`${className} shrink-0 drop-shadow-xs`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* พื้นหลังพาสเทลสองสี ผสมผสาน */}
      <rect x="3" y="3" width="30" height="30" rx="8" fill="#F3E8FF" stroke="#C084FC" strokeWidth="1" />

      {/* สัญลักษณ์เพศชาย (สีฟ้าเข้มสดใส พร้อมหัวลูกศรทแยงขวาบน) */}
      <circle cx="14" cy="20" r="5" stroke="#2563EB" strokeWidth="2.2" fill="#DBEAFE" />
      <line x1="17.5" y1="16.5" x2="24" y2="10" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" />
      <polygon points="20,10 24,10 24,14" fill="#2563EB" />

      {/* สัญลักษณ์เพศหญิง (สีชมพูบานเย็น พร้อมกากบาทด้านล่าง) */}
      <circle cx="22" cy="15" r="5" stroke="#DB2777" strokeWidth="2.2" fill="#FCE7F3" />
      <line x1="22" y1="20" x2="22" y2="28" stroke="#DB2777" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="18.5" y1="24" x2="25.5" y2="24" stroke="#DB2777" strokeWidth="2.2" strokeLinecap="round" />

      {/* หัวใจเล็กตรงกลางจุดเชื่อมโยง */}
      <path d="M18 16 C17.5 15 16 15 16 16.5 C16 18 18 19.5 18 19.5 C18 19.5 20 18 20 16.5 C20 15 18.5 15 18 16 Z" fill="#EF4444" />
    </svg>
  );
}

/**
 * 🛡️ ไอคอนโล่ความปลอดภัยระบบ Super Admin:
 * โล่สีทอง-แดงหรูหรา พร้อมดาวเกียรติยศและขอบทอง
 */
export function ColorfulAdminShieldIcon({ className = 'w-7 h-7', size = 32 }: IconProps) {
  return (
    <svg
      viewBox="0 0 36 36"
      width={size}
      height={size}
      className={`${className} shrink-0 drop-shadow-xs`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ตัวโล่แบ่ง 2 ฝั่ง สีแดงเข้มกับสีน้ำเงินหรูหรา */}
      <path
        d="M18 2 L31 7 V17 C31 25 24 30.5 18 33 C12 30.5 5 25 5 17 V7 Z"
        fill="#1E293B"
        stroke="#F59E0B"
        strokeWidth="1.5"
      />
      {/* ฝั่งซ้ายสีแดงคริมสัน */}
      <path
        d="M18 3 L6 7.5 V17 C6 24.5 12.5 29.5 18 32 V3 Z"
        fill="#E11D48"
      />
      {/* ฝั่งขวาสีน้ำเงินรอยัลบลู */}
      <path
        d="M18 3 L30 7.5 V17 C30 24.5 23.5 29.5 18 32 V3 Z"
        fill="#2563EB"
      />

      {/* ดาวทองคำนูนตรงกลาง */}
      <polygon
        points="18,9 20.5,15.5 27.5,16 22,20.5 23.8,27.5 18,23.5 12.2,27.5 14,20.5 8.5,16 15.5,15.5"
        fill="#FBBF24"
        stroke="#B45309"
        strokeWidth="0.8"
      />
      <polygon
        points="18,10.5 19.8,15.5 25,16 21,19.5 22.3,25 18,22 13.7,25 15,19.5 11,16 16.2,15.5"
        fill="#FDE047"
      />

      {/* ประกายเพชรด้านบน */}
      <circle cx="18" cy="5" r="1.2" fill="#FFFFFF" />
    </svg>
  );
}

/**
 * 📄 ไอคอนเอกสารดาวน์โหลดและตรวจสอบสิทธิ์:
 * เอกสารสีขาวสะอาด ขอบทอง ประทับตราครุฑ/ตราสัญลักษณ์สีเขียวมรกต
 */
export function ColorfulDocumentAuditIcon({ className = 'w-7 h-7', size = 32 }: IconProps) {
  return (
    <svg
      viewBox="0 0 36 36"
      width={size}
      height={size}
      className={`${className} shrink-0 drop-shadow-xs`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* แผ่นเอกสารหลักสีขาวครีม */}
      <path d="M7 3 H23 L30 10 V31 C30 32.5 28.5 34 27 34 H7 C5.5 34 4 32.5 4 31 V6 C4 4.5 5.5 3 7 3 Z" fill="#FFFBEB" stroke="#D97706" strokeWidth="1" />
      {/* พับมุมเอกสารสีทอง */}
      <polygon points="23,3 30,10 23,10" fill="#FDE047" stroke="#D97706" strokeWidth="0.8" />

      {/* เส้นข้อความจำลองหลากสี */}
      <rect x="8" y="9" width="11" height="2" rx="1" fill="#3B82F6" />
      <rect x="8" y="14" width="18" height="1.8" rx="0.9" fill="#94A3B8" />
      <rect x="8" y="18" width="15" height="1.8" rx="0.9" fill="#94A3B8" />
      <rect x="8" y="22" width="17" height="1.8" rx="0.9" fill="#94A3B8" />

      {/* ตราประทับตรวจสอบอนุมัติสีเขียวมรกต */}
      <circle cx="23" cy="26" r="5.5" fill="#10B981" stroke="#047857" strokeWidth="1" />
      <path d="M20.5 26 L22.5 28 L25.5 24" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

// ============================================================================
// ⚡ หมวดโครงสร้างพื้นฐาน: ไฟฟ้า (ELECTRICITY ICONS)
// ============================================================================

/** ⚡ ไฟฟ้าถาวร / ไฟฟ้าภาครัฐ (PEA): สายฟ้าสีทองเรืองแสงพร้อมประกายไฟ */
export function ColorfulElecGridIcon({ className = 'w-6 h-6', size = 28 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={`${className} shrink-0 drop-shadow-xs`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1" />
      <path d="M18 3 L8 17 H16 L14 29 L24 15 H16 L18 3 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="1" strokeLinejoin="round" />
      <path d="M17 5 L9.5 16 H15 L14 26 L22 16 H15.5 L17 5 Z" fill="#FDE047" />
      <circle cx="23" cy="7" r="1.2" fill="#FACC15" />
      <circle cx="9" cy="25" r="1" fill="#F59E0B" />
    </svg>
  );
}

/** ☀️ ระบบโซลาร์เซลล์: ดวงอาทิตย์สีทองพร้อมแผงโซลาร์เซลล์สีฟ้าสะท้อนแสง */
export function ColorfulElecSolarIcon({ className = 'w-6 h-6', size = 28 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={`${className} shrink-0 drop-shadow-xs`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="11" r="5.5" fill="#F59E0B" stroke="#D97706" strokeWidth="0.8" />
      <circle cx="16" cy="11" r="4.2" fill="#FDE047" />
      {/* รัศมีแสงอาทิตย์ */}
      <line x1="16" y1="2" x2="16" y2="4" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9.5" y1="4.5" x2="11" y2="6" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="22.5" y1="4.5" x2="21" y2="6" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7" y1="11" x2="9" y2="11" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="23" y1="11" x2="25" y2="11" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
      {/* แผงโซลาร์เซลล์ด้านล่าง */}
      <polygon points="7,20 25,20 28,30 4,30" fill="#0284C7" stroke="#0369A1" strokeWidth="1" strokeLinejoin="round" />
      <polygon points="8.5,21 23.5,21 26,29 6,29" fill="#0EA5E9" />
      <line x1="16" y1="20" x2="16" y2="30" stroke="#BAE6FD" strokeWidth="1" />
      <line x1="5.5" y1="25" x2="26.5" y2="25" stroke="#BAE6FD" strokeWidth="1" />
    </svg>
  );
}

/** ⚡☀️ ไฟฟ้าผสมผสาน (ภาครัฐ & โซลาร์เซลล์ Hybrid): พระอาทิตย์คู่สายฟ้า */
export function ColorfulElecHybridIcon({ className = 'w-6 h-6', size = 28 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={`${className} shrink-0 drop-shadow-xs`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#CCFBF1" stroke="#0D9488" strokeWidth="1" />
      {/* ซีกพระอาทิตย์ */}
      <path d="M16 4 A12 12 0 0 0 16 28 V4 Z" fill="#FDE047" opacity="0.6" />
      {/* สายฟ้าสีทองพาดกลาง */}
      <path d="M17 4 L9 16 H16 L14 28 L23 15 H16 L18 4 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="1" strokeLinejoin="round" />
      <circle cx="24" cy="9" r="2.5" fill="#14B8A6" stroke="#0F766E" strokeWidth="0.8" />
      <path d="M24 7.5 V10.5 M22.5 9 H25.5" stroke="#FFFFFF" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}

/** ❌⚡ ไม่มีไฟฟ้าใช้งาน / พื้นที่อับพลังงาน: ปลั๊กไฟถูกตัดขาดมีเครื่องหมายกากบาท */
export function ColorfulElecNoneIcon({ className = 'w-6 h-6', size = 28 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={`${className} shrink-0 drop-shadow-xs`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#FFE4E6" stroke="#F43F5E" strokeWidth="1" />
      {/* ปลั๊กไฟสีเทาหม่น */}
      <rect x="11" y="14" width="10" height="8" rx="2" fill="#64748B" />
      <line x1="13" y1="10" x2="13" y2="14" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="19" y1="10" x2="19" y2="14" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 22 V27" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
      {/* เส้นขีดกากบาทสีแดงเตือน */}
      <circle cx="16" cy="16" r="11" stroke="#E11D48" strokeWidth="2.2" />
      <line x1="8" y1="8" x2="24" y2="24" stroke="#E11D48" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

// ============================================================================
// 🌐 หมวดโครงสร้างพื้นฐาน: อินเทอร์เน็ต (INTERNET ICONS)
// ============================================================================

/** 🌐 เน็ตไฟเบอร์ออพติก (Fiber Optic): ลูกโลกพร้อมสายเคเบิลแสงความเร็วสูง */
export function ColorfulNetFiberIcon({ className = 'w-6 h-6', size = 28 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={`${className} shrink-0 drop-shadow-xs`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* ลูกโลกสีเขียวมรกตและฟ้า */}
      <circle cx="16" cy="16" r="13" fill="#ECFDF5" stroke="#059669" strokeWidth="1.2" />
      <circle cx="16" cy="16" r="11.5" fill="#10B981" />
      {/* ทวีปและเส้นละติจูด */}
      <path d="M6 13 Q16 10 26 13 M6 19 Q16 22 26 19" stroke="#A7F3D0" strokeWidth="1" fill="none" />
      <ellipse cx="16" cy="16" rx="5.5" ry="11.5" stroke="#A7F3D0" strokeWidth="1" fill="none" />
      {/* วงแหวนใยแก้วนำแสงเรืองแสงสีฟ้าสดใส */}
      <ellipse cx="16" cy="16" rx="14.5" ry="5.5" transform="rotate(-25 16 16)" stroke="#38BDF8" strokeWidth="2" strokeDasharray="3 2" fill="none" />
      <circle cx="26" cy="10" r="1.5" fill="#FBBF24" />
    </svg>
  );
}

/** 🛰️ จานดาวเทียม (Satellite): ดาวเทียมอวกาศกำลังส่งสัญญาณคลื่นวิทยุ */
export function ColorfulNetSatelliteIcon({ className = 'w-6 h-6', size = 28 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={`${className} shrink-0 drop-shadow-xs`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#E0F2FE" stroke="#0284C7" strokeWidth="1" />
      {/* จานรับสัญญาณดาวเทียมสีขาวขอบฟ้า */}
      <path d="M12 21 C12 15 17 10 23 10" stroke="#0369A1" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <line x1="12" y1="21" x2="8" y2="25" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
      <line x1="6" y1="26" x2="10" y2="26" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
      {/* หัว LNB */}
      <line x1="17" y1="15" x2="20" y2="18" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="20" cy="18" r="1.5" fill="#EF4444" />
      {/* คลื่นสัญญาณวิทยุสีฟ้า */}
      <path d="M22 6 A14 14 0 0 1 27 11" stroke="#0284C7" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M25 4 A18 18 0 0 1 30 9" stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** 📱 ซิมมือถือ (4G/5G Cellular SIM): ซิมการ์ดชิปทองคำพร้อมเสาส่งสัญญาณ */
export function ColorfulNetSimIcon({ className = 'w-6 h-6', size = 28 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={`${className} shrink-0 drop-shadow-xs`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#FFEDD5" stroke="#EA580C" strokeWidth="1" />
      {/* แผ่นซิมการ์ดสีส้มพร้อมมุมตัด */}
      <path d="M9 7 H20 L24 11 V25 H9 Z" fill="#FB923C" stroke="#C2410C" strokeWidth="1" strokeLinejoin="round" />
      {/* ลายวงจรชิปสีทอง */}
      <rect x="12" y="14" width="8" height="7" rx="1.5" fill="#FDE047" stroke="#B45309" strokeWidth="0.8" />
      <line x1="12" y1="17.5" x2="20" y2="17.5" stroke="#B45309" strokeWidth="0.8" />
      <line x1="16" y1="14" x2="16" y2="21" stroke="#B45309" strokeWidth="0.8" />
      {/* ป้าย 5G สีเขียว */}
      <rect x="18" y="5" width="9" height="5" rx="1.5" fill="#10B981" />
      <text x="22.5" y="8.8" fill="#FFFFFF" fontSize="3.5" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">5G</text>
    </svg>
  );
}

/** ❌📶 ไม่มีอินเทอร์เน็ต / พื้นที่อับสัญญาณ: เสาสัญญาณถูกตัดขาด */
export function ColorfulNetNoneIcon({ className = 'w-6 h-6', size = 28 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={`${className} shrink-0 drop-shadow-xs`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="1" />
      {/* คลื่น Wi-Fi สีเทา */}
      <path d="M8 12 A12 12 0 0 1 24 12" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M11 16 A8 8 0 0 1 21 16" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="16" cy="22" r="1.8" fill="#64748B" />
      {/* เส้นขีดสีแดงห้ามผ่าน */}
      <circle cx="16" cy="16" r="11" stroke="#EF4444" strokeWidth="2.2" />
      <line x1="8" y1="8" x2="24" y2="24" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

// ============================================================================
// 🚰 หมวดโครงสร้างพื้นฐาน: น้ำประปา (WATER ICONS)
// ============================================================================

/** 🚰 น้ำประปาภาครัฐ (กปภ./ท้องถิ่น): ก๊อกน้ำสีฟ้าใสพร้อมหยดน้ำสะท้อนแสง */
export function ColorfulWaterGovIcon({ className = 'w-6 h-6', size = 28 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={`${className} shrink-0 drop-shadow-xs`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#DBEAFE" stroke="#2563EB" strokeWidth="1" />
      {/* ก๊อกน้ำโลหะสีน้ำเงินสด */}
      <path d="M8 13 H18 V16 H15 V18 H11 V16 H8 Z" fill="#2563EB" stroke="#1D4ED8" strokeWidth="0.8" />
      {/* มือหมุนเปิดก๊อกสีแดงสด */}
      <rect x="11.5" y="8" width="3" height="5" rx="1" fill="#DC2626" />
      <rect x="9" y="7" width="8" height="2.5" rx="1" fill="#EF4444" />
      {/* หยดน้ำสีฟ้าใสสะท้อนแสง */}
      <path d="M13 20 C13 20 10.5 23 10.5 25 C10.5 26.5 11.6 27.5 13 27.5 C14.4 27.5 15.5 26.5 15.5 25 C15.5 23 13 20 13 20 Z" fill="#38BDF8" stroke="#0284C7" strokeWidth="0.8" />
      <circle cx="12" cy="24" r="0.6" fill="#FFFFFF" />
      {/* วงระลอกน้ำ */}
      <ellipse cx="22" cy="25" rx="5" ry="1.5" stroke="#60A5FA" strokeWidth="1" fill="none" />
    </svg>
  );
}

/** 🏔️ น้ำประปาภูเขา / ดอย: ภูเขาสีเขียวมรกต ยอดดอยหิมะขาว พร้อมธารน้ำตกใส */
export function ColorfulWaterMountainIcon({ className = 'w-6 h-6', size = 28 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={`${className} shrink-0 drop-shadow-xs`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#CFFAFE" stroke="#0891B2" strokeWidth="1" />
      {/* เทือกเขาด้านหลังสีเขียวเข้ม */}
      <polygon points="12,12 5,26 19,26" fill="#047857" />
      {/* เทือกเขาหลักด้านหน้าสีเขียวสดใส */}
      <polygon points="20,8 10,27 30,27" fill="#10B981" stroke="#059669" strokeWidth="0.8" />
      {/* ยอดดอยหิมะสีขาวสะอาด */}
      <polygon points="20,8 17.5,13 19,14 21,13 22.5,13" fill="#FFFFFF" />
      {/* ธารน้ำแร่ธรรมชาติไหลลงมาเป็นหยดน้ำ */}
      <path d="M19 14 Q21 19 19 24 Q18 26 18 27" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M8 24 C8 24 6.5 26 6.5 27 C6.5 28 7.2 28.5 8 28.5 C8.8 28.5 9.5 28 9.5 27 C9.5 26 8 24 8 24 Z" fill="#06B6D4" />
    </svg>
  );
}

/** 🪣 น้ำประปาอื่นๆ / บ่อบาดาล / บ่อขุด: บ่อน้ำหินพร้อมหลังคาไม้และถังตักน้ำ */
export function ColorfulWaterWellIcon({ className = 'w-6 h-6', size = 28 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={`${className} shrink-0 drop-shadow-xs`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#EDE9FE" stroke="#7C3AED" strokeWidth="1" />
      {/* หลังคาบ่อน้ำสีม่วงอมแดง */}
      <polygon points="16,5 7,12 25,12" fill="#7C3AED" stroke="#5B21B6" strokeWidth="0.8" />
      <line x1="10" y1="12" x2="10" y2="20" stroke="#92400E" strokeWidth="1.5" />
      <line x1="22" y1="12" x2="22" y2="20" stroke="#92400E" strokeWidth="1.5" />
      {/* เชือกและรอก */}
      <line x1="10" y1="14" x2="22" y2="14" stroke="#78350F" strokeWidth="1.2" />
      <circle cx="16" cy="14" r="1.5" fill="#F59E0B" />
      <line x1="16" y1="14" x2="16" y2="18" stroke="#D97706" strokeWidth="1" />
      {/* ถังน้ำตักขึ้นมา */}
      <rect x="14" y="17" width="4" height="4" rx="0.5" fill="#B45309" />
      {/* ตัวบ่อน้ำก่อหินสีเทาม่วง */}
      <rect x="8" y="20" width="16" height="8" rx="1.5" fill="#6D28D9" stroke="#4C1D95" strokeWidth="0.8" />
      <ellipse cx="16" cy="20" rx="8" ry="2" fill="#38BDF8" />
    </svg>
  );
}

/** ❌💧 ไม่มีน้ำประปา / ภัยแล้งขาดแคลน: ดินแตกระแหงพร้อมหยดน้ำถูกกากบาท */
export function ColorfulWaterNoneIcon({ className = 'w-6 h-6', size = 28 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={`${className} shrink-0 drop-shadow-xs`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#FFE4E6" stroke="#F43F5E" strokeWidth="1" />
      {/* หยดน้ำสีฟ้าจางหม่น */}
      <path d="M16 8 C16 8 10 16 10 20 C10 23.3 12.7 26 16 26 C19.3 26 22 23.3 22 20 C22 16 16 8 16 8 Z" fill="#FDA4AF" stroke="#E11D48" strokeWidth="0.8" />
      {/* เส้นดินแห้งแตกระแหงด้านล่าง */}
      <path d="M6 26 L11 23 L16 26 L21 23 L26 26" stroke="#9A3412" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      {/* เครื่องหมายกากบาทสีแดงห้ามผ่าน */}
      <circle cx="16" cy="16" r="11" stroke="#E11D48" strokeWidth="2.2" />
      <line x1="8" y1="8" x2="24" y2="24" stroke="#E11D48" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

// ============================================================================
// 📞 หมวดช่องทางการติดต่อ: (CONTACT CHANNELS ICONS)
// ============================================================================

/** 📞 โทรศัพท์สำนักงาน: หูโทรศัพท์สีเขียวมรกต 3D พร้อมคลื่นเสียง */
export function ColorfulPhoneCallIcon({ className = 'w-7 h-7', size = 32 }: IconProps) {
  return (
    <svg viewBox="0 0 36 36" width={size} height={size} className={`${className} shrink-0 drop-shadow-xs`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="16" fill="#D1FAE5" stroke="#10B981" strokeWidth="1.2" />
      <circle cx="18" cy="18" r="13.5" fill="#10B981" />
      {/* หูโทรศัพท์สีขาวสะท้อนเงา */}
      <path d="M12.5 10 C12.5 10 14 12.5 14.5 13.5 C15 14.5 14.5 15.5 13.5 16.5 C14.5 18.5 17.5 21.5 19.5 22.5 C20.5 21.5 21.5 21 22.5 21.5 C23.5 22 26 23.5 26 23.5 C26 23.5 26.5 24.5 25.5 26 C24.5 27.5 21.5 27 19.5 26 C15.5 24 12 20.5 10 16.5 C9 14.5 8.5 11.5 10 10.5 C11.5 9.5 12.5 10 12.5 10 Z" fill="#FFFFFF" />
      {/* คลื่นเสียงสั่นสะเทือนสีทอง */}
      <path d="M24 10 A6 6 0 0 1 28 14" stroke="#FDE047" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M26 7 A10 10 0 0 1 31 12" stroke="#FDE047" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** ✉️ อีเมลติดต่อราชการ: ซองจดหมายสีขาวขอบฟ้า พร้อมตราประทับสีแดง */
export function ColorfulEmailIcon({ className = 'w-7 h-7', size = 32 }: IconProps) {
  return (
    <svg viewBox="0 0 36 36" width={size} height={size} className={`${className} shrink-0 drop-shadow-xs`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="16" fill="#E0F2FE" stroke="#0284C7" strokeWidth="1.2" />
      {/* ซองจดหมายสีขาวสะอาด */}
      <rect x="5" y="10" width="26" height="17" rx="3" fill="#FFFFFF" stroke="#0284C7" strokeWidth="1.2" />
      {/* พับฝาซองจดหมายสีฟ้าสด */}
      <polygon points="5,11 18,21 31,11" fill="#38BDF8" stroke="#0284C7" strokeWidth="1" strokeLinejoin="round" />
      <polygon points="5,27 13,18 18,21 23,18 31,27" fill="#F0F9FF" opacity="0.6" />
      {/* ตราประทับครั่งสีแดงสดตรงกลาง */}
      <circle cx="18" cy="21" r="3" fill="#EF4444" stroke="#B91C1C" strokeWidth="0.8" />
      <path d="M18 19.5 L19 22 L17 22 Z" fill="#FFFFFF" />
    </svg>
  );
}

/** 💬 LINE Official Account: โลโก้แอป LINE สีเขียวสดใสพร้อมบอลลูนคำพูด */
export function ColorfulLineAppIcon({ className = 'w-7 h-7', size = 32 }: IconProps) {
  return (
    <svg viewBox="0 0 36 36" width={size} height={size} className={`${className} shrink-0 drop-shadow-xs`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="32" height="32" rx="9" fill="#06C755" />
      {/* บอลลูนสนทนาสีขาว */}
      <path d="M18 7 C11.5 7 6 11.2 6 16.5 C6 20.2 8.5 23.4 12.5 24.9 C13 25.1 13.5 25.5 13.4 26.2 L13 28.5 C12.9 29 13.3 29.4 13.7 29.1 L18.8 26 C18.5 26 18.2 26 18 26 C24.5 26 30 21.8 30 16.5 C30 11.2 24.5 7 18 7 Z" fill="#FFFFFF" />
      {/* ข้อความ LINE สีเขียวเข้ม */}
      <text x="18" y="19" fill="#06C755" fontSize="6.5" fontWeight="900" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" letterSpacing="0.5">LINE</text>
    </svg>
  );
}

/** 🌐 Facebook Page: โลโก้ Facebook สีน้ำเงินรอยัลบลูพร้อมตัว 'f' คลาสสิก */
export function ColorfulFacebookIcon({ className = 'w-7 h-7', size = 32 }: IconProps) {
  return (
    <svg viewBox="0 0 36 36" width={size} height={size} className={`${className} shrink-0 drop-shadow-xs`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="32" height="32" rx="9" fill="#1877F2" />
      {/* ตัว f สีขาวของ Facebook */}
      <path d="M21 13 H24 V8 H20 C16.5 8 15 10 15 14 V17 H11 V22 H15 V34 H21 V22 H24.5 L25.5 17 H21 V14.5 C21 13.5 21.5 13 21 13 Z" fill="#FFFFFF" />
    </svg>
  );
}

/** 🎵 TikTok Official: ตราสัญลักษณ์ TikTok โน้ตดนตรีคู่สีฟ้าและสีชมพูมาเจนต้า */
export function ColorfulTikTokIcon({ className = 'w-7 h-7', size = 32 }: IconProps) {
  return (
    <svg viewBox="0 0 36 36" width={size} height={size} className={`${className} shrink-0 drop-shadow-xs`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="32" height="32" rx="9" fill="#010101" />
      {/* เลเยอร์สีฟ้าไซอัน (#25F4EE) */}
      <path d="M21 7 A7 7 0 0 0 27 12 V16 A11 11 0 0 1 20 14 V24 A6 6 0 1 1 14 18 V22 A2 2 0 1 0 16 24 V7 Z" fill="#25F4EE" />
      {/* เลเยอร์สีแดงมาเจนต้า (#FE2C55) ซ้อนทับ */}
      <path d="M22 8 A7 7 0 0 0 28 13 V17 A11 11 0 0 1 21 15 V25 A6 6 0 1 1 15 19 V23 A2 2 0 1 0 17 25 V8 Z" fill="#FE2C55" />
      {/* เลเยอร์สีขาวแกนกลาง */}
      <path d="M21.5 7.5 A7 7 0 0 0 27.5 12.5 V15.5 A11 11 0 0 1 20.5 13.5 V24.5 A6 6 0 1 1 14.5 18.5 V21.5 A2 2 0 1 0 16.5 24.5 V7.5 Z" fill="#FFFFFF" />
    </svg>
  );
}

/** 📍 ที่อยู่สำนักงาน (Google Maps Location): หมุดปักสีแดง 3D พร้อมดาวทอง */
export function ColorfulOfficeMapPinIcon({ className = 'w-7 h-7', size = 32 }: IconProps) {
  return (
    <svg viewBox="0 0 36 36" width={size} height={size} className={`${className} shrink-0 drop-shadow-xs`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="16" fill="#FEE2E2" stroke="#EF4444" strokeWidth="1.2" />
      {/* เงาหมุดที่พื้น */}
      <ellipse cx="18" cy="30" rx="6" ry="2" fill="#94A3B8" opacity="0.5" />
      {/* ตัวหมุดสีแดงสดใส */}
      <path d="M18 6 C13 6 9 10 9 15 C9 22 18 30 18 30 C18 30 27 22 27 15 C27 10 23 6 18 6 Z" fill="#EF4444" stroke="#B91C1C" strokeWidth="1" />
      <circle cx="18" cy="14.5" r="5" fill="#FFFFFF" />
      {/* ดาวทองคำตรงใจกลางหมุด */}
      <polygon points="18,11.5 19.2,14 22,14.2 19.8,16 20.5,18.5 18,17 15.5,18.5 16.2,16 14,14.2 16.8,14" fill="#F59E0B" />
    </svg>
  );
}

/** 📲 คิวอาร์โค้ดติดต่อ (QR Code Matrix): ลวดลาย QR สีม่วงพร้อมลำแสงสแกนเนอร์สีทอง */
export function ColorfulQrCodeIcon({ className = 'w-7 h-7', size = 32 }: IconProps) {
  return (
    <svg viewBox="0 0 36 36" width={size} height={size} className={`${className} shrink-0 drop-shadow-xs`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="32" height="32" rx="9" fill="#7C3AED" />
      <rect x="4" y="4" width="28" height="28" rx="7" fill="#F5F3FF" />
      {/* กรอบมุม 3 จุด */}
      {/* บนซ้าย */}
      <rect x="7" y="7" width="8" height="8" rx="1" fill="#7C3AED" />
      <rect x="9" y="9" width="4" height="4" fill="#FFFFFF" />
      <rect x="10" y="10" width="2" height="2" fill="#7C3AED" />
      {/* บนขวา */}
      <rect x="21" y="7" width="8" height="8" rx="1" fill="#7C3AED" />
      <rect x="23" y="9" width="4" height="4" fill="#FFFFFF" />
      <rect x="24" y="10" width="2" height="2" fill="#7C3AED" />
      {/* ล่างซ้าย */}
      <rect x="7" y="21" width="8" height="8" rx="1" fill="#7C3AED" />
      <rect x="9" y="23" width="4" height="4" fill="#FFFFFF" />
      <rect x="10" y="24" width="2" height="2" fill="#7C3AED" />
      {/* พิกเซลตรงกลาง */}
      <rect x="17" y="10" width="2" height="2" fill="#7C3AED" />
      <rect x="10" y="17" width="2" height="2" fill="#7C3AED" />
      <rect x="17" y="17" width="3" height="3" fill="#EC4899" />
      <rect x="22" y="17" width="2" height="2" fill="#7C3AED" />
      <rect x="17" y="23" width="2" height="4" fill="#7C3AED" />
      <rect x="23" y="23" width="4" height="2" fill="#7C3AED" />
      {/* ลำแสงเลเซอร์สแกนเนอร์สีทอง */}
      <line x1="5" y1="18" x2="31" y2="18" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="3 1" />
    </svg>
  );
}
