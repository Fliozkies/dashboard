import { getRecentCommits } from '../lib/queries';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default async function RecentCommits() {
  const commits = await getRecentCommits(undefined, 5);

  return (
    <div className="bg-[#0a0f1e] border border-[#1a2540] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[14px] font-medium text-[#e8f0ff]">Recent commits</div>
        <span
          className="text-[10px] px-2 py-0.5 rounded"
          style={{
            background: '#0a1428',
            color: '#4a9eff',
            border: '1px solid #1a3060',
            fontFamily: 'var(--font-space-mono)',
          }}
        >
          main
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {commits.map((c) => (
          <div
            key={c.id}
            className="flex items-start gap-2.5 p-2.5 rounded-lg"
            style={{ background: '#0d1222', border: '1px solid #131d32' }}
          >
            <span
              className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
              style={{
                fontFamily: 'var(--font-space-mono)',
                color: '#4a9eff',
                background: '#0a1428',
              }}
            >
              {c.hash.slice(0, 6)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-[#8899b8] leading-snug">{c.message}</div>
              <div
                className="text-[11px] text-[#3d5278] mt-0.5"
                style={{ fontFamily: 'var(--font-space-mono)' }}
              >
                {c.author?.name ?? 'Unknown'} · {c.branch}
              </div>
            </div>
            <div
              className="text-[10px] text-[#2d3d5a] flex-shrink-0"
              style={{ fontFamily: 'var(--font-space-mono)' }}
            >
              {timeAgo(c.created_at)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
