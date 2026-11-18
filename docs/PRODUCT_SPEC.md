# Marketing HQ: product spec for the MVP

This spec covers what the 7-day sprint builds. The full long-term scope lives in the "Marketing HQ: Marketing Portal Scope & Implementation Plan" doc; anything not written here is out of scope for now (see the last section).

**No integrations with outside platforms.** Marketing HQ does not connect to Facebook, Instagram, TikTok, LinkedIn, Snapchat, Google Ads, Google Calendar, Trello or any other platform's API. (The optional one-time Trello import in section 3 reads an exported file; it does not connect to Trello.) Publishing, ad buying and scheduling on those platforms stay manual. The only outside services are the ones the app itself runs on: Supabase (database and email and password sign-in), Vercel (hosting and cron), Resend (email) and Sentry (errors).

Access definitions ("team app user", "portal user", "marketing user") are in `DATA_MODEL.md` section 2; "team" in the tables below means team app user.

## 1. Who uses it

| Role (enum value) | Who | What they use |
| --- | --- | --- |
| `super_admin` | Adham | Everything, including admin settings |
| `leadership` | CEO, Acting Managing Partner | Dashboards, read-only boards, their own requests |
| `team_lead` | Creative lead, Performance lead, Community lead | Their team's cards and people, first approval on their team's leaves, creative review |
| `traffic_manager` | Traffic Manager | Intake, briefing, assigning and scheduling every request; all boards; workload |
| `member` | Designers, videographers, content and reel creators, media buyers, moderators | Own cards, check-in, requests, character |
| `requester` | People in Sales, Daily Reservation, Business Development (which also submits Cocafe requests, with brand set to Cocafe), Operations, HR, Finance, Logistics | Department portal only |
| `final_approver` | Sales Team Lead today (content confirmation) | Approves or returns deliverables in the Confirmation stage |
| `hr` | HR Manager | Leave types and balances, attendance export |
| `guest` | Freelancers | Only the boards they are invited to |

One person can hold several roles. Team-scoped roles (`team_lead`) carry a `team_id`.

There is no public sign-up and no Google sign-in. A `super_admin` creates each account in `/admin/users` with the person's email, department, team, branch and roles; the app generates a temporary password that the admin sees once and hands over in person or by private message. On first sign-in the employee must set their own password before anything else, and can change it later from `/me/account`. A forgotten password is reset by an admin (DECISIONS D-01, D-17). Deactivated users cannot sign in.

## 2. App areas and routes

All routes sit under `/[locale]` (`en` or `ar`).

| Route | Who | Purpose |
| --- | --- | --- |
| `/map` | team | Home screen: the branch map |
| `/boards`, `/boards/[boardId]` | team | Board list and board views |
| `/my-work` | team | Everything assigned to me, grouped by due date |
| `/approvals` | anyone with pending approval steps | One inbox for every approval |
| `/requests`, `/requests/new` | team | My leaves and special requests |
| `/calendar` | team | Team calendar: leaves, remote days, field days |
| `/content` | team | Content calendar: what gets posted, when, with media and captions |
| `/reports` | lead roles, traffic, leadership, hr | Dashboards |
| `/people`, `/people/[id]` | team | Directory and profiles |
| `/me/character` | team | Character creator |
| `/me/account` | everyone signed in | Change password, display name, phone, language |
| `/change-password` | everyone signed in | Forced password change on first sign-in and after an admin reset |
| `/admin/*` | super_admin (hr for leave settings) | Users, roles, teams, branches, request types, leave types, holidays, stage targets, settings |
| `/portal`, `/portal/requests/new`, `/portal/requests/[id]`, `/portal/approvals`, `/portal/files` | requester, final_approver | Department portal |
| `/checkin` | team | Check-in and check-out by location (also opened from the reception desk on the map) |

Navigation: sidebar on desktop, bottom bar on mobile with Map, Boards, My work, Approvals, More. A "classic view" setting makes `/my-work` the home page instead of the map.

## 3. Module: boards and the content cycle

