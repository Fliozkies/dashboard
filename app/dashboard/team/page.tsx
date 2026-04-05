'use client';
import { useState, useEffect } from 'react';
import { DbUser, DbCommit, DbPullRequest } from '../../../lib/supabase';
import { getTeamMembers, getRecentCommits, getPullRequests, createUser } from '../../../lib/queries';
import { useAuth } from '../../components/AuthProvider';

// ── Activity heatmap (last 30 days from commits) ──────────

function ActivityHeatmap({ commits }: { commits: DbCommit[] }) {
  const days = 30;
  const counts: Record<string, number> = {};
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (days - 1 - i));
    counts[d.toISOString().slice(0, 10)] = 0;
  }
  for (const c of commits) {
    const k = c.created_at.slice(0, 10);
    if (k in counts) counts[k]++;
  }

  const values = Object.values(counts);
  const max = Math.max(...values, 1);

  const intensityColor = (n: number) => {
    if (n === 0) return '#0d1222';
    const pct = n / max;
    if (pct < 0.25) return '#0a1f3a';
    if (pct < 0.5)  return '#1a3060';
    if (pct < 0.75) return '#2a4a90';
    return '#4a9eff';
  };

  return (
    <div className="flex flex-wrap gap-[3px]">
      {Object.entries(counts).map(([date, count]) => (
        <div
          key={date}
          className="w-[14px] h-[14px] rounded-sm transition-colors"
          style={{ background: intensityColor(count) }}
          title={`${date}: ${count} commits`}
        />
      ))}
    </div>
  );
}

// ── Member profile card (expanded) ───────────────────────

