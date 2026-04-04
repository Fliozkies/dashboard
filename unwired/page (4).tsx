'use client';
import { useState, useEffect } from 'react';
import { supabase, DbUser, DbCommit, DbPullRequest, DbTask } from '../../../lib/supabase';
import { getTeamMembers, getRecentCommits, getPullRequests, getProjects, getTasksBySprint, getSprintsByProject } from '../../../lib/queries';

// ── Bar chart (pure CSS) ──────────────────────────────────

function BarChart({ data, labels, color, height = 100 }: {
  data: number[];
  labels: string[];
  color: string;
  height?: number;
}) {
  const max = Math.max(...data, 1);
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-t transition-all duration-700 cursor-default hover:opacity-75"
            style={{ height: `${Math.max((v / max) * 100, 4)}%`, background: i === data.length - 1 ? color : color + '55' }}
            title={`${labels[i]}: ${v}`}
          />
        ))}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {labels.map((l, i) => (
          <div key={i} className="flex-1 text-center text-[9px] text-[#2d3d5a]" style={{ fontFamily: 'var(--font-space-mono)' }}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Burndown line chart (SVG) ─────────────────────────────

function BurndownChart({ total, completed }: { total: number; completed: number }) {
  const days = 14;
  const w = 400;
  const h = 120;
  const pad = { t: 10, r: 10, b: 24, l: 30 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;

  // Ideal: linear from total → 0
  const ideal = Array.from({ length: days + 1 }, (_, i) => total - (total / days) * i);
  // Actual: slightly above ideal with noise
  const actual = Array.from({ length: days + 1 }, (_, i) => {
    if (i === 0) return total;
    const idealPt = total - (total / days) * i;
    return Math.max(0, idealPt + (Math.random() - 0.3) * (total * 0.08));
  });

  const xScale = (i: number) => pad.l + (i / days) * iw;
  const yScale = (v: number) => pad.t + ih - (v / total) * ih;

  const toPath = (pts: number[]) =>
    pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(v)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(pct => (
        <line key={pct}
          x1={pad.l} y1={pad.t + ih * (1 - pct)}
          x2={pad.l + iw} y2={pad.t + ih * (1 - pct)}
          stroke="#1a2540" strokeWidth="0.5"
        />
      ))}
      {/* Ideal line */}
      <path d={toPath(ideal)} fill="none" stroke="#3d5278" strokeWidth="1" strokeDasharray="4 3" />
      {/* Actual line */}
      <path d={toPath(actual)} fill="none" stroke="#4a9eff" strokeWidth="1.5" />
      {/* Dots */}
      {actual.map((v, i) => (
        <circle key={i} cx={xScale(i)} cy={yScale(v)} r={2} fill="#4a9eff" />
      ))}
      {/* Axis labels */}
      <text x={pad.l} y={h - 6} fill="#2d3d5a" fontSize={8} fontFamily="monospace">Day 1</text>
      <text x={pad.l + iw} y={h - 6} fill="#2d3d5a" fontSize={8} fontFamily="monospace" textAnchor="end">Day {days}</text>
      <text x={pad.l - 4} y={pad.t + 4} fill="#2d3d5a" fontSize={8} fontFamily="monospace" textAnchor="end">{total}</text>
      <text x={pad.l - 4} y={pad.t + ih} fill="#2d3d5a" fontSize={8} fontFamily="monospace" textAnchor="end">0</text>
    </svg>
  );
}

// ── Main page ─────────────────────────────────────────────

interface MemberStats {
  member: DbUser;
  commits: number;
  prs: number;
  tasksDone: number;
  points: number;
}

export default function ReportsPage() {
  const [members, setMembers] = useState<DbUser[]>([]);
  const [stats, setStats] = useState<MemberStats[]>([]);
  const [totalPts, setTotalPts] = useState(0);
  const [donePts, setDonePts] = useState(0);
  const [loading, setLoading] = useState(true);

  // Velocity: story points completed per sprint (mock with real data fallback)
  const velocityLabels = ['S2', 'S3', 'S4', 'S5', 'S6', 'S7'];
  const velocityData = [38, 45, 41, 52, 48, donePts || 55];

  useEffect(() => {
    async function init() {
      const [m, commits, prs, projects] = await Promise.all([
        getTeamMembers(),
        getRecentCommits(undefined, 200),
        getPullRequests(undefined, 100),
        getProjects(),
      ]);

      let tasks: DbTask[] = [];
      if (projects.length > 0) {
        const sprintList = await getSprintsByProject(projects[0].id);
        if (sprintList.length > 0) {
          tasks = await getTasksBySprint(sprintList[0].id);
        }
      }

      const tp = tasks.reduce((a, t) => a + t.points, 0);
      const dp = tasks.filter(t => t.status === 'done').reduce((a, t) => a + t.points, 0);
      setTotalPts(tp);
      setDonePts(dp);

      const memberStats: MemberStats[] = m.map(member => ({
        member,
        commits: commits.filter(c => c.author_id === member.id).length,
        prs: prs.filter(p => p.author_id === member.id).length,
        tasksDone: tasks.filter(t => t.assignee_id === member.id && t.status === 'done').length,
        points: tasks.filter(t => t.assignee_id === member.id).reduce((a, t) => a + t.points, 0),
      }));

      setMembers(m);
      setStats(memberStats);
      setLoading(false);
    }
    init();
  }, []);

  function exportCSV() {
    const header = ['Name', 'Role', 'Commits', 'PRs', 'Tasks Done', 'Points'];
    const rows = stats.map(s => [s.member.name, s.member.role, s.commits, s.prs, s.tasksDone, s.points]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'orbitdev-sprint-report.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    window.print();
  }

  return (
    <div className="p-7">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-[11px] text-[#4a9eff] tracking-[3px] uppercase mb-1" style={{ fontFamily: 'var(--font-space-mono)' }}>
            // reports
          </div>
          <div className="text-[20px] font-semibold text-[#e8f0ff]">Reports</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="text-[11px] px-3 py-1.5 rounded border border-[#1a3060] text-[#4a9eff] hover:bg-[#0d1a30] transition-all cursor-pointer"
            style={{ fontFamily: 'var(--font-space-mono)' }}
          >
            ↓ CSV
          </button>
          <button
            onClick={exportPDF}
            className="text-[11px] px-3 py-1.5 rounded border border-[#0a3a1a] text-[#22c55e] hover:bg-[#052210] transition-all cursor-pointer"
            style={{ fontFamily: 'var(--font-space-mono)' }}
          >
            ↓ PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-[12px] text-[#3d5278]" style={{ fontFamily: 'var(--font-space-mono)' }}>loading…</div>
      ) : (
        <>
          {/* Charts row */}
          <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {/* Velocity */}
            <div className="bg-[#0a0f1e] border border-[#1a2540] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[13px] font-medium text-[#e8f0ff]">Velocity</div>
                <span className="text-[10px] text-[#3d5278]" style={{ fontFamily: 'var(--font-space-mono)' }}>story pts / sprint</span>
              </div>
              <BarChart data={velocityData} labels={velocityLabels} color="#4a9eff" height={120} />
            </div>

            {/* Burndown */}
            <div className="bg-[#0a0f1e] border border-[#1a2540] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[13px] font-medium text-[#e8f0ff]">Burndown</div>
                <div className="flex items-center gap-3 text-[10px]" style={{ fontFamily: 'var(--font-space-mono)' }}>
                  <span className="flex items-center gap-1"><span className="inline-block w-4 border-b border-dashed border-[#3d5278]" /> ideal</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-4 border-b border-[#4a9eff]" /> actual</span>
                </div>
              </div>
              <BurndownChart total={totalPts || 80} completed={donePts || 45} />
            </div>
          </div>

          {/* Contribution table */}
          <div className="bg-[#0a0f1e] border border-[#1a2540] rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#1a2540] flex items-center justify-between">
              <div className="text-[13px] font-medium text-[#e8f0ff]">Member Contributions</div>
              <span className="text-[10px] text-[#3d5278]" style={{ fontFamily: 'var(--font-space-mono)' }}>current sprint</span>
            </div>
            <div
              className="grid text-[10px] text-[#3d5278] px-5 py-2.5 border-b border-[#1a2540]"
              style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', fontFamily: 'var(--font-space-mono)' }}
            >
              <span>MEMBER</span>
              <span className="text-right">COMMITS</span>
              <span className="text-right">PRs MERGED</span>
              <span className="text-right">TASKS DONE</span>
              <span className="text-right">POINTS</span>
            </div>
            {stats.length === 0 && (
              <div className="px-5 py-6 text-center text-[11px] text-[#2d3d5a]" style={{ fontFamily: 'var(--font-space-mono)' }}>
                no data — add users, sprints, and tasks in Supabase
              </div>
            )}
            {stats.map((s, i) => (
              <div
                key={s.member.id}
                className={`grid items-center px-5 py-3.5 ${i < stats.length - 1 ? 'border-b border-[#0f1828]' : ''} hover:bg-[#0d1222] transition-colors`}
                style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
                    style={{ background: s.member.avatar_color.bg, color: s.member.avatar_color.text }}
                  >
                    {s.member.initials}
                  </div>
                  <div>
                    <div className="text-[12px] text-[#c8d6f0]">{s.member.name}</div>
                    <div className="text-[10px] text-[#3d5278]">{s.member.role}</div>
                  </div>
                </div>
                <div className="text-right text-[13px] font-semibold text-[#4a9eff]" style={{ fontFamily: 'var(--font-space-mono)' }}>{s.commits}</div>
                <div className="text-right text-[13px] font-semibold text-[#22c55e]" style={{ fontFamily: 'var(--font-space-mono)' }}>{s.prs}</div>
                <div className="text-right text-[13px] font-semibold text-[#a855f7]" style={{ fontFamily: 'var(--font-space-mono)' }}>{s.tasksDone}</div>
                <div className="text-right text-[13px] font-semibold text-[#f59e0b]" style={{ fontFamily: 'var(--font-space-mono)' }}>{s.points}</div>
              </div>
            ))}
            {/* Totals row */}
            {stats.length > 0 && (
              <div
                className="grid items-center px-5 py-3 border-t border-[#1a2540] bg-[#0d1222]"
                style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' }}
              >
                <div className="text-[10px] text-[#3d5278]" style={{ fontFamily: 'var(--font-space-mono)' }}>TOTAL</div>
                <div className="text-right text-[12px] font-bold text-[#4a9eff]" style={{ fontFamily: 'var(--font-space-mono)' }}>
                  {stats.reduce((a, s) => a + s.commits, 0)}
                </div>
                <div className="text-right text-[12px] font-bold text-[#22c55e]" style={{ fontFamily: 'var(--font-space-mono)' }}>
                  {stats.reduce((a, s) => a + s.prs, 0)}
                </div>
                <div className="text-right text-[12px] font-bold text-[#a855f7]" style={{ fontFamily: 'var(--font-space-mono)' }}>
                  {stats.reduce((a, s) => a + s.tasksDone, 0)}
                </div>
                <div className="text-right text-[12px] font-bold text-[#f59e0b]" style={{ fontFamily: 'var(--font-space-mono)' }}>
                  {stats.reduce((a, s) => a + s.points, 0)}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