### Structure
- Workspaces hold boards, boards hold lists, lists hold cards. Seed workspaces: Creative, Performance, Community, Traffic, Projects.
- One special board, **Content Pipeline**, has one list per content-cycle stage and is the board every department request lands on. Its lists are fixed and map one-to-one to `card.stage`. Other boards are free-form Trello-style boards whose cards have no stage.
- Views on any board: Kanban (default), Table (sortable columns: title, stage or list, assignees, due date, priority, requester department, vertical, brand). Calendar view is a P1.

### Card
Fields: title, description (rich text, markdown is fine), objective, key message, reference links, performance notes, request type (`strategic`, `urgent` or `internal`), requesting department, requester, vertical, brand, branch, format, platforms, priority (`low`, `normal`, `high`, `urgent`), due date (overall), stage due date, assignees with a role each (`design`, `copy`, `video`, `media_buying`, `other`), reviewer, approver, labels, checklists, attachments, comments with @mentions, revision count, linked content calendar post, budget needed (free text), time logged (P1).

Activity: every change to stage, assignees, due date and approval is listed in the card's activity feed (from `card_events`).

### Content cycle stages (`card_stage` enum)

| # | Stage | Owner | Leaves the stage when |
| --- | --- | --- | --- |
| 1 | `request` | Requesting department | Submitted |
| 2 | `performance_input` | Performance team | Performance lead adds visual suggestions or marks "no input" |
| 3 | `intake` | Traffic manager | Traffic accepts (goes to 4) or returns to requester (goes back to 1 with a missing-items checklist) |
| 4 | `brief_schedule` | Traffic manager | Brief complete, assignees set, production due date set |
| 5 | `production` | Assignees | An assignee submits for review |
| 6 | `creative_review` | Creative lead (reviewer) | Approved (goes to 7) or changes requested (back to 5, revision +1, reason required) |
| 7 | `confirmation` | Final approver from the requesting side | Approved (goes to 8) or changes requested (back to 5, revision +1, reason required) |
| 8 | `ready_to_publish` | Community team | Post placed on the content calendar, or the file delivered (non-social work) |
| 9 | `published` | Community team | Marked published with the live link (pasted by hand), or marked delivered |
| 10 | `reported` | System | Set automatically 7 days after publishing (daily cron), or manually |

Rules:
- Stage moves happen only through database functions. `move_card_stage(card_id, to_stage, payload)` checks the caller's permission, the allowed transition and the required fields. Moves out of `creative_review` and `confirmation` happen only through `decide_step` (the approvals inbox or the card's review panel), so the approval record and the stage never disagree. Dragging a card between Content Pipeline lists calls `move_card_stage`; an invalid drop, including a drag out of a review stage, snaps back and shows why.
- Entering `creative_review` needs a reviewer and entering `confirmation` needs an approver; the move is refused, with the reason, if either is missing. New department cards get the creative team lead as reviewer and the department's default approver as approver; Traffic can change both.
- `stage_due_at` is the due date of the current stage. Moving to `production` requires a production due date in the move.
- Required fields to leave `intake`: title, objective, vertical, brand, format, platforms, due date, requester. To leave `brief_schedule`: at least one assignee and the production due date.
- Quick-add on the pipeline board is only for Traffic and creates an `internal` card in `intake`. Departments create pipeline cards only through the portal.
- Revision reasons: `brief_changed`, `quality`, `new_information`, `other` (with text).
- Stage targets (hours per stage, admin setting) drive card colour: normal, amber at 75% of target, red past target. Target time counts only Saturday to Thursday working hours (P1: count calendar hours in v1 if this is slow to build).
- Work-in-progress limit per person (admin setting, default 6 open production cards): the assign dialog warns when exceeded; it does not block.

### Department requests
- **Strategic plan**: a monthly form for the next month. It opens on the 1st and its deadline is the 25th (Cairo time). One submission has many request lines; each line becomes one card in `request`, then moves straight to `performance_input`. Lines submitted after the 25th are flagged `late`.
- **Urgent request**: one card, required reason, all required fields filled at submission, goes straight to `performance_input` and notifies Traffic.
- Requesters see their requests with simplified status: Received (stages 1 to 4), In production (5 to 6), Awaiting your approval (7), Delivered (8 to 10), Returned (returned from intake).
- A returned request can be edited and resubmitted by anyone in the requesting department through `resubmit_request`; it goes back to `performance_input` with the missing items cleared.

