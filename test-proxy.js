import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://frpjtkltipmwpevngdrp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5wJwoIwcwvyjKBJsP1uMdg_x0xhwOB9';

let cachedClient = null;
const getSupabaseClient = () => {
  if (!cachedClient) {
    cachedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return cachedClient;
}

const supabase = new Proxy({}, {
  get(_target, prop) {
    const client = getSupabaseClient();
    if (!client) return undefined;
    const value = client[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

async function test() {
  try {
     const { data, error } = await supabase.from('schools').select('*').limit(1);
     console.log("Success proxy!", data?.length);
  } catch (e) {
     console.log("Proxy error:", e);
  }
}
test();
