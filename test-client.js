import { createClient } from '@supabase/supabase-js';
try {
  const supabase = createClient('https://frpjtkltipmwpevngdrp.supabase.co', 'sb_publishable_5wJwoIwcwvyjKBJsP1uMdg_x0xhwOB9');
  console.log("Client created successfully.");
} catch (e) {
  console.log("Error creating client:", e);
}
