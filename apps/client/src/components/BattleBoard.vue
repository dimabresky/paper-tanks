<script setup lang="ts">
import type { PlayerView, Shot, Unit } from "@paper-tanks/shared";
import { computed, ref } from "vue";
import GridBoard from "./GridBoard.vue";
import TankInk from "./TankInk.vue";

const props = defineProps<{
  view: PlayerView;
  firing: boolean;
}>();

const emit = defineEmits<{
  fire: [x: number, y: number];
}>();

const tab = ref<"enemy" | "mine">("enemy");
const myTurn = computed(() => props.view.turn === props.view.you && props.view.phase === "battle");

function origin(unit: Unit) {
  return { x: Math.min(...unit.cells.map((c) => c.x)), y: Math.min(...unit.cells.map((c) => c.y)) };
}
function isHorizontal(unit: Unit) {
  return unit.cells.every((c) => c.y === unit.cells[0]!.y);
}
function spanStyle(unit: Unit) {
  const n = unit.length;
  return isHorizontal(unit)
    ? { width: `${n * 100}%`, height: "100%" }
    : { width: "100%", height: `${n * 100}%` };
}

function mark(shots: Shot[], x: number, y: number): Shot["result"] | undefined {
  return shots.find((s) => s.cell.x === x && s.cell.y === y)?.result;
}

function onEnemy(x: number, y: number): void {
  if (!myTurn.value || props.firing) return;
  if (mark(props.view.shotsYouFired, x, y)) return;
  emit("fire", x, y);
}

const lastText = computed(() => {
  const s = props.view.lastShot;
  if (!s) return "";
  if (s.result === "miss") return "мимо";
  if (s.result === "hit") return "ранен";
  return "убит";
});
</script>

<template>
  <div class="stats" data-testid="stats">
    <span>{{ myTurn ? "твой ход" : "ход соперника" }}</span>
    <span>танки {{ view.yourTanksLeft }} — {{ view.opponentTanksLeft }}</span>
    <span>выстрелы {{ view.stats.fired }} ({{ view.stats.accuracy }}%)</span>
    <span v-if="lastText">последний: {{ lastText }}</span>
  </div>
  <div class="tabs">
    <button type="button" :class="{ primary: tab === 'enemy' }" @click="tab = 'enemy'">Враг</button>
    <button type="button" :class="{ primary: tab === 'mine' }" @click="tab = 'mine'">Мои</button>
  </div>
  <GridBoard v-if="tab === 'enemy'" @cell="onEnemy">
    <template #default="{ x, y }">
      <span v-if="mark(view.shotsYouFired, x, y) === 'miss'" class="dot" />
      <span
        v-else-if="mark(view.shotsYouFired, x, y)"
        class="cross"
      />
    </template>
  </GridBoard>
  <GridBoard v-else>
    <template #default="{ x, y }">
      <div
        v-for="unit in view.yourFleet?.units ?? []"
        :key="unit.id"
        v-show="origin(unit).x === x && origin(unit).y === y"
        class="tank-origin"
        :style="spanStyle(unit)"
      >
        <TankInk :length="unit.length" :horizontal="isHorizontal(unit)" />
      </div>
      <span v-if="mark(view.shotsOnYou, x, y) === 'miss'" class="dot" />
      <span v-else-if="mark(view.shotsOnYou, x, y)" class="cross" />
    </template>
  </GridBoard>
  <p class="status" v-if="firing">ждём ответ…</p>
</template>

<style scoped>
.tank-origin {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 1;
  pointer-events: none;
}
</style>
