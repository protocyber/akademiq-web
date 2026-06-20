"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { DayPicker, type DropdownProps } from "react-day-picker";
import { id } from "date-fns/locale/id";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "dropdown",
  startMonth = new Date(new Date().getFullYear() - 100, 0),
  endMonth = new Date(new Date().getFullYear() + 10, 11),
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      locale={id}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      captionLayout={captionLayout}
      startMonth={startMonth}
      endMonth={endMonth}
      classNames={{
        root: "relative w-fit",
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-4",
        nav: "absolute left-3 right-3 top-3 flex h-7 items-center justify-between",
        month_caption: "flex h-7 items-center justify-center px-10 text-sm font-medium",
        button_previous: cn(buttonVariants({ variant: "ghost" }), "h-7 w-7 p-0"),
        button_next: cn(buttonVariants({ variant: "ghost" }), "h-7 w-7 p-0"),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday: "w-9 rounded-md text-[0.8rem] font-normal text-muted-foreground",
        week: "mt-2 flex w-full",
        day: "h-9 w-9 p-0 text-center text-sm",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
        ),
        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        dropdowns: "flex justify-center gap-1.5",
        dropdown_root: "inline-flex items-center",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
        Dropdown: ({ value, onChange, options, className, ...props }: DropdownProps) => {
          const handleOnChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
            if (onChange) {
              onChange(e);
            }
          };
          return (
            <div className="relative inline-flex items-center">
              <select
                value={value}
                onChange={handleOnChange}
                className={cn(
                  "h-7 w-full appearance-none rounded-md border border-input bg-background px-2.5 py-1 pr-7 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
                  className
                )}
                {...props}
              >
                {options?.map((option) => (
                  <option key={option.value} value={option.value} disabled={option.disabled} className="bg-popover text-popover-foreground">
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 h-3.5 w-3.5 opacity-50 pointer-events-none text-muted-foreground" />
            </div>
          );
        }
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
