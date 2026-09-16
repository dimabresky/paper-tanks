<script setup lang="ts">
import { COLS, ROWS, type Shot } from "@paper-tanks/shared";

defineProps<{
  shots: Shot[];
}>();
</script>

<template>
  <div
    class="result-map"
    aria-label="Карта обстрела"
    :style="{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }"
  >
    <i
      v-for="i in COLS * ROWS"
      :key="i"
      :class="
        shots.find((s) => s.cell.x === (i - 1) % COLS && s.cell.y === Math.floor((i - 1) / COLS))
          ?.result
      "
    />
  </div>
</template>
