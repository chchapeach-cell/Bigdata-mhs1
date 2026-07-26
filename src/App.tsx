import { useState, useEffect } from 'react';
import { db, auth, OperationType, handleFirestoreError } from './firebase';
import { collection, getDocs, setDoc, doc, getDoc, query, where } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { School, StudentData, UserProfile, StudentGData, SystemConfig } from './types';
import { generateInitialStudentGData } from './utils/initialData';

const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  allowDataDownload: true,
  restrictOneAdminPerSchool: true,
  allowSchoolAdminRegistration: true,
  electricityOptions: [
    { id: 'has_electric', label: '🔌 ไฟฟ้าถาวร' },
    { id: 'solar', label: '☀️ โซลาร์เซลล์' },
    { id: 'hybrid', label: '⚡☀️ ผสมผสาน' },
    { id: 'none', label: '❌ ไม่มีไฟฟ้า' },
  ],
  internetOptions: [
    { id: 'fiber', label: '🌐 Fiber Optic' },
    { id: 'satellite', label: '🛰️ ดาวเทียม' },
    { id: 'sim', label: '📱 SIM 4G/5G' },
    { id: 'none', label: '❌ ไม่มีเน็ต' },
  ],
};

// นำเข้า Components
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import SchoolListView from './components/SchoolListView';
import SchoolDetailView from './components/SchoolDetailView';
import AdminPanel from './components/AdminPanel';
import AuthModal from './components/AuthModal';
import InfrastructureView from './components/InfrastructureView';
import VisitorCounter from './components/VisitorCounter';

