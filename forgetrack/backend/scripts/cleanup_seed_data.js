const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Skill60forge@db.lywfynijjbkcgifjkhux.supabase.co:5432/postgres'
});

async function cleanup() {
  try {
    await client.connect();
    console.log('Connected to database.');

    console.log('Clearing attendance...');
    await client.query('DELETE FROM public.attendance');

    console.log('Clearing sessions...');
    await client.query('DELETE FROM public.sessions');

    console.log('Clearing materials...');
    await client.query('DELETE FROM public.materials');

    console.log('Clearing students...');
    await client.query('DELETE FROM public.students');

    console.log('Clearing seed users (except Zishaan)...');
    await client.query("DELETE FROM public.users WHERE email != 'zishaan@theboringpeople.in'");

    console.log('Cleanup complete. The app is now in a clean state.');
  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    await client.end();
  }
}

cleanup();
