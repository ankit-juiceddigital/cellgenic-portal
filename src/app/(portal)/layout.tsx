import { PortalLayout } from '@/components/shell/PortalLayout'

// ONE layout for every authenticated route.
//
// Each route used to carry its own copy of this file. In the App Router a
// layout only persists across navigation when it is a SHARED parent
// segment — fourteen sibling layouts meant no shared boundary, so moving
// from /activation to /orders unmounted the whole provider tree and
// mounted a fresh one. Every click refetched clients, orders, approvals
// and reps, and the sidebar counts fell back to 0 until the requests
// landed.
//
// Inside this route group the layout mounts once. PortalProvider keeps its
// data, the counts stay put, and navigation is instant.
//
// The group's parentheses are not part of the URL: (portal)/orders serves
// /orders. /auth/login stays OUTSIDE the group, since it must not be
// wrapped in ProtectedRoute or the app shell.

export default function PortalGroupLayout({ children }: { children: React.ReactNode }) {
  return <PortalLayout>{children}</PortalLayout>
}
