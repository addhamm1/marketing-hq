# Seed data

Seed these in `supabase/seed.sql` for local development and in a separate production seed script (no test users). Arabic names are drafts for Adham to correct.

## Departments

| slug | name_en | name_ar | is_marketing |
| --- | --- | --- | --- |
| marketing | Marketing | التسويق | true |
| sales | Sales | المبيعات | false |
| daily-reservation | Daily Reservation | الحجوزات اليومية | false |
| business-development | Business Development | تطوير الأعمال | false |
| operations | Operations | العمليات | false |
| hr | Human Resources | الموارد البشرية | false |
| finance | Finance | المالية | false |
| logistics | Logistics | اللوجستيات | false |
| management | Management | الإدارة | false |

## Marketing teams

| slug | name_en | name_ar | color |
| --- | --- | --- | --- |
| traffic | Traffic | التنسيق | #F59E0B |
| creative | Creative | الإبداع | #8B5CF6 |
| performance | Performance | الأداء | #10B981 |
| community | Digital Community Management | إدارة المجتمع الرقمي | #3B82F6 |

## Branches

Confirm the full list with Adham before the production seed; the list below is the known set. Upcoming branches (Heliopolis, Sheraton, two in Sheikh Zayed) are added when they open.

| Area | Branches |
| --- | --- |
| Heliopolis | Nozha, Cocafe (Korba), The Hive |
| Nasr City | Makram, Mamoon |
| New Cairo | Diplo Plaza, North Teseen, South Teseen |
| 6th of October | Mashareq, Palm Hills (also called Izar) |
| Sheikh Zayed | Saraya |
| Maadi | New Maadi, Old Maadi |
| Dokki | Spaces Villa, Mosadak |
| Alexandria | Alexandria |
| Zagazig | Zagazig |

Plus the placeholder `hq` branch from DECISIONS D-02 if no home branch is chosen.

## Brands

| slug | name | color |
| --- | --- | --- |
| espaces | Espaces | brand primary (set in theme) |
| cocafe | Cocafe | its own colour |
| spaces-planner | Spaces Planner | its own colour |

## Card value lists (store as settings or check constraints, editable later)

- Verticals: Virtual Offices, Offices, Daily Reservation, Cocafe, Documents and Proposals
- Formats: static, carousel, reel, long video, story, copy only, landing page, print, presentation or proposal
- Platforms (labels only, no integration): Facebook, Instagram, LinkedIn, TikTok, Snapchat, Google Ads, website, print, internal
- Content calendar platforms (subset used on posts): Facebook, Instagram, LinkedIn, TikTok, Snapchat

## Workspaces and boards

- Workspaces: Creative, Performance, Community, Traffic, Projects
- Board "Content Pipeline" in Traffic, `is_pipeline = true`, ten lists named after the stages (English and Arabic labels from the messages files)
- Board "Branch Opening Template" in Projects with lists: Planning, Assets, Launch Content, Launch Day, Follow-up

## Request types and approval chains

`team_lead` = `team_lead_of_requester`. Admin can edit every chain later.

| key | category | is_leave | Chain |
| --- | --- | --- | --- |
| annual_leave | leave | true | team_lead, role:super_admin, role:hr |
| sick_leave | leave | true | team_lead, role:hr (attachment required after 2 days) |
| casual_leave | leave | true | team_lead, role:hr |
| unpaid_leave | leave | true | role:super_admin, role:hr |
| work_from_home | special | false | team_lead |
| permission | special | false | team_lead (fields: date, late arrival or early leave, hours) |
| overtime | special | false | team_lead, role:super_admin (fields: date, hours, linked card) |
| equipment | special | false | role:super_admin (Finance approval happens outside the portal in v1) |
| purchase | special | false | role:super_admin, role:leadership |
| training | special | false | role:super_admin |
| other | special | false | role:super_admin |

For the team lead of a team lead (or a member with no team lead), `team_lead_of_requester` resolves to `role:super_admin`.

