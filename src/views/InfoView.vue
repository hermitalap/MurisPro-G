<template>
  <div class="main-content bg-image">
    <!-- 主内容区 -->
    <main class="promotion-content">
      <div class="buttons-container">
        <!-- 四个主要按钮 -->
        <a 
          href="https://www.bilibili.com/video/BV1Q12xB6Ep5/" 
          target="_blank" 
          class="promo-button primary"
        >
          <n-icon><PlayCircleOutline /></n-icon>
          <span>视频教程</span>
        </a>

        <a 
          class="promo-button secondary"
        >
          <n-icon><BookOutline /></n-icon>
          <span>使用文档</span>
        </a>

        <a 
          href="https://github.com/lanternx/MurisPro" 
          target="_blank" 
          class="promo-button accent"
        >
          <n-icon><CodeSlashOutline /></n-icon>
          <span>GitHub仓库</span>
        </a>

        <n-button
          class="promo-button qr-button"
          tertiary
          :render-icon="renderIcon(QrCode)"
          @click="showQrModal = true"
        >
          <span>实验动物交流群</span>
        </n-button>
      </div>
    </main>
    <!-- 二维码弹窗 -->
    <n-modal v-model:show="showQrModal" preset="card" :show-icon="false" style="width: 520px;">
      <div class="qr-modal-content">
        <h3>扫码联系</h3>
        <n-space justify="center" class="qr-code-container">
          <img src="@/assets/qrcode.png" alt="qrcode" style="max-height: 450px;">
        </n-space>
        <p class="qr-tip">使用手机QQ扫描二维码</p>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
import { h, ref } from 'vue'
import { NIcon } from 'naive-ui'
import { QrCode, PlayCircleOutline, BookOutline, CodeSlashOutline } from '@vicons/ionicons5'

const renderIcon = (IconComp) => () => h(NIcon, null, { default: () => h(IconComp) })

// 控制二维码弹窗显示
const showQrModal = ref(false)
</script>

<style scoped>

/* 主内容区 */
.promotion-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  text-align: center;
}

.bg-image {
  background: url('@/assets/background.jpg') no-repeat center center fixed;
  background-size: cover;
}

.buttons-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
  max-width: 800px;
  margin-bottom: 3rem;
}

/* 按钮样式 */
.promo-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: color-mix(in srgb, var(--n-color) 90%, transparent);
  border-radius: 16px;
  text-decoration: none;
  color: var(--n-text-color-1);
  transition: all 0.3s ease;
  box-shadow: 0 8px 32px color-mix(in srgb, var(--n-text-color) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--n-color) 80%, transparent);
  min-height: 120px;
}

.promo-button:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 40px color-mix(in srgb, var(--n-text-color) 20%, transparent);
  background: var(--n-color);
}

.promo-button i {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.promo-button span {
  font-size: 1.2rem;
  font-weight: 600;
}

/* 不同按钮颜色 */
.promo-button.primary i { color: var(--n-info-color); }
.promo-button.secondary i { color: var(--n-warning-color); }
.promo-button.accent i { color: var(--n-primary-color); }
.promo-button.qr-button i { color: var(--n-success-color); }

/* 二维码弹窗样式 */
.qr-modal-content {
  text-align: center;
  padding: 1rem 0;
}

.qr-modal-content h3 {
  margin-bottom: 1.5rem;
  color: var(--n-text-color-1);
  font-size: 1.5rem;
}

.qr-code-container {
  padding: 1rem;
  background: var(--n-color-embedded);
  border-radius: 12px;
  margin-bottom: 1rem;
}

.qr-tip {
  color: var(--n-text-color-3);
  font-size: 0.9rem;
  margin: 0;
}

</style>