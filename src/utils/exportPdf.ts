import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ExportPdfOptions {
  title: string;
  subtitle?: string;
  requesterInfo?: {
    name?: string;
    email?: string;
    purpose?: string;
  };
  headers: string[];
  rows: (string | number)[][];
  filename: string;
}

/**
 * ฟังก์ชันสร้างไฟล์ PDF ที่รองรับภาษาไทย 100% ผ่าน html2canvas + jsPDF
 */
export async function generatePdfReport({
  title,
  subtitle,
  requesterInfo,
  headers,
  rows,
  filename
}: ExportPdfOptions): Promise<void> {
  // สร้างคอนเทนเนอร์ชั่วคราวสำหรับจัดสไตล์รายงานก่อนแปลงเป็น PDF
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '1000px'; // ขนาดความกว้าง A4 Landscape ในสเกลพิกเซล
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#33272A';
  container.style.padding = '32px';
  container.style.fontFamily = `'Sarabun', 'Prompt', 'Sukhumvit Set', -apple-system, sans-serif`;

  const dateStr = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // สร้างเนื้อหา HTML รายงาน
  container.innerHTML = `
    <div style="border: 2px solid #33272A; border-radius: 16px; padding: 24px; background-color: #FFF9F5;">
      <!-- Header Area -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #33272A; padding-bottom: 16px; margin-bottom: 16px;">
        <div>
          <h1 style="font-size: 22px; font-weight: 900; color: #33272A; margin: 0 0 6px 0;">
            ${title}
          </h1>
          ${subtitle ? `<p style="font-size: 14px; font-weight: 700; color: #FF8BA7; margin: 0;">${subtitle}</p>` : ''}
          <p style="font-size: 12px; color: #666; margin: 4px 0 0 0;">
            สำนักงานเขตพื้นที่การศึกษาประถมศึกษาแม่ฮ่องสอน เขต 1 (สพป.แม่ฮ่องสอน เขต 1)
          </p>
        </div>
        <div style="text-align: right; font-size: 11px; color: #555;">
          <div style="font-weight: 800; color: #33272A; font-size: 13px;">MHS1 BIGDATA REPORT</div>
          <div>วันที่ออกรายงาน: ${dateStr}</div>
          <div>จำนวนรายการ: ${rows.length} รายการ</div>
        </div>
      </div>

      <!-- Requester Info (ถ้ามี) -->
      ${requesterInfo && (requesterInfo.name || requesterInfo.purpose) ? `
        <div style="background-color: #ffffff; border: 1.5px solid #33272A; border-radius: 12px; padding: 12px 16px; margin-bottom: 16px; font-size: 12px;">
          <div style="font-weight: 800; color: #33272A; margin-bottom: 4px;">ข้อมูลผู้ดาวน์โหลด/ขอออกรายงาน:</div>
          ${requesterInfo.name ? `<div>• ผู้ขอรายงาน: <strong>${requesterInfo.name}</strong> (${requesterInfo.email || '-'})</div>` : ''}
          ${requesterInfo.purpose ? `<div>• วัตถุประสงค์: ${requesterInfo.purpose}</div>` : ''}
        </div>
      ` : ''}

      <!-- Table Section -->
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
        <thead>
          <tr style="background-color: #33272A; color: #ffffff;">
            ${headers.map(h => `<th style="padding: 8px 10px; border: 1px solid #33272A; font-weight: 800; font-size: 11px;">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, idx) => `
            <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#FFF9F5'};">
              ${row.map(cell => `<td style="padding: 7px 10px; border: 1px solid #e2e8f0; vertical-align: top; font-weight: 600;">${cell !== undefined && cell !== null ? String(cell) : '-'}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Footer Sign / Timestamp -->
      <div style="margin-top: 24px; pt-12px; border-top: 1px solid #ccc; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #777;">
        <div>ระบบสารสนเทศเพื่อการบริหารจัดการข้อมูล BigData สพป.แม่ฮ่องสอน เขต 1</div>
        <div>หน้า 1 / 1 (ไฟล์ PDF รับรองโดยระบบอัตโนมัติ)</div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
