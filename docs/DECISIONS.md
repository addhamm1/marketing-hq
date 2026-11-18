# Open decisions

Claude Code: when a task depends on one of these and the Answer column is empty, build the default, mark the code `// DECISION: D-xx`, and mention it in your summary. Prefer defaults that are a setting rather than code, so changing them later is cheap.

Adham: fill in the Answer column. An answer here overrides the default.

| Id | Question | Default until answered | Answer |
| --- | --- | --- | --- |
| D-01 | Who can sign in, and is anyone activated automatically? | Any Google account can sign in and becomes `pending`; a super_admin activates it | No Google sign-in. Admins create every account with email and a temporary password; the employee must change it on first sign-in and can change it any time. No public sign-up |
| D-02 | Which branch is the first map (the team's home branch)? | A branch with slug `hq` named "Marketing HQ" until the real branch is named | |
| D-03 | Check-in verification per branch | Location (geofence, 150 m radius plus up to 100 m for GPS accuracy; readings worse than 200 m refused) and office Wi-Fi IP as a fallback; field and home allowed. The reception QR kiosk was removed (M-02) | Adham, 2026-11-18: sign-ins and outs need location access. Every check-in and check-out method now requires a location reading. Only the automatic night-time check-out closes a session without one |
| D-04 | Is attendance data used for payroll or deductions? | No. Team tool only; lateness visible to the person, their team lead, hr, super_admin and leadership | |
| D-05 | Leave types, yearly allowances, caps, notice periods | Types from `SEED_DATA.md`; allowances seeded as 0 and set by HR before the pilot (a Day 7 check) | |
| D-06 | Approval chains per request type | As listed in `SEED_DATA.md` | |
| D-07 | Art: tile size, asset pack or custom | 32 by 32 pixels, generated placeholders; manifest-driven so a pack drops in later | |
| D-08 | Default interface language | English, with Arabic one tap away and saved per person | |
| D-09 | Digits in the Arabic interface | Latin digits (0 to 9) in both languages | |
| D-10 | Can other departments see the map? | No. The portal has no map in the sprint | Still no map. Other departments get Team week (where people are, day by day), their meetings, celebrations and the request tracker in the portal |
| D-11 | Product name | "Marketing HQ" | |
| D-12 | Who confirms deliverables per department (stage 7)? | `departments.default_approver_id`, set in admin; overridable per card | |
| D-13 | Stage target hours (amber and red timers) | request 0, performance_input 24, intake 8, brief_schedule 16, production 40, creative_review 8, confirmation 24, ready_to_publish 24, published 0. Tune with the Traffic Manager | |
| D-14 | Work week | Saturday to Thursday, 10:00 to 18:00, per-person override in schedules | |
| D-15 | Monthly published-post target per brand | 12 | |
| D-17 | How does someone recover a forgotten password? | No self-service: the sign-in page says "Ask your admin", and a super_admin uses Reset password. Email-based reset (Resend) can be added later | |
| D-18 | Branch coordinates for location check-in | Approximate coordinates per branch area in the seed (`supabase/seed/01_core.sql`, `supabase/seed-production.sql`). Confirm each branch's exact point in `/admin/branches` ("Use my current location" while standing at the branch) before the pilot. Until a branch is confirmed its geofence is at least 1,500 m, so a rough point cannot lock people out | |
| D-16 | Should the Performance input stage be skippable? | Yes: the Performance lead can mark "no input" and the card moves to intake. Auto-skip after 24 hours is P1 | |
| D-19 | Staff email addresses | `name@e-spaces.co` as listed in `supabase/staff.json`; confirm each before running `scripts/create-staff.mts` on production | |
| D-20 | Access tiers | super_admin: Adham Mostafa, Omnia Magdy. traffic_manager (less access): Roaa Reda. Everyone else a regular employee (member / requester). No team leads, so leave and creative approvals fall back to the super admins; HR approval steps are skipped until someone has the hr role | Adham: "only me and Omnia Magdy have access to super admin, then Roaa less access, then the rest casual employee access" |
| D-21 | Monthly gates | Adham's "month at a glance" chart is the seeded rhythm. super_admin and traffic_manager edit it; an item's owner updates its status. Default owners: Ibrahem (plan, Gate 5), Adham (final approvals), Omar Afify (performance, MQL), Roaa (everything else). The chart's unlabelled day-1 performance marker is named "Campaigns live" | |
| D-22 | Fixed meeting times | Suggested, editable in Meetings: stand-up 10:15 daily, spending gate 11:00 Sunday and Wednesday, traffic and creative sync 12:00 Sunday, Gate 5 and Gate 25 reviews 12:00, MQL review 13:00 on days 10, 20 and 30 | |
| D-23 | Is a work-from-home location recorded? | Yes, following D-03. Visible only to the person, their team lead, hr, super_admin and leadership | |
| D-24 | Who counts as an external user? | Staff of other Espaces departments with portal accounts. Outside guests are invited to meetings by email and have no account | |
| D-25 | When a deadline or gate lands on a Friday or holiday | It moves to the working day before it, for gates, fixed monthly meetings and the strategic request deadline | |
