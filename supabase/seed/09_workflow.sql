-- Workflow defaults, used locally and on production (included by seed-production.sql).
-- No personal data: owners are assigned by workflow_assign_default_owners() once accounts exist.

-- Meeting actions land on this board.
insert into public.boards (id, workspace_id, name, description) values
  ('60000000-0000-4000-8000-000000000010', '50000000-0000-4000-8000-000000000005', 'Meeting actions',
   'Tasks agreed in meetings.')
on conflict (id) do nothing;
insert into public.lists (id, board_id, name, position) values
  ('70000000-0000-4000-8000-000000000101', '60000000-0000-4000-8000-000000000010', 'To do', 'a0'),
  ('70000000-0000-4000-8000-000000000102', '60000000-0000-4000-8000-000000000010', 'In progress', 'a1'),
  ('70000000-0000-4000-8000-000000000103', '60000000-0000-4000-8000-000000000010', 'Done', 'a2')
on conflict (id) do nothing;
insert into public.settings (key, value) values
  ('meeting_actions_board_id', '"60000000-0000-4000-8000-000000000010"')
on conflict (key) do nothing;

-- Meeting rooms at the home branch. Add one per real room in Admin.
insert into public.meeting_rooms (id, branch_id, name_en, name_ar, capacity) values
  ('80000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Meeting room', 'غرفة الاجتماعات', 8),
  ('80000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'Studio', 'الاستوديو', 4)
on conflict (id) do nothing;

select public.workflow_assign_default_owners();
