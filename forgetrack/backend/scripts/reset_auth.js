const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Skill60forge@db.lywfynijjbkcgifjkhux.supabase.co:5432/postgres';

async function resetAuth() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log("Wiping auth.users and identities...");
    await client.query("DELETE FROM auth.users CASCADE;");
    
    console.log("Creating minimalist mentor user...");
    const insertSql = `
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-4000-a000-000000000001',
        'authenticated',
        'authenticated',
        'Zishaan@theboringpeople.in',
        '$2b$10$s9KxAQjVFDFmbd2.1O/3QeaTnSi/eIFp7h7ZKTVErhXDPXUgHXuEK', -- password123
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"role":"mentor","display_name":"Zishaan B K"}',
        now(),
        now(),
        '',
        '',
        '',
        ''
      );
    `;
    await client.query(insertSql);

    console.log("Creating minimalist identity...");
    const identitySql = `
      INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      VALUES (
        '00000000-0000-4000-a000-000000000002',
        '00000000-0000-4000-a000-000000000001',
        '00000000-0000-4000-a000-000000000001',
        '{"sub":"00000000-0000-4000-a000-000000000001","email":"Zishaan@theboringpeople.in"}',
        'email',
        now(),
        now(),
        now()
      );
    `;
    await client.query(identitySql);

    console.log("Auth reset complete.");

  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

resetAuth();
