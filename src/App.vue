<template>
  <n-config-provider :theme="naiveTheme" :locale="zhCN" :date-locale="dateZhCN">
    <n-loading-bar-provider>
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <n-layout class="app-shell">
            <n-layout-header class="app-header">
              <div class="app-header-content">
                <n-button
                  v-if="isMobile"
                  class="sidebar-toggle"
                  quaternary
                  circle
                  @click="mobileDrawerVisible = true"
                >
                  <template #icon>
                    <n-icon><MenuOutline /></n-icon>
                  </template>
                </n-button>
                <div class="logo">
                  <img src="@/assets/logo.png" alt="鼠管家Logo" class="logo-icon">
                  <span class="app-title">MurisPro - 鼠管家</span>
                </div>
                <div class="app-header-spacer"></div>
                <n-tooltip>
                  <template #trigger>
                    <n-button class="theme-toggle" quaternary circle @click="toggleTheme">
                      <template #icon>
                        <n-icon><SunnyOutline v-if="themeMode === 'dark'" /><MoonOutline v-else /></n-icon>
                      </template>
                    </n-button>
                  </template>
                  {{ themeMode === 'dark' ? '切换到亮色模式' : '切换到暗色模式' }}
                </n-tooltip>
              </div>
            </n-layout-header>

            <n-layout has-sider class="app-body">
              <n-layout-sider
                v-if="!isMobile"
                bordered
                collapse-mode="width"
                :collapsed="sidebarCollapsed"
                :collapsed-width="64"
                :width="240"
                show-trigger
                :native-scrollbar="false"
                @collapse="setSidebarCollapsed(true)"
                @expand="setSidebarCollapsed(false)"
                class="app-sider"
              >
                <n-menu
                  class="app-nav-menu"
                  :collapsed="sidebarCollapsed"
                  :collapsed-width="64"
                  :collapsed-icon-size="22"
                  :options="menuOptions"
                  :value="activeMenuKey"
                  @update:value="handleMenuSelect"
                />
              </n-layout-sider>

              <n-layout-content class="app-content">
                <router-view></router-view>
              </n-layout-content>
            </n-layout>

            <n-drawer
              v-if="isMobile"
              v-model:show="mobileDrawerVisible"
              :width="260"
              placement="left"
            >
              <n-drawer-content title="导航" closable>
                <n-menu
                  class="app-nav-menu"
                  :options="menuOptions"
                  :value="activeMenuKey"
                  @update:value="handleMobileMenuSelect"
                />
              </n-drawer-content>
            </n-drawer>

            <n-layout-footer class="app-footer">
              <div class="status-indicators">
                <div class="status-item">
                  <n-icon class="status-icon online"><CloudDoneOutline /></n-icon>
                  <span>当前数据库正常</span>
                </div>
                <div class="status-item">
                  <n-icon class="status-icon"><SaveOutline /></n-icon>
                  <span>自动保存</span>
                </div>
              </div>
              <div class="version-info">
                版本号: 3.1 | 2025-12-13
              </div>
            </n-layout-footer>
          </n-layout>
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
    </n-loading-bar-provider>
  </n-config-provider>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed, h } from 'vue'
import { darkTheme, zhCN, dateZhCN } from 'naive-ui'
import {
  AnalyticsOutline,
  CloudDoneOutline,
  FlaskOutline,
  GitBranchOutline,
  GitNetworkOutline,
  GridOutline,
  InformationCircleOutline,
  InfiniteSharp,
  ListOutline,
  MenuOutline,
  MoonOutline,
  NutritionOutline,
  PlayCircleOutline,
  SaveOutline,
  ScaleOutline,
  SettingsOutline,
  SunnyOutline,
  TrendingDownOutline
} from '@vicons/ionicons5'
import { useExperimentStore } from '@/stores'
import { useRoute, useRouter } from 'vue-router'
import { renderIcon } from '@/utils/icon'
import { getMurisProToken } from '@/utils/api'

const experimentStore = useExperimentStore()
const route = useRoute()
const router = useRouter()

const sidebarCollapsed = ref(false)
const themeMode = ref('light')
const isMobile = ref(false)
const mobileDrawerVisible = ref(false)
let heartbeatTimer = null

const naiveTheme = computed(() => (themeMode.value === 'dark' ? darkTheme : null))

const isMobileViewport = () => window.matchMedia('(max-width: 992px)').matches
const updateIsMobile = () => {
  isMobile.value = isMobileViewport()
  if (!isMobile.value) mobileDrawerVisible.value = false
}

