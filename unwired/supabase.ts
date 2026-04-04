import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ── TypeScript types mirroring the DB schema ──────────────

export type UserStatus = 'active' | 'away' | 'offline';
export type TaskStatus = 'backlog' | 'in_progress' | 'in_review' | 'done';
export type PRStatus   = 'open' | 'review' | 'merged';
export type BranchStatus = 'open' | 'draft' | 'merged' | 'rejected';
export type Severity   = 'blocker' | 'suggestion' | 'question';
export type Priority   = 'P0' | 'P1' | 'P2';

export interface DbUser {
  id: string;
  auth_id: string | null;
  email: string;
  name: string;
  initials: string;
  role: string;
  zone: string;
  avatar_color: { bg: string; text: string };
  status: UserStatus;
  created_at: string;
}

export interface DbProject {
  id: string;
  name: string;
  url: string | null;
  description: string | null;
  created_at: string;
}

export interface DbSprint {
  id: string;
  project_id: string;
  name: string;
  number: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface DbTask {
  id: string;
  sprint_id: string;
  title: string;
  status: TaskStatus;
  assignee_id: string | null;
  zone: string | null;
  priority: Priority;
  points: number;
  created_at: string;
  // joined
  assignee?: DbUser;
}

export interface DbCommit {
  id: string;
  project_id: string;
  hash: string;
  message: string;
  author_id: string | null;
  branch: string;
  created_at: string;
  // joined
  author?: DbUser;
}

export interface DbPullRequest {
  id: string;
  project_id: string;
  title: string;
  author_id: string | null;
  target_branch: string;
  status: PRStatus;
  created_at: string;
  // joined
  author?: DbUser;
}

export interface DbBranch {
  id: string;
  project_id: string;
  name: string;
  author_id: string | null;
  reviewer_id: string | null;
  status: BranchStatus;
  description: string | null;
  created_at: string;
  // joined
  author?: DbUser;
  reviewer?: DbUser;
}

export interface DbAnnotation {
  id: string;
  project_id: string;
  x: number;
  y: number;
  severity: Severity;
  author_id: string | null;
  resolved: boolean;
  created_at: string;
  // joined
  author?: DbUser;
  comments?: DbAnnotationComment[];
}

export interface DbAnnotationComment {
  id: string;
  annotation_id: string;
  author_id: string | null;
  text: string;
  created_at: string;
  // joined
  author?: DbUser;
}

export interface DbSprintZone {
  id: string;
  sprint_id: string;
  label: string;
  pct: number;
  color: string;
}
