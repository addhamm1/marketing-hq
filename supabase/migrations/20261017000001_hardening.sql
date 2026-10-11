-- D7-01 Hardening: split FOR ALL write policies into insert/update/delete so
-- SELECT is governed by one policy per table (advisor: multiple_permissive_policies).

drop policy board_members_write on public.board_members;
create policy board_members_insert on public.board_members for insert to authenticated with check (can_edit_board(board_id));
create policy board_members_update on public.board_members for update to authenticated using (can_edit_board(board_id)) with check (can_edit_board(board_id));
create policy board_members_delete on public.board_members for delete to authenticated using (can_edit_board(board_id));

drop policy branches_write on public.branches;
create policy branches_insert on public.branches for insert to authenticated with check (( SELECT has_role('super_admin'::app_role) AS has_role));
create policy branches_update on public.branches for update to authenticated using (( SELECT has_role('super_admin'::app_role) AS has_role)) with check (( SELECT has_role('super_admin'::app_role) AS has_role));
create policy branches_delete on public.branches for delete to authenticated using (( SELECT has_role('super_admin'::app_role) AS has_role));

drop policy brands_write on public.brands;
create policy brands_insert on public.brands for insert to authenticated with check (( SELECT has_role('super_admin'::app_role) AS has_role));
create policy brands_update on public.brands for update to authenticated using (( SELECT has_role('super_admin'::app_role) AS has_role)) with check (( SELECT has_role('super_admin'::app_role) AS has_role));
create policy brands_delete on public.brands for delete to authenticated using (( SELECT has_role('super_admin'::app_role) AS has_role));

drop policy card_assignees_write on public.card_assignees;
create policy card_assignees_insert on public.card_assignees for insert to authenticated with check (can_edit_card(card_id));
create policy card_assignees_update on public.card_assignees for update to authenticated using (can_edit_card(card_id)) with check (can_edit_card(card_id));
create policy card_assignees_delete on public.card_assignees for delete to authenticated using (can_edit_card(card_id));

drop policy card_labels_write on public.card_labels;
create policy card_labels_insert on public.card_labels for insert to authenticated with check (can_edit_card(card_id));
create policy card_labels_update on public.card_labels for update to authenticated using (can_edit_card(card_id)) with check (can_edit_card(card_id));
create policy card_labels_delete on public.card_labels for delete to authenticated using (can_edit_card(card_id));

drop policy checklist_items_write on public.checklist_items;
create policy checklist_items_insert on public.checklist_items for insert to authenticated with check ((EXISTS ( SELECT 1
   FROM checklists cl
  WHERE ((cl.id = checklist_items.checklist_id) AND can_edit_card(cl.card_id)))));
create policy checklist_items_update on public.checklist_items for update to authenticated using ((EXISTS ( SELECT 1
   FROM checklists cl
  WHERE ((cl.id = checklist_items.checklist_id) AND can_edit_card(cl.card_id))))) with check ((EXISTS ( SELECT 1
   FROM checklists cl
  WHERE ((cl.id = checklist_items.checklist_id) AND can_edit_card(cl.card_id)))));
create policy checklist_items_delete on public.checklist_items for delete to authenticated using ((EXISTS ( SELECT 1
   FROM checklists cl
  WHERE ((cl.id = checklist_items.checklist_id) AND can_edit_card(cl.card_id)))));

drop policy checklists_write on public.checklists;
create policy checklists_insert on public.checklists for insert to authenticated with check (can_edit_card(card_id));
create policy checklists_update on public.checklists for update to authenticated using (can_edit_card(card_id)) with check (can_edit_card(card_id));
create policy checklists_delete on public.checklists for delete to authenticated using (can_edit_card(card_id));

drop policy departments_write on public.departments;
create policy departments_insert on public.departments for insert to authenticated with check (( SELECT has_role('super_admin'::app_role) AS has_role));
create policy departments_update on public.departments for update to authenticated using (( SELECT has_role('super_admin'::app_role) AS has_role)) with check (( SELECT has_role('super_admin'::app_role) AS has_role));
create policy departments_delete on public.departments for delete to authenticated using (( SELECT has_role('super_admin'::app_role) AS has_role));

drop policy desks_write on public.desks;
create policy desks_insert on public.desks for insert to authenticated with check (( SELECT has_any_role('{super_admin,traffic_manager}'::app_role[]) AS has_any_role));
create policy desks_update on public.desks for update to authenticated using (( SELECT has_any_role('{super_admin,traffic_manager}'::app_role[]) AS has_any_role)) with check (( SELECT has_any_role('{super_admin,traffic_manager}'::app_role[]) AS has_any_role));
create policy desks_delete on public.desks for delete to authenticated using (( SELECT has_any_role('{super_admin,traffic_manager}'::app_role[]) AS has_any_role));

