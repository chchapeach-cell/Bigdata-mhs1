import re

file_path = 'src/components/Header.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add Menu, X to lucide imports if not present
if 'Menu,' not in text and ' Menu ' not in text:
    text = text.replace("import { Sun, Moon,", "import { Sun, Moon, Menu, X,")

# 2. Add state isMobileMenuOpen inside Header function
target_state = "const isSuperAdmin = userProfile?.role === 'super_admin'"
replacement_state = """const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isSuperAdmin = userProfile?.role === 'super_admin'"""
text = text.replace(target_state, replacement_state, 1)

# 3. Replace the Logo SVG with the cute burger icon image
old_logo_box = '''          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-[#FFF9F5] dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[2px_2px_0px_0px_#33272A] dark:shadow-[2px_2px_0px_0px_#FFD3B6] overflow-hidden transition-transform duration-200 group-hover:scale-105 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-7 w-7 sm:h-8 sm:w-8">
              {/* Stacked Database disks */}
              <g transform="translate(8, 12) scale(0.72)">
                {/* Bottom Disk */}
                <path d="M10,65 C10,55 90,55 90,65 C90,75 10,75 10,65 Z" fill="#FF8BA7" stroke="#33272A" strokeWidth="8" strokeLinejoin="round"/>
                <path d="M10,65 L10,75 C10,85 90,85 90,75 L90,65" fill="#FF8BA7" stroke="#33272A" strokeWidth="8" strokeLinejoin="round"/>
                
                {/* Middle Disk */}
                <path d="M10,40 C10,30 90,30 90,40 C90,50 10,50 10,40 Z" fill="#FFD3B6" stroke="#33272A" strokeWidth="8" strokeLinejoin="round"/>
                <path d="M10,40 L10,50 C10,60 90,60 90,50 L90,40" fill="#FFD3B6" stroke="#33272A" strokeWidth="8" strokeLinejoin="round"/>
                
                {/* Top Disk */}
                <path d="M10,15 C10,5 90,5 90,15 C90,25 10,25 10,15 Z" fill="#A0E7E5" stroke="#33272A" strokeWidth="8" strokeLinejoin="round"/>
                <path d="M10,15 L10,25 C10,35 90,35 90,25 L90,15" fill="#A0E7E5" stroke="#33272A" strokeWidth="8" strokeLinejoin="round"/>
              </g>
              
              {/* Data nodes connecting to the Database with hover animations */}
              <path d="M 60 40 L 78 40 M 60 60 L 78 60 M 60 40 L 60 60" stroke="#33272A" strokeWidth="6" strokeLinecap="round" />
              <circle cx="78" cy="40" r="8" fill="#FF8BA7" stroke="#33272A" strokeWidth="5" />
              <circle cx="78" cy="60" r="8" fill="#A0E7E5" stroke="#33272A" strokeWidth="5" />
            </svg>
          </div>'''

new_logo_box = '''          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-[#FFF9F5] dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[2px_2px_0px_0px_#33272A] dark:shadow-[2px_2px_0px_0px_#FFD3B6] overflow-hidden transition-transform duration-200 group-hover:scale-105 shrink-0 p-0.5">
            <img 
              src="/assets/aistudio/image_bec6272a.png" 
              alt="MHS1 BigData Icon" 
              className="h-full w-full object-contain"
            />
          </div>'''

text = text.replace(old_logo_box, new_logo_box, 1)

# 4. Add the mobile Hamburger button in header right side
old_right_controls_end = '''          ) : (
            <button
              onClick={onLoginClick}
              className="bg-gradient-to-r from-[#FF8BA7] to-[#FFAAA5] hover:from-[#ff7596] hover:to-[#ff9b95] text-[#33272A] px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-black flex items-center gap-1.5 rounded-full border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer shrink-0"
              title="เข้าสู่ระบบสารสนเทศ / จัดการข้อมูล"
            >
              <LogIn className="h-4 w-4 shrink-0 text-[#33272A]" />
              <span className="text-[11px] sm:text-xs">เข้าสู่ระบบ</span>
            </button>
          )}
        </div>
      </div>'''

