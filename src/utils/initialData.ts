import { School, StudentData } from '../types';

// พิกัดศูนย์กลางของแม่ฮ่องสอน เขต 1
export const MAP_CENTER = { lat: 19.3021, lng: 97.9654 };

// ข้อมูลชื่อภาษาไทยที่ถูกต้องและพิกัดจริงของโรงเรียนต่างๆ ใน สพป.แม่ฮ่องสอน เขต 1 เพื่อให้ระบบออกมาสมบูรณ์แบบ
export const SCHOOL_METADATA_PRESETS: { [id: string]: { name: string; lat: number; lng: number; imageUrl: string; director: string; phone: string; managerPhone: string } } = {
  "58010001": {
    name: "โรงเรียนบ้านห้วยผึ้ง",
    lat: 19.4184,
    lng: 97.9304,
    imageUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&auto=format&fit=crop&q=60",
    director: "นายสมชาย ใจดี",
    phone: "053-611001",
    managerPhone: "081-2345678"
  },
  "58010002": {
    name: "โรงเรียนบ้านทุ่งมะส่าง",
    lat: 19.3642,
    lng: 97.9821,
    imageUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&auto=format&fit=crop&q=60",
    director: "นางกัญญา รักเรียน",
    phone: "053-611002",
    managerPhone: "082-3456789"
  },
  "58010003": {
    name: "โรงเรียนบ้านทุ่งโป่ง",
    lat: 19.3412,
    lng: 97.9543,
    imageUrl: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=60",
    director: "นายวีระศักดิ์ ผดุงวิชา",
    phone: "053-611003",
    managerPhone: "083-4567890"
  },
  "58010004": {
    name: "โรงเรียนบ้านสบสอย",
    lat: 19.2741,
    lng: 97.9215,
    imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&auto=format&fit=crop&q=60",
    director: "นายประวิทย์ รักษ์สันติ",
    phone: "053-611004",
    managerPhone: "084-5678901"
  },
  "58010005": {
    name: "โรงเรียนบ้านปางหมู",
    lat: 19.3325,
    lng: 97.9621,
    imageUrl: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&auto=format&fit=crop&q=60",
    director: "ดร.วิชัย พัฒนศึกษา",
    phone: "053-611005",
    managerPhone: "085-6789012"
  },
  "58010006": {
    name: "โรงเรียนบ้านไม้ซางหนาม",
    lat: 19.3112,
    lng: 97.9154,
    imageUrl: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600&auto=format&fit=crop&q=60",
    director: "นายมานพ ตั้งใจ",
    phone: "053-611006",
    managerPhone: "086-7890123"
  },
  "58010007": {
    name: "โรงเรียนบ้านสบป่อง",
    lat: 19.5245,
    lng: 98.2451,
    imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=60",
    director: "นางสาวศิริพร มานะดี",
    phone: "053-611007",
    managerPhone: "087-9012345"
  },
  "58010008": {
    name: "โรงเรียนบ้านท่าโป่งแดง",
    lat: 19.2612,
    lng: 97.9412,
    imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&auto=format&fit=crop&q=60",
    director: "นายสุรพล พลศึกษา",
    phone: "053-611008",
    managerPhone: "088-0123456"
  },
  "58010009": {
    name: "โรงเรียนบ้านทุ่งกองมู",
    lat: 19.3245,
    lng: 97.9423,
    imageUrl: "https://images.unsplash.com/photo-1562774053-f5a02f689958?w=600&auto=format&fit=crop&q=60",
    director: "นายธงชัย ชาญศึก",
    phone: "053-611009",
    managerPhone: "089-1234567"
  },
  "58010012": {
    name: "โรงเรียนบ้านนาปลาจาด",
    lat: 19.4582,
    lng: 97.9421,
    imageUrl: "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=600&auto=format&fit=crop&q=60",
    director: "นายณรงค์ เกียรติคุณ",
    phone: "053-611012",
    managerPhone: "081-3456789"
  },
  "58010013": {
    name: "โรงเรียนอนุบาลแม่ฮ่องสอน",
    lat: 19.3012,
    lng: 97.9658,
    imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&auto=format&fit=crop&q=60",
    director: "ว่าที่ ร.ต. ศักดิ์ชาย เรียนดี",
    phone: "053-611234",
    managerPhone: "082-4567890"
  },
  "58010015": {
    name: "โรงเรียนบ้านแกงหอม",
    lat: 19.2014,
    lng: 97.9125,
    imageUrl: "https://images.unsplash.com/photo-1498243691581-b145c3f54a5c?w=600&auto=format&fit=crop&q=60",
    director: "นายอภิชาติ ปัญญา",
    phone: "053-611015",
    managerPhone: "083-5678901"
  },
  "58010016": {
    name: "โรงเรียนบ้านรักไทย",
    lat: 19.5843,
    lng: 97.9482,
    imageUrl: "https://images.unsplash.com/photo-1510531704581-5b2870972060?w=600&auto=format&fit=crop&q=60",
    director: "นายเล่าซือ มิตรสัมพันธ์",
    phone: "053-611016",
    managerPhone: "084-6789012"
  },
  "58010018": {
    name: "โรงเรียนบ้านหมอกจำแป่",
    lat: 19.4285,
    lng: 97.9542,
    imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&auto=format&fit=crop&q=60",
    director: "นางดวงพร ศรีสวย",
    phone: "053-611018",
    managerPhone: "085-7890123"
  },
  "58010019": {
    name: "โรงเรียนอนุบาลปางมะผ้า",
    lat: 19.5215,
    lng: 98.2412,
    imageUrl: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=60",
    director: "นายอัครเดช รุ่งเรือง",
    phone: "053-611019",
    managerPhone: "086-8901234"
  },
  "58010020": {
    name: "โรงเรียนบ้านนาป่าแปก",
    lat: 19.5125,
    lng: 97.9514,
    imageUrl: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&auto=format&fit=crop&q=60",
    director: "นายเกษม ศิริรัตน์",
    phone: "053-611020",
    managerPhone: "087-9012345"
  },
  "58010023": {
    name: "โรงเรียนบ้านปางตอง",
    lat: 19.4625,
    lng: 97.9614,
    imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&auto=format&fit=crop&q=60",
    director: "นายชรินทร์ สมบูรณ์",
    phone: "053-611023",
    managerPhone: "089-0123456"
  },
  "58010027": {
    name: "โรงเรียนบ้านห้วยปูลิง",
    lat: 19.1451,
    lng: 97.9954,
    imageUrl: "https://images.unsplash.com/photo-1498243691581-b145c3f54a5c?w=600&auto=format&fit=crop&q=60",
    director: "นายสวาท ปัญญาไสย",
    phone: "053-611027",
    managerPhone: "081-4567890"
  },
  "58010029": {
    name: "โรงเรียนบ้านห้วยพึ่ง",
    lat: 19.3852,
    lng: 97.9254,
    imageUrl: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&auto=format&fit=crop&q=60",
    director: "นายธีระ จิตภักดี",
    phone: "053-611029",
    managerPhone: "082-5678901"
  },
  "58010057": {
    name: "โรงเรียนบ้านขุนยวม",
    lat: 18.8351,
    lng: 97.9421,
    imageUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&auto=format&fit=crop&q=60",
    director: "นายวิโรจน์ ยอดปัญญา",
    phone: "053-691057",
    managerPhone: "083-6789012"
  },
  "58010058": {
    name: "โรงเรียนอนุบาลขุนยวม",
    lat: 18.8312,
    lng: 97.9354,
    imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&auto=format&fit=crop&q=60",
    director: "นางรัชนี ขยันศึกษา",
    phone: "053-691058",
    managerPhone: "084-7890123"
  },
  "58010129": {
    name: "โรงเรียนอนุบาลปาย (วันครู 2501)",
    lat: 19.3612,
    lng: 98.4354,
    imageUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&auto=format&fit=crop&q=60",
    director: "นายสุวรรณ ปายศึกษา",
    phone: "053-699129",
    managerPhone: "085-8901234"
  },
  "58010133": {
    name: "โรงเรียนบ้านทุ่งยาว",
    lat: 19.3452,
    lng: 98.4512,
    imageUrl: "https://images.unsplash.com/photo-1562774053-f5a02f689958?w=600&auto=format&fit=crop&q=60",
    director: "นายเกษม จิตรดี",
    phone: "053-699133",
    managerPhone: "086-9012345"
  },
  "58010152": {
    name: "โรงเรียนบ้านปางมะผ้า",
    lat: 19.5241,
    lng: 98.2415,
    imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=60",
    director: "นายอนันต์ รักษ์สันติ",
    phone: "053-611152",
    managerPhone: "087-0123456"
  }
};

