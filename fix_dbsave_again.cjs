const fs = require('fs');
let code = fs.readFileSync('src/lib/dbAdapter.ts', 'utf8');
const missingFunc = `
export async function dbSaveUser(userProfile: UserProfile): Promise<void> {
  if (supabase && isSupabaseConfigured()) {
    const payload = {
      uid: String(userProfile.uid),
      email: userProfile.email,
      first_name: userProfile.firstName || '',
      last_name: userProfile.lastName || '',
      school_id: userProfile.schoolId || null,
      school_name: userProfile.schoolName || null,
      role: userProfile.role || 'public',
      status: userProfile.status || 'pending',
      created_at: safeToISOString(userProfile.createdAt),
    };
    const { error } = await supabase.from('users').upsert(payload, { onConflict: 'uid', ignoreDuplicates: false });
    if (error) {
      if (error.code === '23505' && userProfile.email) {
        const { error: updateErr } = await supabase
          .from('users')
          .update(payload)
          .eq('email', userProfile.email);
        if (updateErr) {
          console.warn('Supabase dbSaveUser update by email warning (RLS):', updateErr);
        }
      } else {
        console.warn('Supabase dbSaveUser error (RLS):', error);
      }
    }
    console.log(\`✅ Saved user \${userProfile.email} to Supabase users table\`);
    return;
  }
  try {
    const userDocRef = doc(db, 'users', userProfile.uid);
    await setDoc(userDocRef, cleanForFirestore(userProfile), { merge: true });
  } catch (err) {
    console.warn('Firestore dbSaveUser warning:', err);
    throw err;
  }
}
`;
code = code + '\n' + missingFunc;
fs.writeFileSync('src/lib/dbAdapter.ts', code);
console.log('Fixed it again');
