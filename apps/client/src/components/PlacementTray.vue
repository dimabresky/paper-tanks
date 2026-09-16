<script setup lang="ts">
import { FLEET_SHAPES, shapeTag, type Unit } from "@paper-tanks/shared";
import { computed } from "vue";
import TankInk from "./TankInk.vue";

const props = defineProps<{
  units: Unit[];
  disabled?: boolean;
}>();

const emit = defineEmits<{
  pickup: [event: PointerEvent, token: { id: string; length: 1 | 2 | 3 | 4; width: 1 | 2; shape: "2x4" | "2x3" | "1x2" | "1x1" }];
}>();

const tokens = computed(() => {
  const used = [...props.units];
  const left: Array<{
    id: string;
    length: 1 | 2 | 3 | 4;
    width: 1 | 2;
    shape: "2x4" | "2x3" | "1x2" | "1x1";
  }> = [];
  for (const [i, shape] of FLEET_SHAPES.entries()) {
    const idx = used.findIndex((u) => u.length === shape.length && u.width === shape.width);
    if (idx >= 0) {
      used.splice(idx, 1);
      continue;
    }
    left.push({
      id: `tray-${i}`,
      length: shape.length,
      width: shape.width,
      shape: shapeTag(shape.length, shape.width),
    });
  }
  return left;
});
</script>

<template>
  <aside class="tray" data-testid="placement-tray">
    <button
      v-for="token in tokens"
      :key="token.id"
      type="button"
      class="tray-token"
      data-testid="tank-token"
      :data-shape="token.shape"
      :disabled="disabled"
      @pointerdown="emit('pickup', $event, token)"
    >
      <TankInk pose="tray" :length="token.length" :width="token.width" :horizontal="true" />
    </button>
  </aside>
</template>

<style scoped>
.tray {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.35rem;
  min-height: 3.8rem;
  width: 100%;
  padding: 0.35rem;
  border: 1.5px dashed var(--ink);
  background: rgba(255, 255, 255, 0.2);
}

.tray-token {
  touch-action: none;
  padding: 0.15rem 0.3rem;
  min-width: 2.4rem;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
</style>
