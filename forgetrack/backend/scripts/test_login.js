const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lywfynijjbkcgifjkhux.supabase.co';
const supabaseKey = 'sb_publishable_--4HrjyIrxs93SFXoiCYaQ_P2v-XUYF';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
  console.log("Attempting login for nischay@theboringpeople.in...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'nischay@theboringpeople.in',
    password: 'password123',
  });

  if (error) {
    console.error("Login failed!");
    console.error("Error message:", error.message);
    console.error("Error status:", error.status);
    console.error("Full error object:", JSON.stringify(error, null, 2));
  } else {
    console.log("Login successful!");
    console.log("User:", data.user.email);
    console.log("Role:", data.user.user_metadata.role);
  }
}

testLogin();
