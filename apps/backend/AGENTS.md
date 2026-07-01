# Railroad Backend Instructions

## Backend Conventions

- Environment validation must use `ConfigModule.validationSchema` with Joi, not a custom class-validator env DTO.
- Environment variables must be aliased through `registerAs` config factories under `src/config/configs`.
- Application code should read config aliases such as `auth.jwt.accessSecret`, not raw env keys such as `JWT_ACCESS_SECRET`.
- HTTP request DTOs must use `class-validator` and `class-transformer`.
- For CRUD request bodies, controllers must pass validated DTO instances into service methods instead of destructuring/remapping them in the controller.
- Keep the global `ValidationPipe` enabled with `transform`, `whitelist`, and `forbidNonWhitelisted`.
- Responses that need transformation must use response DTOs with class-transformer and Nest `SerializeOptions`.
- Services must not instantiate response DTOs for HTTP serialization; return plain domain/DB results and let controller `SerializeOptions` with the global serializer shape the response.
- Keep `ClassSerializerInterceptor` registered globally.

## File Layout

- `*.controller.ts`, `*.service.ts`, and `*.module.ts` stay directly under the feature folder.
- Other feature files must live in typed subfolders:
  - `constants/<feature>.constants.ts`
  - `dto/*.dto.ts`
  - `exceptions/*.exception.ts`
  - `interfaces/*.interface.ts`
  - `types/*.type.ts`
  - `specs/*.spec.ts`
  - `repositories/*.repository.ts`
- Do not place constants, DTOs, exceptions, interfaces, types, or specs at the feature folder root.
- Module-level constants shared by a feature service must live in the feature's `constants/` subfolder instead of directly inside service files.
- Name feature constants files after the feature module, such as `auth/constants/auth.constants.ts`.
- HTTP errors must use feature-specific `HttpException` subclasses with stable `code` fields, so clients can localize by code instead of parsing messages.

## Type Safety

- Prefer DTO validation and explicit contracts over ad hoc runtime type checks.
- Prefer concise absence checks such as `if (!value)` for object-or-undefined results; use explicit `=== undefined` only when falsy values such as `''`, `0`, or `false` are valid and must be distinguished.
- Minimize `typeof` and similar runtime checks.
- When runtime checks are unavoidable for external input or provider claims, keep them narrow and local.
- Runtime checks are allowed only at trust boundaries, such as provider payloads, third-party `unknown` responses, or `catch` error narrowing.
- After boundary parsing, pass typed DTOs, tuples, or domain contracts inward; do not repeat `typeof`, `Array.isArray`, or similar defensive checks in services or repositories.
- Document allowed runtime-check boundaries in `docs/runtime-type-checks.md`.
- Do not split logic into excessive one-line private methods. Extract a method only when it names a reusable concept, hides meaningful complexity, isolates a boundary call, or removes real duplication.

## Verification

- After backend changes, run:
  - `pnpm build`
  - `pnpm lint`
  - relevant tests when behavior is changed
