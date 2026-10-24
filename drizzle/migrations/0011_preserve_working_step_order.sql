ALTER TABLE public.action_items ADD COLUMN step_order integer;
COMMENT ON COLUMN public.action_items.step_order IS 'Generated working-step sequence; null for existing items and original quoted actions.';
CREATE OR REPLACE FUNCTION public.save_suggested_steps(p_student_id uuid, p_parent_id uuid, p_owner_key text, p_steps jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_hash text; v_booking uuid;
BEGIN
 IF p_owner_key IS NULL OR length(p_owner_key)<>64 THEN RAISE EXCEPTION 'unavailable'; END IF;
 IF jsonb_typeof(p_steps)<>'array' OR jsonb_array_length(p_steps) NOT BETWEEN 3 AND 4 THEN RAISE EXCEPTION 'invalid_steps'; END IF;
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_steps) step WHERE jsonb_typeof(step)<>'string' OR length(trim(step #>> '{}')) NOT BETWEEN 1 AND 300) THEN RAISE EXCEPTION 'invalid_steps'; END IF;
 IF (SELECT count(DISTINCT lower(regexp_replace(trim(step),'\s+',' ','g'))) FROM jsonb_array_elements_text(p_steps) step) <> jsonb_array_length(p_steps) THEN RAISE EXCEPTION 'invalid_steps'; END IF;
 v_hash := encode(sha256(convert_to(p_owner_key,'UTF8')),'hex');
 SELECT a.booking_id INTO v_booking FROM public.action_items a JOIN public.call_notes n ON n.booking_id=a.booking_id JOIN public.bookings b ON b.id=a.booking_id WHERE a.id=p_parent_id AND b.student_id=p_student_id AND b.status='completed' AND n.owner_hash=v_hash AND a.kind IN ('call','accepted') FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'unavailable'; END IF;
 DELETE FROM public.action_items WHERE parent_id=p_parent_id AND kind='suggested';
 INSERT INTO public.action_items(booking_id,task,kind,parent_id,step_order) SELECT v_booking,trim(step),'suggested',p_parent_id,ordinality::integer FROM jsonb_array_elements_text(p_steps) WITH ORDINALITY AS generated(step,ordinality);
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'bookingId',a.booking_id,'task',a.task,'timeframe',a.timeframe,'done',a.done,'sourceQuote',a.source_quote,'kind',a.kind,'parentId',a.parent_id,'stepOrder',a.step_order) ORDER BY a.step_order NULLS LAST,a.id),'[]'::jsonb) FROM public.action_items a WHERE a.parent_id=p_parent_id);
END $$;
REVOKE ALL ON FUNCTION public.save_suggested_steps(uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_suggested_steps(uuid,uuid,text,jsonb) TO service_role;