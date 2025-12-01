## Voltra API Revamp Plan

### Goals

- Deliver a production-ready abstraction layer that makes widgets a persistent integration (no button tapping) while keeping live activities flexible.
- Provide intuitive, target-specific helpers (`useVoltraWidget`, `useVoltraLiveActivity`, `startLiveActivity`, etc.) that can scale to future Apple extension targets.
- Preserve existing `useVoltraUI` / `startVoltraUI` exports for backwards compatibility, but reposition them as advanced APIs.
- Update examples, docs, and tooling so the new surface area is the primary developer experience.

### Deliverables

1. **API Layer**

   - `useVoltraWidget` hook (auto start/update, cleanup on unmount, widget-focused options).
   - `useVoltraLiveActivity` hook (thin wrapper with sensible defaults for live activities).
   - Imperative helpers: `startLiveActivity`, `updateLiveActivity`, `endLiveActivity`, `listLiveActivityIds`, `endAllLiveActivities`.
   - Common option/type definitions and internal utilities to avoid code duplication.
   - Re-export new helpers via `src/index.ts` and ensure TypeScript types flow.

2. **Examples**

   - Refactor `example/screens/widgets/WidgetExample.tsx` to use `useVoltraWidget` (remove button-driven lifecycle, keep optional manual controls if useful for debugging).
   - Optionally add a minimal example for `useVoltraLiveActivity` if it improves clarity (ensure existing demo still works).

3. **Docs**

   - Update README + docs to showcase the new helpers.
   - Move `useVoltraUI` documentation into an “Advanced / Mixed Targets” section.
   - Document migration guidance (old API still works, but new helpers recommended).

4. **Quality**
   - Add or adjust unit tests/typings to cover new helpers (where feasible).
   - Run lint/type-check (if applicable) to confirm project health.

### Implementation Steps

1. Create shared utility module (e.g. `src/helpers.ts`) if needed for hook logic.
2. Implement hooks/helpers in TypeScript, with comments only where behaviour is non-obvious.
3. Update exports and ensure tree-shaking friendliness.
4. Modify widget example to rely on the new hook (introduce provider-style pattern).
5. Refresh docs/README content.
6. Validate with `pnpm lint` / typecheck where possible (or note if skipped).

### Open Considerations

- Multi-widget helper (`useVoltraWidgets`) is optional; evaluate scope once the core hook lands.
- Ensure cleanup doesn’t unintentionally clear widgets users still want running across app restarts (document expectations).
- Confirm dev-mode debug logging remains opt-in to avoid noisy production logs.
