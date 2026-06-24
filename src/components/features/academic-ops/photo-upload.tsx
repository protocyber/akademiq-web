"use client";

import * as React from "react";
import { Image as ImageIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage } from "@/lib/errors/messages";
import { useUploadMedia } from "@/lib/query/mutations/use-academic-ops";
import { useMediaAssets } from "@/lib/query/queries/use-academic-ops";

const IMAGE_ACCEPT = { "image/*": [".jpg", ".jpeg", ".png", ".webp"] };
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

type PhotoUploadProps = {
  ownerType: "student" | "teacher";
  ownerId?: string;
  disabled?: boolean;
};

export function PhotoUpload({ ownerType, ownerId, disabled = false }: PhotoUploadProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const media = useMediaAssets(ownerType, ownerId);
  const upload = useUploadMedia();
  const activeMedia = media.data?.find((asset) => asset.is_active) ?? media.data?.[0];

  async function onUpload() {
    if (!ownerId || !file) return;
    try {
      await upload.mutateAsync({ ownerType, ownerId, file });
      setFile(null);
      toast.success("Foto berhasil diunggah");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Gagal mengunggah foto" }));
    }
  }

  if (!ownerId) {
    return (
      <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
        Simpan data terlebih dahulu untuk mengunggah foto.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-start gap-3">
        {activeMedia?.file_url ? (
          <img src={activeMedia.file_url} alt="Foto" className="h-20 w-16 rounded-md border object-cover" />
        ) : (
          <div className="flex h-20 w-16 items-center justify-center rounded-md border-2 border-dashed bg-muted">
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 space-y-2">
          <FileDropzone
            value={file}
            onChange={setFile}
            accept={IMAGE_ACCEPT}
            maxSize={MAX_IMAGE_SIZE}
            disabled={disabled || upload.isPending}
            prompt="Tarik foto ke sini atau klik untuk memilih"
            hint="JPG, PNG, atau WebP. Maksimal 2MB."
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onUpload}
            loading={upload.isPending}
            disabled={!file || disabled}
          >
            Unggah Foto
          </Button>
        </div>
      </div>
    </div>
  );
}
