## A subdomain for a game I play too much

Star Citizen has an Executive Hangar mechanic with a fixed 3-hour 5-minute cycle — RED phase
(closed), GREEN phase (open), BLACK phase (reset). The timing is predictable and the community
has documented the anchor timestamp. All you need to display accurate countdowns is a single
Unix timestamp and some modulo arithmetic.

I built CZTimers a while back as a standalone timer page. It worked. It was also a loose file
sitting in a folder on my machine, served locally when I remembered to start a Python http.server.
That's not a product — it's a script.

So I gave it a proper home: `sc.yumehana.dev`.

## The setup

The Pi already runs the main site. Adding a subdomain meant:

1. A new nginx server block pointing to `/opt/anni/sc`
2. A new Cloudflare Tunnel ingress rule for the hostname
3. Deploying the static files (no build step — pure HTML/CSS/JS)

That part took twenty minutes. The interesting part was deciding how it should relate to the
main site.

## Keeping them separate on purpose

CZTimers is not part of AnniWebsite. Different repo, different aesthetic, different purpose.
But they run on the same Pi and share the same auth backend, so some connection makes sense.

The decision: **isolated nav, shared session cookie**.

The SC site gets its own nav component (`anni-nav.js`) that doesn't use any of the main site's
routing, classes, or JS. It shows a passive `yumehana.dev ↗` reference and nothing else from
the main site structure. But the session cookie is scoped to `.yumehana.dev`, so if you're
already logged in on the main site, the SC nav picks that up via a cross-origin fetch to
`/api/auth/me`. One login, both sites.

For the login redirect, the SC nav sends a `returnTo` parameter: after OAuth completes on the
main site, you land back on sc.yumehana.dev. The server validates the return URL against an
allowlist before storing it — no open redirect.

## What's in the `sc.yumehana.dev` toolset

Right now: just the Hangar Timer. The infrastructure for more is there — the nav has a
`SC_PAGES` array to add new tools, the API has loot tracker routes and DB tables already wired
up, and the repo structure is built for expansion.

Loot Tracker and Crew Stats are next. Both need frontend work — the backend schemas and
API routes are already done.

## The home page

The main site homepage now has a dedicated SC Tools section — tool cards for what's live and
what's coming. The old "organizer as the hero" layout is archived. The builder intro is
now the top of the page. The organizer is still there, behind a login, but it's not the
first thing a visitor sees.

That felt like the right call. The organizer is a private tool. The SC tools are genuinely
public — open and useful to anyone playing the game.