const menuOptions = computed(() => {
  const experimentChildren = experimentStore.showedExperiments.map((expr) => ({
    key: `exp-${expr.id}`,
    label: `${expr.id} ${expr.name}`,
    icon: renderIcon(PlayCircleOutline)
  }))

  return [
    {
      key: 'group-core',
      label: '核心功能',
      icon: renderIcon(GridOutline),
      children: [
        { key: 'home', label: '笼位视图', icon: renderIcon(GridOutline) },
        { key: 'mice', label: '小鼠列表', icon: renderIcon(ListOutline) },
        { key: 'WeightList', label: '体重列表', icon: renderIcon(ScaleOutline) }
      ]
    },
    {
      key: 'group-breeding',
      label: '基因编辑小鼠繁配',
      icon: renderIcon(GitBranchOutline),
      children: [
        { key: 'BreedingProgress', label: '基因型繁配进度', icon: renderIcon(GitNetworkOutline) },
        { key: 'Genotyping', label: '基因型鉴定', icon: renderIcon(InfiniteSharp) }
      ]
    },
    ...(experimentChildren.length
      ? [
          {
            key: 'group-exp',
            label: '实验记录',
            icon: renderIcon(FlaskOutline),
            children: experimentChildren
          }
        ]
      : []),
    {
      key: 'group-analysis',
      label: '数据分析',
      icon: renderIcon(AnalyticsOutline),
      children: [
        { key: 'BodyWeight', label: '体重曲线', icon: renderIcon(AnalyticsOutline) },
        { key: 'Survivalplot', label: '生存曲线', icon: renderIcon(TrendingDownOutline) }
      ]
    },
    {
      key: 'group-system',
      label: '系统设置',
      icon: renderIcon(SettingsOutline),
      children: [
        { key: 'SystemSettings', label: '设置', icon: renderIcon(SettingsOutline) }
      ]
    }
  ]
})

const activeMenuKey = computed(() => {
  if (route.name === 'Experiments' && route.params.experimentId) {
    return `exp-${route.params.experimentId}`
  }
  return route.name || 'home'
})

const handleMenuSelect = (key) => {
  if (String(key).startsWith('exp-')) {
    const experimentId = String(key).replace('exp-', '')
    router.push({ name: 'Experiments', params: { experimentId } })
    return
  }
  router.push({ name: key })
}

const handleMobileMenuSelect = (key) => {
  handleMenuSelect(key)
  mobileDrawerVisible.value = false
}

const setSidebarCollapsed = (collapsed) => {
  sidebarCollapsed.value = collapsed
  localStorage.setItem('sidebarCollapsed', collapsed)
}

const toggleSidebar = () => {
  setSidebarCollapsed(!sidebarCollapsed.value)
}

const toggleTheme = () => {
  themeMode.value = themeMode.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem('themeMode', themeMode.value)
  window.dispatchEvent(new CustomEvent('app-theme-change', { detail: themeMode.value }))
}

onMounted(() => {
  updateIsMobile()
  window.addEventListener('resize', updateIsMobile)

  const savedState = localStorage.getItem('sidebarCollapsed')
  if (savedState !== null) {
    sidebarCollapsed.value = savedState === 'true'
  }

  const savedTheme = localStorage.getItem('themeMode')
  if (savedTheme === 'dark' || savedTheme === 'light') {
    themeMode.value = savedTheme
  } else {
    themeMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  if (!window.pywebview || !window.pywebview.api) {
    heartbeatTimer = setInterval(async () => {
      const headers = { 'Content-Type': 'application/json' }
      try {
        const token = await getMurisProToken()
        if (token) headers['X-MurisPro-Token'] = token
      } catch (error) {
        return
      }
      fetch('/heartbeat', {
        method: 'POST',
        headers,
        priority: 'low',
        keepalive: true
      }).catch(() => {})
    }, 10000)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updateIsMobile)
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
})

watch(() => route.path, () => {
  mobileDrawerVisible.value = false
})
</script>

<style>
.app-shell {
  height: 100vh;
}

.app-header {
  height: var(--header-height, 64px);
  padding: 0 18px;
  border-bottom: 1px solid var(--n-border-color);
}

.app-header-content {
  height: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-header-spacer {
  flex: 1;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  user-select: none;
}

.logo-icon {
  width: 40px;
  height: 40px;
  object-fit: contain;
  border-radius: 6px;
}

.app-title {
  font-size: 1.25rem;
  font-weight: 700;
}

.app-body {
  min-height: 0;
  height: calc(100vh - var(--header-height, 64px) - var(--footer-height, 52px));
}

.app-sider {
  border-right: 1px solid var(--n-border-color);
}

.app-content {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.app-content .main-content {
  height: 100%;
}

.app-footer {
  height: var(--footer-height, 52px);
  padding: 8px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--n-border-color);
}

.status-indicators {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.app-nav-menu {
  background: transparent;
  height: 100%;
}

.sidebar-toggle {
  flex: 0 0 auto;
}

.theme-toggle {
  flex: 0 0 auto;
}

@media (max-width: 768px) {
  .app-footer {
    height: auto;
    min-height: var(--footer-height, 52px);
    flex-wrap: wrap;
    gap: 8px 16px;
  }

  .status-indicators {
    gap: 10px;
  }
}
</style>
