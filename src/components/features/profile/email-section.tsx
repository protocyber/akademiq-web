"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  useRequestEmailChange,
  useResendEmailVerification,
  useCancelEmailChange,
} from "@/lib/query/mutations/use-profile";
import type { MeView } from "@/lib/query/queries/use-me";

const emailSchema = z.object({
  new_email: z.string().email("Format email tidak valid"),
});

type EmailFormValues = z.infer<typeof emailSchema>;

type EmailSectionProps = {
  user: MeView;
};

export function EmailSection({ user }: EmailSectionProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const requestEmailChange = useRequestEmailChange();
  const resendVerification = useResendEmailVerification();
  const cancelEmailChange = useCancelEmailChange();

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      new_email: "",
    },
  });

  const onSubmit = async (values: EmailFormValues) => {
    try {
      await requestEmailChange.mutateAsync(values);
      toast.success("Email verifikasi telah dikirim ke alamat baru");
      setIsEditing(false);
      form.reset();
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === "EMAIL_ALREADY_EXISTS") {
        toast.error("Email sudah digunakan oleh pengguna lain");
      } else {
        toast.error("Gagal mengirim email verifikasi");
      }
    }
  };

  const handleResend = async () => {
    try {
      await resendVerification.mutateAsync();
      toast.success("Email verifikasi telah dikirim ulang");
    } catch {
      toast.error("Gagal mengirim ulang email verifikasi");
    }
  };

  const handleCancel = async () => {
    try {
      await cancelEmailChange.mutateAsync();
      toast.success("Permubahan email dibatalkan");
    } catch {
      toast.error("Gagal membatalkan perubahan email");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Email saat ini</p>
          <p className="font-medium">{user.email}</p>
        </div>

        {user.pending_email && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm font-medium text-yellow-900">
              Perubahan email menunggu verifikasi
            </p>
            <p className="mt-1 text-sm text-yellow-800">
              Email baru: <strong>{user.pending_email}</strong>
            </p>
            <p className="mt-2 text-xs text-yellow-700">
              Silakan cek email baru Anda untuk verifikasi.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResend}
                disabled={resendVerification.isPending}
              >
                {resendVerification.isPending ? "Mengirim..." : "Kirim Ulang"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={cancelEmailChange.isPending}
              >
                {cancelEmailChange.isPending ? "Membatalkan..." : "Batalkan"}
              </Button>
            </div>
          </div>
        )}

        {!user.pending_email && !isEditing && (
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            Ubah Email
          </Button>
        )}

        {isEditing && !user.pending_email && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="new_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Baru</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="nama@contoh.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={requestEmailChange.isPending}>
                  {requestEmailChange.isPending ? "Mengirim..." : "Kirim Verifikasi"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    form.reset();
                  }}
                >
                  Batal
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
