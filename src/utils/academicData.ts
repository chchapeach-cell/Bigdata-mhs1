import { School, AcademicRecord, QualityLevel } from '../types';
import * as XLSX from 'xlsx';

// เกณฑ์การตัดสินระดับคุณภาพตามเกณฑ์มาตรฐาน สพฐ.
export function determineQualityLevel(percentage: number): QualityLevel {
  if (percentage >= 70) return 'ดีมาก';
  if (percentage >= 50) return 'ดี';
  if (percentage >= 30) return 'พอใช้';
  return 'ปรับปรุง';
}

// ฐานข้อมูลแม่แบบ 128 รายการ พร้อมรหัสโรงเรียน 8 หลัก และข้อมูลผลการประเมิน NT สพป.แม่ฮ่องสอน เขต 1
export const RAW_INITIAL_NT_DATA = [
  { order: 1, schoolId: "58010057", name: "ขุนยวม", amphoe: "ขุนยวม", mathScore: 43.92, mathPercentage: 43.92, thaiScore: 50.21, thaiPercentage: 50.21, totalScore: 47.06, totalPercentage: 47.06, mathQuality: "พอใช้", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 2, schoolId: "58010058", name: "อนุบาลขุนยวม", amphoe: "ขุนยวม", mathScore: 52.14, mathPercentage: 52.14, thaiScore: 57.42, thaiPercentage: 57.42, totalScore: 54.78, totalPercentage: 54.78, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 3, schoolId: "58010059", name: "ชุมชนต่อแพวิทยา", amphoe: "ขุนยวม", mathScore: 48.71, mathPercentage: 48.71, thaiScore: 59.59, thaiPercentage: 59.59, totalScore: 54.15, totalPercentage: 54.15, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 4, schoolId: "58010060", name: "บ้านห้วยนา", amphoe: "ขุนยวม", mathScore: 40.00, mathPercentage: 40.00, thaiScore: 53.80, thaiPercentage: 53.80, totalScore: 46.90, totalPercentage: 46.90, mathQuality: "พอใช้", thaiQuality: "ดี", totalQuality: "พอใช้" },
  { order: 5, schoolId: "58010061", name: "บ้านแม่สุริน", amphoe: "ขุนยวม", mathScore: 45.60, mathPercentage: 45.60, thaiScore: 57.90, thaiPercentage: 57.90, totalScore: 51.75, totalPercentage: 51.75, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 6, schoolId: "58010062", name: "ห้วยต้นนุ่นวิทยา", amphoe: "ขุนยวม", mathScore: 60.00, mathPercentage: 60.00, thaiScore: 44.50, thaiPercentage: 44.50, totalScore: 52.25, totalPercentage: 52.25, mathQuality: "ดี", thaiQuality: "พอใช้", totalQuality: "ดี" },
  { order: 7, schoolId: "58010063", name: "บ้านแม่สะเป่ใต้", amphoe: "ขุนยวม", mathScore: 57.00, mathPercentage: 57.00, thaiScore: 49.35, thaiPercentage: 49.35, totalScore: 53.17, totalPercentage: 53.17, mathQuality: "ดี", thaiQuality: "พอใช้", totalQuality: "ดี" },
  { order: 8, schoolId: "58010064", name: "ตชด..บำรุงที่ 60", amphoe: "ขุนยวม", mathScore: 32.16, mathPercentage: 32.16, thaiScore: 50.66, thaiPercentage: 50.66, totalScore: 41.41, totalPercentage: 41.41, mathQuality: "พอใช้", thaiQuality: "ดี", totalQuality: "พอใช้" },
  { order: 9, schoolId: "58010065", name: "บ้านหัวปอน", amphoe: "ขุนยวม", mathScore: 28.50, mathPercentage: 28.50, thaiScore: 40.25, thaiPercentage: 40.25, totalScore: 34.37, totalPercentage: 34.37, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 10, schoolId: "58010066", name: "บ้านพัฒนา", amphoe: "ขุนยวม", mathScore: 43.33, mathPercentage: 43.33, thaiScore: 51.83, thaiPercentage: 51.83, totalScore: 47.58, totalPercentage: 47.58, mathQuality: "พอใช้", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 11, schoolId: "58010067", name: "บ้านคำสุข", amphoe: "ขุนยวม", mathScore: 44.33, mathPercentage: 44.33, thaiScore: 58.83, thaiPercentage: 58.83, totalScore: 51.58, totalPercentage: 51.58, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 12, schoolId: "58010068", name: "บ้านนางิ้ว", amphoe: "ขุนยวม", mathScore: 54.00, mathPercentage: 54.00, thaiScore: 38.50, thaiPercentage: 38.50, totalScore: 46.25, totalPercentage: 46.25, mathQuality: "ดี", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 13, schoolId: "58010069", name: "บ้านแม่อูคอ", amphoe: "ขุนยวม", mathScore: 51.12, mathPercentage: 51.12, thaiScore: 57.00, thaiPercentage: 57.00, totalScore: 54.06, totalPercentage: 54.06, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 14, schoolId: "58010070", name: "บ้านหัวแม่สุริน", amphoe: "ขุนยวม", mathScore: 54.00, mathPercentage: 54.00, thaiScore: 53.25, thaiPercentage: 53.25, totalScore: 53.62, totalPercentage: 53.62, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 15, schoolId: "58010071", name: "บ้านปางตอง", amphoe: "ขุนยวม", mathScore: 36.36, mathPercentage: 36.36, thaiScore: 36.04, thaiPercentage: 36.04, totalScore: 36.20, totalPercentage: 36.20, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 16, schoolId: "58010072", name: "บ้านแม่หาด", amphoe: "ขุนยวม", mathScore: 28.00, mathPercentage: 28.00, thaiScore: 43.25, thaiPercentage: 43.25, totalScore: 35.62, totalPercentage: 35.62, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 17, schoolId: "58010073", name: "บ้านแม่อูคอหลวง", amphoe: "ขุนยวม", mathScore: 20.40, mathPercentage: 20.40, thaiScore: 27.90, thaiPercentage: 27.90, totalScore: 24.15, totalPercentage: 24.15, mathQuality: "ปรับปรุง", thaiQuality: "ปรับปรุง", totalQuality: "ปรับปรุง" },
  { order: 18, schoolId: "58010074", name: "ชุมชนบ้านเมืองปอน", amphoe: "ขุนยวม", mathScore: 60.33, mathPercentage: 60.33, thaiScore: 57.25, thaiPercentage: 57.25, totalScore: 58.79, totalPercentage: 58.79, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 19, schoolId: "58010075", name: "บ้านแม่แจ๊ะ", amphoe: "ขุนยวม", mathScore: 70.50, mathPercentage: 70.50, thaiScore: 63.50, thaiPercentage: 63.50, totalScore: 67.00, totalPercentage: 67.00, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 20, schoolId: "58010076", name: "บ้านหว่าโน", amphoe: "ขุนยวม", mathScore: 35.00, mathPercentage: 35.00, thaiScore: 42.62, thaiPercentage: 42.62, totalScore: 38.81, totalPercentage: 38.81, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 21, schoolId: "58010077", name: "บ้านแม่กิ๊", amphoe: "ขุนยวม", mathScore: 56.50, mathPercentage: 56.50, thaiScore: 74.62, thaiPercentage: 74.62, totalScore: 65.56, totalPercentage: 65.56, mathQuality: "ดี", thaiQuality: "ดีมาก", totalQuality: "ดี" },
  { order: 22, schoolId: "58010078", name: "บ้านแม่โกปี่", amphoe: "ขุนยวม", mathScore: 30.00, mathPercentage: 30.00, thaiScore: 38.85, thaiPercentage: 38.85, totalScore: 34.42, totalPercentage: 34.42, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 23, schoolId: "58010079", name: "บ้านห้วยส้าน", amphoe: "ขุนยวม", mathScore: 44.00, mathPercentage: 44.00, thaiScore: 61.90, thaiPercentage: 61.90, totalScore: 52.95, totalPercentage: 52.95, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 24, schoolId: "58010080", name: "บ้านท่าหินส้ม", amphoe: "ขุนยวม", mathScore: 59.40, mathPercentage: 59.40, thaiScore: 51.40, thaiPercentage: 51.40, totalScore: 55.40, totalPercentage: 55.40, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 25, schoolId: "58010081", name: "บ้านหนองแห้ง", amphoe: "ขุนยวม", mathScore: 20.80, mathPercentage: 20.80, thaiScore: 36.90, thaiPercentage: 36.90, totalScore: 28.85, totalPercentage: 28.85, mathQuality: "ปรับปรุง", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 26, schoolId: "58010082", name: "บ้านแม่ลาก๊ะ", amphoe: "ขุนยวม", mathScore: 72.00, mathPercentage: 72.00, thaiScore: 76.00, thaiPercentage: 76.00, totalScore: 74.00, totalPercentage: 74.00, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 27, schoolId: "58010083", name: "บ้านมะหินหลวง", amphoe: "ขุนยวม", mathScore: 73.50, mathPercentage: 73.50, thaiScore: 70.25, thaiPercentage: 70.25, totalScore: 71.87, totalPercentage: 71.87, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 28, schoolId: "58010084", name: "บ้านแม่โข่จู", amphoe: "ขุนยวม", mathScore: 78.20, mathPercentage: 78.20, thaiScore: 70.20, thaiPercentage: 70.20, totalScore: 74.20, totalPercentage: 74.20, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 29, schoolId: "58010129", name: "อนุบาลปาย (เวียงใต้)", amphoe: "ปาย", mathScore: 47.33, mathPercentage: 47.33, thaiScore: 50.77, thaiPercentage: 50.77, totalScore: 49.05, totalPercentage: 49.05, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 30, schoolId: "58010130", name: "บ้านน้ำฮู", amphoe: "ปาย", mathScore: 34.82, mathPercentage: 34.82, thaiScore: 41.43, thaiPercentage: 41.43, totalScore: 38.84, totalPercentage: 38.84, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 31, schoolId: "58010131", name: "บ้านใหม่สหสัมพันธ์", amphoe: "ปาย", mathScore: 34.53, mathPercentage: 34.53, thaiScore: 58.73, thaiPercentage: 58.73, totalScore: 46.63, totalPercentage: 46.63, mathQuality: "พอใช้", thaiQuality: "ดี", totalQuality: "พอใช้" },
  { order: 32, schoolId: "58010132", name: "บ้านเวียงเหนือ", amphoe: "ปาย", mathScore: 31.75, mathPercentage: 31.75, thaiScore: 43.66, thaiPercentage: 43.66, totalScore: 37.70, totalPercentage: 37.70, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 33, schoolId: "58010133", name: "สังวาลย์วิทย์ 3", amphoe: "ปาย", mathScore: 38.92, mathPercentage: 38.92, thaiScore: 51.42, thaiPercentage: 51.42, totalScore: 45.17, totalPercentage: 45.17, mathQuality: "พอใช้", thaiQuality: "ดี", totalQuality: "พอใช้" },
  { order: 34, schoolId: "58010134", name: "บ้านน้ำปลามุง", amphoe: "ปาย", mathScore: 13.66, mathPercentage: 13.66, thaiScore: 37.83, thaiPercentage: 37.83, totalScore: 25.75, totalPercentage: 25.75, mathQuality: "ปรับปรุง", thaiQuality: "พอใช้", totalQuality: "ปรับปรุง" },
  { order: 35, schoolId: "58010135", name: "ชุมชนบ้านแม่ฮี้", amphoe: "ปาย", mathScore: 23.92, mathPercentage: 23.92, thaiScore: 42.92, thaiPercentage: 42.92, totalScore: 33.42, totalPercentage: 33.42, mathQuality: "ปรับปรุง", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 36, schoolId: "58010136", name: "บ้านทุ่งยาว", amphoe: "ปาย", mathScore: 32.35, mathPercentage: 32.35, thaiScore: 34.89, thaiPercentage: 34.89, totalScore: 33.62, totalPercentage: 33.62, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 37, schoolId: "58010137", name: "บ้านทุ่งโป่งมิตรภาพที่ 78", amphoe: "ปาย", mathScore: 35.94, mathPercentage: 35.94, thaiScore: 45.02, thaiPercentage: 45.02, totalScore: 40.48, totalPercentage: 40.48, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 38, schoolId: "58010138", name: "บ้านแพมบก", amphoe: "ปาย", mathScore: 92.00, mathPercentage: 92.00, thaiScore: 85.00, thaiPercentage: 85.00, totalScore: 88.50, totalPercentage: 88.50, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 39, schoolId: "58010139", name: "บ้านสบแพม", amphoe: "ปาย", mathScore: 38.00, mathPercentage: 38.00, thaiScore: 53.66, thaiPercentage: 53.66, totalScore: 45.83, totalPercentage: 45.83, mathQuality: "พอใช้", thaiQuality: "ดี", totalQuality: "พอใช้" },
  { order: 40, schoolId: "58010140", name: "บ้านแม่อีแลบ", amphoe: "ปาย", mathScore: 32.50, mathPercentage: 32.50, thaiScore: 34.00, thaiPercentage: 34.00, totalScore: 33.25, totalPercentage: 33.25, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 41, schoolId: "58010141", name: "บ้านปางปึงราษฎร์บำรุง", amphoe: "ปาย", mathScore: 72.50, mathPercentage: 72.50, thaiScore: 78.00, thaiPercentage: 78.00, totalScore: 75.25, totalPercentage: 75.25, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 42, schoolId: "58010142", name: "บ้านแม่ปิง", amphoe: "ปาย", mathScore: 24.14, mathPercentage: 24.14, thaiScore: 40.00, thaiPercentage: 40.00, totalScore: 32.07, totalPercentage: 32.07, mathQuality: "ปรับปรุง", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 43, schoolId: "58010153", name: "บ้านลุกป่าก๊อ", amphoe: "ปางมะผ้า", mathScore: 32.00, mathPercentage: 32.00, thaiScore: 35.53, thaiPercentage: 35.53, totalScore: 33.76, totalPercentage: 33.76, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 44, schoolId: "58010143", name: "บ้านเมืองแปง", amphoe: "ปาย", mathScore: 50.10, mathPercentage: 50.10, thaiScore: 55.05, thaiPercentage: 55.05, totalScore: 52.57, totalPercentage: 52.57, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 45, schoolId: "58010144", name: "บ้านผาสำราญ", amphoe: "ปาย", mathScore: 34.71, mathPercentage: 34.71, thaiScore: 44.64, thaiPercentage: 44.64, totalScore: 39.67, totalPercentage: 39.67, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 46, schoolId: "58010145", name: "บ้านห้วยหมีศรีสวัสดิ์", amphoe: "ปาย", mathScore: 15.42, mathPercentage: 15.42, thaiScore: 33.71, thaiPercentage: 33.71, totalScore: 24.57, totalPercentage: 24.57, mathQuality: "ปรับปรุง", thaiQuality: "พอใช้", totalQuality: "ปรับปรุง" },
  { order: 47, schoolId: "58010015", name: "บ้านแกงหอม", amphoe: "ปาย", mathScore: 58.33, mathPercentage: 58.33, thaiScore: 55.50, thaiPercentage: 55.50, totalScore: 56.91, totalPercentage: 56.91, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 48, schoolId: "58010015-1", name: "บ้านแกงหอม สาขาบ้านม้ง", amphoe: "ปาย", mathScore: 27.60, mathPercentage: 27.60, thaiScore: 38.15, thaiPercentage: 38.15, totalScore: 32.87, totalPercentage: 32.87, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 49, schoolId: "58010146", name: "บ้านสบสา", amphoe: "ปาย", mathScore: 75.00, mathPercentage: 75.00, thaiScore: 63.75, thaiPercentage: 63.75, totalScore: 69.37, totalPercentage: 69.37, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดีมาก" },
  { order: 50, schoolId: "58010147", name: "บ้านแม่นาเติง", amphoe: "ปาย", mathScore: 43.30, mathPercentage: 43.30, thaiScore: 49.65, thaiPercentage: 49.65, totalScore: 46.47, totalPercentage: 46.47, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 51, schoolId: "58010148", name: "บ้านปางแปก", amphoe: "ปาย", mathScore: 19.09, mathPercentage: 19.09, thaiScore: 24.50, thaiPercentage: 24.50, totalScore: 21.79, totalPercentage: 21.79, mathQuality: "ปรับปรุง", thaiQuality: "ปรับปรุง", totalQuality: "ปรับปรุง" },
  { order: 52, schoolId: "58010149", name: "บ้านไทรงาม", amphoe: "ปาย", mathScore: 71.80, mathPercentage: 71.80, thaiScore: 71.20, thaiPercentage: 71.20, totalScore: 71.50, totalPercentage: 71.50, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 53, schoolId: "58010150", name: "บ้านดอยผีลู", amphoe: "ปาย", mathScore: 34.20, mathPercentage: 34.20, thaiScore: 44.65, thaiPercentage: 44.65, totalScore: 39.42, totalPercentage: 39.42, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 54, schoolId: "58010150-1", name: "บ้านดอยผีลู สาขาบ้านในของ", amphoe: "ปาย", mathScore: 31.62, mathPercentage: 31.62, thaiScore: 36.06, thaiPercentage: 36.06, totalScore: 33.84, totalPercentage: 33.84, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 55, schoolId: "58010151", name: "บ้านหมอแปง", amphoe: "ปาย", mathScore: 34.20, mathPercentage: 34.20, thaiScore: 49.75, thaiPercentage: 49.75, totalScore: 41.97, totalPercentage: 41.97, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 56, schoolId: "58010152", name: "บ้านป่ายาง", amphoe: "ปาย", mathScore: 41.00, mathPercentage: 41.00, thaiScore: 53.90, thaiPercentage: 53.90, totalScore: 47.45, totalPercentage: 47.45, mathQuality: "พอใช้", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 57, schoolId: "58010154", name: "บ้านโป่งสา", amphoe: "ปาย", mathScore: 35.66, mathPercentage: 35.66, thaiScore: 73.08, thaiPercentage: 73.08, totalScore: 54.37, totalPercentage: 54.37, mathQuality: "พอใช้", thaiQuality: "ดีมาก", totalQuality: "ดี" },
  { order: 58, schoolId: "58010155", name: "ปางตองประชาสรรค์", amphoe: "ปาย", mathScore: 25.20, mathPercentage: 25.20, thaiScore: 43.80, thaiPercentage: 43.80, totalScore: 34.50, totalPercentage: 34.50, mathQuality: "ปรับปรุง", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 59, schoolId: "58010156", name: "บ้านขุนสาใน", amphoe: "ปาย", mathScore: 36.23, mathPercentage: 36.23, thaiScore: 45.65, thaiPercentage: 45.65, totalScore: 40.94, totalPercentage: 40.94, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 60, schoolId: "58010157", name: "บ้านแม่เหมืองหลวง", amphoe: "ปาย", mathScore: 47.90, mathPercentage: 47.90, thaiScore: 58.30, thaiPercentage: 58.30, totalScore: 53.10, totalPercentage: 53.10, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 61, schoolId: "58010018", name: "ชุมชนบ้านหมอกจำแป่", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 54.00, mathPercentage: 54.00, thaiScore: 61.07, thaiPercentage: 61.07, totalScore: 57.53, totalPercentage: 57.53, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 62, schoolId: "58010022", name: "บ้านแม่สะงา", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 47.83, mathPercentage: 47.83, thaiScore: 46.50, thaiPercentage: 46.50, totalScore: 47.16, totalPercentage: 47.16, mathQuality: "ดี", thaiQuality: "พอใช้", totalQuality: "ดี" },
  { order: 63, schoolId: "58010021", name: "บ้านห้วยขาน", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 65.57, mathPercentage: 65.57, thaiScore: 59.92, thaiPercentage: 59.92, totalScore: 62.75, totalPercentage: 62.75, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 64, schoolId: "58010020", name: "บ้านนาป่าแปก", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 39.92, mathPercentage: 39.92, thaiScore: 49.07, thaiPercentage: 49.07, totalScore: 44.50, totalPercentage: 44.50, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 65, schoolId: "58010016", name: "บ้านรักไทย", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 40.94, mathPercentage: 40.94, thaiScore: 52.20, thaiPercentage: 52.20, totalScore: 46.57, totalPercentage: 46.57, mathQuality: "พอใช้", thaiQuality: "ดี", totalQuality: "พอใช้" },
  { order: 66, schoolId: "58010017", name: "บ้านห้วยโป่งอ่อน", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 43.66, mathPercentage: 43.66, thaiScore: 45.66, thaiPercentage: 45.66, totalScore: 44.66, totalPercentage: 44.66, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 67, schoolId: "58010023", name: "ร่มเกล้าปางตองในโครงการตามพระราชดำริ", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 51.58, mathPercentage: 51.58, thaiScore: 53.86, thaiPercentage: 53.86, totalScore: 52.72, totalPercentage: 52.72, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 68, schoolId: "58010024", name: "บ้านห้วยมะเขือส้ม", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 32.90, mathPercentage: 32.90, thaiScore: 49.11, thaiPercentage: 49.11, totalScore: 41.01, totalPercentage: 41.01, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 69, schoolId: "58010005", name: "ชุมชนบ้านปางหมู", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 63.13, mathPercentage: 63.13, thaiScore: 60.80, thaiPercentage: 60.80, totalScore: 61.96, totalPercentage: 61.96, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 70, schoolId: "58010010", name: "บ้านกุงไม้สักมิตรภาพที่ 98", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 45.60, mathPercentage: 45.60, thaiScore: 58.50, thaiPercentage: 58.50, totalScore: 52.05, totalPercentage: 52.05, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 71, schoolId: "58010009", name: "บ้านทุ่งกองมู", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 39.11, mathPercentage: 39.11, thaiScore: 51.61, thaiPercentage: 51.61, totalScore: 45.36, totalPercentage: 45.36, mathQuality: "พอใช้", thaiQuality: "ดี", totalQuality: "พอใช้" },
  { order: 72, schoolId: "58010011", name: "บ้านในสอย", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 39.30, mathPercentage: 39.30, thaiScore: 51.45, thaiPercentage: 51.45, totalScore: 45.37, totalPercentage: 45.37, mathQuality: "พอใช้", thaiQuality: "ดี", totalQuality: "พอใช้" },
  { order: 73, schoolId: "58010014", name: "บ้านไม้สะเป่", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 46.75, mathPercentage: 46.75, thaiScore: 55.75, thaiPercentage: 55.75, totalScore: 51.25, totalPercentage: 51.25, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 74, schoolId: "58010007", name: "บ้านสบป่อง", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 52.16, mathPercentage: 52.16, thaiScore: 53.29, thaiPercentage: 53.29, totalScore: 52.72, totalPercentage: 52.72, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 75, schoolId: "58010004", name: "บ้านใหม่", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 80.00, mathPercentage: 80.00, thaiScore: 72.93, thaiPercentage: 72.93, totalScore: 76.46, totalPercentage: 76.46, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 76, schoolId: "58010002", name: "ชุมชนบ้านผาบ่อง", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 35.85, mathPercentage: 35.85, thaiScore: 50.78, thaiPercentage: 50.78, totalScore: 43.32, totalPercentage: 43.32, mathQuality: "พอใช้", thaiQuality: "ดี", totalQuality: "พอใช้" },
  { order: 77, schoolId: "58010013", name: "อนุบาลแม่ฮ่องสอน", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 47.07, mathPercentage: 47.07, thaiScore: 53.77, thaiPercentage: 53.77, totalScore: 50.42, totalPercentage: 50.42, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 78, schoolId: "58010025", name: "บ้านห้วยปมฝาด", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 20.66, mathPercentage: 20.66, thaiScore: 37.50, thaiPercentage: 37.50, totalScore: 29.08, totalPercentage: 29.08, mathQuality: "ปรับปรุง", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 79, schoolId: "58010027", name: "บ้านห้วยปูลิง", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 18.00, mathPercentage: 18.00, thaiScore: 34.12, thaiPercentage: 34.12, totalScore: 26.06, totalPercentage: 26.06, mathQuality: "ปรับปรุง", thaiQuality: "พอใช้", totalQuality: "ปรับปรุง" },
  { order: 80, schoolId: "58010026", name: "บ้านห้วยปูเลย", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 48.66, mathPercentage: 48.66, thaiScore: 65.08, thaiPercentage: 65.08, totalScore: 56.87, totalPercentage: 56.87, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 81, schoolId: "58010028", name: "บ้านห้วยตอง", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 35.66, mathPercentage: 35.66, thaiScore: 60.91, thaiPercentage: 60.91, totalScore: 48.29, totalPercentage: 48.29, mathQuality: "พอใช้", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 82, schoolId: "58010030", name: "บ้านน้ำส่อม", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 33.80, mathPercentage: 33.80, thaiScore: 54.90, thaiPercentage: 54.90, totalScore: 44.35, totalPercentage: 44.35, mathQuality: "พอใช้", thaiQuality: "ดี", totalQuality: "พอใช้" },
  { order: 83, schoolId: "58010008", name: "บ้านท่าโป่งแดง", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 48.28, mathPercentage: 48.28, thaiScore: 54.78, thaiPercentage: 54.78, totalScore: 51.53, totalPercentage: 51.53, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 84, schoolId: "58010031", name: "บ้านห้วยเดื่อ", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 69.33, mathPercentage: 69.33, thaiScore: 66.91, thaiPercentage: 66.91, totalScore: 68.12, totalPercentage: 68.12, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 85, schoolId: "58010032", name: "อนุบาลเมือง (ป่าปุ๊มิตรภาพที่ 29)", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 29.75, mathPercentage: 29.75, thaiScore: 56.87, thaiPercentage: 56.87, totalScore: 43.31, totalPercentage: 43.31, mathQuality: "พอใช้", thaiQuality: "ดี", totalQuality: "พอใช้" },
  { order: 86, schoolId: "58010033", name: "บ้านน้ำเพียงดิน", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 28.83, mathPercentage: 28.83, thaiScore: 43.20, thaiPercentage: 43.20, totalScore: 36.02, totalPercentage: 36.02, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 87, schoolId: "58010034", name: "บ้านห้วยเสือเฒ่า(เจ้ากอแก้วอุปถัมภ์)", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 27.25, mathPercentage: 27.25, thaiScore: 66.50, thaiPercentage: 66.50, totalScore: 46.87, totalPercentage: 46.87, mathQuality: "พอใช้", thaiQuality: "ดี", totalQuality: "พอใช้" },
  { order: 88, schoolId: "58010006", name: "บ้านห้วยโป่ง", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 67.40, mathPercentage: 67.40, thaiScore: 72.70, thaiPercentage: 72.70, totalScore: 70.05, totalPercentage: 70.05, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 89, schoolId: "58010036", name: "บ้านยอดดอยวิทยา", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 27.05, mathPercentage: 27.05, thaiScore: 35.97, thaiPercentage: 35.97, totalScore: 31.51, totalPercentage: 31.51, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 90, schoolId: "58010037", name: "บ้านกลาง", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 76.66, mathPercentage: 76.66, thaiScore: 63.33, thaiPercentage: 63.33, totalScore: 70.00, totalPercentage: 70.00, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดีมาก" },
  { order: 91, schoolId: "58010038", name: "บ้านแก่นฟ้า", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 58.40, mathPercentage: 58.40, thaiScore: 57.80, thaiPercentage: 57.80, totalScore: 58.10, totalPercentage: 58.10, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 92, schoolId: "58010039", name: "บ้านป่าลาน", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 40.87, mathPercentage: 40.87, thaiScore: 52.03, thaiPercentage: 52.03, totalScore: 46.45, totalPercentage: 46.45, mathQuality: "พอใช้", thaiQuality: "ดี", totalQuality: "พอใช้" },
  { order: 93, schoolId: "58010040", name: "บ้านห้วยช่างคำ", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 33.16, mathPercentage: 33.16, thaiScore: 41.83, thaiPercentage: 41.83, totalScore: 37.50, totalPercentage: 37.50, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 94, schoolId: "58010041", name: "เสรีวิทยา", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 69.22, mathPercentage: 69.22, thaiScore: 71.83, thaiPercentage: 71.83, totalScore: 70.52, totalPercentage: 70.52, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 95, schoolId: "58010042", name: "บ้านแม่จ๋า", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 64.00, mathPercentage: 64.00, thaiScore: 52.50, thaiPercentage: 52.50, totalScore: 58.25, totalPercentage: 58.25, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 96, schoolId: "58010043", name: "บ้านหนองเขียว", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 35.00, mathPercentage: 35.00, thaiScore: 41.71, thaiPercentage: 41.71, totalScore: 38.35, totalPercentage: 38.35, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 97, schoolId: "58010044", name: "บ้านห้วยผา", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 70.60, mathPercentage: 70.60, thaiScore: 74.40, thaiPercentage: 74.40, totalScore: 72.50, totalPercentage: 72.50, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 98, schoolId: "58010045", name: "ไทยรัฐวิทยา 99 (บ้านแม่สุยะ)", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 30.13, mathPercentage: 30.13, thaiScore: 48.50, thaiPercentage: 48.50, totalScore: 39.31, totalPercentage: 39.31, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 99, schoolId: "58010012", name: "บ้านนาปลาจาด", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 87.25, mathPercentage: 87.25, thaiScore: 79.62, thaiPercentage: 79.62, totalScore: 83.43, totalPercentage: 83.43, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 100, schoolId: "58010001", name: "บ้านห้วยผึ้ง", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 58.88, mathPercentage: 58.88, thaiScore: 58.88, thaiPercentage: 58.88, totalScore: 58.88, totalPercentage: 58.88, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 101, schoolId: "58010046", name: "บ้านคาหาน", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 53.93, mathPercentage: 53.93, thaiScore: 55.93, thaiPercentage: 55.93, totalScore: 54.93, totalPercentage: 54.93, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 102, schoolId: "58010160", name: "บ้านแม่ละนา", amphoe: "ปางมะผ้า", mathScore: 26.00, mathPercentage: 26.00, thaiScore: 31.87, thaiPercentage: 31.87, totalScore: 28.93, totalPercentage: 28.93, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 103, schoolId: "58010161", name: "บ้านจ่าโบ่", amphoe: "ปางมะผ้า", mathScore: 56.16, mathPercentage: 56.16, thaiScore: 58.33, thaiPercentage: 58.33, totalScore: 57.25, totalPercentage: 57.25, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 104, schoolId: "58010162", name: "บ้านปางคาม", amphoe: "ปางมะผ้า", mathScore: 36.18, mathPercentage: 36.18, thaiScore: 38.93, thaiPercentage: 38.93, totalScore: 37.56, totalPercentage: 37.56, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 105, schoolId: "58010163", name: "บ้านนาปู่ป้อม", amphoe: "ปางมะผ้า", mathScore: 27.15, mathPercentage: 27.15, thaiScore: 37.40, thaiPercentage: 37.40, totalScore: 32.27, totalPercentage: 32.27, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 106, schoolId: "58010163-1", name: "บ้านนาปู่ป้อม สาขาทุ่งสาแล", amphoe: "ปางมะผ้า", mathScore: 34.00, mathPercentage: 34.00, thaiScore: 62.00, thaiPercentage: 62.00, totalScore: 48.00, totalPercentage: 48.00, mathQuality: "พอใช้", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 107, schoolId: "58010164", name: "บ้านยาป่าแหน", amphoe: "ปางมะผ้า", mathScore: 23.00, mathPercentage: 23.00, thaiScore: 35.08, thaiPercentage: 35.08, totalScore: 29.04, totalPercentage: 29.04, mathQuality: "ปรับปรุง", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 108, schoolId: "58010165", name: "บ้านน้ำฮูผาเสื่อ", amphoe: "ปางมะผ้า", mathScore: 72.33, mathPercentage: 72.33, thaiScore: 61.66, thaiPercentage: 61.66, totalScore: 67.00, totalPercentage: 67.00, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 109, schoolId: "58010166", name: "บ้านห้วยเฮี๊ยะ", amphoe: "ปางมะผ้า", mathScore: 71.00, mathPercentage: 71.00, thaiScore: 60.75, thaiPercentage: 60.75, totalScore: 65.87, totalPercentage: 65.87, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 110, schoolId: "58010167", name: "บ้านซอแบะ", amphoe: "ปางมะผ้า", mathScore: 20.40, mathPercentage: 20.40, thaiScore: 22.33, thaiPercentage: 22.33, totalScore: 21.36, totalPercentage: 21.36, mathQuality: "ปรับปรุง", thaiQuality: "ปรับปรุง", totalQuality: "ปรับปรุง" },
  { order: 111, schoolId: "58010168", name: "บ้านปางบอนวัฒนาคาร", amphoe: "ปางมะผ้า", mathScore: 52.50, mathPercentage: 52.50, thaiScore: 66.75, thaiPercentage: 66.75, totalScore: 59.62, totalPercentage: 59.62, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 112, schoolId: "58010169", name: "บ้านทุ่งหลวงวัฒนาคาร", amphoe: "ปางมะผ้า", mathScore: 44.16, mathPercentage: 44.16, thaiScore: 78.08, thaiPercentage: 78.08, totalScore: 61.12, totalPercentage: 61.12, mathQuality: "ดี", thaiQuality: "ดีมาก", totalQuality: "ดี" },
  { order: 113, schoolId: "58010019", name: "อนุบาลปางมะผ้า", amphoe: "ปางมะผ้า", mathScore: 28.72, mathPercentage: 28.72, thaiScore: 39.14, thaiPercentage: 39.14, totalScore: 33.93, totalPercentage: 33.93, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 114, schoolId: "58010170", name: "บ้านเมืองแพม", amphoe: "ปางมะผ้า", mathScore: 26.77, mathPercentage: 26.77, thaiScore: 39.16, thaiPercentage: 39.16, totalScore: 32.97, totalPercentage: 32.97, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 115, schoolId: "58010171", name: "บ้านน้ำริน", amphoe: "ปางมะผ้า", mathScore: 35.25, mathPercentage: 35.25, thaiScore: 57.75, thaiPercentage: 57.75, totalScore: 46.50, totalPercentage: 46.50, mathQuality: "พอใช้", thaiQuality: "ดี", totalQuality: "พอใช้" },
  { order: 116, schoolId: "58010172", name: "บ้านถ้ำลอด", amphoe: "ปางมะผ้า", mathScore: 43.35, mathPercentage: 43.35, thaiScore: 50.85, thaiPercentage: 50.85, totalScore: 47.10, totalPercentage: 47.10, mathQuality: "พอใช้", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 117, schoolId: "58010152", name: "ศูนย์ปางมะผ้าในโครงการตามพระราชดำริ", amphoe: "ปางมะผ้า", mathScore: 34.83, mathPercentage: 34.83, thaiScore: 47.08, thaiPercentage: 47.08, totalScore: 40.95, totalPercentage: 40.95, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 118, schoolId: "58010173", name: "บ้านกึ้ดสามสิบ", amphoe: "ปางมะผ้า", mathScore: 38.25, mathPercentage: 38.25, thaiScore: 48.00, thaiPercentage: 48.00, totalScore: 43.12, totalPercentage: 43.12, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 119, schoolId: "58010174", name: "บ้านผามอน", amphoe: "ปางมะผ้า", mathScore: 30.77, mathPercentage: 30.77, thaiScore: 40.44, thaiPercentage: 40.44, totalScore: 35.61, totalPercentage: 35.61, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 120, schoolId: "58010175", name: "บ้านห้วยแห้ง", amphoe: "ปางมะผ้า", mathScore: 37.50, mathPercentage: 37.50, thaiScore: 51.31, thaiPercentage: 51.31, totalScore: 44.40, totalPercentage: 44.40, mathQuality: "พอใช้", thaiQuality: "ดี", totalQuality: "พอใช้" },
  { order: 121, schoolId: "58010176", name: "บ้านวนาหลวง", amphoe: "ปางมะผ้า", mathScore: 32.72, mathPercentage: 32.72, thaiScore: 38.81, thaiPercentage: 38.81, totalScore: 35.77, totalPercentage: 35.77, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 122, schoolId: "58010180", name: "ราชประชานุเคราะห์ 59 จังหวัดแม่ฮ่องสอน", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 42.00, mathPercentage: 42.00, thaiScore: 46.94, thaiPercentage: 46.94, totalScore: 44.47, totalPercentage: 44.47, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 123, schoolId: "58010181", name: "ราชประชานุเคราะห์ 22", amphoe: "ปาย", mathScore: 55.64, mathPercentage: 55.64, thaiScore: 67.39, thaiPercentage: 67.39, totalScore: 61.51, totalPercentage: 61.51, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 124, schoolId: "58010182", name: "บ้านใหม่ห้วยหวาย", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 67.40, mathPercentage: 67.40, thaiScore: 56.40, thaiPercentage: 56.40, totalScore: 61.90, totalPercentage: 61.90, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 125, schoolId: "58010901", name: "เขตพื้นที่การศึกษาอำเภอเมืองแม่ฮ่องสอน", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 44.25, mathPercentage: 44.25, thaiScore: 51.87, thaiPercentage: 51.87, totalScore: 48.06, totalPercentage: 48.06, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 126, schoolId: "58010902", name: "เขตพื้นที่การศึกษาอำเภอขุนยวม", amphoe: "ขุนยวม", mathScore: 48.30, mathPercentage: 48.30, thaiScore: 54.10, thaiPercentage: 54.10, totalScore: 51.20, totalPercentage: 51.20, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 127, schoolId: "58010903", name: "เขตพื้นที่การศึกษาอำเภอปาย", amphoe: "ปาย", mathScore: 34.48, mathPercentage: 34.48, thaiScore: 49.12, thaiPercentage: 49.12, totalScore: 41.80, totalPercentage: 41.80, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 128, schoolId: "58010904", name: "เขตพื้นที่การศึกษาอำเภอปางมะผ้า", amphoe: "ปางมะผ้า", mathScore: 40.11, mathPercentage: 40.11, thaiScore: 42.02, thaiPercentage: 42.02, totalScore: 41.06, totalPercentage: 41.06, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
];

// ฐานข้อมูลแม่แบบผลการประเมินความสามารถด้านการอ่าน (RT) ชั้นประถมศึกษาปีที่ 1 สพป.แม่ฮ่องสอน เขต 1
export const RAW_INITIAL_RT_DATA = [
  { order: 1, schoolId: "58010057", name: "ขุนยวม", amphoe: "ขุนยวม", mathScore: 42.12, mathPercentage: 84.25, thaiScore: 33.76, thaiPercentage: 67.53, totalScore: 75.89, totalPercentage: 75.89, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดีมาก" },
  { order: 2, schoolId: "58010058", name: "อนุบาลขุนยวม", amphoe: "ขุนยวม", mathScore: 33.54, mathPercentage: 67.09, thaiScore: 25.59, thaiPercentage: 51.18, totalScore: 59.13, totalPercentage: 59.13, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 3, schoolId: "58010059", name: "ชุมชนต่อแพวิทยา", amphoe: "ขุนยวม", mathScore: 46.55, mathPercentage: 93.11, thaiScore: 37.05, thaiPercentage: 74.11, totalScore: 83.61, totalPercentage: 83.61, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดีมาก" },
  { order: 4, schoolId: "58010060", name: "บ้านห้วยนา", amphoe: "ขุนยวม", mathScore: 41.00, mathPercentage: 82.00, thaiScore: 36.55, thaiPercentage: 73.11, totalScore: 77.55, totalPercentage: 77.55, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดีมาก" },
  { order: 5, schoolId: "58010061", name: "บ้านแม่สุริน", amphoe: "ขุนยวม", mathScore: 50.00, mathPercentage: 100.00, thaiScore: 44.00, thaiPercentage: 88.00, totalScore: 94.00, totalPercentage: 94.00, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 6, schoolId: "58010062", name: "ห้วยต้นนุ่นวิทยา", amphoe: "ขุนยวม", mathScore: 46.00, mathPercentage: 92.00, thaiScore: 44.00, thaiPercentage: 88.00, totalScore: 90.00, totalPercentage: 90.00, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 7, schoolId: "58010063", name: "บ้านแม่สะเป่ใต้", amphoe: "ขุนยวม", mathScore: 45.00, mathPercentage: 90.00, thaiScore: 42.00, thaiPercentage: 84.00, totalScore: 87.00, totalPercentage: 87.00, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 8, schoolId: "58010064", name: "ตชด.บำรุงที่ 60", amphoe: "ขุนยวม", mathScore: 47.00, mathPercentage: 94.00, thaiScore: 49.00, thaiPercentage: 98.00, totalScore: 96.00, totalPercentage: 96.00, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 9, schoolId: "58010065", name: "บ้านหัวปอน", amphoe: "ขุนยวม", mathScore: 23.50, mathPercentage: 47.00, thaiScore: 17.00, thaiPercentage: 34.00, totalScore: 40.50, totalPercentage: 40.50, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 10, schoolId: "58010066", name: "บ้านพัฒนา", amphoe: "ขุนยวม", mathScore: 35.12, mathPercentage: 70.25, thaiScore: 36.00, thaiPercentage: 72.00, totalScore: 71.12, totalPercentage: 71.12, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 11, schoolId: "58010067", name: "บ้านคำสุข", amphoe: "ขุนยวม", mathScore: 40.00, mathPercentage: 80.00, thaiScore: 40.66, thaiPercentage: 81.33, totalScore: 80.66, totalPercentage: 80.66, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 12, schoolId: "58010068", name: "บ้านนางิ้ว", amphoe: "ขุนยวม", mathScore: 48.00, mathPercentage: 96.00, thaiScore: 46.00, thaiPercentage: 92.00, totalScore: 94.00, totalPercentage: 94.00, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 13, schoolId: "58010069", name: "บ้านแม่อูคอ", amphoe: "ขุนยวม", mathScore: 38.84, mathPercentage: 77.69, thaiScore: 36.53, thaiPercentage: 73.07, totalScore: 75.38, totalPercentage: 75.38, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดีมาก" },
  { order: 14, schoolId: "58010070", name: "บ้านหัวแม่สุริน", amphoe: "ขุนยวม", mathScore: 32.75, mathPercentage: 65.50, thaiScore: 32.00, thaiPercentage: 64.00, totalScore: 64.75, totalPercentage: 64.75, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 15, schoolId: "58010085", name: "บ้านแม่ออ", amphoe: "ขุนยวม", mathScore: 39.33, mathPercentage: 78.66, thaiScore: 42.00, thaiPercentage: 84.00, totalScore: 81.33, totalPercentage: 81.33, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 16, schoolId: "58010071", name: "บ้านปางตอง", amphoe: "ขุนยวม", mathScore: 33.66, mathPercentage: 67.33, thaiScore: 33.88, thaiPercentage: 67.77, totalScore: 67.55, totalPercentage: 67.55, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 17, schoolId: "58010073", name: "บ้านแม่อูคอหลวง", amphoe: "ขุนยวม", mathScore: 34.85, mathPercentage: 69.71, thaiScore: 26.14, thaiPercentage: 52.28, totalScore: 61.00, totalPercentage: 61.00, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 18, schoolId: "58010074", name: "ชุมชนบ้านเมืองปอน", amphoe: "ขุนยวม", mathScore: 50.00, mathPercentage: 100.00, thaiScore: 38.00, thaiPercentage: 76.00, totalScore: 88.00, totalPercentage: 88.00, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 19, schoolId: "58010075", name: "บ้านแม่แจ๊ะ", amphoe: "ขุนยวม", mathScore: 48.00, mathPercentage: 96.00, thaiScore: 36.66, thaiPercentage: 73.33, totalScore: 84.66, totalPercentage: 84.66, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดีมาก" },
  { order: 20, schoolId: "58010076", name: "บ้านหว่าโน", amphoe: "ขุนยวม", mathScore: 28.33, mathPercentage: 56.66, thaiScore: 36.33, thaiPercentage: 72.66, totalScore: 64.66, totalPercentage: 64.66, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 21, schoolId: "58010077", name: "บ้านแม่กิ๊", amphoe: "ขุนยวม", mathScore: 41.80, mathPercentage: 83.60, thaiScore: 41.00, thaiPercentage: 82.00, totalScore: 82.80, totalPercentage: 82.80, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 22, schoolId: "58010078", name: "บ้านแม่โกปี่", amphoe: "ขุนยวม", mathScore: 38.00, mathPercentage: 76.00, thaiScore: 37.00, thaiPercentage: 74.00, totalScore: 75.00, totalPercentage: 75.00, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดีมาก" },
  { order: 23, schoolId: "58010079", name: "บ้านห้วยส้าน", amphoe: "ขุนยวม", mathScore: 40.37, mathPercentage: 80.75, thaiScore: 39.12, thaiPercentage: 78.25, totalScore: 79.50, totalPercentage: 79.50, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 24, schoolId: "58010080", name: "บ้านท่าหินส้ม", amphoe: "ขุนยวม", mathScore: 32.00, mathPercentage: 64.00, thaiScore: 33.66, thaiPercentage: 67.33, totalScore: 65.66, totalPercentage: 65.66, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 25, schoolId: "58010081", name: "บ้านหนองแห้ง", amphoe: "ขุนยวม", mathScore: 47.88, mathPercentage: 95.77, thaiScore: 40.66, thaiPercentage: 81.33, totalScore: 88.55, totalPercentage: 88.55, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 26, schoolId: "58010082", name: "บ้านแม่ลาก๊ะ", amphoe: "ขุนยวม", mathScore: 41.00, mathPercentage: 82.00, thaiScore: 40.00, thaiPercentage: 80.00, totalScore: 81.00, totalPercentage: 81.00, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 27, schoolId: "58010083", name: "บ้านมะหินหลวง", amphoe: "ขุนยวม", mathScore: 43.16, mathPercentage: 86.33, thaiScore: 45.16, thaiPercentage: 90.33, totalScore: 88.33, totalPercentage: 88.33, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 28, schoolId: "58010084", name: "บ้านแม่โข่จู", amphoe: "ขุนยวม", mathScore: 49.00, mathPercentage: 98.00, thaiScore: 48.50, thaiPercentage: 97.00, totalScore: 97.50, totalPercentage: 97.50, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 29, schoolId: "58010129", name: "อนุบาลปาย (เวียงใต้)", amphoe: "ปาย", mathScore: 40.78, mathPercentage: 81.56, thaiScore: 36.18, thaiPercentage: 72.36, totalScore: 76.96, totalPercentage: 76.96, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดีมาก" },
  { order: 30, schoolId: "58010130", name: "บ้านน้ำฮู", amphoe: "ปาย", mathScore: 35.54, mathPercentage: 71.09, thaiScore: 28.32, thaiPercentage: 56.64, totalScore: 63.87, totalPercentage: 63.87, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 31, schoolId: "58010131", name: "บ้านใหม่สหสัมพันธ์", amphoe: "ปาย", mathScore: 40.46, mathPercentage: 80.93, thaiScore: 43.66, thaiPercentage: 87.33, totalScore: 84.13, totalPercentage: 84.13, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 32, schoolId: "58010132", name: "บ้านเวียงเหนือ", amphoe: "ปาย", mathScore: 36.09, mathPercentage: 72.19, thaiScore: 39.85, thaiPercentage: 79.71, totalScore: 75.95, totalPercentage: 75.95, mathQuality: "ดี", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 33, schoolId: "58010133", name: "สังวาลย์วิทย์ 3", amphoe: "ปาย", mathScore: 46.46, mathPercentage: 92.92, thaiScore: 44.76, thaiPercentage: 89.53, totalScore: 91.23, totalPercentage: 91.23, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 34, schoolId: "58010134", name: "บ้านน้ำปลามุง", amphoe: "ปาย", mathScore: 7.85, mathPercentage: 15.71, thaiScore: 26.71, thaiPercentage: 53.42, totalScore: 34.57, totalPercentage: 34.57, mathQuality: "ปรับปรุง", thaiQuality: "ดี", totalQuality: "พอใช้" },
  { order: 35, schoolId: "58010135", name: "ชุมชนบ้านแม่ฮี้", amphoe: "ปาย", mathScore: 36.13, mathPercentage: 72.26, thaiScore: 32.96, thaiPercentage: 65.93, totalScore: 69.10, totalPercentage: 69.10, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 36, schoolId: "58010136", name: "บ้านทุ่งยาว", amphoe: "ปาย", mathScore: 34.83, mathPercentage: 69.66, thaiScore: 28.75, thaiPercentage: 57.50, totalScore: 63.58, totalPercentage: 63.58, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 37, schoolId: "58010137", name: "บ้านทุ่งโป่งมิตรภาพที่ 78", amphoe: "ปาย", mathScore: 39.93, mathPercentage: 79.87, thaiScore: 39.50, thaiPercentage: 79.00, totalScore: 79.43, totalPercentage: 79.43, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 38, schoolId: "58010139", name: "บ้านสบแพม", amphoe: "ปาย", mathScore: 38.50, mathPercentage: 77.00, thaiScore: 36.50, thaiPercentage: 73.00, totalScore: 75.00, totalPercentage: 75.00, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดีมาก" },
  { order: 39, schoolId: "58010140", name: "บ้านแม่อีแลบ", amphoe: "ปาย", mathScore: 42.42, mathPercentage: 84.85, thaiScore: 42.57, thaiPercentage: 85.14, totalScore: 85.00, totalPercentage: 85.00, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 40, schoolId: "58010141", name: "บ้านปางปึงราษฎร์บำรุง", amphoe: "ปาย", mathScore: 47.33, mathPercentage: 94.66, thaiScore: 43.66, thaiPercentage: 87.33, totalScore: 91.00, totalPercentage: 91.00, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 41, schoolId: "58010142", name: "บ้านแม่ปิง", amphoe: "ปาย", mathScore: 37.28, mathPercentage: 74.57, thaiScore: 43.85, thaiPercentage: 87.71, totalScore: 81.14, totalPercentage: 81.14, mathQuality: "ดี", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 42, schoolId: "58010153", name: "บ้านลุกป่าก๊อ", amphoe: "ปางมะผ้า", mathScore: 22.62, mathPercentage: 45.25, thaiScore: 29.00, thaiPercentage: 58.00, totalScore: 51.62, totalPercentage: 51.62, mathQuality: "พอใช้", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 43, schoolId: "58010143", name: "บ้านเมืองแปง", amphoe: "ปาย", mathScore: 34.05, mathPercentage: 68.11, thaiScore: 31.47, thaiPercentage: 62.94, totalScore: 65.52, totalPercentage: 65.52, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 44, schoolId: "58010144", name: "บ้านผาสำราญ", amphoe: "ปาย", mathScore: 17.25, mathPercentage: 34.50, thaiScore: 22.25, thaiPercentage: 44.50, totalScore: 39.50, totalPercentage: 39.50, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 45, schoolId: "58010145", name: "บ้านห้วยหมีศรีสวัสดิ์", amphoe: "ปาย", mathScore: 41.16, mathPercentage: 82.33, thaiScore: 29.00, thaiPercentage: 58.00, totalScore: 70.16, totalPercentage: 70.16, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 46, schoolId: "58010015", name: "บ้านแกงหอม", amphoe: "ปาย", mathScore: 47.66, mathPercentage: 95.33, thaiScore: 44.00, thaiPercentage: 88.00, totalScore: 91.66, totalPercentage: 91.66, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 47, schoolId: "58010015-1", name: "บ้านแกงหอม สาขาบ้านม้ง", amphoe: "ปาย", mathScore: 41.00, mathPercentage: 82.00, thaiScore: 38.60, thaiPercentage: 77.20, totalScore: 79.60, totalPercentage: 79.60, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 48, schoolId: "58010146", name: "บ้านสบสา", amphoe: "ปาย", mathScore: 47.50, mathPercentage: 95.00, thaiScore: 46.83, thaiPercentage: 93.66, totalScore: 94.33, totalPercentage: 94.33, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 49, schoolId: "58010147", name: "บ้านแม่นาเติง", amphoe: "ปาย", mathScore: 36.00, mathPercentage: 72.00, thaiScore: 43.87, thaiPercentage: 87.75, totalScore: 79.87, totalPercentage: 79.87, mathQuality: "ดี", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 50, schoolId: "58010148", name: "บ้านปางแปก", amphoe: "ปาย", mathScore: 23.90, mathPercentage: 47.81, thaiScore: 30.00, thaiPercentage: 60.00, totalScore: 53.90, totalPercentage: 53.90, mathQuality: "พอใช้", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 51, schoolId: "58010149", name: "บ้านไทรงาม", amphoe: "ปาย", mathScore: 25.66, mathPercentage: 51.33, thaiScore: 35.66, thaiPercentage: 71.33, totalScore: 61.33, totalPercentage: 61.33, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 52, schoolId: "58010150", name: "บ้านดอยผีลู", amphoe: "ปาย", mathScore: 29.89, mathPercentage: 59.78, thaiScore: 30.26, thaiPercentage: 60.52, totalScore: 60.15, totalPercentage: 60.15, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 53, schoolId: "58010150-1", name: "บ้านดอยผีลู สาขาบ้านในของ", amphoe: "ปาย", mathScore: 27.42, mathPercentage: 54.85, thaiScore: 31.71, thaiPercentage: 63.42, totalScore: 59.14, totalPercentage: 59.14, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 54, schoolId: "58010151", name: "บ้านหมอแปง", amphoe: "ปาย", mathScore: 42.00, mathPercentage: 84.00, thaiScore: 34.75, thaiPercentage: 69.50, totalScore: 76.75, totalPercentage: 76.75, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดีมาก" },
  { order: 55, schoolId: "58010152", name: "บ้านป่ายาง", amphoe: "ปาย", mathScore: 40.14, mathPercentage: 80.28, thaiScore: 41.28, thaiPercentage: 82.57, totalScore: 81.42, totalPercentage: 81.42, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 56, schoolId: "58010154", name: "บ้านโป่งสา", amphoe: "ปาย", mathScore: 49.60, mathPercentage: 99.20, thaiScore: 49.00, thaiPercentage: 98.00, totalScore: 98.60, totalPercentage: 98.60, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 57, schoolId: "58010155", name: "ปางตองประชาสรรค์", amphoe: "ปาย", mathScore: 26.50, mathPercentage: 53.00, thaiScore: 33.00, thaiPercentage: 66.00, totalScore: 59.50, totalPercentage: 59.50, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 58, schoolId: "58010156", name: "บ้านขุนสาใน", amphoe: "ปาย", mathScore: 40.28, mathPercentage: 80.56, thaiScore: 41.72, thaiPercentage: 83.44, totalScore: 82.00, totalPercentage: 82.00, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 59, schoolId: "58010157", name: "บ้านแม่เหมืองหลวง", amphoe: "ปาย", mathScore: 39.00, mathPercentage: 78.00, thaiScore: 30.00, thaiPercentage: 60.00, totalScore: 69.00, totalPercentage: 69.00, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 60, schoolId: "58010018", name: "ชุมชนบ้านหมอกจำแป่", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 40.86, mathPercentage: 81.73, thaiScore: 36.30, thaiPercentage: 72.60, totalScore: 77.17, totalPercentage: 77.17, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดีมาก" },
  { order: 61, schoolId: "58010022", name: "บ้านแม่สะงา", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 41.33, mathPercentage: 82.66, thaiScore: 35.66, thaiPercentage: 71.33, totalScore: 77.00, totalPercentage: 77.00, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดีมาก" },
  { order: 62, schoolId: "58010021", name: "บ้านห้วยขาน", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 44.72, mathPercentage: 89.44, thaiScore: 41.66, thaiPercentage: 83.33, totalScore: 86.38, totalPercentage: 86.38, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 63, schoolId: "58010020", name: "บ้านนาป่าแปก", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 48.57, mathPercentage: 97.14, thaiScore: 37.07, thaiPercentage: 74.14, totalScore: 85.64, totalPercentage: 85.64, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดีมาก" },
  { order: 64, schoolId: "58010016", name: "บ้านรักไทย", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 39.97, mathPercentage: 79.95, thaiScore: 33.75, thaiPercentage: 67.51, totalScore: 73.73, totalPercentage: 73.73, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 65, schoolId: "58010017", name: "บ้านห้วยโป่งอ่อน", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 21.50, mathPercentage: 43.00, thaiScore: 21.00, thaiPercentage: 42.00, totalScore: 42.50, totalPercentage: 42.50, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 66, schoolId: "58010023", name: "ร่มเกล้าปางตองในโครงการตามพระราชดำริ", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 40.20, mathPercentage: 80.41, thaiScore: 35.72, thaiPercentage: 71.44, totalScore: 75.93, totalPercentage: 75.93, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดีมาก" },
  { order: 67, schoolId: "58010024", name: "บ้านห้วยมะเขือส้ม", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 39.36, mathPercentage: 78.72, thaiScore: 26.59, thaiPercentage: 53.18, totalScore: 65.95, totalPercentage: 65.95, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 68, schoolId: "58010005", name: "ชุมชนบ้านปางหมู", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 44.60, mathPercentage: 89.20, thaiScore: 39.60, thaiPercentage: 79.20, totalScore: 84.20, totalPercentage: 84.20, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 69, schoolId: "58010010", name: "บ้านกุงไม้สักมิตรภาพที่ 98", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 35.28, mathPercentage: 70.57, thaiScore: 41.57, thaiPercentage: 83.14, totalScore: 76.85, totalPercentage: 76.85, mathQuality: "ดี", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 70, schoolId: "58010009", name: "บ้านทุ่งกองมู", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 42.46, mathPercentage: 84.93, thaiScore: 39.00, thaiPercentage: 78.00, totalScore: 81.46, totalPercentage: 81.46, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 71, schoolId: "58010047", name: "บ้านสบสอย", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 45.72, mathPercentage: 91.44, thaiScore: 34.72, thaiPercentage: 69.44, totalScore: 80.44, totalPercentage: 80.44, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดีมาก" },
  { order: 72, schoolId: "58010011", name: "บ้านในสอย", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 42.95, mathPercentage: 85.91, thaiScore: 33.25, thaiPercentage: 66.51, totalScore: 76.21, totalPercentage: 76.21, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดีมาก" },
  { order: 73, schoolId: "58010014", name: "บ้านไม้สะเป่", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 30.71, mathPercentage: 61.42, thaiScore: 22.71, thaiPercentage: 45.42, totalScore: 53.42, totalPercentage: 53.42, mathQuality: "ดี", thaiQuality: "พอใช้", totalQuality: "ดี" },
  { order: 74, schoolId: "58010007", name: "บ้านสบป่อง", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 47.27, mathPercentage: 94.54, thaiScore: 33.45, thaiPercentage: 66.90, totalScore: 80.72, totalPercentage: 80.72, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดีมาก" },
  { order: 75, schoolId: "58010004", name: "บ้านใหม่", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 43.54, mathPercentage: 87.09, thaiScore: 42.54, thaiPercentage: 85.09, totalScore: 86.09, totalPercentage: 86.09, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 76, schoolId: "58010002", name: "ชุมชนบ้านผาบ่อง", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 34.09, mathPercentage: 68.18, thaiScore: 36.54, thaiPercentage: 73.09, totalScore: 70.63, totalPercentage: 70.63, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 77, schoolId: "58010013", name: "อนุบาลแม่ฮ่องสอน", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 40.64, mathPercentage: 81.29, thaiScore: 35.52, thaiPercentage: 71.05, totalScore: 76.17, totalPercentage: 76.17, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดีมาก" },
  { order: 78, schoolId: "58010025", name: "บ้านห้วยปมฝาด", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 32.00, mathPercentage: 64.00, thaiScore: 23.66, thaiPercentage: 47.33, totalScore: 55.66, totalPercentage: 55.66, mathQuality: "ดี", thaiQuality: "พอใช้", totalQuality: "ดี" },
  { order: 79, schoolId: "58010027", name: "บ้านห้วยปูลิง", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 38.20, mathPercentage: 76.40, thaiScore: 37.60, thaiPercentage: 75.20, totalScore: 75.80, totalPercentage: 75.80, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 80, schoolId: "58010026", name: "บ้านห้วยปูเลย", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 42.44, mathPercentage: 84.88, thaiScore: 35.66, thaiPercentage: 71.33, totalScore: 78.11, totalPercentage: 78.11, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดีมาก" },
  { order: 81, schoolId: "58010028", name: "บ้านห้วยตอง", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 43.25, mathPercentage: 86.50, thaiScore: 40.75, thaiPercentage: 81.50, totalScore: 84.00, totalPercentage: 84.00, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 82, schoolId: "58010030", name: "บ้านน้ำส่อม", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 39.00, mathPercentage: 78.00, thaiScore: 34.00, thaiPercentage: 68.00, totalScore: 73.00, totalPercentage: 73.00, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 83, schoolId: "58010008", name: "บ้านท่าโป่งแดง", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 45.71, mathPercentage: 91.42, thaiScore: 39.07, thaiPercentage: 78.14, totalScore: 84.78, totalPercentage: 84.78, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 84, schoolId: "58010031", name: "บ้านห้วยเดื่อ", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 48.70, mathPercentage: 97.40, thaiScore: 40.20, thaiPercentage: 80.40, totalScore: 88.90, totalPercentage: 88.90, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 85, schoolId: "58010032", name: "อนุบาลเมือง (ป่าปุ๊มิตรภาพที่ 29)", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 35.25, mathPercentage: 70.50, thaiScore: 37.62, thaiPercentage: 75.25, totalScore: 72.87, totalPercentage: 72.87, mathQuality: "ดี", thaiQuality: "ดีมาก", totalQuality: "ดี" },
  { order: 86, schoolId: "58010033", name: "บ้านน้ำเพียงดิน", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 32.53, mathPercentage: 65.06, thaiScore: 27.13, thaiPercentage: 54.26, totalScore: 59.66, totalPercentage: 59.66, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 87, schoolId: "58010034", name: "บ้านห้วยเสือเฒ่า(เจ้ากอแก้วอุปถัมภ์)", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 43.20, mathPercentage: 86.40, thaiScore: 38.73, thaiPercentage: 77.46, totalScore: 81.93, totalPercentage: 81.93, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 88, schoolId: "58010006", name: "บ้านห้วยโป่ง", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 49.66, mathPercentage: 99.33, thaiScore: 44.66, thaiPercentage: 89.33, totalScore: 94.33, totalPercentage: 94.33, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 89, schoolId: "58010036", name: "บ้านยอดดอยวิทยา", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 35.00, mathPercentage: 70.00, thaiScore: 32.56, thaiPercentage: 65.12, totalScore: 67.56, totalPercentage: 67.56, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 90, schoolId: "58010037", name: "บ้านกลาง", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 41.25, mathPercentage: 82.50, thaiScore: 38.00, thaiPercentage: 76.00, totalScore: 79.25, totalPercentage: 79.25, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 91, schoolId: "58010038", name: "บ้านแก่นฟ้า", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 47.16, mathPercentage: 94.33, thaiScore: 44.83, thaiPercentage: 89.66, totalScore: 92.00, totalPercentage: 92.00, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 92, schoolId: "58010039", name: "บ้านป่าลาน", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 46.92, mathPercentage: 93.85, thaiScore: 41.42, thaiPercentage: 82.85, totalScore: 88.35, totalPercentage: 88.35, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 93, schoolId: "58010040", name: "บ้านห้วยช่างคำ", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 45.50, mathPercentage: 91.00, thaiScore: 38.50, thaiPercentage: 77.00, totalScore: 84.00, totalPercentage: 84.00, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 94, schoolId: "58010041", name: "เสรีวิทยา", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 35.83, mathPercentage: 71.66, thaiScore: 34.08, thaiPercentage: 68.16, totalScore: 69.91, totalPercentage: 69.91, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 95, schoolId: "58010048", name: "บ้านไม้ซางหนาม", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 48.83, mathPercentage: 97.66, thaiScore: 40.00, thaiPercentage: 80.00, totalScore: 88.83, totalPercentage: 88.83, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 96, schoolId: "58010042", name: "บ้านแม่จ๋า", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 36.66, mathPercentage: 73.33, thaiScore: 36.33, thaiPercentage: 72.66, totalScore: 73.00, totalPercentage: 73.00, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 97, schoolId: "58010043", name: "บ้านหนองเขียว", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 39.28, mathPercentage: 78.57, thaiScore: 27.78, thaiPercentage: 55.57, totalScore: 67.07, totalPercentage: 67.07, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 98, schoolId: "58010040-1", name: "บ้านห้วยช่างคำ สาขาบ้านห้วยช่างเหล็ก", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 43.50, mathPercentage: 87.00, thaiScore: 41.50, thaiPercentage: 83.00, totalScore: 85.00, totalPercentage: 85.00, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 99, schoolId: "58010044", name: "บ้านห้วยผา", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 40.92, mathPercentage: 81.85, thaiScore: 42.57, thaiPercentage: 85.14, totalScore: 83.50, totalPercentage: 83.50, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 100, schoolId: "58010045", name: "ไทยรัฐวิทยา 99 (บ้านแม่สุยะ)", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 20.78, mathPercentage: 41.57, thaiScore: 18.57, thaiPercentage: 37.14, totalScore: 39.35, totalPercentage: 39.35, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 101, schoolId: "58010012", name: "บ้านนาปลาจาด", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 48.80, mathPercentage: 97.60, thaiScore: 47.60, thaiPercentage: 95.20, totalScore: 96.40, totalPercentage: 96.40, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 102, schoolId: "58010001", name: "บ้านห้วยผึ้ง", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 49.33, mathPercentage: 98.66, thaiScore: 40.66, thaiPercentage: 81.33, totalScore: 90.00, totalPercentage: 90.00, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 103, schoolId: "58010046", name: "บ้านคาหาน", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 46.66, mathPercentage: 93.33, thaiScore: 39.44, thaiPercentage: 78.88, totalScore: 86.11, totalPercentage: 86.11, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 104, schoolId: "58010160", name: "บ้านแม่ละนา", amphoe: "ปางมะผ้า", mathScore: 48.20, mathPercentage: 96.40, thaiScore: 42.80, thaiPercentage: 85.60, totalScore: 91.00, totalPercentage: 91.00, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 105, schoolId: "58010161", name: "บ้านจ่าโบ่", amphoe: "ปางมะผ้า", mathScore: 30.33, mathPercentage: 60.66, thaiScore: 40.33, thaiPercentage: 80.66, totalScore: 70.66, totalPercentage: 70.66, mathQuality: "ดี", thaiQuality: "ดีมาก", totalQuality: "ดี" },
  { order: 106, schoolId: "58010162", name: "บ้านปางคาม", amphoe: "ปางมะผ้า", mathScore: 32.87, mathPercentage: 65.75, thaiScore: 34.70, thaiPercentage: 69.41, totalScore: 67.58, totalPercentage: 67.58, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 107, schoolId: "58010163", name: "บ้านนาปู่ป้อม", amphoe: "ปางมะผ้า", mathScore: 42.41, mathPercentage: 84.82, thaiScore: 34.29, thaiPercentage: 68.58, totalScore: 76.70, totalPercentage: 76.70, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดีมาก" },
  { order: 108, schoolId: "58010163-1", name: "บ้านนาปู่ป้อม สาขาทุ่งสาแล", amphoe: "ปางมะผ้า", mathScore: 50.00, mathPercentage: 100.00, thaiScore: 44.00, thaiPercentage: 88.00, totalScore: 94.00, totalPercentage: 94.00, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 109, schoolId: "58010164", name: "บ้านยาป่าแหน", amphoe: "ปางมะผ้า", mathScore: 25.16, mathPercentage: 50.33, thaiScore: 19.66, thaiPercentage: 39.33, totalScore: 44.83, totalPercentage: 44.83, mathQuality: "ดี", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 110, schoolId: "58010165", name: "บ้านน้ำฮูผาเสื่อ", amphoe: "ปางมะผ้า", mathScore: 46.00, mathPercentage: 92.00, thaiScore: 46.00, thaiPercentage: 92.00, totalScore: 92.00, totalPercentage: 92.00, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 111, schoolId: "58010166", name: "บ้านห้วยเฮี๊ยะ", amphoe: "ปางมะผ้า", mathScore: 43.87, mathPercentage: 87.75, thaiScore: 39.50, thaiPercentage: 79.00, totalScore: 83.37, totalPercentage: 83.37, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 112, schoolId: "58010167", name: "บ้านซอแบะ", amphoe: "ปางมะผ้า", mathScore: 35.11, mathPercentage: 70.22, thaiScore: 31.11, thaiPercentage: 62.22, totalScore: 66.22, totalPercentage: 66.22, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 113, schoolId: "58010168", name: "บ้านปางบอนวัฒนาคาร", amphoe: "ปางมะผ้า", mathScore: 23.00, mathPercentage: 46.00, thaiScore: 35.66, thaiPercentage: 71.33, totalScore: 58.66, totalPercentage: 58.66, mathQuality: "พอใช้", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 114, schoolId: "58010169", name: "บ้านทุ่งหลวงวัฒนาคาร", amphoe: "ปางมะผ้า", mathScore: 44.30, mathPercentage: 88.60, thaiScore: 43.10, thaiPercentage: 86.20, totalScore: 87.40, totalPercentage: 87.40, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 115, schoolId: "58010019", name: "อนุบาลปางมะผ้า", amphoe: "ปางมะผ้า", mathScore: 41.86, mathPercentage: 83.73, thaiScore: 36.51, thaiPercentage: 73.02, totalScore: 78.37, totalPercentage: 78.37, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดีมาก" },
  { order: 116, schoolId: "58010170", name: "บ้านเมืองแพม", amphoe: "ปางมะผ้า", mathScore: 36.14, mathPercentage: 72.28, thaiScore: 41.71, thaiPercentage: 83.42, totalScore: 77.85, totalPercentage: 77.85, mathQuality: "ดี", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 117, schoolId: "58010171", name: "บ้านน้ำริน", amphoe: "ปางมะผ้า", mathScore: 39.16, mathPercentage: 78.33, thaiScore: 38.00, thaiPercentage: 76.00, totalScore: 77.16, totalPercentage: 77.16, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 118, schoolId: "58010172", name: "บ้านถ้ำลอด", amphoe: "ปางมะผ้า", mathScore: 43.80, mathPercentage: 87.60, thaiScore: 33.96, thaiPercentage: 67.92, totalScore: 77.76, totalPercentage: 77.76, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดีมาก" },
  { order: 119, schoolId: "58010152", name: "ศูนย์ปางมะผ้าในโครงการตามพระราชดำริ", amphoe: "ปางมะผ้า", mathScore: 26.62, mathPercentage: 53.25, thaiScore: 19.50, thaiPercentage: 39.00, totalScore: 46.12, totalPercentage: 46.12, mathQuality: "ดี", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 120, schoolId: "58010173", name: "บ้านกึ้ดสามสิบ", amphoe: "ปางมะผ้า", mathScore: 40.62, mathPercentage: 81.25, thaiScore: 43.12, thaiPercentage: 86.25, totalScore: 83.75, totalPercentage: 83.75, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 121, schoolId: "58010174", name: "บ้านผามอน", amphoe: "ปางมะผ้า", mathScore: 24.50, mathPercentage: 49.00, thaiScore: 23.75, thaiPercentage: 47.50, totalScore: 48.25, totalPercentage: 48.25, mathQuality: "พอใช้", thaiQuality: "พอใช้", totalQuality: "พอใช้" },
  { order: 122, schoolId: "58010175", name: "บ้านห้วยแห้ง", amphoe: "ปางมะผ้า", mathScore: 39.00, mathPercentage: 78.00, thaiScore: 36.18, thaiPercentage: 72.36, totalScore: 75.18, totalPercentage: 75.18, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดีมาก" },
  { order: 123, schoolId: "58010176", name: "บ้านวนาหลวง", amphoe: "ปางมะผ้า", mathScore: 42.00, mathPercentage: 84.00, thaiScore: 49.20, thaiPercentage: 98.40, totalScore: 91.20, totalPercentage: 91.20, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 124, schoolId: "58010180", name: "ราชประชานุเคราะห์ 59 จังหวัดแม่ฮ่องสอน", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 37.63, mathPercentage: 75.27, thaiScore: 29.27, thaiPercentage: 58.54, totalScore: 66.90, totalPercentage: 66.90, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 125, schoolId: "58010181", name: "ราชประชานุเคราะห์ 22", amphoe: "ปาย", mathScore: 39.27, mathPercentage: 78.54, thaiScore: 37.90, thaiPercentage: 75.81, totalScore: 77.18, totalPercentage: 77.18, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 126, schoolId: "58010182", name: "บ้านใหม่ห้วยหวาย", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 47.00, mathPercentage: 94.00, thaiScore: 37.60, thaiPercentage: 75.20, totalScore: 84.60, totalPercentage: 84.60, mathQuality: "ดีมาก", thaiQuality: "ดี", totalQuality: "ดีมาก" },
  { order: 127, schoolId: "58010901", name: "เขตพื้นที่การศึกษาอำเภอเมืองแม่ฮ่องสอน", amphoe: "เมืองแม่ฮ่องสอน", mathScore: 26.12, mathPercentage: 52.25, thaiScore: 25.25, thaiPercentage: 50.50, totalScore: 51.37, totalPercentage: 51.37, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 128, schoolId: "58010902", name: "เขตพื้นที่การศึกษาอำเภอขุนยวม", amphoe: "ขุนยวม", mathScore: 40.15, mathPercentage: 80.31, thaiScore: 40.50, thaiPercentage: 81.00, totalScore: 80.65, totalPercentage: 80.65, mathQuality: "ดีมาก", thaiQuality: "ดีมาก", totalQuality: "ดีมาก" },
  { order: 129, schoolId: "58010903", name: "เขตพื้นที่การศึกษาอำเภอปาย", amphoe: "ปาย", mathScore: 37.26, mathPercentage: 74.53, thaiScore: 34.84, thaiPercentage: 69.69, totalScore: 72.11, totalPercentage: 72.11, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
  { order: 130, schoolId: "58010904", name: "เขตพื้นที่การศึกษาอำเภอปางมะผ้า", amphoe: "ปางมะผ้า", mathScore: 25.15, mathPercentage: 50.30, thaiScore: 30.70, thaiPercentage: 61.40, totalScore: 55.85, totalPercentage: 55.85, mathQuality: "ดี", thaiQuality: "ดี", totalQuality: "ดี" },
];

/**
 * ฟังก์ชันแปลงตัวเลขทศนิยมอย่างปลอดภัย
 */
function parseScoreValue(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : Number(val.toFixed(2));
  const str = String(val).trim().replace(/,/g, '');
  if (str === '' || str === '*' || str === 'x' || str === '-' || isNaN(Number(str))) return 0;
  return Number(Number(str).toFixed(2));
}

/**
 * จับคู่ชื่อโรงเรียน หรือรหัสโรงเรียน กับฐานข้อมูลของระบบ
 */
export function matchSchoolId(rawCode: string, name: string, amphoe: string, schools: School[] = []): string {
  // 1. ถ้ามีรหัสที่เป็นตัวเลข 6-10 หลัก ส่งตรงกลับทันที
  const cleanCode = String(rawCode || '').trim();
  if (/^\d{6,10}(-\d+)?$/.test(cleanCode)) {
    return cleanCode;
  }

  // 2. ค้นหาจาก Master RAW_INITIAL_NT_DATA และ RAW_INITIAL_RT_DATA
  const cleanName = name.replace(/^โรงเรียน/, '').trim();
  const masterMatchNT = RAW_INITIAL_NT_DATA.find(r => {
    const rClean = r.name.replace(/^โรงเรียน/, '').trim();
    if (rClean === cleanName || r.name === name) return true;
    if (amphoe && r.amphoe.includes(amphoe) && (rClean.includes(cleanName) || cleanName.includes(rClean))) return true;
    return false;
  });
  if (masterMatchNT && masterMatchNT.schoolId) {
    return masterMatchNT.schoolId;
  }

  const masterMatchRT = RAW_INITIAL_RT_DATA.find(r => {
    const rClean = r.name.replace(/^โรงเรียน/, '').trim();
    if (rClean === cleanName || r.name === name) return true;
    if (amphoe && r.amphoe.includes(amphoe) && (rClean.includes(cleanName) || cleanName.includes(rClean))) return true;
    return false;
  });
  if (masterMatchRT && masterMatchRT.schoolId) {
    return masterMatchRT.schoolId;
  }

  // 3. ค้นหาจากรายชื่อ schools ในระบบ
  if (schools && schools.length > 0) {
    const exact = schools.find(s => s.name === name || s.name === cleanName || s.name === `โรงเรียน${cleanName}`);
    if (exact) return exact.id;

    const sameAmphoe = schools.filter(s => !amphoe || (s.amphoe && s.amphoe.includes(amphoe)));
    const fuzzy = sameAmphoe.find(s => {
      const sClean = s.name.replace(/^โรงเรียน/, '').trim();
      return sClean.includes(cleanName) || cleanName.includes(sClean);
    });
    if (fuzzy) return fuzzy.id;
  }

  return cleanCode || '';
}

/**
 * ตรวจสอบชื่ออำเภอจากข้อความ
 */
function detectAmphoe(text: string): string {
  if (!text) return '';
  if (text.includes('เมืองแม่ฮ่องสอน') || text.includes('เมือง')) return 'เมืองแม่ฮ่องสอน';
  if (text.includes('ขุนยวม')) return 'ขุนยวม';
  if (text.includes('ปาย')) return 'ปาย';
  if (text.includes('ปางมะผ้า')) return 'ปางมะผ้า';
  return '';
}

/**
 * ตัวแยกวิเคราะห์ไฟล์ (CSV / Excel) แบบยืดหยุ่นและแม่นยำสูง
 * ตรวจจับคอลัมน์อัตโนมัติ ไม่ว่าลำดับคอลัมน์จะสลับกัน หรือมี/ไม่มีคอลัมน์รหัสโรงเรียน
 */
export function parseAcademicFile(
  fileContent: string | ArrayBuffer,
  fileName: string,
  academicYear: string = '2567',
  testType: string = 'NT',
  testTitle: string = 'การประเมินคุณภาพผู้เรียน (NT) ชั้นประถมศึกษาปีที่ 3',
  schools: School[] = []
): { records: AcademicRecord[]; errors: string[] } {
  const records: AcademicRecord[] = [];
  const errors: string[] = [];

  try {
    let rawRows: any[][] = [];
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (isExcel) {
      const workbook = XLSX.read(fileContent, { type: typeof fileContent === 'string' ? 'string' : 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
    } else {
      let text = typeof fileContent === 'string' ? fileContent : new TextDecoder('utf-8').decode(fileContent);
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
      }
      const lines = text.split(/\r?\n/);
      rawRows = lines.map(line => {
        const row: string[] = [];
        let insideQuotes = false;
        let entry = '';
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            insideQuotes = !insideQuotes;
          } else if (char === ',' && !insideQuotes) {
            row.push(entry.trim());
            entry = '';
          } else {
            entry += char;
          }
        }
        row.push(entry.trim());
        return row;
      });
    }

    // กรองแถวว่าง (ต้องมีข้อมูลอย่างน้อย 1 ช่องที่ไม่ใช่ช่องว่าง)
    const rows = rawRows.filter(r => r && r.some(cell => String(cell).trim().length > 0));

    if (rows.length === 0) {
      errors.push('ไฟล์ไม่มีข้อมูลหรือเป็นไฟล์ว่างเปล่า');
      return { records, errors };
    }

    // 1. ค้นหาแถวเริ่มต้นข้อมูล (Data row start)
    let startRowIndex = -1;
    for (let i = 0; i < Math.min(rows.length, 25); i++) {
      const row = rows[i];
      const c0 = String(row[0] || '').trim();
      const c1 = String(row[1] || '').trim();
      const c2 = String(row[2] || '').trim();

      // ตรวจสอบว่า cell แรกเป็นลำดับเลข 1 หรือ 01
      if ((c0 === '1' || c0 === '01') && (c1.length > 0 || c2.length > 0 || row.length >= 4)) {
        startRowIndex = i;
        break;
      }
    }

    // Fallback: ถ้าไม่พบ '1' ให้ค้นหาแถวที่มีตัวเลขลำดับแถวแรก
    if (startRowIndex === -1) {
      for (let i = 0; i < rows.length; i++) {
        const c0 = String(rows[i][0] || '').trim();
        if (/^\d+$/.test(c0) && rows[i].length >= 4) {
          startRowIndex = i;
          break;
        }
      }
    }

    if (startRowIndex === -1) {
      startRowIndex = 0;
    }

    // 2. วิเคราะห์โครงสร้างคอลัมน์จากตัวอย่างแถวข้อมูลจริง (Dynamic Column Detection)
    const sampleRow = rows[startRowIndex] || [];
    const col0Str = String(sampleRow[0] || '').trim();
    const col1Str = String(sampleRow[1] || '').trim();
    const col2Str = String(sampleRow[2] || '').trim();
    const col3Str = String(sampleRow[3] || '').trim();
    const col4Str = String(sampleRow[4] || '').trim();

    let nameColIndex = 2;
    let amphoeColIndex = 3;
    let scoreStartIndex = 4;
    let hasSchoolIdCol = true;

    // ตรวจสอบโครงสร้าง:
    // โครงสร้าง A (มาตรฐาน สพฐ. 13 คอลัมน์):
    // [0: ลำดับ, 1: รหัสโรงเรียน(อาจเว้นว่าง), 2: ชื่อโรงเรียน, 3: อำเภอ, 4: mathScore, 5: math%, 6: thaiScore, 7: thai%, 8: totalScore, 9: total%, 10: mathQ, 11: thaiQ, 12: totalQ]
    if (
      (detectAmphoe(col3Str) || /^\d+(\.\d+)?$/.test(col4Str)) &&
      col2Str.length > 0 &&
      !detectAmphoe(col1Str)
    ) {
      hasSchoolIdCol = true;
      nameColIndex = 2;
      amphoeColIndex = 3;
      scoreStartIndex = 4;
    } else if (
      (detectAmphoe(col2Str) || /^\d+(\.\d+)?$/.test(col3Str)) &&
      col1Str.length > 0
    ) {
      // โครงสร้าง B (ไม่มีคอลัมน์รหัสโรงเรียน): [0: ลำดับ, 1: ชื่อโรงเรียน, 2: อำเภอ, 3: mathScore, ...]
      hasSchoolIdCol = false;
      nameColIndex = 1;
      amphoeColIndex = 2;
      scoreStartIndex = 3;
    } else if (/^\d{6,10}$/.test(col1Str)) {
      // โครงสร้าง C: col1 เป็นรหัส 6-10 หลัก
      hasSchoolIdCol = true;
      nameColIndex = 2;
      amphoeColIndex = 3;
      scoreStartIndex = 4;
    } else if (sampleRow.length >= 12) {
      // ค่าเริ่มต้นสำหรับไฟล์ 12-13 คอลัมน์
      hasSchoolIdCol = true;
      nameColIndex = 2;
      amphoeColIndex = 3;
      scoreStartIndex = 4;
    } else {
      hasSchoolIdCol = false;
      nameColIndex = 1;
      amphoeColIndex = 2;
      scoreStartIndex = 3;
    }

    // 3. ประมวลผลแถวข้อมูลทั้งหมด
    for (let i = startRowIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 3) continue;

      const orderStr = String(row[0] || '').trim();
      const rowText = row.join(' ');

      // ข้ามแถวรวมผล หรือหมายเหตุท้ายตาราง
      if (
        rowText.includes('เฉลี่ยรวม') ||
        rowText.includes('รวมทั้งสิ้น') ||
        rowText.includes('หมายเหตุ') ||
        rowText.includes('เกณฑ์การตัดสิน') ||
        rowText.includes('ผลคะแนนการประเมิน') ||
        rowText.includes('ระดับคุณภาพของแต่ละด้าน')
      ) {
        continue;
      }

      // ข้ามแถวที่ไม่มีข้อมูลตัวเลขลำดับ และไม่มีชื่อสถานศึกษา
      if (!/^\d+$/.test(orderStr) && !rowText.includes('โรงเรียน') && !rowText.includes('บ้าน') && !rowText.includes('ขุนยวม') && !rowText.includes('ปาย') && !rowText.includes('เขตพื้นที่')) {
        continue;
      }

      const orderNum = parseInt(orderStr, 10) || (i - startRowIndex + 1);

      let rawSchoolId = '';
      let rawSchoolName = '';
      let rawAmphoe = '';

      if (hasSchoolIdCol) {
        rawSchoolId = String(row[1] || '').trim();
        rawSchoolName = String(row[nameColIndex] || '').trim();
        rawAmphoe = String(row[amphoeColIndex] || '').trim();

        // กรณีฉุกเฉิน: ถ้า col[2] ว่าง แต่ col[1] มีข้อความชื่อโรงเรียน
        if (!rawSchoolName && rawSchoolId && !/^\d+$/.test(rawSchoolId)) {
          rawSchoolName = rawSchoolId;
          rawSchoolId = '';
          if (detectAmphoe(rawAmphoe)) {
            // amphoe อยู่ใน col 3
          } else {
            rawAmphoe = String(row[2] || '').trim();
          }
        }
      } else {
        rawSchoolName = String(row[nameColIndex] || '').trim();
        rawAmphoe = String(row[amphoeColIndex] || '').trim();
      }

      if (!rawSchoolName || rawSchoolName.length < 2) continue;

      // ตรวจหาอำเภออัตโนมัติถ้าไม่มีในคอลัมน์ หรือระบุไม่ชัดเจน
      if (!rawAmphoe || rawAmphoe === '' || !detectAmphoe(rawAmphoe)) {
        rawAmphoe = detectAmphoe(rawSchoolName) || detectAmphoe(rawAmphoe) || 'เมืองแม่ฮ่องสอน';
      }

      // ดึงคะแนนและร้อยละ
      let mathScore = 0;
      let mathPercentage = 0;
      let thaiScore = 0;
      let thaiPercentage = 0;
      let totalScore = 0;
      let totalPercentage = 0;

      const cS = scoreStartIndex;

      // ในไฟล์มาตรฐาน OBEC:
      // Col cS: mathScore, Col cS+1: mathPercentage, Col cS+2: thaiScore, Col cS+3: thaiPercentage, Col cS+4: totalScore, Col cS+5: totalPercentage
      if (row.length >= cS + 6) {
        mathScore = parseScoreValue(row[cS]);
        mathPercentage = parseScoreValue(row[cS + 1]) || mathScore;
        thaiScore = parseScoreValue(row[cS + 2]);
        thaiPercentage = parseScoreValue(row[cS + 3]) || thaiScore;
        totalScore = parseScoreValue(row[cS + 4]);
        totalPercentage = parseScoreValue(row[cS + 5]) || totalScore;
      } else if (row.length >= cS + 3) {
        // รูปแบบ 3 คอลัมน์: คณิต, ไทย, รวม
        mathPercentage = parseScoreValue(row[cS]);
        mathScore = mathPercentage;
        thaiPercentage = parseScoreValue(row[cS + 1]);
        thaiScore = thaiPercentage;
        totalPercentage = parseScoreValue(row[cS + 2]) || Number(((mathPercentage + thaiPercentage) / 2).toFixed(2));
        totalScore = totalPercentage;
      } else if (row.length >= cS + 2) {
        // รูปแบบ 2 คอลัมน์: คณิต, ไทย
        mathPercentage = parseScoreValue(row[cS]);
        mathScore = mathPercentage;
        thaiPercentage = parseScoreValue(row[cS + 1]);
        thaiScore = thaiPercentage;
        totalPercentage = Number(((mathPercentage + thaiPercentage) / 2).toFixed(2));
        totalScore = totalPercentage;
      }

      // ถ้าคะแนนรวมเป็น 0 แต่มีคณิตและไทย ให้คำนวณเฉลี่ยอัตโนมัติ
      if (totalPercentage === 0 && (mathPercentage > 0 || thaiPercentage > 0)) {
        totalPercentage = Number(((mathPercentage + thaiPercentage) / 2).toFixed(2));
        totalScore = totalPercentage;
      }

      // ตรวจสอบและดึงระดับคุณภาพ (จากไฟล์โดยตรงถ้ามี หรือคำนวณจากเกณฑ์ สพฐ.)
      const parseQuality = (val: any, fallbackPercentage: number): QualityLevel => {
        const str = String(val || '').trim();
        if (str === 'ดีมาก' || str === 'ดี' || str === 'พอใช้' || str === 'ปรับปรุง') {
          return str as QualityLevel;
        }
        return determineQualityLevel(fallbackPercentage);
      };

      const rawMathQ = row[cS + 6];
      const rawThaiQ = row[cS + 7];
      const rawTotalQ = row[cS + 8];

      const mathQuality = parseQuality(rawMathQ, mathPercentage);
      const thaiQuality = parseQuality(rawThaiQ, thaiPercentage);
      const totalQuality = parseQuality(rawTotalQ, totalPercentage);

      // จับคู่ School ID 8 หลักให้แม่นยำ
      let schoolId = rawSchoolId;
      if (!schoolId || !/^\d{6,10}/.test(schoolId)) {
        schoolId = matchSchoolId(rawSchoolId, rawSchoolName, rawAmphoe, schools);
      }
      if (!schoolId) {
        schoolId = `5801${String(orderNum).padStart(4, '0')}`;
      }

      const cleanSchoolName = rawSchoolName.trim();
      const recId = `${schoolId}_${academicYear}_${testType}`;

      records.push({
        id: recId,
        order: orderNum,
        schoolId,
        schoolName: cleanSchoolName,
        amphoe: rawAmphoe || 'เมืองแม่ฮ่องสอน',
        mathScore,
        mathPercentage,
        thaiScore,
        thaiPercentage,
        totalScore,
        totalPercentage,
        mathQuality,
        thaiQuality,
        totalQuality,
        academicYear,
        testType,
        testTitle,
        notes: 'นำเข้าจากไฟล์ ' + fileName,
        updatedAt: new Date().toISOString()
      });
    }

    if (records.length === 0) {
      errors.push('ไม่พบรายการข้อมูลผลสัมฤทธิ์ที่สามารถนำเข้าได้จากไฟล์นี้ กรุณาตรวจสอบหัวตารางและรูปแบบข้อมูล');
    }

  } catch (err: any) {
    errors.push('เกิดข้อผิดพลาดในการประมวลผลไฟล์: ' + (err.message || String(err)));
  }

  return { records, errors };
}

/**
 * สร้างชุดข้อมูลเริ่มต้นปีการศึกษาจาก Master RAW_INITIAL_NT_DATA (128 แถว) และ RAW_INITIAL_RT_DATA (130 แถว)
 */
export function generateInitialAcademicRecords(
  schools: School[] = [],
  academicYear: string = '2567',
  testType?: string
): AcademicRecord[] {
  const ntRecords: AcademicRecord[] = RAW_INITIAL_NT_DATA.map((row) => {
    const schoolId = row.schoolId || matchSchoolId('', row.name, row.amphoe, schools) || `5801${String(row.order).padStart(4, '0')}`;
    const id = `${schoolId}_${academicYear}_NT`;

    return {
      id,
      order: row.order,
      schoolId,
      schoolName: row.name,
      amphoe: row.amphoe,
      mathScore: row.mathScore,
      mathPercentage: row.mathPercentage,
      thaiScore: row.thaiScore,
      thaiPercentage: row.thaiPercentage,
      totalScore: row.totalScore,
      totalPercentage: row.totalPercentage,
      mathQuality: row.mathQuality as QualityLevel,
      thaiQuality: row.thaiQuality as QualityLevel,
      totalQuality: row.totalQuality as QualityLevel,
      academicYear,
      testType: 'NT',
      testTitle: 'การประเมินคุณภาพผู้เรียน (NT) ชั้นประถมศึกษาปีที่ 3',
      notes: 'ข้อมูลผลการประเมิน สพป.แม่ฮ่องสอน เขต 1',
      updatedAt: new Date().toISOString()
    };
  });

  const rtRecords: AcademicRecord[] = RAW_INITIAL_RT_DATA.map((row) => {
    const schoolId = row.schoolId || matchSchoolId('', row.name, row.amphoe, schools) || `5801${String(row.order).padStart(4, '0')}`;
    const id = `${schoolId}_${academicYear}_RT`;

    return {
      id,
      order: row.order,
      schoolId,
      schoolName: row.name,
      amphoe: row.amphoe,
      mathScore: row.mathScore,
      mathPercentage: row.mathPercentage,
      thaiScore: row.thaiScore,
      thaiPercentage: row.thaiPercentage,
      totalScore: row.totalScore,
      totalPercentage: row.totalPercentage,
      mathQuality: row.mathQuality as QualityLevel,
      thaiQuality: row.thaiQuality as QualityLevel,
      totalQuality: row.totalQuality as QualityLevel,
      academicYear,
      testType: 'RT',
      testTitle: 'การประเมินความสามารถด้านการอ่านของผู้เรียน (RT) ชั้นประถมศึกษาปีที่ 1',
      notes: 'ข้อมูลผลการประเมิน สพป.แม่ฮ่องสอน เขต 1',
      updatedAt: new Date().toISOString()
    };
  });

  if (testType === 'NT') return ntRecords;
  if (testType === 'RT') return rtRecords;
  return [...ntRecords, ...rtRecords];
}

/**
 * คำนวณสถิติภาพรวมระดับเขตพื้นที่ และสถิติแยกตามอำเภอ
 */
export function calculateAcademicSummary(records: AcademicRecord[]) {
  if (!records || records.length === 0) {
    return {
      totalSchools: 0,
      avgMath: 0,
      avgThai: 0,
      avgTotal: 0,
      maxTotal: 0,
      minTotal: 0,
      qualityDistribution: {
        ดีมาก: 0,
        ดี: 0,
        พอใช้: 0,
        ปรับปรุง: 0
      },
      amphoeBreakdown: [] as { amphoe: string; count: number; avgMath: number; avgThai: number; avgTotal: number }[]
    };
  }

  // แยกเฉพาะสถานศึกษา (ไม่รวมแถวสรุปเขตพื้นที่การศึกษา เพื่อไม่ให้ค่าเฉลี่ยซ้ำซ้อน)
  const schoolRecords = records.filter(r => !r.schoolName.includes('เขตพื้นที่การศึกษา'));
  const effectiveList = schoolRecords.length > 0 ? schoolRecords : records;

  const totalSchools = effectiveList.length;
  const sumMath = effectiveList.reduce((acc, r) => acc + (r.mathPercentage || r.mathScore || 0), 0);
  const sumThai = effectiveList.reduce((acc, r) => acc + (r.thaiPercentage || r.thaiScore || 0), 0);
  const sumTotal = effectiveList.reduce((acc, r) => acc + (r.totalPercentage || r.totalScore || 0), 0);

  const avgMath = totalSchools > 0 ? Number((sumMath / totalSchools).toFixed(2)) : 0;
  const avgThai = totalSchools > 0 ? Number((sumThai / totalSchools).toFixed(2)) : 0;
  const avgTotal = totalSchools > 0 ? Number((sumTotal / totalSchools).toFixed(2)) : 0;

  const totalScores = effectiveList.map(r => r.totalPercentage || r.totalScore || 0);
  const maxTotal = totalScores.length > 0 ? Math.max(...totalScores) : 0;
  const minTotal = totalScores.length > 0 ? Math.min(...totalScores) : 0;

  const qualityDistribution: { [key: string]: number } = {
    ดีมาก: 0,
    ดี: 0,
    พอใช้: 0,
    ปรับปรุง: 0
  };

  effectiveList.forEach(r => {
    const q = r.totalQuality || determineQualityLevel(r.totalPercentage || r.totalScore);
    if (qualityDistribution[q] !== undefined) {
      qualityDistribution[q]++;
    } else {
      qualityDistribution['ปรับปรุง']++;
    }
  });

  // จัดกลุ่มรายอำเภอ 4 อำเภอ
  const amphoeMap: { [amphoe: string]: { mathSum: number; thaiSum: number; totalSum: number; count: number } } = {
    'ขุนยวม': { mathSum: 0, thaiSum: 0, totalSum: 0, count: 0 },
    'ปาย': { mathSum: 0, thaiSum: 0, totalSum: 0, count: 0 },
    'เมืองแม่ฮ่องสอน': { mathSum: 0, thaiSum: 0, totalSum: 0, count: 0 },
    'ปางมะผ้า': { mathSum: 0, thaiSum: 0, totalSum: 0, count: 0 }
  };

  effectiveList.forEach(r => {
    const amp = r.amphoe || 'เมืองแม่ฮ่องสอน';
    if (!amphoeMap[amp]) {
      amphoeMap[amp] = { mathSum: 0, thaiSum: 0, totalSum: 0, count: 0 };
    }
    amphoeMap[amp].mathSum += (r.mathPercentage || r.mathScore || 0);
    amphoeMap[amp].thaiSum += (r.thaiPercentage || r.thaiScore || 0);
    amphoeMap[amp].totalSum += (r.totalPercentage || r.totalScore || 0);
    amphoeMap[amp].count++;
  });

  const amphoeBreakdown = Object.keys(amphoeMap)
    .filter(amp => amphoeMap[amp].count > 0)
    .map(amp => ({
      amphoe: amp,
      count: amphoeMap[amp].count,
      avgMath: Number((amphoeMap[amp].mathSum / amphoeMap[amp].count).toFixed(2)),
      avgThai: Number((amphoeMap[amp].thaiSum / amphoeMap[amp].count).toFixed(2)),
      avgTotal: Number((amphoeMap[amp].totalSum / amphoeMap[amp].count).toFixed(2))
    }))
    .sort((a, b) => b.avgTotal - a.avgTotal);

  return {
    totalSchools,
    avgMath,
    avgThai,
    avgTotal,
    maxTotal,
    minTotal,
    qualityDistribution,
    amphoeBreakdown
  };
}

/**
 * ส่งออกข้อมูลเป็นไฟล์ Excel ตามโครงสร้างไฟล์ สพฐ. มาตรฐาน
 */
export function exportAcademicRecordsToExcel(records: AcademicRecord[], academicYear: string = '2567', testType: string = 'NT') {
  const isRT = testType === 'RT';
  const sub1Name = isRT ? 'ด้านการอ่านออกเสียง' : 'ด้านคณิตศาสตร์';
  const sub2Name = isRT ? 'ด้านการอ่านรู้เรื่อง' : 'ด้านภาษาไทย';

  const dataRows = [
    ['ลำดับ', 'รหัสโรงเรียน', 'ชื่อสถานศึกษา', 'อำเภอ/เขต', 'ผลคะแนนการประเมินของแต่ละด้าน', '', '', '', '', '', 'ระดับคุณภาพของแต่ละด้าน', '', ''],
    ['', '', '', '', sub1Name, '', sub2Name, '', 'รวม 2 ด้าน', '', '', '', ''],
    ['', '', '', '', 'คะแนน', 'ร้อยละ', 'คะแนน', 'ร้อยละ', 'คะแนน', 'ร้อยละ', sub1Name, sub2Name, 'รวม 2 ด้าน']
  ];

  records.forEach((r, idx) => {
    dataRows.push([
      String(r.order || idx + 1),
      r.schoolId || '',
      r.schoolName,
      r.amphoe,
      String(r.mathScore),
      String(r.mathPercentage),
      String(r.thaiScore),
      String(r.thaiPercentage),
      String(r.totalScore),
      String(r.totalPercentage),
      r.mathQuality,
      r.thaiQuality,
      r.totalQuality
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(dataRows);

  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 2, c: 0 } },
    { s: { r: 0, c: 1 }, e: { r: 2, c: 1 } },
    { s: { r: 0, c: 2 }, e: { r: 2, c: 2 } },
    { s: { r: 0, c: 3 }, e: { r: 2, c: 3 } },
    { s: { r: 0, c: 4 }, e: { r: 0, c: 9 } },
    { s: { r: 1, c: 4 }, e: { r: 1, c: 5 } },
    { s: { r: 1, c: 6 }, e: { r: 1, c: 7 } },
    { s: { r: 1, c: 8 }, e: { r: 1, c: 9 } },
    { s: { r: 0, c: 10 }, e: { r: 1, c: 12 } },
  ];

  const workbook = XLSX.utils.book_new();
  const testLabel = isRT ? 'RT_ป1' : 'NT_ป3';
  XLSX.utils.book_append_sheet(workbook, worksheet, `ผลสัมฤทธิ์_${testLabel}_${academicYear}`);
  XLSX.writeFile(workbook, `ผลการประเมิน_${testLabel}_ปีการศึกษา_${academicYear}_สพป.แม่ฮ่องสอน_เขต1.xlsx`);
}