import { Sparkles, RefreshCw, Award, Heart, HelpCircle, GraduationCap, AlertTriangle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  
  // สถานะตัวกรองจากหน้านำทางแดชบอร์ด
  const [initialFilters, setInitialFilters] = useState<{
    size?: string;
    type?: string;
    amphoe?: string;
    netFilter?: string;
    electricityFilter?: string;
    majorSubjectFilter?: string;
  } | null>(null);

  const handleFilterNavigate = (filters: {
    size?: string;
    type?: string;
    amphoe?: string;
    netFilter?: string;
    electricityFilter?: string;
    majorSubjectFilter?: string;
  }) => {
    setInitialFilters(filters);
    setActiveTab('schools');
    setSelectedSchoolId(null); // เคลียร์สถานะการเลือกโรงเรียนรายบุคคลเพื่อเปิดหน้าตารางรายชื่อแบบกรอง
  };
  
  // ข้อมูลสถิติหลัก
  const [schools, setSchools] = useState<School[]>([]);
  const [studentData, setStudentData] = useState<StudentData[]>([]);
  const [studentGData, setStudentGData] = useState<StudentGData[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(DEFAULT_SYSTEM_CONFIG);
  // หาสมการปีงบประมาณ/ปีการศึกษาปัจจุบัน (พ.ศ.)
  const currentBEYear = (new Date().getFullYear() + 543).toString();
  const [academicYear, setAcademicYear] = useState<string>(currentBEYear);
  const [availableYears, setAvailableYears] = useState<string[]>([currentBEYear]);
  
  // จัดการผู้ใช้งาน
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  // สถานะการโหลดข้อมูล
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large' | 'xlarge'>(() => {
    const saved = localStorage.getItem('font-size');
    return (saved as 'small' | 'medium' | 'large' | 'xlarge') || 'medium';
  });

  // จัดการระบบธีม Dark Mode / Light Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // จัดการปรับขนาดตัวอักษรของระบบ
  useEffect(() => {
    const sizeMap = {
      small: '14px',
      medium: '16px',
      large: '19px',
      xlarge: '23px',
    };
    document.documentElement.style.fontSize = sizeMap[fontSize];
    localStorage.setItem('font-size', fontSize);
  }, [fontSize]);

  // ตรวจสอบการเข้าสู่ระบบและโหลดโปรไฟล์
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // ดึงโปรไฟล์แอดมินโรงเรียนจาก Firestore ด้วยวิธีเฉพาะเจาะจงและปลอดภัย
          let matchedProfile: UserProfile | null = null;
          let userDocSnap;
          try {
            userDocSnap = await getDoc(doc(db, 'users', currentUser.uid));
          } catch (e) {
            handleFirestoreError(e, OperationType.GET, `users/${currentUser.uid}`);
          }

          if (userDocSnap.exists()) {
            matchedProfile = { ...userDocSnap.data(), uid: userDocSnap.id } as UserProfile;
          } else if (currentUser.email) {
            // ค้นหาเฉพาะเจาะจงด้วย Email แทนการดึงข้อมูลท้้งคอลเลกชัน
            const q = query(collection(db, 'users'), where('email', '==', currentUser.email));
            let qSnap;
            try {
              qSnap = await getDocs(q);
            } catch (e) {
              handleFirestoreError(e, OperationType.LIST, 'users');
            }
            if (!qSnap.empty) {
              const matchedDoc = qSnap.docs[0];
              matchedProfile = { ...matchedDoc.data(), uid: matchedDoc.id } as UserProfile;
            }
          }

          // กรณีเป็น Super Admin เมลที่ระบุ
          const isHardcodedSuperAdmin = currentUser.email === 'tamrri@gmail.com' || currentUser.email === 'ch.chapeach@gmail.com';
          if (isHardcodedSuperAdmin) {
            const superAdminProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              firstName: 'Super',
              lastName: 'Admin',
              schoolId: 'all',
              schoolName: 'สพป.แม่ฮ่องสอน เขต 1',
              role: 'super_admin',
              status: 'approved',
              createdAt: new Date()
            };
            setUserProfile(superAdminProfile);
          } else if (matchedProfile) {
            setUserProfile(matchedProfile);
          } else {
            setUserProfile(null);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setUserProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // ฟังก์ชันดาวน์โหลดและประสานข้อมูลทั้งหมดจาก Firestore
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      // ดึงนโยบายและค่าตั้งค่าระบบ
      try {
        const configSnap = await getDoc(doc(db, 'settings', 'system_config'));
        if (configSnap.exists()) {
          const data = configSnap.data();
          setSystemConfig({
            allowDataDownload: data.allowDataDownload !== undefined ? data.allowDataDownload : true,
            restrictOneAdminPerSchool: data.restrictOneAdminPerSchool !== undefined ? data.restrictOneAdminPerSchool : true,
            allowSchoolAdminRegistration: data.allowSchoolAdminRegistration !== undefined ? data.allowSchoolAdminRegistration : true,
            electricityOptions: data.electricityOptions && data.electricityOptions.length > 0 ? data.electricityOptions : DEFAULT_SYSTEM_CONFIG.electricityOptions,
            internetOptions: data.internetOptions && data.internetOptions.length > 0 ? data.internetOptions : DEFAULT_SYSTEM_CONFIG.internetOptions,
          });
        }
      } catch (e) {
        console.error('Error fetching system config:', e);
      }

      let schoolsSnapshot;
      try {
        schoolsSnapshot = await getDocs(collection(db, 'schools'));
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, 'schools');
      }

      let studentsSnapshot;
      try {
        studentsSnapshot = await getDocs(collection(db, 'students'));
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, 'students');
      }

      let studentsGSnapshot;
      try {
        studentsGSnapshot = await getDocs(collection(db, 'students_g'));
      } catch (e) {
        // collection may be new
      }
      
      const schoolsList: School[] = [];
      const studentsList: StudentData[] = [];
      const studentsGList: StudentGData[] = [];

      schoolsSnapshot?.forEach((doc) => {
        schoolsList.push({ ...doc.data() } as School);
      });

      studentsSnapshot?.forEach((doc) => {
        studentsList.push({ ...doc.data(), id: doc.id } as StudentData);
      });

      studentsGSnapshot?.forEach((docSnap) => {
        const data = docSnap.data() as StudentGData;
        let year = data.academicYear;

        // ถ้า academicYear ไม่เป็นตัวเลข 4 หลัก ให้ลองดึงปีจาก doc.id (เช่น 1058000001_2568)
        if (!year || !/^\d{4}$/.test(year)) {
          const parts = docSnap.id.split('_');
          if (parts.length > 1 && /^\d{4}$/.test(parts[parts.length - 1])) {
            year = parts[parts.length - 1];
          }
        }

        studentsGList.push({
          ...data,
          id: docSnap.id,
          academicYear: year || data.academicYear || 'ไม่ระบุ'
        });
      });

      if (schoolsList.length === 0) {
        // Fallback to initial preset data if database is empty or connection fails
        const { parseInitialData } = await import('./utils/initialData');
        const initial = parseInitialData('2568');
        setSchools(initial.schools);
        setStudentData(initial.students);
        setStudentGData(generateInitialStudentGData(initial.schools));
        
        const years = Array.from(new Set(initial.students.map(s => s.academicYear)));
        if (years.length > 0) {
          years.sort((a, b) => b.localeCompare(a));
          setAvailableYears(years);
          if (years.includes(currentBEYear)) {
            setAcademicYear(currentBEYear);
          } else {
            setAcademicYear(years[0]);
          }
        }
        return;
      }

      setSchools(schoolsList);
      setStudentData(studentsList);

      // ถ้าในคอลเลกชัน students_g ยังไม่มีข้อมูล ให้ใช้ตัวอย่างเริ่มต้น
      if (studentsGList.length === 0) {
        setStudentGData(generateInitialStudentGData(schoolsList));
      } else {
        setStudentGData(studentsGList);
      }

      // ตรวจหาปีการศึกษาทั้งหมดที่มีในฐานข้อมูล
      const years = Array.from(new Set(studentsList.map(s => s.academicYear)));
      if (years.length > 0) {
        years.sort((a, b) => b.localeCompare(a));
        setAvailableYears(years);
        if (years.includes(currentBEYear)) {
          setAcademicYear(currentBEYear);
        } else {
          setAcademicYear(years[0]);
        }
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      // Fallback to initial preset data if network or Firestore fails
      if (schools.length === 0) {
        const { parseInitialData } = await import('./utils/initialData');
        const initial = parseInitialData('2568');
        setSchools(initial.schools);
        setStudentData(initial.students);
        setStudentGData(generateInitialStudentGData(initial.schools));
        
        const years = Array.from(new Set(initial.students.map(s => s.academicYear)));
        if (years.length > 0) {
          years.sort((a, b) => b.localeCompare(a));
          setAvailableYears(years);
          if (years.includes(currentBEYear)) {
            setAcademicYear(currentBEYear);
          } else {
            setAcademicYear(years[0]);
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // ออกจากระบบ
  const handleLogout = async () => {
    await signOut(auth);
    setUserProfile(null);
    setUser(null);
    setActiveTab('dashboard');
  };

  const selectedSchool = schools.find(s => s.id === selectedSchoolId);
  const selectedSchoolStudent = studentData.find(
    s => s.schoolId === selectedSchoolId && String(s.academicYear).trim() === String(academicYear).trim()
  ) || studentData.find(s => s.schoolId === selectedSchoolId) || null;

  return (
    <div className="min-h-screen flex flex-col bg-bg-vibrant text-text-vibrant dark:bg-[#150e10] dark:text-rose-100 transition-colors duration-300 grid-pattern w-full max-w-full overflow-x-clip">
      {/* HEADER */}
      <Header
        userProfile={userProfile}
        onLoginClick={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedSchoolId(null); // ล้างค่าเลือกโรงเรียนเมื่อเปลี่ยนแท็บหลัก
        }}
        fontSize={fontSize}
        setFontSize={setFontSize}
        academicYear={academicYear}
        setAcademicYear={setAcademicYear}
        availableYears={availableYears}
      />

      {/* MAIN CONTENT AREA */}
      <main className="flex-grow mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 pb-20 lg:pb-8">
        {isLoading ? (
          <div className="flex h-96 flex-col items-center justify-center gap-3">
            <RefreshCw className="h-10 w-10 text-rose-500 animate-spin" />
            <span className="text-sm font-extrabold text-slate-500 dark:text-slate-400">
              กำลังดึงข้อมูลสถิติล่าสุดจาก Firebase...
            </span>
          </div>
        ) : (
          <div className="animate-fade-in">
            {/* โชว์หน้ารายละเอียดเมื่อโรงเรียนโดนเลือก */}
            {selectedSchoolId && selectedSchool ? (
              <SchoolDetailView
                school={selectedSchool}
                studentData={selectedSchoolStudent}
                allStudentData={studentData}
                allStudentGData={studentGData}
                onBack={() => setSelectedSchoolId(null)}
                userProfile={userProfile}
                onRefreshData={fetchAllData}
                isDarkMode={isDarkMode}
                systemConfig={systemConfig}
                academicYear={academicYear}
                setAcademicYear={setAcademicYear}
                availableYears={availableYears}
              />
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <DashboardView
                    schools={schools}
                    studentData={studentData}
                    studentGData={studentGData}
                    academicYear={academicYear}
                    setAcademicYear={setAcademicYear}
                    availableYears={availableYears}
                    onSelectSchool={(id) => setSelectedSchoolId(id)}
                    isDarkMode={isDarkMode}
                    onFilterNavigate={handleFilterNavigate}
                  />
                )}

                {activeTab === 'schools' && (
                  <SchoolListView
                    schools={schools}
                    studentData={studentData}
                    userProfile={userProfile}
                    onSelectSchool={(id) => setSelectedSchoolId(id)}
                    initialFilters={initialFilters}
                    clearInitialFilters={() => setInitialFilters(null)}
                    systemConfig={systemConfig}
                    academicYear={academicYear}
                    setAcademicYear={setAcademicYear}
                    availableYears={availableYears}
                  />
                )}

                {activeTab === 'infrastructure' && (
                  <InfrastructureView
                    schools={schools}
                    onSelectSchool={(id) => {
                      setSelectedSchoolId(id);
                      setActiveTab('schools');
                    }}
                    systemConfig={systemConfig}
                    userProfile={userProfile}
                  />
                )}

                {activeTab === 'admin' && userProfile && (
                  <AdminPanel
                    userProfile={userProfile}
                    schools={schools}
                    studentData={studentData}
                    studentGData={studentGData}
                    onRefreshData={fetchAllData}
                    systemConfig={systemConfig}
                  />
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t-2 border-[#33272A] bg-white dark:border-[#FFD3B6] dark:bg-[#1e1518] p-4 transition-colors pb-24 xl:pb-6">
        <div className="mx-auto max-w-7xl px-4 flex flex-col md:flex-row items-center justify-between text-xs sm:text-sm font-medium text-[#33272A] dark:text-[#FFF9F5] gap-3 text-center md:text-left">
          <div className="flex items-center gap-1.5 justify-center">
            <Award className="h-4 w-4 text-[#FF8BA7] shrink-0" />
            <span className="font-bold">MHS1 BIGDATA &copy; 2026 ระบบสารสนเทศนักเรียนรายบุคคล สพป.แม่ฮ่องสอน เขต 1</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 justify-center md:justify-end text-[#33272A] dark:text-[#FFF9F5]">
            <span>พัฒนาขึ้นโดย</span>
            <span className="font-bold text-[#FF8BA7] dark:text-[#FF8BA7]">นักวิเคราะห์นโยบายและแผน นายภูชิชย์ ชาติเวียง</span>
            <span>และ</span>
            <span className="font-bold text-[#14B8A6] dark:text-[#A0E7E5]">เจ้าหน้าที่ ICT นางสาวชนัญชิตา ไพศาล</span>
          </div>
        </div>

        {/* VISITOR COUNTER */}
        <div className="mx-auto max-w-7xl px-4 pt-3 mt-3 border-t border-[#33272A]/10 dark:border-[#FFD3B6]/20 flex justify-center items-center">
          <VisitorCounter />
        </div>
      </footer>

      {/* LOGIN / SIGNUP MODAL */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        schools={schools}
        onAuthSuccess={(profile) => {
          setUserProfile(profile);
          setActiveTab('admin');
        }}
      />
    </div>
  );
}
