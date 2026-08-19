const fs = require('fs');
let appCode = fs.readFileSync('src/App.tsx', 'utf8');

// replace onAuthStateChange with firebase auth
appCode = appCode.replace(/import \{ supabase \} from '\.\/lib\/supabase';/g, "import { supabase } from './lib/supabase';\nimport { auth } from './firebase';\nimport { onAuthStateChanged, signOut } from 'firebase/auth';");

appCode = appCode.replace(/const \{ data: \{ subscription \} \} = supabase\.auth\.onAuthStateChange\(async \(event, session\) => \{[\s\S]*?setUserProfile\(null\);\n\s*\}\n\s*\}\);\n\n\s*return \(\) => \{\n\s*subscription\?.unsubscribe\(\);\n\s*\};/g, 
`    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setIsLoading(true);
      if (currentUser) {
        try {
          if (currentUser.email === 'admin@admin.com') {
            const superAdminProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email,
              role: 'super_admin',
              firstName: 'Super',
              lastName: 'Admin'
            };
            setUserProfile(superAdminProfile);
          } else {
            const matchedProfile = await dbFetchUserProfile(currentUser.uid, currentUser.email || undefined);
            if (matchedProfile) {
              setUserProfile(matchedProfile);
            } else {
              console.warn("User profile not found in database.");
              setUserProfile(null);
              signOut(auth).catch(() => {});
            }
          }
        } catch (error) {
          console.error("Error setting up user profile:", error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();`);
    
appCode = appCode.replace(/await supabase\.auth\.signOut\(\)\.catch\(\(\) => \{\}\);/g, "await signOut(auth).catch(() => {});");

fs.writeFileSync('src/App.tsx', appCode);
console.log('Fixed App.tsx');
