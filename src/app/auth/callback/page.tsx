"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { toast } from "@/components/ui/toaster";
import { storeIdentityToken, useEnterTenant, useMyTenants } from "@/lib/query/mutations/use-login";
import { getErrorMessage } from "@/lib/errors/messages";

export default function AuthCallbackPage() {
  return (
    <React.Suspense fallback={<AuthCallbackSkeleton />}>
      <AuthCallbackContent />
    </React.Suspense>
  );
}

function AuthCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const myTenants = useMyTenants();
  const enterTenant = useEnterTenant();
  const handledRef = React.useRef(false);

  React.useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const oauthError = params.get("oauth_error");
    if (oauthError) {
      router.replace(`/login?oauth_error=${encodeURIComponent(oauthError)}`);
      return;
    }

    const identityToken = params.get("identity_token");
    if (!identityToken) {
      router.replace("/login?oauth_error=missing_identity_token");
      return;
    }

    storeIdentityToken(identityToken);
    myTenants
      .mutateAsync()
      .then(async (tenants) => {
        if (tenants.length === 1) {
          await enterTenant.mutateAsync({ tenantId: tenants[0].tenant_id });
          router.replace("/dashboard");
          return;
        }
        router.replace("/tenant-select");
      })
      .catch((err) => {
        const message = getErrorMessage(err, { fallback: "Login dengan Google gagal. Coba lagi." });
        toast.error(message);
        router.replace(`/login?oauth_error=${encodeURIComponent(message)}`);
      });
  }, [enterTenant, myTenants, params, router]);

  return <AuthCallbackSkeleton />;
}

function AuthCallbackSkeleton() {
  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <h3 className="font-bold text-lg text-foreground">Menyelesaikan Login Gmail</h3>
          <p className="text-sm text-muted-foreground mt-1">Mohon tunggu sebentar, memeriksa akun dan sekolah Anda...</p>
        </div>
      </div>
    </main>
  );
}
