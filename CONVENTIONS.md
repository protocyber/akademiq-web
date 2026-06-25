# AcademiQ Web — Conventions

This document is the rulebook for the `apps/web` codebase. It applies to
every page, feature component, and library file. The rules are enforced
by ESLint where automation makes sense; the rest is on review.

If you find a place where these rules feel wrong, propose a change here
first. Drift creates two ways to do the same thing and that's the start
of a maintenance bill.

## 1. UI primitives via shadcn/ui only

- All interactive UI MUST be composed from shadcn/ui components installed
  under `src/components/ui/`. Buttons come from `<Button>`, inputs from
  `<Input>`, switches from `<Switch>`, and so on.
- Native interactive HTML form controls — `<button>`, `<input>`,
  `<select>`, `<textarea>` — and bare `<form>` without React Hook Form
  wiring are forbidden in `src/app/`, `src/components/features/`, and
  `src/components/pages/`. ESLint blocks them via `react/forbid-elements`.
  `<input type="hidden">` is form plumbing, not an interactive UI control;
  prefer React Hook Form `register`/`setValue` without rendering one.
- Structural elements (`<div>`, `<section>`, `<main>`, `<header>`,
  `<nav>`, `<ul>`, `<li>`, `<p>`, `<span>`, headings) remain allowed.
- In-app navigation MUST use Next.js `<Link>`. The same ESLint rule
  flags `<a href="/...">` to a relative path.
- New shadcn primitives land under `src/components/ui/` via the shadcn
  CLI and stay there.

## 2. All data access through TanStack Query

- Reads use `useQuery` or `useInfiniteQuery`. Writes use `useMutation`.
- Raw `fetch()` is limited to `lib/api/client.ts` for client-side API calls
  and `lib/query/server.ts` for server-side TanStack prefetch. Components
  consume hooks from `lib/query/queries/*` and `lib/query/mutations/*`.
- Pages and feature components MUST NOT import `apiFetch`, token helpers, or
  low-level API utilities directly. Add or extend a TanStack query/mutation hook
  instead.
- No `useEffect`-based fetching anywhere. The hook returned by TanStack
  is the lifecycle.
- A `QueryClientProvider` is mounted once in `src/app/layout.tsx`. In
  tests, wrap with a fresh `QueryClient` per test using `makeQueryClient`.
- For read-heavy pages, prefetch on the server using `dehydrate` and
  rehydrate with `<HydrationBoundary>` so the same hooks read the
  prefetched data on the client. The `/register` plan catalog uses this
  pattern.

## 3. Two-tier loading state

| Surface                                        | Indicator                                |
|------------------------------------------------|------------------------------------------|
| Action-bound controls (Button, Switch, Select) | Inline `<Spinner size="sm" />` + `disabled` |
| Layout regions on first paint                  | shadcn `<Skeleton>` matching final shape |

Rules:

- A surface picks **one** tier. Buttons never show skeletons; layout
  regions never show a centered standalone spinner as their primary
  indicator on first paint.
- The shared spinner is `src/components/ui/spinner.tsx` (Lucide
  `Loader2` + `animate-spin`, sizes via CVA).
- Buttons accept a `loading` prop that toggles the inline spinner +
  `disabled` state. Use it instead of toggling `disabled` manually.
- Skeletons mirror the final layout's shape (heights, columns, row
  count). Replace them with real content the moment the query resolves.

## 4. Forms: Zod schemas + React Hook Form + shared error mapping

- Every form schema lives in `src/lib/schemas/<form>.ts` and exports the
  inferred TypeScript type alongside the schema.
- Forms use React Hook Form with `zodResolver(schema)`.
- Field keys in the Zod schema MUST match the backend field names
  exactly (`admin_email`, not `adminEmail`). The shared mapping helper
  depends on it.
- The submit handler wraps a `useMutation` from `lib/query/mutations/`.
- Backend `VALIDATION_ERROR` payloads route through
  `src/lib/forms/apply-server-field-errors.ts`. The helper calls
  `form.setError(field, { type: "server", message })` for each entry
  and returns the list of fields it touched. If it returned an empty
  array, the error is non-validation: render a top-of-form
  `<Alert variant="destructive">` and a toast.
- Field-level errors render via shadcn `<FormMessage>`. The wizard on
  `/register` jumps the user back to the step that owns the offending
  field on submit failure.

## 4a. Required field markers

- Required fields (Zod schema: non-optional, `min(1)` or equivalent) MUST use
  `<FormLabelRequired>` from `@/components/ui/form` instead of `<FormLabel>`.
  This renders a red asterisk (`*` in `text-destructive`) after the label text.
- Optional fields use plain `<FormLabel>` and MAY include "(opsional)" in the
  label text.
- `FormLabelRequired` is defined in `src/components/ui/form.tsx` and re-exported
  alongside `FormLabel`.

## 5. API client + auth

- `lib/api/client.ts` exposes `apiFetch<T>({ service, path, ... })` and
  `setTokens` / `clearTokens` / `getAccessToken`. Components MUST NOT
  import these directly; they use TanStack hooks.
- The client attaches `Authorization: Bearer <access>` when
  `authenticated: true`. On HTTP 401 with code `EXPIRED_ACCESS_TOKEN`,
  `UNAUTHENTICATED`, or `INVALID_TOKEN`, it attempts one refresh via
  `POST /api/v1/iam/auth/refresh`, retries the original request, and
  redirects to `/login?next=<current-path>` on refresh failure.