function MemberProfile({ member, commits, prs, onBack }: {
  member: DbUser;
  commits: DbCommit[];
  prs: DbPullRequest[];
  onBack: () => void;
}) {
  const myCommits = commits.filter(c => c.author_id === member.id);
  const myPRs = prs.filter(p => p.author_id === member.id);

  return (
    <div className="p-7 max-w-[900px]">
      <button
        onClick={onBack}
        className="text-[11px] text-[#3d5278] hover:text-[#4a9eff] transition-colors mb-6 flex items-center gap-1.5"
        style={{ fontFamily: 'var(--font-space-mono)' }}
      >
        ← team
      </button>

      <div className="flex items-start gap-5 mb-8">
        <div
          className="w-[64px] h-[64px] rounded-full flex items-center justify-center text-[20px] font-bold flex-shrink-0"
          style={{ background: member.avatar_color.bg, color: member.avatar_color.text }}
        >
          {member.initials}
        </div>
        <div>
          <div className="text-[22px] font-semibold text-[#e8f0ff]">{member.name}</div>
          <div className="text-[13px] text-[#3d5278] mt-0.5">{member.role} · {member.zone}</div>
          <div className="flex items-center gap-2 mt-2">
            <span
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{
                background: member.status === 'active' ? '#052210' : '#1a0808',
                color: member.status === 'active' ? '#22c55e' : '#3d5278',
                border: `1px solid ${member.status === 'active' ? '#0a3a1a' : '#3a1010'}`,
                fontFamily: 'var(--font-space-mono)',
              }}
            >
              {member.status}
            </span>
          </div>
        </div>
        <div className="ml-auto flex gap-4">
          {[
            { label: 'Commits', val: myCommits.length, color: '#4a9eff' },
            { label: 'PRs', val: myPRs.length, color: '#22c55e' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-[24px] font-bold" style={{ color: stat.color, fontFamily: 'var(--font-space-mono)' }}>{stat.val}</div>
              <div className="text-[11px] text-[#3d5278]">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-[#0a0f1e] border border-[#1a2540] rounded-xl p-5 mb-4">
        <div className="text-[12px] font-medium text-[#e8f0ff] mb-3">Activity — last 30 days</div>
        <ActivityHeatmap commits={myCommits} />
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Recent commits */}
        <div className="bg-[#0a0f1e] border border-[#1a2540] rounded-xl p-5">
          <div className="text-[12px] font-medium text-[#e8f0ff] mb-3">Recent Commits</div>
          <div className="flex flex-col gap-2">
            {myCommits.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: '#0d1222' }}>
                <span className="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
                  style={{ fontFamily: 'var(--font-space-mono)', color: '#4a9eff', background: '#0a1428' }}>
                  {c.hash.slice(0, 6)}
                </span>
                <div className="text-[11px] text-[#8899b8] leading-snug truncate">{c.message}</div>
              </div>
            ))}
            {myCommits.length === 0 && <div className="text-[11px] text-[#2d3d5a]" style={{ fontFamily: 'var(--font-space-mono)' }}>no commits yet</div>}
          </div>
        </div>

        {/* Open PRs */}
        <div className="bg-[#0a0f1e] border border-[#1a2540] rounded-xl p-5">
          <div className="text-[12px] font-medium text-[#e8f0ff] mb-3">Pull Requests</div>
          <div className="flex flex-col gap-2">
            {myPRs.slice(0, 5).map(pr => (
              <div key={pr.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: '#0d1222' }}>
                <span className="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{
                    fontFamily: 'var(--font-space-mono)',
                    background: pr.status === 'merged' ? '#052210' : pr.status === 'review' ? '#1f1500' : '#0d1a30',
                    color: pr.status === 'merged' ? '#22c55e' : pr.status === 'review' ? '#f59e0b' : '#4a9eff',
                  }}>
                  {pr.status}
                </span>
                <div className="text-[11px] text-[#8899b8] truncate">{pr.title}</div>
              </div>
            ))}
            {myPRs.length === 0 && <div className="text-[11px] text-[#2d3d5a]" style={{ fontFamily: 'var(--font-space-mono)' }}>no PRs yet</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── New Member Modal ──────────────────────────────────────

const AVATAR_COLORS = [
  { bg: '#0a1f3a', text: '#4a9eff' },
  { bg: '#052210', text: '#22c55e' },
  { bg: '#200520', text: '#a855f7' },
  { bg: '#1f1500', text: '#f59e0b' },
  { bg: '#2a0808', text: '#ef4444' },
];

function NewMemberModal({ onClose, onCreated }: { onClose: () => void; onCreated: (u: DbUser) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [zone, setZone] = useState('');
  const [colorIdx, setColorIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  async function handleCreate() {
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!email.trim()) { setError('Email is required.'); return; }
    if (!role.trim()) { setError('Role is required.'); return; }
    if (!zone.trim()) { setError('Zone is required.'); return; }
    setSaving(true);
    setError(null);
    const user = await createUser({
      email: email.trim(),
      name: name.trim(),
      initials: initials || '?',
      role: role.trim(),
      zone: zone.trim(),
      avatar_color: AVATAR_COLORS[colorIdx],
      status: 'offline',
    });
    setSaving(false);
    if (!user) { setError('Failed to create member. Email may already exist.'); return; }
    onCreated(user as DbUser);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div className="bg-[#0a0f1e] border border-[#1a2540] rounded-xl p-6 w-[460px] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="text-[11px] text-[#4a9eff] tracking-[3px] uppercase mb-1" style={{ fontFamily: 'var(--font-space-mono)' }}>// new member</div>
        <div className="text-[16px] font-semibold text-[#e8f0ff] mb-5">Add Team Member</div>
        <div className="flex flex-col gap-3">
          {/* Avatar preview + color picker */}
          <div className="flex items-center gap-4 mb-1">
            <div className="w-[48px] h-[48px] rounded-full flex items-center justify-center text-[16px] font-bold flex-shrink-0"
              style={{ background: AVATAR_COLORS[colorIdx].bg, color: AVATAR_COLORS[colorIdx].text }}>
              {initials || '?'}
            </div>
            <div className="flex gap-1.5">
              {AVATAR_COLORS.map((c, i) => (
                <button key={i} onClick={() => setColorIdx(i)}
                  className="w-6 h-6 rounded-full border-2 transition-all cursor-pointer"
                  style={{ background: c.bg, borderColor: i === colorIdx ? c.text : 'transparent' }}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <div className="text-[11px] text-[#3d5278] mb-1.5" style={{ fontFamily: 'var(--font-space-mono)' }}>name <span className="text-[#ef4444]">*</span></div>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Kim Lee"
                className="w-full text-[12px] px-3 py-2 rounded-lg bg-[#0d1222] border border-[#1a2540] text-[#c8d6f0] placeholder:text-[#2d3d5a] outline-none focus:border-[#4a9eff]"
                style={{ fontFamily: 'var(--font-space-mono)' }} />
            </div>
            <div>
              <div className="text-[11px] text-[#3d5278] mb-1.5" style={{ fontFamily: 'var(--font-space-mono)' }}>email <span className="text-[#ef4444]">*</span></div>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="kim@team.com" type="email"
                className="w-full text-[12px] px-3 py-2 rounded-lg bg-[#0d1222] border border-[#1a2540] text-[#c8d6f0] placeholder:text-[#2d3d5a] outline-none focus:border-[#4a9eff]"
                style={{ fontFamily: 'var(--font-space-mono)' }} />
            </div>
            <div>
              <div className="text-[11px] text-[#3d5278] mb-1.5" style={{ fontFamily: 'var(--font-space-mono)' }}>role <span className="text-[#ef4444]">*</span></div>
              <input value={role} onChange={e => setRole(e.target.value)} placeholder="Frontend"
                className="w-full text-[12px] px-3 py-2 rounded-lg bg-[#0d1222] border border-[#1a2540] text-[#c8d6f0] placeholder:text-[#2d3d5a] outline-none focus:border-[#4a9eff]"
                style={{ fontFamily: 'var(--font-space-mono)' }} />
            </div>
            <div>
              <div className="text-[11px] text-[#3d5278] mb-1.5" style={{ fontFamily: 'var(--font-space-mono)' }}>zone <span className="text-[#ef4444]">*</span></div>
              <input value={zone} onChange={e => setZone(e.target.value)} placeholder="Frontend / Preview"
                className="w-full text-[12px] px-3 py-2 rounded-lg bg-[#0d1222] border border-[#1a2540] text-[#c8d6f0] placeholder:text-[#2d3d5a] outline-none focus:border-[#4a9eff]"
                style={{ fontFamily: 'var(--font-space-mono)' }} />
            </div>
          </div>

          {error && <div className="text-[11px] text-[#ef4444] px-3 py-2 rounded-lg" style={{ background: '#2a0808', border: '1px solid #5a1010' }}>{error}</div>}

          <div className="flex gap-2 mt-2">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg text-[12px] text-[#3d5278] border border-[#1a2540] hover:text-[#c8d6f0] transition-all cursor-pointer">cancel</button>
            <button onClick={handleCreate} disabled={saving} className="flex-1 py-2 rounded-lg text-[12px] font-medium text-[#4a9eff] border border-[#1a3060] hover:bg-[#0d1a30] transition-all cursor-pointer disabled:opacity-50">
              {saving ? 'adding…' : '+ add member'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────

export default function TeamPage() {
  const authUser = useAuth();
  const canWrite = !!authUser;
  const [members, setMembers] = useState<DbUser[]>([]);
  const [commits, setCommits] = useState<DbCommit[]>([]);
  const [prs, setPRs] = useState<DbPullRequest[]>([]);
  const [selected, setSelected] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewMember, setShowNewMember] = useState(false);

  useEffect(() => {
    Promise.all([
      getTeamMembers(),
      getRecentCommits(undefined, 100),
      getPullRequests(undefined, 50),
    ]).then(([m, c, p]) => {
      setMembers(m);
      setCommits(c);
      setPRs(p);
      setLoading(false);
    });
  }, []);

  if (selected) {
    return <MemberProfile member={selected} commits={commits} prs={prs} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="p-7">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-[11px] text-[#4a9eff] tracking-[3px] uppercase mb-1" style={{ fontFamily: 'var(--font-space-mono)' }}>
            // team
          </div>
          <div className="text-[20px] font-semibold text-[#e8f0ff]">Team Members</div>
        </div>
        {canWrite && (
          <button
            onClick={() => setShowNewMember(true)}
            className="px-4 py-2 rounded-lg text-[12px] font-medium text-[#4a9eff] border border-[#1a3060] hover:bg-[#0d1a30] transition-all cursor-pointer"
            style={{ fontFamily: 'var(--font-space-mono)' }}
          >
            + add member
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-[12px] text-[#3d5278]" style={{ fontFamily: 'var(--font-space-mono)' }}>loading…</div>
      ) : members.length === 0 ? (
        <div className="text-center py-16 text-[#2d3d5a]" style={{ fontFamily: 'var(--font-space-mono)' }}>
          <div className="text-[32px] mb-3 opacity-30">◎</div>
          <div className="text-[12px]">no team members yet</div>
          {canWrite && (
            <button
              onClick={() => setShowNewMember(true)}
              className="mt-3 text-[11px] px-3 py-1.5 rounded border border-[#1a3060] text-[#4a9eff] hover:bg-[#0d1a30] transition-all cursor-pointer"
            >
              + add your first member
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {members.map(m => {
            const myCommits = commits.filter(c => c.author_id === m.id).length;
            const myPRs = prs.filter(p => p.author_id === m.id).length;

            return (
              <div
                key={m.id}
                className="bg-[#0a0f1e] border border-[#1a2540] rounded-xl p-5 flex flex-col gap-4 hover:border-[#2a3a60] transition-all cursor-pointer group"
                onClick={() => setSelected(m)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-[44px] h-[44px] rounded-full flex items-center justify-center text-[15px] font-bold flex-shrink-0"
                    style={{ background: m.avatar_color.bg, color: m.avatar_color.text }}
                  >
                    {m.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium text-[#e8f0ff] group-hover:text-[#4a9eff] transition-colors">{m.name}</div>
                    <div className="text-[11px] text-[#3d5278]">{m.role}</div>
                  </div>
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: m.status === 'active' ? '#22c55e' : '#3d5278', boxShadow: m.status === 'active' ? '0 0 6px #22c55e' : 'none' }}
                  />
                </div>

                <div className="text-[11px] text-[#2d3d5a] truncate" style={{ fontFamily: 'var(--font-space-mono)' }}>
                  {m.zone}
                </div>

                <div className="flex gap-3 pt-2 border-t border-[#0f1828]">
                  {[
                    { label: 'commits', val: myCommits, color: '#4a9eff' },
                    { label: 'PRs', val: myPRs, color: '#22c55e' },
                  ].map(stat => (
                    <div key={stat.label}>
                      <span className="text-[14px] font-semibold" style={{ color: stat.color, fontFamily: 'var(--font-space-mono)' }}>{stat.val}</span>
                      <span className="text-[10px] text-[#3d5278] ml-1">{stat.label}</span>
                    </div>
                  ))}
                  <div className="ml-auto text-[11px] text-[#4a9eff] opacity-0 group-hover:opacity-100 transition-opacity">
                    view →
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {canWrite && showNewMember && (
        <NewMemberModal
          onClose={() => setShowNewMember(false)}
          onCreated={(u) => setMembers(prev => [...prev, u])}
        />
      )}
    </div>
  );
}
