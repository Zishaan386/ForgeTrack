const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Skill60forge@db.lywfynijjbkcgifjkhux.supabase.co:5432/postgres';

async function checkTriggers() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    console.log("Checking triggers on auth.users...");
    const res = await client.query("SELECT tgname FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass;");
    console.log(res.rows);

  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

checkTriggers();
