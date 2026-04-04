export const teamMembers = [
  { initials: "KL", name: "Kim Lee", role: "Frontend", zone: "Frontend / Preview", status: "active" as const, color: { bg: "#0a1f3a", text: "#4a9eff" } },
  { initials: "MR", name: "Marco R.", role: "Backend", zone: "Backend / Sync", status: "active" as const, color: { bg: "#1a0a2e", text: "#a855f7" } },
  { initials: "SA", name: "Sara A.", role: "Database", zone: "Database / RLS", status: "active" as const, color: { bg: "#0a2218", text: "#22c55e" } },
  { initials: "JT", name: "James T.", role: "Auth / DevOps", zone: "Auth / DevOps", status: "away" as const, color: { bg: "#1f1200", text: "#f59e0b" } },
  { initials: "DK", name: "Dev K.", role: "Reviewer", zone: "Code Review", status: "offline" as const, color: { bg: "#1a0a0a", text: "#ef4444" } },
];

export const sprintZones = [
  { label: "Frontend", pct: 82, color: "#4a9eff" },
  { label: "Backend", pct: 67, color: "#22c55e" },
  { label: "Database", pct: 91, color: "#a855f7" },
  { label: "Auth", pct: 55, color: "#f59e0b" },
  { label: "DevOps", pct: 40, color: "#ef4444" },
];

export const recentCommits = [
  { hash: "a3f9c1", msg: "feat: add annotation overlay to preview canvas", author: "Kim Lee", branch: "frontend/preview", time: "12m" },
  { hash: "cc82e0", msg: "fix: resolve race condition in webhook listener", author: "Marco R.", branch: "backend/webhooks", time: "45m" },
  { hash: "7b441d", msg: "chore: migrate sessions table to Supabase RLS", author: "Sara A.", branch: "db/auth", time: "2h" },
  { hash: "2e19f7", msg: "refactor: split GitHub sync into worker queue", author: "Marco R.", branch: "backend/sync", time: "3h" },
  { hash: "f08b3a", msg: "style: burndown chart responsive breakpoints", author: "Kim Lee", branch: "frontend/charts", time: "5h" },
];

export const pullRequests = [
  { title: "Annotation threading + reply UI", author: "Kim Lee", target: "main", status: "review" as const },
  { title: "BullMQ job queue for GitHub sync", author: "Marco R.", target: "main", status: "open" as const },
  { title: "Supabase RLS policies for teams", author: "Sara A.", target: "main", status: "merged" as const },
  { title: "Viewport breakpoint switcher", author: "Kim Lee", target: "main", status: "merged" as const },
  { title: "GitHub OAuth login flow", author: "James T.", target: "main", status: "open" as const },
];

export const weeklyCommits = [12, 8, 19, 14, 22, 17, 25, 11, 18, 21, 9, 16, 20, 13];
export const weekLabels = ["M","T","W","T","F","S","S","M","T","W","T","F","S","S"];
export const monthlyCommits = [88,102,74,119,95,131,108,143,87,116,129,97,152,110];
export const monthLabels = ["W1","","W2","","W3","","W4","","W5","","W6","","W7",""];

export const zoneStatuses = [
  { status: "live", bg: "#052210", color: "#22c55e", border: "#0a3a1a" },
  { status: "active", bg: "#0d1a30", color: "#4a9eff", border: "#1a3060" },
  { status: "live", bg: "#052210", color: "#22c55e", border: "#0a3a1a" },
  { status: "wip", bg: "#1f1500", color: "#f59e0b", border: "#3a2800" },
  { status: "idle", bg: "#1a0808", color: "#ef4444", border: "#3a1010" },
];
