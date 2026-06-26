# CellGenic — Provider Sales Portal

Interactive frontend for the CellGenic sales rep / manager / admin dashboard.

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Run dev server
npm run dev

# 3. Open in browser
http://localhost:3000
```

## Structure

```
src/
├── app/                   # Next.js App Router pages
│   ├── dashboard/         # Dashboard (role-aware)
│   ├── clients/           # Client list + detail [id]
│   ├── commissions/       # Commission views
│   ├── referral/          # Referral link page (rep)
│   ├── order/             # Place order page (rep)
│   ├── reps/              # Rep performance (manager/admin)
│   ├── unassigned/        # Unassigned providers (admin)
│   ├── settings/          # Platform settings (admin)
│   └── auth/login/        # Login page
├── components/
│   ├── layout/            # Sidebar, Topbar
│   └── ui/                # Badge, Button, Card, Tabs
├── data/
│   └── mock.ts            # All mock data (replace with API calls in Phase 2)
├── lib/
│   ├── auth-context.tsx   # Role state (rep/manager/admin)
│   └── utils.ts           # cn(), badge/note helpers
└── types/
    └── index.ts           # TypeScript types
```

## Role switching

Use the toggle in the sidebar to switch between Rep / Manager / Admin views.
In production, this will be replaced by real WordPress JWT authentication.

## Phase 2 — What to replace

- `src/data/mock.ts` → WooCommerce REST API calls
- `src/lib/auth-context.tsx` → WordPress JWT auth
- Notes storage → WordPress custom post type or DB table
- Deploy target → Vercel (`portal.cellgenic.com`)

## Deploy to Vercel

```bash
npm run build
# Push to GitHub → connect repo in Vercel dashboard → deploy
```
