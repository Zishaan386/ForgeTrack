const { Client } = require('pg');
const connectionString = 'postgresql://postgres:Skill60forge@db.lywfynijjbkcgifjkhux.supabase.co:5432/postgres';

async function renameUser() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("Renaming user Zishaan to Zishaan...");

    // 1. Update public.users
    await client.query(`
      UPDATE public.users 
      SET display_name = 'Zishaan', 
          email = 'zishaan@theboringpeople.in' 
      WHERE email = 'Zishaan@theboringpeople.in'
    `);

    // 2. Update auth.users
    // Metadata is stored in raw_user_meta_data
    await client.query(`
      UPDATE auth.users 
      SET email = 'zishaan@theboringpeople.in',
          raw_user_meta_data = raw_user_meta_data || '{"display_name": "Zishaan"}'::jsonb
      WHERE email = 'Zishaan@theboringpeople.in'
    `);

    // 3. Update attendance marked_by
    await client.query(`
      UPDATE public.attendance 
      SET marked_by = 'Zishaan' 
      WHERE marked_by = 'Zishaan B K'
    `);

    console.log("Success! User renamed in database.");
  } catch (err) {
    console.error("Failed to rename user:", err);
  } finally {
    await client.end();
  }
}

renameUser();
