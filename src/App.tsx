import { useState, useEffect } from 'react';
import { db, auth, OperationType, handleFirestoreError } from './firebase';
import { collection, getDocs, setDoc, doc, getDoc, query, where } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { School, StudentData, UserProfile } from './types';

// นำเข้า Components
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import SchoolListView from './components/SchoolListView';
import SchoolDetailView from './components/SchoolDetailView';
import AdminPanel from './components/AdminPanel';
import AuthModal from './components/AuthModal';

import { Sparkles, RefreshCw, Award, Heart, HelpCircle, GraduationCap, AlertTriangle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  
  // ข้อมูลสถิติหลัก
  const [schools, setSchools] = useState<School[]>([]);
  const [studentData, setStudentData] = useState<StudentData[]>([]);
  const [academicYear, setAcademicYear] = useState<string>('2568');
  const [availableYears, setAvailableYears] = useState<string[]>(['2568', '2569']);
  
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
      
      const schoolsList: School[] = [];
      const studentsList: StudentData[] = [];

      schoolsSnapshot.forEach((doc) => {
        schoolsList.push({ ...doc.data() } as School);
      });

      studentsSnapshot.forEach((doc) => {
        studentsList.push({ ...doc.data(), id: doc.id } as StudentData);
      });

      let finalStudentsList = studentsList;

      setSchools(schoolsList);
      setStudentData(studentsList);

      // ตรวจหาปีการศึกษาทั้งหมดที่มีในฐานข้อมูล
      const years = Array.from(new Set(finalStudentsList.map(s => s.academicYear)));
      if (years.length > 0) {
        // จัดเรียง
        years.sort((a, b) => b.localeCompare(a));
        setAvailableYears(years);
        if (!years.includes(academicYear)) {
          setAcademicYear(years[0]);
        }
      }

    } catch (error) {
      console.error('Error fetching data:', error);
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
  const selectedSchoolStudent = studentData.find(s => s.schoolId === selectedSchoolId && s.academicYear === academicYear) || null;

  return (
    <div className="min-h-screen flex flex-col bg-bg-vibrant text-text-vibrant dark:bg-[#150e10] dark:text-rose-100 transition-colors duration-300 grid-pattern">
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
      />

      {/* MAIN CONTENT AREA */}
      <main className="flex-grow mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
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
                onBack={() => setSelectedSchoolId(null)}
                userProfile={userProfile}
                onRefreshData={fetchAllData}
              />
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <DashboardView
                    schools={schools}
                    studentData={studentData}
                    academicYear={academicYear}
                    setAcademicYear={setAcademicYear}
                    availableYears={availableYears}
                    onSelectSchool={(id) => setSelectedSchoolId(id)}
                  />
                )}

                {activeTab === 'schools' && (
                  <SchoolListView
                    schools={schools}
                    studentData={studentData}
                    userProfile={userProfile}
                    onSelectSchool={(id) => setSelectedSchoolId(id)}
                  />
                )}

                {activeTab === 'admin' && userProfile && (
                  <AdminPanel
                    userProfile={userProfile}
                    schools={schools}
                    studentData={studentData}
                    onRefreshData={fetchAllData}
                  />
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t-2 border-[#33272A] bg-white dark:border-[#FFD3B6] dark:bg-[#1e1518] p-4 transition-colors">
        <div className="mx-auto max-w-7xl px-4 flex flex-col md:flex-row items-center justify-between text-[11px] font-bold text-[#33272A] dark:text-[#FFF9F5] gap-2 text-center md:text-left">
          <div className="flex items-center gap-1.5 justify-center">
            <Award className="h-4 w-4 text-[#FF8BA7]" />
            <span>MHS1 BIGDATA &copy; 2026 ระบบสารสนเทศนักเรียนรายบุคคล สพป.แม่ฮ่องสอน เขต 1</span>
          </div>
          <div className="flex items-center gap-1.5 justify-center">
            <span>พัฒนาขึ้นด้วย</span>
            <Heart className="h-3 w-3 text-[#FF8BA7] fill-[#FF8BA7]" />
            <span>เพื่อความโปร่งใส ปรับปรุงคุณภาพ และความปลอดภัยของข้อมูลสถานศึกษา</span>
          </div>
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
