REVOKE EXECUTE ON FUNCTION public.save_call_writeup(uuid,uuid,text,text,jsonb) FROM anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_call_writeup(uuid,uuid,text,text,jsonb) TO service_role;
COMMENT ON FUNCTION public.save_call_writeup(uuid,uuid,text,text,jsonb) IS 'Server-only save after capability verification and source-quote validation; clients cannot inject unvalidated summaries.';