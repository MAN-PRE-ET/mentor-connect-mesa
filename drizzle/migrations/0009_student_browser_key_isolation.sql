ALTER TABLE public.students ADD COLUMN private_key_hash text;
CREATE FUNCTION public.request_student_key_hash() RETURNS text LANGUAGE plpgsql STABLE SET search_path=public,pg_temp AS $$
DECLARE k text;
BEGIN
 k := coalesce(current_setting('request.headers',true),'{}')::jsonb->>'x-student-key';
 IF k IS NULL OR k !~ '^[a-f0-9]{64}$' THEN RETURN NULL; END IF;
 RETURN encode(sha256(convert_to(k,'UTF8')),'hex');
END $$;
CREATE FUNCTION public.owns_student(p_student_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.students WHERE id=p_student_id AND private_key_hash=public.request_student_key_hash());
$$;
CREATE FUNCTION public.owns_conversation(p_conversation_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.conversations c WHERE c.id=p_conversation_id AND public.owns_student(c.student_id));
$$;
CREATE FUNCTION public.owns_booking(p_booking_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.bookings b WHERE b.id=p_booking_id AND public.owns_student(b.student_id));
$$;
CREATE FUNCTION public.create_private_student(p_first_name text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE h text; v public.students%ROWTYPE;
BEGIN
 h:=public.request_student_key_hash();
 IF h IS NULL OR length(trim(p_first_name)) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'student_create_failed'; END IF;
 INSERT INTO public.students(first_name,private_key_hash) VALUES(trim(p_first_name),h) RETURNING * INTO v;
 RETURN jsonb_build_object('id',v.id,'firstName',v.first_name);
END $$;
REVOKE ALL ON FUNCTION public.create_private_student(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_private_student(text) TO anon,authenticated;
DROP POLICY "Students are open in this prototype" ON public.students;
DROP POLICY "Conversations are open in this prototype" ON public.conversations;
DROP POLICY "Messages are open in this prototype" ON public.messages;
DROP POLICY "Unmatched queries are appendable in this prototype" ON public.unmatched_queries;
REVOKE ALL ON public.students,public.conversations,public.messages,public.unmatched_queries,public.bookings,public.call_notes,public.action_items FROM anon,authenticated;
GRANT SELECT(id,first_name,created_at),UPDATE(first_name),DELETE ON public.students TO anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.conversations,public.messages,public.unmatched_queries TO anon,authenticated;
GRANT SELECT ON public.bookings,public.call_notes,public.action_items TO anon,authenticated;
GRANT ALL ON public.students,public.conversations,public.messages,public.unmatched_queries,public.bookings,public.call_notes,public.action_items TO service_role;
CREATE POLICY "Student owns name" ON public.students FOR ALL TO anon,authenticated USING(public.owns_student(id)) WITH CHECK(public.owns_student(id));
CREATE POLICY "Student owns conversations" ON public.conversations FOR ALL TO anon,authenticated USING(public.owns_student(student_id)) WITH CHECK(public.owns_student(student_id));
CREATE POLICY "Student owns messages" ON public.messages FOR ALL TO anon,authenticated USING(public.owns_conversation(conversation_id)) WITH CHECK(public.owns_conversation(conversation_id));
CREATE POLICY "Student owns unmatched queries" ON public.unmatched_queries FOR ALL TO anon,authenticated USING(public.owns_conversation(conversation_id)) WITH CHECK(public.owns_conversation(conversation_id));
CREATE POLICY "Student reads bookings" ON public.bookings FOR SELECT TO anon,authenticated USING(public.owns_student(student_id));
CREATE POLICY "Student reads notes" ON public.call_notes FOR SELECT TO anon,authenticated USING(public.owns_booking(booking_id));
CREATE POLICY "Student reads actions" ON public.action_items FOR SELECT TO anon,authenticated USING(public.owns_booking(booking_id));
REVOKE EXECUTE ON FUNCTION public.book_demo_call(uuid,uuid,uuid,text),public.list_demo_calls(uuid),public.complete_demo_call(uuid,uuid),public.booking_goal(uuid,text),public.writeup_context(uuid,uuid,text),public.writeup_progress(uuid,text),public.set_writeup_action(uuid,uuid,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.book_demo_call(uuid,uuid,uuid,text),public.list_demo_calls(uuid),public.complete_demo_call(uuid,uuid),public.booking_goal(uuid,text),public.writeup_context(uuid,uuid,text),public.writeup_progress(uuid,text),public.set_writeup_action(uuid,uuid,text,boolean),public.save_call_writeup(uuid,uuid,text,text,jsonb) TO service_role;
COMMENT ON COLUMN public.students.private_key_hash IS 'Hash of per-student browser secret. No backfill: old test rows are inaccessible. Never expose this column.';
COMMENT ON TABLE public.bookings IS 'Private student data; RLS ownership uses per-student browser key. Atomic writes run server-only after owner verification.';