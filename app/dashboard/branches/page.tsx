'use client';
import { useState, useEffect } from 'react';
import { supabase, DbBranch, DbUser } from '../../lib/supabase';
import { getBranches, updateBranchStatus, getProjects } from '../../lib/queries';

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  open: { bg: '#0d1a30', color: '#4a9eff', border: '#1a3060' },
  draft: { bg: '#0d1222', color: '#3d5278', border: '#1a2540' },
  merged: { bg: '#052210', color: '#22c55e', border: '#0a3a1a' },
  rejected: { bg: '#2a0808', color: '#ef4444', border: '#5a1010' },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Branch detail view ────────────────────────────────────

function BranchDetail({ branch, currentUser, onBack }: {
  branch: DbBranch;
  currentUser: DbUser | null;
  onBack: () => void;
}) {
  const [reviewComment, setReviewComment] = useState('');
  const [status, setStatus] = useState(branch.status);
  const [submitting, setSubmitting] = useState(false);

  const isReviewer = currentUser?.id === branch.reviewer_id;
  const s = STATUS_STYLES[status];

  async function handleDecision(decision: 'merged' | 'rejected') {
    if (!isReviewer) return;
    setSubmitting(true);
    await updateBranchStatus(branch.id, decision);
    setStatus(decision);
    setSubmitting(false);
  }

  return (
    <div className="p-7 max-w-[1100px]">
      <button
        onClick={onBack}
        className="text-[11px] text-[#3d5278] hover:text-[#4a9eff] transition-colors mb-6 flex items-center gap-1.5"
        style={{ fontFamily: 'var(--font-space-mono)' }}
      >
        ← branches
      </button>

      {/* Branch meta */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <div className="text-[11px] text-[#4a9eff] tracking-[3px] uppercase mb-1" style={{ fontFamily: 'var(--font-space-mono)' }}>
            // branch detail
          </div>
          <div className="text-[20px] font-semibold text-[#e8f0ff]">{branch.name}</div>
          {branch.description && (
            <div className="text-[13px] text-[#3d5278] mt-1.5 max-w-[500px] leading-relaxed">{branch.description}</div>
          )}
          <div className="flex items-center gap-3 mt-3">
            <span className="text-[11px]" style={{ color: '#3d5278', fontFamily: 'var(--font-space-mono)' }}>
              by {branch.author?.name ?? '?'}
            </span>
            <span className="text-[11px] text-[#2d3d5a]" style={{ fontFamily: 'var(--font-space-mono)' }}>
              {timeAgo(branch.created_at)}
            </span>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontFamily: 'var(--font-space-mono)' }}
            >
              {status}
            </span>
          </div>
        </div>
      </div>

      {/* Before / After diff panels */}
      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {[
          { label: 'Before (main)', color: '#ef4444' },
          { label: `After (${branch.name})`, color: '#22c55e' },
        ].map(panel => (
          <div key={panel.label} className="bg-[#0a0f1e] border border-[#1a2540] rounded-xl overflow-hidden">
            <div
              className="px-4 py-2.5 border-b border-[#1a2540] flex items-center justify-between"
              style={{ background: '#0d1222' }}
            >
              <span className="text-[11px] font-medium" style={{ color: panel.color, fontFamily: 'var(--font-space-mono)' }}>
                {panel.label}
              </span>
              <span className="text-[10px] text-[#2d3d5a]" style={{ fontFamily: 'var(--font-space-mono)' }}>preview</span>
            </div>
            <div className="h-[320px] flex items-center justify-center" style={{ background: '#070b14' }}>
              <div className="text-center opacity-30">
                <div className="text-[28px] mb-2" style={{ color: panel.color }}>⬡</div>
                <div className="text-[11px] text-[#3d5278]" style={{ fontFamily: 'var(--font-space-mono)' }}>
                  {panel.label}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 340px' }}>
        {/* File changes */}
        <div className="bg-[#0a0f1e] border border-[#1a2540] rounded-xl p-5">
          <div className="text-[12px] font-medium text-[#e8f0ff] mb-4">File Changes</div>
          <div className="flex flex-col gap-1.5">
            {[
              { file: 'app/components/Preview.tsx', added: 42, removed: 18 },
              { file: 'app/lib/queries.ts', added: 15, removed: 3 },
              { file: 'app/globals.css', added: 8, removed: 2 },
            ].map(f => (
              <div
                key={f.file}
                className="flex items-center gap-3 px-3 py-2 rounded-lg"
                style={{ background: '#0d1222' }}
              >
                <span className="flex-1 text-[11px] text-[#8899b8]" style={{ fontFamily: 'var(--font-space-mono)' }}>{f.file}</span>
                <span className="text-[10px] text-[#22c55e]" style={{ fontFamily: 'var(--font-space-mono)' }}>+{f.added}</span>
                <span className="text-[10px] text-[#ef4444]" style={{ fontFamily: 'var(--font-space-mono)' }}>−{f.removed}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reviewer decision panel */}
        <div className="bg-[#0a0f1e] border border-[#1a2540] rounded-xl p-5 flex flex-col gap-4">
          <div className="text-[12px] font-medium text-[#e8f0ff]">Review</div>
          <div className="flex items-center gap-2.5">
            {branch.reviewer ? (
              <>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                  style={{ background: branch.reviewer.avatar_color.bg, color: branch.reviewer.avatar_color.text }}
                >
                  {branch.reviewer.initials}
                </div>
                <div>
                  <div className="text-[12px] text-[#c8d6f0]">{branch.reviewer.name}</div>
                  <div className="text-[10px] text-[#3d5278]">assigned reviewer</div>
                </div>
              </>
            ) : (
              <div className="text-[11px] text-[#2d3d5a]" style={{ fontFamily: 'var(--font-space-mono)' }}>no reviewer assigned</div>
            )}
          </div>

          <textarea
            value={reviewComment}
            onChange={e => setReviewComment(e.target.value)}
            placeholder="Leave a review comment…"
            rows={3}
            disabled={!isReviewer || status === 'merged' || status === 'rejected'}
            className="w-full text-[11px] px-3 py-2 rounded-lg bg-[#0d1222] border border-[#1a2540] text-[#c8d6f0] placeholder:text-[#2d3d5a] outline-none focus:border-[#4a9eff] resize-none disabled:opacity-40"
            style={{ fontFamily: 'var(--font-space-mono)' }}
          />

          <div className="flex gap-2">
            <button
              onClick={() => handleDecision('merged')}
              disabled={!isReviewer || status !== 'open' || submitting}
              className="flex-1 py-2 rounded-lg text-[12px] font-medium border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:bg-[#052210]"
              style={{ color: '#22c55e', borderColor: '#0a3a1a' }}
            >
              ✓ Accept & Merge
            </button>
            <button
              onClick={() => handleDecision('rejected')}
              disabled={!isReviewer || status !== 'open' || submitting}
              className="flex-1 py-2 rounded-lg text-[12px] font-medium border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:bg-[#2a0808]"
              style={{ color: '#f59e0b', borderColor: '#3a2800' }}
            >
              ↩ Request Changes
            </button>
          </div>
          {!isReviewer && (
            <div className="text-[10px] text-[#2d3d5a] text-center" style={{ fontFamily: 'var(--font-space-mono)' }}>
              you are not the assigned reviewer
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────

export default function BranchesPage() {
  const [branches, setBranches] = useState<DbBranch[]>([]);
  const [selected, setSelected] = useState<DbBranch | null>(null);
  const [currentUser, setCurrentUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'merged' | 'rejected'>('all');

  useEffect(() => {
    async function init() {
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        const { data: u } = await supabase.from('users').select('*').eq('auth_id', authData.user.id).single();
        if (u) setCurrentUser(u as DbUser);
      }
      const b = await getBranches();
      setBranches(b);
      setLoading(false);
    }
    init();
  }, []);

  if (selected) {
    return <BranchDetail branch={selected} currentUser={currentUser} onBack={() => setSelected(null)} />;
  }

  const filtered = filter === 'all' ? branches : branches.filter(b => b.status === filter);

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[11px] text-[#4a9eff] tracking-[3px] uppercase mb-1" style={{ fontFamily: 'var(--font-space-mono)' }}>
            // branches
          </div>
          <div className="text-[20px] font-semibold text-[#e8f0ff]">Branch Review</div>
        </div>
        {/* Filter tabs */}
        <div className="flex gap-1">
          {(['all', 'open', 'merged', 'rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[11px] px-3 py-1.5 rounded border transition-all cursor-pointer ${filter === f ? 'bg-[#0d1a30] text-[#4a9eff] border-[#1a3060]' : 'text-[#3d5278] border-[#1a2540] hover:text-[#6b7fa3]'}`}
              style={{ fontFamily: 'var(--font-space-mono)' }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-[12px] text-[#3d5278]" style={{ fontFamily: 'var(--font-space-mono)' }}>loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#2d3d5a]" style={{ fontFamily: 'var(--font-space-mono)' }}>
          <div className="text-[32px] mb-3 opacity-30">⎇</div>
          <div className="text-[12px]">no branches yet</div>
          <div className="text-[11px] mt-1">create one from the Projects workspace</div>
        </div>
      ) : (
        <div className="bg-[#0a0f1e] border border-[#1a2540] rounded-xl overflow-hidden">
          {/* Table header */}
          <div
            className="grid text-[10px] text-[#3d5278] px-4 py-2.5 border-b border-[#1a2540]"
            style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 100px', fontFamily: 'var(--font-space-mono)' }}
          >
            <span>BRANCH</span>
            <span>AUTHOR</span>
            <span>BASE</span>
            <span>STATUS</span>
            <span>REVIEWER</span>
            <span>CREATED</span>
          </div>
          {filtered.map((b, i) => {
            const s = STATUS_STYLES[b.status];
            return (
              <div
                key={b.id}
                className={`grid items-center px-4 py-3 cursor-pointer hover:bg-[#0d1222] transition-colors ${i < filtered.length - 1 ? 'border-b border-[#0f1828]' : ''}`}
                style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 100px' }}
                onClick={() => setSelected(b)}
              >
                <div>
                  <div className="text-[12px] text-[#c8d6f0] font-medium" style={{ fontFamily: 'var(--font-space-mono)' }}>{b.name}</div>
                  {b.description && (
                    <div className="text-[10px] text-[#3d5278] mt-0.5 truncate max-w-[260px]">{b.description}</div>
                  )}
                </div>
                <div className="text-[11px] text-[#8899b8]">{b.author?.name ?? '—'}</div>
                <div className="text-[11px] text-[#3d5278]" style={{ fontFamily: 'var(--font-space-mono)' }}>main</div>
                <div>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontFamily: 'var(--font-space-mono)' }}
                  >
                    {b.status}
                  </span>
                </div>
                <div className="text-[11px] text-[#8899b8]">{b.reviewer?.name ?? <span className="text-[#2d3d5a]">—</span>}</div>
                <div className="text-[10px] text-[#2d3d5a]" style={{ fontFamily: 'var(--font-space-mono)' }}>
                  {timeAgo(b.created_at)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}