"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Spinner } from "@/components/ui/spinner";

export interface QueryComboboxProps<TItem> {
  items: TItem[];
  isLoading: boolean;
  value?: string;
  onValueChange: (value: string) => void;
  getValue: (item: TItem) => string;
  getLabel: (item: TItem) => string;
  placeholder: string;
  searchPlaceholder?: string;
  loadingText?: string;
  emptyText: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "data-testid"?: string;
  onSearchChange?: (search: string) => void;
  isSearchLoading?: boolean;
  searchDebounceMs?: number;
}

export function QueryCombobox<TItem>({
  items,
  isLoading,
  value,
  onValueChange,
  getValue,
  getLabel,
  placeholder,
  searchPlaceholder = "Cari...",
  loadingText = "Memuat...",
  emptyText,
  disabled,
  className,
  "aria-label": ariaLabel,
  "data-testid": dataTestId,
  onSearchChange,
  isSearchLoading,
  searchDebounceMs = 300,
}: QueryComboboxProps<TItem>) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const isServerSide = Boolean(onSearchChange);
  const selectedItem = items.find((item) => getValue(item) === value);
  const isDisabled = disabled || isLoading;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setSearch("");
      if (onSearchChange) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        onSearchChange("");
      }
    }
  }

  function handleSearchChange(val: string) {
    setSearch(val);
    if (!onSearchChange) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearchChange(val);
    }, searchDebounceMs);
  }

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange} modal={false}>
      <PopoverPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          data-testid={dataTestId}
          disabled={isDisabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          {isLoading ? (
            <span className="flex items-center gap-2 text-muted-foreground/40">
              <Spinner size="sm" />
              {loadingText}
            </span>
          ) : selectedItem ? (
            <span className="truncate">{getLabel(selectedItem)}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="z-[60] w-[--radix-popover-trigger-width] rounded-md border bg-popover p-0 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
          align="start"
          sideOffset={4}
          onWheel={(e) => e.stopPropagation()}
        >
          <Command shouldFilter={!isServerSide}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={isServerSide ? search : undefined}
              onValueChange={isServerSide ? handleSearchChange : undefined}
            />
            <CommandList>
              {isSearchLoading ? (
                <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                  <Spinner size="sm" />
                  {loadingText}
                </div>
              ) : (
                <>
                  <CommandEmpty>{emptyText}</CommandEmpty>
                  <CommandGroup>
                    {items.map((item) => {
                      const itemValue = getValue(item);
                      const itemLabel = getLabel(item);
                      const isSelected = value === itemValue;
                      return (
                        <CommandItem
                          key={itemValue}
                          value={itemLabel}
                          onSelect={() => {
                            onValueChange(itemValue);
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              isSelected ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {itemLabel}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