### Trello import (P1, file upload only)
Upload a Trello board JSON export file; no connection to Trello. Import lists, cards (title, description, due date, labels, checklists, comments as card comments authored by the importer with the original author name in the text, attachment links). Imported cards go to a chosen board, not the Content Pipeline.

## 4. Module: approvals engine

One engine powers leaves, special requests, creative review and confirmation.

- `request_types` define a form (JSON schema rendered by a generic form renderer) and an approval chain: an ordered list of steps. Resolution rules (no self-approval, fallbacks, skipping, several candidates per step) are in `DATA_MODEL.md` section 6.
- Submitting creates `approval_steps` rows. Only the first step is active. Approving activates the next; rejecting ends the request as `rejected`; "request changes" (cards only, reason required) sends the card back to production with a revision added.
- The `/approvals` inbox lists every active step assigned to the user, across leaves, special requests and cards, with approve, reject or request-changes actions and a required comment on reject or changes. When a step has several candidates, the first decision wins and the step disappears from the others' inboxes.
- Delegation (an approver on approved leave passes active steps to a named backup) is P1.

## 5. Module: map, check-in and presence

### Map
- One Tiled map per branch, stored in `public/maps/<branch-slug>.json` and referenced from `branches.map_key`. Until real art arrives, use a generated placeholder tileset (flat coloured tiles) so nothing is blocked on art.
- Object layer `zones` with objects named: `reception`, `desk-<n>`, `meeting-room`, `studio`, `kanban-wall`, `mailbox`, `notice-board`, `cafe`, `trophy-shelf`. Clicking a zone object navigates: reception to `/checkin`, kanban-wall to `/boards`, mailbox to `/approvals`, meeting-room to `/calendar`, notice-board opens announcements (P1, show a placeholder), studio to `/boards` filtered to video (P1), cafe sets status Break, trophy-shelf to `/people/me` (P1).
- Two virtual maps: `field` and `home`, small and simple.
- Branch switcher at the top; default is the user's home branch, or the branch they are checked in at.
- Characters of checked-in users stand at their assigned desk (or a free desk). Name tag in team colour, status bubble above the head.
- Tap or click a character: popover with name, role, status, checked-in time, current card (the most recently moved card where they are an assignee in `production`), and buttons "View profile" and "Request meeting" (P1, disabled).
- Free walking with arrow keys or tap-to-move is P1. In v1 characters sit at desks and play an idle animation.
- Camera: fit the map to the screen; pinch and wheel zoom; drag to pan on mobile.

### Check-in
- `/checkin` shows the user's state and a big Check in or Check out button.
- Methods (branch setting decides which are allowed for branch check-in):
  - `gps` (default): tapping Check in asks the browser for one high-accuracy reading (`getCurrentPosition`, 15-second timeout). The server picks the nearest active branch that has coordinates and allows `gps`, and accepts the check-in when the distance is at most `geofence_radius_m` (default 150, admin-editable) plus the reported accuracy capped at 100 m; readings worse than 200 m are refused. `check_in` repeats the same haversine check in SQL. Success says "You're at <branch>". Out of range shows the distance to the nearest branch and offers Field day, Work from home (only with approved WFH today) or Wi-Fi. Clear messages for permission denied, position unavailable, timeout and low accuracy.
  - `wifi` (fallback): server compares the request IP (`x-forwarded-for` first value on Vercel) with the branch's `public_ips` list (CIDR allowed). A location is recorded too when the browser provided one.
  - `field` (field or shooting day): requires the current location (any accuracy is recorded); optional place name (for example "Client office – Zayed", up to 120 characters), card and short note; shown on the Field map, and the place name shows in the map popover and on the person's profile.
  - `home`: allowed only on a day with an approved `work_from_home` request; shown on the Home map.
