import React, { useState, ChangeEvent } from 'react';
import { ContactChannel, SystemConfig, UserProfile } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { removeUndefinedFields } from '../utils/errorHelper';
import { doc, setDoc } from 'firebase/firestore';
import { dbSaveSystemConfig } from '../lib/dbAdapter';
import { 
  Phone, Mail, MessageCircle, Globe, MapPin, QrCode, Share2, Plus, Trash2, Edit3, 
  Eye, EyeOff, Save, CheckCircle2, Upload, AlertCircle, ExternalLink, X, Shield, Video, Sparkles
} from 'lucide-react';

interface ContactViewProps {
  systemConfig?: SystemConfig;
  userProfile: UserProfile | null;
  onRefreshData: () => Promise<void>;
}

export const DEFAULT_CONTACT_CHANNELS: ContactChannel[] = [
  {
    id: 'phone_1',
    name: 'โทรศัพท์สำนักงาน',
    type: 'phone',
    value: '053-611000',
    description: 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษาแม่ฮ่องสอน เขต 1 (เวลาทำการ 08.30 - 16.30 น.)',
    enabled: true,
  },
  {
    id: 'email_1',
    name: 'อีเมลติดต่อราชการ',
    type: 'email',
    value: 'mhs1@mhs1.go.th',
    description: 'ส่งหนังสือราชการและสอบถามข้อมูลข่าวสาร',
    enabled: true,
  },
  {
    id: 'line_1',
    name: 'Line Official Account',
    type: 'line',
    value: 'https://line.me',
    description: 'สแกน QR Code หรือเพิ่มเพื่อน Line เพื่อสอบถามข้อมูล',
    qrImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://mhs1.go.th',
    enabled: true,
  },
  {
    id: 'facebook_1',
    name: 'Facebook Page',
    type: 'facebook',
    value: 'https://facebook.com',
    description: 'เพจอย่างเป็นทางการ สพป.แม่ฮ่องสอน เขต 1',
    enabled: true,
  },
  {
    id: 'tiktok_1',
    name: 'TikTok Official',
    type: 'tiktok',
    value: 'https://tiktok.com',
    description: 'ติดตามคลิปข่าวสารกิจกรรมทางการศึกษา',
    enabled: true,
  },
  {
    id: 'address_1',
    name: 'ที่อยู่สำนักงาน',
    type: 'address',
    value: '123 ถนนขุนลุมประพาส ตำบลจองคำ อำเภอเมือง จังหวัดแม่ฮ่องสอน 58000',
    description: 'สพป.แม่ฮ่องสอน เขต 1',
    enabled: true,
  },
  {
    id: 'qr_1',
    name: 'QR Code ติดต่อสอบถาม / เว็บไซต์',
    type: 'qr_code',
    value: 'https://mhs1.go.th',
    description: 'สแกน QR Code เพื่อเข้าสู่ระบบสารสนเทศ',
    qrImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://mhs1.go.th',
    enabled: true,
  }
];

