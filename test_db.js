import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const id = 'a9b2d4c9-06b8-4bd1-8813-01e4a3541ab7';
  const { data: appData } = await supabase.from('clinical_appointments').select('id').eq('id', id).single();
  const { data: procData } = await supabase.from('medical_procedures_catalog').select('id').eq('id', id).single();
  console.log('App:', appData);
  console.log('Proc:', procData);
}

check();
