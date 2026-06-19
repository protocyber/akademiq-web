"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

/**
 * Shared Tabs component (shadcn/Radix).
 *
 * Two usage patterns are supported:
 *
 * 1. State-driven (canonical): `Tabs value/onValueChange` with `TabsContent`
 *    panels. Use this for in-place filtering or modal form sections.
 *
 * 2. Route-driven navigation: `Tabs value={pathname}` with `TabsTrigger
 *    asChild` wrapping a Next.js `<Link>`. Do NOT render `TabsContent` — the
 *    routed page is the content, so per-tab deep-linking, back button, and
 *    refresh all work.
 *
 * a11y caveat (route-driven mode): `asChild` makes the wrapped `<Link>`
 * inherit `role="tab"` from `TabsTrigger`. This is semantically weaker than a
 * `nav` + `aria-current="page"` for navigation; it is an accepted tradeoff to
 * match the shadcn tab look. Revisit with `aria-current` if it causes issues
 * for assistive technology.
 */
const TabsContext = React.createContext<{
  variant?: "default" | "underline" | "tinted";
}>({ variant: "default" });

const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> & {
    variant?: "default" | "underline" | "tinted";
  }
>(({ variant = "default", ...props }, ref) => (
  <TabsContext.Provider value={{ variant }}>
    <TabsPrimitive.Root ref={ref} {...props} />
  </TabsContext.Provider>
));
Tabs.displayName = TabsPrimitive.Root.displayName;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  const { variant } = React.useContext(TabsContext);
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "inline-flex h-12 items-center justify-center text-primary/80 transition-all duration-200 gap-1",
        variant === "underline"
          ? "w-full h-10 justify-start rounded-none border-b border-primary/20 dark:border-primary/10 bg-transparent p-0 mt-2 gap-6"
          : variant === "tinted"
            ? "rounded-md bg-primary/5 dark:bg-primary/5 border border-primary/10 p-1"
            : "rounded-md bg-primary/10 dark:bg-primary/5 border border-primary/20 dark:border-primary/10 p-1",
        className,
      )}
      {...props}
    />
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const { variant } = React.useContext(TabsContext);
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        // Base badge style for nested spans
        "[&_span]:ml-1.5 [&_span]:rounded-full [&_span]:min-w-6 [&_span]:py-0.5 [&_span]:text-[10px] [&_span]:font-semibold [&_span]:transition-colors",
        variant === "underline"
          ? "rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 text-primary/70 dark:text-primary/60 hover:text-primary dark:hover:text-primary data-[state=active]:border-primary data-[state=active]:text-primary font-medium data-[state=active]:font-semibold [&_span]:bg-primary [&_span]:text-primary-foreground dark:[&_span]:bg-primary/20 [&[data-state=active]_span]:bg-primary [&[data-state=active]_span]:text-primary-foreground dark:data-[state=active]:text-primary-foreground dark:[&_span]:text-primary dark:hover:bg-primary/70 dark:[&[data-state=active]_span]:bg-primary-foreground/30"
          : variant === "tinted"
            ? "rounded-md px-3 py-1.5 text-primary/70 dark:text-primary/60 hover:text-primary dark:hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/30 dark:data-[state=active]:hover:text-primary/70 data-[state=active]:bg-primary/15 data-[state=active]:text-primary dark:data-[state=active]:bg-primary/20 [&_span]:bg-primary [&_span]:text-primary-foreground dark:[&_span]:bg-primary/20 [&[data-state=active]_span]:bg-primary [&[data-state=active]_span]:text-primary-foreground dark:data-[state=active]:text-primary-foreground dark:[&_span]:text-primary dark:[&[data-state=active]_span]:bg-primary-foreground/30"
            : "rounded-md px-3 py-1.5 text-primary/70 dark:text-primary/60 hover:text-primary dark:hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/30 dark:data-[state=active]:hover:text-primary/70 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:shadow-primary/10 [&_span]:bg-primary [&_span]:text-primary-foreground dark:[&_span]:bg-primary/20 [&[data-state=active]_span]:bg-primary-foreground/30 [&[data-state=active]_span]:text-primary-foreground dark:data-[state=active]:text-primary-foreground dark:[&_span]:text-primary dark:[&[data-state=active]_span]:bg-primary-foreground/30",
        className,
      )}
      {...props}
    />
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };

