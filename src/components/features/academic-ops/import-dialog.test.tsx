import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiHttpError } from "@/lib/api/types";

const mutateAsync = vi.fn();

vi.mock("@/lib/query/mutations/use-academic-ops", () => ({
  useImportStudents: () => ({ mutateAsync, isPending: false }),
  useImportTeachers: () => ({ mutateAsync, isPending: false }),
}));

// jsdom cannot faithfully drag-and-drop; capture FileDropzone's onDrop.
const dz = vi.hoisted(() => ({
  onDrop: null as null | ((accepted: File[], rejected: unknown[]) => void),
}));

vi.mock("react-dropzone", () => ({
  useDropzone: (opts: { onDrop: (a: File[], r: unknown[]) => void }) => {
    dz.onDrop = opts.onDrop;
    return {
      getRootProps: () => ({ role: "presentation", tabIndex: 0 }),
      getInputProps: () => ({ type: "file" }),
      isDragActive: false,
      isDragReject: false,
    };
  },
}));

import { ImportDialog } from "@/components/features/academic-ops/import-dialog";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function makeXlsx(name: string) {
  return new File([new Uint8Array(8)], name, { type: XLSX });
}

function chooseFile(file: File) {
  act(() => {
    dz.onDrop!([file], []);
  });
}

describe("ImportDialog", () => {
  beforeEach(() => {
    mutateAsync.mockReset();
  });

  it("runs a successful import and shows the summary", async () => {
    mutateAsync.mockResolvedValueOnce({ imported: 3 });
    render(
      <ImportDialog
        open
        onOpenChange={() => undefined}
        kind="students"
        templateHref="/templates/students-template.xlsx"
        templateLabel="Unduh Template Siswa"
      />,
    );

    chooseFile(makeXlsx("students.xlsx"));
    fireEvent.click(screen.getByRole("button", { name: "Import" }));

    await waitFor(() =>
      expect(screen.getByText(/3 siswa berhasil diimport/)).toBeInTheDocument(),
    );
    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("surfaces row-level validation errors without persisting", async () => {
    mutateAsync.mockRejectedValueOnce(
      new ApiHttpError(
        422,
        { code: "IMPORT_VALIDATION_FAILED", message: "import validation failed" },
        {
          error: { code: "IMPORT_VALIDATION_FAILED" },
          rows: [{ row: 2, errors: { nip: ["duplicate in file"] } }],
        },
      ),
    );
    render(
      <ImportDialog
        open
        onOpenChange={() => undefined}
        kind="teachers"
        templateHref="/templates/teachers-template.xlsx"
        templateLabel="Unduh Template Guru"
      />,
    );

    chooseFile(makeXlsx("teachers.xlsx"));
    fireEvent.click(screen.getByRole("button", { name: "Import" }));

    await waitFor(() =>
      expect(screen.getByText(/Validasi import gagal/)).toBeInTheDocument(),
    );
    expect(screen.getByText(/Baris 2:/)).toBeInTheDocument();
  });
});
