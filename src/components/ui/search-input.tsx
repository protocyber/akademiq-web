"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  debounce?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

export function SearchInput({
  value,
  onChange,
  debounce = 0,
  placeholder,
  className,
  disabled,
  "aria-label": ariaLabel,
}: SearchInputProps) {
  const [draft, setDraft] = React.useState(value);
  const isFirstRender = React.useRef(true);
  const onChangeRef = React.useRef(onChange);
  React.useLayoutEffect(() => { onChangeRef.current = onChange; });

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setDraft(value);
  }, [value]);

  React.useEffect(() => {
    const handle = window.setTimeout(() => onChangeRef.current(draft), debounce);
    return () => window.clearTimeout(handle);
  }, [draft, debounce]);

  function clear() {
    setDraft("");
    onChange("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape" && draft !== "") {
      e.nativeEvent.preventDefault();
      clear();
    }
  }

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        className="flex h-10 w-full rounded-md border border-input bg-background py-2 pl-9 pr-8 text-sm ring-offset-background placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
      {draft && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Hapus pencarian"
          onClick={clear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
