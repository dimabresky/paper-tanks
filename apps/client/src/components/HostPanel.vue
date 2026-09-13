<script setup lang="ts">
import type { HostInfo } from "../composables/useGame.ts";

defineProps<{
  host: HostInfo | null;
  seatsTaken: number;
}>();
</script>

<template>
  <section class="host-card" data-testid="host-panel">
    <p>Сканируй QR с телефона в той же Wi‑Fi.</p>
    <div v-if="host?.qrSvg" v-html="host.qrSvg" />
    <p class="urls">{{ host?.preferredUrl }}</p>
    <p v-for="url in host?.joinUrls ?? []" :key="url" class="urls">{{ url }}</p>
    <p>Мест занято: {{ seatsTaken }} / 2</p>
    <ol>
      <li>Одна сеть Wi‑Fi у компьютера и телефонов.</li>
      <li>Если не открывается — разреши Node входящие в брандмауэре macOS (порт 8787).</li>
      <li>
        «Изоляция клиентов» / AP isolation на роутере должна быть выключена, иначе телефоны не увидят
        ПК.
      </li>
      <li>С этого компьютера тоже можно сесть в свободное место.</li>
    </ol>
  </section>
</template>
