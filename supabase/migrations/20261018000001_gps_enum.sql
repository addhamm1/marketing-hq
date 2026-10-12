-- M-02 Location check-in. A new enum value cannot be used in the transaction
-- that adds it, so it lives in its own migration (used by 20261018000002).
alter type public.checkin_method add value if not exists 'gps' before 'wifi';

revoke execute on all functions in schema public from public, anon;
