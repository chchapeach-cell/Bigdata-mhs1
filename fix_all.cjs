const fs = require('fs');

// Fix InactivityLogoutHandler.tsx
let inact = fs.readFileSync('src/components/InactivityLogoutHandler.tsx', 'utf8');
inact = inact.replace(/import \{ signOut \} from 'firebase\/auth';\nimport React/g, "import React");
fs.writeFileSync('src/components/InactivityLogoutHandler.tsx', inact);

// Fix App.tsx
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(/await import\('firebase\/auth'\)\.then\(\(\{signOut\}\) => signOut\(\)\)\.catch\(\(\) => \{\}\);/g, "await import('firebase/auth').then(({signOut}) => signOut(auth)).catch(() => {});");
if (!appCode.includes("import { auth } from './firebase';")) {
    appCode = appCode.replace(/import \{ supabase \} from '\.\/lib\/supabase';/, "import { supabase } from './lib/supabase';\nimport { auth } from './firebase';");
}
fs.writeFileSync('src/App.tsx', appCode);

// Fix AuthModal.tsx
let code = fs.readFileSync('src/components/AuthModal.tsx', 'utf8');
// revert the supabase user.uid back to user.id where applicable
code = code.replace(/saData\?\.user\?\.uid/g, "saData?.user?.id");
code = code.replace(/const \{ data: \{ user \} \} = await supabase\.auth\.getUser\(\);/g, "const { data: { user } } = await supabase.auth.getUser();");

// Fix signUp line 380 where saError is
code = code.replace(/const \{ data: saData, error: saError \} = await supabase\.auth\.signUp\(\{/g, `
        const { data: saData, error: saError } = await supabase.auth.signUp({`);

// Remove signInRes
code = code.replace(/signInRes\.user/g, "userCredential.user");

fs.writeFileSync('src/components/AuthModal.tsx', code);
console.log('Fixed stuff');
