-- M-03: brief media can be attached before the card exists (portal request forms).
--
-- Files picked while a request is still being written are uploaded straight away
-- into card-attachments/drafts/<uploader>/<file>. Only the uploader can write or
-- read their drafts. On submit the server action moves each draft into
-- cards/<card_id>/<file>; a move is an UPDATE of the object row, so the update
-- policy below checks both ends: the source must be the caller's own draft and
-- the destination must be a card the caller can see.
--
-- The existing read and upload policies are replaced (not added to) so each
-- action keeps a single permissive policy.

drop policy card_attachments_read on storage.objects;
drop policy card_attachments_upload on storage.objects;

create policy card_attachments_read on storage.objects for select to authenticated
  using (bucket_id = 'card-attachments' and (
    ((storage.foldername(name))[1] = 'cards'
      and public.can_view_card(public.try_uuid((storage.foldername(name))[2])))
    or ((storage.foldername(name))[1] = 'drafts'
      and (storage.foldername(name))[2] = (select auth.uid())::text)
  ));

create policy card_attachments_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'card-attachments' and (
    ((storage.foldername(name))[1] = 'cards'
      and public.can_view_card(public.try_uuid((storage.foldername(name))[2])))
    or ((storage.foldername(name))[1] = 'drafts'
      and (storage.foldername(name))[2] = (select auth.uid())::text
      and (select public.is_active_user()))
  ));

create policy card_attachments_move on storage.objects for update to authenticated
  using (bucket_id = 'card-attachments'
    and (storage.foldername(name))[1] = 'drafts'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and owner_id = (select auth.uid())::text)
  with check (bucket_id = 'card-attachments'
    and (storage.foldername(name))[1] = 'cards'
    and public.can_view_card(public.try_uuid((storage.foldername(name))[2])));

revoke execute on all functions in schema public from public, anon;
