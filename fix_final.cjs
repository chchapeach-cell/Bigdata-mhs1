const fs = require('fs');

let admin = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');
admin = admin.replace(/if \(auth\.currentUser\) {[\s\S]*?await updatePassword\(auth\.currentUser, selfPassword\.trim\(\)\);[\s\S]*?} else {[\s\S]*?throw new Error\('ไม่พบข้อมูลบัญชีผู้ใช้ปัจจุบัน'\);[\s\S]*?}/g, `
        const { error } = await supabase.auth.updateUser({ password: selfPassword.trim() });
        if (error) throw error;
`);
admin = admin.replace(/await sendPasswordResetEmail\(auth, editingUser\.email\);/g, `
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(editingUser.email);
        if (resetErr) throw resetErr;
`);
fs.writeFileSync('src/components/AdminPanel.tsx', admin);

let monitor = fs.readFileSync('src/components/ActiveUserSessionMonitor.tsx', 'utf8');
monitor = monitor.replace(/const sessionsRef = collection\(db, 'active_sessions'\);/g, "const sessionsRef = null as any; // removed");
monitor = monitor.replace(/await setDoc\(doc\(db, 'active_sessions', sessionToKick\.uid\), \{[\s\S]*?\}, \{ merge: true \}\);/g, "// removed");
monitor = monitor.replace(/await deleteDoc\(doc\(db, 'active_sessions', session\.uid\)\)\.catch\(\(\) => \{\}\);/g, "await supabase.from('active_sessions').delete().eq('uid', session.uid);");
fs.writeFileSync('src/components/ActiveUserSessionMonitor.tsx', monitor);

let adapter = fs.readFileSync('src/lib/dbAdapter.ts', 'utf8');
adapter = adapter.replace(/import { doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, collection, addDoc, query, where, orderBy, writeBatch } from 'firebase\/firestore';\n?/g, '');
fs.writeFileSync('src/lib/dbAdapter.ts', adapter);

console.log('Fixed final syntax');
