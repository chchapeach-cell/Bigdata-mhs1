const fs = require('fs');

let adapter = fs.readFileSync('src/lib/dbAdapter.ts', 'utf8');

adapter = adapter.replace(/const \{ error \} = await supabase\.from\('users'\)\.upsert\(payload, \{ onConflict: 'uid' \}\);/g, `const { error } = await supabase.from('users').upsert(payload, { onConflict: 'uid', ignoreDuplicates: false });`);
adapter = adapter.replace(/const payload = \{[\s\S]*?created_at: safeToISOString\(userProfile\.createdAt\),\n\s*\};/g, `
    const payload = {
      uid: String(userProfile.uid),
      email: userProfile.email,
      first_name: userProfile.firstName || '',
      last_name: userProfile.lastName || '',
      school_id: userProfile.schoolId || null,
      school_name: userProfile.schoolName || null,
      role: userProfile.role || 'public',
      status: userProfile.status || 'pending',
    };`);

fs.writeFileSync('src/lib/dbAdapter.ts', adapter);

let authModal = fs.readFileSync('src/components/AuthModal.tsx', 'utf8');

authModal = authModal.replace(/await dbSaveUser\(\{ \.\.\.profile, uid: user\.uid \}\);/g, `
            // skip updating existing user on regular login to avoid rls errors for users without edit perms
            if (profile.role === 'super_admin' || !profile.createdAt) {
               await dbSaveUser({ ...profile, uid: user.uid }).catch(()=>console.warn('RLS prevent dbSaveUser on login'));
            }
`);
authModal = authModal.replace(/await dbSaveUser\(profile\)\.catch\(\(\) => \{\}\);/g, "await dbSaveUser(profile).catch((err) => console.warn('RLS prevent insert fallback', err));");

fs.writeFileSync('src/components/AuthModal.tsx', authModal);
console.log('Fixed dbAdapter and authModal');
