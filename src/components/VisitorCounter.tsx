import { useState, useEffect } from 'react';
import { Eye, Users, Calendar, TrendingUp, BarChart3, RefreshCw, X, Clock } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts';

interface VisitorData {
  totalVisits: number;
  todayVisits: number;
  todayDate: string;
  dailyVisits?: { [key: string]: number };
  monthlyVisits?: { [key: string]: number };
  yearlyVisits?: { [key: string]: number };
  hourlyVisits?: { [key: string]: number }; // Key: "YYYY-MM-DD_HH"
}

export default function VisitorCounter() {
  const [totalVisits, setTotalVisits] = useState<number>(0);
  const [todayVisits, setTodayVisits] = useState<number>(0);
  const [visitorData, setVisitorData] = useState<VisitorData | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [chartRangeDays, setChartRangeDays] = useState<number>(1); // Default to 1 day (Hourly)
  const [activeTab, setActiveTab] = useState<'line' | 'bar' | 'table'>('line');
  const [isResetting, setIsResetting] = useState<boolean>(false);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const trackAndFetchVisits = async () => {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
      const monthStr = todayStr.slice(0, 7); // "YYYY-MM"
      const yearStr = todayStr.slice(0, 4); // "YYYY"
      const hourStr = String(now.getHours()).padStart(2, '0'); // "00".."23"
      const hourlyKey = `${todayStr}_${hourStr}`;

      const sessionKey = `mhs1_visited_${todayStr}`;
      const docRef = doc(db, 'system_stats', 'visitor_count');

      try {
        // Listening to realtime visitor statistics updates from Firestore
        unsubscribe = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as VisitorData;
            setVisitorData(data);
            setTotalVisits(data.totalVisits || 0);
            if (data.dailyVisits && data.dailyVisits[todayStr]) {
              setTodayVisits(data.dailyVisits[todayStr]);
            } else if (data.todayDate === todayStr && data.todayVisits !== undefined) {
              setTodayVisits(data.todayVisits);
            } else {
              setTodayVisits(0);
            }
          }
        }, (_err) => {
          // Fallback if offline or listener error
        });

        // Increment visit count once per browser session
        if (!sessionStorage.getItem(sessionKey)) {
          sessionStorage.setItem(sessionKey, 'true');
          const snap = await getDoc(docRef).catch(() => null);

          if (!snap || !snap.exists()) {
            // Initialize fresh counter at 1 for the first visit
            const initData: VisitorData = {
              totalVisits: 1,
              todayVisits: 1,
              todayDate: todayStr,
              dailyVisits: { [todayStr]: 1 },
              monthlyVisits: { [monthStr]: 1 },
              yearlyVisits: { [yearStr]: 1 },
              hourlyVisits: { [hourlyKey]: 1 }
            };
            await setDoc(docRef, { ...initData, updatedAt: new Date() }).catch(() => {});
            setTotalVisits(1);
            setTodayVisits(1);
          } else {
            const data = snap.data() as VisitorData;
            const currentDaily = data.dailyVisits || {};
            const currentMonthly = data.monthlyVisits || {};
            const currentYearly = data.yearlyVisits || {};
            const currentHourly = data.hourlyVisits || {};

            const newTodayCount = (data.todayDate === todayStr ? (data.todayVisits || 0) : 0) + 1;
            const newDailyCount = (currentDaily[todayStr] || 0) + 1;
            const newMonthCount = (currentMonthly[monthStr] || 0) + 1;
            const newYearCount = (currentYearly[yearStr] || 0) + 1;
            const newHourCount = (currentHourly[hourlyKey] || 0) + 1;

            await updateDoc(docRef, {
              totalVisits: increment(1),
              todayVisits: newTodayCount,
              todayDate: todayStr,
              [`dailyVisits.${todayStr}`]: newDailyCount,
              [`monthlyVisits.${monthStr}`]: newMonthCount,
              [`yearlyVisits.${yearStr}`]: newYearCount,
              [`hourlyVisits.${hourlyKey}`]: newHourCount,
              updatedAt: new Date()
            }).catch(() => {});
          }
        }
      } catch (_err) {
        // Localstorage fallback
        const localTotal = parseInt(localStorage.getItem('mhs1_total_visits') || '0', 10);
        const localSessionKey = `mhs1_visited_local_${todayStr}`;
        if (!sessionStorage.getItem(localSessionKey)) {
          sessionStorage.setItem(localSessionKey, 'true');
          const newTotal = localTotal + 1;
          localStorage.setItem('mhs1_total_visits', String(newTotal));
          setTotalVisits(newTotal);
        } else {
          setTotalVisits(localTotal);
        }
      }
    };

    trackAndFetchVisits();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Helper to handle resetting visitor counters to 0
  const handleResetVisitorStats = async () => {
    if (!window.confirm('คุณยืนยันที่จะรีเซ็ตสถิติผู้เข้าชมระบบทั้งหมดให้เป็น 0 หรือไม่?')) {
      return;
    }
    setIsResetting(true);
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const docRef = doc(db, 'system_stats', 'visitor_count');
      const resetData: VisitorData = {
        totalVisits: 0,
        todayVisits: 0,
        todayDate: todayStr,
        dailyVisits: { [todayStr]: 0 },
        monthlyVisits: {},
        yearlyVisits: {},
        hourlyVisits: {}
      };
      await setDoc(docRef, { ...resetData, updatedAt: new Date() });
      setTotalVisits(0);
      setTodayVisits(0);
      setVisitorData(resetData);
      localStorage.setItem('mhs1_total_visits', '0');
      alert('รีเซ็ตจำนวนผู้เข้าชมระบบเป็น 0 เรียบร้อยแล้ว!');
    } catch (err: any) {
      console.error('Failed to reset visitor count:', err);
      alert('เกิดข้อผิดพลาดในการรีเซ็ต: ' + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  // Compute daily / hourly series for Line Chart
  const getDailyOrHourlyChartData = () => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    // If 1 Day selected -> show 24 hours breakdown for today
    if (chartRangeDays === 1) {
      const data: { date: string; displayDate: string; visits: number }[] = [];
      const hourlyMap = visitorData?.hourlyVisits || {};

      for (let h = 0; h < 24; h++) {
        const hStr = String(h).padStart(2, '0');
        const hKey = `${todayStr}_${hStr}`;
        const displayDate = `${hStr}:00 น.`;
        
        // If hourlyMap has records, use it; otherwise if it's the current hour and we have todayVisits, attribute it
        let visits = hourlyMap[hKey] || 0;
        if (visits === 0 && h === today.getHours() && todayVisits > 0 && Object.keys(hourlyMap).length === 0) {
          visits = todayVisits;
        }

        data.push({
          date: `${todayStr} ${hStr}:00`,
          displayDate,
          visits
        });
      }
      return data;
    }

    // Multiple days view
    const data: { date: string; displayDate: string; visits: number }[] = [];
    const dailyMap = visitorData?.dailyVisits || {};

    for (let i = chartRangeDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const monthNamesTh = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      const displayDate = `${d.getDate()} ${monthNamesTh[d.getMonth()]}`;
      data.push({
        date: dateStr,
        displayDate,
        visits: dailyMap[dateStr] || 0
      });
    }
    return data;
  };

  // Compute monthly series for Bar Chart
  const getMonthlyChartData = () => {
    const data: { monthKey: string; monthName: string; visits: number }[] = [];
    const monthlyMap = visitorData?.monthlyVisits || {};
    const monthNamesTh = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const currentYear = new Date().getFullYear();

    for (let m = 0; m < 12; m++) {
      const monthNumStr = String(m + 1).padStart(2, '0');
      const monthKey = `${currentYear}-${monthNumStr}`;
      data.push({
        monthKey,
        monthName: `${monthNamesTh[m]} ${currentYear + 543}`,
        visits: monthlyMap[monthKey] || 0
      });
    }
    return data;
  };

  // Computed summary metrics
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthStr = todayStr.slice(0, 7);
  const currentYearStr = todayStr.slice(0, 4);

  const thisMonthVisits = visitorData?.monthlyVisits?.[currentMonthStr] || todayVisits;
  const thisYearVisits = visitorData?.yearlyVisits?.[currentYearStr] || totalVisits;

  return (
    <>
      {/* Visitor Counter Button / Bar */}
      <div 
        onClick={() => setShowModal(true)}
        className="group cursor-pointer flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5] bg-[#FFF9F5] dark:bg-[#1e1518] hover:bg-[#FFD3B6]/20 dark:hover:bg-slate-800 px-3.5 py-1.5 rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[2px_2px_0px_0px_#33272A] dark:shadow-[2px_2px_0px_0px_#FFD3B6] transition-all transform hover:-translate-y-0.5"
        title="คลิกเพื่อดูสถิติรายละเอียดผู้เข้าชมระบบ (รายชั่วโมง/วัน/เดือน/ปี)"
      >
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <Eye className="h-4 w-4 text-[#FF8BA7] shrink-0" />
          <span className="text-xs">ผู้เข้าชมระบบทั้งหมด:</span>
          <span className="bg-[#A0E7E5] text-[#33272A] px-2 py-0.5 rounded-lg text-xs font-black border border-[#33272A]">
            {totalVisits.toLocaleString()}
          </span>
          <span>คน</span>
        </div>

        <div className="hidden sm:inline text-[#33272A]/30 dark:text-[#FFD3B6]/30">|</div>

        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-[#FF8BA7]" />
          <span className="text-xs">เข้าชมวันนี้:</span>
          <span className="bg-[#FFD3B6] text-[#33272A] px-2 py-0.5 rounded-lg text-xs font-black border border-[#33272A]">
            {todayVisits.toLocaleString()}
          </span>
          <span>คน</span>
        </div>

        <span className="bg-[#FF8BA7] text-[#33272A] px-2 py-0.5 rounded-lg text-[10px] font-black border border-[#33272A] flex items-center gap-1 group-hover:scale-105 transition-transform ml-1">
          <BarChart3 className="h-3 w-3" />
          ดูรายละเอียดกราฟ
        </span>
      </div>

      {/* Analytics Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#FFF9F5] dark:bg-[#181113] rounded-3xl border-3 border-[#33272A] dark:border-[#FFD3B6] shadow-[6px_6px_0px_0px_#33272A] dark:shadow-[6px_6px_0px_0px_#FFD3B6] p-5 sm:p-7 space-y-6">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-[#33272A]/10 dark:border-[#FFD3B6]/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#FF8BA7] rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] text-[#33272A]">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-2">
                    รายละเอียดสถิติผู้เข้าชมระบบ
                    <span className="text-xs bg-[#A0E7E5] text-[#33272A] border border-[#33272A] px-2 py-0.5 rounded-full font-black">
                      เรียลไทม์
                    </span>
                  </h3>
                  <p className="text-xs font-bold text-[#33272A]/70 dark:text-[#FFF9F5]/70 mt-0.5">
                    วิเคราะห์และติดตามแนวโน้มจำนวนผู้ใช้งานแบบ รายชั่วโมง / รายวัน / รายเดือน / รายปี
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl bg-white dark:bg-[#251b1e] text-[#33272A] dark:text-[#FFF9F5] border-2 border-[#33272A] dark:border-[#FFD3B6] hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Summary Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-[#20171a] p-3.5 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[2px_2px_0px_0px_#33272A] dark:shadow-[2px_2px_0px_0px_#FFD3B6]">
                <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 block mb-1">เข้าชมวันนี้</span>
                <span className="text-2xl font-black text-[#FF8BA7] block">{todayVisits.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-slate-400">{todayStr}</span>
              </div>

              <div className="bg-white dark:bg-[#20171a] p-3.5 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[2px_2px_0px_0px_#33272A] dark:shadow-[2px_2px_0px_0px_#FFD3B6]">
                <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 block mb-1">เข้าชมเดือนนี้</span>
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400 block">{thisMonthVisits.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-slate-400">เดือน {currentMonthStr}</span>
              </div>

              <div className="bg-white dark:bg-[#20171a] p-3.5 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[2px_2px_0px_0px_#33272A] dark:shadow-[2px_2px_0px_0px_#FFD3B6]">
                <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 block mb-1">เข้าชมปีนี้</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block">{thisYearVisits.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-slate-400">ปี พ.ศ. {Number(currentYearStr) + 543}</span>
              </div>

              <div className="bg-white dark:bg-[#20171a] p-3.5 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[2px_2px_0px_0px_#33272A] dark:shadow-[2px_2px_0px_0px_#FFD3B6]">
                <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 block mb-1">ยอดรวมทั้งหมด</span>
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400 block">{totalVisits.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-slate-400">นับจากสถิติล่าสุด</span>
              </div>
            </div>

            {/* Controls Bar: Mode selector & Date Range */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#20171a] p-3 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6]">
              {/* Tab Selector */}
              <div className="flex gap-1.5 w-full sm:w-auto">
                <button
                  onClick={() => setActiveTab('line')}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-black border-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'line'
                      ? 'bg-[#FF8BA7] text-[#33272A] border-[#33272A]'
                      : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                  กราฟเส้น (รายชั่วโมง/รายวัน)
                </button>

                <button
                  onClick={() => setActiveTab('bar')}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-black border-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'bar'
                      ? 'bg-[#A0E7E5] text-[#33272A] border-[#33272A]'
                      : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  กราฟแท่ง (รายเดือน)
                </button>

                <button
                  onClick={() => setActiveTab('table')}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-black border-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'table'
                      ? 'bg-[#FFD3B6] text-[#33272A] border-[#33272A]'
                      : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  ตารางจำแนก
                </button>
              </div>

              {/* Range Selector for Line Chart */}
              {activeTab === 'line' && (
                <div className="flex items-center gap-1 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5] w-full sm:w-auto justify-end flex-wrap">
                  <span className="text-[11px] text-slate-500 font-bold mr-1">ช่วงเวลา:</span>
                  {[
                    { label: '1 วัน (รายชั่วโมง)', days: 1 },
                    { label: '7 วัน', days: 7 },
                    { label: '14 วัน', days: 14 },
                    { label: '30 วัน', days: 30 },
                    { label: '60 วัน', days: 60 }
                  ].map((option) => (
                    <button
                      key={option.days}
                      onClick={() => setChartRangeDays(option.days)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black border border-[#33272A] transition-all cursor-pointer ${
                        chartRangeDays === option.days
                          ? 'bg-[#33272A] text-white dark:bg-[#FFD3B6] dark:text-[#33272A]'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* TAB 1: LINE CHART (Daily or Hourly Visitors over Time Range) */}
            {activeTab === 'line' && (
              <div className="bg-white dark:bg-[#20171a] p-4 sm:p-5 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] space-y-3">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h4 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-2">
                    {chartRangeDays === 1 ? <Clock className="h-4 w-4 text-[#FF8BA7]" /> : <TrendingUp className="h-4 w-4 text-[#FF8BA7]" />}
                    {chartRangeDays === 1 
                      ? 'กราฟเส้นแสดงจำนวนผู้เข้าชมรายชั่วโมง (24 ชั่วโมงของวันนี้)' 
                      : `กราฟเส้นแสดงจำนวนผู้เข้าชมย้อนหลัง ${chartRangeDays} วัน`
                    }
                  </h4>
                  <span className="text-[10px] font-bold text-slate-400">
                    {chartRangeDays === 1 ? 'แกน X: ช่วงเวลา (นาฬิกา) | แกน Y: จำนวนผู้เข้าชม (คน)' : 'แกน X: วันที่ | แกน Y: จำนวนผู้เข้าชม (คน)'}
                  </span>
                </div>

                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getDailyOrHourlyChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="visitorGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF8BA7" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#FF8BA7" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="displayDate" tick={{ fontSize: 10, fontWeight: 'bold' }} interval={chartRangeDays === 1 ? 1 : 0} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fontWeight: 'bold' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: '2px solid #33272A', fontWeight: 'bold', fontSize: '12px' }}
                        formatter={(val: any) => [`${val} คน`, 'ผู้เข้าชม']}
                        labelFormatter={(label) => chartRangeDays === 1 ? `เวลา: ${label}` : `วันที่: ${label}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="visits" 
                        stroke="#FF8BA7" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#visitorGradient)" 
                        activeDot={{ r: 6, stroke: '#33272A', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* TAB 2: BAR CHART (Monthly Visitors) */}
            {activeTab === 'bar' && (
              <div className="bg-white dark:bg-[#20171a] p-4 sm:p-5 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-[#A0E7E5]" />
                    กราฟแท่งแสดงจำนวนผู้เข้าชมแยกตามเดือน (ปี {Number(currentYearStr) + 543})
                  </h4>
                  <span className="text-[10px] font-bold text-slate-400">แกน X: เดือน | แกน Y: จำนวนผู้เข้าชม (คน)</span>
                </div>

                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getMonthlyChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="monthName" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fontWeight: 'bold' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: '2px solid #33272A', fontWeight: 'bold', fontSize: '12px' }}
                        formatter={(val: any) => [`${val} คน`, 'ผู้เข้าชมประจำเดือน']}
                      />
                      <Bar dataKey="visits" fill="#A0E7E5" stroke="#33272A" strokeWidth={1.5} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* TAB 3: DATA TABLE */}
            {activeTab === 'table' && (
              <div className="bg-white dark:bg-[#20171a] p-4 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] space-y-4">
                <h4 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#FFD3B6]" />
                  ตารางสรุปสถิติผู้เข้าชม ({chartRangeDays === 1 ? 'รายชั่วโมงวันนี้' : `รายวันย้อนหลัง ${chartRangeDays} วัน`})
                </h4>

                <div className="overflow-x-auto max-h-60 rounded-xl border border-[#33272A]/20">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#FFF9F5] dark:bg-[#2a1d21] text-[#33272A] dark:text-[#FFF9F5] font-black border-b border-[#33272A]/20">
                      <tr>
                        <th className="p-2.5">{chartRangeDays === 1 ? 'ช่วงเวลา' : 'วันที่'}</th>
                        <th className="p-2.5 text-center">จำนวนผู้เข้าชม (คน)</th>
                        <th className="p-2.5 text-right">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#33272A]/10 font-bold">
                      {getDailyOrHourlyChartData().reverse().map((item) => (
                        <tr key={item.date} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-2.5 font-mono">{item.displayDate} ({item.date.slice(0, 10)})</td>
                          <td className="p-2.5 text-center font-black text-blue-600 dark:text-blue-400">
                            {item.visits.toLocaleString()}
                          </td>
                          <td className="p-2.5 text-right">
                            {item.date.includes(todayStr) ? (
                              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-black">
                                วันนี้
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer with Reset button for Super Admin */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t-2 border-[#33272A]/10 dark:border-[#FFD3B6]/20">
              <button
                type="button"
                onClick={handleResetVisitorStats}
                disabled={isResetting}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 border-2 border-rose-300 dark:border-rose-800 text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${isResetting ? 'animate-spin' : ''}`} />
                {isResetting ? 'กำลังรีเซ็ตสถิติ...' : 'รีเซ็ตจำนวนผู้เข้าชมเป็น 0'}
              </button>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#33272A] text-white hover:bg-slate-800 dark:bg-[#FFD3B6] dark:text-[#33272A] text-xs font-black cursor-pointer shadow-md transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
