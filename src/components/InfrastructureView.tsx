import React, { useState, useMemo } from 'react';
import { School, UserProfile, DownloadLog } from '../types';
import { Zap, Globe, GraduationCap, Building2, MapPin, Search, ChevronRight, CheckCircle2, AlertCircle, Sparkles, Filter, Users, Eye, Download, FileSpreadsheet, FileText, XCircle, CheckSquare, Square, PieChart as PieChartIcon, BarChart3, RotateCcw, Lock, Droplets, AlertTriangle, Clock, History, Map as MapIcon, Flame, Sun, Battery, Activity, Compass, Layers, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import { generatePdfReport } from '../utils/exportPdf';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { dbAddDownloadLog } from '../lib/dbAdapter';
import { getSchoolUpdateBadgeInfo } from '../utils/initialData';
import { Map as PigeonMap, Overlay as PigeonOverlay } from 'pigeon-maps';
import { getAmphoeAndNetwork } from '../utils/geoHelper';

export type InfrastructureQualityLevel = 'optimal' | 'moderate' | 'low' | 'critical';
export type ElectricityStabilityLevel = InfrastructureQualityLevel;
export type HeatmapSystemType = 'electricity' | 'internet' | 'water';

export interface InfrastructureQualityInfo {
  level: InfrastructureQualityLevel;
  score: number;
  title: string;
  shortLabel: string;
  description: string;
  color: string;
  glowColor: string;
  bgClass: string;
  badgeClass: string;
  icon: string;
}

export type ElectricityStabilityInfo = InfrastructureQualityInfo;

export function getElectricityStability(school: School): InfrastructureQualityInfo {
  const elecVal = String(school.electricity ?? '').toLowerCase();
  const hasSolarBat = Boolean(school.hasSolarBattery);
  const solarKw = parseFloat(school.solarKw || '0');

  // 1. วิกฤต / ไม่มีไฟฟ้าถาวร
  if (elecVal === 'none' || elecVal === 'false' || elecVal === '0' || elecVal.includes('ไม่มี') || elecVal.includes('ขาด')) {
    return {
      level: 'critical',
      score: 15,
      title: 'วิกฤต (ไม่มีระบบไฟฟ้า)',
      shortLabel: 'วิกฤต/ไม่มีไฟ',
      description: 'ไม่มีไฟฟ้าสายส่งและโซลาร์เซลล์ กระทบต่อการจัดการเรียนการสอนและเทคโนโลยี',
      color: '#ef4444',
      glowColor: 'rgba(239, 68, 68, 0.65)',
      bgClass: 'bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/40 dark:text-rose-200',
      badgeClass: 'bg-rose-500 text-white',
      icon: '❌'
    };
  }

  // 2. โซลาร์เซลล์
  if (elecVal === 'solar' || elecVal.includes('โซลาร์') || elecVal.includes('solar')) {
    if (hasSolarBat) {
      return {
        level: 'moderate',
        score: 65,
        title: 'เสถียรปานกลาง (โซลาร์เซลล์ + แบตเตอรี่)',
        shortLabel: 'ปานกลาง (โซลาร์+แบต)',
        description: `ระบบโซลาร์เซลล์${solarKw ? ` ${solarKw} kW` : ''} พร้อมแบตเตอรี่สำรอง ใช้งานช่วงค่ำหรือฟ้าปิดได้ชั่วคราว`,
        color: '#eab308',
        glowColor: 'rgba(234, 179, 8, 0.65)',
        bgClass: 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200',
        badgeClass: 'bg-amber-500 text-slate-900',
        icon: '☀️'
      };
    } else {
      return {
        level: 'low',
        score: 40,
        title: 'เสถียรต่ำ (โซลาร์เซลล์ไม่มีแบตเตอรี่สำรอง)',
        shortLabel: 'เสถียรต่ำ (โซลาร์ไร้แบต)',
        description: 'ใช้ไฟได้เฉพาะช่วงแดดออก ในฤดูฝนหรือหมอกหนาไฟฟ้าจะตกหรือดับทันที',
        color: '#f97316',
        glowColor: 'rgba(249, 115, 22, 0.65)',
        bgClass: 'bg-orange-50 text-orange-900 border-orange-300 dark:bg-orange-950/40 dark:text-orange-200',
        badgeClass: 'bg-orange-500 text-white',
        icon: '⚠️'
      };
    }
  }

  // 3. ระบบไฮบริด (สายส่ง + โซลาร์สำรอง)
  if (elecVal === 'hybrid' || elecVal.includes('ผสมผสาน') || elecVal.includes('hybrid')) {
    return {
      level: 'optimal',
      score: 95,
      title: 'เสถียรภาพสูงมาก (ระบบผสมผสาน Hybrid มีไฟสำรอง)',
      shortLabel: 'เสถียรสูง (Hybrid สำรอง)',
      description: 'เชื่อมโยงสายส่งร่วมกับโซลาร์เซลล์/แบตเตอรี่ มีความมั่นคงสูงสุด มีระบบสำรองฉุกเฉิน',
      color: '#10b981',
      glowColor: 'rgba(16, 185, 129, 0.65)',
      bgClass: 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200',
      badgeClass: 'bg-emerald-600 text-white',
      icon: '⚡'
    };
  }

  // 4. ไฟฟ้าสายส่งถาวรจากการไฟฟ้าส่วนภูมิภาค (PEA)
  return {
    level: 'optimal',
    score: 90,
    title: 'เสถียรภาพสูง (ไฟฟ้าสายส่งถาวร PEA)',
    shortLabel: 'เสถียรสูง (สายส่งถาวร)',
    description: 'เชื่อมต่อโครงข่ายไฟฟ้าส่วนภูมิภาค สามารถใช้งานคอมพิวเตอร์และอุปกรณ์ไฟฟ้าได้สม่ำเสมอ',
    color: '#059669',
    glowColor: 'rgba(5, 150, 105, 0.65)',
    bgClass: 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200',
    badgeClass: 'bg-emerald-600 text-white',
    icon: '🔌'
  };
}

export function getInternetQuality(school: School): InfrastructureQualityInfo {
  const netVal = String(school.internet_type || school.internetType || '').toLowerCase().trim();

  // 1. วิกฤต / ไม่มีอินเทอร์เน็ต
  if (!netVal || netVal === 'none' || netVal === 'false' || netVal.includes('ไม่มี') || netVal.includes('ไม่ได้ใช้')) {
    return {
      level: 'critical',
      score: 10,
      title: 'วิกฤต (ไม่มีสัญญาณอินเทอร์เน็ต)',
      shortLabel: 'วิกฤต/ไม่มีเน็ต',
      description: 'ไม่มีการเชื่อมต่อเครือข่ายอินเทอร์เน็ต ขาดการเข้าถึงสื่อการเรียนรู้ดิจิทัลและระบบข้อมูลการศึกษา',
      color: '#ef4444',
      glowColor: 'rgba(239, 68, 68, 0.65)',
      bgClass: 'bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/40 dark:text-rose-200',
      badgeClass: 'bg-rose-500 text-white',
      icon: '❌'
    };
  }

  // 2. ซิมมือถือ 4G/5G (ความเร็วและปริมาณจำกัด)
  if (netVal === 'sim' || netVal.includes('sim') || netVal.includes('ซิม') || netVal.includes('cellular') || netVal.includes('4g') || netVal.includes('5g')) {
    return {
      level: 'low',
      score: 45,
      title: 'จำกัด/ความเร็วต่ำ (เครือข่าย Cellular SIM 4G/5G)',
      shortLabel: 'จำกัด (ซิม 4G/5G)',
      description: 'เชื่อมต่อผ่านเราเตอร์ใส่ซิมมือถือ ขอบข่ายสัญญาณไม่เสถียรตามภูมิประเทศภูเขาและมีข้อจำกัดด้านปริมาณเน็ต',
      color: '#f97316',
      glowColor: 'rgba(249, 115, 22, 0.65)',
      bgClass: 'bg-orange-50 text-orange-900 border-orange-300 dark:bg-orange-950/40 dark:text-orange-200',
      badgeClass: 'bg-orange-500 text-white',
      icon: '📱'
    };
  }

  // 3. ดาวเทียม Satellite / IPSTAR / Starlink
  if (netVal === 'satellite' || netVal.includes('ดาวเทียม') || netVal.includes('sat') || netVal.includes('ipstar') || netVal.includes('starlink')) {
    return {
      level: 'moderate',
      score: 65,
      title: 'เสถียรปานกลาง (สัญญาณดาวเทียม Satellite/IPSTAR)',
      shortLabel: 'ปานกลาง (ดาวเทียม)',
      description: 'เชื่อมต่อผ่านจานรับสัญญาณดาวเทียม เข้าถึงยอดดอยได้ดี แต่อาจสะดุดช่วงฝนตกหนักหรือหมอกหนาทึบ',
      color: '#eab308',
      glowColor: 'rgba(234, 179, 8, 0.65)',
      bgClass: 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200',
      badgeClass: 'bg-amber-500 text-slate-900',
      icon: '🛰️'
    };
  }

  // 4. Fiber Optic
  return {
    level: 'optimal',
    score: 95,
    title: 'เสถียรภาพสูงมาก (สายใยแก้วนำแสง Fiber Optic)',
    shortLabel: 'เสถียรสูง (Fiber Optic)',
    description: 'เชื่อมโยงโครงข่ายสายใยแก้วนำแสงความเร็วสูง แบนด์วิดท์กว้าง เสถียร ไม่สะดุด รองรับการเรียนการสอน DLTV และ Big Data',
    color: '#059669',
    glowColor: 'rgba(5, 150, 105, 0.65)',
    bgClass: 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200',
    badgeClass: 'bg-emerald-600 text-white',
    icon: '🌐'
  };
}

export function getWaterQuality(school: School): InfrastructureQualityInfo {
  const waterVal = String(school.water_system || school.waterSystem || '').toLowerCase().trim();
  const detail = school.water_system_detail || school.waterSystemDetail || '';

  // 1. วิกฤต / ไม่มีน้ำประปา
  if (!waterVal || waterVal === 'none' || waterVal === 'false' || waterVal.includes('ไม่มี') || waterVal.includes('ขาดแคลน')) {
    return {
      level: 'critical',
      score: 15,
      title: 'วิกฤต (ไม่มีแหล่งน้ำประปาประจำ)',
      shortLabel: 'วิกฤต/ไม่มีน้ำใช้',
      description: 'โรงเรียนไม่มีแหล่งน้ำประปาหรือระบบน้ำใช้ที่ถูกสุขอนามัย ต้องรองน้ำฝนหรือพึ่งพารถบรรทุกน้ำแจกจ่ายในฤดูแล้ง',
      color: '#ef4444',
      glowColor: 'rgba(239, 68, 68, 0.65)',
      bgClass: 'bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/40 dark:text-rose-200',
      badgeClass: 'bg-rose-500 text-white',
      icon: '❌'
    };
  }

  // 2. แหล่งน้ำอื่น / บ่อบาดาล / น้ำฝน (เสี่ยงแห้งแล้ง)
  if (waterVal === 'other' || waterVal.includes('อื่น') || waterVal.includes('บาดาล') || waterVal.includes('น้ำฝน')) {
    return {
      level: 'low',
      score: 40,
      title: 'เสี่ยงขาดแคลน (บ่อบาดาล / น้ำฝน / แหล่งน้ำอื่น)',
      shortLabel: 'เสี่ยงขาดแคลน (บ่อ/น้ำฝน)',
      description: detail ? `พึ่งพาแหล่งน้ำเฉพาะ: ${detail} เสี่ยงขาดแคลนช่วงหน้าแล้ง และต้องเฝ้าระวังคุณภาพตะกอนหินปูน` : 'พึ่งพาบ่อขุด บ่อบาดาล หรือการกักเก็บน้ำฝน มักขาดแคลนช่วงฤดูแล้ง',
      color: '#f97316',
      glowColor: 'rgba(249, 115, 22, 0.65)',
      bgClass: 'bg-orange-50 text-orange-900 border-orange-300 dark:bg-orange-950/40 dark:text-orange-200',
      badgeClass: 'bg-orange-500 text-white',
      icon: '⚠️'
    };
  }

  // 3. ประปาภูเขา / น้ำผุด
  if (waterVal === 'mountain' || waterVal.includes('ภูเขา') || waterVal.includes('ผุด') || waterVal.includes('ลำห้วย')) {
    return {
      level: 'moderate',
      score: 65,
      title: 'เสถียรปานกลาง (ระบบประปาภูเขา / ตาน้ำธรรมชาติ)',
      shortLabel: 'ปานกลาง (ประปาภูเขา)',
      description: detail ? `ระบบประปาภูเขา: ${detail} ต่อน้ำจากลำห้วย/ตาน้ำบนดอย มีน้ำใช้ประจำปีแต่อาจขุ่นแดงช่วงฝนตกหนัก` : 'ต่อน้ำจากยอดดอย มีน้ำใช้ตามธรรมชาติ แต่อาจขุ่นแดงช่วงฤดูมรสุมและต้องบำรุงรักษาท่อส่งสม่ำเสมอ',
      color: '#06b6d4',
      glowColor: 'rgba(6, 182, 212, 0.65)',
      bgClass: 'bg-cyan-50 text-cyan-900 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-200',
      badgeClass: 'bg-cyan-600 text-white',
      icon: '🏔️'
    };
  }

  // 4. ประปาภาครัฐ / กปภ. / เทศบาล
  return {
    level: 'optimal',
    score: 90,
    title: 'คุณภาพสูง (ประปาภาครัฐ / กปภ. / ท้องถิ่น)',
    shortLabel: 'คุณภาพสูง (ประปาภาครัฐ)',
    description: 'เชื่อมต่อโครงข่ายประปาส่วนภูมิภาคหรือประปาเทศบาล/อบต. มีระบบกรองฆ่าเชื้อมาตรฐาน น้ำไหลสม่ำเสมอและถูกสุขอนามัย',
    color: '#0284c7',
    glowColor: 'rgba(2, 132, 199, 0.65)',
    bgClass: 'bg-sky-50 text-sky-900 border-sky-300 dark:bg-sky-950/40 dark:text-sky-200',
    badgeClass: 'bg-sky-600 text-white',
    icon: '🚰'
  };
}

export function getInfrastructureQuality(school: School, system: HeatmapSystemType): InfrastructureQualityInfo {
  if (system === 'internet') return getInternetQuality(school);
  if (system === 'water') return getWaterQuality(school);
  return getElectricityStability(school);
}

interface InfrastructureViewProps {
  schools: School[];
  onSelectSchool: (schoolId: string) => void;
  systemConfig?: {
    allowDataDownload?: boolean;
    restrictOneAdminPerSchool?: boolean;
    allowSchoolAdminRegistration?: boolean;
    electricityOptions?: { id: string; label: string }[];
    internetOptions?: { id: string; label: string }[];
    waterSystemOptions?: { id: string; label: string }[];
  };
  userProfile?: UserProfile | null;
}

export default function InfrastructureView({
  schools,
  onSelectSchool,
  systemConfig,
  userProfile
}: InfrastructureViewProps) {
  // เมนูย่อยในหน้าโครงสร้างพื้นฐาน
  const [showCharts, setShowCharts] = useState<boolean>(true);

  // สถานะแผนที่และระบบ Heatmap ความเสถียรไฟฟ้า/อินเทอร์เน็ต/น้ำประปา
  const [showMap, setShowMap] = useState<boolean>(true); // ปุ่มเปิด/ปิดการแสดงผลส่วนแผนที่
  const [isHeatmapActive, setIsHeatmapActive] = useState<boolean>(true); // ปุ่มเปิด/ปิดระบบ Heatmap Color-Coding
  const [isMobileMapInteractive, setIsMobileMapInteractive] = useState<boolean>(false); // ป้องกัน Map Scroll Trap บนมือถือ
  const [heatmapSystem, setHeatmapSystem] = useState<HeatmapSystemType>('electricity'); // สลับระบบ: ไฟฟ้า, อินเทอร์เน็ต, น้ำประปา
  const [selectedMapSchoolId, setSelectedMapSchoolId] = useState<string | null>(null);
  const [stabilityFilter, setStabilityFilter] = useState<'all' | InfrastructureQualityLevel>('all');
  const [mapCenter, setMapCenter] = useState<[number, number]>([19.3021, 97.9654]);
  const [mapZoom, setMapZoom] = useState<number>(9);

  // รายการตัวเลือกไฟฟ้า อินเทอร์เน็ต และระบบประปา dynamic จาก systemConfig
  const electricityTypeList = useMemo(() => {
    if (systemConfig?.electricityOptions && systemConfig.electricityOptions.length > 0) {
      return systemConfig.electricityOptions;
    }
    return [
      { id: 'has_electric', label: '🔌 ไฟฟ้าถาวร' },
      { id: 'solar', label: '☀️ โซลาร์เซลล์' },
      { id: 'hybrid', label: '⚡☀️ ผสมผสาน' },
      { id: 'none', label: '❌ ไม่มีไฟฟ้า' },
    ];
  }, [systemConfig?.electricityOptions]);

  const internetTypeList = useMemo(() => {
    if (systemConfig?.internetOptions && systemConfig.internetOptions.length > 0) {
      return systemConfig.internetOptions;
    }
    return [
      { id: 'fiber', label: '🌐 Fiber' },
      { id: 'satellite', label: '🛰️ ดาวเทียม' },
      { id: 'sim', label: '📱 SIM 4G' },
      { id: 'none', label: '❌ ไม่มีเน็ต' },
    ];
  }, [systemConfig?.internetOptions]);

  const waterTypeList = useMemo(() => {
    if (systemConfig?.waterSystemOptions && systemConfig.waterSystemOptions.length > 0) {
      return systemConfig.waterSystemOptions;
    }
    return [
      { id: 'government', label: '🚰 ประปาภาครัฐ' },
      { id: 'mountain', label: '🏔️ ประปาภูเขา' },
      { id: 'none', label: '❌ ไม่มีน้ำใช้' },
      { id: 'other', label: '📌 อื่นๆ' },
    ];
  }, [systemConfig?.waterSystemOptions]);

  // สิทธิ์ในการดาวน์โหลดข้อมูล
  const canDownload = systemConfig?.allowDataDownload !== false;

  // ตัวกรองระบบไฟฟ้า: include = เอาเฉพาะประเภทที่เลือก, exclude = ไม่เอา / ยกเว้นประเภทที่เลือก
  const [electricMode, setElectricMode] = useState<'include' | 'exclude'>('include');
  const [electricSelected, setElectricSelected] = useState<string[]>(['has_electric', 'solar', 'hybrid', 'none']);

  // ตัวกรองอินเทอร์เน็ต: include = เอาเฉพาะ, exclude = ไม่เอา
  const [internetMode, setInternetMode] = useState<'include' | 'exclude'>('include');
  const [internetSelected, setInternetSelected] = useState<string[]>(['fiber', 'satellite', 'sim', 'none']);

  // ตัวกรองประปา/แหล่งน้ำ: include = เอาเฉพาะ, exclude = ไม่เอา
  const [waterMode, setWaterMode] = useState<'include' | 'exclude'>('include');
  const [waterSelected, setWaterSelected] = useState<string[]>(['government', 'mountain', 'none', 'other']);

  // ตัวกรองครูวิชาเอก: has = มีวิชาเอกนี้, lacks = ไม่มี/ขาดวิชาเอกนี้
  const [majorMode, setMajorMode] = useState<'has' | 'lacks'>('has');
  const [selectedMajor, setSelectedMajor] = useState<string>('all');

  // ตัวกรองอำเภอ
  const [amphoeFilter, setAmphoeFilter] = useState<string>('all');

  // ตัวกรองขนาดโรงเรียน
  const [sizeFilter, setSizeFilter] = useState<string>('all');

  // คำค้นหา
  const [searchTerm, setSearchTerm] = useState('');

  // รวมอำเภอทั้งหมดที่มีในข้อมูล
  const availableAmphoes = useMemo(() => {
    const amphoes = new Set<string>();
    schools.forEach(s => {
      if (s.amphoe) amphoes.add(s.amphoe);
    });
    return Array.from(amphoes).sort();
  }, [schools]);

  // รวมครูวิชาเอกที่มีในระบบ
  const availableMajors = useMemo(() => {
    const setMajors = new Set<string>([
      'ภาษาไทย', 'คณิตศาสตร์', 'ภาษาอังกฤษ', 'วิทยาศาสตร์', 'คอมพิวเตอร์',
      'ปฐมวัย', 'สังคมศึกษา', 'พลศึกษา', 'ศิลปะ', 'การงานอาชีพ'
    ]);
    schools.forEach(s => {
      s.majorSubjects?.forEach(m => m && setMajors.add(m.trim()));
      s.majorSubjectsWithStaff?.forEach(ms => ms.name && setMajors.add(ms.name.trim()));
    });
    return Array.from(setMajors);
  }, [schools]);

  // สลับการเลือก Checkbox ในไฟฟ้า
  const toggleElectricType = (typeKey: string) => {
    const allKeys = electricityTypeList.map(i => i.id);
    setElectricSelected(prev => {
      // 1. ถ้าเลือกครบทุกประเภทอยู่แล้ว ( Default ) แล้วกดเลือก 1 ประเภท -> ให้เลือกเฉพาะประเภทนั้นทันที
      if (prev.length === allKeys.length) {
        return [typeKey];
      }
      // 2. ถ้าเลือกประเภทนี้อยู่รายการเดียว แล้วกดซ้ำอีกครั้ง -> ให้กลับไปเลือกทั้งหมด
      if (prev.length === 1 && prev.includes(typeKey)) {
        return allKeys;
      }
      // 3. สลับการเลือกปกติ
      if (prev.includes(typeKey)) {
        return prev.filter(k => k !== typeKey);
      } else {
        return [...prev, typeKey];
      }
    });
  };

  const selectAllElectric = () => {
    setElectricSelected(electricityTypeList.map(i => i.id));
  };

  const clearElectric = () => {
    setElectricSelected([]);
  };

  // สลับการเลือก Checkbox ในเน็ต
  const toggleInternetType = (typeKey: string) => {
    const allKeys = internetTypeList.map(i => i.id);
    setInternetSelected(prev => {
      // 1. ถ้าเลือกครบทุกประเภทอยู่แล้ว แล้วกดเลือก 1 ประเภท -> ให้เลือกเฉพาะประเภทนั้นทันที
      if (prev.length === allKeys.length) {
        return [typeKey];
      }
      // 2. ถ้าเลือกประเภทนี้อยู่รายการเดียว แล้วกดซ้ำอีกครั้ง -> ให้กลับไปเลือกทั้งหมด
      if (prev.length === 1 && prev.includes(typeKey)) {
        return allKeys;
      }
      // 3. สลับการเลือกปกติ
      if (prev.includes(typeKey)) {
        return prev.filter(k => k !== typeKey);
      } else {
        return [...prev, typeKey];
      }
    });
  };

  const selectAllInternet = () => {
    setInternetSelected(internetTypeList.map(i => i.id));
  };

  const clearInternet = () => {
    setInternetSelected([]);
  };

  const toggleWaterType = (typeKey: string) => {
    const allKeys = waterTypeList.map(w => w.id);
    setWaterSelected(prev => {
      if (prev.length === allKeys.length) {
        return [typeKey];
      }
      if (prev.length === 1 && prev.includes(typeKey)) {
        return allKeys;
      }
      if (prev.includes(typeKey)) {
        return prev.filter(k => k !== typeKey);
      } else {
        return [...prev, typeKey];
      }
    });
  };

  const selectAllWater = () => {
    setWaterSelected(waterTypeList.map(w => w.id));
  };

  const clearWater = () => {
    setWaterSelected([]);
  };

  // ล้างตัวกรองทั้งหมด
  const handleResetFilters = () => {
    setElectricMode('include');
    setElectricSelected(['has_electric', 'solar', 'hybrid', 'none']);
    setInternetMode('include');
    setInternetSelected(['fiber', 'satellite', 'sim', 'none']);
    setWaterMode('include');
    setWaterSelected(['government', 'mountain', 'none', 'other']);
    setMajorMode('has');
    setSelectedMajor('all');
    setAmphoeFilter('all');
    setSizeFilter('all');
    setSearchTerm('');
  };

  // กรองโรงเรียนตามเงื่อนไขทั้งหมด (รองรับ เลือกเอา / ไม่เอา)
  const filteredSchools = useMemo(() => {
    return schools.filter(school => {
      // 1. ค้นหาด้วยชื่อหรือรหัส
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = school.name.toLowerCase().includes(term);
        const matchesId = school.id.includes(term);
        if (!matchesName && !matchesId) return false;
      }

      // 2. อำเภอ (รองรับทั้ง 'เมือง' และ 'เมืองแม่ฮ่องสอน')
      if (amphoeFilter !== 'all') {
        const schAmp = school.amphoe || '';
        const isMatch = schAmp === amphoeFilter ||
          ((amphoeFilter === 'เมือง' || amphoeFilter === 'เมืองแม่ฮ่องสอน') && (schAmp === 'เมือง' || schAmp === 'เมืองแม่ฮ่องสอน' || schAmp.includes('เมือง')));
        if (!isMatch) return false;
      }

      // 3. ขนาดโรงเรียน
      if (sizeFilter !== 'all' && school.size !== sizeFilter) {
        return false;
      }

      // 4. ไฟฟ้า (รองรับ Include / Exclude)
      let schoolElecKey = 'has_electric';
      const elecVal = String(school.electricity ?? '').toLowerCase();
      if (elecVal === 'solar' || elecVal.includes('โซลาร์') || elecVal.includes('solar')) {
        schoolElecKey = 'solar';
      } else if (elecVal === 'hybrid' || elecVal.includes('ผสมผสาน') || elecVal.includes('hybrid')) {
        schoolElecKey = 'hybrid';
      } else if (elecVal === 'none' || elecVal === 'false' || elecVal.includes('ไม่มี') || elecVal.includes('ขาด')) {
        schoolElecKey = 'none';
      } else {
        schoolElecKey = 'has_electric';
      }

      if (electricMode === 'include') {
        if (electricSelected.length === 0) return false;
        if (!electricSelected.includes(schoolElecKey)) return false;
      } else {
        if (electricSelected.includes(schoolElecKey)) return false;
      }

      // 5. อินเทอร์เน็ต (รองรับ Include / Exclude)
      let schoolNetKey = 'fiber';
      const netVal = String(school.internetType ?? '').toLowerCase();
      if (netVal.includes('satellite') || netVal.includes('ดาวเทียม') || netVal.includes('sat')) {
        schoolNetKey = 'satellite';
      } else if (netVal.includes('sim') || netVal.includes('ซิม') || netVal.includes('4g') || netVal.includes('5g')) {
        schoolNetKey = 'sim';
      } else if (netVal.includes('none') || netVal.includes('ไม่มี') || netVal.includes('ไม่ได้ใช้')) {
        schoolNetKey = 'none';
      } else {
        schoolNetKey = 'fiber';
      }

      if (internetMode === 'include') {
        if (internetSelected.length === 0) return false;
        if (!internetSelected.includes(schoolNetKey)) return false;
      } else {
        if (internetSelected.includes(schoolNetKey)) return false;
      }

      // 6. ระบบประปา/น้ำ (รองรับ Include / Exclude)
      let schoolWaterKey = 'government';
      const waterVal = String(school.waterSystem ?? '').toLowerCase();
      if (waterVal.includes('mountain') || waterVal.includes('ภูเขา')) {
        schoolWaterKey = 'mountain';
      } else if (waterVal.includes('none') || waterVal.includes('ไม่มี')) {
        schoolWaterKey = 'none';
      } else if (waterVal.includes('other') || waterVal.includes('อื่นๆ')) {
        schoolWaterKey = 'other';
      } else {
        schoolWaterKey = 'government';
      }

      if (waterMode === 'include') {
        if (waterSelected.length === 0) return false;
        if (!waterSelected.includes(schoolWaterKey)) return false;
      } else {
        if (waterSelected.includes(schoolWaterKey)) return false;
      }

      // 7. ครูวิชาเอก (รองรับ มีวิชาเอกนี้ vs ขาด/ไม่มีวิชาเอกนี้)
      if (selectedMajor !== 'all') {
        const hasStr = school.majorSubjects && school.majorSubjects.some(m => m.includes(selectedMajor));
        const hasObj = school.majorSubjectsWithStaff && school.majorSubjectsWithStaff.some(ms => ms.name.includes(selectedMajor) && ms.teachersCount > 0);
        const hasMajor = hasStr || hasObj;

        if (majorMode === 'has') {
          if (!hasMajor) return false;
        } else {
          // lacks (ไม่มี/ขาดครูวิชาเอกนี้)
          if (hasMajor) return false;
        }
      }

      return true;
    });
  }, [schools, searchTerm, amphoeFilter, sizeFilter, electricMode, electricSelected, internetMode, internetSelected, waterMode, waterSelected, selectedMajor, majorMode]);

  // สถิติคุณภาพระบบสำหรับระบบ GIS Heatmap Visualization (ไฟฟ้า / อินเทอร์เน็ต / น้ำประปา)
  const stabilityStats = useMemo(() => {
    let optimal = 0;
    let moderate = 0;
    let low = 0;
    let critical = 0;

    schools.forEach(s => {
      const info = getInfrastructureQuality(s, heatmapSystem);
      if (info.level === 'optimal') optimal++;
      else if (info.level === 'moderate') moderate++;
      else if (info.level === 'low') low++;
      else if (info.level === 'critical') critical++;
    });

    const total = schools.length || 1;
    return {
      total: schools.length,
      optimal,
      moderate,
      low,
      critical,
      optimalPercent: ((optimal / total) * 100).toFixed(1),
      moderatePercent: ((moderate / total) * 100).toFixed(1),
      lowPercent: ((low / total) * 100).toFixed(1),
      criticalPercent: ((critical / total) * 100).toFixed(1),
    };
  }, [schools, heatmapSystem]);

  // กรองโรงเรียนที่จะแสดงบนแผนที่ตามสถานะคุณภาพระบบที่เลือกและตัวกรองทั่วไป
  const mapSchools = useMemo(() => {
    return filteredSchools.filter(school => {
      if (stabilityFilter === 'all') return true;
      const info = getInfrastructureQuality(school, heatmapSystem);
      return info.level === stabilityFilter;
    });
  }, [filteredSchools, stabilityFilter, heatmapSystem]);

  // โรงเรียนที่ถูกคลิกเลือกในแผนที่
  const selectedMapSchool = useMemo(() => {
    if (!selectedMapSchoolId) return null;
    return schools.find(s => s.id === selectedMapSchoolId) || null;
  }, [schools, selectedMapSchoolId]);

  // คำนวณสถิติสำหรับสร้างกราฟ visualizer ตามข้อมูลที่กรองแล้ว
  const chartData = useMemo(() => {
    // 1. ระบบไฟฟ้า
    let elecHas = 0, elecSolar = 0, elecHybrid = 0, elecNone = 0;
    // 2. ระบบเน็ต
    let netFiber = 0, netSat = 0, netSim = 0, netNone = 0;
    // 3. ระบบประปา/น้ำ
    let waterGov = 0, waterMountain = 0, waterNone = 0, waterOther = 0;
    // 4. สถิติอำเภอ
    const amphoeMap: { [key: string]: { total: number; elecHas: number; elecSolar: number; elecHybrid: number; elecNone: number; netFiber: number; netSat: number; netSim: number; netNone: number; waterGov: number; waterMountain: number; waterNone: number; waterOther: number } } = {};

    filteredSchools.forEach(s => {
      // Elec
      let eType = 'has';
      if (s.electricity === 'solar') { elecSolar++; eType = 'solar'; }
      else if (s.electricity === 'hybrid') { elecHybrid++; eType = 'hybrid'; }
      else if (s.electricity === 'none' || s.electricity === false) { elecNone++; eType = 'none'; }
      else { elecHas++; }

      // Net
      let nType = 'fiber';
      if (s.internetType === 'satellite') { netSat++; nType = 'sat'; }
      else if (s.internetType === 'sim') { netSim++; nType = 'sim'; }
      else if (s.internetType === 'none') { netNone++; nType = 'none'; }
      else { netFiber++; }

      // Water
      let wType = 'government';
      const wVal = String(s.waterSystem ?? '').toLowerCase();
      if (wVal.includes('mountain') || wVal.includes('ภูเขา')) { waterMountain++; wType = 'mountain'; }
      else if (wVal.includes('none') || wVal.includes('ไม่มี')) { waterNone++; wType = 'none'; }
      else if (wVal.includes('other') || wVal.includes('อื่นๆ')) { waterOther++; wType = 'other'; }
      else { waterGov++; wType = 'government'; }

      // Amphoe
      const amp = s.amphoe || 'เมืองแม่ฮ่องสอน';
      if (!amphoeMap[amp]) {
        amphoeMap[amp] = { total: 0, elecHas: 0, elecSolar: 0, elecHybrid: 0, elecNone: 0, netFiber: 0, netSat: 0, netSim: 0, netNone: 0, waterGov: 0, waterMountain: 0, waterNone: 0, waterOther: 0 };
      }
      amphoeMap[amp].total++;
      if (eType === 'solar') amphoeMap[amp].elecSolar++;
      else if (eType === 'hybrid') amphoeMap[amp].elecHybrid++;
      else if (eType === 'none') amphoeMap[amp].elecNone++;
      else amphoeMap[amp].elecHas++;

      if (nType === 'sat') amphoeMap[amp].netSat++;
      else if (nType === 'sim') amphoeMap[amp].netSim++;
      else if (nType === 'none') amphoeMap[amp].netNone++;
      else amphoeMap[amp].netFiber++;

      if (wType === 'mountain') amphoeMap[amp].waterMountain++;
      else if (wType === 'none') amphoeMap[amp].waterNone++;
      else if (wType === 'other') amphoeMap[amp].waterOther++;
      else amphoeMap[amp].waterGov++;
    });

    const totalCount = filteredSchools.length || 1;

    const elecPie = [
      { name: '🔌 ไฟฟ้าถาวร', value: elecHas, percent: ((elecHas / totalCount) * 100).toFixed(1), color: '#F59E0B' },
      { name: '☀️ โซลาร์เซลล์', value: elecSolar, percent: ((elecSolar / totalCount) * 100).toFixed(1), color: '#FACC15' },
      { name: '⚡☀️ ผสมผสาน', value: elecHybrid, percent: ((elecHybrid / totalCount) * 100).toFixed(1), color: '#D97706' },
      { name: '❌ ไม่มีไฟฟ้า', value: elecNone, percent: ((elecNone / totalCount) * 100).toFixed(1), color: '#EAB308' },
    ].filter(d => d.value > 0);

    const netPie = [
      { name: '🌐 Fiber Optic', value: netFiber, percent: ((netFiber / totalCount) * 100).toFixed(1), color: '#0284C7' },
      { name: '🛰️ ดาวเทียม', value: netSat, percent: ((netSat / totalCount) * 100).toFixed(1), color: '#38BDF8' },
      { name: '📱 SIM 4G/5G', value: netSim, percent: ((netSim / totalCount) * 100).toFixed(1), color: '#60A5FA' },
      { name: '❌ ไม่มีเน็ต', value: netNone, percent: ((netNone / totalCount) * 100).toFixed(1), color: '#0EA5E9' },
    ].filter(d => d.value > 0);

    const waterPie = [
      { name: '🚰 ประปาภาครัฐ', value: waterGov, percent: ((waterGov / totalCount) * 100).toFixed(1), color: '#2563EB' },
      { name: '🏔️ ประปาภูเขา', value: waterMountain, percent: ((waterMountain / totalCount) * 100).toFixed(1), color: '#0284C7' },
      { name: '❌ ไม่มีน้ำใช้', value: waterNone, percent: ((waterNone / totalCount) * 100).toFixed(1), color: '#EF4444' },
      { name: '📌 อื่นๆ', value: waterOther, percent: ((waterOther / totalCount) * 100).toFixed(1), color: '#8B5CF6' },
    ].filter(d => d.value > 0);

    const amphoeBar = Object.keys(amphoeMap).map(amp => ({
      name: amp.replace('อำเภอ', 'อ.'),
      'ไฟฟ้าถาวร': amphoeMap[amp].elecHas,
      'โซลาร์/ผสมผสาน': amphoeMap[amp].elecSolar + amphoeMap[amp].elecHybrid,
      'ไม่มีไฟฟ้า': amphoeMap[amp].elecNone,
      'Fiber Optic': amphoeMap[amp].netFiber,
      'ดาวเทียม/SIM': amphoeMap[amp].netSat + amphoeMap[amp].netSim,
      'ไม่มีเน็ต': amphoeMap[amp].netNone,
      total: amphoeMap[amp].total
    })).sort((a, b) => b.total - a.total);

    return {
      elecPie,
      netPie,
      waterPie,
      amphoeBar,
      elecHas,
      elecSolar,
      elecHybrid,
      elecNone,
      netFiber,
      netSat,
      netSim,
      netNone,
      waterGov,
      waterMountain,
      waterNone,
      waterOther,
      total: filteredSchools.length
    };
  }, [filteredSchools]);

  // สถานะเปิด/ปิด Modal บันทึกวัตถุประสงค์ก่อนดาวน์โหลด
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);
  const [downloadFormat, setDownloadFormat] = useState<'excel' | 'pdf' | 'csv'>('excel');
  const [downloadName, setDownloadName] = useState<string>('');
  const [downloadEmail, setDownloadEmail] = useState<string>('');
  const [downloadPurpose, setDownloadPurpose] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<string>('');

  const handleOpenDownloadModal = (format: 'excel' | 'pdf' | 'csv') => {
    if (!canDownload) {
      alert('การดาวน์โหลดข้อมูลถูกปิดใช้งานชั่วคราวโดย Super Admin');
      return;
    }
    if (filteredSchools.length === 0) {
      alert('ไม่มีข้อมูลโรงเรียนสำหรับดาวน์โหลด');
      return;
    }
    setDownloadFormat(format);
    if (userProfile) {
      const fullName = userProfile.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : '';
      setDownloadName(fullName || userProfile.email || '');
      setDownloadEmail(userProfile.email || '');
    }
    setDownloadError('');
    setIsDownloadModalOpen(true);
  };

  // ฟังก์ชันส่งออกเป็นไฟล์ Excel
  const executeExportExcel = () => {
    const excelData = filteredSchools.map((s, idx) => {
      let elecText = 'มีไฟฟ้าถาวร';
      if (s.electricity === 'solar') elecText = 'ใช้โซลาร์เซลล์';
      else if (s.electricity === 'hybrid') elecText = 'ระบบผสมผสาน (สายส่ง+โซลาร์)';
      else if (s.electricity === 'none' || s.electricity === false) elecText = 'ไม่มีไฟฟ้าใช้งาน';

      let netText = 'ไฟเบอร์ออพติก (Fiber)';
      if (s.internetType === 'satellite') netText = 'อินเทอร์เน็ตดาวเทียม';
      else if (s.internetType === 'sim') netText = 'ซิมการ์ด 4G/5G';
      else if (s.internetType === 'none') netText = 'ไม่มีอินเทอร์เน็ต';

      let waterText = 'น้ำประปาภาครัฐ';
      const wVal = String(s.waterSystem ?? '').toLowerCase();
      if (wVal.includes('mountain') || wVal.includes('ภูเขา')) waterText = 'น้ำประปาภูเขา';
      else if (wVal.includes('none') || wVal.includes('ไม่มี')) waterText = 'ไม่มีน้ำใช้';
      else if (wVal.includes('other') || wVal.includes('อื่นๆ')) waterText = `อื่นๆ ${s.waterSystemDetail ? `(${s.waterSystemDetail})` : ''}`;

      const majorsText = s.majorSubjects?.length 
        ? s.majorSubjects.join(', ')
        : s.majorSubjectsWithStaff?.map(m => `เอก${m.name}(${m.teachersCount}คน)`).join(', ') || 'ไม่ระบุ';

      let sizeText = 'โรงเรียนขนาดเล็ก';
      if (s.size === 'medium') sizeText = 'โรงเรียนขนาดกลาง';
      else if (s.size === 'large' || s.size === 'special_large') sizeText = 'โรงเรียนขนาดใหญ่';

      return {
        'ลำดับ': idx + 1,
        'รหัสโรงเรียน': s.id,
        'ชื่อโรงเรียน': s.name,
        'อำเภอ': s.amphoe || 'เมืองแม่ฮ่องสอน',
        'กลุ่มเครือข่าย': s.networkGroup || '-',
        'ขนาดโรงเรียน': sizeText,
        'ขยายโอกาส': s.isExpansion ? 'ใช่ (ม.1-ม.3)' : 'ไม่ขยายโอกาส',
        'ระบบไฟฟ้า': elecText,
        'ระบบอินเทอร์เน็ต': netText,
        'ระบบน้ำประปา': waterText,
        'ครูวิชาเอกที่มี': majorsText,
        'จำนวนครู/บุคลากร': s.staffCount || 0,
        'เบอร์ติดต่อผู้บริหาร': s.directorPhone || '-',
        'เบอร์โรงเรียน': s.schoolPhone || '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'โครงสร้างพื้นฐาน');
    
    // Auto fit column widths
    const maxWidths = [6, 12, 28, 16, 20, 16, 14, 25, 25, 22, 30, 16, 18, 18];
    worksheet['!cols'] = maxWidths.map(w => ({ wch: w }));

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Infrastructure_MHS1_${dateStr}.xlsx`);
  };

  // ฟังก์ชันดาวน์โหลด CSV
  const executeExportCSV = () => {
    const headers = ['ลำดับ', 'รหัสโรงเรียน', 'ชื่อโรงเรียน', 'อำเภอ', 'ระบบไฟฟ้า', 'ระบบอินเทอร์เน็ต', 'ระบบน้ำประปา', 'ครูวิชาเอก', 'บุคลากร'];
    const rows = filteredSchools.map((s, idx) => {
      let waterText = 'ประปาภาครัฐ';
      const wVal = String(s.waterSystem ?? '').toLowerCase();
      if (wVal.includes('mountain') || wVal.includes('ภูเขา')) waterText = 'ประปาภูเขา';
      else if (wVal.includes('none') || wVal.includes('ไม่มี')) waterText = 'ไม่มีน้ำใช้';
      else if (wVal.includes('other') || wVal.includes('อื่นๆ')) waterText = 'อื่นๆ';

      return [
        idx + 1,
        s.id,
        `"${s.name}"`,
        `"${s.amphoe || ''}"`,
        `"${s.electricity === 'solar' ? 'โซลาร์เซลล์' : s.electricity === 'hybrid' ? 'ผสมผสาน' : s.electricity === 'none' ? 'ไม่มีไฟฟ้า' : 'ไฟฟ้าถาวร'}"`,
        `"${s.internetType === 'satellite' ? 'ดาวเทียม' : s.internetType === 'sim' ? 'SIM 4G' : s.internetType === 'none' ? 'ไม่มีเน็ต' : 'Fiber'}"`,
        `"${waterText}"`,
        `"${s.majorSubjects?.join(' ') || ''}"`,
        s.staffCount || 0
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Infrastructure_MHS1_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ฟังก์ชันดาวน์โหลด PDF
  const executeExportPdf = async () => {
    const headers = ['ลำดับ', 'รหัสโรงเรียน', 'ชื่อโรงเรียน', 'อำเภอ', 'ระบบไฟฟ้า', 'เน็ต', 'ครูวิชาเอก', 'บุคลากร'];
    const rows = filteredSchools.map((s, idx) => {
      let elecText = 'มีไฟฟ้าถาวร';
      if (s.electricity === 'solar') elecText = 'โซลาร์เซลล์';
      else if (s.electricity === 'hybrid') elecText = 'ผสมผสาน';
      else if (s.electricity === 'none' || s.electricity === false) elecText = 'ไม่มีไฟฟ้า';

      let netText = 'Fiber';
      if (s.internetType === 'satellite') netText = 'ดาวเทียม';
      else if (s.internetType === 'sim') netText = 'SIM 4G';
      else if (s.internetType === 'none') netText = 'ไม่มีเน็ต';

      const majorsText = s.majorSubjects?.length 
        ? s.majorSubjects.join(', ')
        : s.majorSubjectsWithStaff?.map(m => `เอก${m.name}`).join(', ') || '-';

      return [
        idx + 1,
        s.id,
        s.name,
        s.amphoe || 'เมืองแม่ฮ่องสอน',
        elecText,
        netText,
        majorsText,
        `${s.staffCount || 0} คน`
      ];
    });

    const dateStr = new Date().toISOString().split('T')[0];
    await generatePdfReport({
      title: 'รายงานข้อมูลโครงสร้างพื้นฐานและครูวิชาเอก',
      subtitle: `จำนวนโรงเรียน ${filteredSchools.length} แห่ง (สพป.แม่ฮ่องสอน เขต 1)`,
      headers,
      rows,
      filename: `Infrastructure_MHS1_${dateStr}.pdf`,
      requesterInfo: {
        name: downloadName,
        email: downloadEmail,
        purpose: downloadPurpose
      }
    });
  };

  // กดยืนยันบันทึกวัตถุประสงค์และดำเนินการดาวน์โหลด
  const handleConfirmDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!downloadName.trim()) {
      setDownloadError('กรุณากรอกชื่อ-นามสกุลผู้ขอเข้าถึงข้อมูล');
      return;
    }
    if (!downloadEmail.trim()) {
      setDownloadError('กรุณากรอกอีเมลติดต่อ');
      return;
    }
    if (downloadPurpose.trim().length < 8) {
      setDownloadError('กรุณาระบุวัตถุประสงค์การนำข้อมูลไปใช้โดยละเอียดอย่างน้อย 8 ตัวอักษร');
      return;
    }

    setIsDownloading(true);
    setDownloadError('');

    try {
      // 1. บันทึกข้อมูลประวัติลงใน Firestore (audit trail download_logs)
      const logData: DownloadLog = {
        name: downloadName,
        email: downloadEmail,
        schoolId: 'infrastructure_report',
        schoolName: `รายงานโครงสร้างพื้นฐาน (${filteredSchools.length} โรงเรียน)`,
        purpose: downloadPurpose,
        timestamp: new Date()
      };

      try {
        await dbAddDownloadLog(logData);
      } catch (err) {
        console.error('Database operation failed');
      }

      // 2. ส่งออกไฟล์ตามชนิดที่เลือก
      if (downloadFormat === 'excel') {
        executeExportExcel();
      } else if (downloadFormat === 'csv') {
        executeExportCSV();
      } else if (downloadFormat === 'pdf') {
        await executeExportPdf();
      }

      setIsDownloadModalOpen(false);
      setDownloadPurpose('');
    } catch (err) {
      console.error('Download error:', err);
      setDownloadError('เกิดข้อผิดพลาดในการดาวน์โหลดข้อมูล');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* Header Banner & Mode Switcher */}
      <div className="card p-4 sm:p-6 bg-gradient-to-br from-[#FFF9F5] via-[#FFF0E6] to-[#FFE3D6] dark:from-[#1e1518] dark:via-[#2b1c20] dark:to-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[4px_4px_0px_#33272A] dark:shadow-[4px_4px_0px_#FFD3B6]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#FF8BA7] text-[#33272A] text-xs font-black border border-[#33272A] mb-1.5 shadow-[2px_2px_0px_#33272A]">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>ศูนย์กรองข้อมูลโครงสร้างพื้นฐาน</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-[#33272A] dark:text-[#FFF9F5]">
              โครงสร้างพื้นฐาน & ครูวิชาเอก
            </h1>
            <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 mt-1">
              เลือกกรองเฉพาะข้อมูลที่ต้องการ หรือยกเว้นข้อมูลที่ไม่ต้องการ แล้วส่งออกเป็นไฟล์ Excel หรือดูภาพรวมกราฟสถิติได้ทันที
            </p>
          </div>

          {/* Action Buttons: Export Excel & View Switcher */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenDownloadModal('excel')}
              className="btn-cute bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-black text-xs px-3.5 py-2 flex items-center gap-1.5 border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 shrink-0" />
              <span>Excel ({filteredSchools.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenDownloadModal('pdf')}
              className="btn-cute bg-[#FF8BA7] hover:bg-rose-300 text-[#33272A] font-black text-xs px-3.5 py-2 flex items-center gap-1.5 border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] cursor-pointer"
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span>PDF ({filteredSchools.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenDownloadModal('csv')}
              className="btn-cute bg-sky-300 hover:bg-sky-200 text-sky-950 font-black text-xs px-3 py-2 flex items-center gap-1.5 border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] cursor-pointer"
            >
              <Download className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            {/* Switch view mode tab */}
            <button
              type="button"
              onClick={() => setShowCharts(!showCharts)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] ${
                showCharts
                  ? 'bg-[#A0E7E5] text-[#33272A]'
                  : 'bg-white dark:bg-[#150e10] text-slate-700 dark:text-slate-200'
              }`}
            >
              <PieChartIcon className="h-4 w-4 shrink-0" />
              <span>{showCharts ? '📊 ซ่อนกราฟภาพรวม' : '📊 แสดงกราฟภาพรวม'}</span>
            </button>

            {/* Toggle Heatmap Map Section */}
            <button
              type="button"
              onClick={() => setShowMap(!showMap)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] ${
                showMap
                  ? 'bg-amber-300 text-amber-950 ring-1 ring-amber-400'
                  : 'bg-white dark:bg-[#150e10] text-slate-700 dark:text-slate-200'
              }`}
              title="เปิด/ปิด การแสดงผลแผนที่ฮีตแมปความเสถียรไฟฟ้า"
            >
              <Flame className={`h-4 w-4 shrink-0 ${showMap ? 'text-orange-600 animate-pulse' : 'text-slate-400'}`} />
              <span>{showMap ? '🗺️ ซ่อนแผนที่ฮีตแมป' : '🗺️ แผนที่ฮีตแมปไฟฟ้า'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 📊 ส่วนสรุปข้อมูลภาพรวม (Summary Executive Dashboard with Pie & Bar Charts) */}
      {showCharts && (
        <div className="space-y-4 animate-fade-in">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {/* Elec Permanent */}
            <div className="p-3 rounded-2xl bg-[#FFF9F5] dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[3px_3px_0px_#33272A] dark:shadow-[3px_3px_0px_#FFD3B6] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">🔌 ไฟฟ้าถาวร</span>
                <span className="text-base sm:text-lg font-black text-[#33272A] dark:text-[#FFF9F5]">
                  {chartData.elecHas} <span className="text-xs font-bold">แห่ง</span>
                </span>
                <span className="text-[10px] font-bold text-amber-600 block">
                  {((chartData.elecHas / (chartData.total || 1)) * 100).toFixed(1)}% ของทั้งหมด
                </span>
              </div>
              <div className="p-2 rounded-xl bg-amber-100 text-amber-600 border border-amber-300 shrink-0">
                <Zap className="h-4 w-4 fill-amber-400" />
              </div>
            </div>

            {/* Elec Solar & Hybrid */}
            <div className="p-3 rounded-2xl bg-[#FFF9F5] dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[3px_3px_0px_#33272A] dark:shadow-[3px_3px_0px_#FFD3B6] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">☀️ โซลาร์/ผสมผสาน</span>
                <span className="text-base sm:text-lg font-black text-[#33272A] dark:text-[#FFF9F5]">
                  {chartData.elecSolar + chartData.elecHybrid} <span className="text-xs font-bold">แห่ง</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-600 block">
                  {(((chartData.elecSolar + chartData.elecHybrid) / (chartData.total || 1)) * 100).toFixed(1)}% Off-Grid
                </span>
              </div>
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600 border border-emerald-300 shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>

            {/* Net Fiber */}
            <div className="p-3 rounded-2xl bg-[#FFF9F5] dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[3px_3px_0px_#33272A] dark:shadow-[3px_3px_0px_#FFD3B6] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">🌐 Fiber Optic</span>
                <span className="text-base sm:text-lg font-black text-[#33272A] dark:text-[#FFF9F5]">
                  {chartData.netFiber} <span className="text-xs font-bold">แห่ง</span>
                </span>
                <span className="text-[10px] font-bold text-sky-600 block">
                  {((chartData.netFiber / (chartData.total || 1)) * 100).toFixed(1)}% ความเร็วสูง
                </span>
              </div>
              <div className="p-2 rounded-xl bg-sky-100 text-sky-600 border border-sky-300 shrink-0">
                <Globe className="h-4 w-4" />
              </div>
            </div>

            {/* Net Satellite & SIM */}
            <div className="p-3 rounded-2xl bg-[#FFF9F5] dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[3px_3px_0px_#33272A] dark:shadow-[3px_3px_0px_#FFD3B6] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">🛰️ ดาวเทียม / SIM</span>
                <span className="text-base sm:text-lg font-black text-[#33272A] dark:text-[#FFF9F5]">
                  {chartData.netSat + chartData.netSim} <span className="text-xs font-bold">แห่ง</span>
                </span>
                <span className="text-[10px] font-bold text-purple-600 block">
                  {(((chartData.netSat + chartData.netSim) / (chartData.total || 1)) * 100).toFixed(1)}% พื้นที่ห่างไกล
                </span>
              </div>
              <div className="p-2 rounded-xl bg-purple-100 text-purple-600 border border-purple-300 shrink-0">
                <Users className="h-4 w-4" />
              </div>
            </div>

            {/* Water Gov */}
            <div className="p-3 rounded-2xl bg-[#FFF9F5] dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[3px_3px_0px_#33272A] dark:shadow-[3px_3px_0px_#FFD3B6] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">🚰 ประปาภาครัฐ</span>
                <span className="text-base sm:text-lg font-black text-[#33272A] dark:text-[#FFF9F5]">
                  {chartData.waterGov} <span className="text-xs font-bold">แห่ง</span>
                </span>
                <span className="text-[10px] font-bold text-blue-600 block">
                  {((chartData.waterGov / (chartData.total || 1)) * 100).toFixed(1)}% ภูมิภาค/ท้องถิ่น
                </span>
              </div>
              <div className="p-2 rounded-xl bg-blue-100 text-blue-600 border border-blue-300 shrink-0">
                <Droplets className="h-4 w-4 text-blue-600" />
              </div>
            </div>

            {/* Water Mountain */}
            <div className="p-3 rounded-2xl bg-[#FFF9F5] dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[3px_3px_0px_#33272A] dark:shadow-[3px_3px_0px_#FFD3B6] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">🏔️ ประปาภูเขา</span>
                <span className="text-base sm:text-lg font-black text-[#33272A] dark:text-[#FFF9F5]">
                  {chartData.waterMountain} <span className="text-xs font-bold">แห่ง</span>
                </span>
                <span className="text-[10px] font-bold text-cyan-600 block">
                  {((chartData.waterMountain / (chartData.total || 1)) * 100).toFixed(1)}% ประปาภูเขา
                </span>
              </div>
              <div className="p-2 rounded-xl bg-cyan-100 text-cyan-600 border border-cyan-300 shrink-0">
                <Droplets className="h-4 w-4 text-cyan-600" />
              </div>
            </div>

            {/* Water Other */}
            <div className="p-3 rounded-2xl bg-[#FFF9F5] dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[3px_3px_0px_#33272A] dark:shadow-[3px_3px_0px_#FFD3B6] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">📌 บ่อบาดาล/อื่นๆ</span>
                <span className="text-base sm:text-lg font-black text-[#33272A] dark:text-[#FFF9F5]">
                  {chartData.waterOther} <span className="text-xs font-bold">แห่ง</span>
                </span>
                <span className="text-[10px] font-bold text-indigo-600 block">
                  {((chartData.waterOther / (chartData.total || 1)) * 100).toFixed(1)}% บ่อบาดาล/อื่นๆ
                </span>
              </div>
              <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600 border border-indigo-300 shrink-0">
                <Droplets className="h-4 w-4 text-indigo-600" />
              </div>
            </div>

            {/* Water None */}
            <div className="p-3 rounded-2xl bg-[#FFF9F5] dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[3px_3px_0px_#33272A] dark:shadow-[3px_3px_0px_#FFD3B6] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">❌ ไม่มีน้ำประปา</span>
                <span className="text-base sm:text-lg font-black text-[#33272A] dark:text-[#FFF9F5]">
                  {chartData.waterNone} <span className="text-xs font-bold">แห่ง</span>
                </span>
                <span className="text-[10px] font-bold text-rose-600 block">
                  {((chartData.waterNone / (chartData.total || 1)) * 100).toFixed(1)}% ขาดแคลนน้ำใช้
                </span>
              </div>
              <div className="p-2 rounded-xl bg-rose-100 text-rose-600 border border-rose-300 shrink-0">
                <Droplets className="h-4 w-4 text-rose-600" />
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pie Chart 1: สัดส่วนระบบไฟฟ้า */}
            <div className="card p-4 space-y-3 bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[3px_3px_0px_#33272A]">
              <div className="flex items-center justify-between border-b border-[#33272A]/10 dark:border-[#FFD3B6]/20 pb-2">
                <h3 className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-amber-500 fill-amber-400 shrink-0" />
                  สัดส่วนประเภทระบบไฟฟ้า
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  {chartData.total} แห่ง
                </span>
              </div>

              <div className="h-48 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.elecPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={68}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ percent }) => `${percent}%`}
                    >
                      {chartData.elecPie.map((entry, index) => (
                        <Cell key={`elec-cell-${index}`} fill={entry.color} stroke="#33272A" strokeWidth={1.5} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any, name: any) => [`${value} แห่ง (${((Number(value) / (chartData.total || 1)) * 100).toFixed(1)}%)`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend List with percent badges */}
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-[#33272A]/10 dark:border-[#FFD3B6]/10">
                {chartData.elecPie.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1 rounded-xl bg-[#FFF9F5] dark:bg-[#261c20] text-[10px] font-bold border border-[#33272A]/10">
                    <span className="flex items-center gap-1 truncate text-[#33272A] dark:text-[#FFF9F5]">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="font-black text-slate-700 dark:text-slate-200 shrink-0 ml-1">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pie Chart 2: สัดส่วนระบบอินเทอร์เน็ต */}
            <div className="card p-4 space-y-3 bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[3px_3px_0px_#33272A]">
              <div className="flex items-center justify-between border-b border-[#33272A]/10 dark:border-[#FFD3B6]/20 pb-2">
                <h3 className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-sky-500 shrink-0" />
                  สัดส่วนประเภทอินเทอร์เน็ต
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-300">
                  {chartData.total} แห่ง
                </span>
              </div>

              <div className="h-48 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.netPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={68}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ percent }) => `${percent}%`}
                    >
                      {chartData.netPie.map((entry, index) => (
                        <Cell key={`net-cell-${index}`} fill={entry.color} stroke="#33272A" strokeWidth={1.5} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any, name: any) => [`${value} แห่ง (${((Number(value) / (chartData.total || 1)) * 100).toFixed(1)}%)`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend List with percent badges */}
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-[#33272A]/10 dark:border-[#FFD3B6]/10">
                {chartData.netPie.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1 rounded-xl bg-[#FFF9F5] dark:bg-[#261c20] text-[10px] font-bold border border-[#33272A]/10">
                    <span className="flex items-center gap-1 truncate text-[#33272A] dark:text-[#FFF9F5]">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="font-black text-slate-700 dark:text-slate-200 shrink-0 ml-1">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pie Chart 3: สัดส่วนระบบประปา/น้ำใช้ */}
            <div className="card p-4 space-y-3 bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[3px_3px_0px_#33272A]">
              <div className="flex items-center justify-between border-b border-[#33272A]/10 dark:border-[#FFD3B6]/20 pb-2">
                <h3 className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                  <Droplets className="h-4 w-4 text-blue-500 shrink-0" />
                  สัดส่วนประเภทประปา/น้ำใช้
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300">
                  {chartData.total} แห่ง
                </span>
              </div>

              <div className="h-48 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.waterPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={68}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ percent }) => `${percent}%`}
                    >
                      {chartData.waterPie.map((entry, index) => (
                        <Cell key={`water-cell-${index}`} fill={entry.color} stroke="#33272A" strokeWidth={1.5} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any, name: any) => [`${value} แห่ง (${((Number(value) / (chartData.total || 1)) * 100).toFixed(1)}%)`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-[#33272A]/10 dark:border-[#FFD3B6]/10">
                {chartData.waterPie.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1 rounded-xl bg-[#FFF9F5] dark:bg-[#261c20] text-[10px] font-bold border border-[#33272A]/10">
                    <span className="flex items-center gap-1 truncate text-[#33272A] dark:text-[#FFF9F5]">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="font-black text-slate-700 dark:text-slate-200 shrink-0 ml-1">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🗺️ ส่วนแผนที่ฮีตแมปเสถียรภาพระบบไฟฟ้า (Electricity Stability Heatmap Visualization) */}
      {showMap && (
        <div className="card p-4 sm:p-6 space-y-4 bg-gradient-to-br from-white via-amber-50/20 to-orange-50/30 dark:from-[#1e1518] dark:via-[#261c1f] dark:to-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[4px_4px_0px_#33272A] dark:shadow-none animate-fade-in">
          {/* Header แผนที่และปุ่มสลับโหมดฮีตแมป */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b-2 border-[#33272A]/10 dark:border-[#FFD3B6]/20 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-950 border border-amber-400 shadow-xs">
                  <Flame className="h-3 w-3 text-orange-600 animate-pulse" />
                  <span>GIS Heatmap Visualization</span>
                </span>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  สพป.แม่ฮ่องสอน เขต 1
                </span>
              </div>
              <h2 className="text-base sm:text-xl font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-2">
                {heatmapSystem === 'electricity' && <Zap className="h-5 w-5 text-amber-500 fill-amber-400" />}
                {heatmapSystem === 'internet' && <Globe className="h-5 w-5 text-emerald-500" />}
                {heatmapSystem === 'water' && <Droplets className="h-5 w-5 text-sky-500" />}
                <span>
                  {heatmapSystem === 'electricity' && 'แผนที่เสถียรภาพระบบไฟฟ้า (Electricity Stability Heatmap)'}
                  {heatmapSystem === 'internet' && 'แผนที่คุณภาพเครือข่ายอินเทอร์เน็ต (Internet Quality Heatmap)'}
                  {heatmapSystem === 'water' && 'แผนที่ความมั่นคงระบบน้ำประปา (Water Supply Heatmap)'}
                </span>
              </h2>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                {heatmapSystem === 'electricity' && 'วิเคราะห์ความมั่นคงของโครงข่ายพลังงานไฟฟ้าสถานศึกษาและห้องเรียนสาขาแบบ Color-Coding แสดงจุดเสี่ยงและพื้นที่เฝ้าระวัง'}
                {heatmapSystem === 'internet' && 'วิเคราะห์ความเร็วและความเสถียรของระบบอินเทอร์เน็ต Fiber, ดาวเทียม Satellite และ Cellular SIM 4G/5G'}
                {heatmapSystem === 'water' && 'วิเคราะห์ความสะอาดและความมั่นคงของแหล่งน้ำอุปโภคบริโภค ประปาภาครัฐ ประปาภูเขา และจุดเสี่ยงขาดแคลน'}
              </p>
            </div>

            {/* ปุ่มเปิด-ปิดระบบ Heatmap และปุ่มลัดพิกัดอำเภอ */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* แถบสลับระบบ Heatmap (ไฟฟ้า / อินเทอร์เน็ต / น้ำประปา) */}
              <div className="inline-flex p-1 rounded-xl bg-white dark:bg-slate-900 border-2 border-[#33272A] dark:border-[#FFD3B6]/30 shadow-[2px_2px_0px_#33272A] gap-1">
                <button
                  type="button"
                  onClick={() => { setHeatmapSystem('electricity'); setStabilityFilter('all'); }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                    heatmapSystem === 'electricity'
                      ? 'bg-amber-400 text-slate-950 shadow-xs ring-1 ring-amber-500'
                      : 'text-slate-600 hover:text-slate-950 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="สลับดูฮีตแมปเสถียรภาพระบบไฟฟ้า"
                >
                  <Zap className="h-3.5 w-3.5 fill-current" />
                  <span>⚡ ไฟฟ้า</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setHeatmapSystem('internet'); setStabilityFilter('all'); }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                    heatmapSystem === 'internet'
                      ? 'bg-emerald-500 text-white shadow-xs ring-1 ring-emerald-600'
                      : 'text-slate-600 hover:text-slate-950 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="สลับดูฮีตแมปคุณภาพอินเทอร์เน็ต"
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>🌐 อินเทอร์เน็ต</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setHeatmapSystem('water'); setStabilityFilter('all'); }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                    heatmapSystem === 'water'
                      ? 'bg-sky-500 text-white shadow-xs ring-1 ring-sky-600'
                      : 'text-slate-600 hover:text-slate-950 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="สลับดูฮีตแมประบบน้ำประปา"
                >
                  <Droplets className="h-3.5 w-3.5 fill-current" />
                  <span>🚰 น้ำประปา</span>
                </button>
              </div>

              {/* ปุ่มเปิด/ปิด โหมด Heatmap Color-Coding (ตามคำขอ) */}
              <button
                type="button"
                onClick={() => setIsHeatmapActive(!isHeatmapActive)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] ${
                  isHeatmapActive
                    ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 text-slate-950 ring-2 ring-amber-300'
                    : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200'
                }`}
                title="คลิกเพื่อเปิดหรือปิดระบบสี Heatmap ความเสถียรไฟฟ้าบนหมุดแผนที่"
              >
                <Flame className={`h-4 w-4 shrink-0 ${isHeatmapActive ? 'text-rose-950 animate-bounce' : 'text-slate-400'}`} />
                <span>{isHeatmapActive ? '🔥 ระบบ Heatmap: เปิดอยู่' : '📍 ระบบ Heatmap: ปิด (สีอำเภอ)'}</span>
              </button>

              {/* ปุ่มลัดซูมพิกัดตามอำเภอ */}
              <div className="flex items-center gap-1 bg-[#FFF9F5] dark:bg-[#251b1e] p-1 rounded-xl border border-[#33272A]/20 dark:border-[#FFD3B6]/20 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setMapCenter([19.3021, 97.9654]);
                    setMapZoom(9);
                  }}
                  className="px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
                  title="ภาพรวมทั้งเขต"
                >
                  🗺️ ทั้งเขต
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMapCenter([19.3021, 97.9654]);
                    setMapZoom(11);
                  }}
                  className="px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  อ.เมือง
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMapCenter([18.8400, 97.9400]);
                    setMapZoom(11);
                  }}
                  className="px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  อ.ขุนยวม
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMapCenter([19.3600, 98.4400]);
                    setMapZoom(11);
                  }}
                  className="px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  อ.ปาย
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMapCenter([19.5200, 98.2400]);
                    setMapZoom(11);
                  }}
                  className="px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  อ.ปางมะผ้า
                </button>
              </div>
            </div>
          </div>

          {/* การ์ดสถิติความเสถียรไฟฟ้า 4 ระดับ (คลิกที่การ์ดเพื่อกรองหมุดบนแผนที่ได้ทันที) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* ระดับ 1: เสถียรสูงมาก */}
            <div
              onClick={() => setStabilityFilter(stabilityFilter === 'optimal' ? 'all' : 'optimal')}
              className={`p-3 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                stabilityFilter === 'optimal'
                  ? 'bg-emerald-100 border-emerald-600 ring-2 ring-emerald-500 shadow-md dark:bg-emerald-950/60'
                  : 'bg-emerald-50/80 hover:bg-emerald-100/70 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  เสถียรภาพสูง
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-white dark:bg-emerald-900 px-1.5 py-0.5 rounded-md">
                  {stabilityStats.optimalPercent}%
                </span>
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black text-emerald-950 dark:text-emerald-100">
                  {stabilityStats.optimal} <span className="text-xs font-bold">แห่ง</span>
                </div>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium truncate mt-0.5">
                  {heatmapSystem === 'electricity' && 'สายส่ง PEA / Hybrid มีสำรอง'}
                  {heatmapSystem === 'internet' && 'สายใยแก้ว Fiber Optic เสถียรสูง'}
                  {heatmapSystem === 'water' && 'ประปาภาครัฐ / กปภ. / ท้องถิ่น'}
                </p>
              </div>
            </div>

            {/* ระดับ 2: เสถียรปานกลาง */}
            <div
              onClick={() => setStabilityFilter(stabilityFilter === 'moderate' ? 'all' : 'moderate')}
              className={`p-3 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                stabilityFilter === 'moderate'
                  ? 'bg-amber-100 border-amber-600 ring-2 ring-amber-500 shadow-md dark:bg-amber-950/60'
                  : 'bg-amber-50/80 hover:bg-amber-100/70 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  เสถียรปานกลาง
                </span>
                <span className="text-[10px] font-bold text-amber-700 bg-white dark:bg-amber-900 px-1.5 py-0.5 rounded-md">
                  {stabilityStats.moderatePercent}%
                </span>
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black text-amber-950 dark:text-amber-100">
                  {stabilityStats.moderate} <span className="text-xs font-bold">แห่ง</span>
                </div>
                <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium truncate mt-0.5">
                  {heatmapSystem === 'electricity' && 'โซลาร์เซลล์ + แบตเตอรี่สำรอง'}
                  {heatmapSystem === 'internet' && 'ดาวเทียม Satellite / IPSTAR'}
                  {heatmapSystem === 'water' && 'ระบบประปาภูเขา / ตาน้ำธรรมชาติ'}
                </p>
              </div>
            </div>

            {/* ระดับ 3: เสถียรต่ำ (เฝ้าระวัง) */}
            <div
              onClick={() => setStabilityFilter(stabilityFilter === 'low' ? 'all' : 'low')}
              className={`p-3 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                stabilityFilter === 'low'
                  ? 'bg-orange-100 border-orange-600 ring-2 ring-orange-500 shadow-md dark:bg-orange-950/60'
                  : 'bg-orange-50/80 hover:bg-orange-100/70 border-orange-300 dark:bg-orange-950/30 dark:border-orange-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-orange-800 dark:text-orange-300 flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                  เสถียรต่ำ
                </span>
                <span className="text-[10px] font-bold text-orange-700 bg-white dark:bg-orange-900 px-1.5 py-0.5 rounded-md">
                  {stabilityStats.lowPercent}%
                </span>
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black text-orange-950 dark:text-orange-100">
                  {stabilityStats.low} <span className="text-xs font-bold">แห่ง</span>
                </div>
                <p className="text-[10px] text-orange-700 dark:text-orange-300 font-medium truncate mt-0.5">
                  {heatmapSystem === 'electricity' && 'โซลาร์เซลล์ไม่มีแบตเตอรี่สำรอง'}
                  {heatmapSystem === 'internet' && 'เครือข่าย Cellular SIM 4G/5G'}
                  {heatmapSystem === 'water' && 'บ่อบาดาล / น้ำฝน / อื่นๆ เสี่ยงแล้ง'}
                </p>
              </div>
            </div>

            {/* ระดับ 4: วิกฤต / ไม่มีไฟฟ้า */}
            <div
              onClick={() => setStabilityFilter(stabilityFilter === 'critical' ? 'all' : 'critical')}
              className={`p-3 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                stabilityFilter === 'critical'
                  ? 'bg-rose-100 border-rose-600 ring-2 ring-rose-500 shadow-md dark:bg-rose-950/60'
                  : 'bg-rose-50/80 hover:bg-rose-100/70 border-rose-300 dark:bg-rose-950/30 dark:border-rose-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-rose-800 dark:text-rose-300 flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  วิกฤต/ไม่มีไฟ
                </span>
                <span className="text-[10px] font-bold text-rose-700 bg-white dark:bg-rose-900 px-1.5 py-0.5 rounded-md">
                  {stabilityStats.criticalPercent}%
                </span>
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black text-rose-950 dark:text-rose-100">
                  {stabilityStats.critical} <span className="text-xs font-bold">แห่ง</span>
                </div>
                <p className="text-[10px] text-rose-700 dark:text-rose-300 font-medium truncate mt-0.5">
                  {heatmapSystem === 'electricity' && 'ไม่มีระบบไฟฟ้าถาวร'}
                  {heatmapSystem === 'internet' && 'ไม่มีสัญญาณอินเทอร์เน็ต'}
                  {heatmapSystem === 'water' && 'ไม่มีแหล่งน้ำประปาประจำ'}
                </p>
              </div>
            </div>
          </div>

          {/* ผังการทำงานหลัก: ฝั่งซ้าย Legend & Insights / ฝั่งขวา แผนที่ PigeonMap */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            {/* ซีกซ้าย: แถบอธิบายสัญลักษณ์ Heatmap & ตัวกรองความเสถียร & รายละเอียดโรงเรียนที่เลือก */}
            <div className="space-y-3.5">
              {/* แผงคำอธิบายสี Heatmap Color-Coding */}
              <div className="p-3.5 rounded-2xl bg-[#FFF9F5] dark:bg-[#1e1518] border-2 border-[#33272A]/20 dark:border-[#FFD3B6]/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                    <Flame className="h-4 w-4 text-orange-500 shrink-0" />
                    <span>
                    {heatmapSystem === 'electricity' && 'เกณฑ์สี Heatmap เสถียรภาพไฟฟ้า'}
                    {heatmapSystem === 'internet' && 'เกณฑ์สี Heatmap คุณภาพเน็ต'}
                    {heatmapSystem === 'water' && 'เกณฑ์สี Heatmap ระบบน้ำประปา'}
                  </span>
                  </span>
                  {stabilityFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setStabilityFilter('all')}
                      className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      ล้างตัวกรอง
                    </button>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  {/* เขียว: เสถียรสูง */}
                  <div
                    onClick={() => setStabilityFilter(stabilityFilter === 'optimal' ? 'all' : 'optimal')}
                    className={`p-2 rounded-xl border transition cursor-pointer flex items-start gap-2.5 ${
                      stabilityFilter === 'optimal' ? 'bg-emerald-100 border-emerald-500 font-black' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-[#059669] text-white flex items-center justify-center shrink-0 shadow-xs text-[11px]">
                      ⚡
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-900 dark:text-emerald-200">🟢 สีเขียว: เสถียรภาพสูงมาก</span>
                        <span className="text-[10px] font-bold text-slate-500">90-100%</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {heatmapSystem === 'electricity' && 'ไฟฟ้าสายส่งถาวร (PEA) หรือระบบ Hybrid มีไฟสำรองฉุกเฉิน'}
                        {heatmapSystem === 'internet' && 'สายใยแก้วนำแสง Fiber Optic ความเร็วสูง เสถียร ไม่สะดุด'}
                        {heatmapSystem === 'water' && 'ประปาภาครัฐ / กปภ. / ท้องถิ่น มีการบำบัดน้ำได้มาตรฐาน'}
                      </p>
                    </div>
                  </div>

                  {/* เหลือง: ปานกลาง */}
                  <div
                    onClick={() => setStabilityFilter(stabilityFilter === 'moderate' ? 'all' : 'moderate')}
                    className={`p-2 rounded-xl border transition cursor-pointer flex items-start gap-2.5 ${
                      stabilityFilter === 'moderate' ? 'bg-amber-100 border-amber-500 font-black' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-[#eab308] text-slate-950 flex items-center justify-center shrink-0 shadow-xs text-[11px]">
                      ☀️
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-900 dark:text-amber-200">🟡 สีเหลือง: เสถียรปานกลาง</span>
                        <span className="text-[10px] font-bold text-slate-500">65%</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {heatmapSystem === 'electricity' && 'ระบบโซลาร์เซลล์พร้อมแบตเตอรี่สะสมพลังงาน ใช้งานกลางคืนได้'}
                        {heatmapSystem === 'internet' && 'สัญญาณจานดาวเทียม Satellite/IPSTAR เข้าถึงยอดดอยได้'}
                        {heatmapSystem === 'water' && 'ระบบประปาภูเขา / ตาน้ำธรรมชาติ มีน้ำใช้ตามฤดูกาล'}
                      </p>
                    </div>
                  </div>

                  {/* ส้ม: เสถียรต่ำ */}
                  <div
                    onClick={() => setStabilityFilter(stabilityFilter === 'low' ? 'all' : 'low')}
                    className={`p-2 rounded-xl border transition cursor-pointer flex items-start gap-2.5 ${
                      stabilityFilter === 'low' ? 'bg-orange-100 border-orange-500 font-black' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-[#f97316] text-white flex items-center justify-center shrink-0 shadow-xs text-[11px]">
                      ⚠️
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-orange-900 dark:text-orange-200">🟠 สีส้ม: เสถียรต่ำ (เฝ้าระวัง)</span>
                        <span className="text-[10px] font-bold text-slate-500">40%</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {heatmapSystem === 'electricity' && 'โซลาร์เซลล์ไม่มีแบตเตอรี่สำรอง ไฟดับช่วงฟ้าปิดหรือหมอกหนา'}
                        {heatmapSystem === 'internet' && 'เครือข่ายมือถือ Cellular SIM 4G/5G ขอบสัญญาณจำกัด'}
                        {heatmapSystem === 'water' && 'บ่อขุด / บ่อบาดาล / น้ำฝน เสี่ยงขาดแคลนช่วงหน้าแล้ง'}
                      </p>
                    </div>
                  </div>

                  {/* แดง: วิกฤต */}
                  <div
                    onClick={() => setStabilityFilter(stabilityFilter === 'critical' ? 'all' : 'critical')}
                    className={`p-2 rounded-xl border transition cursor-pointer flex items-start gap-2.5 ${
                      stabilityFilter === 'critical' ? 'bg-rose-100 border-rose-500 font-black' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-[#ef4444] text-white flex items-center justify-center shrink-0 shadow-xs text-[11px]">
                      ❌
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-900 dark:text-rose-200">🔴 สีแดง: วิกฤต / ไม่มีไฟฟ้า</span>
                        <span className="text-[10px] font-bold text-slate-500">15%</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {heatmapSystem === 'electricity' && 'ไม่มีระบบไฟฟ้าถาวร ต้องการการสนับสนุนแผงโซลาร์เร่งด่วน'}
                        {heatmapSystem === 'internet' && 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต ขาดแคลนสื่อการเรียนรู้'}
                        {heatmapSystem === 'water' && 'ไม่มีระบบน้ำประปาประจำ ต้องพึ่งพาน้ำแจกจ่าย'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* การ์ดแสดงข้อมูลโรงเรียนที่ถูกคลิกเลือกในแผนที่ (Selected School Details) */}
              {selectedMapSchool ? (
                (() => {
                  const sInfo = getInfrastructureQuality(selectedMapSchool, heatmapSystem);
                  const elecInfo = getElectricityStability(selectedMapSchool);
                  const netInfo = getInternetQuality(selectedMapSchool);
                  const waterInfo = getWaterQuality(selectedMapSchool);
                  const ampName = selectedMapSchool.amphoe || getAmphoeAndNetwork(selectedMapSchool.id, selectedMapSchool.name).amphoe;
                  return (
                    <div className="p-4 rounded-2xl bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[3px_3px_0px_#33272A] space-y-3 animate-fade-in">
                      <div className="flex items-start justify-between gap-2 border-b border-[#33272A]/10 dark:border-[#FFD3B6]/20 pb-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500">รหัส {selectedMapSchool.id}</span>
                          <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5] leading-tight">
                            {selectedMapSchool.name}
                          </h3>
                          <span className="text-[11px] text-slate-600 dark:text-slate-300 font-bold">
                            อำเภอ{ampName}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedMapSchoolId(null)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1"
                        >
                          ✕
                        </button>
                      </div>

                      {/* สถานะระบบตาม Layer ที่เลือก */}
                      <div className={`p-2.5 rounded-xl border ${sInfo.bgClass} space-y-1`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black flex items-center gap-1.5">
                            <span className="text-sm">{sInfo.icon}</span>
                            <span>{sInfo.title}</span>
                          </span>
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-white/70 dark:bg-black/30">
                            คะแนน {sInfo.score}%
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          {sInfo.description}
                        </p>
                      </div>

                      {/* สรุปย่อ 3 โครงสร้างพื้นฐานหลัก */}
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-wide">ภาพรวมสาธารณูปโภค 3 ระบบ:</div>
                        <div className="grid grid-cols-1 gap-1 text-[11px]">
                          <div className={`px-2 py-1 rounded-lg flex items-center justify-between border ${elecInfo.bgClass}`}>
                            <span className="font-bold flex items-center gap-1">⚡ ไฟฟ้า:</span>
                            <span className="font-black">{elecInfo.shortLabel}</span>
                          </div>
                          <div className={`px-2 py-1 rounded-lg flex items-center justify-between border ${netInfo.bgClass}`}>
                            <span className="font-bold flex items-center gap-1">🌐 เน็ต:</span>
                            <span className="font-black">{netInfo.shortLabel}</span>
                          </div>
                          <div className={`px-2 py-1 rounded-lg flex items-center justify-between border ${waterInfo.bgClass}`}>
                            <span className="font-bold flex items-center gap-1">🚰 น้ำประปา:</span>
                            <span className="font-black">{waterInfo.shortLabel}</span>
                          </div>
                        </div>
                      </div>

                      {/* ข้อมูลสเปกไฟฟ้าและสาธารณูปโภค */}
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] text-slate-500 block">⚡ แหล่งจ่ายไฟ</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {selectedMapSchool.electricity === 'solar' ? 'โซลาร์เซลล์' : selectedMapSchool.electricity === 'hybrid' ? 'ระบบผสมผสาน' : selectedMapSchool.electricity === 'none' ? 'ไม่มีไฟฟ้า' : 'สายส่งถาวร (PEA)'}
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] text-slate-500 block">🔋 แบตเตอรี่สำรอง</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {selectedMapSchool.hasSolarBattery ? '✅ มีแบตเตอรี่' : '❌ ไม่มีแบตสำรอง'}
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] text-slate-500 block">🌐 อินเทอร์เน็ต</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {selectedMapSchool.internetType === 'fiber' ? 'ไฟเบอร์ออปติก' : selectedMapSchool.internetType === 'satellite' ? 'ดาวเทียม' : selectedMapSchool.internetType === 'sim' ? 'ซิม 4G' : 'ไม่มีเน็ต'}
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] text-slate-500 block">🚰 ระบบน้ำประปา</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {selectedMapSchool.waterSystem === 'mountain' ? 'ประปาภูเขา' : selectedMapSchool.waterSystem === 'none' ? 'ไม่มีน้ำ' : selectedMapSchool.waterSystem === 'other' ? 'อื่นๆ' : 'ประปาภาครัฐ'}
                          </span>
                        </div>
                      </div>

                      {/* ปุ่มไปที่รายละเอียดโรงเรียน */}
                      <button
                        type="button"
                        onClick={() => onSelectSchool(selectedMapSchool.id)}
                        className="w-full py-2 bg-[#FF8BA7] hover:bg-rose-300 text-[#33272A] font-black text-xs rounded-xl border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>ดูข้อมูลโรงเรียนนี้ฉบับเต็ม</span>
                      </button>
                    </div>
                  );
                })()
              ) : (
                <div className="p-3.5 rounded-2xl bg-[#FFF9F5]/70 dark:bg-[#1e1518]/70 border-2 border-dashed border-[#33272A]/20 dark:border-[#FFD3B6]/20 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  <MapPin className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                  <p className="font-bold text-[#33272A] dark:text-[#FFF9F5]">คลิกที่หมุดใดๆ ในแผนที่</p>
                  <p className="text-[11px]">เพื่อดูสเปกความเสถียรไฟฟ้า แหล่งจ่าย และรายละเอียดโครงสร้างพื้นฐาน</p>
                </div>
              )}
            </div>

            {/* ซีกขวา: แผนที่ PigeonMap แสดงหมุดแบบ Heatmap Color-Coding */}
            <div className="lg:col-span-2 min-w-0">
              <div className="relative overflow-hidden rounded-2xl border-2 border-[#33272A] bg-slate-100 dark:bg-[#150e10] shadow-[4px_4px_0px_#33272A] dark:border-[#FFD3B6] dark:shadow-none h-[420px] sm:h-[480px]">
                {/* ปุ่มควบคุมการซูมแบบแตะครั้งเดียว (Single-tap Zoom Controls) */}
                <div className="absolute top-3 right-3 z-30 flex flex-col gap-1.5 shadow-md">
                  <button
                    type="button"
                    onClick={() => setMapZoom(prev => Math.min(prev + 1, 18))}
                    className="w-8 h-8 rounded-lg bg-white/95 dark:bg-slate-800/95 border-2 border-[#33272A] dark:border-[#FFD3B6] text-slate-800 dark:text-slate-100 font-black text-base flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
                    title="ซูมเข้า (+)"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapZoom(prev => Math.max(prev - 1, 6))}
                    className="w-8 h-8 rounded-lg bg-white/95 dark:bg-slate-800/95 border-2 border-[#33272A] dark:border-[#FFD3B6] text-slate-800 dark:text-slate-100 font-black text-base flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
                    title="ซูมออก (-)"
                  >
                    -
                  </button>
                </div>

                {/* แถบปลดล็อกแผนที่บนมือถือ ป้องกันปัญหานิ้วติดแผนที่เลื่อนหน้าจอไม่ได้ */}
                <div className="sm:hidden absolute top-3 left-3 z-30">
                  <button
                    type="button"
                    onClick={() => setIsMobileMapInteractive(!isMobileMapInteractive)}
                    className={`px-2.5 py-1.5 rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] text-[10px] font-black shadow-xs flex items-center gap-1.5 transition-all ${
                      isMobileMapInteractive
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-white/95 dark:bg-slate-800/95 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {isMobileMapInteractive ? '🔒 ล็อก (เพื่อเลื่อนหน้าจอต่อ)' : '👆 แตะเพื่อเลื่อนแผนที่'}
                  </button>
                </div>

                {/* Container for PigeonMap with mobile touch protection */}
                <div className={`w-full h-full ${!isMobileMapInteractive ? 'sm:pointer-events-auto pointer-events-none' : ''}`}>
                <PigeonMap
                  center={mapCenter}
                  zoom={mapZoom}
                  onBoundsChanged={({ center, zoom }) => {
                    setMapCenter(center);
                    setMapZoom(zoom);
                  }}
                >
                  {/* วาดหมุดสถานศึกษาตามโหมด Heatmap หรือ โหมดปกติ */}
                  {mapSchools.map(school => {
                    const lat = Number(school.latitude) || 19.3021;
                    const lng = Number(school.longitude) || 97.9654;
                    const isSelected = selectedMapSchoolId === school.id;
                    const stabInfo = getInfrastructureQuality(school, heatmapSystem);

                    const ampName = school.amphoe || getAmphoeAndNetwork(school.id, school.name).amphoe || '';
                    let standardPinColor = '#0284c7';
                    if (ampName.includes('เมือง')) standardPinColor = '#0284c7';
                    else if (ampName.includes('ขุนยวม')) standardPinColor = '#f43f5e';
                    else if (ampName.includes('ปาย')) standardPinColor = '#f59e0b';
                    else if (ampName.includes('ปางมะผ้า')) standardPinColor = '#8b5cf6';

                    const isKhet = school.name.includes('เขตพื้นที่');
                    const isBranch = school.name.includes('สาขา') || (school as any).isRemoteBranch;

                    return (
                      <PigeonOverlay
                        key={school.id}
                        anchor={[lat, lng]}
                        offset={[isSelected ? 16 : 14, isSelected ? 32 : 28]}
                      >
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMapSchoolId(school.id);
                          }}
                          className={`relative cursor-pointer flex flex-col items-center select-none transition-transform duration-150 ${
                            isSelected ? 'z-50 scale-125' : 'z-20 hover:scale-125 hover:z-40'
                          }`}
                          title={`${school.name}: ${stabInfo.title} (อำเภอ${ampName})`}
                        >
                          {isHeatmapActive ? (
                            /* โหมด Heatmap Color-Coding: หมุดสีตามความเสถียรไฟฟ้าพร้อมรัศมีออร่าความร้อน */
                            <div className="relative flex flex-col items-center">
                              {/* Heatmap Radiating Aura Halo */}
                              <div
                                className={`absolute rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2 ${
                                  stabInfo.level === 'critical' || stabInfo.level === 'low'
                                    ? 'animate-pulse'
                                    : ''
                                }`}
                                style={{
                                  width: isSelected ? '56px' : '40px',
                                  height: isSelected ? '56px' : '40px',
                                  left: '50%',
                                  top: '40%',
                                  background: `radial-gradient(circle, ${stabInfo.glowColor} 0%, ${stabInfo.glowColor.replace('0.65', '0.15')} 55%, transparent 75%)`,
                                  filter: 'blur(2px)',
                                }}
                              />

                              {/* Borderless Heatmap Pin Body */}
                              <div
                                className="relative flex items-center justify-center rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-all"
                                style={{
                                  width: isSelected ? '28px' : '23px',
                                  height: isSelected ? '28px' : '23px',
                                  backgroundColor: stabInfo.color,
                                  border: isSelected ? '2px solid #ffffff' : '1.5px solid rgba(255,255,255,0.7)',
                                }}
                              >
                                <span className="text-[11px] leading-none select-none text-white font-black drop-shadow-sm">
                                  {stabInfo.icon}
                                </span>
                              </div>

                              {/* Heatmap Pin Pointer Tip */}
                              <div
                                className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] -mt-[1px]"
                                style={{ borderTopColor: stabInfo.color }}
                              />

                              {/* Selected ping ring */}
                              {isSelected && (
                                <div className="w-3.5 h-1 bg-[#FF8BA7] rounded-full blur-[1px] animate-ping -mt-0.5" />
                              )}
                            </div>
                          ) : (
                            /* โหมดปกติ: หมุดตามอำเภอและสัญลักษณ์สถานศึกษาแบบไร้กรอบ */
                            isKhet ? (
                              <svg
                                viewBox="0 0 32 32"
                                className="w-7 h-7 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                              >
                                <polygon
                                  points="16,1 19.8,10.6 30.1,11.5 22.4,18.3 24.7,28.3 16,23.1 7.3,28.3 9.6,18.3 1.9,11.5 12.2,10.6"
                                  fill="#fbbf24"
                                  stroke="#b45309"
                                  strokeWidth="1.2"
                                />
                                <polygon
                                  points="16,4 18.7,11.4 26,12.1 20.5,16.8 22.1,23.9 16,20.2 9.9,23.9 11.5,16.8 6,12.1 13.3,11.4"
                                  fill="#fef08a"
                                />
                              </svg>
                            ) : isBranch ? (
                              <svg
                                viewBox="0 0 32 32"
                                className="w-7 h-7 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                              >
                                <ellipse cx="8" cy="29" rx="5" ry="2" fill="#334155" stroke="#0f172a" strokeWidth="0.8" />
                                <line x1="8" y1="3" x2="8" y2="29" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                                <line x1="7.5" y1="3" x2="7.5" y2="29" stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" />
                                <circle cx="8" cy="3" r="1.8" fill="#fbbf24" stroke="#d97706" strokeWidth="0.6" />
                                <g transform="translate(9, 4)">
                                  <path d="M 0 0 C 6 2, 12 -1, 19 1 L 19 13 C 12 11, 6 14, 0 12 Z" fill="#ED1C24" />
                                  <path d="M 0 2 C 6 4, 12 1, 19 3 L 19 11 C 12 9, 6 12, 0 10 Z" fill="#FFFFFF" />
                                  <path d="M 0 4 C 6 6, 12 3, 19 5 L 19 9 C 12 7, 6 10, 0 8 Z" fill="#241D4F" />
                                </g>
                              </svg>
                            ) : (
                              <svg
                                viewBox="0 0 32 32"
                                className="w-7 h-7 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                              >
                                <rect x="2" y="27" width="28" height="3" rx="1" fill="#475569" />
                                <rect x="4" y="13" width="24" height="14" rx="1" fill={standardPinColor} stroke="#1e293b" strokeWidth="1" />
                                <polygon points="16,4 2,13 30,13" fill="#e11d48" stroke="#9f1239" strokeWidth="1" />
                                <rect x="13.5" y="4" width="5" height="5" fill="#f8fafc" stroke="#1e293b" strokeWidth="0.8" />
                                <circle cx="16" cy="6.5" r="1.6" fill="#fbbf24" stroke="#d97706" strokeWidth="0.6" />
                                <rect x="6.5" y="16" width="3.5" height="4" rx="0.5" fill="#ffffff" stroke="#1e293b" strokeWidth="0.6" />
                                <rect x="22" y="16" width="3.5" height="4" rx="0.5" fill="#ffffff" stroke="#1e293b" strokeWidth="0.6" />
                                <rect x="13" y="18" width="6" height="9" rx="0.8" fill="#1e293b" />
                              </svg>
                            )
                          )}
                        </div>
                      </PigeonOverlay>
                    );
                  })}

                  {/* ป้ายชื่อและสถานะลอยบนหัวหมุดที่ถูกเลือก */}
                  {selectedMapSchool && (
                    <PigeonOverlay
                      anchor={[Number(selectedMapSchool.latitude) || 19.3021, Number(selectedMapSchool.longitude) || 97.9654]}
                      offset={[0, -38]}
                    >
                      <div className="bg-[#FFF9F5] border-2 border-[#33272A] px-2.5 py-1.5 rounded-xl text-[10px] font-black text-[#33272A] shadow-[2px_2px_0px_#33272A] dark:bg-[#1e1518] dark:text-[#FFF9F5] whitespace-nowrap z-50 flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span>📍 {selectedMapSchool.name}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${getInfrastructureQuality(selectedMapSchool, heatmapSystem).badgeClass}`}>
                            {getInfrastructureQuality(selectedMapSchool, heatmapSystem).shortLabel}
                          </span>
                        </div>
                        <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
                          อำเภอ{selectedMapSchool.amphoe || getAmphoeAndNetwork(selectedMapSchool.id, selectedMapSchool.name).amphoe} • คลิกดูข้อมูลด้านซ้าย
                        </div>
                      </div>
                    </PigeonOverlay>
                  )}
                </PigeonMap>
                </div>

                {/* แถบคำแนะนำการใช้งานแผนที่ */}
                <div className="absolute bottom-2 left-2 right-2 bg-white/90 dark:bg-black/80 backdrop-blur-xs px-2.5 py-1 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center justify-between pointer-events-none">
                  <span>💡 ใช้ลูกกลิ้งเมาส์เพื่อซูมเข้า-ออก หรือลากแผนที่เพื่อเลื่อนดูตำแหน่งสถานศึกษา</span>
                  <span className="text-amber-700 dark:text-amber-300">
                    แสดงหมุด {mapSchools.length} แห่ง
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Control Filter Bar (กรองเอาข้อมูลไหน หรือ ไม่เอาข้อมูลไหน) */}
      <div className="card p-4 sm:p-5 space-y-4 border-l-8 border-l-[#FF8BA7] bg-white dark:bg-[#1e1518]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#33272A]/10 dark:border-[#FFD3B6]/20 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#FF8BA7] shrink-0" />
            <h2 className="text-xs sm:text-sm font-black text-[#33272A] dark:text-[#FFF9F5]">
              🎯 กำหนดเงื่อนไขตัวกรอง (เลือกประเภทข้อมูลที่จะเอา / ไม่เอา)
            </h2>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#A0E7E5] text-[#33272A] border border-[#33272A]">
              ตรงเงื่อนไข {filteredSchools.length} แห่ง
            </span>
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs font-black text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-xl border border-rose-300 dark:border-rose-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>ล้างเงื่อนไขทั้งหมด</span>
          </button>
        </div>

        {/* Grid Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. กรองระบบไฟฟ้า */}
          <div className="p-3.5 rounded-2xl bg-[#FFF9F5] dark:bg-[#251b1e] border-2 border-[#33272A]/30 dark:border-[#FFD3B6]/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-amber-500 fill-amber-400 shrink-0" />
                ข้อมูลไฟฟ้า:
              </span>

              <div className="flex items-center gap-1.5">
                {/* Mode Toggle: เอาเฉพาะ vs ไม่เอา */}
                <div className="flex items-center bg-white dark:bg-[#150e10] p-0.5 rounded-lg border border-[#33272A]/20">
                  <button
                    type="button"
                    onClick={() => setElectricMode('include')}
                    className={`px-2 py-0.5 text-[10px] font-black rounded cursor-pointer ${
                      electricMode === 'include'
                        ? 'bg-emerald-400 text-[#33272A]'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    เอาเฉพาะ
                  </button>
                  <button
                    type="button"
                    onClick={() => setElectricMode('exclude')}
                    className={`px-2 py-0.5 text-[10px] font-black rounded cursor-pointer ${
                      electricMode === 'exclude'
                        ? 'bg-rose-500 text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    ไม่เอา ❌
                  </button>
                </div>
              </div>
            </div>

            {/* Quick action bar */}
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 border-b border-[#33272A]/10 pb-1">
              <span>(คลิกเพื่อเลือก/ยกเลิก หรือคลิก 1 ปุ่มเพื่อดูเฉพาะประเภทนั้น)</span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={selectAllElectric}
                  className="text-amber-700 dark:text-amber-400 font-black hover:underline cursor-pointer"
                >
                  เลือกหมด
                </button>
                <span>|</span>
                <button
                  type="button"
                  onClick={clearElectric}
                  className="text-rose-600 dark:text-rose-400 font-black hover:underline cursor-pointer"
                >
                  ล้าง
                </button>
              </div>
            </div>

            {/* Type selections */}
            <div className="grid grid-cols-2 gap-2">
              {electricityTypeList.map(item => {
                const isSelected = electricSelected.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleElectricType(item.id)}
                    title="คลิกเพื่อเลือกรายการนี้ หรือคลิกเปลี่ยนเฉพาะประเภทที่ต้องการ"
                    className={`px-2.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all border cursor-pointer ${
                      isSelected
                        ? electricMode === 'include'
                          ? 'bg-amber-300 text-amber-950 border-[#33272A] shadow-sm'
                          : 'bg-rose-100 text-rose-950 border-rose-400 line-through'
                        : 'bg-white dark:bg-[#1a1214] text-slate-500 border-slate-300 dark:border-slate-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {isSelected ? <CheckSquare className="h-4 w-4 shrink-0 text-[#33272A]" /> : <Square className="h-4 w-4 shrink-0 text-slate-400" />}
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
              {electricSelected.length === 0 ? (
                <span className="text-rose-600 dark:text-rose-400 font-black">⚠️ ไม่ได้เลือกประเภทไฟฟ้า - กรุณาเลือกอย่างน้อย 1 ประเภท</span>
              ) : electricSelected.length === electricityTypeList.length ? (
                <span>✓ แสดงโรงเรียนทุกระบบไฟฟ้า</span>
              ) : electricMode === 'include' ? (
                <span>✓ แสดงเฉพาะโรงเรียนประเภทไฟฟ้าที่เลือก ({electricSelected.length} ประเภท)</span>
              ) : (
                <span>❌ ไม่แสดงโรงเรียนในประเภทไฟฟ้าที่เลือก ({electricSelected.length} ประเภท)</span>
              )}
            </p>
          </div>

          {/* 2. กรองระบบอินเทอร์เน็ต */}
          <div className="p-3.5 rounded-2xl bg-[#FFF9F5] dark:bg-[#251b1e] border-2 border-[#33272A]/30 dark:border-[#FFD3B6]/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-sky-500 shrink-0" />
                ข้อมูลอินเทอร์เน็ต:
              </span>

              <div className="flex items-center gap-1.5">
                {/* Mode Toggle: เอาเฉพาะ vs ไม่เอา */}
                <div className="flex items-center bg-white dark:bg-[#150e10] p-0.5 rounded-lg border border-[#33272A]/20">
                  <button
                    type="button"
                    onClick={() => setInternetMode('include')}
                    className={`px-2 py-0.5 text-[10px] font-black rounded cursor-pointer ${
                      internetMode === 'include'
                        ? 'bg-sky-400 text-[#33272A]'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    เอาเฉพาะ
                  </button>
                  <button
                    type="button"
                    onClick={() => setInternetMode('exclude')}
                    className={`px-2 py-0.5 text-[10px] font-black rounded cursor-pointer ${
                      internetMode === 'exclude'
                        ? 'bg-rose-500 text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    ไม่เอา ❌
                  </button>
                </div>
              </div>
            </div>

            {/* Quick action bar */}
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 border-b border-[#33272A]/10 pb-1">
              <span>(คลิกเพื่อเลือก/ยกเลิก หรือคลิก 1 ปุ่มเพื่อดูเฉพาะประเภทนั้น)</span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={selectAllInternet}
                  className="text-sky-700 dark:text-sky-400 font-black hover:underline cursor-pointer"
                >
                  เลือกหมด
                </button>
                <span>|</span>
                <button
                  type="button"
                  onClick={clearInternet}
                  className="text-rose-600 dark:text-rose-400 font-black hover:underline cursor-pointer"
                >
                  ล้าง
                </button>
              </div>
            </div>

            {/* Type selections */}
            <div className="grid grid-cols-2 gap-2">
              {internetTypeList.map(item => {
                const isSelected = internetSelected.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleInternetType(item.id)}
                    title="คลิกเพื่อเลือกรายการนี้ หรือคลิกเปลี่ยนเฉพาะประเภทที่ต้องการ"
                    className={`px-2.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all border cursor-pointer ${
                      isSelected
                        ? internetMode === 'include'
                          ? 'bg-sky-200 text-sky-950 border-[#33272A] shadow-sm'
                          : 'bg-rose-100 text-rose-950 border-rose-400 line-through'
                        : 'bg-white dark:bg-[#1a1214] text-slate-500 border-slate-300 dark:border-slate-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {isSelected ? <CheckSquare className="h-4 w-4 shrink-0 text-[#33272A]" /> : <Square className="h-4 w-4 shrink-0 text-slate-400" />}
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
              {internetSelected.length === 0 ? (
                <span className="text-rose-600 dark:text-rose-400 font-black">⚠️ ไม่ได้เลือกประเภทเน็ต - กรุณาเลือกอย่างน้อย 1 ประเภท</span>
              ) : internetSelected.length === internetTypeList.length ? (
                <span>✓ แสดงโรงเรียนทุกระบบเน็ต</span>
              ) : internetMode === 'include' ? (
                <span>✓ แสดงเฉพาะโรงเรียนประเภทเน็ตที่เลือก ({internetSelected.length} ประเภท)</span>
              ) : (
                <span>❌ ไม่แสดงโรงเรียนในประเภทเน็ตที่เลือก ({internetSelected.length} ประเภท)</span>
              )}
            </p>
          </div>

          {/* 3. กรองระบบประปา/แหล่งน้ำ */}
          <div className="p-3.5 rounded-2xl bg-[#FFF9F5] dark:bg-[#251b1e] border-2 border-[#33272A]/30 dark:border-[#FFD3B6]/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                <Droplets className="h-4 w-4 text-blue-500 shrink-0" />
                ข้อมูลประปา/น้ำใช้:
              </span>

              <div className="flex items-center gap-1.5">
                <div className="flex items-center bg-white dark:bg-[#150e10] p-0.5 rounded-lg border border-[#33272A]/20">
                  <button
                    type="button"
                    onClick={() => setWaterMode('include')}
                    className={`px-2 py-0.5 text-[10px] font-black rounded cursor-pointer ${
                      waterMode === 'include'
                        ? 'bg-blue-400 text-[#33272A]'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    เอาเฉพาะ
                  </button>
                  <button
                    type="button"
                    onClick={() => setWaterMode('exclude')}
                    className={`px-2 py-0.5 text-[10px] font-black rounded cursor-pointer ${
                      waterMode === 'exclude'
                        ? 'bg-rose-500 text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    ไม่เอา ❌
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 border-b border-[#33272A]/10 pb-1">
              <span>(เลือกแหล่งน้ำที่ต้องการกรองข้อมูล)</span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={selectAllWater}
                  className="text-blue-700 dark:text-blue-400 font-black hover:underline cursor-pointer"
                >
                  เลือกหมด
                </button>
                <span>|</span>
                <button
                  type="button"
                  onClick={clearWater}
                  className="text-rose-600 dark:text-rose-400 font-black hover:underline cursor-pointer"
                >
                  ล้าง
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {waterTypeList.map(item => {
                const isSelected = waterSelected.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleWaterType(item.id)}
                    className={`px-2.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all border cursor-pointer ${
                      isSelected
                        ? waterMode === 'include'
                          ? 'bg-blue-200 text-blue-950 border-[#33272A] shadow-sm'
                          : 'bg-rose-100 text-rose-950 border-rose-400 line-through'
                        : 'bg-white dark:bg-[#1a1214] text-slate-500 border-slate-300 dark:border-slate-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {isSelected ? <CheckSquare className="h-4 w-4 shrink-0 text-[#33272A]" /> : <Square className="h-4 w-4 shrink-0 text-slate-400" />}
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
              {waterSelected.length === 0 ? (
                <span className="text-rose-600 dark:text-rose-400 font-black">⚠️ ไม่ได้เลือกประเภทประปา - กรุณาเลือกอย่างน้อย 1 ประเภท</span>
              ) : waterSelected.length === waterTypeList.length ? (
                <span>✓ แสดงโรงเรียนทุกแหล่งน้ำ</span>
              ) : waterMode === 'include' ? (
                <span>✓ แสดงเฉพาะโรงเรียนประเภทแหล่งน้ำที่เลือก ({waterSelected.length} ประเภท)</span>
              ) : (
                <span>❌ ไม่แสดงโรงเรียนในประเภทแหล่งน้ำที่เลือก ({waterSelected.length} ประเภท)</span>
              )}
            </p>
          </div>

          {/* 3. กรองครูวิชาเอก & อำเภอ */}
          <div className="p-3.5 rounded-2xl bg-[#FFF9F5] dark:bg-[#251b1e] border-2 border-[#33272A]/30 dark:border-[#FFD3B6]/30 space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-purple-500 shrink-0" />
                  ครูวิชาเอก:
                </span>
                <div className="flex items-center bg-white dark:bg-[#150e10] p-0.5 rounded-lg border border-[#33272A]/20">
                  <button
                    type="button"
                    onClick={() => setMajorMode('has')}
                    className={`px-2 py-0.5 text-[10px] font-black rounded cursor-pointer ${
                      majorMode === 'has'
                        ? 'bg-purple-300 text-purple-950'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    มีวิชาเอก
                  </button>
                  <button
                    type="button"
                    onClick={() => setMajorMode('lacks')}
                    className={`px-2 py-0.5 text-[10px] font-black rounded cursor-pointer ${
                      majorMode === 'lacks'
                        ? 'bg-rose-500 text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    ไม่มี/ขาด
                  </button>
                </div>
              </div>

              <select
                value={selectedMajor}
                onChange={(e) => setSelectedMajor(e.target.value)}
                className="w-full rounded-xl border border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#150e10] dark:text-white px-2.5 py-1.5 text-xs font-bold cursor-pointer"
              >
                <option value="all">🎓 ทุกวิชาเอก</option>
                {availableMajors.map(m => (
                  <option key={m} value={m}>เอก{m}</option>
                ))}
              </select>
            </div>

            {/* อำเภอ */}
            <div className="space-y-1 pt-1 border-t border-[#33272A]/10 dark:border-[#FFD3B6]/10">
              <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                อำเภอ:
              </label>
              <select
                value={amphoeFilter}
                onChange={(e) => setAmphoeFilter(e.target.value)}
                className="w-full rounded-xl border border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#150e10] dark:text-white px-2.5 py-1.5 text-xs font-bold cursor-pointer"
              >
                <option value="all">📍 ทุกอำเภอ (แม่ฮ่องสอน เขต 1)</option>
                {availableAmphoes.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* รายการผลลัพธ์โรงเรียน */}
      <div className="card p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#33272A]/10 dark:border-[#FFD3B6]/20 pb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#FF8BA7]" />
            <h2 className="text-sm sm:text-base font-black text-[#33272A] dark:text-[#FFF9F5]">
              รายชื่อโรงเรียนตามเงื่อนไข ({filteredSchools.length} แห่ง)
            </h2>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ หรือรหัสโรงเรียน..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#1e1518] pl-9 pr-3 py-1.5 text-xs font-bold text-[#33272A] dark:text-[#FFF9F5] outline-none"
            />
          </div>
        </div>

        {/* List Grid Cards */}
        {filteredSchools.length === 0 ? (
          <div className="p-8 text-center bg-[#FFF9F5] dark:bg-[#1e1518] rounded-2xl border-2 border-dashed border-[#33272A]/20 dark:border-[#FFD3B6]/20 space-y-3">
            <AlertCircle className="h-10 w-10 text-rose-400 mx-auto" />
            <div>
              <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                ไม่พบโรงเรียนที่ตรงตามเงื่อนไขตัวกรองที่คุณกำหนด
              </p>
              <p className="text-xs font-bold text-slate-400 mt-1">
                ลองปรับเปลี่ยนเงื่อนไขการเลือกเอา / ไม่เอา หรือกดปุ่มล้างตัวกรอง
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn-cute bg-rose-500 text-white text-xs font-black px-4 py-2 rounded-xl border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] cursor-pointer inline-flex items-center gap-1.5"
            >
              <RotateCcw className="h-4 w-4" />
              <span>ล้างเงื่อนไขการกรองทั้งหมด</span>
            </button>
          </div>
        ) : (
          <>
            {/* Mobile View Card List (md:hidden) - ไม่ต้องเลื่อนซ้ายขวา กดที่ชื่อโรงเรียนเข้าดูรายละเอียดได้เลย */}
            <div className="md:hidden space-y-2.5">
              {filteredSchools.map((school) => {
                const updateInfo = getSchoolUpdateBadgeInfo(school.updatedAt, school.updatedBy);
                return (
                  <div
                    key={school.id}
                    onClick={() => onSelectSchool(school.id)}
                    className="p-3.5 rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#1e1518] shadow-[2px_2px_0px_#33272A] dark:shadow-[2px_2px_0px_#FFD3B6] hover:bg-[#FFF9F5] dark:hover:bg-[#261b1f] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="font-black text-sm text-[#33272A] dark:text-[#FFF9F5] group-hover:text-[#FF8BA7] transition-colors leading-tight">
                          {school.name}
                        </span>
                        <span 
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 shrink-0 ${updateInfo.badgeClass}`}
                          title={`${updateInfo.fullDateText}${updateInfo.updatedByText ? ' (' + updateInfo.updatedByText + ')' : ''}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${updateInfo.dotClass}`} />
                          <span>{updateInfo.shortLabel}</span>
                        </span>
                      </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {/* ไฟฟ้า */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border inline-flex items-center gap-1 ${
                        school.electricity === 'has_electric' || school.electricity === true
                          ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200'
                          : school.electricity === 'solar'
                          ? 'bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-950/80 dark:text-yellow-200'
                          : school.electricity === 'hybrid'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200'
                          : 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200'
                      }`}>
                        <Zap className="h-2.5 w-2.5 text-amber-500 fill-amber-400" />
                        {school.electricity === 'has_electric' || school.electricity === true ? 'ไฟฟ้าถาวร' :
                         school.electricity === 'solar' ? 'โซลาร์เซลล์' :
                         school.electricity === 'hybrid' ? 'ไฟฟ้าผสมผสาน' : 'ไม่มีไฟฟ้า'}
                      </span>

                      {/* อินเทอร์เน็ต */}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-950/80 dark:text-sky-200 inline-flex items-center gap-1">
                        <Globe className="h-2.5 w-2.5 text-sky-600" />
                        {school.internetType === 'fiber' ? 'เน็ต Fiber' :
                         school.internetType === 'satellite' ? 'ดาวเทียม' :
                         school.internetType === 'sim' ? 'SIM 4G' : 'ไม่มีเน็ต'}
                      </span>

                      {/* น้ำประปา */}
                      {(() => {
                        const wVal = String(school.waterSystem ?? '').toLowerCase();
                        const isGov = !wVal.includes('mountain') && !wVal.includes('ภูเขา') && !wVal.includes('none') && !wVal.includes('ไม่มี') && !wVal.includes('other') && !wVal.includes('อื่นๆ');
                        const isMountain = wVal.includes('mountain') || wVal.includes('ภูเขา');
                        const isNone = wVal.includes('none') || wVal.includes('ไม่มี');
                        const isOther = wVal.includes('other') || wVal.includes('อื่นๆ');
                        return (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border inline-flex items-center gap-1 ${
                            isGov
                              ? 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-200'
                              : isMountain
                              ? 'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/80 dark:text-cyan-200'
                              : isOther
                              ? 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/80 dark:text-purple-200'
                              : 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200'
                          }`}>
                            <Droplets className="h-2.5 w-2.5 text-blue-500 fill-blue-400" />
                            {isGov ? 'ประปาภาครัฐ' : isMountain ? 'ประปาภูเขา' : isOther ? 'น้ำอื่นๆ' : 'ไม่มีน้ำใช้'}
                          </span>
                        );
                      })()}

                      {/* วิชาเอก */}
                      {((school.majorSubjects && school.majorSubjects.length > 0) || (school.majorSubjectsWithStaff && school.majorSubjectsWithStaff.length > 0)) && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-950/80 dark:text-purple-200 inline-flex items-center gap-1">
                          <GraduationCap className="h-2.5 w-2.5 text-purple-600" />
                          {school.majorSubjects ? school.majorSubjects.slice(0, 2).join(', ') : school.majorSubjectsWithStaff?.slice(0, 2).map(m=>m.name).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center justify-center h-8 w-8 rounded-xl bg-[#FFF9F5] dark:bg-[#281c20] border border-[#33272A]/20 dark:border-[#FFD3B6]/20 text-[#33272A] dark:text-[#FFF9F5] group-hover:bg-[#FF8BA7] group-hover:text-[#33272A] transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
                );
              })}
            </div>

            {/* Desktop View Table (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[3px_3px_0px_#33272A] dark:shadow-[3px_3px_0px_#FFD3B6] bg-white dark:bg-[#1e1518]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFF9F5] dark:bg-[#281c20] text-[#33272A] dark:text-[#FFF9F5] font-black border-b-2 border-[#33272A] dark:border-[#FFD3B6]">
                  <tr>
                    <th className="p-3 text-center w-12">ลำดับ</th>
                    <th className="p-3">รหัส / ชื่อโรงเรียน</th>
                    <th className="p-3">อำเภอ</th>
                    <th className="p-3">ระบบไฟฟ้า</th>
                    <th className="p-3">อินเทอร์เน็ต</th>
                    <th className="p-3">น้ำประปา</th>
                    <th className="p-3">ครูวิชาเอก / บุคลากร</th>
                    <th className="p-3 text-center">อัปเดตล่าสุด</th>
                    <th className="p-3 text-center">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#33272A]/10 dark:divide-[#FFD3B6]/10 font-bold text-[#33272A] dark:text-[#FFF9F5]">
                  {filteredSchools.map((school, index) => {
                    const updateInfo = getSchoolUpdateBadgeInfo(school.updatedAt, school.updatedBy);
                    return (
                    <tr 
                      key={school.id}
                      onClick={() => onSelectSchool(school.id)}
                      className="hover:bg-[#FFF9F5] dark:hover:bg-[#261b1f] transition-colors cursor-pointer group"
                    >
                      <td className="p-3 text-center font-black text-slate-400 font-mono">
                        {index + 1}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#A0E7E5] text-[#33272A] border border-[#33272A] shrink-0">
                            {school.id}
                          </span>
                          <span className="font-black group-hover:text-[#FF8BA7] transition-colors text-sm">
                            {school.name}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        {school.amphoe || 'อ.เมืองแม่ฮ่องสอน'}
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border inline-flex items-center gap-1 ${
                          school.electricity === 'has_electric' || school.electricity === true
                            ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200'
                            : school.electricity === 'solar'
                            ? 'bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-950/80 dark:text-yellow-200'
                            : school.electricity === 'hybrid'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200'
                            : 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200'
                        }`}>
                          <Zap className="h-2.5 w-2.5 text-amber-500 fill-amber-400" />
                          {school.electricity === 'has_electric' || school.electricity === true ? 'ไฟฟ้าถาวร' :
                           school.electricity === 'solar' ? 'โซลาร์เซลล์' :
                           school.electricity === 'hybrid' ? 'ไฟฟ้าผสมผสาน' : 'ไม่มีไฟฟ้า'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-950/80 dark:text-sky-200 inline-flex items-center gap-1">
                          <Globe className="h-2.5 w-2.5 text-sky-600" />
                          {school.internetType === 'fiber' ? 'เน็ต Fiber' :
                           school.internetType === 'satellite' ? 'ดาวเทียม' :
                           school.internetType === 'sim' ? 'SIM 4G' : 'ไม่มีเน็ต'}
                        </span>
                      </td>
                      <td className="p-3">
                        {(() => {
                          const wVal = String(school.waterSystem ?? '').toLowerCase();
                          const isGov = !wVal.includes('mountain') && !wVal.includes('ภูเขา') && !wVal.includes('none') && !wVal.includes('ไม่มี') && !wVal.includes('other') && !wVal.includes('อื่นๆ');
                          const isMountain = wVal.includes('mountain') || wVal.includes('ภูเขา');
                          const isNone = wVal.includes('none') || wVal.includes('ไม่มี');
                          const isOther = wVal.includes('other') || wVal.includes('อื่นๆ');
                          return (
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border inline-flex items-center gap-1 ${
                              isGov
                                ? 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-200'
                                : isMountain
                                ? 'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/80 dark:text-cyan-200'
                                : isOther
                                ? 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/80 dark:text-purple-200'
                                : 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200'
                            }`}>
                              <Droplets className="h-2.5 w-2.5 text-blue-500 fill-blue-400" />
                              {isGov ? 'ประปาภาครัฐ' : isMountain ? 'ประปาภูเขา' : isOther ? 'น้ำอื่นๆ' : 'ไม่มีน้ำใช้'}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            บุคลากร {school.staffCount || 0} คน
                          </span>
                          {((school.majorSubjects && school.majorSubjects.length > 0) || (school.majorSubjectsWithStaff && school.majorSubjectsWithStaff.length > 0)) && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-950/80 dark:text-purple-200 inline-flex items-center gap-1 w-max">
                              <GraduationCap className="h-2.5 w-2.5 text-purple-600" />
                              {school.majorSubjects ? school.majorSubjects.slice(0, 2).join(', ') : school.majorSubjectsWithStaff?.slice(0, 2).map(m=>m.name).join(', ')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span 
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg border inline-flex items-center gap-1.5 shadow-2xs ${updateInfo.badgeClass}`}
                          title={`${updateInfo.fullDateText}${updateInfo.updatedByText ? ' (' + updateInfo.updatedByText + ')' : ''}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${updateInfo.dotClass}`} />
                          <span>{updateInfo.shortLabel}</span>
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSchool(school.id);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#FF8BA7] text-[#33272A] border-2 border-[#33272A] text-xs font-black hover:bg-rose-300 transition-colors inline-flex items-center gap-1 shadow-[2px_2px_0px_#33272A] cursor-pointer"
                        >
                          <span>รายละเอียด</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* 🔒 Modal บันทึกวัตถุประสงค์การเข้าถึงและดาวน์โหลดข้อมูล (Data Access Audit Trail Modal) */}
      {isDownloadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md card p-6 bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[6px_6px_0px_#33272A] dark:shadow-[6px_6px_0px_#FFD3B6] animate-zoom-in">
            <div className="flex items-center gap-3 text-[#33272A] dark:text-[#FFF9F5] mb-4">
              <div className="rounded-2xl bg-[#A0E7E5] border-2 border-[#33272A] dark:border-[#FFD3B6] p-2.5 text-[#33272A]">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black">บันทึกวัตถุประสงค์การเข้าถึงข้อมูล</h3>
                <p className="text-[10px] text-[#33272A]/70 dark:text-[#FFF9F5]/70 font-semibold">ตามมาตรการรักษาความปลอดภัยข้อมูล พรบ.คุ้มครองข้อมูลส่วนบุคคล</p>
              </div>
            </div>

            <p className="text-xs text-[#33272A] dark:text-[#FFF9F5] mb-4 font-bold leading-relaxed bg-[#FFD3B6]/40 p-3 rounded-2xl border border-[#33272A] dark:border-[#FFD3B6]">
              คุณกำลังจะดาวน์โหลดรายงานโครงสร้างพื้นฐานของ <span className="font-black text-[#33272A] dark:text-[#FFF9F5] underline decoration-[#FF8BA7] decoration-2">
                โรงเรียนที่คัดกรอง {filteredSchools.length} แห่ง
              </span> เพื่อนำไปประมวลผลหรือใช้งานภายนอก
            </p>

            <form onSubmit={handleConfirmDownload} className="space-y-4">
              {/* เลือกรูปแบบไฟล์ */}
              <div className="space-y-1">
                <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">รูปแบบไฟล์สำหรับดาวน์โหลด</label>
                <div className="grid grid-cols-3 gap-2">
                  <label className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border-2 cursor-pointer font-bold text-xs transition-all ${
                    downloadFormat === 'excel'
                      ? 'bg-emerald-300 border-[#33272A] text-emerald-950 shadow-sm'
                      : 'bg-white dark:bg-[#1e1518] border-slate-300 dark:border-slate-700 text-[#33272A] dark:text-[#FFF9F5]'
                  }`}>
                    <input
                      type="radio"
                      name="downloadFormat"
                      value="excel"
                      checked={downloadFormat === 'excel'}
                      onChange={() => setDownloadFormat('excel')}
                      className="hidden"
                    />
                    <span>📊 Excel</span>
                  </label>

                  <label className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border-2 cursor-pointer font-bold text-xs transition-all ${
                    downloadFormat === 'pdf'
                      ? 'bg-[#FF8BA7] border-[#33272A] text-[#33272A] shadow-sm'
                      : 'bg-white dark:bg-[#1e1518] border-slate-300 dark:border-slate-700 text-[#33272A] dark:text-[#FFF9F5]'
                  }`}>
                    <input
                      type="radio"
                      name="downloadFormat"
                      value="pdf"
                      checked={downloadFormat === 'pdf'}
                      onChange={() => setDownloadFormat('pdf')}
                      className="hidden"
                    />
                    <span>📄 PDF</span>
                  </label>

                  <label className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border-2 cursor-pointer font-bold text-xs transition-all ${
                    downloadFormat === 'csv'
                      ? 'bg-sky-300 border-[#33272A] text-sky-950 shadow-sm'
                      : 'bg-white dark:bg-[#1e1518] border-slate-300 dark:border-slate-700 text-[#33272A] dark:text-[#FFF9F5]'
                  }`}>
                    <input
                      type="radio"
                      name="downloadFormat"
                      value="csv"
                      checked={downloadFormat === 'csv'}
                      onChange={() => setDownloadFormat('csv')}
                      className="hidden"
                    />
                    <span>📁 CSV</span>
                  </label>
                </div>
              </div>

              {/* ชื่อ */}
              <div className="space-y-1">
                <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">ชื่อ-นามสกุลผู้ขอเข้าถึงข้อมูล</label>
                <input
                  type="text"
                  required
                  value={downloadName}
                  onChange={(e) => setDownloadName(e.target.value)}
                  placeholder="เช่น นายเอกชัย รักเรียน"
                  className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                />
              </div>

              {/* อีเมล */}
              <div className="space-y-1">
                <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">อีเมลติดต่อ</label>
                <input
                  type="email"
                  required
                  value={downloadEmail}
                  onChange={(e) => setDownloadEmail(e.target.value)}
                  placeholder="เช่น example@gmail.com"
                  className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                />
              </div>

              {/* หมายเหตุระบุวัตถุประสงค์ */}
              <div className="space-y-1">
                <label className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">ระบุวัตถุประสงค์ในการนำข้อมูลไปใช้</label>
                <textarea
                  required
                  value={downloadPurpose}
                  onChange={(e) => setDownloadPurpose(e.target.value)}
                  rows={3}
                  placeholder="เช่น นำไปใช้ทำแผนจัดสรรงบประมาณพัฒนาไฟฟ้าและอินเทอร์เน็ตโรงเรียนในพื้นที่ห่างไกล..."
                  className="w-full rounded-xl border-2 border-[#33272A] bg-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#FF8BA7] outline-none dark:border-[#FFD3B6] dark:bg-[#1e1518] dark:text-[#FFF9F5]"
                />
              </div>

              {/* Error box */}
              {downloadError && (
                <div className="flex gap-1.5 text-xs text-rose-600 font-black bg-rose-50 p-2.5 rounded-xl border-2 border-[#33272A]">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{downloadError}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDownloadModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border-2 border-[#33272A] font-black text-xs bg-slate-100 hover:bg-slate-200 text-[#33272A] transition-all cursor-pointer dark:bg-slate-800 dark:text-slate-200 dark:border-[#FFD3B6]"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isDownloading}
                  className="flex-1 py-2.5 rounded-xl border-2 border-[#33272A] font-black text-xs bg-[#FF8BA7] hover:bg-rose-300 text-[#33272A] shadow-[2px_2px_0px_#33272A] transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isDownloading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#33272A] border-t-transparent" />
                      <span>กำลังดาวน์โหลด...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>ยืนยันดาวน์โหลด</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
