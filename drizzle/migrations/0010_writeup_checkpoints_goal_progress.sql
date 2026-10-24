-- Step 2/5 schema: source quotes + AI-suggested steps on action_items, per-goal progress, checkpoint RPCs.
ALTER TABLE public.action_items
  ADD COLUMN source_quote text,
  ADD COLUMN kind text NOT NULL DEFAULT 'call',
  ADD COLUMN parent_id uuid REFERENCES public.action_items(id) ON DELETE CASCADE;
CREATE INDEX action_items_parent_idx ON public.action_items(parent_id);

-- Backfill source quotes for existing validated items from their saved summaries.
UPDATE public.action_items a SET source_quote = item->>'source_quote'
FROM public.call_notes n, jsonb_array_elements(n.summary->'action_items') item
WHERE a.booking_id = n.booking_id AND n.summary IS NOT NULL AND item->>'task' = a.task AND a.source_quote IS NULL;

-- writeup_context: expose sourceQuote/kind/parentId; prior open actions count only real items.
CREATE OR REPLACE FUNCTION public.writeup_context(p_student_id uuid, p_booking_id uuid, p_owner_key text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_start timestamptz; v_hash text; v_note public.call_notes%ROWTYPE; v_call jsonb;
BEGIN
 IF p_owner_key IS NULL OR length(p_owner_key) <> 64 THEN RAISE EXCEPTION 'unavailable'; END IF;
 v_hash := encode(sha256(convert_to(p_owner_key, 'UTF8')), 'hex');
 SELECT s.start_time INTO v_start FROM public.bookings b JOIN public.slots s ON s.id=b.slot_id WHERE b.id=p_booking_id AND b.student_id=p_student_id AND b.status='completed';
 IF NOT FOUND THEN RAISE EXCEPTION 'unavailable'; END IF;
 SELECT * INTO v_note FROM public.call_notes WHERE booking_id=p_booking_id;
 IF FOUND AND v_note.owner_hash <> v_hash THEN RAISE EXCEPTION 'unavailable'; END IF;
 SELECT value INTO v_call FROM jsonb_array_elements(public.list_demo_calls(p_student_id)) WHERE value->>'id'=p_booking_id::text;
 RETURN jsonb_build_object('call',v_call,'notes',coalesce(v_note.notes,''),'summary',v_note.summary,
 'actions',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'bookingId',a.booking_id,'task',a.task,'timeframe',a.timeframe,'done',a.done,'sourceQuote',a.source_quote,'kind',a.kind,'parentId',a.parent_id) ORDER BY a.id) FROM public.action_items a WHERE a.booking_id=p_booking_id),'[]'::jsonb),
 'priorOpenActions',coalesce((SELECT jsonb_agg(jsonb_build_object('task',a.task,'timeframe',a.timeframe) ORDER BY s.start_time,a.id) FROM public.action_items a JOIN public.call_notes n ON n.booking_id=a.booking_id JOIN public.bookings b ON b.id=a.booking_id JOIN public.slots s ON s.id=b.slot_id WHERE b.student_id=p_student_id AND b.status='completed' AND n.owner_hash=v_hash AND n.summary IS NOT NULL AND s.start_time<v_start AND a.kind IN ('call','accepted') AND NOT a.done),'[]'::jsonb));
END $$;

