<script setup lang="ts">
import {
  canAddUnit,
  cellsForRect,
  flipUnit,
  inBounds,
  isUnitHorizontal,
  randomValidFleet,
  unitOrigin,
  type Cell,
  type Unit,
} from "@paper-tanks/shared";
import { computed, ref } from "vue";
import GridBoard from "./GridBoard.vue";
import PlacementTray from "./PlacementTray.vue";
import TankInk from "./TankInk.vue";

const props = defineProps<{
  units: Unit[];
  ready: boolean;
  opponentReady: boolean;
}>();

const emit = defineEmits<{
  "update:units": [units: Unit[]];
  ready: [];
}>();

const ghost = ref<{ cells: Cell[]; ok: boolean } | null>(null);
const selectedId = ref<string | null>(null);

type TrayToken = { id: string; length: 1 | 2 | 3 | 4; width: 1 | 2; shape: "2x4" | "2x3" | "1x2" | "1x1" };

type Drag = {
  pointerId: number;
  source: "tray" | "board";
  length: 1 | 2 | 3 | 4;
  width: 1 | 2;
  horizontal: boolean;
  unitId: string | null;
  grabDx: number;
  grabDy: number;
  startX: number;
  startY: number;
  lastValid: Unit[];
  moved: boolean;
};

const drag = ref<Drag | null>(null);

function spanStyle(unit: Unit): Record<string, string> {
  const xs = unit.cells.map((c) => c.x);
  const ys = unit.cells.map((c) => c.y);
  const w = Math.max(...xs) - Math.min(...xs) + 1;
  const h = Math.max(...ys) - Math.min(...ys) + 1;
  return { width: `${w * 100}%`, height: `${h * 100}%` };
}

function hitTest(clientX: number, clientY: number): { cell: Cell | null; tray: boolean } {
  const stack = document.elementsFromPoint(clientX, clientY);
  let cell: Cell | null = null;
  let tray = false;
  for (const node of stack) {
    if (!(node instanceof Element)) continue;
    if (node.closest("[data-testid='placement-tray']")) tray = true;
    const btn = node.closest("[data-testid='cell']");
    if (btn instanceof HTMLElement && cell === null) {
      const x = Number(btn.dataset.x);
      const y = Number(btn.dataset.y);
      if (Number.isFinite(x) && Number.isFinite(y)) cell = { x, y };
    }
  }
  return { cell, tray };
}

function othersExcept(unitId: string | null, from: Unit[]): Unit[] {
  return unitId ? from.filter((u) => u.id !== unitId) : from;
}

function previewAt(cell: Cell, d: Drag): { unit: Unit; ok: boolean } {
  const origin = { x: cell.x - d.grabDx, y: cell.y - d.grabDy };
  const unit: Unit = {
    id: d.unitId ?? `p${Date.now()}`,
    length: d.length,
    width: d.width,
    cells: cellsForRect(origin, d.length, d.width, d.horizontal),
  };
  return { unit, ok: canAddUnit(othersExcept(d.unitId, d.lastValid), unit) };
}

function onTrayPickup(event: PointerEvent, token: TrayToken): void {
  if (props.ready || event.button !== 0) return;
  event.preventDefault();
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  drag.value = {
    pointerId: event.pointerId,
    source: "tray",
    length: token.length,
    width: token.width,
    horizontal: true,
    unitId: null,
    grabDx: 0,
    grabDy: 0,
    startX: event.clientX,
    startY: event.clientY,
    lastValid: props.units,
    moved: false,
  };
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
}

