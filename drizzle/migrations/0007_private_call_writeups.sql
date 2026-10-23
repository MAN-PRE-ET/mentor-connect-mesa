CREATE TABLE public.call_notes (
 booking_id uuid PRIMARY KEY REFERENCES public.bookings(id),
 notes text NOT NULL DEFAULT '', summary jsonb,
 owner_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.call_notes TO service_role;
ALTER TABLE public.call_notes ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.action_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES public.call_notes(booking_id),
 task text NOT NULL, timeframe text, done boolean NOT NULL DEFAULT false
);
GRANT ALL ON public.action_items TO service_role;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX action_items_booking_idx ON public.action_items(booking_id);
CREATE FUNCTION public.writeup_context(p_student_id uuid, p_booking_id uuid, p_owner_key text) RETURNS jsonb
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
 'actions',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'bookingId',a.booking_id,'task',a.task,'timeframe',a.timeframe,'done',a.done) ORDER BY a.id) FROM public.action_items a WHERE a.booking_id=p_booking_id),'[]'::jsonb),
 'priorOpenActions',coalesce((SELECT jsonb_agg(jsonb_build_object('task',a.task,'timeframe',a.timeframe) ORDER BY s.start_time,a.id) FROM public.action_items a JOIN public.call_notes n ON n.booking_id=a.booking_id JOIN public.bookings b ON b.id=a.booking_id JOIN public.slots s ON s.id=b.slot_id WHERE b.student_id=p_student_id AND b.status='completed' AND n.owner_hash=v_hash AND n.summary IS NOT NULL AND s.start_time<v_start AND NOT a.done),'[]'::jsonb));
END $$;
CREATE FUNCTION public.save_call_writeup(p_student_id uuid,p_booking_id uuid,p_owner_key text,p_notes text,p_summary jsonb) RETURNS boolean
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
 INSERT INTO public.action_items(booking_id,task,timeframe) SELECT p_booking_id,item->>'task',item->>'suggested_timeframe' FROM jsonb_array_elements(p_summary->'action_items') item;
 RETURN true;
END $$;
CREATE FUNCTION public.set_writeup_action(p_student_id uuid,p_action_id uuid,p_owner_key text,p_done boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 UPDATE public.action_items a SET done=p_done FROM public.call_notes n,public.bookings b WHERE a.id=p_action_id AND n.booking_id=a.booking_id AND b.id=a.booking_id AND b.student_id=p_student_id AND b.status='completed' AND n.owner_hash=encode(sha256(convert_to(p_owner_key,'UTF8')),'hex');
 RETURN FOUND;
END $$;
CREATE FUNCTION public.writeup_progress(p_student_id uuid,p_owner_key text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT coalesce(jsonb_agg(row_data ORDER BY start_time DESC),'[]'::jsonb) FROM (
 SELECT s.start_time,jsonb_build_object('bookingId',b.id,'mentorName',m.name,'startTime',s.start_time,'ready',n.summary IS NOT NULL,'open',count(a.id) FILTER(WHERE NOT a.done),'done',count(a.id) FILTER(WHERE a.done)) row_data
 FROM public.bookings b JOIN public.slots s ON s.id=b.slot_id JOIN public.mentors m ON m.id=b.mentor_id
 LEFT JOIN public.call_notes n ON n.booking_id=b.id AND n.owner_hash=encode(sha256(convert_to(p_owner_key,'UTF8')),'hex') LEFT JOIN public.action_items a ON a.booking_id=n.booking_id
 WHERE b.student_id=p_student_id AND b.status='completed' GROUP BY b.id,m.name,s.start_time,n.summary
 ) rows;
$$;
REVOKE ALL ON FUNCTION public.writeup_context(uuid,uuid,text),public.save_call_writeup(uuid,uuid,text,text,jsonb),public.set_writeup_action(uuid,uuid,text,boolean),public.writeup_progress(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.writeup_context(uuid,uuid,text),public.save_call_writeup(uuid,uuid,text,text,jsonb),public.set_writeup_action(uuid,uuid,text,boolean),public.writeup_progress(uuid,text) TO anon,authenticated;
COMMENT ON TABLE public.call_notes IS 'Private post-call notes: no direct public access; scoped RPCs require student UUID and a browser-held high-entropy write-up key.';