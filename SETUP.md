# SETUP — run this in order

Two halves: **WordPress first, then the frontend.** If you do the frontend first, every account will show "No date" in the window column, because the field it reads doesn't exist yet.

---

## PART 1 — WordPress (do this first)

### 1.1 Replace the plugin file

In the zip: `wordpress/cellgenic-roles.php`

This is your **existing** `cellgenic-roles.php` with the new code appended — same file, version bumped 1.1.0 → 2.0.0. Nothing above the big `PORTAL v2` banner was touched, so reverting means deleting from that banner down.

- **Path:** `wp-content/plugins/cellgenic-roles/cellgenic-roles.php` (wherever it lives now — check Plugins → Plugin File Editor if unsure)
- Back up the current file before overwriting.
- Overwrite it. **Do not deactivate/reactivate the plugin** — `cellgenic_remove_roles()` runs on deactivation and calls `remove_role()`, which strips the Sales Rep / Sales Manager role from every existing user. Just replace the file; WordPress picks it up on the next request.

### 1.2 Confirm it loaded

Plugins list should show **CellGenic Sales Roles 2.0.0**. If you get a white screen, restore your backup and send me the error from `wp-content/debug.log`.

### 1.3 Run the backfill — required

**Users → Portal v2 Backfill**

It shows you how many accounts are missing an access-granted date before you commit to anything. Press **Run backfill**.

What it does:
- Sets `cellgenic_access_granted_at` from the registration date for every account that has none, and flags it as inferred.
- Builds the cached order totals (revenue / count / last order date) per client.
- Sets a starting pipeline stage: `act` if the client has ordered, `new` otherwise.

Safe to run twice — it only fills fields that are currently empty. It creates nothing, deletes nothing, emails nobody.

> Registration date is a proxy, not the real approval date, which is why it's flagged. From now on the date is stamped properly at approval time.

### 1.4 Check the endpoint

Logged in as admin, open:

```
https://cellgenic.com/wp-json/cellgenic/v1/portal-clients
```

You want JSON with `clients: [...]`, `scope: "admin"`, and each client carrying `access_granted_at`, `stage`, `lifetime_revenue`, `country_code`. If `access_granted_at` is `null` anywhere, the backfill didn't finish.

---

## PART 2 — Frontend

### 2.1 Install

```bash
cd cellgenic-portal
npm install
```

### 2.2 Environment

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`. The four that matter for the portal to work at all:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_WP_URL` | `https://cellgenic.com` |
| `NEXT_PUBLIC_WC_URL` | `https://cellgenic.com` |
| `WC_CONSUMER_KEY` | WooCommerce → Settings → Advanced → REST API |
| `WC_CONSUMER_SECRET` | same place |

Everything else (DocuSign, the Ops inventory key, the service token) is optional — those features fail gracefully and the rest of the portal runs without them. **The build no longer breaks when DocuSign is unconfigured** — that was a real bug in the old code, see "What I fixed" below.

### 2.3 Run

```bash
npm run dev      # http://localhost:3000
```

or

```bash
npm run build && npm start
```

Both are verified working — `tsc --noEmit` is clean and `next build` compiles all 28 routes.

### 2.4 Deploy

Vercel picks up `vercel.json` as-is. Set the same env vars in **Project → Settings → Environment Variables**. Note that `WC_CONSUMER_KEY` / `WC_CONSUMER_SECRET` must **not** be prefixed `NEXT_PUBLIC_` — they're read only by the `/api/*` server routes and must never reach the browser.

---

## PART 3 — Check it actually works

In order, because each one depends on the last:

