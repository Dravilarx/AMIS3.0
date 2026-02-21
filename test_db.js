import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('profiles').select('*').limit(5);
  console.log('PROFILES:', data ? data.length : 0);
  
  // also get employees?
  const { data: d2 } = await supabase.from('company_employees').select('*').limit(5);
  console.log('company_employees:', d2 ? d2.length : 0);
  
  const { data: d3 } = await supabase.from('company_profiles').select('*').limit(5);
  console.log('company_profiles:', d3 ? d3.length : 0);
}
run();
