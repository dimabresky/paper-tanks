<script setup lang="ts">
import { COLS, COL_LETTERS, ROWS, cellLabel, type Cell } from "@paper-tanks/shared";

defineProps<{
  highlight?: { cells: Cell[]; ok: boolean } | null;
}>();

const emit = defineEmits<{
  cell: [x: number, y: number];
}>();

const cols = COL_LETTERS.split("");
</script>

<template>
  <div class="grid-wrap">
    <div class="board" role="grid" aria-label="Тетрадное поле">
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
</template>
