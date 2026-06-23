"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
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
    <main className="container mx-auto flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-6 w-6" />
          </div>
          <CardTitle>Menyelesaikan Login Gmail</CardTitle>
          <CardDescription>Memeriksa akun dan sekolah Anda...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-8">
          <Spinner />
        </CardContent>
      </Card>
    </main>
  );
}
