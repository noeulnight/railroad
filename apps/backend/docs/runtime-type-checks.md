# Runtime Type Check Boundaries

Runtime checks should stay at trust boundaries. After parsing or normalizing a
boundary value, pass typed DTOs or domain contracts inward.

Allowed boundaries:

- Korail GIS and schedule API payload normalization in `KorailService`.
- Compact Korail date-time string parsing in `parseKorailDateTime`.
- Derived train speed validation in `calculateTrainSpeedKmh`, where normalized
  provider coordinates can produce non-finite or physically implausible values.
- `catch` blocks that narrow `unknown` errors for logging or stable HTTP error
  responses.

Avoid repeating `typeof`, `Array.isArray`, or other broad defensive checks in
feature services after these boundaries have produced typed values.
