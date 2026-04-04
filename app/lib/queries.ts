/**
 * app/lib/queries.ts
 *
 * All Supabase data fetching lives here.
 * Components import from this file instead of app/data.ts.
 * The old data.ts can be kept as a fallback or deleted.
 */

import { supabase, DbUser, DbCommit, DbPullRequest, DbSprintZone, DbTask, DbBranch, DbAnnotation, DbAnnotationComment } from './supabase';

// ── Users / Team ──────────────────────────────────────────

export async function getTeamMembers(): Promise<DbUser[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name');
  if (error) { console.error('getTeamMembers:', error.message); return []; }
  return data ?? [];
}

export async function getUserById(id: string): Promise<DbUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  if (error) { console.error('getUserById:', error.message); return null; }
  return data;
}

// ── Commits ───────────────────────────────────────────────

export async function getRecentCommits(projectId?: string, limit = 5): Promise<DbCommit[]> {
  let query = supabase
    .from('commits')
    .select('*, author:users(*)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (projectId) query = query.eq('project_id', projectId);
  const { data, error } = await query;
  if (error) { console.error('getRecentCommits:', error.message); return []; }
  return data ?? [];
}

/** Returns daily commit counts for the last N days (for the bar chart). */
export async function getCommitActivity(projectId?: string, days = 14): Promise<{ label: string; count: number }[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  let query = supabase
    .from('commits')
    .select('created_at')
    .gte('created_at', since.toISOString())
    .order('created_at');
  if (projectId) query = query.eq('project_id', projectId);

  const { data, error } = await query;
  if (error) { console.error('getCommitActivity:', error.message); return []; }

  // Build a bucket per day
  const buckets: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    buckets[d.toISOString().slice(0, 10)] = 0;
  }
  for (const row of data ?? []) {
    const key = (row.created_at as string).slice(0, 10);
    if (key in buckets) buckets[key]++;
  }

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return Object.entries(buckets).map(([date, count]) => ({
    label: dayLabels[new Date(date).getDay()],
    count,
  }));
}

// ── Pull Requests ─────────────────────────────────────────