- Only one open session per user. Checking in at a different branch closes nothing automatically; the user must check out first (show a clear message).
- Auto check-out: an hourly cron (Vercel Cron runs in UTC, and Egypt changes clocks for summer time, so never hardcode a Cairo hour in the schedule) works out the current Cairo time in the handler; from 23:00 Cairo it closes every open session that started on that Cairo day or earlier, at `greatest(scheduled end time, checked_in_at)` and sets `auto_closed = true`. Next login shows "You were checked out automatically, please confirm your real time"; the user's correction is saved as an `attendance_edits` row.
- Lateness: arrival after schedule start plus grace (admin setting, default 15 minutes) marks the session `late`. Lateness is never shown publicly.
- Check-out also asks for one location reading (best effort, 8 seconds at most) and never blocks check-out.
- The retired `qr` method stays in the enum for old sessions only; new QR check-ins are refused.
- Privacy: location is read only at the moment of check-in and check-out, never tracked in between, and never stored for `home` sessions. The coordinates, accuracy and distance are visible only to the person, their team lead, hr, super_admin and leadership (the same people who see attendance). Everyone else sees only branch, method and the field place name (`who_is_in()` never returns coordinates). The HR export includes method, place and a plain "lat,lng" column; nothing links to an outside map service.

### Presence and status
- Statuses: `available`, `focus`, `meeting`, `shoot`, `break`, `away`. Set from the top bar or the map. Stored on the profile; broadcast live.
- Live updates use one private Supabase Realtime channel per branch (`branch:<id>`), readable by marketing users only. Check-in, check-out and status events are sent by database triggers, never by browsers, so nobody can fake them. The map loads the current checked-in list from `who_is_in()` on open, then applies live events. Details in `DATA_MODEL.md` section 11.

## 6. Module: characters

- Layered sprites at 32 by 32 pixels per frame, 4 directions, idle and walk animations. Layers in draw order: `body` (with skin tone colour), `bottom`, `top`, `shoes`, `hair` (with hair colour), `facial_hair`, `headwear` (including several hijab styles), `glasses`, `accessory`.
- `public/sprites/manifest.json` lists every layer option with its sprite sheet file and whether it supports colour tinting. Swapping in a bought asset pack must be a data change only.
- Until real art arrives, generate simple placeholder layers (coloured shapes per layer) with a script in `scripts/`, so the editor and map work end to end.
- Creator at `/me/character`: live preview that rotates through directions, a picker per layer, colour swatches for skin, hair and clothing, randomise button, save. The first sign-in after the forced password change redirects here once.
- The avatar is stored as JSON on `avatars.config`, for example `{ "body": "b1", "skin": "#c68642", "hair": "h3", "hairColor": "#2b1b10", "top": "hoodie-espaces", ... }`.
- The same compositor renders the character on the map and as a small avatar image elsewhere (people list, card assignees, comments). Render once to a canvas and cache as a data URL per config hash.
- Rewards, coins, shop and desk decoration are out of scope for the sprint.

## 7. Module: leaves and special requests

Request types seeded from `SEED_DATA.md`: annual, sick, casual, unpaid, work from home, permission (late arrival or early leave), overtime, equipment, purchase, training, other.

- Form fields come from each type's JSON schema. Leave types show the current balance and the balance after this request before submitting.
- Leave days are counted on working days only (Saturday to Thursday, minus holidays in the `holidays` table).
- Balances per user, per year, per leave type in `leave_balances`. HR sets yearly allowances in admin. Approved leave deducts; cancelled approved leave refunds.
- Users can cancel a pending request; cancelling an approved one creates a cancellation that goes through the same chain (P1: allow direct cancel by HR only in v1).
- `/calendar`: month view of absences from `team_absences()` (marketing users see all of marketing; others see their own department): leave, work from home, field days, with no reasons shown. Overlap warning for team leads and traffic when two people from the same team are off on the same day.
- On the map, a desk whose owner is on approved leave today shows a small sign.
- HR export: CSV of attendance sessions and approved leaves for a date range.

## 8. Module: dashboards (`/reports`)

Built on SQL views. Filters: date range, team, brand, branch.

