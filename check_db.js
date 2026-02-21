require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('documents').select('requested_signers').limit(1);
  if (error) {
    console.log("ERROR:", error.message);
  } else {
    console.log("SUCCESS:", data);
  }
}
run();
