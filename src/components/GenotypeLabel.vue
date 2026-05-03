<script setup>
import { computed } from 'vue'

const props = defineProps({
  symbol: { type: String, default: null }
})

const parts = computed(() => {
  if (!props.symbol) {
    return [{ type: 'text', text: '—' }]
  }

  return String(props.symbol)
    .split(/(<sup>.*?<\/sup>)/g)
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^<sup>(.*?)<\/sup>$/)
      return match
        ? { type: 'sup', text: match[1] }
        : { type: 'text', text: part }
    })
})
</script>

<template>
  <span>
    <template
      v-for="(part, index) in parts"
      :key="`${part.type}-${index}-${part.text}`"
    >
      <sup v-if="part.type === 'sup'">{{ part.text }}</sup>
      <template v-else>{{ part.text }}</template>
    </template>
  </span>
</template>
