import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://frpjtkltipmwpevngdrp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5wJwoIwcwvyjKBJsP1uMdg_x0xhwOB9';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const { data: suStudents, error } = await supabase.from('students').select('*').limit(20);
  console.log('Error:', error);
  console.log('First 5 students:', suStudents?.slice(0, 5));
  
  const { data: allYears } = await supabase.from('students').select('academic_year');
  const years = Array.from(new Set(allYears?.map(x => x.academic_year)));
  console.log('Distinct academic years in students table:', years);

  const { data: allSchools } = await supabase.from('schools').select('id, name');
  console.log('Total schools in Supabase:', allSchools?.length);
  
  // check count for year 2568 vs 2567
  for (const y of years) {
    const { count } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('academic_year', y);
    console.log(`Count for year ${y}:`, count);
  }
}

test();
