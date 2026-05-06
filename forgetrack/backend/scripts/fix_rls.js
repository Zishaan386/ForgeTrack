const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Skill60forge@db.lywfynijjbkcgifjkhux.supabase.co:5432/postgres' });

async function fixRLS() {
  await client.connect();
  try {
    console.log('Updating RLS policies to use JWT metadata (avoiding recursion)...');
    
    const setupTable = async (tableName) => {
      await client.query(`ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;`);
      
      // Select Policy: Everyone authenticated can read
      await client.query(`DROP POLICY IF EXISTS "Allow authenticated read ${tableName}" ON public.${tableName};`);
      await client.query(`CREATE POLICY "Allow authenticated read ${tableName}" ON public.${tableName} FOR SELECT TO authenticated USING (true);`);
      
      // Write Policy: Only mentors can write (check JWT metadata)
      await client.query(`DROP POLICY IF EXISTS "Allow mentor write ${tableName}" ON public.${tableName};`);
      await client.query(`CREATE POLICY "Allow mentor write ${tableName}" ON public.${tableName} FOR ALL TO authenticated USING (
        (auth.jwt() -> 'raw_user_meta_data' ->> 'role') = 'mentor'
      );`);
    };

    await setupTable('students');
    await setupTable('attendance');
    await setupTable('sessions');
    await setupTable('materials');
    
    // Users table policy
    await client.query('ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;');
    await client.query('DROP POLICY IF EXISTS "Allow users read own and mentors read all" ON public.users;');
    await client.query(`CREATE POLICY "Allow users read own and mentors read all" ON public.users FOR SELECT TO authenticated USING (
      auth.uid() = id OR (auth.jwt() -> 'raw_user_meta_data' ->> 'role') = 'mentor'
    );`);

    console.log('RLS Policies updated successfully using JWT metadata.');
  } catch (err) {
    console.error('Error updating RLS:', err);
  } finally {
    await client.end();
  }
}

fixRLS();
