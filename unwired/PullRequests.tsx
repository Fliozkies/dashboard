import { getPullRequests } from '../../lib/queries';

const statusConfig = {
  open:   { bg: '#0d1a30', color: '#4a9eff', border: '#1a3060', borderLeft: '#4a9eff' },
  merged: { bg: '#052210', color: '#22c55e', border: '#0a3a1a', borderLeft: '#22c55e' },
  review: { bg: '#1f1500', color: '#f59e0b', border: '#3a2800', borderLeft: '#f59e0b' },
};

export default async function PullRequests() {
  const prs = await getPullRequests(undefined, 5);
  const openCount = prs.filter((p) => p.status === 'open' || p.status === 'review').length;

  return (
    <div className="bg-[#0a0f1e] border border-[#1a2540] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[14px] font-medium text-[#e8f0ff]">Pull requests</div>
        <span
          className="text-[11px] text-[#f59e0b]"
          style={{ fontFamily: 'var(--font-space-mono)' }}
        >
          {openCount} open
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {prs.map((pr) => {
          const s = statusConfig[pr.status];
          return (
            <div
              key={pr.id}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg"
              style={{
                background: '#0d1222',
                borderLeft: `3px solid ${s.borderLeft}`,
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-[#c8d6f0] leading-snug">{pr.title}</div>
                <div
                  className="text-[10px] text-[#3d5278] mt-0.5"
                  style={{ fontFamily: 'var(--font-space-mono)' }}
                >
                  {pr.author?.name ?? 'Unknown'} → {pr.target_branch}
                </div>
              </div>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                style={{
                  background: s.bg,
                  color: s.color,
                  border: `1px solid ${s.border}`,
                  fontFamily: 'var(--font-space-mono)',
                }}
              >
                {pr.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
