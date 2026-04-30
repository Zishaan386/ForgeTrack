const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Skill60forge@db.lywfynijjbkcgifjkhux.supabase.co:5432/postgres';

async function checkAud() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const res = await client.query("SELECT email, aud, role FROM auth.users LIMIT 5;");
    console.log(res.rows);

  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

checkAud();
