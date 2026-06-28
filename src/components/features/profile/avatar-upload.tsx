"use client";

import * as React from "react";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { getErrorMessage } from "@/lib/errors/messages";
import { IMAGE_ACCEPT, IMAGE_SIZE_HINT, MAX_IMAGE_SELECT_SIZE_BYTES } from "@/lib/media/upload-constraints";
import {
  useUploadAvatar,
  useDeleteAvatar,
} from "@/lib/query/mutations/use-profile";
import type { MeView } from "@/lib/query/queries/use-me";

type AvatarUploadProps = {
  user: MeView;
};

export function AvatarUpload({ user }: AvatarUploadProps) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const uploadAvatar = useUploadAvatar();
  const deleteAvatar = useDeleteAvatar();

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      await uploadAvatar.mutateAsync({ file: selectedFile });
      setSelectedFile(null);
      toast.success("Avatar berhasil diunggah");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, { fallback: "Gagal mengunggah avatar" }));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Hapus avatar? Tindakan ini tidak dapat dibatalkan.")) return;
    try {
      await deleteAvatar.mutateAsync();
      toast.success("Avatar berhasil dihapus");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, { fallback: "Gagal menghapus avatar" }));
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
            <img
              src={user.avatar_url}
              alt={user.full_name}
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground">
              {initials}
            </div>
          )}
          <div className="flex flex-1 flex-col gap-2">
            <FileDropzone
              value={selectedFile}
              onChange={setSelectedFile}
              accept={IMAGE_ACCEPT}
              maxSize={MAX_IMAGE_SELECT_SIZE_BYTES}
              disabled={uploadAvatar.isPending}
              prompt="Tarik avatar ke sini atau klik untuk memilih"
              hint={IMAGE_SIZE_HINT}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleUpload}
                loading={uploadAvatar.isPending}
                disabled={!selectedFile}
              >
                {user.avatar_url ? "Ganti Avatar" : "Unggah Avatar"}
              </Button>
              {user.avatar_url && (
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  loading={deleteAvatar.isPending}
                >
                  Hapus Avatar
                </Button>
              )}
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Format: {IMAGE_SIZE_HINT}
        </p>
      </CardContent>
    </Card>
  );
}
