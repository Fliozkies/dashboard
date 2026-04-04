"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
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
    href: "/dashboard/projects",
    label: "Projects",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 2a5 5 0 110 10A5 5 0 018 3zm0 2a1 1 0 100 2 1 1 0 000-2z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/sprints",
    label: "Sprints",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M2 3h12v2H2zm0 4h12v2H2zm0 4h8v2H2z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/team",
    label: "Team",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <circle cx="8" cy="5" r="3" />
        <path d="M2 13c0-3.3 2.7-6 6-6s6 2.7 6 6H2z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/branches",
    label: "Branches",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1L1 5v6l7 4 7-4V5L8 1zm0 2.2L13 6l-5 2.8L3 6l5-2.8zM2 7.4l5 2.8v4.4L2 11.8V7.4zm6 7.2V10.2l5-2.8v4.4l-5 2.8z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/reports",
    label: "Reports",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M3 2h10v12H3zm2 3h6v1H5zm0 3h6v1H5zm0 3h4v1H5z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[220px] bg-[#0a0f1e] border-r border-[#1a2540] flex flex-col fixed top-0 left-0 h-screen z-10">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#1a2540]">
        <span
          className="block text-[15px] font-semibold text-white tracking-wide"
          style={{ fontFamily: "var(--font-space-mono)" }}
        >
          ORBITDEV
        </span>
        <span
          className="text-[11px] text-[#4a9eff] tracking-[2px] mt-0.5"
          style={{ fontFamily: "var(--font-space-mono)" }}
        >
          // mission control
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col mt-3 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-[10px] px-5 py-[9px] text-[13px] transition-all duration-150 border-l-2 mx-0 my-[1px] ${
                isActive
                  ? "text-[#4a9eff] bg-[#0d1a30] border-[#4a9eff]"
                  : "text-[#6b7fa3] hover:text-[#c8d6f0] hover:bg-[#0f1828] border-transparent"
              }`}
            >
              <span className="opacity-70">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-5 py-4 border-t border-[#1a2540]">
        <div className="flex items-center gap-[10px]">
          <div
            className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
            style={{ background: "#0d1a30", color: "#4a9eff" }}
          >
            YO
          </div>
          <div>
            <div className="text-[12px] text-[#c8d6f0]">you@team.dev</div>
            <div
              className="text-[10px] text-[#3d5278]"
              style={{ fontFamily: "var(--font-space-mono)" }}
            >
              admin
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
