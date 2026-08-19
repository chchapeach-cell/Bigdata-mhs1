const fs = require('fs');

let appCode = fs.readFileSync('src/App.tsx', 'utf8');
if (!appCode.includes("import { auth } from './firebase';")) {
    appCode = "import { auth } from './firebase';\n" + appCode;
}
fs.writeFileSync('src/App.tsx', appCode);

let authModal = fs.readFileSync('src/components/AuthModal.tsx', 'utf8');
authModal = authModal.replace(/saData\?\.user\?\.uid/g, "saData?.user?.id");
fs.writeFileSync('src/components/AuthModal.tsx', authModal);

console.log('Fixed auth missing imports and uid');
