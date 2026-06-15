"use client";

import * as React from "react";
import { Download } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { toast } from "@/components/ui/toaster";
import { useImportStudents, useImportTeachers } from "@/lib/query/mutations/use-academic-ops";
import { extractImportRows, type ImportRowError } from "@/lib/import/extract-rows";
import { getErrorMessage } from "@/lib/errors/messages";

const SPREADSHEET_ACCEPT: Record<string, string[]> = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.oasis.opendocument.spreadsheet": [".ods"],
};

export type ImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: "students" | "teachers";
  templateHref: string;
  templateLabel: string;
};

export function ImportDialog({
  open,
  onOpenChange,
  kind,
  templateHref,
  templateLabel,
}: ImportDialogProps) {
  const importStudents = useImportStudents();
  const importTeachers = useImportTeachers();
  const mutation = kind === "students" ? importStudents : importTeachers;
  const label = kind === "students" ? "siswa" : "guru";
  const title = kind === "students" ? "Siswa" : "Guru";

  const [file, setFile] = React.useState<File | null>(null);
  const [rowErrors, setRowErrors] = React.useState<ImportRowError[]>([]);
  const [summary, setSummary] = React.useState<number | null>(null);

  // Reset transient state whenever the dialog closes.
  React.useEffect(() => {
    if (!open) {
      setFile(null);
      setRowErrors([]);
      setSummary(null);
    }
  }, [open]);

  async function runImport() {
    if (!file) return;
    setRowErrors([]);
    setSummary(null);
    try {
      const out = kind === "students" ? await importStudents.mutateAsync(file) : await importTeachers.mutateAsync(file);
      setSummary(out.imported);
      toast.success(`${out.imported} ${label} diimport.`);
      setFile(null);
    } catch (err) {
      const rows = extractImportRows(err);
      setRowErrors(rows);
      toast.error(
        getErrorMessage(err, {
          fallback: rows.length ? "Import gagal. Periksa error baris." : "Import gagal.",
        }),
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Impor {title}</DialogTitle>
          <DialogDescription>
            Upload file Excel untuk import data {label} secara massal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button asChild variant="outline" size="sm">
            <a href={templateHref} download>
              <Download className="h-4 w-4" /> {templateLabel}
            </a>
          </Button>

          <FileDropzone
            value={file}
            onChange={setFile}
            accept={SPREADSHEET_ACCEPT}
            disabled={mutation.isPending}
          />

          {summary !== null ? (
            <p className="text-sm text-muted-foreground">
              {summary} {label} berhasil diimport.
            </p>
          ) : null}

          {rowErrors.length ? (
            <Alert variant="destructive">
              <AlertTitle>Validasi import gagal</AlertTitle>
              <AlertDescription>
                <div className="space-y-1">
                  {rowErrors.map((row) => (
                    <p key={row.row}>
                      Baris {row.row}:{" "}
                      {Object.entries(row.errors)
                        .map(([field, messages]) => `${field} ${messages.join(", ")}`)
                        .join("; ")}
                    </p>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          <Button
            type="button"
            onClick={runImport}
            disabled={!file || mutation.isPending}
            loading={mutation.isPending}
          >
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
