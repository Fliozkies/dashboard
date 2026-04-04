'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase, DbProject, DbAnnotation, DbUser } from '../../lib/supabase';
import { getProjects, getAnnotations, createAnnotation, addAnnotationComment, resolveAnnotation, getBranches, createBranch } from '../../lib/queries';

// ── Types ─────────────────────────────────────────────────

type Severity = 'blocker' | 'suggestion' | 'question';
type Viewport = 'mobile' | 'tablet' | 'desktop';

const viewportWidths: Record<Viewport, number> = { mobile: 375, tablet: 768, desktop: 1280 };
const severityColors: Record<Severity, { bg: string; color: string; border: string; label: string }> = {
  blocker: { bg: '#2a0808', color: '#ef4444', border: '#5a1010', label: 'Blocker' },
  suggestion: { bg: '#0a1428', color: '#4a9eff', border: '#1a3060', label: 'Suggest' },
  question: { bg: '#1f1500', color: '#f59e0b', border: '#3a2800', label: 'Question' },
};

// ── Fake cursors (presence stub) ──────────────────────────
const fakeCursors = [
  { name: 'Kim L.', color: '#4a9eff', x: 30, y: 25, dx: 0.12, dy: 0.08 },
  { name: 'Marco R.', color: '#a855f7', x: 65, y: 55, dx: -0.09, dy: 0.11 },
];

// ── Sub-components ────────────────────────────────────────

function ProjectCard({ project, onOpen }: { project: DbProject; onOpen: () => void }) {
  return (
    <div
      className="bg-[#0a0f1e] border border-[#1a2540] rounded-xl p-5 flex flex-col gap-4 hover:border-[#2a3a60] transition-all cursor-pointer group"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[15px] font-semibold text-[#e8f0ff] group-hover:text-[#4a9eff] transition-colors">{project.name}</div>
          {project.description && (
            <div className="text-[12px] text-[#3d5278] mt-1 leading-relaxed">{project.description}</div>
          )}
        </div>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: '#052210', color: '#22c55e', border: '1px solid #0a3a1a', fontFamily: 'var(--font-space-mono)' }}
        >
          live
        </span>
      </div>
      {project.url && (
        <div
          className="text-[11px] text-[#2d3d5a] truncate"
          style={{ fontFamily: 'var(--font-space-mono)' }}
        >
          {project.url}
        </div>
      )}
      <button
        className="mt-auto w-full py-2 rounded-lg text-[12px] font-medium text-[#4a9eff] border border-[#1a3060] hover:bg-[#0d1a30] transition-all"
        onClick={(e) => { e.stopPropagation(); onOpen(); }}
      >
        Open Workspace →
      </button>
    </div>
  );
}

function AnnotationPin({
  pin, index, selected, onClick,
}: {
  pin: DbAnnotation; index: number; selected: boolean; onClick: () => void;
}) {
  const sc = severityColors[pin.severity];
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 select-none"
      style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 shadow-lg transition-transform hover:scale-110"
        style={{
          background: sc.bg,
          color: sc.color,
          borderColor: sc.color,
          boxShadow: selected ? `0 0 0 3px ${sc.color}44` : undefined,
          transform: selected ? 'scale(1.15)' : undefined,
          fontFamily: 'var(--font-space-mono)',
        }}
      >
        {index + 1}
      </div>
    </div>
  );
}

