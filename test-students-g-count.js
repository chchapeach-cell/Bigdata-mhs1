import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://frpjtkltipmwpevngdrp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5wJwoIwcwvyjKBJsP1uMdg_x0xhwOB9';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const { count, error } = await supabase.from('students_g').select('*', { count: 'exact', head: true });
  console.log('Students_g error:', error);
  console.log('Students_g count:', count);
}

test();
