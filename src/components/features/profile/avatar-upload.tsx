"use client";

import * as React from "react";
import Image from "next/image";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiHttpError } from "@/lib/api/types";
import {
  useUploadAvatar,
  useDeleteAvatar,
} from "@/lib/query/mutations/use-profile";
import type { MeView } from "@/lib/query/queries/use-me";

type AvatarUploadProps = {
  user: MeView;
};

export function AvatarUpload({ user }: AvatarUploadProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const uploadAvatar = useUploadAvatar();
  const deleteAvatar = useDeleteAvatar();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Format file harus JPG, PNG, atau WebP");
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 2MB");
      return;
    }

    try {
      await uploadAvatar.mutateAsync({ file });
      toast.success("Avatar berhasil diunggah");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: unknown) {
      if (error instanceof ApiHttpError) {
        if (error.code === "FILE_TOO_LARGE") {
          toast.error("Ukuran file maksimal 2MB");
        } else if (error.code === "INVALID_FILE_TYPE") {
          toast.error("Format file harus JPG, PNG, atau WebP");
        } else {
          toast.error("Gagal mengunggah avatar");
        }
      } else {
        toast.error("Gagal mengunggah avatar");
      }
    }
  };

  const handleDelete = async () => {
    try {
      await deleteAvatar.mutateAsync();
      toast.success("Avatar berhasil dihapus");
    } catch {
      toast.error("Gagal menghapus avatar");
    }
  };

  const initials = user.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Foto Profil</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={user.full_name}
              width={96}
              height={96}
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground">
              {initials}
            </div>
          )}
          <div className="flex flex-col gap-2">
            {/* eslint-disable-next-line react/forbid-elements */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadAvatar.isPending}
            >
              {uploadAvatar.isPending
                ? "Mengunggah..."
                : user.avatar_url
                ? "Ganti Avatar"
                : "Unggah Avatar"}
            </Button>
            {user.avatar_url && (
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={deleteAvatar.isPending}
              >
                {deleteAvatar.isPending ? "Menghapus..." : "Hapus Avatar"}
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Format: JPG, PNG, atau WebP. Maksimal 2MB.
        </p>
      </CardContent>
    </Card>
  );
}
