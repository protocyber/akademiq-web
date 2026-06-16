"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, GraduationCap, LayoutDashboard, Boxes, LogOut, School, User, Users, ClipboardList, Menu, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface SidebarLayoutProps {
  children: React.ReactNode;
  schoolName: string;
  userName: string;
  userEmail: string | null;
  isLoggingOut: boolean;
  onLogout: () => void;
  className?: string;
}

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
  {
    href: "/settings/users",
    label: "Pengguna",
    icon: Users,
  },
  {
    href: "/settings/roles",
    label: "Role & Izin",
    icon: ShieldCheck,
  },
  {
    href: "/settings/academic/years",
    activePrefix: "/settings/academic",
    label: "Akademik",
    icon: BookOpen,
  },
  {
    href: "/students",
    activePrefixes: ["/students", "/teachers", "/homerooms", "/teaching-assignments", "/import"],
    label: "Operasional",
    icon: School,
  },
  {
    href: "/grading/entry",
    activePrefix: "/grading",
    label: "Nilai",
    icon: ClipboardList,
  },
  {
    href: "/grading/report-cards",
    activePrefix: "/grading/report-cards",
    label: "Rapor",
    icon: GraduationCap,
  },
];

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
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background">
      {/* 
        NOTE: The sidebar is intentionally styled with a permanently dark palette 
        (bg-slate-900, text-slate-100, border-slate-800) as a brand choice, 
        so it does not follow the light/dark theme switcher.
      */}
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col border-r border-slate-800 bg-slate-900 text-slate-100 lg:flex">
        <SidebarContent pathname={pathname} />
      </aside>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <div className="flex min-h-screen flex-col lg:pl-64">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border/80 bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 lg:hidden"
                  aria-label="Buka navigasi"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <div className="flex min-w-0 items-center gap-2">
                <span className="hidden text-sm font-semibold text-muted-foreground sm:inline">
                  Institusi:
                </span>
                <span className="truncate rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                  {schoolName}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              <ThemeSwitcher />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full p-0 overflow-hidden focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none text-foreground">{userName}</p>
                      {userEmail && (
                        <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profil Saya</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onLogout}
                    disabled={isLoggingOut}
                    className="cursor-pointer text-destructive focus:bg-destructive focus:text-destructive-foreground"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Keluar Aplikasi</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className={`w-full flex-1 space-y-6 p-4 sm:space-y-8 sm:p-6 lg:p-8 ${className ?? ""}`}>
            {children}
          </main>
        </div>

        {/* 
          NOTE: The mobile menu drawer is also intentionally styled with the brand dark palette 
          (bg-slate-900, border-slate-800) to match the main sidebar.
        */}
        <SheetContent side="left" className="w-72 border-slate-800 bg-slate-900 p-0 text-slate-100 sm:max-w-80">
          <SheetTitle className="sr-only">Navigasi utama</SheetTitle>
          <SheetDescription className="sr-only">
            Menu navigasi aplikasi AcademiQ.
          </SheetDescription>
          <SidebarContent pathname={pathname} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SidebarContent({
  pathname,
}: {
  pathname: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-slate-800 p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-lg font-bold leading-none text-white">AcademiQ</h1>
          <p className="mt-0.5 text-xs text-slate-400">Sekolah Console</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            Boolean(item.activePrefix && pathname.startsWith(item.activePrefix)) ||
            Boolean(item.activePrefixes?.some((prefix) => pathname.startsWith(prefix)));
          const Icon = item.icon;

          return (
            <Button
              key={item.href}
              asChild
              variant="ghost"
              className={`w-full justify-start gap-3 rounded-lg px-4 py-2.5 text-sm transition-all ${
                active
                  ? "bg-primary font-semibold text-primary-foreground hover:bg-primary/95 hover:text-primary-foreground"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
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
    </div>
  );
}
