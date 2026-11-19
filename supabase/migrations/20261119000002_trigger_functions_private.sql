-- W-19 Trigger functions are never called directly: remove the execute grant that
-- Supabase's defaults gave signed-in users (flagged by the hosted security advisor).
revoke execute on function public.broadcast_attendance(), public.broadcast_avatar(), public.broadcast_presence()
  from authenticated;
revoke execute on all functions in schema public from public, anon;