// วิชาเอกตัวอย่างสำหรับนำไปสุ่ม/กำหนด
export const MAJOR_SUBJECTS_LIST = [
  "คณิตศาสตร์", "ภาษาอังกฤษ", "ภาษาไทย", "วิทยาศาสตร์ทั่วไป", "คอมพิวเตอร์/เทคโนโลยี",
  "พลศึกษา", "ศิลปศึกษา/ดนตรี", "ปฐมวัย", "สังคมศึกษา", "การงานอาชีพ"
];

// ฟังก์ชันวิเคราะห์อำเภอและกลุ่มเครือข่ายตั้งต้นตามรายชื่อโรงเรียน
export function getAmphoeAndNetwork(id: string, name: string): { amphoe: string; networkGroup: string } {
  const n = name || "";
  if (n.includes("ขุนยวม")) {
    return { amphoe: "ขุนยวม", networkGroup: "กลุ่มเครือข่ายพัฒนาคุณภาพการศึกษาขุนยวม" };
  }
  if (n.includes("ปาย") || n.includes("ทุ่งยาว")) {
    return { amphoe: "ปาย", networkGroup: "กลุ่มเครือข่ายพัฒนาคุณภาพการศึกษาปาย 1" };
  }
  if (n.includes("ปางมะผ้า") || n.includes("สบป่อง") || id === "58010007" || id === "58010019" || id === "58010152") {
    return { amphoe: "ปางมะผ้า", networkGroup: "กลุ่มเครือข่ายพัฒนาคุณภาพการศึกษาปางมะผ้า" };
  }
  // ตัวอย่างกลุ่มเครือข่ายอำเภอเมืองแม่ฮ่องสอน
  if (n.includes("ปูลิง") || n.includes("ห้วยปูลิง")) {
    return { amphoe: "เมืองแม่ฮ่องสอน", networkGroup: "กลุ่มเครือข่ายพัฒนาคุณภาพการศึกษาห้วยปูลิง" };
  }
  if (n.includes("ผึ้ง") || n.includes("หมอกจำแป่") || n.includes("รักไทย") || n.includes("นาปลาจาด")) {
    return { amphoe: "เมืองแม่ฮ่องสอน", networkGroup: "กลุ่มเครือข่ายพัฒนาคุณภาพการศึกษาหมอกจำแป่" };
  }
  return { amphoe: "เมืองแม่ฮ่องสอน", networkGroup: "กลุ่มเครือข่ายพัฒนาคุณภาพการศึกษาเมือง 1" };
}

