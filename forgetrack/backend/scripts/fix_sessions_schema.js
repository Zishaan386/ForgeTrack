const { Client } = require('pg');
const connectionString = 'postgresql://postgres:Skill60forge@db.lywfynijjbkcgifjkhux.supabase.co:5432/postgres';

async function fixSchema() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("Dropping unique constraint on sessions(date)...");
    await client.query(`
      ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_date_key;
    `);
    console.log("Success! Multiple sessions per day are now supported.");
  } catch (err) {
    console.error("Failed to update schema:", err);
  } finally {
    await client.end();
  }
}
fixSchema();
