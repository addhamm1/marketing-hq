# Starting the build in Claude Code

## Setup (once)

1. Finish the Day 0 list in `docs/BUILD_PLAN.md`.
2. The kit (`CLAUDE.md`, `KICKOFF.md`, `.env.example`, `docs/`) is already in the repository folder. D1-01 scaffolds in a temporary folder and moves the result in, so the existing files are not a problem.
3. Open the repository in Claude Code and paste the Day 1 prompt below.
4. After D1-01, copy `.env.example` to `.env.local` and fill in what you have. Local Supabase values come from `supabase start`.

Start a fresh session each day. The docs, `PROGRESS.md` and git history carry everything between days, and a fresh session keeps Claude Code focused.

## Prompt for Day 1 (paste as your first message)

```
We are building Pixel HQ. The kit is already in this repository. Read CLAUDE.md and every file in docs/ before doing anything else. In D1-01, scaffold in a temporary folder and move it into this repository without overwriting the kit files.

Then:
1. Summarise in 10 lines what we are building this week and what is out of scope.
2. List anything in the docs that is contradictory, unclear or technically risky, with your suggested resolution.
3. Propose your plan for Day 1 (tasks D1-01 to D1-08): files, migrations, tests, and the order.

Do not write code until I approve the plan. After I approve, work through Day 1 task by task following the "How to work" and "Definition of done" sections of CLAUDE.md. Stop after each task with a short summary and wait for me to say "next".
```

## Prompt for Days 2 to 7

```
Day <N> of docs/BUILD_PLAN.md. Read CLAUDE.md, docs/PROGRESS.md and the Day <N> tasks, then re-read the parts of docs/PRODUCT_SPEC.md and docs/DATA_MODEL.md those tasks touch.

Check that yesterday's work is green: run typecheck, lint, tests and build, and fix anything broken first.

Then propose your plan for today's P0 tasks and wait for my approval. Work task by task, stop after each with a summary, and do P1 tasks only if all P0 tasks are done.
```

## Useful follow-up prompts

- When something looks wrong in the browser: `On <route>, <what you see> instead of <what you expected>. Reproduce it, write a failing test if possible, then fix it.`
- When a task grows too big: `Split <task id> into smaller steps, do only the first, and add the rest to BUILD_PLAN.md as <task id>a, b, c.`
- When you answer a decision: `I answered D-xx in DECISIONS.md. Update the code that is marked DECISION: D-xx.`
- When a day runs late: `We are behind. Apply the cut order at the top of BUILD_PLAN.md and tell me what moves to the backlog.`
- End of the day: `Write today's PROGRESS.md entry and list exactly what tomorrow starts with.`
- Security check at any time: `Run the access tests and the Supabase advisors and report every failure or warning.`

## What to check yourself each evening (10 minutes)

- Open the latest preview URL (it runs on the staging database with the test users) on your phone and click through today's features in Arabic and English.
- Sign in as two different test roles in two browsers and confirm each sees only what it should.
- Read `PROGRESS.md` and tick the matching rows in the sprint spreadsheet.
