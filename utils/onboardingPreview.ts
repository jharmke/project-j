// In-memory flag for the dev "Preview Onboarding" tool.
//
// When ON, every onboarding screen's save handler skips ALL storage writes (and
// therefore all cloud sync), so walking the flow to review styling/copy can never
// mutate or clobber real data. It also lets the Continue buttons advance without
// filling in fields, so the whole flow is walkable for visual review.
//
// In-memory ONLY: it is never persisted, so it resets to false on any app reload and
// can never get stuck on. Safe by construction.
let _preview = false;

export function setOnboardingPreview(on: boolean): void { _preview = on; }
export function isOnboardingPreview(): boolean { return _preview; }
