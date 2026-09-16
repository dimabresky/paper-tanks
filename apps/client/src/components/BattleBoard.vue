<script setup lang="ts">
import { cellKey, type Cell, type Decoration, type PlayerView, type Shot, type Unit } from "@paper-tanks/shared";
import { computed, ref } from "vue";
import BurningTreeInk from "./BurningTreeInk.vue";
import CrateInk from "./CrateInk.vue";
import GridBoard from "./GridBoard.vue";
import OpenedCrateInk from "./OpenedCrateInk.vue";
import TankInk from "./TankInk.vue";
import TreeInk from "./TreeInk.vue";
import WoundInk from "./WoundInk.vue";

const props = defineProps<{
  view: PlayerView;
  firing: boolean;
}>();

const emit = defineEmits<{
  fire: [x: number, y: number];
}>();

const tab = ref<"enemy" | "mine">("enemy");
const myTurn = computed(() => props.view.turn === props.view.you && props.view.phase === "battle");

function origin(unit: Pick<Unit, "cells">) {
  return { x: Math.min(...unit.cells.map((c) => c.x)), y: Math.min(...unit.cells.map((c) => c.y)) };
}

function isHorizontal(unit: Unit) {
  const xs = unit.cells.map((c) => c.x);
  const ys = unit.cells.map((c) => c.y);
  const spanX = Math.max(...xs) - Math.min(...xs) + 1;
  const spanY = Math.max(...ys) - Math.min(...ys) + 1;
  return spanX === unit.length && spanY === unit.width;
}

function spanStyle(spanX: number, spanY: number) {
  return { width: `${spanX * 100}%`, height: `${spanY * 100}%` };
}

function unitSpanStyle(unit: Unit) {
  const xs = unit.cells.map((c) => c.x);
  const ys = unit.cells.map((c) => c.y);
  return spanStyle(Math.max(...xs) - Math.min(...xs) + 1, Math.max(...ys) - Math.min(...ys) + 1);
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

const DIRS: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const enemyTanks = computed(() => {
  const shots = props.view.shotsYouFired;
  const tankShots = shots.filter((s) => s.result === "hit" || s.result === "sunk");
  const remaining = new Set(tankShots.map((s) => cellKey(s.cell.x, s.cell.y)));
  const byKey = new Map(tankShots.map((s) => [cellKey(s.cell.x, s.cell.y), s]));
  const stamps: Cell[] = [];
  const sunk: Array<{
    origin: Cell;
    length: 1 | 2 | 3 | 4;
    width: 1 | 2;
    horizontal: boolean;
    spanX: number;
    spanY: number;
  }> = [];

  while (remaining.size) {
    const start = remaining.values().next().value!;
    remaining.delete(start);
    const stack = [start];
    const cells: Cell[] = [];
    let isSunk = false;
    while (stack.length) {
      const k = stack.pop()!;
      const shot = byKey.get(k)!;
      cells.push(shot.cell);
      if (shot.result === "sunk") isSunk = true;
      const [x, y] = k.split(",").map(Number) as [number, number];
      for (const [dx, dy] of DIRS) {
        const nk = cellKey(x + dx, y + dy);
        if (remaining.has(nk)) {
          remaining.delete(nk);
          stack.push(nk);
        }
      }
    }
    if (!isSunk) {
      stamps.push(...cells);
      continue;
    }
    const xs = cells.map((c) => c.x);
    const ys = cells.map((c) => c.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = maxX - minX + 1;
    const spanY = maxY - minY + 1;
    const horizontal = spanX >= spanY;
    sunk.push({
      origin: { x: minX, y: minY },
      length: (horizontal ? spanX : spanY) as 1 | 2 | 3 | 4,
      width: (horizontal ? spanY : spanX) as 1 | 2,
      horizontal,
      spanX,
      spanY,
    });
  }
  return { stamps, sunk };
});

function isStamp(x: number, y: number): boolean {
  return enemyTanks.value.stamps.some((c) => c.x === x && c.y === y);
}

function sunkAt(x: number, y: number) {
  return enemyTanks.value.sunk.find((u) => u.origin.x === x && u.origin.y === y);
}

function ownAt(x: number, y: number): Unit | undefined {
  return props.view.yourFleet?.units.find((u) => origin(u).x === x && origin(u).y === y);
}
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
      <div
        v-if="sunkAt(x, y)"
        class="tank-origin"
        :style="spanStyle(sunkAt(x, y)!.spanX, sunkAt(x, y)!.spanY)"
      >
        <TankInk
          pose="board"
          :length="sunkAt(x, y)!.length"
          :width="sunkAt(x, y)!.width"
          :horizontal="sunkAt(x, y)!.horizontal"
        />
      </div>
      <WoundInk v-else-if="isStamp(x, y)" />
      <BurningTreeInk v-else-if="mark(view.shotsYouFired, x, y) === 'tree'" />
      <OpenedCrateInk v-else-if="mark(view.shotsYouFired, x, y) === 'crate'" />
      <span v-else-if="mark(view.shotsYouFired, x, y) === 'miss'" class="dot" />
    </template>
  </GridBoard>
  <GridBoard v-else>
    <template #default="{ x, y }">
      <div
        v-if="ownAt(x, y)"
        class="tank-origin"
        :style="unitSpanStyle(ownAt(x, y)!)"
      >
        <TankInk pose="board" :length="ownAt(x, y)!.length" :width="ownAt(x, y)!.width" :horizontal="isHorizontal(ownAt(x, y)!)" />
      </div>
      <BurningTreeInk v-if="decoAt(view.yourDecorations, x, y)?.kind === 'tree' && decoAt(view.yourDecorations, x, y)?.burned" />
      <TreeInk v-else-if="decoAt(view.yourDecorations, x, y)?.kind === 'tree'" />
      <OpenedCrateInk
        v-else-if="decoAt(view.yourDecorations, x, y)?.kind === 'crate' && mark(view.shotsOnYou, x, y) === 'crate'"
      />
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
