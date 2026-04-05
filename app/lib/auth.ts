/**
 * app/lib/auth.ts
 * Auth helpers — current session user + role checks.
 */

import { supabase } from './supabase';
import type { DbUser } from './supabase';

export type AuthUser = DbUser & { isAdmin: boolean; isMember: boolean };

/** Returns the logged-in user's full DB row, or null if anonymous. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', user.id)
    .single();

  if (!data) return null;

  const dbUser = data as DbUser;
  return {
    ...dbUser,
    isAdmin: dbUser.role === 'admin',
    isMember: true,
  };
}

/** Subscribe to auth state changes. */
export function onAuthStateChange(cb: (user: AuthUser | null) => void) {
  return supabase.auth.onAuthStateChange(async (_event, session) => {
    if (!session?.user) { cb(null); return; }

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', session.user.id)
      .single();

    if (!data) { cb(null); return; }

    const dbUser = data as DbUser;
    cb({ ...dbUser, isAdmin: dbUser.role === 'admin', isMember: true });
  });
}

export async function signOut() {
  await supabase.auth.signOut();
}
