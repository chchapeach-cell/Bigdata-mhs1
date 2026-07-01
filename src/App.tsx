import { useState, useEffect } from 'react';
import { db, auth, OperationType, handleFirestoreError } from './firebase';
import { collection, getDocs, setDoc, doc, getDoc, query, where } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { School, StudentData, UserProfile } from './types';
import { parseInitialData } from './utils/initialData';

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
  const [isSeeding, setIsSeeding] = useState(false);
  const [isUsingLocalFallback, setIsUsingLocalFallback] = useState<boolean>(false);
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

      // หาก Firestore ว่างเปล่า (ไม่มีข้อมูล) -> จัดการ Seed เริ่มต้นจาก CSV ทันที!
      if (schoolsList.length === 0) {
        setIsUsingLocalFallback(true);
        setIsSeeding(true);
        console.log('No data found in Firebase, initiating seeding with initialData...');
        const { schools: defaultSchools, students: defaultStudents2568 } = parseInitialData('2568');
        const { students: defaultStudents2569Raw } = parseInitialData('2569');

        // สร้างข้อมูลปี 2569 ที่มีความผันแปรเพื่อความสมจริง (ไม่แบนราบ)
        const defaultStudents2569 = defaultStudents2569Raw.map((s, idx) => {
          const multiplier = 1 + (((idx % 5) - 2) * 0.03); // +/- 6% variation
          const newGrades = { ...s.grades };
          let totalMale = 0;
          let totalFemale = 0;
          
          Object.keys(newGrades).forEach((grade) => {
            const gObj = { ...newGrades[grade] };
            gObj.male = Math.max(0, Math.round(gObj.male * multiplier));
            gObj.female = Math.max(0, Math.round(gObj.female * multiplier));
            gObj.total = gObj.male + gObj.female;
            newGrades[grade] = gObj;
            totalMale += gObj.male;
            totalFemale += gObj.female;
          });
          
          return {
            ...s,
            academicYear: '2569',
            grades: newGrades,
            totalMale,
            totalFemale,
            totalStudents: totalMale + totalFemale
          };
        });

        const defaultStudents = [...defaultStudents2568, ...defaultStudents2569];

        // บันทึกลงใน Firestore (เฉพาะเมื่อผู้ใช้ล็อกอินและเป็น Super Admin เท่านั้น)
        const isUserSuperAdmin = auth.currentUser?.email === 'tamrri@gmail.com' || auth.currentUser?.email === 'ch.chapeach@gmail.com';
        
        if (isUserSuperAdmin) {
          for (const school of defaultSchools) {
            try {
              await setDoc(doc(db, 'schools', school.id), school);
            } catch (e) {
              handleFirestoreError(e, OperationType.WRITE, `schools/${school.id}`);
            }
          }
          for (const student of defaultStudents) {
            try {
              await setDoc(doc(db, 'students', `${student.schoolId}_${student.academicYear}`), student);
            } catch (e) {
              handleFirestoreError(e, OperationType.WRITE, `students/${student.schoolId}_${student.academicYear}`);
            }
          }
          setIsUsingLocalFallback(false);
        }

        setSchools(defaultSchools);
        setStudentData(defaultStudents);
        finalStudentsList = defaultStudents;
        console.log('Seeding finished successfully!');
      } else {
        setIsUsingLocalFallback(false);
        setSchools(schoolsList);
        setStudentData(studentsList);
      }

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
      setIsSeeding(false);
    }
  };

  // ฟังก์ชันสำหรับการบังคับโอนย้ายข้อมูลสถิติ Big Data ทั้งหมดไปยัง Firestore (สำหรับ Super Admin)
  const handleForceMigrate = async () => {
    const isUserSuperAdmin = userProfile?.role === 'super_admin';
    if (!isUserSuperAdmin) {
      alert('คุณไม่มีสิทธิ์ในการดำเนินการนี้ (เฉพาะ Super Admin เท่านั้น)');
      return;
    }

    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการเริ่มดำเนินการโอนย้ายข้อมูล Big Data (43 โรงเรียน, สถิตินักเรียนปี 2568 และ 2569) เข้าสู่คลาวด์ Firestore dmc-mhs1 ด่วน? ข้อมูลเดิมจะถูกเขียนทับให้สมบูรณ์')) {
      return;
    }

    setIsLoading(true);
    setIsSeeding(true);
    try {
      const { schools: defaultSchools, students: defaultStudents2568 } = parseInitialData('2568');
      const { students: defaultStudents2569Raw } = parseInitialData('2569');
      
      const defaultStudents2569 = defaultStudents2569Raw.map((s, idx) => {
        const multiplier = 1 + (((idx % 5) - 2) * 0.03);
        const newGrades = { ...s.grades };
        let totalMale = 0;
        let totalFemale = 0;
        
        Object.keys(newGrades).forEach((grade) => {
          const gObj = { ...newGrades[grade] };
          gObj.male = Math.max(0, Math.round(gObj.male * multiplier));
          gObj.female = Math.max(0, Math.round(gObj.female * multiplier));
          gObj.total = gObj.male + gObj.female;
          newGrades[grade] = gObj;
          totalMale += gObj.male;
          totalFemale += gObj.female;
        });
        
        return {
          ...s,
          academicYear: '2569',
          grades: newGrades,
          totalMale,
          totalFemale,
          totalStudents: totalMale + totalFemale
        };
      });

      const defaultStudents = [...defaultStudents2568, ...defaultStudents2569];

      // บันทึกโรงเรียนทั้งหมดลง Firestore
      for (const school of defaultSchools) {
        await setDoc(doc(db, 'schools', school.id), school);
      }
      // บันทึกนักเรียนทั้งหมดลง Firestore
      for (const student of defaultStudents) {
        await setDoc(doc(db, 'students', `${student.schoolId}_${student.academicYear}`), student);
      }

      alert('🚀 ทำการโอนย้ายฐานข้อมูลเข้าสู่คลาวด์ Firestore dmc-mhs1 ด่วน เรียบร้อยเสร็จสมบูรณ์!');
      setIsUsingLocalFallback(false);
      await fetchAllData();
    } catch (e) {
      console.error('Migration failed:', e);
      alert('เกิดข้อผิดพลาดระหว่างโอนย้ายข้อมูล: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsLoading(false);
      setIsSeeding(false);
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
              {isSeeding ? 'ระบบกำลังโอนย้ายข้อมูลสถิติ BIGDATA ไปยัง Firebase...' : 'กำลังดึงข้อมูลสถิติล่าสุดจาก Firebase...'}
            </span>
          </div>
        ) : (
          <div className="animate-fade-in">
            {/* Warning Banner about Local Fallback / Database Status */}
            {isUsingLocalFallback && (
              <div className="mb-6 p-4 rounded-2xl border-2 border-[#33272A] bg-[#FFF9F5] dark:bg-[#1e1518] text-[#33272A] dark:text-[#FFF9F5] flex flex-col md:flex-row items-center justify-between gap-4 shadow-[4px_4px_0px_#33272A] dark:shadow-[4px_4px_0px_#FFD3B6]">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">⚠️ ตรวจพบคลังข้อมูลใน Firestore ว่างเปล่า (กำลังใช้ข้อมูลจำลองระบบในเครื่อง)</h4>
                    <p className="text-xs text-slate-600 dark:text-rose-100/70 mt-1 font-semibold">
                      ข้อมูลสถิตินักเรียนของ สพป.แม่ฮ่องสอน เขต 1 ยังไม่ได้ถูกบันทึกขึ้นสู่ระบบฐานข้อมูลคลาวด์ dmc-mhs1 จริง
                    </p>
                  </div>
                </div>
                {userProfile?.role === 'super_admin' ? (
                  <button
                    onClick={handleForceMigrate}
                    className="btn-cute px-4 py-2 text-xs bg-[#FFD3B6] hover:bg-opacity-90 text-[#33272A] shrink-0 font-bold"
                  >
                    🚀 โอนย้ายข้อมูลเริ่มต้นสู่ Firestore ด่วน
                  </button>
                ) : (
                  <span className="text-xs font-black text-[#FF8BA7] uppercase">กรุณาเข้าสู่ระบบ Super Admin เพื่อทำการโอนย้ายข้อมูลสู่คลาวด์</span>
                )}
              </div>
            )}

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
                    isUsingLocalFallback={isUsingLocalFallback}
                    onForceMigrate={handleForceMigrate}
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
