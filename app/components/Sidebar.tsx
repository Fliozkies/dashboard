'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { onAuthStateChange, signOut } from '../lib/auth';
import type { AuthUser } from '../lib/auth';

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="1" width="6" height="6" rx="1" />
        <rect x="9" y="1" width="6" height="6" rx="1" />
        <rect x="1" y="9" width="6" height="6" rx="1" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
      </svg>
    ),
  },
  {
    href: '/dashboard/projects',
    label: 'Projects',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M2 2h5v5H2zm7 0h5v5H9zM2 9h5v5H2zm7 0h5v5H9z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/sprints',
    label: 'Sprints',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M2 3h12v2H2zm0 4h12v2H2zm0 4h8v2H2z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/team',
    label: 'Team',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <circle cx="8" cy="5" r="3" />
        <path d="M2 13c0-3.3 2.7-6 6-6s6 2.7 6 6H2z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/branches',
    label: 'Branches',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <circle cx="4" cy="4" r="2" />
        <circle cx="4" cy="12" r="2" />
        <circle cx="12" cy="4" r="2" />
        <path d="M4 6v4M4 6c0 0 4 0 6-2" strokeWidth="1.5" stroke="currentColor" fill="none" />
      </svg>
    ),
  },
  {
    href: '/dashboard/reports',
    label: 'Reports',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M3 2h10v12H3zm2 3h6v1H5zm0 3h6v1H5zm0 3h4v1H5z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange(setUser);
    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    setLoggingOut(true);
    await signOut();
    setUser(null);
    setLoggingOut(false);
    router.refresh();
  }

  return (
    <aside className="w-[220px] bg-[#0a0f1e] border-r border-[#1a2540] flex flex-col fixed top-0 left-0 h-screen z-10">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#1a2540]">
        <span className="block text-[15px] font-semibold text-white tracking-wide" style={{ fontFamily: 'var(--font-space-mono)' }}>
          ORBITDEV
        </span>
        <span className="text-[11px] text-[#4a9eff] tracking-[2px] mt-0.5" style={{ fontFamily: 'var(--font-space-mono)' }}>
          // mission control
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col mt-3 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-[10px] px-5 py-[9px] text-[13px] transition-all duration-150 border-l-2 mx-0 my-[1px] ${
                isActive
                  ? 'text-[#4a9eff] bg-[#0d1a30] border-[#4a9eff]'
                  : 'text-[#6b7fa3] hover:text-[#c8d6f0] hover:bg-[#0f1828] border-transparent'
              }`}
            >
              <span className="opacity-70">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-5 py-4 border-t border-[#1a2540]">
        {user ? (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <div
                className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
                style={{ background: user.avatar_color.bg, color: user.avatar_color.text }}
              >
                {user.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-[#c8d6f0] truncate">{user.name}</div>
                <div className="text-[10px] flex items-center gap-1" style={{ fontFamily: 'var(--font-space-mono)', color: user.isAdmin ? '#f59e0b' : '#3d5278' }}>
                  {user.isAdmin && <span>★</span>}
                  {user.role}
                </div>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              disabled={loggingOut}
              className="w-full text-[10px] py-1.5 rounded border border-[#1a2540] text-[#3d5278] hover:text-[#ef4444] hover:border-[#5a1010] transition-all cursor-pointer disabled:opacity-50"
              style={{ fontFamily: 'var(--font-space-mono)' }}
            >
              {loggingOut ? '…' : 'sign out'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="text-[10px] text-[#2d3d5a]" style={{ fontFamily: 'var(--font-space-mono)' }}>
              viewing as guest
            </div>
            <Link
              href="/login"
              className="w-full text-center text-[11px] py-1.5 rounded border border-[#1a3060] text-[#4a9eff] hover:bg-[#0d1a30] transition-all"
              style={{ fontFamily: 'var(--font-space-mono)' }}
            >
              sign in →
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
