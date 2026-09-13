<script setup lang="ts">
defineProps<{
  length: number;
  horizontal: boolean;
}>();
</script>

<template>
  <svg
    class="tank-svg"
    :viewBox="horizontal ? '0 0 120 40' : '0 0 40 120'"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <g
      fill="none"
      stroke="#1c4c9c"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
      :transform="horizontal ? '' : 'rotate(90 20 20) translate(0 -80)'"
    >
      <path d="M8 14 q 6 -7 22 -6 q 28 1 50 3 q 18 2 28 8 q -2 10 -8 14 q -30 4 -70 2 q -14 -1 -20 -8 q 2 -8 0 -13 z" />
      <path d="M40 10 q 8 -8 22 -4 q 6 8 -2 12 q -12 2 -20 0 q -4 -2 0 -8 z" />
      <path d="M62 8 h 28 q 4 2 5 6" />
      <path d="M18 28 q 12 4 40 3 q 20 0 32 -4" opacity="0.7" />
    </g>
  </svg>
</template>

<style scoped>
.tank-svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}
</style>
