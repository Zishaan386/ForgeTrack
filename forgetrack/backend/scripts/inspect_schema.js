const { Client } = require('pg');
const connectionString = 'postgresql://postgres:Skill60forge@db.lywfynijjbkcgifjkhux.supabase.co:5432/postgres';

async function checkColumns() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sessions' AND table_schema = 'public'
    `);
    console.log("Sessions columns:");
    console.table(res.rows);
    
    const res2 = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'students' AND table_schema = 'public'
    `);
    console.log("Students columns:");
    console.table(res2.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
checkColumns();
