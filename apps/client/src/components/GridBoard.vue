<script setup lang="ts">
import { COLS, COL_LETTERS, ROWS, cellLabel, type Cell } from "@paper-tanks/shared";
import { ref } from "vue";

defineProps<{
  highlight?: { cells: Cell[]; ok: boolean } | null;
}>();

const emit = defineEmits<{
  cell: [x: number, y: number];
}>();

const DEFAULT_CELL = 22;
const MAX_CELL = 72;
const cellSize = ref(DEFAULT_CELL);
const scroller = ref<HTMLElement | null>(null);
const cols = COL_LETTERS.split("");

function fitSize(): number {
  const el = scroller.value;
  if (!el) return DEFAULT_CELL;
  return Math.floor((el.clientWidth - 22) / COLS);
}

function clamp(size: number): number {
  const fit = fitSize();
  const min = Math.max(10, fit || DEFAULT_CELL);
  return Math.min(MAX_CELL, Math.max(min, size));
}

function zoomIn(): void {
  cellSize.value = clamp(cellSize.value + 4);
}

function zoomOut(): void {
  cellSize.value = clamp(cellSize.value - 4);
}

let pinchStart = 0;
let sizeStart = DEFAULT_CELL;

function onTouchStart(e: TouchEvent): void {
  if (e.touches.length === 2) {
    pinchStart = pinchDistance(e);
    sizeStart = cellSize.value;
  }
}

function onTouchMove(e: TouchEvent): void {
  if (e.touches.length !== 2 || pinchStart === 0) return;
  e.preventDefault();
  cellSize.value = clamp(sizeStart * (pinchDistance(e) / pinchStart));
}

function pinchDistance(e: TouchEvent): number {
  const a = e.touches[0]!;
  const b = e.touches[1]!;
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}
</script>

<template>
  <div class="grid-wrap">
    <div class="row zoom-row">
      <button type="button" data-testid="zoom-out" aria-label="Мельче" @click="zoomOut">−</button>
      <button type="button" data-testid="zoom-in" aria-label="Крупнее" @click="zoomIn">+</button>
    </div>
    <div
      ref="scroller"
      class="board-scroller"
      :style="{ '--cell-size': `${cellSize}px` }"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
    >
      <div
        class="board"
        role="grid"
        aria-label="Тетрадное поле"
        :style="{ gridTemplateColumns: `1.4rem repeat(${COLS}, var(--cell-size))` }"
      >
        <span></span>
        <span v-for="letter in cols" :key="letter" class="hlabel">{{ letter }}</span>
        <template v-for="y in ROWS" :key="y">
          <span class="vlabel">{{ y }}</span>
          <button
            v-for="x in COLS"
            :key="`${x}-${y}`"
            type="button"
            class="cell"
            :class="{
              preview: highlight?.ok && highlight.cells.some((c) => c.x === x - 1 && c.y === y - 1),
              bad: highlight && !highlight.ok && highlight.cells.some((c) => c.x === x - 1 && c.y === y - 1),
            }"
            :aria-label="cellLabel(x - 1, y - 1)"
            data-testid="cell"
            :data-x="x - 1"
            :data-y="y - 1"
            @click="emit('cell', x - 1, y - 1)"
          >
            <slot :x="x - 1" :y="y - 1" />
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
