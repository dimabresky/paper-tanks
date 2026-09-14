<script setup lang="ts">
import {
  FLEET_LENGTHS,
  canAddUnit,
  cellsForAnchor,
  randomValidFleet,
  type Cell,
  type Unit,
} from "@paper-tanks/shared";
import { computed, ref, watch } from "vue";
import GridBoard from "./GridBoard.vue";
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

const selected = ref<1 | 2 | 3 | 4>(4);
const horizontal = ref(true);
const ghost = ref<{ cells: Cell[]; ok: boolean } | null>(null);

const remaining = computed(() => {
  const used = [...props.units.map((u) => u.length)];
  const left: number[] = [];
  for (const len of FLEET_LENGTHS) {
    const i = used.indexOf(len);
    if (i >= 0) used.splice(i, 1);
    else left.push(len);
  }
  return left as Array<1 | 2 | 3 | 4>;
});

watch(
  remaining,
  (left) => {
    if (left.length && !left.includes(selected.value)) selected.value = left[0]!;
  },
  { immediate: true },
);

function origin(unit: Unit): Cell {
  return {
    x: Math.min(...unit.cells.map((c) => c.x)),
    y: Math.min(...unit.cells.map((c) => c.y)),
  };
}

function isHorizontal(unit: Unit): boolean {
  return unit.cells.every((c) => c.y === unit.cells[0]!.y);
}

function spanStyle(unit: Unit): Record<string, string> {
  const n = unit.length;
  if (isHorizontal(unit)) return { width: `${n * 100}%`, height: "100%" };
  return { width: "100%", height: `${n * 100}%` };
}

function onCell(x: number, y: number): void {
  if (props.ready || remaining.value.length === 0) return;
  const length = selected.value;
  const cells = cellsForAnchor(x, y, length, horizontal.value);
  const unit: Unit = { id: `p${props.units.length}-${Date.now()}`, length, cells };
  if (!canAddUnit(props.units, unit)) {
    ghost.value = { cells, ok: false };
    return;
  }
  emit("update:units", [...props.units, unit]);
  ghost.value = null;
}

function randomize(): void {
  emit("update:units", randomValidFleet().units);
  ghost.value = null;
}

function clear(): void {
  emit("update:units", []);
}
</script>

<template>
  <p class="hint">Выбери длину, тапни якорь. Поворот — кнопкой.</p>
  <div class="row">
    <button
      v-for="len in [4, 3, 2, 1] as const"
      :key="len"
      type="button"
      :disabled="ready || !remaining.includes(len)"
      :class="{ primary: selected === len }"
      @click="selected = len"
    >
      {{ len }}×{{ remaining.filter((l) => l === len).length }}
    </button>
    <button type="button" :disabled="ready" @click="horizontal = !horizontal">Повернуть</button>
  </div>
  <GridBoard :highlight="ghost" @cell="onCell">
    <template #default="{ x, y }">
      <div
        v-for="unit in units"
        :key="unit.id + '-t'"
        v-show="origin(unit).x === x && origin(unit).y === y"
        class="tank-origin"
        :style="spanStyle(unit)"
      >
        <TankInk :length="unit.length" :horizontal="isHorizontal(unit)" />
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
      :disabled="ready || remaining.length > 0"
      @click="emit('ready')"
    >
      Готов
    </button>
  </div>
  <p class="hint">
    {{ ready ? "Ждём соперника…" : opponentReady ? "Соперник готов" : "" }}
  </p>
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
