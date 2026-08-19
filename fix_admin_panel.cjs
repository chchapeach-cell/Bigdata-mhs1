const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

code = "import { auth } from '../firebase';\nimport { updatePassword, sendPasswordResetEmail } from 'firebase/auth';\n" + code;

code = code.replace(/const \{ error \} = await supabase\.auth\.updateUser\(\{ password: selfPassword\.trim\(\) \}\);\n\s*if \(error\) throw error;/g, `
        if (!auth.currentUser) throw new Error('ไม่พบข้อมูลบัญชีผู้ใช้ปัจจุบัน');
        await updatePassword(auth.currentUser, selfPassword.trim());
`);

code = code.replace(/const \{ error: resetErr \} = await supabase\.auth\.resetPasswordForEmail\(editingUser\.email\);\n\s*if \(resetErr\) throw resetErr;/g, `
        await sendPasswordResetEmail(auth, editingUser.email);
`);

fs.writeFileSync('src/components/AdminPanel.tsx', code);
console.log('Fixed AdminPanel.tsx');
