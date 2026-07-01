import re

with open('src/components/AuthModal.tsx', 'r') as f:
    content = f.read()

# Fix React imports
content = content.replace("import { useState, FormEvent } from 'react';", "import { useState, useEffect, FormEvent } from 'react';")

# Add Firebase Auth imports
content = content.replace("import { signInWithPopup } from 'firebase/auth';", "import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';")

# Add state variables
content = content.replace("const [email, setEmail] = useState('');", """const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const checkConfig = async () => {
        try {
          const snap = await getDoc(doc(db, 'settings', 'system_config'));
          if (snap.exists() && snap.data().allowSchoolAdminRegistration !== undefined) {
            setIsRegistrationOpen(snap.data().allowSchoolAdminRegistration);
          }
        } catch(e) {
           console.error(e);
        }
      };
      checkConfig();
    }
  }, [isOpen]);""")

# Add handleEmailLogin
handle_email_login = """
  // เข้าสู่ระบบด้วย Email/Password
  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      let userDocSnap;
      try {
        userDocSnap = await getDoc(userDocRef);
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, `users/${user.uid}`);
      }

      const isHardcodedSuperAdmin = user.email === 'tamrri@gmail.com' || user.email === 'ch.chapeach@gmail.com';
      if (isHardcodedSuperAdmin) {
        const superAdminProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          firstName: 'Super',
          lastName: 'Admin',
          schoolId: 'all',
          schoolName: 'สพป.แม่ฮ่องสอน เขต 1',
          role: 'super_admin',
          status: 'approved',
          createdAt: serverTimestamp()
        };
        try {
          await setDoc(userDocRef, superAdminProfile, { merge: true });
        } catch (e) {}
        onAuthSuccess(superAdminProfile);
        setIsLoading(false);
        onClose();
        return;
      }

      if (userDocSnap.exists()) {
        const profile = userDocSnap.data() as UserProfile;
        if (profile.status === 'pending') {
          setErrorMsg('บัญชีผู้ใช้นี้อยู่ระหว่างรออนุมัติสิทธิ์การเข้าถึงจาก Super Admin');
          setIsLoading(false);
          return;
        }
        if (profile.status === 'rejected') {
          setErrorMsg('คำร้องขอเข้าถึงของคุณถูกปฏิเสธสิทธิ์ กรุณาติดต่อ Super Admin เพื่อตรวจสอบ');
          setIsLoading(false);
          return;
        }
        
        onAuthSuccess(profile);
        setIsLoading(false);
        onClose();
      } else {
        setErrorMsg('ไม่พบบัญชีแอดมิน กรุณาสมัครสมาชิกก่อน');
        setIsLoading(false);
      }

    } catch (error: any) {
      console.error(error);
      setIsLoading(false);
      setErrorMsg(`เข้าสู่ระบบไม่สำเร็จ: ${error.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'}`);
    }
  };
"""

# Replace GoogleLogin with GoogleLogin + handleEmailLogin
content = content.replace("  // 2. ส่งคำสมัครสิทธิ์ลงทะเบียน", handle_email_login + "\n  // 2. ส่งคำสมัครสิทธิ์ลงทะเบียน")


# Update signup logic to use createUserWithEmailAndPassword and create proper UID
signup_logic_start = """    try {
      const userId = email.replace(/[^a-zA-Z0-9]/g, '_'); // สร้าง ID จำลองสำหรับ document
      const tempUserRef = doc(db, 'users', userId);"""

signup_logic_replace = """    if (!isRegistrationOpen && email !== 'tamrri@gmail.com') {
      setErrorMsg('ระบบปิดรับสมัครแอดมินโรงเรียนชั่วคราว');
      setIsLoading(false);
      return;
    }

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userId = user.uid;
      const tempUserRef = doc(db, 'users', userId);"""
      
content = content.replace(signup_logic_start, signup_logic_replace)

# UI Replacement for Demo Admin Block (lines ~310 to ~364)
# We will use regex to find the demo block and remove it.
# The demo block starts with {/* ส่วนเข้าใช้งานระบบจำลองเพื่อข้ามข้อจำกัดด้าน Domain */}
# and ends right before <div className="relative flex py-2 items-center text-slate-300 dark:text-slate-700">

pattern_demo = re.compile(r'\{\/\* ส่วนเข้าใช้งานระบบจำลองเพื่อข้ามข้อจำกัดด้าน Domain \*\/\}.*?(?=<div className="relative flex py-2 items-center text-slate-300 dark:text-slate-700">)', re.DOTALL)
content = pattern_demo.sub('', content)

