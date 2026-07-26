import { useState, useEffect } from 'react';
import { Eye, Users, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, increment, onSnapshot } from 'firebase/firestore';

export default function VisitorCounter() {
  const [totalVisits, setTotalVisits] = useState<number>(1520);
  const [todayVisits, setTodayVisits] = useState<number>(48);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const trackAndFetchVisits = async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const sessionKey = `mhs1_visited_${todayStr}`;
      const docRef = doc(db, 'system_stats', 'visitor_count');

      // ตรวจสอบฟังช์ชันเรียลไทม์
      try {
        unsubscribe = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.totalVisits) setTotalVisits(data.totalVisits);
            if (data.dailyVisits && data.dailyVisits[todayStr]) {
              setTodayVisits(data.dailyVisits[todayStr]);
            } else if (data.todayDate === todayStr && data.todayVisits) {
              setTodayVisits(data.todayVisits);
            }
          }
        }, (_err) => {
          // Silent fallback on listener error (e.g. temporary offline)
        });

        // หากยังไม่เคยเข้าชมในเซสชันนี้ ให้บวกจำนวนเข้าชม
        if (!sessionStorage.getItem(sessionKey)) {
          sessionStorage.setItem(sessionKey, 'true');
          const snap = await getDoc(docRef).catch(() => null);
          
          if (!snap || !snap.exists()) {
            // สร้างเอกสารเริ่มต้น
            await setDoc(docRef, {
              totalVisits: 1521,
              todayVisits: 1,
              todayDate: todayStr,
              updatedAt: new Date()
            }).catch(() => {});
            setTotalVisits(1521);
            setTodayVisits(1);
          } else {
            const data = snap.data();
            const currentToday = data.todayDate === todayStr ? (data.todayVisits || 0) : 0;
            await updateDoc(docRef, {
              totalVisits: increment(1),
              todayVisits: currentToday + 1,
              todayDate: todayStr,
              updatedAt: new Date()
            }).catch(() => {});
          }
        }
      } catch (_err) {
        // Fallback จาก LocalStorage
        const localTotal = parseInt(localStorage.getItem('mhs1_total_visits') || '1520', 10);
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

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5] bg-[#FFF9F5] dark:bg-[#1e1518] px-3.5 py-1.5 rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[2px_2px_0px_0px_#33272A] dark:shadow-[2px_2px_0px_0px_#FFD3B6]">
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
    </div>
  );
}