// ฟังก์ชันสร้างข้อมูลโรงเรียนสุ่ม/ตั้งต้นในกรณีไม่มีฐานข้อมูล
export function generateDefaultSchool(id: string, nameRaw: string, studentCount: number, isExpansion: boolean): School {
  const metadata = SCHOOL_METADATA_PRESETS[id] || {
    name: nameRaw.replace(/[^\u0E00-\u0E7F0-9a-zA-Z\s]/g, '') || `โรงเรียนรหัส ${id}`,
    lat: MAP_CENTER.lat + (Math.random() - 0.5) * 0.4,
    lng: MAP_CENTER.lng + (Math.random() - 0.5) * 0.4,
    imageUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&auto=format&fit=crop&q=60",
    director: "ผู้อำนวยการใจดี มีคุณธรรม",
    phone: `053-611${id.substring(4)}`,
    managerPhone: `08${Math.floor(10000000 + Math.random() * 90000000)}`
  };

  // วิเคราะห์ขนาดตามจำนวนนักเรียน
  let size: School['size'] = 'small';
  if (studentCount >= 1500) size = 'special_large';
  else if (studentCount >= 300) size = 'large';
  else if (studentCount >= 120) size = 'medium';

  // สุ่มระบบอินเทอร์เน็ต
  const netTypes: School['internetType'][] = ['fiber', 'satellite', 'sim', 'none'];
  const netIndex = parseInt(id) % 4;
  const internetType = netTypes[netIndex];

  // สุ่มไฟฟ้า (ส่วนใหญ่มี)
  const electricity = (parseInt(id) % 15 !== 0);

  // สุ่มจำนวนครู (สัมพันธ์กับขนาดนักเรียน)
  const staffCount = Math.max(3, Math.round(studentCount / 12) + (parseInt(id) % 5));

  // วิชาเอกสุ่มจากลิสต์
  const numMajors = 2 + (parseInt(id) % 4);
  const majorSubjects: string[] = [];
  for (let i = 0; i < numMajors; i++) {
    const major = MAJOR_SUBJECTS_LIST[(parseInt(id) + i) % MAJOR_SUBJECTS_LIST.length];
    if (!majorSubjects.includes(major)) {
      majorSubjects.push(major);
    }
  }

  const { amphoe, networkGroup } = getAmphoeAndNetwork(id, metadata.name);

  // สร้างรายวิชาเอกแบบมีจำนวนบุคลากรครู
  const majorSubjectsWithStaff = majorSubjects.map((sub, idx) => ({
    name: sub,
    teachersCount: 1 + ((parseInt(id) + idx) % 4)
  }));

  return {
    id,
    name: metadata.name,
    district: "สพป.แม่ฮ่องสอน เขต 1",
    amphoe,
    networkGroup,
    internetType,
    electricity,
    staffCount,
    majorSubjects,
    majorSubjectsWithStaff,
    directorPhone: metadata.managerPhone,
    schoolPhone: metadata.phone,
    imageUrl: metadata.imageUrl,
    latitude: metadata.lat,
    longitude: metadata.lng,
    size,
    isExpansion
  };
}

