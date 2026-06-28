import "@testing-library/jest-dom/vitest";
import "./src/lib/zod-error-map";

// jsdom does not implement ResizeObserver; several UI components (e.g. the
// scrollable Tabs) observe element size. Provide a no-op implementation.
class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = ResizeObserverPolyfill as unknown as typeof ResizeObserver;
}
