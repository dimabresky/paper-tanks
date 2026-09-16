<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  length: number;
  width?: number;
  horizontal: boolean;
  pose?: "board" | "tray";
}>();

const short = computed(() => props.width ?? (props.length >= 3 ? 2 : 1));
const L = computed(() => props.length * 100);
const W = computed(() => short.value * 100);
const viewBox = computed(() =>
  props.pose === "tray"
    ? "0 0 40 72"
    : props.horizontal
      ? `0 0 ${L.value} ${W.value}`
      : `0 0 ${W.value} ${L.value}`,
);
const boardTransform = computed(() =>
  props.pose === "tray" || props.horizontal ? "" : `translate(0 ${L.value}) rotate(90)`,
);
</script>

<template>
  <svg
    v-if="pose === 'tray'"
    class="tank-svg tray"
    :viewBox="viewBox"
    preserveAspectRatio="xMidYMax meet"
    aria-hidden="true"
  >
    <g fill="none" stroke="#1c4c9c" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 62 h24" />
      <ellipse cx="12" cy="62" rx="5" ry="3.2" />
      <ellipse cx="20" cy="62" rx="5" ry="3.2" />
      <ellipse cx="28" cy="62" rx="5" ry="3.2" />
      <path d="M9 58 q 2 -22 11 -28 h 4 q 8 4 10 28 z" />
      <path d="M14 32 h12 v10 h-12 z" />
      <path d="M20 32 v-18" />
      <path d="M16 14 h8" />
    </g>
  </svg>
  <svg
    v-else
    class="tank-svg"
    :viewBox="viewBox"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <g
      fill="none"
      stroke="#1c4c9c"
      stroke-width="3.2"
      stroke-linecap="round"
      stroke-linejoin="round"
      :transform="boardTransform"
    >
      <path :d="`M8 10 h${L - 16} v${W * 0.18} h${16 - L} z`" />
      <path :d="`M8 ${W - 10 - W * 0.18} h${L - 16} v${W * 0.18} h${16 - L} z`" />
      <path
        :d="`M14 ${W * 0.22} q 8 -6 22 -6 h${L - 72} q 18 2 24 14 v${W * 0.42} q -8 12 -24 12 h${72 - L} q -16 0 -24 -12 z`"
      />
      <path :d="`M${L * 0.52} ${W * 0.28} h${L * 0.22} v${W * 0.44} h${-L * 0.22} z`" />
      <path :d="`M${L * 0.74} ${W * 0.46} h${L * 0.2}`" />
      <path :d="`M${L * 0.18} ${W * 0.5} h${L * 0.22}`" />
    </g>
  </svg>
</template>

<style scoped>
.tank-svg {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: block;
}

.tank-svg.tray {
  width: auto;
  height: 3.4rem;
  overflow: visible;
}
</style>
