# CellGenic — Provider Sales Portal

Next.js 14 (App Router) frontend for the CellGenic sales rep / manager / admin
dashboard. Data comes from WordPress + WooCommerce on WP Engine.

**Read `SETUP.md` first** — the WordPress plugin has to be updated and a
backfill run before this app shows meaningful data.

## Quick start

```bash
npm install
cp .env.local.example .env.local   # then fill it in
npm run dev                        # http://localhost:3000
```

## Structure

```
src/
├── app/
│   ├── dashboard/      Overview          — v2 design
│   ├── activation/     Activation        — v2 design (the main working screen)
│   ├── clients/        Active clients    — v2 design
│   │   ├── [id]/       Client detail     — legacy look, still works
│   │   └── vip/        VIP clients       — legacy look
│   ├── orders/         Orders            — v2 design
│   ├── approvals/      Approvals         — v2 design
│   ├── reps/           Reps              — v2 design
│   │   └── [id]/       Rep detail        — legacy look
│   ├── leaderboard/    Leaderboard       — v2 design
│   ├── unassigned/     Unassigned        — legacy look
│   ├── commissions/    Commissions       — legacy look
│   ├── order/          Place order       — legacy look
│   ├── inventory/      Inventory         — legacy look
│   ├── calculator/     Peptide calculator — legacy look
│   ├── referral/       Referral link     — legacy look
│   ├── settings/       Settings          — legacy look
│   ├── auth/login/     Login
│   ├── api/            Server routes — hold the WooCommerce credentials
│   ├── globals.css     THE DESIGN SYSTEM (extracted verbatim — see below)
│   └── layout.tsx
├── components/
│   ├── shell/          AppShell · Sidebar · PortalLayout      (v2)
│   ├── ui/             Drawer · Sheet · Toast · Ticks ·
│   │                   ProviderTable · FilterBar · Icons      (v2)
│   ├── ui/Badge|Button|Card|Tabs|Skeleton.tsx                 (legacy)
│   └── layout/Topbar.tsx                                      (legacy shim)
├── hooks/
│   ├── usePortal.tsx   v2 — one dataset, all mutations
│   └── useData.ts      legacy — still used by the un-migrated pages
├── lib/
│   ├── portal-model.ts window maths, stages, buckets, masking, sorting
│   ├── api.ts          every v2 call
│   ├── ui-context.tsx  drawer (with back-stack), sheet, toast
│   ├── filter-context.tsx  filters, above the router
│   ├── auth.ts / auth-context.tsx   WordPress JWT
│   └── woocommerce.ts  legacy API client
├── types/
│   ├── portal.ts       v2 model
│   └── index.ts        legacy types
└── middleware.ts       cookie-level route protection
```

## Two important conventions

**1. `globals.css` is extracted verbatim from the approved design HTML.**
Colours, borders, `grid-template-columns`, breakpoints and the mobile
card-mode table are byte-identical to what was signed off. React
components emit exactly those class names. **Do not re-express any of it
in Tailwind utilities** — if a class needs to change, change it in
`globals.css`. Tailwind is still installed for the legacy pages, with
`preflight` disabled so its resets can't fight the design's own.

**2. Nothing derived is stored.** `elapsed`, `left`, `closes` and the
urgency bucket are computed in `portal-model.ts` from `access_granted_at`
and today's date, every render. The only stored fields are the access
date, the pipeline stage, and any extension days.

## The 30-day window

Day 0 is when provider access is granted. With no first order by day 30
the account is deactivated. Buckets, from `portal-model.ts`:

| Bucket | Rule |
|---|---|
| `urg` | ≤ 5 days left |
| `warn` | 6–15 days left |
| `ok` | more than 15 days left |
| `act` | has at least one completed or processing order |
| `dead` | past day 30 with no order |

Thresholds live in `WINDOW_DAYS`, `URGENT_AT` and `WARN_AT` — change them
in one place.