new_right_controls_end = '''          ) : (
            <button
              onClick={onLoginClick}
              className="hidden sm:flex bg-gradient-to-r from-[#FF8BA7] to-[#FFAAA5] hover:from-[#ff7596] hover:to-[#ff9b95] text-[#33272A] px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-black items-center gap-1.5 rounded-full border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer shrink-0"
              title="เข้าสู่ระบบสารสนเทศ / จัดการข้อมูล"
            >
              <LogIn className="h-4 w-4 shrink-0 text-[#33272A]" />
              <span className="text-[11px] sm:text-xs">เข้าสู่ระบบ</span>
            </button>
          )}

          {/* ปุ่มแฮมเบอร์เกอร์บนมือถือ (Mobile Hamburger Button) */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-[#FFF9F5] dark:bg-[#1e1518] shadow-[2px_2px_0px_#33272A] dark:shadow-[2px_2px_0px_#FFD3B6] cursor-pointer text-[#33272A] dark:text-[#FFF9F5] active:scale-95 transition-transform"
            title="เปิดเมนูการใช้งาน"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5 stroke-[2.5px] text-rose-500" />
            ) : (
              <Menu className="h-5 w-5 stroke-[2.5px]" />
            )}
          </button>
        </div>
      </div>'''

text = text.replace(old_right_controls_end, new_right_controls_end, 1)

# 5. Add the Slide-down Mobile Drawer Menu right after the header top bar
drawer_code = '''
      {/* Mobile Drawer Menu (เปิด/ปิดด้วยปุ่มแฮมเบอร์เกอร์) */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-b-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#150e10] p-4 shadow-xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-[#33272A]/10 dark:border-[#FFD3B6]/20 pb-2">
            <div className="flex items-center gap-2">
              <img 
                src="/assets/aistudio/image_bec6272a.png" 
                alt="Icon" 
                className="h-6 w-6 object-contain"
              />
              <span className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">เมนูหลัก BigData MHS1</span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* รายการเมนูหลัก */}
          <div className="grid grid-cols-2 gap-2 text-xs font-black">
            <button
              onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
              className={`p-2.5 rounded-xl border-2 flex items-center gap-2 transition ${
                activeTab === 'dashboard'
                  ? 'bg-[#FF8BA7] text-[#33272A] border-[#33272A] shadow-[2px_2px_0px_#33272A]'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-[#33272A] dark:text-[#FFF9F5]'
              }`}
            >
              <LayoutDashboard className="h-4 w-4 text-rose-500" />
              <span>ภาพรวมระบบ</span>
            </button>

            <button
              onClick={() => { setActiveTab('schools'); setIsMobileMenuOpen(false); }}
              className={`p-2.5 rounded-xl border-2 flex items-center gap-2 transition ${
                activeTab === 'schools'
                  ? 'bg-[#FF8BA7] text-[#33272A] border-[#33272A] shadow-[2px_2px_0px_#33272A]'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-[#33272A] dark:text-[#FFF9F5]'
              }`}
            >
              <Building2 className="h-4 w-4 text-sky-500" />
              <span>รายชื่อโรงเรียน</span>
            </button>

            <button
              onClick={() => { setActiveTab('academic'); setIsMobileMenuOpen(false); }}
              className={`p-2.5 rounded-xl border-2 flex items-center gap-2 transition ${
                activeTab === 'academic'
                  ? 'bg-[#FF8BA7] text-[#33272A] border-[#33272A] shadow-[2px_2px_0px_#33272A]'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-[#33272A] dark:text-[#FFF9F5]'
              }`}
            >
              <GraduationCap className="h-4 w-4 text-indigo-500" />
              <span>ผลสัมฤทธิ์</span>
            </button>

            <button
              onClick={() => { setActiveTab('infrastructure'); setIsMobileMenuOpen(false); }}
              className={`p-2.5 rounded-xl border-2 flex items-center gap-2 transition ${
                activeTab === 'infrastructure'
                  ? 'bg-[#FF8BA7] text-[#33272A] border-[#33272A] shadow-[2px_2px_0px_#33272A]'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-[#33272A] dark:text-[#FFF9F5]'
              }`}
            >
              <Zap className="h-4 w-4 text-amber-500" />
              <span>โครงสร้างพื้นฐาน</span>
            </button>

            <button
              onClick={() => { setActiveTab('contact'); setIsMobileMenuOpen(false); }}
              className={`p-2.5 rounded-xl border-2 flex items-center gap-2 transition ${
                activeTab === 'contact'
                  ? 'bg-[#FF8BA7] text-[#33272A] border-[#33272A] shadow-[2px_2px_0px_#33272A]'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-[#33272A] dark:text-[#FFF9F5]'
              }`}
            >
              <PhoneCall className="h-4 w-4 text-emerald-500" />
              <span>ติดต่อ</span>
            </button>

            {userProfile ? (
              <button
                onClick={() => { setActiveTab('admin'); setIsMobileMenuOpen(false); }}
                className={`p-2.5 rounded-xl border-2 flex items-center gap-2 transition relative ${
                  activeTab === 'admin'
                    ? 'bg-[#FF8BA7] text-[#33272A] border-[#33272A] shadow-[2px_2px_0px_#33272A]'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-[#33272A] dark:text-[#FFF9F5]'
                }`}
              >
                <Shield className="h-4 w-4 text-emerald-600" />
                <span>จัดการระบบ</span>
                {pendingUsers.length > 0 && (
                  <span className="ml-auto bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black animate-pulse">
                    {pendingUsers.length}
                  </span>
                )}
              </button>
            ) : (
              <button
                onClick={() => { onLoginClick(); setIsMobileMenuOpen(false); }}
                className="p-2.5 rounded-xl border-2 border-[#33272A] bg-gradient-to-r from-[#FF8BA7] to-[#FFAAA5] text-[#33272A] font-black flex items-center gap-2 shadow-[2px_2px_0px_#33272A]"
              >
                <LogIn className="h-4 w-4" />
                <span>เข้าสู่ระบบ</span>
              </button>
            )}
          </div>

          {/* การตั้งค่าระบบและการแสดงผลในมือถือ */}
          <div className="pt-2 border-t border-[#33272A]/10 dark:border-[#FFD3B6]/20 flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* สลับดาร์กโหมด */}
            <button
              onClick={toggleDarkMode}
              className="px-3 py-1.5 rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-[#FFF9F5] dark:bg-[#1e1518] text-[#33272A] dark:text-[#FFF9F5] font-bold flex items-center gap-1.5 text-xs shadow-xs"
            >
              {isDarkMode ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-slate-700" />}
              <span>{isDarkMode ? 'โหมดสว่าง' : 'โหมดมืด'}</span>
            </button>

            {userProfile && (
              <button
                onClick={() => { onLogout(); setIsMobileMenuOpen(false); }}
                className="px-3 py-1.5 rounded-xl border-2 border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200 font-bold flex items-center gap-1.5 text-xs"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>ออกจากระบบ ({userProfile.firstName || userProfile.email})</span>
              </button>
            )}
          </div>
        </div>
      )}
'''

