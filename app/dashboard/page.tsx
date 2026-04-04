import MetricCard from "../components/MetricCard";
import CommitChart from "../components/CommitChart";
import SprintProgress from "../components/SprintProgress";
import TeamPanel from "../components/TeamPanel";
import RecentCommits from "../components/RecentCommits";
import PullRequests from "../components/PullRequests";
import ZonesPanel from "../components/ZonesPanel";
import { getDashboardMetrics, getProjects, getLatestSprint } from "../lib/queries";

export default async function DashboardPage() {
  // Fetch the first project and its latest sprint for context
  const projects = await getProjects();
  const project = projects[0] ?? null;
  const sprint = project ? await getLatestSprint(project.id) : null;

  // Real metric counts from Supabase
  const { totalCommits, openPRs, doneTasks, totalTasks, sprintPct } =
    await getDashboardMetrics(project?.id);

  const sprintLabel = sprint ? `${sprint.name} — Overview` : "Overview";

  const metrics = [
    {
      label: "Commits",
      value: String(totalCommits),
      sub: "total commits",
      delta: "↑ live",
      deltaUp: true,
      barPct: Math.min(100, Math.round((totalCommits / Math.max(totalCommits, 200)) * 100)),
      barColor: "linear-gradient(90deg,#1a3060,#4a9eff)",
    },
    {
      label: "Open PRs",
      value: String(openPRs),
      sub: "awaiting review",
      delta: openPRs > 0 ? "↑ active" : "— clear",
      deltaUp: openPRs > 0,
      barPct: Math.min(100, openPRs * 10),
      barColor: "linear-gradient(90deg,#052210,#22c55e)",
    },
    {
      label: "Tasks Done",
      value: `${doneTasks}/${totalTasks}`,
      sub: "this sprint",
      delta: `${sprintPct}%`,
      deltaUp: sprintPct >= 50,
      barPct: sprintPct,
      barColor: "linear-gradient(90deg,#1f1500,#f59e0b)",
    },
    {
      label: "Sprint",
      value: `${sprintPct}%`,
      sub: sprint?.name ?? "no sprint",
      delta: sprintPct >= 75 ? "↑ on track" : sprintPct >= 40 ? "— in progress" : "↓ early",
      deltaUp: sprintPct >= 50,
      barPct: sprintPct,
      barColor: "linear-gradient(90deg,#200520,#a855f7)",
    },
  ];

  const now = new Date();
  const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="p-7 min-h-screen">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <div
            className="text-[11px] text-[#4a9eff] tracking-[3px] uppercase mb-1"
            style={{ fontFamily: "var(--font-space-mono)" }}
          >
            // team dashboard
          </div>
          <div className="text-[20px] font-semibold text-[#e8f0ff]">
            {sprintLabel}
          </div>
        </div>
        <div className="flex gap-2.5 items-center">
          <div
            className="bg-[#0d1a30] border border-[#1a2540] rounded-full px-3.5 py-1.5 text-[12px] text-[#6b7fa3] flex items-center gap-1.5"
            style={{ fontFamily: "var(--font-space-mono)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shadow-[0_0_6px_#22c55e]" />
            Live sync
          </div>
          <div
            className="bg-[#0d1a30] border border-[#1a2540] rounded-full px-3.5 py-1.5 text-[12px] text-[#6b7fa3]"
            style={{ fontFamily: "var(--font-space-mono)" }}
          >
            ⌘ {monthLabel}
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* Mid row */}
      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "1.4fr 1fr 1fr" }}>
        <CommitChart />
        <SprintProgress projectId={project?.id} />
        <TeamPanel />
      </div>

      {/* Bottom row */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1.2fr 1fr 0.9fr" }}>
        <RecentCommits />
        <PullRequests />
        <ZonesPanel />
      </div>
    </div>
  );
}
