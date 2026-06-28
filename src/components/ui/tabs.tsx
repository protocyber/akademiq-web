"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    scrollable?: boolean;
  }
>(({ className, scrollable = false, ...props }, ref) => {
  const { variant } = React.useContext(TabsContext);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = React.useState(false);
  const [showRightArrow, setShowRightArrow] = React.useState(false);

  const checkScroll = React.useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  React.useEffect(() => {
    if (!scrollable) return;
    const container = containerRef.current;
    if (!container) return;

    checkScroll();

    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(container);
    container.addEventListener("scroll", checkScroll, { passive: true });

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener("scroll", checkScroll);
    };
  }, [scrollable, checkScroll]);

  const scrollByOneTab = React.useCallback((direction: "left" | "right") => {
    const container = containerRef.current;
    if (!container) return;
    const tabs = container.querySelectorAll('[role="tab"]');
    const { scrollLeft, clientWidth } = container;

    if (direction === "right") {
      for (const tab of Array.from(tabs)) {
        const tabRight = (tab as HTMLElement).offsetLeft + (tab as HTMLElement).offsetWidth;
        if (tabRight > scrollLeft + clientWidth) {
          (tab as HTMLElement).scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
          break;
        }
      }
    } else {
      for (const tab of Array.from(tabs).reverse()) {
        if ((tab as HTMLElement).offsetLeft < scrollLeft) {
          (tab as HTMLElement).scrollIntoView({ behavior: "smooth", inline: "end", block: "nearest" });
          break;
        }
      }
    }
  }, []);

  const list = (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "inline-flex h-12 items-center justify-center text-foreground transition-all duration-200 gap-1",
        variant === "underline"
          ? "w-full h-10 justify-start items-end rounded-none border-b border-border bg-transparent p-0 mt-2 gap-6"
          : "rounded-md bg-muted border border-border p-1",
        scrollable && "min-w-max justify-start",
        className,
      )}
      {...props}
    />
  );

  if (!scrollable) {
    return list;
  }

  return (
    <div className="relative w-full">
      {showLeftArrow && (
        <button
          type="button"
          onClick={() => scrollByOneTab("left")}
          className="absolute left-0 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-background border border-primary/20 shadow-md hover:bg-primary/5 transition-colors"
          aria-label="Scroll ke kiri"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {showRightArrow && (
        <button
          type="button"
          onClick={() => scrollByOneTab("right")}
          className="absolute right-0 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-background border border-primary/20 shadow-md hover:bg-primary/5 transition-colors"
          aria-label="Scroll ke kanan"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
      {/* TODO: tambahkan `scrollbar-thin` atau `scrollbar-none` setelah upgrade ke Tailwind v4.3+ */}
      <div ref={containerRef} className="w-full overflow-x-auto overflow-y-hidden">
        {list}
      </div>
    </div>
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
        "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:focus-visible:ring-1 dark:focus-visible:ring-ring dark:focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50",
        // Base badge style for nested spans
        "[&_span]:ml-1.5 [&_span]:rounded-full [&_span]:min-w-6 [&_span]:py-0.5 [&_span]:text-[10px] [&_span]:font-semibold [&_span]:transition-colors",
        variant === "underline"
          ? "rounded-none border-b-2 border-transparent h-full -mb-px px-1 text-muted-foreground hover:text-foreground data-[state=active]:border-[#fd8c73] dark:data-[state=active]:border-[#f78166] data-[state=active]:text-foreground font-medium data-[state=active]:font-semibold [&_span]:bg-muted [&_span]:text-muted-foreground [&[data-state=active]_span]:bg-muted-foreground/20 [&[data-state=active]_span]:text-foreground"
          : variant === "tinted"
            ? "rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 data-[state=active]:bg-muted data-[state=active]:text-foreground [&_span]:bg-background [&_span]:text-muted-foreground [&[data-state=active]_span]:bg-muted-foreground/20 [&[data-state=active]_span]:text-foreground"
            : "rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:shadow-primary/10 dark:data-[state=active]:shadow-none [&_span]:bg-background [&_span]:text-muted-foreground [&[data-state=active]_span]:bg-primary-foreground/30 [&[data-state=active]_span]:text-primary-foreground",
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