text = text.replace('{/* Main Navigation Row directly below header (Desktop only) */}', drawer_code + '\n      {/* Main Navigation Row directly below header (Desktop only) */}', 1)

# 6. Replace the bottom mobile bar with 5 non-overflowing grid columns
old_bottom_bar = '''      {/* Mobile & Tablet Bottom Tab Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#1e1518]/95 backdrop-blur-md border-t-2 border-[#33272A] dark:border-[#FFD3B6] px-2 py-2 flex justify-start sm:justify-around items-center gap-1 overflow-x-auto scrollbar-hide shadow-[0_-4px_12px_rgba(51,39,42,0.1)] pb-safe transition-colors duration-300">
        {/* Tab 1: ภาพรวม */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center gap-1 shrink-0 min-w-[60px] py-1 transition-all ${
            activeTab === 'dashboard'
              ? 'text-[#FF8BA7] scale-105 font-black'
              : 'text-[#33272A]/60 dark:text-[#FFF9F5]/60 hover:text-[#33272A] dark:hover:text-[#FFF9F5]'
          }`}
        >
          <LayoutDashboard className={`h-5 w-5 text-rose-500 ${activeTab === 'dashboard' ? 'stroke-[2.5px] fill-rose-200' : 'stroke-2'}`} />
          <span className="text-[10px] font-black">ภาพรวม</span>
        </button>

        {/* Tab 2: รายชื่อโรงเรียน */}
        <button
          onClick={() => setActiveTab('schools')}
          className={`flex flex-col items-center justify-center gap-1 shrink-0 min-w-[60px] py-1 transition-all ${
            activeTab === 'schools'
              ? 'text-[#FF8BA7] scale-105 font-black'
              : 'text-[#33272A]/60 dark:text-[#FFF9F5]/60 hover:text-[#33272A] dark:hover:text-[#FFF9F5]'
          }`}
        >
          <Building2 className={`h-5 w-5 text-sky-500 ${activeTab === 'schools' ? 'stroke-[2.5px] fill-sky-200' : 'stroke-2'}`} />
          <span className="text-[10px] font-black">โรงเรียน</span>
        </button>

        {/* Tab 3: ผลสัมฤทธิ์ทางการเรียน */}
        <button
          onClick={() => setActiveTab('academic')}
          className={`flex flex-col items-center justify-center gap-1 shrink-0 min-w-[60px] py-1 transition-all ${
            activeTab === 'academic'
              ? 'text-[#FF8BA7] scale-105 font-black'
              : 'text-[#33272A]/60 dark:text-[#FFF9F5]/60 hover:text-[#33272A] dark:hover:text-[#FFF9F5]'
          }`}
        >
          <GraduationCap className={`h-5 w-5 text-indigo-500 ${activeTab === 'academic' ? 'stroke-[2.5px] fill-indigo-200' : 'stroke-2'}`} />
          <span className="text-[10px] font-black">ผลสัมฤทธิ์</span>
        </button>

        {/* Tab 4: โครงสร้างพื้นฐาน */}
        <button
          onClick={() => setActiveTab('infrastructure')}
          className={`flex flex-col items-center justify-center gap-1 shrink-0 min-w-[60px] py-1 transition-all ${
            activeTab === 'infrastructure'
              ? 'text-[#FF8BA7] scale-105 font-black'
              : 'text-[#33272A]/60 dark:text-[#FFF9F5]/60 hover:text-[#33272A] dark:hover:text-[#FFF9F5]'
          }`}
        >
          <Zap className={`h-5 w-5 text-amber-500 fill-amber-400 ${activeTab === 'infrastructure' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
          <span className="text-[10px] font-black">โครงสร้าง</span>
        </button>

        {/* Tab 4: ติดต่อ */}
        {(userProfile?.role === 'super_admin' || systemConfig?.contactEnabled !== false) && (
          <button
            onClick={() => setActiveTab('contact')}
            className={`flex flex-col items-center justify-center gap-1 shrink-0 min-w-[60px] py-1 transition-all ${
              activeTab === 'contact'
                ? 'text-[#FF8BA7] scale-105 font-black'
                : 'text-[#33272A]/60 dark:text-[#FFF9F5]/60 hover:text-[#33272A] dark:hover:text-[#FFF9F5]'
            }`}
          >
            <PhoneCall className={`h-5 w-5 text-emerald-500 ${activeTab === 'contact' ? 'stroke-[2.5px] fill-emerald-200' : 'stroke-2'}`} />
            <span className="text-[10px] font-black">ติดต่อ</span>
          </button>
        )}

        {/* Tab 5: ระบบจัดการ (ถ้าเข้าสู่ระบบแล้ว) */}
        {userProfile && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex flex-col items-center justify-center gap-1 shrink-0 min-w-[60px] py-1 transition-all relative ${
              activeTab === 'admin'
                ? 'text-[#FF8BA7] scale-105 font-black'
                : 'text-[#33272A]/60 dark:text-[#FFF9F5]/60 hover:text-[#33272A] dark:hover:text-[#FFF9F5]'
            }`}
          >
            <Shield className={`h-5 w-5 text-emerald-500 ${activeTab === 'admin' ? 'stroke-[2.5px] fill-emerald-200' : 'stroke-2'}`} />
            <span className="text-[10px] font-black">ระบบ</span>
            {userProfile.role === 'super_admin' && pendingUsers.length > 0 ? (
              <span className="absolute top-0.5 right-[18%] bg-rose-500 text-white text-[9px] px-1 py-0.2 rounded-full font-black animate-pulse leading-tight min-w-[16px] text-center">
                {pendingUsers.length}
              </span>
            ) : userProfile.status === 'pending' ? (
              <span className="absolute top-1 right-[25%] h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
            ) : null}
          </button>
        )}

        {/* Tab 4: ออกจากระบบ หรือ เข้าสู่ระบบ */}
        {userProfile ? (
          <button
            onClick={onLogout}
            className="flex flex-col items-center justify-center gap-1 shrink-0 min-w-[60px] py-1 text-rose-500/80 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 transition-all"
            title="ออกจากระบบ"
          >
            <LogOut className="h-5 w-5 stroke-2" />
            <span className="text-[10px] font-black">ออกระบบ</span>
          </button>
        ) : (
          <button
            onClick={onLoginClick}
            className="flex flex-col items-center justify-center gap-1 shrink-0 min-w-[60px] py-1 text-[#33272A]/60 dark:text-[#FFF9F5]/60 hover:text-[#FF8BA7] transition-all"
          >
            <LogIn className="h-5 w-5 stroke-2" />
            <span className="text-[10px] font-black">เข้าสู่ระบบ</span>
          </button>
        )}
      </div>'''

