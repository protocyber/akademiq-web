"use client";

import * as React from "react";
import { UploadCloud, X } from "lucide-react";
import { useDropzone, type FileRejection } from "react-dropzone";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type FileDropzoneProps = {
  /** Controlled selected file (or null). */
  value: File | null;
  /** Called with the newly accepted file, or null when cleared. */
  onChange: (file: File | null) => void;
  /** Accept map passed straight to react-dropzone (MIME → extensions). */
  accept?: Record<string, string[]>;
  /** Max file size in bytes. Defaults to 5 MB. */
  maxSize?: number;
  disabled?: boolean;
  className?: string;
  /** Idle prompt text. */
  prompt?: string;
  /** Hint shown under the prompt, e.g. accepted types. */
  hint?: string;
};

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;

export function FileDropzone({
  value,
  onChange,
  accept,
  maxSize = DEFAULT_MAX_SIZE,
  disabled = false,
  className,
  prompt = "Tarik file ke sini atau klik untuk memilih",
  hint = ".xlsx, .xls, .ods — maks 1 file",
}: FileDropzoneProps) {
  const [rejection, setRejection] = React.useState<string | null>(null);

  const onDrop = React.useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      setRejection(null);
      if (rejected.length > 0) {
        setRejection(describeRejection(rejected[0], maxSize));
      }
      if (accepted.length > 0) {
        onChange(accepted[0]);
      }
    },
    [maxSize, onChange],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles: 1,
    multiple: false,
    disabled,
  });

  const clear = () => {
    onChange(null);
    setRejection(null);
  };

  if (value) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm">
          <div className="flex min-w-0 items-center gap-2">
            <UploadCloud className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate font-medium">{value.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatBytes(value.size)}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-2"
            disabled={disabled}
            onClick={clear}
            aria-label="Hapus file"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center text-sm transition-colors",
          isDragActive && "border-primary bg-primary/5",
          (isDragReject || rejection) && "border-destructive bg-destructive/5",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud className="mb-1 h-6 w-6 text-muted-foreground" />
        <span className="font-medium">{prompt}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      {rejection ? (
        <p className="text-xs text-destructive" role="alert">
          {rejection}
        </p>
      ) : null}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function describeRejection(rejection: FileRejection, maxSize: number): string {
  const file = rejection.file;
  const name = file?.name ?? "File";
  for (const err of rejection.errors) {
    if (err.code === "file-too-large") {
      return `${name} terlalu besar (maks ${formatBytes(maxSize)}).`;
    }
    if (err.code === "file-invalid-type") {
      return `${name} tipe file tidak didukung.`;
    }
    if (err.code === "too-many-files") {
      return "Hanya boleh 1 file.";
    }
  }
  return `${name} ditolak.`;
}