## Settings

| key | value |
| --- | --- |
| lateness_grace_minutes | 15 (the only key HR may edit) |
| wip_limit | 6 |
| monthly_post_target | 12 |
| strategic_deadline_day | 25 |
| stage_targets_hours | see DECISIONS D-13 |

## Accounts to create in production

The roster lives in `supabase/staff.json` (the single source). Locally and on staging the same people are seeded by `supabase/seed/08_espaces_people.sql` with the test password. On production run:

```bash
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<key> pnpm tsx scripts/create-staff.mts
```

It skips accounts that already exist, prints each new temporary password once (hand it over privately), forces a password change at first sign-in, and sets the departments' default approvers.

Access tiers (DECISIONS D-20): **super_admin** only for Adham Mostafa and Omnia Magdy; **traffic_manager** (less access: runs the pipeline, no admin) for Roaa Reda; **everyone else is a regular employee**: `member` in marketing, `requester` in other departments. `final_approver` on Asmaa is her delivery-confirmation duty, not extra access. Emails follow `name@e-spaces.co` until confirmed (D-19).

| Name | Title | Department | Team | Roles | Email |
| --- | --- | --- | --- | --- | --- |
| Adham Mostafa | Marketing Team Lead | marketing |  | super_admin | adham@e-spaces.co |
| Omnia Magdy | Acting Managing Partner, Head of Sales | sales |  | super_admin | omnia@e-spaces.co |
| Roaa Reda | Traffic Manager | marketing | traffic | traffic_manager | roaa@e-spaces.co |
| Ibrahem Seif | Creative and Content Director | marketing | creative | member | ibrahem@e-spaces.co |
| Mahmoud Hussein | Designer | marketing | creative | member | mahmoud@e-spaces.co |
| Hatem Sapet | Videographer | marketing | creative | member | hatem@e-spaces.co |
| Basil Nabil | Intern Content Creator | marketing | creative | member | basil@e-spaces.co |
| Omar Afify | Head of Performance and Media Buying | marketing | performance | member | omar.afify@e-spaces.co |
| Yasmin Shaarawy | Creative | marketing | creative | member | yasmine@e-spaces.co |
| Omar Mansy | Performance | marketing | performance | member | omar.mansy@e-spaces.co |
| Ahmed Gad | Performance | marketing | performance | member | gad@e-spaces.co |
| Mariam | Reel Creator | marketing | creative | member | mariam@e-spaces.co |
| Sherif | Marketing Director | marketing |  | member | sherif@e-spaces.co |
| Mostafa | Marketing | marketing |  | member | mostafa@e-spaces.co |
| Ahmed Yassin | CEO and Founder | management |  | requester | ahmed.yassin@e-spaces.co |
| Asmaa Hossam | Sales Team Lead | sales |  | requester, final_approver | asmaa@e-spaces.co |
| Hadeer Mohamed | Head of Daily Reservation Sales | daily-reservation |  | requester | hadeer@e-spaces.co |
| Mohamed Sami | Head of Business Development (Cocafe) | business-development |  | requester | sami@e-spaces.co |
| Safaa | HR Manager | hr |  | requester | safaa@e-spaces.co |
| Nada Hossam | Finance Manager | finance |  | requester | nada@e-spaces.co |
| Omar Abd al-Aziz | Head of Logistics | logistics |  | requester | omar.abdelaziz@e-spaces.co |
| Mohamed Mohy | Head of Operations | operations |  | requester | mohy@e-spaces.co |

Community Management lead and the new Junior Designer are added to `staff.json` when hired or named. Surnames for Mariam, Sherif and Mostafa, and Mostafa's title, are still to come.

## Test users (local and staging only)

The canonical list, with departments, teams and roles, is in `DATA_MODEL.md` section 13. Never seed them in production. In the local and staging seed, set `approver@test.local` as the Sales department's `default_approver_id`.
