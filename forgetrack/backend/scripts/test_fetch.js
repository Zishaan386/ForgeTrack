const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lywfynijjbkcgifjkhux.supabase.co';
const supabaseKey = 'sb_publishable_--4HrjyIrxs93SFXoiCYaQ_P2v-XUYF';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
  console.log("Attempting to fetch profile for Zishaan from public.users using anon key...");
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'Zishaan@theboringpeople.in')
    .single();

  if (error) {
    console.error("Fetch failed!");
    console.error(error);
  } else {
    console.log("Fetch successful!");
    console.log(data);
  }
}

testFetch();
