import { render, screen } from "@testing-library/react";
import { fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FileDropzone } from "@/components/ui/file-dropzone";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const ACCEPT: Record<string, string[]> = { [XLSX]: [".xlsx"] };

function makeFile(name: string, type: string, size = 1024) {
  return new File([new Uint8Array(size)], name, { type });
}

// jsdom has no faithful drag-and-drop, so capture the dropzone's onDrop and
// drive it directly — exactly what react-dropzone invokes on a real drop.
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

function renderDropzone(props: Partial<React.ComponentProps<typeof FileDropzone>> = {}) {
  const onChange = vi.fn();
  return {
    onChange,
    ...render(
      <FileDropzone
        value={null}
        onChange={onChange}
        accept={ACCEPT}
        maxSize={1024 * 1024}
        {...props}
      />,
    ),
  };
}

describe("FileDropzone", () => {
  it("accepts a dropped file of an allowed type and calls onChange", () => {
    const { onChange } = renderDropzone();
    const file = makeFile("students.xlsx", XLSX);

    act(() => {
      dz.onDrop!([file], []);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toBe(file);
  });

  it("shows the selected file name and size, and clears on remove", () => {
    const { onChange } = renderDropzone({ value: makeFile("students.xlsx", XLSX, 2048) });

    expect(screen.getByText("students.xlsx")).toBeInTheDocument();
    expect(screen.getByText("2 KB")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Hapus file"));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("rejects a disallowed file type without calling onChange", () => {
    const { onChange } = renderDropzone();
    const file = makeFile("notes.txt", "text/plain");

    act(() => {
      dz.onDrop!([], [
        { file, errors: [{ code: "file-invalid-type", message: "File type not permitted" }] },
      ]);
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
