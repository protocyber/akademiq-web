import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, LayoutDashboard, Boxes, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarLayoutProps {
  children: React.ReactNode;
  schoolName: string;
  userName: string;
  userEmail: string;
  isLoggingOut: boolean;
  onLogout: () => void;
  className?: string;
}

export function SidebarLayout({
  children,
  schoolName,
  userName,
  userEmail,
  isLoggingOut,
  onLogout,
  className,
}: SidebarLayoutProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/settings/modules",
      label: "Modul Aktif",
      icon: Boxes,
    },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50/50 dark:bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 text-slate-100 flex flex-col z-40 border-r border-slate-800">
        {/* Brand Header */}
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-display leading-none text-white">AcademiQ</h1>
            <p className="text-xs text-slate-400 mt-0.5">Sekolah Console</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                className={`w-full justify-start gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${
                  active
                    ? "bg-primary text-primary-foreground hover:bg-primary/95 hover:text-primary-foreground font-semibold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Link href={item.href}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-200">
              <User className="h-4 w-4" />
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white leading-none truncate">{userName}</p>
              <p className="text-[10px] text-slate-400 truncate mt-1">{userEmail}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            loading={isLoggingOut}
            onClick={onLogout}
            className="w-full justify-start gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800/60 text-xs h-9 rounded-lg"
          >
            <LogOut className="h-3.5 w-3.5" />
            Keluar Aplikasi
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 pl-64 flex flex-col">
        {/* Top bar header */}
        <header className="h-16 border-b border-border/80 bg-background/95 backdrop-blur px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground">Institusi:</span>
            <span className="text-sm font-bold text-foreground bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
              {schoolName}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-700 dark:text-slate-300">
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Canvas */}
        <main className={`flex-1 p-8 w-full space-y-8 ${className ?? ""}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
