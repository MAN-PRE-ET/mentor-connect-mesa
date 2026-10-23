CREATE TABLE public.slots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 mentor_id text NOT NULL REFERENCES public.mentors(id),
 start_time timestamptz NOT NULL,
 booked boolean NOT NULL DEFAULT false,
 UNIQUE (mentor_id, start_time)
);
GRANT SELECT ON public.slots TO anon, authenticated;
GRANT ALL ON public.slots TO service_role;
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Demo slots are readable" ON public.slots FOR SELECT TO anon, authenticated USING (true);
CREATE TABLE public.bookings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 student_id uuid NOT NULL REFERENCES public.students(id),
 mentor_id text NOT NULL REFERENCES public.mentors(id),
 slot_id uuid NOT NULL UNIQUE REFERENCES public.slots(id),
 conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
 problem_summary text NOT NULL,
 note text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed')),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.bookings IS 'Anonymous prototype: student UUID is a browser-held capability; no direct public access. Access only through scoped RPCs. Calls last 30 minutes.';
INSERT INTO public.slots (mentor_id, start_time)
SELECT m.id, ((now() AT TIME ZONE 'Asia/Kolkata')::date + d.day + t.hour) AT TIME ZONE 'Asia/Kolkata'
FROM public.mentors m CROSS JOIN generate_series(1,7) AS d(day)
CROSS JOIN (VALUES (time '11:00'), (time '15:00'), (time '18:00')) AS t(hour)
WHERE extract(isodow FROM ((now() AT TIME ZONE 'Asia/Kolkata')::date + d.day)) BETWEEN 1 AND 5;
CREATE FUNCTION public.book_demo_call(p_student_id uuid, p_conversation_id uuid, p_slot_id uuid, p_note text)
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
 SELECT content INTO v_goal FROM public.messages WHERE conversation_id = p_conversation_id AND role = 'user' ORDER BY created_at, id LIMIT 1;
 IF v_goal IS NULL THEN RAISE EXCEPTION 'goal_missing'; END IF;
 IF length(coalesce(p_note,'')) > 500 THEN RAISE EXCEPTION 'note_too_long'; END IF;
 INSERT INTO public.bookings(student_id,mentor_id,slot_id,conversation_id,problem_summary,note) VALUES(p_student_id,v_slot.mentor_id,p_slot_id,p_conversation_id,v_goal,coalesce(p_note,'')) RETURNING id INTO v_id;
 UPDATE public.slots SET booked = true WHERE id = p_slot_id;
 RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.book_demo_call(uuid,uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_demo_call(uuid,uuid,uuid,text) TO anon, authenticated;
CREATE FUNCTION public.list_demo_calls(p_student_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',b.id,'mentorId',b.mentor_id,'mentorName',m.name,'company',m.company,'city',m.city,'conversationId',b.conversation_id,'problemSummary',b.problem_summary,'note',b.note,'status',b.status,'startTime',s.start_time) ORDER BY s.start_time), '[]'::jsonb)
 FROM public.bookings b JOIN public.slots s ON s.id=b.slot_id JOIN public.mentors m ON m.id=b.mentor_id WHERE b.student_id=p_student_id;
$$;
REVOKE ALL ON FUNCTION public.list_demo_calls(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_demo_calls(uuid) TO anon, authenticated;
CREATE FUNCTION public.complete_demo_call(p_student_id uuid,p_booking_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 UPDATE public.bookings SET status='completed' WHERE id=p_booking_id AND student_id=p_student_id AND status='upcoming';
 RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.complete_demo_call(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_demo_call(uuid,uuid) TO anon, authenticated;