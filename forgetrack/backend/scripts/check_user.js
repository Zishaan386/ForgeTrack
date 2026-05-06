const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Skill60forge@db.lywfynijjbkcgifjkhux.supabase.co:5432/postgres';

async function checkUser() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const res = await client.query("SELECT email, encrypted_password FROM auth.users WHERE email = 'Zishaan@theboringpeople.in';");
    console.log(`Mentor user:`, res.rows[0]);

  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

checkUser();
