import React, { useMemo } from 'react';
import { School } from '../types';
import { 
  BarChart3, 
  Building2, 
  Users, 
  GraduationCap, 
  Zap, 
  Sun, 
  PowerOff, 
  Wifi, 
  Radio, 
  WifiOff, 
  Droplets, 
  Mountain, 
  Droplet
} from 'lucide-react';

interface SummaryTableProps {
  schools: School[];
}

export const SummaryTable: React.FC<SummaryTableProps> = ({ schools }) => {
  const summaryByAmphoe = useMemo(() => {
    // Unique list of amphoe
    const amphoeList = Array.from(new Set(schools.map(s => s.amphoe).filter(Boolean)));
    // Sort so เมืองแม่ฮ่องสอน comes first, then other amphoes
    amphoeList.sort((a, b) => {
      if (a.includes('เมือง')) return -1;
      if (b.includes('เมือง')) return 1;
      return a.localeCompare(b, 'th');
    });

    const rows = amphoeList.map(amphoeName => {
      const amphoeSchools = schools.filter(s => s.amphoe === amphoeName);
      const schoolCount = amphoeSchools.length;
      
      const teacherCount = amphoeSchools.reduce((sum, s) => sum + (s.staff_count || 0), 0);
      
      const studentCount = amphoeSchools.reduce((sum, s) => {
        const cSum = (s.classrooms || []).reduce((cAcc, c) => {
          return cAcc + (Number(c.studentCount) || ((Number(c.maleCount) || 0) + (Number(c.femaleCount) || 0)));
        }, 0);
        return sum + cSum;
      }, 0);

      // Electricity breakdown
      let normalElectric = 0;
      let solarElectric = 0;
      let noElectric = 0;
      amphoeSchools.forEach(s => {
        if (s.electricity === true || s.electricity === 'has_electric' || s.electricity === 'normal') {
          normalElectric++;
        } else if (s.electricity === 'solar' || (s.solar_kw && Number(s.solar_kw) > 0)) {
          solarElectric++;
        } else {
          noElectric++;
        }
      });

      // Internet breakdown
      let fiberInternet = 0;
      let satelliteInternet = 0;
      let noInternet = 0;
      amphoeSchools.forEach(s => {
        const net = (s.internet_type || '').toLowerCase();
        if (net.includes('fiber') || net.includes('ใยแก้ว')) {
          fiberInternet++;
        } else if (net.includes('satellite') || net.includes('ดาวเทียม') || net.includes('starlink') || net.includes('mobile') || net.includes('sim')) {
          satelliteInternet++;
        } else if (!net || net === 'none' || net === 'ไม่มี') {
          noInternet++;
        } else {
          fiberInternet++;
        }
      });

      // Water breakdown
      let govWater = 0;
      let mountainWater = 0;
      let wellOrOtherWater = 0;
      amphoeSchools.forEach(s => {
        const w = (s.water_system || '').toLowerCase();
        if (w.includes('gov') || w.includes('ประปาเทศบาล') || w.includes('ประปาหมู่บ้าน') || w.includes('รัฐ')) {
          govWater++;
        } else if (w.includes('mountain') || w.includes('ภูเขา') || w.includes('ตาน้ำ')) {
          mountainWater++;
        } else {
          wellOrOtherWater++;
        }
      });

      return {
        amphoeName,
        schoolCount,
        teacherCount,
        studentCount,
        normalElectric,
        solarElectric,
        noElectric,
        fiberInternet,
        satelliteInternet,
        noInternet,
        govWater,
        mountainWater,
        wellOrOtherWater,
      };
    });

    // Calculate grand totals
    const grandTotal = rows.reduce(
      (acc, r) => ({
        amphoeName: 'รวมทั้งสิ้น (สพป.แม่ฮ่องสอน เขต 1)',
        schoolCount: acc.schoolCount + r.schoolCount,
        teacherCount: acc.teacherCount + r.teacherCount,
        studentCount: acc.studentCount + r.studentCount,
        normalElectric: acc.normalElectric + r.normalElectric,
        solarElectric: acc.solarElectric + r.solarElectric,
        noElectric: acc.noElectric + r.noElectric,
        fiberInternet: acc.fiberInternet + r.fiberInternet,
        satelliteInternet: acc.satelliteInternet + r.satelliteInternet,
        noInternet: acc.noInternet + r.noInternet,
        govWater: acc.govWater + r.govWater,
        mountainWater: acc.mountainWater + r.mountainWater,
        wellOrOtherWater: acc.wellOrOtherWater + r.wellOrOtherWater,
      }),
      {
        amphoeName: 'รวมทั้งสิ้น (สพป.แม่ฮ่องสอน เขต 1)',
        schoolCount: 0,
        teacherCount: 0,
        studentCount: 0,
        normalElectric: 0,
        solarElectric: 0,
        noElectric: 0,
        fiberInternet: 0,
        satelliteInternet: 0,
        noInternet: 0,
        govWater: 0,
        mountainWater: 0,
        wellOrOtherWater: 0,
      }
    );

    return { rows, grandTotal };
  }, [schools]);

  return (
    <div className="bg-white rounded-2xl shadow-md border-2 border-slate-300 overflow-hidden">
      {/* Table Header & Title */}
      <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 font-bold text-lg text-white">
            <div className="p-2 bg-blue-600 rounded-xl shadow-inner">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span>ตารางสรุปข้อมูลสถิติภาพรวมสถานศึกษาและสาธารณูปโภคขั้นพื้นฐาน</span>
          </div>
          <p className="text-xs text-slate-300 mt-1 pl-10">
            จำแนกข้อมูลตาม 4 อำเภอในสังกัด สพป.แม่ฮ่องสอน เขต 1 แยกสีและสัญลักษณ์ระบบบริการสาธารณูปโภคอย่างชัดเจน
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 bg-blue-500/30 border border-blue-400 text-blue-100 text-xs font-bold rounded-full">
            รวม {summaryByAmphoe.grandTotal.schoolCount} สถานศึกษา
          </span>
        </div>
      </div>

      {/* Category Legend Bar: Highlights distinct colors & symbols */}
      <div className="px-5 py-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-bold text-slate-700">สัญลักษณ์และแถบสีข้อมูล:</span>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 font-semibold">
          {/* General/Schools */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-200 text-slate-800 border border-slate-300">
            <Building2 className="w-3.5 h-3.5 text-slate-700" />
            <span>สถานศึกษา</span>
          </div>

          {/* Staff/Students */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-100 text-violet-900 border border-violet-300">
            <Users className="w-3.5 h-3.5 text-violet-700" />
            <span>ครู & นักเรียน</span>
          </div>

          {/* Electricity (Amber/Orange) */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500 text-white font-bold shadow-xs">
            <Zap className="w-3.5 h-3.5 fill-white" />
            <span>ระบบไฟฟ้า (สีส้ม/ทอง)</span>
          </div>

          {/* Internet (Blue/Cyan) */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold shadow-xs">
            <Wifi className="w-3.5 h-3.5" />
            <span>อินเทอร์เน็ต (สีน้ำเงิน/ฟ้า)</span>
          </div>

          {/* Water (Teal/Emerald) */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-600 text-white font-bold shadow-xs">
            <Droplets className="w-3.5 h-3.5 fill-white" />
            <span>ระบบน้ำประปา (สีเขียวน้ำทะเล)</span>
          </div>
        </div>
      </div>

      {/* Main Consolidated Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            {/* Top Tier: Distinct Group Headers with Bold Rich Colors */}
            <tr className="text-white text-xs font-bold uppercase tracking-wider text-center">
              <th colSpan={4} className="py-3 px-3 bg-slate-800 border-r-2 border-slate-700 text-left pl-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <span>ข้อมูลทั่วไป & บุคลากร</span>
                </div>
              </th>

              {/* Group 2: Electricity - Bold Amber */}
              <th colSpan={3} className="py-3 px-3 bg-amber-600 border-r-2 border-amber-700 text-white font-extrabold shadow-sm">
                <div className="flex items-center justify-center gap-1.5">
                  <Zap className="w-4 h-4 fill-white" />
                  <span>หมวดระบบไฟฟ้า (Electricity)</span>
                </div>
              </th>

              {/* Group 3: Internet - Bold Blue */}
              <th colSpan={3} className="py-3 px-3 bg-blue-600 border-r-2 border-blue-700 text-white font-extrabold shadow-sm">
                <div className="flex items-center justify-center gap-1.5">
                  <Wifi className="w-4 h-4" />
                  <span>หมวดอินเทอร์เน็ต (Internet)</span>
                </div>
              </th>

              {/* Group 4: Water - Bold Teal */}
              <th colSpan={3} className="py-3 px-3 bg-teal-600 text-white font-extrabold shadow-sm">
                <div className="flex items-center justify-center gap-1.5">
                  <Droplets className="w-4 h-4 fill-white" />
                  <span>หมวดระบบน้ำอุปโภค (Water Supply)</span>
                </div>
              </th>
            </tr>

            {/* Second Tier: Subheaders with clear icons and individual color accents */}
            <tr className="text-xs font-bold border-b-2 border-slate-300">
              {/* General subheaders */}
              <th className="py-3 px-4 bg-slate-100 text-slate-800 sticky left-0 z-20 border-r border-slate-200">
                อำเภอ
              </th>
              <th className="py-3 px-3 text-center bg-slate-100 text-slate-700 border-r border-slate-200">
                <span className="inline-flex items-center gap-1 justify-center">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  จำนวนแห่ง
                </span>
              </th>
              <th className="py-3 px-3 text-center bg-violet-50 text-violet-900 border-r border-violet-200">
                <span className="inline-flex items-center gap-1 justify-center">
                  <Users className="w-3.5 h-3.5 text-violet-700" />
                  ครู/บุคลากร
                </span>
              </th>
              <th className="py-3 px-3 text-center bg-violet-50 text-violet-900 border-r-2 border-slate-300">
                <span className="inline-flex items-center gap-1 justify-center">
                  <GraduationCap className="w-3.5 h-3.5 text-violet-700" />
                  นักเรียน
                </span>
              </th>

              {/* Electricity subheaders (Amber tint) */}
              <th className="py-3 px-3 text-center bg-amber-100 text-amber-950 border-r border-amber-200">
                <span className="inline-flex items-center gap-1 justify-center">
                  <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                  ไฟฟ้าปกติ
                </span>
              </th>
              <th className="py-3 px-3 text-center bg-amber-100 text-amber-950 border-r border-amber-200">
                <span className="inline-flex items-center gap-1 justify-center">
                  <Sun className="w-3.5 h-3.5 text-orange-600 fill-orange-500" />
                  โซลาร์เซลล์
                </span>
              </th>
              <th className="py-3 px-3 text-center bg-amber-100 text-rose-800 border-r-2 border-slate-300">
                <span className="inline-flex items-center gap-1 justify-center">
                  <PowerOff className="w-3.5 h-3.5 text-rose-600" />
                  ไม่มีไฟฟ้า
                </span>
              </th>

              {/* Internet subheaders (Blue tint) */}
              <th className="py-3 px-3 text-center bg-blue-100 text-blue-950 border-r border-blue-200">
                <span className="inline-flex items-center gap-1 justify-center">
                  <Wifi className="w-3.5 h-3.5 text-blue-600" />
                  Fiber (ใยแก้ว)
                </span>
              </th>
              <th className="py-3 px-3 text-center bg-blue-100 text-blue-950 border-r border-blue-200">
                <span className="inline-flex items-center gap-1 justify-center">
                  <Radio className="w-3.5 h-3.5 text-indigo-600" />
                  ดาวเทียม/ซิม
                </span>
              </th>
              <th className="py-3 px-3 text-center bg-blue-100 text-rose-800 border-r-2 border-slate-300">
                <span className="inline-flex items-center gap-1 justify-center">
                  <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                  ไม่มีเน็ต
                </span>
              </th>

              {/* Water subheaders (Teal tint) */}
              <th className="py-3 px-3 text-center bg-teal-100 text-teal-950 border-r border-teal-200">
                <span className="inline-flex items-center gap-1 justify-center">
                  <Droplets className="w-3.5 h-3.5 text-teal-600 fill-teal-500" />
                  ประปารัฐ/ชุมชน
                </span>
              </th>
              <th className="py-3 px-3 text-center bg-teal-100 text-teal-950 border-r border-teal-200">
                <span className="inline-flex items-center gap-1 justify-center">
                  <Mountain className="w-3.5 h-3.5 text-emerald-700" />
                  ประปาภูเขา
                </span>
              </th>
              <th className="py-3 px-3 text-center bg-teal-100 text-teal-950">
                <span className="inline-flex items-center gap-1 justify-center">
                  <Droplet className="w-3.5 h-3.5 text-cyan-600" />
                  บ่อน้ำ/อื่นๆ
                </span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-slate-800">
            {summaryByAmphoe.rows.map((row, index) => (
              <tr 
                key={row.amphoeName} 
                className={index % 2 === 0 ? 'bg-white hover:bg-slate-50 transition' : 'bg-slate-50/70 hover:bg-slate-100/70 transition'}
              >
                {/* Amphoe Name */}
                <td className="py-3 px-4 font-bold text-slate-900 sticky left-0 bg-inherit z-10 border-r border-slate-200 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-100"></span>
                  {row.amphoeName}
                </td>

                {/* School Count */}
                <td className="py-3 px-3 text-center font-bold text-slate-800 border-r border-slate-200">
                  <span className="px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-300">
                    {row.schoolCount.toLocaleString()}
                  </span>
                </td>

                {/* Teacher Count */}
                <td className="py-3 px-3 text-center font-bold text-violet-900 bg-violet-50/30 border-r border-violet-100">
                  <span className="px-2.5 py-1 bg-violet-100 rounded-lg border border-violet-200">
                    {row.teacherCount.toLocaleString()}
                  </span>
                </td>

                {/* Student Count */}
                <td className="py-3 px-3 text-center font-bold text-violet-900 bg-violet-50/30 border-r-2 border-slate-300">
                  <span className="px-2.5 py-1 bg-violet-100 rounded-lg border border-violet-200">
                    {row.studentCount > 0 ? row.studentCount.toLocaleString() : '-'}
                  </span>
                </td>

                {/* Electricity Normal - Amber badge */}
                <td className="py-3 px-3 text-center bg-amber-50/40 border-r border-amber-200">
                  <span className="inline-flex items-center justify-center min-w-[32px] px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold border border-amber-300 text-xs">
                    {row.normalElectric}
                  </span>
                </td>

                {/* Electricity Solar - Orange badge */}
                <td className="py-3 px-3 text-center bg-amber-50/40 border-r border-amber-200">
                  <span className="inline-flex items-center justify-center min-w-[32px] px-2.5 py-0.5 rounded-md bg-orange-100 text-orange-950 font-bold border border-orange-300 text-xs">
                    {row.solarElectric}
                  </span>
                </td>

                {/* Electricity None - Red badge */}
                <td className="py-3 px-3 text-center bg-amber-50/40 border-r-2 border-slate-300">
                  <span className={`inline-flex items-center justify-center min-w-[32px] px-2.5 py-0.5 rounded-md font-bold text-xs border ${
                    row.noElectric > 0 
                      ? 'bg-rose-100 text-rose-800 border-rose-300 font-extrabold' 
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {row.noElectric}
                  </span>
                </td>

                {/* Internet Fiber - Blue badge */}
                <td className="py-3 px-3 text-center bg-blue-50/40 border-r border-blue-200">
                  <span className="inline-flex items-center justify-center min-w-[32px] px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-950 font-bold border border-blue-300 text-xs">
                    {row.fiberInternet}
                  </span>
                </td>

                {/* Internet Satellite/Sim - Indigo badge */}
                <td className="py-3 px-3 text-center bg-blue-50/40 border-r border-blue-200">
                  <span className="inline-flex items-center justify-center min-w-[32px] px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-950 font-bold border border-indigo-300 text-xs">
                    {row.satelliteInternet}
                  </span>
                </td>

                {/* Internet None - Red/Slate badge */}
                <td className="py-3 px-3 text-center bg-blue-50/40 border-r-2 border-slate-300">
                  <span className={`inline-flex items-center justify-center min-w-[32px] px-2.5 py-0.5 rounded-md font-bold text-xs border ${
                    row.noInternet > 0 
                      ? 'bg-rose-100 text-rose-800 border-rose-300 font-extrabold' 
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {row.noInternet}
                  </span>
                </td>

                {/* Water Government - Teal badge */}
                <td className="py-3 px-3 text-center bg-teal-50/40 border-r border-teal-200">
                  <span className="inline-flex items-center justify-center min-w-[32px] px-2.5 py-0.5 rounded-md bg-teal-100 text-teal-950 font-bold border border-teal-300 text-xs">
                    {row.govWater}
                  </span>
                </td>

                {/* Water Mountain - Emerald badge */}
                <td className="py-3 px-3 text-center bg-teal-50/40 border-r border-teal-200">
                  <span className="inline-flex items-center justify-center min-w-[32px] px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-950 font-bold border border-emerald-300 text-xs">
                    {row.mountainWater}
                  </span>
                </td>

                {/* Water Well/Other - Cyan badge */}
                <td className="py-3 px-3 text-center bg-teal-50/40">
                  <span className="inline-flex items-center justify-center min-w-[32px] px-2.5 py-0.5 rounded-md bg-cyan-100 text-cyan-950 font-bold border border-cyan-300 text-xs">
                    {row.wellOrOtherWater}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>

          {/* Grand Total Footer with distinct colored sections */}
          <tfoot>
            <tr className="font-extrabold text-sm border-t-2 border-slate-400">
              {/* Grand Total Label */}
              <td className="py-4 px-4 bg-slate-900 text-white sticky left-0 z-20 border-r border-slate-700">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  <span>{summaryByAmphoe.grandTotal.amphoeName}</span>
                </div>
              </td>

              {/* Total Schools */}
              <td className="py-4 px-3 text-center bg-slate-800 text-white border-r border-slate-700">
                {summaryByAmphoe.grandTotal.schoolCount.toLocaleString()} แห่ง
              </td>

              {/* Total Teachers */}
              <td className="py-4 px-3 text-center bg-violet-900 text-white border-r border-violet-800">
                {summaryByAmphoe.grandTotal.teacherCount.toLocaleString()} คน
              </td>

              {/* Total Students */}
              <td className="py-4 px-3 text-center bg-violet-900 text-white border-r-2 border-slate-900">
                {summaryByAmphoe.grandTotal.studentCount > 0
                  ? `${summaryByAmphoe.grandTotal.studentCount.toLocaleString()} คน`
                  : '-'}
              </td>

              {/* Total Normal Electric */}
              <td className="py-4 px-3 text-center bg-amber-700 text-amber-50 border-r border-amber-600">
                {summaryByAmphoe.grandTotal.normalElectric} แห่ง
              </td>

              {/* Total Solar */}
              <td className="py-4 px-3 text-center bg-amber-700 text-amber-50 border-r border-amber-600">
                {summaryByAmphoe.grandTotal.solarElectric} แห่ง
              </td>

              {/* Total No Electric */}
              <td className="py-4 px-3 text-center bg-amber-800 text-rose-200 border-r-2 border-slate-900 font-black">
                {summaryByAmphoe.grandTotal.noElectric} แห่ง
              </td>

              {/* Total Fiber */}
              <td className="py-4 px-3 text-center bg-blue-700 text-blue-50 border-r border-blue-600">
                {summaryByAmphoe.grandTotal.fiberInternet} แห่ง
              </td>

              {/* Total Satellite */}
              <td className="py-4 px-3 text-center bg-blue-700 text-blue-50 border-r border-blue-600">
                {summaryByAmphoe.grandTotal.satelliteInternet} แห่ง
              </td>

              {/* Total No Internet */}
              <td className="py-4 px-3 text-center bg-blue-800 text-rose-200 border-r-2 border-slate-900 font-black">
                {summaryByAmphoe.grandTotal.noInternet} แห่ง
              </td>

              {/* Total Gov Water */}
              <td className="py-4 px-3 text-center bg-teal-700 text-teal-50 border-r border-teal-600">
                {summaryByAmphoe.grandTotal.govWater} แห่ง
              </td>

              {/* Total Mountain Water */}
              <td className="py-4 px-3 text-center bg-teal-700 text-teal-50 border-r border-teal-600">
                {summaryByAmphoe.grandTotal.mountainWater} แห่ง
              </td>

              {/* Total Other Water */}
              <td className="py-4 px-3 text-center bg-teal-800 text-teal-100">
                {summaryByAmphoe.grandTotal.wellOrOtherWater} แห่ง
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