- The refresh logic is shared by every TanStack hook through this one
  module. Never duplicate it per call site.

## 6. Toaster + alerts

- Exactly one `<Toaster />` is mounted in `src/app/layout.tsx`. Use
  `toast.success(...)` / `toast.error(...)` from
  `@/components/ui/toaster` for transient feedback.
- User-facing API/backend error copy MUST be centralized in
  `src/lib/errors/messages.ts`. Pages and feature components call
  `getErrorMessage(error, { fallback })` for `toast.error`, destructive
  alerts, and mutation error text; they must not display raw
  `ApiHttpError.message` or map backend error codes inline. Local validation
  text from Zod/RHF can stay with the schema or field.
- For form-level errors (non-field, non-validation), render a top-of-
  form shadcn `<Alert variant="destructive">` *and* fire a toast. The
  alert sticks; the toast is the prompt.

## 7. Routing + auth gates

- `/register` and `/login` are public. Every other route requires an
  authenticated session and redirects to `/login?next=<path>` when no
  valid session is present.
- Already-authenticated users visiting `/login` or `/register` redirect
  to `/dashboard`.
- Use Next.js `<Link>` for in-app navigation. `useRouter` is fine for
  programmatic redirects after a mutation.

## 8. Testing

- **Vitest** for component, hook, and pure-function tests
  (`__tests__/` or colocated `*.test.ts(x)`).
- **Playwright** for end-to-end flows. The default config auto-starts
  `pnpm dev`; the e2e suite hits a running backend (use `make test-e2e`
  in `apps/backend` to bring it up).
- Every form schema has a Vitest spec with at least one valid and one
  invalid case.
- `applyServerFieldErrors` has a Vitest spec covering at least one
  multi-field payload + a non-validation error path.

## 9. Files you should not need to touch

- `next.config.js`, `tsconfig.json`, `postcss.config.js`,
  `tailwind.config.ts`, `components.json` are stable. Open a discussion
  before changing them.
- `Dockerfile` and `Makefile` are owned by the orchestrator and follow
  the standards in `docs/internal/13_engineering_standards/12_makefile_standards.md`
  in the parent repo.

## 10. DataTable page layout — canonical pattern

All DataTable-based pages MUST use `DataTableCard` from
`@/components/ui/data-table-card` instead of hand-rolling Card + CardHeader +
CardContent + toolbar each time.

```
┌─ DataTableCard ───────────────────────────────────────────────────┐
│ CardHeader  title + description   [primaryActions: Create, Invite] │
│ CardContent                                                         │
│   ┌─ DataTableToolbar ────────────────────────────────────────────┐ │
│   │ [☑ selectAll] [BulkActionMenu]  [Search]  [Filter] [Filter]  │ │
│   └───────────────────────────────────────────────────────────────┘ │
│   ┌─ DataTable ──────────────────────────────────────────────────┐  │
│   │ checkbox │ col │ col │ ...│ actions                          │  │
│   └──────────────────────────────────────────────────────────────┘  │
│   ┌─ DataTablePagination (optional) ────────────────────────────┐  │
│   │ Halaman X dari Y · prev / next                               │  │
│   └──────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

Rules:
- `CardHeader` contains **only** title, description, and primary action buttons.
- Search input and all filter controls live in `DataTableToolbar` inside `CardContent`.
- Bulk selection MUST use `useSelectWithinPage` from `@/lib/data-table/use-select-within-page`.
  Never re-implement manual checkbox-column selection logic.
- Bulk action UI MUST be a dropdown menu (not a bar/banner). Render it via the
  `bulkActions` slot of `DataTableToolbar`.
- Pagination is a slot inside `DataTableCard` via `DataTablePaginationProps`.
  It is optional — pages with small, fully-displayed lists omit it.
- Pages that legitimately don't need a feature (e.g. no bulk actions) simply
  omit that slot; do not render empty placeholders.

## 11. When the rules disagree with a feature requirement

Open the openspec change file (`openspec/changes/<name>/`) and update
the relevant capability spec before changing this document or the code.
The spec is the contract; conventions are how we keep the code free of
contradictions while we honour it.

## 12. Overlay primitives — keep one copy of `@radix-ui/react-dialog`

- `Dialog`, `Sheet`, `AlertDialog` (and therefore `ConfirmDialog`), plus
  `cmdk` all build on `@radix-ui/react-dialog`. Each installed copy of that
  package runs its own focus-scope, `aria-hidden`, and body-scroll-lock
  singletons.
- When **two copies** are present in the tree (e.g. the `Dialog` primitive on
  one version and `AlertDialog`/`cmdk` on another), opening one overlay on top
  of another deadlocks: the outer overlay hides a subtree that still holds
  focus → the browser blocks it (`Blocked aria-hidden … descendant retained
  focus`) and the page freezes.
- `pnpm-workspace.yaml` pins `overrides."@radix-ui/react-dialog"` so the whole
  graph resolves to a single version. Do not remove it.
- Before bumping any `@radix-ui/react-*` or `cmdk` version, run
  `pnpm why @radix-ui/react-dialog` and confirm it still reports exactly one
  version. Adjust the override if a transitive consumer needs a newer release.
- Nesting overlays (e.g. a `ConfirmDialog` opened from within a `Dialog`) is
  supported once the copies are unified. The regression guard lives at
  `src/components/ui/nested-dialog.test.tsx`.
