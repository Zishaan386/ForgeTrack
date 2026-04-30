const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Skill60forge@db.lywfynijjbkcgifjkhux.supabase.co:5432/postgres';

async function checkPolicies() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    console.log("Checking RLS on public.users...");
    const resRLS = await client.query("SELECT relname, relrowsecurity FROM pg_class JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace WHERE nspname = 'public' AND relname = 'users';");
    console.log(resRLS.rows);

    console.log("Checking policies on public.users...");
    const resPol = await client.query("SELECT * FROM pg_policies WHERE tablename = 'users';");
    console.log(resPol.rows);

  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

checkPolicies();
