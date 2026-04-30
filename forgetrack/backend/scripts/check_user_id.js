const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Skill60forge@db.lywfynijjbkcgifjkhux.supabase.co:5432/postgres';

async function checkUser() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    console.log("Checking if user exists in public.users...");
    const res = await client.query("SELECT * FROM public.users WHERE id = 'bc8efcb0-bbcd-4227-8b1f-770fcfc567ae';");
    console.log(res.rows);

    const resAll = await client.query("SELECT * FROM public.users;");
    console.log("All users in public.users:", resAll.rows);

  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

checkUser();
