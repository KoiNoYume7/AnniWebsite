## The pitch

I use five different apps to manage my life. Todoist for tasks. Google Calendar for events.
Some random notes app for reminders. A spreadsheet for finances. And ChatGPT when I need
to think through something. None of them talk to each other, and none of them are mine.

The Organizer is my answer: one self-hosted dashboard that handles all of it — todos,
calendar, reminders, finance tracking, and an AI chat that actually knows your context.

## Why self-hosted?

I don't want my life data on someone else's servers. I don't want to pay $15/month for
features I could build in a weekend. And I definitely don't want my personal finance data
feeding someone's ad model.

The whole thing runs on a Raspberry Pi 4 with a $5 SD card. My data stays on my drives,
my network, my rules.

## The tech stack

- **Frontend**: Vite + vanilla JS. No React, no framework. Just modules that render HTML.
- **Backend**: Node.js + Express + SQLite. One database file, WAL mode, foreign keys.
- **AI**: Claude API (server-side only). The client never sees the API key.
- **Auth**: OAuth via GitHub, Discord, Google. Open registration with role-based access.

## What's done so far

Phase 0 (foundation) and Phase 1 (organizer shell) are complete. The dashboard loads,
tabs switch, the sidebar shows your profile and token usage. It's a real app with real auth.

Phase 2 is next — that's where the actual tools land: todo lists, calendar, reminders,
finance tracker. Each one is a self-contained module: one JS file for the frontend tab,
one route file for the backend CRUD.

## What's the endgame?

A personal life OS that works like a product but belongs to you. Open to anyone who wants
to run their own instance. Eventually: Stripe billing for hosted accounts, Claude AI
integration with token budgets, data export, web push notifications.

But first: ship the todo list.
