const fs = require('fs');
let code = fs.readFileSync('src/lib/dbAdapter.ts', 'utf8');

// There was a syntax error created by my previous regex replacement
// Let's find it and fix it
code = code.replace(/const payload = \{\n\s*uid: String\(userProfile\.uid\),\n\s*email: userProfile\.email,\n\s*first_name: userProfile\.firstName \|\| '',\n\s*last_name: userProfile\.lastName \|\| '',\n\s*school_id: userProfile\.schoolId \|\| null,\n\s*school_name: userProfile\.schoolName \|\| null,\n\s*role: userProfile\.role \|\| 'public',\n\s*status: userProfile\.status \|\| 'pending',\n\s*\};/g, 
`    const payload = {
      uid: String(userProfile.uid),
      email: userProfile.email,
      first_name: userProfile.firstName || '',
      last_name: userProfile.lastName || '',
      school_id: userProfile.schoolId || null,
      school_name: userProfile.schoolName || null,
      role: userProfile.role || 'public',
      status: userProfile.status || 'pending',
      created_at: safeToISOString(userProfile.createdAt),
    };`);

// Check if dbSaveUser is exported
if (!code.includes('export async function dbSaveUser')) {
  code = code.replace(/async function dbSaveUser/g, 'export async function dbSaveUser');
}

fs.writeFileSync('src/lib/dbAdapter.ts', code);
console.log('Fixed final dbAdapter');
