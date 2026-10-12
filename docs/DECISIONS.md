# Open decisions

Claude Code: when a task depends on one of these and the Answer column is empty, build the default, mark the code `// DECISION: D-xx`, and mention it in your summary. Prefer defaults that are a setting rather than code, so changing them later is cheap.

Adham: fill in the Answer column. An answer here overrides the default.

| Id | Question | Default until answered | Answer |
| --- | --- | --- | --- |
| D-01 | Who can sign in, and is anyone activated automatically? | Any Google account can sign in and becomes `pending`; a super_admin activates it | No Google sign-in. Admins create every account with email and a temporary password; the employee must change it on first sign-in and can change it any time. No public sign-up |
| D-02 | Which branch is the first map (the team's home branch)? | A branch with slug `hq` named "Marketing HQ" until the real branch is named | |
| D-03 | Check-in verification per branch | Location (geofence, 150 m radius plus up to 100 m for GPS accuracy; readings worse than 200 m refused) and office Wi-Fi IP as a fallback; field and home allowed. The reception QR kiosk was removed (M-02) | |
| D-04 | Is attendance data used for payroll or deductions? | No. Team tool only; lateness visible to the person, their team lead, hr, super_admin and leadership | |
| D-05 | Leave types, yearly allowances, caps, notice periods | Types from `SEED_DATA.md`; allowances seeded as 0 and set by HR before the pilot (a Day 7 check) | |
| D-06 | Approval chains per request type | As listed in `SEED_DATA.md` | |
| D-07 | Art: tile size, asset pack or custom | 32 by 32 pixels, generated placeholders; manifest-driven so a pack drops in later | |
| D-08 | Default interface language | English, with Arabic one tap away and saved per person | |
| D-09 | Digits in the Arabic interface | Latin digits (0 to 9) in both languages | |
| D-10 | Can other departments see the map? | No. The portal has no map in the sprint | |
| D-11 | Product name | "Marketing HQ" | |
| D-12 | Who confirms deliverables per department (stage 7)? | `departments.default_approver_id`, set in admin; overridable per card | |
| D-13 | Stage target hours (amber and red timers) | request 0, performance_input 24, intake 8, brief_schedule 16, production 40, creative_review 8, confirmation 24, ready_to_publish 24, published 0. Tune with the Traffic Manager | |
| D-14 | Work week | Saturday to Thursday, 10:00 to 18:00, per-person override in schedules | |
| D-15 | Monthly published-post target per brand | 12 | |
| D-17 | How does someone recover a forgotten password? | No self-service: the sign-in page says "Ask your admin", and a super_admin uses Reset password. Email-based reset (Resend) can be added later | |
| D-18 | Branch coordinates for location check-in | Approximate coordinates per branch area in the seed (`supabase/seed/01_core.sql`, `supabase/seed-production.sql`). Confirm each branch's exact point in `/admin/branches` ("Use my current location" while standing at the branch) before the pilot | |
| D-16 | Should the Performance input stage be skippable? | Yes: the Performance lead can mark "no input" and the card moves to intake. Auto-skip after 24 hours is P1 | |
