const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = 'postgresql://postgres:Skill60forge@db.lywfynijjbkcgifjkhux.supabase.co:5432/postgres';

async function fixPassword() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const hash = await bcrypt.hash('password123', 10);
    console.log(`Generated hash: ${hash}`);

    const res = await client.query("UPDATE auth.users SET encrypted_password = $1 WHERE email = 'nischay@theboringpeople.in';", [hash]);
    console.log(`Updated password for Nischay. Rows affected: ${res.rowCount}`);

  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

fixPassword();
