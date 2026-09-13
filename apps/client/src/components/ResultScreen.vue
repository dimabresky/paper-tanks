<script setup lang="ts">
import type { PlayerView } from "@paper-tanks/shared";
import ShotMap from "./ShotMap.vue";

defineProps<{
  view: PlayerView;
}>();

const emit = defineEmits<{
  rematch: [];
}>();

function winnerText(view: PlayerView): string {
  if (view.winner === "disconnect") return "Соперник вышел. Победа за тобой";
  if (view.winner === view.you) return "Победа";
  if (view.winner) return "Поражение";
  return "Конец";
}

function fmtMs(ms?: number): string {
  if (!ms) return "—";
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
</script>

<template>
  <div class="host-card" data-testid="result">
    <h2>{{ winnerText(view) }}</h2>
    <p v-if="view.endedReason === 'disconnect'">Соперник вышел. Победа за тобой</p>
    <p>точность {{ view.stats.accuracy }}% · выстрелы {{ view.stats.fired }} · попадания {{ view.stats.hits }}</p>
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
