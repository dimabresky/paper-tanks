# Todo List: Paper Tanks

**Task ID:** paper-tanks  
**Status:** Implementation complete (E2E Playwright blocked)  
**Repo:** `/Users/dimabresky/projects/paper-tanks`

## Progress

| Date | Item | Note |
|------|------|------|
| 2026-09-12 | Start | Create repo + implement v1 |
| 2026-09-13 | Engine | Vitest shared + room: pass |
| 2026-09-13 | Live WS | Two clients finished a match on :8787, no fleet leak |
| 2026-09-13 | Discovery | Флот 8 единиц = 18 клеток (в брифe было 20 — арифметика). Spec обновлён. |

## Phase 1: Setup

- [x] 1.1 Монорепо и каркас
- [x] 1.2 Константы и типы флота
- [x] 1.3 HTTP + LAN URL + QR
- [x] 1.4 Оболочка клиента «тетрадь»

## Phase 2: Core

- [x] 2.1 Валидация расстановки
- [x] 2.2 Выстрел, серия, победа
- [x] 2.3 getPlayerView + leak tests

## Phase 3: Integration

- [x] 3.1 Комната и протокол WS
- [x] 3.2 UI расстановки
- [x] 3.3 UI боя и чернильные танки
- [x] 3.4 Статистика, итог, рематч, disconnect

## Phase 4: Polish

- [x] 4.1 Хост-экран помощи
- [ ] [BLOCKED: Playwright Chromium не скачался, Chrome.app нет, только Safari] 4.2 Playwright два контекста
  - Attempted: `npx playwright install chromium` (timeout CDN); `channel: chrome` (нет Google Chrome)
  - Covered by: `apps/server/src/room.test.ts` full match + live WS на :8787
  - Needs: `npx playwright install chromium` или Safari/webkit
- [x] 4.3 README приёмки и визуальный pass (ручной прогон на двух телефонах — за пользователем)

## Blockers

- 4.2 Playwright browsers