1. **Log in.** The login screen is now on the new palette (it was still on the old jade green).
2. **Overview** — six stat cards with real numbers, and the red alarm bar if anything is closing within 5 days.
3. **Activation** — this is the main screen. Every row should show a 30-tick window bar and a countdown. If they all say "No date", go back to step 1.3.
4. **Tap "Show contact"** on a row → the phone/email un-mask. Then check **Users → PII Reveal Log** in wp-admin — there should be a new entry with your name, the client, the field and your IP. That log is the real thing, not a UI counter.
5. **Tap "Next action"** on a row → the stage pill advances, no page reload. Refresh the page — it should stay advanced (it's written to user meta).
6. **Open a row** → drawer slides in from the right → click one of its orders → then **View client** in that order → the back link should read "← Back to Order #CG-…". That back-stack is what makes the cross-links work.
7. **Select 3 rows** with the checkboxes → **Extend 15 days** → all three close dates move out.
8. **Resize the window under 880px** — the table turns into cards, the bottom tab bar appears, the bulk bar pins above it. Then check it on an actual phone.
9. **Log in as a rep** → they should see only their own accounts, and `/portal-clients` should return `scope: "rep"`. `/reps` should not appear in their nav.

---

## What changed, at a glance

**Rebuilt on the new design (7 screens):** Overview · Activation (list + pipeline) · Active clients · Orders · Approvals · Reps · Leaderboard

**Still on the old look, but working and reachable:** VIP clients · Unassigned · Commissions · Place order · Client detail page · Rep detail · Inventory · Calculator · Referral · Settings

Those ten kept their existing markup on purpose — nothing about them is broken, they just haven't been restyled yet. They all sit inside the new shell (new sidebar, new header, drawer available), so they don't look like a different app; the internals are the old Tailwind. Tell me the order you want them done in.

**The old `/clients/vip` and `/unassigned` pages are now partly redundant** — VIP is a badge on the row, and "no rep assigned" is a sidebar alert that filters Activation. They're still there and still work; decide later whether to retire them.

---

## What I fixed while merging

These were pre-existing, and would have bitten you during setup:

1. **`npm run build` failed outright if DocuSign wasn't configured.** `src/lib/docusign-auth.ts` read `process.env.DOCUSIGN_PRIVATE_KEY!` at module scope and called `.replace()` on it. Undefined → `TypeError` while Next collected page data → the whole build died over one unconfigured integration. Now read inside the function, so a missing key is a clear error on the DocuSign routes only.

2. **`POST /api/orders` had no auth check at all.** Combined with `Access-Control-Allow-Origin: *` in `vercel.json`, any website could create a real `processing` order for any customer on your store. It now requires the same Bearer token as everything else, and a sales rep can only order for their own clients.

3. **`GET /api/customers/[id]` had no auth check** — it returned any customer's name, email, phone and country to anyone who asked. Now authenticated.

4. **`/api/debug-providers` and `/api/orders/recent` deleted.** The first was a leftover debug route that dumped the raw WP response; the second was unauthenticated dead code.

5. **`useClients()` fired two requests and threw one away.** A rep always hit `/all-clients` → 403; an admin without a rep code always hit `/my-clients` → 400, which rendered an error panel over the whole dashboard. The new `/portal-clients` scopes server-side, one request.

6. **Per-client revenue was recomputed with `wc_get_orders(limit => -1)` on every request**, and the rep-name lookup ran a `get_users()` query inside a per-client loop. Both now cached in user meta, refreshed by order hooks.

7. **`middleware.ts` had two divergent route lists** (one in the file, one exported from `Sidebar.tsx`). `/calculator` was in neither, so that page redirected everyone to `/dashboard`. One list now.

8. **Fonts.** Switched from `next/font/google` to the design's own `<link>`. `next/font` downloads the files at build time, so it fails on any machine or CI runner without access to `fonts.googleapis.com`.

### Still open, deliberately not touched
- **`/delete-client` is reachable by a sales rep.** The code comment says admin-only but the route registers `cellgenic_is_sales_rep`. A rep can permanently delete their own client and all of that client's WooCommerce orders. One-line fix, but it changes who can do what, so it's your call.
- **DocuSign write-back is broken end to end.** `/api/docusign/send` doesn't set the `clientId` custom field on the envelope, and the webhook returns 422 when it's missing — so no signed PDF ever saves. Separate job.
- **`/api/products`, `/api/products/[id]/variations` and `/api/inventory` are still unauthenticated.** Products includes prices, which are supposed to be gated. I left these because fixing them means changing the callers, and I didn't want to touch the un-migrated pages in the same pass.

---

## Two things that need Sarah or Ash

**1. The palette.** Three of the design's six accents break the brand rules as written — `--jade #0F6B57` (green), `--indigo #2B4B8C` (blue), `--violet #5B3E9E` (purple), against "no blue, purple, pink or green — monochrome only". Clay (red) and amber (orange) are fine. I built it exactly as designed, as you asked, but the portal is provider-facing so it isn't purely internal. If a swap is wanted it's three lines in `src/app/globals.css` `:root` and nothing else changes.

**2. No-export vs. the existing CSV export.** The design's Reps page states plainly that the client list can't be downloaded, and I've disabled copy / right-click / drag site-wide to match. But the old `/orders` page had a working **Export CSV** button, which I removed. If Rafa uses that export, one of these has to give.

Worth saying once: masking, copy-blocking and the watermark are deterrents — anyone can photograph a screen. The part with teeth is the audit log behind the reveal button, and that one is real and server-side.

---

## Changelog — 2 September 2026

**Watermark removed.** `<Watermark />` is commented out in
`src/components/shell/AppShell.tsx`. The component and its `.mark` CSS are
still there, so re-enabling it is one line. The audit log behind "Show
contact" is unaffected and still records every reveal.

**Tools nav hidden.** Calculator, Referral link, Inventory and Settings are
no longer in the sidebar or the mobile "More" sheet — `const tools` in
`src/components/shell/Sidebar.tsx` is now an empty array with the original
list commented out directly beneath it. The pages still exist, still work,
and are still reachable by URL for the roles `middleware.ts` allows.

**Two search bugs fixed.**

1. *Spaces were being swallowed.* The input is controlled by `term`, and
   `onChange` called `.trim()` on every keystroke — so typing "Calla
   Kleene" collapsed to "CallaKleene" and matched nothing. Multi-word
   search was completely broken. The raw value is now stored and trimmed
   only at compare time, in `useProviderFilter()`.
2. *Typing on Overview appeared to do nothing.* Overview, Reps and
   Leaderboard don't filter by the search term, so there was no visible
   response. The first keystroke now moves you to Activation, which is the
   searchable list — matching the original prototype's behaviour.

Search also now matches the assigned rep's name, so typing a rep's name
finds their accounts.

### Extensions can now be undone (plugin 2.0.1)

"Extend 15 days" previously had **no undo** — the endpoint only accepted
1 to 90 days, so an extension applied to the wrong client could only be
reversed by editing `cellgenic_window_extra_days` in the database.

`/extend-window` now accepts negative values. The running total is floored
at zero, so removing days can only return an account to its original
30-day window — it can never be used to shorten a window that was never
extended. Every add and removal is written to the client's event log, so
the drawer timeline shows who changed it and when.

Three places to undo:

- **Client drawer** — when an account has an extension, an "Extended by
  N days" row appears with **Undo 15d** (and **Clear all** past 15 days).
- **Row ⋯ menu** — an **Undo extension** entry appears, showing what the
  close date reverts to.
- **Bulk bar** — **Undo 15 days** next to Extend, for when a bulk action
  hit the wrong selection. It reports how many rows actually changed and
  says so plainly when none of them had an extension.

**Note:** reactivating an expired account (stage → Not contacted from
Expired) already clears `cellgenic_window_extra_days` to zero and restamps
day 0, because that is a genuine restart rather than an extension.

This needs plugin **2.0.1** — if you already installed 2.0.0, replace the
file again. No backfill re-run needed.

### Navigation no longer refetches everything (2 Sep, later)

**The problem:** clicking any nav item reloaded the whole dataset. Sidebar
counts dropped to 0 and filled back in, and the page sat empty for a
moment. Every click cost four API calls.

**The cause:** each route had its own `layout.tsx` rendering
`PortalLayout`. In the App Router a layout only persists across navigation
when it is a *shared parent segment* — fourteen sibling layouts is not
that. So going from /activation to /orders unmounted the entire provider
tree (`UIProvider`, `FilterProvider`, `PortalProvider`) and mounted a fresh
one, which refetched clients, orders, approvals and reps from scratch.

**The fix:** all authenticated routes now live in a route group,
`src/app/(portal)/`, with **one** `layout.tsx` at its root. The layout
mounts once and stays mounted, so navigation is instant and the counts
never flicker.

- **URLs are unchanged.** Route-group parentheses are stripped from the
  path — `(portal)/orders` still serves `/orders`. Verified against the
  build output; all 28 routes are identical.
- `/auth/login` stays outside the group, since it must not be wrapped in
  `ProtectedRoute` or the app shell.
- The fourteen per-route `layout.tsx` files are gone.

**Also:** nav counts now render blank instead of `0` during the very first
load. `counts()` on empty arrays returns 0 for everything, and showing that
reads as real data ("0 urgent, 0 approvals") a moment before the true
numbers arrive.

To refresh deliberately, the data layer still exposes `refetch()` — the
error states use it, and mutations call it where the server is the
authority (approving a provider, reactivating an expired account).

### Two follow-ups on the navigation reload

**1. One hard-navigation link was left behind.** The drawer's **Open full
profile →** was a plain `<a href>`, not `next/link`. A plain anchor is a
full browser navigation: the whole app reboots, the provider tree
remounts, and every count blanks — the same symptom the route group was
meant to remove, just triggered from one button instead of the nav. It is
now a `<Link>` and closes the drawer on click.

If this ever recurs, the check is:

```
grep -rn '<a [^>]*href={\?[`"]/' src --include=*.tsx
```

Anything that turns up there is a full page reload. Internal navigation
must go through `next/link` or `router.push`.

**2. Silent background refresh.** Loading once is the fix, but it means a
tab left open all day goes stale. `refetch()` now takes a `silent` flag:
the request runs and the data is replaced without touching `loading`, so
nothing on screen jumps. Two triggers, both silent:

- returning to the tab (window focus / visibilitychange)
- a 3-minute poll, skipped while the tab is hidden

A failed background refresh is swallowed rather than replacing a working
screen with an error panel — the last good data stays up.

3 minutes is deliberate: the 30-day window moves in days, so anything
faster is just load on WordPress for no visible benefit. It's one number
in `usePortal.tsx` if you want it different.
