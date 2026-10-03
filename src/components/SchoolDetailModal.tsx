import React from 'react';
import { School } from '../types';
import { 
  X, 
  Building2, 
  Zap, 
  Sun, 
  PowerOff, 
  Wifi, 
  Radio, 
  WifiOff, 
  Droplets, 
  Mountain, 
  Droplet, 
  Users, 
  BookOpen, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  GraduationCap 
} from 'lucide-react';

interface SchoolDetailModalProps {
  school: School | null;
  onClose: () => void;
}

export const SchoolDetailModal: React.FC<SchoolDetailModalProps> = ({ school, onClose }) => {
  if (!school) return null;

  const totalStudents = (school.classrooms || []).reduce((acc, c) => {
    return acc + (Number(c.studentCount) || ((Number(c.maleCount) || 0) + (Number(c.femaleCount) || 0)));
  }, 0);

  const isSolar = school.electricity === 'solar' || (school.solar_kw && Number(school.solar_kw) > 0);
  const isNormalElectric = school.electricity === true || school.electricity === 'has_electric' || school.electricity === 'normal';

  const net = (school.internet_type || '').toLowerCase();
  const isFiber = net.includes('fiber') || net.includes('ใยแก้ว');
  const isSatellite = net.includes('satellite') || net.includes('ดาวเทียม') || net.includes('starlink') || net.includes('mobile') || net.includes('sim');
  const hasNoNet = !net || net === 'none' || net === 'ไม่มี';

  const w = (school.water_system || '').toLowerCase();
  const isGovWater = w.includes('gov') || w.includes('ประปาเทศบาล') || w.includes('ประปาหมู่บ้าน') || w.includes('รัฐ');
  const isMountainWater = w.includes('mountain') || w.includes('ภูเขา') || w.includes('ตาน้ำ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border-2 border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-md bg-blue-500/30 border border-blue-400 text-blue-200 text-xs font-mono font-bold">
                รหัสสถานศึกษา {school.id}
              </span>
              <span className="px-3 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold">
                อำเภอ{school.amphoe}
              </span>
            </div>
            <h2 className="text-xl font-extrabold mt-2 flex items-center gap-2 text-white">
              <Building2 className="w-6 h-6 text-blue-400 shrink-0" />
              <span>{school.name}</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>{school.network_group} • {school.district}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-violet-50 border-2 border-violet-200 rounded-2xl p-3 text-center shadow-xs">
              <span className="text-xs text-violet-800 font-bold block flex items-center justify-center gap-1">
                <Users className="w-3.5 h-3.5 text-violet-600" />
                ครูและบุคลากร
              </span>
              <span className="text-2xl font-black text-violet-900 mt-1 block">{school.staff_count}</span>
              <span className="text-[10px] text-violet-600 block">คน</span>
            </div>

            <div className="bg-pink-50 border-2 border-pink-200 rounded-2xl p-3 text-center shadow-xs">
              <span className="text-xs text-pink-800 font-bold block flex items-center justify-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-pink-600" />
                นักเรียนรวม
              </span>
              <span className="text-2xl font-black text-pink-900 mt-1 block">
                {totalStudents > 0 ? totalStudents : '-'}
              </span>
              <span className="text-[10px] text-pink-600 block">คน</span>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-3 text-center shadow-xs">
              <span className="text-xs text-blue-800 font-bold block flex items-center justify-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                ห้องเรียน/สาขา
              </span>
              <span className="text-2xl font-black text-blue-900 mt-1 block">
                {(school.classrooms || []).length || 1}
              </span>
              <span className="text-[10px] text-blue-600 block">ห้อง</span>
            </div>

            <div className="bg-slate-100 border-2 border-slate-300 rounded-2xl p-3 text-center shadow-xs">
              <span className="text-xs text-slate-700 font-bold block">บุคลากรอื่น</span>
              <span className="text-2xl font-black text-slate-800 mt-1 block">
                {school.other_staff_count || 0}
              </span>
              <span className="text-[10px] text-slate-500 block">คน</span>
            </div>
          </div>

          {/* Three Categorized Distinct Infrastructure Sections */}
          <div className="space-y-3.5">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>ข้อมูลระบบสาธารณูปโภคขั้นพื้นฐาน (แยกตามหมวดสีชัดเจน)</span>
            </h3>

            {/* 1. Electricity (Amber/Orange) */}
            <div className="bg-amber-50/70 border-2 border-amber-300 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm">
                  <div className="p-1.5 bg-amber-500 text-white rounded-lg">
                    <Zap className="w-4 h-4 fill-white" />
                  </div>
                  <span>ระบบไฟฟ้า (Electricity)</span>
                </div>
                {isNormalElectric ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full shadow-xs">
                    <Zap className="w-3.5 h-3.5 fill-white" /> ไฟฟ้าปกติ (การไฟฟ้าส่วนภูมิภาค)
                  </span>
                ) : isSolar ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full shadow-xs">
                    <Sun className="w-3.5 h-3.5 fill-white" /> โซลาร์เซลล์พลังงานแสงอาทิตย์
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-600 text-white text-xs font-bold rounded-full shadow-xs">
                    <PowerOff className="w-3.5 h-3.5" /> ไม่มีระบบไฟฟ้า
                  </span>
                )}
              </div>
              <div className="text-xs text-amber-950 font-medium pl-8 space-y-1">
                {school.solar_kw && (
                  <p>• กำลังการผลิตโซลาร์เซลล์: <strong>{school.solar_kw} kW</strong></p>
                )}
                <p>• สถานะแบตเตอรี่กักเก็บพลังงาน: {school.has_solar_battery ? 'มีระบบแบตเตอรี่กักเก็บ' : 'ไม่มีแบตเตอรี่สำรอง'}</p>
              </div>
            </div>

            {/* 2. Internet (Blue/Indigo) */}
            <div className="bg-blue-50/70 border-2 border-blue-300 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-blue-900 font-extrabold text-sm">
                  <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                    <Wifi className="w-4 h-4" />
                  </div>
                  <span>ระบบอินเทอร์เน็ต (Internet)</span>
                </div>
                {isFiber ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full shadow-xs">
                    <Wifi className="w-3.5 h-3.5" /> ใยแก้วนำแสงความเร็วสูง (Fiber Optic)
                  </span>
                ) : isSatellite ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full shadow-xs">
                    <Radio className="w-3.5 h-3.5" /> สัญญาณดาวเทียม / เครือข่ายไร้สาย
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-600 text-white text-xs font-bold rounded-full shadow-xs">
                    <WifiOff className="w-3.5 h-3.5" /> ไม่มีระบบอินเทอร์เน็ต
                  </span>
                )}
              </div>
              <div className="text-xs text-blue-950 font-medium pl-8">
                <p>• ประเภทการเชื่อมต่อ: <strong>{school.internet_type || 'ไม่มีระบบอินเทอร์เน็ต'}</strong></p>
              </div>
            </div>

            {/* 3. Water Supply (Teal/Emerald) */}
            <div className="bg-teal-50/70 border-2 border-teal-300 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-teal-900 font-extrabold text-sm">
                  <div className="p-1.5 bg-teal-600 text-white rounded-lg">
                    <Droplets className="w-4 h-4 fill-white" />
                  </div>
                  <span>ระบบน้ำอุปโภคบริโภค (Water Supply)</span>
                </div>
                {isGovWater ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-600 text-white text-xs font-bold rounded-full shadow-xs">
                    <Droplets className="w-3.5 h-3.5 fill-white" /> ประปาหมู่บ้าน / รัฐ
                  </span>
                ) : isMountainWater ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full shadow-xs">
                    <Mountain className="w-3.5 h-3.5" /> ประปาภูเขา / แหล่งน้ำธรรมชาติ
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-700 text-white text-xs font-bold rounded-full shadow-xs">
                    <Droplet className="w-3.5 h-3.5" /> บ่อบาดาล / บ่อน้ำตื้น
                  </span>
                )}
              </div>
              <div className="text-xs text-teal-950 font-medium pl-8">
                <p>• รายละเอียดระบบน้ำ: <strong>{school.water_system_detail || (isGovWater ? 'ระบบประปาหมู่บ้าน/เทศบาล' : isMountainWater ? 'น้ำประปาภูเขา/ตาน้ำธรรมชาติ' : school.water_system || 'ไม่ระบุ')}</strong></p>
              </div>
            </div>
          </div>

          {/* Major Subjects with Staff */}
          <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4">
            <h3 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>วิชาเอกและจำนวนครูผู้สอน</span>
            </h3>
            {school.major_subjects_with_staff && school.major_subjects_with_staff.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {school.major_subjects_with_staff.map((subj, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs shadow-2xs"
                  >
                    <span className="font-bold text-slate-800">{subj.name}</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded-md font-extrabold">
                      {subj.teachersCount} คน
                    </span>
                  </div>
                ))}
              </div>
            ) : school.major_subjects && school.major_subjects.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {school.major_subjects.map((subj, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-white border border-slate-200 text-slate-800 text-xs rounded-lg font-bold shadow-2xs"
                  >
                    {subj}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">ยังไม่มีข้อมูลวิชาเอกของบุคลากร</p>
            )}
          </div>

          {/* Contact Info */}
          {(school.director_phone || school.school_phone) && (
            <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 flex flex-wrap gap-4 text-xs text-slate-700 font-medium">
              {school.director_phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-blue-600" />
                  <span>เบอร์ผู้บริหารสถานศึกษา: <strong className="text-slate-900">{school.director_phone}</strong></span>
                </div>
              )}
              {school.school_phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-indigo-600" />
                  <span>เบอร์ติดต่อโรงเรียน: <strong className="text-slate-900">{school.school_phone}</strong></span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-sm"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
