const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

if (!code.includes("import { supabase } from '../lib/supabase';") && !code.includes("import { supabase,")) {
  code = "import { supabase } from '../lib/supabase';\n" + code;
  fs.writeFileSync('src/components/AdminPanel.tsx', code);
  console.log('Fixed supabase import');
}
