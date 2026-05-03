import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import { initializeStores } from './stores'
import './views/styles/main.css'

const isDev = process.env.NODE_ENV !== 'production'
const app = createApp(App)
const pinia = createPinia()

app.use(pinia).use(router)

// 在应用启动时检查是否在pywebview环境中
const startApp = async () => {
    try {
        // 先挂载应用，让页面骨架和路由视图尽早出现；数据初始化放到后台异步完成。
        app.mount('#app');

        initializeStores()
            .then(() => {
                if (isDev) console.log('内容初始化完成');
            })
            .catch((error) => {
                console.error('内容初始化失败:', error);
            });
    } catch (error) {
        console.error('应用启动失败:', error);
    } finally {
        // 通知后端前端已准备好
        new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50; // 最多尝试5秒（50 * 100ms）
            
            const tryNotify = () => {
                attempts++;
                
                if (window.pywebview && window.pywebview.api) {
                    if (isDev) console.log(`pywebview API就绪 (尝试次数: ${attempts})`);
                    window.pywebview.api.notify_frontend_ready();
                    resolve();
                } else if (attempts < maxAttempts) {
                    setTimeout(tryNotify, 100);
                } else {
                    console.error('❌ 无法连接到pywebview API');
                    resolve(); // 仍然继续，不阻塞应用
                }
            };
            
            tryNotify();
        });
    }
};

// 立即开始启动流程
startApp();
