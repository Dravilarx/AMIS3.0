
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

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
