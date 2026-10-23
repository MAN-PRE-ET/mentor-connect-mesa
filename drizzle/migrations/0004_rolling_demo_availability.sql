CREATE FUNCTION public.ensure_demo_availability()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_now timestamptz := statement_timestamp(); v_today date; v_added integer;
BEGIN
 v_today := (v_now AT TIME ZONE 'Asia/Kolkata')::date;
 INSERT INTO public.slots (mentor_id, start_time)
 SELECT m.id, (v_today + d.day + t.hour) AT TIME ZONE 'Asia/Kolkata'
 FROM public.mentors m
 CROSS JOIN generate_series(0,6) AS d(day)
 CROSS JOIN (VALUES (time '11:00'), (time '15:00'), (time '18:00')) AS t(hour)
 WHERE extract(isodow FROM (v_today + d.day)) BETWEEN 1 AND 5
 AND (v_today + d.day + t.hour) AT TIME ZONE 'Asia/Kolkata' > v_now
 ON CONFLICT (mentor_id, start_time) DO NOTHING;
 GET DIAGNOSTICS v_added = ROW_COUNT;
 RETURN v_added;
END; $$;
REVOKE ALL ON FUNCTION public.ensure_demo_availability() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_demo_availability() TO anon, authenticated;
COMMENT ON FUNCTION public.ensure_demo_availability() IS 'Bounded rolling demo availability: today plus six IST calendar days, future weekday 11:00/15:00/18:00 only. Idempotent top-up; never changes existing slots, bookings, or mentors.';