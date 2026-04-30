-- Enable UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-------------------------------------------------------------------------------
-- 1. Table Definitions
-------------------------------------------------------------------------------

-- Students
CREATE TABLE public.students (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    usn TEXT UNIQUE NOT NULL,
    admission_number TEXT,
    email TEXT,
    branch_code TEXT NOT NULL,
    batch TEXT DEFAULT '2024-2028',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Sessions
CREATE TABLE public.sessions (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    topic TEXT NOT NULL,
    month_number INTEGER NOT NULL,
    duration_hours DECIMAL(3,1) DEFAULT 2.0,
    session_type TEXT DEFAULT 'offline',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ImportLog
CREATE TABLE public.import_log (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    total_rows INTEGER NOT NULL,
    imported_rows INTEGER NOT NULL,
    skipped_rows INTEGER NOT NULL,
    warnings TEXT,
    column_mapping TEXT,
    status TEXT NOT NULL
);

-- Attendance
CREATE TABLE public.attendance (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    present BOOLEAN NOT NULL,
    marked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    marked_by TEXT DEFAULT 'system',
    import_id INTEGER REFERENCES public.import_log(id) ON DELETE SET NULL,
    UNIQUE(student_id, session_id)
);

-- Materials
CREATE TABLE public.materials (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Users (Extension mapping to auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('mentor', 'student')),
    student_id INTEGER REFERENCES public.students(id) ON DELETE SET NULL,
    display_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-------------------------------------------------------------------------------
-- 2. Constraints & Triggers
-------------------------------------------------------------------------------

-- Check: Attendance date cannot be in the future or before 2025-08-04
CREATE OR REPLACE FUNCTION check_attendance_date()
RETURNS TRIGGER AS $$
DECLARE
    session_date DATE;
BEGIN
    SELECT date INTO session_date FROM public.sessions WHERE id = NEW.session_id;
    IF session_date > CURRENT_DATE THEN
        RAISE EXCEPTION 'Attendance cannot be marked for future dates.';
    END IF;
    IF session_date < '2025-08-04' THEN
        RAISE EXCEPTION 'Attendance cannot be marked before program start (2025-08-04).';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_attendance_date
BEFORE INSERT OR UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION check_attendance_date();

-- Trigger: Auto-create auth.users and public.users when a student is created
CREATE OR REPLACE FUNCTION create_student_user()
RETURNS TRIGGER AS $$
DECLARE
    user_id UUID;
    student_email TEXT;
BEGIN
    user_id := uuid_generate_v4();
    student_email := LOWER(NEW.usn) || '@forge.local';
    
    -- Insert into auth.users (Supabase managed schema)
    -- Using the USN as the default password for students
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, is_super_admin)
    VALUES (
        user_id,
        '00000000-0000-0000-0000-000000000000',
        student_email,
        crypt(NEW.usn, gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        json_build_object('role', 'student', 'student_id', NEW.id, 'display_name', NEW.name),
        now(),
        now(),
        'authenticated',
        false
    );

    -- Insert into public.users mapping
    INSERT INTO public.users (id, email, role, student_id, display_name)
    VALUES (user_id, student_email, 'student', NEW.id, NEW.name);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_create_student_user
AFTER INSERT ON public.students
FOR EACH ROW
EXECUTE FUNCTION create_student_user();

-------------------------------------------------------------------------------
-- 3. Row Level Security (RLS) Policies
-------------------------------------------------------------------------------

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Mentors get full access to everything
-- Students get read-only to their own data, and read-only to all sessions/materials

-- Users Table
CREATE POLICY "users_read_all" ON public.users FOR SELECT USING (true);
CREATE POLICY "users_mentor_all" ON public.users FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'mentor'
);

-- Students Table
CREATE POLICY "students_mentor_all" ON public.students FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'mentor'
);
CREATE POLICY "students_read_own" ON public.students FOR SELECT USING (
    id = (SELECT student_id FROM public.users WHERE id = auth.uid())
);

-- Sessions Table
CREATE POLICY "sessions_mentor_all" ON public.sessions FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'mentor'
);
CREATE POLICY "sessions_read_all" ON public.sessions FOR SELECT USING (true);

-- Attendance Table
CREATE POLICY "attendance_mentor_all" ON public.attendance FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'mentor'
);
CREATE POLICY "attendance_read_own" ON public.attendance FOR SELECT USING (
    student_id = (SELECT student_id FROM public.users WHERE id = auth.uid())
);

-- Materials Table
CREATE POLICY "materials_mentor_all" ON public.materials FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'mentor'
);
CREATE POLICY "materials_read_all" ON public.materials FOR SELECT USING (true);

-- ImportLog Table
CREATE POLICY "import_log_mentor_all" ON public.import_log FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'mentor'
);