- **Workflow**: cards created and delivered per week; median days from request to delivery; on-time delivery rate (delivered on or before due date); open cards by stage; average hours in each stage; average revision rounds and reasons; requests by department, vertical and type (strategic or urgent); late strategic submissions; workload (open cards per person).
- **Attendance** (team leads for their own team; hr, super_admin and leadership for everyone; the same people who can read `attendance_sessions`): check-in rate per working day, average arrival time, late count, remote and field days, leave taken versus balance.
- **Personal** (everyone, own data only): my deliveries, on-time rate, revisions, attendance.
- **Department service** (P1): per department, requests sent, delivery time, their own approval turnaround.
- Every number links to the list of cards or sessions behind it (P1 for attendance).

## 9. Module: content calendar

The content calendar is a visual planner: anyone opening it sees exactly what will be posted, when, on which platform and for which brand, with the real media and caption. It does not connect to any social platform. People publish by hand on each platform, then mark the post as published here.

Route: `/content`. Brands: Espaces, Cocafe, Spaces Planner. Platforms are labels only: Facebook, Instagram, LinkedIn, TikTok, Snapchat. Show them as small text badges with a colour each (FB, IG, IN, TT, SC); do not use platform logos.

### The post
- Brand, platforms (one or more), date and time (Cairo), format, media, Arabic caption, English caption, hashtags, first comment (optional), content pillar (`awareness`, `engagement`, `insights`, `offer`, `community`), branch (optional), notes for the publisher, linked card (optional), owner, publisher, status.
- Formats: `feed` (single image or video), `carousel` (2 to 10 items, reorderable), `reel` (vertical video), `story` (vertical image or video), `text` (no media).
- Media: images (JPG, PNG, WebP) and videos (MP4, MOV). Use resumable uploads for files over 6 MB. On upload, the browser makes a small thumbnail (images: resized copy; videos: a frame from the first second via a `<video>` element and canvas) and stores it next to the original, so the calendar loads fast without server image processing. Store width, height and duration to show aspect-ratio warnings (for example a horizontal video on a `reel`).
- Status: `draft`, `in_review`, `approved`, `scheduled`, `published`. Posts made from a card that already passed creative review and confirmation start as `approved`. Other posts go `draft` to `in_review`, and a team lead, the Community lead or super_admin approves or sends back with a comment. `scheduled` means "approved and has a date and time"; it sets itself.

### Views
1. **Month** (default): a calendar grid. Each day shows its posts as small tiles, in time order: media thumbnail, time, brand colour stripe, platform badges, status dot. A day with more than three posts shows "+N". Days with nothing scheduled are lightly highlighted so gaps are visible. Drag a tile to another day to reschedule (keeps the time).
2. **Week**: seven columns with larger post cards: thumbnail, time, platform badges, the first two lines of the caption in the selected language, status chip, owner avatar. Drag to another day or time slot.
3. **Feed preview**: pick one brand. A phone-shaped frame shows that brand's upcoming posts the way followers would see them, in two modes: a 3-column grid of thumbnails (to judge how the feed looks together) and a scrolling feed with media and full captions. Neutral design, no platform branding.
4. **List**: a table of posts (date, time, brand, platforms, format, pillar, status, owner) for scanning, sorting and printing.

Above every view: filters (brand, platform, status, pillar, owner, branch), the month's counter per brand (published and scheduled against the monthly target, default 12), and a small bar showing the month's pillar mix.

### Post preview and editor
- Clicking a post opens a side panel with a format-aware preview: a square or 4:5 frame for `feed`, a swipeable frame with dots for `carousel`, a 9:16 frame for `reel` and `story` with the caption overlaid, playable video, and the caption below with Arabic shown right-to-left. Tabs switch between the Arabic and English caption.
- Edit mode on the same panel: all fields, media upload and reorder, caption character counter, hashtag field.
- Buttons for the publisher: "Copy caption" (per language), "Copy hashtags", "Download media" (all items), and "Mark as published" (optional live link per platform, pasted by hand). Marking published also moves the linked card to `published`.

### From the pipeline to the calendar
- A side panel "Ready to schedule" lists cards in `ready_to_publish` that have no post yet. Drag one onto a day to create a post prefilled from the card: brand, platforms, captions from the card's copy, and media from its attachments.
- A card's detail shows its post (thumbnail, date, status) with a link to open it in the calendar.

