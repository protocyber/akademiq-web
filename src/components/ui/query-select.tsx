"use client";

import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface QuerySelectProps<TItem> {
  items: TItem[];
  isLoading: boolean;
  value?: string;
  onValueChange: (value: string) => void;
  getValue: (item: TItem) => string;
  getLabel: (item: TItem) => string;
  placeholder: string;
  loadingText?: string;
  emptyText: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "data-testid"?: string;
}

export function QuerySelect<TItem>({
  items,
  isLoading,
  value,
  onValueChange,
  getValue,
  getLabel,
  placeholder,
  loadingText = "Memuat...",
  emptyText,
  disabled,
  className,
  "aria-label": ariaLabel,
  "data-testid": dataTestId,
}: QuerySelectProps<TItem>) {
  const hasItems = items.length > 0;
  const isDisabled = disabled || isLoading || !hasItems;
  const triggerText = isLoading ? loadingText : hasItems ? placeholder : emptyText;

  return (
    <Select value={value} onValueChange={onValueChange} disabled={isDisabled}>
      <SelectTrigger className={className} aria-label={ariaLabel} data-testid={dataTestId}>
        {isLoading ? (
          <span className="flex items-center gap-2 text-muted-foreground/40">
            <Spinner size="sm" />
            {loadingText}
          </span>
        ) : (
          <SelectValue placeholder={triggerText} />
        )}
      </SelectTrigger>
      {hasItems ? (
        <SelectContent>
          {items.map((item) => {
            const itemValue = getValue(item);
            return (
              <SelectItem key={itemValue} value={itemValue}>
                {getLabel(item)}
              </SelectItem>
            );
          })}
        </SelectContent>
      ) : null}
    </Select>
  );
}
