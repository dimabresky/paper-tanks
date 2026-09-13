# AGENTS.md

Instructions for coding agents working in this repository.

**Law of the repo:** [`.specify/memory/constitution.md`](.specify/memory/constitution.md) wins if this file and the constitution disagree. Feature specs describe the *game*, not git process.

## What this is

Paper Tanks: two-player notebook battleship over LAN. One Node process on a PC hosts HTTP + WebSocket (`:8787`). Phones join via QR. Vue 3 client. Rules live in `packages/shared`. There is **no** phone-to-phone P2P, no accounts, no database.

```text
apps/client     Vue 3 + Vite — table UI only
apps/server     node:http + ws — Room, LAN QR, thin dispatch
packages/shared types, fleet, match, view — no DOM, no sockets
e2e             Playwright, two browser contexts
specs/active/paper-tanks   current feature spec / plan / tasks
```

Commands: `pnpm dev`, `pnpm test`, `pnpm test:e2e`, `pnpm typecheck`, `pnpm start`.

## Where to read before coding

| Need | File |
|------|------|
| MUST principles | `.specify/memory/constitution.md` |
| What to build | `specs/active/paper-tanks/spec.md` |
| How to build | `specs/active/paper-tanks/plan.md` |
| Work items | `specs/active/paper-tanks/tasks.md` |
| Human runbook | `README.md` |

Do not start product code without an approved spec and plan (constitution I). Implement on a git branch from `dev`, not on `main`/`dev` directly.

## Workflow

Owner reads artifacts, approves gates and merge. Agent writes spec/plan/tasks/code and git, but does not skip gates or merge alone.

1. `/speckit-specify` — spec
2. **Owner gate** — read spec; if unclear → `/speckit-clarify`, **not** plan
3. `/speckit-plan`
4. **Owner gate** — read plan
5. `/speckit-tasks`
6. `/speckit-analyze` — optional, useful after tasks
7. Git: latest `dev` → `feat/<topic>` or `fix/<topic>` (ask if `dev` is missing or if unrelated local changes exist)
8. `/speckit-implement` **on that branch**, scoped to the request
9. Tests / typecheck / build; commits in English, [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
10. Push + PR **into `dev`**
11. `/review-bugbot` with the PR branch checked out; compare against `dev`
12. Owner picks which findings to fix; agent does **not** patch Bugbot in the same step unless asked
13. Babysit CI, conflicts, review comments; product disputes go to the owner
14. Merge **only after explicit “merge”**; then delete the remote branch and `git checkout dev && git pull`

Do not mix specify, implement, and bugbot in one prompt.

Never force-push unless asked. Never merge with red CI, missing required reviews, or open blocking comments. Never delete the remote branch before a confirmed merge. Do not use `/review-bugbot` as a substitute for reading spec or plan.

## Development concepts

Apply these to TypeScript in this monorepo. Prefer a small, obvious change over a new abstraction.

### SOLID (in this codebase)

- **S** — `packages/shared` owns rules; `Room` owns sockets and seats; Vue components own presentation. Do not put hit/miss logic in a `.vue` file.
- **O** — new shot results (`tree`, `crate`) extend `applyFire` / `ShotResult`, not a parallel client-side engine.
- **L** — `getPlayerView(state, seat)` must remain a safe substitute for “what this player may see”. Callers must not need the full `MatchState`.
- **I** — clients send intents (`join`, `place`, `ready`, `fire`, `rematch`). They do not send “I hit a tank”.
- **D** — UI depends on `PlayerView`, not on `Seat.fleet` of the opponent. Tests depend on pure functions, not on Vite or `ws`.

### DRY, KISS, YAGNI

- **DRY** — one `validateFleet`, one `getPlayerView`, one cell grid (`GridBoard`). Duplicate ink drawings only when the shape is actually different (tank vs tree vs crate).
- **KISS** — one in-memory `Room.state`. No Redis, no ORM, no extra realtime framework.
- **YAGNI** — no P2P, no PWA install, no Pinia until `useGame` is actually unmanageable, no Canvas for the board.

### Frontend (Vue 3)

- Vue 3 SFC + `<script setup lang="ts">`. Shared UI logic → composables (`useGame.ts`), not mixins.
- `data-testid` on cells, host panel, stats, status, ready — Playwright depends on them.
- Cells are real `<button>`s with `data-x` / `data-y`. Zoom via `--cell-size` and scroll, not a scaled screenshot (`transform` that breaks hit-testing).
- One current-step line (`data-testid="status"`), Russian copy, verb labels («Повернуть», not «гориз.»).
- Do not keep opponent fleet in client state “for convenience”.
- Prefer CSS + SVG over Canvas. Ink drawings: `overflow: hidden`, paths inside the occupied cells.
- Accessibility: coordinate `aria-label` on cells; outcome is text, not color alone.

### Backend (Node)

- ESM TypeScript, Node ≥ 22.12. `apps/server` dispatches messages and broadcasts views; it does not reimplement rules.
- Authoritative `MatchState` lives only in process RAM. Restart = new table. Do not persist fleets to disk unless spec says so.
- Validate every `ClientMessage`. Unknown seat, wrong turn, taken cell → `GameError` with a Russian `message`.
- Bind `0.0.0.0:8787`. Preferred QR URL is LAN IPv4, never `169.254.0.0/16`, never “localhost only” for phones.
- `/api/host` must not contain fleets or decorations.
- Disconnect: 60 s without the same token → battle win for the other seat or free the seat in placement.

### Types, tests, git

- Strict TypeScript. Public types exported from `packages/shared/src/index.ts`.
- Rules and leak tests in Vitest (`packages/shared`, `apps/server`) without a browser. Fog-of-war: serialized `getPlayerView` for seat A must not contain B’s unrevealed unit or decoration coordinates.
- E2E: two Playwright contexts, full match.
- Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:` — English body, why over what.
- Scope the diff to the task. Do not drive-by refactor unrelated Vue/CSS.

## Hidden information (non-negotiable)

Full fleets, trees, and crates stay on the host. `getPlayerView` is the only payload a player device may use. If a change would make the opponent’s ships appear in DevTools JSON, it is a bug — add or extend a leak test, do not ship it.