### Reminders
- In-app and email reminder to the publisher 30 minutes before the post time: thumbnail, caption ready to copy, link to the post. Sent once per post time (a later reschedule sends a new one).
- If a post's time passes and it is still not marked published after 2 hours, the publisher and the Community lead get a "Not marked as published" notification.

### Optional (P1)
- Print or save the month or list view as PDF (print stylesheet) to share with leadership.
- Duplicate a post; copy last month's recurring slots.

## 10. Notifications

- `notifications` table, read in the top bar bell with a live counter (Realtime on the user's rows).
- Events: assigned to a card, mentioned, card returned to me, approval step waiting for me, my request approved or rejected, card due within 24 hours, post going out in 30 minutes, post not marked as published, my post approved or sent back, auto check-out happened.
- Email (Resend) for: approval step waiting for me, my request decided, card returned to requester. Daily digest is P1.
- Push notifications to installed phones are P1.

## 11. Admin (`/admin`)

Users (create account with a one-time temporary password, reset password, deactivate and reactivate, roles, team, home branch, schedule, desk), teams, departments, branches (name, area, map key, public IPs, allowed check-in methods, latitude, longitude and check-in radius with a "Use my current location" button), request types and approval chains (edit the chain; editing the JSON schema directly is acceptable in v1), leave allowances per type and year (hr), holidays (hr), stage targets, WIP limit, lateness grace, monthly post target.

## 12. Non-functional requirements

- Mobile first, installable as a web app (manifest and icons; offline support not required).
- Arabic and English everywhere, right-to-left for Arabic, user's choice saved on the profile.
- The map runs smoothly on a mid-range Android phone: cap at 30 frames per second when idle, small textures, no per-frame React re-renders.
- Board with 300 cards stays responsive.
- Live updates arrive in under 2 seconds.
- Sign-in with email and password only; accounts created by admins; passwords at least 10 characters; Supabase Auth rate limits stay on. Test users exist in local and staging only.
- Daily backups (Supabase Pro default). Errors reported to Sentry.

## 13. Out of scope for the sprint

Any integration with outside platforms (social publishing, social or ads analytics, Google Calendar, Trello connection, WhatsApp); KPI scorecards, one-to-ones, onboarding checklists, training records; gamification (XP, coins, shop, leaderboards); asset library beyond card attachments; announcements; delegation; native mobile apps; payroll; CRM; an in-app map editor. The non-integration items are in the Weeks 2 to 4 backlog in `BUILD_PLAN.md`.

## 14. Workflow round (added after the sprint)

- **My Day** (`/my-day`) is the team app's home screen: today's meetings, due cards, approvals, gates, shoots, meeting actions and celebrations.
- **Meetings** (`/meetings`, `/portal/meetings`): colleagues, other departments and outside guests (email with a calendar file, also when cancelled); rooms with availability; agenda, shared notes, and action items that become cards; fixed daily, weekly and monthly meetings.
- **Monthly gates** (`/gates`, `/gates/rhythm`): the month at a glance, editable per month and as a standing rhythm.
- **Shoot days** (`/shoots`): crew, shot list, equipment, printable call sheet, linked to field check-in.
- **Team week** (`/week`, `/portal/week`): where each person is, day by day.
- **Request tracker** (`/portal`): five steps (Received: request, performance input. In review: intake, brief and schedule. In production. Your confirmation. Delivered), expected delivery date, needs-your-action state and the strategic deadline banner.
- **Daily digest and phone notifications**: settings on `/me/account`; signing out stops notifications on that device.
- **Celebrations** (`/celebrations`, `/portal/celebrations`): kudos, birthdays and work anniversaries.
- **Map**: tap to walk, wave, high five, coffee, chat, dance and clap.
- **Characters**: new art and wardrobe, three saved looks, seasonal outfits available during their event.
- **Admin**: `/admin/launch` (launch readiness checklist), `/admin/seasons`, `/admin/rooms`, plus editors for departments, teams, branches, brands, request types and bulk leave allowances.
