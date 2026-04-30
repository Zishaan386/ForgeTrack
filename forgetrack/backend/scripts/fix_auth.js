const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Skill60forge@db.lywfynijjbkcgifjkhux.supabase.co:5432/postgres';

async function fixAuth() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log("Connected. Applying auth.identities fix...");

    const fixSql = `
      INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
      SELECT 
        uuid_generate_v4(), 
        id, 
        id::text, 
        jsonb_build_object('sub', id, 'email', email), 
        'email', 
        created_at, 
        updated_at
      FROM auth.users
      WHERE id NOT IN (SELECT user_id FROM auth.identities);
    `;

    const res = await client.query(fixSql);
    console.log(`Inserted ${res.rowCount} missing identity records.`);

  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

fixAuth();
