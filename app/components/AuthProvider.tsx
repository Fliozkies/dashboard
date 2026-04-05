'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChange } from '../lib/auth';
import type { AuthUser } from '../lib/auth';

const AuthContext = createContext<AuthUser | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange(setUser);
    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
