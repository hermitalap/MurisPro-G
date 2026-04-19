<script setup>
import { useRouter } from 'vue-router'
defineOptions({ name: 'NotFound' })
const router = useRouter()
</script>

<template>
  <n-result
    status="404"
    title="页面未找到"
    description="您访问的页面不存在"
    style="margin-top: 80px;"
  >
    <template #footer>
      <n-button type="primary" @click="router.push('/')">返回首页</n-button>
    </template>
  </n-result>
</template>
