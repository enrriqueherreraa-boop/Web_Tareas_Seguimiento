const SUPABASE_URL = 
"https://jizyamoxjutdqclvvejb.supabase.co";


const SUPABASE_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppenlhbW94anV0ZHFjbHZ2ZWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMjc4NzYsImV4cCI6MjA5NjkwMzg3Nn0.kG7bCyckupO1RL2Sdy372G2lmWi3foQDorYP_4uOROk";


const supabaseClient =
window.supabaseClient =
supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);