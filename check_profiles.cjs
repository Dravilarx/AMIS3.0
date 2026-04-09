
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tmwishtywgciqbqdkjhh.supabase.co';
const supabaseAnonKey = 'sb_publishable_X2SDnQ9kmGgOMhW-UJ5QpQ_bI9tquTQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUsers() {
    console.log("Checking profiles table...");
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error:", error.message);
        return;
    }

    console.log("Profiles found:", data.length);
    data.forEach(p => {
        console.log(`- Email: ${p.email}, Name: ${p.full_name}, Role: ${p.role}`);
    });
}

checkUsers();
