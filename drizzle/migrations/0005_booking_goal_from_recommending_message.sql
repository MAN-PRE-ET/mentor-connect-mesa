CREATE OR REPLACE FUNCTION public.booking_goal(p_conversation_id uuid, p_mentor_id text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(
    (SELECT u.content FROM public.messages a
       JOIN LATERAL (SELECT content FROM public.messages u WHERE u.conversation_id = a.conversation_id AND u.role = 'user' AND (u.created_at, u.id) < (a.created_at, a.id) ORDER BY u.created_at DESC, u.id DESC LIMIT 1) u ON true
     WHERE a.conversation_id = p_conversation_id AND a.role = 'assistant' AND p_mentor_id = ANY(a.recommended_mentor_ids)
     ORDER BY a.created_at DESC, a.id DESC LIMIT 1),
    (SELECT content FROM public.messages WHERE conversation_id = p_conversation_id AND role = 'user' ORDER BY created_at, id LIMIT 1));
$$;
REVOKE ALL ON FUNCTION public.booking_goal(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.booking_goal(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.book_demo_call(p_student_id uuid, p_conversation_id uuid, p_slot_id uuid, p_note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_slot public.slots; v_goal text; v_id uuid;
BEGIN
 PERFORM 1 FROM public.students WHERE id = p_student_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'invalid_student'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.conversations WHERE id = p_conversation_id AND student_id = p_student_id) THEN RAISE EXCEPTION 'invalid_conversation'; END IF;
 SELECT * INTO v_slot FROM public.slots WHERE id = p_slot_id FOR UPDATE;
 IF NOT FOUND OR v_slot.booked OR v_slot.start_time <= now() THEN RAISE EXCEPTION 'slot_taken'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.messages WHERE conversation_id = p_conversation_id AND role = 'assistant' AND v_slot.mentor_id = ANY(recommended_mentor_ids)) THEN RAISE EXCEPTION 'mentor_not_recommended'; END IF;
 IF EXISTS (SELECT 1 FROM public.bookings b JOIN public.slots s ON s.id = b.slot_id WHERE b.student_id = p_student_id AND s.start_time < v_slot.start_time + interval '30 minutes' AND s.start_time + interval '30 minutes' > v_slot.start_time) THEN RAISE EXCEPTION 'time_overlap'; END IF;
 v_goal := public.booking_goal(p_conversation_id, v_slot.mentor_id);
 IF v_goal IS NULL THEN RAISE EXCEPTION 'goal_missing'; END IF;
 IF length(coalesce(p_note,'')) > 500 THEN RAISE EXCEPTION 'note_too_long'; END IF;
 INSERT INTO public.bookings(student_id,mentor_id,slot_id,conversation_id,problem_summary,note) VALUES(p_student_id,v_slot.mentor_id,p_slot_id,p_conversation_id,v_goal,coalesce(p_note,'')) RETURNING id INTO v_id;
 UPDATE public.slots SET booked = true WHERE id = p_slot_id;
 RETURN v_id;
END; $$;

UPDATE public.bookings b SET problem_summary = g.goal
FROM (SELECT id, public.booking_goal(conversation_id, mentor_id) AS goal FROM public.bookings) g
WHERE g.id = b.id AND g.goal IS NOT NULL AND g.goal <> b.problem_summary;