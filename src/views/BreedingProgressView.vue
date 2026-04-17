<template>
  <div class="breeding-progress-view">
    <n-result
      status="info"
      title="基因型繁配进度"
      description="该模块将支持 Global KO / cKO 繁育策略进度追踪（F1/F2 世代、种子鼠产出、目标组合产量统计），敬请期待。"
    >
      <template #footer>
        <n-space justify="center">
          <n-tag type="info" :bordered="false">全身敲除 Global KO</n-tag>
          <n-tag type="success" :bordered="false">条件性敲除 cKO</n-tag>
          <n-tag type="warning" :bordered="false">世代追踪</n-tag>
        </n-space>
      </template>
    </n-result>
  </div>
</template>

<script setup>
import { NResult, NSpace, NTag } from 'naive-ui'
</script>

<style scoped>
.breeding-progress-view {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
</style>
