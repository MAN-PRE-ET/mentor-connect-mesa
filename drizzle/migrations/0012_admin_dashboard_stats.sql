CREATE FUNCTION public.admin_dashboard_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
WITH
  rec_convos AS (
    SELECT DISTINCT conversation_id FROM public.messages
    WHERE role = 'assistant' AND recommended_mentor_ids IS NOT NULL AND cardinality(recommended_mentor_ids) > 0
  ),
  rec_mentors AS (
    SELECT m.id, m.name, m.data_completeness, count(*) AS n
    FROM public.messages msg
    CROSS JOIN LATERAL unnest(msg.recommended_mentor_ids) AS mid
    JOIN public.mentors m ON m.id = mid
    WHERE msg.role = 'assistant'
    GROUP BY m.id, m.name, m.data_completeness
  ),
  unmatched_cat AS (
    SELECT coalesce(c.category, 'Uncategorized') AS category, count(*) AS n
    FROM public.unmatched_queries u
    LEFT JOIN public.conversations c ON c.id = u.conversation_id
    GROUP BY coalesce(c.category, 'Uncategorized')
  )
SELECT jsonb_build_object(
  'students', (SELECT count(*) FROM public.students),
  'chats', (SELECT count(*) FROM public.conversations),
  'bookings', (SELECT count(*) FROM public.bookings),
  'writeups', (SELECT count(*) FROM public.call_notes WHERE summary IS NOT NULL),
  'completedCalls', (SELECT count(*) FROM public.bookings WHERE status = 'completed'),
  'chatsWithRecommendations', (SELECT count(*) FROM rec_convos),
  'topCategories', coalesce((
    SELECT jsonb_agg(jsonb_build_object('category', category, 'count', n) ORDER BY n DESC)
    FROM (SELECT category, count(*) AS n FROM public.conversations
          WHERE category IS NOT NULL AND category <> ''
          GROUP BY category ORDER BY n DESC LIMIT 8) t
  ), '[]'::jsonb),
  'topMentors', coalesce((
    SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'count', n) ORDER BY n DESC)
    FROM (SELECT * FROM rec_mentors ORDER BY n DESC LIMIT 8) t
  ), '[]'::jsonb),
  'unmatchedByCategory', coalesce((
    SELECT jsonb_agg(jsonb_build_object('category', category, 'count', n) ORDER BY n DESC)
    FROM unmatched_cat
  ), '[]'::jsonb),
  'unmatchedChats', (SELECT count(DISTINCT conversation_id) FROM public.unmatched_queries WHERE conversation_id IS NOT NULL),
  'needsAttention', coalesce((
    SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'count', n) ORDER BY n DESC)
    FROM (SELECT * FROM rec_mentors WHERE data_completeness = 'low' AND n >= 3 ORDER BY n DESC LIMIT 8) t
  ), '[]'::jsonb)
) $$;
REVOKE ALL ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO service_role;