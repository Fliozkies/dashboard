import { getLatestSprint, getSprintZones } from '../lib/queries';

// Fallback zone data if DB is empty
const fallbackZones = [
  { id: '1', sprint_id: '', label: 'Frontend', pct: 0, color: '#4a9eff' },
  { id: '2', sprint_id: '', label: 'Backend', pct: 0, color: '#22c55e' },
  { id: '3', sprint_id: '', label: 'Database', pct: 0, color: '#a855f7' },
  { id: '4', sprint_id: '', label: 'Auth', pct: 0, color: '#f59e0b' },
  { id: '5', sprint_id: '', label: 'DevOps', pct: 0, color: '#ef4444' },
];

interface Props {
  projectId?: string;
}

export default async function SprintProgress({ projectId }: Props) {
  let zones = fallbackZones;
  let sprintName = 'Sprint';

  if (projectId) {
    const sprint = await getLatestSprint(projectId);
    if (sprint) {
      sprintName = sprint.name;
      const fetched = await getSprintZones(sprint.id);
      if (fetched.length > 0) zones = fetched;
    }
  }

  const overall = Math.round(zones.reduce((a, z) => a + z.pct, 0) / zones.length);

  // Calculate days remaining if we have a sprint
  const daysLeft = (() => {
    return null; // will be enriched when projectId is wired in
  })();

  return (
    <div className="bg-[#0a0f1e] border border-[#1a2540] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[14px] font-medium text-[#e8f0ff]">{sprintName} progress</div>
        <span
          className="text-[11px] text-[#3d5278]"
          style={{ fontFamily: 'var(--font-space-mono)' }}
        >
          {daysLeft !== null ? `${daysLeft} days left` : '—'}
        </span>
      </div>
      <div className="flex flex-col gap-[10px]">
        {zones.map((z) => (
          <div key={z.id} className="flex items-center gap-[10px]">
            <div className="text-[13px] text-[#8899b8] min-w-[72px]">{z.label}</div>
            <div className="flex-1 bg-[#0f1828] rounded h-2 overflow-hidden">
              <div
                className="h-full rounded transition-all duration-700"
                style={{ width: `${z.pct}%`, background: z.color }}
              />
            </div>
            <div
              className="text-[11px] text-[#4a9eff] min-w-[34px] text-right"
              style={{ fontFamily: 'var(--font-space-mono)' }}
            >
              {z.pct}%
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3.5 pt-3 border-t border-[#0f1828] flex justify-between items-center">
        <span className="text-[11px] text-[#3d5278]">Overall</span>
        <span
          className="text-[14px] text-[#4a9eff]"
          style={{ fontFamily: 'var(--font-space-mono)' }}
        >
          {overall}%
        </span>
      </div>
    </div>
  );
}
