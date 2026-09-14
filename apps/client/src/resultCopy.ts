import type { PlayerView } from "@paper-tanks/shared";

export function isDisconnectVictory(view: PlayerView): boolean {
  return view.endedReason === "disconnect" && view.winner === view.you;
}

export function resultHeadline(view: PlayerView): string {
  if (isDisconnectVictory(view)) return "Соперник вышел. Победа за тобой";
  if (view.winner === view.you) return "Победа";
  if (view.winner) return "Поражение";
  return "Конец";
}
