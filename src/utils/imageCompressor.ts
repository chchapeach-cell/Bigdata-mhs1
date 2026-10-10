/**
 * ยูทิลิตี้บีบอัดรูปภาพด้วย HTML5 Canvas
 * บีบอัดไฟล์รูปภาพต้นฉบับให้มีขนาดและคุณภาพที่เหมาะสม
 * ป้องกันปัญหาฐานข้อมูลบวม หรือภาพโหลดช้าในเครือข่าย
 */

export function compressImage(
  file: File, 
  maxWidth = 1280, 
  quality = 0.8, 
  maxFileSizeMB = 5
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('ไฟล์ที่เลือกไม่ใช่รูปภาพ กรุณาเลือกไฟล์ .JPG, .PNG หรือ .WEBP'));
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

        // คำนวณอัตราส่วนย่อรูปภาพให้อยู่ในขนาด maxWidth ที่กำหนด
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

        // เติมพื้นหลังสีขาว ป้องกันภาพ PNG พื้นหลังโปร่งใสกลายเป็นสีดำเมื่อแปลงเป็น JPEG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);
        // บีบอัดภาพให้อยู่ในฟอร์แมต image/jpeg คุณภาพคมชัดเหมาะสม
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error('ไม่สามารถโหลดรูปภาพเพื่อประมวลผลได้'));
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * 1. สำหรับรูปหน้าปกโรงเรียน / อาคารสถานที่ (Cover Image)
 * Input: ไม่เกิน 5 MB -> Output: กว้างไม่เกิน 1280 px (~150 - 250 KB)
 */
export function compressSchoolCover(file: File): Promise<string> {
  return compressImage(file, 1280, 0.8, 5);
}

/**
 * 2. สำหรับรูปผู้อำนวยการ / ผู้บริหารสถานศึกษา (Director Image)
 * Input: ไม่เกิน 5 MB -> Output: กว้างไม่เกิน 500 px (~50 - 90 KB)
 */
export function compressDirectorImage(file: File): Promise<string> {
  return compressImage(file, 500, 0.8, 5);
}

/**
 * 3. สำหรับรูปตราสัญลักษณ์โรงเรียน (School Logo)
 * Input: ไม่เกิน 3 MB -> Output: กว้างไม่เกิน 400 px (~30 - 60 KB)
 */
export function compressSchoolLogo(file: File): Promise<string> {
  return compressImage(file, 400, 0.82, 3);
}

/**
 * 4. สำหรับรูปโปรไฟล์ผู้ใช้งาน (User Avatar)
 * Input: ไม่เกิน 3 MB -> Output: กว้างไม่เกิน 300 px (~25 - 45 KB)
 */
export function compressUserAvatar(file: File): Promise<string> {
  return compressImage(file, 300, 0.8, 3);
}

/**
 * 5. สำหรับรูป QR Code
 * Input: ไม่เกิน 3 MB -> Output: กว้างไม่เกิน 400 px (~25 - 50 KB)
 */
export function compressQrCode(file: File): Promise<string> {
  return compressImage(file, 400, 0.85, 3);
}
