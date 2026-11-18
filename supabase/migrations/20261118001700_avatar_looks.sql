-- W-17: up to three named looks per person, saved beside the current character.
-- Safe to run twice: the shared local database may already have this column.
alter table public.avatars add column if not exists looks jsonb not null default '[]'::jsonb;

alter table public.avatars drop constraint if exists avatars_looks_shape;
alter table public.avatars add constraint avatars_looks_shape check (
  case when jsonb_typeof(looks) = 'array' then jsonb_array_length(looks) <= 3 else false end
);

revoke execute on all functions in schema public from public, anon;
