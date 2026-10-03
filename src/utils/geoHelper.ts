// ฟังก์ชันวิเคราะห์อำเภอและกลุ่มโรงเรียนตั้งต้นตามโครงสร้าง สพป.แม่ฮ่องสอน เขต 1
export function getAmphoeAndNetwork(id: string, name: string): { amphoe: string; networkGroup: string } {
  const n = name || "";

  // 1. กลุ่มโรงเรียนแม่อูคอ - แม่ยวมน้อย (ขุนยวม)
  if (n.includes("แม่อูคอ") || n.includes("นาจิ๋ว") || n.includes("คำสุข") || n.includes("หัวแม่สุริน") || n.includes("หัวปอน") || n.includes("แม่หาด") || n.includes("แม่ออ") || n.includes("หว่าโน") || n.includes("แม่แจ๊ะ") || n.includes("แม่โปกี") || n.includes("พัฒนา")) {
    return { amphoe: "ขุนยวม", networkGroup: "กลุ่มโรงเรียนแม่อูคอ - แม่ยวมน้อย" };
  }

  // 2. กลุ่มโรงเรียนเมืองปอน - แม่กิ๊ (ขุนยวม)
  if (n.includes("เมืองปอน") || n.includes("หนองแห้ง") || n.includes("แม่กิ๊") || n.includes("ท่าหินส้ม") || n.includes("ห้วยส้าน") || n.includes("แม่ไข่ชู่") || n.includes("มะหินหลวง") || n.includes("แม่ลาการ๊ะ")) {
    return { amphoe: "ขุนยวม", networkGroup: "กลุ่มโรงเรียนเมืองปอน - แม่กิ๊" };
  }

  // 3. กลุ่มโรงเรียนขุนยวม - แม่เงา (ขุนยวม)
  if (n.includes("ขุนยวม") || n.includes("ต่อแพ") || n.includes("แม่สะเป่ใต้") || n.includes("แม่สุริน") || n.includes("ห้วยต้นนุ่น") || n.includes("บำรุงที่ 60") || n.includes("ห้วยนา")) {
    return { amphoe: "ขุนยวม", networkGroup: "กลุ่มโรงเรียนขุนยวม - แม่เงา" };
  }

  // 4. กลุ่มโรงเรียนลุ่มน้ำลาง (ปางมะผ้า)
  if (n.includes("กิ๊ดสามสิบ") || n.includes("ถ้ำลอด") || n.includes("นาหกหลวง") || n.includes("ศูนย์ปางมะผ้า") || n.includes("ลุกป่าก๊อ") || n.includes("น้ำริน") || n.includes("เมืองแพม") || n.includes("ผามอญ") || n.includes("ห้วยแห้ง")) {
    return { amphoe: "ปางมะผ้า", networkGroup: "กลุ่มโรงเรียนลุ่มน้ำลาง" };
  }

  // 5. กลุ่มโรงเรียนลุ่มน้ำของ (ปางมะผ้า)
  if (n.includes("แม่ละนา") || n.includes("นาปู่ป้อม") || n.includes("ปางถาม") || n.includes("จ่าโบ่") || n.includes("ห้วยเฮี๊ยะ") || n.includes("ยาป่าแหน") || n.includes("น้ำฮูผาเสื่อ") || n.includes("ซอลแบะ") || n.includes("ปางบอน") || n.includes("พุฒหลวง") || n.includes("พุ่งสาแล")) {
    return { amphoe: "ปางมะผ้า", networkGroup: "กลุ่มโรงเรียนลุ่มน้ำของ" };
  }

  // 6. กลุ่มโรงเรียนสายใต้ (ปาย)
  if (n.includes("เมืองแปง") || n.includes("ทุ่งยาว") || n.includes("ทุ่งโป่งมิตรภาพ") || n.includes("ผาสำราญ") || n.includes("ปางจัง") || n.includes("ห้วยหมี") || n.includes("แพมบก") || n.includes("แม่แอบ") || n.includes("สบสา") || n.includes("สนมแมม") || n.includes("แกงหอม") || id === "58010015") {
    return { amphoe: "ปาย", networkGroup: "กลุ่มโรงเรียนสายใต้" };
  }

  // 7. กลุ่มโรงเรียนสายเหนือสัมพันธ์ (ปาย)
  if (n.includes("สังวาลย์วิทย์ 3") || n.includes("เวียงเหนือ") || n.includes("หมอแปง") || n.includes("ปางแปป") || n.includes("ป่ายาง") || n.includes("ไทรงาม") || n.includes("โทรสาร") || n.includes("แม่นาเติง") || n.includes("ป่าลามุ้ง") || n.includes("ดอยผีลู่") || n.includes("ในของ")) {
    return { amphoe: "ปาย", networkGroup: "กลุ่มโรงเรียนสายเหนือสัมพันธ์" };
  }

  // 8. กลุ่มโรงเรียนโป่งสา (ปาย)
  if (n.includes("โป่งสา") || n.includes("แม่เมืองหลวง") || n.includes("ขุนสาใน") || n.includes("ประชารังสรรค์")) {
    return { amphoe: "ปาย", networkGroup: "กลุ่มโรงเรียนโป่งสา" };
  }

  // 9. กลุ่มโรงเรียนปายมัชฌิมา (ปาย)
  if (n.includes("ปาย") || n.includes("แม่ปิง") || n.includes("น้ำฮู้") || n.includes("ใหม่สวรรค์") || n.includes("แม่ฮี้") || id === "58010129") {
    return { amphoe: "ปาย", networkGroup: "กลุ่มโรงเรียนปายมัชฌิมา" };
  }

  // 10. กลุ่มโรงเรียนห้วยโป่ง (เมืองแม่ฮ่องสอน)
  if (n.includes("เสรีวิทยา") || n.includes("ป่าลาน") || n.includes("ห้วยโป่ง") || n.includes("ยอดดอย") || n.includes("บ้านกลาง") || n.includes("ห้วยช่างคำ") || n.includes("ไม้ซางหนาม") || n.includes("แม่รำ") || n.includes("หนองเขียว") || n.includes("แก่นฟ้า") || n.includes("ใหม่ห้วยหวาย") || id === "58010006") {
    return { amphoe: "เมืองแม่ฮ่องสอน", networkGroup: "กลุ่มโรงเรียนห้วยโป่ง" };
  }

  // 11. กลุ่มโรงเรียนภูผาลีลาวดี (เมืองแม่ฮ่องสอน)
  if (n.includes("หมอกจำแป่") || n.includes("ร่มเกล้าปางตอง") || n.includes("ห้วยผา") || n.includes("ไทยรัฐวิทยา 99") || n.includes("นาป่าแปก") || n.includes("รักไทย") || n.includes("ห้วยมะเขือส้ม") || n.includes("ห้วยซาน") || n.includes("แม่สะงา") || n.includes("ห้วยโป่งอ่อน") || n.includes("นาปลาจาด") || n.includes("ห้วยผึ้ง") || n.includes("ผาฮาน") || id === "58010001" || id === "58010012" || id === "58010016" || id === "58010018" || id === "58010020") {
    return { amphoe: "เมืองแม่ฮ่องสอน", networkGroup: "กลุ่มโรงเรียนภูผาลีลาวดี" };
  }

  // 12. กลุ่มโรงเรียนสิงหนาทราชาลัย (เมืองแม่ฮ่องสอน)
  if (n.includes("อนุบาลแม่ฮ่องสอน") || n.includes("ในสอย") || n.includes("ทุ่งกองมู") || n.includes("ปางหมู") || n.includes("สบสอย") || n.includes("บ้านใหม่") || n.includes("ไม้สะเป่") || n.includes("สบป่อง") || n.includes("กุงไม้สัก") || id === "58010004" || id === "58010005" || id === "58010007" || id === "58010009" || id === "58010013") {
    return { amphoe: "เมืองแม่ฮ่องสอน", networkGroup: "กลุ่มโรงเรียนสิงหนาทราชาลัย" };
  }

  // 13. กลุ่มโรงเรียนไตรมิตร (เมืองแม่ฮ่องสอน)
  if (n.includes("ผาบ่อง") || n.includes("ห้วยปูลิง") || n.includes("ท่าโป่งแดง") || n.includes("ป่าปุ๋ย") || n.includes("ห้วยเสือ") || n.includes("น้ำเพียงดิน") || n.includes("น้ำส้ม") || n.includes("ห้วยแปมผ่า") || n.includes("ห้วยปูเลย") || n.includes("หัวน้ำแม่ฮ่องสอน") || n.includes("ห้วยตอง") || id === "58010002" || id === "58010003" || id === "58010008" || id === "58010027" || id === "58010029") {
    return { amphoe: "เมืองแม่ฮ่องสอน", networkGroup: "กลุ่มโรงเรียนไตรมิตร" };
  }

  // 14. ปางมะผ้า fallback
  if (n.includes("ปางมะผ้า") || id === "58010019" || id === "58010152") {
    return { amphoe: "ปางมะผ้า", networkGroup: "กลุ่มโรงเรียนลุ่มน้ำลาง" };
  }

  return { amphoe: "เมืองแม่ฮ่องสอน", networkGroup: "กลุ่มโรงเรียนสิงหนาทราชาลัย" };
}