export async function getPullRequests(projectId?: string, limit = 5): Promise<DbPullRequest[]> {
  let query = supabase
    .from('pull_requests')
    .select('*, author:users(*)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (projectId) query = query.eq('project_id', projectId);
  const { data, error } = await query;
  if (error) { console.error('getPullRequests:', error.message); return []; }
  return data ?? [];
}

// ── Sprint Zones ──────────────────────────────────────────

export async function getSprintZones(sprintId: string): Promise<DbSprintZone[]> {
  const { data, error } = await supabase
    .from('sprint_zones')
    .select('*')
    .eq('sprint_id', sprintId);
  if (error) { console.error('getSprintZones:', error.message); return []; }
  return data ?? [];
}

// ── Sprints ───────────────────────────────────────────────

export async function getSprintsByProject(projectId: string) {
  const { data, error } = await supabase
    .from('sprints')
    .select('*')
    .eq('project_id', projectId)
    .order('number', { ascending: false });
  if (error) { console.error('getSprintsByProject:', error.message); return []; }
  return data ?? [];
}

export async function getLatestSprint(projectId: string) {
  const { data, error } = await supabase
    .from('sprints')
    .select('*')
    .eq('project_id', projectId)
    .order('number', { ascending: false })
    .limit(1)
    .single();
  if (error) { console.error('getLatestSprint:', error.message); return null; }
  return data;
}

// ── Tasks ─────────────────────────────────────────────────

export async function getTasksBySprint(sprintId: string): Promise<DbTask[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, assignee:users(*)')
    .eq('sprint_id', sprintId)
    .order('created_at');
  if (error) { console.error('getTasksBySprint:', error.message); return []; }
  return data ?? [];
}

export async function updateTaskStatus(taskId: string, status: DbTask['status']) {
  const { error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', taskId);
  if (error) console.error('updateTaskStatus:', error.message);
}

export async function createTask(task: Omit<DbTask, 'id' | 'created_at' | 'assignee'>) {
  const { data, error } = await supabase.from('tasks').insert(task).select().single();
  if (error) { console.error('createTask:', error.message); return null; }
  return data;
}

// ── Branches ──────────────────────────────────────────────

export async function getBranches(projectId?: string): Promise<DbBranch[]> {
  let query = supabase
    .from('branches')
    .select('*, author:users!branches_author_id_fkey(*), reviewer:users!branches_reviewer_id_fkey(*)')
    .order('created_at', { ascending: false });
  if (projectId) query = query.eq('project_id', projectId);
  const { data, error } = await query;
  if (error) { console.error('getBranches:', error.message); return []; }
  return data ?? [];
}

export async function getBranchById(id: string): Promise<DbBranch | null> {
  const { data, error } = await supabase
    .from('branches')
    .select('*, author:users!branches_author_id_fkey(*), reviewer:users!branches_reviewer_id_fkey(*)')
    .eq('id', id)
    .single();
  if (error) { console.error('getBranchById:', error.message); return null; }
  return data;
}

export async function createBranch(branch: Omit<DbBranch, 'id' | 'created_at' | 'author' | 'reviewer'>) {
  const { data, error } = await supabase.from('branches').insert(branch).select().single();
  if (error) { console.error('createBranch:', error.message); return null; }
  return data;
}

export async function updateBranchStatus(id: string, status: DbBranch['status']) {
  const { error } = await supabase.from('branches').update({ status }).eq('id', id);
  if (error) console.error('updateBranchStatus:', error.message);
}

// ── Annotations ───────────────────────────────────────────

export async function getAnnotations(projectId: string): Promise<DbAnnotation[]> {
  const { data, error } = await supabase
    .from('annotations')
    .select('*, author:users(*), comments:annotation_comments(*, author:users(*))')
    .eq('project_id', projectId)
    .order('created_at');
  if (error) { console.error('getAnnotations:', error.message); return []; }
  return data ?? [];
}

export async function createAnnotation(annotation: Omit<DbAnnotation, 'id' | 'created_at' | 'author' | 'comments'>) {
  const { data, error } = await supabase.from('annotations').insert(annotation).select().single();
  if (error) { console.error('createAnnotation:', error.message); return null; }
  return data;
}

export async function resolveAnnotation(id: string) {
  const { error } = await supabase.from('annotations').update({ resolved: true }).eq('id', id);
  if (error) console.error('resolveAnnotation:', error.message);
}

export async function addAnnotationComment(comment: Omit<DbAnnotationComment, 'id' | 'created_at' | 'author'>) {
  const { data, error } = await supabase.from('annotation_comments').insert(comment).select().single();
  if (error) { console.error('addAnnotationComment:', error.message); return null; }
  return data;
}

// ── Projects ──────────────────────────────────────────────

export async function getProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('getProjects:', error.message); return []; }
  return data ?? [];
}

export async function getProjectById(id: string) {
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
  if (error) { console.error('getProjectById:', error.message); return null; }
  return data;
}

// ── Metric helpers (for dashboard metric cards) ───────────

export async function getDashboardMetrics(projectId?: string) {
  const [commitsRes, prsRes, tasksRes] = await Promise.all([
    supabase.from('commits').select('id', { count: 'exact', head: true }),
    supabase.from('pull_requests').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('tasks').select('id, status', { count: 'exact' }),
  ]);

  const totalCommits = commitsRes.count ?? 0;
  const openPRs = prsRes.count ?? 0;
  const allTasks = tasksRes.data ?? [];
  const doneTasks = allTasks.filter((t: { id: string; status: string }) => t.status === 'done').length;
  const totalTasks = allTasks.length;
  const sprintPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return { totalCommits, openPRs, doneTasks, totalTasks, sprintPct };
}