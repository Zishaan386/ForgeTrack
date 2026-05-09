const { Client } = require('pg');
const connectionString = 'postgresql://postgres:Skill60forge@db.lywfynijjbkcgifjkhux.supabase.co:5432/postgres';

async function fixFutureDates() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    
    // Check if there is a trigger
    const triggers = await client.query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE event_object_table = 'attendance' OR event_object_table = 'sessions'
    `);
    console.log("Triggers:", triggers.rows);
    
    for (const t of triggers.rows) {
      if (t.trigger_name.includes('future') || t.trigger_name.includes('date')) {
         console.log("Dropping trigger:", t.trigger_name);
         await client.query(`DROP TRIGGER IF EXISTS "${t.trigger_name}" ON attendance`);
         await client.query(`DROP TRIGGER IF EXISTS "${t.trigger_name}" ON sessions`);
      }
    }

    // Check if there is a check constraint
    const constraints = await client.query(`
      SELECT conname 
      FROM pg_constraint c 
      JOIN pg_class t ON c.conrelid = t.oid 
      WHERE t.relname = 'attendance' OR t.relname = 'sessions'
    `);
    console.log("Constraints:", constraints.rows);
    
    for (const c of constraints.rows) {
      if (c.conname.includes('future') || c.conname.includes('date')) {
         console.log("Dropping constraint:", c.conname);
         await client.query(`ALTER TABLE attendance DROP CONSTRAINT IF EXISTS "${c.conname}"`);
         await client.query(`ALTER TABLE sessions DROP CONSTRAINT IF EXISTS "${c.conname}"`);
      }
    }
    
    console.log("Done checking/dropping future date restrictions.");

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
fixFutureDates();
