const fs = require('fs');
let code = fs.readFileSync('src/components/AuthModal.tsx', 'utf8');

code = code.replace(/await signInWithEmailAndPassword\(auth, cleanEmail, password\);\n\s*userId = userCredential\.user\.uid;/g, `
              const signInRes = await signInWithEmailAndPassword(auth, cleanEmail, password);
              userId = signInRes.user.uid;`);
              
code = code.replace(/siData\.user\.uid/g, "siData.user.id");

fs.writeFileSync('src/components/AuthModal.tsx', code);
console.log('Fixed auth modal');
