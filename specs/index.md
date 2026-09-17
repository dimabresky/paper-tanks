# SDD Features Index

## Navigation

- [Project Overview](00-overview.md)
- [Agent Manual](../.cursor/commands/_shared/agent-manual.md)

## Feature Status Dashboard

### Active Features (In Development)

| Task ID | Feature | Status | Created |
|---------|---------|--------|---------|
| [paper-tanks](active/paper-tanks/feature-brief.md) | Paper Tanks (танчики 1vs1) | v1.6 shipped; décor count in 002 | 2026-09-12 |
| [001-dense-field-placement](001-dense-field-placement/spec.md) | Крупнее лист, фигурки, сильнее гарь | Shipped — 16×22, drag, stamp | 2026-09-16 |
| [002-more-trees-crates](002-more-trees-crates/spec.md) | Больше ёлок и ящиков | Implementing — 10 ёлок, 4 ящика на лист | 2026-09-16 |

### Completed Features

| Task ID | Feature | Completed |
|---------|---------|-----------|
| *none* | — | — |

### Backlog Features

| Task ID | Feature | Priority |
|---------|---------|----------|
| *none* | — | — |

## Quick Actions

- Create new feature: `/brief [task-id] [description]`
- Full project roadmap: `/sdd-full-plan [project-id] [description]`
- View active specs: `specs/active/`
- View roadmaps: `specs/todo-roadmap/`

## How Specs Are Created

Each command writes to `specs/active/[task-id]/`:

| Command | Creates |
|---------|---------|
| `/brief` | `feature-brief.md` |
| `/research` | `research.md` |
| `/specify` | `spec.md` |
| `/plan` | `plan.md` |
| `/tasks` | `tasks.md` |
| `/implement` | `todo-list.md` + code |
| `/evolve` | Updates existing spec files |
| `/audit` | Audit report (in chat, not saved) |

Project roadmaps go to `specs/todo-roadmap/[project-id]/`.

---
**Version:** SDD 6.0
