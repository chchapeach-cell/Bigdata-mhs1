const fs = require('fs');
let code = fs.readFileSync('src/lib/dbAdapter.ts', 'utf8');

// replace the duplicate declarations if they already exist somewhere else
code = code.replace(/export async function dbDeleteUser\(uid: string\): Promise<void> \{\}\n?/g, '');

fs.writeFileSync('src/lib/dbAdapter.ts', code);
console.log('Fixed duplicates');
