/**
 * ยูทิลิตี้บีบอัดรูปภาพด้วย HTML5 Canvas
 * บีบอัดไฟล์รูปภาพต้นฉบับ (เช่น รูปถ่าย 5-10MB จากกล้อง/มือถือ)
 * ให้เป็น Data URL ของ JPEG ขนาดกะทัดรัด (~50KB - 150KB)
 * ป้องกันปัญหา HTTP Payload Too Large หรือข้อผิดพลาดการอัปโหลดใน Supabase
 */
export function compressImage(file: File, maxWidth = 1200, quality = 0.75, maxFileSizeMB = 10): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('ไฟล์ที่เลือกไม่ใช่รูปภาพ'));
      return;
    }

    if (file.size > maxFileSizeMB * 1024 * 1024) {
      reject(new Error(`ขนาดไฟล์ต้นฉบับใหญ่เกินไป (${(file.size / (1024 * 1024)).toFixed(1)} MB) กรุณาเลือกรูปภาพที่มีขนาดไม่เกิน ${maxFileSizeMB} MB`));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // บีบอัดภาพให้อยู่ในฟอร์แมต image/jpeg คุณภาพ 0.75
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error('ไม่สามารถโหลดรูปภาพเพื่อบีบอัดได้'));
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
