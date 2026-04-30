const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Skill60forge@db.lywfynijjbkcgifjkhux.supabase.co:5432/postgres';

async function fixUsers() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log("Connected. Applying comprehensive auth fix...");

    // 1. Ensure aud and missing tokens are set for everyone
    const updateSql = `
      UPDATE auth.users 
      SET 
        aud = 'authenticated',
        confirmation_token = COALESCE(confirmation_token, ''),
        recovery_token = COALESCE(recovery_token, ''),
        email_change_token_new = COALESCE(email_change_token_new, ''),
        email_change = COALESCE(email_change, '')
      WHERE aud IS NULL OR aud = '';
    `;
    const updateRes = await client.query(updateSql);
    console.log(`Updated ${updateRes.rowCount} users.`);

    // 2. Ensure identities are correctly formatted
    // Delete existing identities and recreate them to be sure
    await client.query("DELETE FROM auth.identities;");
    const insertIdentitiesSql = `
      INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      SELECT 
        uuid_generate_v4(), 
        id, 
        id::text, 
        jsonb_build_object('sub', id, 'email', email), 
        'email', 
        now(),
        created_at, 
        updated_at
      FROM auth.users;
    `;
    const insertRes = await client.query(insertIdentitiesSql);
    console.log(`Recreated ${insertRes.rowCount} identity records.`);

  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

fixUsers();
