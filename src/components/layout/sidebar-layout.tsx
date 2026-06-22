"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { BookOpen, GraduationCap, LayoutDashboard, Boxes, LogOut, School, User, Users, ClipboardList, Menu, ShieldCheck, ChevronDown, Settings, UserRound, DoorOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { useMe } from "@/lib/query/queries/use-me";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";
import { useTenantPermissions } from "@/lib/query/queries/use-tenant-roles";
import { EmailVerifiedBadge } from "@/components/ui/email-verified-badge";
import { useAcademicScope } from "@/hooks/use-academic-scope";
import { useAcademicYears, useCurriculumVersions, useTerms } from "@/lib/query/queries/use-academic-config";
import { QuerySelect } from "@/components/ui/query-select";
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

type VisibilityRule =
  | { kind: "always"; }
  | { kind: "permission"; code: string; }
  | { kind: "module"; featureCode: string; }
  | { kind: "moduleAndPermission"; featureCode: string; permissionCode: string; };

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  activePrefixes?: string[];
  visibility: VisibilityRule;
}

interface NavGroup {
  label: string;
  icon: LucideIcon;
  children: NavItem[];
  visibility: VisibilityRule;
}

type NavEntry =
  | { kind: "item"; item: NavItem; }
  | { kind: "group"; group: NavGroup; };

const navEntries: NavEntry[] = [
  {
    kind: "item",
    item: { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, visibility: { kind: "always" } },
  },
  {
    kind: "group",
    group: {
      label: "Pengaturan",
      icon: Settings,
      visibility: { kind: "always" },
      children: [
        { href: "/settings/school-profile", label: "Profil Sekolah", icon: School, visibility: { kind: "permission", code: "billing.view" } },
        { href: "/settings/modules", label: "Modul Aktif", icon: Boxes, visibility: { kind: "permission", code: "billing.view" } },
        { href: "/settings/users", label: "Pengguna", icon: Users, visibility: { kind: "permission", code: "user.read" } },
        { href: "/settings/roles", label: "Role & Izin", icon: ShieldCheck, visibility: { kind: "permission", code: "role.read" } },
        { href: "/settings/academic/years", label: "Akademik", icon: BookOpen, activePrefixes: ["/settings/academic"], visibility: { kind: "moduleAndPermission", featureCode: "academic_config", permissionCode: "academic.config.read" } },
      ],
    },
  },
  {
    kind: "group",
    group: {
      label: "Operasional",
      icon: School,
      visibility: { kind: "module", featureCode: "academic_ops" },
      children: [
        { href: "/students", label: "Siswa", icon: UserRound, visibility: { kind: "always" } },
        { href: "/teachers", label: "Guru", icon: User, visibility: { kind: "always" } },
        { href: "/homerooms", label: "Kelas", icon: DoorOpen, visibility: { kind: "always" } },
        { href: "/teaching-assignments", label: "Penugasan", icon: ClipboardList, visibility: { kind: "always" } },
      ],
    },
  },
  {
    kind: "group",
    group: {
      label: "Akademik",
      icon: BookOpen,
      visibility: { kind: "always" },
      children: [
        { href: "/grading/entry", label: "Nilai", icon: ClipboardList, activePrefixes: ["/grading/entry"], visibility: { kind: "moduleAndPermission", featureCode: "grading", permissionCode: "grade.read" } },
        { href: "/grading/report-cards", label: "Rapor", icon: GraduationCap, activePrefixes: ["/grading/report-cards"], visibility: { kind: "moduleAndPermission", featureCode: "grading", permissionCode: "report.read" } },
      ],
    },
  },
];

function isItemActive(pathname: string, item: NavItem): boolean {
  if (pathname === item.href) return true;
  if (item.activePrefixes?.some((p) => pathname.startsWith(p))) return true;
  return false;
}

function isGroupActive(pathname: string, group: NavGroup): boolean {
  return group.children.some((child) => isItemActive(pathname, child));
}

function isItemVisible(
  item: NavItem,
  heldPermissions: Set<string>,
  enabledModules: Set<string>,
): boolean {
  return checkVisibility(item.visibility, heldPermissions, enabledModules);
}

function isGroupVisible(
  group: NavGroup,
  heldPermissions: Set<string>,
  enabledModules: Set<string>,
): boolean {
  return checkVisibility(group.visibility, heldPermissions, enabledModules);
}