-- save_call_writeup: persist source quotes on the real action items.
CREATE OR REPLACE FUNCTION public.save_call_writeup(p_student_id uuid,p_booking_id uuid,p_owner_key text,p_notes text,p_summary jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_hash text; v_existing public.call_notes%ROWTYPE;
BEGIN
 IF p_owner_key IS NULL OR length(p_owner_key)<>64 OR p_notes IS NULL OR length(p_notes)>30000 OR jsonb_typeof(p_summary)<>'object' THEN RAISE EXCEPTION 'invalid_writeup'; END IF;
 PERFORM 1 FROM public.bookings WHERE id=p_booking_id AND student_id=p_student_id AND status='completed' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'unavailable'; END IF;
 v_hash := encode(sha256(convert_to(p_owner_key,'UTF8')),'hex');
 SELECT * INTO v_existing FROM public.call_notes WHERE booking_id=p_booking_id;
 IF FOUND THEN
  IF v_existing.owner_hash<>v_hash THEN RAISE EXCEPTION 'unavailable'; END IF;
  RETURN false;
 END IF;
 INSERT INTO public.call_notes(booking_id,notes,summary,owner_hash) VALUES(p_booking_id,p_notes,p_summary,v_hash);
 INSERT INTO public.action_items(booking_id,task,timeframe,source_quote) SELECT p_booking_id,item->>'task',item->>'suggested_timeframe',item->>'source_quote' FROM jsonb_array_elements(p_summary->'action_items') item;
 RETURN true;
END $$;

-- writeup_progress: count only real items (call + accepted), not pending AI suggestions.
CREATE OR REPLACE FUNCTION public.writeup_progress(p_student_id uuid,p_owner_key text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT coalesce(jsonb_agg(row_data ORDER BY start_time DESC),'[]'::jsonb) FROM (
 SELECT s.start_time,jsonb_build_object('bookingId',b.id,'mentorName',m.name,'startTime',s.start_time,'ready',n.summary IS NOT NULL,'open',count(a.id) FILTER(WHERE a.kind IN ('call','accepted') AND NOT a.done),'done',count(a.id) FILTER(WHERE a.kind IN ('call','accepted') AND a.done)) row_data
 FROM public.bookings b JOIN public.slots s ON s.id=b.slot_id JOIN public.mentors m ON m.id=b.mentor_id
 LEFT JOIN public.call_notes n ON n.booking_id=b.id AND n.owner_hash=encode(sha256(convert_to(p_owner_key,'UTF8')),'hex') LEFT JOIN public.action_items a ON a.booking_id=n.booking_id
 WHERE b.student_id=p_student_id AND b.status='completed' GROUP BY b.id,m.name,s.start_time,n.summary
 ) rows;
$$;

-- Per-goal (conversation) progress: bar totals plus a timeline of completed calls.
CREATE FUNCTION public.goal_progress(p_student_id uuid, p_owner_key text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_hash text;
BEGIN
 IF p_owner_key IS NULL OR length(p_owner_key) <> 64 THEN RAISE EXCEPTION 'unavailable'; END IF;
 v_hash := encode(sha256(convert_to(p_owner_key,'UTF8')),'hex');
 RETURN (
  WITH calls AS (
   SELECT b.id, b.conversation_id, b.problem_summary, s.start_time, m.name AS mentor_name,
     n.summary IS NOT NULL AS ready,
     count(a.id) FILTER (WHERE a.kind IN ('call','accepted') AND NOT a.done) AS open,
     count(a.id) FILTER (WHERE a.kind IN ('call','accepted') AND a.done) AS done
   FROM public.bookings b
   JOIN public.slots s ON s.id=b.slot_id
   JOIN public.mentors m ON m.id=b.mentor_id
   LEFT JOIN public.call_notes n ON n.booking_id=b.id AND n.owner_hash=v_hash
   LEFT JOIN public.action_items a ON a.booking_id=n.booking_id
   WHERE b.student_id=p_student_id AND b.status='completed'
   GROUP BY b.id,b.conversation_id,b.problem_summary,s.start_time,m.name,n.summary
  ),
  goals AS (
   SELECT c.conversation_id,
    (SELECT co.title FROM public.conversations co WHERE co.id=c.conversation_id) AS title,
    (array_agg(c.problem_summary ORDER BY c.start_time DESC))[1] AS goal,
    sum(c.open)::int AS open, sum(c.done)::int AS done,
    jsonb_agg(jsonb_build_object('bookingId',c.id,'mentorName',c.mentor_name,'startTime',c.start_time,'ready',c.ready,'open',c.open,'done',c.done) ORDER BY c.start_time DESC) AS calls
   FROM calls c GROUP BY c.conversation_id
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('conversationId',g.conversation_id,'title',g.title,'goal',g.goal,'open',g.open,'done',g.done,'calls',g.calls) ORDER BY g.goal),'[]'::jsonb) FROM goals g
 );
END $$;

-- Scoped fetch of one action item for the breakdown call.
CREATE FUNCTION public.action_for_breakdown(p_student_id uuid, p_action_id uuid, p_owner_key text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_row public.action_items%ROWTYPE;
BEGIN
 IF p_owner_key IS NULL OR length(p_owner_key)<>64 THEN RAISE EXCEPTION 'unavailable'; END IF;
 SELECT a.* INTO v_row FROM public.action_items a JOIN public.call_notes n ON n.booking_id=a.booking_id JOIN public.bookings b ON b.id=a.booking_id
  WHERE a.id=p_action_id AND b.student_id=p_student_id AND b.status='completed' AND n.owner_hash=encode(sha256(convert_to(p_owner_key,'UTF8')),'hex') AND a.kind IN ('call','accepted');
 IF NOT FOUND THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('id',v_row.id,'task',v_row.task,'timeframe',v_row.timeframe,'kind',v_row.kind);
END $$;

-- Store validated 2-4 AI-suggested steps under one action item (replaces prior suggestions).
CREATE FUNCTION public.save_suggested_steps(p_student_id uuid, p_parent_id uuid, p_owner_key text, p_steps jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_hash text; v_booking uuid; v_count int;
BEGIN
 IF p_owner_key IS NULL OR length(p_owner_key)<>64 THEN RAISE EXCEPTION 'unavailable'; END IF;
 IF jsonb_typeof(p_steps)<>'array' OR jsonb_array_length(p_steps) NOT BETWEEN 2 AND 4 THEN RAISE EXCEPTION 'invalid_steps'; END IF;
 v_hash := encode(sha256(convert_to(p_owner_key,'UTF8')),'hex');
 SELECT a.booking_id INTO v_booking FROM public.action_items a JOIN public.call_notes n ON n.booking_id=a.booking_id JOIN public.bookings b ON b.id=a.booking_id
  WHERE a.id=p_parent_id AND b.student_id=p_student_id AND b.status='completed' AND n.owner_hash=v_hash AND a.kind IN ('call','accepted') FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'unavailable'; END IF;
 DELETE FROM public.action_items WHERE parent_id=p_parent_id AND kind='suggested';
 INSERT INTO public.action_items(booking_id,task,kind,parent_id) SELECT v_booking, trim(step), 'suggested', p_parent_id FROM jsonb_array_elements_text(p_steps) step WHERE length(trim(step)) BETWEEN 1 AND 300;
 SELECT count(*) INTO v_count FROM public.action_items WHERE parent_id=p_parent_id;
 IF v_count < 2 OR v_count > 4 THEN RAISE EXCEPTION 'invalid_steps'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'bookingId',a.booking_id,'task',a.task,'timeframe',a.timeframe,'done',a.done,'sourceQuote',a.source_quote,'kind',a.kind,'parentId',a.parent_id) ORDER BY a.id),'[]'::jsonb) FROM public.action_items a WHERE a.parent_id=p_parent_id);
