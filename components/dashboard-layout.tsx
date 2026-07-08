"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Award,
  HandCoins,
  Wallet,
  Settings,
  LogOut,
  Menu,
  X,
  GraduationCap,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/programs", label: "Programs", icon: Award },
  { href: "/dashboard/grants", label: "Grants", icon: GraduationCap },
  { href: "/dashboard/donors", label: "Donors", icon: HandCoins },
  { href: "/dashboard/funds", label: "Funds", icon: Wallet },
];

export default function DashboardLayout({
  children,
  tenantName,
  userName,
  role,
}: {
  children: React.ReactNode;
  tenantName?: string;
  userName?: string;
  role?: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const roleLabel: Record<string, string> = {
    INSTITUTION_ADMIN: "Admin",
    OFFICER: "Officer",
    FINANCE: "Finance",
  };

  const sidebarContent = (
    <>
      <div className="px-5 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/brand/icon.svg" alt="" className="w-6 h-6" />
          <p className="font-display font-extrabold text-lg text-ivory">
            Grantis<span className="text-marigold">pro</span>
          </p>
        </div>
        <button className="md:hidden text-white/60" onClick={() => setMobileOpen(false)} aria-label="Close menu">
          <X size={20} />
        </button>
      </div>
      <nav className="flex-1 px-3 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/dashboard" ? pathname === "/dashboard" : pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                active ? "bg-white/10 text-ivory" : "text-white/60 hover:text-white/90"
              }`}
            >
              {active && (
                <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-emerald rounded-full" />
              )}
              <Icon size={17} strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/40">
          <Settings size={17} strokeWidth={1.75} />
          Settings
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white/90 transition"
        >
          <LogOut size={17} strokeWidth={1.75} />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-ivory-dim">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-plum-deep flex-col shrink-0">{sidebarContent}</aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="w-64 bg-plum-deep flex flex-col">{sidebarContent}</div>
          <div className="flex-1 bg-black/30" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <header className="h-16 border-b border-plum/10 flex items-center justify-between md:justify-end px-4 md:px-8 bg-ivory">
          <button
            className="md:hidden text-plum"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div className="text-right">
            <p className="text-sm text-plum font-medium">{userName}</p>
            <p className="text-xs text-plum/50">
              {role ? roleLabel[role] ?? role : ""} {tenantName ? `· ${tenantName}` : ""}
            </p>
          </div>
        </header>
        <main className="p-4 md:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