# Now we need to update the UI for login mode to have an email/password form
# Currently login mode is just a Google button and some links
login_ui_start = """              {/* ปุ่ม Google Auth - Gmail */}
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2.5 rounded-2xl border-2 border-[#33272A] bg-white hover:bg-[#FFD3B6]/20 p-3 text-xs font-black text-[#33272A] dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5] cursor-pointer shadow-[4px_4px_0px_#33272A] dark:shadow-[4px_4px_0px_#FFD3B6] hover:translate-y-0.5 active:translate-y-1 transition-all outline-none"
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  className="h-4.5 w-4.5"
                />
                <span>ลงชื่อเข้าใช้งานด้วยบัญชี Gmail (Google)</span>
              </button>"""

login_ui_replace = """              <form onSubmit={handleEmailLogin} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-[#33272A] dark:text-[#FFF9F5]">อีเมล</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@school.com"
                    className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-[#33272A] dark:text-[#FFF9F5]">รหัสผ่าน</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="รหัสผ่าน 6 ตัวอักษรขึ้นไป"
                    className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-cute bg-[#FF8BA7] text-[#33272A] px-5 py-2.5 text-xs font-black disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วยอีเมล'}
                </button>
              </form>

              <div className="relative flex py-2 items-center text-slate-300 dark:text-slate-700">
                <div className="flex-grow border-t-2 border-[#33272A]/10 dark:border-[#FFD3B6]/20"></div>
                <span className="flex-shrink mx-3 text-[10px] font-black text-[#33272A]/50 dark:text-[#FFF9F5]/50">หรือล็อกอินด้วย</span>
                <div className="flex-grow border-t-2 border-[#33272A]/10 dark:border-[#FFD3B6]/20"></div>
              </div>

              {/* ปุ่ม Google Auth - Gmail */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2.5 rounded-2xl border-2 border-[#33272A] bg-white hover:bg-[#FFD3B6]/20 p-2 text-xs font-black text-[#33272A] dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5] cursor-pointer shadow-[4px_4px_0px_#33272A] dark:shadow-[4px_4px_0px_#FFD3B6] hover:translate-y-0.5 active:translate-y-1 transition-all outline-none"
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  className="h-4 w-4"
                />
                <span>Gmail (Google)</span>
              </button>"""

content = content.replace(login_ui_start, login_ui_replace)

# Now we need to add the password field to the signup form
signup_ui_email_end = """<p className="text-[9px] text-[#33272A]/60 dark:text-[#FFF9F5]/60 font-semibold">ต้องเป็นอีเมลเดียวกับบัญชี Google ที่จะใช้ล็อกอิน</p>
              </div>"""

signup_ui_password_addition = """<p className="text-[9px] text-[#33272A]/60 dark:text-[#FFF9F5]/60 font-semibold">โปรดใช้อีเมลที่ติดต่อได้จริง</p>
              </div>

              {/* รหัสผ่านสำหรับลงทะเบียน */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#33272A] dark:text-[#FFF9F5]">รหัสผ่าน (6 ตัวอักษรขึ้นไป)</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="รหัสผ่าน"
                  minLength={6}
                  className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                />
              </div>"""

content = content.replace(signup_ui_email_end, signup_ui_password_addition)

# Add isRegistrationOpen UI block to block the signup link
signup_link_start = """{/* สลับไปหน้าสมัครสมาชิก */}
              <button
                onClick={() => {
                  setIsSignUpMode(true);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="w-full text-center text-xs font-black text-[#FF8BA7] hover:underline cursor-pointer outline-none"
              >
                ยังไม่มีสิทธิ์เข้าถึงระบบ? คลิกเพื่อสมัครสิทธิ์แอดมินโรงเรียน &rarr;
              </button>"""

signup_link_replace = """{/* สลับไปหน้าสมัครสมาชิก */}
              {isRegistrationOpen ? (
                <button
                  onClick={() => {
                    setIsSignUpMode(true);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="w-full text-center text-xs font-black text-[#FF8BA7] hover:underline cursor-pointer outline-none"
                >
                  ยังไม่มีสิทธิ์เข้าถึงระบบ? คลิกเพื่อสมัครสิทธิ์แอดมินโรงเรียน &rarr;
                </button>
              ) : (
                <div className="w-full text-center text-xs font-black text-rose-500 py-2">
                  🚫 ขณะนี้ระบบปิดรับสมัครแอดมินโรงเรียนชั่วคราว
                </div>
              )}"""

content = content.replace(signup_link_start, signup_link_replace)

with open('src/components/AuthModal.tsx', 'w') as f:
    f.write(content)