// แถวข้อมูลดิบที่ได้จาก CSV ตัวอย่างใน prompt
export const RAW_CSV_DATA = `58010000,สพป.แม่ฮ่องสอน เขต 1,58010001,บ้านห้วยผึ้ง,2,2,4,1,1,1,2,1,3,3,6,1,6,6,12,3,4,6,10,1,4,2,6,1,4,3,7,1,11,8,19,1,9,5,14,1,11,3,14,1,43,27,70,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,49,33,82,9
58010000,สพป.แม่ฮ่องสอน เขต 1,58010002,บ้านทุ่งมะส่าง,0,0,0,0,4,5,9,1,6,5,11,1,10,10,20,2,4,3,7,1,6,3,9,1,4,3,7,1,4,3,7,1,6,5,11,1,4,4,8,1,28,21,49,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,38,31,69,8
58010000,สพป.แม่ฮ่องสอน เขต 1,58010003,บ้านทุ่งโป่ง,0,0,0,0,7,4,11,1,7,7,14,1,14,11,25,2,8,4,12,1,7,8,15,1,8,16,24,1,12,7,19,1,5,3,8,1,2,1,3,1,42,39,81,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,56,50,106,8
58010000,สพป.แม่ฮ่องสอน เขต 1,58010004,บ้านสบสอย,2,0,2,1,1,5,6,1,7,5,12,1,10,10,20,3,12,8,20,1,10,13,23,1,2,3,5,1,0,0,0,0,2,2,4,1,3,0,3,1,29,26,55,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,39,36,75,8
58010000,สพป.แม่ฮ่องสอน เขต 1,58010005,บ้านปางหมู,0,0,0,0,27,12,39,2,23,18,41,2,50,30,80,4,17,30,47,2,25,22,47,2,10,13,23,1,26,15,41,2,21,16,37,2,9,14,23,1,108,110,218,10,21,11,32,1,13,12,25,1,8,6,14,1,42,29,71,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,200,169,369,17
58010000,สพป.แม่ฮ่องสอน เขต 1,58010006,บ้านไม้ซางหนาม,0,0,0,0,0,1,1,1,2,0,2,1,2,1,3,2,12,7,19,1,8,2,10,1,7,4,11,1,5,3,8,1,9,1,10,1,2,4,6,1,43,21,64,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,45,22,67,8
58010000,สพป.แม่ฮ่องสอน เขต 1,58010007,บ้านสบป่อง,2,4,6,1,2,3,5,1,6,4,10,1,10,11,21,3,5,4,9,1,5,4,9,1,2,7,9,1,7,6,13,1,5,4,9,1,4,1,5,1,28,26,54,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,38,37,75,9
58010000,สพป.แม่ฮ่องสอน เขต 1,58010008,บ้านท่าโป่งแดง,3,6,9,1,5,2,7,1,7,5,12,1,15,13,28,3,3,12,15,1,5,6,11,1,6,3,9,1,6,4,10,1,12,3,15,1,2,7,9,1,34,35,69,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,49,48,97,9
58010000,สพป.แม่ฮ่องสอน เขต 1,58010009,บ้านทุ่งกองมู,0,0,0,0,6,4,10,1,4,4,8,1,10,8,18,2,7,7,14,1,11,9,20,1,6,11,17,1,4,10,14,1,3,5,8,1,2,2,4,1,33,44,77,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,43,52,95,8
58010000,สพป.แม่ฮ่องสอน เขต 1,58010012,บ้านนาปลาจาด,0,0,0,0,7,7,14,1,8,5,13,1,15,12,27,2,6,13,19,1,10,4,14,1,9,10,19,1,7,6,13,1,7,6,13,1,1,1,2,1,40,40,80,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,55,52,107,8
58010000,สพป.แม่ฮ่องสอน เขต 1,58010013,อนุบาลแม่ฮ่องสอน,0,0,0,0,5,0,5,1,2,2,4,1,7,2,9,2,6,7,13,1,2,4,6,1,3,3,6,1,2,2,4,1,2,3,5,1,7,4,11,1,22,23,45,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,29,25,54,8
58010000,สพป.แม่ฮ่องสอน เขต 1,58010015,บ้านแกงหอม,1,2,3,1,4,6,10,1,6,6,12,1,11,14,25,3,3,5,8,1,18,11,29,1,6,9,15,1,7,6,13,1,1,4,5,1,5,2,7,1,40,37,77,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,51,51,102,9
58010000,สพป.แม่ฮ่องสอน เขต 1,58010016,บ้านรักไทย,0,0,0,0,4,4,8,1,4,6,10,1,8,10,18,2,13,15,28,2,10,6,16,1,4,9,13,1,4,3,7,1,1,3,4,1,9,5,14,1,41,41,82,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,49,51,100,9
58010000,สพป.แม่ฮ่องสอน เขต 1,58010018,บ้านหมอกจำแป่,0,0,0,0,2,6,8,1,6,6,12,1,8,12,20,2,5,13,18,1,3,8,11,1,8,11,19,1,4,10,14,1,6,7,13,1,7,7,14,1,33,56,89,6,9,8,17,1,12,11,23,1,9,7,16,1,30,26,56,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,71,94,165,11
58010000,สพป.แม่ฮ่องสอน เขต 1,58010019,อนุบาลปางมะผ้า,0,0,0,0,19,16,35,2,20,31,51,3,39,47,86,5,50,50,100,4,44,39,83,4,65,57,122,4,53,47,100,4,48,60,108,4,62,43,105,4,322,296,618,24,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,361,343,704,29
58010000,สพป.แม่ฮ่องสอน เขต 1,58010020,บ้านนาป่าแปก,0,0,0,0,5,1,6,1,5,4,9,1,10,5,15,2,4,0,4,1,3,2,5,1,4,3,7,1,4,4,8,1,5,3,8,1,6,2,8,1,26,14,40,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,36,19,55,8
58010000,สพป.แม่ฮ่องสอน เขต 1,58010023,บ้านปางตอง,0,0,0,0,2,5,7,1,0,6,6,1,2,11,13,2,26,15,41,2,19,36,55,2,32,17,49,2,25,26,51,2,14,16,30,1,5,17,22,1,121,127,248,10,8,9,17,1,1,3,4,1,4,1,5,1,13,13,26,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,136,151,287,15
58010000,สพป.แม่ฮ่องสอน เขต 1,58010027,บ้านห้วยปูลิง,0,0,0,0,24,25,49,2,20,22,42,2,44,47,91,4,20,23,43,2,23,22,45,2,12,16,28,1,23,17,40,1,23,12,35,1,11,25,36,1,112,115,227,8,12,11,23,1,14,11,25,1,13,15,28,1,39,37,76,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,195,199,394,15
58010000,สพป.แม่ฮ่องสอน เขต 1,58010029,บ้านห้วยพึ่ง,0,0,0,0,1,1,2,1,8,6,14,1,9,7,16,2,5,5,10,1,11,11,22,1,3,12,15,1,8,4,12,1,4,7,11,1,15,8,23,1,46,47,93,6,30,14,44,1,29,24,53,2,14,13,27,1,73,51,124,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,105,233,12
58010000,สพป.แม่ฮ่องสอน เขต 1,58010057,บ้านขุนยวม,0,0,0,0,12,15,27,1,11,15,26,1,23,30,53,2,27,25,52,2,21,21,42,2,33,39,72,3,44,34,78,3,31,28,59,3,39,30,69,3,195,177,372,16,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,218,207,425,18
58010000,สพป.แม่ฮ่องสอน เขต 1,58010058,อนุบาลขุนยวม,0,0,0,0,16,17,33,1,17,7,24,1,33,24,57,2,34,24,58,2,13,13,26,1,13,12,25,1,12,11,23,1,29,12,41,2,15,10,25,1,116,82,198,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,149,106,255,10
58010000,สพป.แม่ฮ่องสอน เขต 1,58010129,อนุบาลปาย (วันครู 2501),0,0,0,0,44,29,73,3,44,39,83,3,88,68,156,6,41,35,76,3,29,29,58,3,42,53,95,4,49,45,94,3,40,39,79,3,45,45,90,3,246,246,492,19,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,334,314,648,25
58010000,สพป.แม่ฮ่องสอน เขต 1,58010133,บ้านทุ่งยาว,0,0,0,0,7,5,12,1,14,12,26,1,21,17,38,2,8,13,21,1,9,6,15,1,9,12,21,1,9,12,21,1,14,13,27,1,10,7,17,1,59,63,122,6,22,6,28,1,16,8,24,1,9,8,17,1,47,22,69,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,127,102,229,11
58010000,สพป.แม่ฮ่องสอน เขต 1,58010152,บ้านปางมะผ้า,11,13,24,3,48,27,75,3,42,38,80,3,101,78,179,9,44,31,75,3,26,30,56,2,45,43,88,3,34,36,70,3,41,39,80,3,25,42,67,3,215,221,436,17,31,32,63,3,22,24,46,2,28,22,50,2,81,78,159,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,397,377,774,33`;