function WorkspaceView({ project, onBack, currentUser }: { project: DbProject; onBack: () => void; currentUser: DbUser | null }) {
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [annotations, setAnnotations] = useState<DbAnnotation[]>([]);
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [dropping, setDropping] = useState(false);
  const [newSeverity, setNewSeverity] = useState<Severity>('suggestion');
  const [commentText, setCommentText] = useState('');
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchDesc, setBranchDesc] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const previewRef = useRef<HTMLDivElement>(null);

  // Fake cursor animation
  const [cursors, setCursors] = useState(fakeCursors.map(c => ({ ...c })));
  useEffect(() => {
    const id = setInterval(() => {
      setCursors(prev => prev.map(c => ({
        ...c,
        x: Math.max(5, Math.min(95, c.x + c.dx * (Math.random() * 4 - 2))),
        y: Math.max(5, Math.min(95, c.y + c.dy * (Math.random() * 4 - 2))),
      })));
    }, 600);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    getAnnotations(project.id).then(setAnnotations);
    // Realtime subscription
    const channel = supabase
      .channel(`annotations:${project.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'annotations', filter: `project_id=eq.${project.id}` },
        () => getAnnotations(project.id).then(setAnnotations))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [project.id]);

  async function handlePreviewClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!dropping || !currentUser) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const created = await createAnnotation({
      project_id: project.id,
      x, y,
      severity: newSeverity,
      author_id: currentUser.id,
      resolved: false,
    });
    if (created) {
      setAnnotations(prev => [...prev, { ...created, comments: [] }]);
      setSelectedPin(created.id);
    }
    setDropping(false);
  }

  async function handleAddComment(annotationId: string) {
    if (!commentText.trim() || !currentUser) return;
    await addAnnotationComment({ annotation_id: annotationId, author_id: currentUser.id, text: commentText.trim() });
    setCommentText('');
    getAnnotations(project.id).then(setAnnotations);
  }

  async function handleResolve(annotationId: string) {
    await resolveAnnotation(annotationId);
    setAnnotations(prev => prev.map(a => a.id === annotationId ? { ...a, resolved: true } : a));
    setSelectedPin(null);
  }

  async function handleCreateBranch() {
    if (!branchName.trim() || !currentUser) return;
    await createBranch({
      project_id: project.id,
      name: branchName.trim(),
      description: branchDesc.trim() || null,
      author_id: currentUser.id,
      reviewer_id: null,
      status: 'open',
    });
    setShowBranchModal(false);
    setBranchName('');
    setBranchDesc('');
  }

  const activeAnnotations = annotations.filter(a => !a.resolved);
  const selected = annotations.find(a => a.id === selectedPin) ?? null;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-7 py-3 border-b border-[#1a2540] bg-[#070b14] flex-shrink-0">
        <button
          onClick={onBack}
          className="text-[11px] text-[#3d5278] hover:text-[#4a9eff] transition-colors flex items-center gap-1.5"
          style={{ fontFamily: 'var(--font-space-mono)' }}
        >
          ← back
        </button>
        <div className="w-px h-4 bg-[#1a2540]" />
        <div className="text-[13px] font-medium text-[#e8f0ff]">{project.name}</div>
        <div className="flex-1" />

        {/* Viewport selector */}
        <div className="flex gap-1">
          {(['mobile', 'tablet', 'desktop'] as Viewport[]).map(v => (
            <button
              key={v}
              onClick={() => setViewport(v)}
              className={`text-[11px] px-3 py-1 rounded border transition-all cursor-pointer ${viewport === v ? 'bg-[#0d1a30] text-[#4a9eff] border-[#1a3060]' : 'text-[#3d5278] border-[#1a2540] hover:text-[#6b7fa3]'}`}
              style={{ fontFamily: 'var(--font-space-mono)' }}
            >
              {v === 'mobile' ? '📱' : v === 'tablet' ? '📟' : '🖥'} {viewportWidths[v]}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-[#1a2540]" />

        {/* Annotation controls */}
        <button
          onClick={() => setDropping(!dropping)}
          className={`text-[11px] px-3 py-1.5 rounded border transition-all cursor-pointer ${dropping ? 'bg-[#0d1a30] text-[#4a9eff] border-[#4a9eff]' : 'text-[#3d5278] border-[#1a2540] hover:text-[#4a9eff]'}`}
          style={{ fontFamily: 'var(--font-space-mono)' }}
        >
          {dropping ? '● drop pin' : '+ pin'}
        </button>

        {dropping && (
          <div className="flex gap-1">
            {(['blocker', 'suggestion', 'question'] as Severity[]).map(s => (
              <button
                key={s}
                onClick={() => setNewSeverity(s)}
                className="text-[10px] px-2 py-0.5 rounded border transition-all cursor-pointer"
                style={{
                  background: newSeverity === s ? severityColors[s].bg : 'transparent',
                  color: severityColors[s].color,
                  borderColor: newSeverity === s ? severityColors[s].color : '#1a2540',
                  fontFamily: 'var(--font-space-mono)',
                }}
              >
                {severityColors[s].label}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => setShowBranchModal(true)}
          className="text-[11px] px-3 py-1.5 rounded border border-[#1a3060] text-[#4a9eff] hover:bg-[#0d1a30] transition-all cursor-pointer"
          style={{ fontFamily: 'var(--font-space-mono)' }}
        >
          ⎇ branch
        </button>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-[11px] text-[#3d5278] hover:text-[#4a9eff] transition-colors cursor-pointer"
          style={{ fontFamily: 'var(--font-space-mono)' }}
        >
          {sidebarOpen ? '→ hide' : '← pins'}
          {activeAnnotations.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-[#0d1a30] text-[#4a9eff]">
              {activeAnnotations.length}
            </span>
          )}
        </button>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Preview */}
        <div className="flex-1 overflow-auto bg-[#050810] flex items-start justify-center p-6">
          <div
            className="relative flex-shrink-0 rounded-lg overflow-hidden border border-[#1a2540] shadow-2xl transition-all duration-300"
            style={{ width: viewportWidths[viewport] }}
          >
            {/* Fake browser chrome */}
            <div className="bg-[#0a0f1e] border-b border-[#1a2540] px-3 py-2 flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] opacity-60" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] opacity-60" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] opacity-60" />
              </div>
              <div
                className="flex-1 text-center text-[10px] text-[#3d5278] truncate"
                style={{ fontFamily: 'var(--font-space-mono)' }}
              >
                {project.url ?? 'about:blank'}
              </div>
            </div>

            {/* Preview area */}
            <div
              ref={previewRef}
              className="relative bg-[#070b14] overflow-hidden"
              style={{ height: 520, cursor: dropping ? 'crosshair' : 'default' }}
              onClick={handlePreviewClick}
            >
              {project.url ? (
                <iframe
                  src={project.url}
                  className="w-full h-full border-0 pointer-events-none"
                  sandbox="allow-scripts allow-same-origin"
                  title={project.name}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-[32px] mb-3 opacity-20">◉</div>
                    <div className="text-[12px] text-[#3d5278]" style={{ fontFamily: 'var(--font-space-mono)' }}>
                      no url configured
                    </div>
                  </div>
                </div>
              )}

              {/* Annotation pins */}
              {activeAnnotations.map((pin, i) => (
                <AnnotationPin
                  key={pin.id}
                  pin={pin}
                  index={i}
                  selected={selectedPin === pin.id}
                  onClick={() => setSelectedPin(selectedPin === pin.id ? null : pin.id)}
                />
              ))}

              {/* Fake presence cursors */}
              {cursors.map((c) => (
                <div
                  key={c.name}
                  className="absolute pointer-events-none transition-all duration-500 flex items-center gap-1.5 z-20"
                  style={{ left: `${c.x}%`, top: `${c.y}%` }}
                >
                  <svg width="14" height="16" viewBox="0 0 14 16" fill={c.color}>
                    <path d="M0 0 L14 5 L7 7 L5 14 Z" />
                  </svg>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: c.color + '22', color: c.color, border: `1px solid ${c.color}44`, fontFamily: 'var(--font-space-mono)' }}
                  >
                    {c.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Annotation sidebar */}
        {sidebarOpen && (
          <div className="w-[300px] flex-shrink-0 border-l border-[#1a2540] bg-[#0a0f1e] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1a2540] flex items-center justify-between">
              <span className="text-[13px] font-medium text-[#e8f0ff]">Annotations</span>
              <span className="text-[11px] text-[#3d5278]" style={{ fontFamily: 'var(--font-space-mono)' }}>
                {activeAnnotations.length} open
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
              {activeAnnotations.length === 0 && (
                <div className="text-center py-8 text-[12px] text-[#2d3d5a]" style={{ fontFamily: 'var(--font-space-mono)' }}>
                  no pins yet<br />click + pin to annotate
                </div>
              )}
              {activeAnnotations.map((pin, i) => {
                const sc = severityColors[pin.severity];
                const isSelected = selectedPin === pin.id;
                return (
                  <div
                    key={pin.id}
                    className="rounded-lg border transition-all cursor-pointer"
                    style={{
                      background: isSelected ? '#0d1222' : '#070b14',
                      borderColor: isSelected ? sc.color + '66' : '#1a2540',
                      padding: '10px 12px',
                    }}
                    onClick={() => setSelectedPin(isSelected ? null : pin.id)}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                        style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}`, fontFamily: 'var(--font-space-mono)' }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-[11px] font-medium" style={{ color: sc.color }}>{sc.label}</span>
                      <span className="ml-auto text-[10px] text-[#2d3d5a]" style={{ fontFamily: 'var(--font-space-mono)' }}>
                        {pin.author?.name?.split(' ')[0] ?? '?'}
                      </span>
                    </div>

                    {/* Comments */}
                    {(pin.comments ?? []).map(c => (
                      <div key={c.id} className="mt-2 pl-2 border-l border-[#1a2540]">
                        <div className="text-[11px] text-[#8899b8] leading-relaxed">{c.text}</div>
                      </div>
                    ))}

                    {/* Add comment */}
                    {isSelected && (
                      <div className="mt-2 flex gap-1.5" onClick={e => e.stopPropagation()}>
                        <input
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddComment(pin.id)}
                          placeholder="add comment…"
                          className="flex-1 text-[11px] px-2 py-1 rounded bg-[#0d1222] border border-[#1a2540] text-[#c8d6f0] placeholder:text-[#2d3d5a] outline-none focus:border-[#4a9eff]"
                          style={{ fontFamily: 'var(--font-space-mono)' }}
                        />
                        <button
                          onClick={() => handleResolve(pin.id)}
                          className="text-[10px] px-2 py-1 rounded border border-[#0a3a1a] text-[#22c55e] hover:bg-[#052210] transition-all cursor-pointer"
                        >
                          ✓
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Branch modal */}
      {showBranchModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowBranchModal(false)}
        >
          <div
            className="bg-[#0a0f1e] border border-[#1a2540] rounded-xl p-6 w-[420px] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-[11px] text-[#4a9eff] tracking-[3px] uppercase mb-1" style={{ fontFamily: 'var(--font-space-mono)' }}>
              // new branch
            </div>
            <div className="text-[16px] font-semibold text-[#e8f0ff] mb-5">Create Branch</div>
            <div className="flex flex-col gap-3">
              <div>
                <div className="text-[11px] text-[#3d5278] mb-1.5" style={{ fontFamily: 'var(--font-space-mono)' }}>branch name</div>
                <input
                  value={branchName}
                  onChange={e => setBranchName(e.target.value)}
                  placeholder="feat/my-change"
                  className="w-full text-[12px] px-3 py-2 rounded-lg bg-[#0d1222] border border-[#1a2540] text-[#c8d6f0] placeholder:text-[#2d3d5a] outline-none focus:border-[#4a9eff]"
                  style={{ fontFamily: 'var(--font-space-mono)' }}
                />
              </div>
              <div>
                <div className="text-[11px] text-[#3d5278] mb-1.5" style={{ fontFamily: 'var(--font-space-mono)' }}>description</div>
                <textarea
                  value={branchDesc}
                  onChange={e => setBranchDesc(e.target.value)}
                  placeholder="What does this branch change?"
                  rows={3}
                  className="w-full text-[12px] px-3 py-2 rounded-lg bg-[#0d1222] border border-[#1a2540] text-[#c8d6f0] placeholder:text-[#2d3d5a] outline-none focus:border-[#4a9eff] resize-none"
                  style={{ fontFamily: 'var(--font-space-mono)' }}
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setShowBranchModal(false)}
                  className="flex-1 py-2 rounded-lg text-[12px] text-[#3d5278] border border-[#1a2540] hover:text-[#c8d6f0] transition-all cursor-pointer"
                >
                  cancel
                </button>
                <button
                  onClick={handleCreateBranch}
                  className="flex-1 py-2 rounded-lg text-[12px] font-medium text-[#4a9eff] border border-[#1a3060] hover:bg-[#0d1a30] transition-all cursor-pointer"
                >
                  ⎇ create branch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────

export default function ProjectsPage() {
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [activeProject, setActiveProject] = useState<DbProject | null>(null);
  const [currentUser, setCurrentUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getProjects(),
      supabase.auth.getUser().then(async ({ data }: { data: { user: { id: string } | null } }) => {
        if (!data.user) return null;
        const { data: u } = await supabase.from('users').select('*').eq('auth_id', data.user.id).single();
        return u as DbUser | null;
      }),
    ]).then(([projs, user]) => {
      setProjects(projs);
      setCurrentUser(user);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="p-7 flex items-center gap-2">
        <span className="text-[12px] text-[#3d5278]" style={{ fontFamily: 'var(--font-space-mono)' }}>loading projects…</span>
      </div>
    );
  }

  if (activeProject) {
    return (
      <div className="flex flex-col" style={{ height: 'calc(100vh - 0px)' }}>
        <WorkspaceView
          project={activeProject}
          onBack={() => setActiveProject(null)}
          currentUser={currentUser}
        />
      </div>
    );
  }

  return (
    <div className="p-7">
      <div className="text-[11px] text-[#4a9eff] tracking-[3px] uppercase mb-1" style={{ fontFamily: 'var(--font-space-mono)' }}>
        // projects
      </div>
      <div className="text-[20px] font-semibold text-[#e8f0ff] mb-6">All Projects</div>

      {projects.length === 0 ? (
        <div className="text-center py-16 text-[#2d3d5a]" style={{ fontFamily: 'var(--font-space-mono)' }}>
          <div className="text-[32px] mb-3 opacity-30">◉</div>
          <div className="text-[12px]">no projects yet</div>
          <div className="text-[11px] mt-1">add a project row in Supabase to get started</div>
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} onOpen={() => setActiveProject(p)} />
          ))}
        </div>
      )}
    </div>
  );
}