function checkVisibility(
  rule: VisibilityRule,
  heldPermissions: Set<string>,
  enabledModules: Set<string>,
): boolean {
  switch (rule.kind) {
    case "always":
      return true;
    case "permission":
      return heldPermissions.has(rule.code);
    case "module":
      return enabledModules.has(rule.featureCode);
    case "moduleAndPermission":
      return enabledModules.has(rule.featureCode) && heldPermissions.has(rule.permissionCode);
  }
}

function useMenuVisibility() {
  const tenantMe = useTenantMe();
  const permissions = useTenantPermissions();
  const isLoading = tenantMe.isLoading || permissions.isLoading;

  const enabledModules = React.useMemo(() => {
    if (!tenantMe.data?.modules) return new Set<string>();
    return new Set(
      tenantMe.data.modules.filter((m) => m.enabled).map((m) => m.feature_code),
    );
  }, [tenantMe.data]);

  const heldPermissions = React.useMemo(() => {
    if (!permissions.data) return new Set<string>();
    return new Set(
      permissions.data.filter((p) => p.held).map((p) => p.code),
    );
  }, [permissions.data]);

  return { enabledModules, heldPermissions, isLoading };
}

/** @visibleForTesting */
export function AcademicScopeSelectors({ isSidebar = false }: { isSidebar?: boolean; }) {
  const { yearId, curriculumId, termId, setYearId, setCurriculumId, setTermId, hasNoActiveTerm, isResolving } = useAcademicScope();
  const yearsQuery = useAcademicYears();
  const years = yearsQuery.data ?? [];
  const activeYear = years.find((y) => y.status === "Active");
  const hasActiveYear = Boolean(activeYear);

  const curriculumsQuery = useCurriculumVersions(yearId ?? undefined);
  const curriculums = curriculumsQuery.data ?? [];
  const showCurriculum = curriculums.length > 1;

  const termsQuery = useTerms(yearId ?? undefined);
  const terms = termsQuery.data ?? [];

  if (isResolving) {
    return (
      <div className={isSidebar ? "flex w-full flex-col gap-2" : "flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"}>
        <div className="h-10 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800 sm:w-[180px]" />
        <div className="h-10 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800 sm:w-[180px]" />
        <div className="h-10 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800 sm:w-[180px]" />
      </div>
    );
  }

  const triggerClass = isSidebar
    ? "bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:ring-slate-700 focus:ring-offset-slate-900 hover:bg-slate-800/80 hover:text-white"
    : "";
  const wrapperClass = isSidebar
    ? "flex w-full flex-col gap-2"
    : "flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3";
  const selectWidthClass = isSidebar ? "w-full" : "w-[180px]";

  return (
    <div className={wrapperClass}>
      <div className="flex flex-col gap-1">
        <div className={selectWidthClass}>
          <QuerySelect
            items={years}
            isLoading={yearsQuery.isLoading}
            value={yearId ?? undefined}
            onValueChange={(val) => setYearId(val)}
            getValue={(y) => y.academic_year_id}
            getLabel={(y) => y.name}
            placeholder="Pilih Tahun Ajaran"
            emptyText="Belum ada tahun"
            className={triggerClass}
          />
        </div>
        {!hasActiveYear && !yearId && (
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium animate-pulse">
            Silakan pilih tahun ajaran
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className={selectWidthClass}>
          <QuerySelect
            items={terms}
            isLoading={termsQuery.isLoading}
            value={termId ?? undefined}
            onValueChange={(val) => setTermId(val)}
            getValue={(t) => t.term_id}
            getLabel={(t) => t.name}
            placeholder="Pilih Semester"
            emptyText="Belum ada semester"
            disabled={!yearId || terms.length === 0}
            className={triggerClass}
            aria-label="Pilih Semester"
            data-testid="term-select"
          />
        </div>
        {hasNoActiveTerm && (
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
            Tidak ada semester aktif
          </span>
        )}
      </div>

      {showCurriculum ? (
        <div className={selectWidthClass}>
          <QuerySelect
            items={curriculums}
            isLoading={curriculumsQuery.isLoading}
            value={curriculumId ?? undefined}
            onValueChange={(val) => setCurriculumId(val)}
            getValue={(c) => c.curriculum_version_id}
            getLabel={(c) => c.name}
            placeholder="Pilih Kurikulum"
            emptyText="Belum ada kurikulum"
            disabled={!yearId}
            className={triggerClass}
          />
        </div>
      ) : null}
    </div>
  );
}

interface SidebarLayoutProps {
  children: React.ReactNode;
  schoolName: string;
  userName: string;
  userEmail: string | null;
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
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const me = useMe();
  const emailVerified = me.data?.email_verified;
  const avatarUrl = me.data?.avatar_url;

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background">
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col border-r border-slate-800 bg-slate-900 text-slate-100 lg:flex">
        <SidebarContent pathname={pathname} />
      </aside>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <div className="flex min-h-screen flex-col lg:pl-64">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border/80 bg-card/95 px-4 backdrop-blur">
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
              {/* Desktop Academic Scope Selector */}
              <div className="hidden lg:flex lg:items-center lg:gap-3">
                <AcademicScopeSelectors />
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
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt={userName}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1.5">
                      <p className="text-sm font-medium leading-none text-foreground">{userName}</p>
                      {userEmail && (
                        <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
                      )}
                      {me.data && (
                        <div className="pt-0.5">
                          <EmailVerifiedBadge verified={emailVerified ?? false} className="w-fit scale-90 origin-left" />
                        </div>
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

          <main className={`w-full flex-1 p-4 ${className ?? ""}`}>
            {children}
          </main>
        </div>

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

/** @visibleForTesting */
export function SidebarContent({
  pathname,
}: {
  pathname: string;
}) {
  const { enabledModules, heldPermissions, isLoading } = useMenuVisibility();
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(() => {
    const expanded = new Set<string>();
    for (const entry of navEntries) {
      if (entry.kind === "group" && isGroupActive(pathname, entry.group)) {
        expanded.add(entry.group.label);
      }
    }
    return expanded;
  });

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  React.useEffect(() => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const entry of navEntries) {
        if (entry.kind === "group" && isGroupActive(pathname, entry.group)) {
          if (!next.has(entry.group.label)) {
            next.add(entry.group.label);
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [pathname]);

  const visibleEntries = React.useMemo(() => {
    if (isLoading) return navEntries;

    return navEntries.filter((entry) => {
      if (entry.kind === "item") {
        return isItemVisible(entry.item, heldPermissions, enabledModules);
      }
      const groupVisible = isGroupVisible(entry.group, heldPermissions, enabledModules);
      if (!groupVisible) return false;
      const hasVisibleChild = entry.group.children.some((child) =>
        isItemVisible(child, heldPermissions, enabledModules),
      );
      return hasVisibleChild;
    });
  }, [isLoading, heldPermissions, enabledModules]);

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

      {/* Mobile Academic Scope Selector */}
      <div className="border-b border-slate-800 p-4 lg:hidden">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Scope Akademik
        </p>
        <AcademicScopeSelectors isSidebar />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleEntries.map((entry) => {
          if (entry.kind === "item") {
            const active = isItemActive(pathname, entry.item);
            const ItemIcon = entry.item.icon;
            return (
              <Button
                key={entry.item.href}
                asChild
                variant="ghost"
                className={`w-full justify-start gap-3 rounded-md px-4 py-2.5 text-sm transition-all ${active
                  ? "bg-primary font-semibold text-primary-foreground hover:bg-primary/95 hover:text-primary-foreground"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                  }`}
              >
                <Link href={entry.item.href}>
                  <ItemIcon className="h-4 w-4" />
                  {entry.item.label}
                </Link>
              </Button>
            );
          }

          const group = entry.group;
          const GroupIcon = group.icon;
          const isExpanded = expandedGroups.has(group.label);
          const visibleChildren = isLoading
            ? group.children
            : group.children.filter((child) => isItemVisible(child, heldPermissions, enabledModules));

          return (
            <div key={group.label} className="space-y-0.5">
              <Button
                variant="ghost"
                onClick={() => toggleGroup(group.label)}
                className="flex w-full justify-between rounded-md px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 transition-colors hover:bg-slate-800/60 hover:text-slate-300"
              >
                <span className="flex items-center gap-3">
                  <GroupIcon className="h-4 w-4" />
                  {group.label}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-0" : "-rotate-90"
                    }`}
                />
              </Button>
              {isExpanded && (
                <div className="space-y-0.5 pl-4">
                  {visibleChildren.map((child) => {
                    const active = isItemActive(pathname, child);
                    const ChildIcon = child.icon;
                    return (
                      <Button
                        key={child.href}
                        asChild
                        variant="ghost"
                        className={`w-full justify-start gap-3 rounded-md px-4 py-2 text-sm transition-all ${active
                          ? "bg-primary font-semibold text-primary-foreground hover:bg-primary/95 hover:text-primary-foreground"
                          : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                          }`}
                      >
                        <Link href={child.href}>
                          <ChildIcon className="h-4 w-4" />
                          {child.label}
                        </Link>
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