// ฟังก์ชันแปลงข้อความ CSV ดิบให้กลายเป็นวัตถุ StudentData และ School
export function parseInitialData(academicYear: string = "2568"): { schools: School[], students: StudentData[] } {
  const lines = RAW_CSV_DATA.trim().split('\n');
  const schools: School[] = [];
  const students: StudentData[] = [];

  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length < 90) continue;

    const districtId = parts[0];
    const districtName = parts[1];
    const schoolId = parts[2];
    const schoolNameRaw = parts[3];

    // แกะชั้นเรียนต่างๆ (ชาย, หญิง, รวม, ห้อง)
    // อนุบาล 1
    const k1_male = parseInt(parts[4]) || 0;
    const k1_female = parseInt(parts[5]) || 0;
    const k1_total = parseInt(parts[6]) || 0;
    const k1_rooms = parseInt(parts[7]) || 0;

    // อนุบาล 2
    const k2_male = parseInt(parts[8]) || 0;
    const k2_female = parseInt(parts[9]) || 0;
    const k2_total = parseInt(parts[10]) || 0;
    const k2_rooms = parseInt(parts[11]) || 0;

    // อนุบาล 3
    const k3_male = parseInt(parts[12]) || 0;
    const k3_female = parseInt(parts[13]) || 0;
    const k3_total = parseInt(parts[14]) || 0;
    const k3_rooms = parseInt(parts[15]) || 0;

    // ประถม 1 - 6
    const p1_male = parseInt(parts[20]) || 0;
    const p1_female = parseInt(parts[21]) || 0;
    const p1_total = parseInt(parts[22]) || 0;
    const p1_rooms = parseInt(parts[23]) || 0;

    const p2_male = parseInt(parts[24]) || 0;
    const p2_female = parseInt(parts[25]) || 0;
    const p2_total = parseInt(parts[26]) || 0;
    const p2_rooms = parseInt(parts[27]) || 0;

    const p3_male = parseInt(parts[28]) || 0;
    const p3_female = parseInt(parts[29]) || 0;
    const p3_total = parseInt(parts[30]) || 0;
    const p3_rooms = parseInt(parts[31]) || 0;

    const p4_male = parseInt(parts[32]) || 0;
    const p4_female = parseInt(parts[33]) || 0;
    const p4_total = parseInt(parts[34]) || 0;
    const p4_rooms = parseInt(parts[35]) || 0;

    const p5_male = parseInt(parts[36]) || 0;
    const p5_female = parseInt(parts[37]) || 0;
    const p5_total = parseInt(parts[38]) || 0;
    const p5_rooms = parseInt(parts[39]) || 0;

    const p6_male = parseInt(parts[40]) || 0;
    const p6_female = parseInt(parts[41]) || 0;
    const p6_total = parseInt(parts[42]) || 0;
    const p6_rooms = parseInt(parts[43]) || 0;

    // มัธยม 1 - 3 (ม.ต้น)
    // จากแถว CSV: ดัชนีม.1 ชาย คือ parts[48] หรือ parts[60] ตามลำดับ?
    // ในข้อมูล: ดัชนี 48,49,50,51 จะเป็น ม.1 ชาย, ม.1 หญิง, รวม ม.1, ม.1 ห้อง
    // ดัชนี 52,53,54,55 เป็น ม.2
    // ดัชนี 56,57,58,59 เป็น ม.3
    const m1_male = parseInt(parts[48]) || 0;
    const m1_female = parseInt(parts[49]) || 0;
    const m1_total = parseInt(parts[50]) || 0;
    const m1_rooms = parseInt(parts[51]) || 0;

    const m2_male = parseInt(parts[52]) || 0;
    const m2_female = parseInt(parts[53]) || 0;
    const m2_total = parseInt(parts[54]) || 0;
    const m2_rooms = parseInt(parts[55]) || 0;

    const m3_male = parseInt(parts[56]) || 0;
    const m3_female = parseInt(parts[57]) || 0;
    const m3_total = parseInt(parts[58]) || 0;
    const m3_rooms = parseInt(parts[59]) || 0;

    // คำนวณผลรวม ชาย หญิง ทั้งหมด (เฉพาะถึง ม.3 เท่านั้นตามเงื่อนไขผู้ใช้)
    const totalMale = k1_male + k2_male + k3_male + p1_male + p2_male + p3_male + p4_male + p5_male + p6_male + m1_male + m2_male + m3_male;
    const totalFemale = k1_female + k2_female + k3_female + p1_female + p2_female + p3_female + p4_female + p5_female + p6_female + m1_female + m2_female + m3_female;
    const totalStudents = totalMale + totalFemale;

    // ตรวจสอบว่าเป็นโรงเรียนขยายโอกาสหรือไม่ (มีสอน ม.1 - ม.3)
    const isExpansion = (m1_total + m2_total + m3_total) > 0;

    const schoolPreset = SCHOOL_METADATA_PRESETS[schoolId] || { name: schoolNameRaw };
    const schoolName = schoolPreset.name;

    const grades = {
      "อ.1": { male: k1_male, female: k1_female, total: k1_total, rooms: k1_rooms },
      "อ.2": { male: k2_male, female: k2_female, total: k2_total, rooms: k2_rooms },
      "อ.3": { male: k3_male, female: k3_female, total: k3_total, rooms: k3_rooms },
      "ป.1": { male: p1_male, female: p1_female, total: p1_total, rooms: p1_rooms },
      "ป.2": { male: p2_male, female: p2_female, total: p2_total, rooms: p2_rooms },
      "ป.3": { male: p3_male, female: p3_female, total: p3_total, rooms: p3_rooms },
      "ป.4": { male: p4_male, female: p4_female, total: p4_total, rooms: p4_rooms },
      "ป.5": { male: p5_male, female: p5_female, total: p5_total, rooms: p5_rooms },
      "ป.6": { male: p6_male, female: p6_female, total: p6_total, rooms: p6_rooms },
      "ม.1": { male: m1_male, female: m1_female, total: m1_total, rooms: m1_rooms },
      "ม.2": { male: m2_male, female: m2_female, total: m2_total, rooms: m2_rooms },
      "ม.3": { male: m3_male, female: m3_female, total: m3_total, rooms: m3_rooms }
    };

    const studentRec: StudentData = {
      schoolId,
      schoolName,
      academicYear,
      grades,
      totalMale,
      totalFemale,
      totalStudents
    };

    const schoolRec = generateDefaultSchool(schoolId, schoolName, totalStudents, isExpansion);

    schools.push(schoolRec);
    students.push(studentRec);
  }

  return { schools, students };
}