new_bottom_bar = '''      {/* Mobile & Tablet Bottom Tab Navigation (Fixed 5-Column Grid, Zero Overflow) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#1e1518]/95 backdrop-blur-md border-t-2 border-[#33272A] dark:border-[#FFD3B6] px-1 py-1.5 grid grid-cols-5 items-center shadow-[0_-4px_12px_rgba(51,39,42,0.1)] pb-safe transition-colors duration-300">
        {/* Tab 1: ภาพรวม */}
        <button
          onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 transition-all ${
            activeTab === 'dashboard'
              ? 'text-[#FF8BA7] scale-105 font-black'
              : 'text-[#33272A]/60 dark:text-[#FFF9F5]/60 hover:text-[#33272A] dark:hover:text-[#FFF9F5]'
          }`}
        >
          <LayoutDashboard className={`h-5 w-5 text-rose-500 ${activeTab === 'dashboard' ? 'stroke-[2.5px] fill-rose-200' : 'stroke-2'}`} />
          <span className="text-[10px] font-black truncate">ภาพรวม</span>
        </button>

        {/* Tab 2: รายชื่อโรงเรียน */}
        <button
          onClick={() => { setActiveTab('schools'); setIsMobileMenuOpen(false); }}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 transition-all ${
            activeTab === 'schools'
              ? 'text-[#FF8BA7] scale-105 font-black'
              : 'text-[#33272A]/60 dark:text-[#FFF9F5]/60 hover:text-[#33272A] dark:hover:text-[#FFF9F5]'
          }`}
        >
          <Building2 className={`h-5 w-5 text-sky-500 ${activeTab === 'schools' ? 'stroke-[2.5px] fill-sky-200' : 'stroke-2'}`} />
          <span className="text-[10px] font-black truncate">โรงเรียน</span>
        </button>

        {/* Tab 3: โครงสร้างพื้นฐาน */}
        <button
          onClick={() => { setActiveTab('infrastructure'); setIsMobileMenuOpen(false); }}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 transition-all ${
            activeTab === 'infrastructure'
              ? 'text-[#FF8BA7] scale-105 font-black'
              : 'text-[#33272A]/60 dark:text-[#FFF9F5]/60 hover:text-[#33272A] dark:hover:text-[#FFF9F5]'
          }`}
        >
          <Zap className={`h-5 w-5 text-amber-500 fill-amber-400 ${activeTab === 'infrastructure' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
          <span className="text-[10px] font-black truncate">โครงสร้าง</span>
        </button>

        {/* Tab 4: ผลสัมฤทธิ์ */}
        <button
          onClick={() => { setActiveTab('academic'); setIsMobileMenuOpen(false); }}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 transition-all ${
            activeTab === 'academic'
              ? 'text-[#FF8BA7] scale-105 font-black'
              : 'text-[#33272A]/60 dark:text-[#FFF9F5]/60 hover:text-[#33272A] dark:hover:text-[#FFF9F5]'
          }`}
        >
          <GraduationCap className={`h-5 w-5 text-indigo-500 ${activeTab === 'academic' ? 'stroke-[2.5px] fill-indigo-200' : 'stroke-2'}`} />
          <span className="text-[10px] font-black truncate">ผลสัมฤทธิ์</span>
        </button>

        {/* Tab 5: แฮมเบอร์เกอร์ / เมนูอื่นๆ */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 transition-all relative ${
            isMobileMenuOpen
              ? 'text-rose-500 scale-105 font-black'
              : 'text-[#33272A]/60 dark:text-[#FFF9F5]/60 hover:text-[#33272A] dark:hover:text-[#FFF9F5]'
          }`}
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5 stroke-[2.5px] text-rose-500" />
          ) : (
            <Menu className="h-5 w-5 stroke-[2.5px]" />
          )}
          <span className="text-[10px] font-black truncate">เมนู</span>
          {pendingUsers.length > 0 && userProfile?.role === 'super_admin' && (
            <span className="absolute top-0.5 right-[20%] bg-rose-500 text-white text-[8px] px-1 py-0.2 rounded-full font-black animate-pulse leading-tight min-w-[14px] text-center">
              {pendingUsers.length}
            </span>
          )}
        </button>
      </div>'''

text = text.replace(old_bottom_bar, new_bottom_bar, 1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print('✅ Successfully patched Header.tsx with burger icon and responsive mobile navigation!')
