<script setup lang="ts">
defineProps<{
  length: number;
  horizontal: boolean;
}>();
</script>

<template>
  <svg
    class="tank-svg"
    :viewBox="horizontal ? '0 0 100 32' : '0 0 32 100'"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <g
      fill="none"
      stroke="#1c4c9c"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      :transform="horizontal ? '' : 'rotate(90 16 16) translate(0 -68)'"
    >
      <path d="M4 10 q 8 -6 18 -6 h 56 q 12 1 18 8 v 8 q -6 8 -18 8 h -56 q -12 0 -18 -8 z" />
      <path d="M38 6 h 22 v 8 h -22 z" />
      <path d="M60 10 h 36" />
    </g>
  </svg>
</template>

<style scoped>
.tank-svg {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
