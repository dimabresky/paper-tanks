<script setup lang="ts">
import { validateFleet, type Unit } from "@paper-tanks/shared";
import { computed, onUnmounted, ref, watch } from "vue";
import BattleBoard from "./components/BattleBoard.vue";
import HostPanel from "./components/HostPanel.vue";
import PlacementBoard from "./components/PlacementBoard.vue";
import ResultScreen from "./components/ResultScreen.vue";
import { useGame } from "./composables/useGame.ts";

const { view, error, connected, host, nick, firing, send } = useGame();
const localUnits = ref<Unit[]>([]);
const fireWait = ref(false);
let fireTimer: ReturnType<typeof setTimeout> | undefined;

watch(
  () => view.value?.yourFleet,
  (fleet) => {
    if (fleet?.units.length) localUnits.value = fleet.units;
    if (view.value?.phase === "placement" && !fleet) localUnits.value = [];
  },
);

watch(firing, (isFiring) => {
  fireWait.value = false;
  if (fireTimer) clearTimeout(fireTimer);
  if (isFiring) {
    fireTimer = setTimeout(() => {
      fireWait.value = true;
    }, 3000);
  }
});

onUnmounted(() => {
  if (fireTimer) clearTimeout(fireTimer);
});

const phase = computed(() => view.value?.phase ?? (connected.value ? "lobby" : "connecting"));
const seatsTaken = computed(() => view.value?.seatsTaken ?? 0);

const statusText = computed(() => {
  if (fireWait.value) return "Ждём ответ стола…";
  if (!connected.value) return "соединяемся…";
  if (phase.value === "lobby" || phase.value === "connecting") {
    return "Ждём второго за стол — пусть отсканирует QR";
  }
  if (phase.value === "placement") {
    if (view.value?.yourReady) return "Ждём, пока соперник нажмёт Готов";
    return "Расставь танки и нажми Готов";
  }
  if (phase.value === "battle" && view.value) {
    if (view.value.turn === view.value.you) return "Твой ход — укажи клетку на чужом листе";
    return "Сейчас ход соперника";
  }
  if (phase.value === "ended" && view.value?.endedReason === "disconnect") {
    return "Соперник вышел. Победа за тобой";
  }
  if (phase.value === "ended") return "Партия окончена";
  return "";
});

function onUnits(units: Unit[]): void {
  localUnits.value = units;
  const v = validateFleet(units);
  if (v.ok) send({ type: "place", payload: { units } });
}

function onReady(): void {
  const v = validateFleet(localUnits.value);
  if (!v.ok) return;
  send({ type: "place", payload: { units: localUnits.value } });
  send({ type: "ready" });
}

function onFire(x: number, y: number): void {
  firing.value = true;
  send({ type: "fire", payload: { x, y } });
}
</script>

<template>
  <div class="sheet">
    <header class="masthead">
      <h1>Танчики на бумаге</h1>
      <p>{{ view?.nick ?? "тетрадный лист" }}</p>
    </header>

    <HostPanel v-if="seatsTaken < 2" :host="host" :seats-taken="seatsTaken" />

    <div v-if="phase === 'lobby' || phase === 'connecting'" class="row">
      <input
        v-model="nick"
        maxlength="24"
        placeholder="ник (необязательно)"
        style="font: inherit; padding: 0.3rem 0.5rem; border: 1px solid #1c4c9c; background: transparent"
      />
    </div>

    <p class="status" data-testid="status">{{ statusText }}</p>
    <p class="error">{{ error }}</p>

    <PlacementBoard
      v-if="phase === 'placement'"
      :units="localUnits"
      :ready="Boolean(view?.yourReady)"
      :opponent-ready="Boolean(view?.opponentReady)"
      @update:units="onUnits"
      @ready="onReady"
    />

    <BattleBoard
      v-if="phase === 'battle' && view"
      :view="view"
      :firing="firing"
      @fire="onFire"
    />

    <ResultScreen v-if="phase === 'ended' && view" :view="view" @rematch="send({ type: 'rematch' })" />
  </div>
</template>
