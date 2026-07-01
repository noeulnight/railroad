# Railroad Frontend Agent Instructions

## Frontend Conventions

- Use React Query for server-state and query/mutation lifecycle management when adding new request/response flows.
- Use Axios for HTTP transport.
- Keep API request functions separate from React components.
- Do not call `fetch` directly from UI components for backend API access.
- Query keys must be centralized or colocated in typed query modules, not repeated ad hoc across components.
- Mutations must invalidate or update related React Query cache entries explicitly.

## shadcn/ui

- Use the shadcn CLI to add and maintain shared shadcn/ui components.
- Keep generated shadcn components under the configured shared UI component directory.
- Do not manually recreate shadcn components when the CLI can add them.
- Do not apply feature-specific styling directly inside shadcn shared components.
- Treat shadcn shared components as reusable primitives.
- Apply feature-specific layout and styling through wrapper components, page components, or feature components.

## Component Structure

- Split components by responsibility.
- Do not place page orchestration, API calls, forms, table/list rendering, and low-level UI primitives in one large file.
- Pages should compose page-local components and feature components and avoid owning detailed UI implementation.
- Feature components should live under feature-oriented folders.
- Shared reusable components should live under shared component folders.
- Do not introduce a `widgets` layer in this app.
- Keep files small enough that one file has one clear reason to change.

## File Layout

- Use Feature-Sliced Design boundaries:
  - `src/app`
  - `src/pages`
  - `src/features`
  - `src/entities`
  - `src/shared`
- Keep backend API clients and query hooks outside page files.
- Prefer typed folders for non-page code, for example:
  - `src/shared/api/*.ts`
  - `src/shared/lib/utils.ts`
  - `src/shared/ui/*.tsx`
  - `src/entities/<domain>/api/*.ts`
  - `src/entities/<domain>/model/*.ts`
  - `src/entities/<domain>/ui/*.tsx`
  - `src/features/<feature>/api/*.ts`
  - `src/features/<feature>/model/*.ts`
  - `src/app/components/*.tsx`
  - `src/pages/<page>/ui/components/*.tsx`
  - `src/pages/<page>/ui/*.tsx`
- Do not put feature DTOs, API clients, query hooks, and components together in a single root file.
- Keep general app utilities consolidated in `src/shared/lib/utils.ts`; do not split small format, color, class, or asset helpers into multiple utility files unless a domain boundary clearly requires it.

## Styling

- Do not style shadcn shared components directly for one feature.
- Keep shared UI primitive styling generic.
- Use composition and wrapper components for feature-specific appearance.
- Avoid oversized marketing-style layouts; prioritize dense, clear operational workflows.

## Verification

- After frontend changes, run:
  - `pnpm lint`
  - `pnpm build`
- When adding interactive or visual flows, run the app locally and verify the affected screen in a browser.
