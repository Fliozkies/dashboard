import { getTeamMembers } from '../lib/queries';

const statusStyles = {
  active: { dot: '#22c55e', text: 'text-[#22c55e]', label: 'active' },
  away: { dot: '#3d5278', text: 'text-[#3d5278]', label: 'away' },
  offline: { dot: '#3d5278', text: 'text-[#3d5278]', label: 'offline' },
};

export default async function TeamPanel() {
  const teamMembers = await getTeamMembers();
  const activeCount = teamMembers.filter((m) => m.status === 'active').length;

  return (
    <div className="bg-[#0a0f1e] border border-[#1a2540] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[14px] font-medium text-[#e8f0ff]">Team online</div>
        <span
          className="text-[11px] text-[#22c55e]"
          style={{ fontFamily: 'var(--font-space-mono)' }}
        >
          {activeCount} active
        </span>
      </div>
      <div className="flex flex-col">
        {teamMembers.map((m, i) => {
          const s = statusStyles[m.status];
          return (
            <div
              key={m.id}
              className={`flex items-center gap-3 py-2.5 ${i < teamMembers.length - 1 ? 'border-b border-[#0f1828]' : ''}`}
            >
              <div
                className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[12px] font-semibold flex-shrink-0"
                style={{ background: m.avatar_color.bg, color: m.avatar_color.text }}
              >
                {m.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-[#c8d6f0] font-medium">{m.name}</div>
                <div className="text-[11px] text-[#3d5278]">{m.role}</div>
              </div>
              <div
                className={`flex items-center gap-1.5 text-[11px] ${s.text}`}
                style={{ fontFamily: 'var(--font-space-mono)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
                {s.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
