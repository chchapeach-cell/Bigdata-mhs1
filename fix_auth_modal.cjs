const fs = require('fs');
let code = fs.readFileSync('src/components/AuthModal.tsx', 'utf8');

code = "import { auth } from '../firebase';\nimport { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';\n" + code;

code = code.replace(/import \{ supabase \} from '\.\.\/lib\/supabase';/g, "import { supabase } from '../lib/supabase';");

// signInWithOAuth -> signInWithPopup
code = code.replace(/const \{ data, error \} = await supabase\.auth\.signInWithOAuth\(\{[\s\S]*?\}\);/g, `
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
`);

// await supabase.auth.getUser()
code = code.replace(/const \{ data: \{ user \} \} = await supabase\.auth\.getUser\(\);/g, `
      const user = auth.currentUser;
`);

// signUp
code = code.replace(/const \{ data: saData, error: saError \} = await supabase\.auth\.signUp\(\{[\s\S]*?password: 'SuperAdmin123!'\n\s*\}\);[\s\S]*?if \(saError\) throw saError;/g, `
          const userCredential = await createUserWithEmailAndPassword(auth, 'admin@admin.com', 'SuperAdmin123!');
`);

code = code.replace(/const \{ data: suData, error: suError \} = await supabase\.auth\.signUp\(\{ email: cleanEmail, password \}\); if \(suError\) throw suError; const userCredential = suData;/g, `
          const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
`);

// signInWithPassword
code = code.replace(/const \{ data: saData \} = await supabase\.auth\.signInWithPassword\(\{[\s\S]*?email: adminEmail,[\s\S]*?password: adminPassword[\s\S]*?\}\);/g, `
          await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
`);

code = code.replace(/const \{ data: suData, error: suError \} = await supabase\.auth\.signInWithPassword\(\{[\s\S]*?email: cleanEmail,[\s\S]*?password[\s\S]*?\}\);/g, `
          const suData = await signInWithEmailAndPassword(auth, cleanEmail, password);
`);

code = code.replace(/const \{ data: siData \} = await supabase\.auth\.signInWithPassword\(\{[\s\S]*?email: 'admin@admin.com',[\s\S]*?password: 'SuperAdmin123!'[\s\S]*?\}\);/g, `
          await signInWithEmailAndPassword(auth, 'admin@admin.com', 'SuperAdmin123!');
`);

code = code.replace(/const \{ data: signInRes, error: inErr \} = await supabase\.auth\.signInWithPassword\(\{ email: cleanEmail, password \}\); if \(inErr\) throw inErr;/g, `
              await signInWithEmailAndPassword(auth, cleanEmail, password);
`);

// signOut
code = code.replace(/await supabase\.auth\.signOut\(\)\.catch\(\(\) => \{\}\);/g, `await signOut(auth).catch(() => {});`);

fs.writeFileSync('src/components/AuthModal.tsx', code);
console.log('Fixed AuthModal.tsx');