drop policy holidays_write on public.holidays;
create policy holidays_insert on public.holidays for insert to authenticated with check (( SELECT has_any_role('{hr,super_admin}'::app_role[]) AS has_any_role));
create policy holidays_update on public.holidays for update to authenticated using (( SELECT has_any_role('{hr,super_admin}'::app_role[]) AS has_any_role)) with check (( SELECT has_any_role('{hr,super_admin}'::app_role[]) AS has_any_role));
create policy holidays_delete on public.holidays for delete to authenticated using (( SELECT has_any_role('{hr,super_admin}'::app_role[]) AS has_any_role));

drop policy labels_write on public.labels;
create policy labels_insert on public.labels for insert to authenticated with check ((can_edit_board(board_id) OR can_add_to_board(board_id)));
create policy labels_update on public.labels for update to authenticated using ((can_edit_board(board_id) OR can_add_to_board(board_id))) with check ((can_edit_board(board_id) OR can_add_to_board(board_id)));
create policy labels_delete on public.labels for delete to authenticated using ((can_edit_board(board_id) OR can_add_to_board(board_id)));

drop policy leave_balances_write on public.leave_balances;
create policy leave_balances_insert on public.leave_balances for insert to authenticated with check (( SELECT has_any_role('{hr,super_admin}'::app_role[]) AS has_any_role));
create policy leave_balances_update on public.leave_balances for update to authenticated using (( SELECT has_any_role('{hr,super_admin}'::app_role[]) AS has_any_role)) with check (( SELECT has_any_role('{hr,super_admin}'::app_role[]) AS has_any_role));
create policy leave_balances_delete on public.leave_balances for delete to authenticated using (( SELECT has_any_role('{hr,super_admin}'::app_role[]) AS has_any_role));

drop policy post_media_write on public.post_media;
create policy post_media_insert on public.post_media for insert to authenticated with check (( SELECT is_marketing_writer() AS is_marketing_writer));
create policy post_media_update on public.post_media for update to authenticated using (( SELECT is_marketing_writer() AS is_marketing_writer)) with check (( SELECT is_marketing_writer() AS is_marketing_writer));
create policy post_media_delete on public.post_media for delete to authenticated using (( SELECT is_marketing_writer() AS is_marketing_writer));

drop policy request_types_write on public.request_types;
create policy request_types_insert on public.request_types for insert to authenticated with check ((( SELECT has_role('super_admin'::app_role) AS has_role) OR (( SELECT has_role('hr'::app_role) AS has_role) AND (category = 'leave'::text))));
create policy request_types_update on public.request_types for update to authenticated using ((( SELECT has_role('super_admin'::app_role) AS has_role) OR (( SELECT has_role('hr'::app_role) AS has_role) AND (category = 'leave'::text)))) with check ((( SELECT has_role('super_admin'::app_role) AS has_role) OR (( SELECT has_role('hr'::app_role) AS has_role) AND (category = 'leave'::text))));
create policy request_types_delete on public.request_types for delete to authenticated using ((( SELECT has_role('super_admin'::app_role) AS has_role) OR (( SELECT has_role('hr'::app_role) AS has_role) AND (category = 'leave'::text))));

drop policy teams_write on public.teams;
create policy teams_insert on public.teams for insert to authenticated with check (( SELECT has_role('super_admin'::app_role) AS has_role));
create policy teams_update on public.teams for update to authenticated using (( SELECT has_role('super_admin'::app_role) AS has_role)) with check (( SELECT has_role('super_admin'::app_role) AS has_role));
create policy teams_delete on public.teams for delete to authenticated using (( SELECT has_role('super_admin'::app_role) AS has_role));

drop policy workspaces_write on public.workspaces;
create policy workspaces_insert on public.workspaces for insert to authenticated with check (( SELECT has_role('super_admin'::app_role) AS has_role));
create policy workspaces_update on public.workspaces for update to authenticated using (( SELECT has_role('super_admin'::app_role) AS has_role)) with check (( SELECT has_role('super_admin'::app_role) AS has_role));
create policy workspaces_delete on public.workspaces for delete to authenticated using (( SELECT has_role('super_admin'::app_role) AS has_role));

revoke execute on all functions in schema public from public, anon;
