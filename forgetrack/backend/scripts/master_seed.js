const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Skill60forge@db.lywfynijjbkcgifjkhux.supabase.co:5432/postgres';

async function masterSeed() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log("Connected to DB. Starting Master Seed...");

    // 1. Recreate public.users
    console.log("Recreating public.users...");
    await client.query(`
      ALTER TABLE public.students DISABLE TRIGGER trg_create_student_user;
      CREATE TABLE IF NOT EXISTS public.users (
          id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          email TEXT UNIQUE NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('mentor', 'student')),
          student_id INTEGER REFERENCES public.students(id) ON DELETE SET NULL,
          display_name TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
      ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "users_read_all" ON public.users;
      DROP POLICY IF EXISTS "users_mentor_all" ON public.users;
      CREATE POLICY "users_read_all" ON public.users FOR SELECT USING (true);
      CREATE POLICY "users_mentor_all" ON public.users FOR ALL USING (
          (SELECT role FROM public.users WHERE id = auth.uid()) = 'mentor'
      );
    `);

    // 2. Wipe existing data
    console.log("Wiping existing data...");
    await client.query("DELETE FROM auth.users CASCADE;");
    await client.query("TRUNCATE public.students CASCADE;");
    await client.query("TRUNCATE public.sessions CASCADE;");
    await client.query("TRUNCATE public.materials CASCADE;");

    // Helper to create a user safely
    const createUser = async (email, password, role, displayName, studentId = null) => {
      const userId = require('crypto').randomUUID();
      const identityId = require('crypto').randomUUID();
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash(password, 10);

      await client.query(`
        INSERT INTO auth.users (
          instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
          confirmation_token, recovery_token, email_change_token_new, email_change
        ) VALUES (
          '00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated', $2, $3, now(),
          '{"provider":"email","providers":["email"]}', $4, now(), now(), '', '', '', ''
        )
      `, [userId, email, hash, JSON.stringify({ role, display_name: displayName, student_id: studentId })]);

      await client.query(`
        INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
        VALUES ($1, $2, $4, $3, 'email', now(), now(), now())
      `, [identityId, userId, JSON.stringify({ sub: userId, email }), userId]);

      await client.query(`
        INSERT INTO public.users (id, email, role, student_id, display_name)
        VALUES ($1, $2, $3, $4, $5)
      `, [userId, email, role, studentId, displayName]);

      return userId;
    };

    // 3. Seed Mentors
    console.log("Seeding mentors...");
    await createUser('nischay@theboringpeople.in', 'password123', 'mentor', 'Nischay B K');
    await createUser('varun@theboringpeople.in', 'password123', 'mentor', 'Varun');

    // 4. Seed Students
    console.log("Seeding students...");
    const students = [
      { name: 'Abhishek Sharma', usn: '4SH24CS001', branch: 'CS' },
      { name: 'Divya Kulkarni', usn: '4SH24CS002', branch: 'AI' },
      { name: 'Ravi Kumar', usn: '4SH24CS003', branch: 'CS' },
      { name: 'Priya Singh', usn: '4SH24CS004', branch: 'IS' },
      { name: 'Arjun Reddy', usn: '4SH24CS005', branch: 'AI' }
    ];

    for (const s of students) {
      const res = await client.query("INSERT INTO public.students (name, usn, branch_code) VALUES ($1, $2, $3) RETURNING id", [s.name, s.usn, s.branch]);
      const sId = res.rows[0].id;
      await createUser(`${s.usn.toLowerCase()}@forge.local`, s.usn, 'student', s.name, sId);
    }

    // 5. Seed Sessions
    console.log("Seeding sessions...");
    const sessions = [
      { date: '2025-11-01', topic: 'Introduction to Agentic AI', month: 4 },
      { date: '2025-11-08', topic: '8-Layer AI Stack', month: 4 }
    ];
    for (const sess of sessions) {
      await client.query("INSERT INTO public.sessions (date, topic, month_number) VALUES ($1, $2, $3)", [sess.date, sess.topic, sess.month]);
    }

    console.log("Master Seed completed successfully!");

  } catch (err) {
    console.error("Master Seed failed:", err);
  } finally {
    await client.end();
  }
}

masterSeed();