END $$;

-- Edit, accept or delete one AI-suggested step (never the validated originals).
CREATE FUNCTION public.manage_suggested_step(p_student_id uuid, p_action_id uuid, p_owner_key text, p_action text, p_task text DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_hash text;
BEGIN
 IF p_owner_key IS NULL OR length(p_owner_key)<>64 THEN RAISE EXCEPTION 'unavailable'; END IF;
 v_hash := encode(sha256(convert_to(p_owner_key,'UTF8')),'hex');
 IF p_action='delete' THEN
  DELETE FROM public.action_items a USING public.call_notes n, public.bookings b
   WHERE a.id=p_action_id AND n.booking_id=a.booking_id AND b.id=a.booking_id AND b.student_id=p_student_id AND b.status='completed' AND n.owner_hash=v_hash AND a.kind='suggested';
  RETURN FOUND;
 END IF;
 IF p_action='accept' THEN
  UPDATE public.action_items a SET kind='accepted' FROM public.call_notes n, public.bookings b
   WHERE a.id=p_action_id AND n.booking_id=a.booking_id AND b.id=a.booking_id AND b.student_id=p_student_id AND b.status='completed' AND n.owner_hash=v_hash AND a.kind='suggested';
  RETURN FOUND;
 END IF;
 IF p_action='edit' THEN
  IF p_task IS NULL OR length(trim(p_task)) NOT BETWEEN 1 AND 300 THEN RAISE EXCEPTION 'invalid_task'; END IF;
  UPDATE public.action_items a SET task=trim(p_task) FROM public.call_notes n, public.bookings b
   WHERE a.id=p_action_id AND n.booking_id=a.booking_id AND b.id=a.booking_id AND b.student_id=p_student_id AND b.status='completed' AND n.owner_hash=v_hash AND a.kind='suggested';
  RETURN FOUND;
 END IF;
 RAISE EXCEPTION 'invalid_action';
END $$;

REVOKE ALL ON FUNCTION public.goal_progress(uuid,text),public.action_for_breakdown(uuid,uuid,text),public.save_suggested_steps(uuid,uuid,text,jsonb),public.manage_suggested_step(uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.goal_progress(uuid,text),public.action_for_breakdown(uuid,uuid,text),public.save_suggested_steps(uuid,uuid,text,jsonb),public.manage_suggested_step(uuid,uuid,text,text,text) TO service_role;
COMMENT ON COLUMN public.action_items.kind IS 'call = validated from notes; suggested = AI-proposed step awaiting accept/edit/delete; accepted = student-accepted step that counts toward progress.';