export default function ContactView({ systemConfig, userProfile, onRefreshData }: ContactViewProps) {
  const isSuperAdmin = userProfile?.role === 'super_admin' || userProfile?.email === 'tamrri@gmail.com' || userProfile?.email === 'ch.chapeach@gmail.com';
  const channels: ContactChannel[] = systemConfig?.contactChannels && systemConfig.contactChannels.length > 0
    ? systemConfig.contactChannels
    : DEFAULT_CONTACT_CHANNELS;

  const [isEditMode, setIsEditMode] = useState(false);
  const [editedChannels, setEditedChannels] = useState<ContactChannel[]>(channels);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Sync editedChannels when systemConfig contactChannels arrives or changes
  React.useEffect(() => {
    if (!isEditMode) {
      setEditedChannels(channels);
    }
  }, [systemConfig?.contactChannels, isEditMode]);

  // Modal ส่อง QR Code ขยายใหญ่
  const [enlargedQrUrl, setEnlargedQrUrl] = useState<{ url: string; title: string } | null>(null);

  // Form สำหรับเพิ่มรายการใหม่
  const [newType, setNewType] = useState<ContactChannel['type']>('phone');
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newQrUrl, setNewQrUrl] = useState('');

  // เปิด/ปิด โหมดแก้ไข
  const handleToggleEditMode = () => {
    if (!isEditMode) {
      setEditedChannels([...channels]);
    }
    setIsEditMode(!isEditMode);
    setSuccessMsg('');
    setErrorMsg('');
  };

  // บันทึกรายการลง Firestore
  const handleSaveContactChannels = async (updatedList: ContactChannel[]) => {
    if (!isSuperAdmin) return;
    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const sanitizedList = updatedList.map(item => ({
        id: item.id || `contact_${Date.now()}`,
        name: item.name || '',
        type: item.type || 'other',
        value: item.value || '',
        description: item.description || '',
        qrImageUrl: item.qrImageUrl || '',
        enabled: item.enabled ?? true
      }));

      const cleanData = removeUndefinedFields({
        contactChannels: sanitizedList,
        updatedAt: new Date()
      });
      await dbSaveSystemConfig(cleanData);

      setSuccessMsg('บันทึกข้อมูลช่องทางติดต่อสำเร็จแล้ว!');
      await onRefreshData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      handleFirestoreError(err, OperationType.WRITE, 'settings/system_config');
      setErrorMsg('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + (err.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  // สลับการแสดงผล (Toggle Enabled)
  const handleToggleEnabled = async (id: string) => {
    const nextList = editedChannels.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c);
    setEditedChannels(nextList);
    if (!isEditMode) {
      await handleSaveContactChannels(nextList);
    }
  };

  // ลบรายการ
  const handleDeleteChannel = async (id: string) => {
    if (confirm('คุณต้องการลบช่องทางติดต่อนี้ใช่หรือไม่?')) {
      const nextList = editedChannels.filter(c => c.id !== id);
      setEditedChannels(nextList);
      await handleSaveContactChannels(nextList);
    }
  };

  // เพิ่มรายการใหม่
  const handleAddChannel = async () => {
    if (!newName.trim() || !newValue.trim()) {
      alert('กรุณากรอกชื่อรายการและข้อมูลติดต่อ/ลิงก์ให้ครบถ้วน');
      return;
    }

    const newItem: ContactChannel = {
      id: `contact_${Date.now()}`,
      name: newName.trim(),
      type: newType,
      value: newValue.trim(),
      description: newDesc.trim() || '',
      qrImageUrl: newQrUrl.trim() || '',
      enabled: true
    };

    const nextList = [...editedChannels, newItem];
    setEditedChannels(nextList);

    // รีเซ็ตฟอร์ม
    setNewName('');
    setNewValue('');
    setNewDesc('');
    setNewQrUrl('');

    // บันทึกลง Firestore ทันที
    await handleSaveContactChannels(nextList);
  };

  // อัปโหลดไฟล์รูปภาพ QR Code
  const handleQrUpload = (evt: ChangeEvent<HTMLInputElement>, isForNew: boolean, targetId?: string) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('ไฟล์รูปภาพขนาดใหญ่เกินไป (กรุณาใช้ไฟล์ขนาดไม่เกิน 2MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        if (isForNew) {
          setNewQrUrl(result);
        } else if (targetId) {
          setEditedChannels(prev => prev.map(c => c.id === targetId ? { ...c, qrImageUrl: result } : c));
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // บันทึกฟอร์มใหญ่ทั้งหมด
  const handleSaveAll = async () => {
    await handleSaveContactChannels(editedChannels);
    setIsEditMode(false);
  };

  // สลับการเปิด-ปิด เมนูติดต่อสำหรับทุกคน (Super Admin เท่านั้น)
  const handleToggleContactMenu = async () => {
    if (!isSuperAdmin) return;
    const currentEnabled = systemConfig?.contactEnabled !== false;
    const nextEnabled = !currentEnabled;
    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await dbSaveSystemConfig({
        contactEnabled: nextEnabled,
        updatedAt: new Date()
      });

      setSuccessMsg(nextEnabled ? 'เปิดแสดงผลเมนู "ติดต่อ" ให้ทุกคนเห็นเรียบร้อยแล้ว!' : 'ซ่อนเมนู "ติดต่อ" จากทุกคนแล้ว (เห็นเฉพาะ Super Admin)!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error(err);
      handleFirestoreError(err, OperationType.WRITE, 'settings/system_config');
      setErrorMsg('เกิดข้อผิดพลาดในการบันทึกสถานะเมนูติดต่อ');
    } finally {
      setIsSaving(false);
    }
  };

  // เลือกไอคอนตามประเภท
  const renderIcon = (type: ContactChannel['type']) => {
    switch (type) {
      case 'phone':
        return <Phone className="h-6 w-6 text-emerald-500" />;
      case 'email':
        return <Mail className="h-6 w-6 text-sky-500" />;
      case 'line':
        return <MessageCircle className="h-6 w-6 text-emerald-600" />;
      case 'facebook':
        return <Globe className="h-6 w-6 text-blue-600" />;
      case 'tiktok':
        return <Video className="h-6 w-6 text-pink-500" />;
      case 'address':
        return <MapPin className="h-6 w-6 text-rose-500" />;
      case 'qr_code':
        return <QrCode className="h-6 w-6 text-purple-600" />;
      default:
        return <Share2 className="h-6 w-6 text-amber-500" />;
    }
  };

  const activeChannels = isSuperAdmin ? channels : channels.filter(c => c.enabled);

  if (systemConfig?.contactEnabled === false && !isSuperAdmin) {
    return (
      <div className="card p-8 text-center bg-white dark:bg-[#1e1518] space-y-4 max-w-xl mx-auto border-2 border-[#33272A] shadow-[4px_4px_0px_#33272A] rounded-2xl my-8">
        <div className="text-5xl mb-2">🔒</div>
        <h2 className="text-xl font-black text-[#33272A] dark:text-[#FFF9F5]">ระบบปิดการแสดงผลเมนูติดต่อ</h2>
        <p className="text-xs font-bold text-[#33272A]/70 dark:text-[#FFF9F5]/70">
          ขณะนี้ผู้ดูแลระบบ (Super Admin) ได้ซ่อนเมนูติดต่อสำหรับผู้ใช้งานทั่วไป
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-6 py-4">
      {/* Header Banner Section */}
      <div className="card p-6 bg-gradient-to-r from-[#FFF9F5] via-white to-[#FFD3B6]/30 dark:from-[#1e1518] dark:via-[#150e10] dark:to-[#2e1d23] border-2 border-[#33272A] dark:border-[#FFD3B6] relative overflow-hidden shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1 z-10">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#FF8BA7] text-[#33272A] font-black text-xs border border-[#33272A] shadow-sm flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> ช่องทางติดต่อสื่อสาร
              </span>
              {isSuperAdmin && (
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold text-[11px] border border-emerald-400 flex items-center gap-1">
                  <Shield className="h-3 w-3 text-emerald-600" /> Super Admin
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#33272A] dark:text-[#FFF9F5]">
              ติดต่อสอบถาม สพป.แม่ฮ่องสอน เขต 1
            </h1>
            <p className="text-xs sm:text-sm font-bold text-[#33272A]/80 dark:text-[#FFF9F5]/80">
              สำนักงานเขตพื้นที่การศึกษาประถมศึกษาแม่ฮ่องสอน เขต 1 (Primary Educational Service Area Office Mae Hong Son Zone 1)
            </p>
          </div>

          {/* ปุ่มจัดการสำหรับ Super Admin */}
          {isSuperAdmin && (
            <div className="flex flex-wrap items-center gap-3 z-10 shrink-0">
              <button
                type="button"
                onClick={handleToggleEditMode}
                className="btn-cute bg-[#A0E7E5] text-[#33272A] px-4 py-2 text-xs font-black flex items-center gap-2 border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] cursor-pointer hover:bg-teal-300 shrink-0"
              >
                {isEditMode ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                <span>{isEditMode ? 'ปิดการจัดการ' : '⚙️ จัดการ/เพิ่มช่องทางติดต่อ & QR Code'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-100 text-emerald-900 border-2 border-emerald-400 rounded-2xl text-xs font-black flex items-center gap-2 shadow-sm animate-fadeIn">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-100 text-rose-900 border-2 border-rose-400 rounded-2xl text-xs font-black flex items-center gap-2 shadow-sm">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* โหมดแก้ไขข้อมูลโดย Super Admin */}
      {isEditMode && isSuperAdmin && (
        <div className="card p-6 space-y-6 bg-white dark:bg-[#1e1518] border-2 border-[#FF8BA7] dark:border-[#FF8BA7]">
          <div className="flex items-center justify-between border-b-2 border-[#33272A] pb-3 dark:border-[#FFD3B6]">
            <h2 className="text-base font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-[#FF8BA7]" />
              จัดการช่องทางติดต่อ &amp; เพิ่มรูปภาพ QR Code (สิทธิ์ Super Admin)
            </h2>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="btn-cute bg-emerald-400 text-[#33272A] px-4 py-2 text-xs font-black flex items-center gap-1.5 border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] cursor-pointer hover:bg-emerald-500 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไขทั้งหมด'}</span>
            </button>
          </div>

          {/* ฟอร์มเพิ่มรายการใหม่ */}
          <div className="p-4 rounded-2xl bg-[#FFF9F5] dark:bg-[#150e10] border-2 border-[#33272A] dark:border-[#FFD3B6] space-y-4">
            <h3 className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5] flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-[#FF8BA7]" /> เพิ่มช่องทางติดต่อ หรือ รูป QR Code ใหม่
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-bold">
              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                  ประเภทช่องทาง
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#1e1518] dark:text-[#FFF9F5] px-3 py-2 font-bold outline-none"
                >
                  <option value="phone">📞 โทรศัพท์</option>
                  <option value="email">✉️ อีเมล</option>
                  <option value="line">💬 Line / Line Official</option>
                  <option value="facebook">📘 Facebook Page / Group</option>
                  <option value="tiktok">🎵 TikTok</option>
                  <option value="address">📍 ที่อยู่ / แผนที่</option>
                  <option value="qr_code">📷 รูปภาพ QR Code</option>
                  <option value="other">🌐 อื่นๆ / เว็บไซต์</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                  ชื่อหัวข้อ (เช่น Line Official, เบอร์โทรด่วน)
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="เช่น Line สพป.แม่ฮ่องสอน เขต 1"
                  className="w-full rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#1e1518] dark:text-[#FFF9F5] px-3 py-2 font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                  เบอร์โทร / ลิงก์ URL / ที่อยู่
                </label>
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="เช่น 053-611000 หรือ https://facebook.com/..."
                  className="w-full rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#1e1518] dark:text-[#FFF9F5] px-3 py-2 font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                  คำอธิบายเพิ่มเติม
                </label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="เช่น ติดต่อฝ่ายอำนวยการ"
                  className="w-full rounded-xl border-2 border-[#33272A] dark:border-[#FFD3B6] bg-white dark:bg-[#1e1518] dark:text-[#FFF9F5] px-3 py-2 font-bold outline-none"
                />
              </div>
            </div>

            {/* ส่วนเลือก/อัปโหลด รูป QR Code */}
            <div className="p-3 bg-white dark:bg-[#1e1518] rounded-xl border border-[#33272A]/20 dark:border-[#FFD3B6]/20 space-y-2">
              <label className="block text-[11px] font-black text-[#33272A] dark:text-[#FFF9F5]">
                📷 อัปโหลดรูปภาพ QR Code (ถ้ามี)
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="btn-cute bg-[#FF8BA7] text-[#33272A] px-3 py-1.5 text-xs font-black flex items-center gap-1 border border-[#33272A] cursor-pointer hover:bg-rose-300">
                  <Upload className="h-3.5 w-3.5" /> เลือกไฟล์ QR Code จากเครื่อง
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleQrUpload(e, true)}
                    className="hidden"
                  />
                </label>
                <span className="text-xs font-bold text-slate-400">หรือใส่ URL รูปภาพ:</span>
                <input
                  type="url"
                  value={newQrUrl}
                  onChange={(e) => setNewQrUrl(e.target.value)}
                  placeholder="https://example.com/qrcode.png"
                  className="flex-1 min-w-[200px] text-xs font-bold px-3 py-1.5 rounded-lg border border-[#33272A] dark:border-[#FFD3B6] dark:bg-[#150e10] dark:text-[#FFF9F5]"
                />
              </div>
              {newQrUrl && (
                <div className="flex items-center gap-2 pt-1">
                  <img src={newQrUrl} alt="Preview QR" className="h-12 w-12 object-cover rounded-lg border border-slate-300" />
                  <span className="text-[10px] text-emerald-600 font-bold">มีรูปภาพ QR Code พร้อมแสดงผล</span>
                  <button type="button" onClick={() => setNewQrUrl('')} className="text-[10px] text-rose-500 underline font-bold">ลบรูป</button>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddChannel}
                className="btn-cute bg-[#A0E7E5] text-[#33272A] px-5 py-2 text-xs font-black flex items-center gap-1.5 border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A] cursor-pointer hover:bg-teal-300"
              >
                <Plus className="h-4 w-4" /> เพิ่มช่องทางนี้
              </button>
            </div>
          </div>

          {/* รายการที่มีอยู่ในระบบสำหรับแก้ไข/ลบ/ซ่อน */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-[#33272A] dark:text-[#FFF9F5]">
              รายการช่องทางติดต่อในระบบทั้งหมด ({editedChannels.length} รายการ)
            </h3>

            <div className="grid grid-cols-1 gap-3">
              {editedChannels.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border-2 transition-all space-y-3 ${
                    item.enabled
                      ? 'bg-white dark:bg-[#1a1214] border-[#33272A] dark:border-[#FFD3B6]'
                      : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-[#FFF9F5] dark:bg-[#2e1d23] border border-[#33272A]/20">
                        {renderIcon(item.type)}
                      </span>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditedChannels(prev => prev.map(c => c.id === item.id ? { ...c, name: val } : c));
                        }}
                        className="font-black text-sm text-[#33272A] dark:text-[#FFF9F5] bg-transparent border-b border-dashed border-[#33272A]/40 outline-none px-1"
                      />
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        item.enabled ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-200 text-slate-700 border-slate-400'
                      }`}>
                        {item.enabled ? '👁️ แสดงผล' : '🙈 ซ่อนอยู่'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FFF9F5] dark:bg-slate-800 rounded-xl border border-[#33272A] dark:border-[#FFD3B6]">
                        <span className="text-[10px] font-black text-[#33272A] dark:text-[#FFF9F5]">
                          {item.enabled ? '🟢 กำลังเปิดแสดงผล' : '🔴 กำลังปิดซ่อนอยู่'}
                        </span>
                        <label className="switch" title={item.enabled ? 'คลิกสวิตช์เพื่อปิดซ่อนช่องทางนี้' : 'คลิกสวิตช์เพื่อเปิดแสดงผลช่องทางนี้'}>
                          <input
                            type="checkbox"
                            checked={item.enabled}
                            onChange={() => handleToggleEnabled(item.id)}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteChannel(item.id)}
                        className="btn-cute bg-rose-500 text-white px-2.5 py-1 text-[11px] font-black flex items-center gap-1 border border-[#33272A] cursor-pointer hover:bg-rose-600"
                        title="ลบช่องทางนี้"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> ลบ
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">เบอร์โทร / URL / ข้อมูล</label>
                      <input
                        type="text"
                        value={item.value}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditedChannels(prev => prev.map(c => c.id === item.id ? { ...c, value: val } : c));
                        }}
                        className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-[#33272A]/30 dark:border-[#FFD3B6]/30 dark:bg-[#150e10] dark:text-[#FFF9F5]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">คำอธิบาย</label>
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditedChannels(prev => prev.map(c => c.id === item.id ? { ...c, description: val } : c));
                        }}
                        className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-[#33272A]/30 dark:border-[#FFD3B6]/30 dark:bg-[#150e10] dark:text-[#FFF9F5]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">รูปภาพ QR Code (ถ้ามี)</label>
                      <div className="flex items-center gap-2">
                        <label className="btn-cute bg-[#FF8BA7] text-[#33272A] px-2 py-1 text-[10px] font-black flex items-center gap-1 border border-[#33272A] cursor-pointer shrink-0">
                          <Upload className="h-3 w-3" /> เปลี่ยน QR
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleQrUpload(e, false, item.id)}
                            className="hidden"
                          />
                        </label>
                        {item.qrImageUrl ? (
                          <div className="flex items-center gap-1.5">
                            <img src={item.qrImageUrl} alt="QR" className="h-7 w-7 object-cover rounded border" />
                            <button
                              type="button"
                              onClick={() => setEditedChannels(prev => prev.map(c => c.id === item.id ? { ...c, qrImageUrl: undefined } : c))}
                              className="text-[10px] text-rose-500 font-bold underline"
                            >
                              ลบ QR
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold">ไม่มีรูป QR</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Grid ช่องทางการติดต่อสำหรับแสดงผลแก่ผู้ใช้งานทั่วไป */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeChannels.map((channel) => {
          const isPhone = channel.type === 'phone';
          const isEmail = channel.type === 'email';
          const isLink = ['line', 'facebook', 'tiktok', 'other'].includes(channel.type);
          const isAddress = channel.type === 'address';

          return (
            <div
              key={channel.id}
              className={`card p-5 relative overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col justify-between space-y-4 ${
                !channel.enabled
                  ? 'opacity-50 bg-gray-100 dark:bg-slate-900 border-dashed border-2 border-gray-300'
                  : 'bg-white dark:bg-[#1e1518] border-2 border-[#33272A] dark:border-[#FFD3B6]'
              }`}
            >
              {!channel.enabled && isSuperAdmin && (
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-800 text-white text-[10px] font-black">
                  🙈 ซ่อนจากบุคคลทั่วไป
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-[#FFF9F5] dark:bg-[#2e1d23] border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-[2px_2px_0px_#33272A] shrink-0">
                      {renderIcon(channel.type)}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#33272A] dark:text-[#FFF9F5]">
                        {channel.name}
                      </h3>
                      {channel.description && (
                        <p className="text-[11px] font-bold text-[#33272A]/70 dark:text-[#FFF9F5]/70 line-clamp-2">
                          {channel.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* ค่าข้อมูลติดต่อ */}
                <div className="p-3 bg-[#FFF9F5] dark:bg-[#150e10] rounded-xl border border-[#33272A]/20 dark:border-[#FFD3B6]/20 font-bold text-xs text-[#33272A] dark:text-[#FFF9F5] break-words">
                  {channel.value}
                </div>

                {/* แสดงผลรูปภาพ QR Code (ถ้ามี) */}
                {channel.qrImageUrl && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center space-y-2">
                    <button
                      type="button"
                      onClick={() => setEnlargedQrUrl({ url: channel.qrImageUrl!, title: channel.name })}
                      className="group relative cursor-pointer block p-2 bg-white rounded-xl border-2 border-[#33272A] shadow-sm hover:scale-105 transition-transform"
                      title="กดเพื่อขยายรูปภาพ QR Code"
                    >
                      <img
                        src={channel.qrImageUrl}
                        alt={`QR Code ${channel.name}`}
                        className="h-32 w-32 object-contain mx-auto rounded-lg"
                      />
                      <span className="text-[10px] font-black text-slate-600 block text-center mt-1 group-hover:text-[#FF8BA7]">
                        🔍 กดเพื่อขยายรูปภาพ
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* ปุ่ม Action (กดเพื่อโทร, ส่งอีเมล, หรือเปิดลิงก์) */}
              <div className="pt-2">
                {isPhone && (
                  <a
                    href={`tel:${channel.value.replace(/[^0-9]/g, '')}`}
                    className="btn-cute w-full bg-emerald-400 hover:bg-emerald-500 text-[#33272A] py-2 text-xs font-black flex items-center justify-center gap-1.5 border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A]"
                  >
                    <Phone className="h-4 w-4" /> โทรหาเบอร์นี้
                  </a>
                )}

                {isEmail && (
                  <a
                    href={`mailto:${channel.value}`}
                    className="btn-cute w-full bg-sky-400 hover:bg-sky-500 text-[#33272A] py-2 text-xs font-black flex items-center justify-center gap-1.5 border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A]"
                  >
                    <Mail className="h-4 w-4" /> ส่งอีเมล
                  </a>
                )}

                {isLink && channel.value.startsWith('http') && (
                  <a
                    href={channel.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-cute w-full bg-[#FF8BA7] hover:bg-rose-400 text-[#33272A] py-2 text-xs font-black flex items-center justify-center gap-1.5 border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A]"
                  >
                    <ExternalLink className="h-4 w-4" /> เปิดลิงก์ภายนอก
                  </a>
                )}

                {isAddress && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(channel.value)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-cute w-full bg-amber-400 hover:bg-amber-500 text-[#33272A] py-2 text-xs font-black flex items-center justify-center gap-1.5 border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A]"
                  >
                    <MapPin className="h-4 w-4" /> เปิดแผนที่ Google Maps
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal ดู QR Code ขยายใหญ่ */}
      {enlargedQrUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="card p-6 bg-white dark:bg-[#1e1518] max-w-sm w-full space-y-4 border-2 border-[#33272A] dark:border-[#FFD3B6] shadow-2xl relative text-center">
            <button
              type="button"
              onClick={() => setEnlargedQrUrl(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-rose-100 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-black text-[#33272A] dark:text-[#FFF9F5] pr-6">
              📷 {enlargedQrUrl.title}
            </h3>

            <div className="p-3 bg-white rounded-2xl border-2 border-[#33272A] shadow-inner inline-block">
              <img
                src={enlargedQrUrl.url}
                alt={enlargedQrUrl.title}
                className="max-h-72 w-auto mx-auto object-contain rounded-lg"
              />
            </div>

            <p className="text-xs font-bold text-slate-500">
              ใช้แอปพลิเคชันกล้องถ่ายรูป หรือ Line ในสมาร์ตโฟนเพื่อสแกน QR Code นี้
            </p>

            <button
              type="button"
              onClick={() => setEnlargedQrUrl(null)}
              className="btn-cute w-full bg-[#FF8BA7] text-[#33272A] py-2 text-xs font-black border-2 border-[#33272A] shadow-[2px_2px_0px_#33272A]"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
