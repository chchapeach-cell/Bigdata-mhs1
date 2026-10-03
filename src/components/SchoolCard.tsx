import React from 'react';
import { School } from '../types';
import { 
  Building2, 
  Users, 
  Zap, 
  Sun, 
  PowerOff, 
  Wifi, 
  Radio, 
  WifiOff, 
  Droplets, 
  Mountain, 
  Droplet,
  ChevronRight 
} from 'lucide-react';

interface SchoolCardProps {
  school: School;
  onClick: () => void;
}

export const SchoolCard: React.FC<SchoolCardProps> = ({ school, onClick }) => {
  const isSolar = school.electricity === 'solar' || (school.solar_kw && Number(school.solar_kw) > 0);
  const isNormalElectric = school.electricity === true || school.electricity === 'has_electric' || school.electricity === 'normal';

  // Electricity Badge
  const renderElectricityBadge = () => {
    if (isNormalElectric) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-950 rounded-lg text-xs font-bold border border-amber-300 shadow-2xs">
          <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
          <span>ไฟ กฟภ.</span>
        </span>
      );
    }
    if (isSolar) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-950 rounded-lg text-xs font-bold border border-orange-300 shadow-2xs">
          <Sun className="w-3.5 h-3.5 text-orange-600 fill-orange-500" />
          <span>โซลาร์เซลล์ {school.solar_kw ? `${school.solar_kw}kW` : ''}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg text-xs font-bold border border-rose-300 shadow-2xs">
        <PowerOff className="w-3.5 h-3.5 text-rose-600" />
        <span>ไม่มีไฟฟ้า</span>
      </span>
    );
  };

  // Internet Badge
  const renderInternetBadge = () => {
    const net = (school.internet_type || '').toLowerCase();
    if (net.includes('fiber') || net.includes('ใยแก้ว')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-950 rounded-lg text-xs font-bold border border-blue-300 shadow-2xs">
          <Wifi className="w-3.5 h-3.5 text-blue-600" />
          <span>Fiber</span>
        </span>
      );
    }
    if (net.includes('satellite') || net.includes('ดาวเทียม') || net.includes('starlink') || net.includes('mobile') || net.includes('sim')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 text-indigo-950 rounded-lg text-xs font-bold border border-indigo-300 shadow-2xs">
          <Radio className="w-3.5 h-3.5 text-indigo-600" />
          <span>ดาวเทียม/ซิม</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 shadow-2xs">
        <WifiOff className="w-3.5 h-3.5 text-slate-500" />
        <span>ไม่มีเน็ต</span>
      </span>
    );
  };

  // Water Badge
  const renderWaterBadge = () => {
    const w = (school.water_system || '').toLowerCase();
    if (w.includes('gov') || w.includes('ประปาเทศบาล') || w.includes('ประปาหมู่บ้าน') || w.includes('รัฐ')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-100 text-teal-950 rounded-lg text-xs font-bold border border-teal-300 shadow-2xs">
          <Droplets className="w-3.5 h-3.5 text-teal-600 fill-teal-500" />
          <span>ประปารัฐ/หมู่บ้าน</span>
        </span>
      );
    }
    if (w.includes('mountain') || w.includes('ภูเขา') || w.includes('ตาน้ำ')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-950 rounded-lg text-xs font-bold border border-emerald-300 shadow-2xs">
          <Mountain className="w-3.5 h-3.5 text-emerald-700" />
          <span>ประปาภูเขา</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-100 text-cyan-950 rounded-lg text-xs font-bold border border-cyan-300 shadow-2xs">
        <Droplet className="w-3.5 h-3.5 text-cyan-600" />
        <span>บ่อน้ำ/อื่นๆ</span>
      </span>
    );
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl p-4 border-2 border-slate-200 hover:border-blue-500 hover:shadow-lg transition cursor-pointer flex flex-col justify-between group"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="font-mono text-xs font-extrabold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
            รหัส {school.id}
          </span>
          <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
            {school.amphoe}
          </span>
        </div>

        <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition line-clamp-1 mb-1">
          {school.name}
        </h3>

        <p className="text-xs text-slate-500 line-clamp-1 mb-3.5">
          {school.network_group}
        </p>

        {/* Separated & Distinct Category Badges */}
        <div className="space-y-1.5">
          {/* Row 1: Electricity & Internet */}
          <div className="flex flex-wrap items-center gap-1.5">
            {renderElectricityBadge()}
            {renderInternetBadge()}
          </div>

          {/* Row 2: Water & Staff */}
          <div className="flex flex-wrap items-center gap-1.5">
            {renderWaterBadge()}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-100 text-violet-950 rounded-lg text-xs font-bold border border-violet-200 shadow-2xs">
              <Users className="w-3.5 h-3.5 text-violet-700" />
              <span>{school.staff_count} คน</span>
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-700">
        <span>ดูรายละเอียดสารสนเทศ</span>
        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition text-blue-600" />
      </div>
    </div>
  );
};
