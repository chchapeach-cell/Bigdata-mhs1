const fs = require('fs');
let code = fs.readFileSync('src/components/InactivityLogoutHandler.tsx', 'utf8');

code = code.replace(/import\('\.\.\/lib\/supabase'\)\.then\(\(\{supabase\}\) => supabase\.auth\.signOut\(\)\)/g, "signOut(auth)");
if (!code.includes("import { auth } from '../firebase'")) {
    code = "import { auth } from '../firebase';\nimport { signOut } from 'firebase/auth';\n" + code;
}

fs.writeFileSync('src/components/InactivityLogoutHandler.tsx', code);
console.log('Fixed Inactivity');
