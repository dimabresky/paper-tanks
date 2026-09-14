<script setup lang="ts">
import type { Decoration, PlayerView, Shot, Unit } from "@paper-tanks/shared";
import { computed, ref } from "vue";
import BurningTreeInk from "./BurningTreeInk.vue";
import CrateInk from "./CrateInk.vue";
import GridBoard from "./GridBoard.vue";
import TankInk from "./TankInk.vue";
import TreeInk from "./TreeInk.vue";

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

function decoAt(list: Decoration[], x: number, y: number): Decoration | undefined {
  return list.find((d) => d.cell.x === x && d.cell.y === y);
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
  if (s.result === "sunk") return "убит";
  if (s.result === "tree") return "ёлка";
  if (s.result === "crate") return "ящик";
  return "";
});
</script>

<template>
  <div class="stats" data-testid="stats">
    <span>{{ myTurn ? "твой ход" : "ход соперника" }}</span>
    <span>ты {{ view.yourTanksLeft }} — соперник {{ view.opponentTanksLeft }}</span>
    <span>выстрелы {{ view.stats.fired }} ({{ view.stats.accuracy }}%)</span>
    <span v-if="lastText">последний: {{ lastText }}</span>
  </div>
  <div class="tabs">
    <button type="button" :class="{ primary: tab === 'enemy' }" @click="tab = 'enemy'">Чужой лист</button>
    <button type="button" :class="{ primary: tab === 'mine' }" @click="tab = 'mine'">Мой лист</button>
  </div>
  <GridBoard v-if="tab === 'enemy'" @cell="onEnemy">
    <template #default="{ x, y }">
      <BurningTreeInk v-if="mark(view.shotsYouFired, x, y) === 'tree'" />
      <CrateInk v-else-if="mark(view.shotsYouFired, x, y) === 'crate'" />
      <span v-else-if="mark(view.shotsYouFired, x, y) === 'miss'" class="dot" />
      <span v-else-if="mark(view.shotsYouFired, x, y)" class="cross" />
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
      <BurningTreeInk v-if="decoAt(view.yourDecorations, x, y)?.kind === 'tree' && decoAt(view.yourDecorations, x, y)?.burned" />
      <TreeInk v-else-if="decoAt(view.yourDecorations, x, y)?.kind === 'tree'" />
      <CrateInk v-else-if="decoAt(view.yourDecorations, x, y)?.kind === 'crate'" />
      <span v-if="mark(view.shotsOnYou, x, y) === 'miss'" class="dot" />
      <span v-else-if="mark(view.shotsOnYou, x, y) === 'tree' || mark(view.shotsOnYou, x, y) === 'crate'" />
      <span v-else-if="mark(view.shotsOnYou, x, y)" class="cross" />
    </template>
  </GridBoard>
</template>

<style scoped>
.tank-origin {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 1;
  pointer-events: none;
  overflow: hidden;
}
</style>
