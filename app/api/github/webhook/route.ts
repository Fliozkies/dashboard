/**
 * app/api/github/webhook/route.ts
 *
 * Receives GitHub webhook events and writes to Supabase.
 * Handles: push (commits + branches), pull_request, create/delete (branches)
 *
 * Setup:
 *   1. Set GITHUB_WEBHOOK_SECRET in your env
 *   2. Set SUPABASE_SERVICE_ROLE_KEY in your env (needed for server-side writes)
 *   3. Register this URL on each GitHub repo:
 *      https://your-domain.com/api/github/webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';

// ── Supabase admin client (bypasses RLS for server-side writes) ──
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ── GitHub webhook payload types ─────────────────────────────────

interface GitHubUser {
  login: string;
  email?: string | null;
  name?: string | null;
}

interface GitHubCommit {
  id: string;
  message: string;
  timestamp: string;
  author: { name: string; email: string };
}

interface GitHubRepo {
  html_url: string;
  default_branch: string;
}

interface GitHubPullRequest {
  number: number;
  title: string;
  state: 'open' | 'closed';
  merged: boolean;
  base: { ref: string };
  head: { ref: string };
  user: GitHubUser;
  created_at: string;
}

interface PushPayload {
  ref: string;
  after: string;
  deleted: boolean;
  repository: GitHubRepo;
  sender: GitHubUser;
  commits: GitHubCommit[];
  head_commit: GitHubCommit | null;
}

interface PullRequestPayload {
  action: string;
  pull_request: GitHubPullRequest;
  repository: GitHubRepo;
  sender: GitHubUser;
}

interface CreateDeletePayload {
  ref: string;
  ref_type: 'branch' | 'tag';
  repository: GitHubRepo;
  sender: GitHubUser;
}

// ── Signature verification ────────────────────────────────────────

async function verifySignature(req: NextRequest, body: string): Promise<boolean> {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('GITHUB_WEBHOOK_SECRET not set — skipping signature check');
    return true;
  }
  const sig = req.headers.get('x-hub-signature-256');
  if (!sig) return false;

  const hmac = createHmac('sha256', secret);
  hmac.update(body);
  const expected = `sha256=${hmac.digest('hex')}`;

  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ── Project lookup by repo URL ────────────────────────────────────

async function getProjectByRepoUrl(repoUrl: string): Promise<string | null> {
  const normalised = repoUrl.replace(/\.git$/, '').replace(/\/$/, '');

  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('id, url')
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('getProjectByRepoUrl:', error?.message);
    return null;
  }

  const match = data.find((p: { id: string; url: string | null }) => {
    if (!p.url) return false;
    return p.url.replace(/\.git$/, '').replace(/\/$/, '') === normalised;
  });

  return match?.id ?? null;
}

// ── User lookup by GitHub login or email ──────────────────────────

async function resolveUserId(sender: GitHubUser): Promise<string | null> {
  const { data: byEmail } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', sender.email ?? '')
    .maybeSingle();

  if (byEmail?.id) return byEmail.id;

  const { data: byName } = await supabaseAdmin
    .from('users')
    .select('id')
    .ilike('name', sender.name ?? sender.login)
    .maybeSingle();

  return byName?.id ?? null;
}

// ── Event handlers ────────────────────────────────────────────────

async function handlePush(payload: PushPayload): Promise<void> {
  const repoUrl = payload.repository.html_url;
  const projectId = await getProjectByRepoUrl(repoUrl);
  if (!projectId) {
    console.warn(`No project found for repo: ${repoUrl}`);
    return;
  }

  const branchName = payload.ref.replace('refs/heads/', '');
  const authorId = await resolveUserId(payload.sender);

  if (!payload.deleted) {
    const isDefault = branchName === payload.repository.default_branch;
    await supabaseAdmin.from('branches').upsert(
      {
        project_id: projectId,
        name: branchName,
        author_id: authorId,
        status: isDefault ? 'merged' : 'open',
        description: null,
      },
      { onConflict: 'project_id,name', ignoreDuplicates: false },
    );
  } else {
    await supabaseAdmin
      .from('branches')
      .update({ status: 'merged' })
      .eq('project_id', projectId)
      .eq('name', branchName);
  }

  if (payload.commits.length === 0) return;

  const rows = payload.commits.map((c) => ({
    project_id: projectId,
    hash: c.id,
    message: c.message.split('\n')[0].slice(0, 200),
    author_id: authorId,
    branch: branchName,
    created_at: c.timestamp,
  }));

  const { error } = await supabaseAdmin
    .from('commits')
    .upsert(rows, { onConflict: 'hash', ignoreDuplicates: true });

  if (error) console.error('handlePush commits upsert:', error.message);
}

async function handlePullRequest(payload: PullRequestPayload): Promise<void> {
  const repoUrl = payload.repository.html_url;
  const projectId = await getProjectByRepoUrl(repoUrl);
  if (!projectId) {
    console.warn(`No project found for repo: ${repoUrl}`);
    return;
  }

  const pr = payload.pull_request;
  const authorId = await resolveUserId(payload.sender);

  let status: 'open' | 'review' | 'merged';
  if (pr.merged) {
    status = 'merged';
  } else if (payload.action === 'review_requested') {
    status = 'review';
  } else if (pr.state === 'open') {
    status = 'open';
  } else {
    status = 'merged';
  }

  const { error } = await supabaseAdmin.from('pull_requests').upsert(
    {
      project_id: projectId,
      title: pr.title.slice(0, 200),
      author_id: authorId,
      target_branch: pr.base.ref,
      status,
      created_at: pr.created_at,
    },
    { onConflict: 'project_id,title,target_branch', ignoreDuplicates: false },
  );

  if (error) console.error('handlePullRequest upsert:', error.message);

  if (['opened', 'closed'].includes(payload.action)) {
    const branchStatus = pr.merged ? 'merged' : 'open';
    await supabaseAdmin
      .from('branches')
      .update({ status: branchStatus })
      .eq('project_id', projectId)
      .eq('name', pr.head.ref);
  }
}

async function handleCreate(payload: CreateDeletePayload): Promise<void> {
  if (payload.ref_type !== 'branch') return;

  const repoUrl = payload.repository.html_url;
  const projectId = await getProjectByRepoUrl(repoUrl);
  if (!projectId) return;

  const authorId = await resolveUserId(payload.sender);

  await supabaseAdmin.from('branches').upsert(
    {
      project_id: projectId,
      name: payload.ref,
      author_id: authorId,
      status: 'open',
      description: null,
    },
    { onConflict: 'project_id,name', ignoreDuplicates: true },
  );
}

async function handleDelete(payload: CreateDeletePayload): Promise<void> {
  if (payload.ref_type !== 'branch') return;

  const repoUrl = payload.repository.html_url;
  const projectId = await getProjectByRepoUrl(repoUrl);
  if (!projectId) return;

  await supabaseAdmin
    .from('branches')
    .update({ status: 'merged' })
    .eq('project_id', projectId)
    .eq('name', payload.ref);
}

// ── Main route handler ────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();

  const valid = await verifySignature(req, body);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = req.headers.get('x-github-event');
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    switch (event) {
      case 'push':
        await handlePush(payload as PushPayload);
        break;
      case 'pull_request':
        await handlePullRequest(payload as PullRequestPayload);
        break;
      case 'create':
        await handleCreate(payload as CreateDeletePayload);
        break;
      case 'delete':
        await handleDelete(payload as CreateDeletePayload);
        break;
      case 'ping':
        break;
      default:
        console.log(`Unhandled GitHub event: ${event}`);
    }
  } catch (err) {
    console.error(`Error handling event "${event}":`, err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
