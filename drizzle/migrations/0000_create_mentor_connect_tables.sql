-- Mentor Connect application tables

-- Schema only: real mentor rows are loaded separately; never seed placeholders here.
CREATE TABLE public.mentors (
  id text PRIMARY KEY,
  name text,
  city text,
  domains text[],
  company text,
  master_sector text,
  sectors text[],
  roles text[],
  seniority text,
  ai_native text,
  built_ai_product text,
  ai_experience text,
  ai_sub_domain text,
  ai_tools text[],
  analytics_tools text[],
  quality_of_mentorship text,
  activities_participated text,
  data_completeness text
);

GRANT SELECT ON public.mentors TO anon, authenticated;
GRANT ALL ON public.mentors TO service_role;
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mentor profiles are readable" ON public.mentors FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title text,
  category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  response_type text,
  recommended_mentor_ids text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.unmatched_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  query text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX messages_conversation_idx ON public.messages (conversation_id, created_at);
CREATE INDEX conversations_student_idx ON public.conversations (student_id, updated_at DESC);

-- This prototype has no passwords: students are identified client-side, so the
-- conversation tables are anon-accessible by design.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO anon, authenticated;
GRANT SELECT, INSERT ON public.unmatched_queries TO anon, authenticated;
GRANT ALL ON public.students, public.conversations, public.messages, public.unmatched_queries TO service_role;

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unmatched_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students are open in this prototype" ON public.students FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Conversations are open in this prototype" ON public.conversations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Messages are open in this prototype" ON public.messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Unmatched queries are appendable in this prototype" ON public.unmatched_queries FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
