"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp, ChevronsUpDown, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 [&_[data-placeholder]]:text-muted-foreground/40",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className,
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export type ComboboxOption = {
  value: string;
  label: string;
};

type ComboboxBaseProps<TItem> = {
  items: TItem[];
  getOptionValue?: (item: TItem) => string;
  getOptionLabel?: (item: TItem) => string;
  placeholder?: string;
  searchPlaceholder?: string;
  loadingText?: string;
  emptyText?: string;
  isLoading?: boolean;
  isSearchLoading?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  searchable?: boolean;
  onSearchChange?: (search: string) => void;
  searchDebounceMs?: number;
  popoverModal?: boolean;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "data-testid"?: string;
};

type ComboboxSingleProps = {
  multiple?: false;
  value?: string;
  onValueChange: (value: string) => void;
};

type ComboboxMultiProps = {
  multiple: true;
  value: string[];
  onValueChange: (value: string[]) => void;
};

export type ComboboxProps<TItem = ComboboxOption> = ComboboxBaseProps<TItem> &
  (ComboboxSingleProps | ComboboxMultiProps);

function defaultGetOptionValue<TItem>(item: TItem) {
  return (item as ComboboxOption).value;
}

function defaultGetOptionLabel<TItem>(item: TItem) {
  return (item as ComboboxOption).label;
}

export function Combobox<TItem = ComboboxOption>({
  items,
  getOptionValue = defaultGetOptionValue,
  getOptionLabel = defaultGetOptionLabel,
  placeholder = "Pilih...",
  searchPlaceholder = "Cari...",
  loadingText = "Memuat...",
  emptyText = "Tidak ada hasil.",
  isLoading,
  isSearchLoading,
  disabled,
  className,
  id,
  searchable,
  onSearchChange,
  searchDebounceMs = 300,
  popoverModal = false,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  "data-testid": dataTestId,
  ...selectionProps
}: ComboboxProps<TItem>) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMultiple = selectionProps.multiple === true;
  const hasItems = items.length > 0;
  const isDisabled = disabled || isLoading || (!hasItems && !searchable);
  const isServerSide = Boolean(onSearchChange);
  const shouldShowSearch = searchable || isServerSide;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setSearch("");
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onSearchChange?.("");
    }
  }

  function handleSearchChange(next: string) {
    setSearch(next);
    if (!onSearchChange) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearchChange(next), searchDebounceMs);
  }

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  React.useEffect(() => {
    if (!open || !shouldShowSearch) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, shouldShowSearch]);

  const normalizedItems = React.useMemo(
    () =>
      items.map((item) => ({
        item,
        value: getOptionValue(item),
        label: getOptionLabel(item),
      })),
    [getOptionLabel, getOptionValue, items],
  );

  const selectedItems = isMultiple
    ? normalizedItems.filter((item) => selectionProps.value.includes(item.value))
    : normalizedItems.filter((item) => item.value === selectionProps.value);

  function setSingleValue(value: string) {
    if (!isMultiple) {
      selectionProps.onValueChange(value);
      setOpen(false);
    }
  }

  function toggleMultiValue(value: string) {
    if (!isMultiple) return;
    if (selectionProps.value.includes(value)) {
      selectionProps.onValueChange(selectionProps.value.filter((item) => item !== value));
    } else {
      selectionProps.onValueChange([...selectionProps.value, value]);
    }
  }

  function removeMultiValue(value: string) {
    if (!isMultiple) return;
    selectionProps.onValueChange(selectionProps.value.filter((item) => item !== value));
  }

  const triggerContent = isLoading ? (
    <span className="flex items-center gap-2 text-muted-foreground/40">
      <Spinner size="sm" />
      {loadingText}
    </span>
  ) : isMultiple ? (
    <div className="flex flex-1 flex-wrap gap-1">
      {selectedItems.length === 0 ? (
        <span className="text-muted-foreground">{placeholder}</span>
      ) : (
        selectedItems.map((option) => (
          <Badge key={option.value} variant="secondary" className="gap-1">
            {option.label}
            <span
              role="button"
              tabIndex={-1}
              aria-label={`Hapus ${option.label}`}
              className="ml-0.5 rounded-sm hover:text-destructive"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                removeMultiValue(option.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  removeMultiValue(option.value);
                }
              }}
            >
              <X className="h-3 w-3" />
            </span>
          </Badge>
        ))
      )}
    </div>
  ) : selectedItems[0] ? (
    <span className="truncate">{selectedItems[0].label}</span>
  ) : (
    <span className="text-muted-foreground">{hasItems ? placeholder : emptyText}</span>
  );

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange} modal={popoverModal}>
      <PopoverPrimitive.Trigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          data-testid={dataTestId}
          disabled={isDisabled}
          className={cn(
            isMultiple
              ? "h-auto min-h-10 w-full justify-between gap-2 px-3 py-2"
              : "w-full justify-between font-normal",
            className,
          )}
        >
          {triggerContent}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="z-[60] w-[--radix-popover-trigger-width] rounded-md border bg-popover p-0 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
          align="start"
          sideOffset={4}
          onWheel={(event) => event.stopPropagation()}
        >
          <Command shouldFilter={!isServerSide}>
            {shouldShowSearch ? (
              <CommandInput
                ref={inputRef}
                placeholder={searchPlaceholder}
                value={isServerSide ? search : undefined}
                onValueChange={isServerSide ? handleSearchChange : undefined}
              />
            ) : null}
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
                    {normalizedItems.map((option) => {
                      const checked = isMultiple
                        ? selectionProps.value.includes(option.value)
                        : selectionProps.value === option.value;
                      return (
                        <CommandItem
                          key={option.value}
                          value={option.label}
                          onSelect={() => {
                            if (isMultiple) toggleMultiValue(option.value);
                            else setSingleValue(option.value);
                          }}
                        >
                          <Check
                            className={cn(
                              isMultiple ? "h-4 w-4" : "mr-2 h-4 w-4",
                              checked ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {option.label}
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

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
