const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Skill60forge@db.lywfynijjbkcgifjkhux.supabase.co:5432/postgres';

async function fixAud() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const res = await client.query("UPDATE auth.users SET aud = 'authenticated' WHERE aud IS NULL;");
    console.log(`Updated ${res.rowCount} users with missing aud.`);

  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

fixAud();
