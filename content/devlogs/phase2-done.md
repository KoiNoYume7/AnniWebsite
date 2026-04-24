## The organizer is no longer a placeholder

Phase 1 gave me a shell: a sidebar, some tabs, a login flow, and a lot of empty `<div>`s with
placeholder text. It looked like a dashboard. It did not function like one.

Phase 2 fixed that. Four modules, all live:

- **Todos** — lists, priorities, due dates, drag-to-reorder, inline edit
- **Calendar** — monthly grid, click-to-create modal, color picker, no external dependencies
- **Reminders** — one-time or repeating, browser notifications via the Notification API, 60s polling
- **Finance tracker** — income/expense ledger, category breakdown, month filter, CSV export

No CDN libraries. No frameworks. Every tab is a single JS file with a `render(user)` function.
Backend is one route file per tab with standard CRUD. The pattern is boring and that's the point —
boring is maintainable.

## What I cut

The calendar was originally planned with FullCalendar loaded via CDN. I scrapped it after looking
at the bundle size and the API surface I actually needed. Building a lightweight monthly grid
took about three hours. It does exactly what's needed and nothing else.

Same story with reminders: I initially wanted a server-side cron job (`node-cron`) firing
push notifications. That's infrastructure overhead for a single-user app. Browser polling
every 60 seconds is fine. Simple wins again.

## What's next

Phase 3 is the AI chat tab — Claude on the server side, token budgets per user tier, context
injection from the organizer data (so it actually knows your todos and upcoming events before
you say a word). Phase 4 is Stripe billing.

But first I need to actually use the thing. The best testing is real usage.
