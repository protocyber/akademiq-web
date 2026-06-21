"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, School, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "@/components/ui/toaster";
import { IdentityGuard } from "@/components/features/auth-guard";
import { useAuth } from "@/hooks/use-auth";
import { useMyTenants, useEnterTenant, type TenantEntry } from "@/lib/query/mutations/use-login";
import { getErrorMessage } from "@/lib/errors/messages";
import { clearAllTokens } from "@/lib/api/client";

export const dynamic = "force-dynamic";

export default function TenantSelectPage() {
  return (
    <React.Suspense>
      <IdentityGuard>
        <TenantSelectContent />
      </IdentityGuard>
    </React.Suspense>
  );
}

function TenantSelectContent() {
  const router = useRouter();
  const { hasScopedToken } = useAuth();
  const [tenants, setTenants] = React.useState<TenantEntry[] | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAutoEntering, setIsAutoEntering] = React.useState(false);

  const myTenants = useMyTenants();
  const enterTenant = useEnterTenant();

  // A user who already holds a tenant-scoped access token has entered a
  // tenant and must not remain on the picker. Redirect before rendering.
  React.useEffect(() => {
    if (hasScopedToken) {
      router.replace("/dashboard");
    }
  }, [hasScopedToken, router]);

  // Load tenant list on mount — but only when the user is not already
  // scoped (scoped users are being redirected to /dashboard).
  React.useEffect(() => {
    if (hasScopedToken) return;
    myTenants
      .mutateAsync()
      .then((data) => {
        setTenants(data);
        // Single-tenant fast path.
        if (data.length === 1) {
          setIsAutoEntering(true);
          enterTenant
            .mutateAsync({ tenantId: data[0].tenant_id })
            .then(() => {
              router.push("/dashboard");
            })
            .catch(() => {
              setIsAutoEntering(false);
              toast.error("Gagal masuk ke sekolah. Coba lagi.");
            });
        }
      })
      .catch(() => {
        toast.error("Gagal memuat daftar sekolah.");
        setTenants([]);
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasScopedToken]);

  async function handleEnter(tenantId: string) {
    try {
      await enterTenant.mutateAsync({ tenantId });
      router.push("/dashboard");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Gagal masuk ke sekolah. Coba lagi." }));
    }
  }

  function handleLogout() {
    clearAllTokens();
    router.push("/login");
  }

  if (isLoading || isAutoEntering || hasScopedToken) {
    return <TenantSelectSkeleton />;
  }

  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        <div className="space-y-2 text-center">
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold font-display text-primary tracking-tight">
              AcademiQ
            </span>
          </div>
          <h2 className="text-2xl font-bold font-display text-foreground">Pilih Sekolah</h2>
          <p className="text-muted-foreground text-sm">
            {tenants && tenants.length > 0
              ? "Pilih sekolah yang ingin Anda masuki."
              : "Anda belum terdaftar di sekolah mana pun."}
          </p>
        </div>

        {tenants && tenants.length === 0 ? (
          <ZeroTenantState onLogout={handleLogout} />
        ) : (
          <div className="space-y-3">
            {tenants?.map((t) => (
              <Card
                key={t.tenant_id}
                className="cursor-pointer transition-colors hover:border-primary"
                onClick={() => !enterTenant.isPending && handleEnter(t.tenant_id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (!enterTenant.isPending) handleEnter(t.tenant_id);
                  }
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <School className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{t.tenant_name}</CardTitle>
                      <CardDescription className="text-xs capitalize">
                        {t.roles.map((role) => role.replace(/_/g, " ")).join(", ")}
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
              </Card>
            ))}

            <p className="text-center text-xs text-muted-foreground pt-2">
              Tidak ada sekolah yang Anda cari?&nbsp;
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-xs text-primary"
                onClick={handleLogout}
              >
                Keluar
              </Button>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function ZeroTenantState({ onLogout }: { onLogout: () => void }) {
  const router = useRouter();

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
          <School className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-foreground">
            Anda belum terdaftar di sekolah mana pun
          </p>
          <p className="text-sm text-muted-foreground">
            Tunggu undangan dari admin sekolah untuk bergabung, atau daftar sekolah baru.
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Button
            variant="default"
            onClick={() => router.push("/register?mode=existing")}
            className="w-full"
          >
            Daftar Sekolah Baru
          </Button>
          <Button variant="outline" onClick={onLogout} className="w-full">
            Keluar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TenantSelectSkeleton() {
  return (
    <main className="container mx-auto flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-4">
        {[0, 1].map((i) => (
          <div key={i} className="h-20 rounded-lg border bg-muted animate-pulse" />
        ))}
      </div>
    </main>
  );
}
