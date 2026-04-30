const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Skill60forge@db.lywfynijjbkcgifjkhux.supabase.co:5432/postgres';

async function fixRLS() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log("Connected. Fixing recursive RLS policies...");

    const sql = `
      -- 1. Drop the problematic recursive policies
      DROP POLICY IF EXISTS "users_read_all" ON public.users;
      DROP POLICY IF EXISTS "users_mentor_all" ON public.users;
      DROP POLICY IF EXISTS "students_mentor_all" ON public.students;
      DROP POLICY IF EXISTS "sessions_mentor_all" ON public.sessions;
      DROP POLICY IF EXISTS "attendance_mentor_all" ON public.attendance;
      DROP POLICY IF EXISTS "materials_mentor_all" ON public.materials;
      DROP POLICY IF EXISTS "import_log_mentor_all" ON public.import_log;

      -- 2. Create non-recursive policies using auth.jwt()
      -- This avoids the "Database error querying schema" infinite loop
      
      -- Public Users Table
      CREATE POLICY "users_read_all" ON public.users FOR SELECT USING (true);
      CREATE POLICY "users_mentor_all" ON public.users FOR ALL USING (
          (auth.jwt() -> 'user_metadata' ->> 'role') = 'mentor'
      );

      -- Students Table
      CREATE POLICY "students_mentor_all" ON public.students FOR ALL USING (
          (auth.jwt() -> 'user_metadata' ->> 'role') = 'mentor'
      );
      CREATE POLICY "students_read_own" ON public.students FOR SELECT USING (
          id = ((auth.jwt() -> 'user_metadata' ->> 'student_id')::integer)
      );

      -- Sessions Table
      CREATE POLICY "sessions_mentor_all" ON public.sessions FOR ALL USING (
          (auth.jwt() -> 'user_metadata' ->> 'role') = 'mentor'
      );

      -- Attendance Table
      CREATE POLICY "attendance_mentor_all" ON public.attendance FOR ALL USING (
          (auth.jwt() -> 'user_metadata' ->> 'role') = 'mentor'
      );
      CREATE POLICY "attendance_read_own" ON public.attendance FOR SELECT USING (
          student_id = ((auth.jwt() -> 'user_metadata' ->> 'student_id')::integer)
      );

      -- Materials Table
      CREATE POLICY "materials_mentor_all" ON public.materials FOR ALL USING (
          (auth.jwt() -> 'user_metadata' ->> 'role') = 'mentor'
      );

      -- Import Log Table
      CREATE POLICY "import_log_mentor_all" ON public.import_log FOR ALL USING (
          (auth.jwt() -> 'user_metadata' ->> 'role') = 'mentor'
      );
    `;

    await client.query(sql);
    console.log("Fixed all recursive RLS policies successfully.");

  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

fixRLS();
