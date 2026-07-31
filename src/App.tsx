import { useState, useEffect } from 'react';
import { db, auth, OperationType, handleFirestoreError } from './firebase';
import { collection, getDocs, setDoc, doc, getDoc, query, where, onSnapshot, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { School, StudentData, UserProfile, StudentGData, SystemConfig, ThemeStyle, DesignStyle } from './types';
import { generateInitialStudentGData } from './utils/initialData';
import { registerActiveSession, sendSessionHeartbeat, removeActiveSession, CONCURRENCY_BLOCKED_MESSAGE } from './utils/sessionHelper';

const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  allowDataDownload: true,
  contactEnabled: true,
  restrictOneAdminPerSchool: true,
  allowSchoolAdminRegistration: true,
  highTrafficAlertEnabled: true,
  highTrafficAlertMessage: 'ตอนนี้ระบบ Bigdata มีผู้ใช้งานในระบบจำนวนมาก ให้เข้ามาใหม่ภายหลัง ประมาณ 10 นาที',
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
  waterSystemOptions: [
    { id: 'government', label: '🚰 น้ำประปาภาครัฐ' },
    { id: 'mountain', label: '🏔️ น้ำประปาภูเขา' },
    { id: 'none', label: '❌ ไม่มีน้ำใช้' },
    { id: 'other', label: '📌 อื่นๆ' },
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
import ContactView from './components/ContactView';
import VisitorCounter from './components/VisitorCounter';
import InactivityLogoutHandler from './components/InactivityLogoutHandler';

import { Sparkles, RefreshCw, Award, Heart, HelpCircle, GraduationCap, AlertTriangle, Users, Clock, X } from 'lucide-react';

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
  const [isHighTrafficNoticeOpen, setIsHighTrafficNoticeOpen] = useState<boolean>(false);
  const [sessionNoticeModal, setSessionNoticeModal] = useState<{
    title: string;
    message: string;
    type: 'kicked' | 'blocked';
  } | null>(null);
  
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
  const [themeStyle, setThemeStyle] = useState<ThemeStyle>(() => {
    const saved = localStorage.getItem('app-theme-style');
    return (saved as ThemeStyle) || 'pastel';
  });
  const [designStyle, setDesignStyle] = useState<DesignStyle>(() => {
    const saved = localStorage.getItem('app-design-style');
    return (saved as DesignStyle) || 'classic';
  });

  // จัดการระบบธีม Dark Mode / Light Mode และ Themes
  useEffect(() => {
    document.documentElement.classList.remove(
      'theme-pastel', 
      'theme-modern', 
      'theme-darktech', 
      'theme-minimal-slate', 
      'theme-warm-nature', 
      'theme-emerald-mint',
      'theme-cyan-futuristic',
      'theme-royal-gold',
      'theme-green',
      'theme-clean-mobile',
      'theme-nordic-breeze',
      'theme-ultra-modern',
      'theme-luxury-violet',
      'theme-sunset-ember',
      'theme-gundam-mecha',
      'theme-naruto-ninja',
      'theme-lector-purple'
    );
    document.documentElement.classList.add(`theme-${themeStyle}`);
    localStorage.setItem('app-theme-style', themeStyle);

    if (themeStyle === 'darktech' || themeStyle === 'cyan-futuristic' || themeStyle === 'gundam-mecha') {
      setIsDarkMode(true);
    }
  }, [themeStyle]);

  // จัดการดีไซน์การแสดงผลระบบ (Design Presets)
  useEffect(() => {
    document.documentElement.classList.remove(
      'design-classic',
      'design-glass-float',
      'design-compact-grid'
    );
    document.documentElement.classList.add(`design-${designStyle}`);
    localStorage.setItem('app-design-style', designStyle);
  }, [designStyle]);

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

  // การจัดการ Active Session (Heartbeat + ตรวจสอบการโดน Super Admin เตะออกจากระบบ)
  useEffect(() => {
    if (!userProfile || !userProfile.uid) return;

    // 1. ลงทะเบียนเซสชันใช้งาน
    registerActiveSession(userProfile);

    // 2. ตั้งเวลาส่ง Heartbeat อัปเดตสถานะออนไลน์ทุก 20 วินาที
    const heartbeatTimer = setInterval(() => {
      sendSessionHeartbeat(userProfile.uid);
    }, 20000);

    // 3. ฟังสถานะ real-time กรณี Super Admin กดเตะออกจากระบบ
    const sessionRef = doc(db, 'active_sessions', userProfile.uid);
    const unsubscribeSession = onSnapshot(sessionRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.kicked) {
          setSessionNoticeModal({
            title: '⛔ คุณถูก Super Admin เตะออกจากระบบ',
            message: 'ขออภัยในความไม่สะดวก เซสชันการเข้าใช้งานของคุณถูกสั่งให้ออกจากระบบโดย Super Admin หากต้องการใช้งานต่อกรุณาล็อกอินใหม่อีกครั้ง',
            type: 'kicked'
          });
          removeActiveSession(userProfile.uid);
          signOut(auth).catch(() => {});
          setUserProfile(null);
          setActiveTab('dashboard');
        }
      }
    }, (error) => {
      console.warn('Session listener error:', error);
    });

    // 4. ลบเซสชันเมื่อปิดหน้าต่างเบราว์เซอร์
    const handleBeforeUnload = () => {
      removeActiveSession(userProfile.uid);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeatTimer);
      unsubscribeSession();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [userProfile?.uid]);

  // 1. ฟังนโยบายและค่าตั้งค่าระบบ real-time จาก Firestore
  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'settings', 'system_config'), (configSnap) => {
      if (configSnap.exists()) {
        const data = configSnap.data();
        setSystemConfig({
          allowDataDownload: data.allowDataDownload !== undefined ? data.allowDataDownload : true,
          contactEnabled: data.contactEnabled !== undefined ? data.contactEnabled : true,
          restrictOneAdminPerSchool: data.restrictOneAdminPerSchool !== undefined ? data.restrictOneAdminPerSchool : true,
          allowSchoolAdminRegistration: data.allowSchoolAdminRegistration !== undefined ? data.allowSchoolAdminRegistration : true,
          highTrafficAlertEnabled: data.highTrafficAlertEnabled !== undefined ? data.highTrafficAlertEnabled : true,
          highTrafficAlertMessage: data.highTrafficAlertMessage || 'ตอนนี้ระบบ Bigdata มีผู้ใช้งานในระบบจำนวนมาก ให้เข้ามาใหม่ภายหลัง ประมาณ 10 นาที',
          simulateRedServerStatus: data.simulateRedServerStatus !== undefined ? data.simulateRedServerStatus : false,
          electricityOptions: data.electricityOptions && data.electricityOptions.length > 0 ? data.electricityOptions : DEFAULT_SYSTEM_CONFIG.electricityOptions,
          internetOptions: data.internetOptions && data.internetOptions.length > 0 ? data.internetOptions : DEFAULT_SYSTEM_CONFIG.internetOptions,
          waterSystemOptions: data.waterSystemOptions && data.waterSystemOptions.length > 0 ? data.waterSystemOptions : DEFAULT_SYSTEM_CONFIG.waterSystemOptions,
          headerBannerUrl: data.headerBannerUrl || '',
          headerBannerHeight: data.headerBannerHeight !== undefined ? data.headerBannerHeight : 100,
          headerBannerFit: data.headerBannerFit || 'contain',
          headerBannerEnabled: data.headerBannerEnabled !== undefined ? data.headerBannerEnabled : true,
        });
      }
    }, (err) => {
      console.warn('System config snapshot error:', err);
    });

    return () => unsubConfig();
  }, []);

  // สลับไปยังหน้าหลักอัตโนมัติหากเมนูติดต่อถูกปิดการใช้งานโดย Super Admin และผู้ใช้ไม่ใช่ Super Admin
  useEffect(() => {
    if (systemConfig?.contactEnabled === false && userProfile?.role !== 'super_admin' && activeTab === 'contact') {
      setActiveTab('dashboard');
    }
  }, [systemConfig?.contactEnabled, userProfile?.role, activeTab]);

  // 2. ฟังจำนวน Active Sessions แบบ Real-time เพื่อคำนวณภาระงาน
  const [activeSessionCount, setActiveSessionCount] = useState<number>(1);
  useEffect(() => {
    const unsubSessions = onSnapshot(collection(db, 'active_sessions'), (snap) => {
      let activeCount = 0;
      const now = Date.now();
      const THREE_MINUTES = 3 * 60 * 1000;
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        if (d && d.lastActiveTime && (now - d.lastActiveTime < THREE_MINUTES) && !d.kicked) {
          activeCount++;
        }
      });
      setActiveSessionCount(Math.max(1, activeCount));
    }, (err) => {
      console.warn('Active sessions snapshot error:', err);
    });

    return () => unsubSessions();
  }, []);

  // 3. คำนวณภาระทรัพยากรระบบและสถานะของเซิร์ฟเวอร์ (Server Resource Load Calculation)
  const totalDocsCount = schools.length + studentData.length + studentGData.length + 10;
  const estimatedStorageMB = ((schools.length * 2.5) + (studentData.length * 0.8) + (studentGData.length * 1.2) + 10) / 1024;
  const storagePercent = (estimatedStorageMB / 1024) * 100;
  const docsPercent = (totalDocsCount / 100000) * 100;
  const dynamicRAM = 110 + (estimatedStorageMB * 8) + (totalDocsCount * 0.05);
  const ramPercent = (dynamicRAM / 1024) * 100;
  const dynamicCpu = 12.5 + (totalDocsCount * 0.012) + (activeSessionCount * 1.5);
  const concurrentPercent = (activeSessionCount / 80) * 100;

  const maxSystemLoadPercent = Math.max(storagePercent, docsPercent, ramPercent, dynamicCpu, concurrentPercent);

  // สถานะเซิร์ฟเวอร์จะเป็นสีแดง (RED) เมื่อ:
  // 1. maxSystemLoadPercent >= 90 หรือ activeSessionCount >= 50
  // 2. มีการเปิดโหมด "จำลองสถานะเซิร์ฟเวอร์สีแดง" (simulateRedServerStatus) จากผู้ดูแลระบบ
  const isServerStatusRed = Boolean(systemConfig.simulateRedServerStatus || maxSystemLoadPercent >= 90 || activeSessionCount >= 50);

  const serverStatus: 'green' | 'yellow' | 'red' = isServerStatusRed
    ? 'red'
    : (maxSystemLoadPercent >= 70 || activeSessionCount >= 30)
    ? 'yellow'
    : 'green';

  // 4. เมื่อสถานะระบบของ Server เปลี่ยนเป็นสีแดง (serverStatus === 'red') ให้ขึ้น Pop-up แจ้งเตือนผู้ใช้งานหนาแน่นอัตโนมัติ
  useEffect(() => {
    if (serverStatus === 'red' && systemConfig.highTrafficAlertEnabled !== false) {
      setIsHighTrafficNoticeOpen(true);
    }
  }, [serverStatus, systemConfig.highTrafficAlertEnabled]);

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
            contactEnabled: data.contactEnabled !== undefined ? data.contactEnabled : true,
            restrictOneAdminPerSchool: data.restrictOneAdminPerSchool !== undefined ? data.restrictOneAdminPerSchool : true,
            allowSchoolAdminRegistration: data.allowSchoolAdminRegistration !== undefined ? data.allowSchoolAdminRegistration : true,
            highTrafficAlertEnabled: data.highTrafficAlertEnabled !== undefined ? data.highTrafficAlertEnabled : true,
            highTrafficAlertMessage: data.highTrafficAlertMessage || 'ตอนนี้ระบบ Bigdata มีผู้ใช้งานในระบบจำนวนมาก ให้เข้ามาใหม่ภายหลัง ประมาณ 10 นาที',
            simulateRedServerStatus: data.simulateRedServerStatus !== undefined ? data.simulateRedServerStatus : false,
            electricityOptions: data.electricityOptions && data.electricityOptions.length > 0 ? data.electricityOptions : DEFAULT_SYSTEM_CONFIG.electricityOptions,
            internetOptions: data.internetOptions && data.internetOptions.length > 0 ? data.internetOptions : DEFAULT_SYSTEM_CONFIG.internetOptions,
            waterSystemOptions: data.waterSystemOptions && data.waterSystemOptions.length > 0 ? data.waterSystemOptions : DEFAULT_SYSTEM_CONFIG.waterSystemOptions,
            headerBannerUrl: data.headerBannerUrl || '',
            headerBannerHeight: data.headerBannerHeight !== undefined ? data.headerBannerHeight : 100,
            headerBannerFit: data.headerBannerFit || 'contain',
            headerBannerEnabled: data.headerBannerEnabled !== undefined ? data.headerBannerEnabled : true,
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

    // ฟังการเปลี่ยนแปลงข้อมูล schools แบบ Real-time
    const unsubSchools = onSnapshot(collection(db, 'schools'), (snapshot) => {
      const list: School[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data() } as School);
      });
      if (list.length > 0) {
        setSchools(list);
      }
    }, (err) => console.warn('Schools real-time listener warning:', err));

    // ฟังการเปลี่ยนแปลงข้อมูล students แบบ Real-time
    const unsubStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
      const list: StudentData[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as StudentData);
      });
      if (list.length > 0) {
        setStudentData(list);
        const years = Array.from(new Set(list.map(s => s.academicYear)));
        if (years.length > 0) {
          years.sort((a, b) => b.localeCompare(a));
          setAvailableYears(years);
        }
      }
    }, (err) => console.warn('Students real-time listener warning:', err));

    // ฟังการเปลี่ยนแปลงข้อมูล students_g แบบ Real-time
    const unsubStudentsG = onSnapshot(collection(db, 'students_g'), (snapshot) => {
      const list: StudentGData[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as StudentGData;
        let year = data.academicYear;
        if (!year || !/^\d{4}$/.test(year)) {
          const parts = docSnap.id.split('_');
          if (parts.length > 1 && /^\d{4}$/.test(parts[parts.length - 1])) {
            year = parts[parts.length - 1];
          }
        }
        list.push({
          ...data,
          id: docSnap.id,
          academicYear: year || data.academicYear || 'ไม่ระบุ'
        });
      });
      if (list.length > 0) {
        setStudentGData(list);
      }
    }, (err) => console.warn('Students_g real-time listener warning:', err));

    return () => {
      unsubSchools();
      unsubStudents();
      unsubStudentsG();
    };
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
    <div className="min-h-screen flex flex-col bg-bg-vibrant text-text-vibrant transition-colors duration-300 grid-pattern w-full max-w-full overflow-x-clip">
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
        themeStyle={themeStyle}
        setThemeStyle={setThemeStyle}
        academicYear={academicYear}
        setAcademicYear={setAcademicYear}
        availableYears={availableYears}
        systemConfig={systemConfig}
      />

      {/* MAIN CONTENT AREA */}
      <main className={`flex-grow mx-auto w-full py-6 pb-20 lg:pb-8 transition-all ${
        activeTab === 'schools' || activeTab === 'admin' || selectedSchoolId
          ? 'max-w-none px-2 sm:px-4 lg:px-6'
          : 'max-w-7xl px-4 sm:px-6'
      }`}>
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
                onNavigateToContact={() => {
                  setSelectedSchoolId(null);
                  setActiveTab('contact');
                }}
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

                {activeTab === 'contact' && (
                  (userProfile?.role === 'super_admin' || systemConfig?.contactEnabled !== false) ? (
                    <ContactView
                      systemConfig={systemConfig}
                      userProfile={userProfile}
                      onRefreshData={fetchAllData}
                    />
                  ) : (
                    <div className="card p-8 text-center bg-white dark:bg-[#1e1518] space-y-4 max-w-xl mx-auto border-2 border-[#33272A] shadow-[4px_4px_0px_#33272A] rounded-2xl">
                      <div className="text-5xl mb-2">🔒</div>
                      <h2 className="text-xl font-black text-[#33272A] dark:text-[#FFF9F5]">ระบบปิดการแสดงผลเมนูติดต่อ</h2>
                      <p className="text-xs font-bold text-[#33272A]/70 dark:text-[#FFF9F5]/70">
                        ขณะนี้ผู้ดูแลระบบ (Super Admin) ได้ซ่อนเมนูติดต่อสำหรับผู้ใช้งานทั่วไป
                      </p>
                      <button
                        onClick={() => setActiveTab('dashboard')}
                        className="px-5 py-2.5 bg-[#FF8BA7] text-[#33272A] font-black rounded-xl border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] cursor-pointer hover:bg-[#ff7597] transition-all text-xs"
                      >
                        กลับสู่หน้าหลัก
                      </button>
                    </div>
                  )
                )}

                {activeTab === 'admin' && userProfile && (
                  <AdminPanel
                    userProfile={userProfile}
                    schools={schools}
                    studentData={studentData}
                    studentGData={studentGData}
                    onRefreshData={fetchAllData}
                    systemConfig={systemConfig}
                    serverStatus={serverStatus}
                    themeStyle={themeStyle}
                    setThemeStyle={setThemeStyle}
                    designStyle={designStyle}
                    setDesignStyle={setDesignStyle}
                    isDarkMode={isDarkMode}
                    setIsDarkMode={setIsDarkMode}
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

      {/* AUTO LOGOUT AFTER 30 MIN INACTIVITY */}
      <InactivityLogoutHandler
        userProfile={userProfile}
        onLoggedOut={() => setUserProfile(null)}
      />

      {/* HIGH TRAFFIC POP-UP NOTICE MODAL */}
      {systemConfig.highTrafficAlertEnabled !== false && isHighTrafficNoticeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#33272A]/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg card p-6 space-y-5 bg-white dark:bg-[#1e1518] border-4 border-[#33272A] dark:border-[#FFD3B6] shadow-[8px_8px_0px_#33272A] dark:shadow-[8px_8px_0px_#FFD3B6] rounded-3xl relative overflow-hidden">
            
            {/* Top decorative badge */}
            <div className="bg-rose-500 text-white text-[11px] font-black px-4 py-1 rounded-full w-fit flex items-center gap-1.5 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-white animate-ping shrink-0" />
              <span>แจ้งเตือนสถานะความหนาแน่นผู้ใช้งาน (System Load Alert)</span>
            </div>

            {/* Header */}
            <div className="flex items-start gap-3.5 border-b-2 border-[#33272A] pb-4 dark:border-[#FFD3B6]/30">
              <div className="p-3.5 rounded-2xl bg-amber-100 dark:bg-amber-950/80 border-2 border-[#33272A] dark:border-amber-500 shrink-0 shadow-[2px_2px_0px_#33272A]">
                <Users className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-black text-[#33272A] dark:text-[#FFF9F5] leading-snug">
                  ระบบ Bigdata สพป.แม่ฮ่องสอน เขต 1
                </h3>
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  ขณะนี้มีผู้เข้าใช้งานหนาแน่นเกินโควตาชั่วคราว
                </p>
              </div>
            </div>

            {/* Exact requested text box */}
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 text-center space-y-2">
              <p className="text-sm sm:text-base font-black text-amber-950 dark:text-amber-200 leading-relaxed">
                " {systemConfig.highTrafficAlertMessage || 'ตอนนี้ระบบ Bigdata มีผู้ใช้งานในระบบจำนวนมาก ให้เข้ามาใหม่ภายหลัง ประมาณ 10 นาที'} "
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-bold leading-relaxed pt-1 border-t border-amber-200 dark:border-amber-800">
                เนื่องจากการประมวลผลฐานข้อมูลสารสนเทศนักเรียนรายบุคคลกำลังทำงานเต็มประสิทธิภาพ ขอแนะนำให้ท่านลองเข้าใช้งานอีกครั้งในอีกประมาณ 10 นาที เพื่อความรวดเร็วในการเรียกดูข้อมูล
              </p>
            </div>

            {/* Timer countdown simulation box */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FFF9F5] dark:bg-[#251b1e] border-2 border-[#33272A] dark:border-[#FFD3B6]/40 text-xs font-bold">
              <span className="text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-500" /> ระยะเวลาแนะนำเข้าใหม่:
              </span>
              <span className="px-3 py-1 rounded-lg bg-amber-400 text-[#33272A] font-black font-mono">
                10:00 นาที
              </span>
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsHighTrafficNoticeOpen(false)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#FF8BA7] hover:bg-[#ff7597] text-[#33272A] border-2 border-[#33272A] text-xs font-black cursor-pointer shadow-[3px_3px_0px_#33272A] transition-transform active:scale-95"
              >
                รับทราบ (ลองเข้ามาใหม่ภายหลัง)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SESSION NOTICE MODAL (Kicked / Concurrency Blocked) */}
      {sessionNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#33272A]/75 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg card p-6 space-y-4 bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[6px_6px_0px_#33272A]">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-950 border-2 border-rose-500">
                <AlertTriangle className="h-7 w-7 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#33272A] dark:text-[#FFF9F5]">
                  {sessionNoticeModal.title}
                </h3>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  การแจ้งเตือนจากระบบการจัดการผู้เข้าใช้งานและความปลอดภัย
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 text-xs sm:text-sm font-extrabold text-[#33272A] dark:text-[#FFF9F5] leading-relaxed">
              {sessionNoticeModal.message}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSessionNoticeModal(null)}
                className="px-6 py-2.5 rounded-xl bg-[#FF8BA7] hover:bg-[#ff7597] text-[#33272A] border-2 border-[#33272A] text-xs font-black cursor-pointer shadow-[3px_3px_0px_#33272A]"
              >
                รับทราบ และตกลง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
