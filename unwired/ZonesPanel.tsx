import { getTeamMembers } from '../../lib/queries';

// Zone status cycles through these in member order
const zoneStatusDefs = [
  { status: 'live',   bg: '#052210', color: '#22c55e', border: '#0a3a1a' },
  { status: 'active', bg: '#0d1a30', color: '#4a9eff', border: '#1a3060' },
  { status: 'live',   bg: '#052210', color: '#22c55e', border: '#0a3a1a' },
  { status: 'wip',    bg: '#1f1500', color: '#f59e0b', border: '#3a2800' },
  { status: 'idle',   bg: '#1a0808', color: '#ef4444', border: '#3a1010' },
];

export default async function ZonesPanel() {
  const teamMembers = await getTeamMembers();

  return (
    <div className="bg-[#0a0f1e] border border-[#1a2540] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[14px] font-medium text-[#e8f0ff]">Zones</div>
        <span
          className="text-[11px] text-[#3d5278]"
          style={{ fontFamily: 'var(--font-space-mono)' }}
        >
          {teamMembers.length} areas
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {teamMembers.map((m, i) => {
          const zs = zoneStatusDefs[i % zoneStatusDefs.length];
          return (
            <div
              key={m.id}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
              style={{ background: '#0d1222' }}
            >
              <div
                className="w-[26px] h-[26px] rounded flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
                style={{ background: m.avatar_color.bg, color: m.avatar_color.text }}
              >
                {m.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-[#c8d6f0] truncate">{m.zone}</div>
                <div className="text-[11px] text-[#3d5278]">{m.name}</div>
              </div>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                style={{
                  background: zs.bg,
                  color: zs.color,
                  border: `1px solid ${zs.border}`,
                  fontFamily: 'var(--font-space-mono)',
                }}
              >
                {zs.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
