-- Enable pgcrypto for password hashing if needed
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-------------------------------------------------------------------------------
-- 1. Mentor Users
-------------------------------------------------------------------------------
-- We need to create the mentor users in auth.users and public.users
DO $$
DECLARE
    nischay_id UUID := uuid_generate_v4();
    varun_id UUID := uuid_generate_v4();
BEGIN
    -- Mentor: Nischay
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, is_super_admin)
    VALUES (
        nischay_id, '00000000-0000-0000-0000-000000000000', 'nischay@theboringpeople.in', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', json_build_object('role', 'mentor', 'display_name', 'Nischay B K'), now(), now(), 'authenticated', false
    );
    INSERT INTO public.users (id, email, role, student_id, display_name)
    VALUES (nischay_id, 'nischay@theboringpeople.in', 'mentor', NULL, 'Nischay B K');

    -- Mentor: Varun
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, is_super_admin)
    VALUES (
        varun_id, '00000000-0000-0000-0000-000000000000', 'varun@theboringpeople.in', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', json_build_object('role', 'mentor', 'display_name', 'Varun'), now(), now(), 'authenticated', false
    );
    INSERT INTO public.users (id, email, role, student_id, display_name)
    VALUES (varun_id, 'varun@theboringpeople.in', 'mentor', NULL, 'Varun');
END $$;

-------------------------------------------------------------------------------
-- 2. Students (Trigger will auto-create auth.users)
-------------------------------------------------------------------------------
INSERT INTO public.students (name, usn, branch_code) VALUES
('Abhishek Sharma', '4SH24CS001', 'CS'),
('Divya Kulkarni', '4SH24CS002', 'AI'),
('Ravi Kumar', '4SH24CS003', 'CS'),
('Priya Singh', '4SH24CS004', 'IS'),
('Arjun Reddy', '4SH24CS005', 'AI'),
('Sneha Patil', '4SH24CS006', 'CS'),
('Karthik Nair', '4SH24CS007', 'IS'),
('Megha Bhat', '4SH24CS008', 'CS'),
('Rahul Deshmukh', '4SH24CS009', 'AI'),
('Anjali Menon', '4SH24CS010', 'IS'),
('Vikram Joshi', '4SH24CS011', 'CS'),
('Neha Gupta', '4SH24CS012', 'AI'),
('Siddharth Rao', '4SH24CS013', 'CS'),
('Pooja Hegde', '4SH24CS014', 'IS'),
('Aditya Iyer', '4SH24CS015', 'AI'),
('Swati Verma', '4SH24CS016', 'CS'),
('Rohit Sharma', '4SH24CS017', 'IS'),
('Kavya Shetty', '4SH24CS018', 'AI'),
('Manoj Gowda', '4SH24CS019', 'CS'),
('Shruti Desai', '4SH24CS020', 'IS'),
('Akash Patel', '4SH24CS021', 'AI'),
('Nandini Rao', '4SH24CS022', 'CS'),
('Varun Kumar', '4SH24CS023', 'IS'),
('Rachana Jain', '4SH24CS024', 'AI'),
('Deepak Singh', '4SH24CS025', 'CS');

-------------------------------------------------------------------------------
-- 3. Sessions
-------------------------------------------------------------------------------
INSERT INTO public.sessions (date, topic, month_number, duration_hours, session_type) VALUES
('2025-11-01', 'Introduction to Agentic AI', 4, 2.0, 'offline'),
('2025-11-08', '8-Layer AI Stack', 4, 2.0, 'offline'),
('2025-11-15', 'LLM API Integration', 4, 2.0, 'online'),
('2025-11-22', 'Prompt Engineering Patterns', 4, 2.0, 'offline'),
('2025-11-29', 'Embeddings and Vector DBs', 4, 2.0, 'offline'),

('2025-12-06', 'pgvector RAG Implementation', 5, 2.5, 'offline'),
('2025-12-13', 'Advanced Retrieval Strategies', 5, 2.0, 'online'),
('2025-12-20', 'ReAct Agent Pattern', 5, 2.5, 'offline'),
('2025-12-27', 'Agent State Management', 5, 2.0, 'online'),
('2026-01-03', 'Function Calling & Tools', 5, 2.0, 'offline'),

('2026-01-10', 'Tiered Autonomy Multi-Agent', 6, 2.5, 'offline'),
('2026-01-17', 'Evaluating Agent Performance', 6, 2.0, 'online'),
('2026-01-24', 'Deployment & Security', 6, 2.0, 'offline'),
('2026-01-31', 'Capstone Project Kickoff', 6, 2.0, 'offline'),
('2026-02-07', 'Demo Day Preparation', 6, 2.0, 'offline');

-------------------------------------------------------------------------------
-- 4. Attendance
-------------------------------------------------------------------------------
-- Simple script to add realistic attendance. 
-- For demo purposes, we will use a cross join and random present marks.
DO $$
DECLARE
    student record;
    sess record;
    is_present BOOLEAN;
BEGIN
    FOR sess IN SELECT id FROM public.sessions LOOP
        FOR student IN SELECT id FROM public.students LOOP
            -- 80% chance of being present
            is_present := random() < 0.8;
            
            INSERT INTO public.attendance (student_id, session_id, present, marked_by)
            VALUES (student.id, sess.id, is_present, 'Nischay B K');
        END LOOP;
    END LOOP;
END $$;

-------------------------------------------------------------------------------
-- 5. Materials
-------------------------------------------------------------------------------
DO $$
DECLARE
    sess record;
BEGIN
    FOR sess IN SELECT id, topic FROM public.sessions LOOP
        INSERT INTO public.materials (session_id, title, type, url)
        VALUES (sess.id, sess.topic || ' Slides', 'slides', 'https://docs.google.com/presentation/d/placeholder');
        
        INSERT INTO public.materials (session_id, title, type, url)
        VALUES (sess.id, sess.topic || ' Recording', 'recording', 'https://youtube.com/watch?v=placeholder');
    END LOOP;
END $$;

-------------------------------------------------------------------------------
-- 6. Import Log
-------------------------------------------------------------------------------
INSERT INTO public.import_log (filename, uploaded_by, total_rows, imported_rows, skipped_rows, status) VALUES
('month2_attendance.csv', 'Nischay B K', 120, 118, 2, 'completed'),
('month3_attendance.xlsx', 'Varun', 125, 125, 0, 'completed');
