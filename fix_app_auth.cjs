const fs = require('fs');

let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(/await signOut\(auth\)\.catch\(\(\) => \{\}\);/g, "await import('firebase/auth').then(({signOut}) => signOut(auth)).catch(() => {});");
fs.writeFileSync('src/App.tsx', appCode);

let code = fs.readFileSync('src/components/AuthModal.tsx', 'utf8');
code = code.replace(/user\.id/g, "user.uid");
code = code.replace(/if \(error\) throw error;/g, "");
code = code.replace(/if \(suError\) throw suError;/g, "");
code = code.replace(/if \(inErr\) throw inErr;/g, "");
code = code.replace(/console\.log\('SuperAdmin verified:', signInRes\);/g, "");

fs.writeFileSync('src/components/AuthModal.tsx', code);
console.log('Fixed AuthModal and App');
