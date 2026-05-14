## The name

YUME. *Your Unified Memory & Experience.*

And also 夢 — dream in Japanese. That one wasn't planned. It just fit.

I've been building toward this thing for a while without having a name for it. A Jarvis-like
AI that knows your life. Not a chatbot you explain things to every time. Not five apps that
don't talk to each other. One system. One brain. Yours.

Now it has a name. And a plan.

## What the problem actually is

Most people manage their lives across a pile of disconnected tools. Todoist for tasks.
Google Calendar for events. Some notes app. A spreadsheet. ChatGPT when they need to think.
None of it connected. None of it private.

The deeper problem isn't the apps themselves — it's that no single AI has access to all of it.
So when you ask your AI assistant for help, it's working with a fraction of the picture.
It doesn't know you have a deadline on Friday. It doesn't know you're tight on budget this month.
It doesn't know you wrote something down last week that's relevant right now.

YUME fixes this by being the place where all of that lives — and by giving the AI
full context before it ever says a word.

## What YUME actually is

A personal life OS. Not a productivity suite. Not another todo app. An operating system
for your life that an AI runs on top of.

The modules:

**ALOS — AnniLifeOS** is the main app. Quick capture, tasks, reminders, finance, journal,
goals. The place where your life data goes. Live at `alos.yumehana.dev`, actively being built.
The foundation is done. The AI layer is next.

**AnniCore** is the auth and session layer shared across every module. One login, one session
cookie on `.yumehana.dev`, works everywhere. Already running at `auth.yumehana.dev`.

**YUNA — Your Unified Notification Assistant** is the notification backbone. ALOS fires events.
YUNA decides how to deliver them: Discord DM while gaming, push notification on Android,
toast on Windows, buzz on the Watch. One router, every channel. Not built yet — but the
design is clear.

**The rest** — AnniAudio, AnniWin11, AnniProxy, AnniSCTools — are separate modules that
will eventually plug into YUME's ecosystem as it matures. Each one handles a specific layer
of the stack.

## The AI layer

This is the part that makes it YUME instead of just "another organizer."

Before every AI response, the server packages a snapshot of your data — your open tasks,
upcoming reminders, recent captures, financial situation, current goals — and injects it
as context into the system prompt. The AI knows your life before you say anything.

You don't explain. You just ask.

*"What should I focus on today?"* — it knows your task list and your deadlines.
*"Am I on track for my savings goal?"* — it knows your last three months of finance entries.
*"What did I write down about that idea last week?"* — it searches your captures and journal.

That's the difference between a chatbot and an assistant that actually knows you.

Voice input via Whisper (local, self-hosted, nothing leaves your network) means capture
is as fast as saying something out loud. The AI parses it, categorises it, files it.
You don't touch a keyboard.

## The architecture

Everything runs on a Raspberry Pi 4 in Switzerland. Two 2TB drives, hot-pluggable via USB 3.
Cloudflare Tunnel means zero open ports. nginx routes everything by hostname. systemd keeps
services running.

```
internet
   ↓
Cloudflare Tunnel (HTTPS, no open ports)
   ↓
nginx on RPi4
   ├── auth.yumehana.dev  → AnniCore  (:4200)
   ├── alos.yumehana.dev  → ALOS      (:4100)
   ├── yumehana.dev       → AnniWebsite (:4000)
   └── sc.yumehana.dev    → AnniSCTools (static)

/srv/storage/
   ├── AnniCore/    → annicore.db  (users, sessions)
   ├── ALOS/        → alos.db     (all life data)
   └── AnniWebsite/ → sc.db       (star citizen data)
```

The frontend is Vite + vanilla JS. No framework. The same design system runs across
every subdomain — same tokens, same fonts, same dark aesthetic.

The AI is Claude by Anthropic, accessed via API. Streaming responses via SSE.
Token usage tracked per user. Server-side only — the API key never touches the client.

## Why self-hosted matters

This isn't a technical preference. It's a principle.

Your life data — your tasks, your finances, your journal entries, your goals — shouldn't
live on someone else's server. It shouldn't feed an ad model. It shouldn't be one breach
away from being exposed.

YUME runs on your hardware. Or, eventually, on hardware I run for you — but with the same
guarantee: your data is yours, the AI works for you, not the other way around.

For Switzerland and Europe specifically, this matters more than most places. DSGVO compliance
isn't a checkbox. It's the baseline.

## The roadmap

**Right now** — ALOS is live. Auth works. Quick capture and tasks are running.
P1 is the AI integration: Claude API, streaming, context injection, voice capture via Whisper.

**Next** — Finance tracker UI, journal, goals. Completing the life OS core.

**After that** — Tauri wrapper for a native Win11 app (same codebase, just a window around it).
Android via Tauri Mobile. Galaxy Watch companion via Wear OS.

**Then** — YUNA. Notification routing across every channel. The glue between ALOS events
and wherever you actually are.

**Eventually** — Managed hosting for people who want YUME without the self-hosting complexity.
Onboarding. Billing. Multi-user. A real product with a real business behind it.

## The honest part

I'm one person building this with AI assistance and a Raspberry Pi on my desk.

The scope is ambitious. The pace is inconsistent (ADHD is real). Some modules will sit
untouched for months while I work on something else. That's how this works.

But the foundation is solid, the direction is clear, and every piece that gets built
is a real, working thing — not a mockup, not a demo, not a slide deck.

YUME is being built in public, one module at a time, for real.

*夢*
