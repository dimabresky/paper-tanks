<script setup lang="ts">
import type { PlayerView, Shot } from "@paper-tanks/shared";
import ShotMap from "./ShotMap.vue";

defineProps<{
  view: PlayerView;
}>();

const emit = defineEmits<{
  rematch: [];
}>();

function winnerText(view: PlayerView): string {
  if (view.endedReason === "disconnect") return "Соперник вышел. Победа за тобой";
  if (view.winner === view.you) return "Победа";
  if (view.winner) return "Поражение";
  return "Конец";
}

function fmtMs(ms?: number): string {
  if (!ms) return "—";
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function accuracyOf(shots: Shot[]): number {
  const fired = shots.filter((s) => s.cause === "fire").length;
  const hits = shots.filter((s) => s.result === "hit" || s.result === "sunk").length;
  return fired === 0 ? 0 : Math.round((hits / fired) * 100);
}
</script>

<template>
  <div class="host-card" data-testid="result">
    <h2>{{ winnerText(view) }}</h2>
    <p v-if="view.endedReason === 'disconnect'">Соперник вышел. Победа за тобой</p>
    <p>
      ты {{ view.stats.accuracy }}% · соперник {{ accuracyOf(view.shotsOnYou) }}% · выстрелы
      {{ view.stats.fired }} · попадания {{ view.stats.hits }}
    </p>
    <p>время {{ fmtMs(view.matchMs) }}</p>
    <p class="hint">карта твоего обстрела</p>
    <ShotMap :shots="view.shotsYouFired" />
    <div class="row">
      <button type="button" class="primary" data-testid="rematch" @click="emit('rematch')">
        Ещё партия
      </button>
    </div>
    <p class="hint">Ждём второго, если он ещё не нажал.</p>
  </div>
</template>
