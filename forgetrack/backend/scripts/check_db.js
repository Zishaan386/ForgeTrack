const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Skill60forge@db.lywfynijjbkcgifjkhux.supabase.co:5432/postgres';

async function checkDB() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const resUsers = await client.query('SELECT count(*) FROM auth.users;');
    console.log(`auth.users count: ${resUsers.rows[0].count}`);

    const resIdentities = await client.query('SELECT count(*) FROM auth.identities;');
    console.log(`auth.identities count: ${resIdentities.rows[0].count}`);

    const resStudents = await client.query('SELECT count(*) FROM public.students;');
    console.log(`public.students count: ${resStudents.rows[0].count}`);

  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

checkDB();
