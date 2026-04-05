'use client';
import { useState, useEffect } from 'react';
import { supabase, DbTask, DbUser } from '../../lib/supabase';
import { getTasksBySprint, updateTaskStatus, createTask, getSprintsByProject, getProjects, createSprint, createSprintZones } from '../../lib/queries';

type Column = { id: DbTask['status']; label: string; color: string };

const COLUMNS: Column[] = [
  { id: 'backlog', label: 'Backlog', color: '#3d5278' },
  { id: 'in_progress', label: 'In Progress', color: '#4a9eff' },
  { id: 'in_review', label: 'In Review', color: '#f59e0b' },
  { id: 'done', label: 'Done', color: '#22c55e' },
];

const PRIORITY_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  P0: { bg: '#2a0808', color: '#ef4444', border: '#5a1010' },
  P1: { bg: '#1f1500', color: '#f59e0b', border: '#3a2800' },
  P2: { bg: '#0d1a30', color: '#4a9eff', border: '#1a3060' },
};

const ZONE_COLORS: Record<string, string> = {
  Frontend: '#4a9eff',
  Backend: '#a855f7',
  Database: '#22c55e',
  Auth: '#f59e0b',
  DevOps: '#ef4444',
};

function TaskCard({ task, onMove }: { task: DbTask; onMove: (id: string, status: DbTask['status']) => void }) {
  const p = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.P2;
  const zoneColor = task.zone ? (ZONE_COLORS[task.zone] ?? '#3d5278') : '#3d5278';

  const moveTo = COLUMNS.filter(c => c.id !== task.status);

  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-2 border group"
      style={{ background: '#0d1222', borderColor: '#1a2540' }}
    >
      <div className="text-[12px] text-[#c8d6f0] leading-snug">{task.title}</div>
      <div className="flex flex-wrap gap-1.5 items-center">
        <span
          className="text-[9px] px-1.5 py-0.5 rounded"
          style={{ background: p.bg, color: p.color, border: `1px solid ${p.border}`, fontFamily: 'var(--font-space-mono)' }}
        >
          {task.priority}
        </span>
        {task.zone && (
          <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: zoneColor, background: zoneColor + '18', fontFamily: 'var(--font-space-mono)' }}>
            {task.zone}
          </span>
        )}
        <span className="ml-auto text-[10px] text-[#3d5278]" style={{ fontFamily: 'var(--font-space-mono)' }}>
          {task.points}pt
        </span>
        {task.assignee && (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-semibold flex-shrink-0"
            style={{ background: task.assignee.avatar_color.bg, color: task.assignee.avatar_color.text }}
            title={task.assignee.name}
          >
            {task.assignee.initials}
          </div>
        )}
      </div>
      {/* Quick move buttons */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {moveTo.map(col => (
          <button
            key={col.id}
            onClick={() => onMove(task.id, col.id)}
            className="text-[9px] px-1.5 py-0.5 rounded border cursor-pointer transition-all hover:opacity-80"
            style={{ borderColor: col.color + '44', color: col.color, background: col.color + '11', fontFamily: 'var(--font-space-mono)' }}
          >
            → {col.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface AddTaskFormProps {
  sprintId: string;
  status: DbTask['status'];
  currentUser: DbUser | null;
  onAdd: (task: DbTask) => void;
  onClose: () => void;
}

function AddTaskForm({ sprintId, status, currentUser, onAdd, onClose }: AddTaskFormProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'P0' | 'P1' | 'P2'>('P2');
  const [zone, setZone] = useState('Frontend');
  const [points, setPoints] = useState(1);

  async function handleSubmit() {
    if (!title.trim()) return;
    const task = await createTask({
      sprint_id: sprintId,
      title: title.trim(),
      status,
      assignee_id: currentUser?.id ?? null,
      zone,
      priority,
      points,
    });
    if (task) onAdd({ ...task, assignee: currentUser ?? undefined });
    onClose();
  }

  return (
    <div className="rounded-lg border p-3 flex flex-col gap-2" style={{ background: '#0a0f1e', borderColor: '#4a9eff44' }}>
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose(); }}
        placeholder="Task title…"
        className="text-[12px] px-2 py-1.5 rounded bg-[#0d1222] border border-[#1a2540] text-[#c8d6f0] placeholder:text-[#2d3d5a] outline-none focus:border-[#4a9eff] w-full"
        style={{ fontFamily: 'var(--font-space-mono)' }}
      />
      <div className="flex gap-1.5 flex-wrap">
        {(['P0', 'P1', 'P2'] as const).map(p => {
          const s = PRIORITY_STYLES[p];
          return (
            <button key={p} onClick={() => setPriority(p)} className="text-[9px] px-1.5 py-0.5 rounded border cursor-pointer transition-all"
              style={{ background: priority === p ? s.bg : 'transparent', color: s.color, borderColor: priority === p ? s.color : '#1a2540', fontFamily: 'var(--font-space-mono)' }}>
              {p}
            </button>
          );
        })}
        <select
          value={zone}
          onChange={e => setZone(e.target.value)}
          className="text-[9px] px-1.5 py-0.5 rounded bg-[#0d1222] border border-[#1a2540] text-[#8899b8] outline-none cursor-pointer"
          style={{ fontFamily: 'var(--font-space-mono)' }}
        >
          {Object.keys(ZONE_COLORS).map(z => <option key={z}>{z}</option>)}
        </select>
        <input
          type="number" min={1} max={13} value={points}
          onChange={e => setPoints(parseInt(e.target.value) || 1)}
          className="w-12 text-[9px] px-1.5 py-0.5 rounded bg-[#0d1222] border border-[#1a2540] text-[#8899b8] outline-none"
          style={{ fontFamily: 'var(--font-space-mono)' }}
          title="Story points"
        />
      </div>
      <div className="flex gap-1.5">
        <button onClick={onClose} className="flex-1 text-[10px] py-1 rounded border border-[#1a2540] text-[#3d5278] hover:text-[#c8d6f0] transition-all cursor-pointer">cancel</button>
        <button onClick={handleSubmit} className="flex-1 text-[10px] py-1 rounded border border-[#1a3060] text-[#4a9eff] hover:bg-[#0d1a30] transition-all cursor-pointer">add task</button>
      </div>
    </div>
  );
}

function NewSprintModal({ projectId, nextNumber, onClose, onCreated }: {
  projectId: string;
  nextNumber: number;
  onClose: () => void;
  onCreated: (sprint: { id: string; name: string; number: number }) => void;
}) {
  const [name, setName] = useState(`Sprint ${nextNumber}`);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) { setError('Sprint name is required.'); return; }
    setSaving(true);
    setError(null);
    const sprint = await createSprint({
      project_id: projectId,
      name: name.trim(),
      number: nextNumber,
      start_date: startDate || null,
      end_date: endDate || null,
    });
    if (!sprint) { setError('Failed to create sprint.'); setSaving(false); return; }
    await createSprintZones(sprint.id);
    onCreated({ id: sprint.id, name: sprint.name, number: sprint.number });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div className="bg-[#0a0f1e] border border-[#1a2540] rounded-xl p-6 w-[420px] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="text-[11px] text-[#4a9eff] tracking-[3px] uppercase mb-1" style={{ fontFamily: 'var(--font-space-mono)' }}>// new sprint</div>
        <div className="text-[16px] font-semibold text-[#e8f0ff] mb-5">Create Sprint</div>
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-[11px] text-[#3d5278] mb-1.5" style={{ fontFamily: 'var(--font-space-mono)' }}>sprint name <span className="text-[#ef4444]">*</span></div>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full text-[12px] px-3 py-2 rounded-lg bg-[#0d1222] border border-[#1a2540] text-[#c8d6f0] placeholder:text-[#2d3d5a] outline-none focus:border-[#4a9eff]"
              style={{ fontFamily: 'var(--font-space-mono)' }} />
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <div className="text-[11px] text-[#3d5278] mb-1.5" style={{ fontFamily: 'var(--font-space-mono)' }}>start date</div>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full text-[12px] px-3 py-2 rounded-lg bg-[#0d1222] border border-[#1a2540] text-[#c8d6f0] outline-none focus:border-[#4a9eff]"
                style={{ fontFamily: 'var(--font-space-mono)', colorScheme: 'dark' }} />
            </div>
            <div>
              <div className="text-[11px] text-[#3d5278] mb-1.5" style={{ fontFamily: 'var(--font-space-mono)' }}>end date</div>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full text-[12px] px-3 py-2 rounded-lg bg-[#0d1222] border border-[#1a2540] text-[#c8d6f0] outline-none focus:border-[#4a9eff]"
                style={{ fontFamily: 'var(--font-space-mono)', colorScheme: 'dark' }} />
            </div>
          </div>
          {error && <div className="text-[11px] text-[#ef4444] px-3 py-2 rounded-lg" style={{ background: '#2a0808', border: '1px solid #5a1010' }}>{error}</div>}
          <div className="flex gap-2 mt-2">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg text-[12px] text-[#3d5278] border border-[#1a2540] hover:text-[#c8d6f0] transition-all cursor-pointer">cancel</button>
            <button onClick={handleCreate} disabled={saving} className="flex-1 py-2 rounded-lg text-[12px] font-medium text-[#4a9eff] border border-[#1a3060] hover:bg-[#0d1a30] transition-all cursor-pointer disabled:opacity-50">
              {saving ? 'creating…' : '+ create sprint'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SprintsPage() {
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [sprintId, setSprintId] = useState<string | null>(null);
  const [sprints, setSprints] = useState<{ id: string; name: string; number: number }[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<DbUser | null>(null);
  const [addingTo, setAddingTo] = useState<DbTask['status'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewSprint, setShowNewSprint] = useState(false);

  useEffect(() => {
    async function init() {
      // Get current user
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        const { data: u } = await supabase.from('users').select('*').eq('auth_id', authData.user.id).single();
        if (u) setCurrentUser(u as DbUser);
      }
      // Get first project's sprints
      const projects = await getProjects();
      if (projects.length > 0) {
        setProjectId(projects[0].id);
        const sprintList = await getSprintsByProject(projects[0].id);
        setSprints(sprintList);
        if (sprintList.length > 0) {
          setSprintId(sprintList[0].id);
          const t = await getTasksBySprint(sprintList[0].id);
          setTasks(t);
        }
      }
      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (!sprintId) return;
    getTasksBySprint(sprintId).then(setTasks);
    const ch = supabase.channel(`tasks:${sprintId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `sprint_id=eq.${sprintId}` },
        () => getTasksBySprint(sprintId).then(setTasks))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sprintId]);

  async function handleMove(taskId: string, newStatus: DbTask['status']) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    await updateTaskStatus(taskId, newStatus);
  }

  function handleAdd(task: DbTask) {
    setTasks(prev => [...prev, task]);
  }

  const totalPts = tasks.reduce((a, t) => a + t.points, 0);
  const donePts = tasks.filter(t => t.status === 'done').reduce((a, t) => a + t.points, 0);
  const currentSprint = sprints.find(s => s.id === sprintId);

  return (
    <div className="p-7 min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[11px] text-[#4a9eff] tracking-[3px] uppercase mb-1" style={{ fontFamily: 'var(--font-space-mono)' }}>
            // sprints
          </div>
          <div className="text-[20px] font-semibold text-[#e8f0ff]">Sprint Board</div>
        </div>
        <div className="flex items-center gap-2">
          {/* Sprint selector */}
          {sprints.length > 0 && (
            <div className="flex gap-1">
              {sprints.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSprintId(s.id)}
                  className={`text-[11px] px-3 py-1.5 rounded border transition-all cursor-pointer ${s.id === sprintId ? 'bg-[#0d1a30] text-[#4a9eff] border-[#1a3060]' : 'text-[#3d5278] border-[#1a2540] hover:text-[#6b7fa3]'}`}
                  style={{ fontFamily: 'var(--font-space-mono)' }}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
          {projectId && (
            <button
              onClick={() => setShowNewSprint(true)}
              className="text-[11px] px-3 py-1.5 rounded border border-[#1a3060] text-[#4a9eff] hover:bg-[#0d1a30] transition-all cursor-pointer"
              style={{ fontFamily: 'var(--font-space-mono)' }}
            >
              + new sprint
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {!loading && sprintId && (
        <div className="flex gap-4 mb-5 pb-5 border-b border-[#1a2540]">
          {[
            { label: 'Total points', value: totalPts, color: '#e8f0ff' },
            { label: 'Completed', value: donePts, color: '#22c55e' },
            { label: 'Velocity', value: `${totalPts > 0 ? Math.round((donePts / totalPts) * 100) : 0}%`, color: '#4a9eff' },
            { label: 'Tasks', value: tasks.length, color: '#c8d6f0' },
          ].map(stat => (
            <div key={stat.label} className="bg-[#0a0f1e] border border-[#1a2540] rounded-lg px-4 py-2.5">
              <div className="text-[10px] text-[#3d5278]" style={{ fontFamily: 'var(--font-space-mono)' }}>{stat.label}</div>
              <div className="text-[18px] font-semibold mt-0.5" style={{ color: stat.color, fontFamily: 'var(--font-space-mono)' }}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-[12px] text-[#3d5278]" style={{ fontFamily: 'var(--font-space-mono)' }}>loading…</div>
      ) : !sprintId ? (
        <div className="text-center py-16 text-[#2d3d5a]" style={{ fontFamily: 'var(--font-space-mono)' }}>
          <div className="text-[32px] mb-3 opacity-30">⬡</div>
          <div className="text-[12px]">no sprints yet</div>
          {projectId && (
            <button
              onClick={() => setShowNewSprint(true)}
              className="mt-3 text-[11px] px-3 py-1.5 rounded border border-[#1a3060] text-[#4a9eff] hover:bg-[#0d1a30] transition-all cursor-pointer"
            >
              + create your first sprint
            </button>
          )}
        </div>
      ) : (
        /* Kanban board */
        <div className="grid gap-4 flex-1" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.id);
            return (
              <div key={col.id} className="flex flex-col gap-3">
                {/* Column header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                    <span className="text-[12px] font-medium text-[#c8d6f0]">{col.label}</span>
                  </div>
                  <span className="text-[11px]" style={{ color: col.color, fontFamily: 'var(--font-space-mono)' }}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Tasks */}
                <div className="flex flex-col gap-2 min-h-[200px]">
                  {colTasks.map(task => (
                    <TaskCard key={task.id} task={task} onMove={handleMove} />
                  ))}

                  {addingTo === col.id ? (
                    <AddTaskForm
                      sprintId={sprintId}
                      status={col.id}
                      currentUser={currentUser}
                      onAdd={handleAdd}
                      onClose={() => setAddingTo(null)}
                    />
                  ) : (
                    <button
                      onClick={() => setAddingTo(col.id)}
                      className="text-[11px] text-[#2d3d5a] hover:text-[#4a9eff] transition-colors text-left px-1 py-1 cursor-pointer"
                      style={{ fontFamily: 'var(--font-space-mono)' }}
                    >
                      + add task
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNewSprint && projectId && (
        <NewSprintModal
          projectId={projectId}
          nextNumber={sprints.length + 1}
          onClose={() => setShowNewSprint(false)}
          onCreated={(sprint) => {
            setSprints(prev => [sprint, ...prev]);
            setSprintId(sprint.id);
            setTasks([]);
          }}
        />
      )}
    </div>
  );
}