function onBoardPickup(event: PointerEvent, unit: Unit): void {
  if (props.ready || event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  const { cell } = hitTest(event.clientX, event.clientY);
  const origin = unitOrigin(unit);
  drag.value = {
    pointerId: event.pointerId,
    source: "board",
    length: unit.length,
    width: unit.width,
    horizontal: isUnitHorizontal(unit),
    unitId: unit.id,
    grabDx: cell ? cell.x - origin.x : 0,
    grabDy: cell ? cell.y - origin.y : 0,
    startX: event.clientX,
    startY: event.clientY,
    lastValid: props.units,
    moved: false,
  };
  selectedId.value = unit.id;
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
}

function onPointerMove(event: PointerEvent): void {
  const d = drag.value;
  if (!d || event.pointerId !== d.pointerId) return;
  if (Math.hypot(event.clientX - d.startX, event.clientY - d.startY) > 8) d.moved = true;
  const { cell } = hitTest(event.clientX, event.clientY);
  if (!cell) {
    ghost.value = null;
    return;
  }
  const { unit, ok } = previewAt(cell, d);
  ghost.value = { cells: unit.cells, ok };
}

function onPointerUp(event: PointerEvent): void {
  const d = drag.value;
  if (!d || event.pointerId !== d.pointerId) return;
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
  window.removeEventListener("pointercancel", onPointerUp);
  const { cell, tray } = hitTest(event.clientX, event.clientY);
  drag.value = null;
  ghost.value = null;

  if (!d.moved && d.source === "board" && d.unitId) {
    selectedId.value = d.unitId;
    return;
  }

  if (d.moved && tray && d.source === "board" && d.unitId) {
    emit(
      "update:units",
      d.lastValid.filter((u) => u.id !== d.unitId),
    );
    selectedId.value = null;
    return;
  }

  if (cell) {
    const { unit, ok } = previewAt(cell, d);
    if (ok) {
      const next = [...othersExcept(d.unitId, d.lastValid), unit];
      emit("update:units", next);
      selectedId.value = unit.id;
      return;
    }
  }

  if (d.source === "board") emit("update:units", d.lastValid);
}

function rotateSelected(): void {
  if (props.ready) return;
  const unit = props.units.find((u) => u.id === selectedId.value);
  if (!unit) return;
  const rotated = flipUnit(unit);
  const others = props.units.filter((u) => u.id !== unit.id);
  if (!canAddUnit(others, rotated)) {
    ghost.value = { cells: rotated.cells.filter(inBounds), ok: false };
    return;
  }
  ghost.value = null;
  emit(
    "update:units",
    props.units.map((u) => (u.id === unit.id ? rotated : u)),
  );
}

function randomize(): void {
  emit("update:units", randomValidFleet().units);
  ghost.value = null;
  selectedId.value = null;
}

function clear(): void {
  emit("update:units", []);
  selectedId.value = null;
}

function unitAtCell(x: number, y: number): Unit | undefined {
  return props.units.find((u) => {
    const o = unitOrigin(u);
    return o.x === x && o.y === y;
  });
}

const allPlaced = computed(() => props.units.length === 8);
</script>

<template>
  <div class="place-layout" @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerUp">
    <PlacementTray :units="units" :disabled="ready" @pickup="onTrayPickup" />
    <div class="sheet-col">
      <div class="row">
        <button type="button" data-testid="rotate" :disabled="ready || !selectedId" @click="rotateSelected">
          Повернуть
        </button>
      </div>
      <GridBoard :highlight="ghost">
        <template #default="{ x, y }">
          <div
            v-if="unitAtCell(x, y)"
            class="tank-origin"
            :class="{ selected: selectedId === unitAtCell(x, y)!.id }"
            data-testid="placed-tank"
            :data-unit-id="unitAtCell(x, y)!.id"
            :style="spanStyle(unitAtCell(x, y)!)"
            @pointerdown="onBoardPickup($event, unitAtCell(x, y)!)"
          >
            <TankInk
              pose="board"
              :length="unitAtCell(x, y)!.length"
              :width="unitAtCell(x, y)!.width"
              :horizontal="isUnitHorizontal(unitAtCell(x, y)!)"
            />
          </div>
        </template>
      </GridBoard>
      <div class="row">
        <button type="button" data-testid="random-fleet" :disabled="ready" @click="randomize">
          Расставить как получится
        </button>
        <button type="button" :disabled="ready || units.length === 0" @click="clear">Стереть</button>
        <button
          type="button"
          class="primary"
          data-testid="ready"
          :disabled="ready || !allPlaced"
          @click="emit('ready')"
        >
          Готов
        </button>
      </div>
      <p class="hint">
        {{ ready ? "Ждём соперника…" : opponentReady ? "Соперник готов" : "" }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.place-layout {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.sheet-col {
  width: max-content;
  max-width: 100%;
}

.tank-origin {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 2;
  overflow: hidden;
  touch-action: none;
  pointer-events: auto;
}

.tank-origin.selected {
  outline: 2px solid var(--ink);
  outline-offset: -1px;
}
</style>
