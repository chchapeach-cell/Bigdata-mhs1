const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace everything from `      // ดึงนโยบายและค่าตั้งค่าระบบ` down to `      if (schoolsList.length === 0) {`
const startRegex = /\s*\/\/\s*ดึงนโยบายและค่าตั้งค่าระบบ/;
const endText = "      if (schoolsList.length === 0) {";
const startMatch = code.match(startRegex);

if (startMatch) {
  const startIndex = startMatch.index;
  const endIndex = code.indexOf(endText, startIndex);
  if (endIndex !== -1) {
    const replacement = `
      // 1. ถ้าเชื่อมต่อ Supabase ไม่ได้ หรือไม่มีข้อมูลใน Supabase ให้โหลดข้อมูลตั้งต้น (Preset Data)
      const schoolsList: School[] = [];
      const studentsList: StudentData[] = [];
      const studentsGList: StudentGData[] = [];

${endText}`;
    code = code.substring(0, startIndex) + replacement + code.substring(endIndex + endText.length);
    fs.writeFileSync('src/App.tsx', code);
    console.log('App.tsx fixed successfully');
  } else {
    console.log('Could not find endText');
  }
} else {
  console.log('Could not find start regex');
}
